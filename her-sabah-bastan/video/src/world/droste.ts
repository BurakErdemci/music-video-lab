// Geometry and camera of the intro's infinite zoom (pure maths, no remotion import: tools load it from node).
//
// Three drawable levels at 1920x1080: W (the AI's white room), M (the monitor plate inside W's sticky note)
// and, through M's screen hole, W again. One similarity A maps "W inside the hole" to "the enclosing W":
//   q (W coords) -> hole of M:  m = HOLE0 + SH * q
//   M -> note face:             l = NOTE_WIN0 + KN * m
//   note-local -> W:            w = NOTE_C + rot(NOTE_ROT) * l
// so A(q) = P + sigma * (q - P) with sigma = s * e^{i r}, s = KN * SH, r = NOTE_ROT, and fixed point P.
// Level n of the picture is drawn through A^n (n < 0 = the rooms that enclose the one at n = 0).
import { clamp01 } from '../math.ts';

export const SW = 1920;
export const SH_PX = 1080;

/**
 * The AI's room (W coordinates). The AI stands left of centre: inside the monitor's screen the human's head covers the
 * 27%-67% band of the hole, so a centred AI would be hidden behind it in every nested copy.
 */
export const AI_BOX = { cx: 400, floorY: 880, h: 620, imgW: 243, imgH: 897 };
export const AI_SCALE = AI_BOX.h / AI_BOX.imgH;
export const AI_X0 = AI_BOX.cx - (AI_BOX.imgW * AI_SCALE) / 2;
export const AI_Y0 = AI_BOX.floorY - AI_BOX.h;
/** The cursor slit painted into a10-onden.png (image px) and its place in W. */
const SLIT = { x: 118, y: 48, w: 7, h: 46 };
export const CURSOR = {
  x: AI_X0 + SLIT.x * AI_SCALE,
  y: AI_Y0 + SLIT.y * AI_SCALE,
  w: SLIT.w * AI_SCALE,
  h: SLIT.h * AI_SCALE,
};
export const CURSOR_C = { x: CURSOR.x + CURSOR.w / 2, y: CURSOR.y + CURSOR.h / 2 };
/** Tip of the "Merhaba" bubble's tail: the left side of the head. */
export const BUBBLE_TIP = { x: AI_X0 + 62 * AI_SCALE, y: AI_Y0 + 60 * AI_SCALE };
/** Body-coloured patch that hides the painted slit so the cursor can blink and ink in. */
export const SLIT_PATCH = { x: AI_X0 + 114 * AI_SCALE, y: AI_Y0 + 43 * AI_SCALE, w: 14 * AI_SCALE, h: 55 * AI_SCALE, fill: '#FDF7DD' };

/** The sticky note on the wall to the AI's right: 300x200, rotated -3 degrees; its face holds M. */
export const NOTE = { cx: 1360, cy: 430, w: 300, h: 200, rotDeg: -3 };
export const NOTE_WIN = { x: -140, y: -90, w: 280 };
export const KN = NOTE_WIN.w / SW;

/** monitor-levha.png (1672x941) drawn at 1920x1080, and its transparent screen hole (plate px 554,209 - 1200,572). */
export const PLATE_PX = { w: 1672, h: 941, hole: { x0: 554, y0: 209, x1: 1200, y1: 572 } };
const KX = SW / PLATE_PX.w;
const KY = SH_PX / PLATE_PX.h;
export const HOLE = {
  x0: PLATE_PX.hole.x0 * KX,
  y0: PLATE_PX.hole.y0 * KY,
  x1: PLATE_PX.hole.x1 * KX,
  y1: PLATE_PX.hole.y1 * KY,
};
export const HOLE_W = HOLE.x1 - HOLE.x0;
export const SHOLE = HOLE_W / SW;
/** Top-left of the nested W inside M (W is centred vertically on the hole). */
export const HOLE0 = { x: HOLE.x0, y: (HOLE.y0 + HOLE.y1) / 2 - (SH_PX * SHOLE) / 2 };

