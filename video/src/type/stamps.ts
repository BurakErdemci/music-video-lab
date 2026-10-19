// The stamp words of 0:15-1:30 and where they go (pure: video/scripts/stampcheck.mjs measures the same spots).
import { AI, HUMAN } from '../scenes/acting.ts';
import { ev } from '../events.ts';
import { MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { STAMP_EXIT_FRAMES } from '../motion/entrances.ts';
import { placeStamp, type Box } from './stampLayout.ts';
import { cameraBox, cameraScale, CRATES_BOX, HATA_BOXES } from '../world/verse2Geom.ts';

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
  /** Seam words placed clear of both characters (chorus 2) instead of at a fixed centre. */
  seamFit?: boolean;
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
  // ---- test2: verse 2 (AI, right), pre-chorus 2 (human, left), chorus 2. The AI-side words keep off the crates and
  // the crossed-out cards, seen through the verse-2 camera
  { id: 'stamp.satir', hide: 'line16.hide', text: 'satır', x: 1300, y: 700, size: 118, side: 'ai' },
  { id: 'stamp.aynihata', hide: 'line17.hide', text: 'aynı hata', x: 1260, y: 640, size: 104, side: 'ai' },
  { id: 'stamp.bitti', hide: 'line18.hide', text: 'bitti', x: 1400, y: 420, size: 130, side: 'ai' },
  { id: 'stamp.olculmemis', hide: 'line19.hide', text: 'ölçülmemiş', x: 1260, y: 520, size: 100, side: 'ai', ink: 'navy' },
  { id: 'stamp.bakiyorum', hide: 'line21.hide', text: 'bakıyorum', x: 96, y: 620, size: 104, side: 'human' },
  { id: 'stamp.hatirlarim', hide: 'line22.hide', text: 'hatırlarım', x: 96, y: 700, size: 100, side: 'human' },
  { id: 'stamp.yetermi', hide: 'line23.hide', text: 'yeter mi', x: 96, y: 560, size: 118, side: 'human' },
  { id: 'stamp.bastan3', hide: 'line24.hide', text: 'baştan', x: 96, y: 500, size: 118, side: 'human' },
  { id: 'stamp.ay2', hide: 'line25.hide', text: 'ay', x: 1500, y: 560, size: 130, side: 'ai' },
  { id: 'stamp.biliyorum2', hide: 'line26.hide', text: 'biliyorum', x: 96, y: 500, size: 118, side: 'human' },
  { id: 'stamp.bilmiyorum2', hide: 'bilmiyorum2.hide', text: 'bilmiyorum', x: 1320, y: 500, size: 118, side: 'ai', ink: 'navy' },
  // chorus 2's "both" words (test2-v2): both characters stand at the glass then, so there is no room on the seam; they
  // go into the open cream room right of the AI in reversed navy print (navy word, yellow ghost), clear of both
  { id: 'stamp.buradayiz2', hide: 'line28.hide', text: 'buradayız', x: 1330, y: 600, size: 96, side: 'ai', ink: 'navy' },
  { id: 'stamp.birdaha2', hide: 'line29.hide', text: 'bir daha', x: 1360, y: 640, size: 96, side: 'ai', ink: 'navy' },
];
const CAM_IN = ev('camera.in');
const CAM_OUT = ev('camera.out');
const camView = (b: Box, f: number): Box => cameraBox(b, cameraScale(f, CAM_IN.frame, CAM_IN.enter.frames, CAM_OUT.frame, CAM_OUT.enter.frames));
/** AI-side props of verse 2 a word keeps clear of while it is up (the cards from their first entrance, the crates). */
const propsAt = (from: number, to: number): Box[] => {
  const out: Box[] = [];
  if (to > ev('crates.in').frame && from < ev('wave.c61').frame) out.push(CRATES_BOX);
  HATA_BOXES.forEach((b, k) => {
    if (to > ev(`hata.${k + 1}`).frame && from < ev('wave.c61').frame) out.push(b);
  });
  return out;
};
/** The moon and its halo: every stamp keeps off it (test90-v5: the two stamps on the glass sat on the moon). */
export const MOON_BOX = { x: SEAM_X - MOON_R - 20, y: MOON_SEAM_Y - MOON_R - 20, w: 2 * MOON_R + 40, h: 2 * MOON_R + 40 };
export const STAMPS = STAMP_DEFS.map((d) => {
  const room: readonly [number, number] = d.side === 'human' ? [0, SEAM_X] : d.side === 'ai' ? [SEAM_X, W] : [0, W];
  const from = ev(d.id).frame;
  const to = ev(d.hide).frame + STAMP_EXIT_FRAMES;
  const spot = placeStamp(
    {
      text: d.text,
      x: d.x,
      y: d.y,
      size: d.size,
      room,
      centerX: d.side === 'seam' ? (d.cx ?? SEAM_X) : undefined,
      from,
      to,
      avoid: [MOON_BOX],
      top: d.side === 'seam' && !d.seamFit ? d.y : undefined,
      ignoreActors: d.side === 'seam' && !d.seamFit,
      avoidWorld: d.side === 'ai' ? propsAt(from, to) : undefined,
      view: camView,
    },
    [HUMAN, AI],
  );
  return { ...d, spot, seam: d.side === 'seam', on: d.side === 'ai' ? ('cream' as const) : ('navy' as const) };
});

