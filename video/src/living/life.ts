// Frame-pure 2D painters for the living illustration: every function is a pure function of its arguments.
import { palette } from '../style/palette.ts';
import { seeded } from '../style/seeded.ts';

export const LIFT_PAD = 16;

export interface BreathOpts {
  /** Fractions of the sprite height: rows below `hip` stay fixed, rows above `top` only translate. */
  top: number;
  hip: number;
  /** Max stretch of the top..hip band (<= 0.015). */
  amp: number;
  /** Seconds per breath. */
  period: number;
  phase: number;
}
export interface HairOpts {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  amp: number;
  /** The side of the box that touches the face: displacement fades to 0 towards it. */
  face: 'left' | 'right';
}
export interface CharacterOpts {
  t: number;
  breath: BreathOpts;
  lift?: number;
  hair?: HairOpts;
  notes?: boolean;
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
const ctxOf = (c: Canvas2D): Ctx2D => c.getContext('2d', { willReadFrequently: true }) as Ctx2D;

const scratch = new Map<string, Canvas2D>();
/** A reusable scratch canvas per (name, size); callers clear it before use. */
const getScratch = (name: string, w: number, h: number): Canvas2D => {
  const key = `${name}:${w}x${h}`;
  let c = scratch.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    scratch.set(key, c);
  }
  return c;
};

const smooth = (a: number, b: number, x: number): number => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** Smooth 1D value noise in [-1, 1] from a seeded lattice (period 256, so slow time never loops visibly). */
const lattices = new Map<string, Float32Array>();
const vnoise = (key: string, x: number): number => {
  let tab = lattices.get(key);
  if (!tab) {
    const r = seeded(key);
    tab = new Float32Array(256);
    for (let i = 0; i < 256; i++) tab[i] = r() * 2 - 1;
    lattices.set(key, tab);
  }
  const i0 = Math.floor(x);
  const f = x - i0;
  const a = tab[((i0 % 256) + 256) % 256] as number;
  const b = tab[(((i0 + 1) % 256) + 256) % 256] as number;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};

interface Warp {
  topY: number;
  hipY: number;
  band: number;
  ext: number;
  s: number;
}
const makeWarp = (h: number, b: BreathOpts, t: number, lift: number): Warp => {
  const s = b.amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t / b.period + b.phase)));
  const topY = Math.round(b.top * h);
  const hipY = Math.round(b.hip * h);
  const band = hipY - topY;
  return { topY, hipY, band, ext: s * band + lift, s };
};
/** Rest row -> row in the warped sprite (before LIFT_PAD). */
const mapY = (w: Warp, y: number): number => {
  if (y >= w.hipY) return y;
  if (y >= w.topY) return w.hipY - ((w.hipY - y) * (w.band + w.ext)) / w.band;
  return y - w.ext;
};

const drawWarped = (ctx: Ctx2D, img: CanvasImageSource, iw: number, ih: number, w: Warp): void => {
  ctx.imageSmoothingEnabled = true;
  // band first, then the top part (one source row longer so it overlaps the band edge), then the fixed bottom
  ctx.drawImage(img, 0, w.topY, iw, w.band, 0, LIFT_PAD + w.topY - w.ext, iw, w.band + w.ext);
  ctx.drawImage(img, 0, 0, iw, w.topY + 1, 0, LIFT_PAD - w.ext, iw, w.topY + 1);
  ctx.drawImage(img, 0, w.hipY, iw, ih - w.hipY, 0, LIFT_PAD + w.hipY, iw, ih - w.hipY);
};

interface NoteComp {
  x: number;
  y: number;
  w: number;
  h: number;
  ph: number;
  per: number;
}
interface NoteData {
  mask: Canvas2D;
  comps: NoteComp[];
}
const noteCache = new Map<string, NoteData>();
const isYellow = (r: number, g: number, b: number, a: number): boolean =>
  a > 200 && Math.abs(r - 0xf0) + Math.abs(g - 0xd3) + Math.abs(b - 0x5a) < 60;

