// Part2 lyric captions and stamped key words: what, when and where (pure, so part2/checks.ts can measure it).
// Same rules and look as Part 1 (part1/typeLayout.ts): one caption line at a time, a small torn cream label with
// navy text, by singer side (male left on his navy side, female right on her cream side, both centred on the seam);
// the stamped moon-yellow key word per line. Caption 9 is Part 1's last caption, unchanged (the seam at 1706-1739).
import { TIMING } from '../../timing.ts';
import { stampWidth } from '../../type/stampLayout.ts';
import { CAPTION_FADE, CAPTION_SIZE, type Box, type CaptionSpec, type StampSpec } from '../part1/typeLayout.ts';

export { CAPTION_FADE, CAPTION_SIZE } from '../part1/typeLayout.ts';
export type { Box, StampSpec };
export interface CaptionSpec2 extends CaptionSpec {
  /** Font size (Part 1's 36 unless a "bir daha" line, which is small: the tally marks are the real counter). */
  size: number;
}

const ADV = 0.6;
const PAD_X = 26;
const PAD_Y = 13;
const SMALL = 26;

const lineText = (n: number): string => (TIMING.lines[n] as { text: string }).text;
const width = (text: string, size: number): number => [...text].length * ADV * size;
type Side = 'm' | 'f' | 'b';
const C = (n: number, show: number, hide: number, side: Side, y = 44, text = lineText(n), size = CAPTION_SIZE): CaptionSpec2 => {
  const w = width(text, size);
  const x = side === 'm' ? 64 : side === 'f' ? 1920 - 64 - w : 960 - w / 2;
  return { n, text, show, hide, x, y, size };
};
// Show = the beat at or just before the sung line; hide = the next caption's show.
const RAW: readonly CaptionSpec2[] = [
  { n: 9, text: lineText(9), show: 1726, hide: 1846, x: 64, y: 44, size: CAPTION_SIZE },
  C(10, 1846, 1944, 'f'),
  C(11, 1944, 1973, 'm'),
  C(12, 1973, 2001, 'f'),
  C(13, 2001, 2057, 'f'),
  C(14, 2057, 2140, 'm'),
  C(15, 2197, 2253, 'f', 44, lineText(15), SMALL),
  C(115, 2253, 2445, 'f', 44, 'Bir daha, bir daha, bir daha, bir daha', SMALL),
  C(16, 2688, 2801, 'f'),
  C(17, 2801, 2899, 'f'),
  C(18, 2899, 3025, 'f'),
  C(19, 3025, 3151, 'f'),
  C(20, 3151, 3207, 'm'),
  C(21, 3207, 3249, 'm'),
  C(22, 3249, 3319, 'm'),
  C(23, 3319, 3366, 'b', 940),
];
/** One caption at a time: a caption is gone (its fade included) when the next one shows, as in Part 1. */
export const CAPTIONS: readonly CaptionSpec2[] = RAW.map((c, i) => {
  const next = RAW[i + 1];
  return next ? { ...c, hide: Math.min(c.hide, next.show - CAPTION_FADE) } : c;
});

const S = (text: string, show: number, hide: number, x: number, y: number, size: number, on: 'navy' | 'cream', ink?: 'yellow' | 'navy'): StampSpec => ({ text, show, hide, x, y, size, on, ink });
export const STAMPS: readonly StampSpec[] = [
  S('biliyorum', 1955, 1985, 80, 600, 112, 'navy'),
  S('bilmiyorum', 1986, 2011, 1360, 640, 104, 'cream', 'navy'),
  S('buradayız', 2036, 2050, 960 - stampWidth('buradayız', 96) / 2, 18, 96, 'navy'),
  S('satır', 2762, 2800, 1300, 170, 118, 'cream', 'navy'),
  S('aynı hata', 2823, 2880, 160, 170, 104, 'cream', 'navy'),
  S('bitti', 2954, 2996, 160, 170, 118, 'cream', 'navy'),
  S('ölçülmemiş', 3116, 3150, 1100, 150, 96, 'cream', 'navy'),
  S('bakıyorum', 3243, 3256, 1470, 16, 96, 'cream', 'navy'),
  S('hatırlarım', 3298, 3319, 1380, 16, 96, 'cream', 'navy'),
];

export const captionBox = (c: CaptionSpec2): Box => ({ x: c.x - PAD_X, y: c.y - PAD_Y, w: width(c.text, c.size) + 2 * PAD_X, h: c.size * 1.35 + 2 * PAD_Y });
export const stampBox = (s: StampSpec): Box => {
  const w = stampWidth(s.text, s.size);
  return { x: s.x - 12, y: s.y - 10, w: w + 24, h: s.size * 1.12 + 20 };
};
