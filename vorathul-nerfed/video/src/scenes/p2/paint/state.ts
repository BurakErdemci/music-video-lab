// Small shared state of the painting: the progress-bar sun and the office monitor that mirrors it, and camera/shake helpers.
import { shake } from '../../../vfx/effects.ts';
import { T } from '../frames.ts';
import type { View } from './space.ts';

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const easeOut = (t: number): number => 1 - (1 - clamp(t)) ** 3;

/** Fill steps of the install bar (percent) on their measured frames: the sun and the office monitor tick together. */
const STEPS: readonly [number, number][] = [
  [T.dawn, 10],
  [T.sunStep2, 35],
  [T.sunStep3, 50],
  [T.frameFull, 70],
  [T.notesOn, 85],
  [T.desksIn, 95],
  [T.update, 100],
];
export const sunFillAt = (f: number): number => {
  let v = 0;
  for (const [at, p] of STEPS) if (f >= at) v = p;
  return v;
};

/** Apparent centre height of the sun bar (PS units): hidden behind the roofline until hit[45], clear of it on "dawn". */
export const sunYAt = (f: number): number => 0.5 + 2.15 * easeOut((f - T.sunEdge) / (T.dawn - T.sunEdge + 6));

/** Camera shake of a list of hits, in PS units added to the view centre (pct of the visible height). */
export const shakeView = (v: View, f: number, hits: readonly { start: number; seed: number; pct: number }[]): View => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const s = shake(f, h.start, h.pct * v.h, h.seed, 14);
    x += s.x;
    y += s.y;
  }
  return { ...v, cx: v.cx + x, cy: v.cy + y };
};
