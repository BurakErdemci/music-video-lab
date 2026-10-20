// The shatter's geometry: a seeded radial fracture of the picture glass (rays from the impact, concentric rings and
// the run cracks as edges, built as a Voronoi diagram: seeds on rings, seed PAIRS mirrored across a crack line make
// that line a cell border) and the closed-form motion of every shard. Pure functions of the frame; no canvas here.
import { seeded } from '../../style/seeded.ts';
import { D0, planeScale, type Cam } from '../types.ts';
import { RUN_CRACKS } from './cracks.ts';
import { D_PIC, PIC_RECT } from './splitSet.ts';

type P = [number, number];

export const SHATTER_F = 6396;
/** Frame from which the slow forward drift (the shards later pass the camera) starts for the front shards. */
const DRIFT_FRONT = 6600;
const DRIFT_BEHIND = 6625;

export interface Shard {
  i: number;
  /** Starts behind the characters (z < 0 after the burst). */
  behind: boolean;
  /** Outline in world units relative to the centroid, x right, y UP, counter-clockwise. */
  poly: P[];
  /** Texture coordinate of each outline vertex (the source picture, v up). */
  uv: P[];
  /** Centroid in world units on the glass plane (y DOWN, like layers). */
  c: P;
  area: number;
  /** Radius of the smallest circle about the centroid that holds the outline. */
  rad: number;
  th: number;
  dir: P;
  R: number;
  kxy: number;
  zT: number;
  kz: number;
  A: [number, number, number];
  kr: number;
  spin: [number, number, number];
  amp: [number, number, number];
  per: number;
  ph: number;
  w: number;
  fd: number;
  ex: P;
  /** Frame it passes the camera plane (it is hidden from then on). */
  pass: number;
}
export interface ShardSet {
  shards: Shard[];
  cam0: Cam;
  impact: P;
}

// ---- Voronoi on the visible rectangle of the glass plane

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

/** Burst curve: 0 at t = 0, 1 as t grows; its start velocity is (1 - a) k, so the break is instant but not a teleport. */
export const burst = (t: number, k: number, a = 0.35): number => {
  const x = Math.max(0, t);
  return 1 - Math.exp(-k * x) * (1 + a * k * x);
};

const RINGS = [60, 120, 195, 295, 435, 625, 880, 1230];
const COUNTS = [6, 8, 10, 12, 14, 16, 16, 10];

/**
 * Builds the shards. `cam0` is the framing of the picture at the cut (the picture glass, at depth D_PIC, shows the
 * whole 1920 x 1080 frame under it), `impact` the palms' meeting point in glass-plane world units, `camAt` the
 * camera of every coda frame (used to time when each shard flies past it).
 */
