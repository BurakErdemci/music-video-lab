// Small pure helpers for the p5 shots: event frames, easing, and the stage camera's projection so 2D overlays
// (ink, cursors, UI) sit exactly on 3D cards, shake included.
import { basis, type CameraPose } from '../../../camera/api.ts';
import type { Vec3 } from '../../../stage/Card.tsx';
import { DEFAULT_FOV } from '../../../stage/Stage.tsx';
import { EVENTS } from '../events.ts';

const BY_ID = new Map(EVENTS.map((e) => [e.id, e.frame]));

/** Frame of a p5 event (storyboard Appendix A); throws on a typo so no frame is ever guessed. */
export const E = (id: string): number => {
  const f = BY_ID.get(`p5-${id}`);
  if (f === undefined) throw new Error(`p5: no event ${id}`);
  return f;
};

export const W = 1920;
export const H = 1080;
export const ASPECT = W / H;

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const prog = (frame: number, start: number, dur: number): number => (dur <= 0 ? (frame >= start ? 1 : 0) : clamp01((frame - start) / dur));
export const outCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const inCubic = (t: number): number => clamp01(t) ** 3;
export const inOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
export const outBack = (t: number, k = 1.7): number => {
  const x = clamp01(t) - 1;
  return 1 + (k + 1) * x * x * x + k * x * x;
};
/** Steps a value on twos (2D overlays move at 15 fps, contract). */
export const twos = (frame: number): number => frame - (((frame % 2) + 2) % 2);

/** World point -> frame px for a camera pose (three's lookAt with +Y up, vertical fov). z = view depth. */
export const project = (pose: CameraPose, p: Vec3): { x: number; y: number; z: number } => {
  const { fwd, right, up } = basis(pose.position, pose.target);
  const v: Vec3 = [p[0] - pose.position[0], p[1] - pose.position[1], p[2] - pose.position[2]];
  const z = v[0] * fwd[0] + v[1] * fwd[1] + v[2] * fwd[2];
  const x = v[0] * right[0] + v[1] * right[1] + v[2] * right[2];
  const y = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];
  const t = Math.tan(((pose.fov ?? DEFAULT_FOV) * Math.PI) / 360);
  const zz = Math.max(1e-3, z);
  return { x: ((x / (zz * t * ASPECT) + 1) / 2) * W, y: ((1 - y / (zz * t)) / 2) * H, z };
};

/** Frame px at view depth `depth` -> world point (the inverse of project). */
export const unproject = (pose: CameraPose, px: number, py: number, depth: number): Vec3 => {
  const { fwd, right, up } = basis(pose.position, pose.target);
  const t = Math.tan(((pose.fov ?? DEFAULT_FOV) * Math.PI) / 360);
  const x = ((px / W) * 2 - 1) * depth * t * ASPECT;
  const y = (1 - (py / H) * 2) * depth * t;
  return [
    pose.position[0] + fwd[0] * depth + right[0] * x + up[0] * y,
    pose.position[1] + fwd[1] * depth + right[1] * x + up[1] * y,
    pose.position[2] + fwd[2] * depth + right[2] * x + up[2] * y,
  ];
};

/** Px per world unit at a view depth (for sizing overlays to a 3D thing). */
export const pxPerUnit = (pose: CameraPose, depth: number): number => H / (2 * Math.max(1e-3, depth) * Math.tan(((pose.fov ?? DEFAULT_FOV) * Math.PI) / 360));

/** Camera pitch in radians (negative looking down), for billboarding cards toward a high camera. */
export const pitchOf = (pose: CameraPose): number => {
  const d = [pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]];
  return Math.atan2(d[1] as number, Math.hypot(d[0] as number, d[2] as number));
};
