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

export type EventKind = 'blink' | 'oh' | 'bubble' | 'reveal' | 'line' | 'stamp' | 'note' | 'print' | 'wall';

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

/** Test30 range: events at or after this frame are not scheduled. */
export const CHECK_UNTIL_FRAME = 900;

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
// the human's wall grows by one code note every 2nd beat
for (let i = bar10; i < bar10 + 64; i += 2) atBeat(`wall.${i}`, 'wall', i, enter('drift'));

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
