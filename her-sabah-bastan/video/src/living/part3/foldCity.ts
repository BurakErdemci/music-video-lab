import type { FoldLanding } from '../../transitions/PaperFold.tsx';
import { palette } from '../../style/palette.ts';
import { range, seeded } from '../../style/seeded.ts';

export interface FoldCityOpts {
  landing: FoldLanding;
  panels: number;
  /** The paper cut-out polygon in source px (as handed to PaperFold). Omit for an uncut sheet. */
  cutout?: readonly (readonly [number, number])[];
  /** Perspective distance, px (PaperFold's `distance`, default 2600). */
  distance?: number;
  /** PaperFold's slow camera on top of everything (default none). */
  zoom?: { s: number; x: number; y: number };
  /** 0 = standing exactly as PaperFold leaves it at progress 1; 1 = every panel has fallen flat onto the desk. */
  collapse: number;
  seed?: string;
  /**
   * Memo key for the source: the caller promises that `src` shows the same picture whenever this key is the same.
   * Without it an HTMLImageElement / ImageBitmap is memoised by identity, and a canvas is re-processed every call
   * (about 2-4 ms extra), because its pixels may have changed.
   */
  cacheKey?: string;
  /** Contact shadow under the strip, the one PaperFold prints into its desk layer (default true). */
  shadow?: boolean;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const DEG = Math.PI / 180;

/** Fraction of a panel's own height that its fallen sheet still shows in depth: the desk is seen at a grazing angle. */
const FLAT_DEPTH = 0.16;
/** Next panel starts falling when the previous one has done this share of its fall (60 % overlap). */
const STAGGER = 0.4;
/** Share of one panel's time that is the fall; the rest is the bounce and settle. */
const FALL_FRAC = 0.62;
/** Mesh cells per panel. */
const NX = 6;
const NY = 8;
const SCRAPS = 4;
const SKID = 0.12;

interface Geo {
  w: number;
  h: number;
  pw: number;
  panels: number;
  xs: number[];
  zs: number[];
  theta: number;
  shiftX: number;
  scale: number;
  tilt: number;
  bx: number;
  by: number;
  dist: number;
  zoom: { s: number; x: number; y: number };
}

/** PaperFold's chain at progress = 1 (move = 1): hinge positions, scale, tilt and landing point. */
const makeGeo = (w: number, h: number, o: Omit<FoldCityOpts, 'collapse'>): Geo => {
  const theta = o.landing.fold * DEG;
  const pw = w / o.panels;
  const xs: number[] = [0];
  const zs: number[] = [0];
  for (let i = 0; i < o.panels; i++) {
    const a = i % 2 ? -theta : theta;
    xs.push((xs[i] as number) + pw * Math.cos(a));
    zs.push((zs[i] as number) - pw * Math.sin(a));
  }
  return {
    w,
    h,
    pw,
    panels: o.panels,
    xs,
    zs,
    theta,
    shiftX: (w - w * Math.cos(theta)) / 2,
    scale: o.landing.scale,
    tilt: o.landing.tilt * DEG,
    bx: o.landing.x,
    by: o.landing.y,
    dist: o.distance ?? 2600,
    zoom: o.zoom ?? { s: 1, x: w / 2, y: h / 2 },
  };
};

const project = (g: Geo, x: number, y: number, z: number): [number, number] => {
  const ox = g.w / 2;
  const oy = g.h * 0.35;
  const k = g.dist / (g.dist - z);
  return [g.zoom.x + (ox + (x - ox) * k - g.zoom.x) * g.zoom.s, g.zoom.y + (oy + (y - oy) * k - g.zoom.y) * g.zoom.s];
};

/**
 * Screen position of the point (s, v) of panel i (s along the width, v down the height, both 0..1) when the panel has
 * fallen forward by phi about its bottom edge. phi = 0 is PaperFold's standing pose. The bottom edge stays where
 * PaperFold's tilt puts it; the panel's height vector turns from "up" (tipped back by the tilt) to "toward the camera,
 * flattened to FLAT_DEPTH" (no tilt), so the sheet ends as a thin sliver on the desk line.
 */
const panelPoint = (g: Geo, i: number, s: number, v: number, phi: number): [number, number] => {
  const x0 = g.xs[i] as number;
  const x1 = g.xs[i + 1] as number;
  const z0 = g.zs[i] as number;
  const z1 = g.zs[i + 1] as number;
  const gx = x0 + s * (x1 - x0);
  const gz = z0 + s * (z1 - z0);
  const X = (gx + g.shiftX - g.w / 2) * g.scale;
  const st = Math.sin(g.tilt);
  const ct = Math.cos(g.tilt);
  const baseY = -gz * st;
  const baseZ = gz * ct;
  const hs = (1 - v) * g.h * g.scale;
  const dx = (x1 - x0) * g.scale;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const vx = hs * FLAT_DEPTH * sp * nx;
  const vy = -hs * cp;
  const vz = hs * FLAT_DEPTH * sp * nz;
  const tau = g.tilt * cp;
  const yr = vy * Math.cos(tau) - vz * Math.sin(tau);
  const zr = vy * Math.sin(tau) + vz * Math.cos(tau);
  return project(g, g.bx + X + vx, g.by + baseY + yr, baseZ + zr);
};

interface PanelAnim {
  phi: number;
  /** Collapse value at which this panel hits the desk. */
  land: number;
}

const bounceOf = (seed: string, i: number): number => range(seeded(`${seed}|bounce|${i}`), 0.08, 0.12);

/** Fall angle of panel i at collapse c: right end first, quadratic fall, one bounce of 8-12 % of its height, rest. */
const animOf = (g: Geo, seed: string, c: number): PanelAnim[] => {
  const D = 1 / (1 + STAGGER * (g.panels - 1));
  return Array.from({ length: g.panels }, (_, i) => {
    const j = g.panels - 1 - i;
    const t0 = j * STAGGER * D;
    const u = clamp01((c - t0) / D);
    const land = t0 + FALL_FRAC * D;
    if (u < FALL_FRAC) {
      const q = u / FALL_FRAC;
      return { phi: (Math.PI / 2) * q * q, land };
    }
    const s = (u - FALL_FRAC) / (1 - FALL_FRAC);
    const lift = Math.asin(bounceOf(seed, i));
    return { phi: Math.PI / 2 - lift * 4 * s * (1 - s), land };
  });
};

// ---------------------------------------------------------------------------------------------------------------
// Source preparation: the cut-out source and each panel's pre-shrunk texture, memoised.

const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
const ctx2d = (c: HTMLCanvasElement): CanvasRenderingContext2D => {
  const x = c.getContext('2d');
  if (!x) throw new Error('2D canvas unavailable');
  return x;
};

const ids = new WeakMap<object, number>();
let nextId = 1;
const idOf = (o: object): number => {
  let v = ids.get(o);
  if (v === undefined) {
    v = nextId++;
    ids.set(o, v);
  }
  return v;
};

const polyHash = (p: FoldCityOpts['cutout']): string => {
  if (!p) return 'none';
  let a = 0;
  for (const [x, y] of p) a = (Math.imul(a, 31) + Math.round(x * 4) * 7 + Math.round(y * 4)) | 0;
  return `${p.length}:${a}`;
};

const srcKeyOf = (src: CanvasImageSource, o: FoldCityOpts): string | null => {
  if (o.cacheKey) return `k:${o.cacheKey}`;
  if ((typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) || (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap)) return `i:${idOf(src)}`;
  return null;
};

const cutCache = new Map<string, HTMLCanvasElement>();
const texCache = new Map<string, HTMLCanvasElement>();

/** The source clipped to the cut-out with PaperFold's own path (skyline, then round the frame's far corners). */
const cutSource = (src: CanvasImageSource, w: number, h: number, o: FoldCityOpts, key: string | null): HTMLCanvasElement => {
  const full = key === null ? null : `${key}|${w}x${h}|${polyHash(o.cutout)}`;
  const hit = full === null ? undefined : cutCache.get(full);
  if (hit) return hit;
  const cv = makeCanvas(w, h);
  const cx = ctx2d(cv);
  cx.drawImage(src, 0, 0, w, h);
  const cut = o.cutout;
  if (cut && cut.length > 1) {
    cx.globalCompositeOperation = 'destination-in';
    cx.beginPath();
    cut.forEach(([x, y], i) => (i ? cx.lineTo(x, y) : cx.moveTo(x, y)));
    cx.lineTo(w + 40, -40);
    cx.lineTo(w + 40, h + 40);
    cx.lineTo(-40, h + 40);
    cx.lineTo(-40, -40);
    cx.closePath();
    cx.fillStyle = '#000';
    cx.fill();
    cx.globalCompositeOperation = 'source-over';
  }
  if (full !== null) {
    if (cutCache.size >= 3) cutCache.clear();
    cutCache.set(full, cv);
  }
  return cv;
};

const shrink = (cv: HTMLCanvasElement, tw: number, th: number): HTMLCanvasElement => {
  let cur = cv;
  while (cur.width > tw || cur.height > th) {
    const nw = cur.width / 2 >= tw ? Math.ceil(cur.width / 2) : cur.width;
    const nh = cur.height / 2 >= th ? Math.ceil(cur.height / 2) : cur.height;
    if (nw === cur.width && nh === cur.height) break;
    const next = makeCanvas(nw, nh);
    const nx = ctx2d(next);
    nx.imageSmoothingQuality = 'high';
    nx.drawImage(cur, 0, 0, nw, nh);
    cur = next;
  }
  return cur;
};

/** Power-of-two shrink so that each texture stays at least as large as the strip's standing size on screen. */
const texSize = (g: Geo): { tw: number; th: number; rx: number } => {
  let sw = 1;
  let sh = 1;
  for (let i = 0; i < g.panels; i++) {
    const tl = panelPoint(g, i, 0, 0, 0);
    const tr = panelPoint(g, i, 1, 0, 0);
    const bl = panelPoint(g, i, 0, 1, 0);
    const br = panelPoint(g, i, 1, 1, 0);
    sw = Math.max(sw, Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), Math.hypot(br[0] - bl[0], br[1] - bl[1]));
    sh = Math.max(sh, Math.hypot(bl[0] - tl[0], bl[1] - tl[1]), Math.hypot(br[0] - tr[0], br[1] - tr[1]));
  }
  const rx = 2 ** Math.floor(Math.log2(Math.max(1, g.pw / sw)));
  const ry = 2 ** Math.floor(Math.log2(Math.max(1, g.h / sh)));
  return { tw: Math.ceil(g.pw / rx), th: Math.ceil(g.h / ry), rx };
};

