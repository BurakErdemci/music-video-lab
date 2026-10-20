// The new finale (Part4bV3), song frames 6396-7222. Every event sits on a downbeat of data/timing.json (bars 115-129).
//
// 6396  bar 115  SHATTER: hard cut from Part4a's last frame; the glass bursts toward the camera as real shards, the big
//                shards carry moments of the film, the camera flies forward through them (flight.ts, FinaleStage.tsx)
// 6506  bar 117  no glass any more: the first step; on every downbeat they step one step closer (world.ts)
// 6562  bar 118  his medium: cream print dots grow along his edges
// 6617  bar 119  her medium: navy print dots grow along hers
// 6672  bar 120  wide again, the gap small, the moon big
// 6727  bar 121  the hands, a palm's width apart; the camera pushes in through the bar
// 6782  bar 122  THE UNION (the loudest bar of the song): palms meet, a flash; the bus heart is drawn between the palms
//                and grows over the frame; behind its halftone front everything is ONE moon-yellow field with both
//                figures as the same thin navy line (heart.ts)
// 6837  bar 123  white SqueegeePrint into the morning room (resetV3.ts): the yellow stays where they stood, breaks into
//                dots and drains into his cursor
// 7067           "Merhaba." types itself (the spoken word at 235.56 s)
// 7112  bar 127  he opens the notebook; 7139 the push into the screen; 7222 = Part 1's frame 468 with a moon-yellow cursor
import { FPS, TIMING } from '../../../timing.ts';

export const F_START = 6396;
export const F_END = 7222;
export const F_SHATTER = 6396;
export const F_LAND = 6506;
/** The downbeats of the steps (each one a cut and a step closer). */
export const STEPS = [6506, 6562, 6617, 6672, 6727] as const;
export const F_UNION = 6782;
export const F_PRINT = 6837;

/** Beat frames, rounded like the cuts (frames passed in may be fractional: the 60 fps render sees half frames). */
export const BEATS: readonly number[] = TIMING.beats.map((b) => Math.round(b * FPS));

/** Index of the step at frame f: -1 before the first step (the flight), 0..4 the steps, 5 the union. */
export const stepAt = (f: number): number => {
  if (f >= F_UNION) return 5;
  let k = -1;
  for (let i = 0; i < STEPS.length; i++) if (f >= (STEPS[i] as number)) k = i;
  return k;
};

/** Sum of decaying kicks on the beats in [from, f]: 1 on a beat, falling with time constant tau frames. */
export const beatKick = (f: number, from: number, tau: number): number => {
  let s = 0;
  for (const b of BEATS) {
    if (b < from - 0.75 || b > f + 0.25) continue;
    const d = Math.max(0, f - b);
    s += Math.exp(-d / tau);
  }
  return s;
};
