"""Voice contrast of the two singers on the demucs vocal stem, measured on SOLO lines only, and the colour words Whisper heard.
usage: MC_TAKE=v4 python -I voice_contrast.py STEMS_DIR      (writes data/take-<v>/voice_contrast.json and colour_words.json)
Per solo line (singer from lyric_alignment[].voice, time from the measured line start/end), on vocals.wav:
  f0 median / 10-90 % range (pyin, voiced frames), spectral centroid (energy-weighted), spectral flatness (noisiness),
  HNR proxy (normalised autocorrelation at the pitch lag, dB; low = rough/breathy), voiced fraction.
Separability: leave-one-line-out nearest-centroid classifier on z-scored features (all, and each feature alone), ROC AUC of each feature.
Lines under 0.45 s or with fewer than 6 voiced frames are skipped. The robot voice and the screams (GIT/PUSH/FORCE) are reported apart."""
import os, sys, re, json, numpy as np, librosa
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]; VER = os.environ.get("MC_TAKE", "v1"); D = ROOT / "data" / f"take-{VER}"
STEMS = Path(sys.argv[1]); sr = 22050
T = json.load(open(D / "mc-timing.json", encoding="utf-8")); MAP = json.load(open(D / "token_map.json", encoding="utf-8")); LINES = T["lyric_alignment"]; W = T["words"]
v, _ = librosa.load(STEMS / "vocals.wav", sr=sr, mono=True)
HOP = 256; N = 2048
S = np.abs(librosa.stft(v, n_fft=N, hop_length=HOP)); fr = librosa.fft_frequencies(sr=sr, n_fft=N); tt = librosa.times_like(S[0], sr=sr, hop_length=HOP)
rms = librosa.feature.rms(S=S, frame_length=N, hop_length=HOP)[0]
cent = librosa.feature.spectral_centroid(S=S, sr=sr)[0]
flat = librosa.feature.spectral_flatness(S=S)[0]
SCREAM = {"GIT!", "PUSH!", "FORCE!"}

def hnr_db(seg, f0s, t0s):
    out = []
    for f, t in zip(f0s, t0s):
        i = int(t * sr); w = seg[i:i + N]
        if len(w) < N or f <= 0: continue
        w = w - w.mean(); ac = np.correlate(w, w, "full")[N - 1:]; ac = ac / (ac[0] + 1e-12)
        lag = int(round(sr / f)); lo, hi = max(1, lag - 3), min(N - 1, lag + 3)
        r = float(np.clip(ac[lo:hi + 1].max(), 1e-3, 0.999)); out.append(10 * np.log10(r / (1 - r)))
    return float(np.median(out)) if out else float("nan")

rows = []
for i, L in enumerate(LINES):
    if L.get("start") is None or L["voice"] not in ("sweet", "raspy"): continue
    a, z = L["start"], L["end"]
    if z - a < 0.45: continue
    seg = v[int(max(0, a - 0.05) * sr):int((z + 0.05) * sr)]
    f0, vf, vp = librosa.pyin(seg, fmin=80, fmax=1400, sr=sr, frame_length=N, hop_length=HOP)
    ok = vf & ~np.isnan(f0) & (vp > 0.4); n_ok = int(ok.sum())
    if n_ok < 6: continue
    f = f0[ok]; t_f = librosa.times_like(f0, sr=sr, hop_length=HOP)[ok]
    m = (tt >= a) & (tt <= z); wgt = rms[m] ** 2 + 1e-12
    rows.append(dict(line=i, text=L["text"], singer=L["voice"], scream=L["text"] in SCREAM, start=a, end=z,
                     f0_median_hz=float(np.median(f)), f0_p10_hz=float(np.percentile(f, 10)), f0_p90_hz=float(np.percentile(f, 90)),
                     f0_range_semitones=float(12 * np.log2(np.percentile(f, 90) / np.percentile(f, 10))),
                     centroid_hz=float(np.sum(cent[m] * wgt) / np.sum(wgt)), flatness=float(np.sum(flat[m] * wgt) / np.sum(wgt)),
                     hnr_db=hnr_db(seg, f, t_f), voiced_fraction=float(n_ok / max(1, len(f0))), vocal_stem_db=float(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9))))
FEATS = ["f0_median_hz", "centroid_hz", "flatness", "hnr_db"]

def summarize(rs):
    out = {}
    for s in ("sweet", "raspy"):
        r = [x for x in rs if x["singer"] == s]
        out[s] = dict(n_lines=len(r), **{k: dict(median=round(float(np.median([x[k] for x in r])), 3), p25=round(float(np.percentile([x[k] for x in r], 25)), 3), p75=round(float(np.percentile([x[k] for x in r], 75)), 3))
                                          for k in ("f0_median_hz", "f0_p10_hz", "f0_p90_hz", "f0_range_semitones", "centroid_hz", "flatness", "hnr_db", "voiced_fraction")})
    return out

def auc(x, y):
    """P(random sweet line has a higher value than a random raspy line); y=1 sweet."""
    xs, ys = np.asarray(x, float), np.asarray(y)
    p, q = xs[ys == 1], xs[ys == 0]
    return float(np.mean([(a > b) + 0.5 * (a == b) for a in p for b in q]))

