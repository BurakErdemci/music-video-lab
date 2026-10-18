// What the two characters do from bar 9 to 1:28.7 (see "Acting plan" and "Calendar" in sahne-haritasi.md).
// Pure data built from beats and events: no react import, so the check scripts can load it from node.
//
// test90-v3 rules (director, after test90-v2): no action loop may read as a GIF loop. Long stretches are
// "performances": a seeded sequence of sub-actions (phrases), never the same phrase twice in a row, every
// hold drawn from a range (anticipation short, action, settle, hold long), so no cycle repeats exactly.
// Main accents (a note leaving, a wave, a reach) are pinned to their beat; phrase starts snap to a beat
// when one is within 4 frames. Every change of drawing is a morph (characters/actor.ts).
import { actor, at, play, walk, type Action, type Cursor } from '../characters/actor.ts';
import { EVENTS, ev } from '../events.ts';
import { seeded } from '../style/seeded.ts';
import { BEAT_COUNT, barBeatIndex, beatFrame } from '../timing.ts';

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
/** Where he sits on the floor with the notebook (pre-chorus 1). */
export const FLOOR_X = 609;
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
/** The frame she picks the notebook up from the floor (A15 f2): the floor notebook prop goes then. */
export const AI_PICKUP = ev('ai.bend').frame + 3 + 4 + 4 + 5;
/** Where the notebook lies: under her reaching hand in A22 f4 (fingertips at x 1040). */
export const AI_BOOK_X = 1060;

/** `n` steps that add up to `total` frames, remainder to the first steps. */
export const scaled = (n: number, total: number): number[] => {
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
};

const bf = (bar: number, beat = 0): number => beatFrame(barBeatIndex(bar) + beat);
const BEATS: readonly number[] = Array.from({ length: BEAT_COUNT }, (_, i) => beatFrame(i));
const nextBeat = (f: number): number => BEATS.find((b) => b >= f) ?? f;

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

/**
 * Mornings 1-2 on 2 beats, 3-5 on 1 beat, then the time-lapse: one morning per beat (test90-v2 had two per
 * beat, 7 frames each: too cramped to read; the section keeps its length).
 */
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
export const HUMAN_BUBBLES: readonly HumanBubble[] = [
  { text: 'Merhaba! Dün…', start: m(0).start + 12, end: m(1).start },
  { text: 'Merhaba, ben…', start: m(2).start + 2, end: m(3).start },
  { text: 'Yine ben.', start: m(3).start + 2, end: m(4).start },
];

/** Tally marks: one per beat (the tally events), which is one per morning in the time-lapse. */
export const TALLY_STARTS: readonly number[] = EVENTS.filter((e) => e.id.startsWith('tally.'))
  .map((e) => e.frame)
  .sort((a, b) => a - b);

// ---- performances -------------------------------------------------------------------------------------------------

/** One drawing of a phrase: strip, 1-based drawing, hold range in frames. */
type PStep = readonly [strip: string, k: number, lo: number, hi: number];
export interface Phrase {
  id: string;
  steps: readonly PStep[];
}

/**
 * Fill [cursor, until) with phrases picked by a seeded generator: never the same phrase twice in a row, every
 * hold drawn from its range. A phrase start snaps onto a beat when one is within 4 frames. The last drawing
 * stretches or shrinks so the performance ends exactly on `until`.
 */
export const perform = (c: Cursor, phrases: readonly Phrase[], until: number, opts: { x: number; flip?: boolean; seed: string; first?: string }): Cursor => {
  const r = seeded(opts.seed);
  let prev = '';
  let pick = opts.first;
  while (c.tl.t < until - 2) {
    const pool = phrases.filter((p) => p.id !== prev);
    const ph = (pick ? phrases.find((p) => p.id === pick) : undefined) ?? (pool[Math.floor(r() * pool.length)] as Phrase);
    pick = undefined;
    prev = ph.id;
    for (const [strip, k, lo, hi] of ph.steps) {
      if (c.tl.t >= until - 2) break;
      let hold = Math.round(lo + (hi - lo) * r());
      if (until - (c.tl.t + hold) < 4) hold = until - c.tl.t;
      play(c, { strip, seq: [k], holds: [hold], x: opts.x, flip: opts.flip });
    }
    // snap the next phrase onto a beat when one is near
    const nb = nextBeat(c.tl.t);
    const last = c.tl.acts[c.tl.acts.length - 1] as Action;
    if (nb - c.tl.t > 0 && nb - c.tl.t <= 4 && nb < until - 2) {
      const h = (last.holds as number[])[0] as number;
      last.holds = [h + (nb - c.tl.t)];
      c.tl.t = nb;
    }
  }
  // land exactly on `until`
  const last = c.tl.acts[c.tl.acts.length - 1] as Action;
  if (c.tl.t !== until) {
    const h = (last.holds as number[])[0] as number;
    last.holds = [Math.max(1, h + (until - c.tl.t))];
    c.tl.t = until;
  }
  return c;
};

