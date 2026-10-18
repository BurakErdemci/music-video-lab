// Pure, frame-driven logic of the strip player (no react / remotion import: the check scripts in video/scripts load
// this file straight from node). Actor.tsx draws what resolveActor() returns.
//
// Motion model (test90-v3): a timeline of actions is expanded into "spans", one drawing each. Where one drawing
// follows another, the change is not a cut: for `n` frames around the boundary the renderer shows a silhouette
// morph (video/scripts/make-tweens.py: the signed distance fields of the two silhouettes are blended, so ONE body
// flows from the old shape into the new one; the old drawing's detail is shown until the midpoint, the new one's
// after). The director rejected two-body dissolves (ghosting) and cuts (jumps); the morph is neither.
// Walks are the exception: 8 drawings per step on twos, each drawing placed so the stance foot stays planted.
import { POSES, type PoseId } from './poses.ts';
import { STRIPS, type StripFrame, type StripMeta } from './stripData.ts';
import { TWEENS, TWEEN_STEPS } from './tweenData.ts';

const fromPose = (id: PoseId): StripMeta => {
  const m = POSES[id];
  const frame: StripFrame = { file: `${m.file}.png`, w: m.w, h: m.h, ax: Math.round(m.anchorX * m.w) };
  if (m.slit) frame.slit = m.slit;
  return { who: id.startsWith('h') ? 'human' : 'ai', scale: m.scale, dir: 'poses', frames: [frame] };
};

/** The key-pose strips plus a single-frame "strip" for the old AI reach pose (the glass reach, 1186-1284). */
export const STRIP_TABLE: Record<string, StripMeta> = { ...STRIPS, P_a04: fromPose('a04') };
export type StripId = string;

/** Which way a strip's drawings face when not flipped (+1 right, -1 left). Walks need it to face the travel. */
export const FACING: Record<string, 1 | -1> = { H05: 1, H20: 1, H22: 1, H23: 1, A01: -1, A19: -1, A20: -1 };

/** Breathing: the body's scaleY goes 1 -> 1 + BREATH over this many frames (3.5 s at 30 fps). */
export const BREATH_PERIOD = 105;
export const BREATH = 0.008;
/** Weight shift: x wanders +-SHIFT px, one slow cycle per SHIFT_PERIOD frames. */
export const SHIFT = 3;
export const SHIFT_PERIOD = 141;
/** Longest morph between two drawings, in frames (a morph never takes more than the shorter of the two holds). */
export const TWEEN_MAX = 8;
/** The generated image a span's drawing was cut from (file name before its frame number). */
const walkSource = (s: Span): string => ((STRIP_TABLE[s.strip] as StripMeta).frames[s.k] as StripFrame).file.replace(/-\d+\.png$/, '');
/** Morph length for a change of a given size (1 - IoU of the two silhouettes): a hand 3 frames, sitting down 8. */
const tweenFor = (size: number | undefined): number => (size === undefined || !Number.isFinite(size) ? TWEEN_MAX : Math.max(3, Math.min(TWEEN_MAX, Math.round(3 + 9 * size))));

export interface Step {
  /** Strip of this drawing when it is not the action's (a walk draws from several strips). */
  strip?: StripId;
  /** 1-based drawing of the strip. */
  k: number;
  hold: number;
  /** Foot anchor x (walks: every drawing has its own, so the stance foot stays planted). */
  x?: number;
}

export interface Action {
  strip: StripId;
  /** Frame the action starts on. It lasts until the next action's `from`. */
  from: number;
  /** Drawings to step through (1-based), default [1, 2, 3, 4]. */
  seq?: readonly number[];
  /** Frames per drawing: one number, or one per drawing (default 4). */
  holds?: number | readonly number[];
  /** Explicit steps instead of seq/holds (walks and varied performances). */
  steps?: readonly Step[];
  /** Repeat the sequence until the next action; without it the last drawing is held. */
  loop?: boolean;
  /** Foot anchor on the floor. */
  x: number;
  y: number;
  flip?: boolean;
  /** Hard cut into this action (no morph). Only for intentional hits. */
  cut?: boolean;
  /** A walk: drawings change on twos and the figure travels; no morphs inside. */
  walk?: boolean;
}

/** One drawing on screen from `from` (inclusive) to `to` (exclusive). */
export interface Span {
  from: number;
  to: number;
  strip: StripId;
  /** 0-based drawing index in the strip. */
  k: number;
  x: number;
  y: number;
  flip: boolean;
  walk: boolean;
  cut: boolean;
}

