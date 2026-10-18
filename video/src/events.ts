// Every scheduled event, derived from a beat index. Scenes read frames only through ev()/evFrames();
// tools/beatcheck.mjs recomputes each frame from data/timing.json and requires drift 0.
import {
  barBeatIndex,
  beatFrame,
  lineFrames,
  lineWordTime,
  nearestBeatIndex,
  TIMING,
  toFrame,
} from './timing.ts';
import { enter, ENTER_FRAMES, LYRIC_FRAMES, STAMP_ENTER, BLINK_FRAMES, type Enter } from './motion/entrances.ts';

export type EventKind = 'blink' | 'oh' | 'bubble' | 'reveal' | 'line' | 'stamp' | 'note' | 'print' | 'wall' | 'wave' | 'moon' | 'tally' | 'pose';

export interface VideoEvent {
  id: string;
  kind: EventKind;
  /** Index into beats[]. */
  beatIdx: number;
  frame: number;
  /**
   * Does the eye see something new at this event? Blinks and tiny pulses are false; the dead-air rule in
   * tools/beatcheck.mjs counts only visible events.
   */
  visible: boolean;
  /** How it comes in (see motion/entrances.ts); scenes read the duration from here. */
  enter: Enter;
  /** Measured time this event was snapped from (lyric/word events). */
  srcT?: number;
  /** Bar whose downbeat this event sits on (+ beatOffset beats). */
  bar?: number;
  beatOffset?: number;
}

/** Test90 range: events at or after this frame are not scheduled (1:28.7, the end of the post-chorus). */
export const CHECK_UNTIL_FRAME = 2661;

const list: VideoEvent[] = [];
const push = (e: VideoEvent): void => {
  if (e.frame >= CHECK_UNTIL_FRAME) return;
  list.push(e);
};
const atTime = (id: string, kind: EventKind, t: number, en: Enter, visible = true): void => {
  const beatIdx = nearestBeatIndex(t);
  push({ id, kind, beatIdx, frame: beatFrame(beatIdx), visible, enter: en, srcT: t });
};
const atBeat = (id: string, kind: EventKind, beatIdx: number, en: Enter, visible = true): void => {
  push({ id, kind, beatIdx, frame: beatFrame(beatIdx), visible, enter: en });
};
const atBar = (id: string, kind: EventKind, bar: number, beatOffset: number, en: Enter, visible = true): void => {
  const beatIdx = barBeatIndex(bar) + beatOffset;
  push({ id, kind, beatIdx, frame: beatFrame(beatIdx), visible, enter: en, bar, beatOffset });
};
/** An event whose move lasts until another event's frame (the seam draw, the room wipe). */
const spanTo = (id: string, untilId: string): void => {
  const a = list.find((e) => e.id === id);
  const b = list.find((e) => e.id === untilId);
  if (!a || !b) throw new Error(`spanTo ${id} -> ${untilId}`);
  a.enter = { type: a.enter.type, frames: b.frame - a.frame };
};

// ---- intro (bars 1-8): one continuous zoom-out (world/droste.ts) with a visible event on every downbeat and
// beat 3 (the dead-air limit is 2 beats). The zoom itself is a function of the frame, not an event.
atBar('intro.cursor.ink', 'print', 1, 0, enter('ease', 14)); // the cursor line inks in
atBar('intro.cursor.echo', 'print', 1, 2, enter('ease', 12)); // the yellow plate slides in behind it
atBar('intro.face', 'print', 2, 0, enter('ease', 14)); // the head's outline inks in as the zoom reaches it
// the two "oh"s draw a ring that spreads from the cursor (bar 2 beat 3 and bar 3 downbeat)
const ohLine = TIMING.lines[0]?.energy_hint;
if (!ohLine) throw new Error('timing.json: (oh, oh) has no energy_hint');
atTime('intro.oh1', 'oh', ohLine.start, enter('ring'));
atTime('intro.oh2', 'oh', (ohLine.start + ohLine.end) / 2, enter('ring')); // second "oh" is not measured separately
atBar('intro.floor', 'print', 3, 0, enter('squeegee', 14)); // the floor line is drawn out from the AI
atBar('intro.moon', 'print', 3, 2, enter('squeegee')); // the crescent is printed on the wall
atBar('intro.bubble', 'bubble', 4, 0, enter('drift')); // "Merhaba" next to the AI, in every nested copy
atBar('intro.paper', 'print', 4, 2, enter('ease', 14)); // the note's yellow plate deepens
atBar('intro.title', 'stamp', 5, 0, STAMP_ENTER); // the title is stamped across the lower third
atBar('intro.pin.1', 'print', 5, 2, enter('ease', 10)); // the pins catch the light, one pulse per half bar
atBar('intro.title.fade', 'print', 6, 0, enter('fade')); // exit; frames = until intro.halo (spanTo below)
atBar('intro.pin.2', 'print', 6, 2, enter('ease', 10));
atBar('intro.halo', 'print', 7, 0, enter('ease', 12)); // the moon's halo pulses
atBar('intro.pin.3', 'print', 7, 2, enter('ease', 10));
atBar('intro.cream', 'reveal', 8, 0, enter('ease')); // the zoom rushes into the cream wall; frames = until room.seam
atBar('intro.pin.4', 'print', 8, 2, enter('ease', 10));
// blinks on beats 2 and 4 so a downbeat never lands on an 'off' frame; a blink is not a visible change
for (let i = barBeatIndex(1) + 1; i < barBeatIndex(9); i += 2) atBeat(`intro.blink.${i}`, 'blink', i, enter('fade', BLINK_FRAMES), false);

