// The film's moments printed inside the big shards (frame-exact stills from the part renders, 960 x 540, picked and
// listed in public/living/p4f/recap/recap.json). r04 (the model upgrade) is left out: its figure is too small to read
// inside a shard. Order = order of arrival at the lens: the story in sequence.
import { staticFile } from 'remotion';

export interface RecapStill {
  file: string;
  /** Subject centre in 0..1 image coordinates (y down). */
  focus: readonly [number, number];
}
export const RECAP: readonly RecapStill[] = [
  { file: 'r01-notebook.png', focus: [0.62, 0.5] },
  { file: 'r02-morning.png', focus: [0.4, 0.5] },
  { file: 'r03-days.png', focus: [0.55, 0.45] },
  { file: 'r05-tv-window.png', focus: [0.68, 0.5] },
  { file: 'r06-cafe-palms.png', focus: [0.55, 0.55] },
  { file: 'r07-paper-city.png', focus: [0.52, 0.55] },
  { file: 'r08-bus-heart.png', focus: [0.55, 0.5] },
  { file: 'r09-ink-tsunami.png', focus: [0.7, 0.5] },
  { file: 'r10-tally-palms.png', focus: [0.5, 0.55] },
];
export const recapUrl = (i: number): string => staticFile(`living/p4f/recap/${RECAP[i]!.file}`);
export const RECAP_IMAGES: readonly string[] = RECAP.map((_, i) => recapUrl(i));
