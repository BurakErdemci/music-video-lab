// Part 2 icons: frame-pure 2D painters in the print idiom of ../icons.ts (pop-in with overshoot, navy outline,
// misregistered moon-yellow plate). p is progress in seconds; 0..0.25 is the pop-in. Canvas ~256x256, icon centred.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { EMOTION_RED } from '../icons.ts';

export interface Icon2Opts {
  /** 0..1: shrink and fade the icon out. */
  out?: number;
}
export interface VeinOpts extends Icon2Opts {
  /** 0..1: the vein loses air (sags, wrinkles, shrinks, fades); gone at 1. */
  deflate?: number;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const ease = (x: number): number => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
const PLATE = { dx: 2.5, dy: -2 };

/** Pop-in scale for p in 0..0.25 (0 -> peak -> 1); 1 after. */
const pop = (p: number, peak: number): number => {
  if (p >= 0.25) return 1;
  const u = p / 0.25;
  return u < 0.6 ? peak * ease(u / 0.6) : peak - (peak - 1) * ease((u - 0.6) / 0.4);
};

const strokeRound = (ctx: CanvasRenderingContext2D, color: string, w: number): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
};

// ---- zzz

/** Points of a hand-drawn "z" in a unit box (-0.5..0.5), slightly off the straight lines. */
const zPoints = (seed: string): [number, number][] => {
  const r = seeded(seed);
  const j = (): number => (r() - 0.5) * 0.07;
  return [
    [-0.46 + j(), -0.42 + j()],
    [0.46 + j(), -0.4 + j()],
    [-0.44 + j(), 0.4 + j()],
    [0.48 + j(), 0.42 + j()],
  ];
};

const Z_SHAPES = [zPoints('p2:zzz:0'), zPoints('p2:zzz:1'), zPoints('p2:zzz:2')];
const Z_PERIOD = 1.2;
const Z_STAGGER = 0.4;

/** Three hand-drawn z's rise diagonally up-right one after another and fade, looping. Moon yellow on navy. */
export const paintZzz = (ctx: CanvasRenderingContext2D, cw: number, ch: number, p: number, opts: Icon2Opts = {}): void => {
  if (p < 0) return;
  const o01 = clamp01(opts.out ?? 0);
  const m = Math.min(cw, ch);
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  const g = pop(p, 1.15) * (1 - 0.25 * o01);
  ctx.scale(g, g);
  for (let i = 0; i < 3; i++) {
    const t = p - i * Z_STAGGER;
    if (t < 0) continue;
    const u = (t / Z_PERIOD) % 1;
    // size grows as it rises; the three slots read small, medium, large
    const size = m * (0.13 + 0.17 * ease(u)) * (0.9 + 0.1 * i);
    const x = m * (-0.3 + 0.55 * u + 0.025 * Math.sin(u * 9 + i));
    const y = m * (0.3 - 0.62 * u);
    const a = clamp01(u / 0.12) * (1 - ease((u - 0.65) / 0.35)) * (1 - o01);
    if (a <= 0) continue;
    const pts = Z_SHAPES[i] as [number, number][];
    const w = size * 0.2;
    const edge = Math.max(2, size * 0.045);
    const path = (): void => {
      ctx.beginPath();
      pts.forEach(([px, py], k) => (k === 0 ? ctx.moveTo(px * size, py * size) : ctx.lineTo(px * size, py * size)));
    };
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.12 * Math.sin(u * 5 + i * 2) - 0.1);
    ctx.globalAlpha = a;
    path();
    strokeRound(ctx, palette.navy, w + edge * 2);
    ctx.translate(PLATE.dx, PLATE.dy);
    path();
    strokeRound(ctx, palette.moonYellow, w);
    ctx.restore();
  }
  ctx.restore();
};

// ---- bang

