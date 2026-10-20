"""Builds data/timing.json from: _grid.json (beatgrid.py), _downbeats.json (downbeats.py), whisper passes, sozler.md.
usage: python build_timing.py MAIN_WHISPER.json CLIP_WHISPER.json VOCALS_WHISPER.json STEMS_DIR
   STEMS_DIR holds vocals.wav / no_vocals.wav from: python -m demucs --two-stems=vocals -n htdemucs (temporary uv env: torch==2.5.1, torchaudio==2.5.1, numpy<2, demucs)
 - words in [10,30) s come from the clipped second pass (the full-file pass skipped the first verse), the rest from the full pass.
 - lines: start/end only from matched whisper words; < 50 % words matched -> anchored=false, start/end null."""
import sys, json, math, numpy as np, librosa
from scipy.signal import find_peaks
sys.path.insert(0, r"C:\Users\burcu\Documents\klip-her-sabah\tools\timing")
from lyrics_align import parse, align, norm
sys.stdout.reconfigure(encoding="utf-8")
R = "C:\\Users\\burcu\\Documents\\klip-her-sabah\\"
SRC = R + "sarki\\her-sabah-bastan.wav"; D = R + "data\\"
FPS = 30; fr = lambda t: int(round(t * FPS))
GR = json.load(open(D + "_grid.json")); g = np.array(GR["beats"])
DB = json.load(open(D + "_downbeats.json")); starts = DB["starts"]
y, sr = librosa.load(SRC, sr=22050, mono=True); dur = len(y) / sr
hop = 128

# ---------------- bars, energy
db_t = np.array([g[s] for s in starts])
bar_end = np.r_[db_t[1:], dur]
def rms_db(a, z):
    s = y[int(a * sr):int(z * sr)]; return 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9) if len(s) else -90.0
bar_db = np.array([rms_db(a, z) for a, z in zip(db_t, bar_end)])
bar_len = np.diff(starts + [len(g)])
step = np.r_[0, np.diff(bar_db)]

# ---------------- words
main = json.load(open(sys.argv[1], encoding="utf-8")); clip = json.load(open(sys.argv[2], encoding="utf-8"))
W = []
for s in clip["segments"]:
    for w in s["words"]:
        if 10 <= w["s"] < 30: W.append(dict(w, src="clip10-34"))
for s in main["segments"]:
    for w in s["words"]:
        if w["s"] >= 30: W.append(dict(w, src="full"))
W.sort(key=lambda w: w["s"])
STEMS = sys.argv[4]
vocal_pass = json.load(open(sys.argv[3], encoding="utf-8"))
_lyr_tokens = set()
for _l in open(R + "sarki\\sozler.md", encoding="utf-8"):
    if not _l.startswith("["):
        for _t in _l.split(): _lyr_tokens.add(norm(_t))
n_added = 0
for s_ in vocal_pass["segments"]:
    for w in s_["words"]:
        nw = norm(w["w"])
        if len(nw) < 4 or nw not in _lyr_tokens or w["s"] < 30: continue
        if any(norm(m["w"]) == nw and abs(m["s"] - w["s"]) < 0.6 for m in W): continue
        W.append(dict(w, src="vocals-stem")); n_added += 1
W.sort(key=lambda w: w["s"])
print("vocal-stem words added (lyric-token match, not in mix pass):", n_added, [(w["w"], round(w["s"], 1)) for w in W if w["src"] == "vocals-stem"])
heard = [norm(w["w"]) for w in W]

# ---------------- lyrics
secs = parse(R + "sarki\\sozler.md")
LW, owner = [], []
lines = []
for si, s in enumerate(secs):
    for li, l in enumerate(s["lines"]):
        toks = [norm(t) for t in l["text"].split() if norm(t)]
        lines.append(dict(sec=si, text=l["text"], singer_tag=l["singer_tag"], toks=toks))
        for t in toks: LW.append(t); owner.append(len(lines) - 1)
match = align(LW, heard)
for L in lines: L["m"] = []
for k, mi in enumerate(match): lines[owner[k]]["m"].append(mi)
used = set(m for m in match if m is not None)
for L in lines:
    ok = [m for m in L["m"] if m is not None]
    L["n_words"] = len(L["toks"]); L["matched"] = len(ok)
    L["anchored"] = bool(ok) and len(ok) / L["n_words"] >= 0.5
    if L["anchored"]:
        a, z = W[ok[0]], W[ok[-1]]
        L["start"] = a["s"]
        L["end"] = z["s"] + min(z["e"] - z["s"], max(0.35, 0.09 * len(norm(z["w"])) + 0.2))
        L["end_raw"] = z["e"]; L["prob"] = float(np.mean([W[m]["p"] for m in ok]))
    else:
        L["start"] = L["end"] = None
    L["heard"] = " ".join(W[m]["w"] for m in ok)
