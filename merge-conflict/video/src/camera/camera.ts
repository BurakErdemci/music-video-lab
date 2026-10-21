// 2.5D camera (architecture.md "camera/"): position, target and FOV paths in seconds. A move is an
// outQuad of 28-48 frames at 60 fps that ends at exactly zero speed, then a full stop (no overshoot).
// Moves are checked at module load: a move outside 28-48 frames throws.
import { lerp, outQuad } from '../lib/ease.ts';
import { f } from '../timing.ts';

export type Vec3 = [number, number, number];
/** `roll`: radians about the view axis (a barrel roll), positive turns the image clockwise; default 0. */
export interface CameraPose { position: Vec3; target: Vec3; fov: number; roll?: number }
export type CameraPath = (t: number) => CameraPose;

export const W = 1920;
export const H = 1080;
export const FOV = 40;
/** Visible height (world units) at z = 0 for the home pose: 9 units, so 1 unit = 120 px. */
export const VIEW_H = 9;
export const HOME_Z = VIEW_H / 2 / Math.tan((FOV * Math.PI) / 360);
export const HOME: CameraPose = { position: [0, 0, HOME_Z], target: [0, 0, 0], fov: FOV };

export const MOVE_MIN_FRAMES = 28;
export const MOVE_MAX_FRAMES = 48;

export interface Move { id: string; t: number; frames: number; to: CameraPose }

const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const blendPose = (a: CameraPose, b: CameraPose, k: number): CameraPose => ({
  position: lerp3(a.position, b.position, k),
  target: lerp3(a.target, b.target, k),
  fov: lerp(a.fov, b.fov, k),
  roll: lerp(a.roll ?? 0, b.roll ?? 0, k),
});

/** Shift a pose by (dx, dy, dz) on both position and target: a truck/pedestal/dolly. */
export const shifted = (p: CameraPose, d: Vec3): CameraPose => ({
  position: [p.position[0] + d[0], p.position[1] + d[1], p.position[2] + d[2]],
  target: [p.target[0] + d[0], p.target[1] + d[1], p.target[2] + d[2]],
  fov: p.fov,
  roll: p.roll,
});

/** A camera path from a start pose and an ordered move list. Throws on a move outside 28-48 frames or overlapping moves. */
export const movesPath = (label: string, start: CameraPose, moves: readonly Move[]): CameraPath => {
  let prevEnd = -Infinity;
  for (const m of moves) {
    if (m.frames < MOVE_MIN_FRAMES || m.frames > MOVE_MAX_FRAMES) throw new Error(`${label}/${m.id}: camera move of ${m.frames} frames (allowed ${MOVE_MIN_FRAMES}-${MOVE_MAX_FRAMES} at 60 fps)`);
    if (f(m.t) < prevEnd) throw new Error(`${label}/${m.id}: camera move starts before the previous one stopped`);
    prevEnd = f(m.t) + m.frames;
  }
  return (t) => {
    let pose = start;
    for (const m of moves) {
      if (t < m.t) break;
      pose = blendPose(pose, m.to, outQuad(((t - m.t) * 60) / m.frames));
    }
    return pose;
  };
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** The camera basis (forward, right, up) with the roll applied, as the Stage's camera.rotateZ(roll) gives. */
const basis = (pose: CameraPose): [Vec3, Vec3, Vec3] => {
  const fwd = norm(sub(pose.target, pose.position));
  const r0 = norm(cross(fwd, [0, 1, 0]));
  const u0 = cross(r0, fwd);
  const c = Math.cos(pose.roll ?? 0);
  const s = Math.sin(pose.roll ?? 0);
  return [fwd, [r0[0] * c + u0[0] * s, r0[1] * c + u0[1] * s, r0[2] * c + u0[2] * s], [u0[0] * c - r0[0] * s, u0[1] * c - r0[1] * s, u0[2] * c - r0[2] * s]];
};

export interface Projected { x: number; y: number; /** px per world unit at that depth */ s: number }
/** World point to screen pixels, matching the Stage's perspective camera (for the 2D graphic layer). */
export const project = (pose: CameraPose, p: Vec3): Projected => {
  const [fwd, right, up] = basis(pose);
  const v = sub(p, pose.position);
  const z = Math.max(0.01, dot(v, fwd));
  const k = H / 2 / (z * Math.tan((pose.fov * Math.PI) / 360));
  return { x: W / 2 + dot(v, right) * k, y: H / 2 - dot(v, up) * k, s: k };
};

/** Screen pixel to the world point on the plane z = zp, through the same camera project() uses. */
export const unproject = (pose: CameraPose, px: number, py: number, zp = 0): [number, number] => {
  const [fwd, right, up] = basis(pose);
  const k = Math.tan((pose.fov * Math.PI) / 360);
  const nx = ((px - W / 2) / (H / 2)) * k;
  const ny = ((H / 2 - py) / (H / 2)) * k;
  const d: Vec3 = [fwd[0] + right[0] * nx + up[0] * ny, fwd[1] + right[1] * nx + up[1] * ny, fwd[2] + right[2] * nx + up[2] * ny];
  const s = (zp - pose.position[2]) / d[2];
  return [pose.position[0] + d[0] * s, pose.position[1] + d[1] * s];
};

// ---- continuous camera (round 4: the motion belongs to the camera and the space) ---------------------------
/** A continuous move from `from` to `to` over [t0, t1], at constant speed (a dolly never stops inside a shot). */
export const drift = (from: CameraPose, to: CameraPose, t0: number, t1: number): CameraPath => (t) => blendPose(from, to, Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
/** A camera punch on each hit: the fov narrows by `amt` (fraction) and eases back over 10 frames, no bounce. */
export const punched = (path: CameraPath, hits: readonly number[], amt = 0.06): CameraPath => (t) => {
  const p = path(t);
  const h = [...hits].reverse().find((x) => t >= x);
  if (h === undefined) return p;
  const u = (t - h) * 6;
  return u >= 1 ? p : { ...p, fov: p.fov * (1 - amt * (1 - outQuad(u))) };
};
/** The SVG transform that keeps a type layer authored in the screen space of `base` on the world plane z = zp under `pose`:
 *  type at zp > 0 sits in front of the girls (z = 0) and the set (z = -10), so a camera move parallaxes the
 *  three layers. `map` sends a HOME-screen point through the same transform. */
export const typePlane = (pose: CameraPose, base: CameraPose = HOME, zp = 1): { transform: string; map: (x: number, y: number) => [number, number] } => {
  // an affine map from three points of the plane: exact for a camera that only travels, and a close fit for the
  // low-angle shots, where the camera also rotates (round 5: scale-only drifted the type against the set)
  const at = (x: number, y: number) => {
    const w = unproject(base, x, y, zp);
    return project(pose, [w[0], w[1], zp]);
  };
  const pc = at(W / 2, H / 2);
  const px = at(W / 2 + 200, H / 2);
  const py = at(W / 2, H / 2 + 200);
  const a = (px.x - pc.x) / 200;
  const b = (px.y - pc.y) / 200;
  const c = (py.x - pc.x) / 200;
  const d = (py.y - pc.y) / 200;
  const e = pc.x - a * (W / 2) - c * (H / 2);
  const f = pc.y - b * (W / 2) - d * (H / 2);
  return { transform: `matrix(${a.toFixed(5)} ${b.toFixed(5)} ${c.toFixed(5)} ${d.toFixed(5)} ${e.toFixed(2)} ${f.toFixed(2)})`, map: (x, y) => [a * x + c * y + e, b * x + d * y + f] };
};
