// Library barrel. Import effects from here; ./index.ts is the gallery's own Remotion entry point
// (it calls registerRoot) and must not be imported by the film.
export { seeded, hashKey, type Rng } from './seeded.ts';
export { INK, IVORY, GOLD, SKY, VIOLET, VIOLET_LIGHT, InkFilter, inkFilterId, Overlay, curvePath, taperedPath, type Pt, type Bounds, type InkFilterProps } from './style.tsx';
export { InkSplash, type InkSplashProps } from './InkSplash.tsx';
export { SpeedLines, type SpeedLinesProps } from './SpeedLines.tsx';
export { ImpactBurst, type ImpactBurstProps } from './ImpactBurst.tsx';
export { Shards, shardSpecs, shardPose, type ShardSpec, type ShardOptions, type ShardsProps } from './Shards.tsx';
export { Meteor, type MeteorProps } from './Meteor.tsx';
export { shake, shakeSum, type ShakeOffset } from './shake.ts';
export { PrintTexture, Misregister, type PrintTextureProps, type MisregisterProps } from './PrintTexture.tsx';
export { EchoTrail, type EchoTrailProps } from './EchoTrail.tsx';
export { DuotoneFlash, type DuotoneCue, type DuotoneFlashProps } from './DuotoneFlash.tsx';
export { ScribbleBoil, type ScribbleBoilProps } from './ScribbleBoil.tsx';

/**
 * Shared dry-brush stroke. All three render a <g>, so they go INSIDE an existing <svg>, in that
 * svg's user units.
 *
 * <DryBrushStroke d width color? seed? taper? breakup? rough? bounds? />
 *   d        any SVG path
 *   width    widest stroke width
 *   color    default INK
 *   seed     filter noise seed (default 1); different seeds = different raggedness
 *   taper    0 even width .. 1 needle tips, full width only mid-path (default 0.6)
 *   breakup  0 few skipped specks .. 1 heavily broken bristles (default 0.3)
 *   rough    edge displacement, default width / 3 (min 2)
 *   bounds   [x, y, w, h] filter region; default derived from the path's absolute coordinates
 *            (pathBounds). Pass it for paths with relative commands to avoid a generous box.
 *
 * dryBrushOutline(opts?) -> ({ id, d, width, color }) => ReactNode
 *   Structurally the UI kit's OutlineRenderer: `renderOutline={dryBrushOutline({ taper: 0.3 })}`
 *   on ProgressSun / MissingTexture. opts = any DryBrushStroke prop except d/width/color; each
 *   outline's seed is derived from its id (plus opts.seed).
 *
 * <DryBrush seed? rough? breakup? region?>{(filter) => <path filter={filter} ... />}</DryBrush>
 *   Render-prop form: hands out the filter url so fills or groups get the same ink edge.
 */
export { DryBrushStroke, DryBrush, dryBrushOutline, pathBounds, type DryBrushStrokeProps } from './DryBrushStroke.tsx';
