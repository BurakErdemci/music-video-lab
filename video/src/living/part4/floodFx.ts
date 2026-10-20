// The navy tsunami and the drain, painted in code (song frames 4900-5150). World coordinates: a wave is built in
// units of its radius R around its foot (Xf, Y0); every painter takes the camera and sets its own transform.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { paintNote } from './figures.ts';
import { clamp01, H, lerp, W } from './common.ts';
import { RUN_CRACKS } from './cracks.ts';

const NAVY = palette.navy;
const CREAM = palette.cream;
const YEL = palette.moonYellow;
const DARK = '#0b1121';
const TAU = Math.PI * 2;

export interface Cam {
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Noise.

const ih = (i: number, s: number): number => {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(s | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const n1 = (x: number, s: number): number => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return ih(i, s) * (1 - u) + ih(i + 1, s) * u;
};
const n2 = (x: number, y: number, s: number): number => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = ih(ix + iy * 977, s);
  const b = ih(ix + 1 + iy * 977, s);
  const c = ih(ix + (iy + 1) * 977, s);
  const d = ih(ix + 1 + (iy + 1) * 977, s);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
};
const sstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

type P2 = [number, number];
const crom = (P: P2[], n: number): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)] as P2;
    const p1 = P[i] as P2;
    const p2 = P[i + 1] as P2;
    const p3 = P[Math.min(i + 2, P.length - 1)] as P2;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, c2: number, d: number) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1] as P2);
  return out;
};

// ---------------------------------------------------------------------------------------------------------------
// The wave outline.

const BACK: P2[] = [[-9.5, 1.95], [-7, 1.95], [-5, 1.9], [-3.2, 1.8], [-2.2, 1.7]];
const CREST: P2[] = [
  [-1.6, 1.62], [-1.0, 1.65], [-0.45, 1.67], [0.05, 1.65], [0.45, 1.56], [0.8, 1.34], [0.96, 1.04], [0.94, 0.76],
  [0.8, 0.8], [0.66, 0.97], [0.4, 1.06], [0.15, 0.95], [0.04, 0.7], [0.06, 0.44], [0.24, 0.24], [0.58, 0.1],
  [1.1, 0.03], [1.45, -0.12], [1.6, -0.4],
];
const NSEG = 14;
const I_CREST = BACK.length * NSEG;
const I_APEX = (BACK.length + 3) * NSEG;
const I_TIP = (BACK.length + 7) * NSEG;
const I_HOLLOW0 = (BACK.length + 8) * NSEG;
const I_HOLLOW1 = (BACK.length + 14) * NSEG;

export interface Wave {
  R: number;
  Xf: number;
  Y0: number;
  P: P2[];
  N: P2[];
  full: P2[];
  path: Path2D;
}
let memo: { key: string; w: Wave } | null = null;
export const waveGeo = (R: number, Xf: number, Y0: number, t: number): Wave => {
  const key = `${R}|${Xf}|${Y0}|${t}`;
  if (memo && memo.key === key) return memo.w;
  const ctl = crom([...BACK, ...CREST], NSEG);
  const n = ctl.length;
  const P: P2[] = [];
  const N: P2[] = [];
  let arc = 0;
  for (let i = 0; i < n; i++) {
    const a = ctl[Math.max(i - 1, 0)] as P2;
    const b = ctl[Math.min(i + 1, n - 1)] as P2;
    let tx = b[0] - a[0];
    let ty = -(b[1] - a[1]);
    const L = Math.hypot(tx, ty) || 1;
    tx /= L;
    ty /= L;
    const c = ctl[i] as P2;
    if (i) arc += Math.hypot(c[0] - (ctl[i - 1] as P2)[0], c[1] - (ctl[i - 1] as P2)[1]) * R;
    // world (y down): outward normal for a left-to-right top edge points up
    const nx = ty;
    const ny = -tx;
    const back = sstep(-1.1, -3, c[0]);
    const lump = R * (0.016 * (n1(arc / (0.17 * R) + t * 0.35, 1) - 0.5) * 2 + 0.006 * (n1(arc / (0.05 * R) + t * 0.9, 2) - 0.5) * 2 + 0.032 * back * Math.sin(c[0] * 2.3 - t * 1.4));
    const X = Xf + c[0] * R + nx * lump;
    const Y = Y0 - c[1] * R + ny * lump;
    P.push([X, Y]);
    N.push([nx, ny]);
  }
  const full: P2[] = [...P, [Xf + 1.75 * R, Y0 + 0.9 * R], [Xf - 9.8 * R, Y0 + 0.9 * R]];
  const path = new Path2D();
  full.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  path.closePath();
  const w = { R, Xf, Y0, P, N, full, path };
  memo = { key, w };
  return w;
};

