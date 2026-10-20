// Rig timing constants. Everything the rig quantises or fades is declared here, once.

/**
 * Pose cadence: one new rig pose every `step` frames. Default 1 = interpolate on every frame ("on ones", Burak 20 Oct: characters on
 * twos bothered viewers). A timeline opts into 2 or more (`Timeline.step`) for a deliberate stepped moment such as the nerfed lag.
 */
export const DEFAULT_STEP = 1;
/** Deprecated alias kept for older imports; the cadence now lives on the timeline. */
export const RIG_STEP_FRAMES = DEFAULT_STEP;
/** The fps a timeline is authored at when it does not say (`Timeline.fps`). */
export const DEFAULT_FPS = 30;

// Every duration below is in seconds, so the effect lasts the same at 30 and at 60 fps; `framesOf(seconds, fps)` gives the frames.
/** Hand variant crossfade (section 5.2). */
export const HAND_FADE_S = 6 / 30;
/** A deleted pipe shows the missing-texture checkerboard this long, then disappears. */
export const MISSING_S = 4 / 30;
/** The cork flies in over this long and lands on the pop frame. */
export const CORK_S = 3 / 30;
/** A returning pipe flies in over this long and lands on its beat. */
export const RETURN_S = 8 / 30;
/** Glow ramp after a pipe returns or is relit. */
export const RELIGHT_S = 6 / 30;
/** Default ramp length of a state track when the key does not give one. */
export const RAMP_S = 6 / 30;
/** A fire recoil lasts this long. */
export const FIRE_S = 4 / 30;
/** The strike ease winds back for this long before it accelerates (section 5.2). */
export const ANTICIPATION_S = 6 / 30;
/** A returning pipe starts this far (H) outside along its own axis. */
export const RETURN_DISTANCE_H = 0.6;
/** Seconds to whole frames at `fps` (at least 1). */
export const framesOf = (seconds: number, fps: number): number => Math.max(1, Math.round(seconds * fps));
/** World units per H on the preview stage: a 900 px figure in a 1080 px frame that is 6 units tall. */
export const WORLD_UNIT = 5;
export const FRAME_WORLD_HEIGHT = 6;
export const FRAME_W = 1920;
export const FRAME_H = 1080;
export const FIGURE_PX = 900;
/** Pixel row of the floor and column of the root in the preview framing. */
export const FLOOR_PX_Y = FRAME_H / 2 + (FIGURE_PX / 2);
export const ROOT_PX_X = FRAME_W / 2;
