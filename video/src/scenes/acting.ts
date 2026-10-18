// What the two characters do from bar 9 to 1:28.7 (see "Acting plan" and "Calendar" in sahne-haritasi.md).
// Pure data built from beats and events: no react import, so video/scripts/stillness.mjs can load it from node.
// Every start frame is a beat frame (an event, or a beat read from timing.ts) unless it is a hold inside one beat.
import { actor, at, play, walk, type Action, type Cursor } from '../characters/actor.ts';
import { EVENTS, ev } from '../events.ts';
import { barBeatIndex, beatFrame } from '../timing.ts';

export const HUMAN_FLOOR = 1000;
export const AI_FLOOR = 1010;
/** Where the human sits at the desk (the strip carries its own chair, desk and laptop). */
export const DESK_X = 215;
/** Standing at the glass: H12 f3 holds the note with its tip ~5 px before the seam. */
export const NOTE_X = 750;
/** H12 f4 (the note pressed flat on the glass). */
export const STICK_X = 770;
/** The old h04 reach pose (hand 7 px before the seam). */
export const REACH_X = 714;
/** H10 wave / H11 notebook spot. */
export const WAVE_X = 727;
/** H07 hand on the glass. */
export const LEAN_X = 813;
export const AI_HOME = 1180;
/** The old a04 reach pose (hand 7 px behind the seam). */
export const AI_REACH_X = 1167;

/** `n` steps that add up to `total` frames, remainder to the first steps. */
export const scaled = (n: number, total: number): number[] => {
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
};

const bf = (bar: number, beat = 0): number => beatFrame(barBeatIndex(bar) + beat);

export interface Morning {
  id: string;
  /** Beat (or half-beat) frame the AI's mini wave starts on. */
  start: number;
  /** Frames until the next morning. */
  dur: number;
  kind: 'slow' | 'beat' | 'lapse';
  /** 0-based count of mornings. */
  n: number;
}

/** Mornings 1-2 on 2 beats, 3-5 on 1 beat, then two per beat (the half-beat is the midpoint of two beat frames). */
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
  for (const e of lapse) {
    const end = beatFrame(e.beatIdx + 1);
    const mid = Math.round((e.frame + end) / 2);
    out.push({ id: `${e.id}.a`, start: e.frame, dur: mid - e.frame, kind: 'lapse', n: out.length });
    out.push({ id: `${e.id}.b`, start: mid, dur: end - mid, kind: 'lapse', n: out.length });
  }
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

/** Tally marks: one per beat (the tally events) and a second one on every half-beat of the time-lapse. */
export const TALLY_STARTS: readonly number[] = (() => {
  const marks = EVENTS.filter((e) => e.id.startsWith('tally.')).map((e) => e.frame);
  for (const mm of MORNINGS) if (mm.kind === 'lapse' && mm.id.endsWith('.b')) marks.push(mm.start);
  return marks.sort((a, b) => a - b);
})();

// ---- the human ----------------------------------------------------------------------------------------------------

const TYPING = [1, 4, 1, 4, 1, 4, 2, 4, 3, 4] as const;

