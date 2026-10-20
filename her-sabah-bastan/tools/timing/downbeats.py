"""Downbeat tracking over the beat grid: dynamic programme over bar starts. Feature per beat = local z-scores of
kick-band (<120 Hz) onset + bass/full chroma novelty + energy step. Bars may be 4 beats (free) or 2/3/5/6/8 (penalised),
because the measured phase of kick/chord changes slips by a beat at several places. Writes data/_downbeats.json."""
import json, sys, numpy as np, librosa
from pathlib import Path
R = str(Path(__file__).resolve().parents[2]) + "\\"
SRC = R + "sarki\\her-sabah-bastan.wav"
D = R + "data\\"
LAM = float(sys.argv[1]) if len(sys.argv) > 1 else 4.0
g = np.array(json.load(open(D + "_grid.json"))["beats"]); n = len(g)
y, sr = librosa.load(SRC, sr=22050, mono=True); hop = 128
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop)); fr = librosa.fft_frequencies(sr=sr, n_fft=2048); tt = librosa.times_like(S[0], sr=sr, hop_length=hop)
e = S[fr < 120].sum(0); d = np.maximum(np.diff(e, prepend=e[0]), 0)
kick = np.array([d[(tt >= t - 0.04) & (tt <= t + 0.06)].max() for t in g])
h2 = 512
Cb = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=h2, fmin=librosa.note_to_hz("C1"), n_octaves=3)
Cf = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=h2)
tf = librosa.times_like(Cb[0], sr=sr, hop_length=h2)
def sync(M):
    out = []
    for i, t in enumerate(g):
        z = g[i + 1] if i + 1 < n else t + 0.46
        m = (tf >= t) & (tf < z); out.append(M[:, m].mean(1) if m.any() else np.zeros(12))
    out = np.array(out); return out / (np.linalg.norm(out, axis=1, keepdims=True) + 1e-9)
nov = lambda X: np.r_[0, 1 - np.sum(X[1:] * X[:-1], axis=1)]
nb, nf = nov(sync(Cb)), nov(sync(Cf))
rb = []
for i, t in enumerate(g):
    z = g[i + 1] if i + 1 < n else t + 0.46
    s = y[int(t * sr):int(z * sr)]; rb.append(20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9))
rb = np.array(rb)
def lz(x, w=12):
    out = np.zeros(n)
    for i in range(n):
        a = x[max(0, i - w):i + w + 1]; out[i] = (x[i] - a.mean()) / (a.std() + 1e-9)
    return out
step = np.zeros(n)
for i in range(4, n - 4): step[i] = abs(rb[i:i + 4].mean() - rb[i - 4:i].mean())
f = lz(kick) + lz(nb) + lz(nf) + 0.5 * lz(step)
best = np.full(n, -1e9); prev = np.full(n, -1)
for i in range(n):
    if i < 8: best[i] = f[i] - 0.5 * i
    for L, pen in ((4, 0), (3, LAM), (5, LAM), (2, 1.5 * LAM), (6, 1.5 * LAM), (8, LAM)):
        j = i - L
        if j >= 0 and best[j] > -1e8 and best[j] + f[i] - pen > best[i]: best[i] = best[j] + f[i] - pen; prev[i] = j
end = int(np.argmax(best[n - 8:n])) + n - 8
starts = []; i = end
while i >= 0: starts.append(i); i = prev[i]
starts = starts[::-1]
Ls = np.diff(starts)
print("bars", len(starts), "first downbeat beat idx", starts[0], "t %.3f" % g[starts[0]], "last bar start t %.3f" % g[starts[-1]])
print("non-4 bars (start beat idx, t, len):", [(int(starts[k]), round(float(g[starts[k]]), 2), int(Ls[k])) for k in range(len(Ls)) if Ls[k] != 4])
json.dump(dict(starts=[int(s) for s in starts], lam=LAM, beat_db=rb.tolist()), open(D + "_downbeats.json", "w"))
