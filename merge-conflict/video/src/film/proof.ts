// The 0-20 s type-led proof on take-v4 (scene-map.md "Typography-led clip", "The girls are never wallpaper",
// "Final song and the pop-metal blend", "The costume belongs to the girl", round 2). Every time is an event from
// events.ts or a measured token; plans that break a binding rule (framing holds, transition lengths, flash
// budget) throw here at load.
//  0-4.37   intro_robot: the blue girl (INTRO_SPEAKER) reads git's error out loud, deadpan, knee-up then face;
//           the words come from her as a red terminal (CODE); "failed." morphs into FIX; a >>>>>>> wipe opens
//           the FLAP board of line 1.
//  4.37     a whip into the ALL-METAL groove (no ball, no checker floor, no confetti; blue not shown): orange's
//           backlit metal silhouettes, the conflict markers slamming, OURS, a dive through its O into THEIRS,
//           then the MERGE CONFLICT logo (LOGO_DESIGN); a metal hit every second beat; framings every 2 bars.
//  16.33    the logo whips out over the groove's last 12 frames; one hard switch to disco on the downbeat (set,
//           palette, type family) with blue cut in crisp, full pose, on the downbeat; her particles burst after.
//  16.88    "I'm HEAD, I'm main, I'm stable and clean" as STACK beside her (knee-up); she KICKS "HEAD" off on
//           "stable"; a small full figure on the next downbeat but one; CLEAN morphs into LINE, which opens
//           "Line forty-two..." as a DIFF.
import { type CameraPath, type CameraPose, drift, HOME, HOME_Z, punched, shifted } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { whiteoutSwings, type WhiteoutSpec } from '../fx/whiteout.tsx';
import { framingPlan } from '../girls/framing.ts';
import { kickPlan } from '../girls/interact.tsx';
import { FULL_MAX, kneeUp } from '../girls/staging.tsx';
import { assertFlashBudget, type Swing } from '../lib/flash.ts';
import { lineTokens } from '../lyrics/LyricLayer.tsx';
import { beat, sectionNamed } from '../timing.ts';
import { widthOf } from '../type/fonts.tsx';
import type { FormSpec } from '../type/forms/common.tsx';
import { stackLayout } from '../type/forms/Stack.tsx';
import type { LogoDesign } from '../type/logo/Logo.tsx';
import { counterOf, counterPlan, holeOf, morphPlan, whipPlan, wipePlan, type WordAt } from '../type/transitions/transitions.tsx';

export const PROOF_END = 20;

/** Who reads git's error in the intro (0-4.37 s). Burak 2026-10-21: the girl who starts the lyrics, the sweet
 *  blue girl. 'O' or 'both' are kept as options (both girls in frame, the text between them). */
export const INTRO_SPEAKER: 'O' | 'B' | 'both' = 'B';
/** The MERGE CONFLICT signature (type/logo/Logo.tsx). Burak picked B, the split word. */
export const LOGO_DESIGN: LogoDesign = 'B';

export const ROBOT = sectionNamed('intro_robot');
export const GROOVE = sectionNamed('intro_groove');
export const VERSE = sectionNamed('verse1_sweet');

/** The cards of each girl in the proof (costumes: girls/costume.ts). */
export const GIRL = {
  B: { stand: 'B01', close: 'B06', verse: 'BD3', crouch: 'BD5', kick: 'BD6', next: 'BD1' },
  O: { stand: 'O03', close: 'O10', verse: 'OD3', kick: 'OD6', next: 'OD1' },
} as const;
/** The groove's orange metal silhouettes, one per framing. */
export const GROOVE_CARDS = { stage: 'OM3', crouch: 'OM4', clones: 'OM1', low: 'OM2', knee: 'OM5', tiny: 'OM6', waist: 'OM8' } as const;
/** Anticipation then release ("Scroll Up!" recipe): orange crouches (OM4) on the ======= slam, springs into the
 *  horns (OM1, the clones) on the >>>>>>> slam with a big camera punch; blue crouches (BD5) on "I'm" and kicks
 *  (BD6) on "stable" with a low-angle swing and a punch. Hard cuts, keyed to the slams and the sung words. */
export const GROOVE_CROUCH_AT = at('marker-sep');
export const VERSE_CROUCH_AT = at('kick-anticipate');
/** The big backlit silhouette (knee-up, dancing) with THEIRS behind her (round 3). */
export const GROOVE_BIG: Placement = kneeUp(5.2, 10.6);

