// Frame-pure 2D painters for the emotion icons: flat fills, navy/cream outline, a misregistered moon-yellow plate.
// p is animation progress: p < 0 draws nothing, 0..0.25 pops in with an overshoot, then the icon is held with a gentle bob.
import { palette } from '../style/palette.ts';
import { seeded } from '../style/seeded.ts';

/** Red is reserved for emotion icons and used sparingly. */
export const EMOTION_RED = '#C8432E';

export interface IconOpts {
  /** 0..1: shrink and fade the icon out. */
  out?: number;
}
export interface SweatOpts extends IconOpts {
  /** 0..1: the drop slides down ~20% of ch and fades. */
  fall?: number;
}

type Canvas2D = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const makeCanvas = (w: number, h: number): Canvas2D => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const ease = (x: number): number => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/** Misregistration of the yellow plate against the key plate, in px. */
const PLATE = { dx: 2.5, dy: -2 };

/** Scale (pop-in 0 -> 1.15 -> 1, then a 1.5% bob, shrunk by `out`) and alpha for progress p. */
const animOf = (p: number, out = 0, pop = true): { scale: number; alpha: number } => {
  let s: number;
  if (pop && p < 0.25) {
    const u = p / 0.25;
    s = u < 0.6 ? 1.15 * ease(u / 0.6) : 1.15 - 0.15 * ease((u - 0.6) / 0.4);
  } else {
    s = 1 + 0.015 * Math.sin(2 * Math.PI * p * 1.6);
  }
  const o = clamp01(out);
  return { scale: s * (1 - 0.25 * o), alpha: 1 - o };
};

const place = (ctx: Ctx2D, cx: number, cy: number, scale: number, alpha: number): void => {
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
};

const strokeRound = (ctx: Ctx2D, color: string, w: number): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
};

/** A "?" built from an arc, a stem and a dot: yellow plate offset from its navy outline. Sits on cream. */
export const paintQuestion = (ctx: CanvasRenderingContext2D, cw: number, ch: number, p: number, opts: IconOpts = {}): void => {
  if (p < 0) return;
  const { scale, alpha } = animOf(p, opts.out);
  if (alpha <= 0 || scale <= 0) return;
  const s = Math.min(cw, ch) * 0.8;
  const w = s * 0.13;
  const o = Math.max(2, s * 0.025);
  ctx.save();
  place(ctx, cw / 2, ch / 2, scale, alpha);
  const shape = (): void => {
    ctx.beginPath();
    ctx.arc(0, -0.2 * s, 0.25 * s, Math.PI * 1.08, Math.PI * 2.5);
    ctx.lineTo(0, 0.12 * s);
  };
  const dot = (): void => {
    ctx.beginPath();
    ctx.arc(0, 0.37 * s, w * 0.62, 0, Math.PI * 2);
  };
  // navy key plate (outline ring), then the yellow plate on top, shifted by the misregistration
  shape();
  strokeRound(ctx, palette.navy, w + o * 2);
  dot();
  ctx.fillStyle = palette.navy;
  ctx.fill();
  ctx.lineWidth = o * 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(PLATE.dx, PLATE.dy);
  shape();
  strokeRound(ctx, palette.moonYellow, w - o * 0.4);
  dot();
  ctx.fillStyle = palette.moonYellow;
  ctx.fill();
  ctx.restore();
  ctx.restore();
};

/** One sweat drop with a highlight and two speed lines. Cream on navy; `fall` slides it down and fades it. */
export const paintSweat = (ctx: CanvasRenderingContext2D, cw: number, ch: number, p: number, opts: SweatOpts = {}): void => {
  if (p < 0) return;
  const fall = clamp01(opts.fall ?? 0);
  const { scale, alpha } = animOf(p, opts.out);
  const a = alpha * (1 - ease(fall));
  if (a <= 0 || scale <= 0) return;
  const s = Math.min(cw, ch) * 0.7;
  const o = Math.max(2, s * 0.03);
  ctx.save();
  place(ctx, cw / 2, ch / 2 + ease(fall) * 0.2 * ch, scale, a);
  const drop = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, -0.5 * s);
    ctx.bezierCurveTo(0.1 * s, -0.28 * s, 0.3 * s, -0.08 * s, 0.3 * s, 0.14 * s);
    ctx.arc(0, 0.14 * s, 0.3 * s, 0, Math.PI, false);
    ctx.bezierCurveTo(-0.3 * s, -0.08 * s, -0.1 * s, -0.28 * s, 0, -0.5 * s);
    ctx.closePath();
  };
  // misregistered yellow ghost plate under the drop
  ctx.save();
  ctx.translate(-PLATE.dx * 1.6, -PLATE.dy * 1.6);
  drop();
  ctx.fillStyle = palette.moonYellow;
  ctx.fill();
  ctx.restore();
  drop();
  ctx.fillStyle = palette.cream;
  ctx.fill();
  strokeRound(ctx, palette.navy, o);
  // inner shade arc (navy) and a small cream highlight pill beside it
  ctx.beginPath();
  ctx.arc(0, 0.14 * s, 0.2 * s, Math.PI * 0.05, Math.PI * 0.5);
  strokeRound(ctx, palette.navy, o * 0.8);
  ctx.beginPath();
  ctx.moveTo(-0.16 * s, 0.05 * s);
  ctx.lineTo(-0.16 * s, 0.17 * s);
  strokeRound(ctx, palette.navy, o * 2.2);
  ctx.beginPath();
  ctx.moveTo(-0.16 * s, 0.05 * s);
  ctx.lineTo(-0.16 * s, 0.17 * s);
  strokeRound(ctx, palette.cream, o * 1.2);
  // speed lines beside the drop
  for (const [x0, y0, x1, y1] of [
    [0.42, -0.34, 0.5, -0.46],
    [0.46, -0.16, 0.58, -0.24],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x0 * s, y0 * s);
    ctx.lineTo(x1 * s, y1 * s);
    strokeRound(ctx, palette.cream, o * 1.2);
  }
  ctx.restore();
};

