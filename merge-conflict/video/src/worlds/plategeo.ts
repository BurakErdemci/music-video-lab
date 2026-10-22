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

/** The 2.5D parallax of a moment painting (round 7c, Burak: the paintings felt like a slideshow): from its depth map
 *  (public/plates/depth/<id>.png, near = white), near pixels slide further than far ones as the camera trucks away
 *  from the opening pose, and swell as it pushes in. `shift` (texture units at full depth) and `zoom` drive the
 *  panel shader in worlds/plate.tsx; `mag` is the most a pixel is magnified beyond the plane's own scale, and is
 *  kept so the painting never shows above 1.25x its pixels (`scale` is the plane's, plateView's). */
export const panelParallax = (pose: CameraPose, base: CameraPose, dist: number, scale: number): { shift: [number, number]; zoom: number; mag: number } => {
  const [bf, br, bu] = basis({ ...base, roll: 0 });
  const d: Vec3 = [pose.position[0] - base.position[0], pose.position[1] - base.position[1], pose.position[2] - base.position[2]];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const shift: [number, number] = [(dot(d, br) / dist) * 2.5, (dot(d, bu) / dist) * 2.5];
  // a push swells the near half of the painting (depth above 0.3) by up to `zoom`, capped by the pixel rule
  const room = Math.max(0, 1.25 / Math.max(scale, 1e-3) - 1);
  const zoom = Math.min(Math.max(0, (dot(d, bf) / dist) * 0.8), room / 0.7);
  return { shift, zoom, mag: 1 + 0.7 * zoom };
};

// ---- moment paintings shown whole (round 7d, Burak: "the paintings do not fit the screen") ---------------------
// A painting (QK*, RK*: 3:2) is fitted to the frame height and locked to the frame, so every head and foot in it
// stays in frame whatever the camera does; the side bands show the same painting cover-fitted behind it, blurred and
// darkened. Its Ken Burns runs from 97 % to 100 % of the frame height over the shot (never past the frame), and the
// depth parallax is capped so near pixels move at most 1 % of the painting and swell at most 3 %.
export const PAINT_KB = 0.03;
export const PAINT_SHIFT_MAX = 0.01;
export const PAINT_ZOOM_MAX = 0.03;
export interface PaintingView { centre: Vec3; right: Vec3; up: Vec3; w: number; h: number; bandW: number; bandH: number; scale: number }
/** The painting plane at `dist` in front of `pose` (and its blurred band plane), `kb` the shot's progress 0..1. */
export const paintingView = (pose: CameraPose, dist: number, kb = 1): PaintingView => {
  const [fwd, right, up] = basis(pose);
  const s = 1 - PAINT_KB * (1 - Math.min(1, Math.max(0, kb)));
  const frameH = 2 * dist * tanHalf(pose.fov);
  const h = frameH * s;
  const bandW = frameH * ASPECT * 1.02;
  // the painting's height at the 2K output over its own pixel height (2048)
  return { centre: add(pose.position, fwd, dist), right, up, w: h * PLATE_ASPECT, h, bandW, bandH: bandW / PLATE_ASPECT, scale: (s * (OUTPUT_W / ASPECT)) / (PLATE_PX / PLATE_ASPECT) };
};
/** panelParallax capped for a painting shown whole (shift and swell inside its bounds). */
export const paintingParallax = (pose: CameraPose, base: CameraPose, dist: number, scale: number) => {
  const p = panelParallax(pose, base, dist, scale);
  const c = (v: number) => Math.max(-PAINT_SHIFT_MAX, Math.min(PAINT_SHIFT_MAX, v));
  const zoom = Math.min(p.zoom, PAINT_ZOOM_MAX);
  return { shift: [c(p.shift[0]), c(p.shift[1])] as [number, number], zoom, mag: 1 + 0.7 * zoom };
};