export interface Pose {
  strip: StripId;
  k: number;
  x: number;
  y: number;
  flip: boolean;
  /** Is the figure walking at this frame? (no weight shift then) */
  moving: boolean;
}

export interface Tween {
  key: string;
  /** Precomputed morph image index (0..TWEEN_STEPS-1). */
  i: number;
  /** World x of the morph canvas' anchor (the canonical first drawing's foot anchor plus the slide so far). */
  x: number;
  y: number;
}

export interface ActorState {
  cur: Pose;
  tween?: Tween;
}

const stepsOf = (a: Action): Step[] => {
  if (a.steps) return a.steps.map((s) => ({ ...s }));
  const seq = a.seq ?? [1, 2, 3, 4];
  const h = a.holds ?? 4;
  const holds = typeof h === 'number' ? seq.map(() => h) : h;
  if (holds.length !== seq.length) throw new Error(`action ${a.strip}@${a.from}: holds has ${holds.length} entries for ${seq.length} steps`);
  return seq.map((k, i) => ({ k, hold: holds[i] as number }));
};

/** Frames one pass through the action's drawings takes. */
export const seqFrames = (a: Pick<Action, 'seq' | 'holds' | 'steps'>): number => {
  if (a.steps) return a.steps.reduce((s, v) => s + v.hold, 0);
  const seq = a.seq ?? [1, 2, 3, 4];
  const h = a.holds ?? 4;
  return typeof h === 'number' ? h * seq.length : h.reduce((s, v) => s + v, 0);
};

/** The longest an open-ended last action (or loop) is expanded. */
const TAIL = 4000;

const spanCache = new WeakMap<readonly Action[], Span[]>();

/** The timeline as consecutive drawings. */
export const spansOf = (acts: readonly Action[]): Span[] => {
  const hit = spanCache.get(acts);
  if (hit) return hit;
  const out: Span[] = [];
  acts.forEach((a, ai) => {
    const end = acts[ai + 1]?.from ?? a.from + TAIL;
    if (!STRIP_TABLE[a.strip]) throw new Error(`unknown strip ${a.strip}`);
    const steps = stepsOf(a);
    let t = a.from;
    let first = true;
    for (let i = 0; t < end; i++) {
      if (i >= steps.length) {
        if (!a.loop) {
          // hold the last drawing
          const last = out[out.length - 1] as Span;
          last.to = end;
          break;
        }
        i = 0;
      }
      const s = steps[i] as Step;
      const sid = s.strip ?? a.strip;
      const strip = STRIP_TABLE[sid];
      if (!strip) throw new Error(`unknown strip ${sid}`);
      const k = Math.min(strip.frames.length - 1, Math.max(0, s.k - 1));
      const to = Math.min(end, t + s.hold);
      const prev = out[out.length - 1];
      const span: Span = { from: t, to, strip: sid, k, x: s.x ?? a.x, y: a.y, flip: a.flip ?? false, walk: a.walk ?? false, cut: first && (a.cut ?? false) };
      // the same drawing at the same place continues: merge (no change on screen)
      if (prev && prev.to === t && prev.strip === span.strip && prev.k === span.k && prev.flip === span.flip && prev.x === span.x && prev.y === span.y && !span.cut) prev.to = to;
      else out.push(span);
      first = false;
      t = to;
    }
  });
  spanCache.set(acts, out);
  return out;
};

