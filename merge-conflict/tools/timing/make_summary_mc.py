"""Writes data/take-v1/timing-summary.md from mc-timing.json, _detail.json, _grid.json and splice.json (all produced by the other scripts in this folder).
usage: python -I make_summary_mc.py"""
import sys, json, numpy as np, librosa
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]; D = ROOT / "data" / "take-v1"
T = json.load(open(D / "mc-timing.json", encoding="utf-8")); X = json.load(open(D / "_detail.json", encoding="utf-8")); G = json.load(open(D / "_grid.json")); SP = json.load(open(D / "splice.json", encoding="utf-8"))
db = np.array(T["downbeats"]); beats = np.array(T["beats"]); bars = T["bars"]; secs = X["sections"]; dur = T["duration"]
mmss = lambda t: "%d:%05.2f" % (int(t // 60), t - 60 * int(t // 60))
L = []; w = L.append
sec_of_bar = lambda i: next(s["name"] for s in secs if s["_b0"] <= i < s["_b1"])
label = lambda h: "METAL" if h >= 65 else ("mid" if h >= 45 else "pop/soft")

# ---- independent checks (nothing here feeds back into the grid)
y, sr = librosa.load(ROOT / "audio" / "merge-conflict-v1.wav", sr=22050, mono=True)
H = 0.05; fh = int(H * sr); lv = 20 * np.log10(librosa.feature.rms(y=y, frame_length=fh, hop_length=fh, center=False)[0] + 1e-9); tl = np.arange(len(lv)) * H
steps = []
for i in range(3, len(lv) - 3):
    d = lv[i:i + 3].mean() - lv[i - 3:i].mean()
    if abs(d) >= 6.0 and (not steps or tl[i] - steps[-1][0] > 0.5): steps.append((float(tl[i]), float(d)))
off = [(t, d, (t - db[int(np.argmin(np.abs(db - t)))]) * 1000) for t, d in steps]
ups = [o for o in off if o[1] > 0]; downs = [o for o in off if o[1] < 0]
st = lambda r: (len(r), float(np.median([abs(o[2]) for o in r])), sum(abs(o[2]) <= 16.7 for o in r), sum(abs(o[2]) <= 33.3 for o in r))

w("# Merge Conflict v1 — timing summary (take-v1)\n")
w("Source `audio/merge-conflict-v1.wav` (first Suno version, git-ignored), %.2f s, 48 kHz stereo. Every number below is measured from that file; nothing is read off the lyric sheet. Bar numbers are the 0-based `bars[].bar` of `mc-timing.json` (bar 0 starts at the first downbeat, %.3f s).\n" % (dur, db[0]))
w("## 1. Tempo\n")
w("- **%.2f BPM** (beat = %.4f s, bar = 4 beats = %.3f s). Suno was asked for 185 and delivered 180; the old take was 153, so the engine must read the beats, never a constant." % (T["bpm_mean"], 60 / T["bpm_mean"], 240 / T["bpm_mean"]))
w("- Steady everywhere except the opening: the fitted grid has one segment per constant tempo, and from 4.16 s to the end it is a single clock (%s). Per-20 s median tempo ranges %.1f-%.1f BPM (`bpm_range_20s`)." % (", ".join("%.2f BPM %.2f-%.2f s" % (s["bpm"], s["start"], s["end"]) for s in X["grid_segments"][1:3]) + " ...", T["bpm_range_20s"][0], T["bpm_range_20s"][1]))
w("- Weak spot: 0-4.16 s (robot lines, no pulse) was fitted at %.1f BPM; treat beats before 4.16 s as approximate. The first musical bar line that can be trusted is bar 3 at %.2f s." % (X["grid_segments"][0]["bpm"], db[3]))
o = X["octave_check"]
w("- Beat level: the straight-grid onset comb scores %.3f at %.2f BPM (pulse), %.3f at %.2f BPM (half-time), %.3f at %.2f BPM (double). Half-time scores a little higher, as it does for any chugging track; the 180 level is kept because it gives the same musical density as the old take (one lyric line = 2 bars of 4 beats, an 8-bar verse, a 16-bar chorus), which is what the engine was built against." % (o["pulse"]["score"], o["pulse"]["bpm"], o["half_time"]["score"], o["half_time"]["bpm"], o["double_time"]["score"], o["double_time"]["bpm"]))
w("- Grid accuracy: onset-snapped minus grid, median |dev| %.1f ms, max %.1f ms; %d of %d beats are further than one 30 fps frame (33.3 ms) from the nearest onset peak (mostly beats with no onset: stops, held notes)." % (X["onset_residual_ms"]["median_abs"], X["onset_residual_ms"]["max"], int((np.abs(np.array(G["dev_ms"])) > 33.3).sum()), len(G["dev_ms"])))
w("- Odd bars the downbeat tracker had to insert (downbeat phase slips): %s. They sit in the intro groove (bar 4), in the metal block (bars 98, 103) and in the outro tail (bar 113); every section start from the intro groove to the scream_end is a regular 4-beat bar, and the downbeat phase after bar 98 is the least certain part of the file." % ", ".join("bar %d at %.2f s = %d beats" % (b["bar"], b["t"], b["beats"]) for b in X["odd_bars"]))
w("\n### Structural validation (bars x 4 x beat = durations)\n")
w("| section | bars | beats in bars | bars x 4 x beat (s) | section length (s) | diff (beats) | grid BPM | independent onset-comb BPM |")
w("|---|---|---|---|---|---|---|---|")
per = float(np.median(np.diff(beats)))
for s in secs:
    w("| %s | %d | %d | %.2f | %.2f | %+.2f | %s | %s |" % (s["name"], s["n_bars"], s["beats_in_bars"], s["bars_x4_x_period_s"], s["length_s"], (s["length_s"] - s["bars_x4_x_period_s"]) / per, s["bpm_grid"] if s["bpm_grid"] else "-", s["bpm_onset_comb"] if s["bpm_onset_comb"] else "- (under 5 s)"))
tb = sum(b["beats"] for b in bars)
w("| **whole song** | %d | %d | %.2f | %.2f (first downbeat %.3f to end) | %+.2f | %.2f | - |" % (len(bars), tb, tb * per, dur - db[0], db[0], (dur - db[0] - tb * per) / per, T["bpm_mean"]))
w("\nSection lengths equal bars x 4 x beat by construction (sections start and end on downbeats), so the real test is the two checks that do not use the grid:\n")
w("1. The onset comb run on each section alone (last column) lands on %.1f-%.1f BPM for every section long enough to test, never near 185 or 153." % (min(s["bpm_onset_comb"] for s in secs if s["bpm_onset_comb"]), max(s["bpm_onset_comb"] for s in secs if s["bpm_onset_comb"])))
u, dn = st(ups), st(downs)
w("2. Abrupt level steps (>= 6 dB between the 0.15 s before and after, %d of them) against the nearest downbeat. **Rises** (hits, restarts, re-entries; %d): median |offset| %.0f ms, %d within one 60 fps frame (16.7 ms), %d within 33 ms. **Falls** (the start of a stop; %d): median |offset| %.0f ms, %d within 16.7 ms, %d within 33 ms. A stop may begin anywhere inside a bar; what matters for the cut is where the band comes back, so the rise figures are the bar-phase test. Rises furthest from a downbeat: %s." % (len(off), u[0], u[1], u[2], u[3], dn[0], dn[1], dn[2], dn[3], ", ".join("%.2f s %+.0f ms" % (t, e) for t, d, e in sorted(ups, key=lambda r: -abs(r[2]))[:4])))
w("3. Whole-song: %d bars hold %d beats = %.2f s against %.2f s of music after the first downbeat (%+.2f beats, the tail is silence/decay)." % (len(bars), tb, tb * per, dur - db[0], (dur - db[0] - tb * per) / per))

w("\n## 2. Sections\n")
w("Loudness is RMS in dB of the mix (mean over the section's bars). Bass weight = mean bass-stem level (dB RMS) and the share of mix energy below 150 Hz. Heaviness is the 0-100 index of section 5 (relative to this song).\n")
w("| section | start | end | bars (from-to) | n bars | length s | mean dB | bass stem dB | energy < 150 Hz | heaviness | voice stem dB | key (bass+other chroma) | start rule |")
w("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for s in secs:
    w("| %s | %.2f (%s) | %.2f (%s) | %d-%d | %d | %.2f | %.1f | %.1f | %.0f %% | %.0f (%s) | %.1f | %s r=%.2f | %s |" % (s["name"], s["start"], mmss(s["start"]), s["end"], mmss(s["end"]), s["_b0"], s["_b1"] - 1, s["n_bars"], s["length_s"], s["mean_db"], s["mean_bass_db"], s["mean_low_pct"], s["mean_heavy"], label(s["mean_heavy"]), s["mean_vocal_db"], s["key"]["best"], s["key"]["r"], s["_rule"]))
w("\nThe two sections not in the lyric tags but really in the audio: `intro_groove` (4.82-16.48 s, bass and full drums, no sung word) and `synth_bridge` (84.45-89.78 s, full band with a bright synth lead, the voiced-vocal fraction is 0 in 84.5-88.9 s). `postchorus` and `guitar_solo` of the old take do not exist in v1. The lyric's `[Heavy guitar hit]` is not a section: it is the band stop inside bar 12 (17.25-17.75 s) at the start of verse 1.")

w("\n## 3. Burak's listening landmarks, checked\n")
fc = next(s for s in secs if s["name"] == "final_chorus"); c1 = next(s for s in secs if s["name"] == "chorus1"); me = next(s for s in secs if s["name"] == "scream_end"); ig = next(s for s in secs if s["name"] == "intro_groove")
intro = [b for b in bars if b["bar"] < 12]
w("1. **Pop and metal interleaved from the very start: confirmed.** No clean pop-only intro. Bar 0-2 (0-4.82 s) is two flat robot lines over a hit and a drum fill (heaviness %.0f); from bar 3 (4.82 s) bass and full drums play (`intro_groove`, mean heaviness %.0f, bass stem %.1f dB, %.0f %% of the energy under 150 Hz) before any singing. Of the bars before chorus 1 (bars 0-31) %d are METAL, %d mid and %d pop/soft by the index of section 5: verse 2 and the chorus are the lightest parts (heaviness %.0f and %.0f)." % (np.mean([b["heavy"] for b in intro[:3]]), ig["mean_heavy"], ig["mean_bass_db"], ig["mean_low_pct"], sum(label(b["heavy"]) == "METAL" for b in bars[:32]), sum(label(b["heavy"]) == "mid" for b in bars[:32]), sum(label(b["heavy"]) == "pop/soft" for b in bars[:32]), next(s for s in secs if s["name"] == "verse2_raspy")["mean_heavy"], c1["mean_heavy"]))
w("2. **The chorus changes after about 1:42: confirmed, and it is the final \"Accept both changes\" chorus.** It starts on the downbeat %.2f s (%s; first \"Accept\" 101.76 s) and is 16 bars like chorus 1, but it ends at %.2f s (%s), **not at 2:08**: the last word \"soul\" ends 121.88 s, the band stops at 123.11 s (robot \"Build failed\"). What changes against chorus 1: louder (%.1f vs %.1f dB), heavier (%.0f vs %.0f), and the lyric is the resolved one. **No key change was measured**: chorus 1 against the final chorus has best semitone shift %d with chroma r=%.2f, and both read A# major (Ab major)." % (fc["start"], mmss(fc["start"]), fc["end"], mmss(fc["end"]), fc["mean_db"], c1["mean_db"], fc["mean_heavy"], c1["mean_heavy"], X["key_shift"]["chorus1_vs_final_chorus"]["best_shift_semitones"], X["key_shift"]["chorus1_vs_final_chorus"]["r_at_best"]))
w("3. **From about 2:08 to the end it is all-out heavy metal with screaming: confirmed, with a 1 s correction.** The heavy block starts on the downbeat %.2f s (%s) right after the stop 124.5-127.1 s, and runs to %.2f s (%s): heaviness %.0f (the highest in the song), bass stem %.1f dB, %.0f %% of the energy under 150 Hz, voice stem %.1f dB with **no word Whisper can hear** (the scream; demucs separates screams poorly, so the voice level is understated). 123.11-127.10 s (%s-%s) is the robot \"Build failed\" stop, not metal. The last 2.75 s (`outro`) are the 1 s blast beat at 149.5-150.5 s and decay; the mix is under -45 dB only from 152.0 s." % (me["start"], mmss(me["start"]), me["end"], mmss(me["end"]), me["mean_heavy"], me["mean_bass_db"], me["mean_low_pct"], me["mean_vocal_db"], mmss(123.11), mmss(127.10)))

w("\n## 4. Hard stops and true silences\n")
w("`hard_stops` in `mc-timing.json` lists two kinds. **band stop** = drums+bass+other (demucs stems) fall 20 dB under their song median for >= 0.3 s (voice may stay); **true silence** = the whole mix under -45 dB. `micro_gaps` are the 0.1-0.3 s dips. Raw numbers: `stops_raw.json`.\n")
w("| start | end | dur | kind | accompaniment dB | voice dB | what is there |")
w("|---|---|---|---|---|---|---|")
ws = T["words"]
for h in X["hard_stops"]:
    heardw = " ".join(x["w"] for x in ws if h["start"] - 0.2 <= x["s"] <= h["end"])
    import re
    m = re.findall(r"\(([-\d.]+) dB\)|voice ([-\d.]+) dB", h["note"])
    acc = re.search(r"median \(([-\d.]+) dB\)", h["note"]); vo = re.search(r"voice ([-\d.]+) dB", h["note"])
    w("| %.2f | %.2f | %.2f | %s | %s | %s | %s |" % (h["start"], h["end"], h["end"] - h["start"], h["kind"], acc.group(1) if acc else "-", vo.group(1) if vo else "-", heardw or "(no heard word)"))
w("\nmicro_gaps (s): %s\n" % X["micro_gaps"])
w("Reading them against the lyric sheet:\n")
w("- **Robot \"Automatic merge failed\" (0.32-1.2 s) and \"Fix conflicts and then commit the result\" (1.9-4.6 s)**: not a silence. The band is cut from 3.10 s, under \"... and then commit the results\" (stops 3.10-4.10 s and 4.20-4.60 s, mix about -25 dB); the first line and \"Fix conflicts\" have drums under them (bar 0 drums -22 dB). The mix never drops under -45 dB.")
w("- **\"...you wouldn't\" (83.28-84.38 s): NOT a stop.** The drums keep playing (-25 dB) and the voice is at normal level; the lyric's soft stop does not exist in this render. What follows (84.45-89.78 s) is a full-band synth bridge with no singing.")
w("- **\"Build failed\" robot (123.11-127.10 s)**: drums and bass leave on the downbeat 123.11 (drums -65 dB, bass -80 dB), only a synth/chiptune stem (about -24 dB) and the robot voice remain until 124.5 s, then the whole accompaniment is gone until the metal re-entry at 127.10 s (stop 124.50-127.10 s, voice -26.6 dB: \"syntax error on line forty-two\" ends about 126.7 s). Whisper hears \"Failed\" at 123.66 s; the word \"Build\" is not picked up.")
w("- **True silence**: only the very end, 152.00-152.52 s (the blast beat decays from 150.5 s, bass and voice are gone from about 151.0 s). There is no silence in the body of the song; every other stop keeps the voice or a stem.")
w("- Other band stops worth knowing: 26.2-27.95 s (voice alone, last verse 1 line into verse 2), 39.85-40.25 and 41.2-41.75 s (pre-chorus \"Pink!\" / \"Somebody resolve this\"), **62.5-64.25 s (end of chorus 1, section 8)**, 74.0-75.9 s (the scream), 89.4-89.75 s (everything stops into the piano), 101.25-103.1 s (held chord before the final chorus).")

w("\n## 5. Per-bar heaviness\n")
w("Heaviness 0-100 = mean percentile rank, within this song, of four things: mix loudness, drums-stem level, bass-stem level (floored at -60 dB), share of energy under 150 Hz. The distortion / scream proxies are reported next to it, not inside it, because they also fire on bright pop bars (hats, synth leads): `flat` = mean spectral flatness (noise-likeness; screams and distorted guitars push it up), `hi %` = share of energy above 4 kHz. Label: >= 65 METAL, 45-65 mid, < 45 pop/soft. Metal-heavy bars are the ones with high bass dB and a high `< 150 Hz` share.\n")
w("| bar | start | section | beats | mix dB | drums dB | bass dB | < 150 Hz % | hi % | flat | voice dB | heavy | label |")
w("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for b in bars:
    w("| %d | %.2f | %s | %d | %.1f | %.1f | %.1f | %.0f | %.0f | %.3f | %.1f | %.0f | %s |" % (b["bar"], b["start"], sec_of_bar(b["bar"]), b["beats"], b["mix"], b["drums"], b["bass"], b["low_pct"], b["high_pct"], b["flatness"], b["vocals"], b["heavy"], label(b["heavy"])))
w("\nLabel count per section (METAL / mid / pop-soft bars):\n")
for s in secs:
    c = [label(b["heavy"]) for b in bars[s["_b0"]:s["_b1"]]]
    w("- %s: %d / %d / %d" % (s["name"], c.count("METAL"), c.count("mid"), c.count("pop/soft")))

w("\n## 6. Key\n")
w("**%s**\n" % T["key"])
w("- Measured on the bass + other stems (drums and screams smear the mix chroma, which gave only C minor at r=0.64). Whole song: F minor r=0.70, next C minor 0.44 and G# major 0.44; vocal stem alone reads C minor (0.75). Both choruses (the two places with a clear tonal center) read **A# major = Ab major, r=0.87**, the relative major of F minor; so the song lives in the Ab major / F minor / C minor family and the tonal centre is **F minor with Ab major choruses**.")
w("- The metal block (127-150 s) has no clear key (F major/F minor 0.5: riff on F). No modulation up in the final chorus (see section 3). 8-bar key windows are in `_detail.json` (`key_windows`).")

w("\n## 7. Lyrics against what was heard\n")
w("Whisper large-v3 on the full mix plus a pass on the demucs vocal stem (the stem pass for 0-30 s was redone clipped with a lyric prompt because it hallucinated \"D-D-D\" there). A lyric word gets a time only when a heard word matches it; a line with fewer than half its words heard gets `null` start/end. `ratio` = matched words / lyric words.\n")
w("| lyric line | start | end | ratio | heard | lyric words not heard |")
w("|---|---|---|---|---|---|")
for l in X["lines"]:
    w("| %s | %s | %s | %.2f | %s | %s |" % (l["text"].replace("|", "/"), "-" if l["start"] is None else "%.2f" % l["start"], "-" if l["end"] is None else "%.2f" % l["end"], l["ratio"], (l["heard"] or "(nothing heard)").replace("|", "/"), ", ".join(l["unmatched"]) or "-"))
w("\n**Where Whisper heard something else** (the video must keep the lyric text, the timing is the heard word's):")
w("- \"Equals, equals, equals in the middle of my soul\" (chorus 1) heard as \"Pickles, pickles, pickles\" in the full pass at 57.5 s; the vocal-stem pass heard \"Equals\" correctly, only two of three \"equals\" bound (ratio 0.89).")
w("- \"Merge conflict\" heard as \"Merge conflicts\" / \"Merged conflict resolved\" (final chorus); \"Line forty-two\" heard \"Line 42\" and \"Syntax error on line forty-two\" heard \"syntax error on 942\" (times kept, digits spelled out by the builder); \"Git\" heard \"Get\" (81.04 s, probability 0.05, weak); \"Accept\" heard \"Accept\" in chorus 1 and the final chorus in this take (the old take heard \"Except\" in places).")
w("- Heard, not in the lyric sheet: %s" % "; ".join("%.2f-%.2f \"%s\"" % (e["start"], e["end"], e["text"]) for e in X["extra_heard"]))
w("- \"Thank you.\" at 148.7 s (vocal stem) and \"you\" at 148.36 s are Whisper inventing words over the end of the scream, not lyrics.")
w("- `Three hundred commits` is heard as \"300 commits\" (digits above 99 are not spelled out, so \"three, hundred\" stay unbound); `(YES!)` in the final chorus is heard as \"yeah\" (ratio 0.75 on those lines, no bound time for \"yes\").")
w("- Not heard at all, therefore **not bound to any time** (their section is timed by energy, not by words): `AAAAAH!` (scream, 75.12-76.45 s) and `AAAAAAAH!` (scream_end, 127.10-149.77 s); \"Build failed\" is half-heard (\"Failed\" only, 123.66 s). `Commit and push it!` heard \"come in and push it, push it\", bound to 114.80-116.04 s.")
w("- The pre-chorus is \"Blue! Pink! Blue! PINK!\" in the lyric and the audio sings exactly that (38.56-41.08 s), the interlude and the final chorus are heard line for line. Chorus 1 line \"Two girls, one line\" is heard whole (the old take sang \"One conflict\").")
w("- `accept_hooks` (word pairs for the engine): %s" % "; ".join("%.2f %s %s" % tuple(h) for h in T["accept_hooks"]))

w("\n## 8. Splice points for the new verse and the copy of chorus 1\n")
c = SP["chorus1"]; cut = SP["cut_chorus1_end_to_verse3"]; ci = SP["cut_into_chorus1_start"]; bl = SP["baseline_adjacent_bars"]
w("Plan: chorus 1 | new verse | copy of chorus 1 | verse 3.\n")
w("**(a) Where chorus 1 ends: downbeat %.3f s (bar %d, %s).** The last word \"control\" is sung %.2f-%.2f s (Whisper), but the voice stem holds the note a cappella until %.2f s and is gone (< -45 dB) by %.2f s, so the tail ends on the downbeat. **The band does not play straight into verse 3: it stops, then restarts with a drum fill.** Measured per 0.1 s on the stems: drums, bass and other all fall at 62.45 s (drums -62 to -80 dB, bass -82 to -87 dB, other -67 to -73 dB) and stay down until 64.15 s (1.7 s = 1.3 bars) while the voice holds \"control\" alone at about -24 dB. The drums come back at 64.20 s with a short fill (-24 dB, then -19 dB; the fill is the last %.2f s before the bar line) and hit on the downbeat 64.45 s; the guitars/synth stem returns from about 64.6 s (-37 dB) and the bass only from about 65.2 s (-44 to -30 dB). So the cut is **a cappella stop, drum fill, drum-led restart on the bar line**: no straight-through playing." % (c["end_downbeat"], c["end_bar"], mmss(c["end_downbeat"]), c["last_word"]["s"], c["last_word"]["e"], c["voice_last_frame_above_minus35_dB"], c["voice_below_minus45_after_last_word_at"], c["end_downbeat"] - 64.17))
w("\n**(b) Where verse 3 (\"You use tabs!\") starts: downbeat %.3f s (bar %d, %s)**, the same downbeat as (a). Whisper binds the first word \"You\" to %.2f s (%.2f s after the downbeat) and holds it to 65.24 s, but the voice stem is at -52 to -43 dB until 65.1 s and rises to -26 dB only at 65.20 s: **the audible \"You\" starts about 65.15 s**, and 64.45-65.15 s is a drums-led stretch with almost no voice. `words` keeps Whisper's 64.60 s (a measured value); anything that must hit the sung syllable should use about 65.15 s for \"You\" and 65.24 s for \"use\"." % (SP["verse3"]["start_downbeat"], c["end_bar"], mmss(SP["verse3"]["start_downbeat"]), SP["verse3"]["first_word"]["s"], SP["verse3"]["first_word"]["offset_from_downbeat_s"]))
w("\n**(c) Chorus 1**: starts on downbeat **%.3f s** (bar %d, %s) and ends on downbeat **%.3f s** (bar %d, %s): **%d bars, %.3f s** (16 x 1.3333 s). It starts on a downbeat: the first \"Accept\" is heard at %.2f s, %.3f s before the bar line (inside the measurement error, a word onset). **There is no pickup in the vocal**: the voice does not start early; the previous section's \"Somebody resolve this!\" (41.08-43.08 s) is sustained straight into \"Accept\" with no gap (voice stem never below %.1f dB from 1 s before the chorus to 0.1 s after). The only anacrusis-like thing is that long held \"this\" leading into the downbeat; the band restarts on the bar line (drums %.1f dB in the bar before, %.1f dB after, an easy entry)." % (c["start_downbeat"], c["start_bar"], mmss(c["start_downbeat"]), c["end_downbeat"], c["end_bar"], mmss(c["end_downbeat"]), c["bars"], c["seconds"], c["first_word"]["s"], -c["first_word"]["offset_from_downbeat_s"], c["voice_min_dB_from_1s_before_to_0p1_after_chorus_start"], ci["1_bar"]["before"]["drums"], ci["1_bar"]["after"]["drums"]))
w("\n**(d) Will a cut be audible?** Similarity of the bar(s) before and after each candidate downbeat. Reference: the same numbers over every adjacent pair of regular bars in the song (median / 10th percentile for 1 bar: mel cosine %.2f / %.2f, chroma cosine %.2f / %.2f, |mix dB change| median %.1f, 90th percentile %.1f; for 2 bars: mel %.2f / %.2f, chroma %.2f / %.2f)." % (bl["1"]["median_mel_cosine"], bl["1"]["p10_mel_cosine"], bl["1"]["median_chroma_cosine"], bl["1"]["p10_chroma_cosine"], bl["1"]["median_abs_mix_db_diff"], bl["1"]["p90_abs_mix_db_diff"], bl["2"]["median_mel_cosine"], bl["2"]["p10_mel_cosine"], bl["2"]["median_chroma_cosine"], bl["2"]["p10_chroma_cosine"]))
w("\n| cut (downbeat) | window | before: mix / drums / bass / other / voice dB | after: mix / drums / bass / other / voice dB | mix dB change | mel cosine | chroma cosine | 100 ms either side of the cut, dB before minus after (mix / drums / bass / other / voice) |")
w("|---|---|---|---|---|---|---|---|")
for nm, r in (("into chorus 1 (%.2f s, bar %d)" % (ci["downbeat"], ci["bar"]), ci), ("chorus 1 end = verse 3 start (%.2f s, bar %d)" % (cut["downbeat"], cut["bar"]), cut)):
    for n in ("1_bar", "2_bar"):
        r2 = r[n]; b, a = r2["before"], r2["after"]; e = r["seam_100ms_dB_before_minus_after"]
        w("| %s | %s | %.1f / %.1f / %.1f / %.1f / %.1f | %.1f / %.1f / %.1f / %.1f / %.1f | %+.1f | %.2f | %.2f | %s |" % (nm, n.replace("_", " "), b["mix"], b["drums"], b["bass"], b["other"], b["vocals"], a["mix"], a["drums"], a["bass"], a["other"], a["vocals"], r2["mix_db_diff"], r2["mel_cosine"], r2["chroma_cosine"], " / ".join("%+.1f" % e[k] for k in ("mix", "drums", "bass", "other", "vocals")) if n == "1_bar" else ""))
w("\nReading:\n")
w("- **Into chorus 1 (43.13 s)** is the safe seam: 1-bar mel cosine %.2f, chroma %.2f, mix change %+.1f dB, nothing changes at the cut itself (mix %+.1f dB over 100 ms). A new verse that ends like the pre-chorus (voice sustained into the bar line, band entering softly) can be followed by the chorus copy with no audible join." % (ci["1_bar"]["mel_cosine"], ci["1_bar"]["chroma_cosine"], ci["1_bar"]["mix_db_diff"], ci["seam_100ms_dB_before_minus_after"]["mix"]))
w("- **Chorus 1 end / verse 3 start (64.45 s)** is not a smooth seam by nature: the bar before is a band stop (voice alone over silence; bass %.1f dB, other %.1f dB) and the bar after is the drum-led restart (mel cosine %.2f, far below the song's 10th percentile %.2f). It is audible, but it is the song's own stop-and-restart, so it reads as intended. Chroma cosine %.2f (same harmony), level change only %+.1f dB, and the voice drops %+.1f dB across 100 ms (held note ends on the bar line). Recommended: **cut on 64.45 s** and give the new verse a restart of its own (drum fill into a downbeat hit); the copy of chorus 1 then ends in this same stop-fill-restart into verse 3, so that last seam is the original one and needs no work. If the generated verse starts without a drum fill, start it 0.28 s early (at the 64.17 s fill) instead." % (cut["1_bar"]["before"]["bass"], cut["1_bar"]["before"]["other"], cut["1_bar"]["mel_cosine"], bl["1"]["p10_mel_cosine"], cut["1_bar"]["chroma_cosine"], cut["1_bar"]["mix_db_diff"], cut["seam_100ms_dB_before_minus_after"]["vocals"]))
w("- If a seamless join is wanted inside chorus 1's last phrase instead, the band-stop begins at 62.50 s (inside bar 46, not on a downbeat); the nearest downbeat before it is bar 46 at 61.78 s, two bars of chorus-level audio before the stop, but that leaves \"I can't take control\" cut mid-line, so it is not recommended.")
w("\n## 9. Files\n")
w("`mc-timing.json` (engine file, schema of `take-2026-10-20`; `bars[]` additionally carry `beats`, `low_pct`, `high_pct`, `flatness`, `heavy`), `bars.json`, `lyric_align.json`, `whisper_vocals.json`, `stops_raw.json` (start, end, dur, mix dB before, mix dB inside), plus `whisper_main.json` (full-mix pass), `splice.json`, `_grid.json`, `_downbeats.json`, `_detail.json` (intermediates). Tools: `merge-conflict/tools/timing/` (beatgrid, downbeats, whisper_words, lyrics_align, build_mc_timing, splice_report, make_summary_mc). Stems: demucs htdemucs, 4-stem, not kept (git-ignored size).")
open(D / "timing-summary.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print("written", len(L), "lines")
