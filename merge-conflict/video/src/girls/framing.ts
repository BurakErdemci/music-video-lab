// Framing plans for the girls' layer (scene-map.md "The girls are never wallpaper", 3): the same framing never
// holds longer than 2 bars; bar lengths come from the measured downbeats. Erasable TypeScript only: node loads
// this file to prove the check throws.
import { barLengthAt, barPos, f } from '../timing.ts';

export type FramingKind = 'stage' | 'face' | 'tiny' | 'low' | 'clones' | 'split' | 'knee' | 'waist';
export interface FramingCue { t: number; kind: FramingKind }
/** Length (s) of the bar t falls in, from the measured downbeats (kept for callers; the check counts bars). */
export const barAt = (t: number): number => barLengthAt(t);
/** A framing plan; throws when any framing holds longer than 2 bars before `end`. */
export const framingPlan = (cues: readonly FramingCue[], end: number): FramingCue[] => {
  cues.forEach((c, i) => {
    const until = cues[i + 1]?.t ?? end;
    // counted in measured bars between the two times (local: 3- and 5-beat bars count as one bar), with one
    // 60 fps frame of tolerance expressed in the local bar length
    const held = barPos(until) - barPos(c.t);
    if (held > 2 + 1 / 60 / barLengthAt(until)) throw new Error(`framing "${c.kind}" at ${c.t.toFixed(2)} s holds ${held.toFixed(2)} bars (${(until - c.t).toFixed(2)} s), longer than 2 bars`);
    if (i && c.kind === (cues[i - 1] as FramingCue).kind) throw new Error(`framing "${c.kind}" at ${c.t.toFixed(2)} s repeats the previous framing`);
  });
  return [...cues];
};
/** The framing at t; a cue owns the 60 fps frame it falls on. */
export const framingAt = (plan: readonly FramingCue[], t: number): FramingKind => [...plan].reverse().find((c) => f(t) >= f(c.t))?.kind ?? 'stage';