// ---- bar 9: the band hits on the downbeat and everything is printed over the flat cream frame
atBar('room.seam', 'reveal', 9, 0, enter('squeegee', 8)); // the glass seam drops down the centre
atBar('room.navy', 'reveal', 9, 0, enter('squeegee', 14)); // the navy room squeegees in from the left
atBar('room.human', 'print', 9, 0, enter('halftone'));
atBar('room.ai', 'print', 9, 0, enter('halftone'));
atBar('room.moon', 'print', 9, 0, enter('squeegee'));
atBar('room.yellow', 'print', 9, 2, enter('squeegee', 14)); // window moon plate
atBar('room.notes', 'print', 10, 0, enter('squeegee', 14)); // pinned notes plate
spanTo('intro.title.fade', 'intro.halo');
spanTo('intro.cream', 'room.seam');

// ---- verse 1: split rooms, two lines
const bar10 = barBeatIndex(10);
// the human's wall grows by one code note every 2nd beat until the wall is full (WALL_SLOTS notes; later ones replace the oldest)
for (let i = bar10; i < bar10 + 144; i += 2) atBeat(`wall.${i}`, 'wall', i, enter('drift'));

const L1 = lineFrames(1);
atTime('line1.show', 'line', L1.start, enter('fade', LYRIC_FRAMES));
atTime('line1.hide', 'line', L1.end, enter('fade', LYRIC_FRAMES));
atTime('stamp.imlec', 'stamp', lineWordTime(1, 4), STAMP_ENTER);
atTime('ai.blink.imlec', 'blink', lineWordTime(1, 4), enter('fade', BLINK_FRAMES), false);

const L2 = lineFrames(2);
atTime('line2.show', 'line', L2.start, enter('fade', LYRIC_FRAMES));
atTime('line2.hide', 'line', L2.end, enter('fade', LYRIC_FRAMES));
atTime('stamp.merhaba', 'stamp', lineWordTime(2, 0), STAMP_ENTER);
atTime('bubble.merhaba', 'bubble', lineWordTime(2, 0), enter('drift'));

// notes: one flies through the glass when each line ends, lands two beats later
for (const [n, endT] of [
  [1, L1.end],
  [2, L2.end],
] as const) {
  const idx = nearestBeatIndex(endT);
  atBeat(`note${n}.fly`, 'note', idx, enter('drift'));
  atBeat(`note${n}.land`, 'note', idx + 2, enter('settle', ENTER_FRAMES.fade));
}


// ============================================================================================================
// 0:30 -> 1:28.7. Every entrance below is an event; nothing here appears on a frame that is not a beat.
// ============================================================================================================
const lineShow = (n: number, id = `line${n}`): void => {
  const L = lineFrames(n);
  atTime(`${id}.show`, 'line', L.start, enter('fade', LYRIC_FRAMES));
  atTime(`${id}.hide`, 'line', L.end, enter('fade', LYRIC_FRAMES));
};
const beatOf = (t: number): number => nearestBeatIndex(t);

// ---- verse 1, line 3 "Dun gece ne konustuk": the AI side is wiped clean (a morning); the human stands up (scenes/acting.ts)
lineShow(3);
atTime('stamp.dun', 'stamp', lineWordTime(3, 0), STAMP_ENTER);
atTime('wave.dun', 'wave', lineWordTime(3, 0), enter('squeegee', 16));

// ---- line 4 "Bastan anlatiyorum yine": one note per beat through the glass, the AI pins; on "tanismisiz" both reach
lineShow(4);
atTime('stamp.bastan1', 'stamp', lineWordTime(4, 0), STAMP_ENTER);
const pinFrom = beatOf(lineWordTime(4, 0));
const reachAt = beatOf(lineWordTime(4, 5));
for (let i = pinFrom; i < reachAt; i++) {
  atBeat(`vnote.${i}.fly`, 'note', i, enter('drift'));
  atBeat(`vnote.${i}.land`, 'note', i + 2, enter('settle', ENTER_FRAMES.fade));
}
atBeat('pose.reach', 'pose', reachAt, enter('settle'), false);
atBeat('glass.ripple', 'oh', reachAt, enter('ring'));
atTime('pose.release', 'pose', lineFrames(4).end, enter('settle'), false);

