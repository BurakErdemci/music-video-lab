"""Independent checks of the beat/downbeat grid in data/timing.json (nothing here feeds back into the grid):
 1. structure equation: bars x 4 x mean beat period vs musical span;
 2. abrupt energy steps (>= 6 dB within 0.3 s) vs nearest downbeat -> bar phase and grid accuracy at section changes;
 3. kick-band onsets vs nearest beat per 30 s window -> drift check in frames at 30 fps.
Writes data/grid-verification.json."""
import json, sys, numpy as np, librosa
from scipy.signal import find_peaks
sys.stdout.reconfigure(encoding="utf-8")
R = "C:\\Users\\burcu\\Documents\\klip-her-sabah\\"
T = json.load(open(R + "data\\timing.json", encoding="utf-8"))
g = np.array(T["beats"]); db = np.array(T["downbeats"]); FPS = T["fps"]; F = 1000 / FPS
y, sr = librosa.load(R + "sarki\\her-sabah-bastan.wav", sr=22050, mono=True); dur = len(y) / sr
out = {}

# 1) equation
nb = len(db); per = np.mean(np.diff(g)); i0 = int(np.argmin(np.abs(g - db[0])))
span = g[i0 + 4 * nb] - g[i0] if i0 + 4 * nb < len(g) else g[-1] - g[i0]
out["equation"] = dict(bars=nb, beats_per_bar=4, mean_beat_period=round(float(per), 5), bars_x4_x_period=round(nb * 4 * per, 3),
                       span_first_downbeat_to_last_beat_s=round(float(span), 3),
                       first_downbeat=round(float(db[0]), 3), audio_end=round(dur, 3))
print("equation: %d bars x 4 x %.5f s = %.3f s ; first downbeat %.3f -> last beat %.3f = %.3f s ; file %.3f s" % (nb, per, nb * 4 * per, db[0], g[-1], g[-1] - db[0], dur))

# 2) energy steps vs downbeats
hop = int(0.025 * sr)
rms = librosa.feature.rms(y=y, frame_length=int(0.1 * sr), hop_length=hop)[0]; rt = librosa.times_like(rms, sr=sr, hop_length=hop)
d = 20 * np.log10(rms + 1e-9); k = int(0.3 / 0.025)
step = np.array([d[i:i + k].mean() - d[max(0, i - k):i].mean() if i >= k else 0 for i in range(len(d) - k)])
pk, _ = find_peaks(np.abs(step), height=6.0, distance=int(1.0 / 0.025))
ev = []
for i in pk:
    t = float(rt[i]); j = int(np.argmin(np.abs(db - t))); jb = int(np.argmin(np.abs(g - t)))
    ev.append(dict(t=round(t, 2), step_db=round(float(step[i]), 1), dt_to_downbeat_ms=round(float((t - db[j]) * 1000), 0), dt_to_beat_ms=round(float((t - g[jb]) * 1000), 0)))
out["energy_steps"] = ev
print("abrupt energy steps (t, dB, ms to nearest downbeat, ms to nearest beat):")
for e in ev: print("  %7.2f s %+5.1f dB  downbeat %+5.0f ms  beat %+5.0f ms" % (e["t"], e["step_db"], e["dt_to_downbeat_ms"], e["dt_to_beat_ms"]))
ok = [e for e in ev if abs(e["dt_to_downbeat_ms"]) <= 150]
out["energy_steps_within_150ms_of_downbeat"] = "%d/%d" % (len(ok), len(ev))
print("steps within 150 ms of a downbeat: %d/%d" % (len(ok), len(ev)))

