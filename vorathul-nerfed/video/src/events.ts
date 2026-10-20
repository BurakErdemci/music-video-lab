// Scheduled events. Every frame is derived from a measured anchor through timing.ts, never typed by hand.
// tools/beatcheck.mjs recomputes each frame from data/timing.json and requires drift 0.
//   anchor 'beat': ref = index into beats[]
//   anchor 'hit':  ref = index into hits[]
//   anchor 'word': ref = "<text>#<nth>" for word(text, nth)
import { beatFrame, f, hit, nearestBeat, TIMING, word } from './timing.ts';

export type EventAnchor = 'beat' | 'hit' | 'word';
export interface VideoEvent {
  id: string;
  frame: number;
  kind: string;
  anchor: EventAnchor;
  ref: number | string;
}

const onBeat = (id: string, kind: string, t: number): VideoEvent => {
  const ref = nearestBeat(t);
  return { id, frame: beatFrame(ref), kind, anchor: 'beat', ref };
};
const onHit = (id: string, kind: string, t: number, tolMs = 60): VideoEvent => {
  const h = hit(t, tolMs);
  return { id, frame: f((TIMING.hits[h.index] as { t: number }).t), kind, anchor: 'hit', ref: h.index };
};
const onWord = (id: string, kind: string, text: string, nth = 0): VideoEvent => ({
  id,
  frame: f(word(text, nth).start),
  kind,
  anchor: 'word',
  ref: `${text}#${nth}`,
});

export const EVENTS: VideoEvent[] = [
  onHit('riff-first-clash', 'impact', 19.55),
  onBeat('silence-start', 'freeze', 78.3),
  onHit('silence-end-hit', 'unfreeze', 78.8),
  onWord('hp-bar', 'ui-drag', 'forty percent'),
  // "UNFAIR" occurs twice in words: #0 (95.1 s) is the announcer's line, #1 (98.76 s) is the scream.
  onWord('scream-1', 'shake', 'UNFAIR', 1),
  onWord('hated', 'memory', 'by being hated'),
].sort((a, b) => a.frame - b.frame);
