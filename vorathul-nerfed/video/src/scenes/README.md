# Scene lanes: the contract

The film is built in five part lanes. Each lane owns one folder and one frame range; the main loop owns
everything that connects them (`src/film/`, `src/Root.tsx`, `src/events.ts`, `src/cast/available.ts`).

| Part | Shots | Frames | Storyboard |
|---|---|---|---|
| p1 | S01-S25 | 0-1850 | docs/storyboard-01-intro-to-unfair.md |
| p2 | S26-S45 | 1850-3000 | docs/storyboard-01-intro-to-unfair.md |
| p3 | S46-S73 | 3000-5140 | docs/storyboard-02-chorus-to-end.md |
| p4 | S74-S90 | 5140-6680 | docs/storyboard-02-chorus-to-end.md |
| p5 | S91-S115 | 6680-8215 | docs/storyboard-02-chorus-to-end.md |

## What a lane writes

- `src/scenes/<part>/index.ts` exports `SHOTS: Shot[]` (`src/film/shot.ts`): one entry per storyboard shot,
  frames `[from, to)` exactly as the shot table, covering the part range with no gap and no overlap.
- `src/scenes/<part>/events.ts` exports `EVENTS`: every beat-locked event of the part (the storyboard's
  Appendix A), built only with `src/anchors.ts` helpers. Plain `.ts`, no JSX, no `.tsx` imports: beatcheck loads it
  with node. Ids are prefixed with the part (`p3-...`).
- Any other file the lane needs lives under `src/scenes/<part>/`. Shared code is imported, never copied or edited:
  `stage/`, `camera/api.ts`, `vfx/effects.ts`, `ui/index` kit, `rig/` (Rig, rigAt, Timeline), `cast/AssetCard`.

## Rules

- One `<Stage>` (one ThreeCanvas) per shot at most; 2D overlays (vfx, ui) sit in AbsoluteFill above or below it.
- Frame purity: no Math.random, Date.now, useFrame, requestAnimationFrame, timers; seeded randomness only. No JSX
  constants at module level.
- Character motion: rig poses change on twos (the rig does this), the life layer runs every frame, 2D overlays
  step on twos. Vorathul never stands still firing an effect: every attack is antic, strike, follow-through with
  root movement (storyboard 2 attack list).
- Pictures: every storyboard asset is drawn with `<AssetCard id="G.." standIn={...}>`. The stand-in is an approved
  frame from `public/plates/` (cropped with card position/scale) or a flat colour of the right palette. Never
  generate or download images. When the final image lands, the main loop adds its id to `AVAILABLE`.
- Flash: `docs/flash-audit.md` and the binding rules at the end of storyboard 2. Build every grade schedule with
  `gradeCues` and every shot's swings through `assertFlashBudget`.
- Dead air: beatcheck limits (2 beats in intro/chorus/build/outro, 4 elsewhere) must pass for the part's sections.
- Renders and stills only through `tools/locked.sh` (one Chrome at a time across all lanes), and only short ranges
  while building; the main loop renders the whole film.
- Commit with `git add` of your own paths only; other lanes commit at the same time (retry on .git/index.lock).
