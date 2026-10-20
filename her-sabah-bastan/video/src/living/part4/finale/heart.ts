// The union (song 6782-6864, director's note of 20 Oct): when the palms meet, the heart she drew in the bus fog (Part 3,
// the same outline: part3/busWindow.ts heartTip) is drawn between their palms with the same tapered pen line, then grows
// until it fills the frame. Its edge is a halftone front: as it passes, the picture under it (navy field, cream field,
// both figures) is screened over by moon-yellow dots on a hex grid (the dot family of part4/halftoneReset.ts) that
// grow to solid behind the edge. Inside, ONE moon-yellow field; both figures stay only as the same thin navy line, so
// whose plate is whose can no longer be told. Screen-space painter drawn over the world's stage (and into the reset's
// 2D from-side), a pure function of the (fractional) frame.
import { palette } from '../../../style/palette.ts';
import { clamp01, lerp } from '../../../math.ts';
import { heartTip } from '../../part3/busWindow.ts';
import { LIFT_PAD } from '../../life.ts';
import { sp, type Painter } from '../common.ts';
import { fieldOf, figRect, palmPoint, worldCam } from './world.ts';
import { F_UNION } from './timeline.ts';

const DRAW0 = F_UNION + 1;
const DRAW1 = F_UNION + 9;
const GROW1 = F_UNION + 31;
/** Heart size (px on screen, = its width) while drawn, and when it has swallowed the frame. */
const S0 = 120;
const S1 = 7200;
/** Width of the halftone front (px) and the hex grid step (px). */
const FRONT = 80;
const STEP = 18;

// ---- the heart outline at size 1 and its radius per direction (it is star-shaped about this centre)

const N = 720;
const BINS = 240;
const UNIT = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) pts.push(heartTip({ x: 0, y: 0, size: 1 }, i / N));
  const cx = pts.reduce((a, p) => a + p[0], 0) / N;
  const cy = pts.reduce((a, p) => a + p[1], 0) / N;
  const local = pts.map(([x, y]) => [x - cx, y - cy] as [number, number]);
  const rad = new Float64Array(BINS);
  for (const [x, y] of local) {
    const b = Math.floor((((Math.atan2(y, x) / (2 * Math.PI)) % 1) + 1) % 1 * BINS) % BINS;
    rad[b] = Math.max(rad[b] as number, Math.hypot(x, y));
  }
  // fill any empty bin from its neighbours
  for (let b = 0; b < BINS; b++) {
    if ((rad[b] as number) > 0) continue;
    let l = b;
    let r = b;
    while ((rad[(l + BINS) % BINS] as number) === 0) l--;
    while ((rad[r % BINS] as number) === 0) r++;
    rad[b] = ((rad[(l + BINS) % BINS] as number) + (rad[r % BINS] as number)) / 2;
  }
  return { local, rad };
})();
const radAt = (x: number, y: number): number => {
  const b = Math.floor((((Math.atan2(y, x) / (2 * Math.PI)) % 1) + 1) % 1 * BINS) % BINS;
  return UNIT.rad[b] as number;
};

/** Heart size (px) at frame f, or 0 before it starts. */
export const heartSize = (f: number): number => {
  if (f < DRAW0) return 0;
  if (f < DRAW1) return S0;
  const u = clamp01((f - DRAW1) / (GROW1 - DRAW1));
  // accelerating: the edge leaves the palms slowly, then sweeps the frame
  return Math.exp(lerp(Math.log(S0), Math.log(S1), u * u * (0.35 + 0.65 * u)));
};
/** True once the yellow field covers the whole frame. */
export const heartFull = (f: number): boolean => f >= GROW1;

/** The contact point on screen (centre of the heart). */
const centre = (f: number): [number, number] => {
  const a = palmPoint('h-palm-full', 5, 0);
  const b = palmPoint('a-palm-full', 5, 0);
  const cam = worldCam(f);
  const k = 1000 / cam.z;
  return [960 + ((a[0] + b[0]) / 2 - cam.x) * k, 540 + ((a[1] + b[1]) / 2 - cam.y) * k];
};

// ---- the figures as one thin navy line each (cached per drawing)