const panelTexture = (cut: HTMLCanvasElement, g: Geo, i: number, tw: number, th: number, key: string | null): HTMLCanvasElement => {
  const full = key === null ? null : `${key}|${g.panels}|${i}|${tw}x${th}`;
  const hit = full === null ? undefined : texCache.get(full);
  if (hit) return hit;
  const x0 = Math.round(i * g.pw);
  const x1 = Math.round((i + 1) * g.pw);
  const slice = makeCanvas(x1 - x0, g.h);
  ctx2d(slice).drawImage(cut, x0, 0, x1 - x0, g.h, 0, 0, x1 - x0, g.h);
  const tex = shrink(slice, tw, th);
  if (full !== null) {
    if (texCache.size >= 64) texCache.clear();
    texCache.set(full, tex);
  }
  return tex;
};

const scratch: HTMLCanvasElement[] = [];

/** Panel texture with PaperFold's print shading (navy mixed in) and the crease at its left edge. */
const shadedTexture = (i: number, tex: HTMLCanvasElement, shade: number, crease: number, rx: number): HTMLCanvasElement => {
  let cv = scratch[i];
  if (!cv) {
    cv = makeCanvas(tex.width, tex.height);
    scratch[i] = cv;
  }
  if (cv.width !== tex.width || cv.height !== tex.height) {
    cv.width = tex.width;
    cv.height = tex.height;
  }
  const cx = ctx2d(cv);
  cx.globalCompositeOperation = 'source-over';
  cx.globalAlpha = 1;
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.drawImage(tex, 0, 0);
  cx.globalCompositeOperation = 'source-atop';
  cx.fillStyle = palette.navy;
  if (shade > 0.002) {
    cx.globalAlpha = shade;
    cx.fillRect(0, 0, cv.width, cv.height);
  }
  if (crease > 0.002) {
    // PaperFold darkens the first 1.5 source px fully and the next 1.5 px by half; averaged over one texel column.
    cx.globalAlpha = crease * Math.min(1, 2.25 / rx);
    cx.fillRect(0, 0, 1, cv.height);
  }
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'source-over';
  return cv;
};

