// The yellow imprint: the quiet tease of the finale's union. Every time the human and the AI touch, one moon-yellow
// halftone oval appears at the contact point for two beats (grows over the first, fades over the second).
//
// The look is a copy of finale/world.ts `imprintLayer` (that file is owned by another lane and does not export the
// painter): moon-yellow #F0D35A dots, no outline, no glow, 7 px grid at 45 degrees, centred on the contact point, dot
// radius 0.58 x step x sqrt(1 - d / reach) with d measured in an upright lens (horizontal x 1.6, vertical x 0.6), reach
// 90 px, strength 0.1 -> 1 with the finale's ease-in (cubic). Here the oval is a palm print: `r` (reach) is chosen per
// contact so that the oval is about 1.1 x one palm tall (height = 2 r / 0.6), `step` is the dot grid (finer than the
// finale's 7 px because the print is small).
import { palette } from '../style/palette.ts';
import { clamp01 } from '../math.ts';
import { FPS, TIMING, nearestBeatIndex } from '../timing.ts';
import type { Layer } from './types.ts';

export interface Imprint {
  /** Song frame of the contact; the imprint starts on the nearest beat. */
  f0: number;
  /** Contact point in world px on the reference plane (d = 0). */
  c: readonly [number, number];
  /** Reach in px (oval height = 2 r / 0.6). */
  r: number;
  /** Dot grid step in px. */
  step: number;
}

const beatF = (i: number): number => (TIMING.beats[i] as number) * FPS;

/** Strength e (0.1 -> 1 over beat 1, ease-in) and opacity (1 -> 0 over beat 2) at song frame f; null outside. */
export const imprintAt = (f: number, f0: number): { e: number; alpha: number } | null => {
  const i = nearestBeatIndex(f0 / FPS);
  const b0 = beatF(i);
  const b1 = beatF(i + 1);
  const b2 = beatF(i + 2);
  if (f < b0 || f >= b2) return null;
  if (f < b1) return { e: 0.1 + 0.9 * Math.pow(clamp01((f - b0) / (b1 - b0)), 3), alpha: 1 };
  return { e: 1, alpha: 1 - clamp01((f - b1) / (b2 - b1)) };
};

/** The dots, centred on the current origin, in the units of the current transform. */
export const paintImprint = (ctx: CanvasRenderingContext2D, e: number, r0: number, step: number): void => {
  const reach = r0 * e;
  if (reach < 1) return;
  const half = 1.6 * r0;
  const n = Math.ceil(half / (step * Math.SQRT1_2));
  ctx.fillStyle = palette.moonYellow;
  ctx.beginPath();
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const x = (i - j) * step * Math.SQRT1_2;
      const y = (i + j) * step * Math.SQRT1_2;
      if (Math.abs(x) > half || Math.abs(y) > half) continue;
      const d = Math.hypot(x * 1.6, y * 0.6);
      if (d > reach) continue;
      const r = step * 0.58 * Math.sqrt(clamp01(1 - d / reach));
      if (r < 0.3) continue;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
};

/** A stage layer for the imprint (world px, depth d), or null when it is not showing. */
export const imprintLayer = (id: string, f: number, imp: Imprint, d: number): Layer | null => {
  const s = imprintAt(f, imp.f0);
  if (!s) return null;
  const size = Math.ceil(3.2 * imp.r);
  return {
    id,
    src: {
      kind: 'canvas',
      key: `imprint:${id}`,
      cw: size,
      ch: size,
      paint: (ctx, cw, ch) => {
        ctx.translate(cw / 2, ch / 2);
        paintImprint(ctx, s.e, imp.r, imp.step);
      },
    },
    d,
    x: imp.c[0] - size / 2,
    y: imp.c[1] - size / 2,
    w: size,
    h: size,
    opacity: s.alpha,
  };
};

/** The reaching hands' first meeting at the cracked glass (fingertips at the seam; the pen has just drawn her hand). */
export const PRESS_IMPRINT: Imprint = { f0: 5442, c: [962, 500], r: 28, step: 5 };
