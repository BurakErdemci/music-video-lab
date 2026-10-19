// What the two characters do from bar 9 to the end of Test90 (see "Acting plan" and "Calendar" in sahne-haritasi.md).
// Pure data built from beats and events: no react import, so the check scripts can load it from node.
//
// test90-v5 tempo rules (director, after test90-v4: "transitions look 4x fast, things teleport, 50-56 s has so many
// transitions the animation cannot keep up"; then: "they can do the same movements again and again, transitions
// should be natural, no need to rush around; one animation stays at most 4-5 seconds"). They replace v3/v4's
// "never two identical cycles, a new drawing every 6 s", which had pushed the action rate up. Now:
//   - each action (one label: a held pose, or a small in-action cycle such as typing or a wave, plus breathing and
//     weight shift) lasts ~2-5 s, never more than 5 s; actions repeat freely;
//   - a transition between actions is an eased morph of at least 12 frames (TIN); a big body change (getting up,
//     sitting down, walking off) goes through breakdown drawings over 25-60 frames;
//   - at least 1 s of calm hold between two transitions, at most ~3 state changes per 10 s per character;
//   - beat accents still land on beats (the note leaves on its beat, the wave on "Merhaba"), but not every beat gets
//     a new pose. Measured by video/scripts/tempocheck.mjs.
import { actor, frameScale, play, STRIP_TABLE, walkCycle, type Cursor, type Step } from '../characters/actor.ts';
import type { StripFrame, StripMeta } from '../characters/stripData.ts';
import { EVENTS, ev } from '../events.ts';
import { beatFrame } from '../timing.ts';

export const HUMAN_FLOOR = 1000;
export const AI_FLOOR = 1010;
/** The desk's right leg (the desk strips H01/H15/H16 and the DESK prop are anchored on it). */
export const DESK_X = 420;
/** Where the human's feet are when he has got up (H17 f4: feet centre 212 source px left of the desk leg). */
export const DESK_STAND_X = DESK_X - 215;
/** Standing at the glass: H12 f3 (offer) holds the note with its tip ~6 px before the seam. */
export const NOTE_X = 727;
/** H12 f4 (the note pressed flat on the glass). */
export const STICK_X = 728;
/** The reach on "tanışmışız" (H12 f3 -> f4 at the glass). */
export const REACH_X = 727;
/** H10 wave / H11 notebook spot. */
export const WAVE_X = 760;
/** H07 hands on the glass. */
export const LEAN_X = 769;
/** Where he sits on the floor with the notebook, by the glass (test90-v5: he sits down where he stands instead of
 * walking back first; H21 f4 and H06 end ~30 px before the seam). */
export const FLOOR_X = 790;
/** Sitting down on the floor (H21 f1..f4 -> H06 f1): each drawing's anchor where it overlaps the next best. */
const SIT_DOWN: readonly (readonly [number, number])[] = [[1, -76], [2, -102], [3, 94], [4, -166]];
export const AI_HOME = 1180;
/** The old a04 reach pose (hand 7 px behind the seam). */
export const AI_REACH_X = 1167;
/** Where the AI sits swinging her legs (chorus 1): getting up from there (A18) ends on AI_HOME. */
export const AI_SIT_X = 1334;
/** Where she sits reading (A15 sitting down from A06 f1 at AI_HOME lands A09 here). */
export const AI_READ_X = 1176;
/** A15 f1..f4 anchors from A06 f1 at AI_HOME (best overlap); A16 f1..f4 from A09 at AI_READ_X, ramped so A02 lands
 * on AI_SIT_X; A18 f1..f4 from A02 at AI_SIT_X. */
const A15_X = [1208, 1230, 1174, 1190];
/** A22 f2..f4 from A06 f1 at AI_HOME (best overlap; A15 f2 then lands on 1228). */
const A22_X = [1202, 1212, 1212];
const A16_X = [1176, 1213, 1195, 1148];
const A18_X = [AI_SIT_X - 128, AI_SIT_X - 160, AI_SIT_X - 150, AI_SIT_X - 158];
/** Where the notebook lies: under her reaching hand in A22 f4 (fingertips at x 1040). */
export const AI_BOOK_X = 1060;

/** `n` steps that add up to `total` frames, remainder to the first steps. */
export const scaled = (n: number, total: number): number[] => {
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
};