const buildHuman = (): Action[] => {
  const c: Cursor = actor(HUMAN_FLOOR, ev('room.human').frame);
  // verse 1, lines 1-2: typing at the desk; now and then the hands go up (a delete) or to the head (thinking)
  play(c, { strip: 'H01', seq: TYPING, holds: [5, 5, 5, 5, 5, 5, 9, 5, 11, 5], loop: true, x: DESK_X }, ev('line3.show').frame);
  // "Dün gece": stands up, stretches, turns round, walks to the glass and holds up yesterday's note
  play(c, { strip: 'H03', holds: [8, 6, 9, 9], x: DESK_X + 75 });
  play(c, { strip: 'H09', holds: 5, x: DESK_X + 75 });
  walk(c, 'H05', DESK_X + 75, NOTE_X);
  play(c, { strip: 'H12', seq: [2, 3, 2, 3], holds: [10, 12, 10, 12], x: NOTE_X });
  // "Baştan anlatıyorum": pins a note on his own wall, then turns to the glass and sends one note per beat
  play(c, { strip: 'H04', holds: [7, 7, 7, 8], x: NOTE_X - 4 });
  const reach = ev('pose.reach').frame;
  const sends = EVENTS.filter((e) => e.id.startsWith('vnote.') && e.id.endsWith('.fly')).map((e) => e.beatIdx);
  // H12 f3 (the offer) starts on each note's beat; f1-f2 take the 10 frames before it
  sends.forEach((bi, k) => {
    const f0 = beatFrame(bi);
    const nextF0 = k + 1 < sends.length ? beatFrame(sends[k + 1] as number) : reach;
    at(c, f0 - 10);
    play(c, { strip: 'H12', seq: [1, 2, 3], holds: [5, 5, nextF0 - f0 - 10], x: NOTE_X });
  });
  // "tanışmışız": both reach, the glass stops them
  at(c, reach);
  play(c, { strip: 'P_h04', x: REACH_X }, ev('pose.release').frame);
  // pre-chorus: sits on the floor and writes in the notebook
  walk(c, 'H05', REACH_X, 520, { flip: true });
  play(c, { strip: 'H06', seq: [1, 4, 1, 2, 3, 2, 4, 1], holds: [9, 9, 9, 9, 12, 9, 9, 9], loop: true, x: 520 }, bf(31));
  // chorus 1: coffee, then to the glass on "buradayız"
  play(c, { strip: 'H02', seq: [1, 2, 3, 4, 3, 2], holds: [14, 10, 14, 14, 14, 10], loop: true, x: 600 }, ev('stamp.buradayiz').frame - 28);
  walk(c, 'H05', 600, LEAN_X);
  play(c, { strip: 'H07', seq: [1, 3, 1, 2, 3, 2], holds: 14, loop: true, x: LEAN_X }, m(0).start);
  // calendar: mornings 1-5, the answer shrinks every time
  play(c, { strip: 'H10', seq: [4, 1, 2, 3, 2, 3], holds: [10, 3, 4, 4, 3, 4], x: WAVE_X });
  play(c, { strip: 'H11', seq: [1, 2, 3, 2], holds: [8, 6, 8, 6], x: WAVE_X });
  play(c, { strip: 'H10', seq: [2], holds: m(2).dur, x: WAVE_X });
  play(c, { strip: 'H10', seq: [3], holds: m(3).dur, x: WAVE_X });
  play(c, { strip: 'H10', seq: [1], holds: m(4).dur, x: WAVE_X });
  // time-lapse: back at the desk, typing fast, never looking up
  walk(c, 'H05', WAVE_X, DESK_X, { flip: true });
  const leave = beatFrame(barBeatIndex(47) - 4);
  play(c, { strip: 'H01', seq: TYPING, holds: [3, 3, 3, 3, 3, 3, 4, 3, 5, 3], loop: true, x: DESK_X }, leave);
  // the last morning: he writes "Merhaba" on a note and sticks it on the glass before the AI speaks
  walk(c, 'H05', DESK_X, STICK_X);
  const noteFrame = ev('final.note').frame;
  play(c, { strip: 'H12', seq: [1], holds: 4, x: STICK_X }, noteFrame - 15);
  play(c, { strip: 'H12', seq: [2], holds: 4, x: STICK_X }, noteFrame);
  play(c, { strip: 'H12', seq: [4], holds: 4, x: STICK_X });
  return c.tl.acts;
};
export const HUMAN: readonly Action[] = buildHuman();

// ---- the AI -------------------------------------------------------------------------------------------------------

const waveHolds = (kind: Morning['kind'], dur: number): { seq: number[]; holds: number[] } => {
  const seq = kind === 'slow' ? [1, 2, 3, 2, 3, 4] : kind === 'beat' ? [1, 2, 3, 2, 4] : [1, 2, 3, 4];
  return { seq, holds: scaled(seq.length, dur) };
};

const ROCK = [1, 2, 3, 4, 3, 2] as const;