/** One drawing held `hold` frames. */
const hold = (c: Cursor, strip: string, k: number, frames: number, x: number, flip?: boolean): Cursor => play(c, { strip, seq: [k], holds: [frames], x, flip });

// The human's desk: typing bursts, pauses, a delete, leaning back, chin on hand, a glance over the shoulder,
// jotting a note. H01 and H15 are both drawn with the same desk, anchored on its leg, so the desk stays put.
const DESK: readonly Phrase[] = [
  { id: 'type', steps: [['H01', 1, 5, 8], ['H01', 4, 3, 5], ['H01', 1, 4, 7], ['H01', 4, 3, 5], ['H01', 1, 6, 10]] },
  { id: 'typeLong', steps: [['H01', 1, 8, 12], ['H01', 4, 3, 4], ['H01', 1, 5, 7], ['H01', 4, 3, 4], ['H01', 1, 4, 6], ['H01', 4, 3, 4], ['H01', 1, 8, 12]] },
  { id: 'stuck', steps: [['H01', 2, 14, 20], ['H01', 1, 6, 9]] },
  { id: 'think', steps: [['H01', 3, 18, 26], ['H01', 1, 6, 8]] },
  { id: 'leanBack', steps: [['H15', 1, 26, 36], ['H01', 1, 6, 9]] },
  { id: 'chin', steps: [['H15', 2, 24, 32]] },
  { id: 'glance', steps: [['H15', 3, 14, 20], ['H01', 1, 6, 8]] },
  { id: 'jot', steps: [['H15', 4, 20, 28]] },
];
// The time-lapse: he types faster and never looks up.
const DESK_FAST: readonly Phrase[] = [
  { id: 'type', steps: [['H01', 1, 3, 4], ['H01', 4, 2, 3], ['H01', 1, 3, 4], ['H01', 4, 2, 3], ['H01', 1, 3, 5]] },
  { id: 'typeB', steps: [['H01', 4, 2, 3], ['H01', 1, 4, 6], ['H01', 4, 2, 3], ['H01', 1, 3, 4]] },
  { id: 'stuck', steps: [['H01', 2, 7, 10], ['H01', 1, 3, 4]] },
  { id: 'jot', steps: [['H15', 4, 10, 14]] },
  { id: 'chin', steps: [['H15', 2, 10, 14], ['H01', 1, 3, 4]] },
];
// On the floor with the notebook.
// test90-v4: the 10 s on the floor read as one held pose; H18 adds turning a page, holding the notebook up to read
// it, leaning back to look up at the sketches floating out of it, and peeling a note off his shoulder.
const FLOOR: readonly Phrase[] = [
  { id: 'write', steps: [['H06', 1, 10, 14], ['H06', 4, 7, 10], ['H06', 1, 8, 12]] },
  { id: 'pause', steps: [['H06', 2, 12, 18]] },
  { id: 'think', steps: [['H06', 3, 16, 22]] },
  { id: 'quick', steps: [['H06', 4, 5, 7], ['H06', 1, 5, 7], ['H06', 4, 5, 7], ['H06', 1, 7, 9]] },
  { id: 'page', steps: [['H18', 1, 8, 11], ['H06', 1, 8, 12]] },
  { id: 'readUp', steps: [['H18', 2, 18, 26], ['H06', 2, 8, 10]] },
  { id: 'lookUp', steps: [['H18', 3, 22, 30], ['H06', 1, 8, 10]] },
  { id: 'peel', steps: [['H18', 4, 16, 22], ['H06', 3, 10, 14]] },
];
// Coffee, chorus 1: the mug never leaves his hand.
const COFFEE: readonly Phrase[] = [
  { id: 'sip', steps: [['H02', 1, 8, 12], ['H02', 2, 6, 8], ['H02', 3, 16, 22], ['H02', 2, 6, 8], ['H02', 1, 10, 14]] },
  { id: 'sigh', steps: [['H02', 4, 20, 28], ['H02', 1, 8, 12]] },
  { id: 'hold', steps: [['H02', 1, 22, 30]] },
  { id: 'sipShort', steps: [['H02', 2, 8, 10], ['H02', 3, 10, 14], ['H02', 2, 6, 8]] },
];
// At the glass.
const GLASS: readonly Phrase[] = [
  { id: 'lean', steps: [['H07', 1, 22, 30]] },
  { id: 'knock', steps: [['H07', 2, 6, 8], ['H07', 1, 6, 8], ['H07', 2, 6, 8], ['H07', 1, 10, 14]] },
  { id: 'palms', steps: [['H07', 3, 22, 30]] },
  { id: 'slump', steps: [['H07', 4, 18, 26]] },
];

