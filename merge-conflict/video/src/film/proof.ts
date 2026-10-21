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
import { at, EVENTS } from '../events.ts';
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

/** Round 5: the proof runs to the end of chorus 1, so it ends on a phrase. */
export const PROOF_END = sectionNamed('chorus1').end;

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
export const LINE0: FormSpec = { id: 'robot-0', line: 0, key: 2, singer: 'B', t0: 0, t1: at('wipe-flap') + 0.4, box: { x: 945, y: 230, w: 775, h: 330 } };
export const LINE1: FormSpec = { id: 'robot-1', line: 1, key: 1, singer: 'B', t0: at('wipe-flap'), t1: GROOVE.start + 0.25, box: { x: 945, y: 430, w: 845, h: 420 } };
export const CODE_OPT = { gutter: '!', size: 38, keyScale: 1.6, chrome: 'git merge feature', terminal: true, backing: true } as const;
export const FIX: WordAt = { text: 'FIX', x: 1120, y: 930, size: 330, face: 'display', fill: '#ff3b3b' };
export const MORPH_FIX = morphPlan({ id: 'morph-fix', t0: at('morph-fix') - 24 / 60, frames: 24, from: { text: 'FAILED.', x: 0, y: 0, size: CODE_OPT.size * 1.6, face: 'jetbrains', fill: '#ff3b3b' }, to: FIX });
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
// round 7: smaller and in the upper right, so the subway map stays visible behind it
export const STACK2: FormSpec = { id: 'verse-2', line: 2, key: 1, singer: 'B', t0: VERSE.start, t1: at('morph-line') + 0.02, box: { x: 1120, y: 70, w: 740, h: 380 } };
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
/** Line 3 "Line forty-two, the button was blue" as a big left-aligned line; CLEAN morphs into its LINE. */
export const LYRIC3 = { x: 700, y: 300, w: 1160, size: 140 } as const;
export const MORPH_LINE = morphPlan({
  id: 'morph-line',
  t0: at('morph-line'),
  frames: 16,
  from: { text: cleanAt.text, x: cleanAt.x, y: cleanAt.y, size: cleanAt.size, face: cleanAt.face, fill: '#7a6cff' },
  to: { text: 'LINE', x: LYRIC3.x, y: LYRIC3.y, size: LYRIC3.size, face: 'bebas', fill: '#2f7bff' },
});

// ---- framings (never longer than 2 bars) -----------------------------------------------------------------
export const FRAMINGS = framingPlan(
  [
    { t: 0, kind: 'knee', who: 'B' },
    { t: at('framing-face'), kind: 'face', who: 'B' },
    { t: GROOVE.start, kind: 'stage', who: 'O' },
    { t: at('framing-clones'), kind: 'clones', who: 'O' },
    { t: at('framing-low'), kind: 'low', who: 'O' },
    { t: at('framing-knee'), kind: 'knee', who: 'O' },
    { t: at('framing-tiny'), kind: 'tiny', who: 'O' },
    { t: at('framing-waist'), kind: 'waist', who: 'O' },
    // verse 1, blue
    { t: VERSE.start, kind: 'knee', who: 'B' },
    { t: at('framing-stage-2'), kind: 'stage', who: 'B' },
    { t: at('framing-v1-low'), kind: 'low', who: 'B' },
    { t: at('framing-v1-waist'), kind: 'waist', who: 'B' },
    { t: at('framing-v1-face'), kind: 'face', who: 'B' },
    { t: at('orange-anticipate'), kind: 'stage', who: 'both' },
    // verse 2, orange (disco)
    { t: at('orange-release'), kind: 'knee', who: 'O' },
    { t: at('framing-v2-waist'), kind: 'waist', who: 'O' },
    { t: at('framing-v2-split'), kind: 'split', who: 'both' },
    { t: at('framing-v2-low'), kind: 'low', who: 'O' },
    { t: at('framing-v2-stage'), kind: 'stage', who: 'O' },
    // pre-chorus ping-pong, the transformation
    { t: at('tok-10-0'), kind: 'face', who: 'B' },
    { t: at('tok-11-0'), kind: 'face', who: 'O' },
    { t: at('tok-12-0'), kind: 'split', who: 'both' },
    { t: at('tok-13-0'), kind: 'knee', who: 'O' },
    { t: at('framing-pre-both'), kind: 'stage', who: 'both' },
    // chorus 1 on the split stage
    { t: at('framing-c1'), kind: 'split', who: 'both' },
    { t: at('tok-15-3'), kind: 'knee', who: 'O' },
    { t: at('framing-c3'), kind: 'split', who: 'both' },
    { t: at('tok-17-0'), kind: 'stage', who: 'both' },
    { t: at('tok-18-0'), kind: 'tiny', who: 'both' },
    { t: at('tok-18-2'), kind: 'waist', who: 'O' },
    { t: at('framing-c7'), kind: 'split', who: 'both' },
    { t: at('framing-c8'), kind: 'knee', who: 'O' },
    { t: at('framing-c9'), kind: 'split', who: 'both' },
    { t: at('tok-21-0'), kind: 'stage', who: 'both' },
    { t: at('tok-22-0'), kind: 'tiny', who: 'both' },
    { t: at('tok-22-2'), kind: 'waist', who: 'O' },
    { t: at('framing-c13'), kind: 'split', who: 'both' },
  ],
  PROOF_END,
);

