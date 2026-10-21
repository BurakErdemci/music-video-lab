"""Per-frame kick/bass energy of the song for the living camera (scene-map.md "Living motion").

    uv run --with numpy python -I tools/energy.py [--wav video/public/audio/merge-conflict-v4.wav]

Writes video/src/data/energy.json:
  - "bass": one value per 60 fps frame, 0-100, the 30-150 Hz band energy (kick and bass) in a 1/30 s window,
    normalised to the song's 99th percentile and clipped. The camera shake amplitude follows it frame by frame.
  - "sections": {name: mean of the full-band RMS over the section, 0-1 relative to the loudest section}. The hair and
    cloth ripple amplitude follows it, so the ripple's correlation with the section energy is measured, not assumed.
Deterministic: same wav, same file.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
wav = Path(sys.argv[sys.argv.index('--wav') + 1]) if '--wav' in sys.argv else ROOT / 'video/public/audio/merge-conflict-v4.wav'
with wave.open(str(wav)) as w:
    sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
    raw = w.readframes(n)
dt = {2: np.int16, 4: np.int32}[sw]
x = np.frombuffer(raw, dtype=dt).astype(np.float64).reshape(-1, ch).mean(axis=1) / np.iinfo(dt).max

FPS = 60
hop = sr / FPS
win = int(sr / 30)
frames = int(len(x) / hop)
freqs = np.fft.rfftfreq(win, 1 / sr)
band = (freqs >= 30) & (freqs <= 150)
hann = np.hanning(win)
bass = np.zeros(frames)
full = np.zeros(frames)
for i in range(frames):
    c = int(i * hop + hop / 2)
    seg = x[max(0, c - win // 2): max(0, c - win // 2) + win]
    if len(seg) < win:
        seg = np.pad(seg, (0, win - len(seg)))
    spec = np.abs(np.fft.rfft(seg * hann)) ** 2
    bass[i] = np.sqrt(spec[band].sum())
    full[i] = np.sqrt(np.mean(seg ** 2))
b = np.clip(bass / np.percentile(bass, 99), 0, 1)

timing = json.loads((ROOT / 'data/take-v4/mc-timing.json').read_text())
sec = {}
for s in timing['sections']:
    a, e = int(s['start'] * FPS), min(frames, int(s['end'] * FPS))
    sec[s['name']] = float(full[a:e].mean()) if e > a else 0.0
top = max(sec.values())
out = {
    'fps': FPS,
    'source': wav.name,
    'bass': [int(round(v * 100)) for v in b],
    'sections': {k: round(v / top, 3) for k, v in sec.items()},
}
dst = ROOT / 'video/src/data/energy.json'
dst.write_text(json.dumps(out, separators=(',', ':')))
print(f'{dst}: {frames} frames, sections ' + ', '.join(f'{k} {v:.2f}' for k, v in out['sections'].items()))