const spanIndexAt = (spans: readonly Span[], frame: number): number => {
  let lo = 0;
  let hi = spans.length - 1;
  if (hi < 0 || frame < (spans[0] as Span).from) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((spans[mid] as Span).from <= frame) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

/** Identity of a drawing placed in the world, for the morph table. */
const drawingId = (s: Span): string => `${s.strip}.${s.k}${s.flip ? 'm' : ''}`;

/** Morph key of the change a -> b, canonical (sorted) so a -> b and b -> a share one set of images. */
export const pairKey = (a: Span, b: Span): { key: string; reversed: boolean } => {
  const ia = drawingId(a);
  const ib = drawingId(b);
  const d = Math.round(b.x - a.x);
  const reversed = ib < ia;
  return reversed ? { key: `${ib}_${ia}_${-d}`, reversed } : { key: `${ia}_${ib}_${d}`, reversed };
};

/** Does the change between two consecutive spans get a morph, and how long is it? 0 = none. */
export const tweenLength = (a: Span, b: Span): number => {
  if (b.cut) return 0;
  // inside a walk the drawings change on ones and twos without a morph, except where the change is big: a drawing
  // from another generated image, or the body moving across a stance-foot gap (31 px). There a 2-frame morph with
  // both drawings at their own (foot-planted) places splits the change over two frames (jumpcheck).
  if (a.walk && b.walk) return walkSource(a) !== walkSource(b) || Math.abs(b.x - a.x) >= 25 ? 2 : 0;
  if (drawingId(a) === drawingId(b) && Math.abs(a.x - b.x) < 0.5) return 0;
  // into or out of a walk: the walk's drawings last 1-2 frames, so the morph takes its length from the
  // standing side and runs over the walk's first (or last) frames, where it is still ramping up (or down)
  if (a.walk !== b.walk) {
    const tw = TWEENS[pairKey(a, b).key];
    // at most 4 frames: standing and mid-stride legs share little, and a longer morph showed the legs scissoring
    // and lifting off the floor (artifactcheck "short"); at walking speed 4 frames read as one quick step
    const n = Math.min(tw ? Math.min(4, tweenFor(tw.size)) : 4, a.walk ? b.to - b.from : a.to - a.from);
    return n >= 2 ? n : 0;
  }
  const tw = TWEENS[pairKey(a, b).key];
  const n = Math.min(tw ? tweenFor(tw.size) : TWEEN_MAX, a.to - a.from, b.to - b.from);
  return n >= 2 ? n : 0;
};

/** Every morph the timeline needs (make-tweens.py renders them). */
export const neededPairs = (acts: readonly Action[]): { key: string; a: Span; b: Span }[] => {
  const spans = spansOf(acts);
  const out: { key: string; a: Span; b: Span }[] = [];
  for (let i = 0; i + 1 < spans.length; i++) {
    const a = spans[i] as Span;
    const b = spans[i + 1] as Span;
    if (!tweenLength(a, b)) continue;
    const { key, reversed } = pairKey(a, b);
    out.push(reversed ? { key, a: b, b: a } : { key, a, b });
  }
  return out;
};

/** Ease of a morph: part linear, so the middle images are not skipped on a big change. */
const ease = (u: number): number => 0.4 * u + 0.6 * u * u * (3 - 2 * u);

const poseOf = (s: Span): Pose => ({ strip: s.strip, k: s.k, x: s.x, y: s.y, flip: s.flip, moving: s.walk });

/** The character's drawing (or morph) at a frame, without breathing and weight shift. Null before its first action. */
export const resolveActor = (acts: readonly Action[], frame: number): ActorState | null => {
  const spans = spansOf(acts);
  const i = spanIndexAt(spans, frame);
  if (i < 0) return null;
  const s = spans[i] as Span;
  // a morph window straddles each boundary: [T - floor(n/2), T + ceil(n/2))
  const check = (a: Span | undefined, b: Span | undefined): ActorState | null => {
    if (!a || !b) return null;
    const n = tweenLength(a, b);
    if (!n) return null;
    const t0 = b.from - Math.floor(n / 2);
    if (frame < t0 || frame >= t0 + n) return null;
    const u = ease((frame - t0 + 0.5) / n);
    const { key, reversed } = pairKey(a, b);
    const tw = TWEENS[key];
    if (!tw) return null; // not rendered yet: fall back to the cut (jumpcheck reports it)
    const tc = reversed ? 1 - u : u;
    const idx = Math.max(0, Math.min(TWEEN_STEPS - 1, Math.round(tc * (TWEEN_STEPS + 1)) - 1));
    const canon = reversed ? b : a;
    return { cur: poseOf(u < 0.5 ? a : b), tween: { key, i: idx, x: canon.x + tw.slide * tc, y: canon.y } };
  };
  // a window can reach over several 1-frame walk spans: look at the boundaries up to two spans away
  for (const j of [i, i + 1, i - 1, i + 2]) {
    const hit = check(spans[j - 1], spans[j]);
    if (hit) return hit;
  }
  return { cur: poseOf(s) };
};

/** Always-on code motion: breathing scaleY and a slow sideways weight shift, per-character phase. */
export const microMotion = (frame: number, phase: number): { breath: number; shiftX: number } => ({
  breath: 1 + BREATH * 0.5 * (1 - Math.cos((2 * Math.PI * frame) / BREATH_PERIOD + phase)),
  shiftX: SHIFT * Math.sin((2 * Math.PI * frame) / SHIFT_PERIOD + phase * 1.7),
});

/** Identity of what is on screen apart from breathing: the stillness check compares these frame to frame. */
export const stateKey = (s: ActorState | null): string => {
  if (!s) return 'none';
  if (s.tween) return `~${s.tween.key}:${s.tween.i}:${s.tween.x.toFixed(1)}`;
  const p = s.cur;
  return `${p.strip}:${p.k}:${p.x.toFixed(1)}:${p.y}:${p.flip ? 1 : 0}`;
};

/** Rendered scale of one drawing (strip scale times the frame's own correction). */
export const frameScale = (m: StripMeta, f: StripFrame): number => m.scale * (f.k ?? 1);

/** World bounding box of a pose (before micro motion). */
export const poseBounds = (p: Pose): { x: number; y: number; w: number; h: number } => {
  const m = STRIP_TABLE[p.strip] as StripMeta;
  const f = m.frames[p.k] as StripFrame;
  const s = frameScale(m, f);
  const w = f.w * s;
  const h = f.h * s;
  const left = f.ax * s;
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

export interface Cursor {
  tl: Timeline;
  y: number;
  /** Where the last walk actually stopped (whole steps). */
  x: number;
}
export const actor = (y: number, from: number): Cursor => ({ tl: timeline(from), y, x: 0 });

/** Jump the cursor to an absolute frame (an anchor such as a beat). */
export const at = (c: Cursor, frame: number): Cursor => {
  if (frame < c.tl.t) throw new Error(`timeline would go back in time: ${frame} < ${c.tl.t}`);
  c.tl.t = frame;
  return c;
};

/** Play a strip once through its sequence (or, with `until`, repeat/hold it up to that frame); the cursor advances. */
export const play = (c: Cursor, spec: Spec, until?: number): Cursor => {
  const a: Action = { ...spec, y: spec.y ?? c.y, from: c.tl.t };
  c.tl.acts.push(a);
  c.tl.t = until !== undefined ? until : c.tl.t + seqFrames(a);
  c.x = a.x;
  return c;
};

/** Frames per walk step at full speed: a stride of two steps takes 36 frames = 1.2 s. */
export const WALK_STEP_FRAMES = 18;
/** Frames the walk takes to reach full speed, and to stop. */
export const WALK_EASE = 8;
/** The drawings a walk picks from: the old 12-drawing step plus the support-phase drawings made for test90-v4. */
export const WALK_POOL: Record<'A01' | 'H05', readonly string[]> = { H05: ['H05', 'H20', 'H22', 'H23'], A01: ['A01', 'A19', 'A20'] };
/** How far (px) the body may run ahead of or behind its steady path so the stance foot can stay planted. */
export const WALK_SLACK = 22;
/** Extra cost (px of stance offset) of switching to a drawing from another generated image: the generations draw
 * the arms and notes a little differently, and hopping between them every frame read as jitter (jumpcheck). */
const WALK_SWITCH = 5;
/** Frames a walk drawing stays at least (on twos), unless it has fallen well behind. */
const WALK_MIN_HOLD = 1;
/** The generated image a walk drawing was cut from (file name before its frame number). */
const sourceOf = (q: Contact): string => {
  const m = STRIP_TABLE[q.strip] as StripMeta;
  return (m.frames[q.k - 1] as StripFrame).file.replace(/-\d+\.png$/, '');
};
/** Most the body moves in one frame, px. */
const WALK_MAX_MOVE = 31;
/** A drawing may come up to this much (px of stance offset) "earlier" in the step than the last one. */
const WALK_BACK_TOL = 6;

interface Contact {
  strip: string;
  k: number;
  /** Stance toe ahead of the anchor, px in the direction of travel. */
  o: number;
  /** The drawing's other contact further ahead (double support): the foot that is planted next. */
  next?: number;
}

/** Every floor contact of every drawing in the pool, as a candidate stance foot. */
const contactsOf = (pool: readonly string[]): Contact[] => {
  const out: Contact[] = [];
  for (const sid of pool) {
    const m = STRIP_TABLE[sid] as StripMeta;
    const facing = FACING[sid] as number;
    m.frames.forEach((f, i) => {
      const s = frameScale(m, f);
      const toes = (f.ground ?? []).map(([a, b]) => ((facing > 0 ? b : a) - f.ax) * s * facing);
      for (const o of toes) {
        const ahead = toes.filter((q) => q > o + 120);
        out.push(ahead.length ? { strip: sid, k: i + 1, o, next: Math.min(...ahead) } : { strip: sid, k: i + 1, o });
      }
    });
  }
  return out;
};

/** Length of one walk step on screen, px: the distance between the two feet in the double-support drawings. */
export const walkStep = (strip: 'A01' | 'H05'): number => {
  const ds = contactsOf(WALK_POOL[strip]).filter((c) => c.next !== undefined && c.o < 0);
  if (!ds.length) return 200;
  return ds.reduce((t, c) => t + ((c.next as number) - c.o), 0) / ds.length;
};

/**
 * Walk from x0 to x1. The body follows a steady path (8-frame ramps at both ends, cruise between), and each frame
 * shows the pool drawing whose stance foot, planted where it landed, puts the body closest to that path: the
 * stance foot stays on its spot (test90-v4; v3 slid it 8-13 px a frame because the drawings followed a fixed
 * order). The body may stray WALK_SLACK px from the path; only beyond that does the foot slip. When the planted
 * foot has fallen far enough behind, a double-support drawing hands the weight to the front foot.
 * Measured by video/scripts/walkcheck.mjs (foot slip) and jumpcheck.mjs (body lurch).
 */
export const walk = (c: Cursor, strip: 'A01' | 'H05', x0: number, x1: number): Cursor => {
  const dir = x1 >= x0 ? 1 : -1;
  const pool = contactsOf(WALK_POOL[strip]);
  const step = walkStep(strip);
  const travel = Math.abs(x1 - x0);
  const steps = Math.max(1, Math.round(travel / step));
  const T = steps * WALK_STEP_FRAMES + WALK_EASE;
  const R = WALK_EASE;
  const vmax = travel / (T - R);
  const dist = (t: number): number => {
    if (t <= R) return (vmax * t * t) / (2 * R);
    if (t >= T - R) return travel - (vmax * (T - t) * (T - t)) / (2 * R);
    return (vmax * R) / 2 + vmax * (t - R);
  };
  const steps_: Step[] = [];
  // start and stop on the narrowest drawing with one foot down (legs passing each other): a standing drawing morphs
  // into it without the legs scissoring apart (starting mid-stride tore the legs in the morph, test90-v4)
  const widthOf = (q: Contact): number => {
    const m = STRIP_TABLE[q.strip] as StripMeta;
    const f = m.frames[q.k - 1] as StripFrame;
    return f.w * frameScale(m, f);
  };
  const rest = pool.filter((q) => q.next === undefined).reduce((best, q) => (widthOf(q) < widthOf(best) ? q : best));
  let cur = rest;
  let planted = x0 + dir * cur.o;
  let held = 0;
  let lastX: number | null = null;
  for (let t = 0; t < T; t++) {
    const xs = x0 + dir * dist(t + 0.5);
    const want = (planted - xs) * dir;
    let pick = cur;
    // keep a drawing at least two frames (on twos) unless it has fallen well behind
    if (held >= WALK_MIN_HOLD || Math.abs(cur.o - want) > 14) {
      const cost = (q: Contact): number => Math.abs(q.o - want) + (sourceOf(q) === sourceOf(cur) ? 0 : WALK_SWITCH);
      for (const q of pool) if (q.o <= cur.o + WALK_BACK_TOL && cost(q) < cost(pick)) pick = q;
    }
    // the last frames settle on the passing drawing when it is close enough
    if (t >= T - 3 && Math.abs(rest.o - want) < 30) pick = rest;
    held = pick === cur ? held + 1 : 1;
    cur = pick;
    let x = planted - dir * cur.o;
    const dev = (x - xs) * dir;
    if (dev > WALK_SLACK) x = xs + dir * WALK_SLACK;
    if (dev < -WALK_SLACK) x = xs - dir * WALK_SLACK;
    // where the drawings still leave a gap (H05 pool: stance toe 1 -> -41 px), the body may not jump further than
    // WALK_MAX_MOVE in one frame: the foot slips the rest instead (jumpcheck's shift window is 32 px)
    if (lastX !== null && Math.abs(x - lastX) > WALK_MAX_MOVE) x = lastX + Math.sign(x - lastX) * WALK_MAX_MOVE;
    lastX = x;
    planted = x + dir * cur.o;
    steps_.push({ strip: cur.strip, k: cur.k, hold: 1, x: Math.round(x * 10) / 10 });
    // double support with the stance foot far behind: the weight goes to the front foot
    if (cur.next !== undefined && cur.o < -step * 0.2) {
      planted = x + dir * cur.next;
      cur = { ...cur, o: cur.next, next: undefined };
    }
  }
  const flip = (FACING[strip] as number) !== dir;
  const a: Action = { strip, from: c.tl.t, steps: steps_, x: x0, y: c.y, flip, walk: true };
  c.tl.acts.push(a);
  c.tl.t += T;
  c.x = x1;
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