/** Yellow-only copy of the sprite plus the bounding box of every connected yellow patch (computed once per image). */
const getNotes = (img: HTMLImageElement): NoteData => {
  const key = img.src;
  const hit = noteCache.get(key);
  if (hit) return hit;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const tmp = makeCanvas(w, h);
  const tctx = ctxOf(tmp);
  tctx.drawImage(img, 0, 0);
  const d = tctx.getImageData(0, 0, w, h).data;
  const out = new ImageData(w, h);
  const label = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (isYellow(d[i * 4] as number, d[i * 4 + 1] as number, d[i * 4 + 2] as number, d[i * 4 + 3] as number)) {
      label[i] = -1;
      out.data[i * 4] = 0xf0;
      out.data[i * 4 + 1] = 0xd3;
      out.data[i * 4 + 2] = 0x5a;
      out.data[i * 4 + 3] = 255;
    }
  }
  const comps: NoteComp[] = [];
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (label[i] !== -1) continue;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    let n = 0;
    stack.push(i);
    label[i] = 1;
    while (stack.length) {
      const p = stack.pop() as number;
      const px = p % w;
      const py = (p - px) / w;
      n++;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
      const nb = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
      for (const q of nb) {
        if (q >= 0 && label[q] === -1) {
          label[q] = 1;
          stack.push(q);
        }
      }
    }
    if (n >= 150) {
      const r = seeded(`note:${key}:${comps.length}`);
      comps.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, ph: r(), per: 3 + r() * 2.5 });
    }
  }
  const mask = makeCanvas(w, h);
  ctxOf(mask).putImageData(out, 0, 0);
  const data = { mask, comps };
  noteCache.set(key, data);
  return data;
};

const paintNotes = (ctx: Ctx2D, img: HTMLImageElement, t: number, warp: Warp): void => {
  const { mask, comps } = getNotes(img);
  for (const c of comps) {
    const off = mapY(warp, c.y + c.h / 2) - (c.y + c.h / 2);
    const a = Math.sin(2 * Math.PI * (t / c.per + c.ph));
    const b = Math.sin(2 * Math.PI * (t / (c.per * 1.37) + c.ph * 2.1));
    for (let row = 0; row < c.h; row++) {
      const g = Math.pow(row / Math.max(1, c.h - 1), 1.6);
      const dx = g * 2 * a;
      const dy = g * 1 * b;
      ctx.drawImage(mask, c.x, c.y + row, c.w, 1, c.x + dx, LIFT_PAD + c.y + row + off + dy, c.w, 1.7);
    }
  }
};

/** Pixel gain so amp 1.4 reaches ~3 px at the free tips (measured in the life-check script). */
const HAIR_GAIN = 2.2;

const paintHair = (ctx: Ctx2D, base: Canvas2D, t: number, hair: HairOpts, warp: Warp, cw: number): void => {
  const BW = 6;
  const BH = 2;
  const boxH = hair.y1 - hair.y0;
  for (let y = hair.y0; y < hair.y1; y += BH) {
    const yc = (y + BH / 2 - hair.y0) / boxH;
    const wy = smooth(0, 0.18, yc) * smooth(0, 0.18, 1 - yc);
    const dy0 = Math.round(LIFT_PAD + mapY(warp, y));
    const dy1 = Math.round(LIFT_PAD + mapY(warp, Math.min(y + BH, hair.y1)));
    if (dy1 <= dy0) continue;
    const n = vnoise('hair', t * 0.4 + y * 0.025);
    for (let x = hair.x0; x < hair.x1; x += BW) {
      const xc = (x + BW / 2 - hair.x0) / (hair.x1 - hair.x0);
      const far = hair.face === 'left' ? xc : 1 - xc;
      const dx = hair.amp * HAIR_GAIN * n * wy * smooth(0, 1, far);
      const bw = Math.min(BW, hair.x1 - x);
      const sx = Math.min(Math.max(0, x - dx), cw - bw);
      ctx.clearRect(x, dy0, bw, dy1 - dy0);
      ctx.drawImage(base, sx, dy0, bw, dy1 - dy0, x, dy0, bw, dy1 - dy0);
    }
  }
};

