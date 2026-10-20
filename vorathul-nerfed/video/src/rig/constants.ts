// Rig timing constants. Everything the rig quantises or fades is declared here, once.

/** Frames per rig pose update. docs/rig.md section 9: true twos (15 fps at 30 fps), one place to change it. */
export const RIG_STEP_FRAMES = 2;
/** Hand variant crossfade length (section 5.2). */
export const HAND_FADE_FRAMES = 6;
/** A deleted pipe shows the missing-texture checkerboard for this many frames (2 rig steps), then disappears. */
export const MISSING_FRAMES = 4;
/** The cork flies in over this many frames and lands on the pop frame. */
export const CORK_FRAMES = 3;
/** A returning pipe flies in over this many frames and lands on its beat. */
export const RETURN_FRAMES = 8;
/** Glow ramp after a pipe returns or is relit. */
export const RELIGHT_FRAMES = 6;
/** A returning pipe starts this far (H) outside along its own axis. */
export const RETURN_DISTANCE_H = 0.6;
/** Default ramp length of a state track when the key does not give one. */
export const RAMP_FRAMES = 6;
/** World units per H on the preview stage: a 900 px figure in a 1080 px frame that is 6 units tall. */
export const WORLD_UNIT = 5;
export const FRAME_WORLD_HEIGHT = 6;
export const FRAME_W = 1920;
export const FRAME_H = 1080;
export const FIGURE_PX = 900;
/** Pixel row of the floor and column of the root in the preview framing. */
export const FLOOR_PX_Y = FRAME_H / 2 + (FIGURE_PX / 2);
export const ROOT_PX_X = FRAME_W / 2;