for wi, w in enumerate(W): w["line"] = None
for li, L in enumerate(lines):
    for m in L["m"]:
        if m is not None: W[m]["line"] = li
extra = []; run = []
for wi, w in enumerate(W):
    if wi not in used: run.append(wi)
    else:
        if len(run) >= 3: extra.append(run)
        run = []
if len(run) >= 3: extra.append(run)
extra = [dict(start=round(W[r[0]]["s"], 2), end=round(W[r[-1]]["e"], 2), text=" ".join(W[i]["w"] for i in r)) for r in extra]

# ---------------- sections
def bar_at_or_before(t):
    return int(np.searchsorted(db_t, t, side="right") - 1)
def pick_start(tw):
    """vocal-led section start: earliest bar with |energy step| >= 3.0 dB in [tw-2.5, tw+1.3], else latest bar starting <= tw+0.5."""
    cand = [b for b in range(1, len(db_t)) if tw - 2.5 <= db_t[b] <= tw + 1.3]
    big = [b for b in cand if abs(step[b]) >= 3.0]
    if big: return big[0], "energy-step %.1f dB" % step[big[0]]
    return bar_at_or_before(tw + 0.5), "latest downbeat <= first word + 0.5 s"
def pick_after(t0, t1, thr=2.5):
    """instrumental start: earliest bar with |step| >= thr in [t0, t1]"""
    big = [b for b in range(1, len(db_t)) if t0 <= db_t[b] <= t1 and abs(step[b]) >= thr]
    return (big[0], "energy-step %.1f dB" % step[big[0]]) if big else (bar_at_or_before(t1), "fallback")
first_line = {}; last_line = {}
for li, L in enumerate(lines):
    if L["anchored"]: first_line.setdefault(L["sec"], li); last_line[L["sec"]] = li
cnt = {}
for s in secs: cnt[s["name"]] = cnt.get(s["name"], 0) + 1
def sec_label(si):
    s = secs[si]; n = s["name"]; k = sum(1 for j in range(si + 1) if secs[j]["name"] == n); tot = cnt[n]
    h = s["header"].lower()
    if n == "Bridge": return "Bridge (male)" if "male vocal" in h and "female" not in h else "Bridge (female)"
    if n == "Final Chorus": return "Final Chorus (stripped, female)" if "half-time" in h else "Final Chorus (full, duet)"
    return f"{n} {k}" if tot > 1 else n
sections = []
prev_last_t = 0.0
for si, s in enumerate(secs):
    label = sec_label(si)
    if si in first_line:
        tw = lines[first_line[si]]["start"]; b, why = pick_start(tw); anchor = "first word %.2f s" % tw
    elif s["name"] == "Intro":
        b, why, anchor = 0, "file start", "-"
    elif s["name"] == "Instrumental Break":
        t_ = prev_last_t
        b, why = pick_after(t_ - 2.5, t_ + 2.5); anchor = "after last bridge word %.2f s" % t_
    else:
        b, why, anchor = bar_at_or_before(prev_last_t + 3), "n/a", "-"
    sections.append(dict(name=label, header=s["header"], start_bar_idx=b, why=why, anchor=anchor, lyric_sec=si))
    if si in last_line: prev_last_t = lines[last_line[si]]["start"]
last_big = max(w["s"] for w in W if w["line"] is not None and lines[w["line"]]["sec"] != len(secs) - 1)
ob, owhy = pick_after(last_big, last_big + 6.0)
for sc_ in sections:
    if sc_["name"] == "Outro": sc_["start_bar_idx"], sc_["why"], sc_["anchor"] = ob, owhy, "after last chorus word %.2f s" % last_big
sections.sort(key=lambda x: x["start_bar_idx"])
for i, sc_ in enumerate(sections):
    sc_["end_bar_idx"] = sections[i + 1]["start_bar_idx"] if i + 1 < len(sections) else len(db_t)
