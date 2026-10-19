// Where the notes on the human's side of the glass sit (pure: the scene and video/scripts/stampcheck.mjs share it).
import { seeded, range } from '../style/seeded.ts';
import { SEAM_X } from '../layout.ts';
import { glide } from '../motion/entrances.ts';

export const GN_SIZE = 50;
/** Slots on the human's side of the glass, under the moon: three columns by the seam, top to bottom. */
export const GLASS_SLOTS: readonly { x: number; y: number; rot: number }[] = (() => {
  const out: { x: number; y: number; rot: number }[] = [];
  for (let row = 0; row < 12; row++)
    for (const [c, x] of [925, 870, 815].entries()) {
      const r = seeded(`glass-slot:${row}:${c}`);
      out.push({ x: x + range(r, -5, 5), y: 300 + row * 56 + range(r, -6, 6), rot: range(r, -7, 7) });
    }
  return out;
})();

/** The human's "Merhaba" note on the glass (centre; GlassNote is a 104 px square). */
export const GLASS_NOTE = { x: SEAM_X - 52, y: 1000 - 570, size: 104 };

// ---- 2:02 "buradayiz": the palms' spot on the glass is cleared while the hands pass through (test2-v2: the notes
// around them made the crossing hard to read). Notes whose centre is in the zone slide out of the band, the ones
// above its middle up, below it down (the Merhaba note always down, up would put it on the moon); eased in before
// the hands move and back after.
export const CLEAR_ZONE = { x0: 790, x1: SEAM_X, y0: 345, y1: 565 };
const CLEAR_MID = (CLEAR_ZONE.y0 + CLEAR_ZONE.y1) / 2;
/** 0..1: how far the notes have moved out of the zone at a frame (in over `inF` ending at `from`, back over `outF`
 * from `to`). */
export const clearAmount = (frame: number, from: number, to: number, inF = 12, outF = 12): number => {
  if (frame < from - inF || frame >= to + outF) return 0;
  if (frame < from) return glide(frame, from - inF, inF);
  if (frame < to) return 1;
  return 1 - glide(frame, to, outF);
};
/** Vertical shift of a note at (x, y) with half-height `half` out of the zone, at clear amount `u`. */
export const clearShift = (x: number, y: number, half: number, u: number, down = false): number => {
  if (u <= 0 || x < CLEAR_ZONE.x0 || x > CLEAR_ZONE.x1 || y + half < CLEAR_ZONE.y0 || y - half > CLEAR_ZONE.y1) return 0;
  const target = down || y >= CLEAR_MID ? CLEAR_ZONE.y1 + half + 6 : CLEAR_ZONE.y0 - half - 6;
  return u * (target - y);
};