// ---------------------------------------------------------------------------------------------------------------

type Mat = readonly [number, number, number, number, number, number];

/** drawImage(tex) through the affine `m` (tex px -> screen), clipped to the triangle grown by about half a pixel. */
const drawTri = (ctx: CanvasRenderingContext2D, tex: HTMLCanvasElement, base: DOMMatrix, m: Mat, p: readonly [number, number][]): void => {
  const [p0, p1, p2] = p as [[number, number], [number, number], [number, number]];
  const cx = (p0[0] + p1[0] + p2[0]) / 3;
  const cy = (p0[1] + p1[1] + p2[1]) / 3;
  ctx.save();
  ctx.beginPath();
  p.forEach(([x, y], k) => {
    const dx = x - cx;
    const dy = y - cy;
    const l = Math.hypot(dx, dy) || 1;
    const gx = x + (dx / l) * 1.1;
    const gy = y + (dy / l) * 1.1;
    if (k) ctx.lineTo(gx, gy);
    else ctx.moveTo(gx, gy);
  });
  ctx.closePath();
  ctx.clip();
  const [a, b, c, d, e, f] = m;
  ctx.setTransform(base.a * a + base.c * b, base.b * a + base.d * b, base.a * c + base.c * d, base.b * c + base.d * d, base.a * e + base.c * f + base.e, base.b * e + base.d * f + base.f);
  ctx.drawImage(tex, 0, 0);
  ctx.restore();
};

