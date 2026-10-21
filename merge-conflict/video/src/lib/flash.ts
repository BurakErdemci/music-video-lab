// Flash budget (architecture.md): at most 3 large luminance swings in any 1-second window, counted
// strictly (every swing is one flash; the sibling measured that counting pairs let flashcheck fail).
// Every white-out, burst and hue flip registers its swings; assertFlashBudget throws at module load.
import { f } from '../timing.ts';

export const MAX_FLASHES_PER_SECOND = 3;
export interface Swing { id: string; t: number; swings: number }

/** Largest number of swings inside any 1-second window [t, t + 1 s), measured in 60 fps frames. */
export const flashRate = (swings: readonly Swing[]): number => {
  const s = [...swings].sort((a, b) => a.t - b.t);
  let max = 0;
  for (let i = 0; i < s.length; i++) {
    let sum = 0;
    const from = f((s[i] as Swing).t);
    for (let j = i; j < s.length && f((s[j] as Swing).t) < from + 60; j++) sum += (s[j] as Swing).swings;
    max = Math.max(max, sum);
  }
  return max;
};

export const assertFlashBudget = (swings: readonly Swing[], label: string): void => {
  const r = flashRate(swings);
  if (r > MAX_FLASHES_PER_SECOND) throw new Error(`${label}: ${r} flashes in one second (limit ${MAX_FLASHES_PER_SECOND})`);
};
