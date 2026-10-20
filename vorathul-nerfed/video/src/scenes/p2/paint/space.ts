// Painting space (PS): the painting is a 16 x 9 window, origin at its centre, y up, 120 px per unit at the full window.
// Vorathul stands at z 0; cards behind sit at negative z, the camera looks down -z.
import { fitDistance, type CameraPose } from '../../../stage/Stage.tsx';

export const PX = 120;
export const WIN_W = 16;
export const WIN_H = 9;
/** Camera distance at which the z = 0 plane fills the 1920 x 1080 frame exactly. */
export const D0 = fitDistance(WIN_H);

/** PS units to px of the 1920 x 1080 window (the SVG overlay space). */
export const px = (x: number): number => 960 + x * PX;
export const py = (y: number): number => 540 - y * PX;

/** A view of the painting: centre (cx, cy) in PS units and the visible height at the z = 0 plane. */
export interface View {
  cx: number;
  cy: number;
  h: number;
}
export const FULL: View = { cx: 0, cy: 0, h: WIN_H };

export const poseOf = (v: View): CameraPose => ({ position: [v.cx, v.cy, fitDistance(v.h)], target: [v.cx, v.cy, 0] });

export const lerpView = (a: View, b: View, t: number): View => ({ cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, h: a.h + (b.h - a.h) * t });

/** Scale that makes a card placed at depth z look the size it has at z = 0 from the full-window camera. */
export const depthScale = (z: number): number => (D0 - z) / D0;

/** Named painting views (storyboard 1 section 0.1, in this window's units). */
export const VIEWS = {
  WIDE: FULL,
  MED: { cx: 0, cy: 1.2, h: 6.4 },
  CLOSE: { cx: 0, cy: 1.7, h: 3.4 },
  ECU: { cx: 0, cy: 2.55, h: 1.9 },
  FLOOR: { cx: 1.2, cy: -3.1, h: 3.2 },
} as const satisfies Record<string, View>;
