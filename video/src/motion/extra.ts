// Small pure motion helpers for the 0:30-1:28 scenes (no remotion import: node tools can load this too).
import { clamp01 } from '../math.ts';
import { progress, springOut } from './entrances.ts';

/** A prop dropped from `height` px above its resting place: ease-in fall, one small bounce, rest. y offset is <= 0. */
export const dropBounce = (frame: number, start: number, frames: number, height: number, bounce = 20): { oy: number; rot: number; op: number } => {
  const t = progress(frame, start, frames);
  const FALL = 0.6;
  const BOUNCE_END = 0.86;
  let oy = 0;
  if (t < FALL) {
    const u = t / FALL;
    oy = -height * (1 - u * u);
  } else if (t < BOUNCE_END) {
    const u = (t - FALL) / (BOUNCE_END - FALL);
    oy = -bounce * 4 * u * (1 - u);
  }
  return { oy, rot: 9 * (1 - springOut(t)), op: clamp01((frame - start + 1) / 5) };
};

/** Seeded shuffle order of n slots (Fisher-Yates with a given rng). */
export const shuffled = (n: number, rng: () => number): number[] => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as number, a[i] as number];
  }
  return a;
};
