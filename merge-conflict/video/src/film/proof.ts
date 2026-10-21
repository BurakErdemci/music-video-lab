// The 0-20 s type-led proof on take-v4 (scene-map.md "Typography-led clip", "The girls are never wallpaper",
// "Final song and the pop-metal blend"). Every time is an event from events.ts or a measured token; plans that
// break a binding rule (framing holds, focus moves, transition lengths, flash budget) throw here at load.
//  0-4.37   intro_robot: the blue girl reads git's error out loud, deadpan; the words come from her as a red
//           terminal (CODE), "failed." morphs into FIX, a >>>>>>> wipe opens the FLAP board of line 1.
//  4.37     a whip into the HARD METAL groove (Burak's ear override on the SET): blue dancing in disco, orange
//           only as backlit metal silhouettes (her costume schedule), a metal hit every second beat, the conflict markers slam, framings change every 2 bars, focus
//           ping-pongs; MERGE and CONFLICT slam in a jagged face.
//  16.33    through the O of CONFLICT into verse 1: the set and the type turn from the metal to the pop family
//           (blue's disco costume) and the palette slides toward pop over a bar.
//  16.88    "I'm HEAD, I'm main, I'm stable and clean" as STACK; she KICKS "HEAD" off on "stable"; CLEAN
//           morphs into LINE, which opens "Line forty-two..." as a DIFF.
import { HOME } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';
import { smearPlan } from '../cards/smear.tsx';
import { at } from '../events.ts';
import { whiteoutSwings, type WhiteoutSpec } from '../fx/whiteout.tsx';
import { framingPlan } from '../girls/framing.ts';
import { kickPlan } from '../girls/interact.tsx';
import { focusPlan } from '../girls/staging.tsx';
import { assertFlashBudget, type Swing } from '../lib/flash.ts';
import { lineTokens } from '../lyrics/LyricLayer.tsx';
import { beat, sectionNamed } from '../timing.ts';
import { widthOf } from '../type/fonts.tsx';
import type { FormSpec } from '../type/forms/common.tsx';
import { stackLayout } from '../type/forms/Stack.tsx';
import { counterOf, counterPlan, holeOf, morphPlan, whipPlan, wipePlan, type WordAt } from '../type/transitions/transitions.tsx';

export const PROOF_END = 20;

/** Who reads git's error in the intro (0-4.37 s). Burak 2026-10-21: the girl who starts the lyrics, the sweet
 *  blue girl. 'O' or 'both' are kept as options (both girls in frame, the text between them). */
export const INTRO_SPEAKER: 'O' | 'B' | 'both' = 'B';

export const ROBOT = sectionNamed('intro_robot');
export const GROOVE = sectionNamed('intro_groove');
export const VERSE = sectionNamed('verse1_sweet');

/** The cards of each girl in the proof. Costumes follow girls/costume.ts: blue is disco throughout; orange
 *  shows only as metal silhouettes in the groove (OM cards, drawn flat and backlit). */
export const GIRL = {
  B: { stand: 'B01', close: 'B06', verse: 'BD3', kick: 'BD6', next: 'BD1' },
  O: { stand: 'O03', close: 'O10', verse: 'OD3', kick: 'OD6', next: 'OD1' },
} as const;
/** The groove's cards per framing: blue's disco dance poses, orange's metal silhouettes. */
export const GROOVE_CARDS = {
  stage: { B: 'BD2', O: 'OM3' },
  clones: { O: 'OM1' },
  split: { B: 'BD4', O: 'OM2' },
  low: { B: 'BD5' },
  tiny: { O: 'OM6' },
} as const;

// ---- 0-4.37 the speaker ------------------------------------------------------------------------------------
export const LINE0: FormSpec = { id: 'robot-0', line: 0, key: 2, singer: 'B', t0: 0, t1: at('wipe-flap') + 0.4, box: { x: 960, y: 250, w: 880, h: 300 } };
export const LINE1: FormSpec = { id: 'robot-1', line: 1, key: 1, singer: 'B', t0: at('wipe-flap'), t1: GROOVE.start + 0.25, box: { x: 900, y: 430, w: 960, h: 420 } };
export const CODE_OPT = { gutter: '!', size: 54, keyScale: 1.6, chrome: 'git merge feature', terminal: true } as const;
export const FIX: WordAt = { text: 'FIX', x: 1180, y: 900, size: 300, face: 'display', fill: '#ff3b3b' };
export const MORPH_FIX = morphPlan({ id: 'morph-fix', t0: at('morph-fix') - 24 / 60, frames: 24, from: { text: 'FAILED.', x: 0, y: 0, size: 54 * 1.6, face: 'jetbrains', fill: '#ff3b3b' }, to: FIX });
export const WIPE_FLAP = wipePlan({ id: 'wipe-flap', t0: at('wipe-flap'), marker: '>', frames: 22 });

