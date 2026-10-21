// Closed-form easing in seconds. No springs: direction.md bans overshoot and bounce.
export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const outQuad = (x: number): number => {
  const t = clamp01(x);
  return 1 - (1 - t) * (1 - t);
};
export const inQuad = (x: number): number => clamp01(x) ** 2;
export const inOutQuad = (x: number): number => {
  const t = clamp01(x);
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};
/** 0 before a, 1 after a + dur, linear between. */
export const ramp = (t: number, a: number, dur: number): number => clamp01((t - a) / dur);

export type Hex = `#${string}`;
/** Raw (gamma-encoded) 0..1 components of a #rrggbb colour: the whole stage works in raw values. */
export const rgb = (hex: Hex): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
export const mixHex = (a: Hex, b: Hex, t: number): Hex => {
  const x = rgb(a);
  const y = rgb(b);
  const c = x.map((v, i) => Math.round(255 * lerp(v, y[i] as number, clamp01(t))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
