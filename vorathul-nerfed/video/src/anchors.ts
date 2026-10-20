// Anchor helpers for scheduled events: every frame comes from a measured anchor through timing.ts, never typed by hand.
// Plain .ts with no JSX: tools/beatcheck.mjs loads the event files directly with node.
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

export const onBeat = (id: string, kind: string, t: number): VideoEvent => {
  const ref = nearestBeat(t);
  return { id, frame: beatFrame(ref), kind, anchor: 'beat', ref };
};
export const onHit = (id: string, kind: string, t: number, tolMs = 60): VideoEvent => {
  const h = hit(t, tolMs);
  return { id, frame: f((TIMING.hits[h.index] as { t: number }).t), kind, anchor: 'hit', ref: h.index };
};
export const onWord = (id: string, kind: string, text: string, nth = 0): VideoEvent => ({
  id,
  frame: f(word(text, nth).start),
  kind,
  anchor: 'word',
  ref: `${text}#${nth}`,
});