// ---- pre-chorus 1 (the AI side, right): the notebook
for (const n of [5, 6, 7, 8]) lineShow(n);
atBar('wave.pre', 'wave', 24, 0, enter('squeegee', 16));
atTime('stamp.defter', 'stamp', lineWordTime(5, 1), STAMP_ENTER);
atTime('book.drop', 'print', lineWordTime(5, 1), enter('drift', 16));
atTime('ai.bend', 'pose', lineWordTime(5, 2), enter('settle'), false);
atTime('ai.read', 'pose', lineWordTime(5, 3), enter('settle'), false);
for (const k of [0, 1, 2]) atTime(`sketch.${k + 1}`, 'print', lineWordTime(6, k), enter('drift'));
atTime('stamp.anliyorum', 'stamp', lineWordTime(7, 1), STAMP_ENTER);
atTime('check.on', 'print', lineWordTime(7, 1), enter('ease'));
atTime('stamp.hatirla', 'stamp', lineWordTime(8, 1), STAMP_ENTER);
atTime('check.off', 'print', lineWordTime(8, 1), enter('fade', 12));

// ---- chorus 1: one cream wave per bar over the AI side, the AI pins two notes between waves
const C1 = [31, 32, 33, 34, 35, 36, 37, 38] as const;
for (const b of C1) {
  atBar(`wave.c${b}`, 'wave', b, 0, enter('squeegee', 30)); // a 1 s sweep (16 frames flickered, test90-v3)
  atBar(`cnote.${b}.a.fly`, 'note', b, 0, enter('drift'));
  atBar(`cnote.${b}.a.land`, 'note', b, 2, enter('settle', ENTER_FRAMES.fade));
  atBar(`cnote.${b}.b.fly`, 'note', b, 1, enter('drift'));
  atBar(`cnote.${b}.b.land`, 'note', b, 3, enter('settle', ENTER_FRAMES.fade));
}
for (const n of [9, 10, 11, 12, 13, 14]) lineShow(n);
atTime('stamp.bastan2', 'stamp', lineWordTime(9, 2), STAMP_ENTER);
atTime('stamp.ay', 'stamp', lineWordTime(10, 0), STAMP_ENTER);
// the split moon steps one phase per beat from "Ay" to the end of its line
for (let i = beatOf(lineWordTime(10, 0)); i < beatOf(lineFrames(10).end); i++) atBeat(`moon.${i}`, 'moon', i, enter('ease'));
atTime('stamp.biliyorum', 'stamp', lineWordTime(11, 0), STAMP_ENTER);
atTime('stamp.bilmiyorum', 'stamp', lineWordTime(12, 0), STAMP_ENTER);
atTime('stamp.buradayiz', 'stamp', lineWordTime(13, 2), STAMP_ENTER);
atTime('stamp.birdaha', 'stamp', lineWordTime(14, 3), STAMP_ENTER);

// ---- post-chorus "bir daha" (bars 39-47): the calendar. The AI's morning is identical every time (mini wave, A07 wave, the same
// "Merhaba"); only the pace and the human's answer change (scenes/acting.ts reads the mornings from these events).
lineShow(15);
const pcStart = barBeatIndex(39);
const pcEnd = barBeatIndex(48);
for (let i = pcStart; i < pcEnd; i++) atBeat(`tally.${i}`, 'tally', i, enter('ease')); // one tally mark per beat
// mornings 1-2: one per 2 beats; mornings 3-5: one per beat
for (const k of [0, 2]) atBeat(`morning.${pcStart + k}`, 'wave', pcStart + k, enter('squeegee', 22));
for (const k of [4, 5, 6]) atBeat(`morning.${pcStart + k}`, 'wave', pcStart + k, enter('squeegee', 11));
// time-lapse: each beat event carries two mornings (the second sits on the half-beat, derived in acting.ts)
const lapseFrom = pcStart + 7;
const lapseTo = barBeatIndex(47) - 4; // the last lapse beat; the beats after it are calm
for (let i = lapseFrom; i <= lapseTo; i++) atBeat(`lapse.${i}`, 'wave', i, enter('squeegee', 8));
// the last bar: the human's yellow note lands on the glass BEFORE the AI's slow reset; the AI only tilts its head
atBar('final.note', 'note', 47, 0, enter('drift'));
atBar('final.reset', 'wave', 47, 1, enter('squeegee', 30));

export const EVENTS: readonly VideoEvent[] = list.slice().sort((a, b) => a.beatIdx - b.beatIdx || a.id.localeCompare(b.id));

const byId = new Map(EVENTS.map((e) => [e.id, e]));
export const ev = (id: string): VideoEvent => {
  const e = byId.get(id);
  if (!e) throw new Error(`unknown or out-of-range event ${id}`);
  return e;
};
export const evFrames = (prefix: string): number[] =>
  EVENTS.filter((e) => e.id.startsWith(prefix)).map((e) => e.frame);

/** Seconds the events were snapped from, in frames (for the report only). */
export const srcFrame = (e: VideoEvent): number | null => (e.srcT === undefined ? null : toFrame(e.srcT));