// The AI standing at home: rocking on her heels, curious tilts, hands on hips, a look up at the moon.
const AI_IDLE: readonly Phrase[] = [
  { id: 'rock', steps: [['A08', 1, 6, 8], ['A08', 2, 6, 8], ['A08', 3, 6, 8], ['A08', 4, 8, 10], ['A08', 3, 6, 8], ['A08', 2, 6, 8]] },
  { id: 'rockHalf', steps: [['A08', 1, 8, 10], ['A08', 2, 6, 8], ['A08', 1, 10, 14]] },
  { id: 'tilt', steps: [['A06', 2, 10, 14], ['A06', 3, 12, 16], ['A06', 2, 8, 10]] },
  { id: 'hips', steps: [['A05', 3, 22, 30]] },
  { id: 'behind', steps: [['A05', 4, 18, 24]] },
  { id: 'moon', steps: [['A04', 1, 20, 28], ['A04', 3, 10, 14]] },
];
// Reading the notebook on the floor (A17, test90-v4: holding it up close, looking up at the floating sketches with a
// hand raised to one, tracing a line, hugging the closed notebook).
const AI_READ: readonly Phrase[] = [
  { id: 'read', steps: [['A09', 1, 16, 22]] },
  { id: 'turn', steps: [['A09', 2, 6, 8], ['A09', 1, 10, 14]] },
  { id: 'look', steps: [['A09', 3, 14, 18], ['A09', 1, 8, 12]] },
  { id: 'think', steps: [['A09', 4, 14, 20]] },
  { id: 'close', steps: [['A17', 1, 16, 22], ['A09', 1, 8, 10]] },
  { id: 'sketch', steps: [['A17', 2, 22, 30], ['A09', 4, 8, 12]] },
  { id: 'trace', steps: [['A17', 3, 14, 20], ['A09', 1, 8, 10]] },
  { id: 'hug', steps: [['A17', 4, 18, 26], ['A09', 4, 8, 10]] },
];
// Sitting on the floor between the chorus waves (the director liked the leg swing: it stays, but only as
// one of six things she does).
const AI_SIT: readonly Phrase[] = [
  { id: 'swing', steps: [['A02', 1, 10, 12], ['A02', 2, 8, 10], ['A02', 1, 10, 12], ['A02', 3, 12, 14]] },
  { id: 'swingSlow', steps: [['A02', 1, 14, 18], ['A02', 3, 14, 18]] },
  { id: 'lean', steps: [['A14', 1, 26, 34]] },
  { id: 'hug', steps: [['A14', 2, 28, 36]] },
  { id: 'listen', steps: [['A14', 3, 22, 30]] },
  { id: 'upright', steps: [['A14', 4, 20, 28]] },
  { id: 'look', steps: [['A02', 4, 18, 24]] },
];

// ---- the human ----------------------------------------------------------------------------------------------------

/** The hand that holds the notes in H12 f3: beats when a note leaves it. */
const SEND_BEATS = EVENTS.filter((e) => e.id.startsWith('vnote.') && e.id.endsWith('.fly')).map((e) => e.frame);

/**
 * Getting up from the desk: typing (H01 f1), the typing drawing whose chair stands where H17's does (H15 f3), then
 * H17's four breakdowns, eased (longer holds at both ends). Every desk drawing keeps the furniture in place, so
 * only the body moves (H01 -> H16 slid the chair ~150 px and melted, test90-v3 29.4 s).
 */
