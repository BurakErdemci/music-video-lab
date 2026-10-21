# Merge Conflict: engine architecture (v1, 2026-10-21)

The code half of `direction.md` and `scene-map.md`. The project lives in `merge-conflict/video`: Remotion 4.0.536 + three 0.186.1, the same versions as `vorathul-nerfed`. The infrastructure and tools are ported from there.

## Constraints measured on earlier clips (binding)

- **One WebGL canvas per frame.** A second canvas rendered black in parallel renders. Every 3D element (plates, cards, spotlight, all particles) lives in ONE `ThreeCanvas`.
- **Frame purity.** No `Math.random`, `Date.now`, `useFrame`, `requestAnimationFrame` or timers. All randomness is seeded (`seeded(key)`).
- **Static SVG layers can vanish** (11 of 48 frames in PRESS START). Every SVG layer carries a frame-dependent attribute, so it re-renders every frame.
- **Renders run with `--concurrency=1`,** through `tools/locked.sh`.
- **60 fps from frame 0. The scene clock is in seconds.** `timing.ts` gives `sec(frame)` and `f(sec)`. A duration written in frames must name its fps.
- **Flash budget.** At most 3 luminance swings per second over 25 % of the frame.
  - Every white-out and hue flip is registered in a swing list.
  - `assertFlashBudget` (the sibling's `vfx/effects.ts` pattern) throws at module load.
  - Hue flips that keep luminance (pre-chorus) are not swings, but flashcheck must confirm it.

## Frame stack (back to front)

1. **Stage (the one `ThreeCanvas`).**
   - **Set plate:** a full-frame painted plate on a far plane, or a duo card used as a plate.
   - **Spotlight:** an additive cone mesh with a soft falloff texture, plus a floor pool ellipse.
   - **Pose cards:** textured planes with the grade shader.
   - **Particles:** confetti and mirror-ball sparkles (persistent), plus card-to-particle dissolves.
2. **Graphic layer (DOM/SVG over the canvas):**
   - neon scribbles;
   - light-box signs;
   - kinetic type;
   - white-out frames.
3. **Lyric layer:** the persistent kinetic lyric type. It sits outside the shots, like the sibling's `TypeLayer`.

## Modules

| Module | Job | Notes |
|---|---|---|
| `timing.ts` | Beats, bars, sections, words, lines, hooks, stops. `word(text, nth)` throws if not measured. | From `data/mc-timing.json`. |
| `events.ts` | The registry of every visible beat-locked event `{id, t (sec), kind}`. | beatcheck reads it (drift 0 frames, dead air per section). |
| `film/` | The shot list `{id, from, to (sec), Component}` per section. Exactly one shot is mounted per frame. | As in the sibling. |
| `grade/` | Per-shot `Grade {hue, rival, amount}`. | The card shader tints the card toward `hue` and adds a rim of `rival` from the alpha gradient (edge = 1 − alpha blurred). Plates take the same tint without the rim. |
| `cards/` | `<Card id pose t>`: a textured plane from `public/cards/<id>.png`, sized from the manifest. | Alive while still: a float of ±0.6 % scale, a slow bob and hair-side sway via a vertex shader on the top third. All of it is a deterministic function of seconds. |
| `particles/field.ts` | The persistent confetti and sparkle field: N seeded particles with a position, a fall speed and a spin phase. | Evaluated in closed form at time t (no simulation state). Colour follows the grade. Density per section. |
| `particles/dissolve.ts` | Card → points and points → card. | Points come OFFLINE from `tools/card_points.py` (grid ~120×68 over alpha > 0.5, RGB per point, JSON in `public/cards/<id>.points.json`). `pos = mix(home, scattered, p)` with a per-point delay. Scatter takes 20-28 frames at 60 fps, gather 12-20, `outQuad`. Shape → shape morphs between two cards' points. |
| `light/spotlight.tsx` | The spotlight cone and floor pool, with a target (`x` or a card). | A whip is an `outQuad` move of 28-48 frames at 60 fps, then a full stop. |
| `type/` | Kinetic type components. | **Slam:** scale 1.6 → 1 in 8 frames `outQuad`, no bounce. **Stamp:** a plate copy multiplies on beats (NWF "RIGHT ✓"). **Dissolve:** letters break into seeded flying glyphs. **LightBox:** sign letters light one by one with glow, one colour per word. **Counter:** a racing number. All fonts are local. |
| `scribble/` | Neon chalk lines tracing a card's outline. | The outline comes OFFLINE from `tools/card_outline.py`: a simplified alpha contour polyline per card, JSON. A dashed draw-on with `stroke-dashoffset`, a jitter of a few px re-seeded every 4 frames (deliberate boil), and the colour of the girl. |
| `fx/whiteout.tsx` | White-out hit frames with RGB-offset ghost outlines and a spray burst. | Registered in the flash budget. |
| `camera/` | A 2.5D camera: position, target and FOV paths. | Moves of 28-48 frames at 60 fps, `Easing.out(quad)`, then a stop. A rest is fine; the layers keep moving. |

## Assets

- `public/cards/`: 24 pose cut-outs plus their manifest (tools/imagegen/cutout.py), with the points and outline JSON.
- `public/plates/`: set plates and duo cards (still to generate: the six set plates and D03 redone).
- `public/audio/merge-conflict.wav`: git-ignored.

## Order of work

1. Scaffold and tools, plus the cut-outs (lane A).
2. The engine modules above, with a `Lab` composition showing each one in isolation for 4 s, and a 20-second proof: the intro (0-10.05 s) plus the start of verse 1 to 20 s, built from the scene map with the real cards. That proof is the first thing Burak sees in motion.
3. The sections in order, each through: tsc, purity, beatcheck, flashcheck, and own-eyes stills of every transition at full frame rate.
