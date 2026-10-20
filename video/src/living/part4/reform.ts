// Painters of the re-forming beats of scene 13: the big come-apart (the 5317 hit), the yellow-pixel fall into the seam
// line (the PEN transition at 5401) and the dotted silhouette of v1. All pure functions of their arguments.
import { palette } from '../../style/palette.ts';
import { range, seeded } from '../../style/seeded.ts';
import { COME_APART_MARGIN, paintComeApart } from '../part2/paintVerse.ts';
import { clamp01, easeInOut, type Rect } from './common.ts';

export { COME_APART_MARGIN };

const scratchCanvases = new Map<string, HTMLCanvasElement>();
const scratch = (key: string, w: number, h: number): CanvasRenderingContext2D => {
  let c = scratchCanvases.get(key);
  if (!c || c.width !== w || c.height !== h) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    scratchCanvases.set(key, c);
  }
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, w, h);
  return ctx;
};

/**
 * The come-apart of part 2; `big` (the strongest hit of the song) throws the slices wider (the whole result is stretched
 * sideways about the figure's centre as it goes) and adds a second burst of yellow pixels.
 */
export const paintApart = (ctx: CanvasRenderingContext2D, cw: number, ch: number, img: HTMLImageElement, p: number, seed: string, big = false): void => {
  if (!big) {
    paintComeApart(ctx, cw, ch, img, p, seed);
    return;
  }
  const t = scratch(`apart-big:${seed}`, cw, ch);
  paintComeApart(t, cw, ch, img, p, seed);
  const sx = 1 + 0.55 * p * p;
  ctx.save();
  ctx.translate(cw / 2, 0);
  ctx.scale(sx, 1);
  ctx.drawImage(t.canvas, -cw / 2, 0);
  ctx.restore();
  if (p <= 0 || p >= 1) return;
  const M = COME_APART_MARGIN;
  const r = seeded(`${seed}:burst`);
  ctx.save();
  ctx.fillStyle = palette.moonYellow;
  for (let i = 0; i < 110; i++) {
    const ts = range(r, 0.05, 0.75);
    const px = M + range(r, -0.2, 1.2) * img.naturalWidth;
    const py = M + r() * img.naturalHeight;
    const vx = range(r, -260, 260);
    const vy = range(r, -220, 140);
    const size = 5 + Math.floor(r() * 12);
    if (p <= ts) continue;
    const u = clamp01((p - ts) / 0.4);
    if (u >= 1) continue;
    const e = 1 - (1 - u) * (1 - u);
    ctx.globalAlpha = clamp01(u / 0.1) * (1 - u) ** 0.7;
    const s = size * (1 - 0.3 * u);
    ctx.fillRect(px + vx * e - s / 2, py + vy * e - s / 2, s, s);
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// Pixel fall: the figure turns into yellow squares that fall into a vertical line at the seam.

interface Cell {
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  d0: number;
  size: number;
  arc: number;
}
const CELL = 11;
const cellCache = new Map<string, Cell[]>();
const planCells = (key: string, img: HTMLImageElement, rect: Rect, seamX: number, colH: number): Cell[] => {
  let cells = cellCache.get(key);
  if (cells) return cells;
  const nx = Math.ceil(rect.w / CELL);
  const ny = Math.ceil(rect.h / CELL);
  const t = scratch(`cells:${key}`, nx, ny);
  t.imageSmoothingEnabled = true;
  t.drawImage(img, 0, 0, nx, ny);
  const data = t.getImageData(0, 0, nx, ny).data;
  const r = seeded(`${key}:cells`);
  cells = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if ((data[(j * nx + i) * 4 + 3] as number) < 8) continue;
      const ox = rect.x + (i + 0.5) * CELL;
      const oy = rect.y + (j + 0.5) * CELL;
      cells.push({
        ox,
        oy,
        tx: seamX + (r() - 0.5) * 24,
        ty: r() * colH,
        d0: 0.34 * (j / ny) + r() * 0.2,
        size: range(r, 5, 11.5),
        arc: range(r, 10, 46),
      });
    }
  }
  cellCache.set(key, cells);
  return cells;
};

export interface PixelFallOpts {
  /** The sprite (full drawing) and its world rect. */
  img: HTMLImageElement;
  rect: Rect;
  /** World rect the canvas covers (1 canvas px = 1 world px). */
  box: Rect;
  /** 0..1: the figure scatters and the squares fall into the line. */
  p: number;
  seamX: number;
  /** Height of the pixel column (world y 0..colH). */
  colH: number;
  /** World y of the pen's front: squares above it have become the seam line and are gone. */
  front: number;
  key: string;
}
export const paintPixelFall = (ctx: CanvasRenderingContext2D, o: PixelFallOpts): void => {
  const cells = planCells(o.key, o.img, o.rect, o.seamX, o.colH);
  const { box, p } = o;
  if (p < 0.6) {
    ctx.drawImage(o.img, o.rect.x - box.x, o.rect.y - box.y, o.rect.w, o.rect.h);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const c of cells) {
      if (p > c.d0) ctx.fillRect(c.ox - box.x - CELL / 2 - 1, c.oy - box.y - CELL / 2 - 1, CELL + 2, CELL + 2);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = palette.moonYellow;
  for (const c of cells) {
    if (p <= c.d0) continue;
    const t = clamp01((p - c.d0) / 0.55);
    const x = c.ox + (c.tx - c.ox) * easeInOut(t);
    const y = c.oy + (c.ty - c.oy) * t * t - Math.sin(Math.PI * t) * c.arc * (1 - t);
    const done = c.ty < o.front;
    const a = done ? clamp01(1 - (o.front - c.ty) / 16) : 1;
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    const s = c.size * (t < 1 ? 1 : 1);
    ctx.fillRect(x - box.x - s / 2, y - box.y - s / 2, s, s);
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// The dotted outline of v1 (the sprite's outline metadata, sprite px).

export const paintDottedOutline = (ctx: CanvasRenderingContext2D, outline: readonly (readonly number[])[], alpha: number): void => {
  if (alpha <= 0 || outline.length < 3) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([0.1, 11]);
  ctx.beginPath();
  outline.forEach((p, i) => (i ? ctx.lineTo(p[0] as number, p[1] as number) : ctx.moveTo(p[0] as number, p[1] as number)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
};

/** A cleared scratch 2D context of the given size (cached per key). */
export const scratchCtx = (key: string, w: number, h: number): CanvasRenderingContext2D => scratch(key, w, h);

let speckleTile: HTMLCanvasElement | null = null;
const speckle = (): HTMLCanvasElement => {
  if (speckleTile) return speckleTile;
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 640;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  const r = seeded('p4:crack-speckle');
  x.fillStyle = '#000';
  for (let i = 0; i < 1500; i++) {
    x.globalAlpha = range(r, 0.55, 1);
    x.beginPath();
    x.arc(r() * 640, r() * 640, range(r, 0.7, 2.8), 0, Math.PI * 2);
    x.fill();
  }
  for (let i = 0; i < 70; i++) {
    x.globalAlpha = range(r, 0.35, 0.8);
    x.beginPath();
    x.arc(r() * 640, r() * 640, range(r, 3, 8), 0, Math.PI * 2);
    x.fill();
  }
  speckleTile = c;
  return c;
};
/** Print texture for the flying crack bands: ink speckle (holes in the ink) fixed in screen space, like the paper grain. */
export const eroded = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = ctx.createPattern(speckle(), 'repeat') as CanvasPattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};
