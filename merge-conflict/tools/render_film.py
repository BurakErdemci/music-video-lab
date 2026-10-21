#!/usr/bin/env python3
"""render_film.py - render a Remotion composition range with capture glitches repaired.

Remotion's browser capture on this machine sometimes returns a tiled "capture mosaic" or a
torn frame; which frames are hit differs from render to render, while a single-frame still
of the same frame is clean. So this tool:
  1. renders the range twice (through tools/locked.sh, one Chrome at a time),
  2. diffs both renders frame by frame (mean abs difference on a 192x108 downscale),
  3. re-renders every disputed frame as a still,
  4. splices the stills into render A (audio copied from A, or with --song the song file itself from the
     range's start time, sample-accurate) -> the clean mp4,
  5. runs tools/glitchcheck.py (clean vs A, clean vs B) and tools/flashcheck.py on it.
Exit 0 only when both checks pass.

Run from anywhere (needs ffmpeg, Pillow, uv):
  python tools/render_film.py --entry src/index.ts --comp Smoke --frames 0-239 --out out/smoke.mp4 --song public/audio/merge-conflict.wav
  python tools/render_film.py --entry src/index.ts --comp MC60 --frames 0-13977 --out out/mc60.mp4 --song public/audio/merge-conflict.wav
Flags default to the measured recommendation (see FLAGS); override with --render-flags "...".
"""
import argparse, os, shutil, subprocess, sys, tempfile, time
from fractions import Fraction
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

NL = chr(10)
TOOLS = Path(__file__).resolve().parent
VIDEO = TOOLS.parent / 'video'
LOCKED = TOOLS / 'locked.sh'
# plain `bash` can resolve to the WSL launcher on Windows; locked.sh needs Git Bash
BASH = next((b for b in ('C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe') if os.path.exists(b)), 'bash')
FLAGS = '--gl=angle --concurrency=1'  # measured: 0 disputed frames in 3 pairs; concurrency 2 and 4 dispute 6-42 per 240 frames
W, H = 192, 108
STILL_TOL = 3.0  # a PNG still vs an mp4 frame differs by ~1 from codec loss alone
K = W * H * 3


def sh(cmd, **kw):
    print('+', ' '.join(map(str, cmd)), flush=True)
    return subprocess.run(cmd, **kw)


def locked(args):
    # the lock is taken per command, so a long job never blocks other lanes for longer than one render
    r = sh([BASH, str(LOCKED)] + args, cwd=VIDEO)
    if r.returncode:
        sys.exit(f'command failed rc={r.returncode}: {" ".join(args)}')


def small_frames(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(path), '-vf', f'format=rgb24,scale={W}:{H}',
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return [Image.frombytes('RGB', (W, H), raw[i * K:(i + 1) * K]) for i in range(len(raw) // K)]


def small_still(png):
    # rgb24 first: scaling a yuvj420p mp4 directly to 192x108 shifts it by ~6 against the PNG (measured), converting first does not
    return small_frames(png)[0]


def dist(a, b):
    return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=width,height,r_frame_rate', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True, check=True).stdout.strip().split(',')
    return int(out[0]), int(out[1]), out[2]


def duration(path, stream):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', stream, '-show_entries', 'stream=duration',
                          '-of', 'csv=p=0', str(path)], capture_output=True, text=True).stdout.strip()
    return float(out) if out and out != 'N/A' else float('nan')


def splice(src, stills, out, width, height, fps, song=None, song_start=0.0):
    k = width * height * 3
    # --song: the song itself from the range's start (sample-accurate -ss on the wav input), not render A's track.
    # With --song the render is muted, so the audio never depends on Chrome's <Audio> offset.
    audio_in = ['-ss', f'{song_start:.6f}', '-i', str(song)] if song else ['-i', str(src)]
    audio_map = ['-map', '2:a', '-c:a', 'aac', '-b:a', '320k'] if song else ['-map', '1:a?', '-c:a', 'copy']
    dec = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', str(src), '-f', 'rawvideo',
                            '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                            '-s', f'{width}x{height}', '-r', fps, '-i', '-', '-i', str(src), *audio_in,
                            '-map', '0:v', *audio_map, '-c:v', 'libx264', '-crf', '16',
                            '-pix_fmt', 'yuv420p', '-shortest', str(out)], stdin=subprocess.PIPE)
    i = n = 0
    while True:
        f = dec.stdout.read(k)
        if len(f) < k:
            break
        if i in stills:
            f = Image.open(stills[i]).convert('RGB').resize((width, height)).tobytes(); n += 1
        enc.stdin.write(f); i += 1
    enc.stdin.close(); enc.wait(); dec.wait()
    if enc.returncode:
        sys.exit('splice encode failed')
    return i, n


