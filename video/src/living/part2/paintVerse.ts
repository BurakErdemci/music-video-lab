// Frame-pure 2D painters for verse 2: her path made of handwriting, the come-apart, the version tag, the note and the moon.
// Every function is a pure function of its arguments (seeded noise only); scratch canvases are reused, never read back.
import { palette } from '../../style/palette.ts';
import { TEXT_FONT } from '../../style/fonts.ts';
import { range, seeded } from '../../style/seeded.ts';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (x: number): number => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/** Smooth 1-D value noise in -1..1 over a seeded lattice. */
const makeNoise = (seed: string): ((x: number) => number) => {
  const r = seeded(seed);
  const lat = Array.from({ length: 256 }, () => r() * 2 - 1);
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = lat[((i % 256) + 256) % 256] as number;
    const b = lat[(((i + 1) % 256) + 256) % 256] as number;
    return a + (b - a) * f * f * (3 - 2 * f);
  };
};

let scratchCanvas: HTMLCanvasElement | null = null;
const scratch = (w: number, h: number): CanvasRenderingContext2D => {
  if (!scratchCanvas) scratchCanvas = document.createElement('canvas');
  if (scratchCanvas.width !== w || scratchCanvas.height !== h) {
    scratchCanvas.width = w;
    scratchCanvas.height = h;
  }
  const c = scratchCanvas.getContext('2d') as CanvasRenderingContext2D;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.clearRect(0, 0, w, h);
  return c;
};

// ---------------------------------------------------------------------------------------------------------------
// 1. Her path: loose cursive handwriting along the baseline, with a scribbled knot in some segments.
// ---------------------------------------------------------------------------------------------------------------

export const pathGeom = (
  cw: number,
  ch: number,
  segments: number,
): { y: number; segX: (i: number) => number; segW: number; knotX: (i: number) => number } => {
  const segW = cw / segments;
  return { y: ch * 0.5, segX: (i) => i * segW, segW, knotX: (i) => i * segW + segW / 2 };
};

/** One pen-down stroke in segment-local px (x from segment start, y up from the baseline, negative = up on canvas). */
interface Stroke {
  /** x, y interleaved; y is canvas-down relative to the baseline. */
  xy: Float32Array;
  /** Pen width per sample in px. */
  wd: Float32Array;
  /** Cumulative writing time per sample (arc length times the stroke's pace weight). */
  tm: Float32Array;
}
interface SegPlan {
  strokes: Stroke[];
  total: number;
}

const BASE_W = 3.6;
const KNOT_PACE = 0.22;

const makeStroke = (pts: [number, number][], pace: number, rnd: () => number, widthK: number): Stroke => {
  const m = pts.length;
  const xy = new Float32Array(m * 2);
  const wd = new Float32Array(m);
  const tm = new Float32Array(m);
  const cum = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    const p = pts[i] as [number, number];
    xy[i * 2] = p[0];
    xy[i * 2 + 1] = p[1];
    if (i > 0) {
      const q = pts[i - 1] as [number, number];
      cum[i] = (cum[i - 1] as number) + Math.hypot(p[0] - q[0], p[1] - q[1]);
    }
  }
  const L = cum[m - 1] as number;
  const n = makeNoise(`w:${rnd()}`);
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)] as [number, number];
    const b = pts[Math.min(m - 1, i + 1)] as [number, number];
    const ds = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const down = (b[1] - a[1]) / ds;
    const press = 1 + 0.32 * down + 0.12 * n((cum[i] as number) / 9);
    const s = cum[i] as number;
    const edge = Math.min(Math.min(s, L - s) / 7, 1);
    const taper = 0.4 + 0.6 * smooth(edge);
    wd[i] = Math.max(1.6, BASE_W * widthK * press * taper);
    tm[i] = (i > 0 ? (tm[i - 1] as number) : 0) + (i > 0 ? (cum[i] as number) - (cum[i - 1] as number) : 0) * pace;
  }
  return { xy, wd, tm };
};

type LetterKind = 'e' | 'l' | 'n' | 'o' | 'h' | 't' | 'i' | 'f';
const LETTERS: readonly LetterKind[] = ['e', 'e', 'o', 'n', 'l', 'e', 'h', 'e', 't', 'o', 'n', 'l', 'e', 'f', 'i', 'e', 'l', 'n'];

