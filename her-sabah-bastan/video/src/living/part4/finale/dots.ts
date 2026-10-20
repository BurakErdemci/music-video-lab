// The finale's print dots: the two plates mixing as halftone. Everything here is code-made from the drawings' alpha:
// a distance field per silhouette (two-pass chamfer, built once and cached) and dot screens drawn on fixed rotated grids
// whose dot radius is a pure function of that distance and of the strength passed in. Dots only grow or shrink; the grid
// never moves (print, not particles).
import { palette } from '../../../style/palette.ts';
import { clamp01 } from '../../../math.ts';

export interface DistField {
  w: number;
  h: number;
  /** Per pixel: distance (px) to the nearest transparent pixel; 0 outside the silhouette. */
  din: Float32Array;
  /** Per pixel: distance (px) to the nearest opaque pixel; 0 inside. */
  dout: Float32Array;
}

const chamfer = (d: Float32Array, w: number, h: number): void => {
  const A = 1;
  const B = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i] as number;
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, (d[i - 1] as number) + A);
      if (y > 0) {
        v = Math.min(v, (d[i - w] as number) + A);
        if (x > 0) v = Math.min(v, (d[i - w - 1] as number) + B);
        if (x < w - 1) v = Math.min(v, (d[i - w + 1] as number) + B);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i] as number;
      if (v === 0) continue;
      if (x < w - 1) v = Math.min(v, (d[i + 1] as number) + A);
      if (y < h - 1) {
        v = Math.min(v, (d[i + w] as number) + A);
        if (x < w - 1) v = Math.min(v, (d[i + w + 1] as number) + B);
        if (x > 0) v = Math.min(v, (d[i + w - 1] as number) + B);
      }
      d[i] = v;
    }
  }
};

const fields = new Map<string, DistField>();
/** Distance fields of whatever `draw` paints into a w x h canvas (alpha > 0.5 = inside). Cached by key. */
export const distField = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): DistField => {
  const hit = fields.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  draw(ctx);
  const px = ctx.getImageData(0, 0, w, h).data;
  const din = new Float32Array(w * h);
  const dout = new Float32Array(w * h);
  const BIG = 1e6;
  for (let i = 0; i < w * h; i++) {
    const inside = (px[i * 4 + 3] as number) > 127;
    din[i] = inside ? BIG : 0;
    dout[i] = inside ? 0 : BIG;
  }
  chamfer(din, w, h);
  chamfer(dout, w, h);
  const f = { w, h, din, dout };
  fields.set(key, f);
  return f;
};

const at = (a: Float32Array, f: DistField, x: number, y: number): number => {
  const xi = Math.min(f.w - 1, Math.max(0, Math.round(x)));
  const yi = Math.min(f.h - 1, Math.max(0, Math.round(y)));
  return a[yi * f.w + xi] as number;
};

/**
 * Dots on a rotated grid over the field's canvas (canvas px = field px times `scale`, offset `oy` rows for a lift pad).
 * `radius(din, dout)` returns the dot radius in field px for a grid point (0 = no dot).
 */
export const paintDotScreen = (
  ctx: CanvasRenderingContext2D,
  f: DistField,
  step: number,
  angleDeg: number,
  color: string,
  radius: (din: number, dout: number, x: number, y: number) => number,
  o: { scale?: number; oy?: number; atop?: boolean } = {},
): void => {
  const sc = o.scale ?? 1;
  const oy = o.oy ?? 0;
  const a = (angleDeg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const cx = f.w / 2;
  const cy = f.h / 2;
  const R = Math.hypot(f.w, f.h) / 2 + step;
  const n = Math.ceil(R / step);
  ctx.save();
  if (o.atop) ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const u = i * step;
      const v = j * step;
      const x = cx + u * ca - v * sa;
      const y = cy + u * sa + v * ca;
      if (x < -step || y < -step || x > f.w + step || y > f.h + step) continue;
      const r = radius(at(f.din, f, x, y), at(f.dout, f, x, y), x, y);
      if (r <= 0.15) continue;
      const X = x * sc;
      const Y = y * sc + oy;
      ctx.moveTo(X + r * sc, Y);
      ctx.arc(X, Y, r * sc, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
};

/** Edge dots inside a silhouette: full size at the edge, gone at `reach` px inward. */
export const edgeRadius = (step: number, reach: number) => (din: number): number => {
  if (din <= 0 || reach <= 0.5) return 0;
  const u = clamp01((reach - din) / (0.75 * reach));
  return step * 0.42 * Math.sqrt(u);
};

export const INK = { navy: palette.navy, yellow: palette.moonYellow, cream: palette.cream } as const;
