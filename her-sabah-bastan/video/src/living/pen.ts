// An invisible pen draws the AI: navy outline first (several hand-drawn strokes), then the flat sprite is inked in behind a wavy front.
import { palette } from '../style/palette.ts';
import { range, seeded } from '../style/seeded.ts';

export interface PenOpts {
  /** Closed outline polyline in sprite px, starting at the top of the head. */
  outline: readonly (readonly [number, number])[];
  /** 0..1 of the whole drawing time (strokes plus pauses) that has elapsed. */
  line: number;
  /** 0..1 reveal of the sprite from top to bottom. */
  fill: number;
  /** Stroke width in px. */
  stroke: number;
  /** Seed of the hand: wobble, pressure, stroke pace. */
  seed?: string;
}

type Pt = readonly [number, number];

const SOFT = 8;
const WAVE = 12;

const scratches = new Map<string, HTMLCanvasElement>();
const getScratch = (name: string, w: number, h: number): CanvasRenderingContext2D => {
  let c = scratches.get(name);
  if (!c || c.width !== w || c.height !== h) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    scratches.set(name, c);
  }
  return c.getContext('2d') as CanvasRenderingContext2D;
};

/** Smooth 1-D value noise in -1..1 over a seeded lattice. */
const makeNoise = (seed: string): ((x: number) => number) => {
  const r = seeded(seed);
  const lat = Array.from({ length: 512 }, () => r() * 2 - 1);
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = lat[((i % 512) + 512) % 512] as number;
    const b = lat[(((i + 1) % 512) + 512) % 512] as number;
    return a + (b - a) * f * f * (3 - 2 * f);
  };
};
const wave = makeNoise('pen:wave');

/** Black mask: opaque above the wavy front, falling off over SOFT px below it. */
const frontMask = (cw: number, ch: number, fill: number): CanvasRenderingContext2D => {
  const tctx = getScratch('mask', cw, ch);
  tctx.globalCompositeOperation = 'source-over';
  tctx.clearRect(0, 0, cw, ch);
  const travel = ch + SOFT + 2 * WAVE;
  const base = -WAVE - SOFT + fill * travel;
  const COL = 2;
  for (let x = 0; x < cw; x += COL) {
    const front = base + WAVE * (0.65 * wave(x / 38) + 0.35 * wave(x / 11 + 90));
    const g = tctx.createLinearGradient(0, front - SOFT, 0, front);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.fillStyle = g;
    tctx.fillRect(x, front - SOFT, COL, SOFT);
    if (front - SOFT > 0) {
      tctx.fillStyle = '#000';
      tctx.fillRect(x, 0, COL, front - SOFT);
    }
  }
  return tctx;
};

/** The sprite, visible only above the front. */
const revealed = (img: HTMLImageElement, cw: number, ch: number, fill: number): HTMLCanvasElement => {
  const mask = frontMask(cw, ch, fill);
  const rctx = getScratch('rev', cw, ch);
  rctx.globalCompositeOperation = 'source-over';
  rctx.clearRect(0, 0, cw, ch);
  rctx.drawImage(mask.canvas, 0, 0);
  rctx.globalCompositeOperation = 'source-in';
  rctx.drawImage(img, 0, 0);
  rctx.globalCompositeOperation = 'source-over';
  return rctx.canvas;
};

// ---------- stroke planning (cached per outline) ----------

interface Stroke {
  /** Sample positions (x, y interleaved), already wobbled, overshoot included. */
  xy: Float32Array;
  /** Width factor per sample (taper times pressure). */
  wf: Float32Array;
  /** Cumulative length per sample. */
  cum: Float32Array;
  /** Start and end in 0..1 line time. */
  t0: number;
  t1: number;
}

