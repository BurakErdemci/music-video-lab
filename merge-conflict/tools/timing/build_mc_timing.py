"""Builds data/take-v1/ (mc-timing.json and side files) for the first Suno version of "Merge Conflict".
Same schema as data/take-2026-10-20/mc-timing.json; ported from vorathul-nerfed/tools/timing (beatgrid, downbeats, build_timing).
Inputs (all in data/take-v1/ unless noted): _grid.json (beatgrid.py), _downbeats.json (downbeats.py), whisper_main.json and
whisper_vocals.json (whisper_words.py on the mix and on the demucs vocal stem), sarki/sozler-v1.md, audio/merge-conflict-v1.wav.
usage: python -I build_mc_timing.py STEMS_DIR      (STEMS_DIR holds drums/bass/other/vocals.wav from demucs htdemucs)
Lyrics are bound only to measured (heard) words; a lyric line with < 50 % of its words heard gets start/end null."""
import sys, re, json, numpy as np, librosa
from pathlib import Path
from scipy.ndimage import median_filter
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lyrics_align import align, norm
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
D = ROOT / "data" / "take-v1"
STEMS = Path(sys.argv[1])
SRC = ROOT / "audio" / "merge-conflict-v1.wav"
LYRICS = ROOT / "sarki" / "sozler-v1.md"
sr = 22050

g = np.array(json.load(open(D / "_grid.json"))["beats"]); GR = json.load(open(D / "_grid.json"))
starts = json.load(open(D / "_downbeats.json"))["starts"]
y, _ = librosa.load(SRC, sr=sr, mono=True); dur = len(y) / sr
stem = {k: librosa.load(STEMS / f"{k}.wav", sr=sr, mono=True)[0] for k in ("drums", "bass", "other", "vocals")}
acc = stem["drums"] + stem["bass"] + stem["other"]
db_t = g[starts]; bar_end = np.r_[db_t[1:], dur]
bar_len = np.diff(starts + [len(g)])
rms_db = lambda x, a, z: float(20 * np.log10(np.sqrt(np.mean(x[int(a * sr):int(z * sr)] ** 2)) + 1e-9)) if z > a else -90.0

# ---------------- bars: loudness per stem + heaviness proxies
S2 = np.abs(librosa.stft(y, n_fft=2048, hop_length=512)) ** 2; fr_hz = librosa.fft_frequencies(sr=sr, n_fft=2048); tt = librosa.times_like(S2[0], sr=sr, hop_length=512)
flat = librosa.feature.spectral_flatness(S=np.sqrt(S2))[0]
bars = []
for i, (a, z) in enumerate(zip(db_t, bar_end)):
    m = (tt >= a) & (tt < z); P = S2[:, m]; tot = P.sum() + 1e-12
    bars.append(dict(bar=i, start=round(float(a), 4), end=round(float(z), 4), mix=rms_db(y, a, z), drums=rms_db(stem["drums"], a, z), bass=rms_db(stem["bass"], a, z),
                     other=rms_db(stem["other"], a, z), vocals=rms_db(stem["vocals"], a, z), beats=int(bar_len[i]),
                     low_pct=round(float(100 * P[fr_hz < 150].sum() / tot), 1), high_pct=round(float(100 * P[fr_hz > 4000].sum() / tot), 1), flatness=round(float(flat[m].mean()), 4)))
def pct_rank(v):
    v = np.asarray(v, float); return 100 * (np.argsort(np.argsort(v)) / max(1, len(v) - 1))
# heaviness 0-100 = mean percentile of: mix loudness, drums, bass-stem level, share of energy under 150 Hz. Flatness and high-band share are reported next to it
# (distortion / scream proxy) but not in the index: they are high on bright pop bars too (hats, synth leads).
heavy = np.mean([pct_rank([b["mix"] for b in bars]), pct_rank([b["drums"] for b in bars]), pct_rank([max(b["bass"], -60) for b in bars]), pct_rank([b["low_pct"] for b in bars])], axis=0)
for b, h in zip(bars, heavy): b["heavy"] = round(float(h), 1)
step = np.r_[0, np.diff([b["mix"] for b in bars])]

