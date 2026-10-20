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

export { StickerCutout, type StickerCutoutProps } from './StickerCutout.tsx';
export { PaintSpread, type PaintSpreadProps } from './PaintSpread.tsx';
export { PaintSeep, type PaintSeepProps, type PaintSource } from './PaintSeep.tsx';
export { CanvasBulge, type CanvasBulgeProps } from './CanvasBulge.tsx';
export { CrackGrow, crackGraph, crackStep, type CrackGrowProps, type CrackSegment, type CrackOptions } from './CrackGrow.tsx';
export { TimeRemap, fastForward, playBetween, type TimeRemapProps, type FrameMap } from './TimeRemap.tsx';

/**
 * Photosensitivity (contract: at most 3 flashes in any 1-second window, strict counting as in
 * tools/flashcheck.py: every large luminance swing is one flash, so 3 swings per second).
 * - ImpactBurst `flash` = 0-3 frames; one burst costs flash + 1 swings (impactSwings). Default 2
 *   = 3 swings: one flashing burst uses the whole second.
 * - DuotoneFlash: every cue change is one swing (duotoneSwings). A 1-frame grade and its return
 *   are 2 swings.
 * - gradeCues() builds cues from { beat } / { word } / { frame } anchors with GRADES presets
 *   (V, O, O_SOFT, P, POSTER, GOLD, M, MEMORY; O_A and O_C are kept alternatives) and throws if
 *   its own cues break the budget.
 * - Shots combine sources: collect every swing of a shot (grades, impact flashes, hard cuts
 *   between very different plates) and call assertFlashBudget(swings, label) where the schedule
 *   is built. TimeRemap fast-forward multiplies the rate of anything flashing inside it.
 * - Not counted as flashes: speed-line flicker, scribble and sticker boil (small area, no
 *   frame-wide luminance swing). Measure the render anyway; the model is conservative, not proof.
 * - Measured: a big ImpactBurst star (even with flash 0), its debris and a strong shake on the
 *   high-contrast painting can each register as a swing in tools/flashcheck.py. Keep them out of
 *   the second that follows a flashing burst. Gate every render on tools/flashcheck.py.
 */
export { MAX_FLASHES_PER_SECOND, flashRate, assertFlashBudget, duotoneSwings, impactSwings, gradeCues, GRADES, type Swing, type GradeName, type GradeStep, type Anchor } from './flash.ts';

// Light, faked on the unlit stage (round 6).
/**
 * Measured light recipe (reference study): rims 1-3 px, saturated, on the side opposite the key;
 * light SWELLS (slow rise, fixed centre) rather than sweeping; screen/wall light steps between 3
 * levels (screenLevel, 5-7 frame holds); light on a figure = blurred colour quad behind + the same
 * hue at 0.15-0.35 on the figure (FigureSpill) - for heroes only, Vorathul's body stays #0A0A0A.
 * LightSpill brightens EVERYTHING under it, his body included (measured in the gallery, f1236):
 * keep him out with `region`, or put the spill below his card.
 */
export { RimLight, flickerGain, screenLevel, SCREEN_LEVELS, type RimLightProps } from './RimLight.tsx';
export { LightSpill, FigureSpill, pulse, swell, sparkLights, type LightSpillProps, type LightSource, type FigureSpillProps } from './LightSpill.tsx';
/**
 * SplitLight: directional key/fill grade with tinted shadows; true ink black is kept. Count its
 * cues with splitSwings() in the shot's flash budget: a colour change is a swing, an angle drift is not.
 */
export { SplitLight, SPLITS, splitSwings, type SplitCue, type SplitSetup } from './SplitLight.tsx';
/**
 * holdFrames / Stutter: deliberate low frame rate. RULE (director): it is a storytelling tool,
 * never decoration. Opt-in only, applied nowhere by default; use it only where a moment is built
 * around it (e.g. a nerfed, lagging move that recovers to smooth motion), never sprinkled across
 * shots. Prefer seededHolds (4-7 frame holds, measured) and give every step a real pose or offset
 * change, or it reads as plain lag. The film's general on-twos boil is a separate, existing rule.
 */
export { holdFrames, seededHolds, Stutter } from './Stutter.tsx';