const RISE: readonly (readonly [string, number, number])[] = [
  ['H01', 1, 5],
  ['H15', 3, 6],
  ['H17', 1, 5],
  ['H17', 2, 4],
  ['H17', 3, 4],
  ['H17', 4, 8],
];
const RISE_FRAMES = RISE.reduce((t, [, , h]) => t + h, 0);
const rise = (c: Cursor): Cursor => {
  for (const [strip, k, h] of RISE) hold(c, strip, k, h, DESK_X);
  c.x = DESK_STAND_X;
  return c;
};
/** Sitting down at the desk: the rise backwards (from H17 f4 to H15 f3). */
const sitDown = (c: Cursor): Cursor => {
  for (const [strip, k, h] of RISE.slice(1).reverse()) hold(c, strip, k, h, DESK_X);
  return c;
};

const buildHuman = (): Action[] => {
  const c: Cursor = actor(HUMAN_FLOOR, ev('room.human').frame);
  // verse 1, lines 1-2: at the desk. The two laptop notes leave on a key press (H01 f4) on their beat.
  const n1 = ev('note1.fly').frame;
  const n2 = ev('note2.fly').frame;
  perform(c, DESK, n1 - 8, { x: DESK_X, seed: 'desk-a', first: 'typeLong' });
  hold(c, 'H01', 1, 8, DESK_X);
  hold(c, 'H01', 4, 6, DESK_X);
  perform(c, DESK, n2 - 8, { x: DESK_X, seed: 'desk-b', first: 'leanBack' });
  hold(c, 'H01', 1, 8, DESK_X);
  hold(c, 'H01', 4, 6, DESK_X);
  perform(c, DESK, ev('line3.show').frame - RISE_FRAMES, { x: DESK_X, seed: 'desk-c', first: 'think' });
  // "Dün gece": gets up from the desk (H15 f3 -> H17, eased), stretches (H03), walks to the glass
  rise(c);
  hold(c, 'H03', 4, 6, DESK_STAND_X);
  hold(c, 'H03', 1, 10, DESK_STAND_X);
  hold(c, 'H03', 3, 6, DESK_STAND_X);
  walk(c, 'H05', DESK_STAND_X, NOTE_X);
  // holds up yesterday's note, then turns and pins it on his own wall (H04 faces right in the art: flipped)
  const sends0 = (SEND_BEATS[0] as number) - 10;
  // The turn goes through the 3/4 view (H09 f2) on both sides of the front view (H09 f3): profile -> front in one
  // morph tore a leg off (test90-v3, 34.8 s).
  const used = 5 + 10 + 9 + 6 + 6 + 8 + 4 + 9;
  const extra = sends0 - c.tl.t - used;
  if (extra < 0) throw new Error(`the walk to the glass ends ${-extra} frames too late for the first note`);
  hold(c, 'H12', 2, 5 + Math.floor(extra / 2), NOTE_X);
  hold(c, 'H12', 3, 10, NOTE_X);
  hold(c, 'H09', 2, 3, NOTE_X);
  hold(c, 'H09', 3, 3, NOTE_X);
  hold(c, 'H09', 2, 3, NOTE_X, true);
  hold(c, 'H04', 1, 6, NOTE_X - 10, true);
  hold(c, 'H04', 2, 6, NOTE_X - 10, true);
  hold(c, 'H04', 3, 8, NOTE_X - 10, true);
  hold(c, 'H04', 4, 4 + Math.ceil(extra / 2), NOTE_X - 10, true);
  hold(c, 'H09', 2, 3, NOTE_X, true);
  hold(c, 'H09', 3, 3, NOTE_X);
  hold(c, 'H09', 2, 3, NOTE_X);
  // "Baştan anlatıyorum": one note through the glass per beat. The offer (H12 f3) lands on each beat; how he
  // gets there changes every time: peels a note off his chest, writes on his palm, reads it held up, blows on it
  // (H19, test90-v4: with H12 alone the nine sends read as one loop).
  const PREP: readonly (readonly [string, number, number])[][] = [
    [['H19', 1, 5], ['H12', 2, 5]], // the first send must take 10 frames (sends0 above)
    [['H19', 2, 12]],
    [['H12', 1, 6], ['H19', 3, 6]],
    [['H12', 4, 4], ['H19', 1, 8]],
    [['H19', 4, 10]],
    [['H19', 3, 6], ['H12', 2, 5]],
    [['H12', 1, 5], ['H12', 2, 5]],
    [['H19', 2, 7], ['H19', 4, 6]],
    [['H12', 4, 3], ['H19', 3, 8]],
  ];
  const prepOf = (k: number) => PREP[k % PREP.length] as (readonly [string, number, number])[];
  const prepLen = (k: number): number => prepOf(k).reduce((t, [, , h]) => t + h, 0);
  SEND_BEATS.forEach((f0, k) => {
    const last = k + 1 >= SEND_BEATS.length;
    const next = last ? ev('pose.reach').frame : (SEND_BEATS[k + 1] as number);
    at(c, f0 - prepLen(k));
    for (const [strip, d, h] of prepOf(k)) hold(c, strip, d, h, NOTE_X);
    hold(c, 'H12', 3, next - f0 - (last ? 2 : prepLen(k + 1)), NOTE_X);
  });
  // "tanışmışız": the reach; the glass stops his palm; he stays with both palms on it
  const reach = ev('pose.reach').frame;
  at(c, reach - 2);
  hold(c, 'H12', 4, 26, STICK_X);
  hold(c, 'H07', 3, 16, LEAN_X);
  hold(c, 'H07', 1, 14, LEAN_X);
  hold(c, 'H07', 3, 10, LEAN_X);
  hold(c, 'H07', 4, ev('pose.release').frame - c.tl.t, LEAN_X);
  // pre-chorus: walks back, sits down on the floor with the notebook (H21) and writes
  walk(c, 'H05', LEAN_X, FLOOR_X + (SIT_DOWN[0] as readonly [number, number])[1]);
  for (const [k, dx] of SIT_DOWN) hold(c, 'H21', k, k === 4 ? 8 : 6, FLOOR_X + dx);
  perform(c, FLOOR, bf(31) - 26, { x: FLOOR_X, seed: 'floor', first: 'write' });
  // chorus 1: gets up (H21 backwards), coffee; to the glass on "buradayız"
  for (const [k, dx] of [...SIT_DOWN].reverse()) hold(c, 'H21', k, k === 1 ? 8 : 6, FLOOR_X + dx);
  c.x = FLOOR_X + (SIT_DOWN[0] as readonly [number, number])[1];
  const toGlass = ev('stamp.buradayiz').frame - 40;
  perform(c, COFFEE, toGlass, { x: c.x, seed: 'coffee', first: 'sip' });
  walk(c, 'H05', c.x, LEAN_X);
  perform(c, GLASS, m(0).start - 4, { x: LEAN_X, seed: 'glass', first: 'palms' });
  // calendar: mornings 1-5, the answer shrinks every time
  hold(c, 'H10', 4, 4, WAVE_X);
  hold(c, 'H10', 1, 8, WAVE_X);
  hold(c, 'H10', 2, 5, WAVE_X);
  hold(c, 'H10', 3, 5, WAVE_X);
  hold(c, 'H10', 2, 5, WAVE_X);
  hold(c, 'H10', 3, m(1).start - c.tl.t, WAVE_X);
  hold(c, 'H11', 1, 6, WAVE_X);
  hold(c, 'H11', 2, 7, WAVE_X);
  hold(c, 'H11', 3, 10, WAVE_X);
  hold(c, 'H11', 4, m(2).start - c.tl.t, WAVE_X);
  hold(c, 'H10', 2, 6, WAVE_X);
  hold(c, 'H10', 4, m(3).start - c.tl.t, WAVE_X);
  hold(c, 'H10', 4, 6, WAVE_X);
  hold(c, 'H09', 1, m(4).start - c.tl.t, WAVE_X);
  hold(c, 'H10', 1, 10, WAVE_X);
  hold(c, 'H10', 4, 6, WAVE_X);
  // time-lapse: back to the desk, sits down (H16 backwards), types fast, never looking up
  walk(c, 'H05', WAVE_X, DESK_STAND_X);
  sitDown(c);
  // the last morning: he gets up BEFORE the AI says it, writes "Merhaba" on a note and sticks it on the glass
  const noteFrame = ev('final.note').frame;
  const walkFrames = 16 * 3 + 6; // three steps at 16 frames, eased ends
  const standUp = noteFrame - 8 - 14 - 6 - walkFrames - RISE_FRAMES;
  perform(c, DESK_FAST, standUp, { x: DESK_X, seed: 'lapse', first: 'type' });
  rise(c);
  walk(c, 'H05', DESK_STAND_X, STICK_X);
  hold(c, 'H12', 1, Math.max(8, noteFrame - 14 - c.tl.t), c.x);
  hold(c, 'H12', 2, 6, STICK_X);
  hold(c, 'H12', 3, noteFrame - c.tl.t, STICK_X);
  hold(c, 'H12', 4, 6, STICK_X);
  return c.tl.acts;
};
export const HUMAN: readonly Action[] = buildHuman();