// ---- the camera: every held shot moves continuously (round 4); the groove adds a fov punch every 2 beats --------
const LOW: CameraPose = { position: [0, -2.6, HOME_Z - 3], target: [0, 1.2, 0], fov: 46 };
const lift = (p: CameraPose, dy: number): CameraPose => ({ ...p, position: [p.position[0], p.position[1] + dy, p.position[2]], target: [p.target[0], p.target[1] + dy * 0.6, p.target[2]] });
/** The moves from verse 1's low angle on: one per cue, chosen by the framing kind, alternating direction so
 *  consecutive shots never travel the same way. */
const moveFor = (kind: string, k: number): { from: CameraPose; to: CameraPose; typeZ: number; move: string } => {
  const d = k % 2 ? 1 : -1;
  if (kind === 'stage') return { from: shifted(HOME, [-0.9 * d, 0.2, -0.3]), to: shifted(HOME, [0.9 * d, 0.2, -0.6]), typeZ: 0.8, move: 'lateral dolly (parallax)' };
  if (kind === 'knee') return { from: shifted(HOME, [0.3 * d, 0, 0]), to: shifted(HOME, [-0.2 * d, 0.2, -1.2]), typeZ: 0.8, move: 'slow push-in' };
  if (kind === 'waist') return { from: shifted(HOME, [0, -0.5, -0.4]), to: shifted(HOME, [0.2 * d, 0.5, -0.9]), typeZ: 0.8, move: 'vertical travel up and push' };
  if (kind === 'face') return { from: shifted(HOME, [0.2 * d, 0.1, -0.2]), to: shifted(HOME, [0, 0.25, -0.9]), typeZ: 0.8, move: 'slow push-in' };
  if (kind === 'split') return { from: shifted(HOME, [0.6 * d, 0.1, 0]), to: shifted(HOME, [-0.6 * d, 0.1, -0.5]), typeZ: 0.8, move: 'lateral dolly across the split' };
  if (kind === 'tiny') return { from: shifted(HOME, [0, 0.4, -1.6]), to: shifted(HOME, [0, 0.2, 0.5]), typeZ: 1, move: 'pull-out from the logo' };
  return { from: LOW, to: lift(LOW, 0.9), typeZ: 0.8, move: 'low angle, vertical rise' };
};
const LATER_MOVES = FRAMINGS.slice(10).map((c, k) => moveFor(c.kind, k));
/** The chorus pulse times (events kind 'pulse'). */
export const CHORUS_PULSE_TIMES = EVENTS.filter((e) => e.kind === 'pulse').map((e) => e.t);
/** One move per framing cue, in cue order: from -> to over the cue's span; typeZ is the type layer's depth. */
export const CAMERA: readonly { from: CameraPose; to: CameraPose; typeZ: number; move: string }[] = [
  { from: HOME, to: shifted(HOME, [-0.5, 0.25, -1.0]), typeZ: 0.8, move: 'slow push-in toward her' },
  { from: shifted(HOME, [-0.3, 0.2, -0.4]), to: shifted(HOME, [-0.1, 0.35, -1.1]), typeZ: 0.8, move: 'cut to her close-up card (B06), slow push-in' },
  { from: shifted(HOME, [-1.2, 0, -0.4]), to: shifted(HOME, [1.2, 0, -0.4]), typeZ: 1, move: 'lateral dolly left to right (parallax)' },
  { from: HOME, to: shifted(HOME, [0, 0.2, -2.2]), typeZ: 1, move: 'push-in through the clones' },
  { from: LOW, to: lift(LOW, 0.9), typeZ: 1, move: 'low angle, vertical rise' },
  { from: shifted(HOME, [0.8, 0.3, -0.6]), to: shifted(HOME, [-0.6, 0.3, -1.2]), typeZ: 0, move: 'lateral dolly and push past her' },
  { from: shifted(HOME, [0, 0.4, -1.8]), to: shifted(HOME, [0, 0.2, 0.6]), typeZ: 1, move: 'pull-out from the logo' },
  { from: shifted(HOME, [0, -0.6, -0.6]), to: shifted(HOME, [0, 0.6, -1.0]), typeZ: 1, move: 'vertical travel up and push' },
  { from: HOME, to: shifted(HOME, [0.6, 0.15, -1.1]), typeZ: 0.8, move: 'slow push-in toward the STACK' },
  { from: { position: [0.4, -1.7, HOME_Z - 1.2], target: [-0.6, 0.4, 0], fov: 44 }, to: { position: [1.2, -1.3, HOME_Z - 1.8], target: [-0.4, 0.6, 0], fov: 44 }, typeZ: 0.8, move: 'swing to a low angle on the kick, then a rising dolly' },
  ...LATER_MOVES,
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
  if (t >= VERSE.start && t < sectionNamed('verse2_raspy').start) path = punched(path, [at('kick-head')], 0.12);
  // orange's metal release on "ORANGE!" and the chorus pulses on the metal half
  if (t >= at('tok-13-0') - 0.01) path = punched(path, [at('tok-13-0'), ...CHORUS_PULSE_TIMES], 0.05);
  return { pose: path(t), base: c.from, typeZ: c.typeZ };
};
/** The framing playing at t, for the living camera (film/livecam.ts). */
export const framingSpan = (t: number): { t0: number; t1: number; key: string } => {
  let i = 0;
  while (i < FRAMINGS.length - 1 && t >= (FRAMINGS[i + 1] as { t: number }).t - 1e-9) i++;
  return { t0: (FRAMINGS[i] as { t: number }).t, t1: (FRAMINGS[i + 1] as { t: number } | undefined)?.t ?? PROOF_END, key: `proof-${i}` };
};
if (CAMERA.length !== FRAMINGS.length) throw new Error(`proof: ${CAMERA.length} camera moves for ${FRAMINGS.length} framings`);

// ---- flash budget ------------------------------------------------------------------------------------------
export const WHITEOUTS: readonly WhiteoutSpec[] = [
  { id: 'metal-hit', t0: at('metal-hit'), frames: 3, figures: [{ card: GROOVE_CARDS.stage, at: GROOVE_O }], camera: () => HOME },
];
// the white-out (2 swings), the hard metal -> disco switch on the verse downbeat, and each entrance burst (1 each)
export const ORANGE_BURST = { t: at('orange-release') + 1 / 60, origin: [3.9, -0.2, 0.5] as [number, number, number] };
export const METAL_BURST = { t: at('tok-13-0') + 1 / 60, origin: [3.4, 0.3, 0.5] as [number, number, number] };
export const SWINGS: Swing[] = [
  ...WHITEOUTS.flatMap(whiteoutSwings),
  { id: 'disco-switch', t: VERSE.start, swings: 1 },
  { id: 'blue-burst', t: BLUE_BURST.t, swings: 1 },
  { id: 'orange-burst', t: ORANGE_BURST.t, swings: 1 },
  { id: 'metal-burst', t: METAL_BURST.t, swings: 1 },
];
assertFlashBudget(SWINGS, 'proof 0-20 s');