const rotRad = (NOTE.rotDeg * Math.PI) / 180;
const cr = Math.cos(rotRad);
const sr = Math.sin(rotRad);

export interface V2 {
  x: number;
  y: number;
}
/** A: W inside the hole -> the enclosing W. */
export const mapA = (q: V2): V2 => {
  const mx = HOLE0.x + SHOLE * q.x;
  const my = HOLE0.y + SHOLE * q.y;
  const lx = NOTE_WIN.x + KN * mx;
  const ly = NOTE_WIN.y + KN * my;
  return { x: NOTE.cx + cr * lx - sr * ly, y: NOTE.cy + sr * lx + cr * ly };
};
/** Scale per level, rotation per level (radians) and the fixed point. */
export const S = KN * SHOLE;
export const R = rotRad;
export const LN_S = Math.log(S);
const sig = { re: S * cr, im: S * sr };
const b = mapA({ x: 0, y: 0 });
// P = b / (1 - sigma)
const den = (1 - sig.re) * (1 - sig.re) + sig.im * sig.im;
export const P: V2 = { x: (b.x * (1 - sig.re) - b.y * sig.im) / den, y: (b.y * (1 - sig.re) + b.x * sig.im) / den };

/** Level index of a moon phase: crescent, half, gibbous, one per loop outwards. */
export const moonPhase = (n: number): number => 0.2 + 0.3 * (((-n % 3) + 3) % 3);

// ---- camera ---------------------------------------------------------------------------------------------

/** Frame -> L = ln(zoom). Knots are downbeat frames; monotone cubic (Fritsch-Carlson) between them. */
export interface Knot {
  f: number;
  L: number;
}
const slopes = (k: readonly Knot[]): number[] => {
  const n = k.length;
  const d: number[] = [];
  const h: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push((k[i + 1] as Knot).f - (k[i] as Knot).f);
    d.push(((k[i + 1] as Knot).L - (k[i] as Knot).L) / (h[i] as number));
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0] as number;
  m[n - 1] = d[n - 2] as number;
  for (let i = 1; i < n - 1; i++) {
    const a = d[i - 1] as number;
    const c = d[i] as number;
    if (a * c <= 0) m[i] = 0;
    else {
      const w1 = 2 * (h[i] as number) + (h[i - 1] as number);
      const w2 = (h[i] as number) + 2 * (h[i - 1] as number);
      m[i] = (w1 + w2) / (w1 / a + w2 / c);
    }
  }
  // end slopes: the start is a near-rest (piano), the end keeps its speed
  m[0] = 0;
  return m;
};
export const makeZoomCurve = (knots: readonly Knot[]): ((frame: number) => number) => {
  const m = slopes(knots);
  return (frame: number): number => {
    const first = knots[0] as Knot;
    const last = knots[knots.length - 1] as Knot;
    if (frame <= first.f) return first.L;
    if (frame >= last.f) return last.L + (m[knots.length - 1] as number) * (frame - last.f);
    let i = 0;
    while (i < knots.length - 2 && frame >= (knots[i + 1] as Knot).f) i++;
    const a = knots[i] as Knot;
    const c = knots[i + 1] as Knot;
    const h = c.f - a.f;
    const t = (frame - a.f) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * a.L + (t3 - 2 * t2 + t) * h * (m[i] as number) + (-2 * t3 + 3 * t2) * c.L + (t3 - t2) * h * (m[i + 1] as number);
  };
};

/** Rotation per loop is r: phi = (r / ln s) * g(L - L_R), g(u) = u - softplus(u): 0 for u >> 0, u for u << 0. */
const LR = 0.35;
const SOFT = 0.6;
const phiOf = (L: number): number => {
  const u = L - LR;
  const g = u - SOFT * Math.log(1 + Math.exp(u / SOFT));
  return (R / LN_S) * g;
};