/** Point and outward normal along the crest + lip (dense indices I_CREST..I_TIP) at fraction s. */
const crestAt = (w: Wave, s: number): { p: P2; n: P2 } => {
  const f = I_CREST + clamp01(s) * (I_TIP - I_CREST);
  const i = Math.min(Math.floor(f), I_TIP - 1);
  const k = f - i;
  const a = w.P[i] as P2;
  const b = w.P[i + 1] as P2;
  const na = w.N[i] as P2;
  const nb = w.N[i + 1] as P2;
  return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], n: [lerp(na[0], nb[0], k), lerp(na[1], nb[1], k)] };
};

const setCam = (ctx: CanvasRenderingContext2D, cam: Cam, pan = 1, zoomMul = 1): void => {
  const k = cam.z * zoomMul;
  ctx.setTransform(k, 0, 0, k, W / 2 - cam.x * pan * k, H / 2 - cam.y * pan * k);
};
const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void => {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, TAU);
};

// ---------------------------------------------------------------------------------------------------------------
// Her cream world.

/** The cream world: paper, a faint horizon, ground ticks, the moon on the right. */
export const paintCreamWorld = (ctx: CanvasRenderingContext2D, cam: Cam, Y0: number): void => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  const yh = Y0 - 235;
  // moon (far plane: barely moves)
  const mx = 1710 - (cam.x - 960) * 0.06;
  const my = 180 - (cam.y - 540) * 0.06;
  const mr = 70 * (1 + (cam.z - 1) * 0.3);
  ctx.fillStyle = YEL;
  ctx.beginPath();
  circle(ctx, mx, my, mr);
  ctx.fill();
  ctx.fillStyle = 'rgba(24,32,58,0.14)';
  ctx.beginPath();
  circle(ctx, mx + mr * 0.28, my + mr * 0.12, mr * 0.2);
  circle(ctx, mx - mr * 0.34, my - mr * 0.22, mr * 0.13);
  circle(ctx, mx + mr * 0.05, my + mr * 0.5, mr * 0.1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(24,32,58,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mx, my, mr + 1, 0, TAU);
  ctx.stroke();
  // horizon + ground ticks (world plane)
  setCam(ctx, cam, 0.5, 1);
  ctx.strokeStyle = 'rgba(24,32,58,0.32)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cam.x * 0.5 - 4000, yh);
  ctx.lineTo(cam.x * 0.5 + 4000, yh);
  ctx.stroke();
  const r = seeded('flood-ground');
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 140; i++) {
    const x = cam.x * 0.5 - 1700 + r() * 3400;
    const y = yh + 12 + Math.pow(r(), 1.6) * 520;
    const l = 14 + r() * 50 * (0.5 + (y - yh) / 400);
    ctx.moveTo(x, y);
    ctx.lineTo(x + l, y + (r() - 0.5) * 2);
  }
  ctx.strokeStyle = 'rgba(24,32,58,0.2)';
  ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

// ---------------------------------------------------------------------------------------------------------------
// Halftone pattern (cached) and the far swell.

let dotTile: HTMLCanvasElement | null = null;
const dotPattern = (ctx: CanvasRenderingContext2D, alpha: number): CanvasPattern => {
  if (!dotTile) {
    dotTile = document.createElement('canvas');
    dotTile.width = 14;
    dotTile.height = 14;
    const c = dotTile.getContext('2d') as CanvasRenderingContext2D;
    c.fillStyle = CREAM;
    c.beginPath();
    c.arc(3.5, 3.5, 1.9, 0, TAU);
    c.arc(10.5, 10.5, 1.9, 0, TAU);
    c.fill();
  }
  const p = ctx.createPattern(dotTile, 'repeat') as CanvasPattern;
  void alpha;
  return p;
};

