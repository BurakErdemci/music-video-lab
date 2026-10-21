# Merge Conflict v4 — timing summary (take-v4)

Source `audio/merge-conflict-v4.wav` (final take: a Suno Cover of v1 with the v4 lyrics, git-ignored), 232.12 s, 48 kHz stereo. Every number is measured from that file. Bar numbers are the 0-based `bars[].bar` of `mc-timing.json` (bar 0 starts at the first downbeat, 0.380 s). Method and tools as for take-v1 (`tools/timing/`), with `MC_TAKE=v4`.

## 1. Tempo and key

- **180.09 BPM** (`bpm_mean`; `bpm_range_20s` 179.4-180.7). Suno was asked for 185; take-v1 was 180.07; the old take 153.
- The tempo is not perfectly constant: the fitted grid has 5 constant-tempo segments, 180.61 BPM 0.0-30.5 s, 180.67 BPM 30.5-68.5 s, 180.61 BPM 68.5-103.4 s, 179.86 BPM 103.4-168.7 s, 179.43 BPM 168.7-232.1 s. The drift (180.6 to 179.4 BPM, 0.7 %) is real, so the engine must read the beats, never one constant. Beat 0.332-0.334 s, bar about 1.33 s.
- Beat level: straight-grid onset comb 1.361 at 180.72 BPM (pulse), 1.418 at 90.36 BPM (half-time), 1.254 at 361.45 BPM (double). As in v1 the half-time comb scores slightly higher; the 180 level is kept for the same reason (one lyric line = 2 bars, 16-bar choruses, so the engine's bar logic is unchanged).
- Grid accuracy: onset-snapped minus grid, median |dev| 4.7 ms, max 39.6 ms; 27 of 697 beats further than 33.3 ms from an onset peak (stops, held notes, and the decaying tail after 230 s).
- Odd bars the downbeat tracker inserted: bar 9 at 12.34 s = 2 beats, bar 11 at 14.33 s = 6 beats, bar 172 at 229.59 s = 8 beats. The first two are in the intro groove (2 + 6 beats = two normal bars: the tracker shifted bar phase by two beats there), so bars 9-11 are the least reliable bar lines; the last is the 2.5 s decay after the music ends. Every section start from bar 12 on is a regular 4-beat bar.
- **Key: F minor (bass+other chroma, r=0.85; next G# major 0.58); chorus1 reads G# major r=0.92; chorus2 reads G# major r=0.90; final_chorus reads G# major r=0.93.** Measured on the bass + other stems; all three choruses read A# major (= Ab major, the relative of F minor), so the tonal centre is F minor with Ab major choruses, as in take-v1. No key change in the final chorus (chorus 1 vs final chorus: best shift 0 semitones, r=0.96).

### Structural validation (bars x 4 x beat = durations)

| section | bars | beats in bars | bars x 4 x beat (s) | section length (s) | diff (beats) | grid BPM | independent onset-comb BPM |
|---|---|---|---|---|---|---|---|
| intro_robot | 3 | 12 | 4.00 | 4.37 | +1.11 | 180.61 | - (under 5 s) |
| intro_groove | 9 | 36 | 12.01 | 11.96 | -0.15 | 180.61 | 180.45 |
| verse1_sweet | 8 | 32 | 10.68 | 10.63 | -0.15 | 180.61 | 180.61 |
| verse2_raspy | 9 | 36 | 12.01 | 11.95 | -0.18 | 180.67 | 180.45 |
| prechorus | 3 | 12 | 4.00 | 3.99 | -0.03 | 180.67 | - (under 5 s) |
| chorus1 | 16 | 64 | 21.35 | 21.25 | -0.30 | 180.67 | 180.61 |
| verse3_rebase | 16 | 64 | 21.35 | 21.27 | -0.24 | 180.61 | 180.61 |
| chorus2 | 16 | 64 | 21.35 | 21.26 | -0.27 | 180.61 | 180.61 |
| verse4_trade | 8 | 32 | 10.68 | 10.68 | +0.00 | 179.86 | 179.8 |
| scream | 2 | 8 | 2.67 | 2.67 | +0.00 | 179.86 | - (under 5 s) |
| breakdown_git_push_force | 4 | 16 | 5.34 | 5.33 | -0.03 | 179.86 | 179.8 |
| whisper | 1 | 4 | 1.33 | 1.34 | +0.03 | 179.86 | - (under 5 s) |
| guitar_solo | 10 | 40 | 13.34 | 13.34 | +0.00 | 179.86 | 180.13 |
| piano_interlude | 7 | 28 | 9.34 | 9.34 | +0.00 | 179.86 | 179.64 |
| build | 8 | 32 | 10.68 | 10.68 | +0.00 | 179.86 | 179.8 |
| final_chorus | 16 | 64 | 21.35 | 21.38 | +0.09 | 179.43 | 179.64 |
| post_chorus_chant | 9 | 36 | 12.01 | 12.04 | +0.09 | 179.43 | 179.48 |
| robot_build_failed | 2 | 8 | 2.67 | 2.67 | +0.00 | 179.43 | - (under 5 s) |
| scream_end | 13 | 52 | 17.35 | 17.39 | +0.12 | 179.43 | 179.32 |
| outro | 13 | 56 | 18.68 | 18.58 | -0.30 | 179.43 | 179.64 |
| **whole song** | 173 | 696 | 231.77 | 231.74 (first downbeat 0.380 to end) | -0.08 | 180.09 | - |

Sections start and end on downbeats, so the equation holds by construction; the tests that do not use the grid:

1. The onset comb run on each section alone lands on 179.3-180.6 BPM, following the drift above (180.5 early, 179.3-179.6 late); never near 185 or 153.
2. Abrupt level steps (>= 6 dB between the 0.15 s before and after, 25 of them) against the grid. **Rises** (hits, re-entries; 12): median distance to the nearest *downbeat* 345 ms (only 0 within 33 ms), to the nearest *beat* 47 ms (4 of 12 within 33 ms). **Falls** (the start of a stop; 13): 373 ms to a downbeat, 70 ms to a beat (2 of 13 within 33 ms). Reading: the stops and re-entries sit on beats, not on bar lines (a phrase breaks anywhere in the bar); at this test's 50 ms frame resolution a median 47-70 ms to a beat is consistent with all of them being on beats. The bar phase is verified by the section starts: chorus 1, chorus 2 and the final chorus start within 0.06 s of their downbeats, verse 4 within 0.16 s; the other verses and the pre-chorus start with a sung pickup or syncopation 0.5-0.8 s into their bar.
3. Whole song: 173 bars hold 696 beats = 231.77 s against 231.74 s of music after the first downbeat (-0.08 beats; the song ends in a 2.5 s decay).

## 2. Sections

Loudness is RMS in dB of the mix (mean over the section's bars). Bass weight = mean bass-stem dB and the share of mix energy under 150 Hz. Heaviness is the 0-100 index of section 4 (percentile ranks within this song). Names follow the v4 lyric tags.

| section | start | end | bars (from-to) | n bars | length s | mean dB | bass stem dB | energy < 150 Hz | heaviness | voice stem dB | start rule |
|---|---|---|---|---|---|---|---|---|---|---|---|
| intro_robot | 0.00 (0:00.00) | 4.37 (0:04.37) | 0-2 | 3 | 4.37 | -23.2 | -40.7 | 27 % | 25 (pop/soft) | -26.8 | file start; two flat robot lines 0.0-1.22 and 1.9-4.46 |
| intro_groove | 4.37 (0:04.37) | 16.33 (0:16.33) | 3-11 | 9 | 11.96 | -20.7 | -29.5 | 49 % | 61 (mid) | -30.2 | instrumental: bass and full drums enter at 4.37, no sung word until verse 1 |
| verse1_sweet | 16.33 (0:16.33) | 26.96 (0:26.96) | 12-19 | 8 | 10.63 | -22.3 | -36.5 | 27 % | 20 (pop/soft) | -25.1 | downbeat of the bar holding the first word (16.88) |
| verse2_raspy | 26.96 (0:26.96) | 38.91 (0:38.91) | 20-28 | 9 | 11.95 | -21.7 | -30.6 | 33 % | 30 (pop/soft) | -24.7 | downbeat of the bar holding the first word (27.68); band stop 26.0-27.7 just before |
| prechorus | 38.91 (0:38.91) | 42.90 (0:42.90) | 29-31 | 3 | 3.99 | -22.3 | -37.8 | 34 % | 27 (pop/soft) | -24.9 | first 'Blue!' (38.40) is a 0.51 s pickup, bound to the next downbeat |
| chorus1 | 42.90 (0:42.90) | 64.15 (1:04.15) | 32-47 | 16 | 21.25 | -21.2 | -30.4 | 30 % | 33 (pop/soft) | -23.9 | first 'Accept' 42.84 is on the downbeat (-0.06 s) |
| verse3_rebase | 64.15 (1:04.15) | 85.42 (1:25.42) | 48-63 | 16 | 21.27 | -20.9 | -34.0 | 36 % | 42 (pop/soft) | -24.4 | downbeat after the chorus; 'I' heard at 64.64 |
| chorus2 | 85.42 (1:25.42) | 106.68 (1:46.68) | 64-79 | 16 | 21.26 | -20.8 | -29.7 | 34 % | 44 (pop/soft) | -24.0 | first 'Accept' 85.38 is on the downbeat (-0.04 s) |
| verse4_trade | 106.68 (1:46.68) | 117.36 (1:57.36) | 80-87 | 8 | 10.68 | -20.3 | -31.2 | 40 % | 53 (mid) | -24.3 | first 'You' 106.84 is 0.16 s after the downbeat |
| scream | 117.36 (1:57.36) | 120.03 (2:00.03) | 88-89 | 2 | 2.67 | -19.4 | -28.6 | 38 % | 65 (METAL) | -22.9 | 'I KNOW! I TOUCHED IT!' ends 117.74; no heard word until GIT at 120.68; band stop 116.5-117.2 before |
| breakdown_git_push_force | 120.03 (2:00.03) | 125.36 (2:05.36) | 90-93 | 4 | 5.33 | -19.1 | -28.4 | 54 % | 78 (METAL) | -24.3 | heaviest riff returns on this downbeat; GIT enters at 120.68, PUSH 124.32, FORCE 125.02 (3.4 s apart) |
| whisper | 125.36 (2:05.36) | 126.70 (2:06.70) | 94-94 | 1 | 1.34 | -19.4 | -29.6 | 48 % | 70 (METAL) | -23.5 | 'You wouldn't' 125.52-126.74 starts in the previous bar and ends in this one |
| guitar_solo | 126.70 (2:06.70) | 140.04 (2:20.04) | 95-104 | 10 | 13.34 | -19.6 | -28.1 | 46 % | 70 (METAL) | -27.7 | downbeat after 'wouldn't'; no heard word to 142.4; the solo ends where bass and the heavy drums leave at 140.04 |
| piano_interlude | 140.04 (2:20.04) | 149.38 (2:29.38) | 105-111 | 7 | 9.34 | -23.8 | -80.6 | 2 % | 4 (pop/soft) | -28.3 | bass and drums leave (bass -56 then -85 dB, drums -44 dB); 'Maybe' 142.44 |
| build | 149.38 (2:29.38) | 160.06 (2:40.06) | 112-119 | 8 | 10.68 | -21.4 | -58.4 | 20 % | 23 (pop/soft) | -23.4 | drums return +14 dB under 'We're the same file' 149.12 |
| final_chorus | 160.06 (2:40.06) | 181.44 (3:01.44) | 120-135 | 16 | 21.38 | -20.1 | -28.3 | 38 % | 56 (mid) | -23.3 | first 'Accept' 160.04 is on the downbeat |
| post_chorus_chant | 181.44 (3:01.44) | 193.48 (3:13.48) | 136-144 | 9 | 12.04 | -19.4 | -26.6 | 62 % | 81 (METAL) | -26.3 | downbeat after 'soul' ends (180.3); first chant 'Accept' 182.14 |
| robot_build_failed | 193.48 (3:13.48) | 196.15 (3:16.15) | 145-146 | 2 | 2.67 | -22.9 | -60.9 | 5 % | 7 (pop/soft) | -24.2 | drums and bass cut at 193.5; robot 'Failed' heard 193.1-193.8, 'Syntax error' 194.22-196.49 |
| scream_end | 196.15 (3:16.15) | 213.54 (3:33.54) | 147-159 | 13 | 17.39 | -19.2 | -26.5 | 61 % | 82 (METAL) | -34.4 | last downbeat before the metal returns: bass and drums re-enter on beat 3 of this bar at 196.9-197.2 |
| outro | 213.54 (3:33.54) | 232.12 (3:52.12) | 160-172 | 13 | 18.58 | -19.5 | -30.2 | 66 % | 81 (METAL) | -39.6 | no heard word 196.5-231: split from scream_end at the one energy break (bar 160: bass -50 dB, 18 % under 150 Hz); heavy blast-beat metal to 229.6, then decay |

**Lyric sections against the audio**

- **Every lyric section is in the audio**, in lyric order: intro, verse 1, verse 2, pre-chorus, chorus, verse 3 (rebase), chorus 2, verse 4 (tabs/spaces), scream, breakdown, whisper line, guitar solo, soft interlude, build, final chorus, post-chorus chant, Build failed, scream, outro. Both choruses and the final chorus are 16 bars.
- **Added by the audio, not in the lyric tags:** `intro_groove` (4.37-16.33 s, bass and full drums before any singing). The lyric's `[Heavy guitar hit]` is not a separate event here (no band stop at the start of verse 1; bar 12 is an ordinary bar). The scream_end / outro split is by energy only: no word is heard from 196.5 s to the end (Whisper's "We'll be right back." at 231.1 s is a hallucination), so the whole 196.15-232.12 s block is `[Both voices scream]` + `[Outro]` with one energy break (bar 160, 213.54 s).
- **"...you wouldn't" is not a stop** (125.52-126.74 s): the band plays under it (mix -19 dB); the only break is a 0.3 s band stop 126.40-126.70 s right before the solo. The lyric's "everything stops" before the piano is real: bass and drums leave at 140.04 s.
- **Guitar solo: 126.70-140.04 s = 13.34 s = 10 bars** (bars 95-104). No word is heard in it, the 'other' stem (guitars/synth) is at -25 to -29 dB, bass and drums keep playing (bass -28.1 dB, heaviness 70); it ends where bass and the heavy drums leave for the piano.
- The piano interlude is only the drum-less, bass-less part: 140.04-149.38 s, 7 bars; drums return under "We're the same file" at 149.38 s (`build`, 8 bars).

## 3. Hard stops and true silences

`hard_stops` lists **band stops** (drums+bass+other under their song median by 20 dB for >= 0.3 s; the voice may stay) and **true silence** (whole mix under -45 dB). `micro_gaps` are 0.1-0.3 s dips. Raw numbers in `stops_raw.json`.

| start | end | dur | kind | accompaniment dB | voice dB | what is there |
|---|---|---|---|---|---|---|
| 2.90 | 3.75 | 0.85 | band stop | -63.2 | -26.9 | and then commit |
| 26.00 | 27.70 | 1.70 | band stop | -62.6 | -25.9 | midnight, who are you? I'm |
| 39.55 | 40.05 | 0.50 | band stop | -60.8 | -24.1 | blue, |
| 40.90 | 41.35 | 0.45 | band stop | -66.7 | -23.5 | Somebody |
| 43.60 | 44.20 | 0.60 | band stop | -58.7 | -23.2 | current change, |
| 62.25 | 62.80 | 0.55 | band stop | -63.5 | -26.6 | can't take control |
| 104.75 | 105.35 | 0.60 | band stop | -52.1 | -25.3 | can't take control |
| 116.50 | 117.20 | 0.70 | band stop | -54.7 | -22.2 | I know, I touched |
| 126.40 | 126.70 | 0.30 | band stop | -56.3 | -21.6 | (no heard word) |
| 232.00 | 232.12 | 0.12 | true silence | - | - | (no heard word) |

micro_gaps (s): [[160.95, 161.05]]

- **Robot "Automatic merge failed" (0.0-1.22 s) and "Fix conflicts and then commit the result" (1.9-4.46 s)**: not a silence; drums run under both. The band is out only 2.90-3.75 s, under "and then commit the".
- **"Build failed" robot (193.48-196.15 s)**: the whole band is full-on until about 193.4 s, then drums and bass cut (drums -48 dB, bass -58 to -83 dB from 193.7 s) and only a synth/chiptune stem (-29 to -45 dB) and the robot voice remain until about 197 s. No band stop long enough passes the 0.3 s/20 dB test there because the synth stem stays above the threshold; the music-stops event is real but not a total stop. Whisper hears "Failed, failed" at 193.1-193.8 s (the word "Build" is heard as the first "Failed"), "Syntax error on line forty" 194.22-196.49 s. The bass returns at 197.2 s, on beat 3 of bar 147.
- **True silence: only 232.00-232.12 s**, the last 0.12 s. The "then silence" of the outro is a decay: voice gone at about 229.0 s, bass at 230.0 s, drums fade to -55 dB by 232.0 s (bar 172 is 99.7 % under 150 Hz, a sub rumble). Nothing in the body of the song is silent.
- Other band stops: 26.0-27.7 s (voice alone into verse 2), 39.55-40.05 and 40.90-41.35 s (pre-chorus), 43.6-44.2 s (inside the first chorus line), 62.25-62.8 s (just before the end of chorus 1; unlike v1 it is short and the band is back before verse 3), 104.75-105.35 s (same place in chorus 2), 116.5-117.2 s (the scream), 126.4-126.7 s (before the solo).

## 4. Per-bar heaviness

Heaviness 0-100 = mean percentile rank, within this song, of: mix loudness, drums-stem level, bass-stem level (floored at -60 dB), share of energy under 150 Hz. Distortion / scream proxies sit next to it, not inside it: `flat` = mean spectral flatness, `hi %` = share of energy above 4 kHz. Label: >= 65 METAL, 45-65 mid, < 45 pop/soft.

| bar | start | section | beats | mix dB | drums dB | bass dB | < 150 Hz % | hi % | flat | voice dB | heavy | label |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.38 | intro_robot | 4 | -20.3 | -22.5 | -35.0 | 59 | 7 | 0.064 | -27.5 | 63 | mid |
| 1 | 1.71 | intro_robot | 4 | -24.5 | -35.1 | -40.8 | 22 | 13 | 0.076 | -27.6 | 8 | pop/soft |
| 2 | 3.04 | intro_robot | 4 | -24.9 | -42.3 | -46.5 | 1 | 12 | 0.085 | -25.3 | 4 | pop/soft |
| 3 | 4.37 | intro_groove | 4 | -20.6 | -21.7 | -43.6 | 51 | 10 | 0.086 | -31.0 | 57 | mid |
| 4 | 5.70 | intro_groove | 4 | -20.5 | -23.3 | -31.7 | 43 | 8 | 0.069 | -27.8 | 58 | mid |
| 5 | 7.02 | intro_groove | 4 | -20.9 | -25.9 | -27.9 | 49 | 11 | 0.094 | -28.7 | 59 | mid |
| 6 | 8.35 | intro_groove | 4 | -20.7 | -28.0 | -26.4 | 43 | 9 | 0.076 | -26.8 | 56 | mid |
| 7 | 9.68 | intro_groove | 4 | -21.3 | -27.0 | -27.2 | 48 | 11 | 0.094 | -28.9 | 56 | mid |
| 8 | 11.01 | intro_groove | 4 | -20.6 | -23.8 | -28.4 | 53 | 10 | 0.090 | -30.6 | 68 | METAL |
| 9 | 12.34 | intro_groove | 2 | -20.9 | -27.6 | -26.3 | 46 | 12 | 0.073 | -31.6 | 57 | mid |
| 10 | 13.00 | intro_groove | 4 | -20.6 | -25.8 | -25.9 | 55 | 10 | 0.070 | -32.3 | 69 | METAL |
| 11 | 14.33 | intro_groove | 6 | -20.2 | -23.9 | -27.8 | 53 | 10 | 0.064 | -34.6 | 72 | METAL |
| 12 | 16.33 | verse1_sweet | 4 | -22.4 | -25.1 | -37.8 | 38 | 9 | 0.087 | -28.3 | 36 | pop/soft |
| 13 | 17.65 | verse1_sweet | 4 | -22.3 | -29.3 | -38.6 | 24 | 9 | 0.057 | -24.9 | 14 | pop/soft |
| 14 | 18.98 | verse1_sweet | 4 | -22.3 | -29.2 | -38.1 | 24 | 8 | 0.056 | -24.8 | 14 | pop/soft |
| 15 | 20.31 | verse1_sweet | 4 | -22.3 | -29.5 | -35.5 | 34 | 6 | 0.054 | -25.3 | 22 | pop/soft |
| 16 | 21.64 | verse1_sweet | 4 | -22.2 | -29.2 | -32.2 | 35 | 12 | 0.076 | -25.3 | 27 | pop/soft |
| 17 | 22.97 | verse1_sweet | 4 | -21.6 | -29.5 | -36.1 | 26 | 4 | 0.040 | -24.1 | 17 | pop/soft |
| 18 | 24.30 | verse1_sweet | 4 | -21.4 | -27.9 | -37.7 | 25 | 8 | 0.052 | -23.7 | 22 | pop/soft |
| 19 | 25.63 | verse1_sweet | 4 | -23.9 | -42.8 | -36.0 | 8 | 13 | 0.079 | -24.5 | 8 | pop/soft |
| 20 | 26.96 | verse2_raspy | 4 | -22.6 | -30.8 | -32.8 | 27 | 11 | 0.057 | -24.9 | 15 | pop/soft |
| 21 | 28.29 | verse2_raspy | 4 | -21.8 | -29.2 | -28.5 | 39 | 12 | 0.081 | -26.0 | 38 | pop/soft |
| 22 | 29.61 | verse2_raspy | 4 | -22.1 | -30.5 | -30.2 | 32 | 8 | 0.054 | -25.1 | 24 | pop/soft |
| 23 | 30.94 | verse2_raspy | 4 | -22.1 | -30.9 | -31.4 | 26 | 9 | 0.058 | -24.4 | 18 | pop/soft |
| 24 | 32.27 | verse2_raspy | 4 | -21.6 | -29.2 | -32.1 | 28 | 8 | 0.060 | -24.1 | 24 | pop/soft |
| 25 | 33.60 | verse2_raspy | 4 | -22.1 | -31.2 | -28.7 | 33 | 9 | 0.063 | -25.1 | 30 | pop/soft |
| 26 | 34.93 | verse2_raspy | 4 | -21.2 | -29.9 | -28.6 | 30 | 8 | 0.056 | -23.8 | 32 | pop/soft |
| 27 | 36.26 | verse2_raspy | 4 | -21.0 | -26.9 | -31.2 | 40 | 7 | 0.049 | -24.1 | 44 | pop/soft |
| 28 | 37.58 | verse2_raspy | 4 | -21.0 | -26.7 | -32.1 | 45 | 9 | 0.060 | -24.8 | 45 | mid |
| 29 | 38.91 | prechorus | 4 | -22.8 | -27.6 | -40.5 | 32 | 12 | 0.063 | -25.4 | 22 | pop/soft |
| 30 | 40.24 | prechorus | 4 | -22.8 | -28.5 | -43.2 | 26 | 14 | 0.068 | -24.7 | 16 | pop/soft |
| 31 | 41.57 | prechorus | 4 | -21.3 | -28.2 | -29.6 | 44 | 8 | 0.067 | -24.6 | 42 | pop/soft |
| 32 | 42.90 | chorus1 | 4 | -22.3 | -33.3 | -34.1 | 10 | 16 | 0.118 | -23.5 | 12 | pop/soft |
| 33 | 44.23 | chorus1 | 4 | -21.4 | -28.8 | -30.0 | 32 | 12 | 0.093 | -24.2 | 31 | pop/soft |
| 34 | 45.55 | chorus1 | 4 | -21.2 | -29.8 | -29.7 | 27 | 12 | 0.084 | -23.6 | 27 | pop/soft |
| 35 | 46.88 | chorus1 | 4 | -20.4 | -29.2 | -28.8 | 26 | 8 | 0.046 | -22.6 | 38 | pop/soft |
| 36 | 48.21 | chorus1 | 4 | -20.3 | -28.5 | -28.8 | 27 | 8 | 0.044 | -22.8 | 41 | pop/soft |
| 37 | 49.54 | chorus1 | 4 | -21.6 | -29.0 | -30.2 | 31 | 10 | 0.080 | -24.7 | 28 | pop/soft |
| 38 | 50.87 | chorus1 | 4 | -21.4 | -29.3 | -29.3 | 30 | 8 | 0.077 | -24.3 | 30 | pop/soft |
| 39 | 52.20 | chorus1 | 4 | -20.5 | -27.4 | -29.5 | 32 | 7 | 0.044 | -23.2 | 45 | pop/soft |
| 40 | 53.52 | chorus1 | 4 | -21.2 | -27.1 | -29.6 | 30 | 10 | 0.086 | -24.7 | 38 | pop/soft |
| 41 | 54.85 | chorus1 | 4 | -21.6 | -29.4 | -30.3 | 27 | 14 | 0.098 | -24.0 | 24 | pop/soft |
| 42 | 56.18 | chorus1 | 4 | -21.4 | -29.3 | -29.5 | 28 | 11 | 0.080 | -23.8 | 29 | pop/soft |
| 43 | 57.51 | chorus1 | 4 | -21.7 | -29.7 | -29.0 | 31 | 9 | 0.065 | -24.5 | 30 | pop/soft |
| 44 | 58.84 | chorus1 | 4 | -20.0 | -26.4 | -29.8 | 31 | 6 | 0.043 | -22.6 | 48 | mid |
| 45 | 60.17 | chorus1 | 4 | -21.5 | -27.5 | -30.0 | 36 | 10 | 0.073 | -25.4 | 38 | pop/soft |
| 46 | 61.49 | chorus1 | 4 | -22.6 | -28.8 | -32.8 | 29 | 13 | 0.084 | -25.2 | 21 | pop/soft |
| 47 | 62.82 | chorus1 | 4 | -20.5 | -23.8 | -34.2 | 47 | 9 | 0.063 | -24.0 | 56 | mid |
| 48 | 64.15 | verse3_rebase | 4 | -20.5 | -24.6 | -37.9 | 32 | 8 | 0.086 | -24.0 | 42 | pop/soft |
| 49 | 65.48 | verse3_rebase | 4 | -20.9 | -27.9 | -31.3 | 36 | 8 | 0.073 | -24.1 | 38 | pop/soft |
| 50 | 66.81 | verse3_rebase | 4 | -20.7 | -27.1 | -32.3 | 33 | 8 | 0.069 | -23.7 | 38 | pop/soft |
| 51 | 68.14 | verse3_rebase | 4 | -21.0 | -27.7 | -31.4 | 34 | 8 | 0.062 | -24.1 | 37 | pop/soft |
| 52 | 69.47 | verse3_rebase | 4 | -20.8 | -26.6 | -31.9 | 39 | 10 | 0.069 | -24.1 | 45 | mid |
| 53 | 70.80 | verse3_rebase | 4 | -20.9 | -27.7 | -29.4 | 34 | 10 | 0.081 | -23.8 | 43 | pop/soft |
| 54 | 72.13 | verse3_rebase | 4 | -20.7 | -27.0 | -27.4 | 40 | 7 | 0.060 | -24.2 | 57 | mid |
| 55 | 73.46 | verse3_rebase | 4 | -21.4 | -27.4 | -28.8 | 36 | 9 | 0.064 | -24.8 | 43 | pop/soft |
| 56 | 74.79 | verse3_rebase | 4 | -20.6 | -24.2 | -30.5 | 46 | 7 | 0.056 | -25.4 | 58 | mid |
| 57 | 76.11 | verse3_rebase | 4 | -21.7 | -27.3 | -33.8 | 37 | 7 | 0.063 | -24.9 | 33 | pop/soft |
| 58 | 77.44 | verse3_rebase | 4 | -22.6 | -27.5 | -51.6 | 31 | 8 | 0.071 | -26.6 | 21 | pop/soft |
| 59 | 78.77 | verse3_rebase | 4 | -20.8 | -26.4 | -36.4 | 30 | 6 | 0.053 | -23.0 | 35 | pop/soft |
| 60 | 80.10 | verse3_rebase | 4 | -20.4 | -22.7 | -43.8 | 56 | 8 | 0.058 | -26.9 | 58 | mid |
| 61 | 81.43 | verse3_rebase | 4 | -21.3 | -26.9 | -32.2 | 33 | 9 | 0.062 | -24.2 | 36 | pop/soft |
| 62 | 82.76 | verse3_rebase | 4 | -20.1 | -25.4 | -32.4 | 37 | 5 | 0.028 | -23.0 | 50 | mid |
| 63 | 84.09 | verse3_rebase | 4 | -20.7 | -26.8 | -33.4 | 31 | 6 | 0.064 | -23.1 | 36 | pop/soft |
| 64 | 85.42 | chorus2 | 4 | -20.7 | -27.1 | -34.7 | 26 | 8 | 0.073 | -22.7 | 32 | pop/soft |
| 65 | 86.75 | chorus2 | 4 | -21.5 | -28.4 | -30.3 | 33 | 12 | 0.095 | -24.6 | 32 | pop/soft |
| 66 | 88.07 | chorus2 | 4 | -21.2 | -28.8 | -29.0 | 32 | 12 | 0.082 | -23.9 | 37 | pop/soft |
| 67 | 89.40 | chorus2 | 4 | -20.2 | -27.6 | -28.2 | 34 | 8 | 0.052 | -23.1 | 53 | mid |
| 68 | 90.73 | chorus2 | 4 | -20.3 | -28.1 | -28.5 | 32 | 8 | 0.049 | -23.1 | 47 | mid |
| 69 | 92.06 | chorus2 | 4 | -21.1 | -28.3 | -29.6 | 33 | 10 | 0.081 | -24.3 | 38 | pop/soft |
| 70 | 93.39 | chorus2 | 4 | -20.8 | -28.6 | -28.3 | 33 | 8 | 0.066 | -24.0 | 44 | pop/soft |
| 71 | 94.72 | chorus2 | 4 | -20.1 | -26.4 | -29.1 | 34 | 6 | 0.043 | -22.9 | 54 | mid |
| 72 | 96.05 | chorus2 | 4 | -20.3 | -25.6 | -29.8 | 40 | 9 | 0.074 | -24.4 | 56 | mid |
| 73 | 97.38 | chorus2 | 4 | -21.3 | -27.8 | -30.0 | 32 | 13 | 0.102 | -24.8 | 35 | pop/soft |
| 74 | 98.70 | chorus2 | 4 | -21.0 | -28.2 | -29.4 | 33 | 11 | 0.081 | -23.9 | 39 | pop/soft |
| 75 | 100.03 | chorus2 | 4 | -20.8 | -27.6 | -28.4 | 38 | 9 | 0.070 | -24.7 | 49 | mid |
| 76 | 101.36 | chorus2 | 4 | -19.9 | -26.0 | -28.2 | 36 | 8 | 0.046 | -23.0 | 60 | mid |
| 77 | 102.69 | chorus2 | 4 | -21.3 | -27.0 | -29.9 | 36 | 11 | 0.086 | -24.9 | 42 | pop/soft |
| 78 | 104.01 | chorus2 | 4 | -22.3 | -29.8 | -32.8 | 27 | 13 | 0.092 | -24.7 | 18 | pop/soft |
| 79 | 105.35 | chorus2 | 4 | -20.4 | -24.6 | -28.4 | 51 | 8 | 0.070 | -25.9 | 67 | METAL |
| 80 | 106.68 | verse4_trade | 4 | -20.0 | -23.6 | -31.9 | 46 | 10 | 0.082 | -25.5 | 62 | mid |
| 81 | 108.02 | verse4_trade | 4 | -20.6 | -26.0 | -30.2 | 38 | 11 | 0.095 | -24.1 | 50 | mid |
| 82 | 109.35 | verse4_trade | 4 | -20.6 | -26.2 | -29.1 | 38 | 11 | 0.089 | -24.1 | 54 | mid |
| 83 | 110.69 | verse4_trade | 4 | -20.6 | -25.7 | -33.5 | 32 | 8 | 0.083 | -23.2 | 41 | pop/soft |
| 84 | 112.02 | verse4_trade | 4 | -19.4 | -22.4 | -30.3 | 54 | 6 | 0.054 | -24.7 | 72 | METAL |
| 85 | 113.35 | verse4_trade | 4 | -20.5 | -27.4 | -28.9 | 33 | 10 | 0.068 | -24.1 | 48 | mid |
| 86 | 114.69 | verse4_trade | 4 | -20.0 | -23.7 | -29.6 | 50 | 8 | 0.074 | -26.0 | 67 | METAL |
| 87 | 116.02 | verse4_trade | 4 | -20.7 | -26.8 | -36.4 | 25 | 6 | 0.031 | -22.5 | 31 | pop/soft |
| 88 | 117.36 | scream | 4 | -19.6 | -24.6 | -31.1 | 34 | 9 | 0.072 | -23.1 | 57 | mid |
| 89 | 118.69 | scream | 4 | -19.2 | -25.6 | -26.1 | 41 | 5 | 0.042 | -22.7 | 73 | METAL |
| 90 | 120.03 | breakdown_git_push_force | 4 | -19.5 | -25.1 | -26.8 | 40 | 5 | 0.043 | -23.1 | 71 | METAL |
| 91 | 121.36 | breakdown_git_push_force | 4 | -19.5 | -24.3 | -26.4 | 51 | 5 | 0.048 | -24.7 | 78 | METAL |
| 92 | 122.70 | breakdown_git_push_force | 4 | -18.6 | -21.8 | -27.4 | 59 | 5 | 0.045 | -24.3 | 88 | METAL |
| 93 | 124.03 | breakdown_git_push_force | 4 | -18.6 | -21.0 | -32.9 | 64 | 8 | 0.091 | -25.2 | 77 | METAL |
| 94 | 125.36 | whisper | 4 | -19.4 | -23.6 | -29.6 | 48 | 8 | 0.051 | -23.5 | 70 | METAL |
| 95 | 126.70 | guitar_solo | 4 | -19.7 | -25.9 | -26.4 | 48 | 8 | 0.068 | -28.0 | 71 | METAL |
| 96 | 128.03 | guitar_solo | 4 | -19.6 | -24.0 | -27.8 | 53 | 7 | 0.046 | -27.4 | 76 | METAL |
| 97 | 129.37 | guitar_solo | 4 | -19.7 | -26.1 | -28.6 | 33 | 7 | 0.034 | -30.4 | 58 | mid |
| 98 | 130.70 | guitar_solo | 4 | -19.7 | -24.3 | -28.6 | 49 | 7 | 0.044 | -27.6 | 69 | METAL |
| 99 | 132.04 | guitar_solo | 4 | -19.2 | -23.8 | -27.4 | 53 | 5 | 0.054 | -28.8 | 80 | METAL |
| 100 | 133.37 | guitar_solo | 4 | -19.0 | -23.0 | -28.1 | 53 | 6 | 0.045 | -26.0 | 80 | METAL |
| 101 | 134.70 | guitar_solo | 4 | -20.0 | -24.3 | -29.6 | 47 | 9 | 0.050 | -26.9 | 65 | mid |
| 102 | 136.04 | guitar_solo | 4 | -19.2 | -22.7 | -28.5 | 51 | 7 | 0.038 | -25.5 | 77 | METAL |
| 103 | 137.37 | guitar_solo | 4 | -20.0 | -25.5 | -28.2 | 30 | 10 | 0.062 | -27.9 | 55 | mid |
| 104 | 138.71 | guitar_solo | 4 | -19.8 | -24.3 | -28.0 | 44 | 10 | 0.077 | -28.2 | 69 | METAL |
| 105 | 140.04 | piano_interlude | 4 | -25.1 | -31.6 | -55.6 | 13 | 12 | 0.069 | -38.4 | 6 | pop/soft |
| 106 | 141.38 | piano_interlude | 4 | -26.9 | -44.2 | -84.8 | 0 | 4 | 0.023 | -42.5 | 2 | pop/soft |
| 107 | 142.71 | piano_interlude | 4 | -23.1 | -48.6 | -84.7 | 0 | 5 | 0.037 | -24.0 | 3 | pop/soft |
| 108 | 144.05 | piano_interlude | 4 | -21.9 | -49.4 | -84.5 | 0 | 3 | 0.026 | -22.2 | 6 | pop/soft |
| 109 | 145.38 | piano_interlude | 4 | -23.7 | -49.9 | -84.1 | 3 | 11 | 0.053 | -24.5 | 3 | pop/soft |
| 110 | 146.71 | piano_interlude | 4 | -23.2 | -49.3 | -84.7 | 0 | 13 | 0.061 | -23.8 | 3 | pop/soft |
| 111 | 148.05 | piano_interlude | 4 | -22.6 | -47.2 | -86.0 | 0 | 5 | 0.034 | -22.9 | 3 | pop/soft |
| 112 | 149.38 | build | 4 | -24.4 | -35.5 | -82.4 | 4 | 6 | 0.039 | -26.4 | 5 | pop/soft |
| 113 | 150.72 | build | 4 | -20.7 | -30.0 | -79.3 | 12 | 6 | 0.039 | -21.8 | 17 | pop/soft |
| 114 | 152.05 | build | 4 | -22.4 | -28.0 | -81.5 | 25 | 9 | 0.069 | -25.1 | 14 | pop/soft |
| 115 | 153.39 | build | 4 | -21.4 | -30.7 | -80.6 | 11 | 7 | 0.050 | -22.6 | 11 | pop/soft |
| 116 | 154.72 | build | 4 | -21.3 | -27.7 | -49.6 | 22 | 7 | 0.049 | -23.5 | 21 | pop/soft |
| 117 | 156.06 | build | 4 | -21.1 | -27.6 | -31.5 | 33 | 6 | 0.046 | -24.0 | 35 | pop/soft |
| 118 | 157.39 | build | 4 | -20.3 | -28.1 | -31.4 | 27 | 4 | 0.027 | -22.3 | 35 | pop/soft |
| 119 | 158.72 | build | 4 | -19.8 | -26.9 | -30.8 | 26 | 4 | 0.021 | -21.5 | 43 | pop/soft |
| 120 | 160.06 | final_chorus | 4 | -21.4 | -35.1 | -31.9 | 14 | 8 | 0.065 | -22.4 | 17 | pop/soft |
| 121 | 161.39 | final_chorus | 4 | -20.9 | -28.8 | -27.9 | 38 | 9 | 0.079 | -24.3 | 47 | mid |
| 122 | 162.73 | final_chorus | 4 | -20.9 | -29.8 | -27.3 | 34 | 8 | 0.072 | -23.9 | 43 | pop/soft |
| 123 | 164.06 | final_chorus | 4 | -20.5 | -29.0 | -26.6 | 37 | 6 | 0.046 | -23.5 | 52 | mid |
| 124 | 165.40 | final_chorus | 4 | -20.1 | -28.8 | -26.1 | 38 | 5 | 0.041 | -23.1 | 57 | mid |
| 125 | 166.73 | final_chorus | 4 | -20.3 | -29.1 | -28.5 | 27 | 6 | 0.046 | -22.5 | 40 | pop/soft |
| 126 | 168.06 | final_chorus | 4 | -20.2 | -27.1 | -27.7 | 36 | 5 | 0.048 | -23.2 | 57 | mid |
| 127 | 169.40 | final_chorus | 4 | -18.9 | -24.6 | -27.9 | 39 | 4 | 0.020 | -21.6 | 73 | METAL |
| 128 | 170.74 | final_chorus | 4 | -19.7 | -24.9 | -27.6 | 46 | 6 | 0.044 | -23.3 | 71 | METAL |
| 129 | 172.08 | final_chorus | 4 | -20.3 | -27.0 | -27.4 | 42 | 8 | 0.069 | -23.7 | 61 | mid |
| 130 | 173.41 | final_chorus | 4 | -21.7 | -27.2 | -34.4 | 16 | 18 | 0.132 | -24.2 | 23 | pop/soft |
| 131 | 174.75 | final_chorus | 4 | -19.9 | -27.2 | -25.9 | 41 | 7 | 0.054 | -23.3 | 65 | mid |
| 132 | 176.09 | final_chorus | 4 | -19.1 | -25.2 | -28.0 | 33 | 4 | 0.029 | -21.4 | 65 | METAL |
| 133 | 177.43 | final_chorus | 4 | -19.6 | -24.4 | -27.3 | 52 | 6 | 0.046 | -24.0 | 76 | METAL |
| 134 | 178.76 | final_chorus | 4 | -19.8 | -25.1 | -28.2 | 51 | 5 | 0.043 | -24.2 | 69 | METAL |
| 135 | 180.10 | final_chorus | 4 | -18.8 | -22.2 | -29.7 | 55 | 3 | 0.024 | -23.4 | 77 | METAL |
| 136 | 181.44 | post_chorus_chant | 4 | -18.7 | -24.5 | -29.1 | 30 | 4 | 0.038 | -21.3 | 62 | mid |
| 137 | 182.78 | post_chorus_chant | 4 | -19.7 | -24.9 | -25.0 | 67 | 7 | 0.063 | -27.0 | 81 | METAL |
| 138 | 184.11 | post_chorus_chant | 4 | -19.7 | -23.9 | -25.9 | 66 | 8 | 0.073 | -27.2 | 84 | METAL |
| 139 | 185.45 | post_chorus_chant | 4 | -19.8 | -24.7 | -25.9 | 65 | 6 | 0.064 | -26.7 | 80 | METAL |
| 140 | 186.79 | post_chorus_chant | 4 | -18.9 | -21.7 | -26.4 | 72 | 6 | 0.061 | -28.4 | 91 | METAL |
| 141 | 188.13 | post_chorus_chant | 4 | -19.8 | -24.8 | -25.7 | 58 | 7 | 0.065 | -25.7 | 78 | METAL |
| 142 | 189.46 | post_chorus_chant | 4 | -19.6 | -24.0 | -26.3 | 60 | 8 | 0.065 | -26.3 | 81 | METAL |
| 143 | 190.80 | post_chorus_chant | 4 | -19.1 | -22.0 | -27.7 | 65 | 6 | 0.057 | -25.9 | 86 | METAL |
| 144 | 192.14 | post_chorus_chant | 4 | -19.0 | -21.2 | -27.3 | 71 | 6 | 0.060 | -27.7 | 90 | METAL |
| 145 | 193.48 | robot_build_failed | 4 | -24.0 | -35.7 | -40.7 | 8 | 8 | 0.075 | -26.2 | 6 | pop/soft |
| 146 | 194.81 | robot_build_failed | 4 | -21.8 | -35.7 | -81.1 | 2 | 3 | 0.035 | -22.1 | 8 | pop/soft |
| 147 | 196.15 | scream_end | 4 | -20.9 | -25.5 | -30.4 | 39 | 6 | 0.082 | -24.5 | 49 | mid |
| 148 | 197.49 | scream_end | 4 | -19.1 | -25.9 | -25.2 | 42 | 3 | 0.036 | -22.1 | 75 | METAL |
| 149 | 198.83 | scream_end | 4 | -19.3 | -24.2 | -24.8 | 58 | 3 | 0.036 | -24.6 | 84 | METAL |
| 150 | 200.16 | scream_end | 4 | -19.2 | -24.8 | -24.3 | 58 | 3 | 0.040 | -25.2 | 83 | METAL |
| 151 | 201.50 | scream_end | 4 | -18.7 | -22.2 | -25.2 | 68 | 4 | 0.045 | -26.8 | 92 | METAL |
| 152 | 202.84 | scream_end | 4 | -19.7 | -25.0 | -24.6 | 60 | 4 | 0.038 | -59.5 | 80 | METAL |
| 153 | 204.18 | scream_end | 4 | -19.6 | -23.9 | -25.0 | 62 | 3 | 0.030 | -55.5 | 85 | METAL |
| 154 | 205.52 | scream_end | 4 | -18.7 | -21.1 | -29.5 | 62 | 3 | 0.035 | -39.2 | 82 | METAL |
| 155 | 206.85 | scream_end | 4 | -18.8 | -22.2 | -29.9 | 50 | 4 | 0.046 | -23.6 | 75 | METAL |
| 156 | 208.19 | scream_end | 4 | -19.1 | -25.0 | -24.7 | 74 | 4 | 0.041 | -32.2 | 87 | METAL |
| 157 | 209.53 | scream_end | 4 | -18.7 | -22.2 | -26.3 | 75 | 2 | 0.028 | -38.9 | 92 | METAL |
| 158 | 210.87 | scream_end | 4 | -18.3 | -20.2 | -27.1 | 77 | 3 | 0.034 | -39.5 | 94 | METAL |
| 159 | 212.20 | scream_end | 4 | -19.4 | -21.9 | -27.1 | 70 | 4 | 0.053 | -35.7 | 88 | METAL |
| 160 | 213.54 | outro | 4 | -20.2 | -29.3 | -30.2 | 18 | 3 | 0.032 | -22.6 | 32 | pop/soft |
| 161 | 214.88 | outro | 4 | -18.8 | -20.0 | -37.9 | 63 | 4 | 0.055 | -48.3 | 74 | METAL |
| 162 | 216.22 | outro | 4 | -18.9 | -23.8 | -24.5 | 69 | 4 | 0.041 | -46.5 | 91 | METAL |
| 163 | 217.55 | outro | 4 | -18.9 | -24.6 | -24.2 | 63 | 4 | 0.035 | -40.3 | 87 | METAL |
| 164 | 218.89 | outro | 4 | -19.6 | -25.3 | -25.0 | 58 | 4 | 0.040 | -35.5 | 79 | METAL |
| 165 | 220.23 | outro | 4 | -18.6 | -22.3 | -25.2 | 63 | 4 | 0.037 | -39.6 | 92 | METAL |
| 166 | 221.57 | outro | 4 | -19.2 | -23.7 | -24.4 | 65 | 4 | 0.042 | -38.3 | 89 | METAL |
| 167 | 222.90 | outro | 4 | -18.4 | -21.7 | -25.0 | 69 | 3 | 0.032 | -34.8 | 95 | METAL |
| 168 | 224.24 | outro | 4 | -18.2 | -21.9 | -26.3 | 59 | 4 | 0.043 | -24.6 | 91 | METAL |
| 169 | 225.58 | outro | 4 | -17.7 | -21.0 | -24.3 | 67 | 3 | 0.036 | -25.4 | 97 | METAL |
| 170 | 226.92 | outro | 4 | -17.9 | -21.1 | -23.0 | 80 | 4 | 0.041 | -34.8 | 99 | METAL |
| 171 | 228.25 | outro | 4 | -19.1 | -23.6 | -23.7 | 87 | 2 | 0.019 | -39.1 | 92 | METAL |
| 172 | 229.59 | outro | 8 | -28.0 | -28.1 | -79.1 | 100 | 0 | 0.001 | -85.3 | 34 | pop/soft |

Label count per section (METAL / mid / pop-soft bars):

- intro_robot: 0 / 1 / 2
- intro_groove: 3 / 6 / 0
- verse1_sweet: 0 / 0 / 8
- verse2_raspy: 0 / 1 / 8
- prechorus: 0 / 0 / 3
- chorus1: 0 / 2 / 14
- verse3_rebase: 0 / 5 / 11
- chorus2: 1 / 6 / 9
- verse4_trade: 2 / 4 / 2
- scream: 1 / 1 / 0
- breakdown_git_push_force: 4 / 0 / 0
- whisper: 1 / 0 / 0
- guitar_solo: 7 / 3 / 0
- piano_interlude: 0 / 0 / 7
- build: 0 / 0 / 8
- final_chorus: 6 / 6 / 4
- post_chorus_chant: 8 / 1 / 0
- robot_build_failed: 0 / 0 / 2
- scream_end: 12 / 1 / 0
- outro: 11 / 0 / 2

## 5. Lyrics, singer per line, token map

Whisper large-v3 on the full mix and on the demucs vocal stem. A lyric word gets a time only when a heard word matches it; a line with under half its words heard gets null start/end. `singer` in `mc-timing.json` is `B` (sweet voice, the blue girl), `O` (raspy voice, the orange girl) or `both`; `voice` carries the plain `sweet` / `raspy` / `both` (from the lyric tags: a line's own `[Sweet voice]` / `[Raspy voice]` / `[Both voices]` tag, else its section header; the flat robot lines and the screams are `both`). The engine's type is `'O' | 'B' | 'both'`, hence the letters.

| # | singer | lyric line | start | end | ratio | heard |
|---|---|---|---|---|---|---|
| 0 | both (both) | Automatic merge failed. | 0.00 | 1.22 | 0.67 | Automatic Merge? |
| 1 | both (both) | Fix conflicts and then commit the result. | 1.90 | 4.46 | 1.00 | fix conflicts and then commit the result |
| 2 | sweet (B) | I'm HEAD, I'm main, I'm stable and clean | 16.88 | 19.54 | 1.00 | I'm head, I'm main, I'm stable and clean |
| 3 | sweet (B) | Line forty-two, the button was blue, the calmest you've seen | 19.54 | 22.28 | 1.00 | Line forty the button was glued, the calmest you've seen |
| 4 | sweet (B) | Reviewed and approved by the whole design team | 22.28 | 24.98 | 1.00 | Reviewed and approved by the whole design team |
| 5 | sweet (B) | Then someone pushed at midnight... who are you? | 25.10 | 27.68 | 0.88 | someone pushed at midnight, who are you? |
| 6 | raspy (O) | I'm feature branch, I'm fresh from the night | 27.68 | 30.22 | 1.00 | I'm feature branch, I'm fresh from the night |
| 7 | raspy (O) | The button is ORANGE now and baby, orange is right | 30.22 | 32.84 | 1.00 | The button is orange now and baby orange is right |
| 8 | raspy (O) | I rewrote your CSS and I'm ready to fight | 32.84 | 35.52 | 1.00 | I rewrote your CSS and I'm ready to fight |
| 9 | raspy (O) | Three hundred commits and I never asked once! | 35.96 | 38.40 | 0.75 | commits and I never asked once |
| 10 | sweet (B) | Blue! | 38.40 | 38.92 | 1.00 | Blue, |
| 11 | raspy (O) | Orange! | 39.24 | 39.72 | 1.00 | orange, |
| 12 | sweet (B) | Blue! | 39.98 | 40.22 | 1.00 | blue, |
| 13 | raspy (O) | ORANGE! | 40.58 | 41.00 | 1.00 | orange |
| 14 | both (both) | Somebody resolve this! | 41.00 | 42.84 | 1.00 | Somebody resolve this |
| 15 | both (both) | Accept current change! (NO!) | 42.84 | 44.68 | 1.00 | Accept current change, no |
| 16 | both (both) | Accept incoming change! (NO!) | 44.68 | 46.62 | 1.00 | Accept incoming change, no |
| 17 | both (both) | Two girls, one line, the build is on fire | 46.62 | 49.14 | 1.00 | Two girls, one line, the build is on fire |
| 18 | both (both) | Merge conflict, merge conflict, heart going haywire | 49.14 | 52.89 | 1.00 | Merge conflict, merge conflict Heart going haywire |
| 19 | both (both) | Accept current change! (NEVER!) | 53.14 | 55.42 | 1.00 | Accept current change, never |
| 20 | both (both) | Accept incoming change! (NEVER!) | 55.42 | 57.22 | 1.00 | Accept incoming change, never |
| 21 | both (both) | Equals, equals, equals in the middle of my soul | 57.22 | 59.60 | 1.00 | Equals, equals, equals in the middle of my soul |
| 22 | both (both) | Merge conflict, merge conflict, I can't take control | 59.60 | 63.48 | 1.00 | Merge conflicts, merge conflicts I can't take control |
| 23 | raspy (O) | I rebased your history while you were asleep! | 64.64 | 67.28 | 1.00 | I repaste your history while you were asleep |
| 24 | sweet (B) | That history was mine, those commits were sweet! | 67.28 | 70.16 | 1.00 | That history was mine, those commits were sweet |
| 25 | raspy (O) | I squashed all your sorries into one tiny line! | 70.16 | 72.72 | 1.00 | I squashed all your stories into one tiny line |
| 26 | sweet (B) | Then git blame says it's YOUR name on every line! | 72.72 | 75.58 | 0.90 | Then Get says it's your name on every line |
| 27 | raspy (O) | The pipeline is red! | 75.60 | 76.84 | 1.00 | The pipeline is red |
| 28 | sweet (B) | The reviewers are gone! | 76.84 | 79.66 | 1.00 | The reviewers are gone |
| 29 | both (both) | And the standup's in five and nobody's on! | 80.60 | 84.52 | 0.88 | And the stand in five And nobody |
| 30 | both (both) | Accept current change! (NO!) | 85.38 | 87.20 | 1.00 | Accept current change, no |
| 31 | both (both) | Accept incoming change! (NO!) | 87.20 | 89.10 | 1.00 | Accept incoming change, no |
| 32 | both (both) | Two girls, one line, the build is on fire | 89.10 | 91.68 | 0.89 | Two girls, one the build is on fire |
| 33 | both (both) | Merge conflict, merge conflict, heart going haywire | 91.68 | 95.43 | 1.00 | Merge conflicts, merge conflicts Heart going haywire |
| 34 | both (both) | Accept current change! (NEVER!) | 95.68 | 97.96 | 1.00 | Accept current change, never |
| 35 | both (both) | Accept incoming change! (NEVER!) | 97.96 | 99.82 | 1.00 | Accept incoming change, never |
| 36 | both (both) | Equals, equals, equals in the middle of my soul | 99.82 | 102.08 | 1.00 | Equals, equals, equals in the middle of my soul |
| 37 | both (both) | Merge conflict, merge conflict, I can't take control | 102.08 | 105.96 | 1.00 | Merge conflicts, merge conflicts I can't take control |
| 38 | sweet (B) | You use tabs! | 106.84 | 108.12 | 1.00 | You use tabs, |
| 39 | raspy (O) | You use spaces! | 108.48 | 109.44 | 1.00 | you use spaces |
| 40 | sweet (B) | You named a variable "data2"! | 109.44 | 111.46 | 1.00 | You named a variable data |
| 41 | raspy (O) | You wrote a comment that just says "don't touch"! | 111.86 | 114.78 | 1.00 | You wrote a comment that just says, don't touch |
| 42 | sweet (B) | I wrote that comment! | 114.78 | 116.24 | 1.00 | I wrote that comment, |
| 43 | raspy (O) | I KNOW! I TOUCHED IT! | 116.30 | 117.74 | 1.00 | I know, I touched it |
| 44 | both (both) | AAAAAH! | - | - | 0.00 | (nothing heard) |
| 45 | raspy (O) | GIT! | 120.68 | 121.15 | 1.00 | Get, |
| 46 | raspy (O) | PUSH! | 124.32 | 124.80 | 1.00 | push, |
| 47 | raspy (O) | FORCE! | 125.02 | 125.52 | 1.00 | force |
| 48 | sweet (B) | ...you wouldn't. | 125.52 | 126.74 | 1.00 | You wouldn't |
| 49 | sweet (B) | Maybe blue was never really mine | 142.44 | 144.68 | 1.00 | Maybe blue was never really mine |
| 50 | raspy (O) | Maybe orange was just my way to say hello | 144.68 | 148.71 | 1.00 | Maybe orange was just my way to say hello |
| 51 | sweet (B) | We're the same file, just from different times | 149.12 | 154.47 | 1.00 | We're the same file Just from different times |
| 52 | both (both) | Two branches of the same old tree, you know | 155.18 | 158.74 | 1.00 | Two branches of the same old tree, you know |
| 53 | both (both) | Accept both changes! (YES!) | 160.04 | 161.70 | 0.75 | Accept both changes, |
| 54 | both (both) | Accept both changes! (YES!) | 162.14 | 163.30 | 0.75 | accept both changes, |
| 55 | both (both) | Blue and orange together, it's a gradient now | 163.72 | 166.03 | 1.00 | Blue and orange together, it's a gradient now |
| 56 | both (both) | Two girls, one line, and we figured it out | 166.12 | 169.59 | 1.00 | Two girls, one line And we figured it out |
| 57 | both (both) | Accept both changes! (YES!) | 170.74 | 172.14 | 0.75 | Accept both changes, |
| 58 | both (both) | Commit and push it! (PUSH IT!) | 172.74 | 174.36 | 1.00 | Commit and push it, push it |
| 59 | both (both) | Equals, equals, equals, now we're whole | 174.36 | 176.80 | 1.00 | Equals, equals, equals, now we're whole |
| 60 | both (both) | Merge conflict resolved inside my soul | 176.80 | 180.32 | 1.00 | Merge conflict resolved inside my soul |
| 61 | both (both) | (Accept both! Accept both! Ship it, ship it!) | 182.14 | 185.36 | 1.00 | Accept both, accept both Ship it, ship it |
| 62 | both (both) | Accept both, accept both, SHIP IT! | 185.36 | 187.78 | 1.00 | Accept both, accept both Ship it, |
| 63 | both (both) | (Accept both! Accept both! Ship it, ship it!) | 187.82 | 190.70 | 1.00 | accept both Accept both, ship it, ship it |
| 64 | both (both) | Accept both, accept both, SHIP IT! | 190.70 | 193.10 | 1.00 | Accept both, accept both Ship it |
| 65 | both (both) | Build failed. | 193.10 | 193.70 | 0.50 | Failed, |
| 66 | both (both) | Syntax error on line forty-two. | 194.22 | 196.49 | 1.00 | Syntax error on line forty |
| 67 | both (both) | AAAAAAAH! | - | - | 0.00 | (nothing heard) |

Singer counts: sweet 15, raspy 16, both 37 lines.

**Where Whisper heard something else**: "Automatic merge failed" heard "Automatic Merge? Well,"; "the button was blue" heard "glued" (line 3, the only blue not heard); "Then someone" heard "And someone"; "Three hundred" heard "300"; "rebased" heard "repaste"; "sorries" heard "stories"; "git blame" heard "Get Brained" (with a stray "your" before it); "standup's in five and nobody's on" heard "stand -up's in five and nobody saw"; chorus 2 "Two girls, one line" heard "one mind"; "conflict" heard "conflicts" (every chorus); "data2" heard "data too"; "GIT" heard "Get,"; "(YES!)" heard "yeah"; "Build failed" heard "Failed, failed"; "forty-two" heard "forty two". Unheard: both `AAAAAH!` scream lines (no time, their sections are timed by energy). Heard but not lyrics: 161.88-162.34 "yeah Except"; 196.49-231.78 "two We'll be right back.".

### Token map (`token_map.json`)

Produced by `python -I tools/token_map.py data/take-v4` (schema: `docs/architecture.md`). 68 lines; lines with start null (the two scream lines) map every token to null. Method order: OVERRIDES, one-to-one pairing with the measured words in the line's window, exact normalised text matches. **2 tokens are null in total** (listed below the table: the two scream words, nothing else); the table is every override.

| line | override in `OVERRIDES['take-v4']` | reason |
|---|---|---|
| 0 | `[0, 1, 2]` | "failed" heard as "Well," (the only word in its slot, 1.34 s) |
| 3 | `[18, [19, 20], 21, 22, 23, 24, 25, 26, 27, 28]` | "forty-two" sung as "forty two"; "blue" heard as "glued" |
| 5 | `[37, 38, 39, 40, 41, 42, 43, 44]` | "Then" heard as "And" |
| 9 | `[73, 73, 74, 75, 76, 77, 78, 79]` | "Three hundred" measured as "300" |
| 22 | `[128, 129, 130, 131, 132, 133, 134, 135]` | "conflict" heard as "conflicts" (x2) |
| 23 | `[136, 137, 138, 139, 140, 141, 142, 143]` | "rebased" heard as "repaste" |
| 25 | `[152, 153, 154, 155, 156, 157, 158, 159, 160]` | "sorries" heard as "stories" |
| 26 | `[161, 163, 164, 165, 166, 167, 168, 169, 170, 171]` | "git blame" heard as "Get Brained"; the stray "your" 162 is not sung in the lyric |
| 29 | `[180, 181, [182, 183], 184, 185, 186, 187, 188]` | "standup's" heard as "stand -up's"; "on" heard as "saw" |
| 32 | `[197, 198, 199, 200, 201, 202, 203, 204, 205]` | "line" heard as "mind" |
| 33 | `[206, 207, 208, 209, 210, 211, 212]` | "conflict" heard as "conflicts" (x2) |
| 37 | `[230, 231, 232, 233, 234, 235, 236, 237]` | "conflict" heard as "conflicts" (x2) |
| 40 | `[244, 245, 246, 247, [248, 249]]` | "data2" measured as "data too" |
| 45 | `[268]` | "GIT" heard as "Get," |
| 53 | `[307, 308, 309, 310]` | "(YES!)" heard as "yeah"; the stray "Except" 311 belongs to the next line |
| 54 | `[312, 313, 314, 315]` | "(YES!)" heard as "yeah" |
| 57 | `[333, 334, 335, 336]` | "(YES!)" heard as "yeah" |
| 65 | `[383, 384]` | "Build failed" heard as "Failed, failed" |
| 66 | `[385, 386, 387, 388, [389, 390]]` | "forty-two" sung as "forty two" |

Null tokens in the map: line 44 "AAAAAH!", line 67 "AAAAAAAH!".

`node tools/gridcheck.mjs take-v4` (adapted so it is not tied to take-v1's 1.333 s bar and its line numbers):

```
ok   bar length at 60 s is 4 beats of the song tempo +- 0.01 s  (1.3280 s)
ok   beat length at 60 s matches the song tempo +- 0.005 s  (0.3320 s)
ok   median beat matches the song tempo (60 / bpm_mean +- 2 ms)  (0.3330 s vs 0.3332 s)
ok   a 5-beat bar is measured as its own length
ok   gridTime inverts gridPos  (max error 2.8e-14 s)
ok   every sung line binds with the token map (66 of 66)
ok   every token time is a measured word time
ok   a null token shares the time of its neighbouring mapped token
ok   token times never go backwards in a line
ok   tokens pointing at one measured word share its time  (line 9: "Three hundred")
ok   a line with no mapped token throws
ok   without the map, the mismatched lines throw (no guessing)  (13 lines throw)
gridcheck take-v4: all passed
```

## 6. Voice contrast (solo lines only, vocal stem)

Burak asked for "voices a bit more different". Measured on the demucs vocal stem, on the lines only one girl sings (singer from the lyric tags, time from the measured line start/end). Pitch needs a clean stem, which only the quiet sections give: 14 solo lines (8 sweet, 6 raspy) have enough voiced frames; the heavy trading lines of verses 3-4 are too short and too masked by guitars for pitch tracking.

| feature | sweet (median, IQR) | raspy (median, IQR) |
|---|---|---|
| F0 median (Hz) | 312 (263-367) | 371 (349-393) |
| F0 10th percentile (Hz) | 261 (233-320) | 288 (247-370) |
| F0 90th percentile (Hz) | 397 (363-415) | 394 (392-450) |
| F0 range, 10-90 % (semitones) | 3.55 (2.9-9.59) | 5.48 (3.92-7.3) |
| spectral centroid (Hz) | 3.08e+03 (3.04e+03-3.23e+03) | 3.2e+03 (3e+03-3.28e+03) |
| spectral flatness (higher = noisier) | 0.02 (0.016-0.024) | 0.02 (0.019-0.021) |
| harmonicity, HNR proxy (dB, lower = rougher) | 9.06 (8.44-9.44) | 5.97 (4.64-7.23) |
| voiced fraction of frames | 0.301 (0.233-0.361) | 0.115 (0.112-0.156) |

Separability (leave-one-line-out nearest-centroid classifier on z-scored features; chance = always guess the larger class):

| feature set | lines | accuracy | chance |
|---|---|---|---|
| F0 + centroid + flatness + HNR | 14 | 71 % | 57 % |
| F0 median alone | 14 | 64 % (AUC sweet-higher 0.34) | 57 % |
| centroid alone | 14 | 64 % (AUC sweet-higher 0.42) | 57 % |
| flatness alone | 14 | 29 % (AUC sweet-higher 0.42) | 57 % |
| HNR alone | 14 | 71 % (AUC sweet-higher 0.90) | 57 % |
| timbre only (centroid + flatness + high-band share), every solo line >= 0.45 s | 29 | 52 % | 52 % |

**Honest reading: the two voices do not separate in this take.** The raspy girl is not lower: her median F0 is 371 Hz against the sweet girl's 312 Hz (the AUC for "sweet is higher" is 0.34, i.e. raspy is slightly higher if anything), centroids are alike (3199 vs 3082 Hz) and a classifier on pitch or brightness is barely above chance (64 % for F0 alone against 57 % chance; 52 % on timbre alone over 29 lines, chance 52 %). The only feature that tells them apart is harmonicity: the raspy girl is rougher (HNR 6.0 dB against 9.1 dB, AUC 0.90), good for 71 % of 14 lines with the full feature set, so a rougher, noisier voice is audible in the quiet sections but the pitch/register contrast Burak asked for (a low husky alto against a high soprano) is not there. The planned fallback (darken and roughen the raspy girl, brighten the sweet girl on solo lines in post) is still needed.

Per-line numbers are in `voice_contrast.json` (`lines`). Caveats: demucs separation leaks the other voice and the guitars into the vocal stem; pyin F0 has octave errors; the sample is small.

## 7. Colour words

Every "orange", "blue" and "pink" Whisper heard (merged `words`; the full-mix pass and the vocal-stem pass agree to within 0.4 s):

| colour | times (s) |
|---|---|
| orange | 30.96 ("orange"), 31.98 ("orange"), 39.24 ("orange,"), 40.58 ("orange"), 145.68 ("orange"), 164.26 ("orange") |
| blue | 38.40 ("Blue,"), 39.98 ("blue,"), 143.12 ("blue"), 163.72 ("Blue") |
| pink | none heard |

The lyric has 11 colour words (6 orange, 5 blue); **10 are heard at the right place**: line 7 orange 30.96; line 7 orange 31.98; line 10 blue 38.40; line 11 orange 39.24; line 12 blue 39.98; line 13 orange 40.58; line 49 blue 143.12; line 50 orange 145.68; line 55 blue 163.72; line 55 orange 164.26.
- **"orange" is sung where the lyrics say it**: verse 2 (30.96, 31.98 s), pre-chorus (39.24, 40.58 s), soft interlude (145.68 s), final chorus "Blue and orange together" (164.26 s). All six, none missing.
- **"pink" does not appear**: zero hits in the merged words, the full-mix pass and the vocal-stem pass (searched for any word starting with "pink").
- Blue: all four sung blues are heard (pre-chorus 38.40 and 39.98, interlude 143.12, final chorus 163.72 s); the fifth, in verse 1 "the button was blue" (line 3, near 20.98 s), is heard as "glued", so its time is the heard word's, mapped by the token override.

## 8. Files

`mc-timing.json` (engine file; schema of take-v1 plus `singer` and `voice` on every `lyric_alignment` line), `token_map.json`, `bars.json`, `lyric_align.json`, `whisper_vocals.json` (raw full pass of the vocal stem; its 199.9 s "ooo..." segment, "I don't know." at 226.7 s and "Thank you." at 231.3 s are hallucinations in the unsung block and are ignored), `stops_raw.json`, plus `whisper_main.json`, `voice_contrast.json`, `colour_words.json`, `_grid.json`, `_downbeats.json`, `_detail.json`. Tools: `tools/timing/` (beatgrid, downbeats and build_mc_timing read `MC_TAKE`, section specs for v4 in `mc_specs.py`, voice_contrast, make_summary_v4), `tools/token_map.py` (OVERRIDES for take-v4), `tools/gridcheck.mjs`. Stems: demucs htdemucs, 4-stem, not kept.
