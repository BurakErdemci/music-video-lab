# Handoff: round 7c (framing + Gemini polish), stopped 2026-10-22

The last delivered proof is `video/out/proof140-r7b.mp4` (round 7b, all rules then in force passed). Round 7c is
partly built; no 7c proof has been rendered yet.

## Done in 7c (commits)
- f1b27f2 and 4c66e85: confetti only in the choruses. The particle field has a `dust` mode: in it confetti becomes
  dust motes and confetti bursts become sparks. The intro and verses 1-4 use dust; the metal sections use embers at
  `metal={1}`. f1b27f2 also carries the `versesStateAt` and `speakerStateAt` refactor.
- e78342a: standing cards are grounded. The contact shadow is firmer (0.78) and there is an additive floor glow in the
  set colour (Card.tsx). The arena pads sit at the girls' z. The ENTER key is seated in 4c66e85.
- faa460a: BMX5 recut, which fixes the cyan triangle on her neck in the whisper.
  - The cause was the cut-out: the grey neck shadow was peeled as key. The source image is fine.
  - Recut with `cutout.py --round n-faces --only BMX5 --grey-region-max 60`.
  - The manifest did not change; the points, outline and cover files were regenerated.
- be98632 (with f1b27f2): every shot exports a pure state function `xxxStateAt(t) -> ShotState` (film/framing.ts).
  It returns the camera pose and the placed cards from the same code the component renders. Film.tsx exports
  `filmStateAt(frame)`.
- ab6476f: the composition `MC60` takes a prop `layer: 'all' | 'type' | 'world'` (src/layer.ts).
  - `type`: only the SVG type on a transparent background. Stage, transitions and white-outs return null.
  - `world`: no SVG layers.
- 27b87f2: three known type cases are fixed in code, not yet measured.
  - The runway line ("two girls, one line") gets a dark backing.
  - The glitch ("I can't take control") gets a smaller slip and a dark band.
  - The chorus Stack box ({760, 80, 1030, 560}) stays inside the 4 % margin.
- 865de3b: shock transitions ring out from the floor (960, 980), not the frame centre, where they read as targets over
  a head.
- f8c1e50: `tools/framecheck.mjs` (faces and action boxes per frame, `--selftest`, `--type`) and
  `tools/typeframe.py`. Both pass a syntax check but have **never been run**: they need `video/public/cards/frames.json`.

## Half done / pending at handoff
- **frames.json** (face and action boxes plus bust/full for the 97 cards used in 0-140): a Sonnet lane is annotating
  it and will commit `video/public/cards/frames.json` alone.
  - Format: `{id: {face:[x0,y0,x1,y1], action:[...], kind:'bust'|'full'}}`, normalised to the card PNG with y down.
  - Verify a sample visually before trusting it.
- **New cover transitions** (Gemini item 4): a Sonnet lane is adding the kinds `laser` and `glitch` (disco) and `fire`
  and `tear` (metal) to `transitions/scene/scene.tsx` plus TransLab.
  - Its TransLab render (`out/translab-r7c.mp4`, pid 33408) was running at handoff and belongs to that lane.
  - It will commit only scene.tsx and TransLab.tsx; those two files show as modified in the tree until then.
  - After it lands, nothing uses the new kinds yet. Remap in the three shot transition builders
    (ChorusShot/VersesShot/RestShot): `mirror -> laser`, and `ink -> glitch` (disco) or `fire`/`tear` (metal).
    0-64 may change only for this item.
- The modified `video/public/plates/*.png` in the tree are not mine (the resolution rule, coordinator). Untouched.

## Not started
- Running framecheck before the fix, the per-section failure counts, then fixing the shots by scale, placement or move
  amplitude (shrink or re-aim the moves, keep intensity passing). In 0-64, change only shots that fail.
- Running `framecheck --type` and fixing every type failure (margin, face cover, contrast >= 3:1). The flagged cases:
  - ACCEPT CURRENT at 43.5 s and its chorus 2 twin;
  - "two girls" at 47.5 s;
  - the glitch at 62.5 s and 105.5 s.
- Gemini item 4 wiring (above). Items 2, 3 and 5 are done in code but not yet seen in a render.
- The new rules in scene-map.md (e75848f): living motion, the GIT PUSH FORCE storyboard, plate resolution.
- The render `video/out/proof140-r7c.mp4` and the full check list.

## Measurements so far
- framecheck: not run yet (no frames.json). The coordinator's 4 fps sheet of 117-140 shows most face cut-ins
  oversized: the busts (BX/OX/BMX/OMX at `faceC`, height 12) together with the push and dolly-zoom moves.
- proof140-r7b intensity (motion; chorus mean 25.95):

  | Section | Motion | Ratio to chorus |
  |---|---|---|
  | V3 | 14.64 | 0.56 |
  | V4 | 15.65 | 0.60 |
  | scream | 18.66 | 0.72, near the 0.70 floor |
  | breakdown | 22.90 | 0.88 |
  | solo | 24.61 | 0.95 |

  The 4 s after each chorus are at 0.54 and 0.53. Events/beat: V3 1.11, V4 1.18 (the floor is 1.10). Chorus 2 is at
  1.71 against the 1.68 needed, so adding events to verses 3-4 breaks it.
- Flash on r7b, worst window per section: 0-64 is 2, the breakdown is 3 (123.2-124.2 s), the rest are 2.

## Where things live (video/src)
- **Shots** (Film.tsx tiles them; one ThreeCanvas per frame):
  - `film/Speaker.tsx` (0-4.37) and `film/Groove.tsx` (4.37-16.33), driven by `film/proof.ts` (FRAMINGS, CAMERA,
    cameraAt).
  - `film/verses/` (16.33-42.84).
  - `film/chorus/` (both choruses: `makeChorusShot(lines, v)`).
  - `film/rest/` (64.15-85.38 and 106.68-140.04).