/** Sample one connected letter from (x0, 0) to (x0 + w, 0); y is canvas-down (negative = above the baseline). */
const letter = (kind: LetterKind, x0: number, w: number, ch: number, rnd: () => number, out: [number, number][]): void => {
  const loopy = kind === 'e' || kind === 'l' || kind === 'o' || kind === 'f';
  const H =
    kind === 'l' || kind === 'f'
      ? ch * range(rnd, 0.2, 0.3)
      : kind === 'h'
        ? ch * range(rnd, 0.19, 0.26)
        : kind === 't'
          ? ch * range(rnd, 0.14, 0.19)
          : ch * range(rnd, 0.1, 0.15);
  const steps = Math.max(8, Math.round(w / 1.6));
  const slant = range(rnd, 0.16, 0.3);
  const a = kind === 'o' ? 0.3 : range(rnd, 0.28, 0.36);
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    let y: number;
    let x: number;
    if (loopy) {
      y = (H * (1 - Math.cos(2 * Math.PI * t))) / 2;
      x = w * (t + a * Math.sin(2 * Math.PI * t)) + slant * y * 0.5;
    } else if (kind === 'i') {
      y = H * 0.6 * Math.sin(Math.PI * t) ** 0.85;
      x = w * t + slant * y * 0.4;
    } else {
      y = H * Math.sin(Math.PI * t) ** 0.8;
      x = w * t + slant * y * 0.5;
    }
    out.push([x0 + x, -y]);
  }
};

/** A run of connected letters between x0 and x1 plus the pen-lift marks (t bars, i dots) written after it. */
const writeRun = (x0: number, x1: number, ch: number, rnd: () => number, strokes: Stroke[]): void => {
  const span = x1 - x0;
  if (span < 8) return;
  const kinds: LetterKind[] = [];
  const ws: number[] = [];
  let sum = 0;
  while (sum < span - 14) {
    const k = LETTERS[Math.floor(rnd() * LETTERS.length)] as LetterKind;
    const w = k === 'n' ? range(rnd, 24, 36) : range(rnd, 24, 40);
    kinds.push(k);
    ws.push(w);
    sum += w;
  }
  if (kinds.length === 0) {
    kinds.push('n');
    ws.push(span);
    sum = span;
  }
  const k = span / sum;
  const pts: [number, number][] = [[x0, 0]];
  const marks: [number, number][][] = [];
  let cx = x0;
  kinds.forEach((kind, i) => {
    const w = (ws[i] as number) * k;
    const before = pts.length;
    letter(kind, cx, w, ch, rnd, pts);
    if (kind === 't') {
      const mx = cx + w * 0.5;
      const my = -ch * range(rnd, 0.1, 0.14);
      marks.push([
        [mx - w * 0.55, my + range(rnd, -1.5, 1.5)],
        [mx + w * 0.7, my - range(rnd, 0, 3)],
      ]);
    } else if (kind === 'i') {
      const peak = pts[before + Math.floor((pts.length - before) / 2)] as [number, number];
      marks.push([
        [peak[0] + 1, -ch * 0.15],
        [peak[0] + 2.5, -ch * 0.15 - 2],
      ]);
    }
    cx += w;
  });
  const pace = 1;
  strokes.push(makeStroke(pts, pace, rnd, 1));
  for (const mk of marks) {
    // densify the mark so the taper has samples
    const [a, b] = mk as [[number, number], [number, number]];
    const d: [number, number][] = [];
    for (let s = 0; s <= 4; s++) d.push([a[0] + ((b[0] - a[0]) * s) / 4, a[1] + ((b[1] - a[1]) * s) / 4]);
    strokes.push(makeStroke(d, pace, rnd, 0.85));
  }
};

