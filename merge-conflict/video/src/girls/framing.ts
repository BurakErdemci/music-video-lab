// Framing plans for the girls' layer (scene-map.md "The girls are never wallpaper", 3): the same framing never
// holds longer than 2 bars; bar lengths come from the measured downbeats. Erasable TypeScript only: node loads
// this file to prove the check throws.
import { downbeat, downbeats } from '../timing.ts';

export type FramingKind = 'stage' | 'face' | 'tiny' | 'low' | 'clones' | 'split';
export interface FramingCue { t: number; kind: FramingKind }
/** Bar length (seconds) at t, from the measured downbeats. */
export const barAt = (t: number): number => {
  let i = 0;
  while (i < downbeats.length - 2 && (downbeats[i + 1] as number) <= t) i++;
  return downbeat(i + 1) - downbeat(i);
};
/** A framing plan; throws when any framing holds longer than 2 bars before `end`. */
export const framingPlan = (cues: readonly FramingCue[], end: number): FramingCue[] => {
  cues.forEach((c, i) => {
    const until = cues[i + 1]?.t ?? end;
    const limit = 2 * barAt(c.t) + 1 / 60;
    if (until - c.t > limit) throw new Error(`framing "${c.kind}" at ${c.t.toFixed(2)} s holds ${(until - c.t).toFixed(2)} s, longer than 2 bars (${limit.toFixed(2)} s)`);
    if (i && c.kind === (cues[i - 1] as FramingCue).kind) throw new Error(`framing "${c.kind}" at ${c.t.toFixed(2)} s repeats the previous framing`);
  });
  return [...cues];
};
export const framingAt = (plan: readonly FramingCue[], t: number): FramingKind => [...plan].reverse().find((c) => t >= c.t)?.kind ?? 'stage';

