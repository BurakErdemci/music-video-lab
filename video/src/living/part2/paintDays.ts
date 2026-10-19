import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { TEXT_FONT } from '../../style/fonts.ts';
import { paintSky } from '../life.ts';

type Ctx = CanvasRenderingContext2D;
type Rnd = () => number;

/** Misregistration of the yellow plate against the navy/cream key plate (same as the sun in life.ts). */
const PLATE_DX = 2.5;
const PLATE_DY = -2;
const CREAM_RGB = '243,239,228';
const YELLOW_RGB = '240,211,90';
const NAVY_RGB = '24,32,58';

// ---------------------------------------------------------------------------------------------------------------
// Tally marks
// ---------------------------------------------------------------------------------------------------------------

export const TALLY_CANVAS = { w: 1024, h: 640 } as const;

/**
 * One silk-screen ink stroke: the line is cut into short segments with width noise, a few dry gaps, and two thin
 * bristle streaks along it. Everything comes from `rnd`, so the same stroke always has the same pixels.
 */
const dryStroke = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, rnd: Rnd, rgb: string, alpha: number): void => {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(3, Math.ceil(len / 6));
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  ctx.lineCap = 'round';
  let off = 0;
  let px = x0;
  let py = y0;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    off = off * 0.55 + (rnd() - 0.5) * w * 0.3;
    const x = x0 + (x1 - x0) * t + nx * off;
    const y = y0 + (y1 - y0) * t + ny * off;
    const edge = Math.min(1, t * 7, (1 - t) * 7 + 0.15);
    const gap = k > 1 && k < n && rnd() < 0.07;
    const wk = w * (0.5 + 0.5 * edge) * (0.72 + 0.5 * rnd());
    const a = alpha * (0.72 + 0.28 * rnd());
    if (!gap) {
      ctx.strokeStyle = `rgba(${rgb},${a.toFixed(3)})`;
      ctx.lineWidth = wk;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    px = x;
    py = y;
  }
  // bristle streaks: thin, broken, slightly offset
  for (const side of [-0.28, 0.3]) {
    ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.55).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.6, w * 0.13);
    const m = Math.ceil(len / 12);
    for (let k = 0; k < m; k++) {
      if (rnd() < 0.38) continue;
      const t0 = k / m;
      const t1 = Math.min(1, t0 + (0.6 + 0.4 * rnd()) / m);
      const o = side * w + (rnd() - 0.5) * w * 0.1;
      ctx.beginPath();
      ctx.moveTo(x0 + (x1 - x0) * t0 + nx * o, y0 + (y1 - y0) * t0 + ny * o);
      ctx.lineTo(x0 + (x1 - x0) * t1 + nx * o, y0 + (y1 - y0) * t1 + ny * o);
      ctx.stroke();
    }
  }
};

interface TallyLayer {
  s: number;
  rot: number;
  alpha: number;
  strokes: number;
  scatter: boolean;
}

const BASE_GROUPS = 15; // 5 columns x 3 rows = 75 strokes before the wall is full

/** Layer 0 is the tidy grid; every later layer is a smaller, rotated, fainter scatter of loose strokes over the wall. */
const tallyLayer = (l: number, seed: string): TallyLayer => {
  if (l === 0) return { s: 1, rot: 0, alpha: 1, strokes: BASE_GROUPS * 5, scatter: false };
  const rot = (seeded(`${seed}:tally:rot:${l}`)() - 0.5) * 1.0;
  const s = Math.max(0.4, [0.85, 0.7, 0.55][l - 1] ?? 0.4);
  const strokes = [150, 250, 350][l - 1] ?? 450;
  return { s, rot, alpha: Math.max(0.35, 0.7 * Math.pow(0.88, l - 1)), strokes, scatter: true };
};

const frac = (x: number): number => x - Math.floor(x);

