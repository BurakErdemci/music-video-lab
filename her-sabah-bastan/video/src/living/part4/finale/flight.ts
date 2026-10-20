// Song frames 6396-6505: the shatter and the flight. The picture glass of glassB (its last frame, the hard cut from
// Part4a) breaks from the palms into real shards (Voronoi cells, geometry copied from part4/shards.ts); the big shards
// turn into moments of the film (recap stills printed inside them) and come at the camera one after another while the
// camera flies forward THROUGH the glass plane (it crosses it on the bar-116 downbeat, 6451) into the world behind,
// where the two stand far apart, blown away from each other, palms still raised. Every shard pose is a closed-form
// function of the (fractional) frame.
import { seeded } from '../../../style/seeded.ts';
import { palette } from '../../../style/palette.ts';
import { clamp01, lerp } from '../../../math.ts';
import { paintLayers } from '../../compose2d.ts';
import { planeScale, type Cam, type Layer, type Painter } from '../common.ts';
import { RUN_CRACKS } from '../cracks.ts';
import { D_PIC, PIC_RECT } from '../splitSet.ts';
import { glassBStage } from '../glassB.ts';
import { CAM_FLIGHT_END, worldLayers } from './world.ts';
import { RECAP } from './recap.ts';
import { F_LAND, F_SHATTER } from './timeline.ts';

type P = [number, number];

/** The world is pushed this far back during the flight so the camera can pass the glass plane and still see it wide. */
export const DD = 1900;
/** Song frame of Part4a's last picture (the shards' source). */
export const GB_END = 6395;

let gbCache: ReturnType<typeof glassBStage> | null = null;
export const gb = (): ReturnType<typeof glassBStage> => (gbCache ??= glassBStage(GB_END));

// ---- the camera

const easeInOut3 = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** The jolt of the break: a decaying wobble for ~14 frames. */
const jolt = (f: number): P => {
  const k = f - F_SHATTER;
  if (k < 0.5 || k > 14) return [0, 0];
  const a = 10 * Math.exp(-k / 3.2);
  return [a * Math.sin(k * 2.3), a * 0.7 * Math.cos(k * 1.9)];
};
export const flightCam = (f: number): Cam => {
  const c0 = gb().cam;
  const end: Cam = { x: CAM_FLIGHT_END.x, y: CAM_FLIGHT_END.y, z: CAM_FLIGHT_END.z - DD };
  const u = easeInOut3((f - F_SHATTER) / (F_LAND - 1 - F_SHATTER));
  const [jx, jy] = jolt(f);
  return { x: lerp(c0.x, end.x, u) + jx, y: lerp(c0.y, end.y, u) + jy, z: lerp(c0.z, end.z, u) };
};

// ---- Voronoi (copied from part4/shards.ts)

const clip = (poly: P[], a: P, b: P): P[] => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const nx = b[0] - a[0];
  const ny = b[1] - a[1];
  const v = (p: P): number => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out: P[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i] as P;
    const q = poly[(i + 1) % poly.length] as P;
    const vp = v(p);
    const vq = v(q);
    if (vp <= 0) out.push(p);
    if (vp <= 0 !== vq <= 0) {
      const t = vp / (vp - vq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
};
const areaOf = (poly: P[]): number => {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i] as P;
    const q = poly[(i + 1) % poly.length] as P;
    s += p[0] * q[1] - q[0] * p[1];
  }
  return s / 2;
};
const centroidOf = (poly: P[]): P => {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i] as P;
    const q = poly[(i + 1) % poly.length] as P;
    const cr = p[0] * q[1] - q[0] * p[1];
    a += cr;
    cx += (p[0] + q[0]) * cr;
    cy += (p[1] + q[1]) * cr;
  }
  return [cx / (3 * a), cy / (3 * a)];
};
const distSeg = (p: P, a: P, b: P): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};
/** 0 at t = 0, 1 as t grows; start velocity (1 - a) k (instant but not a teleport). */
const burst = (t: number, k: number, a = 0.35): number => {
  const x = Math.max(0, t);
  return 1 - Math.exp(-k * x) * (1 + a * k * x);
};

const RINGS = [60, 120, 195, 295, 435, 625, 880, 1230];
const COUNTS = [6, 8, 10, 12, 14, 16, 12, 8];