# ---------------- words
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
def spell(n): return [ONES[n]] if n < 20 else [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
def expand(w):
    t = w["w"].strip()
    if not re.search(r"[\d%]", t): return [w]
    parts = []
    for tok in re.sub(r"\.(?=\d)", " point ", t).replace("%", " percent ").split():
        tok = tok.strip(".,!?")
        if tok.isdigit() and int(tok) < 100: parts += spell(int(tok))
        elif tok: parts.append(tok)
    if not parts: return [w]
    d = (w["e"] - w["s"]) / len(parts)
    return [dict(w, w=p, s=w["s"] + i * d, e=w["s"] + (i + 1) * d) for i, p in enumerate(parts)]
def expanded(path):
    out = []
    for s in json.load(open(path, encoding="utf-8"))["segments"]:
        for w in s["words"]: out += expand(w)
    return out
W = [dict(w, src="full") for w in expanded(D / "whisper_main.json")]
lyr_tokens = set()
for l in open(LYRICS, encoding="utf-8"):
    if not l.startswith(("[", "#", "`", "```")):
        for t in l.split(): lyr_tokens.add(norm(t))
for w in expanded(D / "whisper_vocals.json"):
    nw = norm(w["w"])
    if len(nw) < 4 or nw not in lyr_tokens: continue
    if any(norm(m["w"]) == nw and abs(m["s"] - w["s"]) < 0.6 for m in W): continue
    W.append(dict(w, src="vocals-stem"))
W.sort(key=lambda w: w["s"]); heard = [norm(w["w"]) for w in W]

# ---------------- lyrics (v1 sheet: ``` fenced block; [Header: ...] sets the section, a leading [Voice] tag on a line sets the voice)
raw = open(LYRICS, encoding="utf-8").read()
block = raw.split("## Lyrics (v1)")[1].split("```")[1]
lsecs = []; cur = None
for ln in block.splitlines():
    s = ln.strip()
    if not s: continue
    m = re.match(r"^\[(.+)\]$", s)
    if m:
        hdr = m.group(1); cur = dict(header=hdr, name=hdr.split(":")[0].strip(), lines=[]); lsecs.append(cur); continue
    voice = None; m = re.match(r"^\[([^\]]+)\]\s*(.*)$", s)
    if m: voice, s = m.group(1), m.group(2)
    if norm(s): cur["lines"].append(dict(text=s, voice=voice))
lines = []; LW = []; owner = []
for si, sec in enumerate(lsecs):
    for l in sec["lines"]:
        toks = [norm(t) for t in l["text"].split() if norm(t)]
        lines.append(dict(sec=si, header=sec["header"], text=l["text"], voice=l["voice"], toks=toks))
        for t in toks: LW.append(t); owner.append(len(lines) - 1)
match = align(LW, heard)
for L in lines: L["m"] = []; L["unmatched"] = []
for k, mi in enumerate(match):
    lines[owner[k]]["m"].append(mi)
    if mi is None: lines[owner[k]]["unmatched"].append(LW[k])
for L in lines:
    ok = [m for m in L["m"] if m is not None]
    L["ratio"] = len(ok) / len(L["toks"]); L["anchored"] = bool(ok) and L["ratio"] >= 0.5
    if L["anchored"]:
        a, z = W[ok[0]], W[ok[-1]]
        L["start"] = a["s"]; L["end"] = z["s"] + min(z["e"] - z["s"], max(0.35, 0.09 * len(norm(z["w"])) + 0.2))
        L["heard"] = " ".join(W[m]["w"] for m in ok)
    else: L["start"] = L["end"] = None; L["heard"] = " ".join(W[m]["w"] for m in ok)
used = set(m for m in match if m is not None)
extra = []; run = []
for wi in range(len(W) + 1):
    if wi < len(W) and wi not in used: run.append(wi)
    else:
        if len(run) >= 2: extra.append(dict(start=round(W[run[0]]["s"], 2), end=round(W[run[-1]]["e"], 2), text=" ".join(W[i]["w"] for i in run)))
        run = []

# ---------------- stops: true silences, band stops (accompaniment gone, voice may stay), micro gaps
H = 0.05; fh = int(H * sr)
def db_h(x): return 20 * np.log10(librosa.feature.rms(y=x, frame_length=fh, hop_length=fh, center=False)[0] + 1e-9)
m_db, a_db, v_db = db_h(y), db_h(acc), db_h(stem["vocals"]); th = np.arange(len(m_db)) * H
def runs(mask, min_len):
    out = []; i = 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j + 1 < len(mask) and mask[j + 1]: j += 1
            if (j - i + 1) * H >= min_len - 1e-9: out.append((float(th[i]), min(float(th[j] + H), dur)))
            i = j + 1
        else: i += 1
    return out
loc = median_filter(m_db, size=81, mode="nearest")                   # +-2 s local level
sil = runs(m_db < -45.0, 0.2)                                         # true silence: the whole mix under -45 dB
gaps = runs((m_db - loc) < -12.0, 0.1)                                # short dips >= 12 dB under the local level
a_med = float(np.median(a_db))
band = runs(a_db < a_med - 20.0, 0.3)                                 # accompaniment stem 20 dB under its median for >= 0.3 s
def lvl(t0, t1): mk = (th >= t0) & (th < t1); return float(m_db[mk].mean()), float(a_db[mk].mean()), float(v_db[mk].mean())
hard_stops = []; stops_raw = []
for a, z in sil:
    before = float(m_db[(th >= a - 1.0) & (th < a - 0.1)].mean()) if a > 1.1 else float("nan"); mi, ai, vi = lvl(a, z)
    hard_stops.append(dict(start=round(a, 2), end=round(z, 2), drop_db=None if np.isnan(before) else round(before - mi, 1), kind="true silence", note="whole mix under -45 dB (mix %.1f dB)" % mi))
    stops_raw.append([round(a, 2), round(z, 2), round(z - a, 2), None if np.isnan(before) else round(before, 2), round(mi, 2)])
for a, z in band:
    if any(a < zs and z > as_ for as_, zs in sil): continue          # a true silence already covers it
    mi, ai, vi = lvl(a, z)
    hard_stops.append(dict(start=round(a, 2), end=round(z, 2), drop_db=round(a_med - ai, 1), kind="band stop" if vi > -45 else "band stop, voice also gone",
                           note="drums+bass+other 20 dB under their median (%.1f dB); voice %.1f dB; mix %.1f dB" % (ai, vi, mi)))
hard_stops.sort(key=lambda s: s["start"])
micro_gaps = [[round(a, 2), round(z, 2)] for a, z in gaps if not any(a < s["end"] and z > s["start"] for s in hard_stops)]

# ---------------- sections: explicit anchors, each rule recorded
def bar_at_or_before(t): return int(np.searchsorted(db_t, t, side="right") - 1)
def bar_nearest(t): return int(np.argmin(np.abs(db_t - t)))
# (name, lyric header prefix, first bar index, why this bar). Bar indices count from the first downbeat (0.303 s); rules are explained in timing-summary.md.
SECTION_SPEC = [
    ("intro_robot", "Intro", 0, "file start; two flat robot lines 0.32-1.2 and 1.9-4.6 over a hit and a short drum fill"),
    ("intro_groove", None, 3, "instrumental: bass and full drums enter at 4.82 and play to the guitar hit, no sung word"),
    ("verse1_sweet", "Verse 1", 12, "downbeat of the bar holding the first word (17.10), band stop 17.25-17.75 inside it"),
    ("verse2_raspy", "Verse 2", 20, "downbeat of the bar holding the first word (27.84)"),
    ("prechorus", "Pre-Chorus", 29, "first 'Blue!' (38.56) is a 0.57 s pickup, bound to the next downbeat"),
    ("chorus1", "Chorus", 32, "first 'Accept' 43.08 is on the downbeat (-0.05 s)"),
    ("verse3_trade", "Verse 3", 48, "drum-led restart on the downbeat (fill from 64.20) after the a cappella stop 62.45-64.15; Whisper's first 'You' is 64.60 but the voice stem rises only at about 65.15"),
    ("scream", "Both voices scream", 56, "'Ah' 75.50 is the first scream; whole band stopped 74.0-75.9"),
    ("breakdown_git_push_force", "Breakdown", 57, "heavy riff returns on the downbeat 76.45 (energy step +4.2 dB, bass back); GIT enters at 81.04"),
    ("whisper", "Sweet voice, horrified", 62, "'You wouldn't' 83.28-84.38 inside this bar and the next"),
    ("synth_bridge", None, 63, "instrumental: full band plus bright synth, no voiced vocal 84.5-88.9 (pyin voiced fraction 0)"),
    ("piano_interlude", "Soft Interlude", 67, "drums and bass leave on this downbeat (stop 89.4-89.75); 'Maybe' is a 0.82 s pickup at 88.96"),
    ("build", "Build", 71, "drums return at 95.11 under the harmonized 'We're the same file'"),
    ("final_chorus", "Final Chorus", 76, "first 'Accept' 101.76 is on the downbeat; drum-less held chord 100.4-101.77 before it"),
    ("robot_build_failed", "Music stops", 92, "drums and bass gone at 123.11, robot 'Failed' 123.66"),
    ("scream_end", "Both voices scream", 95, "heavy band re-enters on the downbeat 127.10 after the stop 124.5-127.1"),
    ("outro", "Outro", 112, "blast beat returns 149.5-150.5, then decay and silence"),
]
sections = []
for i, (name, hdr, b0, rule) in enumerate(SECTION_SPEC):
    b1 = SECTION_SPEC[i + 1][2] if i + 1 < len(SECTION_SPEC) else len(db_t)
    t0 = 0.0 if i == 0 else float(db_t[b0]); t1 = dur if b1 >= len(db_t) else float(db_t[b1])
    sections.append(dict(name=name, start=round(t0, 2), end=round(t1, 2), _b0=b0, _b1=b1, _hdr=hdr, _rule=rule))

# ---------------- key
# key from the bass + other stems (drums and screams smear the mix chroma: mix-chroma key was C minor r=0.64, a weaker fit)
yh = stem["bass"] + stem["other"]
yc = librosa.feature.chroma_cqt(y=yh, sr=sr, hop_length=512, tuning=librosa.estimate_tuning(y=yh, sr=sr)); tc = librosa.times_like(yc[0], sr=sr, hop_length=512)
KS_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); KS_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
def key_of(v):
    sc = []
    for k in range(12):
        sc.append((float(np.corrcoef(v, np.roll(KS_MAJ, k))[0, 1]), NOTE[k] + " major")); sc.append((float(np.corrcoef(v, np.roll(KS_MIN, k))[0, 1]), NOTE[k] + " minor"))
    return sorted(sc, reverse=True)
