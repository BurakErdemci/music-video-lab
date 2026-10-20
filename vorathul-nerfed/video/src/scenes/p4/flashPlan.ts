// Flash budget of part 4 (docs/flash-audit.md): every hard cut between very different plates counts as one swing, the memory
// panel's soft grade is not a swing (it is the same frame as the cut), and S76's pull-back is a continuous zoom, not a cut.
// Throws at load time when the plan breaks the 3-per-second limit.
import { assertFlashBudget, type Swing } from '../../vfx/flash.ts';
import { CUE, HATED_FRAME } from './cues.ts';

const c = CUE;
const CUTS: number[] = [
  c.s75cut, c.s76cut, c.s77cut, c.s78cut, c.s80cut, c.s81cut, c.s82cut, c.s83cut, c.s84cut, c.s85cut, c.s86cut, c.s87cut, c.s88cut,
  c.s89a, c.s89b, c.s89c, c.s89d, c.s89e, c.s89f, c.s89g, c.s89h, c.s90a, c.s90b, c.s90c, c.s90d, c.s90e, c.s90f,
].map((e) => e.frame);
// S77's second cut (standing, same world) and S79's cut are in the list too: S79 cuts inside to the POV.
CUTS.push(HATED_FRAME, c.s77med.frame);
/** The first frame of part 5 is a hard cut into the white-out; it belongs to the 6642 / 6661 window. */
export const P5_FIRST_CUT = 6680;

export const P4_SWINGS: Swing[] = [...CUTS, P5_FIRST_CUT].sort((a, b) => a - b).map((frame) => ({ frame, swings: 1 }));

assertFlashBudget(P4_SWINGS, 'p4 flash budget');