const paintPanel = (ctx: CanvasRenderingContext2D, base: DOMMatrix, g: Geo, i: number, phi: number, tex: HTMLCanvasElement): void => {
  const tw = tex.width;
  const th = tex.height;
  const gp: [number, number][][] = [];
  for (let r = 0; r <= NY; r++) {
    const row: [number, number][] = [];
    for (let k = 0; k <= NX; k++) row.push(panelPoint(g, i, k / NX, r / NY, phi));
    gp.push(row);
  }
  ctx.save();
  ctx.beginPath();
  const c = [gp[0]?.[0], gp[0]?.[NX], gp[NY]?.[NX], gp[NY]?.[0]] as [number, number][];
  c.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const dx = tw / NX;
  const dy = th / NY;
  for (let r = 0; r < NY; r++) {
    for (let k = 0; k < NX; k++) {
      const pA = (gp[r] as [number, number][])[k] as [number, number];
      const pB = (gp[r] as [number, number][])[k + 1] as [number, number];
      const pC = (gp[r + 1] as [number, number][])[k] as [number, number];
      const pD = (gp[r + 1] as [number, number][])[k + 1] as [number, number];
      const x0 = k * dx;
      const y0 = r * dy;
      const x1 = x0 + dx;
      const y1 = y0 + dy;
      // Triangle A-B-C: B-A along texture x, C-A along texture y.
      const a1 = (pB[0] - pA[0]) / dx;
      const b1 = (pB[1] - pA[1]) / dx;
      const c1 = (pC[0] - pA[0]) / dy;
      const d1 = (pC[1] - pA[1]) / dy;
      drawTri(ctx, tex, base, [a1, b1, c1, d1, pA[0] - a1 * x0 - c1 * y0, pA[1] - b1 * x0 - d1 * y0], [pA, pB, pC]);
      // Triangle D-B-C: D-C along texture x, D-B along texture y.
      const a2 = (pD[0] - pC[0]) / dx;
      const b2 = (pD[1] - pC[1]) / dx;
      const c2 = (pD[0] - pB[0]) / dy;
      const d2 = (pD[1] - pB[1]) / dy;
      drawTri(ctx, tex, base, [a2, b2, c2, d2, pD[0] - a2 * x1 - c2 * y1, pD[1] - b2 * x1 - d2 * y1], [pD, pB, pC]);
    }
  }
  ctx.restore();
};

/** Small paper scraps that skid out of the desk contact line when a panel lands. */
const paintScraps = (ctx: CanvasRenderingContext2D, g: Geo, seed: string, c: number, anim: readonly PanelAnim[]): void => {
  for (let i = 0; i < g.panels; i++) {
    const an = anim[i] as PanelAnim;
    const span = Math.min(SKID, 1 - an.land);
    if (c <= an.land || span <= 0) continue;
    const r = seeded(`${seed}|scrap|${i}`);
    const s = clamp01((c - an.land) / span);
    const e = 1 - (1 - s) ** 3;
    const pop = ss(0, 0.12, s);
    for (let k = 0; k < SCRAPS; k++) {
      const along = range(r, 0.1, 0.9);
      const ang = range(r, 15, 165) * DEG;
      const dist = range(r, 28, 105);
      const size = range(r, 7, 15);
      const spin = range(r, -3, 3);
      const rot0 = range(r, 0, Math.PI);
      const yellow = r() < 0.5;
      const [bx, by] = panelPoint(g, i, along, 1, Math.PI / 2);
      ctx.save();
      ctx.translate(bx + Math.cos(ang) * dist * e, by + 2 + Math.sin(ang) * dist * e * 0.45);
      ctx.scale(1, 0.55);
      ctx.rotate(rot0 + spin * e);
      const hw = (size / 2) * pop;
      const hh = (size / 2) * 0.8 * pop;
      ctx.beginPath();
      ctx.moveTo(-hw, -hh);
      ctx.lineTo(hw, -hh * 0.85);
      ctx.lineTo(hw * 0.9, hh);
      ctx.lineTo(-hw * 1.05, hh * 0.9);
      ctx.closePath();
      ctx.fillStyle = yellow ? palette.moonYellow : palette.cream;
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = palette.navy;
      ctx.stroke();
      ctx.restore();
    }
  }
};

