// Part 2 magnifying glass (scene 8b): the lens disc (a magnified, slightly barrel-bulged redraw of her boxes), the yellow
// note he sticks on the glass, and the iris. Frame-pure 2D painters in screen px; randomness only through seeded().
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';

type Ctx = CanvasRenderingContext2D;
type Surface = HTMLCanvasElement | OffscreenCanvas;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const ease = (x: number): number => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
export const BLACK = '#0B0F1E';

const surfaces = new Map<string, Surface>();
const surfaceOf = (key: string, w: number, h: number): Surface => {
  const k = `${key}:${w}x${h}`;
  let c = surfaces.get(k);
  if (!c) {
    if (typeof OffscreenCanvas !== 'undefined') c = new OffscreenCanvas(w, h);
    else {
      c = document.createElement('canvas');
      c.width = w;
      c.height = h;
    }
    surfaces.set(k, c);
  }
  return c;
};

const RINGS = 36;
const BULGE = 0.16;

export interface LensOpts {
  /** Lens centre and radius on screen (px). */
  cx: number;
  cy: number;
  R: number;
  /** Magnification at the centre. */
  mag: number;
  /** Paints the thing being looked at in SCREEN px, at 1x (the lens magnifies it about its centre). */
  scene: (ctx: Ctx) => void;
}

/** The lens disc: the scene redrawn at mag x, magnification falling off to the rim (barrel bulge), a cream rim light and a glare. */
export const paintLensDisc = (ctx: Ctx, o: LensOpts): void => {
  const { cx, cy, R, mag } = o;
  const D = Math.ceil(R * 2.7);
  const src = surfaceOf('lens-src', D, D);
  const sc = src.getContext('2d') as Ctx;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.clearRect(0, 0, D, D);
  sc.fillStyle = palette.cream;
  sc.fillRect(0, 0, D, D);
  sc.save();
  sc.translate(D / 2, D / 2);
  sc.scale(mag, mag);
  sc.translate(-cx, -cy);
  o.scene(sc);
  sc.restore();
  ctx.save();
  ctx.translate(cx, cy);
  for (let k = RINGS; k >= 1; k--) {
    const rho = (R * k) / RINGS;
    const c = 1 - BULGE * (rho / R) * (rho / R);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, rho + 0.6, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(src as CanvasImageSource, (-D / 2) * c, (-D / 2) * c, D * c, D * c);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.clip();
  // two soft glare bands across the upper right and a shadow just inside the rim
  ctx.fillStyle = 'rgba(243,239,228,0.34)';
  for (const [off, wd] of [
    [0.38, 0.1],
    [0.62, 0.035],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(R * (off - wd), -R);
    ctx.lineTo(R * (off + wd), -R);
    ctx.lineTo(R * (off + wd - 1.0), R);
    ctx.lineTo(R * (off - wd - 1.0), R);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(24,32,58,0.45)';
  ctx.lineWidth = R * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, R - R * 0.025, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = palette.cream;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(2, R * 0.018);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.9, Math.PI * 1.06, Math.PI * 1.34);
  ctx.stroke();
  ctx.restore();
};

/** Black everywhere except a circle (the iris). */
export const paintIris = (ctx: Ctx, w: number, h: number, cx: number, cy: number, r: number): void => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-2, -2, w + 4, h + 4);
  ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
  ctx.fillStyle = BLACK;
  ctx.fill('evenodd');
  ctx.restore();
};

/** His yellow sticky note on the glass: slaps on with a small overshoot (p = seconds since it landed, < 0 none). */
export const paintGlassNote = (ctx: Ctx, cx: number, cy: number, p: number, seed: string): void => {
  if (p < 0) return;
  const s = 150;
  const u = clamp01(p / 0.2);
  const scale = u >= 1 ? 1 : 1.42 - 0.42 * ease(u) - 0.06 * Math.sin(Math.PI * u);
  const r = seeded(seed);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.scale(scale, scale);
  const lift = (1 - ease(u)) * 14;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(-s / 2 + 4 + lift, -s / 2 + 6 + lift, s, s);
  ctx.fillStyle = palette.moonYellow;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const yy = -s * 0.22 + i * s * 0.2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.32, yy);
    const len = 0.56 + r() * 0.12 - (i === 2 ? 0.26 : 0);
    for (let k = 1; k <= 6; k++) ctx.lineTo(-s * 0.32 + (k * s * len) / 6, yy + (r() - 0.5) * 5);
    ctx.stroke();
  }
  // a small question mark in the corner: the empty box
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(s * 0.3, s * 0.28, 8, Math.PI * 1.05, Math.PI * 2.3);
  ctx.lineTo(s * 0.3, s * 0.38);
  ctx.stroke();
  ctx.fillStyle = palette.navy;
  ctx.beginPath();
  ctx.arc(s * 0.3, s * 0.44, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // tape tab
  ctx.fillStyle = 'rgba(243,239,228,0.75)';
  ctx.fillRect(-s * 0.16, -s / 2 - 8, s * 0.32, 17);
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-s * 0.16, -s / 2 - 8, s * 0.32, 17);
  ctx.restore();
};
