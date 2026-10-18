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

export type EventKind = 'blink' | 'oh' | 'bubble' | 'reveal' | 'line' | 'stamp' | 'note';

export interface VideoEvent {
  id: string;
  kind: EventKind;
  /** Index into beats[]. */
  beatIdx: number;
  frame: number;
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
const atTime = (id: string, kind: EventKind, t: number): void => {
  const beatIdx = nearestBeatIndex(t);
  push({ id, kind, beatIdx, frame: beatFrame(beatIdx), srcT: t });
};
const atBeat = (id: string, kind: EventKind, beatIdx: number): void => {
  push({ id, kind, beatIdx, frame: beatFrame(beatIdx) });
};
const atBar = (id: string, kind: EventKind, bar: number, beatOffset = 0): void => {
  const beatIdx = barBeatIndex(bar) + beatOffset;
  push({ id, kind, beatIdx, frame: beatFrame(beatIdx), bar, beatOffset });
};

// ---- intro (bars 1-8): cursor blinks every 2nd beat, strongly on the two "oh"s
const bar9 = barBeatIndex(9);
for (let i = 0; i < bar9; i += 2) atBeat(`intro.blink.${i}`, 'blink', i);
const ohLine = TIMING.lines[0]?.energy_hint;
if (!ohLine) throw new Error('timing.json: (oh, oh) has no energy_hint');
atTime('intro.oh1', 'oh', ohLine.start);
atTime('intro.oh2', 'oh', (ohLine.start + ohLine.end) / 2); // second "oh" is not measured separately
atBar('intro.bubble', 'bubble', 9);
atBar('room.reveal.start', 'reveal', 9);
atBar('room.reveal.end', 'reveal', 10);

// ---- verse 1: split rooms, two lines
for (let i = bar9 + 2; i < bar9 + 64; i += 2) atBeat(`verse.blink.${i}`, 'blink', i);

const L1 = lineFrames(1);
atTime('line1.show', 'line', L1.start);
atTime('line1.hide', 'line', L1.end);
atTime('stamp.imlec', 'stamp', lineWordTime(1, 4));
atTime('ai.blink.imlec', 'blink', lineWordTime(1, 4));

const L2 = lineFrames(2);
atTime('line2.show', 'line', L2.start);
atTime('line2.hide', 'line', L2.end);
atTime('stamp.merhaba', 'stamp', lineWordTime(2, 0));
atTime('bubble.merhaba', 'bubble', lineWordTime(2, 0));

// notes: one flies through the glass when each line ends, lands two beats later
for (const [n, endT] of [
  [1, L1.end],
  [2, L2.end],
] as const) {
  const idx = nearestBeatIndex(endT);
  atBeat(`note${n}.fly`, 'note', idx);
  atBeat(`note${n}.land`, 'note', idx + 2);
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
