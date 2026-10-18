// Pure, frame-driven logic of the strip player (no react / remotion import: video/scripts/stillness.mjs loads this
// file straight from node). Actor.tsx draws what resolveActor() returns.
import { POSES, type PoseId } from './poses.ts';
import { STRIPS, type StripFrame, type StripMeta } from './stripData.ts';

const fromPose = (id: PoseId): StripMeta => {
  const m = POSES[id];
  const frame: StripFrame = { file: `${m.file}.png`, w: m.w, h: m.h, ax: Math.round(m.anchorX * m.w) };
  if (m.slit) frame.slit = m.slit;
  return { who: id.startsWith('h') ? 'human' : 'ai', scale: m.scale, dir: 'poses', frames: [frame] };
};

/** The key-pose strips plus single-frame "strips" for the two old reach poses (the glass reach, 1186-1284). */
export const STRIP_TABLE: Record<string, StripMeta> = { ...STRIPS, P_h04: fromPose('h04'), P_a04: fromPose('a04') };
export type StripId = string;

/** Frames of the halftone switch between two different strips. */
export const SWITCH_FRAMES = 4;
/** Breathing: the body's scaleY goes 1 -> 1 + BREATH over this many frames (3.5 s at 30 fps). */
export const BREATH_PERIOD = 105;
export const BREATH = 0.008;
/** Weight shift: x wanders +-SHIFT px, one slow cycle per SHIFT_PERIOD frames. */
export const SHIFT = 3;
export const SHIFT_PERIOD = 141;

export interface Action {
  strip: StripId;
  /** Frame the action starts on. It lasts until the next action's `from`. */
  from: number;
  /** Key poses to step through (1..4), default [1, 2, 3, 4]. */
  seq?: readonly number[];
  /** Frames per step: one number, or one per step (default 4). */
  holds?: number | readonly number[];
  /** Repeat the sequence; without it the last pose is held. */
  loop?: boolean;
  /** Foot anchor on the floor. */
  x: number;
  y: number;
  flip?: boolean;
  /** Walk: travel linearly from x to moveTo over moveFrames (default: until the next action). */
  moveTo?: number;
  moveFrames?: number;
  /** Skip the halftone switch (hard cut). */
  cut?: boolean;
}

export interface Pose {
  strip: StripId;
  /** 0-based key pose index in the strip. */
  k: number;
  x: number;
  y: number;
  flip: boolean;
  /** Is the figure translating at this frame (a walk)? */
  moving: boolean;
}
export interface ActorState {
  cur: Pose;
  /** During a halftone switch: the pose being left and the progress of the switch (0..1). */
  prev?: Pose;
  t: number;
}

const stepsOf = (a: Action): { seq: readonly number[]; holds: readonly number[] } => {
  const seq = a.seq ?? [1, 2, 3, 4];
  const h = a.holds ?? 4;
  const holds = typeof h === 'number' ? seq.map(() => h) : h;
  if (holds.length !== seq.length) throw new Error(`action ${a.strip}@${a.from}: holds has ${holds.length} entries for ${seq.length} steps`);
  return { seq, holds };
};

/** Frames one pass through the action's sequence takes. */
export const seqFrames = (a: Pick<Action, 'seq' | 'holds'>): number => {
  const seq = a.seq ?? [1, 2, 3, 4];
  const h = a.holds ?? 4;
  return typeof h === 'number' ? h * seq.length : h.reduce((s, v) => s + v, 0);
};

const poseAt = (a: Action, nextFrom: number | undefined, frame: number): Pose => {
  const { seq, holds } = stepsOf(a);
  const total = holds.reduce((s, v) => s + v, 0);
  let local = Math.max(0, frame - a.from);
  if (a.loop) local %= total;
  let step = seq.length - 1;
  let acc = 0;
  for (let i = 0; i < seq.length; i++) {
    acc += holds[i] as number;
    if (local < acc) {
      step = i;
      break;
    }
  }
  const strip = STRIP_TABLE[a.strip];
  if (!strip) throw new Error(`unknown strip ${a.strip}`);
  const k = Math.min(strip.frames.length - 1, Math.max(0, (seq[step] as number) - 1));
  let x = a.x;
  let moving = false;
  if (a.moveTo !== undefined && a.moveTo !== a.x) {
    const span = a.moveFrames ?? (nextFrom === undefined ? 1 : Math.max(1, nextFrom - a.from));
    const u = Math.min(1, Math.max(0, (frame - a.from) / span));
    x = a.x + (a.moveTo - a.x) * u;
    moving = u < 1;
  }
  return { strip: a.strip, k, x, y: a.y, flip: a.flip ?? false, moving };
};

/** Which action is in force at `frame` (the last one that has started); -1 before the first. */
export const actionIndexAt = (acts: readonly Action[], frame: number): number => {
  let cur = -1;
  for (let i = 0; i < acts.length; i++) if (frame >= (acts[i] as Action).from) cur = i;
  return cur;
};