/** A ball of overlapping loops sitting on the baseline, entered and left by a straight lead of the line. */
const writeKnot = (cx: number, R: number, rnd: () => number, strokes: Stroke[]): void => {
  const n1 = makeNoise(`k1:${rnd()}`);
  const n2 = makeNoise(`k2:${rnd()}`);
  const n3 = makeNoise(`k3:${rnd()}`);
  const n4 = makeNoise(`k4:${rnd()}`);
  const turns = 7.5;
  const per = 30;
  const total = Math.round(turns * per);
  const pts: [number, number][] = [[cx - R * 1.25, 0]];
  for (let i = 0; i <= total; i++) {
    const th = Math.PI + (i / per) * 2 * Math.PI;
    const u = i / per;
    const rx = R * (0.4 + 0.6 * (n1(u * 2.6) * 0.5 + 0.5));
    const ry = R * (0.4 + 0.6 * (n2(u * 2.6 + 7) * 0.5 + 0.5));
    const phi = 2 * n3(u * 1.4);
    const ex = rx * Math.cos(th);
    const ey = ry * Math.sin(th);
    const jx = 0.22 * R * n4(u * 1.1);
    const jy = 0.14 * R * n4(u * 1.1 + 31);
    const x = cx + jx + ex * Math.cos(phi) - ey * Math.sin(phi);
    const y = -R * 0.95 + jy + ex * Math.sin(phi) + ey * Math.cos(phi);
    pts.push([x, Math.min(y, 2.5)]);
  }
  pts.push([cx + R * 1.25, 0]);
  strokes.push(makeStroke(pts, KNOT_PACE, rnd, 0.82));
};

const plans = new Map<string, SegPlan>();
const planSegment = (seed: string, i: number, segW: number, ch: number, knot: boolean): SegPlan => {
  const key = `${seed}|${i}|${segW}|${ch}|${knot ? 1 : 0}`;
  let p = plans.get(key);
  if (p) return p;
  const strokes: Stroke[] = [];
  const rnd = seeded(`${seed}:seg${i}`);
  if (knot) {
    const R = ch * 0.23;
    const kr = R * 1.25;
    const mid = segW / 2;
    writeRun(0, mid - kr, ch, rnd, strokes);
    // the knot is the same every time: its own stream, independent of the letters around it
    writeKnot(mid, R, seeded(`${seed}:knot${i}`), strokes);
    writeRun(mid + kr, segW, ch, rnd, strokes);
  } else {
    writeRun(0, segW, ch, rnd, strokes);
  }
  let total = 0;
  for (const s of strokes) total += s.tm[s.tm.length - 1] as number;
  p = { strokes, total };
  plans.set(key, p);
  return p;
};

/** Draws one segment up to fraction `f` of its writing time; returns the pen tip while unfinished. */
const drawSegment = (
  ctx: CanvasRenderingContext2D,
  plan: SegPlan,
  x0: number,
  base: number,
  drift: (x: number) => number,
  f: number,
): [number, number] | null => {
  let budget = f * plan.total;
  let tip: [number, number] | null = null;
  for (const st of plan.strokes) {
    const m = st.wd.length;
    const dur = st.tm[m - 1] as number;
    if (budget <= 0) break;
    const upto = Math.min(budget, dur);
    for (let i = 1; i < m; i++) {
      const t0 = st.tm[i - 1] as number;
      if (t0 >= upto) break;
      const t1 = st.tm[i] as number;
      const k = t1 > t0 ? Math.min(1, (upto - t0) / (t1 - t0)) : 1;
      const ax = x0 + (st.xy[(i - 1) * 2] as number);
      const ay = base + (st.xy[(i - 1) * 2 + 1] as number) + drift(ax);
      const bxx = x0 + (st.xy[i * 2] as number);
      const byy = base + (st.xy[i * 2 + 1] as number) + drift(bxx);
      const bx = ax + (bxx - ax) * k;
      const by = ay + (byy - ay) * k;
      ctx.lineWidth = ((st.wd[i - 1] as number) + (st.wd[i] as number)) / 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      if (upto < dur || f < 1) tip = [bx, by];
    }
    budget -= dur;
  }
  return f < 1 ? tip : null;
};

export const paintPath = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  written: number,
  o: { seed: string; segments: number; knots: readonly number[] },
): void => {
  if (!(written > 0)) return;
  const g = pathGeom(cw, ch, o.segments);
  const drift = makeNoise(`${o.seed}:drift`);
  const dr = (x: number): number => ch * 0.02 * drift(x / 240) + ch * 0.008 * drift(x / 61 + 9);
  const whole = Math.min(o.segments, Math.floor(written));
  const frac = whole < o.segments ? written - whole : 0;
  ctx.save();
  ctx.strokeStyle = palette.navy;
  ctx.fillStyle = palette.navy;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < whole; i++) drawSegment(ctx, planSegment(o.seed, i, g.segW, ch, o.knots.includes(i)), g.segX(i), g.y, dr, 1);
  if (frac > 0) {
    const i = whole;
    const tip = drawSegment(ctx, planSegment(o.seed, i, g.segW, ch, o.knots.includes(i)), g.segX(i), g.y, dr, frac);
    if (tip) {
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], 6.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.moonYellow;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = palette.navy;
      ctx.stroke();
    }
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// 2. The come-apart: horizontal slices slide away, yellow pixels burst off the cuts.
// ---------------------------------------------------------------------------------------------------------------