export interface Morning {
  id: string;
  /** Beat frame the AI's mini wave starts on. */
  start: number;
  /** Frames until the next morning. */
  dur: number;
  kind: 'slow' | 'beat' | 'lapse';
  /** 0-based count of mornings. */
  n: number;
}

/** Mornings 1-2 on 2 beats, 3-5 on 1 beat, then the time-lapse: one morning per beat. */
export const MORNINGS: readonly Morning[] = (() => {
  const out: Morning[] = [];
  const rows = EVENTS.filter((e) => e.id.startsWith('morning.')).slice().sort((a, b) => a.frame - b.frame);
  const lapse = EVENTS.filter((e) => e.id.startsWith('lapse.')).slice().sort((a, b) => a.frame - b.frame);
  const firstLapse = lapse[0];
  if (!firstLapse) throw new Error('no lapse events');
  rows.forEach((e, i) => {
    const next = rows[i + 1]?.frame ?? firstLapse.frame;
    out.push({ id: e.id, start: e.frame, dur: next - e.frame, kind: next - e.frame > 20 ? 'slow' : 'beat', n: out.length });
  });
  for (const e of lapse) out.push({ id: e.id, start: e.frame, dur: beatFrame(e.beatIdx + 1) - e.frame, kind: 'lapse', n: out.length });
  return out;
})();
const m = (i: number): Morning => MORNINGS[i] as Morning;
export const LAPSE_FROM = (MORNINGS.find((x) => x.kind === 'lapse') as Morning).start;
export const LAPSE_TO = m(MORNINGS.length - 1).start + m(MORNINGS.length - 1).dur;

export interface HumanBubble {
  text: string;
  start: number;
  end: number;
}
/** The human's answers follow his decline at the glass (test90-v5): eager while holding his note up, then with
 * his forehead on the glass, then with his head down. Each starts on a beat. */
export const HUMAN_BUBBLES: readonly HumanBubble[] = [
  { text: 'Merhaba! Dün…', start: m(0).start + 12, end: m(2).start + 4 },
  { text: 'Merhaba, ben…', start: beatFrame(ev('lapse.160').beatIdx), end: beatFrame(ev('lapse.164').beatIdx) },
  { text: 'Yine ben.', start: beatFrame(ev('lapse.166').beatIdx), end: beatFrame(ev('lapse.170').beatIdx) },
];

/** Tally marks: one per beat (the tally events), which is one per morning in the time-lapse. */
export const TALLY_STARTS: readonly number[] = EVENTS.filter((e) => e.id.startsWith('tally.'))
  .map((e) => e.frame)
  .sort((a, b) => a - b);

// ---- the action builder -------------------------------------------------------------------------------------------

/** A transition between two actions: an eased morph of this many frames (>= 12). */
const TIN = 16;
/** A morph inside an action (a key press, a hand of the wave): calm, not snappy. */
const INNER = 8;
/** Least hold of an action's first and last drawing (they carry the transitions in and out). */
const EDGE = 24;

/** One drawing of an action: strip, 1-based drawing, hold (frames; the last one of an action stretches to fit). */
type D = readonly [strip: string, k: number, hold: number];

/**
 * An action from the cursor up to frame `until` (exclusive): its drawings play in order and repeat (in-action
 * motion) until then; the last one shown stretches to land exactly on `until`. The change INTO it is a TIN-frame
 * eased morph centred on the cursor frame.
 */
const act = (c: Cursor, label: string, until: number, x: number, draws: readonly D[], o: { flip?: boolean; tin?: number; inner?: number } = {}): Cursor => {
  if (until <= c.tl.t) throw new Error(`${label}: ends at ${until}, before it starts (${c.tl.t})`);
  const steps: Step[] = [];
  let t = c.tl.t;
  for (let i = 0; t < until; i++) {
    const [strip, k, h] = draws[i % draws.length] as D;
    let hold = Math.min(h, until - t);
    // never leave a sliver shorter than an in-action morph at the end: give it to this drawing
    if (until - (t + hold) < (o.inner ?? INNER) + 2) hold = until - t;
    steps.push({ strip, k, hold });
    t += hold;
  }
  // the transitions out of and into the action take their length from its first and last drawing's hold (a morph
  // never takes more than either side's hold): a short in-action drawing at either end would cut them short
  while (steps.length > 1 && (steps[steps.length - 1] as Step).hold < EDGE) {
    const last = steps.pop() as Step;
    (steps[steps.length - 1] as Step).hold += last.hold;
  }
  while (steps.length > 1 && (steps[0] as Step).hold < EDGE) {
    const s0 = steps.shift() as Step;
    (steps[0] as Step).hold += s0.hold;
    Object.assign(steps[0] as Step, { strip: s0.strip, k: s0.k });
  }
  const first = steps[0] as Step;
  play(c, { strip: first.strip as string, steps, x, flip: o.flip, act: label, tin: o.tin ?? TIN, tinner: o.inner ?? INNER });
  return c;
};