/** The character's key pose at a frame, without breathing and weight shift. Null before its first action. */
export const resolveActor = (acts: readonly Action[], frame: number): ActorState | null => {
  const i = actionIndexAt(acts, frame);
  if (i < 0) return null;
  const a = acts[i] as Action;
  const cur = poseAt(a, acts[i + 1]?.from, frame);
  const prevA = acts[i - 1];
  const since = frame - a.from;
  if (prevA && !a.cut && prevA.strip !== a.strip && since < SWITCH_FRAMES) {
    return { cur, prev: poseAt(prevA, a.from, frame), t: (since + 1) / SWITCH_FRAMES };
  }
  return { cur, t: 1 };
};

/** Always-on code motion: breathing scaleY and a slow sideways weight shift, per-character phase. */
export const microMotion = (frame: number, phase: number): { breath: number; shiftX: number } => ({
  breath: 1 + BREATH * 0.5 * (1 - Math.cos((2 * Math.PI * frame) / BREATH_PERIOD + phase)),
  shiftX: SHIFT * Math.sin((2 * Math.PI * frame) / SHIFT_PERIOD + phase * 1.7),
});

/** Identity of what is on screen apart from breathing: the stillness check compares these frame to frame. */
export const stateKey = (s: ActorState | null): string => {
  if (!s) return 'none';
  const p = s.cur;
  const sw = s.prev ? '~' : '';
  return `${sw}${p.strip}:${p.k}:${p.x.toFixed(1)}:${p.y}:${p.flip ? 1 : 0}`;
};

/** World bounding box of a pose (before micro motion). */
export const poseBounds = (p: Pose): { x: number; y: number; w: number; h: number } => {
  const m = STRIP_TABLE[p.strip] as StripMeta;
  const f = m.frames[p.k] as StripFrame;
  const w = f.w * m.scale;
  const h = f.h * m.scale;
  const left = f.ax * m.scale;
  return p.flip ? { x: p.x - (w - left), y: p.y - h, w, h } : { x: p.x - left, y: p.y - h, w, h };
};

// ---- timeline builder (used by scenes/acting.ts) ----------------------------------------------------------------

export interface Timeline {
  acts: Action[];
  /** Frame the next action will start on. */
  t: number;
}
export const timeline = (from: number): Timeline => ({ acts: [], t: from });

type Spec = Omit<Action, 'from' | 'y'> & { y?: number };

/** Walk strides (px of travel for one full 4-key cycle at the strip scale). */
export const STRIDE: Record<string, number> = { A01: 520, H05: 520 };

export interface Cursor {
  tl: Timeline;
  y: number;
}
export const actor = (y: number, from: number): Cursor => ({ tl: timeline(from), y });

/** Jump the cursor to an absolute frame (an anchor such as a beat). */
export const at = (c: Cursor, frame: number): Cursor => {
  if (frame < c.tl.t) throw new Error(`timeline would go back in time: ${frame} < ${c.tl.t}`);
  c.tl.t = frame;
  return c;
};

/** Play a strip once through its sequence (or, with `until`, repeat it up to that frame); the cursor advances. */
export const play = (c: Cursor, spec: Spec, until?: number): Cursor => {
  const a: Action = { ...spec, y: spec.y ?? c.y, from: c.tl.t };
  c.tl.acts.push(a);
  c.tl.t = until !== undefined ? until : c.tl.t + seqFrames(a);
  return c;
};

/** Walk from x0 to x1 with a walk strip; the number of frames follows the stride so the feet do not slide. */
export const walk = (c: Cursor, strip: 'A01' | 'H05', x0: number, x1: number, opts: { hold?: number; flip?: boolean } = {}): Cursor => {
  const hold = opts.hold ?? 5;
  const frames = Math.max(4, Math.round((Math.abs(x1 - x0) / (STRIDE[strip] as number)) * 4 * hold));
  const a: Action = { strip, from: c.tl.t, holds: hold, loop: true, x: x0, y: c.y, flip: opts.flip, moveTo: x1, moveFrames: frames };
  c.tl.acts.push(a);
  c.tl.t += frames;
  return c;
};

/** Longest run of identical frames per state key between [from, to). */
export const longestStill = (acts: readonly Action[], from: number, to: number): { frames: number; at: number; key: string } => {
  let best = { frames: 0, at: from, key: 'none' };
  let run = 0;
  let runStart = from;
  let last = '';
  for (let f = from; f < to; f++) {
    const key = stateKey(resolveActor(acts, f));
    if (key === last) run++;
    else {
      last = key;
      run = 1;
      runStart = f;
    }
    if (run > best.frames) best = { frames: run, at: runStart, key };
  }
  return best;
};