export const COME_APART_MARGIN = 160;

interface Band {
  y0: number;
  y1: number;
  sign: number;
  shift: number;
  delay: number;
  rot: number;
  fadeStart: number;
  spread: number;
}
interface Pix {
  band: number;
  fx: number;
  edge: 0 | 1;
  size: number;
  ts: number;
  life: number;
  vx: number;
  vy: number;
}
interface ApartPlan {
  bands: Band[];
  pix: Pix[];
}

const apartPlans = new Map<string, ApartPlan>();
const planApart = (seed: string, h: number): ApartPlan => {
  const key = `${seed}|${h}`;
  let p = apartPlans.get(key);
  if (p) return p;
  const r = seeded(`${seed}:apart`);
  const n = 8 + Math.floor(r() * 5);
  const wts = Array.from({ length: n }, () => range(r, 0.55, 1.7));
  const sumW = wts.reduce((a, b) => a + b, 0);
  const bands: Band[] = [];
  let y = 0;
  for (let k = 0; k < n; k++) {
    const y1 = k === n - 1 ? h : Math.round(y + ((wts[k] as number) / sumW) * h);
    bands.push({
      y0: y,
      y1,
      sign: k % 2 === 0 ? 1 : -1,
      shift: range(r, 38, 120),
      delay: range(r, 0, 0.2),
      rot: r() < 0.4 ? range(r, -0.07, 0.07) : 0,
      fadeStart: range(r, 0.42, 0.7),
      spread: range(r, 5, 9),
    });
    y = y1;
  }
  const pix: Pix[] = [];
  for (let i = 0; i < 95; i++) {
    const ts = range(r, 0.02, 0.7);
    pix.push({
      band: Math.floor(r() * n),
      fx: range(r, -0.1, 1.1),
      edge: r() < 0.5 ? 0 : 1,
      size: 4 + Math.floor(r() * 9),
      ts,
      life: Math.min(range(r, 0.3, 0.55), 1 - ts),
      vx: range(r, -60, 60),
      vy: -range(r, 90, 250),
    });
  }
  p = { bands, pix };
  apartPlans.set(key, p);
  return p;
};

/** Slice state at progress p: motion q (0..1), offsets, fade f. */
const bandPose = (b: Band, k: number, n: number, p: number): { q: number; dx: number; dy: number; f: number } => {
  const q = smooth((p - b.delay) / (1 - b.delay));
  const f = smooth((p - b.fadeStart) / (1 - b.fadeStart));
  return { q, dx: b.sign * b.shift * q ** 1.4, dy: (k - (n - 1) / 2) * b.spread * q, f };
};

