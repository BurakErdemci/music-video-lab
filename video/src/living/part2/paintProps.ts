// Part 2 props, frame-pure 2D painters in the silk-screen print look: cardboard boxes with lamps, the torch beam,
// the glass wall with sticky notes, and the split moon. Randomness only through seeded().
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';

type Ctx = CanvasRenderingContext2D;
type Pt = readonly [number, number];

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const ease = (x: number): number => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
const NAVY = palette.navy;
const CREAM = palette.cream;
const YELLOW = palette.moonYellow;

const poly = (ctx: Ctx, pts: readonly Pt[]): void => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
};

// ---- boxes

export const BOX_CANVAS = { w: 2400, h: 900 };
const BOX_W = 340;
const BOX_H = 260;
const BOX_FLOOR = 20;
/** Oblique depth vector of the boxes (side and top faces). */
const DEPTH: Pt = [62, -74];
const LAMP_Y = 330;

export const boxGeom = (i: number, n: number): { x: number; top: number; w: number; h: number; lamp: [number, number] } => {
  const cell = BOX_CANVAS.w / n;
  const x = cell * (i + 0.5) - BOX_W / 2 - DEPTH[0] / 2;
  return { x, top: BOX_CANVAS.h - BOX_FLOOR - BOX_H, w: BOX_W, h: BOX_H, lamp: [x + BOX_W / 2, LAMP_Y] };
};

const ink = (ctx: Ctx, w = 3): void => {
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
};

const hatch = (ctx: Ctx, pts: readonly Pt[], pitch: number, w: number): void => {
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  ctx.beginPath();
  for (let k = x0 - (y1 - y0); k < x1; k += pitch) {
    ctx.moveTo(k, y1);
    ctx.lineTo(k + (y1 - y0), y0);
  }
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
};

const FLAP_LEN = 92;
const SIDE_FLAP = 92;
const FLAP_MAX = 2.5;

/** One flap: hinge a->b, free edge pushed by v. Outer face cream; once past vertical the inner face shows (yellow tint + hatch). */
const flap = (ctx: Ctx, a: Pt, b: Pt, v: Pt, inner: boolean, j: (n: number) => number): void => {
  const pts: Pt[] = [a, b, [b[0] + v[0] + j(2.5), b[1] + v[1] + j(2.5)], [a[0] + v[0] + j(2.5), a[1] + v[1] + j(2.5)]];
  poly(ctx, pts);
  ctx.fillStyle = CREAM;
  ctx.fill();
  if (inner) {
    ctx.fillStyle = 'rgba(240,211,90,0.5)';
    ctx.fill();
    hatch(ctx, pts, 11, 1.4);
  }
  poly(ctx, pts);
  ink(ctx);
};

