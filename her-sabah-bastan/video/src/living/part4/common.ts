// Part4 shared bits: the event frames, ONE sprite registry over every drawing list of the film (parts 1-4), the
// projection helpers, the layer builders and the shot types. Same idiom as part3/common.ts (copied, not imported:
// part3 only resolves its own drawing folders).
import { staticFile } from 'remotion';
import { FPS, TIMING, nearestBeatIndex } from '../../timing.ts';
import { H, W } from '../../layout.ts';
import { clamp01, lerp } from '../../math.ts';
import { D0, planeScale, type Cam, type CanvasSource, type Layer } from '../types.ts';
import { LIFT_PAD, paintCharacter, type BreathOpts, type HairOpts } from '../life.ts';
import type { Painter } from '../../transitions/layers.ts';
import EVENTS from './events.json' with { type: 'json' };
import S0 from '../sprites.json' with { type: 'json' };
import S1 from '../sprites-p1.json' with { type: 'json' };
import S1b from '../sprites-p1v2.json' with { type: 'json' };
import S2a from '../sprites-p2a.json' with { type: 'json' };
import S2h from '../sprites-p2h.json' with { type: 'json' };
import S3 from '../sprites-p3.json' with { type: 'json' };
import S4h from '../sprites-p4-h.json' with { type: 'json' };
import S4a from '../sprites-p4-a.json' with { type: 'json' };
import S4p from '../sprites-p4-pl.json' with { type: 'json' };
import S4g from '../sprites-p4-g.json' with { type: 'json' };

export const SONG_START = EVENTS.songStart; // 4676
export const SONG_END = EVENTS.songEnd; // 7223 (exclusive)
export const SPLIT_AT = EVENTS.splitAt; // 6396: Part4a ends before it, Part4b starts on it
export const EVENT_LIST: readonly { f: number; name: string; on: string; kind: string }[] = EVENTS.events;

/** Song frame of the first event whose name starts with `name`. */
export const ev = (name: string): number => {
  const e = EVENTS.events.find((x) => x.name.startsWith(name));
  if (!e) throw new Error(`no event ${name}`);
  return e.f;
};
/** Song frames of every event whose name starts with `prefix`, in time order. */
export const evAll = (prefix: string): number[] => EVENTS.events.filter((x) => x.name.startsWith(prefix)).map((x) => x.f);

// ---------------------------------------------------------------------------------------------------------------
// Sprites: every list of the film, each with its folder. A later list wins on a name clash (none expected).

export type SpriteMeta = {
  w: number;
  h: number;
  bbox: number[];
  eye?: number[];
  outline?: number[][];
  hair?: { x0: number; y0: number; x1: number; y1: number };
  [k: string]: unknown;
};
type Lst = Record<string, SpriteMeta>;
const LISTS: [Lst, string][] = [
  [S0 as unknown as Lst, 'living'],
  [S1 as unknown as Lst, 'living/p1'],
  [S1b as unknown as Lst, 'living/p1'],
  [S2a as unknown as Lst, 'living/p2'],
  [S2h as unknown as Lst, 'living/p2'],
  [S3 as unknown as Lst, 'living/p3'],
  [S4h as unknown as Lst, 'living/p4'],
  [S4a as unknown as Lst, 'living/p4'],
  [S4p as unknown as Lst, 'living/p4'],
  [S4g as unknown as Lst, 'living/p4'],
];
const REG = new Map<string, { m: SpriteMeta; dir: string }>();
for (const [l, dir] of LISTS) for (const [k, m] of Object.entries(l)) REG.set(k, { m, dir });
// part 1's wave forearm lives beside a-wave
REG.set('a-wave-body', { m: (S1 as unknown as Lst)['a-wave'] as SpriteMeta, dir: 'living/p1' });

export const hasSprite = (n: string): boolean => REG.has(n);
export const sp = (n: string): SpriteMeta => {
  const r = REG.get(n);
  if (!r) throw new Error(`no sprite ${n}`);
  return r.m;
};
/** Url of a sprite png (or its -eye / -noeye part). */
export const url = (n: string): string => {
  const base = n.replace(/-(eye|noeye)$/, '');
  const r = REG.get(base);
  if (!r) throw new Error(`no sprite ${n}`);
  return staticFile(`${r.dir}/${n}.png`);
};
/** True for the AI drawings (they come as body -noeye + cursor -eye). */
export const isAi = (n: string): boolean => Array.isArray(sp(n).eye) && (n.startsWith('a-') || n.startsWith('ai-'));

/**
 * New part-4 drawings and the existing drawing that stands in for each until it exists. Scene code asks for the
 * new name through `pose()`; when the drawing lane adds it to its list the scene uses it with no code change.
 */