# 3) kick-band onsets vs beat grid per 30 s
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=128)); fr = librosa.fft_frequencies(sr=sr, n_fft=2048); tt = librosa.times_like(S[0], sr=sr, hop_length=128)
e = S[fr < 120].sum(0); fl = np.maximum(np.diff(e, prepend=e[0]), 0)
pk, _ = find_peaks(fl, height=0.25 * fl.max(), distance=int(0.2 * sr / 128))
rows = []
for a in range(0, int(dur), 30):
    ts = [float(tt[i]) for i in pk if a <= tt[i] < a + 30]
    off = [(t - g[int(np.argmin(np.abs(g - t)))]) * 1000 for t in ts]
    off = [o for o in off if abs(o) < 150]
    if len(off) >= 5: rows.append(dict(window="%d-%d" % (a, a + 30), n=len(off), median_ms=round(float(np.median(off)), 1), p90_abs_ms=round(float(np.percentile(np.abs(off), 90)), 1)))
out["kick_vs_beat_per_30s"] = rows
print("kick-band onsets vs nearest beat, per 30 s (median offset ms, 90th pct |offset| ms); 1 frame = %.1f ms" % F)
for r in rows: print("  %-8s n=%3d median %+6.1f  p90 %5.1f" % (r["window"], r["n"], r["median_ms"], r["p90_abs_ms"]))
out["max_abs_window_median_ms"] = max(abs(r["median_ms"]) for r in rows) if rows else None
print("max |window median| = %.1f ms (%.2f frames)" % (out["max_abs_window_median_ms"], out["max_abs_window_median_ms"] / F))
json.dump(out, open(R + "data\\grid-verification.json", "w", encoding="utf-8"), indent=1)

# 4) downbeat phase: harmonic rhythm. Chord changes (bass-chroma novelty between consecutive beats) and kick-band onsets should be
#    strongest on the chosen bar starts. Phase p = (beat index - first downbeat beat index) % 4; chosen downbeats are p == 0.
hopc = 512
yb = y
Cb = librosa.feature.chroma_cqt(y=yb, sr=sr, hop_length=hopc, fmin=librosa.note_to_hz("C1"), n_octaves=3); tc = librosa.times_like(Cb[0], sr=sr, hop_length=hopc)
Bs = []
for i, t in enumerate(g):
    z = g[i + 1] if i + 1 < len(g) else t + 0.46
    m = (tc >= t) & (tc < z); Bs.append(Cb[:, m].mean(1) if m.any() else np.zeros(12))
Bs = np.array(Bs); Bs = Bs / (np.linalg.norm(Bs, axis=1, keepdims=True) + 1e-9)
nov = np.r_[0, 1 - np.sum(Bs[1:] * Bs[:-1], axis=1)]
kick = np.array([fl[(tt >= t - 0.04) & (tt <= t + 0.06)].max() for t in g])
phase = (np.arange(len(g)) - i0) % 4
rows = []
for s in T["sections"]:
    m = (g >= s["start"]) & (g < s["end"])
    if m.sum() < 16: continue
    nv = [float(nov[m & (phase == p)].mean()) for p in range(4)]; kk = [float(kick[m & (phase == p)].mean()) for p in range(4)]
    rows.append(dict(section=s["name"], bars=s["n_bars"], chord_change_by_phase=[round(v, 3) for v in nv], best_phase_chord=int(np.argmax(nv)), kick_by_phase=[round(v, 1) for v in kk], best_phase_kick=int(np.argmax(kk))))
out["downbeat_phase_by_section"] = rows
print("downbeat phase evidence (phase 0 = chosen bar start):")
for r in rows: print("  %-34s chord-change best phase %d %s | kick best phase %d %s" % (r["section"], r["best_phase_chord"], r["chord_change_by_phase"], r["best_phase_kick"], r["kick_by_phase"]))
n_c = sum(r["best_phase_chord"] == 0 for r in rows); n_k = sum(r["best_phase_kick"] == 0 for r in rows)
out["phase0_wins"] = dict(sections=len(rows), chord_change=n_c, kick=n_k)
print("phase 0 is the max in %d/%d sections (chord change) and %d/%d (kick)" % (n_c, len(rows), n_k, len(rows)))
json.dump(out, open(R + "data\\grid-verification.json", "w", encoding="utf-8"), indent=1)
