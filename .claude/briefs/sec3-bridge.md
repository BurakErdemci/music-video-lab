# Brief: bridge (2:09.8–2:38.2)

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the
architect commits). Files in English. Sub-agents you spawn must be `sonnet` (bulk reading, measuring, contact
sheets); you keep design and code. RESUME RULE: if this brief is re-sent after an interruption, read `git status`
and `git diff` first and continue; do not restart.

Base: HEAD e449fc4 (0:00–1:30 = Test90, approved v6; 1:28.7–2:09.8 = Test2, approved test2-v2). Both are frozen.

## Read first
- `sahne-haritasi.md`: scene table rows 2:09.8–2:35.9 (bridge male / bridge female), "Line moments" 2:09.7–2:38.2,
  the crossing table row for 2:34.9, typography rules, style refs `stil/tur3/03b-satir-yagmuru.png`,
  `03c-satir-yagmuru.png`, `04-teselli.png`. Its "Technique" paragraph (hard cuts, 3–6 frame holds) is OUTDATED.
- `.claude/session-state.md` (tempo rule, open defects list).
- How the previous sections are built: `video/src/Root.tsx`, `video/src/world/Story.tsx`, `video/src/world/Verse2.tsx`,
  `video/src/world/verse2Geom.ts`, `video/src/world/glassGeom.ts`, `video/src/scenes/acting.ts`,
  `video/src/scenes/Test30Scene.tsx`, `video/src/characters/actor.ts`, `video/src/events.ts`, `video/src/timing.ts`,
  `video/src/type/*` (stamps, stampLayout, lyricLayout), `video/scripts/*` checks. Data: `data/timing.json`
  (ALWAYS index beats[]/downbeats[]; the tempo drifts; bind lyrics only to measured words).

## Goal
The bridge plays continuously after chorus 2 (2:09.8) in the same world, with the same two characters and the same
quality bar as Test2, so that a new composition `Test3` (about 2:06–2:40, 1920x1080/30 fps, song audio in sync)
renders it to `video/out/test3-v1.mp4`.

## Story beats (from the scene map; you design the staging)
- Bridge, male, loud (2:09.8–2:24.7): KURDUK — the human's notes have built a paper city that stands complete;
  SİLDİK — the wall pours down as line-rain (03b); TEK BİR TIK — a counter "17.703" runs, then one click, and the rain
  is made of real Turkish lyric letters; YEDEK — the collapsed city and the one small "yedek" box (03c).
- Bridge, female, the QUIETEST part of the song (−25.7 dB, 2:24.7–2:35.9): almost empty frame on the AI side; the AI
  turns a notebook page (UNUTMAYA); back to back through the glass (04-teselli, BOŞUNA DEĞİLDİ); "Seni buraya o
  getirdi" (2:34.9–2:38.2): the AI reaches through the glass and leaves one yellow note on the human's side, its arm
  navy past the seam (same crossing language as the chorus 2 palms: inverted colour, soft yellow contact glow).
- Calm must FEEL calm in the female half: fewer events, longer eased holds, but still no dead air beyond the limits.
- Stop at 2:38.2; the guitar solo cracks (2:38+) are the next section — leave the glass intact.

## Hard rules (measured gates)
1. TEMPO (director: "transitions looked 4x fast, things teleport"; "one animation stays at most 4–5 s, they can
   repeat actions, transitions natural"): per character at most ~3 state changes in any 10 s; transitions ≥ 12
   frames eased (big body changes 18–60 frames via breakdown drawings); ≥ 1 s calm hold between transitions; each
   action 2–5 s, never > 5 s. Also avoid a character staying >5 s in poses that LOOK the same even if the check
   counts them as different actions (a blind viewer flagged that in Test2). Run tempocheck on the new range.
2. MORPH CONTINUITY: every new drawing pair through make-tweens.py and morphcheck G1–G4 (list any G2 failure with
   frames). No prop/notes/hair popping, no doubled or detached heads. When `make-strips.py` recopies strips, keep the
   tween cache valid (restore old file times) so unchanged tweens are not regenerated.
3. No single-frame jumps (jumpcheck on the new comp); walks only via walkCycle (walkcheck).
4. Same person: on-model with `stil/hareket/ref-insan-kanonik.png` and the AI references; AI standing height ±3%;
   same-person board for any new strip.
5. Frame purity (no Math.random/Date.now/new Date/performance.now/requestAnimationFrame/setTimeout/setInterval/
   useFrame in video/src). beatcheck (bridge ≤ 4 beats between visible events; a deliberate `hold` up to 8 is allowed
   in the quiet female half), popcheck (nothing appears in < 8 frames except stamps).
6. TEXT: captioncheck 0 overlapping caption hand-overs in the new range; stampcheck 0 (stamps ≥ 86 size, clear of
   both characters, not on a same-colour background). The rain letters are allowed to cross characters, stamps are not.
7. The key moment of each line must be readable to a first-time viewer (Test2's palms were too faint at first):
   the city collapse, the counter + click, the small yedek box, back-to-back, and the note left through the glass.
8. Do not change anything before 2:09.8; if you touch shared code re-run all checks on Test90 and Test2 and compare
   stills (Test90 900/1300/2614, Test2 3150/3700) against the approved renders `out/test90-v6.mp4`, `out/test2-v2.mp4`
   (0 px over 30 after blur).

## Assets
New pose strips (e.g. human back to the glass sitting, AI back to the glass with notebook, AI reaching through) and
props: generate with Codex image_gen, model gpt-6.1-sol, `-i` with the canonical reference, flat magenta #FF00FF
background, ONE image per `codex exec`, take the file from `~/.codex/generated_images/<session id from the log>`
(never let Codex copy it), verify with md5 + looking at it, prompts saved in `stil/hareket/prompts/`. Follow the
strip pipeline (`make-strips.py` → `tween-pairs.mjs` → `make-tweens.py`). Prefer code-drawn props (city, counter,
rain letters, box) where they look as good.

## Done when
`video/out/test3-v1.mp4` rendered (`npx remotion render src/index.ts Test3 out/test3-v1.mp4 --concurrency=4 --crf 23`
from video/), all checks above run with numbers, and you looked yourself at full frame rate (frame-exact
`select='between(n\,A\,B)'`, NOT `-ss`; ffmpeg drawtext crashes here, don't use it) at every transition, the city
collapse, the counter/click, the box, back-to-back and the note through the glass; contact sheets in
`video/out/test3-checks/`.

## Report (Turkish, plain language, short; the reader is not a specialist)
What the section shows line by line, gate numbers, new assets, paths, and honest weak spots.