const STAND_IN: Record<string, string> = {
  'h-leap': 'h-walk',
  'h-run1': 'h-walk',
  'h-run2': 'h-walk',
  'h-run3': 'h-walk',
  'h-pant': 'h-lean',
  'h-floor-up': 'h-wake',
  'h-floor-book': 'h-sleep',
  'h-cross': 'h-walk',
  'h-desk-book': 'h-mug2',
  'a-run': 'a-step1',
  'a-swept': 'a-trip',
  'a-cross': 'a-step2',
  'pair-back': 'ai-stand',
  'bus-door': 'bus-int',
  'ins-foot': 'st-cafe',
  'ins-fist': 'st-cafe',
  'ins-face': 'st-cafe',
  'h-palm-full': 'h-hand',
  'a-palm-full': 'a-hand',
};
export const pose = (n: string): string => (hasSprite(n) ? n : (STAND_IN[n] ?? n));
/** Urls of named sprites to preload; AI drawings bring their -eye / -noeye parts. */
export const spriteUrls = (names: readonly string[]): string[] => names.flatMap((n) => (isAi(n) ? [url(n), url(`${n}-eye`), url(`${n}-noeye`)] : [url(n)]));

export const pt = (n: string, k: string): number[] => {
  const v = sp(n)[k];
  if (!Array.isArray(v)) throw new Error(`sprite ${n} has no ${k}`);
  return v as number[];
};
export const num = (n: string, k: string): number => {
  const v = sp(n)[k];
  if (typeof v !== 'number') throw new Error(`sprite ${n} has no number ${k}`);
  return v;
};

let imgLookup: (u: string) => HTMLImageElement = () => {
  throw new Error('images not ready');
};
export const getImg = (u: string): HTMLImageElement => imgLookup(u);
export const setImageLookup = (fn: (u: string) => HTMLImageElement): void => {
  imgLookup = fn;
};
/** The image of a sprite by name. */
export const img = (n: string): HTMLImageElement => getImg(url(n));

/** Head of a drawing (sprite px): AI sprites carry headTop/headH; human ones a hair box (+ headH when measured). */
const HUMAN_HEAD_H: Record<string, number> = {
  'h-walk': 262, 'h-palm': 240, 'h-lean': 131, 'h-head': 150, 'h-kneel': 147, 'h-freeze': 117, 'hb-lean': 165, 'hb-read': 165, 'hb-lookup': 165,
};
export const headOf = (name: string): { top: [number, number]; h: number } | null => {
  const m = sp(name);
  if (typeof m.headH === 'number') {
    if (Array.isArray(m.headTop)) return { top: m.headTop as [number, number], h: m.headH };
    const eye = m.eye as number[] | undefined;
    if (eye) return { top: [(eye[0] as number) + (eye[2] as number) / 2, (m.headTop as number) ?? 0], h: m.headH };
  }
  const hair = m.hair;
  if (hair) return { top: [(hair.x0 + hair.x1) / 2, hair.y0], h: HUMAN_HEAD_H[name] ?? (typeof m.headPx === 'number' ? (m.headPx as number) : (hair.y1 - hair.y0) * 1.25) };
  return null;
};

// ---------------------------------------------------------------------------------------------------------------
// Geometry and easing.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const REF: Cam = { x: W / 2, y: H / 2, z: D0 };
/** World rect on plane d that `ref` sees at screen rect r. */
export const placeAt = (r: Rect, d: number, ref: Cam = REF): Rect => {
  const k = planeScale(ref, d);
  return { x: ref.x + (r.x - W / 2) / k, y: ref.y + (r.y - H / 2) / k, w: r.w / k, h: r.h / k };
};
export const pointAt = (x: number, y: number, d: number, ref: Cam = REF): [number, number] => {
  const k = planeScale(ref, d);
  return [ref.x + (x - W / 2) / k, ref.y + (y - H / 2) / k];
};
export const project = (cam: Cam, d: number, p: readonly [number, number]): [number, number] => {
  const k = planeScale(cam, d);
  return [W / 2 + (p[0] - cam.x) * k, H / 2 + (p[1] - cam.y) * k];
};
export const projectRect = (cam: Cam, d: number, r: Rect): Rect => {
  const k = planeScale(cam, d);
  const [x, y] = project(cam, d, [r.x, r.y]);
  return { x, y, w: r.w * k, h: r.h * k };
};

export const easeInOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t: number): number => Math.pow(clamp01(t), 3);
export const sine = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
export const span = (f: number, a: number, b: number): number => clamp01((f - a) / (b - a));
export const sec = (f: number): number => f / FPS;
export const mixCam = (a: Cam, b: Cam, u: number): Cam => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)) });

