// Frame-pure 2D painters for the part-3 sunny street (chorus 2): far skyline, sun, CRT screens, the glass wave, "!" icon.
// Flat silk-screen look: navy key plate, moon-yellow plate offset by a few px, halftone dots instead of gradients.
import { palette } from '../../style/palette.ts';
import { seeded, range } from '../../style/seeded.ts';
import { clamp01, smooth } from '../../math.ts';

type Ctx = CanvasRenderingContext2D;

const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

/** Misregistration of the yellow plate against the key plate, in px (same as icons.ts). */
const PLATE = { dx: 2.5, dy: -2 };

const dot = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};

// ---------------------------------------------------------------------------------------------------------- skyline

const skylineCache = new Map<string, HTMLCanvasElement>();

const buildSkyline = (cw: number, ch: number, seed: string): HTMLCanvasElement => {
  const cv = makeCanvas(cw, ch);
  const ctx = cv.getContext('2d') as Ctx;
  const r = seeded(`skyline:${seed}`);
  // far roofline: each building has a flat top, a gable or a mansard, optional chimneys; a few thin towers stand out.
  const edgeTop = ch * 0.62; // first and last building share this top so the strip tiles
  const roof = new Path2D();
  const chimneys: { x: number; y: number; w: number; h: number }[] = [];
  const spires: { x: number; y: number; w: number; h: number }[] = [];
  roof.moveTo(0, ch);
  roof.lineTo(0, edgeTop);
  let x = 0;
  while (x < cw) {
    const last = cw - x < ch * 0.9;
    const bw = last ? cw - x : range(r, ch * 0.28, ch * 0.62);
    const top = last ? edgeTop : ch * range(r, 0.34, 0.66);
    const kind = r();
    roof.lineTo(x, top);
    if (last) {
      roof.lineTo(x + bw, top);
    } else if (kind < 0.3) {
      roof.lineTo(x + bw * 0.5, top - ch * range(r, 0.07, 0.12));
      roof.lineTo(x + bw, top);
    } else if (kind < 0.5) {
      roof.lineTo(x + bw * 0.12, top - ch * 0.05);
      roof.lineTo(x + bw * 0.88, top - ch * 0.05);
      roof.lineTo(x + bw, top);
    } else {
      roof.lineTo(x + bw, top);
    }
    if (!last && r() < 0.6) chimneys.push({ x: x + bw * range(r, 0.15, 0.7), y: top, w: ch * range(r, 0.03, 0.05), h: ch * range(r, 0.06, 0.1) });
    if (!last && r() < 0.14) spires.push({ x: x + bw * 0.5, y: top, w: ch * 0.05, h: ch * range(r, 0.2, 0.32) });
    x += bw;
  }
  roof.lineTo(cw, edgeTop);
  roof.lineTo(cw, ch);
  roof.closePath();
  const towers = new Path2D();
  for (const c of chimneys) {
    towers.rect(c.x, c.y - c.h, c.w, c.h + 2);
    towers.rect(c.x - c.w * 0.2, c.y - c.h - c.w * 0.35, c.w * 1.4, c.w * 0.4);
  }
  for (const s of spires) {
    towers.rect(s.x - s.w / 2, s.y - s.h, s.w, s.h + 2);
    towers.moveTo(s.x - s.w * 0.8, s.y - s.h);
    towers.lineTo(s.x, s.y - s.h - s.w * 2.4);
    towers.lineTo(s.x + s.w * 0.8, s.y - s.h);
    towers.closePath();
  }
  // distance: navy at low alpha plus a navy halftone inside the same silhouette
  ctx.fillStyle = palette.navy;
  ctx.globalAlpha = 0.3;
  const both = new Path2D(roof);
  both.addPath(towers);
  ctx.fill(both);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.clip(roof);
  const step = Math.max(5, ch * 0.014);
  for (let row = 0, y = 0; y < ch + step; row++, y += step * 0.866) {
    const rad = step * 0.2;
    for (let xx = (row % 2) * step * 0.5; xx < cw + step; xx += step) dot(ctx, xx, y, rad);
  }
  ctx.restore();
  ctx.save();
  ctx.clip(towers);
  for (let row = 0, y = 0; y < ch + step; row++, y += step * 0.866) {
    for (let xx = (row % 2) * step * 0.5; xx < cw + step; xx += step) dot(ctx, xx, y, step * 0.2);
  }
  ctx.restore();
  // thin outline of the silhouette top edge only (the bottom is hidden behind the shop fronts)
  ctx.strokeStyle = palette.navy;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, ch * 0.0035);
  ctx.lineJoin = 'round';
  ctx.stroke(roof);
  ctx.globalAlpha = 1;
  return cv;
};

