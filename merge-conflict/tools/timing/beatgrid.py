"""Tempo + beat grid for a song whose tempo changes and that has hard stops, so one smooth tempo curve does not fit.
Model: the song is cut into segments (boundaries on a 1 s lattice); each segment has its own constant beat period and phase.
Segment boundaries, periods and phases are fitted by dynamic programming: maximise the (smoothed, mean-normalised) onset
envelope summed at the beats, minus PENALTY per extra segment. Beat level = the ~186 BPM pulse (the ~93 BPM half-time level
is the same grid with every second beat dropped). Writes data/_grid.json."""
import json, numpy as np, librosa
from pathlib import Path
import os
VER = os.environ.get("MC_TAKE", "v1")          # song version: audio/merge-conflict-<VER>.wav -> data/take-<VER>/
from scipy.ndimage import gaussian_filter1d
ROOT = Path(__file__).resolve().parents[2]
TAKE = ROOT / "data" / f"take-{VER}"
SRC = str(ROOT / "audio" / f"merge-conflict-{VER}.wav")
OUT = str(TAKE / "_grid.json")
P_LO, P_HI, P_STEP = 0.28, 0.45, 0.0008      # beat period search range (s): 133-214 BPM, covers the 153 of take 1 and the 185 asked of Suno
MIN_SEG, MAX_SEG, LATTICE, PENALTY = 6, 70, 2.0, 14.0
y, sr = librosa.load(SRC, sr=22050, mono=True); hop = 128
dur = len(y) / sr
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
fps_env = sr / hop
osm = gaussian_filter1d(oenv, 0.012 * fps_env)           # 12 ms blur widens the basin
osm = osm / osm.mean()                                   # beats on onsets score > 1, off-onset beats score < 1
oi = lambda t: osm[np.clip(np.rint(t * fps_env).astype(int), 0, len(osm) - 1)]
periods = np.arange(P_LO, P_HI, P_STEP)

def fit(a, z, periods=periods, ostep=0.012):
    """best (score, period, phase offset) of a constant-period comb on [a, z): score = sum(onset - 1) over beats."""
    best = (-1e9, None, None)
    for per in periods:
        offs = np.arange(0, per, ostep)[:, None]
        k = np.arange(0, int((z - a) / per) + 1)[None, :]
        tb = a + offs + per * k
        ok = tb < z
        sc = ((oi(tb) - 1.0) * ok).sum(1)
        i = int(np.argmax(sc))
        if sc[i] > best[0]: best = (float(sc[i]), float(per), float(a + offs[i, 0]))
    return best

pts = np.arange(0, dur, LATTICE).tolist() + [dur]
n = len(pts)
cost = {}
def seg_cost(i, j):
    if (i, j) not in cost: cost[(i, j)] = fit(pts[i], pts[j])
    return cost[(i, j)]
D = np.full(n, 1e18); P = np.full(n, -1); D[0] = 0.0
for j in range(1, n):
    for i in range(j - 1, -1, -1):
        L = pts[j] - pts[i]
        if L > MAX_SEG: break
        if D[i] > 1e17 or (L < MIN_SEG and not (i == 0 or j == n - 1)): continue
        sc = seg_cost(i, j)[0]
        c = D[i] - sc + PENALTY
        if c < D[j]: D[j] = c; P[j] = i
    if j % 50 == 0: print("dp", j, "/", n, flush=True)
cut = [n - 1]
while cut[-1] > 0: cut.append(int(P[cut[-1]]))
cut = cut[::-1]
segs = []
for i, j in zip(cut[:-1], cut[1:]):
    sc, per, off = seg_cost(i, j)
    sc, per, off = fit(pts[i], pts[j], np.arange(per - P_STEP, per + P_STEP, 0.0001), 0.003)      # fine refit of the chosen segment
    segs.append(dict(start=pts[i], end=pts[j], period=per, offset=off, score=sc))

# beats per segment; refine each boundary so the interval across it is closest to the neighbouring periods
def seg_beats(s, a, z):
    k0 = int(np.ceil((a - s["offset"]) / s["period"])); k1 = int(np.floor((z - s["offset"]) / s["period"]))
    return s["offset"] + s["period"] * np.arange(k0, k1 + 1)
for q in range(len(segs) - 1):
    A, B = segs[q], segs[q + 1]; b0 = A["end"]; bestb = None
    for t in np.arange(b0 - 1.5, b0 + 1.5, 0.01):
        la = seg_beats(A, A["start"], t - 1e-9)[-1]; fb = seg_beats(B, t, B["end"])[0]
        e = abs((fb - la) - 0.5 * (A["period"] + B["period"]))
        if bestb is None or e < bestb[0] - 1e-9: bestb = (e, t)
    A["end"] = B["start"] = float(bestb[1])
g = np.concatenate([seg_beats(s, s["start"], s["end"] - 1e-9) for s in segs])
g = g[(g >= 0) & (g < dur)]
for s in segs: s["bpm"] = 60 / s["period"]
print("segments (start-end s, BPM, period):")
for s in segs: print("  %7.2f-%7.2f  %7.2f BPM  period %.5f  beats %d  score %.1f" % (s["start"], s["end"], s["bpm"], s["period"], len(seg_beats(s, s["start"], s["end"] - 1e-9)), s["score"]))
print("beats", len(g), "first %.3f last %.3f" % (g[0], g[-1]))
times = librosa.times_like(oenv, sr=sr, hop_length=hop)
def snap(t, w=0.04):
    mm = (times >= t - w) & (times <= t + w); return times[mm][np.argmax(oenv[mm])]
sn = np.array([snap(t) for t in g]); dev = (sn - g) * 1000
print("onset-snapped minus grid ms: max %.1f median-abs %.1f; |dev|>33.3ms: %d of %d" % (np.abs(dev).max(), np.median(np.abs(dev)), (np.abs(dev) > 33.3).sum(), len(g)))
iv = np.diff(g)
for a in range(0, int(dur), 10):
    mm = (g[:-1] >= a) & (g[:-1] < a + 10)
    if mm.any(): print("  %3d-%3d s  median interval %.4f  %.2f BPM  median dev %5.1f ms  median|dev| %.1f" % (a, a + 10, np.median(iv[mm]), 60 / np.median(iv[mm]), np.median(dev[:-1][mm]), np.median(np.abs(dev[:-1][mm]))))
# octave check: best straight-grid comb (one period and phase for the whole file) at the pulse, half-time and double-time levels
def straight(lo, hi, st):
    best = (-1e9, None)
    for per in np.arange(lo, hi, st):
        sc = max(oi(np.arange(o, dur, per)).mean() for o in np.arange(0, per, 0.01))
        if sc > best[0]: best = (float(sc), float(per))
    return dict(bpm=round(60 / best[1], 2), score=round(best[0], 3))
octave = dict(pulse=straight(P_LO, P_HI, 0.0004), half_time=straight(2 * P_LO, 2 * P_HI, 0.0008), double_time=straight(P_LO / 2, P_HI / 2, 0.0002))
print("straight-grid comb by level:", octave)
json.dump(dict(octave_check=octave, beats=g.tolist(), snapped=sn.tolist(), dev_ms=dev.tolist(), duration=dur, segments=segs), open(OUT, "w"))
