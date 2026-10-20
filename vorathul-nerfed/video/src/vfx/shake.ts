import { seeded } from './seeded.ts';

export interface ShakeOffset {
  /** Offset in the caller's units (px for DOM, world units for the stage camera) at strength 1 = 1 unit. */
  x: number;
  y: number;
  /** Radians. */
  rot: number;
}

const ZERO: ShakeOffset = { x: 0, y: 0, rot: 0 };

/**
 * Decaying camera shake for an impact at `start`. Pure: the same arguments always give the same
 * offset. A sum of three detuned sines per axis with seeded phases, under an exponential envelope
 * that falls to ~2 % after `frames`; it starts at full kick so the impact frame itself jolts.
 */
export const shake = (frame: number, start: number, strength: number, seed: number, frames = 14): ShakeOffset => {
  const t = frame - start;
  if (t < 0 || t > frames) return ZERO;
  const rng = seeded(`shake:${seed}`);
  const env = strength * Math.exp((-4 * t) / frames);
  const axis = (): number => {
    let v = 0;
    for (let k = 0; k < 3; k++) v += Math.sin(t * rng.range(1.6, 3.1) + rng() * Math.PI * 2) / (k + 1);
    return v / 1.83;
  };
  return { x: env * axis(), y: env * axis(), rot: env * axis() * 0.012 };
};

/** Several impacts' shakes summed (overlapping hits stack). */
export const shakeSum = (frame: number, hits: readonly { start: number; strength: number; seed: number }[], frames = 14): ShakeOffset =>
  hits.reduce<ShakeOffset>((acc, h) => {
    const s = shake(frame, h.start, h.strength, h.seed, frames);
    return { x: acc.x + s.x, y: acc.y + s.y, rot: acc.rot + s.rot };
  }, ZERO);