chroma = lambda a, z: yc[:, (tc >= a) & (tc < z)].mean(1)
ks = key_of(chroma(0, dur))
key_str = "%s (bass+other chroma, r=%.2f; next %s %.2f; both choruses read A# major, i.e. Ab major, the relative of F minor)" % (ks[0][1], ks[0][0], ks[1][1], ks[1][0])
for s in sections:
    k2 = key_of(chroma(s["start"], s["end"])); s["key"] = dict(best=k2[0][1], r=round(k2[0][0], 3), second=k2[1][1], r2=round(k2[1][0], 3))
key_windows = []
for b in range(0, len(db_t) - 8, 4):
    k2 = key_of(chroma(db_t[b], db_t[b + 8])); key_windows.append(dict(start=round(float(db_t[b]), 2), end=round(float(db_t[b + 8]), 2), bar=b, key=k2[0][1], r=round(k2[0][0], 3), second=k2[1][1], r2=round(k2[1][0], 3)))
def shift(a_rng, b_rng):
    va, vb = chroma(*a_rng), chroma(*b_rng); return max(((float(np.corrcoef(np.roll(vb, k), va)[0, 1]), k) for k in range(12)))
sec = {s["name"]: s for s in sections}
key_shift = {}
if "chorus1" in sec and "final_chorus" in sec:
    r, k = shift((sec["chorus1"]["start"], sec["chorus1"]["end"]), (sec["final_chorus"]["start"], sec["final_chorus"]["end"]))
    key_shift["chorus1_vs_final_chorus"] = dict(best_shift_semitones=int(k), r_at_best=round(r, 3), r_at_zero=round(float(np.corrcoef(chroma(sec["chorus1"]["start"], sec["chorus1"]["end"]), chroma(sec["final_chorus"]["start"], sec["final_chorus"]["end"]))[0, 1]), 3))