/**
 * A transition drawn with breakdown drawings (getting up, sitting down): every drawing held `hold` frames and the
 * morph into it as long as the hold, so the body moves continuously, slower at both ends.
 */
const chain = (c: Cursor, label: string, draws: readonly (readonly [strip: string, k: number, x: number, hold: number, flip?: boolean])[], tin?: number): Cursor => {
  draws.forEach(([strip, k, x, h, flip], i) => {
    play(c, { strip, seq: [k], holds: [h], x, flip, act: `~${label}`, tin: i === 0 ? (tin ?? h) : h });
  });
  return c;
};

/** Actions that are one continuous motion (the drawings change all the time, but it reads as one thing: typing
 * hands, a waving hand, rocking on the heels, swinging legs, a writing hand, a walk). In every other action a change
 * of drawing is a change of state (video/scripts/tempocheck.mjs). */
export const CONTINUOUS_ACTS: readonly string[] = ['type', 'wave', 'rock', 'swing', 'write', 'walk'];

/** The glass seam as the human touches it: forehead/hand side, and his back when he leans on it. */
const GLASS_FRONT = 950;
const GLASS_BACK = 948;
/** Anchor x that puts a drawing's right edge (its forehead, hand or back toward the glass) on `edge`. */
const edgeX = (strip: string, k: number, flip: boolean, edge: number): number => {
  const sm = STRIP_TABLE[strip] as StripMeta;
  const f = sm.frames[k - 1] as StripFrame;
  const sc = frameScale(sm, f);
  return Math.round(flip ? edge - f.ax * sc : edge - (f.w - f.ax) * sc);
};
/** A calm walk: frames each drawing of the step is held (four drawings a step). */
const WALK_HOLD = 7;

// ---- 1:28.7 -> 2:12 (verse 2, pre-chorus 2, chorus 2): every action start, frames. Chosen against the tempo rules
// (<= 3 changes per 10 s, holds >= 1 s, actions 2-5 s; video/scripts/tempocheck.mjs --from 2661 --to 3894) and the
// events they serve (events.ts): the lamps from 2955, the camera out 3095, the torch 3249, "hatirlarim" 3291, the
// first chorus-2 flood 3390, "buradayiz" 3656.
/** The end of Test2 (2:12): the last actions run to here. */
export const TEST2_END = 3960;
/** From here the human's "Merhaba" note on the glass is drawn UNDER the characters (his palm presses over it at
 * "buradayiz"). It switches while he sits on the floor away from the glass (pre-chorus 2), so nothing visibly
 * changes layer then; until 1:28.7 (Test90) the note stays over his pressing hand as before. */
export const NOTE_UNDER_FROM = 3200;
const V2 = {
  pressEnd: 2740,
  handDown: 2880,
  look: 3010,
  sit: 3130,
  wall: 3286,
  stand: 3420,
  palms: 3600,
  forehead2: 3740,
  handDown2: 3880,
  end: TEST2_END,
};
const V2A = {
  lines: 2760,
  write: 2845,
  turn: 2935,
  peer: 3085,
  turnBack: 3215,
  rock: 3380,
  moon: 3500,
  reach: 3600,
  tilt: 3740,
  rock2: 3870,
  end: TEST2_END,
};
/** Sitting with the torch (H30, drawn like H06: cross-legged facing the glass), 48 px back from FLOOR_X so the lens
 * of the outstretched torch (f2) stays ~30 px before the glass. */