export const buildShards = (cam0: Cam, impactWorldD0: P, camAt: (f: number) => Cam, endFrame: number): ShardSet => {
  const kp = planeScale(cam0, D_PIC);
  const k0 = planeScale(cam0, 0);
  const hw = 960 / kp;
  const hh = 540 / kp;
  const rect: P[] = [
    [cam0.x - hw, cam0.y - hh],
    [cam0.x + hw, cam0.y - hh],
    [cam0.x + hw, cam0.y + hh],
    [cam0.x - hw, cam0.y + hh],
  ];
  // the same ray through the d = 0 palms hits the glass plane here
  const impact: P = [cam0.x + ((impactWorldD0[0] - cam0.x) * k0) / kp, cam0.y + ((impactWorldD0[1] - cam0.y) * k0) / kp];
  const rnd = seeded('p4:shatter');
  const unit = hw / 960; // glass-plane world units per screen px at cam0

  // the three run cracks, picture px -> glass-plane world
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

  const shards: Shard[] = [];
  seeds.forEach((s, si) => {
    let poly = rect;
    for (let j = 0; j < seeds.length && poly.length >= 3; j++) if (j !== si) poly = clip(poly, s, seeds[j] as P);
    if (poly.length < 3 || Math.abs(areaOf(poly)) < 40 * unit * unit) return;
    const c = centroidOf(poly);
    const local: P[] = poly.map((p) => [p[0] - c[0], -(p[1] - c[1])] as P);
    if (areaOf(local) < 0) local.reverse();
    // uv of a local vertex: its screen px under cam0 on the glass plane
    const uv: P[] = local.map(([x, y]) => [(960 + (c[0] + x - cam0.x) * kp) / 1920, 1 - (540 + (c[1] - y - cam0.y) * kp) / 1080] as P);
    shards.push({ i: shards.length, behind: false, poly: local, uv, c, area: Math.abs(areaOf(local)), rad: Math.max(...local.map(([x, y]) => Math.hypot(x, y))), th: 0, dir: [0, 0], R: 0, kxy: 0, zT: 0, kz: 0, A: [0, 0, 0], kr: 0, spin: [0, 0, 0], amp: [0, 0, 0], per: 1, ph: 0, w: 0, fd: 0, ex: [0, 0], pass: 0 });
  });

  // the behind group: left of the palms, off the middle
  const leftIdx = shards.filter((s) => s.c[0] < impact[0] - 220 * unit && s.area > 300 * unit * unit).map((s) => s.i);
  const behind = new Set<number>();
  const rb = seeded('p4:shatter:behind');
  for (const i of leftIdx) if (rb() < 0.6 && behind.size < 12) behind.add(i);

  shards.forEach((s) => {
    const r = seeded(`p4:shard:${s.i}`);
    const dx = s.c[0] - impact[0];
    const dy = s.c[1] - impact[1];
    const r0 = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx) + (r() - 0.5) * 0.35;
    s.dir = [Math.cos(ang), Math.sin(ang)];
    const size = Math.sqrt(s.area);
    s.behind = behind.has(s.i);
    s.th = (9 + 6 * r()) * unit;
    // radial travel: small pieces near the palms leave the middle, big far pieces move less
    s.R = Math.max(r0 * 0.12 + 70 * unit + 150 * unit * r(), 255 * unit + 330 * unit * r() - r0 * 0.25);
    s.kxy = 3.2 + 1.6 * r();
    s.zT = s.behind ? -(420 + 120 * r()) : 18 + 125 * r();
    s.kz = 2.6 + 1.0 * r();
    const lively = Math.min(1.6, 120 / (size / unit + 20) + 0.45);
    const sgn = (): number => (r() < 0.5 ? -1 : 1);
    s.A = [sgn() * (0.15 + 0.85 * r()) * lively, sgn() * (0.15 + 0.85 * r()) * lively, sgn() * (0.4 + 2.2 * r()) * lively];
    s.kr = 1.6 + 1.2 * r();
    s.spin = [sgn() * 0.05 * r(), sgn() * 0.05 * r(), sgn() * (0.05 + 0.2 * r())];
    s.amp = [(4 + 7 * r()) * unit, (4 + 7 * r()) * unit, 6 * r()];
    s.per = 2.6 + 2 * r();
    s.ph = r() * Math.PI * 2;
    s.fd = s.behind ? DRIFT_BEHIND : DRIFT_FRONT;
  });

  // when each shard flies past the camera, the forward drift that gets it there, and a lateral push so that nothing
  // crosses the middle of the frame (the pair and the moon)
  const rp = seeded('p4:shatter:pass');
  shards.forEach((s) => {
    const T = Math.round(6690 + (endFrame - 6690) * Math.pow(rp(), 0.55));
    const cz = camAt(T);
    const zb = -D_PIC + s.zT * burst((T - SHATTER_F) / 30, s.kz);
    s.w = Math.max(0.25, (cz.z - zb) / (T - s.fd));
    s.pass = T;
    const px = s.c[0] + s.dir[0] * s.R * burst((T - SHATTER_F) / 30, s.kxy);
    const py = s.c[1] + s.dir[1] * s.R * burst((T - SHATTER_F) / 30, s.kxy);
    const lx = px - cz.x;
    const ly = py - cz.y;
    const L = Math.hypot(lx, ly) || 1;
    // lateral band at the pass: clear of the middle, and not so far out that it was never on screen
    const lmin = 15 + 60 * rp();
    const lmax = 150 + 260 * rp();
    const goal = L < lmin ? lmin : L > lmax ? lmax : L;
    s.ex = [(lx / L) * ((goal - L) / (T - s.fd)), (ly / L) * ((goal - L) / (T - s.fd))];
  });
  return { shards, cam0, impact };
};

export interface ShardPose {
  /** World position (x right, y UP like three) and Euler angles. */
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}
/** A column of the frame the shards keep out of (the figures, the pair, the moon): centre = the world x on plane d = 0 whose screen
 * column it is, `ex` = half width in screen px. Each shard is pushed sideways, on its own side, only as far as needed. */
export interface Zone {
  xz: number;
  ex: number;
}
export const shardPose = (s: Shard, f: number, cam?: Cam, zone?: Zone): ShardPose => {
  const t = Math.max(0, f - SHATTER_F) / 30;
  const g = burst(t, s.kxy);
  const gz = burst(t, s.kz);
  const gr = burst(t, s.kr, 0.2);
  const fl = (a: number, ph: number): number => a * Math.sin((2 * Math.PI * t) / s.per + s.ph + ph);
  const dr = Math.max(0, f - s.fd);
  const x = s.c[0] + s.dir[0] * s.R * g + s.ex[0] * dr + fl(s.amp[0], 0);
  const yd = s.c[1] + s.dir[1] * s.R * g + s.ex[1] * dr + fl(s.amp[1], 1.7);
  const z = -D_PIC + s.zT * gz + s.w * dr + fl(s.amp[2], 3.1);
  let xo = x;
  if (cam && zone && cam.z - z > 30) {
    const k0 = planeScale(cam, 0);
    const ks = D0 / (cam.z - z);
    const side = s.c[0] + s.dir[0] * s.R >= zone.xz ? 1 : -1;
    const szone = 960 + (zone.xz - cam.x) * k0;
    const need = zone.ex + s.rad * ks;
    const cur = (960 + (x - cam.x) * ks - szone) * side;
    if (cur < need) xo = cam.x + (szone + side * need - 960) / ks;
  }
  return {
    x: xo,
    y: -yd,
    z,
    rx: s.A[0] * gr + s.spin[0] * t + 0.04 * Math.sin(t * 1.3 + s.ph),
    ry: s.A[1] * gr + s.spin[1] * t + 0.04 * Math.sin(t * 1.1 + s.ph * 2),
    rz: s.A[2] * gr + s.spin[2] * t,
  };
};