# ---------------- tempo + independent checks
osm_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=128); from scipy.ndimage import gaussian_filter1d
osm = gaussian_filter1d(osm_env, 0.012 * sr / 128); osm = osm / osm.mean()
def comb_bpm(a, z, lo=0.28, hi=0.45):
    if z - a < 5.0: return None
    best = (-1e9, None)
    for per in np.arange(lo, hi, 0.0003):
        offs = np.arange(0, per, 0.004)[:, None]; k = np.arange(0, int((z - a) / per) + 1)[None, :]; tb = a + offs + per * k; ok = tb < z
        sc = ((osm[np.clip(np.rint(tb * sr / 128).astype(int), 0, len(osm) - 1)] - 1.0) * ok).sum(1) / ok.sum(1); i = int(np.argmax(sc))
        if sc[i] > best[0]: best = (float(sc[i]), float(per))
    return round(60 / best[1], 2)
iv = np.diff(g)
w20 = []
for a in np.arange(0, dur - 20, 5.0):
    mm = (g[:-1] >= a) & (g[:-1] < a + 20)
    if mm.sum() > 20: w20.append(60 / float(np.median(iv[mm])))
for s in sections:
    b0, b1 = s["_b0"], s["_b1"]; t0, t1 = s["start"], s["end"]
    nb = int(bar_len[b0:b1].sum()); gb = g[(g >= t0 - 1e-6) & (g < t1 - 1e-6)]; per = float(np.median(np.diff(gb))) if len(gb) > 4 else None
    s["bars"] = [b0, b1]; s["n_bars"] = b1 - b0; s["beats_in_bars"] = nb
    s["mean_db"] = round(float(np.mean([bars[i]["mix"] for i in range(b0, min(b1, len(bars)))])), 2)
    s["mean_bass_db"] = round(float(np.mean([bars[i]["bass"] for i in range(b0, min(b1, len(bars)))])), 1)
    s["mean_low_pct"] = round(float(np.mean([bars[i]["low_pct"] for i in range(b0, min(b1, len(bars)))])), 1)
    s["mean_heavy"] = round(float(np.mean([bars[i]["heavy"] for i in range(b0, min(b1, len(bars)))])), 1)
    s["mean_vocal_db"] = round(float(np.mean([bars[i]["vocals"] for i in range(b0, min(b1, len(bars)))])), 1)
    s["bpm_grid"] = round(60 / per, 2) if per else None; s["bpm_onset_comb"] = comb_bpm(t0, t1)
    s["bars_x4_x_period_s"] = round(nb * float(np.median(iv)), 2); s["length_s"] = round(t1 - t0, 2)

