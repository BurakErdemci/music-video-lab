// Small pure helpers of lane p3: projection from the stage camera to screen pixels, easing, ranges.
import { basis, type CameraPath, type CameraPose } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { DEFAULT_FOV } from '../../stage/Stage.tsx';

export const W = 1920;
export const H = 1080;

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** 0..1 progress of frame through [a, a + len]. */
export const prog = (frame: number, a: number, len: number): number => (len <= 0 ? (frame >= a ? 1 : 0) : clamp01((frame - a) / len));
export const easeOut = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const easeIn = (t: number): number => clamp01(t) ** 3;
export const easeInOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
export const easeOutBack = (t: number, k = 1.8): number => {
  const x = clamp01(t) - 1;
  return 1 + (k + 1) * x * x * x + k * x * x;
};
/** Overlay motion on twos (storyboard rule: 2D overlays step at 15 fps). */
export const twos = (frame: number): number => frame - (((frame % 2) + 2) % 2);
/** Value that pops through `vals` at the given frames (step function). */
export const steps = <T>(frame: number, keys: readonly [number, T][], init: T): T => {
  let v = init;
  for (const [f, x] of keys) if (frame >= f) v = x;
  return v;
};
/** Linear interpolation through sorted [frame, value] keys, clamped at both ends. */
export const keyed = (frame: number, keys: readonly [number, number][], ease: (t: number) => number = easeInOut): number => {
  const first = keys[0] as [number, number];
  if (frame <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [fb, vb] = keys[i] as [number, number];
    const [fa, va] = keys[i - 1] as [number, number];
    if (frame <= fb) return lerp(va, vb, ease((frame - fa) / Math.max(1, fb - fa)));
  }
  return (keys[keys.length - 1] as [number, number])[1];
};

export interface Screen {
  x: number;
  y: number;
  /** Pixels per world unit at that depth. */
  s: number;
  /** Distance in front of the camera (negative = behind). */
  z: number;
}

/** World point to screen pixels for the Stage camera (vertical fov, 16:9, up = +Y). */
export const project = (pose: CameraPose, p: Vec3): Screen => {
  const { fwd, right, up } = basis(pose.position, pose.target);
  const r: Vec3 = [p[0] - pose.position[0], p[1] - pose.position[1], p[2] - pose.position[2]];
  const z = r[0] * fwd[0] + r[1] * fwd[1] + r[2] * fwd[2];
  const x = r[0] * right[0] + r[1] * right[1] + r[2] * right[2];
  const y = r[0] * up[0] + r[1] * up[1] + r[2] * up[2];
  const t = Math.tan(((pose.fov ?? DEFAULT_FOV) * Math.PI) / 360);
  const s = H / 2 / (Math.max(1e-3, z) * t);
  return { x: W / 2 + x * s, y: H / 2 - y * s, s, z };
};

/** A camera path evaluated once per frame and shared by the Stage and the DOM overlays. */
export const poseAt = (path: CameraPath, frame: number): CameraPose => path(frame);
