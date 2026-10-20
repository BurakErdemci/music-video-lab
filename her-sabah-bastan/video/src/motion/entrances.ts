// Entrance and exit maths shared by every scene. Pure functions of the frame (no remotion import):
// tools/beatcheck.mjs and scripts/popcheck.mjs load this file straight from node.
// Rule: nothing appears or disappears in one frame, except a StampWord's hard hit. Every other
// entrance starts ON its beat frame and eases in over `frames`.
import { seeded } from '../style/seeded.ts';

export type EntranceType =
  /** Screen-print squeegee pull: soft-edged mask wipe (plates, backgrounds, seam, moon, title). */
  | 'squeegee'
  /** Halftone-dot dissolve through a dot-screen mask (characters and props). */
  | 'halftone'
  /** Scale from 0.85 along a small arc with a damped-spring overshoot (notes, bubbles). */
  | 'drift'
  /** Opacity ease (lyric lines, registration marks, text swaps). */
  | 'fade'
  /** A state that glides to its new value (cursor growing, plate ink deepening). */
  | 'ease'
  /** Landing or misregistration settling after the main move. */
  | 'settle'
  /** A ring that grows from nothing. */
  | 'ring'
  /** The StampWord hard hit: the one allowed hard entrance. */
  | 'stamp';

export interface Enter {
  type: EntranceType;
  /** Frames from the event frame until the thing is fully there. */
  frames: number;
}

export const ENTER_FRAMES: Record<Exclude<EntranceType, 'stamp'>, number> = {
  squeegee: 16,
  halftone: 18,
  drift: 12,
  fade: 8,
  ease: 10,
  settle: 10,
  ring: 14,
};
export const enter = (type: Exclude<EntranceType, 'stamp'>, frames: number = ENTER_FRAMES[type]): Enter => ({ type, frames });
export const STAMP_ENTER: Enter = { type: 'stamp', frames: 3 };

/** Lyric lines fade and slide over this many frames, in and out. */
export const LYRIC_FRAMES = 8;
/** Stamp words keep the hard hit but leave with a short fade. */
export const STAMP_EXIT_FRAMES = 6;
/** Pose switches cross-dissolve over this many frames. */
export const POSE_BLEND_FRAMES = 4;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** CSS-style cubic-bezier easing: input x (time) -> output y (progress). */
export const bezier = (x1: number, y1: number, x2: number, y2: number): ((x: number) => number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 32; i++) {
      t = (lo + hi) / 2;
      const xt = ((ax * t + bx) * t + cx) * t;
      if (xt < x) lo = t;
      else hi = t;
    }
    return ((ay * t + by) * t + cy) * t;
  };
};

export const EASE_SQUEEGEE = bezier(0.2, 0.7, 0.2, 1);
export const EASE_INOUT = bezier(0.4, 0.15, 0.6, 0.85);
/** The long room-open wipe: leans in softly, glides to a stop. */
export const EASE_WIPE = bezier(0.35, 0.1, 0.2, 1);

/** Raw progress 0..1 that already counts the event frame itself as the first step. */
export const progress = (frame: number, start: number, frames: number): number => clamp01((frame - start + 1) / frames);

/** Squeegee progress (eased). */
export const wipeP = (frame: number, start: number, frames: number, ease: (x: number) => number = EASE_SQUEEGEE): number => ease(progress(frame, start, frames));
/** Halftone progress (eased in and out); an exit is `1 - dotP(...)`. */
export const dotP = (frame: number, start: number, frames: number): number => EASE_INOUT(progress(frame, start, frames));

/** Plain opacity ease (in: 0 -> 1, cubic ease-out). */
export const fadeIn = (frame: number, start: number, frames: number): number => {
  const t = progress(frame, start, frames);
  return 1 - Math.pow(1 - t, 3);
};
/** Exit: starts on `start`, 1 -> 0, smooth. */
export const fadeOut = (frame: number, start: number, frames: number): number => {
  const t = clamp01((frame - start) / frames);
  return 1 - t * t * (3 - 2 * t);
};
/** A value gliding between two states, ease in-out. */
export const glide = (frame: number, start: number, frames: number): number => EASE_INOUT(progress(frame, start, frames));

/** Print misregistration that settles with the move: starts offset (amp px), ends at 0. */
export const regOffset = (key: string, p: number, amp = 16): { dx: number; dy: number } => {
  const r = seeded(`reg:${key}`);
  const sx = r() < 0.5 ? -1 : 1;
  const sy = r() < 0.5 ? -1 : 1;
  const k = (1 - clamp01(p)) * (1 - clamp01(p));
  return { dx: sx * amp * k, dy: sy * amp * 0.6 * k };
};