/** Beat phase 0..1 at frame f (a beat lands on the frame it rounds to). */
export const beatPhase = (f: number): number => {
  const t = (f + 0.5) / FPS;
  const i = nearestBeatIndex(t);
  const b = TIMING.beats[i] as number;
  const j = t >= b ? i : i - 1;
  const t0 = TIMING.beats[j] as number;
  const t1 = TIMING.beats[j + 1] as number;
  return (t - t0) / (t1 - t0);
};
/** Song frames of the beats (rounded), and the last beat frame at or before f. */
export const BEAT_FRAMES: readonly number[] = TIMING.beats.map((b) => Math.round(b * FPS));
export const DOWNBEAT_FRAMES: readonly number[] = TIMING.downbeats.map((b) => Math.round(b * FPS));
export const lastBeat = (f: number): number => {
  let r = BEAT_FRAMES[0] as number;
  for (const b of BEAT_FRAMES) if (b <= f) r = b;
  return r;
};

// ---------------------------------------------------------------------------------------------------------------
// Layers.

export const canvasLayer = (id: string, key: string, cw: number, ch: number, d: number, r: Rect, paint: CanvasSource['paint'], extra: Partial<Layer> = {}): Layer => ({
  id,
  src: { kind: 'canvas', key, cw, ch, paint },
  d,
  ...r,
  ...extra,
});
export const imageLayer = (id: string, u: string, d: number, r: Rect, extra: Partial<Layer> = {}): Layer => ({ id, src: { kind: 'image', url: u }, d, ...r, ...extra });

/** A breathing (human) character sprite; `r` from spriteRectAt (incl. the LIFT_PAD rows on top). */
export const charLayer = (id: string, name: string, r: Rect, d: number, t: number, o: { breath: BreathOpts; hair?: HairOpts; notes?: boolean; lift?: number }, extra: Partial<Layer> = {}): Layer => {
  const m = sp(name);
  return {
    id,
    src: { kind: 'canvas', key: `${id}:${name}`, cw: m.w, ch: m.h + LIFT_PAD, paint: (ctx, cw, ch) => paintCharacter(ctx, cw, ch, getImg(url(name)), { t, ...o }) },
    d,
    ...r,
    ...extra,
  };
};
/** World rect of a sprite (incl. LIFT_PAD on top) at scale s whose sprite point (px, py) sits at world (x, y). */
export const spriteRectAt = (name: string, s: number, px: number, py: number, x: number, y: number, lift = true): Rect => {
  const m = sp(name);
  const pad = lift ? LIFT_PAD : 0;
  return { x: x - px * s, y: y - (py + pad) * s, w: m.w * s, h: (m.h + pad) * s };
};
/** World point of sprite point (px, py) for a rect made by spriteRectAt. */
export const spritePoint = (name: string, r: Rect, px: number, py: number, lift = true): [number, number] => {
  const m = sp(name);
  const pad = lift ? LIFT_PAD : 0;
  const s = r.w / m.w;
  return [r.x + px * s, r.y + (py + pad) * s];
};

// ---------------------------------------------------------------------------------------------------------------
// Shot types. Every scene module returns one Shot per song frame; Part4Scene.tsx renders it with at most ONE WebGL
// canvas: a stage through ThreeStage, a flat 2D painter, a print transition (its own WebGL canvas, both sides as 2D
// painters) or the shatter (its own Three canvas).

export interface StageShot {
  kind: 'stage';
  layers: Layer[];
  cam: Cam;
  /** A 2D painter drawn over the stage in screen space (cracks, icons in screen space, flashes). */
  overlay?: Painter;
}
export interface FlatShot {
  kind: 'flat';
  paint: Painter;
}
export type GlFx = 'plate' | 'squeegee' | 'ink';
export interface GlShot {
  kind: 'gl';
  fx: GlFx;
  /** 0..1 */
  p: number;
  /** Transition length in seconds and the time since it started (the shaders' grain/noise clocks). */
  seconds: number;
  time: number;
  from: Painter;
  to: Painter;
  /** InkBleed: origin (uv, top-left) and seam share. */
  origin?: readonly [number, number];
  seam?: number;
  /** PlateShift windows. */
  peel?: readonly [number, number, number, number];
  lay?: readonly [number, number, number, number];
  snap?: readonly [number, number, number, number];
  /** SqueegeePrint blade tilt. */
  tiltDeg?: number;
  /** A 2D painter over the transition (screen space). */
  overlay?: Painter;
}
/** The coda: the shards as real geometry in one Three canvas (part4/ShatterStage.tsx); `data` is that module's. */
export interface ShatterShot {
  kind: 'shatter';
  data: unknown;
  overlay?: Painter;
}
export type Shot = StageShot | FlatShot | GlShot | ShatterShot;

export { LIFT_PAD, D0, W, H, clamp01, lerp, planeScale };
export type { Cam, Layer, BreathOpts, HairOpts, Painter };