// ---- 0-4.37 the speaker ------------------------------------------------------------------------------------
export const SPEAKER_AT: Placement = kneeUp(-3.6);
export const LINE0: FormSpec = { id: 'robot-0', line: 0, key: 2, singer: 'B', t0: 0, t1: at('wipe-flap') + 0.4, box: { x: 860, y: 230, w: 980, h: 330 } };
export const LINE1: FormSpec = { id: 'robot-1', line: 1, key: 1, singer: 'B', t0: at('wipe-flap'), t1: GROOVE.start + 0.25, box: { x: 900, y: 430, w: 960, h: 420 } };
export const CODE_OPT = { gutter: '!', size: 60, keyScale: 1.6, chrome: 'git merge feature', terminal: true } as const;
export const FIX: WordAt = { text: 'FIX', x: 1120, y: 930, size: 330, face: 'display', fill: '#ff3b3b' };
export const MORPH_FIX = morphPlan({ id: 'morph-fix', t0: at('morph-fix') - 24 / 60, frames: 24, from: { text: 'FAILED.', x: 0, y: 0, size: 60 * 1.6, face: 'jetbrains', fill: '#ff3b3b' }, to: FIX });
export const WIPE_FLAP = wipePlan({ id: 'wipe-flap', t0: at('wipe-flap'), marker: '>', frames: 22 });

// ---- 4.37-16.33 the all-metal groove ------------------------------------------------------------------------
export const WHIP_GROOVE = whipPlan({ id: 'whip-groove', t0: at('whip-groove'), dir: 1, frames: 12 });
export const GROOVE_HITS = Array.from({ length: 18 }, (_, k) => beat(13 + 2 * k));
export const OURS: WordAt = { text: 'OURS', x: 960 - widthOf('OURS', 420, 'metalmania') / 2, y: 720, size: 420, face: 'metalmania', fill: '#c8ced6' };
export const COUNTER_DIVE = counterPlan({ id: 'counter-dive', t0: at('counter-dive'), frames: 20, center: counterOf(OURS, 0), hole: holeOf(OURS, 0) });
export const GROOVE_O: Placement = { x: 3.6, height: FULL_MAX };

// ---- 16.33-20 verse 1 ---------------------------------------------------------------------------------------
export const VERSE_B: Placement = kneeUp(-3.9, 10.2);
export const VERSE_FULL: Placement = { x: -4.4, height: 4.6 };
/** The logo whips out over the groove's last 12 frames, so the verse downbeat is a clean cut onto blue. */
export const WHIP_OUT = whipPlan({ id: 'whip-out', t0: at('whip-verse') - 12 / 60, dir: -1, frames: 12 });
/** Her entrance burst: particles fly OUT from her chest after the hit (field burst origin, world units). */
export const BLUE_BURST = { t: at('blue-enter') + 1 / 60, origin: [VERSE_B.x + 0.6, (VERSE_B.feet ?? 0) + 0.68 * VERSE_B.height, 0.5] as [number, number, number] };
export const STACK2: FormSpec = { id: 'verse-2', line: 2, key: 1, singer: 'B', t0: VERSE.start, t1: at('morph-line') + 0.02, box: { x: 760, y: 120, w: 1090, h: 800 } };
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
const cleanAt = stackLayout(STACK2, at('morph-line')).find((w) => w.tok === 7);
if (!cleanAt) throw new Error('proof: the STACK has no CLEAN');
export const DIFF3: FormSpec = { id: 'verse-3', line: 3, key: 5, singer: 'B', t0: at('tok-3-0'), t1: 30, box: { x: 600, y: 300, w: 1260, h: 460 } };
export const DIFF_OPT = { minus: 'color: orange;', size: 64, keyScale: 1.9 } as const;
export const MORPH_LINE = morphPlan({
  id: 'morph-line',
  t0: at('morph-line'),
  frames: 16,
  from: { text: cleanAt.text, x: cleanAt.x, y: cleanAt.y, size: cleanAt.size, face: cleanAt.face, fill: '#7a6cff' },
  to: { text: 'Line', x: 600 + 40 + 2 * 0.6 * 64, y: 300 + 60 + 460 * 0.36 * 1.85, size: 64, face: 'jetbrains', fill: '#c8ffd9' },
});

// ---- framings (never longer than 2 bars) -----------------------------------------------------------------
export const FRAMINGS = framingPlan(
  [
    { t: 0, kind: 'knee' },
    { t: at('framing-face'), kind: 'face' },
    { t: GROOVE.start, kind: 'stage' },
    { t: at('framing-clones'), kind: 'clones' },
    { t: at('framing-low'), kind: 'low' },
    { t: at('framing-knee'), kind: 'knee' },
    { t: at('framing-tiny'), kind: 'tiny' },
    { t: at('framing-waist'), kind: 'waist' },
    { t: VERSE.start, kind: 'knee' },
    { t: at('framing-stage-2'), kind: 'stage' },
  ],
  PROOF_END,
);