export const paintCharacter = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  img: HTMLImageElement,
  o: CharacterOpts,
): void => {
  ctx.clearRect(0, 0, cw, ch);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const warp = makeWarp(ih, o.breath, o.t, o.lift ?? 0);
  if (!o.hair && !o.notes) {
    drawWarped(ctx, img, iw, ih, warp);
    return;
  }
  const tmp = getScratch('char', cw, ch);
  const tctx = ctxOf(tmp);
  tctx.clearRect(0, 0, cw, ch);
  drawWarped(tctx, img, iw, ih, warp);
  ctx.drawImage(tmp as CanvasImageSource, 0, 0);
  if (o.hair) paintHair(ctx, tmp, o.t, o.hair, warp, cw);
  if (o.notes) paintNotes(ctx, img, o.t, warp);
};

const CREAM_RGB = '243,239,228';

export const paintSteam = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  t: number,
  seed: string | number,
  opts: { lean?: number } = {},
): void => {
  const lean = opts.lean ?? 0;
  ctx.clearRect(0, 0, cw, ch);
  const r = seeded(`steam:${seed}`);
  const count = 3;
  for (let i = 0; i < count; i++) {
    const bx = cw * (0.5 + (i - 1) * 0.17) + (r() - 0.5) * cw * 0.05;
    const amp = cw * (0.07 + r() * 0.06);
    const freq = 0.9 + r() * 0.6;
    const speed = 0.09 + r() * 0.05;
    const ph = r();
    const width = cw * (0.07 + r() * 0.03);
    const key = `steam:${seed}:${i}`;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let py = ch; py >= 0; py -= 3) {
      const yn = (ch - py) / ch;
      const cx = bx + lean * (ch - py) + amp * Math.pow(yn, 0.7) * Math.sin(2 * Math.PI * (yn * freq - t * speed + ph));
      const body = 0.3 + 0.7 * Math.sin(Math.PI * Math.pow(yn, 0.55));
      const gap = smooth(-0.75, -0.2, vnoise(`${key}:gap`, yn * 2.4 - t * 0.35));
      const hw = width * body * gap * (1 - 0.5 * yn);
      left.push([cx - hw * (0.8 + 0.4 * vnoise(`${key}:l`, yn * 28 - t * 0.9)), py]);
      right.push([cx + hw * (0.8 + 0.4 * vnoise(`${key}:r`, yn * 28 - t * 0.9 + 40)), py]);
    }
    const grad = ctx.createLinearGradient(0, ch, 0, 0);
    grad.addColorStop(0, `rgba(${CREAM_RGB},0)`);
    grad.addColorStop(0.1, `rgba(${CREAM_RGB},0.88)`);
    grad.addColorStop(0.55, `rgba(${CREAM_RGB},0.8)`);
    grad.addColorStop(1, `rgba(${CREAM_RGB},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    left.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    for (let k = right.length - 1; k >= 0; k--) ctx.lineTo((right[k] as [number, number])[0], (right[k] as [number, number])[1]);
    ctx.closePath();
    ctx.fill();
  }
};

export const paintSky = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  t: number,
  sunP: number,
  opts: { sunR?: number; dotStep?: number } = {},
): void => {
  void t;
  ctx.fillStyle = palette.cream;
  ctx.fillRect(0, 0, cw, ch);
  const m = Math.min(cw, ch);
  // halftone dots in the lower sky, bigger towards the roofs
  const step = Math.max(opts.dotStep === undefined ? 7 : 4, m * (opts.dotStep ?? 0.02));
  const y0 = ch * 0.42;
  const y1 = ch * 0.86;
  ctx.fillStyle = palette.navy;
  for (let row = 0, y = y0; y < y1; row++, y += step * 0.866) {
    const rad = step * 0.36 * smooth(0, 1, (y - y0) / (y1 - y0));
    if (rad < 0.5) continue;
    for (let x = (row % 2) * step * 0.5; x < cw + step; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // sun: the yellow plate is offset from its key ring (misregistration)
  const r = (opts.sunR ?? 0.2) * m;
  const sx = cw * 0.56;
  const sy = ch * 0.8 + (ch * 0.38 - ch * 0.8) * Math.min(1, Math.max(0, sunP));
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = Math.max(1.2, m * 0.003);
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = palette.moonYellow;
  ctx.beginPath();
  ctx.arc(sx + 2.5, sy - 2, r, 0, Math.PI * 2);
  ctx.fill();
  // roofs along the bottom
  const rr = seeded('sky:roofs');
  ctx.fillStyle = palette.navy;
  ctx.beginPath();
  ctx.moveTo(0, ch);
  const chimneys: [number, number, number][] = [];
  let x = 0;
  while (x < cw) {
    const bw = cw * (0.06 + rr() * 0.07);
    const top = ch * (0.72 + rr() * 0.12);
    const kind = rr();
    ctx.lineTo(x, top);
    if (kind < 0.35) {
      ctx.lineTo(x + bw * 0.5, top - ch * 0.05);
      ctx.lineTo(x + bw, top);
    } else {
      ctx.lineTo(x + bw, top);
    }
    if (kind > 0.55) chimneys.push([x + bw * (0.2 + rr() * 0.4), top, bw * 0.12]);
    x += bw;
  }
  ctx.lineTo(cw, ch);
  ctx.closePath();
  ctx.fill();
  for (const [cx, top, cwid] of chimneys) ctx.fillRect(cx, top - ch * 0.05, cwid, ch * 0.06);
};

export const paintDust = (ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number, seed: string | number, n: number): void => {
  ctx.clearRect(0, 0, cw, ch);
  const r = seeded(`dust:${seed}`);
  const margin = 12;
  const span = ch + margin * 2;
  for (let i = 0; i < n; i++) {
    const x0 = r() * cw;
    const y0 = r() * span;
    const size = 1.5 + r() * 2.5;
    const vy = 5 + r() * 11;
    const sway = 6 + r() * 16;
    const f = 0.05 + r() * 0.08;
    const ph = r();
    const base = 0.3 + r() * 0.5;
    const tw = 0.12 + r() * 0.2;
    const pos = (((y0 - vy * t) % span) + span) % span;
    const y = pos - margin;
    const x = x0 + sway * Math.sin(2 * Math.PI * (t * f + ph)) + t * (i % 2 ? 1 : -1) * 0.9;
    const xw = ((x % cw) + cw) % cw;
    const edge = Math.sin((Math.PI * pos) / span) * Math.min(1, xw / 24, (cw - xw) / 24);
    const a = base * (0.75 + 0.25 * Math.sin(2 * Math.PI * (t * tw + ph * 3))) * Math.min(1, edge * 3);
    ctx.fillStyle = `rgba(${CREAM_RGB},${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(xw, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
};

const BLINK = [1, 0.45, 0.1, 0.45, 1];
/** Eye height scale: 1 open; a blink starting at frame a goes 1, 0.45, 0.1, 0.45, 1 over a..a+4. */
export const blink = (frame: number, at: readonly number[]): number => {
  let v = 1;
  for (const a of at) {
    const d = frame - a;
    if (d >= 0 && d <= 4) v = Math.min(v, BLINK[d] as number);
  }
  return v;
};

/** Lean-back angle in degrees: 0 at f0, eases in over the first period, then a smooth 0..ampDeg rocking. */
export const rock = (frame: number, f0: number, period: number, ampDeg: number): number => {
  const u = (frame - f0) / period;
  if (u <= 0) return 0;
  return ampDeg * smooth(0, 1, u) * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
};