/** A startled "!": a wedge and a dot popping in hard, with cream surprise ticks around it. For navy. */
export const paintBang = (ctx: CanvasRenderingContext2D, cw: number, ch: number, p: number, opts: Icon2Opts = {}): void => {
  if (p < 0) return;
  const o01 = clamp01(opts.out ?? 0);
  const m = Math.min(cw, ch);
  const s = m * 0.7;
  const edge = Math.max(2.5, s * 0.035);
  const shake = p < 0.5 ? Math.sin(p * 90) * (1 - p / 0.5) * s * 0.012 : 0;
  ctx.save();
  ctx.translate(cw / 2 + shake, ch / 2);
  const g = pop(p, 1.3) * (1 - 0.25 * o01) * (1 + 0.012 * Math.sin(p * 10));
  ctx.scale(g, g);
  ctx.globalAlpha = 1 - o01;
  const wedge = (): void => {
    ctx.beginPath();
    ctx.moveTo(-0.15 * s, -0.46 * s);
    ctx.quadraticCurveTo(0, -0.53 * s, 0.15 * s, -0.46 * s);
    ctx.lineTo(0.07 * s, 0.14 * s);
    ctx.quadraticCurveTo(0, 0.18 * s, -0.07 * s, 0.14 * s);
    ctx.closePath();
  };
  const dot = (): void => {
    ctx.beginPath();
    ctx.arc(0, 0.33 * s, 0.085 * s, 0, Math.PI * 2);
  };
  // surprise ticks (cream): appear just after the pop, shortening to a flicker
  const tickT = clamp01((p - 0.08) / 0.12);
  if (tickT > 0) {
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = Math.max(3, s * 0.04);
    ctx.lineCap = 'round';
    const flick = 1 + 0.08 * Math.sin(p * 22);
    for (const side of [1, -1]) {
      for (const deg of [55, 95, 135]) {
        const ang = (deg * Math.PI) / 180;
        const dirX = Math.sin(ang) * side;
        const dirY = -Math.cos(ang);
        const r0 = s * (deg === 95 ? 0.36 : 0.4);
        const r1 = r0 + s * 0.12 * ease(tickT) * flick;
        ctx.beginPath();
        ctx.moveTo(dirX * r0, -0.12 * s + dirY * r0);
        ctx.lineTo(dirX * r1, -0.12 * s + dirY * r1);
        ctx.stroke();
      }
    }
  }
  // navy key plate, then the yellow plate misregistered on top
  wedge();
  ctx.fillStyle = palette.navy;
  ctx.fill();
  strokeRound(ctx, palette.navy, edge * 2);
  dot();
  ctx.fillStyle = palette.navy;
  ctx.fill();
  strokeRound(ctx, palette.navy, edge * 2);
  ctx.save();
  ctx.translate(PLATE.dx, PLATE.dy);
  wedge();
  ctx.fillStyle = palette.moonYellow;
  ctx.fill();
  dot();
  ctx.fill();
  ctx.restore();
  ctx.restore();
};

// ---- vein

/** The anime anger vein: four bulging arcs in a cross, red with a navy outline. Throbs twice a second; `deflate` lets the air out. */
export const paintVein = (ctx: CanvasRenderingContext2D, cw: number, ch: number, p: number, opts: VeinOpts = {}): void => {
  if (p < 0) return;
  const d = clamp01(opts.deflate ?? 0);
  const o01 = clamp01(opts.out ?? 0);
  const alpha = (1 - 0.3 * ease(d)) * clamp01((1 - d) / 0.12) * (1 - o01);
  if (alpha <= 0) return;
  const m = Math.min(cw, ch);
  const s = m * 0.62;
  const edge = Math.max(2.5, s * 0.04);
  // throb: a sharp beat twice a second once the pop is done, fading out as the air goes
  const ph = ((p - 0.25) * 2) % 1;
  const beat = p < 0.25 ? 0 : Math.pow(Math.sin(Math.PI * Math.min(1, ph * 1.6)), 2) * (ph < 0.625 ? 1 : 0);
  const g = pop(p, 1.2) * (1 + 0.1 * beat * (1 - d)) * (1 - 0.25 * o01);
  // balloon losing air: shrinks, flattens vertically and sags
  const k = ease(d);
  const sx = 1 - 0.45 * k;
  const sy = 1 - 0.55 * k;
  const wob = Math.sin(p * 16) * 0.1 * Math.sin(Math.PI * clamp01(d)) ;
  ctx.save();
  ctx.translate(cw / 2, ch / 2 + 0.16 * s * k);
  ctx.rotate(wob);
  ctx.scale(g * sx, g * sy);
  ctx.globalAlpha = alpha;
  // each blade is a thick curved band between two bows; flattening pulls the bows toward the chord
  const bow = 1 - 0.65 * k;
  const blade = (qx: number, qy: number): void => {
    const a0: [number, number] = [qx * 0.09 * s, qy * 0.36 * s];
    const a1: [number, number] = [qx * 0.36 * s, qy * 0.09 * s];
    const mid = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2] as const;
    const out = (f: number): [number, number] => [mid[0] + qx * f * s * bow, mid[1] + qy * f * s * bow];
    const cOut = out(0.27);
    const cIn = out(-0.04);
    ctx.beginPath();
    ctx.moveTo(a0[0], a0[1]);
    ctx.quadraticCurveTo(cOut[0], cOut[1], a1[0], a1[1]);
    ctx.quadraticCurveTo(cIn[0], cIn[1], a0[0], a0[1]);
    ctx.closePath();
  };
  for (const [qx, qy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    blade(qx, qy);
    ctx.fillStyle = EMOTION_RED;
    ctx.fill();
    strokeRound(ctx, palette.navy, edge);
  }
  // wrinkles across the blades while the air leaves
  if (k > 0.15) {
    ctx.strokeStyle = palette.navy;
    ctx.lineWidth = edge * 0.8;
    ctx.lineCap = 'round';
    for (const [qx, qy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      const len = 0.05 * s * clamp01((k - 0.15) / 0.5);
      for (const t of [0.5]) {
        const cx0 = qx * (0.09 + 0.27 * t) * s;
        const cy0 = qy * (0.36 - 0.27 * t) * s;
        ctx.beginPath();
        ctx.moveTo(cx0 - qx * len, cy0 - qy * len * 0.2);
        ctx.lineTo(cx0 + qx * len * 0.3, cy0 + qy * len);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
};
