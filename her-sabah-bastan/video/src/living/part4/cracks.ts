// The cracks of part 4 (API fixed by the architect; the run lane owns the look). The film itself is behind glass: on
// each run flip one crack runs across the WHOLE frame; the three stay (on the frame in the run and the inserts, as a
// "picture glass" plane at home). The flood drains into them; the camera passes through them into her cream.
// Look: a cream line with an offset navy shadow (reads on navy and on cream), slightly broken dashes, a thin yellow
// plate printed off-register beside it, hairline branches and a few chipped flakes along the main line.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { clamp01 } from './common.ts';

export interface Crack {
  /** Song frame the crack appears (it grows from `origin` to both ends in GROW frames). */
  born: number;
  /** Impact point (screen px, 1920 x 1080). */
  origin: [number, number];
  /** Main line, end to end through the origin, screen px (it may run past the frame edges). */
  pts: [number, number][];
  /** Hairline branches, each starting on the main line. */
  branches: [number, number][][];
}
export const GROW = 3;

type P = [number, number];

/** A jagged polyline through the anchors: every segment is split into ~step px pieces knocked sideways, with a sharp
 * kink now and then. The anchors themselves stay exactly where they are. */
const jag = (anchors: readonly P[], seed: string, step = 52, amp = 15): P[] => {
  const r = seeded(seed);
  const out: P[] = [anchors[0] as P];
  for (let i = 1; i < anchors.length; i++) {
    const [ax, ay] = anchors[i - 1] as P;
    const [bx, by] = anchors[i] as P;
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(2, Math.round(len / step));
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let k = 1; k < n; k++) {
      const u = (k + (r() - 0.5) * 0.5) / n;
      const o = (r() - 0.5) * 2 * amp * (r() < 0.18 ? 1.9 : 1);
      out.push([ax + (bx - ax) * u + nx * o, ay + (by - ay) * u + ny * o]);
    }
    out.push([bx, by]);
  }
  return out;
};
/** A hairline branch leaving main[idx] towards (dx, dy) with a bend. */
const branch = (main: readonly P[], idx: number, dx: number, dy: number, seed: string): P[] => {
  const [x, y] = main[idx] as P;
  const mid: P = [x + dx * 0.55 + dy * 0.12, y + dy * 0.55 - dx * 0.12];
  return jag([[x, y], mid, [x + dx, y + dy]], seed, 26, 6);
};
const make = (born: number, anchors: readonly P[], originIdx: number, seed: string, br: readonly (readonly [number, number, number])[]): Crack => {
  const pts = jag(anchors, seed);
  const origin = anchors[originIdx] as P;
  const idx = (i: number): number => Math.min(pts.length - 2, Math.max(1, Math.round((i / (anchors.length - 1)) * (pts.length - 1))));
  return { born, origin, pts, branches: br.map(([a, dx, dy], j) => branch(pts, idx(a), dx, dy, `${seed}:b${j}`)) };
};

/** The three run cracks (born on the flips 4732, 4788, 4844), in screen px of the run frame. They keep to the left strip,
 * the right strip and the lower edge, so no crack crosses his head in the wide shots or the face insert. */
export const RUN_CRACKS: readonly Crack[] = [
  make(4732, [[560, -40], [430, 210], [330, 470], [250, 760], [110, 1120]], 2, 'crack1', [[1.3, -130, 60], [2.5, 150, 30], [3.2, -120, 90], [2.0, -95, -120]]),
  make(4788, [[1700, -40], [1640, 250], [1560, 520], [1470, 800], [1330, 1120]], 2, 'crack2', [[1.4, 150, 70], [2.6, -135, 55], [3.5, 120, 100]]),
  make(4844, [[-40, 1012], [460, 968], [1000, 930], [1500, 900], [1960, 858]], 2, 'crack3', [[1.3, 60, 110], [2.4, -80, -90], [3.3, 110, -95], [3.8, -40, 110]]),
];

/** How much of a crack is drawn at frame f (0..1). */
export const crackGrowth = (c: Crack, f: number): number => clamp01((f - c.born + 1) / GROW);

export interface CrackPaintOpts {
  /** Map from crack px to the target canvas (scale about the top-left, then offset). */
  scale?: number;
  dx?: number;
  dy?: number;
  /** Line width in crack px. */
  width?: number;
}

const dist = (a: P, b: P): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const pathLen = (p: readonly P[]): number => p.slice(1).reduce((s, q, i) => s + dist(p[i] as P, q), 0);
/** The first `len` px of a polyline. */
const prefix = (p: readonly P[], len: number): P[] => {
  const out: P[] = [p[0] as P];
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const seg = dist(p[i - 1] as P, p[i] as P);
    if (acc + seg >= len) {
      const u = (len - acc) / seg;
      const [ax, ay] = p[i - 1] as P;
      const [bx, by] = p[i] as P;
      out.push([ax + (bx - ax) * u, ay + (by - ay) * u]);
      return out;
    }
    acc += seg;
    out.push(p[i] as P);
  }
  return out;
};