// ---- 4.37-16.33 the metal groove ---------------------------------------------------------------------------
export const WHIP_GROOVE = whipPlan({ id: 'whip-groove', t0: at('whip-groove'), dir: 1, frames: 12 });
export const GROOVE_HITS = Array.from({ length: 18 }, (_, k) => beat(13 + 2 * k));
export const MERGE: WordAt = { text: 'MERGE', x: 0, y: 0, size: 300, face: 'metalmania', fill: '#c8ced6' };
export const CONFLICT: WordAt = { text: 'CONFLICT', x: 960 - widthOf('CONFLICT', 330, 'metalmania') / 2, y: 700, size: 330, face: 'metalmania', fill: '#e01b1b' };
export const COUNTER_DIVE = counterPlan({ id: 'counter-dive', t0: at('counter-dive'), frames: 40, center: counterOf(CONFLICT, 1), hole: holeOf(CONFLICT, 1) });
export const GROOVE_O: Placement = { x: -3.1, height: 6.6 };
export const GROOVE_B: Placement = { x: 3.1, height: 6.6 };
export const FOCUS = focusPlan([
  { t: at('focus-o'), singer: 'O', frames: 36 },
  { t: at('focus-b'), singer: 'B', frames: 36 },
]);

// ---- 16.33-20 verse 1 ---------------------------------------------------------------------------------------
export const VERSE_B: Placement = { x: -3.2, height: 6.8 };
export const STACK2: FormSpec = { id: 'verse-2', line: 2, key: 1, singer: 'B', t0: VERSE.start, t1: at('morph-line') + 0.02, box: { x: 640, y: 150, w: 1180, h: 760 } };
const keyAt = stackLayout(STACK2, lineTokens(2)[1]?.start ?? VERSE.start).find((w) => w.tok === 1);
if (!keyAt) throw new Error('proof: the STACK has no key word');
export const KICK = kickPlan({
  id: 'kick-head',
  word: { text: keyAt.text, x: keyAt.x, y: keyAt.y, size: keyAt.size, face: keyAt.face, fill: '#00b4ff' },
  tok: lineTokens(2)[1] as never,
  kick: at('kick-head'),
  idle: GIRL.B.verse,
  kickCard: GIRL.B.kick,
  at: VERSE_B,
  dir: 1,
});
/** The blue girl's verse track: a pose change on the verse downbeat, the kick, the next pose 2 bars later. */
export const VERSE_SMEARS = [
  smearPlan({ id: 'handoff-swap', t: at('handoff-swap'), from: GROOVE_CARDS.low.B, to: GIRL.B.verse, dir: -1, frames: 12 }),
  smearPlan({ id: 'kick-head', t: at('kick-head'), from: GIRL.B.verse, to: GIRL.B.kick, dir: 1, frames: 8 }),
  smearPlan({ id: 'pose-bd1', t: at('pose-bd1'), from: GIRL.B.kick, to: GIRL.B.next, dir: -1, frames: 10 }),
];
const cleanAt = stackLayout(STACK2, at('morph-line')).find((w) => w.tok === 7);
if (!cleanAt) throw new Error('proof: the STACK has no CLEAN');
export const DIFF3: FormSpec = { id: 'verse-3', line: 3, key: 5, singer: 'B', t0: at('tok-3-0'), t1: 30, box: { x: 560, y: 300, w: 1300, h: 460 } };
export const DIFF_OPT = { minus: 'color: orange;', size: 64, keyScale: 1.9 } as const;
export const MORPH_LINE = morphPlan({
  id: 'morph-line',
  t0: at('morph-line'),
  frames: 16,
  from: { text: cleanAt.text, x: cleanAt.x, y: cleanAt.y, size: cleanAt.size, face: cleanAt.face, fill: '#7a6cff' },
  to: { text: 'Line', x: 560 + 40 + 2 * 0.6 * 64, y: 300 + 60 + 460 * 0.36 * 1.85, size: 64, face: 'jetbrains', fill: '#c8ffd9' },
});

// ---- framings (never longer than 2 bars) -----------------------------------------------------------------
export const FRAMINGS = framingPlan(
  [
    { t: 0, kind: 'stage' },
    { t: at('framing-face'), kind: 'face' },
    { t: GROOVE.start, kind: 'stage' },
    { t: at('framing-clones'), kind: 'clones' },
    { t: at('framing-split'), kind: 'split' },
    { t: at('framing-low'), kind: 'low' },
    { t: at('framing-tiny'), kind: 'tiny' },
    { t: VERSE.start, kind: 'stage' },
    { t: at('framing-low-2'), kind: 'low' },
  ],
  PROOF_END,
);

// ---- flash budget ------------------------------------------------------------------------------------------
export const WHITEOUTS: readonly WhiteoutSpec[] = [
  { id: 'metal-hit', t0: at('metal-hit'), frames: 3, figures: [{ card: GROOVE_CARDS.stage.O, at: GROOVE_O }, { card: GROOVE_CARDS.stage.B, at: GROOVE_B }], camera: () => HOME },
];
export const SWINGS: Swing[] = [...WHITEOUTS.flatMap(whiteoutSwings)];
assertFlashBudget(SWINGS, 'proof 0-20 s');
