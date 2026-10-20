# Brief: verse 2 + pre-chorus 2 + chorus 2 (1:28.7–2:09.8)

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the
architect commits). Files in English. Sub-agents you spawn must be `sonnet` (bulk reading, measuring, contact
sheets); you keep design and code. RESUME RULE: if this brief is re-sent after an interruption, read `git status`
and `git diff` first and continue; do not restart.

## Read first
- `sahne-haritasi.md`: scene table rows 1:28.7–2:09.8, "Line moments" lines 1:29.8–2:09.7, "Crossing into the
  other's world" (2:00.4 palms pass through the glass, the part past the seam inverts colours), typography rules.
  NOTE: its "Technique" paragraph (hard cuts, 3–6 frame holds) is OUTDATED — the tempo rules below replace it.
- `.claude/session-state.md` (4g tempo rule, 4k morph audit).
- How 0:00–1:30 is built: `video/src/Root.tsx`, `video/src/world/Story.tsx`, `video/src/scenes/acting.ts`,
  `video/src/scenes/Test30Scene.tsx`, `video/src/characters/actor.ts`, `video/src/events.ts`, `video/src/timing.ts`,
  `video/scripts/*.mjs|py` checks. Data: `data/timing.json` (beats[], downbeats[], words — ALWAYS index beats;
  the tempo drifts 127.9→130.9 BPM; bind lyrics only to measured words).

## Goal
The section 1:28.7–2:09.8 plays continuously after the calendar (1:28.7) in the same world, with the same two
characters and the same quality bar as 0:00–1:30 (test90-v6), so that a new composition `Test2` (about 1:25–2:12,
same 1920x1080/30 fps, song audio in sync) renders it.

## Story beats (from the scene map; you design the staging)
- Verse 2 (AI sings, 1:28.7–1:43.6): SATIR — the notebook's lines slide across the AI side; AYNI HATA — the same
  crossed-out note reappears three times; BİTTİ — yellow-green lamps (#C9D94A, the ONLY place that colour is
  allowed) switch on one per beat; ÖLÇÜLMEMİŞ — the reveal that the lamps sit on EMPTY boxes.
- Pre-chorus 2 (human, 1:43.6–1:51.1): he sits down calmly ("Kızmıyorum…"), BAKIYORUM — a torch beam through the
  glass, HATIRLARIM — the beam lands on his wall of notes, YETER Mİ — a held question in silence.
- Chorus 2 (1:51.1–2:09.8): like chorus 1 but bigger — his room overflows with notes, hers is blank after each
  wave; on "buradayız" (2:00.4, take the measured word time) palms meet on the glass and for ONE beat the hands
  pass through and the part past the seam inverts colours (navy↔cream; first hint of crossing).
- Keep: one stamped KEY word per line (existing stamp system + stampcheck), bubbles via bubbleLayout + bubblecheck.

## Hard rules (measured gates — the director rejected earlier drafts for these)
1. TEMPO (director: "transitions looked 4x fast, things teleport"; "one animation stays at most 4–5 s, they can
   repeat actions, transitions natural"): per character at most ~3 state changes in any 10 s; transitions ≥ 12
   frames eased (big body changes 18–60 frames via breakdown drawings); ≥ 1 s calm hold between transitions; each
   action 2–5 s, never > 5 s. Extend `tempocheck.mjs` to the new range and report its numbers.
2. MORPH CONTINUITY: every new drawing pair goes through make-tweens.py (v6 design) and must pass morphcheck G1–G4
   (G2 failures must be listed with frames). No prop/notes/hair popping, no detached or doubled heads.
3. No single-frame jumps (jumpcheck), walks via walkCycle (walkcheck: slip ~0, even holds, 0 backward steps).
4. Same person: human and AI on-model with the canonical references (`stil/hareket/ref-insan-kanonik.png`; the AI's
   standing height within ±3%); make a same-person board for any new strip.
5. Frame purity: no Math.random/Date.now/new Date/performance.now/requestAnimationFrame/setTimeout/setInterval/
   useFrame in video/src. beatcheck (no dead air: verse ≤ 4 beats, chorus ≤ 2 between visible events) and popcheck
   (nothing appears in < 8 frames except stamps) extended to the new section.
6. Do not change 0:00–1:28.7 except where the calendar must hand over to verse 2; re-run all checks on Test90 if
   you touch shared code, and say so.

## Assets
New pose strips (e.g. torch, palms-through-glass, AI looking at lamps) and props (lamps, empty boxes): generate
with Codex image_gen, model gpt-6.1-sol, `-i` with the canonical reference, flat magenta #FF00FF background, ONE
image per `codex exec`, take the file from `~/.codex/generated_images/<session id from the log>` (never let Codex
copy it), verify with md5 + looking at it, prompts saved in `stil/hareket/prompts/`. Follow the existing strip
pipeline (`make-strips.py` → `tween-pairs.mjs` → `make-tweens.py`).

## Done when
`video/out/test2-v1.mp4` rendered (`npx remotion render src/index.ts Test2 out/test2-v1.mp4 --concurrency=4
--crf 23` from video/), all checks above run with numbers, and you have looked yourself at full frame rate
(frame-exact `select='between(n\,A\,B)'`, NOT `-ss`) at every transition, the lamp reveal, the torch, and 2:00.4;
contact sheets in `video/out/test2-checks/`.

## Report (Turkish, plain language, short; the reader is not a specialist)
What the section shows line by line, gate numbers, new assets, paths, and honest weak spots.
