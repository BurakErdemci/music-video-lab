// Which lyric line goes where and when (pure: video/scripts/captioncheck.mjs measures the same windows).
// A line is on screen from its show frame until its end frame + LYRIC_FRAMES (LyricLine fades out over that).
import { ev } from '../events.ts';
import { LYRIC_FRAMES } from '../motion/entrances.ts';

export type LyricSide = 'left' | 'right' | 'seam';

export interface LyricSpec {
  n: number;
  side: LyricSide;
  y: number;
  size: number;
  inset?: number;
  show: number;
  /** Frame the fade-out starts (the hide event, or earlier so the next line on the same row starts clean). */
  end: number;
}

const ROW: Record<LyricSide, { y: number; inset?: number }> = { left: { y: 48 }, right: { y: 48, inset: 150 }, seam: { y: 1030 } };

const SIDES: readonly (readonly [number, LyricSide])[] = [
  [1, 'left'], [2, 'left'], [3, 'left'], [4, 'left'], [9, 'left'], [11, 'left'],
  [5, 'right'], [6, 'right'], [7, 'right'], [8, 'right'], [10, 'right'], [12, 'right'], [15, 'right'],
  [13, 'seam'], [14, 'seam'],
  // test2: verse 2 (AI), pre-chorus 2 (human), chorus 2
  [16, 'right'], [17, 'right'], [18, 'right'], [19, 'right'], [25, 'right'],
  [20, 'left'], [21, 'left'], [22, 'left'], [23, 'left'], [24, 'left'], [26, 'left'],
  [28, 'seam'], [29, 'seam'],
];

/** Two lines share a row when they are on the same side or either is a seam line (the seam line spans the glass). */
export const sameRow = (a: LyricSide, b: LyricSide): boolean => (a === 'seam') === (b === 'seam') && (a === b || a === 'seam');

/** From this line on (test2), a line's fade-out finishes before the next line on its row starts: the hide and the
 * next show can snap to the same beat (line 28 ends 123.09 s, line 29 starts 123.44 s, both on beat 263), and the two
 * overprinted for 8 frames (test2-v1 f1150). Lines 1-15 (Test90) are left as they were. */
const CLEAN_FROM = 16;

export const LYRICS: readonly LyricSpec[] = (() => {
  const out: LyricSpec[] = SIDES.map(([n, side]) => ({ n, side, size: 26, ...ROW[side], show: ev(`line${n}.show`).frame, end: ev(`line${n}.hide`).frame }));
  for (const a of out) {
    if (a.n < CLEAN_FROM) continue;
    const next = out.filter((b) => b !== a && sameRow(a.side, b.side) && b.show >= a.show).sort((p, q) => p.show - q.show)[0];
    if (next && next.show < a.end + LYRIC_FRAMES) a.end = next.show - LYRIC_FRAMES;
    if (a.end <= a.show + LYRIC_FRAMES) throw new Error(`line ${a.n}: no time on screen before line ${next?.n}`);
  }
  return out;
})();
