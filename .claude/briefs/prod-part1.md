# Brief: production part 1 — transition plan for the whole clip, then 0:00–0:56.86 in the living-illustration language

Repo C:\Users\burcu\Documents\klip-her-sabah (Windows, Git Bash; local git, NEVER push; do not commit — the architect
commits). Files in English. Sub-agents you spawn must be `sonnet`; Burak wants speed: run independent tracks in parallel
(drawings, Three.js shots, small life/pen, typography/stamps, checks), each with a narrow brief and its own files. You
keep shot design, integration and the final full-rate look. RESUME RULE: if re-sent, read `git status`/`git diff` first.

## Approved foundations (do not re-decide)
- Scene map v2 is the source of truth: `.claude/briefs/sahne-haritasi-v2.md` (incl. its "Decisions" section). The old
  `sahne-haritasi.md` is history only (but its typography rules and stamp words still apply where v2 does not override).
- Living illustration (Burak: "gayet iyi, buradan gidebiliriz"): big body actions are NOT animated; each beat is a full
  drawn pose; poses change by print transitions, beat cuts, match cuts or camera reframes; inside a pose only small life
  (breath, slight head tilt, hair/notes stir, steam, blink); the multiplane Three.js camera and the world carry motion;
  the PEN draws/erases/redraws the AI (her "every morning from scratch" motif). Engine: `video/src/living/*`
  (`ThreeStage.tsx`, `compose2d.ts`, `sources.ts`, `life.ts`, `pen.ts`, `shots.ts`, `LivingScene.tsx`), test
  `video/src/LivingRoot.tsx` (commit 8250ce8). Read `stil/canli/README.md`.
- Locked print transitions (`video/src/transitions/`): HalftoneBloom, InkBleed, PaperFold (WebGL), SqueegeePrint,
  PlateShift. Do not change their look; parameters (origin, direction, timing) are fine.
- Three.js rules: ONE WebGL canvas per frame; no `@react-three/postprocessing`; no `useFrame`; textures loaded before render.
- Frame purity (no Math.random/Date.now/new Date/performance.now/requestAnimationFrame/setTimeout/setInterval/useFrame
  in `video/src`), seeded noise; no new npm dependencies.
- Song timing: `data/timing.json` — always index beats[]/downbeats[]; bind lyrics only to measured words.

## Deliverable 1 — the clip-wide transition plan (do this first, ~1 page)
Append a section "Transition plan" to `.claude/briefs/sahne-haritasi-v2.md`: a table of EVERY scene-to-scene transition
in the map (0:00–4:00) with: time/beat, from → to, type, why (its meaning). Rules (Burak raised monotony):
- each type carries a meaning, e.g. HalftoneBloom = entering the screen / the AI's world; InkBleed = memory flowing
  away / his world spreading; PaperFold = the world turning into paper/notes; SqueegeePrint = a new day printed;
  PlateShift = things coming apart / out of register; the PEN = the AI drawn, erased, redrawn;
- no type twice in a row; each effect type at most 2–3 times in the whole clip;
- about half of all transitions are NOT effects: beat cuts, shape match cuts (torch circle → sun, line-rain → bus rain,
  a note → a road), camera moves through an object;
- the two deliberate hard cuts of the map stay.

## Deliverable 2 — part 1 of the clip, 0:00–0:56.86 (map scenes 1–4)
- Scene 1 intro 0:00–15.60: the approved Droste zoom-out intro exists in the old code (`video/src/world/Story.tsx` and
  related, rendered in `video/out/test90-v6.mp4` 0–15.6 s, Burak: "giriş çok iyi olmuş"). Reuse it as is (render it from
  the existing component inside the new composition or as a pre-rendered layer) and make its last beat hand over into
  scene 2 per the map (the zoom rushes into cream = his monitor's glow).
- Scenes 2–4 per the map's line-by-line table: the living-test shots (0:15.60–0:31) are the starting point — keep what
  works and fix its known weak spots: the camera barely moves for the first 1.5 s; the sun is too big for the window and
  the sky halftone too coarse; hair/notes stir is invisible (make it just visible); the steam crosses his face; the
  "Merhaba" typing must sync to the sung "Merhaba" word (≈ song frame 698); the pen's grey trail on the legs during the
  fill; the AI's two-pose wave flickers — use 3 poses or a small forearm rig rotation (`stil/kukla/ai-profil`, ≤ 45°).
- Then the rest of verse 1 (0:31–0:43.74: "Dün gece ne konuştuk", "Baştan anlatıyorum yine, ilk kez tanışmışız gibi" —
  notes slid through the glass, the handshake the glass stops, the sweat drop) and pre-chorus 1 full cream
  (0:43.74–0:56.86: the notebook falls, she reads, page close-ups, "ANLIYORUM" ✓, "HATIRLAMIYORUM", the ink lifting off
  the page and the InkBleed into the split at the bar 31 downbeat).
- Typography: lyric captions and the stamped KEY word per line (reuse `video/src/type/*`: stamps, stampLayout, lyricLayout,
  Bubble/bubbleLayout as fits); readable, clear of the characters, one caption line at a time.
- Emotion icons per the map (AI "?" at 0:33.6, human sweat drop on "yine" 0:36.5) in palette; red only for icons.
- New drawings as needed: Codex image_gen gpt-6.1-sol, `-i` canonical refs, magenta background, ONE image per exec,
  several in parallel, files from `~/.codex/generated_images/<session>`, md5 + look, transparent cut-outs, same-person
  boards; into `stil/canli/` (prompts in `stil/canli/prompts/`). Codex quota is not a concern.
- Pacing: calm; a pose change roughly every 2–4 s per character; small life always on.
- Composition `Part1` (0:00–0:58) in the living entry (`video/src/LivingRoot.tsx` / `living-index.ts`); render
  `video/out/part1-v1.mp4` (`npx remotion render src/living-index.ts Part1 out/part1-v1.mp4 --concurrency=4 --crf 23`).

## Measure and look
- `node video/scripts/living-checks.mjs` (extend it to the new range): beat landings 0 drift, single-frame scan (only
  deliberate cuts), 0 black frames at concurrency 4, tsc, purity grep, caption overlap 0, stamps clear of characters.
- Full-rate frame-exact sheets (`select='between(n\,A\,B)'`, never `-ss`, no drawtext) of every pose change, transition,
  the pen and the intro hand-over, in `video/out/part1-checks/`.
- Same-person boards for every new drawing.

## Report (Turkish, plain language, short)
The transition plan in a few lines, what part 1 shows line by line, the new drawings, measurements, honest weak spots.
