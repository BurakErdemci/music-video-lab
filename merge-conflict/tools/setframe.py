"""The set covers the frame (round 11d, the architect on proof232-r11c: re-cammed finale shots showed the set's edge
and the black void around it). Each sampled frame is rendered twice without the girls and the type (framecheck
--set): 'set' as it is, 'setkey' with the worlds' dark backdrops (the "no set" fill behind every set) in a key
magenta. Where the two differ by nearly the whole key, the frame shows the bare backdrop: no set drawn there. The
LED walls and tile floors are drawn translucent, so their thin gaps show the backdrop too; the void mask is eroded by
ERODE px, so only areas larger than that count. At most LIMIT of the border band (BAND px deep) may be void.
  uv run --with pillow --with numpy python -I tools/setframe.py samples.json [failures.json]
  uv run --with pillow --with numpy python -I tools/setframe.py --selftest   (exit 1: a covered frame passes, a void one fails)
samples.json: [{"frame", "t", "shot", "png", "keyed", "void_ok"}]; void_ok marks a shot whose world is a designed void
(listed with the reason in framecheck.mjs VOID_SHOTS).
"""
import json
import sys

import numpy as np
from PIL import Image

BAND = 24
LIMIT = 0.01
ERODE = 15
KEY_DIFF = 160  # the key raises red and blue by at least this over the plain render where the backdrop is bare


def bare_share(a, k, erode=ERODE, band_px=BAND):
    """Plain and keyed frames (int16 RGB arrays) -> the bare share of the border band."""
    from PIL import ImageFilter
    d = k - a
    bare = (d[..., 0] >= KEY_DIFF) & (d[..., 2] >= KEY_DIFF) & (np.abs(d[..., 1]) < 60)
    bare = np.asarray(Image.fromarray((bare * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(erode))) > 127
    h, w = bare.shape
    band = np.zeros((h, w), bool)
    band[:band_px], band[-band_px:], band[:, :band_px], band[:, -band_px:] = True, True, True, True
    return float((bare & band).sum() / band.sum())


def void_share(png, keyed):
    a = np.asarray(Image.open(png).convert("RGB"), dtype=np.int16)
    k = np.asarray(Image.open(keyed).convert("RGB"), dtype=np.int16)
    return bare_share(a, k)


def video_frames(path, w, h):
    """The frames of a video as int16 RGB arrays."""
    import subprocess
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    size = w * h * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.int16)
    p.wait()


def frame_runs(meta, shares):
    """Every frame over its limit, merged into runs per shot: [{shot, scene, t0, t1, frames, worst}]."""
    runs = []
    for m, v in zip(meta, shares):
        if v <= m["limit"]:
            continue
        r = runs[-1] if runs else None
        if r and r["shot"] == m["shot"] and m["frame"] - r["last"] == 1:
            r.update(last=m["frame"], t1=m["t"], frames=r["frames"] + 1, worst=max(r["worst"], v))
        else:
            runs.append({"shot": m["shot"], "scene": m["scene"], "limit": m["limit"], "first": m["frame"], "last": m["frame"], "t0": m["t"], "t1": m["t"], "frames": 1, "worst": v})
    return runs


# the prefilter (round 11e): every frame of the rendered film, decoded small, scored by the share of its border band
# that is dark; a bare backdrop is dark (#04020a under at most a few particles), so a frame whose border is not
# dark cannot be bare there, and only frames at or over PREFILTER are rendered and keyed
SCORE_W, SCORE_H, SCORE_BAND, DARK = 480, 270, 6, 32
PREFILTER = 0.004


def border_scores(video, start, a, b, fps=60):
    """[(frame, dark share of the border band)] for film frames a*fps..b*fps of `video` (its first frame at `start` s)."""
    import subprocess
    size = SCORE_W * SCORE_H
    f0, f1 = round(a * fps), round(b * fps)
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{max(0.0, a - start):.4f}", "-i", video, "-frames:v", str(f1 - f0 + 1),
           "-vf", f"scale={SCORE_W}:{SCORE_H},format=gray", "-f", "rawvideo", "-"]
    band = np.zeros((SCORE_H, SCORE_W), bool)
    band[:SCORE_BAND], band[-SCORE_BAND:], band[:, :SCORE_BAND], band[:, -SCORE_BAND:] = True, True, True, True
    n = band.sum()
    out = []
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    fr = f0
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        g = np.frombuffer(buf, np.uint8).reshape(SCORE_H, SCORE_W)
        out.append((fr, float(((g < DARK) & band).sum() / n)))
        fr += 1
    p.wait()
    return out


def analyse(samples):
    out = []
    for s in samples:
        v = void_share(s["png"], s["keyed"])
        if v > s.get("limit", LIMIT):
            out.append({"t": s["t"], "frame": s["frame"], "shot": s["shot"], "value": round(v, 3), "why": f"{100 * v:.1f} % of the border shows no set (max {100 * s.get('limit', LIMIT):.0f} %, scene {s.get('scene')})"})
    return out


