# Merge Conflict v1 — timing summary (take-v1)

Source `audio/merge-conflict-v1.wav` (first Suno version, git-ignored), 152.52 s, 48 kHz stereo. Every number below is measured from that file; nothing is read off the lyric sheet. Bar numbers are the 0-based `bars[].bar` of `mc-timing.json` (bar 0 starts at the first downbeat, 0.303 s).

## 1. Tempo

- **180.07 BPM** (beat = 0.3332 s, bar = 4 beats = 1.333 s). Suno was asked for 185 and delivered 180; the old take was 153, so the engine must read the beats, never a constant.
- Steady everywhere except the opening: the fitted grid has one segment per constant tempo, and from 4.16 s to the end it is a single clock (180.23 BPM 4.16-26.50 s, 180.13 BPM 26.50-44.80 s ...). Per-20 s median tempo ranges 180.0-180.2 BPM (`bpm_range_20s`).
- Weak spot: 0-4.16 s (robot lines, no pulse) was fitted at 156.2 BPM; treat beats before 4.16 s as approximate. The first musical bar line that can be trusted is bar 3 at 4.83 s.
- Beat level: the straight-grid onset comb scores 2.217 at 180.07 BPM (pulse), 2.379 at 90.04 BPM (half-time), 1.928 at 360.14 BPM (double). Half-time scores a little higher, as it does for any chugging track; the 180 level is kept because it gives the same musical density as the old take (one lyric line = 2 bars of 4 beats, an 8-bar verse, a 16-bar chorus), which is what the engine was built against.
- Grid accuracy: onset-snapped minus grid, median |dev| 4.7 ms, max 39.8 ms; 20 of 456 beats are further than one 30 fps frame (33.3 ms) from the nearest onset peak (mostly beats with no onset: stops, held notes).
- Odd bars the downbeat tracker had to insert (downbeat phase slips): bar 4 at 6.16 s = 3 beats, bar 98 at 131.10 s = 3 beats, bar 103 at 137.43 s = 5 beats, bar 113 at 151.10 s = 5 beats. They sit in the intro groove (bar 4), in the metal block (bars 98, 103) and in the outro tail (bar 113); every section start from the intro groove to the scream_end is a regular 4-beat bar, and the downbeat phase after bar 98 is the least certain part of the file.

### Structural validation (bars x 4 x beat = durations)

| section | bars | beats in bars | bars x 4 x beat (s) | section length (s) | diff (beats) | grid BPM | independent onset-comb BPM |
|---|---|---|---|---|---|---|---|
| intro_robot | 3 | 12 | 4.00 | 4.82 | +2.46 | 156.25 | - (under 5 s) |
| intro_groove | 9 | 35 | 11.67 | 11.66 | -0.03 | 180.23 | 180.13 |
| verse1_sweet | 8 | 32 | 10.67 | 10.66 | -0.03 | 180.23 | 180.13 |
| verse2_raspy | 9 | 36 | 12.00 | 11.99 | -0.03 | 180.13 | 179.8 |
| prechorus | 3 | 12 | 4.00 | 4.00 | +0.00 | 180.13 | - (under 5 s) |
| chorus1 | 16 | 64 | 21.33 | 21.32 | -0.03 | 179.96 | 180.13 |
| verse3_trade | 8 | 32 | 10.67 | 10.67 | +0.00 | 180.02 | 179.96 |
| scream | 1 | 4 | 1.33 | 1.33 | +0.00 | - | - (under 5 s) |
| breakdown_git_push_force | 5 | 20 | 6.67 | 6.66 | -0.03 | 180.02 | 180.29 |
| whisper | 1 | 4 | 1.33 | 1.34 | +0.03 | 180.05 | - (under 5 s) |
| synth_bridge | 4 | 16 | 5.33 | 5.33 | +0.00 | 180.07 | 180.13 |
| piano_interlude | 4 | 16 | 5.33 | 5.33 | +0.00 | 180.07 | 180.13 |
| build | 5 | 20 | 6.67 | 6.66 | -0.03 | 180.07 | 179.96 |
| final_chorus | 16 | 64 | 21.33 | 21.34 | +0.03 | 180.02 | 179.96 |
| robot_build_failed | 3 | 12 | 4.00 | 3.99 | -0.03 | 180.02 | - (under 5 s) |
| scream_end | 17 | 68 | 22.66 | 22.67 | +0.03 | 180.02 | 179.96 |
| outro | 2 | 9 | 3.00 | 2.75 | -0.75 | 180.02 | - (under 5 s) |
| **whole song** | 114 | 456 | 151.85 | 152.22 (first downbeat 0.303 to end) | +1.11 | 180.07 | - |

Section lengths equal bars x 4 x beat by construction (sections start and end on downbeats), so the real test is the two checks that do not use the grid:

1. The onset comb run on each section alone (last column) lands on 179.8-180.3 BPM for every section long enough to test, never near 185 or 153.
2. Abrupt level steps (>= 6 dB between the 0.15 s before and after, 33 of them) against the nearest downbeat. **Rises** (hits, restarts, re-entries; 11): median |offset| 150 ms, 2 within one 60 fps frame (16.7 ms), 3 within 33 ms. **Falls** (the start of a stop; 22): median |offset| 375 ms, 0 within 16.7 ms, 0 within 33 ms. A stop may begin anywhere inside a bar; what matters for the cut is where the band comes back, so the rise figures are the bar-phase test. Rises furthest from a downbeat: 26.50 s -639 ms, 21.00 s +529 ms, 70.30 s +517 ms, 40.10 s -363 ms.
3. Whole-song: 114 bars hold 456 beats = 151.85 s against 152.22 s of music after the first downbeat (+1.11 beats, the tail is silence/decay).

## 2. Sections