def loo_centroid(rs, feats):
    X = np.array([[x[k] for k in feats] for x in rs], float); y = np.array([1 if x["singer"] == "sweet" else 0 for x in rs]); hit = 0
    for i in range(len(rs)):
        tr = np.arange(len(rs)) != i; mu, sd = X[tr].mean(0), X[tr].std(0) + 1e-9; Z = (X - mu) / sd
        c1, c0 = Z[tr & (y == 1)].mean(0), Z[tr & (y == 0)].mean(0)
        pred = 1 if np.linalg.norm(Z[i] - c1) < np.linalg.norm(Z[i] - c0) else 0; hit += int(pred == y[i])
    return hit / len(rs)

def separability(rs):
    y = [1 if x["singer"] == "sweet" else 0 for x in rs]
    res = dict(n_lines=len(rs), n_sweet=sum(y), n_raspy=len(y) - sum(y), majority_baseline=round(max(sum(y), len(y) - sum(y)) / len(y), 3),
               loo_nearest_centroid_all_features=round(loo_centroid(rs, FEATS), 3))
    for k in FEATS: res[k] = dict(auc_sweet_higher=round(auc([x[k] for x in rs], y), 3), loo_accuracy=round(loo_centroid(rs, [k]), 3))
    return res

# timbre-only set: every solo line >= 0.45 s, no pitch needed (pitch tracking fails on the stem in the heavy sections)
rows_t = []
for i, L in enumerate(LINES):
    if L.get("start") is None or L["voice"] not in ("sweet", "raspy") or L["end"] - L["start"] < 0.45: continue
    m = (tt >= L["start"]) & (tt <= L["end"]); wgt = rms[m] ** 2 + 1e-12; P = S[:, m] ** 2
    rows_t.append(dict(line=i, singer=L["voice"], scream=L["text"] in SCREAM, centroid_hz=float(np.sum(cent[m] * wgt) / np.sum(wgt)), flatness=float(np.sum(flat[m] * wgt) / np.sum(wgt)),
                       high_share=float(P[fr > 4000].sum() / (P.sum() + 1e-12)), vocal_stem_db=float(20 * np.log10(np.sqrt(np.sum(wgt)) + 1e-9))))
def sep_t(rs):
    y = [1 if x["singer"] == "sweet" else 0 for x in rs]; F = ["centroid_hz", "flatness", "high_share"]
    res = dict(n_lines=len(rs), n_sweet=sum(y), n_raspy=len(y) - sum(y), majority_baseline=round(max(sum(y), len(y) - sum(y)) / len(y), 3), loo_nearest_centroid_all_features=round(loo_centroid(rs, F), 3))
    for k in F: res[k] = dict(auc_sweet_higher=round(auc([x[k] for x in rs], y), 3), loo_accuracy=round(loo_centroid(rs, [k]), 3))
    return res
sung = [r for r in rows if not r["scream"]]
res = dict(note="solo lines only, vocals.wav of the demucs separation; the screams GIT/PUSH/FORCE are excluded from 'melodic' and listed apart", lines=rows,
           melodic=dict(summary=summarize(sung), separability=separability(sung)), with_screams=dict(summary=summarize(rows), separability=separability(rows)),
           timbre_only=dict(separability=sep_t(rows_t)),
           line_classification=[dict(line=r["line"], singer=r["singer"], f0=round(r["f0_median_hz"], 1), centroid=round(r["centroid_hz"]), flatness=round(r["flatness"], 3), hnr=round(r["hnr_db"], 1)) for r in rows])
json.dump(res, open(D / "voice_contrast.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(res["melodic"], indent=1)); print("timbre only", json.dumps(res["timbre_only"]))
for r in rows: print("%3d %-6s %s f0 %5.0f (%5.0f-%5.0f) cent %5.0f flat %.3f hnr %5.1f  %s" % (r["line"], r["singer"], "S" if r["scream"] else " ", r["f0_median_hz"], r["f0_p10_hz"], r["f0_p90_hz"], r["centroid_hz"], r["flatness"], r["hnr_db"], r["text"][:40]))

# ---- colour words: every occurrence Whisper heard (merged word list, full-mix pass, vocal-stem pass), and where the lyric has one
norm = lambda s: re.sub(r"[^a-z]", "", s.lower())
COL = ("orange", "blue", "pink")
heard = {c: [dict(t=w["s"], end=w["e"], w=w["w"]) for w in W if norm(w["w"]) == c] for c in COL}
raw = {}
for nm in ("whisper_main", "whisper_vocals"):
    p = D / f"{nm}.json"
    if p.exists():
        words = [x for s in json.load(open(p, encoding="utf-8"))["segments"] for x in s["words"]]
        raw[nm] = {c: [round(x["s"], 2) for x in words if norm(x["w"]).startswith(c)] for c in COL}
expected = []
for m in MAP:
    L = LINES[m["line"]]
    for t in m["tokens"]:
        c = norm(t["text"])
        if c in COL:
            w = t["word"]; ww = None if w is None else W[w if isinstance(w, int) else w[0]]
            expected.append(dict(line=m["line"], text=L["text"], colour=c, voice=L["voice"], heard_as=None if ww is None else ww["w"], t=None if ww is None else ww["s"], correct=bool(ww and norm(ww["w"]) == c)))
cw = dict(heard_in_words=heard, raw_passes=raw, lyric_occurrences=expected, pink_heard=sum(len(x) for x in raw.values() for c, x in [("pink", x["pink"])]) if raw else 0)
json.dump(cw, open(D / "colour_words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for c in COL: print(c, [(round(x["t"], 2), x["w"]) for x in heard[c]])
print("raw", raw); print("expected", [(e["line"], e["colour"], e["heard_as"], e["t"], e["correct"]) for e in expected])