export interface FShard {
  i: number;
  /** Outline (world px relative to the centroid, x right, y UP, counter-clockwise) and its uv in the glass picture. */
  poly: P[];
  uv: P[];
  /** uv of each vertex in its recap still (cover-fit, centred on the still's subject); empty if none. */
  uv2: P[];
  recap: number;
  c: P;
  area: number;
  th: number;
  dir: P;
  R: number;
  kxy: number;
  zT: number;
  kz: number;
  A: [number, number, number];
  kr: number;
  spin: [number, number, number];
  ph: number;
  /** Recap shards: the frame it reaches the camera and its lateral offset from the lens then. */
  pass: number;
  off: P;
}
export interface FShardSet {
  shards: FShard[];
  cam0: Cam;
  impact: P;
}

/** The palms' meeting point on screen in Part4a's last frame (measured on the render: x 962, y 410). */
const IMPACT_SCREEN: P = [962, 410];
/** Recap shards: the first reaches the lens at PASS0, then one every PASS_STEP frames. */
const PASS0 = 6426;
const PASS_STEP = 8;

const build = (): FShardSet => {
  const cam0 = gb().cam;
  const kp = planeScale(cam0, D_PIC);
  const hw = 960 / kp;
  const hh = 540 / kp;
  const rect: P[] = [
    [cam0.x - hw, cam0.y - hh],
    [cam0.x + hw, cam0.y - hh],
    [cam0.x + hw, cam0.y + hh],
    [cam0.x - hw, cam0.y + hh],
  ];
  const impact: P = [cam0.x + (IMPACT_SCREEN[0] - 960) / kp, cam0.y + (IMPACT_SCREEN[1] - 540) / kp];
  const rnd = seeded('p4f:shatter');
  const unit = hw / 960;
  const kw = PIC_RECT.w / 1920;
  const cracks: P[][] = RUN_CRACKS.map((c) => c.pts.map(([x, y]) => [PIC_RECT.x + x * kw, PIC_RECT.y + y * kw] as P));
  const nearCrack = (p: P): boolean => cracks.some((pl) => pl.some((q, i) => i > 0 && distSeg(p, pl[i - 1] as P, q) < 44 * unit));

  const seeds: P[] = [];
  RINGS.forEach((r, k) => {
    const n = COUNTS[k] as number;
    const a0 = rnd() * Math.PI * 2;
    for (let j = 0; j < n; j++) {
      const a = a0 + ((j + (rnd() - 0.5) * 0.7) / n) * Math.PI * 2;
      const rr = r * (0.88 + rnd() * 0.24) * unit;
      const p: P = [impact[0] + Math.cos(a) * rr, impact[1] + Math.sin(a) * rr];
      if (!nearCrack(p)) seeds.push(p);
    }
  });
  const gap = 8 * unit;
  const spacing = 190 * unit;
  for (const pl of cracks) {
    for (let i = 1; i < pl.length; i++) {
      const a = pl[i - 1] as P;
      const b = pl[i] as P;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / len;
      const dy = (b[1] - a[1]) / len;
      for (let s = spacing * 0.5; s < len; s += spacing) {
        const q: P = [a[0] + dx * s, a[1] + dy * s];
        if (q[0] < rect[0]![0] + 6 || q[0] > rect[1]![0] - 6 || q[1] < rect[0]![1] + 6 || q[1] > rect[3]![1] - 6) continue;
        seeds.push([q[0] - dy * gap, q[1] + dx * gap], [q[0] + dy * gap, q[1] - dx * gap]);
      }
    }
  }

  const shards: FShard[] = [];
  seeds.forEach((s, si) => {
    let poly = rect;
    for (let j = 0; j < seeds.length && poly.length >= 3; j++) if (j !== si) poly = clip(poly, s, seeds[j] as P);
    if (poly.length < 3 || Math.abs(areaOf(poly)) < 40 * unit * unit) return;
    const c = centroidOf(poly);
    const local: P[] = poly.map((p) => [p[0] - c[0], -(p[1] - c[1])] as P);
    if (areaOf(local) < 0) local.reverse();
    const uv: P[] = local.map(([x, y]) => [(960 + (c[0] + x - cam0.x) * kp) / 1920, 1 - (540 + (c[1] - y - cam0.y) * kp) / 1080] as P);
    shards.push({ i: shards.length, poly: local, uv, uv2: [], recap: -1, c, area: Math.abs(areaOf(local)), th: 0, dir: [0, 0], R: 0, kxy: 0, zT: 0, kz: 0, A: [0, 0, 0], kr: 0, spin: [0, 0, 0], ph: 0, pass: 0, off: [0, 0] });
  });

  // the recap shards: the biggest cells fully inside the frame, roughly round ones first (a still reads in a fat cell)
  const fat = (s: FShard): number => {
    const xs = s.poly.map((p) => p[0]);
    const ys = s.poly.map((p) => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs);
    const bh = Math.max(...ys) - Math.min(...ys);
    return s.area * Math.min(bw, bh) / Math.max(bw, bh);
  };
  const cands = [...shards].sort((a, b) => fat(b) - fat(a)).slice(0, RECAP.length);
  // order of arrival: alternate sides so consecutive stills come from left and right
  cands.sort((a, b) => Math.atan2(a.c[1] - impact[1], a.c[0] - impact[0]) - Math.atan2(b.c[1] - impact[1], b.c[0] - impact[0]));
  cands.forEach((s, j) => {
    const order = j % 2 === 0 ? j / 2 : cands.length - 1 - (j - 1) / 2;
    s.recap = order % RECAP.length;
    s.pass = PASS0 + order * PASS_STEP;
    const rec = RECAP[s.recap]!;
    const xs = s.poly.map((p) => p[0]);
    const ys = s.poly.map((p) => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs);
    const bh = Math.max(...ys) - Math.min(...ys);
    // cover-fit a 16:9 still to the cell's box, then zoom 1.15x on the still's subject
    const sc = Math.max(bw / 16, bh / 9) * 1.15;
    const iw = 16 * sc;
    const ih = 9 * sc;
    const mx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const my = (Math.max(...ys) + Math.min(...ys)) / 2;
    const fx = clamp01(rec.focus[0]);
    const fy = clamp01(rec.focus[1]);
    // keep the crop inside the still
    const u0 = Math.min(Math.max(fx, bw / iw / 2), 1 - bw / iw / 2);
    const v0 = Math.min(Math.max(1 - fy, bh / ih / 2), 1 - bh / ih / 2);
    s.uv2 = s.poly.map(([x, y]) => [u0 + (x - mx) / iw, v0 + (y - my) / ih] as P);
  });

  shards.forEach((s) => {
    const r = seeded(`p4f:shard:${s.i}`);
    const dx = s.c[0] - impact[0];
    const dy = s.c[1] - impact[1];
    const r0 = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx) + (r() - 0.5) * 0.35;
    s.dir = [Math.cos(ang), Math.sin(ang)];
    s.th = (9 + 6 * r()) * unit;
    // small radial travel: the shards stay in the picture and spread in DEPTH, so the camera flies through them
    s.R = Math.max(r0 * 0.08 + 30 * unit + 80 * unit * r(), 90 * unit + 140 * unit * r() - r0 * 0.08);
    s.kxy = 3.0 + 1.8 * r();
    // toward the camera: small pieces near the palms fastest
    // about 45 % blow back toward the world: the camera still passes shards after it crosses the glass plane
    s.zT = r() < 0.45 ? -(100 + 520 * r()) : 150 + 650 * r() + 150 / (1 + r0 / (200 * unit));
    s.kz = 1.0 + 0.8 * r();
    const sgn = (): number => (r() < 0.5 ? -1 : 1);
    const lively = s.recap >= 0 ? 0.35 : 1;
    s.A = [sgn() * (0.2 + 0.9 * r()) * lively, sgn() * (0.2 + 0.9 * r()) * lively, sgn() * (0.3 + 1.6 * r()) * lively];
    s.kr = 1.5 + 1.2 * r();
    s.spin = [sgn() * 0.4 * r() * lively, sgn() * 0.4 * r() * lively, sgn() * (0.1 + 0.4 * r()) * lively];
    s.ph = r() * Math.PI * 2;
    if (s.recap >= 0) {
      const a = r() * Math.PI * 2;
      const L = 130 + 110 * r();
      s.off = [Math.cos(a) * L, Math.sin(a) * L * 0.7];
    }
  });
  return { shards, cam0, impact };
};