const buildAi = (): Action[] => {
  const c: Cursor = actor(AI_FLOOR, ev('room.ai').frame);
  // verse 1, lines 1-2: rocks on her heels, tilts her head, waves on "Merhaba"
  play(c, { strip: 'A08', seq: ROCK, holds: 7, loop: true, x: AI_HOME }, bf(11, 1));
  play(c, { strip: 'A06', seq: [2, 3, 2, 1, 2, 4, 2], holds: 9, x: AI_HOME });
  play(c, { strip: 'A08', seq: ROCK, holds: 7, loop: true, x: AI_HOME }, ev('bubble.merhaba').frame);
  play(c, { strip: 'A07', seq: [1, 2, 3, 2, 3, 4], holds: [4, 4, 4, 4, 4, 6], x: AI_HOME });
  play(c, { strip: 'A08', seq: ROCK, holds: 7, loop: true, x: AI_HOME }, ev('wave.dun').frame);
  // "Dün gece": the room is wiped; she walks across it, turns, looks at the moon
  walk(c, 'A01', AI_HOME, 1560, { flip: true, hold: 7 });
  play(c, { strip: 'A10', holds: 4, x: 1560 });
  walk(c, 'A01', 1560, AI_HOME, { hold: 7 });
  const line4 = ev('line4.show').frame;
  play(c, { strip: 'A04', seq: [1, 2, 3, 2, 4, 3, 2, 1], holds: [14, 14, 12, 14, 12, 14, 14, 14], x: AI_HOME }, line4 - 12);
  // "Baştan anlatıyorum": she pins the incoming notes on her wall
  walk(c, 'A01', AI_HOME, 1400, { flip: true, hold: 7 });
  play(c, { strip: 'A05', seq: [1, 2, 1, 2, 3, 4], holds: [8, 8, 8, 8, 12, 12], loop: true, flip: true, x: 1400 }, ev('pose.reach').frame);
  play(c, { strip: 'P_a04', x: AI_REACH_X }, ev('pose.release').frame);
  // pre-chorus: the notebook falls, she bends over it and reads
  play(c, { strip: 'A06', seq: [2, 3, 4, 3], holds: 8, x: AI_HOME }, ev('ai.bend').frame);
  play(c, { strip: 'A06', seq: [1], holds: 4, x: AI_HOME }, ev('ai.read').frame);
  // reading: the page turns on the three sketch beats
  const turns = ['sketch.1', 'sketch.2', 'sketch.3'].map((id) => ev(id).frame);
  const readX = AI_HOME + 20;
  play(c, { strip: 'A09', seq: [1], holds: 4, x: readX }, (turns[0] as number) - 2);
  for (const tf of turns) {
    at(c, tf - 2);
    play(c, { strip: 'A09', seq: [2, 1], holds: [7, 5], x: readX });
  }
  play(c, { strip: 'A09', seq: [3, 1, 4, 1, 2, 1, 3, 1], holds: [20, 16, 18, 22, 7, 22, 20, 16], loop: true, x: readX }, bf(31));
  // chorus 1: sits swinging her legs between the waves
  play(c, { strip: 'A02', seq: [1, 2, 1, 3, 4, 3, 1, 2], holds: [12, 10, 12, 12, 12, 12, 12, 10], loop: true, x: 1330 }, m(0).start);
  // calendar: the same wave every morning, only faster
  for (const mm of MORNINGS) {
    const { seq, holds } = waveHolds(mm.kind, mm.dur);
    play(c, { strip: 'A07', seq, holds, x: AI_HOME }, mm.start + mm.dur);
  }
  // after the last morning she stands calm; in the last bar she only tilts her head (no wave, no bubble)
  const final = ev('final.reset').frame;
  play(c, { strip: 'A08', seq: ROCK, holds: 8, loop: true, x: AI_HOME }, final + 14);
  play(c, { strip: 'A06', seq: [2, 3, 2, 3, 4], holds: [10, 12, 10, 12, 14], x: AI_HOME });
  return c.tl.acts;
};
export const AI: readonly Action[] = buildAi();