def selftest():
    import os
    import tempfile
    d = tempfile.mkdtemp(prefix="setframe-selftest-")
    # the plain and the keyed renders of: a set covering the frame (a wall with thin gaps), a lit island in the void
    # (the r11c tunnel), and a set drawn dark (drawn, just dark)
    def pair(name, draw):
        plain, keyed = Image.new("RGB", (1920, 1080), (4, 2, 10)), Image.new("RGB", (1920, 1080), (255, 0, 255))
        for im in (plain, keyed):
            draw(im)
        pp, kp = os.path.join(d, name + "-p.png"), os.path.join(d, name + "-k.png")
        plain.save(pp), keyed.save(kp)
        return {"frame": 0, "t": 0.0, "shot": name, "png": pp, "keyed": kp}

    def wall(im):
        for x in range(0, 1920, 40):
            for y in range(0, 1080, 40):
                im.paste((200, 90, 40), (x, y, x + 36, y + 36))

    def island(im):
        im.paste((40, 20, 60), (300, 200, 1700, 900))

    def dark(im):
        im.paste((0, 0, 0), (0, 0, 1920, 1080))
    paths = [pair("full", wall), pair("island", island), pair("dark", dark)]
    # round 11e: a shot whose last 8 frames (52-59 of 60) open a void between two 4 fps samples (0, 15, 30, 45):
    # the samples pass, every frame fails
    covered = np.zeros((108, 192, 3), np.int16) + [200, 90, 40]
    void_k = covered.copy(); void_k[:, :130] = [255, 0, 255]
    void_p = covered.copy(); void_p[:, :130] = [4, 2, 10]
    seq = [(covered, covered) if f < 52 else (void_p, void_k) for f in range(60)]
    meta = [{"frame": f, "t": f / 60, "shot": "yes3", "scene": "split", "limit": 0.42} for f in range(60)]
    shares = [bare_share(p, k, erode=3, band_px=3) for p, k in seq]
    every = frame_runs(meta, shares)
    sampled = frame_runs([meta[f] for f in range(0, 60, 15)], [shares[f] for f in range(0, 60, 15)])
    print(f"setframe selftest: 8-frame void at the shot's end -> every frame: {every[0]['frames'] if every else 0} frames fail; 4 fps samples: {'fail' if sampled else 'pass (they step over it)'}")
    got = {f["shot"] for f in analyse(paths)}
    print("setframe selftest flagged:", sorted(got))
    ok = got == {"island"} and every and every[0]["frames"] == 8 and not sampled
    print("setframe selftest: " + ("the void frame fails, the covered and the dark-set frames pass" if ok else "WRONG"))
    sys.exit(1 if ok else 0)


def main():
    if sys.argv[1] == "--selftest":
        selftest()
    if sys.argv[1] == "--video":
        # --video plain.mp4 keyed.mp4 frames.json [--all]: every frame (half-size renders: erosion and band halved)
        meta = json.load(open(sys.argv[4], encoding="utf-8"))
        w, h = 960, 540
        shares = [bare_share(a, k, erode=ERODE // 2, band_px=BAND // 2) for a, k in zip(video_frames(sys.argv[2], w, h), video_frames(sys.argv[3], w, h))]
        if len(shares) != len(meta):
            print(f"setframe: {len(shares)} decoded frames for {len(meta)} film frames"); sys.exit(2)
        runs = frame_runs(meta, shares)
        gated = sum(1 for m in meta if m["limit"] <= 1)
        print(f"setframe: every frame, {len(meta)} frames ({gated} in measured scenes)")
        if "--all" in sys.argv:
            for m, v in zip(meta, shares):
                if v > 0.01:
                    print(f"  all {m['t']:7.2f} {m['shot']:22s} {str(m['scene']):10s} {100 * v:5.1f}")
        for r in runs:
            print(f"  {r['t0']:7.2f}-{r['t1']:7.2f}  {r['shot']:22s} {r['frames']:3d} frames up to {100 * r['worst']:.1f} % of the border bare (max {100 * r['limit']:.0f} %, scene {r['scene']})")
        print("setframe: FAIL" if runs else "setframe: PASS")
        sys.exit(1 if runs else 0)
    if sys.argv[1] == "--score":
        # --score video start a b out.json: the prefilter's per-frame scores
        video, start, a, b, dst = sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
        json.dump(border_scores(video, start, a, b), open(dst, "w", encoding="utf-8"))
        sys.exit(0)
    samples = json.load(open(sys.argv[1], encoding="utf-8"))
    out = analyse(samples)
    if len(sys.argv) > 2 and not sys.argv[2].startswith("--"):
        json.dump(out, open(sys.argv[2], "w", encoding="utf-8"))
    print(f"setframe: {len(samples)} frames, {sum(1 for s in samples if s.get('limit', LIMIT) > LIMIT)} in a dark world with its own limit")
    if "--all" in sys.argv:
        for s in samples:
            print(f"  all {s['t']:7.2f} {str(s['shot']):22s} {str(s.get('scene')):10s} {100 * void_share(s['png'], s['keyed']):5.1f}")
    for f in out:
        print(f"  {f['t']:7.2f}  {str(f['shot']):22s} {f['why']}")
    print("setframe: FAIL" if out else "setframe: PASS")
    sys.exit(1 if out else 0)


if __name__ == "__main__":
    main()