ins = []
for sc_ in sections:
    ws = [w for w in W if db_t[sc_["start_bar_idx"]] - 0.3 <= w["s"] < bar_end[sc_["end_bar_idx"] - 1]]
    if not ws or sc_["end_bar_idx"] - sc_["start_bar_idx"] < 4: continue
    lastw = max(w["s"] for w in ws); lb = bar_at_or_before(lastw + 0.5) + 1
    if sc_["end_bar_idx"] - lb >= 4 and sc_["name"] not in ("Outro", "Instrumental Break"):
        ins.append((sc_, lb))
for sc_, lb in ins:
    new = dict(name="Instrumental (unlisted, after " + sc_["name"] + ")", header="measured", start_bar_idx=lb, why="no vocal heard from this bar", anchor="last heard word", lyric_sec=None, end_bar_idx=sc_["end_bar_idx"])
    sc_["end_bar_idx"] = lb; sections.append(new)
sections.sort(key=lambda x: x["start_bar_idx"])
out = []
for sc_ in sections:
    if sc_["name"] == "Outro":
        edges = [sc_["start_bar_idx"]]
        for b in range(sc_["start_bar_idx"] + 1, sc_["end_bar_idx"]):
            if abs(step[b]) >= 4.0 and b - edges[-1] >= 3 and sc_["end_bar_idx"] - b >= 3: edges.append(b)
        edges.append(sc_["end_bar_idx"])
        for j in range(len(edges) - 1):
            nm = "Outro" if j == 0 else "Outro part %d (measured)" % (j + 1)
            out.append(dict(sc_, name=nm, start_bar_idx=edges[j], end_bar_idx=edges[j + 1], why=sc_["why"] if j == 0 else "energy-step %.1f dB" % step[edges[j]]))
    else: out.append(sc_)
sections = out
sections[0]["start_bar_idx"] = 0

# ---------------- hits
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop)); fr_hz = librosa.fft_frequencies(sr=sr, n_fft=2048); tt = librosa.times_like(S[0], sr=sr, hop_length=hop)
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop); omax = float(oenv.max())
pk, _ = find_peaks(oenv, height=0.05 * omax, distance=int(0.12 * sr / hop))
cand = sorted(pk, key=lambda i: -oenv[i])[:90]
band = lambda lo, hi: np.maximum(np.diff(S[(fr_hz >= lo) & (fr_hz < hi)].sum(0), prepend=0), 0)
bl, bm, bh = band(0, 150), band(150, 2500), band(2500, 11000)
hits = []
for i in sorted(cand):
    t = float(tt[i]); k = int(np.argmin(np.abs(g - t))); dt = (t - g[k]) * 1000
    mask = slice(max(0, i - 3), i + 4)
    e = np.array([float(bl[mask].max()), float(bm[mask].max()), float(bh[mask].max())]) / np.array([bl.max(), bm.max(), bh.max()])
    snapped = abs(dt) <= 1000 / FPS
    hits.append(dict(t=round(t, 4), strength=round(float(oenv[i] / omax), 4), beat_idx=k if snapped else None,
                     t_snapped=round(float(g[k]), 4) if snapped else None, dt_ms=round(float(dt), 1),
                     dominant_band=["low", "mid", "high"][int(np.argmax(e))], frame=fr(float(g[k]) if snapped else t)))

# ---------------- vocal stem: activity + singer hint (pyin on the separated vocal)
yv, _ = librosa.load(STEMS + "\\vocals.wav", sr=sr, mono=True)
ya, _ = librosa.load(STEMS + "\\no_vocals.wav", sr=sr, mono=True)
vr = librosa.feature.rms(y=yv, frame_length=2048, hop_length=512)[0]; vt = librosa.times_like(vr, sr=sr, hop_length=512)
vdb = 20 * np.log10(vr + 1e-9)
act = vdb > -45.0
spans = []; i = 0
while i < len(act):
    if act[i]:
        j = i
        while j + 1 < len(act) and act[j + 1: j + 1 + 22].any(): j += 1
        spans.append((float(vt[i]), float(vt[j]))); i = j + 1
    else: i += 1
vocal_activity = []
for a, z in spans:
    if z - a < 0.4: continue
    hw = [w for w in W if a - 0.2 <= w["s"] <= z + 0.2 and w["src"] != "vocals-stem"]
    vocal_activity.append(dict(start=round(a, 2), end=round(z, 2), mean_db=round(float(vdb[(vt >= a) & (vt <= z)].mean()), 1), words_heard=len(hw)))
