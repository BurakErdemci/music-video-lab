// Part3 shared bits: the event frames, sprite metadata and urls, the projection helpers and the layer builders.
// Same idiom as part1/shots.ts (copied, not imported: part1 keeps these private).
import { staticFile } from 'remotion';
import { FPS, TIMING, nearestBeatIndex } from '../../timing.ts';
import { H, W } from '../../layout.ts';
import { clamp01, lerp } from '../../math.ts';
import { D0, planeScale, type Cam, type CanvasSource, type Layer } from '../types.ts';
import { LIFT_PAD, paintCharacter, type BreathOpts, type HairOpts } from '../life.ts';
import EVENTS from './events.json' with { type: 'json' };
import SPRITES0 from '../sprites.json' with { type: 'json' };
import SPRITES1 from '../sprites-p1.json' with { type: 'json' };
import SPRITES2 from '../sprites-p1v2.json' with { type: 'json' };
import SPRITES3 from '../sprites-p3.json' with { type: 'json' };

export const SONG_START = EVENTS.songStart;
export const SONG_END = EVENTS.songEnd;
const ev = (name: string): number => {
  const e = EVENTS.events.find((x) => x.name.startsWith(name));
  if (!e) throw new Error(`no event ${name}`);
  return e.f;
};
export const F = {
  dot: ev('seam: torch dot'),
  iris0: ev('iris opens'),
  iris1: ev('iris fully open'),
  tv: ev('cut: TV-shop'),
  cafe: ev('cut: cafe window'),
  tilt: ev('her head tilts'),
  palms: ev('palms meet'),
  invertBack: ev('hands invert back'),
  daha0: ev('Her sabah bastan bir daha'),
  wave1: ev('chorus wave 1'),
  reset0: ev('after wave 1'),
  reach0: ev('she reaches for the glass again 0'),
  daha1: ev('daha 1'),
  reach1: ev('she reaches for the glass again 1'),
  daha2: ev('daha 2'),
  reach2: ev('she reaches for the glass again 2'),
  wide: ev('daha 3'),
  fold0: ev('PaperFold starts'),
  fold1: ev('PaperFold lands'),
  tower: ev('she sets the last tower'),
  freeze: ev('cut: he freezes'),
  pour: ev('the wall of notes pours'),
  count: ev('counter starts'),
  click: ev('the click'),
  collapse: ev('the paper city collapses'),
  kneel: ev('he kneels'),
  tiltUp: ev('tilt up to his window'),
  bus: ev('match cut: rain on the bus'),
  fade: ev('she fades into'),
  fog: ev('his breath fogs'),
  page: ev('she turns a page'),
  heart: ev('she draws a heart'),
  heartDone: ev('heart done'),
  reach: ev('she reaches through'),
  read: ev('he reads the note'),
  lookUp: ev('he looks up'),
};

// ---------------------------------------------------------------------------------------------------------------
// Sprites. p3 drawings live in living/p3/, part-1 ones in living/p1/, the living-test set in living/.

export type SpriteMeta = {
  w: number;
  h: number;
  bbox: number[];
  eye?: number[];
  outline?: number[][];
  hair?: { x0: number; y0: number; x1: number; y1: number };
  mugTop?: number[];
  [k: string]: unknown;
};
const SP0 = SPRITES0 as unknown as Record<string, SpriteMeta>;
const SP1 = { ...(SPRITES1 as unknown as Record<string, SpriteMeta>), ...(SPRITES2 as unknown as Record<string, SpriteMeta>) };
const SP3 = SPRITES3 as unknown as Record<string, SpriteMeta>;
export const sp = (n: string): SpriteMeta => {
  const m = SP3[n] ?? SP1[n] ?? SP0[n];
  if (!m) throw new Error(`no sprite ${n}`);
  return m;
};
export const hasSprite = (n: string): boolean => !!(SP3[n] ?? SP1[n] ?? SP0[n]);
/** Url of a sprite png (or its -eye / -noeye part). */
export const url = (n: string): string => {
  const base = n.replace(/-(eye|noeye)$/, '');
  if (SP3[base]) return staticFile(`living/p3/${n}.png`);
  if (SP1[base] || /^a-wave-/.test(n)) return staticFile(`living/p1/${n}.png`);
  return staticFile(`living/${n}.png`);
};
/** A named point / box of a sprite's metadata (sprite px). */
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

// ---------------------------------------------------------------------------------------------------------------
// Geometry.

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
export const BEAT = 0.4693;

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

/** A breathing character sprite (rect includes the LIFT_PAD rows on top, as paintCharacter draws them). */
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

export { LIFT_PAD, D0, W, H, clamp01, lerp };
export type { Cam, Layer, BreathOpts, HairOpts };

/** Head height (top of hair / head to chin, sprite px) measured by the drawing lanes (README-p3-*.md), and a head-top
 * point: the AI sprites carry headTop/headH; the human ones are read from their hair box. */
const HUMAN_HEAD_H: Record<string, number> = { 'h-walk': 262, 'h-palm': 240, 'h-lean': 131, 'h-head': 150, 'h-kneel': 147, 'h-freeze': 117, 'hb-lean': 165, 'hb-read': 165, 'hb-lookup': 165 };
export const headOf = (name: string): { top: [number, number]; h: number } => {
  const m = sp(name);
  if (typeof m.headH === 'number') {
    if (Array.isArray(m.headTop)) return { top: m.headTop as [number, number], h: m.headH };
    // the AI lane gives headTop as a row; the head's x is taken at its cursor eye
    const eye = m.eye as number[];
    return { top: [(eye[0] as number) + (eye[2] as number) / 2, (m.headTop as number) ?? 0], h: m.headH };
  }
  const hh = HUMAN_HEAD_H[name];
  if (!hh) throw new Error(`no head size for ${name}`);
  if (Array.isArray(m.headTop)) return { top: m.headTop as [number, number], h: hh };
  const hair = m.hair as { x0: number; y0: number; x1: number; y1: number };
  return { top: [(hair.x0 + hair.x1) / 2, hair.y0], h: hh };
};