// ---- the AI -------------------------------------------------------------------------------------------------------

/** The same "Merhaba" wave every morning; three ways to time it, picked so no two mornings in a row match. */
const WAVES: readonly (readonly number[])[] = [
  [1, 2, 3, 4],
  [1, 2, 3, 2, 4],
  [1, 3, 2, 4],
];
/** What she is doing when a morning starts (one drawing, before the wave). */
const MORNING_IDLE: readonly (readonly [string, number])[] = [
  ['A08', 1],
  ['A06', 2],
  ['A08', 3],
  ['A04', 1],
  ['A05', 4],
  ['A06', 3],
  ['A04', 3],
];
const SLOW_WAVES: readonly (readonly number[])[] = [
  [1, 2, 3, 2, 3, 4],
  [1, 2, 3, 4, 3, 4],
];

const buildAi = (): Action[] => {
  const c: Cursor = actor(AI_FLOOR, ev('room.ai').frame);
  // verse 1, lines 1-2: idles at home; tilts her head on bar 11; waves on "Merhaba"
  perform(c, AI_IDLE, bf(11, 1), { x: AI_HOME, seed: 'ai-idle-a', first: 'rock' });
  play(c, { strip: 'A06', seq: [2, 3, 2, 1, 2, 4, 2], holds: [9, 9, 9, 9, 9, 12, 9], x: AI_HOME });
  perform(c, AI_IDLE, ev('bubble.merhaba').frame - 4, { x: AI_HOME, seed: 'ai-idle-b', first: 'hips' });
  hold(c, 'A07', 1, 8, AI_HOME);
  play(c, { strip: 'A07', seq: [2, 3, 2, 3, 4], holds: [5, 5, 5, 5, 8], x: AI_HOME });
  perform(c, AI_IDLE, ev('wave.dun').frame, { x: AI_HOME, seed: 'ai-idle-c', first: 'moon' });
  // "Dün gece": the room is wiped; she walks across it, turns, walks back and looks at the moon
  walk(c, 'A01', AI_HOME, 1560);
  play(c, { strip: 'A10', seq: [1, 2, 3, 4], holds: [5, 6, 6, 6], x: c.x });
  walk(c, 'A01', c.x, AI_HOME);
  const line4 = ev('line4.show').frame;
  perform(c, [{ id: 'moon', steps: [['A04', 1, 18, 24], ['A04', 3, 10, 14], ['A04', 2, 14, 18], ['A04', 4, 12, 16]] }, { id: 'tilt', steps: [['A06', 2, 10, 14], ['A06', 3, 10, 14]] }], line4 - 30, { x: c.x, seed: 'ai-moon', first: 'moon' });
  // "Baştan anlatıyorum": she walks to her wall and pins every incoming note as it lands
  walk(c, 'A01', c.x, 1400);
  const lands = EVENTS.filter((e) => e.id.startsWith('vnote.') && e.id.endsWith('.land')).map((e) => e.frame).filter((f) => f < ev('pose.reach').frame - 32);
  const PIN = [1, 2, 4, 1, 3, 2, 1, 4, 2];
  if ((lands[0] as number) > c.tl.t) hold(c, 'A05', 3, (lands[0] as number) - c.tl.t, c.x, true);
  lands.forEach((f, k) => {
    if (f < c.tl.t) return;
    at(c, f);
    const next = lands[k + 1] ?? ev('pose.reach').frame - 28;
    hold(c, 'A05', PIN[k % PIN.length] as number, Math.max(2, next - f), 1400, true);
  });
  // to the glass for the reach
  walk(c, 'A01', 1400, AI_REACH_X);
  at(c, ev('pose.reach').frame);
  play(c, { strip: 'P_a04', x: AI_REACH_X }, ev('pose.release').frame);
  // pre-chorus: the notebook falls, she bends over it and reads
  // (ends on f2, head bowed: f3 -> f1 turns the head from up to down and lost it in the morph)
  play(c, { strip: 'A06', seq: [3, 4, 3, 2], holds: 8, x: AI_HOME }, ev('ai.bend').frame);
  // she sits down cross-legged with it (A15: reaches for it, squats and picks it up, sits, opens it). Standing ->
  // sitting in one morph melted into a strip and lost the head (test90-v3, 45.0 s).
  // A22 bends her down to it in three steps (A06 f1 -> A15 in one morph had lost her head); A15 f1 is skipped, A22
  // f4 is the same reach
  hold(c, 'A06', 1, 3, AI_HOME);
  A22_X.forEach((x, i) => hold(c, 'A22', i + 2, i < 2 ? 4 : 5, x));
  const A15_HOLDS = [4, 4, 4];
  A15_X.slice(1).forEach((x, i) => hold(c, 'A15', i + 2, A15_HOLDS[i] as number, x));
  if (c.tl.t !== ev('ai.read').frame) throw new Error(`sitting down ends at ${c.tl.t}, not on ai.read`);
  // reading: the page turns on the three sketch beats
  const turns = ['sketch.1', 'sketch.2', 'sketch.3'].map((id) => ev(id).frame);
  const readX = AI_READ_X;
  play(c, { strip: 'A09', seq: [1], holds: 4, x: readX }, (turns[0] as number) - 2);
  for (const tf of turns) {
    at(c, tf - 2);
    play(c, { strip: 'A09', seq: [2, 1], holds: [7, 5], x: readX });
  }
  perform(c, AI_READ, bf(31) - 24, { x: readX, seed: 'ai-read', first: 'look' });
  // chorus 1: puts the notebook down and stretches her legs out (A16); between the waves she swings her legs,
  // leans back, hugs her knees...
  A16_X.forEach((x, i) => hold(c, 'A16', i + 1, 6, x));
  perform(c, AI_SIT, m(0).start - 34, { x: AI_SIT_X, seed: 'ai-sit', first: 'swing' });
  // gets up for the first morning (A18) from the knees-up sitting (A02 f1)
  hold(c, 'A02', 1, 6, AI_SIT_X);
  A18_X.forEach((x, i) => hold(c, 'A18', i + 1, i < 2 ? 6 : 5, x));
  hold(c, 'A06', 1, 6, AI_HOME);
  // calendar: the same wave every morning (only its timing differs a little)
  const r = seeded('ai-mornings');
  let prevWave = -1;
  let prevIdle = -1;
  for (const mm of MORNINGS) {
    const pool = mm.kind === 'slow' ? SLOW_WAVES : WAVES;
    let w = Math.floor(r() * pool.length);
    if (w === prevWave) w = (w + 1) % pool.length;
    prevWave = w;
    const seq = pool[w] as readonly number[];
    // before the wave, a beat of something else, different every morning (rocking, a tilt, a look at the moon,
    // hands behind her back): the wave and the "Merhaba" stay the same, the morning around them does not
    let pre = mm.kind === 'slow' ? 8 + Math.round(r() * 6) : mm.kind === 'beat' ? 3 + Math.round(r() * 3) : r() < 0.6 ? 2 + Math.round(r() * 2) : 0;
    if ((mm.dur - pre) / seq.length < 2) pre = 0;
    if (pre) {
      let q = Math.floor(r() * MORNING_IDLE.length);
      if (q === prevIdle) q = (q + 1) % MORNING_IDLE.length;
      prevIdle = q;
      const [strip, k] = MORNING_IDLE[q] as readonly [string, number];
      hold(c, strip, k, pre, AI_HOME);
    }
    const holds = scaled(seq.length, mm.dur - pre);
    // a frame of jitter moves between two drawings, so no two mornings are the same to the frame
    if (seq.length > 2 && r() < 0.6) {
      const i = Math.floor(r() * (seq.length - 1));
      if ((holds[i] as number) > 2) {
        holds[i] = (holds[i] as number) - 1;
        holds[i + 1] = (holds[i + 1] as number) + 1;
      }
    }
    play(c, { strip: 'A07', seq, holds, x: AI_HOME }, mm.start + mm.dur);
  }
  // after the last morning she stands calm; in the last bar she only tilts her head (no wave, no bubble)
  const final = ev('final.reset').frame;
  perform(c, AI_IDLE.filter((p) => p.id.startsWith('rock')), final + 14, { x: AI_HOME, seed: 'ai-end', first: 'rockHalf' });
  play(c, { strip: 'A06', seq: [2, 3, 2, 3, 4], holds: [10, 12, 10, 12, 14], x: AI_HOME });
  return c.tl.acts;
};
export const AI: readonly Action[] = buildAi();