bar_vdb = np.array([float(np.mean(vdb[(vt >= a) & (vt < z)])) if ((vt >= a) & (vt < z)).any() else -90.0 for a, z in zip(db_t, bar_end)])
def f0_frames(a, z):
    seg = yv[int(max(0, a - 0.05) * sr):int((z + 0.05) * sr)]
    if len(seg) < 4096: return np.array([])
    f0, vf, vp = librosa.pyin(seg, fmin=80, fmax=1000, sr=sr, frame_length=2048, hop_length=256)
    return f0[(vf) & (vp > 0.4) & ~np.isnan(f0)]
for L in lines:
    L["f0"] = f0_frames(L["start"], L["end"]) if L["anchored"] else np.array([])
    L["f0_med"] = float(np.median(L["f0"])) if len(L["f0"]) >= 12 else None
cal_m = [L["f0_med"] for L in lines if L["f0_med"] and sec_label(L["sec"]) == "Verse 1"]
cal_f = [L["f0_med"] for L in lines if L["f0_med"] and (sec_label(L["sec"]) == "Pre-Chorus 1" or sec_label(L["sec"]) == "Bridge (female)")]
cal = dict(male_ref_lines="Verse 1 (tag male)", female_ref_lines="Pre-Chorus 1 + Bridge (female) (tag female)",
           male_ref_median_hz=round(float(np.median(cal_m)), 1), female_ref_median_hz=round(float(np.median(cal_f)), 1))
thr_hz = math.sqrt(cal["male_ref_median_hz"] * cal["female_ref_median_hz"]); cal["threshold_hz_geomean"] = round(thr_hz, 1)
for L in lines:
    f = L["f0"]
    if len(f) < 12: L["singer_hint"] = "unclear"; L["frac_low"] = None; L["hint_conf"] = None; continue
    fl = float((f < thr_hz).mean()); L["frac_low"] = fl
    L["singer_hint"] = "male" if fl >= 0.7 else "female" if fl <= 0.3 else "both"
    # 230-380 Hz is where the two voices overlap (and where sustained instrument notes leak into the stem)
    L["hint_conf"] = "high" if (L["f0_med"] < 230 or L["f0_med"] > 380) else "low"
from scipy.stats import mannwhitneyu
_bm = [L["f0"] for L in lines if sec_label(L["sec"]) == "Bridge (male)" and len(L["f0"])]
_bf = [L["f0"] for L in lines if sec_label(L["sec"]) == "Bridge (female)" and len(L["f0"])]
bm_ = np.concatenate(_bm) if _bm else np.array([]); bf_ = np.concatenate(_bf) if _bf else np.array([])
bridge_check = None
if len(bm_) > 10 and len(bf_) > 10:
    bridge_check = dict(male_half_median_hz=round(float(np.median(bm_)), 1), female_half_median_hz=round(float(np.median(bf_)), 1), n_male=int(len(bm_)), n_female=int(len(bf_)),
                        semitone_gap=round(float(12 * np.log2(np.median(bf_) / np.median(bm_))), 2), mannwhitney_p=float(mannwhitneyu(bm_, bf_).pvalue),
                        male_half_frac_below_threshold=round(float((bm_ < thr_hz).mean()), 2), female_half_frac_below_threshold=round(float((bf_ < thr_hz).mean()), 2))
dol = [w for w in W if norm(w["w"]).startswith("dolar")]
phrase_pitch = []
for w in dol:
    f = f0_frames(w["s"] - 0.4, w["s"] + 3.0)
    if len(f) > 20: phrase_pitch.append(dict(t=round(w["s"] - 0.4, 1), median_hz=round(float(np.median(f)), 1), midi=round(float(librosa.hz_to_midi(np.median(f))), 2)))
Ca = librosa.feature.chroma_cqt(y=ya, sr=sr, hop_length=512); tca = librosa.times_like(Ca[0], sr=sr, hop_length=512)
cma = lambda a, z: Ca[:, (tca >= a) & (tca < z)].mean(1)

# ---------------- key
yh = librosa.effects.harmonic(y, margin=2.0)
yh_c = librosa.feature.chroma_cqt(y=yh, sr=sr, hop_length=512, tuning=librosa.estimate_tuning(y=yh, sr=sr))
tc = librosa.times_like(yh_c[0], sr=sr, hop_length=512)
KS_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KS_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
def key_of(v):
    sc = []
    for k in range(12):
        sc.append((np.corrcoef(v, np.roll(KS_MAJ, k))[0, 1], NOTE[k] + " major"))
        sc.append((np.corrcoef(v, np.roll(KS_MIN, k))[0, 1], NOTE[k] + " minor"))
    sc.sort(reverse=True); return sc
