// Night-bus window painter (part 3). Frame-pure: everything is a function of the arguments.
// Scenery moves LEFT-TO-RIGHT on screen (the bus drives left); `travel` is the near-layer distance in px.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { clamp01, lerp } from '../../math.ts';

export interface BusWindowOpts {
  t: number;
  travel: number;
  /** Optional px/frame of `travel` (stretches the near light streaks). Default 20. */
  speed?: number;
  stop: number;
  rain: number;
  fog: { x: number; y: number; r: number; a: number } | null;
  heart: { x: number; y: number; size: number; p: number } | null;
  reflection?: (ctx: CanvasRenderingContext2D) => void;
  seed?: string;
  /** 'outside' = only the scenery (for a deeper parallax plane); 'glass' = only what is on the glass (reflection,
   * tint, fog, heart, rain) over transparent; default 'all'. */
  part?: 'all' | 'outside' | 'glass';
}

const TAU = Math.PI * 2;
const sm = (a: number, b: number, x: number): number => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const mod = (x: number, p: number): number => ((x % p) + p) % p;
/** Stable per-cell hash in 0..1 (no state, so grids do not swim). */
const hash = (i: number, j: number, s: number): number => {
  const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

const newCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

// ---------------------------------------------------------------- static layers (cached by size + seed)

interface Statics {
  sky: HTMLCanvasElement;
  farP: number;
  far: HTMLCanvasElement;
  nearP: number;
  near: HTMLCanvasElement;
}
const staticCache = new Map<string, Statics>();

const HORIZON = 0.62; // water starts here (fraction of ch)
const BASE = 0.585; // tower base line

const buildSky = (cw: number, ch: number, seed: string): HTMLCanvasElement => {
  const c = newCanvas(cw, ch);
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const r = seeded(`${seed}:sky`);
  g.fillStyle = palette.navy;
  g.fillRect(0, 0, cw, ch);
  // halftone haze rising from the horizon: dots shrink upward
  const step = Math.max(6, cw / 210);
  const y0 = ch * 0.08;
  const y1 = ch * BASE;
  g.fillStyle = palette.cream;
  g.globalAlpha = 0.16;
  g.beginPath();
  for (let row = 0, y = y1; y > y0; row++, y -= step * 0.866) {
    const rad = step * 0.34 * Math.pow(1 - (y1 - y) / (y1 - y0), 1.6);
    if (rad < 0.45) continue;
    for (let x = (row % 2) * step * 0.5; x < cw + step; x += step) {
      g.moveTo(x + rad, y);
      g.arc(x, y, rad, 0, TAU);
    }
  }
  g.fill();
  g.globalAlpha = 1;
  // a few stars
  g.fillStyle = palette.cream;
  for (let i = 0; i < 46; i++) {
    const x = r() * cw;
    const y = r() * ch * 0.4;
    g.globalAlpha = 0.25 + r() * 0.5;
    g.fillRect(x, y, 2, 2);
  }
  g.globalAlpha = 1;
  return c;
};

const buildTowers = (
  cw: number,
  ch: number,
  seed: string,
  P: number,
  far: boolean,
): HTMLCanvasElement => {
  const c = newCanvas(P, ch);
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const r = seeded(`${seed}:${far ? 'far' : 'near'}`);
  const s = cw / 1600;
  const base = ch * BASE;
  let x = r() * 20 * s;
  while (x < P - 30 * s) {
    const w = Math.min(P - x, (far ? 50 + r() * 70 : 70 + r() * 90) * s);
    const h = (far ? 0.1 + r() * 0.16 : 0.16 + r() * 0.22) * ch;
    const top = base - h;
    if (far) {
      // far silhouettes: outline only, a few dim windows
      g.fillStyle = palette.navy;
      g.fillRect(x, top, w, h + 4);
      g.strokeStyle = palette.cream;
      g.globalAlpha = 0.28;
      g.lineWidth = 1.5 * s;
      g.strokeRect(x, top, w, h + 4);
      g.globalAlpha = 1;
      g.fillStyle = palette.moonYellow;
      g.globalAlpha = 0.55;
      for (let wy = top + 10 * s; wy < base - 8 * s; wy += 14 * s)
        for (let wx = x + 8 * s; wx < x + w - 8 * s; wx += 12 * s)
          if (r() < 0.16) g.fillRect(wx, wy, 4 * s, 6 * s);
      g.globalAlpha = 1;
    } else {
      g.fillStyle = palette.navy;
      g.fillRect(x, top, w, h + 4);
      g.strokeStyle = palette.cream;
      g.globalAlpha = 0.5;
      g.lineWidth = 2 * s;
      g.strokeRect(x, top, w, h + 4);
      g.globalAlpha = 1;
      if (r() < 0.45) {
        // roof block or antenna
        g.fillStyle = palette.navy;
        g.fillRect(x + w * 0.3, top - 10 * s, w * 0.4, 10 * s);
        g.strokeStyle = palette.cream;
        g.globalAlpha = 0.5;
        g.strokeRect(x + w * 0.3, top - 10 * s, w * 0.4, 10 * s);
        g.globalAlpha = 1;
        if (r() < 0.5) {
          g.fillStyle = palette.cream;
          g.fillRect(x + w * 0.5 - s, top - 34 * s, 2 * s, 24 * s);
        }
      }
      const sx = 12 * s;
      const sy = 16 * s;
      const cols = Math.max(1, Math.floor((w - 12 * s) / sx));
      const padx = (w - cols * sx + (sx - 6 * s)) / 2;
      for (let wy = top + 12 * s; wy < base - 10 * s; wy += sy) {
        for (let k = 0; k < cols; k++) {
          const lit = r() < 0.42;
          g.fillStyle = lit ? palette.moonYellow : palette.cream;
          g.globalAlpha = lit ? 1 : 0.08;
          g.fillRect(x + padx + k * sx, wy, 6 * s, 9 * s);
          if (lit) {
            // misregistered yellow plate: a thin offset sliver
            g.globalAlpha = 0.45;
            g.fillRect(x + padx + k * sx + 3 * s, wy + 1.5 * s, 6 * s, 9 * s);
          }
        }
      }
      g.globalAlpha = 1;
    }
    x += w + (far ? 4 + r() * 22 : 10 + r() * 40) * s;
  }
  return c;
};

const getStatics = (cw: number, ch: number, seed: string): Statics => {
  const key = `${cw}x${ch}:${seed}`;
  let st = staticCache.get(key);
  if (!st) {
    const farP = Math.round(cw * 1.3);
    const nearP = Math.round(cw * 1.3);
    st = {
      sky: buildSky(cw, ch, seed),
      farP,
      far: buildTowers(cw, ch, seed, farP, true),
      nearP,
      near: buildTowers(cw, ch, seed, nearP, false),
    };
    if (staticCache.size > 6) staticCache.clear();
    staticCache.set(key, st);
  }
  return st;
};

/** Draw a wrapped strip canvas so it covers the whole width, shifted right by `shift`. */
const drawStrip = (ctx: CanvasRenderingContext2D, strip: HTMLCanvasElement, P: number, shift: number, cw: number): void => {
  const pos = mod(shift, P);
  ctx.drawImage(strip, pos - P, 0);
  ctx.drawImage(strip, pos, 0);
  void cw;
};

// ---------------------------------------------------------------- live scenery

const paintMoon = (ctx: CanvasRenderingContext2D, cw: number, ch: number, travel: number): void => {
  const s = cw / 1600;
  const mx = cw * 0.8 + travel * 0.02;
  const my = ch * 0.15;
  const R = 56 * s;
  ctx.fillStyle = palette.moonYellow;
  ctx.beginPath();
  ctx.arc(mx + 3 * s, my + 2 * s, R, 0, TAU);
  ctx.fill();
  // craters: navy halftone specks, plate-offset ring
  ctx.fillStyle = palette.navy;
  ctx.globalAlpha = 0.22;
  const r = seeded('moon');
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r()) * R * 0.78;
    ctx.beginPath();
    ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, (4 + r() * 8) * s, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.cream;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.arc(mx, my, R, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
};

const paintBridge = (ctx: CanvasRenderingContext2D, cw: number, ch: number, travel: number): void => {
  const s = cw / 1600;
  const shift = travel * 0.45;
  const deckTop = ch * (BASE + 0.012);
  const deckH = 16 * s;
  // piers (wrap with the lamps' parallax)
  const pierGap = 330 * s;
  const n0p = Math.floor(shift / pierGap);
  const posP = shift - n0p * pierGap;
  ctx.fillStyle = palette.navy;
  for (let j = -1; j * pierGap + posP < cw + pierGap; j++) {
    const x = posP + j * pierGap;
    ctx.fillRect(x - 12 * s, deckTop, 24 * s, ch * HORIZON - deckTop + 14 * s);
  }
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, deckTop, cw, deckH);
  ctx.strokeStyle = palette.cream;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(0, deckTop);
  ctx.lineTo(cw, deckTop);
  ctx.moveTo(0, deckTop + deckH);
  ctx.lineTo(cw, deckTop + deckH);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // lamps
  const gap = 170 * s;
  const n0 = Math.floor(shift / gap);
  const pos = shift - n0 * gap;
  for (let j = -1; pos + j * gap < cw + gap; j++) {
    const id = j - n0;
    const x = pos + j * gap;
    const ph = 46 * s + hash(id, 1, 3) * 14 * s;
    ctx.strokeStyle = palette.cream;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(x, deckTop);
    ctx.lineTo(x, deckTop - ph);
    ctx.lineTo(x + 28 * s, deckTop - ph - 4 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.moonYellow;
    ctx.beginPath();
    ctx.roundRect(x + 14 * s, deckTop - ph - 9 * s, 34 * s, 7 * s, 3 * s);
    ctx.fill();
    ctx.globalAlpha = 0.5; // misregistered second plate
    ctx.fillRect(x + 17 * s, deckTop - ph - 7 * s, 34 * s, 6 * s);
    ctx.globalAlpha = 1;
  }
};

const paintWater = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  t: number,
  travel: number,
  seed: string,
): void => {
  const s = cw / 1600;
  const wy = ch * HORIZON;
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, wy, cw, ch - wy);
  // lamp reflections: broken vertical columns under the bridge lamps
  const gap = 170 * s;
  const shift = travel * 0.45;
  const n0 = Math.floor(shift / gap);
  const pos = shift - n0 * gap;
  ctx.fillStyle = palette.moonYellow;
  for (let j = -1; pos + j * gap < cw + gap; j++) {
    const id = j - n0;
    const x = pos + j * gap + 30 * s;
    for (let k = 0; k < 7; k++) {
      const y = wy + 8 * s + k * 17 * s;
      const w = (38 - k * 3.2) * s * (0.8 + 0.4 * hash(id, k, 5));
      const dx = Math.sin(t * 1.6 + k * 1.3 + id) * 4 * s;
      ctx.globalAlpha = 0.85 - k * 0.1;
      ctx.fillRect(x + dx - w / 2, y, w, 4 * s);
    }
  }
  // scattered horizontal dashes (broken reflections), wrapped at parallax 0.3
  const r = seeded(`${seed}:water`);
  const P = cw * 1.3;
  for (let i = 0; i < 70; i++) {
    const rowT = Math.pow(r(), 1.3);
    const y = wy + 10 * s + rowT * (ch - wy - 20 * s);
    const w = (24 + rowT * 90 + r() * 30) * s;
    const x = mod(r() * P + travel * 0.3, P) - 40 * s;
    const ph = r() * TAU;
    const dx = Math.sin(t * 1.3 + ph) * 6 * s;
    ctx.globalAlpha = (0.3 + r() * 0.4) * (r() < 0.75 ? 1 : 0);
    ctx.fillStyle = r() < 0.7 ? palette.moonYellow : palette.cream;
    ctx.fillRect(x + dx, y, w, (2.5 + rowT * 3) * s);
  }
  ctx.globalAlpha = 1;
};