export interface Camera {
  L: number;
  Z: number;
  phi: number;
  F: V2;
}
const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerp2 = (a: V2, b2: V2, t: number): V2 => ({ x: a.x + (b2.x - a.x) * t, y: a.y + (b2.y - a.y) * t });

export interface FocusKeys {
  /** Frame the focus leaves the cursor, the frame it is on the AI, the frame it is on P. */
  leave: number;
  mid: number;
  fixed: number;
}
export const AI_MID: V2 = { x: 700, y: AI_BOX.floorY - AI_BOX.h * 0.5 };

export const makeCamera = (curve: (frame: number) => number, keys: FocusKeys) => (frame: number, lOverride?: number): Camera => {
  const L = lOverride ?? curve(frame);
  let F: V2;
  if (frame <= keys.leave) F = CURSOR_C;
  else if (frame < keys.mid) F = lerp2(CURSOR_C, AI_MID, smoothstep((frame - keys.leave) / (keys.mid - keys.leave)));
  else if (frame < keys.fixed) F = lerp2(AI_MID, P, smoothstep((frame - keys.mid) / (keys.fixed - keys.mid)));
  else F = P;
  return { L, Z: Math.exp(L), phi: phiOf(L), F };
};

/** Affine matrix (SVG order a b c d e f) of the screen map for level n. Screen = C + Z rho (A^n(q) - F). */
export interface Mat {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
export const levelMatrix = (cam: Camera, n: number): Mat => {
  // mu = Z * e^{i phi} * sigma^n
  const mag = cam.Z * Math.pow(S, n);
  const ang = cam.phi + n * R;
  const mre = mag * Math.cos(ang);
  const mim = mag * Math.sin(ang);
  const rre = cam.Z * Math.cos(cam.phi);
  const rim = cam.Z * Math.sin(cam.phi);
  // translation = C + Z rho (P - F) - mu P
  const dx = P.x - cam.F.x;
  const dy = P.y - cam.F.y;
  const tx = SW / 2 + (rre * dx - rim * dy) - (mre * P.x - mim * P.y);
  const ty = SH_PX / 2 + (rim * dx + rre * dy) - (mim * P.x + mre * P.y);
  return { a: mre, b: mim, c: -mim, d: mre, e: tx, f: ty };
};
export const apply = (m: Mat, p: V2): V2 => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });

/** Does the frame of level n (1920x1080 in its own coords) cover the whole screen, with a margin? */
export const covers = (m: Mat, margin = 6): boolean => {
  const q = [apply(m, { x: 0, y: 0 }), apply(m, { x: SW, y: 0 }), apply(m, { x: SW, y: SH_PX }), apply(m, { x: 0, y: SH_PX })];
  const corners: V2[] = [
    { x: -margin, y: -margin },
    { x: SW + margin, y: -margin },
    { x: SW + margin, y: SH_PX + margin },
    { x: -margin, y: SH_PX + margin },
  ];
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i] as V2;
    const c = q[(i + 1) % 4] as V2;
    for (const p of corners) {
      const cross = (c.x - a.x) * (p.y - a.y) - (c.y - a.y) * (p.x - a.x);
      if (sign === 0) sign = Math.sign(cross) || 1;
      else if (Math.sign(cross) !== sign && cross !== 0) return false;
    }
  }
  return true;
};

/** Outermost level to draw: the innermost one whose frame still covers the screen. */
export const rootLevel = (cam: Camera): number => {
  let best = -12;
  for (let n = -12; n <= 4; n++) {
    if (covers(levelMatrix(cam, n))) best = n;
  }
  return best;
};
/** Levels (counted from the root) whose frame is at least this many px wide get drawn. */
export const MIN_FRAME_PX = 2;
export const depthFor = (cam: Camera, root: number, cap = 7): number => {
  let d = 0;
  while (d < cap && SW * cam.Z * Math.pow(S, root + d + 1) >= MIN_FRAME_PX) d++;
  return d;
};