# ---------------- write
words_out = [dict(w=w["w"], s=round(w["s"], 3), e=round(w["e"], 3), p=round(w["p"], 3)) for w in W]
lyric_alignment = [dict(section=L["header"].replace(": ", " - "), text=L["text"], ratio=round(L["ratio"], 2), start=None if L["start"] is None else round(L["start"], 2),
                        end=None if L["end"] is None else round(L["end"], 2), heard=L["heard"] if L["anchored"] else None) for L in lines]
hooks = []
for i, w in enumerate(W[:-1]):
    if norm(w["w"]) in ("accept", "except") and norm(W[i + 1]["w"]) in ("current", "incoming", "both"):
        hooks.append([round(w["s"], 2), w["w"], W[i + 1]["w"]])
out_bars = [dict(b, mix=round(b["mix"], 2), drums=round(b["drums"], 2), bass=round(b["bass"], 2), other=round(b["other"], 2), vocals=round(b["vocals"], 2)) for b in bars]
timing = dict(source="merge-conflict-v1.wav", duration=round(dur, 2), key=key_str, meter="4/4 assumed", bpm_mean=round(float(60 / np.diff(g[g >= GR["segments"][1]["start"]]).mean()), 2),   # mean over the steady part: the first fitted segment (0-4.16 s, robot lines) has no pulse
              
              bpm_range_20s=[round(min(w20), 1), round(max(w20), 1)],
              beats=[round(float(t), 3) for t in g], downbeats=[round(float(t), 3) for t in db_t],
              downbeat_note="downbeats from downbeats.py (kick + bass chroma + energy-step dynamic programme over the beat grid); bars are 4 beats except the odd ones listed in bars[].beats",
              bars=out_bars,
              sections=[dict(name=s["name"], start=s["start"], end=s["end"]) for s in sections],
              hard_stops=hard_stops, micro_gaps=micro_gaps, words=words_out, lyric_alignment=lyric_alignment, accept_hooks=hooks)
