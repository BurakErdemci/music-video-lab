// Deliberate low frame rate per layer: hold every frame for n frames (2 = on twos, 3, 4...).
import type { ReactNode } from 'react';
import { seeded } from './seeded.ts';
import { TimeRemap } from './TimeRemap.tsx';

/** The held frame: from `from` on, frames advance in steps of n; before it, frames pass through. */
export const holdFrames = (frame: number, n: number, from = 0): number => (frame < from || n <= 1 ? frame : from + Math.floor((frame - from) / n) * n);

/**
 * Renders its subtree on n-frame holds. Children that read useCurrentFrame() see the held frame
 * (via TimeRemap / Freeze); or pass a function to receive it. Effects driven by a `frame` prop can
 * call holdFrames directly instead.
 */
export const Stutter = ({ every, from = 0, children }: { every: number; from?: number; children: ReactNode | ((frame: number) => ReactNode) }) => (
  <TimeRemap map={(f) => holdFrames(f, every, from)}>{children}</TimeRemap>
);

/**
 * Seeded irregular holds (measured from the reference: holds drawn from {4,5,5,6,6,7}). Returns
 * the held frame. Each step must carry a real pose or offset change, or it reads as plain lag.
 */
export const seededHolds = (frame: number, seed: number, from = 0, choices: readonly number[] = [4, 5, 5, 6, 6, 7]): number => {
  if (frame < from) return frame;
  const rng = seeded(`holds:${seed}`);
  let t = from;
  for (;;) {
    const n = rng.pick(choices);
    if (frame < t + n) return t;
    t += n;
  }
};