const STEP = 3;
const MIN_PIECES = 6;
const MAX_PIECES = 9;
const PAUSE = 0.03;
const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Break the closed loop into arcs (in sample indices of a uniform resample) at corners, concave ones first. */
const findBreakpoints = (P: Pt[]): number[] => {
  const M = P.length;
  let area = 0;
  for (let i = 0; i < M; i++) {
    const a = P[i] as Pt;
    const b = P[(i + 1) % M] as Pt;
    area += a[0] * b[1] - b[0] * a[1];
  }
  const orient = area >= 0 ? 1 : -1;
  const w = Math.max(2, Math.round(M * 0.03));
  const turn: number[] = [];
  for (let i = 0; i < M; i++) {
    const a = P[(i - w + M) % M] as Pt;
    const b = P[i] as Pt;
    const c = P[(i + w) % M] as Pt;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const vx = c[0] - b[0];
    const vy = c[1] - b[1];
    turn.push((Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy) * orient * 180) / Math.PI);
  }
  // Concave corners (neck, armpit, crotch, knee) count from 20 deg, convex ones (feet, fingertips) from 70 deg:
  // a round head turns about 60 deg over the same window and must not be cut.
  const cand: { i: number; s: number }[] = [];
  for (let i = 0; i < M; i++) {
    const t = turn[i] as number;
    const s = t < 0 ? -t / 20 : t / 70;
    if (s < 1) continue;
    let top = true;
    for (let d = -w; d <= w && top; d++) {
      const u = turn[(i + d + M) % M] as number;
      if ((u < 0 ? -u / 20 : u / 70) > s) top = false;
    }
    if (top) cand.push({ i, s });
  }
  cand.sort((a, b) => b.s - a.s);
  const gap = Math.round(M * 0.04);
  const chosen: number[] = [];
  for (const c of cand) {
    if (chosen.length >= MAX_PIECES - 1) break;
    if (chosen.every((j) => Math.min(Math.abs(j - c.i), M - Math.abs(j - c.i)) >= gap)) chosen.push(c.i);
  }
  if (chosen.length < 2) {
    chosen.length = 0;
    for (let k = 0; k < MIN_PIECES; k++) chosen.push(Math.round((k * M) / MIN_PIECES));
  }
  chosen.sort((a, b) => a - b);
  // Subdivide the longest arcs at their sharpest inner turn (midpoint when flat) until none is long.
  for (;;) {
    let bi = 0;
    let bl = -1;
    for (let k = 0; k < chosen.length; k++) {
      const a = chosen[k] as number;
      const b = k + 1 < chosen.length ? (chosen[k + 1] as number) : (chosen[0] as number) + M;
      if (b - a > bl) {
        bl = b - a;
        bi = k;
      }
    }
    if (chosen.length >= MAX_PIECES || (chosen.length >= MIN_PIECES && bl <= M * 0.18)) break;
    const a = chosen[bi] as number;
    let best = a + Math.round(bl / 2);
    let bs = 8;
    for (let d = Math.round(bl * 0.3); d <= Math.round(bl * 0.7); d++) {
      const s = Math.abs(turn[(a + d) % M] as number);
      if (s > bs) {
        bs = s;
        best = a + d;
      }
    }
    chosen.push(best % M);
    chosen.sort((x, y) => x - y);
  }
  return chosen;
};

