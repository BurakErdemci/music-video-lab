// Part1 lyric captions and stamped key words: what, when and where (pure, so part1/checks.ts can measure it).
// One caption line at a time; every caption is a small torn cream label with navy text, so it reads on the navy room,
// the cream screen, her cream world and the page close-ups alike. Stamps: the moon-yellow key word per line.
import { TIMING } from '../../timing.ts';
import { stampWidth } from '../../type/stampLayout.ts';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface CaptionSpec {
  n: number;
  text: string;
  show: number;
  hide: number;
  x: number;
  y: number;
}
export interface StampSpec {
  text: string;
  show: number;
  hide: number;
  x: number;
  y: number;
  size: number;
  on: 'navy' | 'cream';
  ink?: 'yellow' | 'navy';
}

export const CAPTION_SIZE = 36;
/** IBM Plex Mono advance, em. */
const ADV = 0.6;
const PAD_X = 26;
const PAD_Y = 13;
export const CAPTION_FADE = 8;

const lineText = (n: number): string => (TIMING.lines[n] as { text: string }).text;

// Show / hide in song frames: the show snaps to the beat at or just before the sung line, the hide to the next line.
/** x = 0: right-aligned 64 px from the frame's right edge (the left side is taken by a character then). */
const C = (n: number, show: number, hide: number, x: number, y: number): CaptionSpec => {
  const text = lineText(n);
  return { n, text, show, hide, x: x === 0 ? 1920 - 64 - [...text].length * ADV * CAPTION_SIZE : x, y };
};
export const CAPTIONS: readonly CaptionSpec[] = [
  C(1, 482, 629, 0, 44),
  C(2, 693, 846, 0, 44),
  C(3, 890, 1046, 64, 44),
  C(4, 1054, 1262, 64, 44),
  C(5, 1298, 1360, 0, 44),
  C(6, 1368, 1417, 64, 44),
  C(7, 1425, 1487, 64, 44),
  C(8, 1495, 1640, 64, 44),
  C(9, 1726, 1760, 64, 44),
];

const S = (text: string, show: number, hide: number, x: number, y: number, size: number, on: 'navy' | 'cream', ink?: 'yellow' | 'navy'): StampSpec => ({ text, show, hide, x, y, size, on, ink });
export const STAMPS: readonly StampSpec[] = [
  S('imleç', 581, 629, 1240, 170, 112, 'navy'),
  S('merhaba', 698, 722, 1180, 150, 104, 'navy'),
  S('dün gece', 904, 1024, 1440, 150, 100, 'cream'),
  S('baştan', 1059, 1136, 1460, 140, 112, 'cream'),
  S('defter', 1318, 1360, 1180, 190, 118, 'cream'),
  S('anlıyorum', 1453, 1486, 1270, 170, 100, 'cream'),
  S('hatırlamıyorum', 1529, 1640, 70, 130, 82, 'cream'),
];

export const captionBox = (c: CaptionSpec): Box => ({ x: c.x - PAD_X, y: c.y - PAD_Y, w: [...c.text].length * ADV * CAPTION_SIZE + 2 * PAD_X, h: CAPTION_SIZE * 1.35 + 2 * PAD_Y });
/** Stamp box incl. the 1.15 squash and rotation room (stampLayout's measure). */
export const stampBox = (s: StampSpec): Box => {
  const w = stampWidth(s.text, s.size);
  return { x: s.x - 12, y: s.y - 10, w: w + 24, h: s.size * 1.12 + 20 };
};
export const CAPTION_PAD = { x: PAD_X, y: PAD_Y };