const lines = new Map<string, HTMLCanvasElement>();
const lineCanvas = (n: string): HTMLCanvasElement => {
  const hit = lines.get(n);
  if (hit) return hit;
  const fd = fieldOf(n);
  const c = document.createElement('canvas');
  c.width = fd.w;
  c.height = fd.h;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const im = ctx.createImageData(fd.w, fd.h);
  for (let i = 0; i < fd.w * fd.h; i++) {
    const d = fd.din[i] as number;
    if (d <= 0) continue;
    const a = clamp01(4.2 - d);
    if (a <= 0) continue;
    im.data[i * 4] = 0x18;
    im.data[i * 4 + 1] = 0x20;
    im.data[i * 4 + 2] = 0x3a;
    im.data[i * 4 + 3] = Math.round(a * 255);
  }
  ctx.putImageData(im, 0, 0);
  lines.set(n, c);
  return c;
};
const paintLines = (ctx: CanvasRenderingContext2D, f: number): void => {
  const cam = worldCam(f);
  const k = 1000 / cam.z;
  for (const n of ['h-palm-full', 'a-palm-full']) {
    const r = figRect(n, 5, 0);
    const s = r.w / sp(n).w;
    const x = 960 + (r.x - cam.x) * k;
    const y = 540 + (r.y + LIFT_PAD * s - cam.y) * k;
    ctx.drawImage(lineCanvas(n), x, y, r.w * k, sp(n).h * s * k);
  }
};

const heartPath = (c: [number, number], size: number): Path2D => {
  const p = new Path2D();
  UNIT.local.forEach(([x, y], i) => (i ? p.lineTo(c[0] + x * size, c[1] + y * size) : p.moveTo(c[0] + x * size, c[1] + y * size)));
  p.closePath();
  return p;
};

/** The tapered pen line of the bus heart (drawn part p), navy, at most 9 px wide. */
const strokeHeart = (ctx: CanvasRenderingContext2D, c: [number, number], size: number, p: number): void => {
  const pen = Math.min(9, size * 0.07);
  ctx.save();
  ctx.strokeStyle = palette.navy;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const steps = Math.max(2, Math.ceil(p * 160));
  let prev = heartTip({ x: 0, y: 0, size: 1 }, 0);
  const off = [UNIT.local[0]![0] - prev[0], UNIT.local[0]![1] - prev[1]];
  for (let i = 1; i <= steps; i++) {
    const u = (i / steps) * p;
    const q = heartTip({ x: 0, y: 0, size: 1 }, u);
    ctx.lineWidth = pen * (0.62 + 0.38 * clamp01(u / 0.14)) * (1 - 0.18 * clamp01((u - 0.8) / 0.2));
    ctx.beginPath();
    ctx.moveTo(c[0] + (prev[0] + off[0]!) * size, c[1] + (prev[1] + off[1]!) * size);
    ctx.lineTo(c[0] + (q[0] + off[0]!) * size, c[1] + (q[1] + off[1]!) * size);
    ctx.stroke();
    prev = q;
  }
  ctx.restore();
};

/** The union painter at song frame f (undefined before the heart starts). */
export const heartOverlay = (f: number): Painter | undefined => {
  if (f < DRAW0) return undefined;
  return (ctx, w, h) => {
    if (heartFull(f)) {
      ctx.fillStyle = palette.moonYellow;
      ctx.fillRect(0, 0, w, h);
      paintLines(ctx, f);
      return;
    }
    const c = centre(f);
    const size = heartSize(f);
    const drawP = clamp01((f - DRAW0) / (DRAW1 - DRAW0));
    // the yellow front: hex-grid dots, solid behind the edge (r 0.62 x step covers the hex grid)
    const fill = clamp01((f - DRAW0 - 4) / 4);
    if (fill > 0) {
      ctx.save();
      ctx.fillStyle = palette.moonYellow;
      ctx.beginPath();
      const rows = Math.ceil(h / (STEP * 0.866)) + 1;
      for (let j = -1; j <= rows; j++) {
        const y = j * STEP * 0.866;
        const ox = j % 2 ? STEP / 2 : 0;
        for (let x = ox - STEP; x <= w + STEP; x += STEP) {
          const dx = x - c[0];
          const dy = y - c[1];
          const d = size * radAt(dx, dy) - Math.hypot(dx, dy);
          if (d <= 0) continue;
          const r = STEP * 0.62 * Math.sqrt(clamp01(d / Math.min(FRONT, size * 0.4))) * fill;
          if (r < 0.4) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.restore();
      // inside the solid part: the two figures as one line colour
      ctx.save();
      ctx.clip(heartPath(c, Math.max(0, size - (2 * FRONT) / 1.0)));
      paintLines(ctx, f);
      ctx.restore();
    }
    strokeHeart(ctx, c, size, drawP);
  };
};
