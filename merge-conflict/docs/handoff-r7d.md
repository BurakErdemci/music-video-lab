# Handoff: round 7c done, notes for round 8 (2026-10-22)

Round 7c's proof is `video/out/proof140-r7c.mp4` (0-140.04 s). The measured results are in the 7c report; this file
holds what the next engine agent needs: the new machinery, the decisions taken without Burak (he was asleep), and what
is left.

## New machinery in 7c
- **Living camera** (`video/src/film/livecam.ts`): the last stage of every shot family's camera (speaker, groove,
  verses, both choruses, rest). Each family's old `xxxStateAt` became `rawXxxStateAt`; `liveCamera(raw, span)` adds
  1. Ken Burns: 4 % of the fov over each shot, push or pull by a hash of the shot id;
  2. shake: px amplitude = section peak (table `SHAKE`) x the measured kick/bass energy (`src/data/energy.json`,
     written by `tools/energy.py`), stepped every 3 frames in metal sections, smooth in disco, 0 in the whisper; the
     solo adds a tremble on every beat;
  3. the framing guard: the least widening (fov) and pan (a truck in the camera plane) that keeps every subject's
     face box 4 % inside the frame and <= 70 % of its height, and a full card's action box whole (a `crop: 'knee'`
     subject may lose the bottom but its knee line, 70 % down the card, must stay in). Caps: pan 0.45 of the half
     height, widening 1.5 (up to 2.0 through barrel rolls).
  - **Subject** = a girl whose face is in frame at the middle of the shot as authored; the other girl at the edge of
    a single is an `extra` (drawn, not held). framecheck checks subjects only.
  - The component and the state use the same `live.poseAt(t)`, so framecheck measures what renders.
- **Face-sized close-ups** (`faceSized` in `film/framing.ts`): rest-plan busts and face cut-ins are placed by their
  measured face box (`bust`, `faceAt`, `faceC` in `film/rest/plan.ts`), not by card height.
- **Plates** (`worlds/plategeo.ts` `plateView`): each plate plane faces the frame's camera, spans at most 1.48 frame
  widths (1.233x its pixels at 2K) and follows the true parallax at 0.5 (far) / 0.8 (floor plane), turning with a
  quarter of the camera roll. The old base-pose planes magnified up to 4x. `margin` props above 1.3 no longer matter.
  `Stage` provides the pose to its children (`useStagePose`).
- **Painting parallax** (`panelParallax`): the QK* panels sample their depth map (`public/plates/depth/<id>.png`) and
  shift near pixels with the camera truck (gain 2.5) and swell them on a push, capped by the 1.25x rule.
  The world plates (W*) do not use their depth maps yet.
- **HD cards**: `public/cards/hd/<id>.webp` (2x, Upscayl digital-art-4x, `tools/hdcards.py`), manifest `file` points at
  it and `px` holds its size; `w`/`h` stay the layout size. framecheck measures card scale locally where the card is on
  screen (9x9 grid).
- **Ripple** (`rig/ripple.ts`, Card vertex shader): <= 0.6 % of the card height, 0 on every grid cell touching the
  face box or the torso box (both cores carry a cell of margin), amplitude = section tier x bass, phase on the beat.
  `tools/ripplecheck.mjs` measures it.
- **Drawn loops** (`rig/loop.ts`): a card with `<id>b` and `<id>c` in the manifest plays base, b, c, b on the beat
  (3 / 2 / 1 / 0 drawings a beat by section tier). Only the texture swaps; rig, boxes and placement are the base's.
  `tools/loopcards.py` re-crops the cut-outs to the base card's crop box and copies frames.json entries. Batch 1 (15
  cards) is in; HD bases need HD in-betweens (done for batch 1).
- **Floor reflection** (Card.tsx): full-length mirror below the soles, 40 % opacity, fading over 30 % of the card
  height, mip-blurred, tinted to the set. Subtle on dark boots.
- **GIT! PUSH! FORCE!** (rest plan, `push-*` shots): set-up two-shot, GIT!, charge, blue sees it (BMX1), leap x2,
  sneer, blue braces (BMX4), PUSH! smash (OF3), QK1 uncovered, BF1 thrown across the frame (`blownDx`, streaks,
  debris), FORCE! low angle. Corner HUD `GitHud` in `film/rest/type.tsx`. The warning-screen scene is gone.
- **Solo**: every solo shot of >= 2 beats gets a second framing on its middle beat (`-b` shots, `ALT` table).
- **Transitions**: `clipKind` in `transitions/scene/scene.tsx` maps the halftone ('mirror') and torn-paper ('ink')
  covers to glitch/laser (disco) and fire/tear (metal, t >= 117.36 s).
- **Type** (type lane): forms in screen space in the chorus, a face knockout (`type/Knockout.tsx`), margin clip and
  backings (`type/Scrim.tsx`, `backing` props). `framecheck --type` is the gate.

## Decisions taken without Burak (write them into the scene map if he agrees)
- Subject definition above (the edge girl in a single is not held in frame).
- The `close` camera variant counts as a deliberate knee framing.
- The girls riding the logo halves stop 260 px out; the halves still fly in from 1300 px.
- Chorus type no longer parallaxes with the camera (it sat on faces).
- Where a word must cross a face, the face is knocked out of the word.
- Blue's bracing pose in the breakdown set-up uses BS2 (keytar lean); a dedicated "bracing" card would be better.

## Left for round 8
- Drawn-loop batch 2 (after the Codex reset): cut out with `cutout.py --round <round>`, then `tools/loopcards.py`,
  then `tools/hdcards.py` (under `tools/locked.sh`) for in-betweens of HD bases.
- Depth parallax on the world plates (W06, W10, W12 have flat maps; RK1/7/9/10/11 need a depth curve).
- 140-232 s.

## Commands added
- `node tools/framecheck.mjs` now also checks the 2K pixel scale; `--dump f1,f2` prints projected boxes and the fit.
- `node tools/ripplecheck.mjs` (`--selftest` must exit 1).
- `uv run --with numpy python -I tools/energy.py` rewrites `src/data/energy.json`.
- GPU rule: one GPU job at a time (renders, stills, Upscayl), all under `tools/locked.sh` / the render lock.
