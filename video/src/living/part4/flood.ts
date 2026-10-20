// Song frames 4900-5121: the navy tsunami in her cream world (InkBleed from the left edge, then the wave, she is
// lifted, the navy closes over the frame), plus the drain painter used at 5122-5150 by the glass lane.
// Everything is painted in 2D code; the wave itself lives in floodFx.ts.
import { palette } from '../../style/palette.ts';
import { blink, LIFT_PAD, paintCharacter } from '../life.ts';
import { AI_BREATH } from './figures.ts';
import { clamp01, ev, getImg, lerp, pose, sec, sp, spriteUrls, url, type Painter, type Shot } from './common.ts';
import { paintBody, paintClose, paintCreamWorld, paintCrestNotes, paintDrainFx, paintFarSwell, paintFoam, paintSpatter, waveGeo, type Cam } from './floodFx.ts';
import { runStagePainter } from './run.ts';

const SWEPT = pose('a-swept');
export const FLOOD_IMAGES: readonly string[] = spriteUrls(['ai-stand', 'a-lookback', SWEPT]);

const F0 = ev('InkBleed starts');
const F_LAND = ev('InkBleed lands');
const F_LOOK = ev('flood: she turns');
const F_LIFT = ev('flood: the wave lifts');
const F_RIDE = ev('flood: she rides');
const F_CLOSE = 5100;
const F_END = ev('the navy drains');
const BLEED_FRAMES = F_LAND - F0 - 1; // 26: the last bleed frame is p = 1

const Y0 = 880;
const xFront = (f: number): number => 650 + 9.2 * (f - F_LAND);
const radius = (f: number): number => 380 + 1.3 * (f - F_LAND);

const camAt = (f: number, R: number, Xf: number): Cam => {
  if (f < F_LOOK) return { x: 960, y: 560, z: 1 + 0.0016 * (f - F0) };
  if (f < F_LIFT) {
    const u = (f - F_LOOK) / (F_LIFT - F_LOOK);
    return { x: 1230 + 110 * u, y: 610, z: 1.2 + 0.1 * u };
  }
  if (f < F_RIDE) {
    const u = (f - F_LIFT) / (F_RIDE - F_LIFT);
    const z = 1.1 + 0.1 * u;
    return { x: Xf + 0.1 * R, y: Y0 - 1.6 * R + 120 / z, z };
  }
  const u = Math.min(1, (f - F_RIDE) / (F_END - F_RIDE));
  const z = 1.0 + 0.07 * u;
  return { x: Xf - 0.25 * R, y: Y0 - 1.6 * R + 110 / z, z };
};

// ---------------------------------------------------------------------------------------------------------------
// Her.

const scratch = new Map<string, HTMLCanvasElement>();
const scratchOf = (name: string, cw: number, ch: number): HTMLCanvasElement => {
  let c = scratch.get(name);
  if (!c) {
    c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    scratch.set(name, c);
  }
  return c;
};

const inked = new Map<string, HTMLCanvasElement>();
/**
 * Her inside the navy: a slightly lifted navy body with a bold cream outline (the sprite's line, dilated), so the
 * figure reads continuously across the wave surface. Yellow (notes on her) is kept.
 */
const inkFigure = (name: string): HTMLCanvasElement => {
  let c = inked.get(name);
  if (c) return c;
  const img = getImg(url(name));
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const mk = () => {
    const k = document.createElement('canvas');
    k.width = w;
    k.height = h;
    return k;
  };
  const src = mk();
  const sctx = src.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  sctx.drawImage(img, 0, 0);
  const im = sctx.getImageData(0, 0, w, h);
  const body = mk();
  const mask = mk();
  const bi = sctx.createImageData(w, h);
  const mi = sctx.createImageData(w, h);
  for (let i = 0; i < im.data.length; i += 4) {
    const a = im.data[i + 3] as number;
    if (a < 8) continue;
    const r = im.data[i] as number;
    const g = im.data[i + 1] as number;
    const b = im.data[i + 2] as number;
    if (r > 170 && g > 150 && b < 140) {
      bi.data[i] = r;
      bi.data[i + 1] = g;
      bi.data[i + 2] = b;
      bi.data[i + 3] = a;
      continue;
    }
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    bi.data[i] = 38;
    bi.data[i + 1] = 49;
    bi.data[i + 2] = 86;
    bi.data[i + 3] = a;
    const lw = clamp01(1 - l / 0.6);
    mi.data[i] = 243;
    mi.data[i + 1] = 239;
    mi.data[i + 2] = 228;
    mi.data[i + 3] = a * lw;
  }
  (body.getContext('2d') as CanvasRenderingContext2D).putImageData(bi, 0, 0);
  (mask.getContext('2d') as CanvasRenderingContext2D).putImageData(mi, 0, 0);
  c = mk();
  const cctx = c.getContext('2d') as CanvasRenderingContext2D;
  cctx.drawImage(body, 0, 0);
  const rho = 2.6;
  for (let q = 0; q < 12; q++) cctx.drawImage(mask, Math.cos((q / 12) * Math.PI * 2) * rho, Math.sin((q / 12) * Math.PI * 2) * rho);
  cctx.drawImage(mask, 0, 0);
  inked.set(name, c);
  return c;
};

interface HerSpec {
  name: string;
  cx: number;
  cy: number;
  h: number;
  rot: number;
  mirror: boolean;
  breathing: boolean;
}
const BLINKS = [4932, 4968, 5003, 5044, 5090];

