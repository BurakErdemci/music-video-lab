// Where each stamp word goes (test90-v4). Pure: no react, so node can check it.
//
// v3 placed the words at fixed spots: "HATIRLAMIYORUM" and "MERHABA" ran past their room's edge, "DÜN GECE",
// "BAŞTAN" and "BURADAYIZ" sat on the human's body. Now a word gets the spot nearest to the one asked for where its
// whole box stays inside its room (a margin from the edges, under the lyric line) and does not touch either
// character's drawn box on any frame it is on screen; if no such spot exists the size steps down 6% at a time.
import { poseBounds, resolveActor, type Action } from '../characters/actor.ts';
import { TWEENS, type TweenMeta } from '../characters/tweenData.ts';
import { ANTON_ADVANCE, ANTON_FALLBACK } from './stampMetrics.ts';

/** letter-spacing of StampWord (em). */
const TRACKING = 0.02;
/** Box height of one line (StampWord's line-height 1.05 plus the squash and the ghost offset). */
const LINE = 1.12;
/** Room for the rotation (up to 2.6 deg), the 1.15 stamp squash and a margin from the room edge, px. */
const PAD = 32;
/** Keep clear of a character's box by this much, px. */
const CLEAR = 18;

export const upperTr = (s: string): string => s.toLocaleUpperCase('tr-TR');

/** Width of the word on screen at `size` px (Anton advances + StampWord's tracking). */
export const stampWidth = (text: string, size: number): number =>
  [...upperTr(text)].reduce((w, ch) => w + ((ANTON_ADVANCE[ch] ?? ANTON_FALLBACK) + TRACKING) * size, 0);

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A character's drawn box at a frame (the morph canvas while it morphs), or null when it is not on screen. */
export const actorBox = (acts: readonly Action[], frame: number): Box | null => {
  const st = resolveActor(acts, frame);
  if (!st) return null;
  if (st.tween) {
    const m = TWEENS[st.tween.key] as TweenMeta | undefined;
    if (m) return { x: st.tween.x - m.ax, y: st.tween.y - m.h, w: m.w, h: m.h };
  }
  return poseBounds(st.cur);
};

const hit = (a: Box, b: Box): boolean => a.x < b.x + b.w + CLEAR && b.x < a.x + a.w + CLEAR && a.y < b.y + b.h + CLEAR && b.y < a.y + a.h + CLEAR;

export interface StampAsk {
  text: string;
  /** Wanted top-left and size (the v3 spot). */
  x: number;
  y: number;
  size: number;
  /** Allowed horizontal span [x0, x1] (the room); the whole word stays inside it. */
  room: readonly [number, number];
  /** Centre the word on this x (the seam stamps), instead of searching x. */
  centerX?: number;
  from: number;
  to: number;
  /** Other boxes to keep clear of all the time (the moon). */
  avoid?: readonly Box[];
  /** Highest top allowed (default: under the side lyric lines). */
  top?: number;
}

export interface StampSpot {
  x: number;
  y: number;
  size: number;
  /** Box width of the word (StampWord's `width`). */
  width: number;
}

const TOP = 92; // under the lyric line (y 48, 26 px)
const BOTTOM = 990; // above the floor line

export const placeStamp = (ask: StampAsk, actors: readonly (readonly Action[])[]): StampSpot => {
  const boxes: Box[] = [...(ask.avoid ?? [])];
  for (let f = ask.from; f < ask.to; f += 2) {
    for (const acts of actors) {
      const b = actorBox(acts, f);
      if (b) boxes.push(b);
    }
  }
  const [r0, r1] = ask.room;
  for (let size = ask.size; size >= ask.size * 0.55; size *= 0.94) {
    const w = stampWidth(ask.text, size);
    const h = size * LINE;
    const xs: number[] = [];
    // a seam word straddles the seam: centred on it, or shifted while at least a third of it stays on each side
    if (ask.centerX !== undefined) for (let x = ask.centerX - (2 * w) / 3; x <= ask.centerX - w / 3; x += 8) xs.push(x);
    else for (let x = r0 + PAD; x + w + PAD <= r1; x += 8) xs.push(x);
    let best: { x: number; y: number; d: number } | null = null;
    for (const x of xs) {
      if (x < r0 + PAD - 0.5 || x + w + PAD > r1 + 0.5) continue;
      for (let y = ask.top ?? TOP; y + h <= BOTTOM; y += 8) {
        const box = { x: x - PAD / 2, y: y - PAD / 2, w: w + PAD, h: h + PAD };
        if (boxes.some((b) => hit(box, b))) continue;
        const d = Math.hypot(x - (ask.centerX !== undefined ? ask.centerX - w / 2 : ask.x), (y - ask.y) * 1.3);
        if (!best || d < best.d) best = { x, y, d };
      }
    }
    if (best) return { x: Math.round(best.x), y: Math.round(best.y), size: Math.round(size * 10) / 10, width: Math.ceil(w) + 4 };
  }
  throw new Error(`stamp "${ask.text}": no spot in [${r0}, ${r1}] clear of the characters from f${ask.from} to f${ask.to}`);
};
