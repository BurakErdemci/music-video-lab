"""Writes data/take-v4/timing-summary.md from the files build_mc_timing.py, voice_contrast.py, token_map.py and gridcheck.mjs leave in data/take-v4/.
usage: python -I make_summary_v4.py [gridcheck output file]"""
import sys, re, json, numpy as np, librosa
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]; D = ROOT / "data" / "take-v4"
T = json.load(open(D / "mc-timing.json", encoding="utf-8")); X = json.load(open(D / "_detail.json", encoding="utf-8")); G = json.load(open(D / "_grid.json"))
VC = json.load(open(D / "voice_contrast.json", encoding="utf-8")); CW = json.load(open(D / "colour_words.json", encoding="utf-8")); TM = json.load(open(D / "token_map.json", encoding="utf-8"))
GC = open(sys.argv[1], encoding="utf-8").read().strip() if len(sys.argv) > 1 else ""
db = np.array(T["downbeats"]); beats = np.array(T["beats"]); bars = T["bars"]; secs = X["sections"]; dur = T["duration"]; W = T["words"]
mmss = lambda t: "%d:%05.2f" % (int(t // 60), t - 60 * int(t // 60))
L = []; w = L.append
sec_of_bar = lambda i: next(s["name"] for s in secs if s["_b0"] <= i < s["_b1"])
label = lambda h: "METAL" if h >= 65 else ("mid" if h >= 45 else "pop/soft")
S_ = {s["name"]: s for s in secs}

y, sr = librosa.load(ROOT / "audio" / "merge-conflict-v4.wav", sr=22050, mono=True)
H = 0.05; fh = int(H * sr); lv = 20 * np.log10(librosa.feature.rms(y=y, frame_length=fh, hop_length=fh, center=False)[0] + 1e-9); tl = np.arange(len(lv)) * H
steps = []
for i in range(3, len(lv) - 3):
    d = lv[i:i + 3].mean() - lv[i - 3:i].mean()
    if abs(d) >= 6.0 and (not steps or tl[i] - steps[-1][0] > 0.5): steps.append((float(tl[i]), float(d)))
off = [(t, d, (t - db[int(np.argmin(np.abs(db - t)))]) * 1000) for t, d in steps]
ups = [o for o in off if o[1] > 0]; downs = [o for o in off if o[1] < 0]
beat_off = lambda r: [abs((t - beats[int(np.argmin(np.abs(beats - t)))]) * 1000) for t, d, e in r]
st = lambda r: (len(r), float(np.median([abs(o[2]) for o in r])) if r else float("nan"), sum(abs(o[2]) <= 16.7 for o in r), sum(abs(o[2]) <= 33.3 for o in r))
per = float(np.median(np.diff(beats))); tb = sum(b["beats"] for b in bars)

w("# Merge Conflict v4 — timing summary (take-v4)\n")
w("Source `audio/merge-conflict-v4.wav` (final take: a Suno Cover of v1 with the v4 lyrics, git-ignored), %.2f s, 48 kHz stereo. Every number is measured from that file. Bar numbers are the 0-based `bars[].bar` of `mc-timing.json` (bar 0 starts at the first downbeat, %.3f s). Method and tools as for take-v1 (`tools/timing/`), with `MC_TAKE=v4`.\n" % (dur, db[0]))
w("## 1. Tempo and key\n")
segs = X["grid_segments"]
w("- **%.2f BPM** (`bpm_mean`; `bpm_range_20s` %.1f-%.1f). Suno was asked for 185; take-v1 was 180.07; the old take 153." % (T["bpm_mean"], T["bpm_range_20s"][0], T["bpm_range_20s"][1]))
w("- The tempo is not perfectly constant: the fitted grid has %d constant-tempo segments, %s. The drift (180.6 to 179.4 BPM, 0.7 %%) is real, so the engine must read the beats, never one constant. Beat 0.332-0.334 s, bar about 1.33 s." % (len(segs), ", ".join("%.2f BPM %.1f-%.1f s" % (s["bpm"], s["start"], s["end"]) for s in segs)))
o = X["octave_check"]
w("- Beat level: straight-grid onset comb %.3f at %.2f BPM (pulse), %.3f at %.2f BPM (half-time), %.3f at %.2f BPM (double). As in v1 the half-time comb scores slightly higher; the 180 level is kept for the same reason (one lyric line = 2 bars, 16-bar choruses, so the engine's bar logic is unchanged)." % (o["pulse"]["score"], o["pulse"]["bpm"], o["half_time"]["score"], o["half_time"]["bpm"], o["double_time"]["score"], o["double_time"]["bpm"]))
w("- Grid accuracy: onset-snapped minus grid, median |dev| %.1f ms, max %.1f ms; %d of %d beats further than 33.3 ms from an onset peak (stops, held notes, and the decaying tail after 230 s)." % (X["onset_residual_ms"]["median_abs"], X["onset_residual_ms"]["max"], int((np.abs(np.array(G["dev_ms"])) > 33.3).sum()), len(G["dev_ms"])))
w("- Odd bars the downbeat tracker inserted: %s. The first two are in the intro groove (2 + 6 beats = two normal bars: the tracker shifted bar phase by two beats there), so bars 9-11 are the least reliable bar lines; the last is the 2.5 s decay after the music ends. Every section start from bar 12 on is a regular 4-beat bar." % ", ".join("bar %d at %.2f s = %d beats" % (b["bar"], b["t"], b["beats"]) for b in X["odd_bars"]))
w("- **Key: %s.** Measured on the bass + other stems; all three choruses read A# major (= Ab major, the relative of F minor), so the tonal centre is F minor with Ab major choruses, as in take-v1. No key change in the final chorus (chorus 1 vs final chorus: best shift %d semitones, r=%.2f)." % (T["key"], X["key_shift"]["chorus1_vs_final_chorus"]["best_shift_semitones"], X["key_shift"]["chorus1_vs_final_chorus"]["r_at_best"]))
w("\n### Structural validation (bars x 4 x beat = durations)\n")
w("| section | bars | beats in bars | bars x 4 x beat (s) | section length (s) | diff (beats) | grid BPM | independent onset-comb BPM |")
w("|---|---|---|---|---|---|---|---|")
for s in secs:
    w("| %s | %d | %d | %.2f | %.2f | %+.2f | %s | %s |" % (s["name"], s["n_bars"], s["beats_in_bars"], s["bars_x4_x_period_s"], s["length_s"], (s["length_s"] - s["bars_x4_x_period_s"]) / per, s["bpm_grid"] if s["bpm_grid"] else "-", s["bpm_onset_comb"] if s["bpm_onset_comb"] else "- (under 5 s)"))
w("| **whole song** | %d | %d | %.2f | %.2f (first downbeat %.3f to end) | %+.2f | %.2f | - |" % (len(bars), tb, tb * per, dur - db[0], db[0], (dur - db[0] - tb * per) / per, T["bpm_mean"]))
w("\nSections start and end on downbeats, so the equation holds by construction; the tests that do not use the grid:\n")
combs = [s["bpm_onset_comb"] for s in secs if s["bpm_onset_comb"]]
w("1. The onset comb run on each section alone lands on %.1f-%.1f BPM, following the drift above (180.5 early, 179.3-179.6 late); never near 185 or 153." % (min(combs), max(combs)))
u, dn = st(ups), st(downs)
bu, bd = beat_off(ups), beat_off(downs)
w("2. Abrupt level steps (>= 6 dB between the 0.15 s before and after, %d of them) against the grid. **Rises** (hits, re-entries; %d): median distance to the nearest *downbeat* %.0f ms (only %d within 33 ms), to the nearest *beat* %.0f ms (%d of %d within 33 ms). **Falls** (the start of a stop; %d): %.0f ms to a downbeat, %.0f ms to a beat (%d of %d within 33 ms). Reading: the stops and re-entries sit on beats, not on bar lines (a phrase breaks anywhere in the bar); at this test's 50 ms frame resolution a median 47-70 ms to a beat is consistent with all of them being on beats. The bar phase is verified by the section starts: chorus 1, chorus 2 and the final chorus start within 0.06 s of their downbeats, verse 4 within 0.16 s; the other verses and the pre-chorus start with a sung pickup or syncopation 0.5-0.8 s into their bar." % (len(off), u[0], u[1], u[3], float(np.median(bu)), sum(x <= 33.3 for x in bu), len(bu), dn[0], dn[1], float(np.median(bd)), sum(x <= 33.3 for x in bd), len(bd)))
w("3. Whole song: %d bars hold %d beats = %.2f s against %.2f s of music after the first downbeat (%+.2f beats; the song ends in a 2.5 s decay)." % (len(bars), tb, tb * per, dur - db[0], (dur - db[0] - tb * per) / per))

w("\n## 2. Sections\n")
w("Loudness is RMS in dB of the mix (mean over the section's bars). Bass weight = mean bass-stem dB and the share of mix energy under 150 Hz. Heaviness is the 0-100 index of section 4 (percentile ranks within this song). Names follow the v4 lyric tags.\n")
w("| section | start | end | bars (from-to) | n bars | length s | mean dB | bass stem dB | energy < 150 Hz | heaviness | voice stem dB | start rule |")
w("|---|---|---|---|---|---|---|---|---|---|---|---|")
for s in secs:
    w("| %s | %.2f (%s) | %.2f (%s) | %d-%d | %d | %.2f | %.1f | %.1f | %.0f %% | %.0f (%s) | %.1f | %s |" % (s["name"], s["start"], mmss(s["start"]), s["end"], mmss(s["end"]), s["_b0"], s["_b1"] - 1, s["n_bars"], s["length_s"], s["mean_db"], s["mean_bass_db"], s["mean_low_pct"], s["mean_heavy"], label(s["mean_heavy"]), s["mean_vocal_db"], s["_rule"]))
sol = S_["guitar_solo"]
w("\n**Lyric sections against the audio**\n")
w("- **Every lyric section is in the audio**, in lyric order: intro, verse 1, verse 2, pre-chorus, chorus, verse 3 (rebase), chorus 2, verse 4 (tabs/spaces), scream, breakdown, whisper line, guitar solo, soft interlude, build, final chorus, post-chorus chant, Build failed, scream, outro. Both choruses and the final chorus are 16 bars.")
w("- **Added by the audio, not in the lyric tags:** `intro_groove` (%.2f-%.2f s, bass and full drums before any singing). The lyric's `[Heavy guitar hit]` is not a separate event here (no band stop at the start of verse 1; bar 12 is an ordinary bar). The scream_end / outro split is by energy only: no word is heard from 196.5 s to the end (Whisper's \"We'll be right back.\" at 231.1 s is a hallucination), so the whole 196.15-232.12 s block is `[Both voices scream]` + `[Outro]` with one energy break (bar 160, 213.54 s)." % (S_["intro_groove"]["start"], S_["intro_groove"]["end"]))
w("- **\"...you wouldn't\" is not a stop** (125.52-126.74 s): the band plays under it (mix -19 dB); the only break is a 0.3 s band stop 126.40-126.70 s right before the solo. The lyric's \"everything stops\" before the piano is real: bass and drums leave at 140.04 s.")
w("- **Guitar solo: %.2f-%.2f s = %.2f s = %d bars** (bars %d-%d). No word is heard in it, the 'other' stem (guitars/synth) is at -25 to -29 dB, bass and drums keep playing (bass %.1f dB, heaviness %.0f); it ends where bass and the heavy drums leave for the piano." % (sol["start"], sol["end"], sol["length_s"], sol["n_bars"], sol["_b0"], sol["_b1"] - 1, sol["mean_bass_db"], sol["mean_heavy"]))
w("- The piano interlude is only the drum-less, bass-less part: %.2f-%.2f s, %d bars; drums return under \"We're the same file\" at %.2f s (`build`, %d bars)." % (S_["piano_interlude"]["start"], S_["piano_interlude"]["end"], S_["piano_interlude"]["n_bars"], S_["build"]["start"], S_["build"]["n_bars"]))

w("\n## 3. Hard stops and true silences\n")
w("`hard_stops` lists **band stops** (drums+bass+other under their song median by 20 dB for >= 0.3 s; the voice may stay) and **true silence** (whole mix under -45 dB). `micro_gaps` are 0.1-0.3 s dips. Raw numbers in `stops_raw.json`.\n")
w("| start | end | dur | kind | accompaniment dB | voice dB | what is there |")
w("|---|---|---|---|---|---|---|")
for h in X["hard_stops"]:
    heardw = " ".join(x["w"] for x in W if h["start"] - 0.2 <= x["s"] <= h["end"])
    acc = re.search(r"median \(([-\d.]+) dB\)", h["note"]); vo = re.search(r"voice ([-\d.]+) dB", h["note"])
    w("| %.2f | %.2f | %.2f | %s | %s | %s | %s |" % (h["start"], h["end"], h["end"] - h["start"], h["kind"], acc.group(1) if acc else "-", vo.group(1) if vo else "-", heardw or "(no heard word)"))
w("\nmicro_gaps (s): %s\n" % X["micro_gaps"])
w("- **Robot \"Automatic merge failed\" (0.0-1.22 s) and \"Fix conflicts and then commit the result\" (1.9-4.46 s)**: not a silence; drums run under both. The band is out only 2.90-3.75 s, under \"and then commit the\".")
w("- **\"Build failed\" robot (193.48-196.15 s)**: the whole band is full-on until about 193.4 s, then drums and bass cut (drums -48 dB, bass -58 to -83 dB from 193.7 s) and only a synth/chiptune stem (-29 to -45 dB) and the robot voice remain until about 197 s. No band stop long enough passes the 0.3 s/20 dB test there because the synth stem stays above the threshold; the music-stops event is real but not a total stop. Whisper hears \"Failed, failed\" at 193.1-193.8 s (the word \"Build\" is heard as the first \"Failed\"), \"Syntax error on line forty\" 194.22-196.49 s. The bass returns at 197.2 s, on beat 3 of bar 147.")
w("- **True silence: only 232.00-232.12 s**, the last 0.12 s. The \"then silence\" of the outro is a decay: voice gone at about 229.0 s, bass at 230.0 s, drums fade to -55 dB by 232.0 s (bar 172 is 99.7 % under 150 Hz, a sub rumble). Nothing in the body of the song is silent.")
w("- Other band stops: 26.0-27.7 s (voice alone into verse 2), 39.55-40.05 and 40.90-41.35 s (pre-chorus), 43.6-44.2 s (inside the first chorus line), 62.25-62.8 s (just before the end of chorus 1; unlike v1 it is short and the band is back before verse 3), 104.75-105.35 s (same place in chorus 2), 116.5-117.2 s (the scream), 126.4-126.7 s (before the solo).")

w("\n## 4. Per-bar heaviness\n")
w("Heaviness 0-100 = mean percentile rank, within this song, of: mix loudness, drums-stem level, bass-stem level (floored at -60 dB), share of energy under 150 Hz. Distortion / scream proxies sit next to it, not inside it: `flat` = mean spectral flatness, `hi %` = share of energy above 4 kHz. Label: >= 65 METAL, 45-65 mid, < 45 pop/soft.\n")
w("| bar | start | section | beats | mix dB | drums dB | bass dB | < 150 Hz % | hi % | flat | voice dB | heavy | label |")
w("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for b in bars:
    w("| %d | %.2f | %s | %d | %.1f | %.1f | %.1f | %.0f | %.0f | %.3f | %.1f | %.0f | %s |" % (b["bar"], b["start"], sec_of_bar(b["bar"]), b["beats"], b["mix"], b["drums"], b["bass"], b["low_pct"], b["high_pct"], b["flatness"], b["vocals"], b["heavy"], label(b["heavy"])))
w("\nLabel count per section (METAL / mid / pop-soft bars):\n")
for s in secs:
    c = [label(b["heavy"]) for b in bars[s["_b0"]:s["_b1"]]]
    w("- %s: %d / %d / %d" % (s["name"], c.count("METAL"), c.count("mid"), c.count("pop/soft")))

w("\n## 5. Lyrics, singer per line, token map\n")
w("Whisper large-v3 on the full mix and on the demucs vocal stem. A lyric word gets a time only when a heard word matches it; a line with under half its words heard gets null start/end. `singer` in `mc-timing.json` is `B` (sweet voice, the blue girl), `O` (raspy voice, the orange girl) or `both`; `voice` carries the plain `sweet` / `raspy` / `both` (from the lyric tags: a line's own `[Sweet voice]` / `[Raspy voice]` / `[Both voices]` tag, else its section header; the flat robot lines and the screams are `both`). The engine's type is `'O' | 'B' | 'both'`, hence the letters.\n")
w("| # | singer | lyric line | start | end | ratio | heard |")
w("|---|---|---|---|---|---|---|")
for i, l in enumerate(X["lines"]):
    ll = T["lyric_alignment"][i]
    w("| %d | %s (%s) | %s | %s | %s | %.2f | %s |" % (i, ll["voice"], ll["singer"], l["text"].replace("|", "/"), "-" if l["start"] is None else "%.2f" % l["start"], "-" if l["end"] is None else "%.2f" % l["end"], l["ratio"], (l["heard"] or "(nothing heard)").replace("|", "/")))
cnt = {k: sum(1 for l in T["lyric_alignment"] if l["voice"] == k) for k in ("sweet", "raspy", "both")}
w("\nSinger counts: sweet %d, raspy %d, both %d lines." % (cnt["sweet"], cnt["raspy"], cnt["both"]))
w("\n**Where Whisper heard something else**: \"Automatic merge failed\" heard \"Automatic Merge? Well,\"; \"the button was blue\" heard \"glued\" (line 3, the only blue not heard); \"Then someone\" heard \"And someone\"; \"Three hundred\" heard \"300\"; \"rebased\" heard \"repaste\"; \"sorries\" heard \"stories\"; \"git blame\" heard \"Get Brained\" (with a stray \"your\" before it); \"standup's in five and nobody's on\" heard \"stand -up's in five and nobody saw\"; chorus 2 \"Two girls, one line\" heard \"one mind\"; \"conflict\" heard \"conflicts\" (every chorus); \"data2\" heard \"data too\"; \"GIT\" heard \"Get,\"; \"(YES!)\" heard \"yeah\"; \"Build failed\" heard \"Failed, failed\"; \"forty-two\" heard \"forty two\". Unheard: both `AAAAAH!` scream lines (no time, their sections are timed by energy). Heard but not lyrics: %s." % "; ".join("%.2f-%.2f \"%s\"" % (e["start"], e["end"], e["text"][:60]) for e in X["extra_heard"]))
ov = sum(1 for m in TM for t in m["tokens"] if t["word"] is None)
w("\n### Token map (`token_map.json`)\n")
w("Produced by `python -I tools/token_map.py data/take-v4` (schema: `docs/architecture.md`). 68 lines; lines with start null (the two scream lines) map every token to null. Method order: OVERRIDES, one-to-one pairing with the measured words in the line's window, exact normalised text matches. **%d tokens are null in total** (listed below the table: the two scream words, nothing else); the table is every override." % ov)
w("")
w("| line | override in `OVERRIDES['take-v4']` | reason |")
w("|---|---|---|")
src = open(ROOT / "tools" / "token_map.py", encoding="utf-8").read()
blk = src[src.index("'take-v4': {"):]
for ln in blk.split("\n")[1:]:
    m = re.match(r"\s+(\d+): (\[.*?\]),\s*#\s*(.*)$", ln)
    if m: w("| %s | `%s` | %s |" % (m.group(1), m.group(2), m.group(3)))
    elif ln.strip().startswith("}"): break
w("\nNull tokens in the map: " + ", ".join("line %d \"%s\"" % (m["line"], t["text"]) for m in TM for t in m["tokens"] if t["word"] is None) + ".")
w("\n`node tools/gridcheck.mjs take-v4` (adapted so it is not tied to take-v1's 1.333 s bar and its line numbers):\n")
w("```\n" + GC + "\n```")

w("\n## 6. Voice contrast (solo lines only, vocal stem)\n")
mel = VC["melodic"]; sw, rs = mel["summary"]["sweet"], mel["summary"]["raspy"]; sp = mel["separability"]; tb_ = VC["timbre_only"]["separability"]
w("Burak asked for \"voices a bit more different\". Measured on the demucs vocal stem, on the lines only one girl sings (singer from the lyric tags, time from the measured line start/end). Pitch needs a clean stem, which only the quiet sections give: %d solo lines (%d sweet, %d raspy) have enough voiced frames; the heavy trading lines of verses 3-4 are too short and too masked by guitars for pitch tracking." % (sp["n_lines"], sp["n_sweet"], sp["n_raspy"]))
w("\n| feature | sweet (median, IQR) | raspy (median, IQR) |")
w("|---|---|---|")
for k, nm in (("f0_median_hz", "F0 median (Hz)"), ("f0_p10_hz", "F0 10th percentile (Hz)"), ("f0_p90_hz", "F0 90th percentile (Hz)"), ("f0_range_semitones", "F0 range, 10-90 % (semitones)"), ("centroid_hz", "spectral centroid (Hz)"), ("flatness", "spectral flatness (higher = noisier)"), ("hnr_db", "harmonicity, HNR proxy (dB, lower = rougher)"), ("voiced_fraction", "voiced fraction of frames")):
    w("| %s | %.3g (%.3g-%.3g) | %.3g (%.3g-%.3g) |" % (nm, sw[k]["median"], sw[k]["p25"], sw[k]["p75"], rs[k]["median"], rs[k]["p25"], rs[k]["p75"]))
w("\nSeparability (leave-one-line-out nearest-centroid classifier on z-scored features; chance = always guess the larger class):\n")
w("| feature set | lines | accuracy | chance |")
w("|---|---|---|---|")
w("| F0 + centroid + flatness + HNR | %d | %.0f %% | %.0f %% |" % (sp["n_lines"], 100 * sp["loo_nearest_centroid_all_features"], 100 * sp["majority_baseline"]))
for k, nm in (("f0_median_hz", "F0 median alone"), ("centroid_hz", "centroid alone"), ("flatness", "flatness alone"), ("hnr_db", "HNR alone")):
    w("| %s | %d | %.0f %% (AUC sweet-higher %.2f) | %.0f %% |" % (nm, sp["n_lines"], 100 * sp[k]["loo_accuracy"], sp[k]["auc_sweet_higher"], 100 * sp["majority_baseline"]))
w("| timbre only (centroid + flatness + high-band share), every solo line >= 0.45 s | %d | %.0f %% | %.0f %% |" % (tb_["n_lines"], 100 * tb_["loo_nearest_centroid_all_features"], 100 * tb_["majority_baseline"]))
w("\n**Honest reading: the two voices do not separate in this take.** The raspy girl is not lower: her median F0 is %.0f Hz against the sweet girl's %.0f Hz (the AUC for \"sweet is higher\" is %.2f, i.e. raspy is slightly higher if anything), centroids are alike (%.0f vs %.0f Hz) and a classifier on pitch or brightness is barely above chance (%.0f %% for F0 alone against %.0f %% chance; %.0f %% on timbre alone over %d lines, chance %.0f %%). The only feature that tells them apart is harmonicity: the raspy girl is rougher (HNR %.1f dB against %.1f dB, AUC %.2f), good for %.0f %% of %d lines with the full feature set, so a rougher, noisier voice is audible in the quiet sections but the pitch/register contrast Burak asked for (a low husky alto against a high soprano) is not there. The planned fallback (darken and roughen the raspy girl, brighten the sweet girl on solo lines in post) is still needed." % (rs["f0_median_hz"]["median"], sw["f0_median_hz"]["median"], sp["f0_median_hz"]["auc_sweet_higher"], rs["centroid_hz"]["median"], sw["centroid_hz"]["median"], 100 * sp["f0_median_hz"]["loo_accuracy"], 100 * sp["majority_baseline"], 100 * tb_["loo_nearest_centroid_all_features"], tb_["n_lines"], 100 * tb_["majority_baseline"], rs["hnr_db"]["median"], sw["hnr_db"]["median"], sp["hnr_db"]["auc_sweet_higher"], 100 * sp["loo_nearest_centroid_all_features"], sp["n_lines"]))
w("\nPer-line numbers are in `voice_contrast.json` (`lines`). Caveats: demucs separation leaks the other voice and the guitars into the vocal stem; pyin F0 has octave errors; the sample is small.")

w("\n## 7. Colour words\n")
w("Every \"orange\", \"blue\" and \"pink\" Whisper heard (merged `words`; the full-mix pass and the vocal-stem pass agree to within 0.4 s):\n")
w("| colour | times (s) |")
w("|---|---|")
for c in ("orange", "blue", "pink"):
    w("| %s | %s |" % (c, ", ".join("%.2f (\"%s\")" % (x["t"], x["w"]) for x in CW["heard_in_words"][c]) or "none heard"))
ex = CW["lyric_occurrences"]
w("\nThe lyric has %d colour words (%d orange, %d blue); **%d are heard at the right place**: %s." % (len(ex), sum(e["colour"] == "orange" for e in ex), sum(e["colour"] == "blue" for e in ex), sum(e["correct"] for e in ex), "; ".join("line %d %s %.2f" % (e["line"], e["colour"], e["t"]) for e in ex if e["correct"])))
w("- **\"orange\" is sung where the lyrics say it**: verse 2 (30.96, 31.98 s), pre-chorus (39.24, 40.58 s), soft interlude (145.68 s), final chorus \"Blue and orange together\" (164.26 s). All six, none missing.")
w("- **\"pink\" does not appear**: zero hits in the merged words, the full-mix pass and the vocal-stem pass (searched for any word starting with \"pink\").")
w("- Blue: all four sung blues are heard (pre-chorus 38.40 and 39.98, interlude 143.12, final chorus 163.72 s); the fifth, in verse 1 \"the button was blue\" (line 3, near 20.98 s), is heard as \"glued\", so its time is the heard word's, mapped by the token override.")

w("\n## 8. Files\n")
w("`mc-timing.json` (engine file; schema of take-v1 plus `singer` and `voice` on every `lyric_alignment` line), `token_map.json`, `bars.json`, `lyric_align.json`, `whisper_vocals.json` (raw full pass of the vocal stem; its 199.9 s \"ooo...\" segment, \"I don't know.\" at 226.7 s and \"Thank you.\" at 231.3 s are hallucinations in the unsung block and are ignored), `stops_raw.json`, plus `whisper_main.json`, `voice_contrast.json`, `colour_words.json`, `_grid.json`, `_downbeats.json`, `_detail.json`. Tools: `tools/timing/` (beatgrid, downbeats and build_mc_timing read `MC_TAKE`, section specs for v4 in `mc_specs.py`, voice_contrast, make_summary_v4), `tools/token_map.py` (OVERRIDES for take-v4), `tools/gridcheck.mjs`. Stems: demucs htdemucs, 4-stem, not kept.")
open(D / "timing-summary.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print("written", len(L), "lines")
