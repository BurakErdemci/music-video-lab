// Part3 shot list (song 3340-4676, scene map v2 scenes 9-11). Everything is in SONG frames.
//
// 3340-3361  the hand-over: Part 2's torch dot (960, 470, r 10) on navy-black, one black beat
// 3362-3390  transition #11: the dot re-opens as an iris; the dot IS the sun over the morning street (shape match)
// 3362-3473  shot 1: chest-up walk past shop windows, the camera tilts down from the sun and tracks; her reflection
// 3474-3585  shot 2: the TV-shop window, her on every screen, the moon phase steps across the screens per beat
// 3586-3837  shot 3: the café window; palms meet on "buradayız"; waves; "daha" resets
// 3838-3893  the wide street; PaperFold #12 (3852-3894) folds it onto his worktable
// 3894-4340  scene 10: the paper city, freeze, line-rain, counter, the click, collapse, yedek; tilt up to his window
// 4341-4675  scene 11: the night bus (match cut on the rain)
import { paintLayers } from '../compose2d.ts';
import type { Painter } from '../../transitions/layers.ts';
import { F, H, W, lerp, sine, easeInOut, span, type Cam, type Layer } from './common.ts';
import { camWide, streetStage, sunScreenAt, wideRoofCut, wideStage } from './street.ts';
import { CITY_LANDING, CITY_PANELS, deskCam, deskLayers } from './desk.ts';
import { busCam, busLayers, matchRainLayer } from './bus.ts';

export { SONG_END, SONG_START, setImageLookup, F } from './common.ts';
export { CITY_LANDING, CITY_PANELS };

export const HAND_OVER = { x: 960, y: 470, r: 10, color: '#F0D35A', bg: '#0B0F1E' } as const;

export interface StageShot {
  kind: 'stage';
  layers: Layer[];
  cam: Cam;
  /** A 2D painter over the stage (the iris). */
  overlay?: Painter;
}
export interface FlatShot {
  kind: 'flat';
  paint: Painter;
}
export interface FoldShot {
  kind: 'fold';
  p: number;
  from: StageShot;
  to: StageShot;
  cutout: [number, number][];
}
export type Shot = StageShot | FlatShot | FoldShot;

const paintDot: Painter = (ctx, w, h) => {
  ctx.fillStyle = HAND_OVER.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = HAND_OVER.color;
  ctx.beginPath();
  ctx.arc(HAND_OVER.x, HAND_OVER.y, HAND_OVER.r, 0, Math.PI * 2);
  ctx.fill();
};

/** Iris radius: from the dot to the sun's rim in half a beat-pair, then open to the whole frame by 3390. */
const irisR = (f: number, sunR: number): number => {
  const mid = F.iris0 + 14;
  if (f < mid) return lerp(HAND_OVER.r, sunR * 1.25, sine(span(f, F.iris0 - 1, mid)));
  return lerp(sunR * 1.25, 1250, easeInOut(span(f, mid, F.iris1)));
};
const irisPainter = (f: number, cam: Cam): Painter => (ctx, w, h) => {
  const s = sunScreenAt(cam);
  const r = irisR(f, s.r);
  ctx.save();
  ctx.fillStyle = HAND_OVER.bg;
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  // a printed rim: a ring of halftone dots just inside the black
  ctx.fillStyle = HAND_OVER.bg;
  const n = Math.max(24, Math.round(r / 5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, Math.min(6, 1.5 + r / 120), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const street = (f: number): StageShot => {
  const s = streetStage(f);
  return { kind: 'stage', layers: s.layers, cam: s.cam };
};
const desk = (f: number, city = true): StageShot => {
  const cam = deskCam(f);
  const layers = deskLayers(f, { city });
  const mr = matchRainLayer(f, cam, -Math.min(200, cam.z * 0.5));
  if (mr) layers.push(mr);
  return { kind: 'stage', layers, cam };
};
const bus = (f: number): StageShot => ({ kind: 'stage', layers: busLayers(f), cam: busCam(f) });

export const shotAt = (f: number): Shot => {
  if (f < F.iris0) return { kind: 'flat', paint: paintDot };
  if (f < F.iris1) {
    const s = street(f);
    return { ...s, overlay: irisPainter(f, s.cam) };
  }
  if (f < F.fold0) return street(f);
  if (f < F.fold1) {
    const w = wideStage(f);
    return { kind: 'fold', p: (f - F.fold0) / (F.fold1 - F.fold0), from: { kind: 'stage', layers: w.layers, cam: w.cam }, to: desk(F.fold1, false), cutout: wideRoofCut(f) };
  }
  if (f < F.bus) return desk(f);
  return bus(f);
};

export const stagePainter = (s: StageShot, frame: number): Painter => (ctx, w, h) => paintLayers(ctx, s.layers, s.cam, frame, w, h);
export const FOLD_FRAMES = F.fold1 - F.fold0;
void camWide;
void W;
void H;
