"""Builds data/timing.json from: _grid.json (beatgrid.py), _downbeats.json (downbeats.py), whisper passes, sarki/sozler.md.
usage: python build_timing.py MAIN_WHISPER.json VOCALS_WHISPER.json STEMS_DIR
   STEMS_DIR holds vocals.wav / no_vocals.wav from: python -m demucs --two-stems=vocals -n htdemucs (temporary uv env: torch==2.5.1, torchaudio==2.5.1, numpy<2, demucs)
 - words come from the full-file whisper pass; a pass on the separated vocal stem adds words only when they equal a lyric token.
 - lines: start/end only from matched whisper words; < 50 % words matched -> anchored=false, start/end null."""
import sys, re, json, numpy as np, librosa
from pathlib import Path
from scipy.signal import find_peaks
from scipy.ndimage import median_filter, gaussian_filter1d
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "timing"))
from lyrics_align import parse, align, norm
sys.stdout.reconfigure(encoding="utf-8")
SRC = str(ROOT / "audio" / "Vorathul.Nerfed.wav"); LYRICS = str(ROOT / "sarki" / "sozler.md"); D = str(ROOT / "data") + "/"
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

# ---------------- words (whisper writes numbers as digits; the lyric sheet spells them out)
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
def spell(n):
    return [ONES[n]] if n < 20 else [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
def expand(w):
    """'2.3' -> two point three, '40%' -> forty percent, '12' -> twelve; other tokens unchanged"""
    t = w["w"].strip()
    if not re.search(r"[\d%]", t): return [w]
    parts = []
    for tok in re.sub(r"\.(?=\d)", " point ", t).replace("%", " percent ").split():
        tok = tok.strip(".,!?")
        if tok.isdigit() and int(tok) < 100: parts += spell(int(tok))
        elif tok: parts.append(tok)
    d = (w["e"] - w["s"]) / len(parts)
    return [dict(w, w=p, s=w["s"] + i * d, e=w["s"] + (i + 1) * d) for i, p in enumerate(parts)]
def expanded(path):
    out = []
    for s in json.load(open(path, encoding="utf-8"))["segments"]:
        for w in s["words"]: out += expand(w)
    return out
W = [dict(w, src="full") for w in expanded(sys.argv[1])]
STEMS = sys.argv[3]
_lyr_tokens = set()
for _l in open(LYRICS, encoding="utf-8"):
    if not _l.startswith(("[", "<!--")):
        for _t in _l.split(): _lyr_tokens.add(norm(_t))
n_added = 0
for w in expanded(sys.argv[2]):
    nw = norm(w["w"])
    if len(nw) < 4 or nw not in _lyr_tokens: continue
    if any(norm(m["w"]) == nw and abs(m["s"] - w["s"]) < 0.6 for m in W): continue
    W.append(dict(w, src="vocals-stem")); n_added += 1
W.sort(key=lambda w: w["s"])
print("vocal-stem words added (lyric-token match, not in mix pass):", n_added, [(w["w"], round(w["s"], 1)) for w in W if w["src"] == "vocals-stem"])
heard = [norm(w["w"]) for w in W]

# ---------------- lyrics
secs = parse(LYRICS)
LW, owner = [], []
lines = []
for si, s in enumerate(secs):
    for li, l in enumerate(s["lines"]):
        toks = [norm(t) for t in l["text"].split() if norm(t)]
        lines.append(dict(sec=si, text=l["text"], voice_tag=l["voice_tag"], toks=toks))
        for t in toks: LW.append(t); owner.append(len(lines) - 1)
match = align(LW, heard)
for L in lines: L["m"] = []; L["unmatched"] = []
for k, mi in enumerate(match):
    lines[owner[k]]["m"].append(mi)
    if mi is None: lines[owner[k]]["unmatched"].append(LW[k])
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
    n = secs[si]["name"]; k = sum(1 for j in range(si + 1) if secs[j]["name"] == n)
    return f"{n} {k}" if cnt[n] > 1 else n
sections = []
prev_last_t = prev_end = 0.0
for si, s in enumerate(secs):
    label = sec_label(si)
    if s["name"] == "Intro":
        b, why, anchor = 0, "file start", "-"
    elif si in first_line:
        tw = lines[first_line[si]]["start"]; b, why = pick_start(tw); anchor = "first word %.2f s" % tw
    elif s["name"] == "Outro":
        b, why, anchor = bar_at_or_before(prev_last_t + 3), "n/a", "-"      # replaced below once the last chorus word is known
    else:
        b, why = pick_after(prev_end - 0.5, prev_end + 5.0); anchor = "after the previous section's last line ends (%.2f s)" % prev_end
        if why == "fallback": b, why = bar_at_or_before(prev_end + 0.5), "latest downbeat <= previous line end + 0.5 s"
    sections.append(dict(name=label, header=s["header"], start_bar_idx=b, why=why, anchor=anchor, lyric_sec=si))
    if si in last_line: prev_last_t = lines[last_line[si]]["start"]; prev_end = lines[last_line[si]]["end"]
last_big = max(w["s"] for w in W)                  # last heard word (the repeated choir chant runs past its one lyric line)
ob, owhy = pick_after(last_big, last_big + 6.0)
for sc_ in sections:
    if sc_["name"] == "Outro": sc_["start_bar_idx"], sc_["why"], sc_["anchor"] = ob, owhy, "after last heard word %.2f s" % last_big
sections.sort(key=lambda x: x["start_bar_idx"])
for i, sc_ in enumerate(sections):
    sc_["end_bar_idx"] = sections[i + 1]["start_bar_idx"] if i + 1 < len(sections) else len(db_t)
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

# ---------------- vocal stem: activity + f0 per line; accompaniment stem: chroma, drop-outs
yv, _ = librosa.load(STEMS + "/vocals.wav", sr=sr, mono=True)
ya, _ = librosa.load(STEMS + "/no_vocals.wav", sr=sr, mono=True)
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
    f0, vf, vp = librosa.pyin(seg, fmin=60, fmax=1000, sr=sr, frame_length=2048, hop_length=256)
    return f0[(vf) & (vp > 0.4) & ~np.isnan(f0)]
for L in lines:
    f = f0_frames(L["start"], L["end"]) if L["anchored"] else np.array([])
    L["f0_med"] = float(np.median(f)) if len(f) >= 12 else None
Ca = librosa.feature.chroma_cqt(y=ya, sr=sr, hop_length=512); tca = librosa.times_like(Ca[0], sr=sr, hop_length=512)
cma = lambda a, z: Ca[:, (tca >= a) & (tca < z)].mean(1)

# ---------------- stops: windows where the band (accompaniment stem) or the whole mix drops far below its local level
H = 0.1; fh = int(H * sr)
def db_h(x): return 20 * np.log10(librosa.feature.rms(y=x, frame_length=fh, hop_length=fh)[0] + 1e-9)
m_db, a_db, v_db = db_h(y), db_h(ya), db_h(yv); th = np.arange(len(m_db)) * H
loc = lambda x: median_filter(x, size=201, mode="nearest")        # +-10 s local median level
def windows(mask, min_len):
    out = []; i = 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j + 1 < len(mask) and mask[j + 1]: j += 1
            if (j - i + 1) * H >= min_len - 1e-9: out.append((i, j))
            i = j + 1
        else: i += 1
    return out
def describe(i, j, kind):
    a, z = float(th[i]), float(th[j] + H); mk = (th >= a) & (th < z)
    ws = [w for w in W if a - 0.1 <= w["s"] <= z]
    return dict(kind=kind, start=round(a, 2), end=round(z, 2), dur=round(z - a, 2), mix_db=round(float(m_db[mk].mean()), 1), band_db=round(float(a_db[mk].mean()), 1),
                vocal_db=round(float(v_db[mk].mean()), 1), mix_vs_local_db=round(float((m_db[mk] - loc(m_db)[mk]).mean()), 1), band_vs_local_db=round(float((a_db[mk] - loc(a_db)[mk]).mean()), 1),
                words=" ".join(w["w"] for w in ws))
def fill(mask, n):
    """close runs of False shorter than n frames inside True runs"""
    m = mask.copy(); i = 0
    while i < len(m):
        if not m[i]:
            j = i
            while j + 1 < len(m) and not m[j + 1]: j += 1
            if 0 < i and j + 1 < len(m) and j - i + 1 < n: m[i:j + 1] = True
            i = j + 1
        else: i += 1
    return m
stops = []
for i, j in windows(((m_db - loc(m_db)) < -12.0) | (m_db < -40.0), 0.2): stops.append(describe(i, j, "gap: whole mix >= 12 dB under its local level or under -40 dB"))
a_thr = float(np.median(a_db)) - 10.0                                  # band level 10 dB under the song's median band level
for i, j in windows(fill(a_db < a_thr, 5), 1.0):
    d = describe(i, j, "band down: accompaniment stem under %.1f dB (median - 10 dB)" % a_thr)
    d["voice_audible"] = bool(d["vocal_db"] > -40.0); stops.append(d)
stops.sort(key=lambda s: s["start"])
band_median_db = round(float(np.median(a_db)), 1)

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

# ---------------- tempo per section: fitted grid (median beat interval) + an independent onset comb on the section only
osm = gaussian_filter1d(oenv, 0.012 * sr / hop); osm = osm / osm.mean()
def comb_bpm(a, z):
    if z - a < 5.0: return None
    best = (-1e9, None)
    for per in np.arange(0.30, 0.37, 0.0003):
        offs = np.arange(0, per, 0.004)[:, None]; k = np.arange(0, int((z - a) / per) + 1)[None, :]
        tb = a + offs + per * k; ok = tb < z
        sc = ((osm[np.clip(np.rint(tb * sr / hop).astype(int), 0, len(osm) - 1)] - 1.0) * ok).sum(1) / ok.sum(1)
        i = int(np.argmax(sc))
        if sc[i] > best[0]: best = (float(sc[i]), float(per))
    return round(60 / best[1], 2), round(best[0], 3)

sec_out = []
for i, sc_ in enumerate(sections):
    b0, b1 = sc_["start_bar_idx"], sc_["end_bar_idx"]
    t0 = 0.0 if i == 0 else float(db_t[b0]); t1 = dur if b1 >= len(db_t) else float(db_t[b1])
    ks = key_of(chroma_mean(t0, t1))
    gb = g[(g >= t0) & (g < t1)]; iv = np.diff(gb)
    bpm_grid = round(float(60 / np.median(iv)), 2) if len(iv) >= 4 else None
    cb = comb_bpm(t0, t1)
    nb4 = int(bar_len[b0:b1].sum()) if b1 > b0 else 0
    sec_out.append(dict(name=sc_["name"], start=round(t0, 4), end=round(t1, 4), start_frame=fr(t0), end_frame=fr(t1), start_bar=b0 + 1, end_bar=b1,
                        n_bars=b1 - b0, mean_db=round(float(bar_db[b0:b1].mean()), 2), min_bar_db=round(float(bar_db[b0:b1].min()), 2), max_bar_db=round(float(bar_db[b0:b1].max()), 2),
                        mean_vocal_db=round(float(bar_vdb[b0:b1].mean()), 1), mean_band_db=round(float(a_db[(th >= t0) & (th < t1)].mean()), 1), voice_tags=sorted({lines[li]["voice_tag"] for li, L in enumerate(lines) if L["anchored"] and t0 - 0.5 <= L["start"] < t1 - 0.5 and lines[li]["voice_tag"]}),
                        start_rule=sc_["why"], anchor=sc_["anchor"], key=dict(best=ks[0][1], r=round(float(ks[0][0]), 3), second=ks[1][1], r2=round(float(ks[1][0]), 3)),
                        tempo=dict(bpm_fitted_grid=bpm_grid, bpm_onset_comb=cb[0] if cb else None, comb_score=cb[1] if cb else None, beats_in_bars=nb4,
                                   bars_x4_x_median_period_s=round(float(nb4 * np.median(iv)), 2) if len(iv) >= 4 else None, section_length_s=round(t1 - t0, 2))))
key_win = []
for b in range(0, len(db_t) - 8, 4):
    a_, z_ = float(db_t[b]), float(db_t[b + 8]); ks = key_of(chroma_mean(a_, z_))
    key_win.append(dict(start=round(a_, 2), end=round(z_, 2), bar=b + 1, key=ks[0][1], r=round(float(ks[0][0]), 3), second=ks[1][1], r2=round(float(ks[1][0]), 3)))
def shift_between(a, b_):
    return max(((np.corrcoef(np.roll(b_, k), a)[0, 1], k) for k in range(12)), key=lambda x: x[0])
def sec_by(name): return next((s for s in sec_out if s["name"] == name), None)
shifts = {}
c1, c2, fc = sec_by("Chorus 1"), sec_by("Chorus 2"), sec_by("Final Chorus")
for nm, A, B in (("Chorus1_vs_Chorus2", c1, c2), ("Chorus2_vs_FinalChorus", c2, fc), ("Chorus1_vs_FinalChorus", c1, fc)):
    if A and B:
        va, vb = chroma_mean(A["start"], A["end"]), chroma_mean(B["start"], B["end"])
        r, k = shift_between(va, vb)
        shifts[nm] = dict(best_shift_semitones=int(k), r_at_best=round(float(r), 3), r_at_zero=round(float(np.corrcoef(va, vb)[0, 1]), 3),
                          r_by_shift_0_to_11=[round(float(np.corrcoef(np.roll(vb, kk), va)[0, 1]), 3) for kk in range(12)])
# bar-by-bar test on the accompaniment stem: bar i of one chorus vs bar i of another (same melody and chords), best semitone shift per bar
bar_shift = {}
for nm, A, B in (("Chorus1_vs_Chorus2", c1, c2), ("Chorus2_vs_FinalChorus", c2, fc), ("Chorus1_vs_FinalChorus", c1, fc)):
    if not (A and B): continue
    rows = []
    for i in range(min(A["n_bars"], B["n_bars"])):
        va, vb = cma(db_t[A["start_bar"] - 1 + i], bar_end[A["start_bar"] - 1 + i]), cma(db_t[B["start_bar"] - 1 + i], bar_end[B["start_bar"] - 1 + i])
        r = [float(np.corrcoef(va, np.roll(vb, k))[0, 1]) for k in range(12)]; k = int(np.argmax(r))
        rows.append(dict(bar_in_chorus=i + 1, best_shift_semitones=k if k <= 6 else k - 12, r_best=round(r[k], 3), r_zero=round(r[0], 3)))
    bar_shift[nm] = dict(bars=rows, bars_with_shift_0=sum(x["best_shift_semitones"] == 0 for x in rows), n=len(rows))

# ---------------- tempo summary (segments from beatgrid.py)
per = np.diff(g)
tempo = dict(bpm_mean=round(float(60 / per.mean()), 3), beat_period_mean=round(float(per.mean()), 5),
             grid_segments=[dict(start=round(s["start"], 2), end=round(s["end"], 2), bpm=round(s["bpm"], 2), period=round(s["period"], 5)) for s in GR["segments"]],
             bars=len(db_t), odd_bars=[dict(bar=int(i + 1), t=round(float(db_t[i]), 2), beats=int(L_)) for i, L_ in enumerate(bar_len) if L_ != 4], first_downbeat=round(float(db_t[0]), 4),
             beats_total=int(len(g)), beats_in_bars=int(sum(bar_len)), last_beat=round(float(g[-1]), 4))
dv = np.abs(GR["dev_ms"])
tempo["onset_residual_ms"] = dict(max=round(float(dv.max()), 1), median_abs=round(float(np.median(dv)), 1), n_over_one_frame=int((dv > 1000 / FPS).sum()), n=len(g))

# ---------------- loudest / quietest
order = np.argsort(-bar_db)
loudest_bars = [dict(bar=int(b + 1), start=round(float(db_t[b]), 2), db=round(float(bar_db[b]), 2), section=next(s["name"] for s in sec_out if s["start_bar"] <= b + 1 <= s["end_bar"])) for b in order[:10]]
w4 = np.array([bar_db[b:b + 4].mean() for b in range(len(bar_db) - 3)]); q = int(np.argmin(w4[2:-2])) + 2
quietest = dict(start=round(float(db_t[q]), 2), end=round(float(bar_end[q + 3]), 2), mean_db=round(float(w4[q]), 2), first_bar=q + 1)

# ---------------- write
words_out = [dict(w=w["w"], start=round(w["s"], 3), end=round(w["e"], 3), prob=round(w["p"], 3), line=w["line"], matched_lyric=w["line"] is not None, source=w["src"]) for w in W]
lines_out = []
for li, L in enumerate(lines):
    lines_out.append(dict(text=L["text"], section=sec_label(L["sec"]), voice_tag=L["voice_tag"], f0_median_hz=None if L["f0_med"] is None else round(L["f0_med"], 1),
                          start=None if L["start"] is None else round(L["start"], 3), end=None if L["end"] is None else round(L["end"], 3),
                          start_frame=None if L["start"] is None else fr(L["start"]), end_frame=None if L["end"] is None else fr(L["end"]),
                          anchored=L["anchored"], matched_words=L["matched"], n_words=L["n_words"], unmatched_lyric_words=L["unmatched"], heard=L["heard"], mean_prob=round(L["prob"], 3) if L["anchored"] else None))
timing = dict(fps=FPS, duration=round(dur, 4), octave_check=GR["octave_check"], bpm=tempo["bpm_mean"], beat_period=tempo["beat_period_mean"], tempo=tempo,
              beats=[round(float(t), 4) for t in g], downbeats=[round(float(t), 4) for t in db_t],
              bars=[dict(bar=i + 1, start=round(float(db_t[i]), 4), end=round(float(bar_end[i]), 4), beats=int(bar_len[i]), mean_db=round(float(bar_db[i]), 2)) for i in range(len(db_t))],
              sections=sec_out, lines=lines_out, words=words_out, hits=hits, stops=stops, band_median_db=band_median_db,
              energy_per_bar=[round(float(x), 2) for x in bar_db], loudest_bars=loudest_bars, quietest_4_bar_stretch=quietest,
              key_per_section=[dict(section=s["name"], **s["key"]) for s in sec_out],
              key_windows_8bar=key_win, key_shift_between_choruses=shifts, chorus_bar_by_bar_shift=bar_shift,
              vocal_activity=vocal_activity, vocal_db_per_bar=[round(float(x), 1) for x in bar_vdb], heard_not_in_lyrics=extra)
json.dump(timing, open(D + "timing.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("sections:")
for s in sec_out:
    print("  %-26s %7.2f-%7.2f bars %3d-%3d (%2d) %6.1f dB  %-10s grid %s comb %s [%s]" % (s["name"], s["start"], s["end"], s["start_bar"], s["end_bar"], s["n_bars"], s["mean_db"], s["key"]["best"], s["tempo"]["bpm_fitted_grid"], s["tempo"]["bpm_onset_comb"], s["start_rule"]))
print("anchored lines %d/%d" % (sum(l["anchored"] for l in lines_out), len(lines_out)))
print("stops", len(stops)); print("shifts", shifts); print("bar shifts", {k: (v["bars_with_shift_0"], v["n"]) for k, v in bar_shift.items()}); print("tempo", tempo["grid_segments"]); print("loudest", loudest_bars); print("quietest", quietest)
