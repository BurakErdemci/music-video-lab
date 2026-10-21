"""Splice measurements around chorus 1 for data/take-v1/ (writes splice.json, prints a table).
usage: python -I splice_report.py STEMS_DIR
For each cut (a downbeat) it reports how the band and the voice behave around it, and how alike the bars before and after the cut are:
loudness (mix, per stem), spectral similarity (cosine of the mean 64-band mel dB profile) and chroma similarity of 1 bar and 2 bars either side,
next to the median of the same numbers over every adjacent pair of normal bars, so a cut can be judged against the song's own bar-to-bar change."""
import sys, json, numpy as np, librosa
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]; D = ROOT / "data" / "take-v1"; STEMS = Path(sys.argv[1]); sr = 22050
T = json.load(open(D / "mc-timing.json", encoding="utf-8")); db = np.array(T["downbeats"]); bars = T["bars"]
y, _ = librosa.load(ROOT / "audio" / "merge-conflict-v1.wav", sr=sr, mono=True)
stem = {k: librosa.load(STEMS / f"{k}.wav", sr=sr, mono=True)[0] for k in ("drums", "bass", "other", "vocals")}
sec = {s["name"]: s for s in T["sections"]}
dbv = lambda x, a, z: float(20 * np.log10(np.sqrt(np.mean(x[int(a * sr):int(z * sr)] ** 2)) + 1e-9))
M = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=sr, n_fft=2048, hop_length=512, n_mels=64) + 1e-10); tm = librosa.times_like(M[0], sr=sr, hop_length=512)
C = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512); tc = librosa.times_like(C[0], sr=sr, hop_length=512)
cos = lambda a, b: float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
def prof(a, z): m = (tm >= a) & (tm < z); return M[:, m].mean(1)
def chrom(a, z): m = (tc >= a) & (tc < z); return C[:, m].mean(1)
def edge(t): return {k: round(dbv(v, t - 0.1, t) - dbv(v, t, t + 0.1), 1) for k, v in (("mix", y), *stem.items())}
def side(a, z): return dict(start=round(float(a), 2), end=round(float(z), 2), mix=round(dbv(y, a, z), 1), **{k: round(dbv(v, a, z), 1) for k, v in stem.items()})
def cut_report(i):
    t = float(db[i]); L = {}
    for n in (1, 2):
        a0, a1 = db[i - n], db[i]; b0, b1 = db[i], db[min(i + n, len(db) - 1)] if i + n < len(db) else T["duration"]
        mel = cos(prof(a0, a1) - prof(a0, a1).mean(), prof(b0, b1) - prof(b0, b1).mean())
        L[f"{n}_bar"] = dict(before=side(a0, a1), after=side(b0, b1), mix_db_diff=round(dbv(y, b0, b1) - dbv(y, a0, a1), 1), mel_cosine=round(mel, 3), chroma_cosine=round(cos(chrom(a0, a1), chrom(b0, b1)), 3))
    # last / first beat only: what the ear hears at the seam
    L["seam_100ms_dB_before_minus_after"] = edge(t)
    return dict(downbeat=round(t, 3), bar=i, **L)
def baseline(n):
    mel, ch, dd = [], [], []
    for i in range(n, len(db) - n):
        if bars[i]["beats"] != 4 or bars[i - n]["beats"] != 4: continue
        a0, a1, b1 = db[i - n], db[i], db[i + n] if i + n < len(db) else T["duration"]
        mel.append(cos(prof(a0, a1) - prof(a0, a1).mean(), prof(a1, b1) - prof(a1, b1).mean())); ch.append(cos(chrom(a0, a1), chrom(a1, b1))); dd.append(abs(dbv(y, a1, b1) - dbv(y, a0, a1)))
    return dict(median_mel_cosine=round(float(np.median(mel)), 3), p10_mel_cosine=round(float(np.percentile(mel, 10)), 3), median_chroma_cosine=round(float(np.median(ch)), 3), p10_chroma_cosine=round(float(np.percentile(ch, 10)), 3), median_abs_mix_db_diff=round(float(np.median(dd)), 1), p90_abs_mix_db_diff=round(float(np.percentile(dd, 90)), 1), n=len(mel))
c1, v3 = sec["chorus1"], sec["verse3_trade"]
i_end = int(np.argmin(np.abs(db - c1["end"]))); i_start = int(np.argmin(np.abs(db - c1["start"])))
assert abs(db[i_end] - v3["start"]) < 1e-6

# vocal tail after the last word 'control' and vocal onset before the chorus start
words = T["words"]
ctrl = [w for w in words if w["w"].lower().strip(".,!?") == "control" and c1["start"] < w["s"] < c1["end"]][0]
v = stem["vocals"]; H = 0.05
def vlevel(t0, t1): return [(round(t, 2), round(dbv(v, t, t + H), 1)) for t in np.arange(t0, t1, H)]
tail_end = next((t for t, d in vlevel(ctrl["e"], c1["end"] + 0.5) if d < -45), None)
vtail = vlevel(ctrl["s"], c1["end"] + 0.3)
first_acc = next(w for w in words if w["w"].lower() == "accept" and w["s"] > c1["start"] - 0.5)
pre = vlevel(c1["start"] - 1.2, c1["start"] + 0.3)
tail_dbs = [d for t, d in vtail if t >= db[i_end] - 0.2]
res = dict(
    chorus1=dict(start_downbeat=round(float(db[i_start]), 3), start_bar=i_start, end_downbeat=round(float(db[i_end]), 3), end_bar=i_end, bars=i_end - i_start, seconds=round(float(db[i_end] - db[i_start]), 3),
                 first_word=dict(w=first_acc["w"], s=first_acc["s"], offset_from_downbeat_s=round(first_acc["s"] - float(db[i_start]), 3)),
                 last_word=dict(w=ctrl["w"], s=ctrl["s"], e=ctrl["e"]), voice_below_minus45_after_last_word_at=tail_end,
                 voice_last_frame_above_minus35_dB=max(t for t, d in vtail if d > -35 and t < db[i_end] + 0.3),
                 voice_dips_below_minus35_between_last_word_and_cut=[t for t, d in vtail if d < -35 and ctrl["s"] <= t < db[i_end] - H],
                 voice_min_dB_from_1s_before_to_0p1_after_chorus_start=min(d for t, d in pre if t >= c1["start"] - 1.0 and t <= c1["start"] + 0.1)),
    verse3=dict(start_downbeat=round(float(db[i_end]), 3), first_word=next(dict(w=w["w"], s=w["s"], offset_from_downbeat_s=round(w["s"] - float(db[i_end]), 3)) for w in words if w["s"] >= db[i_end] - 0.1)),
    cut_chorus1_end_to_verse3=cut_report(i_end), cut_into_chorus1_start=cut_report(i_start),
    baseline_adjacent_bars={n: baseline(n) for n in (1, 2)})
json.dump(res, open(D / "splice.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(res, indent=1))