const planStrokes = (outline: readonly Pt[], seed: string): Stroke[] => {
  const n = outline.length;
  const cumO = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const a = outline[i] as Pt;
    const b = outline[(i + 1) % n] as Pt;
    cumO[i + 1] = (cumO[i] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const T = cumO[n] as number;
  if (n < 3 || T < 1) return [];
  const at = (sRaw: number): Pt => {
    const s = ((sRaw % T) + T) % T;
    let lo = 0;
    let hi = n;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((cumO[mid] as number) <= s) lo = mid;
      else hi = mid;
    }
    const a = outline[lo] as Pt;
    const b = outline[(lo + 1) % n] as Pt;
    const l = (cumO[lo + 1] as number) - (cumO[lo] as number);
    const f = l > 0 ? (s - (cumO[lo] as number)) / l : 0;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };

  const M = Math.max(60, Math.min(480, Math.round(T / 6)));
  const uni: Pt[] = [];
  for (let k = 0; k < M; k++) uni.push(at((k * T) / M));
  const bp = findBreakpoints(uni);

  const rnd = seeded(`${seed}:pen`);
  const noise = makeNoise(`${seed}:hand`);
  type Raw = { pts: Pt[]; len: number };
  const raws: Raw[] = [];
  for (let k = 0; k < bp.length; k++) {
    const s0 = ((bp[k] as number) * T) / M;
    let s1 = (((k + 1 < bp.length ? (bp[k + 1] as number) : (bp[0] as number) + M)) * T) / M;
    if (s1 <= s0) s1 += T;
    const len = s1 - s0;
    const cnt = Math.max(2, Math.ceil(len / STEP));
    let pts: Pt[] = [];
    for (let j = 0; j <= cnt; j++) pts.push(at(s0 + (len * j) / cnt));
    // Draw downward, the way a hand does.
    if ((pts[pts.length - 1] as Pt)[1] < (pts[0] as Pt)[1] - 0.25 * len) pts = pts.reverse();
    raws.push({ pts, len });
  }
  raws.sort((a, b) => {
    const my = (r: Raw): number => r.pts.reduce((s, p) => s + p[1], 0) / r.pts.length;
    return my(a) - my(b);
  });

  const lens = raws.map((r) => r.len * range(rnd, 0.85, 1.15));
  const sum = lens.reduce((a, b) => a + b, 0);
  const avail = 1 - PAUSE * (raws.length - 1);
  let tcur = 0;
  const strokes: Stroke[] = [];
  raws.forEach((r, k) => {
    // Overshoot: the hand runs on a few px along the last tangent.
    const last = r.pts[r.pts.length - 1] as Pt;
    const prev = r.pts[Math.max(0, r.pts.length - 4)] as Pt;
    const tl = Math.hypot(last[0] - prev[0], last[1] - prev[1]) || 1;
    const tx = (last[0] - prev[0]) / tl;
    const ty = (last[1] - prev[1]) / tl;
    const over = range(rnd, 3, 6.5);
    const pts: Pt[] = r.pts.slice();
    for (let d = STEP; d < over + STEP; d += STEP) {
      const dd = Math.min(d, over);
      pts.push([last[0] + tx * dd, last[1] + ty * dd]);
      if (dd >= over) break;
    }
    const m = pts.length;
    const cum = new Float32Array(m);
    for (let i = 1; i < m; i++) {
      const a = pts[i - 1] as Pt;
      const b = pts[i] as Pt;
      cum[i] = (cum[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const L = cum[m - 1] as number;
    const amp = range(rnd, 0.6, 1.2);
    const nOff = k * 37 + rnd() * 20;
    const pOff = k * 53 + rnd() * 20;
    const xy = new Float32Array(m * 2);
    const wf = new Float32Array(m);
    for (let i = 0; i < m; i++) {
      const a = pts[Math.max(0, i - 1)] as Pt;
      const b = pts[Math.min(m - 1, i + 1)] as Pt;
      const dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / dl;
      const ny = (b[0] - a[0]) / dl;
      const s = cum[i] as number;
      const off = amp * noise(s / 70 + nOff);
      const p = pts[i] as Pt;
      xy[i * 2] = p[0] + nx * off;
      xy[i * 2 + 1] = p[1] + ny * off;
      const u = L > 0 ? s / L : 0;
      const edge = Math.min(u, 1 - u) / 0.12;
      const taper = 0.25 + 0.75 * smooth(Math.min(1, edge));
      wf[i] = taper * (1 + 0.15 * noise(s / 28 + pOff));
    }
    const dur = (avail * (lens[k] as number)) / sum;
    strokes.push({ xy, wf, cum, t0: tcur, t1: tcur + dur });
    tcur += dur + PAUSE;
  });
  strokes[strokes.length - 1]!.t1 = 1;
  return strokes;
};

const planCache = new Map<readonly Pt[], Map<string, Stroke[]>>();
const getStrokes = (outline: readonly Pt[], seed: string): Stroke[] => {
  let bySeed = planCache.get(outline);
  if (!bySeed) {
    bySeed = new Map();
    planCache.set(outline, bySeed);
  }
  let st = bySeed.get(seed);
  if (!st) {
    st = planStrokes(outline, seed);
    bySeed.set(seed, st);
  }
  return st;
};

/** Draws every stroke up to `line`; returns the pen tip while a stroke is in progress. */
const drawStrokes = (ctx: CanvasRenderingContext2D, strokes: Stroke[], line: number, width: number): Pt | null => {
  ctx.strokeStyle = palette.navy;
  ctx.fillStyle = palette.navy;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let tip: Pt | null = null;
  for (const st of strokes) {
    if (line <= st.t0) break;
    const raw = Math.min(1, (line - st.t0) / (st.t1 - st.t0));
    const p = raw + (smooth(raw) - raw) * 0.4;
    const m = st.wf.length;
    const L = st.cum[m - 1] as number;
    const target = p * L;
    for (let i = 1; i < m; i++) {
      const c0 = st.cum[i - 1] as number;
      if (c0 >= target) break;
      const c1 = st.cum[i] as number;
      const k = c1 > c0 ? Math.min(1, (target - c0) / (c1 - c0)) : 1;
      const x0 = st.xy[(i - 1) * 2] as number;
      const y0 = st.xy[(i - 1) * 2 + 1] as number;
      const x1 = x0 + ((st.xy[i * 2] as number) - x0) * k;
      const y1 = y0 + ((st.xy[i * 2 + 1] as number) - y0) * k;
      ctx.lineWidth = width * (((st.wf[i - 1] as number) + (st.wf[i] as number)) / 2);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      if (raw < 1) tip = [x1, y1];
    }
  }
  if (tip) {
    ctx.beginPath();
    ctx.arc(tip[0], tip[1], width * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
  return tip;
};

export const paintPenReveal = (ctx: CanvasRenderingContext2D, cw: number, ch: number, img: HTMLImageElement, o: PenOpts): void => {
  ctx.clearRect(0, 0, cw, ch);
  const fill = Math.min(1, Math.max(0, o.fill));
  if (fill >= 1) {
    ctx.drawImage(img, 0, 0);
    return;
  }
  if (fill > 0) ctx.drawImage(revealed(img, cw, ch, fill), 0, 0);
  const line = Math.min(1, o.line);
  if (line <= 0 || o.outline.length < 3) return;
  const strokes = getStrokes(o.outline, o.seed ?? 'pen');
  if (fill <= 0) {
    ctx.save();
    drawStrokes(ctx, strokes, line, o.stroke);
    ctx.restore();
    return;
  }
  // The ink stays full navy until the fill front passes it, then it is gone: no half-transparent trail.
  const ink = getScratch('ink', cw, ch);
  ink.globalCompositeOperation = 'source-over';
  ink.clearRect(0, 0, cw, ch);
  drawStrokes(ink, strokes, line, o.stroke);
  ink.globalCompositeOperation = 'destination-out';
  ink.drawImage(getScratch('mask', cw, ch).canvas, 0, 0);
  ink.globalCompositeOperation = 'source-over';
  ctx.drawImage(ink.canvas, 0, 0);
};