def chroma_mean(a, z):
    m = (tc >= a) & (tc < z); return yh_c[:, m].mean(1)

sec_out = []
for i, sc_ in enumerate(sections):
    b0, b1 = sc_["start_bar_idx"], sc_["end_bar_idx"]
    t0 = 0.0 if i == 0 else float(db_t[b0]); t1 = dur if b1 >= len(db_t) else float(db_t[b1])
    ln = [li for li, L in enumerate(lines) if L["anchored"] and t0 - 0.5 <= L["start"] < t1 - 0.5]
    hints = {}
    for li in ln: hints[lines[li]["singer_hint"]] = hints.get(lines[li]["singer_hint"], 0) + 1
    ks = key_of(chroma_mean(t0, t1))
    sec_out.append(dict(name=sc_["name"], start=round(t0, 4), end=round(t1, 4), start_frame=fr(t0), end_frame=fr(t1), start_bar=b0 + 1, end_bar=b1,
                        n_bars=b1 - b0, mean_db=round(float(bar_db[b0:b1].mean()), 2), min_bar_db=round(float(bar_db[b0:b1].min()), 2), max_bar_db=round(float(bar_db[b0:b1].max()), 2),
                        singer_tag=secs[sc_["lyric_sec"]]["singer_default"] if sc_["lyric_sec"] is not None else None, singers_heard=hints,
                        start_rule=sc_["why"], anchor=sc_["anchor"], key=dict(best=ks[0][1], r=round(float(ks[0][0]), 3), second=ks[1][1], r2=round(float(ks[1][0]), 3))))
key_win = []
for b in range(0, len(db_t) - 8, 4):
    a_, z_ = float(db_t[b]), float(db_t[b + 8]); ks = key_of(chroma_mean(a_, z_))
    key_win.append(dict(start=round(a_, 2), end=round(z_, 2), bar=b + 1, key=ks[0][1], r=round(float(ks[0][0]), 3), second=ks[1][1], r2=round(float(ks[1][0]), 3)))
def shift_between(a, b_):
    return max(((np.corrcoef(np.roll(b_, k), a)[0, 1], k) for k in range(12)), key=lambda x: x[0])
def sec_by(name): return next((s for s in sec_out if s["name"] == name), None)
shifts = {}
c1 = sec_by("Chorus 1"); c2 = sec_by("Chorus 2"); fb = sec_by("Final Chorus (full, duet)"); fs = sec_by("Final Chorus (stripped, female)")
for nm, A, B in (("Chorus1_vs_Chorus2", c1, c2), ("Chorus2_vs_FinalFull", c2, fb), ("Chorus2_vs_FinalStripped", c2, fs)):
    if A and B:
        va, vb = chroma_mean(A["start"], A["end"]), chroma_mean(B["start"], B["end"])
        r, k = shift_between(va, vb)
        shifts[nm] = dict(best_shift_semitones=int(k), r_at_best=round(float(r), 3), r_at_zero=round(float(np.corrcoef(va, vb)[0, 1]), 3))

ref_c2 = cma(c2["start"], c2["end"]) if c2 else None
acc_shift = []
if ref_c2 is not None:
    for b in range(0, len(db_t) - 1, 2):
        a_, z_ = float(db_t[b]), float(bar_end[b + 1]); v = cma(a_, z_)
        r = [float(np.corrcoef(np.roll(v, -k), ref_c2)[0, 1]) for k in range(12)]; k = int(np.argmax(r))
        acc_shift.append(dict(bar=b + 1, start=round(a_, 2), best_shift_semitones=k if k <= 6 else k - 12, r_best=round(r[k], 3), r_zero=round(r[0], 3)))

# ---------------- tempo summary
per = np.diff(g)
tempo = dict(bpm_mean=round(float(60 / per.mean()), 3), beat_period_mean=round(float(per.mean()), 5), bpm_first_20s=round(float(60 / np.median(per[g[:-1] < 20])), 2),
             bpm_last_20s=round(float(60 / np.median(per[g[:-1] > dur - 20])), 2), knots_t=GR["knots"], knots_bpm=[round(60 / p, 3) for p in GR["knot_periods"]],
             bars=len(db_t), odd_bars=[int(i + 1) for i, L_ in enumerate(bar_len) if L_ != 4], first_downbeat=round(float(db_t[0]), 4), beats_total=int(len(g)),
             beats_in_bars=int(sum(bar_len)), last_beat=round(float(g[-1]), 4))
