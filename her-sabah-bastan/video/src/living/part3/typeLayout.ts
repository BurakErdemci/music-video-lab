// Part3 lyric captions, stamped key words and the line counter: what, when and where (pure, so part3/checks.ts can
// measure it). Same rules and look as parts 1-2: one caption line at a time, a small torn cream label with navy text,
// by singer side (male left, female right, both centred); the moon-yellow stamped key word per line.
// Caption 23 ("İkimize yeter mi bu") is Part 2's last caption, drawn with Part 2's exact numbers (part2/typeLayout.ts:
// C(23, 3319, 3366, 'b', 940)) so the seam at 3340 continues it unchanged.
import { TIMING } from '../../timing.ts';
import { stampWidth } from '../../type/stampLayout.ts';
import { CAPTION_FADE, CAPTION_SIZE, type Box, type StampSpec } from '../part1/typeLayout.ts';

export { CAPTION_FADE, CAPTION_SIZE };
export type { Box, StampSpec };
export interface CaptionSpec3 {
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
const lineText = (n: number): string => (TIMING.lines[n] as { text: string }).text;
const width = (text: string, size: number): number => [...text].length * ADV * size;
type Side = 'm' | 'f' | 'b';
const C = (n: number, show: number, next: number, side: Side, y = 44): CaptionSpec3 => {
  const text = lineText(n);
  const w = width(text, CAPTION_SIZE);
  const x = side === 'm' ? 64 : side === 'f' ? 1920 - 64 - w : 960 - w / 2;
  // hide early enough that the fade-out ends before the next caption shows (one line at a time)
  return { n, text, show, hide: next - CAPTION_FADE, x, y, size: CAPTION_SIZE };
};
// Show = the beat at or just before the sung line.
export const CAPTIONS: readonly CaptionSpec3[] = [
  { n: 23, text: lineText(23), show: 3319, hide: 3366, x: 960 - width(lineText(23), CAPTION_SIZE) / 2, y: 940, size: CAPTION_SIZE },
  C(24, 3376, 3474, 'm'),
  C(25, 3474, 3586, 'f'),
  C(26, 3586, 3614, 'm'),
  C(27, 3614, 3656, 'f'),
  C(28, 3656, 3698, 'b'),
  C(29, 3698, 3880, 'b'),
  C(30, 3880, 3992, 'm'),
  C(31, 3992, 4076, 'm'),
  C(32, 4076, 4202, 'm'),
  C(33, 4202, 4299, 'm'),
  C(34, 4299, 4425, 'f'),
  C(35, 4425, 4537, 'f'),
  C(36, 4537, 4635, 'f'),
  { ...C(37, 4635, 4700, 'f'), hide: 4700 },
];

const S = (text: string, show: number, hide: number, x: number, y: number, size: number, on: 'navy' | 'cream', ink?: 'yellow' | 'navy'): StampSpec => ({ text, show, hide, x, y, size, on, ink });
const centredOn = (text: string, size: number, cx: number): number => cx - stampWidth(text, size) / 2;
export const STAMPS: readonly StampSpec[] = [
  S('baştan', 3404, 3462, 1330, 150, 112, 'navy'),
  S('ay', 3474, 3530, 1620, 130, 130, 'navy'),
  S('biliyorum', 3586, 3612, 40, 150, 78, 'cream', 'navy'),
  S('bilmiyorum', 3614, 3652, 1500, 640, 72, 'cream', 'navy'),
  S('buradayız', 3656, 3694, centredOn('buradayız', 96, 1100), 690, 96, 'navy'),
  S('bir daha', 3698, 3772, 60, 860, 96, 'navy'),
  S('kurduk', 3950, 3990, 820, 150, 112, 'navy'),
  S('sildik', 4034, 4072, 1180, 640, 120, 'navy'),
  S('tek bir tık', 4188, 4228, 1060, 700, 104, 'navy'),
  S('yedek', 4229, 4282, 1200, 150, 112, 'navy'),
  S('unutmaya', 4467, 4520, 80, 150, 84, 'navy'),
  S('boşuna değildi', 4537, 4610, 1180, 860, 76, 'navy'),
];

/** "On yedi bin satır": the counter runs up to 17.703 (accelerating), freezes on the click, fades on "Yedek". */
export const COUNTER = { show: 4076, click: 4188, hide: 4202, x: 1440, y: 130, size: 132, target: 17703 } as const;
export const counterValue = (f: number): number => {
  const u = Math.min(1, Math.max(0, (f - COUNTER.show) / (COUNTER.click - COUNTER.show)));
  return Math.round(COUNTER.target * Math.pow(u, 2.2));
};
export const counterText = (v: number): string => v.toLocaleString('tr-TR').replace(/,/g, '.');
export const counterBox = (): Box => ({ x: COUNTER.x - 12, y: COUNTER.y - 50, w: stampWidth('17.703', COUNTER.size) + 24, h: COUNTER.size * 1.12 + 70 });

export const captionBox = (c: CaptionSpec3): Box => ({ x: c.x - PAD_X, y: c.y - PAD_Y, w: width(c.text, c.size) + 2 * PAD_X, h: c.size * 1.35 + 2 * PAD_Y });
export const stampBox = (s: StampSpec): Box => {
  const w = stampWidth(s.text, s.size);
  return { x: s.x - 12, y: s.y - 10, w: w + 24, h: s.size * 1.12 + 20 };
};
