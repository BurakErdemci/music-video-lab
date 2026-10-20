// The world after the glass (song frames 6396-6864): his navy plate left of the seam, her cream plate right of it, no
// glass. On every downbeat (bars 117-121) a cut and one step closer; their plates mix as print dots that grow each bar
// (cream dots along his edges, navy dots along hers, a halftone band where the two fields meet), the whole moon above
// the seam grows. Bar 122 (6782, the loudest bar of the song): the palms meet; heart.ts prints the bus heart between
// them and grows it over the frame into ONE moon-yellow field. The union silhouette below (unionBox...) is the yellow
// plate the reset keeps on the paper through the white print.
//
// Drawings (all reused, none new): h-palm-full/a-palm-full (palms raised, the glass poses), h-cross/a-step1/a-cross
// (mid-stride), h-hand/a-step2/a-hand (standing, hand offered). Scale 1 for him, 0.925 for her (their palms meet at the
// same height, as at the glass).
import { paintLayers } from '../../compose2d.ts';
import { LIFT_PAD, paintCharacter } from '../../life.ts';
import { palette } from '../../../style/palette.ts';
import { seeded } from '../../../style/seeded.ts';
import { clamp01, lerp } from '../../../math.ts';
import { HUMAN_BREATH, AI_BREATH } from '../figures.ts';
import { paintMoonHalves, SEAM, FLOOR } from '../splitSet.ts';
import { canvasLayer, easeIn, easeOut, getImg, mixCam, sec, sine, sp, span, spriteUrls, url, type Cam, type Layer, type Painter, type Rect } from '../common.ts';
import { distField, edgeRadius, INK, paintDotScreen, type DistField } from './dots.ts';
import { beatKick, F_PRINT, F_UNION, STEPS, stepAt } from './timeline.ts';

const AI_S = 0.925;
const DOT = 7; // dot grid step in sprite px

interface Pose {
  he: string;
  she: string;
  /** Gap between the two front edges (glassX for the palm poses) in world px. */
  gap: number;
}
/** k = -1 the flight (blown apart, palms still raised), 0..4 the steps, 5 the union. */
const POSES: Record<number, Pose> = {
  [-1]: { he: 'h-palm-full', she: 'a-palm-full', gap: 1500 },
  0: { he: 'h-cross', she: 'a-step1', gap: 880 },
  1: { he: 'h-hand', she: 'a-step2', gap: 660 },
  2: { he: 'h-cross', she: 'a-cross', gap: 450 },
  3: { he: 'h-hand', she: 'a-hand', gap: 300 },
  4: { he: 'h-palm-full', she: 'a-palm-full', gap: 64 },
  5: { he: 'h-palm-full', she: 'a-palm-full', gap: 0 },
};
/** How far the other plate's dots reach into each silhouette (sprite px), per step. */
const REACH = [0, 14, 25, 36, 48, 48];
/** Half width of the halftone band where the two fields meet (world px), per step. */
const BAND = [0, 50, 100, 160, 220, 220];
/** The whole moon: centre y and radius (world px on its plane), per step. */
const MOON_Y = [250, 240, 228, 214, 196];
const MOON_RAD = [74, 96, 122, 152, 188];
const D_FIELD = 420;
const D_MOON = 240;

export const WORLD_SPRITES = ['h-palm-full', 'a-palm-full', 'h-cross', 'a-step1', 'h-hand', 'a-step2', 'a-cross', 'a-hand'];
export const WORLD_IMAGES: readonly string[] = spriteUrls(WORLD_SPRITES);

const isHer = (n: string): boolean => n.startsWith('a-');
const front = (n: string): number => {
  const m = sp(n);
  if (typeof m.glassX === 'number') return m.glassX;
  return isHer(n) ? (m.bbox[0] as number) : (m.bbox[2] as number);
};
const floorOf = (n: string): number => {
  const m = sp(n);
  return typeof m.floorY === 'number' ? m.floorY : (m.bbox[3] as number);
};
/** World rect of a figure (incl. the lift pad on top) for step k. */
export const figRect = (n: string, k: number, dd: number): Rect => {
  const m = sp(n);
  const s = isHer(n) ? AI_S : 1;
  const gap = (POSES[k] as Pose).gap;
  const fx = isHer(n) ? SEAM + gap / 2 : SEAM - gap / 2;
  return { x: fx - front(n) * s, y: FLOOR - (floorOf(n) + LIFT_PAD) * s, w: m.w * s, h: (m.h + LIFT_PAD) * s };
};

