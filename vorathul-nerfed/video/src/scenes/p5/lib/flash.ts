// Part 5's whole flash schedule, checked against the 3-per-second rule when the module loads (storyboard 2,
// "Flash budget audit": Z4 tail S91, Z5 S99+S100, Z6 S113 are fixed here as the audit's "After" column).
import { assertFlashBudget, duotoneSwings, gradeCues, impactSwings, type Swing } from '../../../vfx/effects.ts';
import { beatFrame } from '../../../timing.ts';
import { E } from './geom.ts';

// S101 X23: the boss band, hard black/gold for 2 frames (in on "boss", out on beat 730).
export const BOSS_CUES = gradeCues([{ at: { frame: E('s101-cut') }, grade: 'GOLD', hold: E('s101-pipe13') - E('s101-cut') }], 'p5 S101 boss band');

// S112 X27: one hard two-colour grade per panel, cut and cue on the same frame; the S113 cut returns to colour.
const PANEL_GRADES = ['V', 'GOLD', 'O', 'V', 'GOLD', 'O'] as const;
export const PANEL_FRAMES = [1, 2, 3, 4, 5, 6].map((i) => E(`s112-p${i}`));
export const PANEL_CUES = gradeCues(
  [...PANEL_FRAMES.map((frame, i) => ({ at: { frame }, grade: PANEL_GRADES[i]! })), { at: { frame: E('s113-cut') }, grade: 'P' as const }],
  'p5 S112 panels',
);

// S113/S114 X28 (Z6 fix): the white-out on beat 815 is held ivory into the black/violet cue of beat 816 (one
// swing, not two), gold on 818 with the S114 cut, grey/white moved to 819, back to colour on 820.
export const WHITEOUT = E('s113-blast');
export const BLAST_CUES = gradeCues(
  [
    { at: { beat: 816 }, grade: 'V' },
    // Gold lands on the S114 cut (beat 818): a cut and a cue on one frame are one swing (measured: gold on 817 plus
    // the cut on 818 made four in the blast second).
    { at: { beat: 818 }, grade: 'GOLD' },
    { at: { beat: 819 }, grade: 'O' },
    { at: { beat: 820 }, grade: 'P' },
  ],
  'p5 S113 blast grades',
);

/** Ivory white-out at the head of S91 (p4 ends on the office frame and leaves the white-out to p5). */
export const S91_WHITE_FRAMES = 2;

/**
 * Every swing of part 5, plus the p4 tail that shares its first second. p4 hand-off: its last cut swings are
 * at most one in f6650-6679 (modelled on beat 679); there is no white-out in p4.
 */
export const SWINGS: Swing[] = [
  { frame: beatFrame(679), swings: 1 },
  // S91 (Z4 fix): cut to the ivory white-out on beat 681, out of it into the shatter 2 frames later; ImpactBurst flash 0.
  { frame: E('s91-cut'), swings: 1 },
  { frame: E('s91-cut') + S91_WHITE_FRAMES, swings: 1 },
  // S95 A5: the only posterise of the fight (one of the ten collision-table impacts).
  ...impactSwings(E('s95-cut'), 2),
  // S99 (Z5 fix): cut to the dark ECU of the void, A7 with flash 0, cut back to the bright office.
  { frame: E('s99-cut'), swings: 1 },
  { frame: E('s100-cut'), swings: 1 },
  ...duotoneSwings(BOSS_CUES),
  ...duotoneSwings(PANEL_CUES),
  { frame: WHITEOUT, swings: 1 },
  ...duotoneSwings(BLAST_CUES),
];
assertFlashBudget(SWINGS, 'p5 flash schedule');
