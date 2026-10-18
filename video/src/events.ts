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

// ---- intro (bars 1-8): one plate per bar on the downbeat, a second change on beat 3 of the same bar
// (the dead-air limit is 2 beats, so a bar with a single event would fail it).
atBar('intro.cursor', 'print', 1, 0, enter('squeegee', 14));
atBar('intro.cursor.wake', 'print', 1, 2, enter('ease'));
atBar('intro.moon', 'print', 2, 0, enter('squeegee'));
atBar('intro.seam', 'print', 3, 0, enter('squeegee')); // frames = until intro.seam.end (spanTo below)
atBar('intro.seam.end', 'print', 3, 2, enter('settle'));
atBar('intro.title', 'print', 4, 0, enter('squeegee'));
atBar('intro.title.fade', 'print', 4, 2, enter('fade')); // exit; frames = until intro.room (spanTo below)
atBar('intro.room', 'print', 5, 0, enter('squeegee'));
atBar('intro.room.ink', 'print', 5, 2, enter('ease', 12));
atBar('intro.moonwin', 'print', 6, 0, enter('squeegee'));
atBar('intro.notes', 'print', 6, 2, enter('squeegee'));
atBar('intro.human', 'print', 7, 0, enter('halftone'));
atBar('intro.ai', 'print', 7, 2, enter('halftone'));
atBar('intro.bubble', 'bubble', 8, 0, enter('drift'));
atBar('intro.bubble.text', 'bubble', 8, 2, enter('fade'));
// blinks on beats 2 and 4 so a downbeat never lands on an 'off' frame; a blink is not a visible change
for (let i = barBeatIndex(2) + 1; i < barBeatIndex(7) + 2; i += 2) atBeat(`intro.blink.${i}`, 'blink', i, enter('fade', BLINK_FRAMES), false);
// the two "oh"s draw a ring that spreads from the cursor
const ohLine = TIMING.lines[0]?.energy_hint;
if (!ohLine) throw new Error('timing.json: (oh, oh) has no energy_hint');
atTime('intro.oh1', 'oh', ohLine.start, enter('ring'));
atTime('intro.oh2', 'oh', (ohLine.start + ohLine.end) / 2, enter('ring')); // second "oh" is not measured separately
atBar('room.reveal.start', 'reveal', 9, 0, enter('squeegee')); // frames = until room.reveal.end (spanTo below)
atBar('room.reveal.end', 'reveal', 10, 0, enter('settle'));
spanTo('intro.seam', 'intro.seam.end');
spanTo('intro.title.fade', 'intro.room');
spanTo('room.reveal.start', 'room.reveal.end');

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