export const fieldOf = (n: string): DistField => {
  const m = sp(n);
  return distField(`p4f:fig:${n}`, m.w, m.h, (ctx) => ctx.drawImage(getImg(url(n)), 0, 0));
};

/** A figure with the other plate's dots along its edges. */
const figureLayer = (n: string, k: number, f: number, dd: number, reach: number): Layer => {
  const m = sp(n);
  const her = isHer(n);
  return canvasLayer(her ? 'f-she' : 'f-he', `p4f:fig:${n}`, m.w, m.h + LIFT_PAD, dd, figRect(n, k, dd), (ctx, cw, ch) => {
    paintCharacter(ctx, cw, ch, getImg(url(n)), { t: sec(f), breath: her ? AI_BREATH : HUMAN_BREATH });
    if (reach > 0.5) paintDotScreen(ctx, fieldOf(n), DOT, her ? 15 : 45, her ? INK.navy : INK.cream, edgeRadius(DOT, reach), { oy: LIFT_PAD, atop: true });
  });
};

// ---- the field: two plates and the band where they mix

const FIELD: Rect = { x: -3600, y: -2600, w: 9100, h: 6000 };
// Flat plates as separate layers: a stretched tiny canvas would blur the seam over one texel (~140 world px).
const flat = (id: string, color: string, d: number, r: Rect): Layer =>
  canvasLayer(id, `p4f:flat:${color}`, 4, 4, d, r, (ctx, cw, ch) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cw, ch);
  });
const fieldLayers = (dd: number): Layer[] => [
  flat('field', palette.navy, D_FIELD + dd, FIELD),
  flat('field-cream', palette.cream, D_FIELD + dd, { x: SEAM, y: FIELD.y, w: FIELD.x + FIELD.w - SEAM, h: FIELD.h }),
];

