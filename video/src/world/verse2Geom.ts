// Geometry and maths of 1:28.7-2:12 shared by the scene (world/Verse2.tsx) and the node checks (type/stamps.ts,
// video/scripts/stampcheck.mjs): no react here.
import { FLOOR_Y, H, W } from '../layout.ts';
import { glide } from '../motion/entrances.ts';
import { seeded, range } from '../style/seeded.ts';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---- the crates and their lamps (verse 2)
/** The crates on the AI's floor (centre x), and their size. */
export const CRATE_XS: readonly number[] = [1345, 1448, 1551, 1654, 1757, 1860];
export const CRATE_W = 92;
export const CRATE_H = 100;
/** The front rim, the back rim (seen a little from above), the top of the lamp posts. */
export const CRATE_TOP = FLOOR_Y - CRATE_H;
export const RIM_BACK = CRATE_TOP - 40;
export const POST_TOP = RIM_BACK - 36;
export const BULB_R = 13;
/** Where the lamps' bulbs are (the camera frames these). */
export const LAMP_Y = POST_TOP - BULB_R + 2;
/** Everything the crates and lit lamps cover (halos and rays included). */
export const CRATES_BOX: Box = { x: (CRATE_XS[0] as number) - 70, y: LAMP_Y - 60, w: (CRATE_XS[5] as number) - (CRATE_XS[0] as number) + 140, h: FLOOR_Y - LAMP_Y + 60 };

/** "ayni hata": the same crossed-out card, three times (PageSketch: 168 x 128 about its centre). */
// (60 px lower than test2-v1: under the 1.5x camera the highest card's top edge ran into the lyric line, y 36 on screen)
export const HATA: readonly { x: number; y: number; rot: number }[] = [
  { x: 1420, y: 360, rot: -3 },
  { x: 1640, y: 290, rot: 2 },
  { x: 1830, y: 390, rot: -2 },
];
export const HATA_BOXES: readonly Box[] = HATA.map((h) => ({ x: h.x - 92, y: h.y - 72, w: 184, h: 144 }));

// ---- the camera (verse 2): leans in on the lamps, pulls back to show the crates are empty
/** The close framing: scale, and the point that stays put while scaling (so every edge moves one way only). It
 * frames x 640..1920 and down to just under the lamps; the crates' open tops stay below the frame until the
 * pull-back. */
export const CAM_S = 1.5;
const VIEW_X0 = W - W / CAM_S;
const VIEW_Y0 = LAMP_Y + BULB_R + 18 - H / CAM_S;
const FIX = { x: (VIEW_X0 * CAM_S) / (CAM_S - 1), y: (VIEW_Y0 * CAM_S) / (CAM_S - 1) };

/** Camera zoom at a frame: 1 outside [inStart, outStart + outFrames). */
export const cameraScale = (frame: number, inStart: number, inFrames: number, outStart: number, outFrames: number): number => {
  if (frame < inStart || frame >= outStart + outFrames) return 1;
  const u = frame < outStart ? glide(frame, inStart, inFrames) : 1 - glide(frame, outStart, outFrames);
  return 1 + (CAM_S - 1) * u;
};
/** The svg transform for a camera scale `s` (null when 1). */
export const cameraTransform = (s: number): string | null =>
  s === 1 ? null : `translate(${(FIX.x * (1 - s)).toFixed(2)} ${(FIX.y * (1 - s)).toFixed(2)}) scale(${s.toFixed(5)})`;
/** A world box as the camera shows it at scale `s` (screen coordinates). */
export const cameraBox = (b: Box, s: number): Box => ({ x: FIX.x + (b.x - FIX.x) * s, y: FIX.y + (b.y - FIX.y) * s, w: b.w * s, h: b.h * s });

// ---- 2:02 "buradayiz": the hands pass through the glass
/** How far each character leans through the glass (px toward the other side) at a frame: eased in over `inF` up to
 * `at`, held `holdF`, eased back over `outF`. */
export const crossPush = (frame: number, at: number, inF: number, holdF: number, outF: number, dist: number): number => {
  const a = at - inF;
  if (frame < a || frame >= at + holdF + outF) return 0;
  if (frame < at) return dist * glide(frame, a, inF);
  if (frame < at + holdF) return dist;
  return dist * (1 - glide(frame, at + holdF, outF));
};

/** 2:02 crossing: how far (px), how long the hands stay through, how long they take back (the way in takes the
 * cross.hands event's frames). Push 60 px: the palms ~55 px through; his head front is at x 885, hers ~1030. */
export const CROSS_DIST = 60;
export const CROSS_HOLD = 18;
export const CROSS_OUT = 12;

/** Navy <-> cream per channel (the crossing hands carry no moon yellow): c' = (navy + cream) - c. */
export const SWAP_MATRIX = [
  [-1, 0, 0, 0, (24 + 243) / 255],
  [0, -1, 0, 0, (32 + 239) / 255],
  [0, 0, -1, 0, (58 + 228) / 255],
  [0, 0, 0, 1, 0],
]
  .map((r) => r.map((v) => v.toFixed(4)).join(' '))
  .join('  ');

// ---- chorus 2: the human's room overflows (world/Verse2.tsx OverflowNotes draws these)
export interface Over {
  x: number;
  y: number;
  rot: number;
  kind: 'sticky' | 'paper';
  w: number;
  h: number;
}
export const OVER_N = 84;
/** Seeded spots all over the human's room, in arrival order: the free wall first, then the window, the shelf and
 * a pile growing on the floor (the floor share grows with k, so the heap rises towards the end of the chorus). */
export const OVER: readonly Over[] = (() => {
  const r = seeded('overflow-notes');
  const out: Over[] = [];
  for (let k = 0; k < OVER_N; k++) {
    const floor = r() < 0.25 + 0.35 * (k / OVER_N);
    const x = floor ? range(r, 40, 880) : range(r, 40, 900);
    const y = floor ? FLOOR_Y + 30 - range(r, 0, 26 + 70 * (k / OVER_N)) : range(r, 130, 900);
    const kind = r() < 0.55 ? 'sticky' : 'paper';
    out.push({ x, y, rot: floor ? range(r, -40, 40) : range(r, -12, 12), kind, w: kind === 'paper' ? range(r, 58, 80) : range(r, 48, 62), h: kind === 'paper' ? range(r, 74, 96) : 0 });
  }
  return out;
})();

