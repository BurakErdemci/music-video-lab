"""Tempo + beat grid. The song measurably accelerates (~128 -> ~130.7 BPM), so a straight grid drifts.
Model: beat period is a smooth piecewise-linear function of time (knots every KNOT s); knot periods + start offset are
fitted by maximising the (smoothed) onset-envelope sum at the beats, with a curvature penalty. Writes data/_grid.json."""
import json, numpy as np, librosa
from scipy.optimize import minimize
from scipy.ndimage import gaussian_filter1d
from pathlib import Path
R = str(Path(__file__).resolve().parents[2]) + "\\"
SRC = R + "sarki\\her-sabah-bastan.wav"
OUT = R + "data\\_grid.json"
KNOT = 20.0
y, sr = librosa.load(SRC, sr=22050, mono=True); hop = 128
dur = len(y) / sr
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
times = librosa.times_like(oenv, sr=sr, hop_length=hop)
fps_env = sr / hop
osm = gaussian_filter1d(oenv, 0.012 * fps_env)           # 12 ms blur widens the basin
oi = lambda t: np.interp(t, times, osm)

# 1) straight-grid comb (global period + phase) and octave check
best = None
for per in np.arange(0.44, 0.49, 0.0002):
    for off in np.arange(0, per, 0.004):
        s = oi(np.arange(off, dur, per)).mean()
        if best is None or s > best[0]: best = (s, per, off)
print("global straight-grid comb: period %.5f (%.2f BPM) off %.3f s" % (best[1], 60 / best[1], best[2]))
for mult in (0.5, 2.0):
    p = best[1] * mult; bb = max(oi(np.arange(o, dur, p)).mean() for o in np.arange(0, p, 0.005))
    print("  octave x%.1f comb score %.3f (base %.3f)" % (mult, bb, best[0]))

knots = np.arange(0, dur + KNOT, KNOT)
TG = np.arange(0, dur + 5, 0.004)
def beats_from(par):
    # phase(t) = integral dt / period(t); beats are where phase crosses an integer (vectorised)
    off, ps = par[0], np.clip(par[1:], 0.44, 0.49)
    per_t = np.interp(TG, knots, ps)
    ph = np.cumsum(1.0 / per_t) * 0.004
    ph0 = np.interp(off, TG, ph)
    ks = ph0 + np.arange(np.floor(ph[0] - ph0) + 1, np.floor(ph[-1] - ph0) + 1)
    b = np.interp(ks, ph, TG)
    return b[(b >= 0) & (b < dur)]
def cost(par):
    b = beats_from(par); ps = par[1:]
    if len(b) < 400: return 1e3
    curv = np.sum(np.diff(ps, 2) ** 2)
    return -oi(b).mean() + 6000 * curv
# initial: local comb period per knot (+-15 s window), phase from global comb
p0 = []
for kt in knots:
    a, z = max(0, min(kt, dur - 15) - 15), min(dur, max(kt, 15) + 15); bb = None
    for pp in np.arange(0.455, 0.480, 0.0001):
        for oo in np.arange(0, pp, 0.006):
            sc = oi(np.arange(a + oo, z, pp)).mean()
            if bb is None or sc > bb[0]: bb = (sc, pp)
    p0.append(bb[1])
p0 = np.array(p0); print("initial knot periods:", np.round(p0, 4))
par = np.r_[best[2], p0]
# progressive refinement: first pass few iterations of Powell on whole vector
res = minimize(cost, par, method="Powell", options=dict(xtol=1e-6, ftol=1e-9, maxiter=4000))
par = res.x; print("optimised score", -res.fun)
# restart from perturbed phases (multi-modal): try small offset shifts
for do in (-0.02, -0.01, 0.01, 0.02):
    q = par.copy(); q[0] += do; r = minimize(cost, q, method="Powell", options=dict(xtol=1e-6, ftol=1e-9, maxiter=4000))
    if r.fun < res.fun - 1e-6: res = r; par = r.x; print("  better with offset shift", do, -r.fun)
g = beats_from(par)
print("knot periods:", np.round(par[1:], 5)); print("knot BPM    :", np.round(60 / par[1:], 2))
print("beats", len(g), "first %.3f last %.3f" % (g[0], g[-1]))
def snap(t, w=0.04):
    mm = (times >= t - w) & (times <= t + w); return times[mm][np.argmax(oenv[mm])]
sn = np.array([snap(t) for t in g]); dev = (sn - g) * 1000
print("onset-snapped minus grid ms: max %.1f median-abs %.1f; |dev|>33.3ms: %d of %d" % (np.abs(dev).max(), np.median(np.abs(dev)), (np.abs(dev) > 33.3).sum(), len(g)))
iv = np.diff(g)
for a in range(0, int(dur), 20):
    mm = (g[:-1] >= a) & (g[:-1] < a + 20)
    if mm.any(): print("  %3d-%3d s  period %.4f  %.2f BPM  median dev %5.1f ms  median|dev| %.1f" % (a, a + 20, np.median(iv[mm]), 60 / np.median(iv[mm]), np.median(dev[:-1][mm]), np.median(np.abs(dev[:-1][mm]))))
straight = best[2] + best[1] * np.arange(len(g))
print("straight-grid vs fitted grid: diff at t=60 %.0f ms, 120 %.0f ms, 180 %.0f ms, end %.0f ms" % tuple(1000 * (straight[np.searchsorted(g, t)] - g[np.searchsorted(g, t)]) for t in (60, 120, 180, g[-1] - 0.01)))
json.dump(dict(beats=g.tolist(), snapped=sn.tolist(), dev_ms=dev.tolist(), duration=dur, global_period=best[1], global_off=best[2],
               knots=knots.tolist(), knot_periods=par[1:].tolist()), open(OUT, "w"))
