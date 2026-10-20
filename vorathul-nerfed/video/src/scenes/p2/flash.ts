// Every large luminance swing of part 2 (docs/flash-audit.md rows W11, W14-W26) and the grade cues, checked against the
// budget of 3 swings in any 30 frames at module load: a schedule that breaks the rule throws when the bundle is built.
import { assertFlashBudget, duotoneSwings, gradeCues, impactSwings, type Swing } from '../../vfx/flash.ts';
import type { DuotoneCue } from '../../vfx/DuotoneFlash.tsx';
import { SHOT_FROM, T } from './frames.ts';

/** S26: the office cut lands as a flat O grade for 2 frames before the plates resolve. */
export const S26_CUES: DuotoneCue[] = [
  { frame: SHOT_FROM.S26, colors: ['#ADB5BD', '#FFFFFF'], hard: false },
  { frame: SHOT_FROM.S26 + 2, colors: null },
];
/** S33: the paused game is graded office grey/white for the whole freeze, colour returns on the strongest hit. */
export const S33_CUES: DuotoneCue[] = [
  { frame: T.freeze, colors: ['#ADB5BD', '#FFFFFF'], hard: false },
  { frame: T.unfreeze, colors: null },
];
/** The deleted things flash magenta for one frame. */
export const M_CUES = (at: number): DuotoneCue[] => gradeCues([{ at: { frame: at }, grade: 'M', hold: 1 }], `p2 magenta ${at}`);

export const SWINGS: Swing[] = [
  ...duotoneSwings(S26_CUES),
  { frame: SHOT_FROM.S27, swings: 1 }, // hard cut office -> painting
  ...impactSwings(T.rogueFlat, 2),
  { frame: T.update, swings: 1 }, // the grey drain snaps back to colour
  ...duotoneSwings(S33_CUES),
  { frame: SHOT_FROM.S37, swings: 1 }, // office -> painting
  ...duotoneSwings(M_CUES(T.percent)),
  ...duotoneSwings(M_CUES(T.removed)),
  { frame: SHOT_FROM.S40, swings: 1 }, // painting -> office
  { frame: SHOT_FROM.S41, swings: 1 }, // office -> painting
  ...duotoneSwings(M_CUES(T.pipMagenta)),
  { frame: SHOT_FROM.S42, swings: 1 },
  { frame: SHOT_FROM.S43, swings: 1 },
  { frame: T.lookUp, swings: 1 }, // the screaming sky goes black/violet ...
  { frame: T.lookUp + 10, swings: 1 }, // ... and back one beat later
];
assertFlashBudget(SWINGS, 'part 2 flash schedule');