sg0, sgp = GR["global_off"], GR["global_period"]
k0 = int(np.argmin(np.abs(g - sg0))); sg = sg0 + sgp * (np.arange(len(g)) - k0)
tempo["straight_grid_drift_ms"] = {str(t): round(float((sg[np.searchsorted(g, t)] - g[np.searchsorted(g, t)]) * 1000), 0) for t in (30, 60, 120, 180, 240)}
dv = np.abs(GR["dev_ms"])
tempo["onset_residual_ms"] = dict(max=round(float(dv.max()), 1), median_abs=round(float(np.median(dv)), 1), n_over_one_frame=int((dv > 1000 / FPS).sum()), n=len(g))

# ---------------- write
words_out = [dict(w=w["w"], start=round(w["s"], 3), end=round(w["e"], 3), prob=round(w["p"], 3), line=w["line"], source=w["src"]) for w in W]
lines_out = []
for li, L in enumerate(lines):
    lines_out.append(dict(text=L["text"], section=sec_label(L["sec"]), singer_tag=L["singer_tag"], singer_hint=L["singer_hint"], singer_hint_confidence=L["hint_conf"], singer_frac_low=None if L["frac_low"] is None else round(L["frac_low"], 2),
                          f0_median_hz=None if L["f0_med"] is None else round(L["f0_med"], 1), start=None if L["start"] is None else round(L["start"], 3), end=None if L["end"] is None else round(L["end"], 3),
                          start_frame=None if L["start"] is None else fr(L["start"]), end_frame=None if L["end"] is None else fr(L["end"]),
                          anchored=L["anchored"], matched_words=L["matched"], n_words=L["n_words"], heard=L["heard"], mean_prob=round(L["prob"], 3) if L["anchored"] else None))
for lo_, L in zip(lines_out, lines):
    lo_["energy_hint"] = None
    if not lo_["anchored"] and L["sec"] == 0:
        iv_ = [v for v in vocal_activity if v["words_heard"] == 0 and v["end"] < sec_out[1]["start"]]
        if iv_: lo_["energy_hint"] = dict(start=iv_[0]["start"], end=iv_[0]["end"], source="vocal-stem RMS > -45 dB, not word-matched")
timing = dict(fps=FPS, duration=round(dur, 4), bpm=tempo["bpm_mean"], beat_period=tempo["beat_period_mean"], tempo=tempo,
              beats=[round(float(t), 4) for t in g], downbeats=[round(float(t), 4) for t in db_t],
              bars=[dict(bar=i + 1, start=round(float(db_t[i]), 4), end=round(float(bar_end[i]), 4), beats=int(bar_len[i]), mean_db=round(float(bar_db[i]), 2)) for i in range(len(db_t))],
              sections=sec_out, lines=lines_out, words=words_out, hits=hits,
              energy_per_bar=[round(float(x), 2) for x in bar_db], key_per_section=[dict(section=s["name"], **s["key"]) for s in sec_out],
              key_windows_8bar=key_win, key_shift_between_choruses=shifts, accompaniment_shift_vs_chorus2_2bar=acc_shift, ay_dolar_phrase_pitch=phrase_pitch,
              singer_calibration=cal, bridge_voice_check=bridge_check, vocal_activity=vocal_activity, vocal_db_per_bar=[round(float(x), 1) for x in bar_vdb], heard_not_in_lyrics=extra)
json.dump(timing, open(D + "timing.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("sections:")
for s in sec_out:
    print("  %-52s %7.2f-%7.2f bars %3d-%3d (%2d) %6.1f dB  %s heard=%s [%s]" % (s["name"], s["start"], s["end"], s["start_bar"], s["end_bar"], s["n_bars"], s["mean_db"], s["key"]["best"], s["singers_heard"], s["start_rule"]))
print("anchored lines %d/%d" % (sum(l["anchored"] for l in lines_out), len(lines_out)))
print("calibration", cal); print("bridge", bridge_check); print("phrase pitch", phrase_pitch); print("vocal activity", vocal_activity); print("shifts", shifts); print("tempo", tempo)