const paintBox = (ctx: Ctx, g: ReturnType<typeof boxGeom>, u: number, seed: string): void => {
  const r = seeded(seed);
  const j = (n: number): number => (r() - 0.5) * 2 * n;
  const { x, top, w, h } = g;
  const [dx, dy] = DEPTH;
  const fl: Pt = [x, top];
  const fr: Pt = [x + w, top];
  const bl: Pt = [x + dx, top + dy];
  const br: Pt = [x + w + dx, top + dy];
  const floorY = top + h;
  // ground shadow
  ctx.fillStyle = 'rgba(24,32,58,0.55)';
  poly(ctx, [[x + w, floorY], [x + w + dx + 40, floorY + dy + 6], [x + w + dx + 48, floorY + dy + 10], [x + w, floorY + 8]]);
  ctx.fill();
  // right side: cream with navy hatching
  const side: Pt[] = [fr, br, [br[0], br[1] + h], [fr[0], floorY]];
  poly(ctx, side);
  ctx.fillStyle = CREAM;
  ctx.fill();
  hatch(ctx, side, 7, 2.2);
  poly(ctx, side);
  ink(ctx);
  // front face
  const front: Pt[] = [fl, fr, [fr[0], floorY], [x, floorY]];
  poly(ctx, front);
  ctx.fillStyle = CREAM;
  ctx.fill();
  // a light ink wash along the bottom edge and a hand-hole
  hatch(ctx, [[x, floorY - 26], [fr[0], floorY - 26], [fr[0], floorY], [x, floorY]], 9, 1.3);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, top + 70, 44, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = NAVY;
  ctx.fill();
  poly(ctx, front);
  ink(ctx);
  // interior (only once the flaps lift): dark navy, nothing in it
  if (u > 0.02) {
    const open: Pt[] = [fl, fr, br, bl];
    ctx.save();
    poly(ctx, open);
    ctx.clip();
    ctx.fillStyle = '#0d1226';
    ctx.fillRect(x - 5, top - 90, w + 90, 130);
    ctx.fillStyle = '#1b2442';
    poly(ctx, [bl, br, [br[0], br[1] + 46], [bl[0], bl[1] + 46]]);
    ctx.fill();
    poly(ctx, [fl, bl, [bl[0] - 2, bl[1] + 90], [fl[0], fl[1] + 90]]);
    ctx.fillStyle = '#141b34';
    ctx.fill();
    ctx.restore();
    poly(ctx, open);
    ink(ctx);
  }
  const se = ease(clamp01(u * 1.7)) * FLAP_MAX;
  const fe = ease(u) * FLAP_MAX;
  const ffe = ease(u) * 2.85;
  if (u > 0.02) {
    // side flaps lift first so they are out of the way of the long ones
    const ls = Math.sin(se) * -SIDE_FLAP;
    flap(ctx, fl, bl, [Math.cos(se) * SIDE_FLAP, ls], se > Math.PI / 2, j);
    flap(ctx, fr, br, [-Math.cos(se) * SIDE_FLAP, ls], se > Math.PI / 2, j);
  }
  // back flap, then front flap (nearest, drawn last)
  flap(ctx, bl, br, [-dx * 0.5 * Math.cos(fe), -dy * 0.5 * Math.cos(fe) - FLAP_LEN * Math.sin(fe)], fe > Math.PI / 2, j);
  flap(ctx, fl, fr, [dx * 0.5 * Math.cos(ffe), dy * 0.5 * Math.cos(ffe) - FLAP_LEN * Math.sin(ffe)], ffe > Math.PI / 2, j);
  if (u <= 0.02) {
    // tape along the closed seam
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5 + dx * 0.5, top + dy * 0.5);
    ctx.lineTo(x + w * 0.5, top);
    ctx.lineTo(x + w * 0.5 - 3, top + 24);
    ctx.strokeStyle = 'rgba(24,32,58,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

const paintLamp = (ctx: Ctx, bx: number, by: number, on: number): void => {
  const a = clamp01(on);
  const shadeTop = by - 48;
  // wire from the canvas top
  ctx.beginPath();
  ctx.moveTo(bx, -10);
  ctx.lineTo(bx, shadeTop - 8);
  ink(ctx, 2.5);
  if (a > 0) {
    const gl = ctx.createRadialGradient(bx, by, 6, bx, by, 150);
    gl.addColorStop(0, `rgba(201,217,74,${0.42 * a})`);
    gl.addColorStop(0.45, `rgba(201,217,74,${0.16 * a})`);
    gl.addColorStop(1, 'rgba(201,217,74,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(bx - 160, by - 160, 320, 320);
  }
  // cap
  ctx.fillStyle = NAVY;
  ctx.fillRect(bx - 8, shadeTop - 12, 16, 12);
  // bulb (behind the shade lip)
  ctx.beginPath();
  ctx.arc(bx, by + 2, 15, 0, Math.PI * 2);
  ctx.fillStyle = CREAM;
  ctx.fill();
  if (a > 0) {
    ctx.globalAlpha = a;
    ctx.fillStyle = palette.lampGreen;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ink(ctx, 2.5);
  // dome shade
  ctx.beginPath();
  ctx.moveTo(bx - 50, by - 10);
  ctx.bezierCurveTo(bx - 50, by - 44, bx - 24, shadeTop, bx, shadeTop);
  ctx.bezierCurveTo(bx + 24, shadeTop, bx + 50, by - 44, bx + 50, by - 10);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  if (a > 0) {
    ctx.globalAlpha = a;
    ctx.fillStyle = palette.lampGreen;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ink(ctx);
  ctx.beginPath();
  ctx.moveTo(bx - 56, by - 10);
  ctx.lineTo(bx + 56, by - 10);
  ink(ctx, 5);
  // shine arc on the shade
  ctx.beginPath();
  ctx.arc(bx, by - 8, 32, Math.PI * 1.08, Math.PI * 1.36);
  ctx.strokeStyle = a > 0 ? CREAM : NAVY;
  ctx.lineWidth = 3;
  ctx.globalAlpha = a > 0 ? 0.8 * a : 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // radiating ticks
  if (a > 0) {
    ctx.globalAlpha = a;
    for (let k = 0; k < 5; k++) {
      const ang = Math.PI * (0.22 + 0.14 * k);
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(ang) * 32, by + 4 + Math.sin(ang) * 32);
      ctx.lineTo(bx + Math.cos(ang) * (46 + (k % 2) * 8), by + 4 + Math.sin(ang) * (46 + (k % 2) * 8));
      ink(ctx, 2.5);
    }
    ctx.globalAlpha = 1;
  }
};

/** A row of n cardboard boxes (lids closed until box i opens at progress open - i) with lamps hanging above. Transparent background. */
export const paintBoxes = (ctx: Ctx, cw: number, ch: number, o: { n: number; lit: number; open: number; seed: string }): void => {
  ctx.save();
  ctx.scale(cw / BOX_CANVAS.w, ch / BOX_CANVAS.h);
  for (let i = 0; i < o.n; i++) {
    const g = boxGeom(i, o.n);
    paintLamp(ctx, g.lamp[0], g.lamp[1], clamp01(o.lit - i));
  }
  for (let i = 0; i < o.n; i++) paintBox(ctx, boxGeom(i, o.n), clamp01(o.open - i), `${o.seed}:box:${i}`);
  ctx.restore();
};

// ---- torch

type Layer = HTMLCanvasElement | OffscreenCanvas;
const layers = new Map<string, Layer>();
const layerOf = (w: number, h: number): Layer => {
  const key = `${w}x${h}`;
  let c = layers.get(key);
  if (!c) {
    if (typeof OffscreenCanvas !== 'undefined') c = new OffscreenCanvas(w, h);
    else {
      c = document.createElement('canvas');
      c.width = w;
      c.height = h;
    }
    layers.set(key, c);
  }
  return c;
};

const GRID = 13;

/**
 * Full-screen torch overlay. `dark` washes the frame navy-black except in the beam and the light circle; the beam is a
 * moon-yellow halftone cone from the lens to a circle of radius r at target. The dot grid is fixed in screen space.
 * At r <= ~12 only a solid dot is left.
 */
export const paintTorchLight = (
  ctx: Ctx,
  cw: number,
  ch: number,
  o: { lens: [number, number]; target: [number, number]; r: number; on: number; dark: number; seed: string },
): void => {
  const on = clamp01(o.on);
  const [lx, ly] = o.lens;
  const [tx, ty] = o.target;
  const r = o.r;
  const solid = clamp01((24 - r) / 12); // 0 at r>=24 .. 1 at r<=12: the beam gives way to one dot
  const beamA = on * (1 - solid);
  if (o.dark > 0) {
    const lay = layerOf(cw, ch);
    const lc = lay.getContext('2d') as Ctx;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, cw, ch);
    lc.fillStyle = '#0b0f1e';
    lc.globalAlpha = clamp01(o.dark);
    lc.fillRect(0, 0, cw, ch);
    lc.globalAlpha = 1;
    lc.globalCompositeOperation = 'destination-out';
    const d0 = Math.hypot(tx - lx, ty - ly) || 1;
    const nx = -(ty - ly) / d0;
    const ny = (tx - lx) / d0;
    const feather = Math.max(6, r * 0.22);
    lc.save();
    lc.filter = `blur(${feather}px)`;
    lc.globalAlpha = beamA;
    lc.beginPath();
    lc.moveTo(lx, ly);
    lc.lineTo(tx + nx * r, ty + ny * r);
    lc.lineTo(tx - nx * r, ty - ny * r);
    lc.closePath();
    lc.fillStyle = '#000';
    lc.fill();
    lc.globalAlpha = on;
    lc.beginPath();
    lc.arc(tx, ty, Math.max(r, 26 * solid + r * (1 - solid)) * (1 + 0.1 * solid), 0, Math.PI * 2);
    lc.fill();
    lc.restore();
    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(lay as CanvasImageSource, 0, 0);
  }
  if (solid >= 1 || (on > 0 && r < 24)) {
    ctx.beginPath();
    ctx.arc(tx, ty, Math.max(1, r), 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.globalAlpha = Math.max(on, 0) * solid;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (beamA <= 0) return;
  // halftone cone: dots on a fixed staggered grid, big near the axis and near the target, sparse at the edges
  const dx = tx - lx;
  const dy = ty - ly;
  const d = Math.hypot(dx, dy) || 1;
  const ax = dx / d;
  const ay = dy / d;
  const pad = r + GRID;
  const x0 = Math.max(0, Math.min(lx, tx) - pad);
  const x1 = Math.min(cw, Math.max(lx, tx) + pad);
  const y0 = Math.max(0, Math.min(ly, ty) - pad);
  const y1 = Math.min(ch, Math.max(ly, ty) + pad);
  const rowH = GRID * 0.866;
  ctx.save();
  ctx.fillStyle = YELLOW;
  ctx.globalAlpha = 0.92 * beamA;
  ctx.beginPath();
  for (let row = Math.floor(y0 / rowH); row * rowH < y1; row++) {
    const y = row * rowH;
    const off = row % 2 ? GRID / 2 : 0;
    for (let col = Math.floor((x0 - off) / GRID); col * GRID + off < x1; col++) {
      const x = col * GRID + off;
      const px = x - lx;
      const py = y - ly;
      const s = (px * ax + py * ay) / d;
      if (s < 0.02 || s > 1) continue;
      const perp = Math.abs(-px * ay + py * ax);
      const wAt = Math.max(2, r * s);
      const t = perp / wAt;
      if (t >= 1) continue;
      const rad = GRID * 0.52 * (0.3 + 0.7 * s) * (1 - t * t) * (1 - 0.35 * t);
      if (rad < 0.7) continue;
      ctx.moveTo(x + rad, y);
      ctx.arc(x, y, rad, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
  // the light circle: brighter halftone disc with a soft rim
  ctx.save();
  const gl = ctx.createRadialGradient(tx, ty, r * 0.2, tx, ty, r * 1.18);
  gl.addColorStop(0, `rgba(240,211,90,${0.42 * beamA})`);
  gl.addColorStop(0.8, `rgba(240,211,90,${0.3 * beamA})`);
  gl.addColorStop(1, 'rgba(240,211,90,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(tx, ty, r * 1.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = YELLOW;
  ctx.globalAlpha = beamA;
  ctx.beginPath();
  for (let row = Math.floor((ty - r) / rowH); row * rowH < ty + r; row++) {
    const y = row * rowH;
    const off = row % 2 ? GRID / 2 : 0;
    for (let col = Math.floor((tx - r - off) / GRID); col * GRID + off < tx + r; col++) {
      const x = col * GRID + off;
      const q = Math.hypot(x - tx, y - ty) / r;
      if (q >= 1) continue;
      const rad = GRID * 0.5 * (0.78 - 0.3 * q * q * q);
      ctx.moveTo(x + rad, y);
      ctx.arc(x, y, rad, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = Math.max(2, r * 0.035);
  ctx.globalAlpha = 0.75 * beamA;
  ctx.stroke();
  ctx.restore();
};

// ---- glass wall

const wobblyRect = (ctx: Ctx, h: { x: number; y: number; w: number; h: number }, r: () => number, amp: number): void => {
  const pts: Pt[] = [];
  const edge = (ax: number, ay: number, bx: number, by: number): void => {
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 70));
    for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n + (r() - 0.5) * amp, ay + ((by - ay) * k) / n + (r() - 0.5) * amp]);
  };
  edge(h.x, h.y, h.x + h.w, h.y);
  edge(h.x + h.w, h.y, h.x + h.w, h.y + h.h);
  edge(h.x + h.w, h.y + h.h, h.x, h.y + h.h);
  edge(h.x, h.y + h.h, h.x, h.y);
  poly(ctx, pts);
};

const NOTE = 118;
const paintNote2 = (ctx: Ctx, x: number, y: number, rot: number, yellow: boolean, seed: string): void => {
  const r = seeded(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  const s = NOTE;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-s / 2 + 4, -s / 2 + 6, s, s);
  ctx.fillStyle = yellow ? YELLOW : CREAM;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const rows = 3 + Math.floor(r() * 2);
  for (let i = 0; i < rows; i++) {
    const yy = -s * 0.24 + i * s * 0.17;
    ctx.beginPath();
    ctx.moveTo(-s * 0.32, yy);
    const len = 0.5 + r() * 0.15 - (i === rows - 1 ? 0.22 : 0);
    for (let k = 1; k <= 6; k++) ctx.lineTo(-s * 0.32 + (k * s * len) / 6, yy + (r() - 0.5) * 4);
    ctx.stroke();
  }
  // tape tab
  ctx.fillStyle = 'rgba(243,239,228,0.7)';
  ctx.fillRect(-s * 0.16, -s / 2 - 7, s * 0.32, 15);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-s * 0.16, -s / 2 - 7, s * 0.32, 15);
  ctx.restore();
};

/** His navy room wall with a rectangular glass opening (transparent inside), a cream rim, a faint glare and sticky notes. */
export const paintGlassWall = (ctx: Ctx, cw: number, ch: number, o: { hole: { x: number; y: number; w: number; h: number }; seed: string }): void => {
  const sc = cw / 2400;
  const hole = o.hole;
  const r = seeded(`${o.seed}:wall`);
  ctx.save();
  ctx.scale(sc, ch / 1350);
  const W = 2400;
  const H = 1350;
  // wall with the hole cut out (even-odd)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(hole.x, hole.y, hole.w, hole.h);
  ctx.clip('evenodd');
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  // grain, scuffs and faint cream scratches like the part 1 room
  for (let i = 0; i < 2600; i++) {
    const x = r() * W;
    const y = r() * H;
    ctx.fillStyle = r() < 0.7 ? `rgba(243,239,228,${0.04 + r() * 0.1})` : `rgba(0,0,0,${0.12 + r() * 0.15})`;
    const z = 1 + r() * 2.2;
    ctx.fillRect(x, y, z, z);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = r() * H;
    const a = (r() - 0.5) * 1.2 + (r() < 0.5 ? 0 : Math.PI / 2);
    const l = 30 + r() * 130;
    ctx.strokeStyle = `rgba(243,239,228,${0.08 + r() * 0.1})`;
    ctx.lineWidth = 1 + r() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l + (r() - 0.5) * 6);
    ctx.stroke();
  }
  // a darker rubbed band around the opening
  const vg = ctx.createRadialGradient(hole.x + hole.w / 2, hole.y + hole.h / 2, Math.min(hole.w, hole.h) * 0.45, hole.x + hole.w / 2, hole.y + hole.h / 2, Math.max(W, H) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // rim of the opening
  wobblyRect(ctx, hole, r, 3.2);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // glare across the glass corner
  ctx.save();
  ctx.beginPath();
  ctx.rect(hole.x + 2, hole.y + 2, hole.w - 4, hole.h - 4);
  ctx.clip();
  ctx.fillStyle = YELLOW;
  ctx.globalAlpha = 0.15;
  const gx = hole.x + hole.w;
  const gy = hole.y;
  for (const [k, wd] of [
    [150, 46],
    [270, 16],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(gx - k - wd, gy - 5);
    ctx.lineTo(gx - k + wd, gy - 5);
    ctx.lineTo(gx - k + wd - hole.h * 0.9, gy + hole.h * 0.9);
    ctx.lineTo(gx - k - wd - hole.h * 0.9, gy + hole.h * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // notes pinned around the opening
  const placed: Pt[] = [];
  const target = 14;
  const nr = seeded(`${o.seed}:notes`);
  for (let tries = 0; tries < 600 && placed.length < target; tries++) {
    const x = 90 + nr() * (W - 180);
    const y = 90 + nr() * (H - 180);
    const m = NOTE * 0.75;
    if (x > hole.x - m - 30 && x < hole.x + hole.w + m + 30 && y > hole.y - m - 30 && y < hole.y + hole.h + m + 30) continue;
    if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < NOTE * 1.05)) continue;
    placed.push([x, y]);
  }
  placed.forEach(([x, y], i) => paintNote2(ctx, x, y, (nr() - 0.5) * 28, nr() < 0.62, `${o.seed}:n:${i}`));
  ctx.restore();
};

// ---- split moon

const craters = (() => {
  const r = seeded('moon-craters');
  return Array.from({ length: 9 }, () => ({ a: r() * Math.PI * 2, d: Math.sqrt(r()) * 0.7, s: 0.07 + r() * 0.1 }));
})();

/** Canvas version of SplitMoon (split = true): the centre line is the glass seam; left half on his navy side, right half on her cream side. */
export const paintSplitMoon = (ctx: Ctx, cw: number, ch: number, phase: number): void => {
  const cx = cw / 2;
  const cy = ch / 2;
  const R = cw * 0.4;
  const ph = clamp01(phase);
  const shift = 2 * R * ph;
  const full = ph >= 0.999;
  const lit = (): void => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    if (!full) {
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.arc(cx - shift, cy, R, 0, Math.PI * 2);
      ctx.clip('evenodd');
    }
    ctx.fillStyle = YELLOW;
    ctx.fillRect(0, 0, cw, ch);
    const sp = R * 0.029;
    for (const c of craters) {
      const ccx = cx + Math.cos(c.a) * c.d * R;
      const ccy = cy + Math.sin(c.a) * c.d * R;
      const cr = c.s * R;
      ctx.fillStyle = 'rgba(24,32,58,0.5)';
      ctx.beginPath();
      for (let y = Math.floor((ccy - cr) / sp) * sp; y < ccy + cr; y += sp) {
        for (let x = Math.floor((ccx - cr) / sp) * sp; x < ccx + cr; x += sp) {
          if (Math.hypot(x - ccx, y - ccy) > cr) continue;
          ctx.moveTo(x + sp * 0.3, y);
          ctx.arc(x, y, sp * 0.3, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }
    ctx.restore();
  };
  // his side (left): the dark part of the disc is navy, outlined cream
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cx - 1, ch);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = NAVY;
  ctx.fill();
  lit();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  // her side (right): transparent dark part, navy outline
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx + 1, 0, cw - cx, ch);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  lit();
  ctx.restore();
};
