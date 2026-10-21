// The accents of the film: one deliberate gesture per moment, eased in over 12-20 frames and then held (round 4:
// no loops). Keyed by card id; an accent only acts after its t0, so a card reused later keeps it held.
// Each accent starts ON a beat (the beat nearest the word it answers), so its stepped frames fall on the beat.
// Times come from the measured timing; erasable TypeScript only.
import type { Accent } from './rig.ts';
import { bindLine } from '../lyrics/bind.ts';
import { beat, downbeat, lines, nearestBeat, words } from '../timing.ts';

/** The beat nearest a measured token. */
const onBeat = (line: number, k: number): number => beat(nearestBeat((bindLine(lines, words, line)[k] as { start: number }).start));

export const ACCENTS: Record<string, readonly Accent[]> = {
  // the intro speaker tips her head, deadpan, on "failed."
  B01: [{ t0: onBeat(0, 2), frames: 16, head: -0.09, why: 'intro: head tilt on "failed."' }],
  // the big metal silhouette throws her head back on the split re-slam of THEIRS
  OM5: [{ t0: downbeat(8), frames: 14, head: 0.12, upper: 0.03, why: 'groove: head throw on the THEIRS re-slam' }],
  // after the kick, a head turn to camera on "clean"
  BD6: [{ t0: onBeat(2, 7), frames: 18, head: -0.06, why: 'verse: head turn to camera on "clean"' }],
};
