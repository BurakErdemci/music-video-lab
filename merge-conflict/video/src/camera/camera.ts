// 2.5D camera (architecture.md "camera/"): position, target and FOV paths in seconds. A move is an
// outQuad of 28-48 frames at 60 fps that ends at exactly zero speed, then a full stop (no overshoot).
// Moves are checked at module load: a move outside 28-48 frames throws.
import { lerp, outQuad } from '../lib/ease.ts';
import { f } from '../timing.ts';

export type Vec3 = [number, number, number];
export interface CameraPose { position: Vec3; target: Vec3; fov: number }
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
});

/** Shift a pose by (dx, dy, dz) on both position and target: a truck/pedestal/dolly. */
export const shifted = (p: CameraPose, d: Vec3): CameraPose => ({
  position: [p.position[0] + d[0], p.position[1] + d[1], p.position[2] + d[2]],
  target: [p.target[0] + d[0], p.target[1] + d[1], p.target[2] + d[2]],
  fov: p.fov,
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

export interface Projected { x: number; y: number; /** px per world unit at that depth */ s: number }
/** World point to screen pixels, matching the Stage's perspective camera (for the 2D graphic layer). */
export const project = (pose: CameraPose, p: Vec3): Projected => {
  const fwd = norm(sub(pose.target, pose.position));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const v = sub(p, pose.position);
  const z = Math.max(0.01, dot(v, fwd));
  const k = H / 2 / (z * Math.tan((pose.fov * Math.PI) / 360));
  return { x: W / 2 + dot(v, right) * k, y: H / 2 - dot(v, up) * k, s: k };
};