/** Far rooftops behind the shop fronts: navy roofs + chimneys + a few distant towers, lighter than the near facades
 * (navy at reduced alpha plus a navy halftone so it reads as distance), transparent sky; tiles horizontally (cw wide). */
export const paintSkyline = (ctx: Ctx, cw: number, ch: number, seed = 'sky'): void => {
  const key = `${Math.round(cw)}x${Math.round(ch)}:${seed}`;
  let cv = skylineCache.get(key);
  if (!cv) {
    cv = buildSkyline(cw, ch, seed);
    skylineCache.set(key, cv);
  }
  ctx.drawImage(cv, 0, 0, cw, ch);
};

// -------------------------------------------------------------------------------------------------------------- sun

/** The morning sun: moon-yellow disc with a navy key ring offset by misregistration (see paintSky in life.ts), radius
 * r at (cx, cy) in canvas px, plus sparse halftone rays that turn slowly with t. */
export const paintSun = (ctx: Ctx, cx: number, cy: number, r: number, t: number): void => {
  ctx.save();
  // rays: rings of navy dots, only inside alternating wedges, dots shrink outward
  const wedges = 14;
  const spin = t * 0.06;
  const rings = 5;
  const gap = r * 0.11;
  ctx.fillStyle = palette.navy;
  for (let k = 0; k < rings; k++) {
    const rr = r * 1.22 + k * gap * (1 + k * 0.08);
    const rad = Math.max(0.8, r * 0.022 * (1 - k / (rings + 1)));
    const n = Math.round((2 * Math.PI * rr) / (gap * 0.95));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + spin + (k % 2) * (Math.PI / n);
      const w = (((a - spin) / (Math.PI * 2)) * wedges) % 1;
      if (((Math.floor(((a - spin) / (Math.PI * 2)) * wedges) % 2) + 2) % 2 === 0 || w < 0) continue;
      dot(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rad);
    }
  }
  // disc: yellow plate offset from its navy key ring
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = Math.max(1.5, r * 0.018);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = palette.moonYellow;
  ctx.beginPath();
  ctx.arc(cx + PLATE.dx * 1.6, cy + PLATE.dy * 1.6, r, 0, Math.PI * 2);
  ctx.fill();
  // a few navy speckles on the yellow, like uneven ink
  const rs = seeded('sun:speck');
  ctx.fillStyle = palette.navy;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 26; i++) {
    const a = rs() * Math.PI * 2;
    const d = Math.sqrt(rs()) * r * 0.92;
    dot(ctx, cx + Math.cos(a) * d + PLATE.dx, cy + Math.sin(a) * d + PLATE.dy, 0.8 + rs() * 1.2);
  }
  ctx.restore();
};

// ------------------------------------------------------------------------------------------------------------ TV

const moonPath = (ctx: Ctx, cx: number, cy: number, r: number, phase: number): void => {
  // lit part of a moon: waxing (phase < .5) lit on the right, waning on the left
  const k = Math.cos(phase * Math.PI * 2);
  const sgn = phase <= 0.5 ? 1 : -1;
  const n = 28;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    const x = cx + sgn * r * Math.sin(a);
    const y = cy - r * Math.cos(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const a = (i / n) * Math.PI;
    ctx.lineTo(cx + sgn * k * r * Math.sin(a), cy - r * Math.cos(a));
  }
  ctx.closePath();
};