let setCache: FShardSet | null = null;
export const shardSet = (): FShardSet => (setCache ??= build());

export interface FPose {
  /** World position (x right, y UP like three) and Euler angles. */
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  /** 0 = the glass picture, 1 = its recap still. */
  mix: number;
}

const Z_GLASS = -D_PIC; // three z of the glass plane

/** Recap shards ease from the glass to a point just off the lens at `pass`, and keep going past it. */
const recapPose = (s: FShard, f: number): FPose => {
  const t = Math.max(0, f - F_SHATTER) / 30;
  const T = (s.pass - F_SHATTER) / 30;
  const g = burst(t, 1.6, 0.1) / burst(T, 1.6, 0.1);
  const cp = flightCam(s.pass);
  const tx = cp.x + s.off[0];
  const ty = cp.y + s.off[1];
  // the target sits 60 px in front of the lens at the pass; past it the shard keeps the same velocity
  const x = lerp(s.c[0], tx, g);
  const yd = lerp(s.c[1], ty, g);
  const z = lerp(Z_GLASS, cp.z - 60, g);
  const settle = 1 - burst(t, s.kr, 0.2) * 0.75;
  return {
    x,
    y: -yd,
    z,
    rx: s.A[0] * Math.sin(Math.min(t * s.kr, Math.PI)) * settle + 0.05 * Math.sin(t * 1.3 + s.ph),
    ry: s.A[1] * Math.sin(Math.min(t * s.kr, Math.PI)) * settle + 0.05 * Math.sin(t * 1.1 + s.ph * 2),
    rz: s.A[2] * 0.3 * burst(t, s.kr, 0.2) + s.spin[2] * t,
    mix: clamp01((f - F_SHATTER - 4) / 12),
  };
};