export const TORCH_X = FLOOR_X - 48;
/** Chorus 2 "buradayiz": the AI's open palm (A07 f2, 119 px ahead of her anchor) 7 px behind the seam. */
export const AI_PALM_X = 1086;
/** Sitting down with the torch (H31 f1..f4): each drawing where it best overlaps the next (f4 on H30 f1 at TORCH_X;
 * scratchpad overlap search), and where the note-writing drawing (H19 f2) best overlaps H31 f1 when he is up. */
const TORCH_SIT: readonly (readonly [number, number])[] = [[1, 734], [2, 715], [3, 729], [4, 752]];
const TORCH_SIT_UP = 732;
/** Where the torch's lens is in the world (H30 f2 aimed at the glass, f3 over his shoulder at his wall; source px of
 * the lens tip measured on video/public/strips/H30-fener-2/3.png), and the morph that swings it from one to the other
 * (the transition into 'torchWall', TIN-centred on V2.wall). Test30Scene draws the beam from here. */
const lensAt = (k: number, px: number, py: number): { x: number; y: number } => {
  const sm = STRIP_TABLE.H30 as StripMeta;
  const f = sm.frames[k - 1] as StripFrame;
  const sc = frameScale(sm, f);
  return { x: TORCH_X + (px - f.ax) * sc, y: HUMAN_FLOOR - (f.h - py) * sc };
};
export const TORCH_BEAM = { aim: lensAt(2, 438, 177), wall: lensAt(3, 16, 8), swing: { from: V2.wall - 8, frames: 16 } };

// ---- the human ----------------------------------------------------------------------------------------------------

/** Getting up from the desk: typing (H01 f1), the typing drawing whose chair stands where H17's does (H15 f3), then
 * H17's four breakdowns. Every desk drawing keeps the furniture in place, so only the body moves. */
const RISE: readonly (readonly [string, number, number])[] = [
  ['H15', 3, 6],
  ['H17', 1, 6],
  ['H17', 2, 6],
  ['H17', 3, 6],
  ['H17', 4, 8],
];
const rise = (c: Cursor): Cursor => chain(c, 'rise', RISE.map(([s, k, h]) => [s, k, DESK_X, h] as const), 12);
const sitFloor = (c: Cursor): Cursor => chain(c, 'sit', SIT_DOWN.map(([k, dx]) => ['H21', k, FLOOR_X + dx, 8] as const), 14);
const standFloor = (c: Cursor): Cursor => chain(c, 'stand', [...SIT_DOWN].reverse().map(([k, dx]) => ['H21', k, FLOOR_X + dx, 8] as const), 14);

// in-action cycles
const TYPE: readonly D[] = [['H01', 1, 16], ['H01', 4, 12], ['H01', 1, 22], ['H01', 4, 12], ['H01', 1, 18], ['H01', 4, 12]];
const TYPE_FAST: readonly D[] = [['H01', 1, 12], ['H01', 4, 10]];