/**
 * Paints the folded strip onto a full-frame canvas (w x h = 1920 x 1080, screen px), transparent elsewhere.
 * `src` is the same full-frame picture that was PaperFold's `from` at its last frame.
 */
export const paintFoldedCity = (ctx: CanvasRenderingContext2D, w: number, h: number, src: CanvasImageSource, o: FoldCityOpts): void => {
  const g = makeGeo(w, h, o);
  const c = clamp01(o.collapse);
  const seed = o.seed ?? 'fold';
  const anim = animOf(g, seed, c);
  const base = ctx.getTransform();

  if (o.shadow !== false) {
    // The contact shadow PaperFold prints into its desk layer, fading as the strip comes down.
    const shadowW = w * Math.cos(g.theta) * g.scale * (1 - 0.6 * c);
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - 0.75 * c);
    ctx.translate(g.bx, g.by);
    ctx.scale(1, 0.12);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowW / 2 + 40);
    grad.addColorStop(0, palette.navy);
    grad.addColorStop(1, 'rgba(24,32,58,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, shadowW / 2 + 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const key = srcKeyOf(src, o);
  const cut = cutSource(src, w, h, o, key);
  const { tw, th, rx } = texSize(g);
  const texKey = key === null ? null : `${key}|${polyHash(o.cutout)}`;
  const sinT = Math.sin(g.theta);
  const order = Array.from({ length: g.panels }, (_, i) => i).sort((a, b) => (g.zs[a] as number) + (g.zs[a + 1] as number) - ((g.zs[b] as number) + (g.zs[b + 1] as number)));
  for (const i of order) {
    const phi = (anim[i] as PanelAnim).phi;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    // Facing away from the light prints darker; the underside darkens further while the panel is falling.
    const shade = Math.min(0.85, (i % 2 ? 0.5 : 0.04) * sinT * cp + 0.1 * sp + 0.3 * Math.sin(2 * phi));
    const crease = i > 0 ? 0.85 * sinT * Math.max(0, cp) : 0;
    const tex = shadedTexture(i, panelTexture(cut, g, i, tw, th, texKey), shade, crease, rx);
    paintPanel(ctx, base, g, i, phi, tex);
  }
  paintScraps(ctx, g, seed, c, anim);
};

/** Screen bounding box of the strip (its sheet outline, scraps not included) at the given collapse. */
export const foldedCityBox = (o: Omit<FoldCityOpts, 'collapse'>, collapse: number): { x: number; y: number; w: number; h: number } => {
  const W = 1920;
  const H = 1080;
  const g = makeGeo(W, H, o);
  const anim = animOf(g, o.seed ?? 'fold', clamp01(collapse));
  const cut = o.cutout;
  /** Roof line height (0..1 of the frame) at source x, linearly interpolated along the cut-out polygon. */
  const roofV = (x: number): number => {
    if (!cut || cut.length < 2) return 0;
    let best = 1;
    for (let k = 0; k < cut.length - 1; k++) {
      const [xa, ya] = cut[k] as readonly [number, number];
      const [xb, yb] = cut[k + 1] as readonly [number, number];
      if (x >= Math.min(xa, xb) && x <= Math.max(xa, xb)) best = Math.min(best, (xb === xa ? Math.min(ya, yb) : ya + ((yb - ya) * (x - xa)) / (xb - xa)) / H);
    }
    return Math.min(1, Math.max(0, best));
  };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = ([x, y]: [number, number]): void => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (let i = 0; i < g.panels; i++) {
    const phi = (anim[i] as PanelAnim).phi;
    add(panelPoint(g, i, 0, 1, phi));
    add(panelPoint(g, i, 1, 1, phi));
    add(panelPoint(g, i, 0, roofV(i * g.pw + 0.5), phi));
    add(panelPoint(g, i, 1, roofV((i + 1) * g.pw - 0.5), phi));
    if (cut) {
      for (const [px, py] of cut) {
        const s = (px - i * g.pw) / g.pw;
        if (s > 0 && s < 1) add(panelPoint(g, i, s, py / H, phi));
      }
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