export const shardPose = (s: FShard, f: number): FPose => {
  if (s.recap >= 0) return recapPose(s, f);
  const t = Math.max(0, f - F_SHATTER) / 30;
  const g = burst(t, s.kxy);
  const gz = burst(t, s.kz);
  const gr = burst(t, s.kr, 0.2);
  const x = s.c[0] + s.dir[0] * s.R * g;
  const yd = s.c[1] + s.dir[1] * s.R * g;
  const z = Z_GLASS + s.zT * gz + 40 * t;
  return { x, y: -yd, z, rx: s.A[0] * gr + s.spin[0] * t, ry: s.A[1] * gr + s.spin[1] * t, rz: s.A[2] * gr + s.spin[2] * t, mix: 0 };
};

/** The source picture of the shards: glassB's last frame painted once into 1920 x 1080 (needs a DOM). */
let srcCanvas: HTMLCanvasElement | null = null;
export const shatterSource = (): HTMLCanvasElement => {
  if (srcCanvas) return srcCanvas;
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, 0, 1920, 1080);
  const s = gb();
  paintLayers(ctx, s.layers, s.cam, GB_END);
  srcCanvas = c;
  return c;
};

export interface FlightData {
  layers: Layer[];
  cam: Cam;
  set: FShardSet;
}
export const flightData = (f: number): FlightData => ({ layers: worldLayers(f, DD), cam: flightCam(f), set: shardSet() });

/** The impact flash: cream bloom over the palms for 3 frames (screen space). */
export const impactFlash = (f: number): Painter | undefined => {
  const k = f - F_SHATTER;
  if (k < 0 || k >= 3) return undefined;
  const a = 0.55 * (1 - k / 3);
  return (ctx, w, h) => {
    const g = ctx.createRadialGradient(IMPACT_SCREEN[0], IMPACT_SCREEN[1], 0, IMPACT_SCREEN[0], IMPACT_SCREEN[1], 900 - 200 * k);
    g.addColorStop(0, `rgba(255,248,222,${a.toFixed(3)})`);
    g.addColorStop(0.45, `rgba(243,239,228,${(a * 0.5).toFixed(3)})`);
    g.addColorStop(1, 'rgba(243,239,228,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
};
