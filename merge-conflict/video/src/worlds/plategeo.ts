// Where a painted plate stands for a camera pose (round 7c, scene-map.md "Resolution: no blur"). Node-safe: the
// renderer (worlds/plate.tsx) and tools/framecheck.mjs use the same numbers.
//
// The plates are 3072 px wide and the film renders at 2560 px, so a plate may span at most 1.25 * 3072 / 2560 =
// 1.5 frame widths; a plate that only faced the shot's opening camera magnified up to 4x under the pushes, dolly
// zooms and orbits. Now the plate faces the camera of the frame, at a size and offset that follow the camera
// damped:
//  - size: the opening margin times the square root of the zoom since the opening pose, kept in [needed, 1.48];
//  - offset: a share (`follow`) of where the opening plate's centre would now project, kept inside what the size
//    leaves free, so the painting still drifts against the girls (the floor plane follows more, for depth);
//  - rotation: a quarter of the camera's roll, so a barrel roll turns the painting a little and never shows its edge;
//    on screen the plate then leans by the other three quarters, and where that lean needs more than the widest span
//    to cover the frame the plate turns further with the camera (round 9: the chorus 2 barrel rolls at 104.8 and
//    105.9 s showed black corners, because the cover was computed for the quarter turn, not the on-screen lean).
import { basis, type CameraPose, H, project, type Vec3, W } from '../camera/camera.ts';

export const PLATE_PX = 3072;
export const OUTPUT_W = 2560;
/** The widest a plate may span, in frame widths: 1.48 of 1.5 (1.233x its pixels at 2K). */
export const PLATE_SPAN_MAX = 1.48;
const ASPECT = W / H;
const PLATE_ASPECT = 1.5;

export interface PlateView {
  /** World centre of the plane and its in-plane unit axes. */
  centre: Vec3;
  right: Vec3;
  up: Vec3;
  /** World size of the plane. */
  w: number;
  h: number;
  /** Span in frame widths, and its scale over the plate's pixels at the 2K output. */
  span: number;
  scale: number;
}

const tanHalf = (fov: number) => Math.tan((fov * Math.PI) / 360);
const add = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** The span a plate needs to cover the frame when turned by `phi` on screen and offset by (ox, oy) frame widths/heights. */
const needed = (phi: number, ox: number, oy: number): number => {
  const c = Math.abs(Math.cos(phi));
  const s = Math.abs(Math.sin(phi));
  // the frame's corners in the plate's turned axes must stay inside the plate (width span, height span/1.5*ASPECT)
  const byW = c + s / ASPECT + 2 * Math.abs(ox);
  const byH = ((s * ASPECT + c) / ASPECT) * PLATE_ASPECT + 2 * Math.abs(oy) * PLATE_ASPECT / ASPECT;
  return Math.max(byW, byH) * 1.01;
};

/** The plate plane at distance `dist` in front of `pose`, for a plate laid out for the opening pose `base` with
 *  `margin` (its old width over the frame's). `follow`: the share of the true parallax it keeps. */
/** The most a plate may lean on screen and still cover the frame at the widest span with no offset (bisection on
 *  needed(); the leaner part of the room is left for the offset by plateView's clamp). */
const MAX_LEAN = (() => {
  let lo = 0, hi = Math.PI / 2;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (needed(m, 0, 0) <= PLATE_SPAN_MAX / 1.01) lo = m; else hi = m;
  }
  return lo;
})();

export const plateView = (pose: CameraPose, base: CameraPose, dist: number, margin: number, follow = 0.5): PlateView => {
  const [fwd, rightR, upR] = basis({ ...pose, roll: 0 });
  // where the opening plate's centre projects now, in frame widths/heights from the centre
  const [bf] = basis(base);
  const bc = add(base.position, bf, dist);
  const p = project({ ...pose, roll: 0 }, bc);
  const behind = (bc[0] - pose.position[0]) * fwd[0] + (bc[1] - pose.position[1]) * fwd[1] + (bc[2] - pose.position[2]) * fwd[2] <= 0;
  let ox = behind ? 0 : ((p.x - W / 2) / W) * follow;
  let oy = behind ? 0 : ((H / 2 - p.y) / H) * follow;
  // the plate turns with a quarter of the roll, so it leans on screen by the rest - at most MAX_LEAN
  const roll = pose.roll ?? 0;
  const lean = Math.sign(roll) * Math.min(Math.abs(roll) * 0.75, MAX_LEAN);
  const phi = roll - lean;
  const zoom = tanHalf(base.fov) / tanHalf(pose.fov);
  let span = Math.min(margin, 1.3) * Math.sqrt(Math.max(0.25, zoom));
  // keep the offset inside what the widest span leaves free, then grow the span to cover
  const room = (PLATE_SPAN_MAX / 1.01 - needed(lean, 0, 0)) / 2;
  ox = Math.max(-room, Math.min(room, ox));
  oy = Math.max(-room * ASPECT / PLATE_ASPECT, Math.min(room * ASPECT / PLATE_ASPECT, oy));
  span = Math.min(PLATE_SPAN_MAX, Math.max(needed(lean, ox, oy), span));
  const frameW = 2 * dist * tanHalf(pose.fov) * ASPECT;
  const frameH = frameW / ASPECT;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const right: Vec3 = [rightR[0] * c + upR[0] * s, rightR[1] * c + upR[1] * s, rightR[2] * c + upR[2] * s];
  const up: Vec3 = [upR[0] * c - rightR[0] * s, upR[1] * c - rightR[1] * s, upR[2] * c - rightR[2] * s];
  const centre = add(add(add(pose.position, fwd, dist), rightR, ox * frameW), upR, oy * frameH);
  const w = span * frameW;
  return { centre, right, up, w, h: w / PLATE_ASPECT, span, scale: (span * OUTPUT_W) / PLATE_PX };
};