- **Plans are data** (node-safe .ts): `film/verses/plan.ts`, `film/chorus/plan.ts`, `film/rest/plan.ts`.
  - Shot tables: `{id, t, scene, cam variant | from/to, into (transition), move, panel}`.
  - Pose lists: `{t, card, at: Placement}`. Cuts are hard; a pose holds until the next entry.
  - Rest has a METAL table that carries both girls per shot.
- **Camera:**
  - The verses and rest use `film/shotkit.ts variant()` over each world's exported `<NAME>_CAMERA` hero move.
  - Rest adds `moved()` (push / orbit / whip / dollyzoom) and `kick()`, a stepped shake on metal beats.
  - The chorus has explicit from/to per shot, plus a punch every beat and a jolt on hits.
  - Chorus 2 lifts its camera (+1.0 x, +0.6 y, +3 fov).
- **Worlds:** `worlds/kit/` (NeonTube, Halo, BeamCone, LaserFan, Smoke, Embers, FireWall, LedWall, TilePlatform,
  GlowBox) and `worlds/{v1,v2,v3,v4,groove}.tsx`; the chorus worlds are in `film/chorus/worlds.tsx`.
  - Every world takes `plate`. With `'shot'` it skips its backdrop, and the shot draws
    `<PlateLayer id base={opening pose}/>` (`worlds/plate.tsx`): a far plane plus a near floor plane for parallax.
  - Panels (QK*/RK*) use `panel` = far plane only, with scene `'panel'` in the rest plan.
- **Cards:** PNG plus points/outline/cover json in `public/cards`, and the manifest.
  - `Card.tsx` placement: x, feet (default FLOOR_Y -3.4), height, z, flip; plus dx, dy, clip and `light` (key colour,
    sweep, dots, rim).
  - Card data comes from `tools/card_points.py`, `card_outline.py` and `card_coverage.py` (uv, pillow, numpy, scipy).
- **Type:** forms in `type/forms/` (Mega.tsx holds Shout, FlameText, GlitchText and RunwayLine).
  - Per-section type plans: `film/chorus/typeplan.ts`, `film/verses/plan.ts VERSE_TYPE` and
    `film/rest/plan.ts REST_TYPE`, aggregated in `film/typeplan.ts`.
  - Drawn by `chorus/type.tsx`, `verses/type.tsx` and `rest/type.tsx`.
- **Transitions:** `transitions/scene/scene.tsx`.
  - Each shot builds specs: a world change gets a cover kind, a cut inside a world gets a shock.
  - `CoverLife` keeps covers moving; cover colours sit at mid luminance (the flash budget).
- **Events:** `events.ts`, with anchors beat, offbeat, downbeat, hook, word and token. Kinds feed the camera:
  `pulse` (chorus beats), `hit` and `spark` (metal), `accent` (verses 3-4, every third beat).

## Commands (from merge-conflict/)
- Static checks:
  - `cd video && npx tsc --noEmit`
  - `node tools/purity.mjs`
  - `node tools/gridcheck.mjs take-v4`
  - `node tools/beatcheck.mjs --range 0-140.04` (and `--selftest`, which must exit 3)
  - `node tools/typecheck.mjs --range 0-140.04`
  - `node tools/rigcheck.mjs --from 0 --to 8402`
- Framing checks:
  - `node tools/framecheck.mjs --range 0-140.04` (`--selftest` must exit 1)
  - `node tools/framecheck.mjs --type --fps 2` (about 280 x 2 stills under the lock)
- Render: bundle once with `cd video && npx remotion bundle src/index.ts --out-dir=out/bundle-r7c`, then
  `uv run --with pillow --with numpy python -I tools/render_film.py --entry out/bundle-r7c --comp MC60 --frames 0-8402 --out video/out/proof140-r7c.mp4 --song public/audio/merge-conflict-v4.wav`.
  - It runs two passes under the lock with glitch and flash checks, about 28 min.
  - Never overwrite an earlier proof.
- Intensity: `node tools/intensity.mjs --range 0-140.04 --video video/out/proof140-r7c.mp4`.
  - For a partial render, pass `--start <seconds of its first frame>`.
- Section flash: cut each section out with ffmpeg and run `tools/flashcheck.py` on the segment.
- Stills: `node tools/stills.mjs --serve video/out/<bundle> --frames ... --gl angle --out ...`. It takes the lock;
  without `--serve` it bundles into Temp and deletes that bundle itself.

## Traps
- Do not change source while render_film runs: it may rebundle between passes, and that makes disputed frames.
- Chrome hangs, without an error, on SVG glyphs that project enormous (RunwayLine near the camera). They are clipped
  now; watch any new per-glyph projection.
- `downbeat(i)` is song-absolute. Use `downbeats.find(...)` or the plans' `db()` and `bt()` helpers. The plans throw on
  shots under 0.12 s apart.
- Dark covers over the bright plates produced flash pairs; covers stay at mid luminance.
  - A beat pulse over a large area (3/s) counts as flashing.
  - Out of the whisper, a fade-up carries the cut (`fade: true`).
- A chorus 2 word can fall right after the previous one (NO! 89.02 then Two 89.10). Chorus timing helpers
  (`twoGirlsAt`, `controlOut`, `burstAt`) keep 0.3 s apart.
- In the rest plan, the face cut-ins (`faceC`, height 12, feet -5.8) are the oversized ones: start the framing fix
  there.
- Stopping a background bash task leaves its npx and node children rendering; kill them by pid.
- `git add -A` is forbidden. Several commits touch shared files; split them by hunk when one file carries two jobs.
- The intensity rule couples sections: denser verse events raise the verse mean and can fail the chorus 1.5x rule.
