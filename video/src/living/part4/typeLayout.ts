// Part4 lyric captions and stamped key words: what, when and where (pure, so the checks lane can measure it).
// Same rules and look as parts 1-3 (part3/typeLayout.ts): one caption line at a time, a small torn cream label with
// navy text, by singer side (male top-left, female top-right, both centred on the seam); the stamped key word per line.
// Caption 37 is Part 3's last caption, unchanged in text, position and look until the vocal tail ends; its show is
// pulled back by CAPTION_FADE so the hard cut at 4676 finds it fully opaque. "Her sabah baştan" / "Ay dolar" heard
// again (timing.json heard_not_in_lyrics) are small captions without stamps: the tally marks are the counter.
// "Merhaba..." (211.06) and the last "Merhaba." (235.56) have no caption: the glass bubble and his screen say them.
import { TIMING } from '../../timing.ts';
import { stampWidth } from '../../type/stampLayout.ts';
import { CAPTION_FADE, CAPTION_SIZE, type Box, type StampSpec } from '../part1/typeLayout.ts';

export { CAPTION_FADE, CAPTION_SIZE };
export type { Box, StampSpec };
export interface CaptionSpec4 {
  n: number;
  text: string;
  show: number;
  hide: number;
  x: number;
  y: number;
  size: number;
}

const ADV = 0.6;
const PAD_X = 26;
const PAD_Y = 13;
const SMALL = 26;
const lineText = (n: number): string => (TIMING.lines[n] as { text: string }).text;
const width = (text: string, size: number): number => [...text].length * ADV * size;
type Side = 'm' | 'f' | 'b';
/** hide defaults to "gone (fade included) when the next caption shows". */
const C = (n: number, show: number, next: number, side: Side, o: { hide?: number; text?: string; size?: number } = {}): CaptionSpec4 => {
  const text = o.text ?? lineText(n);
  const size = o.size ?? CAPTION_SIZE;
  const w = width(text, size);
  const x = side === 'm' ? 64 : side === 'f' ? 1920 - 64 - w : 960 - w / 2;
  return { n, text, show, hide: o.hide ?? next - CAPTION_FADE, x, y: 44, size };
};
// Show = the beat nearest the sung line start; the heard repeat's second line starts at 192.16 s (song 5765).
export const CAPTIONS: readonly CaptionSpec4[] = [
  // continues part3's C(37, ..., 'f') exactly; vocal tail ends ~157.9 s (4737)
  { ...C(37, 4676 - CAPTION_FADE, 4737, 'f'), hide: 4737 },
  C(38, 5206, 5317, 'f'),
  C(39, 5317, 5428, 'f'),
  C(40, 5428, 5553, 'm'),
  C(41, 5553, 5650, 'f'),
  C(138, 5650, 5761, 'm', { text: lineText(38), size: SMALL }),
  C(139, 5761, 5872, 'f', { text: lineText(39), size: SMALL }),
  C(42, 5872, 5927, 'm', { hide: 5894 }),
  C(43, 5927, 5982, 'f', { hide: 5974 }),
  C(44, 5982, 6107, 'b', { hide: 6107 }),
];

const S = (text: string, show: number, hide: number, x: number, y: number, size: number, on: 'navy' | 'cream', ink?: 'yellow' | 'navy'): StampSpec => ({ text, show, hide, x, y, size, on, ink });
const rightAt = (text: string, size: number, edge: number): number => edge - stampWidth(text, size);
// Full cream (5206-5400): she stands mid-frame, his palm at the left edge, so the stamps sit low-right. Home split
// (5456-6395): moon at the seam (x 880-1040, y 110-270), captions in the top ~110 px, his tally wall low-left; his
// stamps top-left on navy, hers top-right on cream, "bir daha" (both) on her side below the moon, clear of both heads.
export const STAMPS: readonly StampSpec[] = [
  S('baştan', 5234, 5290, rightAt('baştan', 112, 1800), 650, 112, 'cream', 'navy'),
  S('ay', 5345, 5398, rightAt('ay', 130, 1800), 650, 130, 'cream', 'navy'),
  S('baştan', 5456, 5512, 100, 190, 112, 'navy'),
  S('ay', 5567, 5622, rightAt('ay', 130, 1800), 190, 130, 'cream', 'navy'),
  S('merhaba', 5872, 5920, 100, 190, 104, 'navy'),
  S('anlatırsın', 5941, 5990, rightAt('anlatırsın', 92, 1800), 190, 92, 'cream', 'navy'),
  S('bir daha', 6051, 6110, rightAt('bir daha', 96, 1800), 330, 96, 'cream', 'navy'),
];

export const captionBox = (c: CaptionSpec4): Box => ({ x: c.x - PAD_X, y: c.y - PAD_Y, w: width(c.text, c.size) + 2 * PAD_X, h: c.size * 1.35 + 2 * PAD_Y });
export const stampBox = (s: StampSpec): Box => {
  const w = stampWidth(s.text, s.size);
  return { x: s.x - 12, y: s.y - 10, w: w + 24, h: s.size * 1.12 + 20 };
};