const paintStreaks = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  travel: number,
  speed: number,
  stop: number,
  seed: string,
): void => {
  const fade = 1 - sm(0.05, 0.9, stop);
  if (fade <= 0.001) return;
  const s = cw / 1600;
  const r = seeded(`${seed}:streak`);
  const P = cw * 1.7;
  const stretch = (12 + Math.min(80, Math.abs(speed)) * 5) * s;
  for (let i = 0; i < 18; i++) {
    const y = ch * (0.3 + r() * 0.62);
    const w = stretch * (0.6 + r() * 0.9);
    const x = mod(r() * P + travel, P) - 80 * s;
    const th = (3 + r() * 4) * s;
    const yellow = r() < 0.65;
    ctx.globalAlpha = (0.5 + r() * 0.4) * fade;
    ctx.fillStyle = yellow ? palette.moonYellow : palette.cream;
    // trailing edge to the left (they come from the right and streak toward the left)
    ctx.beginPath();
    ctx.roundRect(x - w, y, w, th, th / 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const paintStop = (ctx: CanvasRenderingContext2D, cw: number, ch: number, stop: number): void => {
  if (stop <= 0.001) return;
  const s = ch / 900;
  const e = 1 - Math.pow(1 - clamp01(stop), 3);
  const ground = ch * 0.78;
  // pavement band fades in with the shelter
  ctx.globalAlpha = sm(0, 0.4, stop);
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, ground, cw, ch - ground);
  ctx.strokeStyle = palette.cream;
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(0, ground);
  ctx.lineTo(cw, ground);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const w = 330 * s;
  const h = 300 * s;
  const cx = lerp(-w * 1.1, cw * 0.5, e);
  const x0 = cx - w / 2;
  const top = ground - h;
  // body
  ctx.fillStyle = palette.navy;
  ctx.fillRect(x0, top, w, h);
  // lit panel: moon-yellow plate (offset 3 px) with navy halftone dots at the bottom
  const px = x0 + 26 * s;
  const py = top + 34 * s;
  const pw = w * 0.62;
  const ph = h - 60 * s;
  ctx.fillStyle = palette.moonYellow;
  ctx.fillRect(px + 3 * s, py + 2 * s, pw, ph);
  ctx.fillStyle = palette.navy;
  const step = 9 * s;
  ctx.beginPath();
  for (let row = 0, y = py + ph * 0.45; y < py + ph; row++, y += step * 0.866) {
    const rad = step * 0.4 * ((y - py - ph * 0.45) / (ph * 0.55));
    if (rad < 0.5) continue;
    for (let x = px + 3 * s + (row % 2) * step * 0.5; x < px + 3 * s + pw; x += step) {
      ctx.moveTo(x + rad, y);
      ctx.arc(x, y, rad, 0, TAU);
    }
  }
  ctx.fill();
  ctx.strokeStyle = palette.cream;
  ctx.lineWidth = 2.5 * s;
  ctx.strokeRect(px, py, pw, ph);
  // bench bar
  ctx.beginPath();
  ctx.moveTo(px + pw + 18 * s, top + h * 0.62);
  ctx.lineTo(x0 + w - 14 * s, top + h * 0.62);
  ctx.stroke();
  // frame + roof
  ctx.lineWidth = 3.5 * s;
  ctx.strokeRect(x0, top, w, h);
  ctx.lineWidth = 7 * s;
  ctx.beginPath();
  ctx.moveTo(x0 - 16 * s, top - 4 * s);
  ctx.lineTo(x0 + w + 16 * s, top - 4 * s);
  ctx.stroke();
  // pole with a round sign (no text)
  const poleX = x0 + w + 54 * s;
  const poleTop = ground - 400 * s;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(poleX, ground);
  ctx.lineTo(poleX, poleTop);
  ctx.stroke();
  ctx.fillStyle = palette.navy;
  ctx.beginPath();
  ctx.arc(poleX, poleTop - 8 * s, 42 * s, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 4 * s;
  ctx.stroke();
  ctx.fillStyle = palette.moonYellow;
  ctx.beginPath();
  ctx.arc(poleX + 2 * s, poleTop - 8 * s, 26 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = palette.navy;
  ctx.beginPath();
  ctx.arc(poleX + 2 * s, poleTop - 8 * s, 9 * s, 0, TAU);
  ctx.fill();
};

const paintOutside = (ctx: CanvasRenderingContext2D, cw: number, ch: number, o: BusWindowOpts, seed: string): void => {
  const st = getStatics(cw, ch, seed);
  ctx.drawImage(st.sky, 0, 0);
  paintMoon(ctx, cw, ch, o.travel);
  drawStrip(ctx, st.far, st.farP, o.travel * 0.15 * 0.55, cw);
  drawStrip(ctx, st.near, st.nearP, o.travel * 0.15, cw);
  paintBridge(ctx, cw, ch, o.travel);
  paintWater(ctx, cw, ch, o.t, o.travel, seed);
  paintStop(ctx, cw, ch, o.stop);
  paintStreaks(ctx, cw, ch, o.travel, o.speed ?? 20, o.stop, seed);
};

// ---------------------------------------------------------------- glass: tint, glare, fog, heart, rain

const paintGlass = (ctx: CanvasRenderingContext2D, cw: number, ch: number): void => {
  ctx.fillStyle = palette.navy;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.cream;
  const lines: ReadonlyArray<[number, number, number]> = [
    [0.12, 0.05, 0.1],
    [0.33, 0.022, 0.07],
    [0.74, 0.04, 0.09],
  ];
  for (const [x, wd, a] of lines) {
    const x0 = cw * x;
    const sl = ch * 0.35;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(x0 + sl, 0);
    ctx.lineTo(x0 + sl + cw * wd, 0);
    ctx.lineTo(x0 + cw * wd, ch);
    ctx.lineTo(x0, ch);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

interface Pt {
  x: number;
  y: number;
}
interface HeartPath {
  pts: Pt[];
  cum: number[];
}
let heartMemo: { key: string; hp: HeartPath } | null = null;

/** Arc-length table of the heart outline: dip, round the left lobe, down to the point, up the right lobe, back. */
const heartPath = (x: number, y: number, size: number): HeartPath => {
  const key = `${x}|${y}|${size}`;
  if (heartMemo && heartMemo.key === key) return heartMemo.hp;
  const n = 180;
  const k = size / 32;
  const pts: Pt[] = [];
  const cum: number[] = [0];
  for (let i = 0; i <= n; i++) {
    const t = -TAU * (i / n);
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: x + hx * k, y: y - (hy + 2.5) * k });
    if (i > 0) {
      const a = pts[i - 1] as Pt;
      const b = pts[i] as Pt;
      cum.push((cum[i - 1] as number) + Math.hypot(b.x - a.x, b.y - a.y));
    }
  }
  const hp = { pts, cum };
  heartMemo = { key, hp };
  return hp;
};

const pointAt = (hp: HeartPath, p: number): Pt => {
  const total = hp.cum[hp.cum.length - 1] as number;
  const d = clamp01(p) * total;
  let lo = 0;
  let hi = hp.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((hp.cum[mid] as number) <= d) lo = mid;
    else hi = mid;
  }
  const c0 = hp.cum[lo] as number;
  const c1 = hp.cum[hi] as number;
  const u = c1 > c0 ? (d - c0) / (c1 - c0) : 0;
  const a = hp.pts[lo] as Pt;
  const b = hp.pts[hi] as Pt;
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
};

export const heartTip = (heart: { x: number; y: number; size: number }, p: number): [number, number] => {
  const q = pointAt(heartPath(heart.x, heart.y, heart.size), p);
  return [q.x, q.y];
};

let fogCanvas: HTMLCanvasElement | null = null;

/** Stroke the drawn part of the heart as a tapered pen line; `width` scales the whole stroke. */
const strokeHeart = (g: CanvasRenderingContext2D, hp: HeartPath, p: number, ox: number, oy: number, pen: number, extra: number): void => {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const steps = Math.max(2, Math.ceil(p * 120));
  let prev = pointAt(hp, 0);
  for (let i = 1; i <= steps; i++) {
    const u = (i / steps) * p;
    const q = pointAt(hp, u);
    const w = pen * (0.62 + 0.38 * sm(0, 0.14, u)) * (1 - 0.18 * sm(0.8, 1, u)) + extra;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(prev.x - ox, prev.y - oy);
    g.lineTo(q.x - ox, q.y - oy);
    g.stroke();
    prev = q;
  }
};

const paintFogAndHeart = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  t: number,
  fog: BusWindowOpts['fog'],
  heart: BusWindowOpts['heart'],
): void => {
  const showFog = fog !== null && fog.a > 0.002 && fog.r > 1;
  const showHeart = heart !== null && heart.p > 0.002;
  if (!showFog && !showHeart) return;
  const s = cw / 1600;
  const R = showFog && fog ? fog.r * (1 + 0.035 * Math.sin((TAU * t) / 3.5)) : 0;
  // bounding box of everything in the offscreen layer
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  if (showFog && fog) {
    x0 = fog.x - R;
    y0 = fog.y - R;
    x1 = fog.x + R;
    y1 = fog.y + R;
  }
  const hp = showHeart && heart ? heartPath(heart.x, heart.y, heart.size) : null;
  const pen = heart ? heart.size * 0.07 : 0;
  if (heart && showHeart) {
    const m = heart.size * 0.75;
    x0 = Math.min(x0, heart.x - m);
    y0 = Math.min(y0, heart.y - m);
    x1 = Math.max(x1, heart.x + m);
    y1 = Math.max(y1, heart.y + m);
  }
  x0 = Math.max(0, Math.floor(x0));
  y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(cw, Math.ceil(x1));
  y1 = Math.min(ch, Math.ceil(y1));
  const bw = x1 - x0;
  const bh = y1 - y0;
  if (bw < 2 || bh < 2) return;
  if (!fogCanvas) fogCanvas = newCanvas(bw, bh);
  if (fogCanvas.width < bw || fogCanvas.height < bh) {
    fogCanvas.width = Math.max(fogCanvas.width, bw);
    fogCanvas.height = Math.max(fogCanvas.height, bh);
  }
  const g = fogCanvas.getContext('2d') as CanvasRenderingContext2D;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
  g.globalCompositeOperation = 'source-over';

  let fogAtHeart = 0;
  if (showFog && fog) {
    // a soft cream haze under the stipple: fog over light (the stop's yellow panel) reads paler and hazier, and the wipe
    // of the heart clears it, so the stroke shows what is behind the glass clean and sharp
    const vg = g.createRadialGradient(fog.x - x0, fog.y - y0, 0, fog.x - x0, fog.y - y0, R);
    vg.addColorStop(0, 'rgba(243,239,228,1)');
    vg.addColorStop(0.4, 'rgba(243,239,228,0.85)');
    vg.addColorStop(1, 'rgba(243,239,228,0)');
    g.fillStyle = vg;
    g.globalAlpha = Math.min(1, fog.a * 0.3);
    g.fillRect(0, 0, bw, bh);
    // halftone stipple on a fixed hex grid; dot size and dropout fall off toward the edge
    const step = Math.max(5, 7 * s);
    g.fillStyle = palette.cream;
    g.globalAlpha = Math.min(1, fog.a * 0.42);
    g.beginPath();
    const rowH = step * 0.866;
    const r0 = Math.floor((fog.y - R) / rowH);
    const r1 = Math.ceil((fog.y + R) / rowH);
    for (let row = r0; row <= r1; row++) {
      const y = row * rowH;
      const off = mod(row, 2) * step * 0.5;
      const c0 = Math.floor((fog.x - R - off) / step);
      const c1 = Math.ceil((fog.x + R - off) / step);
      for (let col = c0; col <= c1; col++) {
        const x = col * step + off;
        const d = Math.hypot(x - fog.x, y - fog.y) / R;
        if (d >= 1) continue;
        const dens = 1 - sm(0.4, 1, d);
        const h1 = hash(col, row, 1);
        if (h1 > dens * 1.2 + 0.04) continue;
        const rad = step * 0.44 * (0.3 + 0.7 * dens) * (0.75 + 0.5 * hash(col, row, 2));
        if (rad < 0.4) continue;
        const cx = x - x0 + (hash(col, row, 3) - 0.5) * step * 0.35;
        const cy = y - y0 + (hash(col, row, 4) - 0.5) * step * 0.35;
        g.moveTo(cx + rad, cy);
        g.arc(cx, cy, rad, 0, TAU);
      }
    }
    g.fill();
    if (heart) {
      const dd = Math.hypot(heart.x - fog.x, heart.y - fog.y) / R;
      fogAtHeart = fog.a * (1 - sm(0.4, 1, dd));
    }
  }

  if (hp && heart) {
    const p = clamp01(heart.p);
    // wet rim on both sides of the wipe, then the wipe itself clears fog and rim core
    g.strokeStyle = palette.cream;
    g.globalAlpha = 0.18 + 0.3 * clamp01(fogAtHeart + 0.1);
    strokeHeart(g, hp, p, x0, y0, pen, 3.4 * s);
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = 1;
    g.strokeStyle = '#000';
    strokeHeart(g, hp, p, x0, y0, pen, 0);
    g.globalCompositeOperation = 'source-over';
  }
  g.globalAlpha = 1;
  ctx.drawImage(fogCanvas, 0, 0, bw, bh, x0, y0, bw, bh);
};

// ---------------------------------------------------------------- rain

const dropShape = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void => {
  if (a <= 0.01) return;
  ctx.globalAlpha = a * 0.7;
  ctx.fillStyle = palette.navy;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.45, y + r * 0.5, r * 0.95, r * 1.2, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = a * 0.6;
  ctx.fillStyle = palette.cream;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.8, r * 1.05, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = a * 0.9;
  ctx.fillStyle = palette.cream;
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.3, Math.max(0.6, r * 0.22), 0, TAU);
  ctx.fill();
};

export const paintGlassRain = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  t: number,
  amount: number,
  seed = 'bus',
): void => {
  if (amount <= 0.002) return;
  const s = Math.max(0.6, cw / 1600);
  ctx.save();
  const maxN = Math.round((cw * ch) / 7000);
  const r = seeded(`${seed}:drops`);
  for (let i = 0; i < maxN; i++) {
    const x = r() * cw;
    const y = r() * ch;
    const rad = (1.6 + Math.pow(r(), 2.2) * 5) * s;
    const th = i / maxN;
    const a = sm(0, 0.08, amount - th);
    dropShape(ctx, x, y, rad, a);
  }
  // running drops: each slot cycles through start, a stop-and-go slide with a thin trail, then fades
  const slots = Math.max(1, Math.round(amount * (cw * ch) / 70000));
  const cap = Math.round((cw * ch) / 70000);
  for (let i = 0; i < Math.min(slots, cap); i++) {
    const rs = seeded(`${seed}:run${i}`);
    const period = 7 + rs() * 6;
    const phase = rs() * period;
    const u = (t + phase) / period;
    const cyc = Math.floor(u);
    const f = u - cyc;
    const rc = seeded(`${seed}:run${i}:${cyc}`);
    const sx = rc() * cw;
    const sy = rc() * ch * 0.55;
    const len = (0.18 + rc() * 0.3) * ch;
    const rad = (3.2 + rc() * 2.6) * s;
    const k = 3 + Math.floor(rc() * 3);
    const wob = 6 + rc() * 8;
    const run = 0.55; // fraction of the cycle spent moving
    const q = clamp01(f / run);
    const prog = (v: number): number => v - (0.92 * Math.sin(TAU * k * v)) / (TAU * k);
    const pathAt = (v: number): Pt => ({ x: sx + Math.sin(v * 7 + i) * wob * s * v, y: sy + len * prog(v) });
    const fadeIn = sm(0, 0.04, f);
    const fadeOut = 1 - sm(0.82, 1, f);
    const a = fadeIn * fadeOut * sm(0, 0.1, amount - i / cap);
    if (a <= 0.01) continue;
    // trail
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = 1.3 * s;
    ctx.lineCap = 'round';
    const segs = 28;
    let pv = pathAt(0);
    for (let j = 1; j <= segs; j++) {
      const v = (j / segs) * q;
      const pt = pathAt(v);
      ctx.globalAlpha = a * 0.3 * (0.25 + 0.75 * (j / segs));
      ctx.beginPath();
      ctx.moveTo(pv.x, pv.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      pv = pt;
    }
    dropShape(ctx, pv.x, pv.y, rad, a);
  }
  ctx.restore();
};

// ---------------------------------------------------------------- public entry

export const paintBusWindow = (ctx: CanvasRenderingContext2D, cw: number, ch: number, o: BusWindowOpts): void => {
  const seed = o.seed ?? 'bus';
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.clip();
  const part = o.part ?? 'all';
  if (part !== 'glass') paintOutside(ctx, cw, ch, o, seed);
  if (part !== 'outside') {
    if (o.reflection) {
      ctx.save();
      o.reflection(ctx);
      ctx.restore();
    }
    paintGlass(ctx, cw, ch);
    paintFogAndHeart(ctx, cw, ch, o.t, o.fog, o.heart);
    paintGlassRain(ctx, cw, ch, o.t, o.rain, seed);
  }
  ctx.restore();
};