/** Damped spring, normalised to settle by t = 1 (zeta 0.65: about 7% overshoot, peak near t = 0.67). */
export const springOut = (t: number, zeta = 0.65): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const wn = 4 / zeta;
  const wd = wn * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t));
};

export interface DriftState {
  /** Scale 0.85 -> 1 with overshoot. */
  s: number;
  /** Offset from the resting place (along an arc that ends at 0). */
  ox: number;
  oy: number;
  op: number;
  t: number;
}
export interface DriftOpts {
  /** Where the drift starts, relative to the resting place. */
  from?: { x: number; y: number };
  /** Perpendicular bulge of the arc in px. */
  bulge?: number;
  /** Frames of the opacity ramp. */
  ramp?: number;
}

/** Entrance for notes and bubbles: spring scale from 0.85, travel along an arc, opacity ramp. */
export const drift = (frame: number, start: number, frames: number, opts: DriftOpts = {}): DriftState => {
  const from = opts.from ?? { x: -14, y: 20 };
  const bulge = opts.bulge ?? 8;
  const ramp = opts.ramp ?? 6;
  const t = progress(frame, start, frames);
  const e = springOut(t);
  const len = Math.hypot(from.x, from.y) || 1;
  const px = -from.y / len;
  const py = from.x / len;
  const arc = bulge * Math.sin(Math.PI * t);
  return {
    s: 0.85 + 0.15 * e,
    ox: from.x * (1 - e) + px * arc,
    oy: from.y * (1 - e) + py * arc,
    op: clamp01((frame - start + 1) / ramp),
    t,
  };
};
/** Exit for drift things: shrinks to 0.9 and fades over `frames`, starting on `start`. */
export const driftOut = (frame: number, start: number, frames: number): { s: number; op: number } => {
  const t = clamp01((frame - start) / frames);
  const e = t * t * (3 - 2 * t);
  return { s: 1 - 0.1 * e, op: 1 - e };
};

export interface Dot {
  x: number;
  y: number;
  /** Threshold 0..1: dots with a low threshold start growing first. */
  th: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const fields = new Map<string, Dot[]>();
/**
 * Dot lattice (square screen rotated 30 degrees) over `box`. The threshold sweeps from the top
 * down with a seeded jitter, so the dots grow in unevenly like a rough screen.
 */
export const dotField = (box: Box, spacing: number, seed: string): Dot[] => {
  const key = `${seed}|${box.x}|${box.y}|${box.w}|${box.h}|${spacing}`;
  const hit = fields.get(key);
  if (hit) return hit;
  const r = seeded(`halftone:${seed}`);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const reach = Math.hypot(box.w, box.h) / 2 + spacing;
  const n = Math.ceil(reach / spacing);
  const ang = (30 * Math.PI) / 180;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const out: Dot[] = [];
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const u = i * spacing;
      const v = j * spacing;
      const x = cx + u * ca - v * sa;
      const y = cy + u * sa + v * ca;
      if (x < box.x - spacing || x > box.x + box.w + spacing || y < box.y - spacing || y > box.y + box.h + spacing) continue;
      const up = 1 - clamp01((y - box.y) / box.h);
      const side = clamp01((x - box.x) / box.w);
      const sweep = 0.65 * (1 - up) + 0.35 * side;
      out.push({ x, y, th: clamp01(0.6 * sweep + 0.4 * r()) });
    }
  }
  fields.set(key, out);
  return out;
};

/** Dot radius at eased progress e: every dot is full (overlapping, solid) at e = 1. */
export const dotRadius = (e: number, th: number, spacing: number): number => {
  const local = clamp01((e - th * 0.5) / 0.5);
  return spacing * 0.8 * local;
};

/** A soft blink: off-window of this many frames, eased at both edges. */
export const BLINK_FRAMES = 6;
/** 1 = visible, ~0.15 = blinked; the dip starts on the event frame. */
export const blinkAlpha = (frame: number, starts: readonly number[]): number => {
  let a = 1;
  for (const s of starts) {
    if (frame < s || frame >= s + BLINK_FRAMES) continue;
    const k = Math.abs(frame - s - (BLINK_FRAMES - 1) / 2) / ((BLINK_FRAMES - 1) / 2);
    a = Math.min(a, 0.12 + 0.88 * k * k);
  }
  return a;
};