const buildHuman = () => {
  const c: Cursor = actor(HUMAN_FLOOR, ev('room.human').frame);
  // verse 1, lines 1-2, at the desk (the two notes leave the laptop on their beats, scenes/Test30Scene.tsx):
  // typing, leaning back to look at what he wrote (note 1 leaves the laptop), typing again (note 2)
  act(c, 'type', 610, DESK_X, TYPE, { tin: 0 });
  act(c, 'leanBack', 730, DESK_X, [['H15', 1, 999]]);
  act(c, 'type', 880, DESK_X, TYPE);
  // "Dün gece": gets up and holds yesterday's note in front of him, reading it
  rise(c);
  act(c, 'readNote', 1070, DESK_STAND_X, [['H12', 2, 999]], { tin: 12 });
  // walks to the glass, slowly; the notes of "Baştan anlatıyorum" leave his hand on their beats on the way, and on
  // "tanışmışız" he arrives and his palm goes flat on the glass, until the line ends
  walkCycle(c, 'H28', DESK_STAND_X, STICK_X, { hold: WALK_HOLD });
  act(c, 'reach', ev('pose.release').frame, STICK_X, [['H12', 4, 999]], { tin: 14 });
  // pre-chorus: sits down on the floor where he is, writes in the notebook, reads it held up, looks up at the
  // sketches floating out of the AI's notebook
  sitFloor(c);
  act(c, 'write', 1440, FLOOR_X, [['H06', 1, 30], ['H06', 4, 16], ['H06', 1, 40], ['H06', 4, 16]]);
  act(c, 'readUp', 1560, FLOOR_X, [['H18', 2, 999]]);
  act(c, 'lookUp', 1672, FLOOR_X, [['H18', 3, 999]]);
  // chorus 1: gets up, holds a coffee, sighs over it, palms on the glass for "buradayız"
  standFloor(c);
  const x0 = FLOOR_X + (SIT_DOWN[0] as readonly [number, number])[1];
  act(c, 'coffee', 1840, x0, [['H02', 1, 999]], { tin: 12 });
  act(c, 'sigh', 1990, x0, [['H02', 4, 999]]);
  act(c, 'palms', 2110, LEAN_X, [['H07', 3, 999]], { tin: 18 });
  // calendar (test90-v5, the director): he never leaves the glass; only his body changes, a slow decline across the
  // mornings, continuous over the AI's resets. Mornings 1-2 eager, holding his note up to the glass ("Merhaba! Dün…");
  // morning 3 forehead on the glass ("Merhaba, ben…"); morning 4 hand flat on the glass, head down ("Yine ben.");
  // the time-lapse: he turns his back to the glass and slides down to the floor, sits against it writing a note
  act(c, 'eager', 2230, edgeX('H12', 3, false, GLASS_FRONT), [['H12', 3, 999]], { tin: 16 });
  act(c, 'forehead', 2330, edgeX('H25', 2, false, GLASS_FRONT), [['H25', 2, 999]], { tin: 18 });
  act(c, 'handDown', 2420, edgeX('H25', 3, false, GLASS_FRONT), [['H25', 3, 999]], { tin: 16 });
  const turnX = edgeX('H09', 3, false, GLASS_FRONT - 10);
  const back = (k: number): number => edgeX('H26', k, true, GLASS_BACK);
  chain(c, 'turnSlide', [
    ['H09', 2, turnX, 8],
    ['H09', 3, turnX, 8],
    ['H09', 2, turnX, 8, true],
    ['H26', 1, back(1), 9, true],
    ['H26', 2, back(2), 9, true],
    ['H26', 3, back(3), 9, true],
    ['H26', 4, back(4), 10, true],
  ], 14);
  act(c, 'seated', 2540, edgeX('H27', 3, false, GLASS_BACK), [['H27', 3, 999]], { tin: 12 });
  // the last morning: he gets up BEFORE the AI says it and presses the note he wrote on the glass
  const note = ev('final.note').frame;
  const up: [string, number, number, number, boolean?][] = [
    ['H26', 4, back(4), 8, true],
    ['H26', 3, back(3), 7, true],
    ['H26', 2, back(2), 7, true],
    ['H26', 1, back(1), 7, true],
    ['H09', 2, turnX, 7, true],
    ['H09', 3, turnX, 7],
    ['H09', 2, turnX, 7],
  ];
  const upFrames = up.reduce((t, d) => t + d[3], 0);
  up.push(['H12', 3, NOTE_X, note - 6 - (c.tl.t + upFrames)]);
  chain(c, 'getUp', up, 12);
  act(c, 'press', V2.pressEnd, STICK_X, [['H12', 4, 999]], { tin: 12 });
  // ---- verse 2 (1:28.7, the AI sings): he stays at the glass, watching her side. "Ayni hata": forehead on the
  // glass; the lamps: hand flat on it, head down; "sen bakinca goruyorsun": he lifts his head and looks
  act(c, 'forehead', V2.handDown, edgeX('H25', 2, false, GLASS_FRONT), [['H25', 2, 999]], { tin: 18 });
  act(c, 'handDown', V2.look, edgeX('H25', 3, false, GLASS_FRONT), [['H25', 3, 999]], { tin: 16 });
  act(c, 'look', V2.sit, edgeX('H25', 1, false, GLASS_FRONT), [['H25', 1, 999]], { tin: 16 });
  // ---- pre-chorus 2: "Kizmiyorum": he sits down calmly on the floor by the glass (H21, slow breakdowns); "bakiyorum":
  // the torch shines through the glass (H30 f2, the beam is drawn by the scene); "hatirlarim": he turns it back over
  // his shoulder onto his own wall of notes (H30 f3) and holds it there through "yeter mi"
  // (H31: drawn with the torch in his hand; H21's first step doubled the body for ~5 frames, morphcheck G2)
  chain(c, 'sit', TORCH_SIT.map(([k, x]) => ['H31', k, x, 12] as const), 18);
  act(c, 'aim', V2.wall, TORCH_X, [['H30', 2, 999]], { tin: 16 });
  act(c, 'torchWall', V2.stand, TORCH_X, [['H30', 3, 999]], { tin: 16 });
  // ---- chorus 2: gets up, writes note after note (they fly through the glass, scenes/Test30Scene.tsx), palms on the
  // glass for "buradayiz" (the hands pass through it for one beat), then the decline: forehead, hand down
  chain(c, 'stand', [...TORCH_SIT].reverse().map(([k, x]) => ['H31', k, x, 11] as const), 16);
  act(c, 'write', V2.palms, TORCH_SIT_UP, [['H19', 2, 40], ['H19', 3, 30], ['H19', 2, 34], ['H19', 3, 30]], { tin: 14, inner: 10 });
  act(c, 'palms', V2.forehead2, LEAN_X, [['H07', 3, 999]], { tin: 18 });
  act(c, 'forehead', V2.handDown2, edgeX('H25', 2, false, GLASS_FRONT), [['H25', 2, 999]], { tin: 18 });
  act(c, 'handDown', V2.end, edgeX('H25', 3, false, GLASS_FRONT), [['H25', 3, 999]], { tin: 16 });
  return c.tl.acts;
};
export const HUMAN = buildHuman();

