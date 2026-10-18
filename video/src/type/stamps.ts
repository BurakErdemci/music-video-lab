// The stamp words of 0:15-1:30 and where they go (pure: video/scripts/stampcheck.mjs measures the same spots).
import { AI, HUMAN } from '../scenes/acting.ts';
import { ev } from '../events.ts';
import { MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { STAMP_EXIT_FRAMES } from '../motion/entrances.ts';
import { placeStamp } from './stampLayout.ts';

interface StampDef {
  id: string;
  hide: string;
  text: string;
  x: number;
  y: number;
  size: number;
  side: 'human' | 'ai' | 'seam';
  ink?: 'yellow' | 'navy';
  /** Seam words: the centre of the word (test90-v5: found clear of both characters' pixels, 14 px margin, over the
   * whole time the word is up, by scratchpad seamspot.mjs; a third of the word stays on each side of the glass). */
  cx?: number;
}
/** The stamp words and the spot each was asked for (v3's); STAMPS has where they actually go. */
const STAMP_DEFS: readonly StampDef[] = [
  { id: 'stamp.imlec', hide: 'line1.hide', text: 'imleç', x: 588, y: 490, size: 104, side: 'human' },
  { id: 'stamp.merhaba', hide: 'line2.hide', text: 'merhaba', x: 560, y: 490, size: 104, side: 'human' },
  { id: 'stamp.dun', hide: 'line3.hide', text: 'dün gece', x: 96, y: 500, size: 118, side: 'human' },
  { id: 'stamp.bastan1', hide: 'line4.hide', text: 'baştan', x: 96, y: 500, size: 118, side: 'human' },
  { id: 'stamp.defter', hide: 'line5.hide', text: 'defter', x: 1360, y: 300, size: 110, side: 'ai' },
  { id: 'stamp.anliyorum', hide: 'line7.hide', text: 'anlıyorum', x: 1250, y: 650, size: 110, side: 'ai' },
  { id: 'stamp.hatirla', hide: 'line8.hide', text: 'hatırlamıyorum', x: 1275, y: 650, size: 94, side: 'ai' },
  { id: 'stamp.bastan2', hide: 'line9.hide', text: 'baştan', x: 96, y: 500, size: 118, side: 'human' },
  { id: 'stamp.ay', hide: 'line10.hide', text: 'ay', x: 1250, y: 620, size: 130, side: 'ai' },
  { id: 'stamp.biliyorum', hide: 'line11.hide', text: 'biliyorum', x: 96, y: 500, size: 118, side: 'human' },
  { id: 'stamp.bilmiyorum', hide: 'line12.hide', text: 'bilmiyorum', x: 1250, y: 500, size: 118, side: 'ai', ink: 'navy' },
  { id: 'stamp.buradayiz', hide: 'line13.hide', text: 'buradayız', x: SEAM_X - 300, y: 654, size: 86, side: 'seam', cx: 1027 },
  { id: 'stamp.birdaha', hide: 'line14.hide', text: 'bir daha', x: SEAM_X - 260, y: 846, size: 82, side: 'seam', cx: 980 },
];
/** The moon and its halo: every stamp keeps off it (test90-v5: the two stamps on the glass sat on the moon). */
export const MOON_BOX = { x: SEAM_X - MOON_R - 20, y: MOON_SEAM_Y - MOON_R - 20, w: 2 * MOON_R + 40, h: 2 * MOON_R + 40 };
export const STAMPS = STAMP_DEFS.map((d) => {
  const room: readonly [number, number] = d.side === 'human' ? [0, SEAM_X] : d.side === 'ai' ? [SEAM_X, W] : [0, W];
  const spot = placeStamp(
    { text: d.text, x: d.x, y: d.y, size: d.size, room, centerX: d.side === 'seam' ? (d.cx ?? SEAM_X) : undefined, from: ev(d.id).frame, to: ev(d.hide).frame + STAMP_EXIT_FRAMES, avoid: [MOON_BOX], top: d.side === 'seam' ? d.y : undefined, ignoreActors: d.side === 'seam' },
    [HUMAN, AI],
  );
  return { ...d, spot, seam: d.side === 'seam', on: d.side === 'ai' ? ('cream' as const) : ('navy' as const) };
});