const CHECK_PTS: readonly (readonly [number, number])[] = [
  [-0.34, 0.02],
  [-0.1, 0.27],
  [0.38, -0.3],
];

/** A hand-drawn check mark, drawn on like a pen over p 0..0.3, then held. */
export const paintCheck = (ctx: CanvasRenderingContext2D, cw: number, ch: number, p: number, opts: IconOpts = {}): void => {
  if (p < 0) return;
  const { scale, alpha } = animOf(p, opts.out, false);
  if (alpha <= 0 || scale <= 0) return;
  const s = Math.min(cw, ch) * 0.8;
  const w = s * 0.12;
  const o = Math.max(2, s * 0.025);
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < CHECK_PTS.length; i++) {
    const [ax, ay] = CHECK_PTS[i - 1] as readonly [number, number];
    const [bx, by] = CHECK_PTS[i] as readonly [number, number];
    const l = Math.hypot(bx - ax, by - ay);
    lens.push(l);
    total += l;
  }
  const drawn = ease(p / 0.3) * total;
  if (drawn <= 0) return;
  const path = (): void => {
    ctx.beginPath();
    const [sx, sy] = CHECK_PTS[0] as readonly [number, number];
    ctx.moveTo(sx * s, sy * s);
    let rest = drawn;
    for (let i = 1; i < CHECK_PTS.length && rest > 0; i++) {
      const [ax, ay] = CHECK_PTS[i - 1] as readonly [number, number];
      const [bx, by] = CHECK_PTS[i] as readonly [number, number];
      const f = Math.min(1, rest / (lens[i - 1] as number));
      ctx.lineTo((ax + (bx - ax) * f) * s, (ay + (by - ay) * f) * s);
      rest -= lens[i - 1] as number;
    }
  };
  ctx.save();
  place(ctx, cw / 2, ch / 2, scale, alpha);
  path();
  strokeRound(ctx, palette.navy, w + o * 2);
  ctx.save();
  ctx.translate(PLATE.dx, PLATE.dy);
  path();
  strokeRound(ctx, palette.moonYellow, w);
  ctx.restore();
  ctx.restore();
};

/** The glass stops the handshake: a solid printed "stop" mark that pops in with an overshoot (0 -> 1.15 -> 1), holds,
 * and fades at the end. A thick moon-yellow ring with a navy outline, a misregistered cream plate and six navy impact
 * ticks. Solid palette colours only (part1-v1's thin half-alpha ripple was too faint to read). */
export const paintGlassBump = (ctx: CanvasRenderingContext2D, cw: number, ch: number, p: number): void => {
  if (p < 0 || p > 1) return;
  const { scale, alpha } = animOf(p * 1.25, clamp01((p - 0.8) / 0.2));
  const m = Math.min(cw, ch);
  const R = m * 0.26;
  const lw = m * 0.07;
  ctx.save();
  place(ctx, cw / 2, ch / 2, scale, alpha);
  // cream plate, a little off register
  ctx.beginPath();
  ctx.arc(PLATE.dx * 2, PLATE.dy * 2, R, 0, Math.PI * 2);
  ctx.strokeStyle = palette.cream;
  ctx.lineWidth = lw + 6;
  ctx.stroke();
  // navy outline under the yellow ring
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = lw + 7;
  ctx.stroke();
  ctx.strokeStyle = palette.moonYellow;
  ctx.lineWidth = lw;
  ctx.stroke();
  // impact ticks
  ctx.strokeStyle = palette.navy;
  ctx.lineCap = 'round';
  ctx.lineWidth = m * 0.035;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const r0 = R + lw * 0.9;
    const r1 = r0 + m * 0.11;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
};

// ---- ink lift ----

interface InkTile {
  sx: number;
  sy: number;
  w: number;
  h: number;
}
interface InkData {
  sw: number;
  sh: number;
  clean: Canvas2D;
  ink: Canvas2D;
  tiles: InkTile[];
}
const inkCache = new Map<CanvasImageSource, InkData>();
const MAX_TILES = 2000;

const dimsOf = (src: CanvasImageSource): [number, number] => {
  const s = src as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number; height?: number };
  return [s.naturalWidth || s.videoWidth || (s.width as number), s.naturalHeight || s.videoHeight || (s.height as number)];
};