def glitched(clean, other):
    """Count of capture glitches glitchcheck.py finds in `clean` (its 'A' line)."""
    r = subprocess.run([sys.executable, '-I', str(TOOLS / 'glitchcheck.py'), str(clean), str(other)],
                       capture_output=True, text=True)
    print(r.stdout.strip(), r.stderr.strip(), flush=True)
    first = r.stdout.splitlines()[0].split() if r.stdout else []
    if r.returncode or 'glitched' not in first:
        return None
    return int(first[first.index('glitched') + 1])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--entry', required=True, help='Remotion entry, relative to video/ (e.g. src/index.ts)')
    ap.add_argument('--comp', required=True, help='composition id')
    ap.add_argument('--frames', required=True, help='range A-B inclusive, as in remotion --frames')
    ap.add_argument('--out', required=True, help='clean mp4 to write')
    ap.add_argument('--render-flags', default=FLAGS, help=f'render flags (default "{FLAGS}")')
    ap.add_argument('--threshold', type=float, default=8.0, help='disputed when mean abs diff (0-255) exceeds this')
    ap.add_argument('--keep', action='store_true', help='keep the work folder')
    ap.add_argument('--song', help='audio file (relative to video/) muxed from the range start instead of the audio '
                                   'of render A; the render then runs --muted.')
    a = ap.parse_args()
    song = None
    if a.song:
        song = (VIDEO / a.song).resolve()
        if not song.exists():
            sys.exit(f'song not found: {song}')
    start = int(a.frames.split('-')[0])
    flags = a.render_flags.split() + (['--muted'] if song and '--muted' not in a.render_flags.split() else [])
    still_flags = [f for f in flags if f.startswith('--gl')]  # the other flags are render-only
    out = Path(a.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix='render_film_'))
    t0 = time.time()
    try:
        ra, rb = work / 'a.mp4', work / 'b.mp4'
        for r in (ra, rb):
            locked(['npx', 'remotion', 'render', a.entry, a.comp, str(r), f'--frames={a.frames}'] + flags)
        A, B = small_frames(ra), small_frames(rb)
        if len(A) != len(B):
            sys.exit(f'frame counts differ: {len(A)} vs {len(B)}')
        d = [dist(x, y) for x, y in zip(A, B)]
        disputed = [i for i, v in enumerate(d) if v > a.threshold]
        print(f'disputed frames ({len(disputed)} of {len(d)}, threshold {a.threshold}):',
              [start + i for i in disputed], flush=True)
        stills = {}
        if disputed:
            # one bundle and one lock hold for all stills: re-bundling per still made each cost ~10 s plus a lock wait
            bundle = work / 'bundle'
            locked(['npx', 'remotion', 'bundle', a.entry, f'--out-dir={bundle}'])
            script = work / 'stills.sh'
            script.write_text('set -e' + NL + ''.join(
                f'npx remotion still "{bundle.as_posix()}" {a.comp} "{(work / f"s{i}.png").as_posix()}" '
                f'--frame={start + i} {" ".join(still_flags)}' + NL for i in disputed))
            locked([BASH, str(script)])
        for i in disputed:
            png = work / f's{i}.png'
            s = small_still(png)
            da, db = dist(s, A[i]), dist(s, B[i])
            tag = 'A' if da <= STILL_TOL else 'B' if db <= STILL_TOL else 'NEITHER'
            print(f'  frame {start + i}: still vs A {da:.1f}, vs B {db:.1f} -> matches {tag}', flush=True)
            stills[i] = png
        width, height, fps = probe(ra)
        n, used = splice(ra, stills, out, width, height, fps, song, float(start / Fraction(fps)))
        print(f'spliced {used} stills into {n} frames -> {out}', flush=True)
        if song:
            print(f'audio: {song.name} from {float(start / Fraction(fps)):.3f} s; durations video {duration(out, "v:0"):.3f} s, '
                  f'audio {duration(out, "a:0"):.3f} s (expected {n / Fraction(fps):.3f} s)', flush=True)

        bad = False
        for other in (ra, rb):
            g = glitched(out, other)
            if g is None or g:
                print(f'FAIL glitchcheck vs {other.name}: {g}'); bad = True
        fc = sh(['uv', 'run', '--with', 'numpy', 'python', str(TOOLS / 'flashcheck.py'), str(out)])
        if fc.returncode:
            print(f'FAIL flashcheck rc={fc.returncode}'); bad = True
        print(('FAIL' if bad else 'PASS'), f'in {time.time() - t0:.0f}s')
        sys.exit(1 if bad else 0)
    finally:
        if a.keep:
            print('work folder kept:', work)
        else:
            shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
