// Small pure helpers shared by the timeline, the kinematics and the checks.

export const rad = (deg: number): number => (deg * Math.PI) / 180;
export const deg = (r: number): number => (r * 180) / Math.PI;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const inOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Deterministic hash of an integer to [0, 1). Replaces randomness everywhere in the rig. */
export const hash01 = (n: number): number => {
  let x = (Math.imul(n | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  return x / 4294967296;
};

/** 2D affine [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f. */
export type Affine = [number, number, number, number, number, number];
export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];
export const mul = (m: Affine, n: Affine): Affine => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
export const translate = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];
export const rotate = (r: number): Affine => [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
export const flipX: Affine = [-1, 0, 0, 1, 0, 0];
export const apply = (m: Affine, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** Rotation angle (radians) of an affine without shear/flip. */
export const angleOf = (m: Affine): number => Math.atan2(m[1], m[0]);
