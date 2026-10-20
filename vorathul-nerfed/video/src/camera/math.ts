import type { Vec3 } from '../stage/Card.tsx';

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: Vec3): Vec3 => scale(a, 1 / (len(a) || 1));
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const rad = (deg: number): number => (deg * Math.PI) / 180;
export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Camera right and up axes for a camera at `position` looking at `target` (world up = +Y). */
export const basis = (position: Vec3, target: Vec3): { fwd: Vec3; right: Vec3; up: Vec3 } => {
  const fwd = norm(sub(target, position));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  return { fwd, right, up };
};

/** Direction as yaw (around +Y, 0 = looking down -Z, positive = turning towards +X) and pitch (positive = up). */
export const dirFromAngles = (yawDeg: number, pitchDeg: number): Vec3 => {
  const y = rad(yawDeg);
  const p = rad(pitchDeg);
  return [Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)];
};
export const anglesFromDir = (d: Vec3): { yaw: number; pitch: number } => ({
  yaw: (Math.atan2(d[0], -d[2]) * 180) / Math.PI,
  pitch: (Math.asin(Math.max(-1, Math.min(1, d[1] / (len(d) || 1)))) * 180) / Math.PI,
});