export const paintTally = (ctx: Ctx, cw: number, ch: number, count: number, seed: string): void => {
  ctx.clearRect(0, 0, cw, ch);
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return;
  const k = cw / TALLY_CANVAS.w;
  ctx.save();
  ctx.scale(k, k);
  let left = n;
  let base = 0;
  for (let l = 0; left > 0; l++) {
    const L = tallyLayer(l, seed);
    const here = Math.min(left, L.strokes);
    const ph = seeded(`${seed}:tally:phase:${l}`)();
    ctx.save();
    ctx.translate(TALLY_CANVAS.w / 2, TALLY_CANVAS.h / 2);
    ctx.rotate(L.rot);
    for (let q = 0; q < here; q++) {
      const i = base + q;
      const kk = q % 5;
      const s = L.s;
      const r = seeded(`${seed}:tally:s:${i}`);
      const ry = seeded(`${seed}:tally:y:${i}`);
      let x0: number;
      let y0: number;
      let x1: number;
      let y1: number;
      let w: number;
      if (L.scatter) {
        // loose strokes on a low-discrepancy sequence: evenly spread at any count, never moving earlier ones
        const cx = (frac(ph + q * 0.7548776662) - 0.5) * TALLY_CANVAS.w * 1.2 + (r() - 0.5) * 30;
        const cy = (frac(ph * 1.7 + q * 0.569840291) - 0.5) * TALLY_CANVAS.h * 1.2 + (r() - 0.5) * 30;
        const ang = (kk === 4 ? 0.9 : 0) + (r() - 0.5) * 0.7;
        const len = 100 * s * (0.85 + 0.3 * r());
        x0 = cx - Math.sin(ang) * len * 0.5;
        y0 = cy - Math.cos(ang) * len * 0.5;
        x1 = cx + Math.sin(ang) * len * 0.5;
        y1 = cy + Math.cos(ang) * len * 0.5;
        w = (6 + 1.8 * r()) * Math.max(0.8, s);
      } else {
        const g = Math.floor(q / 5);
        const gRnd = seeded(`${seed}:tally:g:${l}:${g}`);
        // group origin (top-left of the group) on the 5 x 3 grid, with a hand jitter
        const gx = ((g % 5) - 2) * 185 + (gRnd() - 0.5) * 26 - 35;
        const gy = (Math.floor(g / 5) - 1) * 170 + (gRnd() - 0.5) * 22 - 40;
        const gSlant = (gRnd() - 0.5) * 0.09;
        if (kk < 4) {
          const len = 80 * (0.9 + 0.2 * r());
          const slant = gSlant + (r() - 0.5) * 0.07;
          const xc = gx + kk * 17.5 + (r() - 0.5) * 4;
          const yc = gy + 40 + (r() - 0.5) * 5;
          x0 = xc - Math.sin(slant) * len * 0.5;
          y0 = yc - Math.cos(slant) * len * 0.5;
          x1 = xc + Math.sin(slant) * len * 0.5;
          y1 = yc + Math.cos(slant) * len * 0.5;
        } else {
          // the fifth stroke runs from low left to high right across the four
          x0 = gx - (9 + 4 * r());
          y0 = gy + 66 + 10 * r();
          x1 = gx + 62 + 9 * r();
          y1 = gy + 10 - 8 * r();
        }
        w = 5.2 + 1.6 * r();
      }
      dryStroke(ctx, x0 + PLATE_DX, y0 + PLATE_DY, x1 + PLATE_DX, y1 + PLATE_DY, w * 1.05, ry, YELLOW_RGB, 0.42 * L.alpha);
      dryStroke(ctx, x0, y0, x1, y1, w, r, CREAM_RGB, 0.92 * L.alpha);
    }
    ctx.restore();
    left -= here;
    base += here;
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// Mug towers
// ---------------------------------------------------------------------------------------------------------------

export const MUG_CANVAS = { w: 600, h: 900 } as const;

const MUGS_PER_TOWER = 11;
const MAX_TOWERS = 5;
const MUG_STEP = 44;
const TOWER_PITCH = 112;

const paintMug = (ctx: Ctx, x: number, y: number, tilt: number, bandKind: number, bandAt: number): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // handle first, so the body overlaps its roots
  ctx.beginPath();
  ctx.moveTo(26, -47);
  ctx.bezierCurveTo(44, -47, 44, -16, 25, -14);
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = palette.cream;
  ctx.lineWidth = 3;
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.moveTo(-28, -56);
  ctx.lineTo(-25, -7);
  ctx.quadraticCurveTo(-23, 0, -15, 0);
  ctx.lineTo(15, 0);
  ctx.quadraticCurveTo(23, 0, 25, -7);
  ctx.lineTo(28, -56);
  ctx.closePath();
  ctx.fillStyle = palette.cream;
  ctx.fill();
  if (bandKind > 0) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = palette.moonYellow;
    ctx.fillRect(-30 + PLATE_DX, bandAt + PLATE_DY, 60, bandKind === 1 ? 9 : 5);
    ctx.restore();
  }
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 3;
  ctx.stroke();
  // rim: a cream lip with a navy sliver of the inside
  ctx.beginPath();
  ctx.ellipse(0, -56, 28, 6.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.cream;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -55.2, 23.5, 3.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.navy;
  ctx.fill();
  ctx.restore();
};

export const paintMugTower = (ctx: Ctx, cw: number, ch: number, count: number, seed: string): void => {
  ctx.clearRect(0, 0, cw, ch);
  const n = Math.min(MUGS_PER_TOWER * MAX_TOWERS, Math.max(0, Math.floor(count)));
  if (n === 0) return;
  const k = cw / MUG_CANVAS.w;
  ctx.save();
  ctx.scale(k, k);
  const H = MUG_CANVAS.h;
  const W = MUG_CANVAS.w;
  const towers = Math.ceil(n / MUGS_PER_TOWER);
  // towers grow to the left; the newest mug of each tower is drawn last, towers right to left
  for (let t = 0; t < towers; t++) {
    const tr = seeded(`${seed}:mug:tower:${t}`);
    const cx = W - 96 - t * TOWER_PITCH + (tr() - 0.5) * 10;
    const inTower = Math.min(MUGS_PER_TOWER, n - t * MUGS_PER_TOWER);
    for (let p = 0; p < inTower; p++) {
      const r = seeded(`${seed}:mug:${t * MUGS_PER_TOWER + p}`);
      const wob = 0.35 + (p / (MUGS_PER_TOWER - 1)) * 0.95;
      const tilt = ((r() - 0.5) * 2 * 4 * wob * Math.PI) / 180;
      const dx = (r() - 0.5) * 2 * (0.8 + p * 0.85);
      const dy = (r() - 0.5) * 2.4;
      const bandKind = r() < 0.4 ? (r() < 0.5 ? 1 : 2) : 0;
      const bandAt = -44 + r() * 14;
      paintMug(ctx, cx + dx - 7, H - 3 - p * MUG_STEP + dy, tilt, bandKind, bandAt);
    }
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// Window sky
// ---------------------------------------------------------------------------------------------------------------

const NIGHT_ROOF = '#232c4d';

export const paintWindowSky = (ctx: Ctx, cw: number, ch: number, night: boolean, seed: string): void => {
  if (!night) {
    paintSky(ctx, cw, ch, 0, 1, { sunR: 0.075, dotStep: 0.009 });
    return;
  }
  const m = Math.min(cw, ch);
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, 0, cw, ch);
  const sx = cw * 0.56;
  const sy = ch * 0.38;
  const R = 0.075 * m;
  // stars, kept clear of the moon
  const sr = seeded(`${seed}:night:stars`);
  for (let i = 0; i < 34; i++) {
    const x = sr() * cw;
    const y = sr() * ch * 0.62;
    const size = (1.2 + sr() * 2.2) * (m / 900);
    const cross = sr() < 0.35;
    const a = 0.55 + 0.45 * sr();
    if (Math.hypot(x - sx, y - sy) < R * 2.1) continue;
    ctx.fillStyle = `rgba(${CREAM_RGB},${a.toFixed(2)})`;
    ctx.strokeStyle = ctx.fillStyle;
    if (cross) {
      ctx.lineWidth = Math.max(1, size * 0.45);
      ctx.beginPath();
      ctx.moveTo(x - size * 2.2, y);
      ctx.lineTo(x + size * 2.2, y);
      ctx.moveTo(x, y - size * 2.2);
      ctx.lineTo(x, y + size * 2.2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // crescent: both plates are the full disc minus a "bite" circle; the yellow plate is misregistered
  const bx = sx + R * 0.48;
  const by = sy - R * 0.2;
  const br = R * 0.86;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.clip('evenodd');
  ctx.fillStyle = palette.moonYellow;
  ctx.beginPath();
  ctx.arc(sx + PLATE_DX, sy + PLATE_DY, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${CREAM_RGB},0.85)`;
  ctx.lineWidth = Math.max(1.2, m * 0.003);
  ctx.beginPath();
  ctx.arc(sx, sy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // roofs: the same rolls as paintSky, in a lighter navy with a cream rim line
  const rr = seeded('sky:roofs');
  const pts: [number, number][] = [[0, ch]];
  const blds: { x: number; w: number; top: number }[] = [];
  const chimneys: [number, number, number][] = [];
  let x = 0;
  while (x < cw) {
    const bw = cw * (0.06 + rr() * 0.07);
    const top = ch * (0.72 + rr() * 0.12);
    const kind = rr();
    pts.push([x, top]);
    if (kind < 0.35) {
      pts.push([x + bw * 0.5, top - ch * 0.05]);
      pts.push([x + bw, top]);
    } else {
      pts.push([x + bw, top]);
    }
    if (kind > 0.55) chimneys.push([x + bw * (0.2 + rr() * 0.4), top, bw * 0.12]);
    blds.push({ x, w: bw, top });
    x += bw;
  }
  pts.push([cw, ch]);
  ctx.fillStyle = NIGHT_ROOF;
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.fill();
  for (const [cx, top, cwid] of chimneys) ctx.fillRect(cx, top - ch * 0.05, cwid, ch * 0.06);
  ctx.strokeStyle = `rgba(${CREAM_RGB},0.8)`;
  ctx.lineWidth = Math.max(1.5, m * 0.0028);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.slice(1, -1).forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.stroke();
  for (const [cx, top, cwid] of chimneys) {
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top - ch * 0.05);
    ctx.lineTo(cx + cwid, top - ch * 0.05);
    ctx.lineTo(cx + cwid, top);
    ctx.stroke();
  }
  // a few lit windows (yellow plate misregistered against a navy frame)
  const wr = seeded(`${seed}:night:win`);
  const lit = 3 + Math.floor(wr() * 3);
  const order = blds.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(wr() * (i + 1));
    const t = order[i] as number;
    order[i] = order[j] as number;
    order[j] = t;
  }
  const ww = m * 0.016;
  const wh = m * 0.022;
  for (let i = 0; i < Math.min(lit, blds.length); i++) {
    const b = blds[order[i] as number] as { x: number; w: number; top: number };
    const wx = b.x + b.w * (0.2 + 0.45 * wr());
    const wy = b.top + ch * (0.035 + 0.05 * wr());
    ctx.fillStyle = palette.navy;
    ctx.fillRect(wx - 1.5, wy - 1.5, ww + 3, wh + 3);
    ctx.fillStyle = palette.moonYellow;
    ctx.fillRect(wx + 1.2, wy - 1, ww, wh);
  }
};

// ---------------------------------------------------------------------------------------------------------------
// Notes on the man's body
// ---------------------------------------------------------------------------------------------------------------

interface BodySpots {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  spots: [number, number][];
}

const spotCache = new Map<string, BodySpots>();

const bodySpots = (img: HTMLImageElement): BodySpots => {
  const hit = spotCache.get(img.src);
  if (hit) return hit;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, w, h).data;
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((d[(y * w + x) * 4 + 3] as number) > 200) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const bh = Math.max(1, y1 - y0);
  const step = Math.max(3, Math.round(bh / 90));
  const reach = Math.max(2, Math.round(bh * 0.028));
  const solid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && (d[(y * w + x) * 4 + 3] as number) > 200;
  const spots: [number, number][] = [];
  for (let y = Math.ceil(y0 + bh * 0.22); y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const o = (y * w + x) * 4;
      if ((d[o + 3] as number) <= 200) continue;
      const luma = 0.299 * (d[o] as number) + 0.587 * (d[o + 1] as number) + 0.114 * (d[o + 2] as number);
      if (luma >= 70) continue;
      if (!(solid(x - reach, y) && solid(x + reach, y) && solid(x, y - reach) && solid(x, y + reach))) continue;
      spots.push([x, y]);
    }
  }
  const res = { bbox: { x0, y0, x1, y1 }, spots };
  spotCache.set(img.src, res);
  return res;
};

const paintStickyNote = (ctx: Ctx, x: number, y: number, rot: number, s: number, seed: string): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = `rgba(${NAVY_RGB},0.3)`;
  ctx.fillRect(-s / 2 + 2, -s / 2 + 3, s, s);
  ctx.fillStyle = palette.moonYellow;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 2;
  const r = seeded(seed);
  for (let i = 0; i < 3; i++) {
    const yy = -s * 0.22 + i * s * 0.18;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, yy);
    for (let k = 1; k <= 5; k++) ctx.lineTo(-s * 0.3 + (k * s * (0.5 - (i === 2 ? 0.2 : 0))) / 5, yy + (r() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.restore();
};

export const paintBodyNotes = (ctx: Ctx, cw: number, ch: number, img: HTMLImageElement, count: number, seed: string): void => {
  ctx.clearRect(0, 0, cw, ch);
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return;
  const { bbox, spots } = bodySpots(img);
  if (spots.length === 0) return;
  const sx = cw / img.naturalWidth;
  const sy = ch / img.naturalHeight;
  const size = (bbox.y1 - bbox.y0) * 0.07;
  // Farthest-point order: note i depends only on notes before it, so more notes never move the earlier ones.
  const r = seeded(`${seed}:bnotes:pick`);
  const chosen: number[] = [Math.floor(r() * spots.length)];
  const minD = spots.map(([x, y]) => {
    const [cx, cy] = spots[chosen[0] as number] as [number, number];
    return Math.hypot(x - cx, y - cy);
  });
  while (chosen.length < n) {
    let best = -1;
    let bestScore = -1;
    for (let j = 0; j < spots.length; j++) {
      const score = (minD[j] as number) * (0.85 + 0.3 * r());
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    }
    chosen.push(best);
    const [cx, cy] = spots[best] as [number, number];
    for (let j = 0; j < spots.length; j++) {
      const [x, y] = spots[j] as [number, number];
      const dd = Math.hypot(x - cx, y - cy);
      if (dd < (minD[j] as number)) minD[j] = dd;
    }
  }
  for (let i = 0; i < n; i++) {
    const nr = seeded(`${seed}:bnotes:${i}`);
    const [x, y] = spots[chosen[i] as number] as [number, number];
    const rot = ((nr() - 0.5) * 50 * Math.PI) / 180;
    const s = size * (0.92 + 0.16 * nr());
    ctx.save();
    ctx.scale(sx, sy);
    paintStickyNote(ctx, x, y, rot, s, `${seed}:bnotes:scribble:${i}`);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0, cw, ch);
  ctx.globalCompositeOperation = 'source-over';
};

// ---------------------------------------------------------------------------------------------------------------
// His monitor
// ---------------------------------------------------------------------------------------------------------------

const paintScreenBase = (ctx: Ctx, cw: number, ch: number): void => {
  ctx.fillStyle = palette.cream;
  ctx.fillRect(0, 0, cw, ch);
};

export const paintMonitorBlank = (ctx: Ctx, cw: number, ch: number): void => {
  paintScreenBase(ctx, cw, ch);
  ctx.fillStyle = palette.navy;
  ctx.fillRect(cw / 2 - ch * 0.014, ch / 2 - ch * 0.06, ch * 0.028, ch * 0.12);
};

export const paintMonitorScreen = (ctx: Ctx, cw: number, ch: number, aiImg: HTMLImageElement, flash: number): void => {
  paintScreenBase(ctx, cw, ch);
  const floorY = ch * 0.88;
  const ah = ch * 0.7;
  const aw = ah * (aiImg.naturalWidth / aiImg.naturalHeight);
  const ax = cw * 0.62;
  ctx.drawImage(aiImg, ax - aw / 2, floorY - ah, aw, ah);
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = Math.max(2, ch * 0.006);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cw * 0.1, floorY);
  ctx.lineTo(cw * 0.94, floorY);
  ctx.stroke();

  // speech bubble to her left, tail pointing at her head
  const fs = ch * 0.1;
  ctx.font = `500 ${fs}px "${TEXT_FONT}"`;
  const tw = ctx.measureText('Merhaba').width;
  const bw = tw + fs * 1.5;
  const bh = fs * 2;
  const bx = cw * 0.06;
  const by = ch * 0.18;
  const apexX = ax - aw * 0.78;
  const apexY = floorY - ah * 0.9;
  const bubble = (ox: number, oy: number): void => {
    ctx.beginPath();
    ctx.roundRect(bx + ox, by + oy, bw, bh, bh * 0.3);
    ctx.moveTo(bx + bw + ox, by + bh * 0.3 + oy);
    ctx.lineTo(apexX + ox, apexY + oy);
    ctx.lineTo(bx + bw + ox, by + bh * 0.72 + oy);
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  ctx.fillStyle = palette.moonYellow;
  bubble(PLATE_DX * 2, PLATE_DY * 2);
  ctx.fill();
  ctx.fillStyle = palette.cream;
  bubble(0, 0);
  ctx.fill();
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 3;
  // outline of the union: stroke the bubble, then cover the seam where the tail joins its edge
  ctx.stroke();
  ctx.fillStyle = palette.cream;
  ctx.fillRect(bx + bw - 2, by + bh * 0.3 + 3, 5, bh * 0.42 - 6);
  ctx.fillStyle = palette.navy;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('Merhaba', bx + bw / 2, by + bh / 2 + fs * 0.04);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';

  const f = Math.min(1, Math.max(0, flash));
  if (f > 0) {
    ctx.fillStyle = `rgba(255,255,255,${f.toFixed(4)})`;
    ctx.fillRect(0, 0, cw, ch);
  }
};