// ---- the camera: every held shot moves continuously (round 4); the groove adds a fov punch every 2 beats --------
const LOW: CameraPose = { position: [0, -2.6, HOME_Z - 3], target: [0, 1.2, 0], fov: 46 };
const lift = (p: CameraPose, dy: number): CameraPose => ({ ...p, position: [p.position[0], p.position[1] + dy, p.position[2]], target: [p.target[0], p.target[1] + dy * 0.6, p.target[2]] });
/** One move per framing cue, in cue order: from -> to over the cue's span; typeZ is the type layer's depth. */
export const CAMERA: readonly { from: CameraPose; to: CameraPose; typeZ: number; move: string }[] = [
  { from: HOME, to: shifted(HOME, [-0.5, 0.25, -1.0]), typeZ: 0.8, move: 'slow push-in toward her' },
  { from: shifted(HOME, [-1.2, 1.0, -4.5]), to: shifted(HOME, [-0.9, 1.15, -5.3]), typeZ: 0.8, move: 'cut closer, slow push-in on her face' },
  { from: shifted(HOME, [-1.2, 0, -0.4]), to: shifted(HOME, [1.2, 0, -0.4]), typeZ: 1, move: 'lateral dolly left to right (parallax)' },
  { from: HOME, to: shifted(HOME, [0, 0.2, -2.2]), typeZ: 1, move: 'push-in through the clones' },
  { from: LOW, to: lift(LOW, 0.9), typeZ: 1, move: 'low angle, vertical rise' },
  { from: shifted(HOME, [0.8, 0.3, -0.6]), to: shifted(HOME, [-0.6, 0.3, -1.2]), typeZ: 0, move: 'lateral dolly and push past her' },
  { from: shifted(HOME, [0, 0.4, -1.8]), to: shifted(HOME, [0, 0.2, 0.6]), typeZ: 1, move: 'pull-out from the logo' },
  { from: shifted(HOME, [0, -0.6, -0.6]), to: shifted(HOME, [0, 0.6, -1.0]), typeZ: 1, move: 'vertical travel up and push' },
  { from: HOME, to: shifted(HOME, [0.6, 0.15, -1.1]), typeZ: 0.8, move: 'slow push-in toward the STACK' },
  { from: { position: [0.4, -1.7, HOME_Z - 1.2], target: [-0.6, 0.4, 0], fov: 44 }, to: { position: [1.2, -1.3, HOME_Z - 1.8], target: [-0.4, 0.6, 0], fov: 44 }, typeZ: 0.8, move: 'swing to a low angle on the kick, then a rising dolly' },
];
/** The camera at t: the shot's pose, its base pose (the type layer is authored in its screen space) and depth. */
export const cameraAt = (t: number): { pose: CameraPose; base: CameraPose; typeZ: number } => {
  let i = 0;
  while (i < FRAMINGS.length - 1 && t >= (FRAMINGS[i + 1] as { t: number }).t - 1e-9) i++;
  const c = CAMERA[i];
  if (!c) throw new Error(`no camera for framing ${i}`);
  const t0 = (FRAMINGS[i] as { t: number }).t;
  const t1 = (FRAMINGS[i + 1] as { t: number } | undefined)?.t ?? PROOF_END;
  let path: CameraPath = drift(c.from, c.to, t0, t1);
  if (t >= GROOVE.start && t < VERSE.start) path = punched(punched(path, GROOVE_HITS, 0.05), [at('marker-feature')], 0.14);
  if (t >= VERSE.start) path = punched(path, [at('kick-head')], 0.12);
  return { pose: path(t), base: c.from, typeZ: c.typeZ };
};
if (CAMERA.length !== FRAMINGS.length) throw new Error(`proof: ${CAMERA.length} camera moves for ${FRAMINGS.length} framings`);

// ---- flash budget ------------------------------------------------------------------------------------------
export const WHITEOUTS: readonly WhiteoutSpec[] = [
  { id: 'metal-hit', t0: at('metal-hit'), frames: 3, figures: [{ card: GROOVE_CARDS.stage, at: GROOVE_O }], camera: () => HOME },
];
// the white-out (2 swings) and the hard metal -> disco switch on the verse downbeat (1 swing)
export const SWINGS: Swing[] = [...WHITEOUTS.flatMap(whiteoutSwings), { id: 'disco-switch', t: VERSE.start, swings: 1 }, { id: 'blue-burst', t: BLUE_BURST.t, swings: 1 }];
assertFlashBudget(SWINGS, 'proof 0-20 s');