/** The seam's halftone band on the field plane: cream dots on his navy, navy dots on her cream, 50 % at the seam. */
// full resolution and a coarse screen (24 px): a stretched, fine screen averaged to grey when seen from a distance
const BAND_BOX: Rect = { x: SEAM - 560, y: -700, w: 1120, h: 2500 };
const BAND_RES = 1;
const bandLayer = (dd: number, half: number): Layer =>
  canvasLayer('band', 'p4f:band', BAND_BOX.w * BAND_RES, BAND_BOX.h * BAND_RES, D_FIELD + dd, BAND_BOX, (ctx, cw, ch) => {
    if (half < 1) return;
    const step = 24 * BAND_RES;
    const sx = (SEAM - BAND_BOX.x) * BAND_RES;
    const hb = half * BAND_RES;
    for (const side of [-1, 1] as const) {
      ctx.fillStyle = side < 0 ? palette.cream : palette.navy;
      ctx.beginPath();
      const a = side < 0 ? Math.PI / 4 : Math.PI / 12;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const n = Math.ceil(Math.hypot(cw, ch) / step / 2) + 1;
      for (let j = -n; j <= n; j++) {
        for (let i = -n; i <= n; i++) {
          const x = cw / 2 + i * step * ca - j * step * sa;
          const y = ch / 2 + i * step * sa + j * step * ca;
          if (y < -step || y > ch + step) continue;
          const t = (x - sx) / hb;
          if (side < 0 ? t >= 0 || t < -1 : t < 0 || t > 1) continue;
          const cov = 0.42 * (1 - Math.abs(t));
          const r = step * Math.sqrt(cov / Math.PI);
          if (r < 0.2) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }
  });

/** The ground under them: a darker strip of each plate below the floor line and a thin line of the other ink. */
const GROUND: Rect = { x: -3000, y: FLOOR, w: 7920, h: 1400 };
const groundLayer = (dd: number): Layer =>
  canvasLayer('ground', 'p4f:ground', 1584, 280, dd, GROUND, (ctx, cw, ch) => {
    const sx = ((SEAM - GROUND.x) / GROUND.w) * cw;
    ctx.fillStyle = '#141B33';
    ctx.fillRect(0, 0, sx, ch);
    ctx.fillStyle = '#ECE7D9';
    ctx.fillRect(sx, 0, cw - sx, ch);
    ctx.fillStyle = 'rgba(243,239,228,0.5)';
    ctx.fillRect(0, 0, sx, 1);
    ctx.fillStyle = 'rgba(24,32,58,0.45)';
    ctx.fillRect(sx, 0, cw - sx, 1);
    const r = seeded('p4f:ground');
    for (let i = 0; i < 900; i++) {
      const x = r() * cw;
      ctx.fillStyle = x < sx ? 'rgba(243,239,228,0.14)' : 'rgba(24,32,58,0.12)';
      ctx.fillRect(x, r() * ch, 1 + r() * 2, 1);
    }
  });

/** The whole moon with a halo of moon-yellow dots that grows with `halo` (0..1). */
const moonLayer = (id: string, dd: number, cy: number, rad: number, halo: number): Layer => {
  const s = rad * 2.5 * 1.6;
  return canvasLayer(id, `p4f:${id}`, 640, 640, D_MOON + dd, { x: SEAM - s / 2, y: cy - s / 2, w: s, h: s }, (ctx, cw, ch) => {
    // the drawn moon in the middle 1/1.6 of the canvas (its disc radius = 0.4 of that)
    const inner = cw / 1.6;
    ctx.save();
    ctx.translate((cw - inner) / 2, (ch - inner) / 2);
    paintMoonHalves(ctx, inner, inner, { phase: 1, misalign: 0, whole: 1 });
    ctx.restore();
    if (halo <= 0.01) return;
    const R = inner * 0.4;
    const reach = R * 0.62 * halo;
    const step = 11;
    ctx.fillStyle = palette.moonYellow;
    ctx.beginPath();
    const n = Math.ceil(cw / step / 2) + 1;
    const a = Math.PI / 4;
    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const x = cw / 2 + (i * Math.cos(a) - j * Math.sin(a)) * step;
        const y = ch / 2 + (i * Math.sin(a) + j * Math.cos(a)) * step;
        const d = Math.hypot(x - cw / 2, y - ch / 2) - R - 2;
        if (d < 0 || d > reach) continue;
        const r = step * 0.55 * Math.sqrt(clamp01(1 - d / reach));
        if (r < 0.3) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  });
};

// ---- the yellow imprint between the hands (bar 121) and the union (bar 122)

export const palmPoint = (n: string, k: number, dd: number): [number, number] => {
  const m = sp(n);
  const r = figRect(n, k, dd);
  const s = isHer(n) ? AI_S : 1;
  const p = m.palm as [number, number];
  return [r.x + p[0] * s, r.y + (p[1] + LIFT_PAD) * s];
};
const IMPRINT_R = 90;
/**
 * THE YELLOW IMPRINT (the tease lane matches this look): moon-yellow #F0D35A dots, no outline, no glow, on a 7 px grid
 * at 45 degrees, centred on the contact point; dot radius 0.58 x 7 x sqrt(1 - d / reach) with d measured in an upright
 * lens (horizontal distance x 1.6, vertical x 0.6), so it is a tall oval between two touching hands; reach up to 90 px.
 * Here it gathers over bar 121 (strength e 0.1 -> 1, ease-in) and is replaced by the union on the downbeat.
 */
const imprintLayer = (dd: number, e: number): Layer => {
  const a = palmPoint('h-palm-full', 4, dd);
  const b = palmPoint('a-palm-full', 4, dd);
  const c: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const box: Rect = { x: c[0] - IMPRINT_R * 1.6, y: c[1] - IMPRINT_R * 1.6, w: IMPRINT_R * 3.2, h: IMPRINT_R * 3.2 };
  return canvasLayer('imprint', 'p4f:imprint', box.w, box.h, dd - 1, box, (ctx, cw, ch) => {
    const step = 7;
    const reach = IMPRINT_R * e;
    if (reach < 1) return;
    ctx.fillStyle = palette.moonYellow;
    ctx.beginPath();
    const n = Math.ceil(cw / step / 2) + 1;
    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const x = cw / 2 + (i - j) * step * Math.SQRT1_2;
        const y = ch / 2 + (i + j) * step * Math.SQRT1_2;
        // an upright lens between the two palms: vertical distance counts less
        const d = Math.hypot((x - cw / 2) * 1.6, (y - ch / 2) * 0.6);
        if (d > reach) continue;
        const r = step * 0.58 * Math.sqrt(clamp01(1 - d / reach));
        if (r < 0.3) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  });
};

/** The union canvas: both silhouettes at the touch, in world px, with a margin for the keyline and the ink fringe. */
const U_MARGIN = 90;
export const unionBoxRect = (): Rect => unionBox();
const unionBox = (): Rect => {
  const a = figRect('h-palm-full', 5, 0);
  const b = figRect('a-palm-full', 5, 0);
  const x0 = Math.min(a.x, b.x) - U_MARGIN;
  const y0 = Math.min(a.y, b.y) - U_MARGIN;
  const x1 = Math.max(a.x + a.w, b.x + b.w) + U_MARGIN;
  const y1 = Math.max(a.y + a.h, b.y + b.h) + U_MARGIN;
  return { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
};
const drawUnionMask = (ctx: CanvasRenderingContext2D): void => {
  const box = unionBox();
  for (const n of ['h-palm-full', 'a-palm-full']) {
    const r = figRect(n, 5, 0);
    const s = isHer(n) ? AI_S : 1;
    ctx.drawImage(getImg(url(n)), r.x - box.x, r.y - box.y + LIFT_PAD * s, sp(n).w * s, sp(n).h * s);
  }
  // the palms' contact: a small bridge so the two hands are one shape
  const p = palmPoint('h-palm-full', 5, 0);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(p[0] - box.x + 4, p[1] - box.y, 12, 34, 0, 0, Math.PI * 2);
  ctx.fill();
};
const unionField = (): DistField => {
  const b = unionBox();
  return distField('p4f:union', b.w, b.h, drawUnionMask);
};
/** Static part of the union print (cached): navy keyline 7 px, solid moon-yellow fill. */
let unionSolid: HTMLCanvasElement | null = null;
const unionSolidCanvas = (): HTMLCanvasElement => {
  if (unionSolid) return unionSolid;
  const fd = unionField();
  const c = document.createElement('canvas');
  c.width = fd.w;
  c.height = fd.h;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const im = ctx.createImageData(fd.w, fd.h);
  const NAV = [0x18, 0x20, 0x3a];
  const YEL = [0xf0, 0xd3, 0x5a];
  for (let i = 0; i < fd.w * fd.h; i++) {
    const din = fd.din[i] as number;
    const dout = fd.dout[i] as number;
    let col: number[] | null = null;
    let a = 1;
    if (din > 0) col = YEL;
    else if (dout <= 7) {
      col = NAV;
      a = clamp01(7.8 - dout);
    }
    if (!col) continue;
    im.data[i * 4] = col[0] as number;
    im.data[i * 4 + 1] = col[1] as number;
    im.data[i * 4 + 2] = col[2] as number;
    im.data[i * 4 + 3] = Math.round(a * 255);
  }
  ctx.putImageData(im, 0, 0);
  unionSolid = c;
  return c;
};

// ---- layers and camera

/** Every plane of the world at song frame f; `dd` pushes the whole world back (the flight sees it far behind the glass). */
export const worldLayers = (f: number, dd = 0): Layer[] => {
  const k = stepAt(f);
  // from the union on (k = 5) the picture is the last step's, at contact; heart.ts prints the one field over it
  const k0 = Math.max(0, Math.min(4, k));
  const kick = k >= 0 ? beatKick(f, k < 5 ? (STEPS[k] as number) : F_UNION, 6) : 0;
  const halo = k < 0 ? 0 : [0.12, 0.25, 0.4, 0.55, 0.75][k0]! + 0.12 * kick;
  const out: Layer[] = [
    ...fieldLayers(dd),
    bandLayer(dd, k < 0 ? 0 : (BAND[k0] as number) * (1 + 0.06 * kick)),
    moonLayer('moon', dd, MOON_Y[k0] as number, (MOON_RAD[k0] as number) * (k < 0 ? 0.9 : 1) * (1 + 0.04 * kick), halo),
    groundLayer(dd),
    ...figures(f, k, dd, 1 + 0.12 * kick),
  ];
  if (k >= 4) out.push(imprintLayer(dd, k >= 5 ? 1 : easeIn(span(f, STEPS[4] as number, F_UNION)) * 0.9 + 0.1));
  return out;
};

const figures = (f: number, k: number, dd: number, pulse: number): Layer[] => {
  const p = POSES[k] as Pose;
  const reach = (REACH[Math.max(0, Math.min(5, k))] as number) * pulse;
  return [figureLayer(p.he, k, f, dd, k < 0 ? 0 : reach), figureLayer(p.she, k, f, dd, k < 0 ? 0 : reach)];
};

/** Each shot's camera: [start, end] of its slow move; beats add a short punch-in. */
const SHOT_CAMS: [Cam, Cam][] = [
  [{ x: 880, y: 590, z: 1150 }, { x: 900, y: 590, z: 1060 }],
  [{ x: 480, y: 560, z: 780 }, { x: 550, y: 560, z: 700 }],
  [{ x: 1480, y: 560, z: 780 }, { x: 1410, y: 560, z: 700 }],
  [{ x: 960, y: 600, z: 1040 }, { x: 960, y: 590, z: 930 }],
  [{ x: 960, y: 420, z: 640 }, { x: 960, y: 395, z: 455 }],
];
export const CAM_UNION: [Cam, Cam] = [
  { x: 960, y: 575, z: 960 },
  { x: 960, y: 560, z: 830 },
];
/** The camera of the flight's last frame (the wide of the blown-apart pair), before the world is pushed back. */
export const CAM_FLIGHT_END: Cam = { x: 960, y: 600, z: 1560 };

export const worldCam = (f: number): Cam => {
  const k = stepAt(f);
  if (k >= 5) {
    // the union: a wide that keeps pushing in, through the white print (the reset's from side runs to 6864)
    const u = sine(span(f, F_UNION, F_PRINT));
    const c = mixCam(CAM_UNION[0], CAM_UNION[1], u);
    const after = Math.max(0, f - F_PRINT);
    const kick = beatKick(f, F_UNION + 1, 5);
    return { x: c.x, y: c.y, z: (c.z - after * 3.2) * (1 - 0.025 * kick) };
  }
  if (k < 0) return CAM_FLIGHT_END;
  const a = STEPS[k] as number;
  const b = k < 4 ? (STEPS[k + 1] as number) : F_UNION;
  const pair = SHOT_CAMS[k] as [Cam, Cam];
  const u = k === 4 ? easeIn(span(f, a, b)) * 0.7 + 0.3 * span(f, a, b) : sine(span(f, a, b));
  const c = mixCam(pair[0], pair[1], u);
  const kick = beatKick(f, a, 5);
  return { x: c.x, y: c.y, z: c.z * (1 - 0.035 * kick) };
};

/** The union picture in 2D (the white SqueegeePrint's from side). */
export const worldPainter =
  (f: number): Painter =>
  (ctx, w, h) => {
    ctx.fillStyle = palette.navy;
    ctx.fillRect(0, 0, w, h);
    paintLayers(ctx, worldLayers(f), worldCam(f), f, w, h);
  };

/** Full-frame flash on the touch (screen space): cream, 2 frames high, then gone over 8. */
export const unionFlash = (f: number): Painter | undefined => {
  const k = f - F_UNION;
  if (k < 0 || k >= 3) return undefined;
  // the hit of the touch: one bright frame, gone in three (the heart is drawn right after it)
  const a = 0.85 * (1 - k / 3) ** 1.5;
  return (ctx, w, h) => {
    ctx.fillStyle = `rgba(255,250,232,${a.toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  };
};

// ---- the union after the print (the reset's yellow plate): its screen rect and its own halftone

/** The union's solid print (cached) and where it sits on screen under the world camera of frame f. */
export const unionOnScreen = (f: number): { canvas: HTMLCanvasElement; rect: Rect } => {
  const box = unionBox();
  const cam = worldCam(f);
  const k = 1000 / cam.z;
  return { canvas: unionSolidCanvas(), rect: { x: 960 + (box.x - cam.x) * k, y: 540 + (box.y - cam.y) * k, w: box.w * k, h: box.h * k } };
};
/** Grid points (world px) inside the union on a 16 px grid at 45 degrees: the dots the union breaks into. */
let unionPts: [number, number][] | null = null;
export const unionDots = (): readonly [number, number][] => {
  if (unionPts) return unionPts;
  const fd = unionField();
  const box = unionBox();
  const out: [number, number][] = [];
  const step = 16;
  const n = Math.ceil(Math.hypot(fd.w, fd.h) / step / 2) + 1;
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const x = fd.w / 2 + (i - j) * step * Math.SQRT1_2;
      const y = fd.h / 2 + (i + j) * step * Math.SQRT1_2;
      if (x < 0 || y < 0 || x >= fd.w || y >= fd.h) continue;
      if ((fd.din[Math.floor(y) * fd.w + Math.floor(x)] as number) > 2) out.push([box.x + x, box.y + y]);
    }
  }
  unionPts = out;
  return out;
};

void lerp;
