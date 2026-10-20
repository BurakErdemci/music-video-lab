// Named framings from docs/storyboard-01 section 0.1 and docs/storyboard-02 section 0.1.
//
// Units: Stage world units; +Y up, cards face +Z, the camera looks down -Z. Stage's DEFAULT_FOV is 40 degrees and
// fitDistance(h) is the camera distance at which a card h units tall fills the frame height. The painting stage
// has its hero (feet y 0, helm top y 12) at z -15; the office stage has the 16 x 9 painting card at z -20, floor y -6.2.
// D0 = fitDistance(9) = 12.36 fills the frame with that painting card.
import type { Vec3 } from '../stage/Card.tsx';
import { DEFAULT_FOV, fitDistance, type CameraPose } from '../stage/Stage.tsx';
import { add, dirFromAngles, scale } from './math.ts';

const pose = (position: Vec3, target: Vec3, fov = DEFAULT_FOV): CameraPose => ({ position, target, fov });

export const PAINTING_Z = -15;
export const OFFICE_PAINTING_Z = -20;
export const D0 = fitDistance(9);

/** Pose from a focus point, the visible frame height at that point, and look angles (degrees; yaw 0 looks down -Z). */
export const frameAt = (focus: Vec3, visibleHeight: number, yaw = 0, pitch = 0, fov = DEFAULT_FOV): CameraPose =>
  pose(add(focus, scale(dirFromAngles(yaw, pitch), -fitDistance(visibleHeight, fov))), focus, fov);

// Painting stage.
export const WIDE = pose([0, 2, 34], [0, 6, -15]);
export const MED = pose([0, 4, 14], [0, 6, -15]);
export const CLOSE = pose([0, 9, 0], [0, 9, -15]);
export const ECU = pose([0, 10.5, -8], [0, 10.5, -15]);
export const LOW = pose([0, 0.5, 8], [0, 9, -15], 50);
/** Hero height, looking along -Z from z -2; `x` follows the subject. */
export const FLOOR = (x = 0): CameraPose => pose([x, 1, -2], [x, 1, -8]);
/** Balcony view; billboard the P3-P5 cards to the camera pitch (rotation.x). */
export const HIGH = pose([0, 30, 18], [0, 0, -15]);
/** Over a hero card at z -5 (scale 1.6); the hero's back fills the left third. Look-at is an assumption: ahead and slightly right. */
export const OTS_HERO = (x = 0): CameraPose => pose([x, 1.6, -4], [x + 1.2, 3, -15]);

// Office stage (painting card at z -20).
const officeAt = (distance: number, target: Vec3, fov = DEFAULT_FOV): CameraPose =>
  pose([target[0], target[1], OFFICE_PAINTING_Z + distance], target, fov);
export const OFF_WIDE = officeAt(21, [0, -1.6, OFFICE_PAINTING_Z]);
/** Target is "on the developer": pass the developer's position. */
export const OFF_MED = (target: Vec3 = [0, -3, OFFICE_PAINTING_Z]): CameraPose => officeAt(14, target);
/** Target is "on the hands": pass the hands' position. */
export const OFF_CLOSE = (target: Vec3 = [0, -4, OFFICE_PAINTING_Z]): CameraPose => officeAt(6, target);
export const OFF_LOW = pose([0, -5.6, -2], [0, 0, -14], 60);
export const OFF_HIGH = pose([0, 9, -12], [0, -6, -13], 50);
export const UNDER_DESK = pose([2, -5.4, -6], [2, -4, -14]);
/** Behind a developer cut-out at z -8; the developer fills one third. Look-at is an assumption. */
export const OTS_DEV = (x = -1.5): CameraPose => pose([x, -3.5, -6], [x + 2.5, -3.5, OFFICE_PAINTING_Z]);
/** 1.2 units behind the lead cursor (a 1.5 tall arrow) at `cursor`. */
export const OTS_CURSOR = (cursor: Vec3): CameraPose => pose(add(cursor, [0, 0.3, 1.2]), add(cursor, [0, 0.3, -10]));
/** Dead on the lens axis, locked: a card of `cardHeight` at the origin fills the frame. */
export const LENS = (cardHeight = 9): CameraPose => pose([0, 0, fitDistance(cardHeight)], [0, 0, 0]);

export const PRESETS: Readonly<Record<string, CameraPose>> = {
  WIDE, MED, CLOSE, ECU, LOW, FLOOR: FLOOR(), HIGH, OTS_HERO: OTS_HERO(),
  OFF_WIDE, OFF_MED: OFF_MED(), OFF_CLOSE: OFF_CLOSE(), OFF_LOW, OFF_HIGH, UNDER_DESK,
  OTS_DEV: OTS_DEV(), OTS_CURSOR: OTS_CURSOR([0, -4, -10]), LENS: LENS(),
};
