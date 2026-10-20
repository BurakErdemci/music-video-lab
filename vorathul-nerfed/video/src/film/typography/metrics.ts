// Glyph advances in em, read from public/fonts/Anton-Regular.ttf (hmtx via cmap, unitsPerEm 2048) so a slam's
// width is known when the schedule is built: letters are placed by these advances, never measured in the DOM.
// Plain .ts: tools/beatcheck.mjs loads schedule.ts, which imports this file.
const ANTON_ADV: Record<string, number> = {
  A: 0.4854, B: 0.4785, C: 0.4741, D: 0.4932, E: 0.4116, F: 0.3989, G: 0.4849, H: 0.499, I: 0.2266, J: 0.4663,
  K: 0.4722, L: 0.3975, M: 0.7461, N: 0.498, O: 0.4863, P: 0.4722, Q: 0.4937, R: 0.4766, S: 0.4614, T: 0.3955,
  U: 0.4736, V: 0.4692, W: 0.7119, X: 0.4839, Y: 0.4463, Z: 0.4102, '0': 0.4941, '1': 0.3306, '2': 0.4941,
  '3': 0.4941, '4': 0.4941, '5': 0.4941, '6': 0.4941, '7': 0.4941, '8': 0.4941, '9': 0.4941, '!': 0.229,
  '?': 0.4922, '-': 0.311, '.': 0.2285, '·': 0.2344, "'": 0.2139, ' ': 0.2344,
};
/** OS/2 sCapHeight 1760 / 2048. */
export const ANTON_CAP = 0.859;
/** IBM Plex Mono: every advance is 600/1000; sCapHeight 698/1000. */
export const MONO_ADV = 0.6;
export const MONO_CAP = 0.698;

/** Extra tracking of the slam lettering, in em per letter. */
export const SLAM_TRACK = 0.04;

export const antonAdvance = (ch: string): number => {
  const a = ANTON_ADV[ch];
  if (a === undefined) throw new Error(`typography: no Anton advance for "${ch}"`);
  return a;
};

/** Left edge (in em) of every letter and the total width (em) of a line set in Anton with `track` em of tracking. */
export const antonLayout = (text: string, track = SLAM_TRACK): { xs: number[]; width: number } => {
  const xs: number[] = [];
  let x = 0;
  for (const ch of text) {
    xs.push(x);
    x += antonAdvance(ch) + track;
  }
  return { xs, width: x - track };
};
