// The beat grid as LOCAL lengths. A song's tempo is not one number: take-v1's intro robot section was fitted at
// 156 BPM while the song runs at 180, and the downbeat tracker inserts 3- and 5-beat bars. So every length is
// the spacing of the measured beats (or downbeats) around t; only outside the measured grid does a value fall
// back to the MEDIAN spacing (never the first interval, never the mean BPM).
// Pure functions of the arrays, erasable TypeScript: timing.ts binds them to the film's data, and
// tools/gridcheck.mjs runs them against other takes.

export const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) throw new Error('median of an empty list');
  return n % 2 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
};
export const medianStep = (grid: readonly number[]): number => median(grid.slice(1).map((v, i) => v - (grid[i] as number)));

/** Index i of the grid interval [grid[i], grid[i + 1]) holding t; -1 before the grid, n - 1 after it. */
const intervalOf = (grid: readonly number[], t: number): number => {
  const n = grid.length;
  if (t < (grid[0] as number)) return -1;
  if (t >= (grid[n - 1] as number)) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if ((grid[m] as number) <= t) lo = m;
    else hi = m;
  }
  return lo;
};

/** Continuous position on a grid (index plus fraction), local inside it, median-extrapolated outside. */
export const gridPos = (grid: readonly number[], t: number, step = medianStep(grid)): number => {
  const i = intervalOf(grid, t);
  const n = grid.length;
  if (i < 0) return (t - (grid[0] as number)) / step;
  if (i >= n - 1) return n - 1 + (t - (grid[n - 1] as number)) / step;
  return i + (t - (grid[i] as number)) / ((grid[i + 1] as number) - (grid[i] as number));
};

/** Length of the grid interval holding t (the beat or the bar t is in); the median outside the grid. */
export const gridLenAt = (grid: readonly number[], t: number, step = medianStep(grid)): number => {
  const i = intervalOf(grid, t);
  return i < 0 || i >= grid.length - 1 ? step : (grid[i + 1] as number) - (grid[i] as number);
};

/** Time at a continuous grid position (inverse of gridPos). */
export const gridTime = (grid: readonly number[], pos: number, step = medianStep(grid)): number => {
  const n = grid.length;
  if (pos <= 0) return (grid[0] as number) + pos * step;
  if (pos >= n - 1) return (grid[n - 1] as number) + (pos - (n - 1)) * step;
  const i = Math.floor(pos);
  return (grid[i] as number) + (pos - i) * ((grid[i + 1] as number) - (grid[i] as number));
};