/** Distant swells behind the main wave: navy with a cream halftone, foam on the tops. */
export const paintFarSwell = (ctx: CanvasRenderingContext2D, cam: Cam, w: Wave, t: number): void => {
  const R = w.R;
  for (const [pan, dx, Hh, wd, seed] of [[0.72, -3.6, 2.75, 1.5, 11], [0.86, -1.7, 2.35, 1.0, 12]] as const) {
    setCam(ctx, cam, pan, 1);
    const xc = w.Xf * pan + dx * R;
    const pts: P2[] = [];
    for (let u = -5.5; u <= 4.2; u += 0.07) {
      const left = u < 0;
      const v = Hh * Math.exp(-Math.pow(Math.abs(u) / (left ? 2.1 * wd : 1.2 * wd), left ? 2 : 1.7)) + 0.02 * Math.sin(u * 3 + t * 1.1 + seed) * (left ? 1 : 0.5) + 0.07 * (n1(u * 3.1 + seed + t * 0.25, seed) - 0.5) * 2 * Math.min(1, Hh * Math.exp(-Math.abs(u)));
      pts.push([xc + u * R, w.Y0 - Math.max(v, 0) * R]);
    }
    const path = new Path2D();
    path.moveTo((pts[0] as P2)[0], w.Y0);
    for (const [x, y] of pts) path.lineTo(x, y);
    path.lineTo((pts[pts.length - 1] as P2)[0], w.Y0);
    path.closePath();
    ctx.fillStyle = NAVY;
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = dotPattern(ctx, 0.5);
    ctx.fillRect(xc - 6 * R, w.Y0 - 2.2 * R, 12 * R, 3.4 * R);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(243,239,228,0.5)';
    ctx.lineWidth = R * 0.008;
    ctx.setLineDash([R * 0.25, R * 0.07, R * 0.08, R * 0.1]);
    ctx.lineDashOffset = -t * R * 0.3;
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const yy = y + R * 0.13 * k + R * 0.03 * Math.sin(i * 0.3 + k + t);
        if (i) ctx.lineTo(x, yy);
        else ctx.moveTo(x, yy);
      });
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
    // foam on the top
    const r = seeded(`far-foam-${seed}`);
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    for (let i = 0; i < 170; i++) {
      const u = -3 * wd + r() * 4.2 * wd;
      const j = Math.max(0, Math.min(pts.length - 1, Math.round((u + 5.5) / 0.07)));
      const [x, y] = pts[j] as P2;
      const rr = R * (0.008 + 0.026 * r() * r()) * (1 + 0.1 * Math.sin(t * 2 + i));
      circle(ctx, x + (r() - 0.5) * R * 0.05, y + R * (0.01 + 0.07 * r() * r()), rr);
    }
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

// ---------------------------------------------------------------------------------------------------------------
// The main body.