const getInk = (src: CanvasImageSource): InkData => {
  const hit = inkCache.get(src);
  if (hit) return hit;
  const [sw, sh] = dimsOf(src);
  const tmp = makeCanvas(sw, sh);
  const tctx = tmp.getContext('2d', { willReadFrequently: true }) as Ctx2D;
  tctx.drawImage(src, 0, 0, sw, sh);
  const img = tctx.getImageData(0, 0, sw, sh);
  const d = img.data;
  const ink = new ImageData(sw, sh);
  const inkA = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const lum = 0.299 * (d[i * 4] as number) + 0.587 * (d[i * 4 + 1] as number) + 0.114 * (d[i * 4 + 2] as number);
    // much darker than the cream paper (~238): fully ink under 90, nothing above 170
    const a = (d[i * 4 + 3] as number) > 200 ? Math.round(255 * clamp01((170 - lum) / 80)) : 0;
    if (a > 0) {
      inkA[i] = a;
      ink.data[i * 4] = 0x18;
      ink.data[i * 4 + 1] = 0x20;
      ink.data[i * 4 + 2] = 0x3a;
      ink.data[i * 4 + 3] = a;
      // paper under the ink; a soft edge pixel keeps some of its colour so no dark halo remains
      const k = a / 255;
      d[i * 4] = Math.round((d[i * 4] as number) * (1 - k) + 0xf3 * k);
      d[i * 4 + 1] = Math.round((d[i * 4 + 1] as number) * (1 - k) + 0xef * k);
      d[i * 4 + 2] = Math.round((d[i * 4 + 2] as number) * (1 - k) + 0xe4 * k);
    }
  }
  tctx.putImageData(img, 0, 0);
  const inkCanvas = makeCanvas(sw, sh);
  (inkCanvas.getContext('2d') as Ctx2D).putImageData(ink, 0, 0);
  // thin strand tiles (taller than wide); the tile size grows until at most MAX_TILES tiles hold ink
  let tw = 6;
  let th = 14;
  let tiles: InkTile[] = [];
  for (;;) {
    tiles = [];
    for (let y = 0; y < sh; y += th) {
      for (let x = 0; x < sw; x += tw) {
        const x1 = Math.min(sw, x + tw);
        const y1 = Math.min(sh, y + th);
        let has = false;
        for (let yy = y; yy < y1 && !has; yy++) {
          for (let xx = x; xx < x1; xx++) {
            if (inkA[yy * sw + xx]) {
              has = true;
              break;
            }
          }
        }
        if (has) tiles.push({ sx: x, sy: y, w: x1 - x, h: y1 - y });
      }
    }
    if (tiles.length <= MAX_TILES) break;
    tw = Math.round(tw * 1.4);
    th = Math.round(th * 1.4);
  }
  const data = { sw, sh, clean: tmp, ink: inkCanvas, tiles };
  inkCache.set(src, data);
  return data;
};

/** The page with its dark ink lifting off as strands that rise up-right and fade; at p = 1 the paper is clean. */
export const paintInkLift = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  src: CanvasImageSource,
  p: number,
  seed: string | number,
): void => {
  const data = getInk(src);
  const kx = cw / data.sw;
  const ky = ch / data.sh;
  const q = clamp01(p);
  ctx.save();
  ctx.fillStyle = palette.cream;
  ctx.fillRect(0, 0, cw, ch);
  // ruled lines fade with the lift; the page without ink is all that remains of it
  ctx.globalAlpha = 1 - 0.88 * ease(q);
  ctx.drawImage(data.clean as CanvasImageSource, 0, 0, cw, ch);
  const r = seeded(`inklift:${seed}`);
  const dist = Math.min(cw, ch);
  for (const t of data.tiles) {
    // a wave from the lower left plus jitter; every tile is gone by p = 1
    const wave = 0.5 * (t.sx / data.sw) + 0.5 * (1 - t.sy / data.sh);
    const start = 0.04 + 0.56 * (0.6 * wave + 0.4 * r());
    const dur = 0.3 + 0.1 * r();
    const rise = (0.05 + 0.1 * r()) * dist;
    const drift = (0.3 + 0.5 * r()) * rise;
    const u = (q - start) / dur;
    if (u >= 1) continue;
    let dx = 0;
    let dy = 0;
    let a = 1;
    let sc = 1;
    if (u > 0) {
      dx = drift * u * u + Math.sin(u * 5 + t.sx) * 2;
      dy = -rise * u * u;
      a = 1 - ease(u);
      sc = 1 - 0.4 * u;
    }
    ctx.globalAlpha = a;
    ctx.drawImage(
      data.ink as CanvasImageSource,
      t.sx,
      t.sy,
      t.w,
      t.h,
      t.sx * kx + dx + (t.w * kx * (1 - sc)) / 2,
      t.sy * ky + dy + (t.h * ky * (1 - sc)) / 2,
      t.w * kx * sc,
      t.h * ky * sc,
    );
  }
  ctx.restore();
};