const drawHer = (ctx: CanvasRenderingContext2D, cam: Cam, s: HerSpec, f: number, inverted: boolean, alpha = 1): void => {
  const m = sp(s.name);
  const bb = m.bbox;
  const bx = ((bb[0] as number) + (bb[2] as number)) / 2;
  const by = ((bb[1] as number) + (bb[3] as number)) / 2;
  const k = (s.h / ((bb[3] as number) - (bb[1] as number))) * cam.z;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W2 + (s.cx - cam.x) * cam.z, H2 + (s.cy - cam.y) * cam.z);
  ctx.rotate((s.rot * Math.PI) / 180);
  ctx.scale(s.mirror ? -k : k, k);
  ctx.translate(-bx, -by);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  if (inverted) {
    ctx.drawImage(inkFigure(s.name), 0, 0);
  } else {
    const t = sec(f);
    let up = 0;
    if (s.breathing) {
      const c = scratchOf(s.name, m.w, m.h + LIFT_PAD);
      paintCharacter(c.getContext('2d') as CanvasRenderingContext2D, m.w, m.h + LIFT_PAD, getImg(url(`${s.name}-noeye`)), { t, breath: AI_BREATH });
      ctx.drawImage(c, 0, -LIFT_PAD);
      up = AI_BREATH.amp * (0.5 - 0.5 * Math.cos(Math.PI * 2 * (t / AI_BREATH.period + AI_BREATH.phase))) * (AI_BREATH.hip - AI_BREATH.top) * m.h;
    } else {
      ctx.drawImage(getImg(url(`${s.name}-noeye`)), 0, 0);
    }
    const eye = m.eye as number[];
    const sy = blink(f, BLINKS);
    const ex = eye[0] as number - 2;
    const ew = (eye[2] as number) + 4;
    const eh = (eye[3] as number) + 4;
    const cy = (eye[1] as number) - 2 + eh / 2 - up;
    ctx.drawImage(getImg(url(`${s.name}-eye`)), ex, cy - (eh * sy) / 2, ew, eh * sy);
  }
  ctx.restore();
};
const W2 = 960;
const H2 = 540;

const herSpec = (f: number, R: number, Xf: number): HerSpec => {
  const t = sec(f);
  if (f < F_LOOK) return { name: 'ai-stand', cx: 1460, cy: 620, h: 640, rot: 0, mirror: true, breathing: true };
  if (f < F_LIFT) return { name: 'a-lookback', cx: 1460, cy: 620, h: 650, rot: 1.4 * Math.sin(t * 2.2), mirror: true, breathing: false };
  const high = f >= F_RIDE;
  const apexY = Y0 - 1.6 * R;
  return {
    name: SWEPT,
    cx: Xf - (high ? 0.5 : 0.42) * R + 0.04 * R * Math.sin(t * 0.9),
    cy: apexY - (high ? 0.02 : -0.06) * R + 0.025 * R * Math.sin(t * 2.4),
    h: (high ? 0.8 : 0.82) * R,
    rot: 5.5 * Math.sin(t * 1.7 + 0.6),
    mirror: false,
    breathing: false,
  };
};

// ---------------------------------------------------------------------------------------------------------------
// The picture at song frame f (4900-5121).

const tsunami = (f: number): Painter => (ctx, w, h) => {
  void w;
  void h;
  const t = sec(f);
  const R = radius(f);
  const Xf = xFront(f);
  const cam = camAt(f, R, Xf);
  const wave = waveGeo(R, Xf, Y0, t);
  paintCreamWorld(ctx, cam, Y0);
  paintFarSwell(ctx, cam, wave, t);
  paintSpatter(ctx, cam, wave, t);
  paintBody(ctx, cam, wave, t);
  paintCrestNotes(ctx, cam, wave, t, 'back');
  const her = herSpec(f, R, Xf);
  drawHer(ctx, cam, her, f, false);
  ctx.save();
  ctx.setTransform(cam.z, 0, 0, cam.z, W2 - cam.x * cam.z, H2 - cam.y * cam.z);
  ctx.clip(wave.path);
  drawHer(ctx, cam, her, f, true);
  ctx.restore();
  paintFoam(ctx, cam, wave, t, false);
  paintCrestNotes(ctx, cam, wave, t, 'front');
  paintFoam(ctx, cam, wave, t, true);
  if (f >= F_CLOSE) {
    const u = clamp01((f - F_CLOSE) / (F_END - 1 - F_CLOSE));
    paintClose(ctx, u, f, () => drawHer(ctx, cam, her, f, true, 1 - 0.9 * u));
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

/**
 * InkBleed progress for the 26-frame bleed: the shader's front radius is smoothstep(.03,.97,e)^2, so e is chosen
 * to make that radius grow almost linearly (a gentle start), never rushing in the middle.
 */
const bleedP = (f: number): number => {
  const u = clamp01((f - F0) / BLEED_FRAMES);
  if (u >= 1) return 1;
  const U = 0.62; // the front grows over the first 78 %; the shader's closing cross-fade (e .88-1) gets the rest
  if (u >= U) return lerp(0.88, 1, (u - U) / (1 - U));
  const tgt = u / U;
  const target = 0.949 * tgt * (0.3 + 0.7 * tgt);
  const s = Math.sqrt(target);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (mid * mid * (3 - 2 * mid) < s) lo = mid;
    else hi = mid;
  }
  return 0.03 + 0.94 * ((lo + hi) / 2);
};

export const floodShot = (f: number): Shot => {
  if (f < F_LAND) {
    return { kind: 'gl', fx: 'ink', p: bleedP(f), seconds: 27 / 30, time: (f - F0) / 30, from: runStagePainter(f), to: tsunami(f), origin: [0.0, 0.55], seam: 1.0 };
  }
  return { kind: 'flat', paint: tsunami(f) };
};

/** Screen-space overlay for song frames 5122-5150: the navy drains out through the cracks (nothing after). */
export const paintDrain = (ctx: CanvasRenderingContext2D, w: number, h: number, f: number): void => paintDrainFx(ctx, w, h, f);