/** One old CRT screen's content (canvas = the screen): warm cream-yellow glow, halftone scanlines, slight vignette at
 * the corners (as dots), her figure `fig` drawn identical in every screen (fit: the crop of the sprite to show, scaled
 * to the screen height * 0.86, bottom-aligned, centred), and a small moon in the upper right corner showing `phase`
 * (0 = new, 0.5 = full, 1 = new again). `flick` 0..1: one-frame brightness flicker when the phase steps. */
export const paintTvScreen = (
  ctx: Ctx,
  cw: number,
  ch: number,
  fig: CanvasImageSource,
  o: { phase: number; t: number; flick?: number; fit?: { sx: number; sy: number; sw: number; sh: number }; seed?: string },
): void => {
  const m = Math.min(cw, ch);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.clip();
  // glow: yellow base with cream halftone dots that grow towards the centre
  ctx.fillStyle = palette.moonYellow;
  ctx.fillRect(0, 0, cw, ch);
  const step = Math.max(5, m * 0.035);
  ctx.fillStyle = palette.cream;
  for (let row = 0, y = step * 0.4; y < ch; row++, y += step * 0.866) {
    for (let x = (row % 2) * step * 0.5; x < cw + step; x += step) {
      const d = Math.hypot((x - cw / 2) / (cw * 0.5), (y - ch * 0.5) / (ch * 0.5));
      const rad = step * 0.62 * clamp01(1 - d * 0.85);
      if (rad > 0.5) dot(ctx, x, y, rad);
    }
  }
  // her figure: identical in every screen
  const img = fig as HTMLImageElement;
  const iw = img.naturalWidth ?? img.width;
  const ih = img.naturalHeight ?? img.height;
  const fit = o.fit ?? { sx: 0, sy: 0, sw: iw, sh: ih };
  const dh = ch * 0.86;
  const dw = (fit.sw / fit.sh) * dh;
  ctx.drawImage(fig, fit.sx, fit.sy, fit.sw, fit.sh, (cw - dw) / 2, ch - dh - ch * 0.03, dw, dh);
  // halftone scanlines: rows of tiny navy dots
  ctx.fillStyle = palette.navy;
  ctx.globalAlpha = 0.28;
  const ls = Math.max(3.5, m * 0.024);
  const roll = (o.t * 9) % ls;
  for (let y = roll; y < ch; y += ls) {
    for (let x = 0; x < cw + ls; x += ls) dot(ctx, x + ((Math.round(y / ls) % 2) * ls) / 2, y, ls * 0.15);
  }
  ctx.globalAlpha = 1;
  // corner vignette as dots
  const vs = Math.max(4, m * 0.03);
  for (let row = 0, y = 0; y < ch + vs; row++, y += vs * 0.866) {
    for (let x = (row % 2) * vs * 0.5; x < cw + vs; x += vs) {
      const d = Math.hypot((x - cw / 2) / (cw * 0.5), (y - ch / 2) / (ch * 0.5)) / Math.SQRT2;
      const rad = vs * 0.55 * smooth((d - 0.62) / 0.38);
      if (rad > 0.4) dot(ctx, x, y, rad);
    }
  }
  // moon, upper right
  const mr = m * 0.1;
  const mx = cw - mr * 1.9;
  const my = mr * 1.9;
  const ph = ((o.phase % 1) + 1) % 1;
  ctx.fillStyle = palette.cream;
  ctx.beginPath();
  ctx.arc(mx, my, mr + Math.max(1.5, mr * 0.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.navy;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.moonYellow;
  moonPath(ctx, mx + PLATE.dx * 0.5, my + PLATE.dy * 0.5, mr * 0.96, ph);
  ctx.fill();
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = Math.max(1, mr * 0.1);
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.stroke();
  // flicker: one cream flash over the whole screen
  const f = clamp01(o.flick ?? 0);
  if (f > 0) {
    ctx.globalAlpha = f * 0.55;
    ctx.fillStyle = palette.cream;
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.restore();
};

// ------------------------------------------------------------------------------------------------------------ wave

// Geometry ported from transitions/WhiteWave.tsx (frame 1920x1080): BULGE 300, 54 rows, torn jitter on twos.
const BULGE = 300;
const ROWS = 54;

const waveEdge = (base: number, y: number, ch: number, k: number, jag: number): number =>
  base + BULGE * k * Math.pow(Math.sin((Math.PI * y) / ch), 1.2) - 240 * k + jag;

/** Right edge pts of a torn front (jitter changes only every second frame). */
const edgePoints = (base: number, ch: number, k: number, seed: string, step: number, tag: string): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= ROWS; i++) {
    const rj = seeded(`${seed}:jag:${tag}:${i}:${step}`);
    const jag = ((rj() - 0.5) * 30 + (rj() < 0.12 ? rj() * 46 : 0)) * k;
    const y = (i / ROWS) * ch;
    pts.push([waveEdge(base, y, ch, k, jag), y]);
  }
  return pts;
};

/** The chorus wave as a canvas painter (look of WhiteWave.tsx): hard-edged cream front with bulge, torn jittering edge
 * on twos, notes torn into yellow dots trailing; `ink` adds the navy squeegee lines and broken ink edge. Sweeps left to
 * right as p goes 0..1 (front enters at the left edge at 0, leaves the right edge at p = .75; then the cream recedes
 * off to the right so the canvas is transparent again at 1). `frame` drives the twos jitter. */
export const paintGlassWave = (ctx: Ctx, cw: number, ch: number, p: number, frame: number, seed = 'glasswave', ink = false): void => {
  if (p <= 0 || p >= 1) return;
  const k = ch / 1080;
  const step = Math.floor((frame - (frame % 2)) / 2);
  const pf = clamp01(p / 0.75); // front travel
  const pt = clamp01((p - 0.75) / 0.25); // tail (recession) travel
  const fromB = -BULGE * k - 40 * k;
  const toB = cw + 240 * k + 40 * k;
  const baseF = fromB + smooth(pf) * (toB - fromB);
  const front = edgePoints(baseF, ch, k, seed, step, 'f');
  // the tail is the left boundary of the cream: it starts off-screen left and chases the front off to the right
  const baseT = fromB + smooth(pt) * (toB + 60 * k - fromB);
  const tail = pt > 0 ? edgePoints(baseT, ch, k, seed, step, 't') : null;

  ctx.save();
  ctx.fillStyle = palette.cream;
  // band between the two torn edges: front edge forward, tail edge back
  ctx.beginPath();
  if (tail) {
    ctx.moveTo(tail[0]?.[0] ?? 0, -10);
    for (const [x, y] of tail) ctx.lineTo(x, y);
    ctx.lineTo(tail[ROWS]?.[0] ?? 0, ch + 10);
    ctx.lineTo(front[ROWS]?.[0] ?? 0, ch + 10);
    for (let i = ROWS; i >= 0; i--) ctx.lineTo(front[i]?.[0] ?? 0, front[i]?.[1] ?? 0);
    ctx.lineTo(front[0]?.[0] ?? 0, -10);
  } else {
    ctx.moveTo(-60, -10);
    for (const [x, y] of front) ctx.lineTo(x, y);
    ctx.lineTo(-60, ch + 10);
  }
  ctx.closePath();
  ctx.fill();
  const frontAt = (y: number): number => waveEdge(baseF, y, ch, k, 0);
  const tailAt = (y: number): number => (tail ? waveEdge(baseT, y, ch, k, 0) : -1e6);

  const r = seeded(`${seed}:bits`);
  const items = Array.from({ length: 40 }, () => ({
    yf: r(),
    born: range(r, 0.05, 0.9),
    rot: range(r, 0, 360),
    spin: range(r, -200, 200),
    size: range(r, 26, 44) * k,
    lag: range(r, 0.35, 0.8),
  }));
  const baseAt = (q: number): number => fromB + smooth(clamp01(q)) * (toB - fromB);

  if (ink) {
    const streaks = Array.from({ length: 9 }, () => ({ yf: r(), len: range(r, 90, 260) * k, w: range(r, 1.5, 3.2) * k }));
    ctx.strokeStyle = palette.navy;
    ctx.globalAlpha = 0.55;
    for (const s of streaks) {
      const y = s.yf * ch;
      const x = frontAt(y) - 6;
      if (x < tailAt(y)) continue;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(x - s.len, y);
      ctx.lineTo(x, y + (s.len > 170 ? 2 : -2));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    front.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.save();
    ctx.translate(PLATE.dx, PLATE.dy);
    ctx.strokeStyle = palette.moonYellow;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 5 * k;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = palette.navy;
    ctx.lineWidth = 3.4 * k;
    ctx.setLineDash([70 * k, 12 * k, 26 * k, 9 * k, 44 * k, 14 * k]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // torn note bits: born at the front, trail behind it shrinking into small yellow dots, plate offset
  ctx.save();
  ctx.translate(PLATE.dx, PLATE.dy);
  ctx.fillStyle = palette.moonYellow;
  for (const [i, b] of items.entries()) {
    if (pf < b.born) continue;
    const y = b.yf * ch;
    const xBorn = waveEdge(baseAt(b.born), y, ch, k, 0);
    const xNow = waveEdge(baseF, y, ch, k, 0);
    const x = xBorn + (xNow - xBorn) * b.lag - 6 * k;
    if (x < tailAt(y)) continue;
    const age = clamp01((pf - b.born) * 3.2);
    const size = b.size + (7 * k - b.size) * age;
    ctx.globalAlpha = 1 - clamp01((pf - 0.8) / 0.2);
    ctx.save();
    ctx.translate(x, y + Math.sin(age * 5 + i) * 14 * k);
    ctx.rotate(((b.rot + b.spin * age) * Math.PI) / 180);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------- exclaim

const ease = (x: number): number => smooth(x);

/** A big "!" emotion icon in the idiom of icons.ts: moon yellow with a navy outline and a cream inner rim, pops in with
 * overshoot over p 0..0.4, small wobble, fades out with `out` 0..1. Meant for a 256x256 canvas. */
export const paintExclaim = (ctx: Ctx, cw: number, ch: number, p: number, o: { out?: number } = {}): void => {
  if (p < 0) return;
  const out = clamp01(o.out ?? 0);
  let sc: number;
  if (p < 0.4) {
    const u = p / 0.4;
    sc = u < 0.6 ? 1.18 * ease(u / 0.6) : 1.18 - 0.18 * ease((u - 0.6) / 0.4);
  } else {
    sc = 1 + 0.015 * Math.sin(2 * Math.PI * p * 1.6);
  }
  sc *= 1 - 0.25 * out;
  const alpha = 1 - out;
  if (alpha <= 0 || sc <= 0) return;
  const wob = p < 0.4 ? 0 : 0.07 * Math.sin((p - 0.4) * 26) * Math.exp(-(p - 0.4) * 5) + 0.02 * Math.sin(p * 9);
  const s = Math.min(cw, ch) * 0.8;
  const w = s * 0.26; // stem top width
  const ol = Math.max(2, s * 0.028);
  const shape = (): void => {
    // tapered stem with a rounded top, then the dot
    ctx.beginPath();
    ctx.moveTo(-w / 2 + w * 0.06, -0.44 * s + w * 0.5);
    ctx.arc(0, -0.44 * s + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(w * 0.22, 0.14 * s);
    ctx.quadraticCurveTo(0, 0.18 * s, -w * 0.22, 0.14 * s);
    ctx.closePath();
    ctx.moveTo(w * 0.33, 0.33 * s);
    ctx.arc(0, 0.33 * s, w * 0.33, 0, Math.PI * 2);
  };
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(wob);
  ctx.scale(sc, sc);
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  // navy key plate (thick outline), then the yellow plate shifted, then the cream inner rim
  shape();
  ctx.fillStyle = palette.navy;
  ctx.fill();
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = ol * 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(PLATE.dx, PLATE.dy);
  shape();
  ctx.fillStyle = palette.moonYellow;
  ctx.fill('nonzero');
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = palette.cream;
  ctx.lineWidth = ol * 1.4;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
};