interface Side {
  pts: P[];
  len: number;
  /** Distance from the origin of every vertex. */
  at: number[];
}
const sideCache = new Map<number, { l: Side; r: Side }>();
const sidesOf = (c: Crack): { l: Side; r: Side } => {
  let s = sideCache.get(c.born);
  if (s) return s;
  const i0 = c.pts.findIndex((p) => p[0] === c.origin[0] && p[1] === c.origin[1]);
  const mk = (pts: P[]): Side => {
    const at: number[] = [0];
    for (let i = 1; i < pts.length; i++) at.push((at[i - 1] as number) + dist(pts[i - 1] as P, pts[i] as P));
    return { pts, len: at[at.length - 1] as number, at };
  };
  s = { r: mk(c.pts.slice(i0)), l: mk(c.pts.slice(0, i0 + 1).reverse()) };
  sideCache.set(c.born, s);
  return s;
};

/** Draws every crack born at or before f (growing over GROW frames): cream line with an offset navy shadow. */
export const paintCracks = (ctx: CanvasRenderingContext2D, f: number, cracks: readonly Crack[] = RUN_CRACKS, o: CrackPaintOpts = {}): void => {
  const s = o.scale ?? 1;
  const dx = o.dx ?? 0;
  const dy = o.dy ?? 0;
  const w = (o.width ?? 5) * s;
  const tx = (p: P, ox = 0, oy = 0): P => [p[0] * s + dx + ox * s, p[1] * s + dy + oy * s];
  const line = (pts: readonly P[], color: string, lw: number, ox: number, oy: number, dash: number[] = []): void => {
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.setLineDash(dash.map((d) => d * s));
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [X, Y] = tx(p, ox, oy);
      if (i) ctx.lineTo(X, Y);
      else ctx.moveTo(X, Y);
    });
    ctx.stroke();
  };
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  ctx.lineCap = 'butt';
  for (const c of cracks) {
    const g = crackGrowth(c, f);
    if (g <= 0) continue;
    const { l, r } = sidesOf(c);
    const parts: { pts: P[]; k: number }[] = [];
    // main line: both sides grow outwards from the impact point
    for (const sd of [l, r]) parts.push({ pts: prefix(sd.pts, g * sd.len), k: 1 });
    // hairline branches start when the main line reaches them
    c.branches.forEach((b, j) => {
      const sd = sidesOf(c);
      const start = b[0] as P;
      const side = [sd.l, sd.r].find((x) => x.pts.some((p) => p[0] === start[0] && p[1] === start[1]));
      if (!side) return;
      const d0 = side.at[side.pts.findIndex((p) => p[0] === start[0] && p[1] === start[1])] as number;
      const bg = clamp01((g * side.len - d0) / Math.max(1, side.len * 0.25));
      if (bg > 0) parts.push({ pts: prefix(b, bg * pathLen(b)), k: 0.38 + (j % 2) * 0.1 });
    });
    for (const [color, lw, ox, oy, dash] of [
      [palette.navy, w * 1.9, 4, 4, []],
      [palette.moonYellow, Math.max(1, w * 0.5), -5, -4, [70, 11, 40, 8, 120, 14]],
      [palette.cream, w, 0, 0, [130, 6, 210, 5, 80, 8, 170, 6]],
    ] as const) {
      for (const p of parts) line(p.pts, color, Math.max(1, lw * p.k * (color === palette.navy ? 1 : 1)), ox, oy, [...dash]);
    }
    // chipped flakes beside the main line
    const rr = seeded(`flakes:${c.born}`);
    for (const sd of [l, r]) {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const d = sd.len * (0.1 + 0.85 * ((i + rr() * 0.7) / n));
        const side = rr() < 0.5 ? -1 : 1;
        const size = (7 + rr() * 11) * s;
        const rot = rr() * Math.PI * 2;
        const off = (6 + rr() * 8) * side;
        if (d > g * sd.len) continue;
        let k = 1;
        while (k < sd.at.length - 1 && (sd.at[k] as number) < d) k++;
        const a = sd.pts[k - 1] as P;
        const b = sd.pts[k] as P;
        const u = (d - (sd.at[k - 1] as number)) / Math.max(1, (sd.at[k] as number) - (sd.at[k - 1] as number));
        const nx = -(b[1] - a[1]) / dist(a, b);
        const ny = (b[0] - a[0]) / dist(a, b);
        const [X, Y] = tx([a[0] + (b[0] - a[0]) * u + nx * off, a[1] + (b[1] - a[1]) * u + ny * off]);
        for (const [col, ox] of [[palette.navy, 3 * s], [palette.cream, 0]] as const) {
          ctx.fillStyle = col;
          ctx.beginPath();
          for (let q = 0; q < 3; q++) {
            const ang = rot + (q * Math.PI * 2) / 3 + (q === 1 ? 0.5 : 0);
            const rad = size * (q === 2 ? 0.45 : 1);
            const px = X + ox + Math.cos(ang) * rad;
            const py = Y + ox + Math.sin(ang) * rad;
            if (q) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
};
