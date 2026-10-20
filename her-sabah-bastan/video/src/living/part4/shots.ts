// Part4 shot list (song 4676-7222, scene map v2 scenes 12-17). Everything is in SONG frames. One module per stretch:
//
// 4676-4899  run.ts     scene 12: bus doors (hard cut), the time-sliced run on the night street, inserts, the three
//                        navy/cream flips that each leave a crack across the whole frame
// 4900-5121  flood.ts   InkBleed from the left edge: the navy tsunami, notes on the crest, she is lifted by the wave
// 5122-5455  glassA.ts  the navy drains through the cracks: he pants at the cracked glass; the camera passes through
//                        the cracked glass into her cream (scene 13): four re-formings v4-v7 on the hits, v7 settles
//                        into v1's pose and spot; her last re-forming falls as pixels and the pen draws the seam
// 5456-6395  glassB.ts  scenes 14-15 at the split: the same spot pressed, the days montage in place, MERHABA,
//                        ANLATIRSIN (the notebook), BIR DAHA (tally marks, one on her side), trembling, the bubble
// 6396-6836  coda.ts    SHATTER (hard cut): shards as real geometry, the whole moon, the crossing (ShatterStage.tsx)
// 6837-7222  reset.ts   SqueegeePrint in white, the white reset room, "Merhaba.", the notebook, the push into the
//                        screen; the last frame = Part 1's frame 468
import { runShot } from './run.ts';
import { floodShot } from './flood.ts';
import { glassAShot } from './glassA.ts';
import { glassBShot } from './glassB.ts';
import { codaShot } from './coda.ts';
import { resetShot } from './reset.ts';
import { ev, type Shot } from './common.ts';

export const SCENE_STARTS = {
  run: 4676,
  flood: ev('InkBleed starts'),
  glassA: ev('the navy drains'),
  glassB: 5456,
  coda: ev('SHATTER'),
  reset: ev('SqueegeePrint in white'),
} as const;

export const shotAt = (f: number): Shot => {
  if (f < SCENE_STARTS.flood) return runShot(f);
  if (f < SCENE_STARTS.glassA) return floodShot(f);
  if (f < SCENE_STARTS.glassB) return glassAShot(f);
  if (f < SCENE_STARTS.coda) return glassBShot(f);
  if (f < SCENE_STARTS.reset) return codaShot(f);
  return resetShot(f);
};