export const paintBody = (ctx: CanvasRenderingContext2D, cam: Cam, w: Wave, t: number): void => {
  const R = w.R;
  setCam(ctx, cam);
  ctx.fillStyle = NAVY;
  ctx.fill(w.path);
  ctx.save();
  ctx.clip(w.path);
  // darker pooled bands following the back surface
  ctx.lineJoin = 'round';
  const back = w.P.slice(0, I_APEX + 1);
  for (let k = 1; k <= 6; k++) {
    const off = (0.16 * k + 0.05 * Math.sin(k * 1.7)) * R;
    ctx.strokeStyle = k % 2 ? DARK : 'rgba(11,17,33,0.55)';
    ctx.lineWidth = R * (0.045 + 0.02 * ((k * 7) % 3));
    ctx.beginPath();
    back.forEach(([x, y], i) => {
      const yy = y + off + R * 0.035 * Math.sin(x / R * 1.9 + k * 1.3 - t * 0.8);
      if (i) ctx.lineTo(x, yy);
      else ctx.moveTo(x, yy);
    });
    ctx.stroke();
    // cream flow streak between the bands, dashes sliding with the flow
    ctx.strokeStyle = 'rgba(243,239,228,0.55)';
    ctx.lineWidth = R * 0.008;
    ctx.setLineDash([R * (0.1 + 0.05 * (k % 3)), R * (0.08 + 0.06 * (k % 2)), R * 0.03, R * 0.12]);
    ctx.lineDashOffset = -t * R * (0.5 + 0.1 * k) * 0.35;
    ctx.beginPath();
    back.forEach(([x, y], i) => {
      const yy = y + off + R * 0.08 + R * 0.04 * Math.sin(x / R * 2.3 + k * 2.1 - t * 0.7);
      if (i) ctx.lineTo(x, yy);
      else ctx.moveTo(x, yy);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // contour streaks parallel to the crest, face and lip (inside the navy)
  const edge = w.P.slice(I_CREST, w.P.length);
  const nrm = w.N.slice(I_CREST, w.N.length);
  for (let k = 1; k <= 4; k++) {
    ctx.strokeStyle = k % 2 ? 'rgba(243,239,228,0.6)' : 'rgba(11,17,33,0.9)';
    ctx.lineWidth = R * (k % 2 ? 0.007 : 0.02);
    ctx.setLineDash(k % 2 ? [R * 0.2, R * 0.05, R * 0.06, R * 0.07] : []);
    ctx.lineDashOffset = -t * R * 0.4;
    ctx.beginPath();
    edge.forEach(([x, y], i) => {
      const d = R * (0.06 * k + 0.012 * Math.sin(i * 0.2 + k + t));
      const nn = nrm[i] as P2;
      if (i) ctx.lineTo(x - nn[0] * d, y - nn[1] * d);
      else ctx.moveTo(x - nn[0] * d, y - nn[1] * d);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // halftone lightening toward the crest
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = dotPattern(ctx, 0.35);
  ctx.beginPath();
  for (let i = I_CREST; i <= I_TIP; i += 2) {
    const [x, y] = w.P[i] as P2;
    const nn = w.N[i] as P2;
    ctx.moveTo(x, y);
    ctx.lineTo(x - nn[0] * R * 0.2, y - nn[1] * R * 0.2);
    ctx.lineTo(x - nn[0] * R * 0.2 + 12, y - nn[1] * R * 0.2);
    ctx.lineTo(x + 12, y);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  // the hollow under the lip: arcs and halftone drifting in from the navy edge
  const cx = w.Xf + 0.42 * R;
  const cy = w.Y0 - 0.62 * R;
  ctx.lineCap = 'round';
  for (let k = 1; k <= 3; k++) {
    const sc = 1 - 0.19 * k;
    ctx.strokeStyle = `rgba(24,32,58,${0.62 - 0.12 * k})`;
    ctx.lineWidth = R * 0.007;
    ctx.beginPath();
    for (let i = I_HOLLOW0 + 4; i <= I_HOLLOW1 + 10; i += 3) {
      const [x, y] = w.P[i] as P2;
      const px = cx + (x - cx) * sc;
      const py = cy + (y - cy) * sc;
      if (i === I_HOLLOW0 + 4) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(24,32,58,0.8)';
  ctx.beginPath();
  for (let i = I_TIP; i <= I_HOLLOW1 + 40; i += 2) {
    const [x, y] = w.P[i] as P2;
    const nn = w.N[i] as P2;
    for (let d = 1; d <= 6; d++) {
      const off = R * d * 0.028;
      const rr = R * 0.011 * (1 - d / 7);
      circle(ctx, x + nn[0] * off + ((i / 2 + d) % 2) * R * 0.012, y + nn[1] * off, rr);
    }
  }
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

/** Cream foam on the crest/lip and on the front foot, with ink bites; navy spatter ahead of the front. */
export const paintFoam = (ctx: CanvasRenderingContext2D, cam: Cam, w: Wave, t: number, front: boolean): void => {
  const R = w.R;
  setCam(ctx, cam, 1, front ? 1.0 : 1);
  const r = seeded(front ? 'foam-front' : 'foam-crest');
  const nBlob = front ? 170 : 460;
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  for (let i = 0; i < nBlob; i++) {
    const front2 = front;
    const f0 = front2 ? 0.8 + r() * 0.2 : 0;
    const idxf = front2 ? I_HOLLOW1 + (w.P.length - 1 - I_HOLLOW1) * (0.35 + 0.65 * r()) : I_CREST + Math.pow(r(), 0.8) * (I_TIP - I_CREST);
    void f0;
    const k = Math.min(Math.floor(idxf), w.P.length - 1);
    const [x, y] = w.P[k] as P2;
    const nn = w.N[k] as P2;
    const o = R * (-0.01 + 0.13 * Math.pow(r(), 2.2)) * (front2 ? 1.2 : 1);
    const rr = R * (0.005 + 0.026 * Math.pow(r(), 2.4)) * (1 + 0.14 * Math.sin(t * 1.6 + i * 1.7));
    const px = x - nn[0] * o + (r() - 0.5) * R * 0.02;
    const py = y - nn[1] * o + (r() - 0.5) * R * 0.02;
    circle(ctx, px, py, rr);
    // satellites make a clump, not a ring
    for (let q = 0; q < 3; q++) circle(ctx, px + (r() - 0.5) * rr * 3, py + (r() - 0.5) * rr * 3, rr * (0.25 + 0.4 * r()));
  }
  ctx.fill();
  // flecks of foam drifting along the flow inside the navy, fading in and out
  ctx.fillStyle = CREAM;
  for (let i = 0; i < (front ? 0 : 130); i++) {
    const base = r();
    const spd = 0.05 + 0.06 * r();
    const fr = (base + t * spd) % 1;
    const a = Math.sin(Math.PI * fr);
    const k = Math.floor(I_CREST - 120 + fr * (I_TIP - I_CREST + 120));
    const [x, y] = w.P[Math.max(0, k)] as P2;
    const nn = w.N[Math.max(0, k)] as P2;
    const o = R * (0.1 + 0.55 * r());
    const rr = R * (0.004 + 0.012 * r() * r());
    ctx.globalAlpha = a * 0.9;
    ctx.beginPath();
    for (let q = 0; q < 4; q++) circle(ctx, x - nn[0] * o + (r() - 0.5) * R * 0.05, y - nn[1] * o + (r() - 0.5) * R * 0.03, rr * (0.4 + r()));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!front) {
    // streaks of foam sliding down the back surface (cream flecks)
    ctx.fillStyle = 'rgba(243,239,228,0.85)';
    ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const k = Math.floor(I_CREST - 10 + r() * (I_APEX - I_CREST + 30));
      const [x, y] = w.P[Math.max(0, k)] as P2;
      const nn = w.N[Math.max(0, k)] as P2;
      const o = R * (0.04 + 0.28 * r() * r());
      circle(ctx, x - nn[0] * o, y - nn[1] * o, R * (0.003 + 0.011 * r() * r()));
    }
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

/** Ink spatter flung ahead of the front (navy drops on the cream), riding with the wave. */
export const paintSpatter = (ctx: CanvasRenderingContext2D, cam: Cam, w: Wave, t: number): void => {
  const R = w.R;
  setCam(ctx, cam);
  const r = seeded('spatter');
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  for (let i = 0; i < 190; i++) {
    const d = Math.pow(r(), 0.8);
    const k = I_TIP - 14 + Math.floor(r() * (w.P.length - I_TIP + 14));
    const [x, y] = w.P[Math.min(k, w.P.length - 1)] as P2;
    const nn = w.N[Math.min(k, w.P.length - 1)] as P2;
    const o = R * (0.04 + 0.75 * d);
    const rr = R * (0.004 + 0.02 * (1 - d) * r()) * (1 + 0.08 * Math.sin(t * 2 + i));
    circle(ctx, x + nn[0] * o + (r() - 0.5) * R * 0.1 + d * R * 0.2, y + nn[1] * o + (r() - 0.5) * R * 0.1, rr);
  }
  ctx.fill();
  // fine ripple lines running ahead on the cream floor
  ctx.strokeStyle = 'rgba(24,32,58,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = w.Y0 + R * (0.05 + 0.1 * i) + 6 * Math.sin(i);
    const x0 = w.Xf + R * (1.55 + 0.1 * i - 0.04 * i * i * 0.1);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + R * (0.25 + 0.08 * ((i * 5) % 4)), y + 1);
    ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

// ---------------------------------------------------------------------------------------------------------------
// Notes riding the crest.

interface NoteSpec {
  s0: number;
  amp: number;
  w: number;
  ph: number;
  off: number;
  size: number;
  rot0: number;
  rotV: number;
  plane: number;
  seed: string;
  kind: number;
  bob: number;
}
const NOTE_SPECS: NoteSpec[] = (() => {
  const r = seeded('flood-notes');
  const out: NoteSpec[] = [];
  for (let i = 0; i < 46; i++) {
    out.push({
      s0: 0.04 + 0.92 * r(),
      amp: 0.03 + 0.07 * r(),
      w: 0.7 + 1.1 * r(),
      ph: r() * TAU,
      off: -0.55 + 1.15 * Math.pow(r(), 1.3),
      size: 0.06 + 0.07 * r() + (i % 9 === 0 ? 0.05 : 0),
      rot0: (r() - 0.5) * 180,
      rotV: (r() - 0.5) * 70,
      plane: i % 7 === 0 ? 1.18 : i % 5 === 0 ? 0.88 : 1,
      seed: `n${i}`,
      kind: i % 3,
      bob: 0.01 + 0.03 * r(),
    });
  }
  return out;
})();

/** A torn-edge flat note (print wear), for the notes that are not paintNote. */
const paintFlatNote = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, seed: string): void => {
  const r = seeded(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.fillStyle = YEL;
  ctx.beginPath();
  const j = () => (r() - 0.5) * s * 0.1;
  ctx.moveTo(-s / 2 + j(), -s / 2 + j());
  ctx.lineTo(s / 2 + j(), -s / 2 + j());
  ctx.lineTo(s / 2 + j(), s / 2 + j());
  ctx.lineTo(-s / 2 + j(), s / 2 + j());
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(24,32,58,0.55)';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) circle(ctx, (r() - 0.5) * s * 0.9, (r() - 0.5) * s * 0.9, s * (0.008 + 0.02 * r()));
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.fillRect(-s * 0.05, -s * 0.58, s * 0.1, s * 0.14);
  ctx.restore();
};

export const paintCrestNotes = (ctx: CanvasRenderingContext2D, cam: Cam, w: Wave, t: number, plane: 'back' | 'front'): void => {
  const R = w.R;
  for (const n of NOTE_SPECS) {
    const front = n.plane > 1;
    if ((plane === 'front') !== front) continue;
    setCam(ctx, cam, 1, 1);
    const s = n.s0 + n.amp * Math.sin(n.w * t + n.ph);
    const c = crestAt(w, s);
    const o = n.off * R + n.bob * R * Math.sin(t * 1.3 + n.ph * 2);
    let x = c.p[0] + c.n[0] * o;
    let y = c.p[1] + c.n[1] * o;
    if (n.plane !== 1) {
      x = cam.x + (x - cam.x) * n.plane;
      y = cam.y + (y - cam.y) * n.plane;
    }
    const sz = n.size * R * n.plane;
    const rot = n.rot0 + n.rotV * t;
    if (n.kind === 0) paintFlatNote(ctx, x, y, sz, rot, n.seed);
    else paintNote(ctx, x, y, sz, rot, n.seed);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

// ---------------------------------------------------------------------------------------------------------------
// The closing: navy curtain over the whole frame (5100-5121), swirling notes, and the notes the drain pulls.

const SWIRL = (() => {
  const r = seeded('swirl');
  return Array.from({ length: 16 }, (_, i) => ({
    th: r() * TAU,
    om: (0.5 + 0.5 * r()) * (i % 2 ? 1 : -1) * 0.45,
    rho: 120 + 640 * Math.pow(r(), 0.8),
    size: 70 + 80 * r(),
    rot0: r() * 360,
    rotV: (r() - 0.5) * 90,
    squash: 0.55 + 0.25 * r(),
  }));
})();
/** Screen position of the k-th swirling note at song frame f (continuous across the flood and the drain). */
export const swirlPos = (k: number, f: number): { x: number; y: number; s: number; rot: number } => {
  const q = SWIRL[k % SWIRL.length] as (typeof SWIRL)[number];
  const t = f / 30;
  const th = q.th + q.om * t;
  return { x: 960 + Math.cos(th) * q.rho * 1.5, y: 540 + Math.sin(th) * q.rho * q.squash, s: q.size, rot: q.rot0 + q.rotV * t };
};

const closeBoundary = (u: number, x: number, t: number): number => {
  const e = u * u * (3 - 2 * u);
  const base = lerp(-260, H + 360, e);
  return base - 0.26 * (x - W / 2) + 70 * Math.sin(x / 230 + t * 1.5) + 55 * (n1(x / 90 + t, 4) - 0.5) * 2;
};
export const closePath = (u: number, t: number): Path2D => {
  const p = new Path2D();
  p.moveTo(-100, -400);
  for (let x = -100; x <= W + 100; x += 12) p.lineTo(x, closeBoundary(u, x, t));
  p.lineTo(W + 100, -400);
  p.closePath();
  return p;
};
/** The curtain; `u` 0..1. Foam rides its lower edge. Swirling notes and streaks show only inside it. */
export const paintClose = (ctx: CanvasRenderingContext2D, u: number, f: number, her?: () => void): void => {
  const t = f / 30;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const path = closePath(u, t);
  ctx.fillStyle = NAVY;
  ctx.fill(path);
  const foamFade = 1 - sstep(0.55, 1, u);
  // foam and halftone on the leading edge
  const r = seeded('close-foam');
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  if (u < 0.999) {
    for (let i = 0; i < 260; i++) {
      const x = r() * (W + 200) - 100;
      const yb = closeBoundary(u, x, t);
      const o = Math.pow(r(), 2) * 70 - 14;
      circle(ctx, x, yb - o * 0.6 + 6, (2 + 9 * Math.pow(r(), 2.2)) * (0.4 + 0.6 * foamFade));
    }
  }
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  if (u < 0.999) for (let i = 0; i < 60; i++) {
    const x = r() * (W + 200) - 100;
    const yb = closeBoundary(u, x, t);
    circle(ctx, x, yb + 22 + 70 * r(), 3 + 9 * r());
  }
  ctx.fill();
  ctx.save();
  ctx.clip(path);
  if (her) her();
  // swirling cream flow lines, fading out
  ctx.strokeStyle = `rgba(243,239,228,${0.5 * foamFade})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([60, 26, 18, 30]);
  for (let k = 0; k < 9; k++) {
    const a0 = (k / 9) * TAU + t * 0.45 * (k % 2 ? 1 : -1);
    const rad0 = 160 + 70 * k;
    ctx.beginPath();
    for (let a = 0; a < 1.7; a += 0.08) {
      const th = a0 + a;
      const rr = rad0 * (1 + 0.06 * Math.sin(th * 3 + t));
      const x = 960 + Math.cos(th) * rr * 1.5;
      const y = 540 + Math.sin(th) * rr * 0.62;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (let k = 0; k < SWIRL.length; k++) {
    const q = swirlPos(k, f);
    if (k % 2) paintFlatNote(ctx, q.x, q.y, q.s, q.rot, `sw${k}`);
    else paintNote(ctx, q.x, q.y, q.s, q.rot, `sw${k}`);
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// The drain: navy that remains within a shrinking distance of the cracks.

const SEGS: [number, number, number, number][] = [];
for (const c of RUN_CRACKS) for (let i = 0; i + 1 < c.pts.length; i++) SEGS.push([(c.pts[i] as P2)[0], (c.pts[i] as P2)[1], (c.pts[i + 1] as P2)[0], (c.pts[i + 1] as P2)[1]]);
const segDist = (px: number, py: number): number => {
  let m = 1e9;
  for (const [ax, ay, bx, by] of SEGS) {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(px - ax - t * dx, py - ay - t * dy);
    if (d < m) m = d;
  }
  return m;
};
export const DRAIN_START = 5122;
export const DRAIN_END = 5150;
const drainRadius = (f: number): number => (f <= DRAIN_START ? 1500 : f >= DRAIN_END ? 0 : 640 * Math.pow(1 - (f - (DRAIN_START + 1)) / (DRAIN_END - DRAIN_START - 1), 1.4));
const amplitude = (r: number): number => clamp01(r / 70) * (16 + 0.2 * Math.min(r, 500));
/** Signed depth inside the navy at a screen point: > 0 navy, < 0 bare. */
const inkField = (x: number, y: number, r: number, f: number): number => {
  const nz = 0.55 * n2(x / 95 + f * 0.012, y / 95, 21) + 0.3 * n2(x / 31, y / 31 + f * 0.01, 22) + 0.15 * n2(x / 11, y / 11, 23);
  return r - (segDist(x, y) - amplitude(r) * (2 * nz - 1));
};

let low: HTMLCanvasElement | null = null;
const LOW = 3;

export const paintDrainFx = (ctx: CanvasRenderingContext2D, w: number, h: number, f: number): void => {
  const r = drainRadius(f);
  if (r <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const full = r > 640;
  if (full) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
  } else {
    const lw = Math.ceil(w / LOW);
    const lh = Math.ceil(h / LOW);
    if (!low) {
      low = document.createElement('canvas');
      low.width = lw;
      low.height = lh;
    }
    const lc = low.getContext('2d') as CanvasRenderingContext2D;
    const im = lc.createImageData(lw, lh);
    const d = im.data;
    for (let j = 0; j < lh; j++) {
      for (let i = 0; i < lw; i++) {
        const x = i * LOW + LOW / 2;
        const y = j * LOW + LOW / 2;
        const depth = inkField(x, y, r, f);
        const a = clamp01(depth / 3 + 0.5);
        const o = (j * lw + i) * 4;
        if (a <= 0) continue;
        // darker pooled rim inside the edge, faint grain in the body
        const rim = 1 - sstep(0, 15, depth);
        const g = 1 + 0.07 * (n2(x / 5, y / 5, 31) - 0.5);
        const k = rim * 0.85;
        d[o] = (24 * (1 - k) + 8 * k) * g;
        d[o + 1] = (32 * (1 - k) + 12 * k) * g;
        d[o + 2] = (58 * (1 - k) + 26 * k) * g;
        d[o + 3] = a * 255;
      }
    }
    lc.putImageData(im, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(low, 0, 0, lw * LOW, lh * LOW);
    // drips hanging from the lower edge, growing then retracting with the edge
    const rr = seeded('drips');
    for (let i = 0; i < 30; i++) {
      const ci = Math.floor(rr() * RUN_CRACKS.length);
      const c = RUN_CRACKS[ci as number]?.pts as P2[];
      const si = Math.floor(rr() * (c.length - 1));
      const tt = rr();
      const a = c[si] as P2;
      const b = c[si + 1] as P2;
      const x = lerp(a[0], b[0], tt) + (rr() - 0.5) * 2 * Math.min(r, 140);
      const wd = (4 + 4 * rr()) * sstep(4, 30, r);
      const lmax = (30 + 80 * rr()) * clamp01(r / 90);
      if (x < 4 || x > w - 4) continue;
      let y = lerp(a[1], b[1], tt);
      if (inkField(x, y, r, f) < 0) continue;
      let steps = 0;
      while (steps < 220 && inkField(x, y, r, f) > 0) {
        y += 3;
        steps++;
      }
      if (steps >= 220 || y > h - 4) continue;
      const len = lmax * (0.35 + 0.65 * sstep(0, 40, r));
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.roundRect(x - wd / 2 - 1.5, y - 10, wd + 3, len + 10, wd / 2 + 1.5);
      circle(ctx, x, y + len + 1, wd * 0.8 + 1.5);
      ctx.fill();
      ctx.fillStyle = NAVY;
      ctx.beginPath();
      ctx.roundRect(x - wd / 2, y - 10, wd, len + 10, wd / 2);
      circle(ctx, x, y + len + 1, wd * 0.8);
      ctx.fill();
    }
  }
  // notes sucked into the cracks
  for (let k = 0; k < 9; k++) {
    const a = DRAIN_START + 1 + k * 1.6;
    const b = a + 10 + (k % 3);
    const u = clamp01((f - a) / (b - a));
    if (u >= 1) continue;
    const e = u * u * (3 - 2 * u);
    const c = RUN_CRACKS[k % 3]?.pts as P2[];
    const idx = (k * 7) % (c.length - 1);
    const pa = c[idx] as P2;
    const pb = c[idx + 1] as P2;
    const tt = 0.25 + 0.5 * ((k * 0.37) % 1);
    const tx = Math.max(10, Math.min(w - 10, lerp(pa[0], pb[0], tt)));
    const ty = Math.max(10, Math.min(h - 10, lerp(pa[1], pb[1], tt)));
    const q = swirlPos(k, f);
    const x = lerp(q.x, tx, e);
    const y = lerp(q.y, ty, e);
    const s = q.s * (1 - 0.88 * e);
    if (k % 2) paintFlatNote(ctx, x, y, s, q.rot + 220 * e, `sw${k}`);
    else paintNote(ctx, x, y, s, q.rot + 220 * e, `sw${k}`);
  }
  ctx.restore();
};