// ---- the AI -------------------------------------------------------------------------------------------------------

/** The wave: a hand going side to side (A07 f1-f3). */
const WAVE: readonly D[] = [['A07', 1, 14], ['A07', 2, 12], ['A07', 3, 14], ['A07', 2, 12]];
const ROCK: readonly D[] = [['A08', 1, 18], ['A08', 2, 14], ['A08', 3, 18], ['A08', 2, 14]];

const buildAi = () => {
  const c: Cursor = actor(AI_FLOOR, ev('room.ai').frame);
  const merhaba = ev('bubble.merhaba').frame;
  // verse 1, lines 1-2: rocking on her heels, a curious tilt, the wave on "Merhaba", hands on hips
  act(c, 'rock', 590, AI_HOME, ROCK, { tin: 0 });
  act(c, 'tilt', merhaba - 10, AI_HOME, [['A06', 2, 999]]);
  act(c, 'wave', 800, AI_HOME, WAVE, { tin: 14, inner: 10 });
  act(c, 'hips', ev('wave.dun').frame, AI_HOME, [['A05', 3, 999]]);
  // "Dün gece": the room is wiped; she looks up at the moon, then watches the notes arrive (a raised finger)
  act(c, 'moon', 1050, AI_HOME, [['A04', 1, 999]]);
  const reach = ev('pose.reach').frame;
  act(c, 'notes', reach - 16, AI_HOME, [['A06', 4, 999]]);
  // "tanışmışız": the reach to the glass
  act(c, 'reach', ev('pose.release').frame + 6, AI_REACH_X, [['P_a04', 1, 999]]);
  // pre-chorus: the notebook falls, she bends down to it (A22), picks it up and sits down cross-legged (A15), reads
  chain(c, 'bend', [
    ['A06', 1, AI_HOME, 8],
    ...A22_X.map((x, i) => ['A22', i + 2, x, 6] as const),
    ...A15_X.slice(1).map((x, i) => ['A15', i + 2, x, 6] as const),
  ], 14);
  // reading; "anlıyorum": she looks up at the check; "hatırlamıyorum": she hugs the closed notebook
  act(c, 'read', 1470, AI_READ_X, [['A09', 1, 999]]);
  act(c, 'look', 1530, AI_READ_X, [['A17', 2, 999]]);
  act(c, 'hug', 1640, AI_READ_X, [['A17', 4, 999]]);
  // chorus 1: puts the notebook down and stretches her legs out (A16); between the waves she swings her legs, leans
  // back, hugs her knees, then faces the glass for "buradayız"
  chain(c, 'legsOut', A16_X.map((x, i) => ['A16', i + 1, x, 8] as const), 14);
  act(c, 'swing', 1800, AI_SIT_X, [['A02', 1, 20], ['A02', 2, 16], ['A02', 1, 20], ['A02', 3, 16]], { inner: 10 });
  act(c, 'lean', 1920, AI_SIT_X, [['A14', 1, 999]]);
  act(c, 'hugKnees', 2030, AI_SIT_X, [['A14', 2, 999]]);
  act(c, 'faceGlass', 2110, AI_SIT_X, [['A02', 4, 999]]);
  // gets up for the first morning (A18)
  chain(c, 'getUp', [['A02', 1, AI_SIT_X, 8], ...A18_X.map((x, i) => ['A18', i + 1, x, 7] as const)], 12);
  // calendar: every morning the same "Merhaba" (the bubble, scenes/Test30Scene.tsx). She waves, rests (rocking on her
  // heels while the mornings go on), waves again; after the last morning she stands calm and, when the human's note
  // appears on the glass, tilts her head at it
  act(c, 'wave', 2290, AI_HOME, WAVE, { tin: 14, inner: 10 });
  act(c, 'rock', 2400, AI_HOME, ROCK);
  act(c, 'wave', 2540, AI_HOME, WAVE, { tin: 14, inner: 10 });
  act(c, 'behind', ev('final.reset').frame, AI_HOME, [['A05', 4, 999]]);
  act(c, 'tiltNote', V2A.lines, AI_HOME, [['A06', 2, 999]], { tin: 18 });
  // ---- verse 2 (she sings). "Yazili duruyor hepsi, satir satir": she looks up at the notebook's lines sliding past;
  // "ayni hata": she writes, and the same crossed-out note comes out of her hand three times
  act(c, 'lines', V2A.write, AI_HOME, [['A06', 3, 999]], { tin: 16 });
  // (enters on A11 f3 and leaves from f1: A06 f3 -> A11 f2 and A11 f1 -> A10 f4 lost the pen and note in the morph,
  // morphcheck G2)
  act(c, 'write', V2A.turn, AI_HOME, [['A11', 3, 30], ['A11', 2, 30], ['A11', 1, 999]], { tin: 16, inner: 10 });
  // "tamam / bitti": she turns to the crates (A10 played back: facing left -> right), hands on her hips while the
  // lamps switch on; "hicbir sey olculmemis": she bends to look into the crates; then turns back to the glass and
  // shades her eyes in the human's torch beam ("bakiyorum")
  // (the turn skips A10 f4, her profile to the left: A10 f3 -> f4 lost the cursor line in the morph, G2)
  chain(c, 'turn', [3, 2, 1].map((k) => ['A10', k, AI_HOME, 11] as const), 14);
  act(c, 'proud', V2A.peer, AI_HOME, [['A05', 3, 999]], { flip: true, tin: 14 });
  act(c, 'peer', V2A.turnBack, AI_HOME + 30, [['A06', 1, 999]], { flip: true, tin: 18 });
  chain(c, 'turn', [1, 2, 3].map((k) => ['A10', k, AI_HOME, 12] as const), 14);
  act(c, 'shade', V2A.rock, AI_HOME, [['A04', 2, 999]], { tin: 14 });
  // ---- chorus 2: the same morning every bar. She rocks on her heels between the waves, looks up at the moon on "Ay
  // dolar", reaches to the glass for "buradayiz" (her hand passes through it for one beat), tilts her head, rocks
  act(c, 'rock', V2A.moon, AI_HOME, ROCK, { tin: 14 });
  act(c, 'moon', V2A.reach, AI_HOME, [['A04', 1, 999]], { tin: 16 });
  // (A07 f2: her open palm at the height of his (H07 f3 fingertips at y 422, hers 407), 7 px behind the seam)
  act(c, 'palm', V2A.tilt, AI_PALM_X, [['A07', 2, 999]], { tin: 18 });
  act(c, 'tilt', V2A.rock2, AI_HOME, [['A06', 2, 999]], { tin: 16 });
  act(c, 'rock', V2A.end, AI_HOME, ROCK, { tin: 14 });
  return c.tl.acts;
};
export const AI = buildAi();

/** The frame she picks the notebook up from the floor (A15 f2): the floor notebook prop goes then. */
export const AI_PICKUP = (() => {
  const a = AI.find((x) => x.strip === 'A15' && (x.seq as readonly number[] | undefined)?.[0] === 2);
  if (!a) throw new Error('no A15 f2 in the AI timeline');
  return a.from;
})();