Loudness is RMS in dB of the mix (mean over the section's bars). Bass weight = mean bass-stem level (dB RMS) and the share of mix energy below 150 Hz. Heaviness is the 0-100 index of section 5 (relative to this song).

| section | start | end | bars (from-to) | n bars | length s | mean dB | bass stem dB | energy < 150 Hz | heaviness | voice stem dB | key (bass+other chroma) | start rule |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| intro_robot | 0.00 (0:00.00) | 4.82 (0:04.82) | 0-2 | 3 | 4.82 | -22.8 | -64.5 | 22 % | 26 (pop/soft) | -25.9 | D# major r=0.58 | file start; two flat robot lines 0.32-1.2 and 1.9-4.6 over a hit and a short drum fill |
| intro_groove | 4.82 (0:04.82) | 16.48 (0:16.48) | 3-11 | 9 | 11.66 | -20.7 | -31.1 | 44 % | 65 (METAL) | -33.9 | F minor r=0.53 | instrumental: bass and full drums enter at 4.82 and play to the guitar hit, no sung word |
| verse1_sweet | 16.48 (0:16.48) | 27.14 (0:27.14) | 12-19 | 8 | 10.66 | -21.9 | -31.0 | 30 % | 44 (pop/soft) | -24.4 | C major r=0.46 | downbeat of the bar holding the first word (17.10), band stop 17.25-17.75 inside it |
| verse2_raspy | 27.14 (0:27.14) | 39.13 (0:39.13) | 20-28 | 9 | 11.99 | -21.1 | -33.5 | 26 % | 41 (pop/soft) | -23.8 | C major r=0.60 | downbeat of the bar holding the first word (27.84) |
| prechorus | 39.13 (0:39.13) | 43.13 (0:43.13) | 29-31 | 3 | 4.00 | -21.6 | -54.8 | 28 % | 34 (pop/soft) | -23.7 | C minor r=0.72 | first 'Blue!' (38.56) is a 0.57 s pickup, bound to the next downbeat |
| chorus1 | 43.13 (0:43.13) | 64.45 (1:04.45) | 32-47 | 16 | 21.32 | -21.0 | -36.5 | 22 % | 36 (pop/soft) | -23.2 | G# major r=0.87 | first 'Accept' 43.08 is on the downbeat (-0.05 s) |
| verse3_trade | 64.45 (1:04.45) | 75.12 (1:15.12) | 48-55 | 8 | 10.67 | -21.0 | -36.1 | 34 % | 48 (mid) | -25.0 | F minor r=0.51 | drum-led restart on the downbeat (fill from 64.20) after the a cappella stop 62.45-64.15; Whisper's first 'You' is 64.60 but the voice stem rises only at about 65.15 |
| scream | 75.12 (1:15.12) | 76.45 (1:16.45) | 56-56 | 1 | 1.33 | -22.9 | -82.4 | 4 % | 7 (pop/soft) | -23.3 | C# minor r=0.27 | 'Ah' 75.50 is the first scream; whole band stopped 74.0-75.9 |
| breakdown_git_push_force | 76.45 (1:16.45) | 83.11 (1:23.11) | 57-61 | 5 | 6.66 | -19.2 | -30.5 | 50 % | 81 (METAL) | -24.8 | F major r=0.53 | heavy riff returns on the downbeat 76.45 (energy step +4.2 dB, bass back); GIT enters at 81.04 |
| whisper | 83.11 (1:23.11) | 84.45 (1:24.45) | 62-62 | 1 | 1.34 | -21.4 | -36.4 | 30 % | 43 (pop/soft) | -25.4 | F major r=0.64 | 'You wouldn't' 83.28-84.38 inside this bar and the next |
| synth_bridge | 84.45 (1:24.45) | 89.78 (1:29.78) | 63-66 | 4 | 5.33 | -20.9 | -30.8 | 46 % | 64 (mid) | -32.3 | A# major r=0.41 | instrumental: full band plus bright synth, no voiced vocal 84.5-88.9 (pyin voiced fraction 0) |
| piano_interlude | 89.78 (1:29.78) | 95.11 (1:35.11) | 67-70 | 4 | 5.33 | -23.8 | -83.5 | 3 % | 7 (pop/soft) | -24.2 | G# major r=0.86 | drums and bass leave on this downbeat (stop 89.4-89.75); 'Maybe' is a 0.82 s pickup at 88.96 |
| build | 95.11 (1:35.11) | 101.77 (1:41.77) | 71-75 | 5 | 6.66 | -20.9 | -76.5 | 18 % | 27 (pop/soft) | -22.3 | C minor r=0.70 | drums return at 95.11 under the harmonized 'We're the same file' |
| final_chorus | 101.77 (1:41.77) | 123.11 (2:03.11) | 76-91 | 16 | 21.34 | -19.9 | -36.7 | 26 % | 52 (mid) | -22.0 | G# major r=0.87 | first 'Accept' 101.76 is on the downbeat; drum-less held chord 100.4-101.77 before it |
| robot_build_failed | 123.11 (2:03.11) | 127.10 (2:07.10) | 92-94 | 3 | 3.99 | -24.6 | -82.5 | 1 % | 6 (pop/soft) | -28.6 | F major r=0.71 | drums and bass gone at 123.11, robot 'Failed' 123.66 |
| scream_end | 127.10 (2:07.10) | 149.77 (2:29.77) | 95-111 | 17 | 22.67 | -19.1 | -30.1 | 51 % | 84 (METAL) | -28.4 | F major r=0.51 | heavy band re-enters on the downbeat 127.10 after the stop 124.5-127.1 |
| outro | 149.77 (2:29.77) | 152.52 (2:32.52) | 112-113 | 2 | 2.75 | -26.8 | -60.7 | 91 % | 53 (mid) | -64.3 | C major r=0.45 | blast beat returns 149.5-150.5, then decay and silence |

The two sections not in the lyric tags but really in the audio: `intro_groove` (4.82-16.48 s, bass and full drums, no sung word) and `synth_bridge` (84.45-89.78 s, full band with a bright synth lead, the voiced-vocal fraction is 0 in 84.5-88.9 s). `postchorus` and `guitar_solo` of the old take do not exist in v1. The lyric's `[Heavy guitar hit]` is not a section: it is the band stop inside bar 12 (17.25-17.75 s) at the start of verse 1.

## 3. Burak's listening landmarks, checked

1. **Pop and metal interleaved from the very start: confirmed.** No clean pop-only intro. Bar 0-2 (0-4.82 s) is two flat robot lines over a hit and a drum fill (heaviness 26); from bar 3 (4.82 s) bass and full drums play (`intro_groove`, mean heaviness 65, bass stem -31.1 dB, 44 % of the energy under 150 Hz) before any singing. Of the bars before chorus 1 (bars 0-31) 4 are METAL, 16 mid and 12 pop/soft by the index of section 5: verse 2 and the chorus are the lightest parts (heaviness 41 and 36).
2. **The chorus changes after about 1:42: confirmed, and it is the final "Accept both changes" chorus.** It starts on the downbeat 101.77 s (1:41.77; first "Accept" 101.76 s) and is 16 bars like chorus 1, but it ends at 123.11 s (2:03.11), **not at 2:08**: the last word "soul" ends 121.88 s, the band stops at 123.11 s (robot "Build failed"). What changes against chorus 1: louder (-19.9 vs -21.0 dB), heavier (52 vs 36), and the lyric is the resolved one. **No key change was measured**: chorus 1 against the final chorus has best semitone shift 0 with chroma r=0.98, and both read A# major (Ab major).
3. **From about 2:08 to the end it is all-out heavy metal with screaming: confirmed, with a 1 s correction.** The heavy block starts on the downbeat 127.10 s (2:07.10) right after the stop 124.5-127.1 s, and runs to 149.77 s (2:29.77): heaviness 84 (the highest in the song), bass stem -30.1 dB, 51 % of the energy under 150 Hz, voice stem -28.4 dB with **no word Whisper can hear** (the scream; demucs separates screams poorly, so the voice level is understated). 123.11-127.10 s (2:03.11-2:07.10) is the robot "Build failed" stop, not metal. The last 2.75 s (`outro`) are the 1 s blast beat at 149.5-150.5 s and decay; the mix is under -45 dB only from 152.0 s.

## 4. Hard stops and true silences

`hard_stops` in `mc-timing.json` lists two kinds. **band stop** = drums+bass+other (demucs stems) fall 20 dB under their song median for >= 0.3 s (voice may stay); **true silence** = the whole mix under -45 dB. `micro_gaps` are the 0.1-0.3 s dips. Raw numbers: `stops_raw.json`.

| start | end | dur | kind | accompaniment dB | voice dB | what is there |
|---|---|---|---|---|---|---|
| 3.10 | 4.10 | 1.00 | band stop | -60.4 | -24.8 | and then commit the |
| 4.20 | 4.60 | 0.40 | band stop | -52.0 | -25.1 | results |
| 17.25 | 17.75 | 0.50 | band stop | -63.3 | -25.4 | I'm head, |
| 26.20 | 27.95 | 1.75 | band stop | -68.8 | -26.2 | midnight, who are you? I'm |
| 39.85 | 40.25 | 0.40 | band stop | -55.4 | -28.0 | blue, |
| 41.20 | 41.75 | 0.55 | band stop | -59.9 | -24.4 | Somebody |
| 44.00 | 44.30 | 0.30 | band stop | -53.7 | -21.8 | change, |
| 62.50 | 64.25 | 1.75 | band stop | -62.9 | -26.8 | can't take control |
| 67.10 | 67.45 | 0.35 | band stop | -49.1 | -25.4 | You |
| 74.00 | 75.90 | 1.90 | band stop | -58.8 | -24.8 | I know, I touched it Ah |
| 89.40 | 89.75 | 0.35 | band stop | -65.3 | -23.6 | blue |
| 90.70 | 91.00 | 0.30 | band stop | -49.0 | -23.3 | really mine |
| 93.30 | 93.75 | 0.45 | band stop | -48.9 | -22.9 | way to |
| 101.25 | 103.10 | 1.85 | band stop | -57.5 | -21.5 | Accept both changes, |
| 115.75 | 116.10 | 0.35 | band stop | -54.0 | -22.7 | it Equals, |
| 124.50 | 127.10 | 2.60 | band stop | -64.4 | -26.6 | syntax failed, syntax error on 942 |
| 152.00 | 152.52 | 0.52 | true silence | - | - | (no heard word) |

micro_gaps (s): [[4.1, 4.2]]

Reading them against the lyric sheet:

- **Robot "Automatic merge failed" (0.32-1.2 s) and "Fix conflicts and then commit the result" (1.9-4.6 s)**: not a silence. The band is cut from 3.10 s, under "... and then commit the results" (stops 3.10-4.10 s and 4.20-4.60 s, mix about -25 dB); the first line and "Fix conflicts" have drums under them (bar 0 drums -22 dB). The mix never drops under -45 dB.
- **"...you wouldn't" (83.28-84.38 s): NOT a stop.** The drums keep playing (-25 dB) and the voice is at normal level; the lyric's soft stop does not exist in this render. What follows (84.45-89.78 s) is a full-band synth bridge with no singing.
- **"Build failed" robot (123.11-127.10 s)**: drums and bass leave on the downbeat 123.11 (drums -65 dB, bass -80 dB), only a synth/chiptune stem (about -24 dB) and the robot voice remain until 124.5 s, then the whole accompaniment is gone until the metal re-entry at 127.10 s (stop 124.50-127.10 s, voice -26.6 dB: "syntax error on line forty-two" ends about 126.7 s). Whisper hears "Failed" at 123.66 s; the word "Build" is not picked up.
- **True silence**: only the very end, 152.00-152.52 s (the blast beat decays from 150.5 s, bass and voice are gone from about 151.0 s). There is no silence in the body of the song; every other stop keeps the voice or a stem.
- Other band stops worth knowing: 26.2-27.95 s (voice alone, last verse 1 line into verse 2), 39.85-40.25 and 41.2-41.75 s (pre-chorus "Pink!" / "Somebody resolve this"), **62.5-64.25 s (end of chorus 1, section 8)**, 74.0-75.9 s (the scream), 89.4-89.75 s (everything stops into the piano), 101.25-103.1 s (held chord before the final chorus).

## 5. Per-bar heaviness

Heaviness 0-100 = mean percentile rank, within this song, of four things: mix loudness, drums-stem level, bass-stem level (floored at -60 dB), share of energy under 150 Hz. The distortion / scream proxies are reported next to it, not inside it, because they also fire on bright pop bars (hats, synth leads): `flat` = mean spectral flatness (noise-likeness; screams and distorted guitars push it up), `hi %` = share of energy above 4 kHz. Label: >= 65 METAL, 45-65 mid, < 45 pop/soft. Metal-heavy bars are the ones with high bass dB and a high `< 150 Hz` share.

| bar | start | section | beats | mix dB | drums dB | bass dB | < 150 Hz % | hi % | flat | voice dB | heavy | label |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.30 | intro_robot | 4 | -20.2 | -22.2 | -67.2 | 44 | 9 | 0.072 | -25.9 | 58 | mid |
| 1 | 1.84 | intro_robot | 4 | -25.0 | -37.5 | -78.3 | 4 | 19 | 0.069 | -27.1 | 4 | pop/soft |
| 2 | 3.38 | intro_robot | 4 | -23.1 | -29.6 | -47.9 | 19 | 8 | 0.078 | -24.5 | 18 | pop/soft |
| 3 | 4.82 | intro_groove | 4 | -21.0 | -21.7 | -43.6 | 51 | 9 | 0.093 | -40.7 | 61 | mid |
| 4 | 6.16 | intro_groove | 3 | -21.2 | -22.2 | -37.1 | 35 | 10 | 0.104 | -47.3 | 51 | mid |
| 5 | 7.16 | intro_groove | 4 | -20.9 | -25.7 | -29.7 | 44 | 11 | 0.106 | -29.6 | 64 | mid |
| 6 | 8.49 | intro_groove | 4 | -21.0 | -26.7 | -28.7 | 40 | 9 | 0.086 | -29.2 | 61 | mid |
| 7 | 9.82 | intro_groove | 4 | -20.9 | -26.7 | -28.4 | 47 | 11 | 0.096 | -31.0 | 66 | METAL |
| 8 | 11.15 | intro_groove | 4 | -20.4 | -23.4 | -29.5 | 45 | 10 | 0.107 | -33.8 | 74 | METAL |
| 9 | 12.48 | intro_groove | 4 | -20.5 | -27.1 | -26.7 | 43 | 9 | 0.070 | -30.2 | 68 | METAL |
| 10 | 13.81 | intro_groove | 4 | -20.3 | -25.8 | -26.9 | 53 | 8 | 0.065 | -30.9 | 78 | METAL |
| 11 | 15.14 | intro_groove | 4 | -20.5 | -26.7 | -29.1 | 33 | 12 | 0.082 | -32.6 | 62 | mid |
| 12 | 16.48 | verse1_sweet | 4 | -23.0 | -28.2 | -39.2 | 9 | 14 | 0.105 | -26.4 | 20 | pop/soft |
| 13 | 17.81 | verse1_sweet | 4 | -21.7 | -28.2 | -29.5 | 35 | 9 | 0.055 | -24.3 | 47 | mid |
| 14 | 19.14 | verse1_sweet | 4 | -21.8 | -28.0 | -29.7 | 36 | 5 | 0.038 | -24.5 | 48 | mid |
| 15 | 20.47 | verse1_sweet | 4 | -22.0 | -28.0 | -29.7 | 37 | 5 | 0.043 | -24.6 | 48 | mid |
| 16 | 21.80 | verse1_sweet | 4 | -21.6 | -27.8 | -28.5 | 39 | 10 | 0.062 | -24.4 | 54 | mid |
| 17 | 23.13 | verse1_sweet | 4 | -21.1 | -27.9 | -28.1 | 36 | 4 | 0.027 | -23.6 | 55 | mid |
| 18 | 24.47 | verse1_sweet | 4 | -20.6 | -25.7 | -30.4 | 35 | 6 | 0.036 | -23.1 | 62 | mid |
| 19 | 25.80 | verse1_sweet | 4 | -23.7 | -40.2 | -33.0 | 15 | 12 | 0.091 | -24.8 | 16 | pop/soft |
| 20 | 27.14 | verse2_raspy | 4 | -22.3 | -27.6 | -50.7 | 22 | 10 | 0.086 | -24.5 | 26 | pop/soft |
| 21 | 28.47 | verse2_raspy | 4 | -21.3 | -28.5 | -30.4 | 32 | 12 | 0.093 | -25.0 | 44 | pop/soft |
| 22 | 29.80 | verse2_raspy | 4 | -21.1 | -28.5 | -31.1 | 26 | 7 | 0.070 | -24.3 | 41 | pop/soft |
| 23 | 31.14 | verse2_raspy | 4 | -21.0 | -29.2 | -32.5 | 23 | 7 | 0.062 | -23.3 | 34 | pop/soft |
| 24 | 32.47 | verse2_raspy | 4 | -20.9 | -29.3 | -31.8 | 23 | 7 | 0.063 | -23.3 | 36 | pop/soft |
| 25 | 33.80 | verse2_raspy | 4 | -20.9 | -29.0 | -29.9 | 26 | 11 | 0.072 | -23.3 | 45 | mid |
| 26 | 35.13 | verse2_raspy | 4 | -21.1 | -28.7 | -30.4 | 23 | 9 | 0.077 | -23.5 | 40 | pop/soft |
| 27 | 36.47 | verse2_raspy | 4 | -20.9 | -26.4 | -32.0 | 30 | 8 | 0.060 | -23.4 | 51 | mid |
| 28 | 37.80 | verse2_raspy | 4 | -20.7 | -26.0 | -32.6 | 32 | 12 | 0.085 | -23.9 | 52 | mid |
| 29 | 39.13 | prechorus | 4 | -22.5 | -26.7 | -53.5 | 32 | 9 | 0.088 | -25.3 | 34 | pop/soft |
| 30 | 40.46 | prechorus | 4 | -22.1 | -29.6 | -79.8 | 19 | 12 | 0.078 | -23.5 | 14 | pop/soft |
| 31 | 41.80 | prechorus | 4 | -20.1 | -28.2 | -31.2 | 32 | 6 | 0.065 | -22.4 | 54 | mid |
| 32 | 43.13 | chorus1 | 4 | -21.0 | -33.9 | -39.1 | 7 | 15 | 0.113 | -21.9 | 21 | pop/soft |
| 33 | 44.46 | chorus1 | 4 | -20.5 | -28.4 | -34.9 | 24 | 15 | 0.116 | -22.9 | 38 | pop/soft |
| 34 | 45.79 | chorus1 | 4 | -20.6 | -30.0 | -33.9 | 18 | 16 | 0.108 | -22.7 | 30 | pop/soft |
| 35 | 47.13 | chorus1 | 4 | -20.4 | -28.7 | -33.4 | 22 | 11 | 0.059 | -22.5 | 37 | pop/soft |
| 36 | 48.46 | chorus1 | 4 | -20.3 | -28.0 | -31.1 | 23 | 10 | 0.063 | -22.5 | 49 | mid |
| 37 | 49.79 | chorus1 | 4 | -21.6 | -29.9 | -31.9 | 24 | 14 | 0.101 | -24.2 | 31 | pop/soft |
| 38 | 51.13 | chorus1 | 4 | -20.8 | -28.7 | -31.2 | 22 | 9 | 0.081 | -23.2 | 39 | pop/soft |
| 39 | 52.46 | chorus1 | 4 | -20.4 | -27.2 | -32.9 | 26 | 8 | 0.056 | -22.7 | 47 | mid |
| 40 | 53.79 | chorus1 | 4 | -20.7 | -26.9 | -33.4 | 25 | 12 | 0.098 | -23.6 | 43 | pop/soft |
| 41 | 55.13 | chorus1 | 4 | -20.6 | -28.4 | -34.1 | 20 | 14 | 0.110 | -22.7 | 34 | pop/soft |
| 42 | 56.46 | chorus1 | 4 | -20.6 | -29.6 | -33.0 | 18 | 13 | 0.096 | -22.4 | 32 | pop/soft |
| 43 | 57.80 | chorus1 | 4 | -21.1 | -29.7 | -32.1 | 22 | 9 | 0.073 | -23.4 | 31 | pop/soft |
| 44 | 59.13 | chorus1 | 4 | -20.1 | -26.5 | -31.6 | 26 | 8 | 0.058 | -22.5 | 55 | mid |
| 45 | 60.46 | chorus1 | 4 | -21.2 | -27.9 | -33.0 | 28 | 12 | 0.086 | -24.5 | 38 | pop/soft |
| 46 | 61.78 | chorus1 | 4 | -22.4 | -29.6 | -35.8 | 21 | 15 | 0.100 | -24.7 | 22 | pop/soft |
| 47 | 63.12 | chorus1 | 4 | -23.3 | -28.2 | -83.1 | 28 | 12 | 0.072 | -25.2 | 22 | pop/soft |
| 48 | 64.45 | verse3_trade | 4 | -20.5 | -22.8 | -36.2 | 52 | 11 | 0.112 | -28.9 | 64 | mid |
| 49 | 65.78 | verse3_trade | 4 | -21.6 | -26.2 | -34.1 | 30 | 17 | 0.124 | -25.2 | 40 | pop/soft |
| 50 | 67.12 | verse3_trade | 4 | -21.3 | -26.6 | -31.1 | 35 | 13 | 0.082 | -24.8 | 51 | mid |
| 51 | 68.45 | verse3_trade | 4 | -21.5 | -30.1 | -33.7 | 13 | 11 | 0.087 | -22.8 | 23 | pop/soft |
| 52 | 69.78 | verse3_trade | 4 | -19.7 | -22.6 | -33.1 | 50 | 9 | 0.082 | -24.6 | 71 | METAL |
| 53 | 71.12 | verse3_trade | 4 | -21.3 | -26.9 | -30.9 | 37 | 15 | 0.111 | -25.3 | 52 | mid |
| 54 | 72.45 | verse3_trade | 4 | -20.2 | -23.7 | -31.4 | 52 | 12 | 0.096 | -25.7 | 73 | METAL |
| 55 | 73.78 | verse3_trade | 4 | -22.1 | -33.5 | -57.9 | 7 | 6 | 0.041 | -22.5 | 14 | pop/soft |
| 56 | 75.12 | scream | 4 | -22.9 | -36.5 | -82.4 | 4 | 9 | 0.053 | -23.3 | 7 | pop/soft |
| 57 | 76.45 | breakdown_git_push_force | 4 | -18.3 | -20.9 | -29.0 | 57 | 7 | 0.062 | -24.1 | 92 | METAL |
| 58 | 77.78 | breakdown_git_push_force | 4 | -18.9 | -22.7 | -28.8 | 50 | 6 | 0.053 | -23.4 | 85 | METAL |
| 59 | 79.12 | breakdown_git_push_force | 4 | -18.9 | -21.4 | -29.7 | 58 | 6 | 0.060 | -26.1 | 87 | METAL |
| 60 | 80.45 | breakdown_git_push_force | 4 | -19.2 | -22.4 | -29.5 | 48 | 7 | 0.071 | -24.9 | 82 | METAL |
| 61 | 81.78 | breakdown_git_push_force | 4 | -20.5 | -23.9 | -35.6 | 39 | 15 | 0.132 | -25.6 | 59 | mid |
| 62 | 83.11 | whisper | 4 | -21.4 | -25.2 | -36.4 | 30 | 14 | 0.098 | -25.4 | 43 | pop/soft |
| 63 | 84.45 | synth_bridge | 4 | -20.9 | -25.0 | -30.1 | 46 | 12 | 0.095 | -35.6 | 66 | METAL |
| 64 | 85.78 | synth_bridge | 4 | -21.1 | -25.8 | -29.5 | 40 | 11 | 0.089 | -34.8 | 61 | mid |
| 65 | 87.11 | synth_bridge | 4 | -21.0 | -24.8 | -30.7 | 47 | 9 | 0.083 | -32.7 | 65 | mid |
| 66 | 88.45 | synth_bridge | 4 | -20.6 | -24.1 | -33.0 | 50 | 7 | 0.051 | -25.9 | 63 | mid |
| 67 | 89.78 | piano_interlude | 4 | -23.5 | -33.9 | -83.2 | 11 | 8 | 0.036 | -24.2 | 11 | pop/soft |
| 68 | 91.11 | piano_interlude | 4 | -24.2 | -67.7 | -83.3 | 0 | 12 | 0.058 | -24.6 | 5 | pop/soft |
| 69 | 92.45 | piano_interlude | 4 | -23.9 | -66.7 | -83.6 | 0 | 18 | 0.058 | -24.0 | 5 | pop/soft |
| 70 | 93.78 | piano_interlude | 4 | -23.7 | -39.6 | -83.8 | 2 | 16 | 0.060 | -24.0 | 7 | pop/soft |
| 71 | 95.11 | build | 4 | -22.5 | -28.3 | -79.9 | 25 | 10 | 0.053 | -24.3 | 23 | pop/soft |
| 72 | 96.44 | build | 4 | -21.8 | -27.0 | -78.6 | 29 | 10 | 0.046 | -24.1 | 30 | pop/soft |
| 73 | 97.78 | build | 4 | -21.7 | -31.5 | -80.0 | 13 | 9 | 0.070 | -22.9 | 15 | pop/soft |
| 74 | 99.11 | build | 4 | -19.5 | -25.8 | -63.5 | 22 | 6 | 0.033 | -21.1 | 45 | pop/soft |
| 75 | 100.44 | build | 4 | -19.1 | -61.6 | -80.8 | 0 | 1 | 0.006 | -19.1 | 24 | pop/soft |
| 76 | 101.77 | final_chorus | 4 | -20.9 | -38.3 | -80.4 | 2 | 13 | 0.090 | -21.0 | 16 | pop/soft |
| 77 | 103.11 | final_chorus | 4 | -19.9 | -26.8 | -31.9 | 26 | 10 | 0.090 | -21.8 | 54 | mid |
| 78 | 104.44 | final_chorus | 4 | -20.3 | -27.5 | -31.1 | 26 | 13 | 0.094 | -22.5 | 53 | mid |
| 79 | 105.77 | final_chorus | 4 | -20.4 | -27.3 | -31.1 | 29 | 6 | 0.055 | -22.8 | 53 | mid |
| 80 | 107.11 | final_chorus | 4 | -19.9 | -26.8 | -31.5 | 26 | 8 | 0.044 | -21.9 | 55 | mid |
| 81 | 108.44 | final_chorus | 4 | -19.5 | -28.1 | -32.3 | 20 | 7 | 0.045 | -21.1 | 46 | mid |
| 82 | 109.77 | final_chorus | 4 | -19.9 | -26.1 | -31.5 | 32 | 6 | 0.046 | -22.3 | 60 | mid |
| 83 | 111.11 | final_chorus | 4 | -18.6 | -24.6 | -32.5 | 28 | 4 | 0.013 | -20.5 | 65 | mid |
| 84 | 112.44 | final_chorus | 4 | -18.9 | -22.6 | -32.2 | 43 | 7 | 0.051 | -22.2 | 74 | METAL |
| 85 | 113.77 | final_chorus | 4 | -20.0 | -27.4 | -32.2 | 23 | 12 | 0.086 | -21.9 | 48 | mid |
| 86 | 115.11 | final_chorus | 4 | -21.1 | -28.3 | -37.7 | 12 | 20 | 0.128 | -22.7 | 26 | pop/soft |
| 87 | 116.44 | final_chorus | 4 | -19.7 | -26.0 | -30.9 | 31 | 9 | 0.064 | -22.3 | 64 | mid |
| 88 | 117.77 | final_chorus | 4 | -19.3 | -26.2 | -31.9 | 23 | 6 | 0.030 | -21.1 | 57 | mid |
| 89 | 119.11 | final_chorus | 4 | -20.0 | -25.0 | -31.1 | 38 | 10 | 0.072 | -23.9 | 67 | METAL |
| 90 | 120.44 | final_chorus | 4 | -19.6 | -24.8 | -31.4 | 42 | 9 | 0.068 | -23.4 | 70 | METAL |
| 91 | 121.77 | final_chorus | 4 | -20.3 | -32.6 | -57.0 | 4 | 6 | 0.026 | -21.1 | 26 | pop/soft |
| 92 | 123.11 | robot_build_failed | 4 | -23.0 | -65.6 | -80.7 | 0 | 3 | 0.027 | -34.4 | 7 | pop/soft |
| 93 | 124.44 | robot_build_failed | 4 | -26.5 | -69.5 | -83.3 | 0 | 21 | 0.107 | -26.5 | 2 | pop/soft |
| 94 | 125.77 | robot_build_failed | 4 | -24.4 | -35.7 | -83.3 | 4 | 5 | 0.032 | -24.8 | 9 | pop/soft |
| 95 | 127.10 | scream_end | 4 | -18.8 | -19.9 | -64.7 | 68 | 6 | 0.071 | -26.3 | 77 | METAL |
| 96 | 128.44 | scream_end | 4 | -18.9 | -25.3 | -27.1 | 36 | 6 | 0.059 | -21.9 | 79 | METAL |
| 97 | 129.77 | scream_end | 4 | -19.2 | -25.9 | -26.6 | 39 | 5 | 0.054 | -22.6 | 78 | METAL |
| 98 | 131.10 | scream_end | 3 | -19.1 | -25.6 | -26.0 | 41 | 5 | 0.053 | -23.0 | 81 | METAL |
| 99 | 132.10 | scream_end | 4 | -18.4 | -21.3 | -27.5 | 59 | 4 | 0.050 | -25.3 | 95 | METAL |
| 100 | 133.43 | scream_end | 4 | -19.4 | -24.1 | -27.1 | 50 | 6 | 0.064 | -34.0 | 84 | METAL |
| 101 | 134.77 | scream_end | 4 | -18.8 | -21.8 | -27.6 | 59 | 4 | 0.046 | -66.5 | 93 | METAL |
| 102 | 136.10 | scream_end | 4 | -18.3 | -20.9 | -28.2 | 58 | 4 | 0.050 | -25.9 | 94 | METAL |
| 103 | 137.43 | scream_end | 5 | -18.6 | -22.0 | -28.9 | 47 | 5 | 0.056 | -23.2 | 87 | METAL |
| 104 | 139.10 | scream_end | 4 | -19.8 | -24.4 | -26.2 | 56 | 7 | 0.075 | -26.7 | 85 | METAL |
| 105 | 140.43 | scream_end | 4 | -19.6 | -23.7 | -26.6 | 56 | 5 | 0.057 | -26.1 | 87 | METAL |
| 106 | 141.77 | scream_end | 4 | -19.5 | -22.3 | -27.2 | 63 | 5 | 0.059 | -27.7 | 89 | METAL |
| 107 | 143.10 | scream_end | 4 | -17.9 | -20.8 | -29.5 | 51 | 5 | 0.051 | -22.3 | 91 | METAL |
| 108 | 144.43 | scream_end | 4 | -19.0 | -22.1 | -27.4 | 58 | 7 | 0.061 | -29.6 | 91 | METAL |
| 109 | 145.77 | scream_end | 4 | -18.9 | -21.9 | -27.1 | 62 | 6 | 0.048 | -28.9 | 93 | METAL |
| 110 | 147.10 | scream_end | 4 | -18.9 | -22.5 | -27.5 | 49 | 8 | 0.065 | -24.7 | 87 | METAL |
| 111 | 148.43 | scream_end | 4 | -22.4 | -25.6 | -35.7 | 16 | 12 | 0.104 | -28.6 | 32 | pop/soft |
| 112 | 149.77 | outro | 4 | -20.5 | -23.9 | -31.0 | 84 | 5 | 0.027 | -42.1 | 75 | METAL |
| 113 | 151.10 | outro | 5 | -33.1 | -33.5 | -90.3 | 99 | 0 | 0.001 | -86.6 | 32 | pop/soft |

Label count per section (METAL / mid / pop-soft bars):

- intro_robot: 0 / 1 / 2
- intro_groove: 4 / 5 / 0
- verse1_sweet: 0 / 6 / 2
- verse2_raspy: 0 / 3 / 6
- prechorus: 0 / 1 / 2
- chorus1: 0 / 3 / 13
- verse3_trade: 2 / 3 / 3
- scream: 0 / 0 / 1
- breakdown_git_push_force: 4 / 1 / 0
- whisper: 0 / 0 / 1
- synth_bridge: 1 / 3 / 0
- piano_interlude: 0 / 0 / 4
- build: 0 / 0 / 5
- final_chorus: 3 / 10 / 3
- robot_build_failed: 0 / 0 / 3
- scream_end: 16 / 0 / 1
- outro: 1 / 0 / 1

## 6. Key

**F minor (bass+other chroma, r=0.70; next C minor 0.44; both choruses read A# major, i.e. Ab major, the relative of F minor)**

- Measured on the bass + other stems (drums and screams smear the mix chroma, which gave only C minor at r=0.64). Whole song: F minor r=0.70, next C minor 0.44 and G# major 0.44; vocal stem alone reads C minor (0.75). Both choruses (the two places with a clear tonal center) read **A# major = Ab major, r=0.87**, the relative major of F minor; so the song lives in the Ab major / F minor / C minor family and the tonal centre is **F minor with Ab major choruses**.
- The metal block (127-150 s) has no clear key (F major/F minor 0.5: riff on F). No modulation up in the final chorus (see section 3). 8-bar key windows are in `_detail.json` (`key_windows`).

## 7. Lyrics against what was heard

Whisper large-v3 on the full mix plus a pass on the demucs vocal stem (the stem pass for 0-30 s was redone clipped with a lyric prompt because it hallucinated "D-D-D" there). A lyric word gets a time only when a heard word matches it; a line with fewer than half its words heard gets `null` start/end. `ratio` = matched words / lyric words.

| lyric line | start | end | ratio | heard | lyric words not heard |
|---|---|---|---|---|---|
| Automatic merge failed. | 0.32 | 1.20 | 0.67 | automatic merge | failed |
| Fix conflicts and then commit the result. | 1.90 | 4.60 | 1.00 | Fix conflicts and then commit the results | - |
| I'm HEAD, I'm main, I'm stable and clean | 17.10 | 19.70 | 1.00 | I'm head, I'm main, I'm stable and clean | - |
| Line forty-two, the button was blue, the calmest you've seen | 19.70 | 22.42 | 1.00 | Line forty the button was blue, the calmest you've seen | - |
| Reviewed and approved by the whole design team | 23.00 | 25.14 | 1.00 | Reviewed and approved by the whole design team | - |
| Then someone pushed at midnight... who are you? | 25.14 | 27.84 | 1.00 | Then someone pushed at midnight, who are you? | - |
| I'm feature branch, I'm fresh from the night | 27.84 | 30.38 | 1.00 | I'm feature branch, I'm fresh from the night | - |
| The button is PINK now and baby, the pink is right | 30.38 | 33.04 | 1.00 | The button is pink now and baby the pink is right | - |
| I rewrote your CSS and I'm ready to fight | 33.04 | 35.70 | 1.00 | I rewrote your CSS and I'm ready to fight | - |
| Three hundred commits and I never asked once! | 36.22 | 38.56 | 0.75 | commits and I never asked once | three, hundred |
| Blue! | 38.56 | 39.12 | 1.00 | Blue, | - |
| Pink! | 39.50 | 39.80 | 1.00 | pink, | - |
| Blue! | 40.10 | 40.46 | 1.00 | blue, | - |
| PINK! | 40.78 | 41.08 | 1.00 | pink | - |
| Somebody resolve this! | 41.08 | 43.08 | 1.00 | Somebody resolve this | - |
| Accept current change! (NO!) | 43.08 | 44.92 | 1.00 | Accept current change, no | - |
| Accept incoming change! (NO!) | 44.92 | 46.88 | 1.00 | Accept incoming change, no | - |
| Two girls, one line, the build is on fire | 46.88 | 49.36 | 1.00 | Two girls, one line, the build is on fire | - |
| Merge conflict, merge conflict, heart going haywire | 49.36 | 53.17 | 1.00 | Merge conflicts, merge conflicts Heart going haywire | - |
| Accept current change! (NEVER!) | 53.40 | 55.68 | 1.00 | Accept current change, never | - |
| Accept incoming change! (NEVER!) | 55.68 | 57.50 | 1.00 | Accept incoming change, never | - |
| Equals, equals, equals in the middle of my soul | 57.50 | 59.88 | 0.89 | Equals, equals in the middle of my soul | equals |
| Merge conflict, merge conflict, I can't take control | 59.88 | 63.80 | 1.00 | Merge conflicts, merge conflict I can't take control | - |
| You use tabs! | 64.60 | 65.86 | 1.00 | You use tabs, | - |
| You use spaces! | 66.20 | 67.36 | 1.00 | you use spaces | - |
| You named a variable "data2"! | 67.36 | 69.22 | 1.00 | You named a variable data | - |
| You wrote a comment that just says "don't touch"! | 69.64 | 72.60 | 1.00 | You wrote a comment that just says don't touch | - |
| I wrote that comment! | 72.60 | 74.02 | 1.00 | I wrote that comment, | - |
| I KNOW! I TOUCHED IT! | 74.14 | 75.50 | 1.00 | I know, I touched it | - |
| AAAAAH! | - | - | 0.00 | (nothing heard) | aaaaah |
| GIT! | 81.04 | 81.51 | 1.00 | Get, | - |
| PUSH! | 82.08 | 82.62 | 1.00 | push, | - |
| FORCE! | 82.80 | 83.28 | 1.00 | force | - |
| ...you wouldn't. | 83.28 | 84.38 | 1.00 | You wouldn't | - |
| Maybe blue was never really mine | 88.96 | 91.20 | 1.00 | Maybe blue was never really mine | - |
| Maybe pink was just my way to say hello | 91.20 | 94.44 | 1.00 | Maybe pink was just my way to say hello | - |
| We're the same file, just from different times | 94.44 | 97.12 | 1.00 | We're the same file, just from different times | - |
| Two branches of the same old tree, you know | 97.12 | 100.46 | 1.00 | Two branches of the same old tree, you know | - |
| Accept both changes! (YES!) | 101.76 | 103.40 | 0.75 | Accept both changes, | yes |
| Accept both changes! (YES!) | 103.84 | 105.06 | 0.75 | accept both changes | yes |
| Blue and pink together, it's a gradient now | 105.06 | 107.73 | 1.00 | Blue and pink together, it's a gradient now | - |
| Two girls, one line, and we figured it out | 107.82 | 111.24 | 1.00 | Two girls, one line, and we figured it out | - |
| Accept both changes! (YES!) | 112.44 | 114.06 | 0.75 | Accept both changes, | yes |
| Commit and push it! (PUSH IT!) | 114.80 | 116.04 | 0.83 | and push it, push it | commit |
| Equals, equals, equals, now we're whole | 116.04 | 118.44 | 1.00 | Equals, equals, equals, now we're whole | - |
| Merge conflict resolved inside my soul | 118.44 | 121.88 | 1.00 | Merged conflict resolved inside my soul | - |
| Build failed. | 123.66 | 124.40 | 0.50 | Failed, | build |
| Syntax error on line forty-two. | 124.68 | 126.70 | 0.60 | syntax error on | line, fortytwo |
| AAAAAAAH! | - | - | 0.00 | (nothing heard) | aaaaaaah |

**Where Whisper heard something else** (the video must keep the lyric text, the timing is the heard word's):
- "Equals, equals, equals in the middle of my soul" (chorus 1) heard as "Pickles, pickles, pickles" in the full pass at 57.5 s; the vocal-stem pass heard "Equals" correctly, only two of three "equals" bound (ratio 0.89).
- "Merge conflict" heard as "Merge conflicts" / "Merged conflict resolved" (final chorus); "Line forty-two" heard "Line 42" and "Syntax error on line forty-two" heard "syntax error on 942" (times kept, digits spelled out by the builder); "Git" heard "Get" (81.04 s, probability 0.05, weak); "Accept" heard "Accept" in chorus 1 and the final chorus in this take (the old take heard "Except" in places).
- Heard, not in the lyric sheet: 58.04-58.52 "pickles, pickles"; 114.28-114.80 "yeah, come in"; 124.68-125.84 "failed, syntax"; 126.84-149.76 "942 you"
- "Thank you." at 148.7 s (vocal stem) and "you" at 148.36 s are Whisper inventing words over the end of the scream, not lyrics.
- `Three hundred commits` is heard as "300 commits" (digits above 99 are not spelled out, so "three, hundred" stay unbound); `(YES!)` in the final chorus is heard as "yeah" (ratio 0.75 on those lines, no bound time for "yes").
- Not heard at all, therefore **not bound to any time** (their section is timed by energy, not by words): `AAAAAH!` (scream, 75.12-76.45 s) and `AAAAAAAH!` (scream_end, 127.10-149.77 s); "Build failed" is half-heard ("Failed" only, 123.66 s). `Commit and push it!` heard "come in and push it, push it", bound to 114.80-116.04 s.
- The pre-chorus is "Blue! Pink! Blue! PINK!" in the lyric and the audio sings exactly that (38.56-41.08 s), the interlude and the final chorus are heard line for line. Chorus 1 line "Two girls, one line" is heard whole (the old take sang "One conflict").
- `accept_hooks` (word pairs for the engine): 43.08 Accept current; 44.92 Accept incoming; 53.40 Accept current; 55.68 Accept incoming; 101.76 Accept both; 103.84 accept both; 112.44 Accept both

## 8. Splice points for the new verse and the copy of chorus 1

Plan: chorus 1 | new verse | copy of chorus 1 | verse 3.

**(a) Where chorus 1 ends: downbeat 64.450 s (bar 48, 1:04.45).** The last word "control" is sung 63.04-63.80 s (Whisper), but the voice stem holds the note a cappella until 64.39 s and is gone (< -45 dB) by 64.50 s, so the tail ends on the downbeat. **The band does not play straight into verse 3: it stops, then restarts with a drum fill.** Measured per 0.1 s on the stems: drums, bass and other all fall at 62.45 s (drums -62 to -80 dB, bass -82 to -87 dB, other -67 to -73 dB) and stay down until 64.15 s (1.7 s = 1.3 bars) while the voice holds "control" alone at about -24 dB. The drums come back at 64.20 s with a short fill (-24 dB, then -19 dB; the fill is the last 0.28 s before the bar line) and hit on the downbeat 64.45 s; the guitars/synth stem returns from about 64.6 s (-37 dB) and the bass only from about 65.2 s (-44 to -30 dB). So the cut is **a cappella stop, drum fill, drum-led restart on the bar line**: no straight-through playing.

**(b) Where verse 3 ("You use tabs!") starts: downbeat 64.450 s (bar 48, 1:04.45)**, the same downbeat as (a). Whisper binds the first word "You" to 64.60 s (0.15 s after the downbeat) and holds it to 65.24 s, but the voice stem is at -52 to -43 dB until 65.1 s and rises to -26 dB only at 65.20 s: **the audible "You" starts about 65.15 s**, and 64.45-65.15 s is a drums-led stretch with almost no voice. `words` keeps Whisper's 64.60 s (a measured value); anything that must hit the sung syllable should use about 65.15 s for "You" and 65.24 s for "use".

**(c) Chorus 1**: starts on downbeat **43.128 s** (bar 32, 0:43.13) and ends on downbeat **64.450 s** (bar 48, 1:04.45): **16 bars, 21.322 s** (16 x 1.3333 s). It starts on a downbeat: the first "Accept" is heard at 43.08 s, 0.048 s before the bar line (inside the measurement error, a word onset). **There is no pickup in the vocal**: the voice does not start early; the previous section's "Somebody resolve this!" (41.08-43.08 s) is sustained straight into "Accept" with no gap (voice stem never below -30.5 dB from 1 s before the chorus to 0.1 s after). The only anacrusis-like thing is that long held "this" leading into the downbeat; the band restarts on the bar line (drums -28.2 dB in the bar before, -33.9 dB after, an easy entry).

**(d) Will a cut be audible?** Similarity of the bar(s) before and after each candidate downbeat. Reference: the same numbers over every adjacent pair of regular bars in the song (median / 10th percentile for 1 bar: mel cosine 0.79 / 0.24, chroma cosine 0.97 / 0.92, |mix dB change| median 0.5, 90th percentile 2.2; for 2 bars: mel 0.81 / 0.36, chroma 0.98 / 0.96).

| cut (downbeat) | window | before: mix / drums / bass / other / voice dB | after: mix / drums / bass / other / voice dB | mix dB change | mel cosine | chroma cosine | 100 ms either side of the cut, dB before minus after (mix / drums / bass / other / voice) |
|---|---|---|---|---|---|---|---|
| into chorus 1 (43.13 s, bar 32) | 1 bar | -20.1 / -28.2 / -31.2 / -34.5 / -22.4 | -21.0 / -33.9 / -39.1 / -39.8 / -21.9 | -1.0 | 0.85 | 0.99 | +0.1 / -0.7 / +0.4 / +1.9 / -0.1 |
| into chorus 1 (43.13 s, bar 32) | 2 bar | -21.0 / -28.9 / -34.2 / -37.4 / -22.9 | -20.8 / -30.3 / -36.5 / -37.0 / -22.3 | +0.2 | 0.89 | 1.00 |  |
| chorus 1 end = verse 3 start (64.45 s, bar 48) | 1 bar | -23.3 / -28.2 / -83.1 / -66.5 / -25.2 | -20.5 / -22.8 / -36.2 / -35.7 / -28.9 | +2.8 | -0.05 | 0.95 | +3.9 / +3.4 / +2.2 / +0.4 / +15.1 |
| chorus 1 end = verse 3 start (64.45 s, bar 48) | 2 bar | -22.8 / -28.9 / -38.8 / -40.6 / -25.0 | -21.0 / -24.2 / -35.1 / -37.4 / -26.6 | +1.8 | 0.23 | 0.99 |  |

Reading:

- **Into chorus 1 (43.13 s)** is the safe seam: 1-bar mel cosine 0.85, chroma 0.99, mix change -1.0 dB, nothing changes at the cut itself (mix +0.1 dB over 100 ms). A new verse that ends like the pre-chorus (voice sustained into the bar line, band entering softly) can be followed by the chorus copy with no audible join.
- **Chorus 1 end / verse 3 start (64.45 s)** is not a smooth seam by nature: the bar before is a band stop (voice alone over silence; bass -83.1 dB, other -66.5 dB) and the bar after is the drum-led restart (mel cosine -0.05, far below the song's 10th percentile 0.24). It is audible, but it is the song's own stop-and-restart, so it reads as intended. Chroma cosine 0.95 (same harmony), level change only +2.8 dB, and the voice drops +15.1 dB across 100 ms (held note ends on the bar line). Recommended: **cut on 64.45 s** and give the new verse a restart of its own (drum fill into a downbeat hit); the copy of chorus 1 then ends in this same stop-fill-restart into verse 3, so that last seam is the original one and needs no work. If the generated verse starts without a drum fill, start it 0.28 s early (at the 64.17 s fill) instead.
- If a seamless join is wanted inside chorus 1's last phrase instead, the band-stop begins at 62.50 s (inside bar 46, not on a downbeat); the nearest downbeat before it is bar 46 at 61.78 s, two bars of chorus-level audio before the stop, but that leaves "I can't take control" cut mid-line, so it is not recommended.

## 9. Files

`mc-timing.json` (engine file, schema of `take-2026-10-20`; `bars[]` additionally carry `beats`, `low_pct`, `high_pct`, `flatness`, `heavy`), `bars.json`, `lyric_align.json`, `whisper_vocals.json`, `stops_raw.json` (start, end, dur, mix dB before, mix dB inside), plus `whisper_main.json` (full-mix pass), `splice.json`, `_grid.json`, `_downbeats.json`, `_detail.json` (intermediates). Tools: `merge-conflict/tools/timing/` (beatgrid, downbeats, whisper_words, lyrics_align, build_mc_timing, splice_report, make_summary_mc). Stems: demucs htdemucs, 4-stem, not kept (git-ignored size).