export const paintComeApart = (ctx: CanvasRenderingContext2D, cw: number, ch: number, img: HTMLImageElement, p: number, seed: string): void => {
  const M = COME_APART_MARGIN;
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  if (p >= 1) return;
  if (p <= 0) {
    ctx.drawImage(img, M, M);
    return;
  }
  const { bands, pix } = planApart(seed, H);
  const n = bands.length;
  bands.forEach((b, k) => {
    const pose = bandPose(b, k, n, p);
    const alpha = 1 - pose.f;
    if (alpha <= 0.003) return;
    const bh = b.y1 - b.y0;
    const sc = ctx;
    const t = scratch(W, bh);
    t.drawImage(img, 0, b.y0, W, bh, 0, 0, W, bh);
    // cut edges: navy on the figure only
    const edge = clamp01(pose.q * 6);
    if (edge > 0) {
      t.globalCompositeOperation = 'source-atop';
      t.globalAlpha = edge;
      t.fillStyle = palette.navy;
      t.fillRect(0, 0, W, 3);
      t.fillRect(0, bh - 3, W, 3);
      t.globalAlpha = 1;
      t.globalCompositeOperation = 'source-over';
    }
    sc.save();
    sc.globalAlpha = alpha;
    sc.translate(M + W / 2 + pose.dx, M + b.y0 + bh / 2 + pose.dy);
    sc.rotate(b.rot * pose.q);
    const s = 1 - 0.35 * pose.f;
    sc.scale(s, 1 - 0.3 * pose.f);
    sc.drawImage(t.canvas, -W / 2, -bh / 2);
    sc.restore();
  });
  ctx.save();
  ctx.fillStyle = palette.moonYellow;
  for (const px of pix) {
    if (p <= px.ts) continue;
    const u = clamp01((p - px.ts) / px.life);
    if (u >= 1) continue;
    const b = bands[px.band] as Band;
    const at = bandPose(b, px.band, n, px.ts);
    const ox = M + px.fx * W + at.dx;
    const oy = M + (px.edge === 0 ? b.y0 : b.y1) + at.dy;
    const e = 1 - (1 - u) * (1 - u);
    const a = clamp01(u / 0.08) * (1 - u) ** 0.8;
    const s = px.size * (1 - 0.3 * u);
    ctx.globalAlpha = a;
    ctx.fillRect(ox + px.vx * e - s / 2, oy + px.vy * e - s / 2, s, s);
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// 3. Version tag.
// ---------------------------------------------------------------------------------------------------------------

export const paintVersionTag = (ctx: CanvasRenderingContext2D, cw: number, ch: number, label: string, p: number): void => {
  if (p < 0) return;
  const r = seeded(`tag:${label}`);
  const u = clamp01(p / 0.25);
  const e = smooth(u);
  const scale = 1.3 - 0.3 * e;
  const alpha = clamp01(p / 0.07);
  const w = 196;
  const h = 88;
  const x0 = -w / 2;
  const y0 = -h / 2;
  const tag = (): void => {
    ctx.beginPath();
    ctx.moveTo(x0 + 16, y0);
    ctx.lineTo(x0 + w, y0 + range(r, -1, 1));
    // torn right edge
    const tears = 9;
    for (let i = 1; i <= tears; i++) {
      const yy = y0 + (h * i) / tears;
      ctx.lineTo(x0 + w - range(r, 0, 9) * (i % 2 === 0 ? 1 : 0.35), yy - range(r, 0, h / tears) * 0.6);
    }
    ctx.lineTo(x0 + 16, y0 + h);
    ctx.lineTo(x0, y0 + h - 16);
    ctx.lineTo(x0, y0 + 16);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(-0.07);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  // misregistered yellow plate
  ctx.save();
  ctx.translate(5, 4);
  tag();
  ctx.fillStyle = palette.moonYellow;
  ctx.fill();
  ctx.restore();
  tag();
  ctx.fillStyle = palette.cream;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = palette.navy;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // punch hole
  ctx.beginPath();
  ctx.arc(x0 + 20, 0, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = palette.navy;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x0 + 20, 0, 3, 0, Math.PI * 2);
  ctx.fillStyle = palette.cream;
  ctx.fill();
  ctx.fillStyle = palette.navy;
  ctx.font = `600 54px "${TEXT_FONT}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x0 + w / 2 + 10, 3);
  // ink splat around the stamp: grows with the stamp, then holds
  const sp = smooth((p - 0.06) / 0.2);
  if (sp > 0) {
    for (let i = 0; i < 7; i++) {
      const a = range(r, -0.5, 1.2) + (i % 2) * Math.PI * 0.9;
      const d = range(r, w * 0.5 + 6, w * 0.5 + 24) * (i % 2 ? 0.9 : 1);
      const rad = range(r, 1.2, 3.6) * sp;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d * 0.85 + 6, Math.sin(a) * (h * 0.5 + 14) * (i % 2 ? 1 : 0.8), rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// 4. The note: a full-frame sticky note, ruled lines that later become her path.
// ---------------------------------------------------------------------------------------------------------------

export const paintNoteFill = (ctx: CanvasRenderingContext2D, cw: number, ch: number, text: string, ruled: boolean): void => {
  const k = cw / 1920;
  const r = seeded(`note:${text}`);
  ctx.save();
  ctx.fillStyle = palette.moonYellow;
  ctx.fillRect(0, 0, cw, ch);
  // paper fibres
  for (let i = 0; i < Math.round((cw * ch) / 650); i++) {
    const x = r() * cw;
    const y = r() * ch;
    const a = r() * Math.PI;
    const l = range(r, 5, 20) * k;
    ctx.globalAlpha = range(r, 0.1, 0.24);
    ctx.strokeStyle = r() < 0.5 ? '#C99F26' : '#FBE98F';
    ctx.lineWidth = Math.max(1, k);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  // halftone dots, bigger toward the edges
  const step = 13 * k;
  ctx.fillStyle = '#B98A14';
  for (let gy = 0, row = 0; gy < ch + step; gy += step * 0.866, row++) {
    for (let gx = (row % 2) * step * 0.5; gx < cw + step; gx += step) {
      const dx = (gx / cw - 0.5) * 2;
      const dy = (gy / ch - 0.5) * 2;
      const e = clamp01((Math.max(Math.abs(dx), Math.abs(dy)) - 0.62) / 0.38);
      const rad = (0.5 + 2.1 * e * e) * k * (0.7 + 0.5 * r());
      if (rad < 0.7 * k) continue;
      ctx.globalAlpha = 0.16 + 0.2 * e;
      ctx.beginPath();
      ctx.arc(gx, gy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // darker edge vignette
  ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.4, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.56);
  vg.addColorStop(0, 'rgba(176,134,16,0)');
  vg.addColorStop(1, 'rgba(176,134,16,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, cw, ch);

  const lineAt = (i: number): number => ch * (0.2 + i * 0.0925);
  if (ruled) {
    const n = makeNoise(`${text}:rule`);
    ctx.strokeStyle = palette.navy;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      const slope = range(r, -0.004, 0.004);
      const y = lineAt(i);
      ctx.globalAlpha = 0.86;
      ctx.lineWidth = 2.5 * k;
      ctx.beginPath();
      for (let x = -8; x < cw + 8; x += 16 * k) {
        const yy = y + slope * x + 1.9 * k * n(x / (150 * k) + i * 13) + 0.6 * k * n(x / (23 * k) + i * 5);
        if (x < 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }
  // handwriting-like text on the upper lines
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.navy;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let size = ch * 0.2;
  ctx.font = `italic 500 ${size}px "${TEXT_FONT}"`;
  const tw = ctx.measureText(text).width;
  if (tw > cw * 0.72) {
    size *= (cw * 0.72) / tw;
    ctx.font = `italic 500 ${size}px "${TEXT_FONT}"`;
  }
  ctx.save();
  ctx.translate(cw * 0.1, lineAt(2) - 5 * k);
  ctx.rotate(-0.028);
  ctx.fillText(text, 0, 0);
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, 1.4 * k, 0.7 * k);
  ctx.restore();
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// 5. The crescent moon with a misregistered navy key ring.
// ---------------------------------------------------------------------------------------------------------------

export const paintCrescent = (ctx: CanvasRenderingContext2D, cw: number, ch: number, p: number): void => {
  if (p <= 0) return;
  const s = Math.min(cw, ch) / 420;
  const R = 150;
  const r = 128;
  const D = { x: 62, y: -30 };
  const Dd = Math.hypot(D.x, D.y);
  const al = Math.atan2(D.y, D.x);
  const be = Math.acos((R * R + Dd * Dd - r * r) / (2 * R * Dd));
  const p1 = { x: R * Math.cos(al + be), y: R * Math.sin(al + be) };
  const p2 = { x: R * Math.cos(al - be), y: R * Math.sin(al - be) };
  const g1 = Math.atan2(p1.y - D.y, p1.x - D.x);
  const g2 = Math.atan2(p2.y - D.y, p2.x - D.x);
  const mid = al + Math.PI;
  const mod = (a: number): number => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const innerCw = mod(mid - g2) < mod(g1 - g2);
  const shape = (): void => {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.arc(0, 0, R, al + be, al - be + 2 * Math.PI, false);
    ctx.arc(D.x, D.y, r, g2, g1, !innerCw);
    ctx.closePath();
  };
  const e = smooth(p / 0.7);
  ctx.save();
  ctx.translate(cw / 2 - 8 * s, ch / 2 + (1 - smooth(p)) * 30 * s + 6 * s);
  ctx.scale(s, s);
  ctx.globalAlpha = e;
  // yellow plate, shifted against the key plate
  ctx.save();
  ctx.translate(7, -6);
  shape();
  ctx.fillStyle = palette.moonYellow;
  ctx.fill();
  ctx.clip();
  const rn = seeded('crescent:speckle');
  for (let i = 0; i < 260; i++) {
    const a = rn() * Math.PI * 2;
    const d = Math.sqrt(rn()) * R;
    ctx.globalAlpha = e * range(rn, 0.25, 0.6);
    ctx.fillStyle = rn() < 0.5 ? '#FBE98F' : '#C99F26';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, range(rn, 0.8, 2.4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = e;
  shape();
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.navy;
  ctx.stroke();
  ctx.restore();
};
