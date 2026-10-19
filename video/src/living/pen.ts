// An invisible pen draws the AI: navy outline first, then the flat sprite is inked in behind a wavy front.
import { palette } from '../style/palette.ts';
import { seeded } from '../style/seeded.ts';

export interface PenOpts {
  /** Closed outline polyline in sprite px, starting at the top of the head. */
  outline: readonly (readonly [number, number])[];
  /** 0..1 of the outline's arc length that is stroked. */
  line: number;
  /** 0..1 reveal of the sprite from top to bottom. */
  fill: number;
  /** Stroke width in px. */
  stroke: number;
}

const SOFT = 8;
const WAVE = 12;

let scratch: HTMLCanvasElement | null = null;
let scratchKey = '';
const getScratch = (w: number, h: number): HTMLCanvasElement => {
  const key = `${w}x${h}`;
  if (!scratch || scratchKey !== key) {
    scratch = document.createElement('canvas');
    scratch.width = w;
    scratch.height = h;
    scratchKey = key;
  }
  return scratch;
};

const lattice = (() => {
  const r = seeded('pen:wave');
  return Array.from({ length: 512 }, () => r() * 2 - 1);
})();
const wave = (x: number): number => {
  const i = Math.floor(x);
  const f = x - i;
  const a = lattice[((i % 512) + 512) % 512] as number;
  const b = lattice[(((i + 1) % 512) + 512) % 512] as number;
  return a + (b - a) * f * f * (3 - 2 * f);
};

/** Mask of the revealed part: opaque above a wavy front, falling off over SOFT px below it. */
const revealed = (img: HTMLImageElement, cw: number, ch: number, fill: number): HTMLCanvasElement => {
  const tmp = getScratch(cw, ch);
  const tctx = tmp.getContext('2d') as CanvasRenderingContext2D;
  tctx.globalCompositeOperation = 'source-over';
  tctx.clearRect(0, 0, cw, ch);
  const travel = ch + SOFT + 2 * WAVE;
  const base = -WAVE - SOFT + fill * travel;
  const COL = 2;
  for (let x = 0; x < cw; x += COL) {
    const front = base + WAVE * (0.65 * wave(x / 38) + 0.35 * wave(x / 11 + 90));
    const g = tctx.createLinearGradient(0, front - SOFT, 0, front);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.fillStyle = g;
    tctx.fillRect(x, front - SOFT, COL, SOFT);
    if (front - SOFT > 0) {
      tctx.fillStyle = '#000';
      tctx.fillRect(x, 0, COL, front - SOFT);
    }
  }
  tctx.globalCompositeOperation = 'source-in';
  tctx.drawImage(img, 0, 0);
  tctx.globalCompositeOperation = 'source-over';
  return tmp;
};

export const paintPenReveal = (ctx: CanvasRenderingContext2D, cw: number, ch: number, img: HTMLImageElement, o: PenOpts): void => {
  ctx.clearRect(0, 0, cw, ch);
  if (o.fill >= 1 && o.line >= 1) {
    ctx.drawImage(img, 0, 0);
    return;
  }
  if (o.fill > 0) ctx.drawImage(o.fill >= 1 ? img : revealed(img, cw, ch, o.fill), 0, 0);
  const alpha = 1 - Math.min(1, Math.max(0, o.fill));
  const pts = o.outline;
  if (alpha <= 0 || o.line <= 0 || pts.length < 2) return;
  const n = pts.length;
  const segLen: number[] = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i] as readonly [number, number];
    const b = pts[(i + 1) % n] as readonly [number, number];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLen.push(l);
    total += l;
  }
  const target = Math.min(1, o.line) * total;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = palette.navy;
  ctx.fillStyle = palette.navy;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let acc = 0;
  let tip: readonly [number, number] = pts[0] as readonly [number, number];
  for (let i = 0; i < n && acc < target; i++) {
    const a = pts[i] as readonly [number, number];
    const b = pts[(i + 1) % n] as readonly [number, number];
    const l = segLen[i] as number;
    const k = l > 0 ? Math.min(1, (target - acc) / l) : 1;
    const ex = a[0] + (b[0] - a[0]) * k;
    const ey = a[1] + (b[1] - a[1]) * k;
    ctx.lineWidth = o.stroke * (0.85 + 0.3 * (0.5 + 0.5 * wave(i / 9 + 300)));
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    tip = [ex, ey];
    acc += l;
  }
  if (o.line < 1) {
    ctx.beginPath();
    ctx.arc(tip[0], tip[1], o.stroke * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};