dump = lambda name, obj: json.dump(obj, open(D / name, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
dump("mc-timing.json", timing)
dump("bars.json", out_bars)
dump("lyric_align.json", [dict(l, voice=L["voice"]) for l, L in zip(lyric_alignment, lines)])
dump("stops_raw.json", stops_raw)
# details for timing-summary.md (not part of the engine schema)
dump("_detail.json", dict(sections=sections, grid_segments=[dict(start=round(s["start"], 2), end=round(s["end"], 2), bpm=round(s["bpm"], 2), period=round(s["period"], 5)) for s in GR["segments"]],
                          octave_check=GR["octave_check"], onset_residual_ms=dict(max=round(float(np.abs(GR["dev_ms"]).max()), 1), median_abs=round(float(np.median(np.abs(GR["dev_ms"]))), 1), n=len(GR["dev_ms"])),
                          key_windows=key_windows, key_shift=key_shift, extra_heard=extra, hard_stops=hard_stops, micro_gaps=micro_gaps, lines=[{k: v for k, v in L.items() if k not in ("m", "toks")} for L in lines],
                          odd_bars=[dict(bar=i, t=round(float(db_t[i]), 2), beats=int(bar_len[i])) for i in range(len(db_t)) if bar_len[i] != 4], w20=[round(x, 2) for x in w20]))
print("sections:")
for s in sections: print("  %-26s %7.2f-%7.2f bars %3d-%3d (%2d) %6.1f dB bass %6.1f heavy %5.1f grid %s comb %s  %s" % (s["name"], s["start"], s["end"], s["_b0"], s["_b1"], s["n_bars"], s["mean_db"], s["mean_bass_db"], s["mean_heavy"], s["bpm_grid"], s["bpm_onset_comb"], s["key"]["best"]))
print("hard_stops"); [print("  ", h) for h in hard_stops]
print("micro_gaps", micro_gaps); print("hooks", hooks); print("key", key_str, key_shift)
print("lines anchored %d/%d" % (sum(L["anchored"] for L in lines), len(lines)))
