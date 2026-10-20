// coda: song frames 6396-6836 (scene 16, "Part4b: the shatter and the crossing"). The picture glass of glassB breaks
// from the palms' meeting point (shards = real Three.js geometry, ShatterStage.tsx), the NEW world behind it has the
// moon whole for the first time and no glass between them; then four cuts on the downbeats (palms close up, he steps
// into her cream, she steps into his navy, hand in hand under the whole moon) and from 6672 one slow camera move
// through the drifting shards to the pair under the moon. Every shard has passed the camera by 6828; frames 6830+ are
// planes only, and codaPainter(f) is that same picture in 2D (the reset's white SqueegeePrint "from" side).
import { paintLayers } from '../compose2d.ts';
import { paintMoonHalves, D_SKYROOM, FLOOR, SEAM, MOON_C, MOON_R, pressLayers } from './splitSet.ts';
import { glassBStage } from './glassB.ts';
import { aiLayers, HUMAN_BREATH, paintNote } from './figures.ts';
import { buildShards, type ShardSet, type Zone } from './shards.ts';
import {
  canvasLayer,
  charLayer,
  easeInOut,
  easeOut,
  ev,
  hasSprite,
  headOf,
  mixCam,
  placeAt,
  num,
  pose,
  sec,
  sine,
  sp,
  span,
  spriteRectAt,
  spriteUrls,
  type Cam,
  type Layer,
  type Painter,
  type Rect,
  type Shot,
} from './common.ts';
import { seeded } from '../../style/seeded.ts';
import { palette } from '../../style/palette.ts';

export const CODA_IMAGES: readonly string[] = [...new Set(spriteUrls([pose('h-cross'), pose('a-cross'), pose('pair-back'), 'h-hand', 'ai-stand']))];

const F_SHATTER = ev('SHATTER');
const F_CLOSE = ev('coda: closer');
const F_HE = ev('coda: he steps');
const F_SHE = ev('coda: she steps');
const F_PAIR = ev('coda: hand in hand');
const F_MOVE = ev('coda: the camera moves');
/** Last frame of the coda; the camera is nearly still from ~6820 and keeps creeping for the reset's from side. */
const F_END = 6836;
const F_SETTLE = 6832;

// ---- the picture just before the cut (glassB's last frame) = the shards' source and the first camera

const GB_END = 6395;
let gbCache: ReturnType<typeof glassBStage> | null = null;
const gb = (): ReturnType<typeof glassBStage> => (gbCache ??= glassBStage(GB_END));

// ---- cameras

const CAM_CLOSE: [Cam, Cam] = [
  { x: 960, y: 478, z: 690 },
  { x: 962, y: 486, z: 650 },
];
const CAM_HE: [Cam, Cam] = [
  { x: 1215, y: 540, z: 900 },
  { x: 1240, y: 540, z: 850 },
];
const CAM_SHE: [Cam, Cam] = [
  { x: 740, y: 540, z: 900 },
  { x: 715, y: 540, z: 850 },
];
const CAM_PAIR0: Cam = { x: 960, y: 640, z: 1250 };
const CAM_PAIR1: Cam = { x: 960, y: 600, z: 1000 };

/** The jolt of the break: a decaying wobble of the camera for ~10 frames. */
const jolt = (f: number): [number, number] => {
  const k = f - F_SHATTER;
  if (k < 1 || k > 14) return [0, 0];
  const a = 9 * Math.exp(-k / 3.2);
  return [a * Math.sin(k * 2.3), a * 0.7 * Math.cos(k * 1.9)];
};

export const camAt = (f: number): Cam => {
  if (f < F_CLOSE) {
    const c = mixCam(gb().cam, { x: 960, y: 466, z: 722 }, easeOut(span(f, F_SHATTER, F_CLOSE)));
    const [jx, jy] = jolt(f);
    return { x: c.x + jx, y: c.y + jy, z: c.z };
  }
  if (f < F_HE) return mixCam(CAM_CLOSE[0], CAM_CLOSE[1], sine(span(f, F_CLOSE, F_HE)));
  if (f < F_SHE) return mixCam(CAM_HE[0], CAM_HE[1], sine(span(f, F_HE, F_SHE)));
  if (f < F_PAIR) return mixCam(CAM_SHE[0], CAM_SHE[1], sine(span(f, F_SHE, F_PAIR)));
  const u = easeInOut(span(f, F_PAIR, F_SETTLE));
  const c = mixCam(CAM_PAIR0, CAM_PAIR1, u);
  // after the move the camera only creeps (the reset's from side continues it)
  const creep = Math.max(0, f - F_SETTLE) * 0.12;
  return { x: c.x, y: c.y, z: c.z - creep };
};

// ---- the new world

const KEEP = new Set(['sroom', 'smoon', 'his-notes', 'tally', 'mugs', 'cream', 'floor', 'seam']);

/** The whole moon: one disc over the seam, no seam through it. `size` scales the base moon. */
const moonLayer = (size: number, cy: number): Layer => {
  const s = (MOON_R / 0.4) * size;
  return canvasLayer('coda-moon', 'p4:coda-moon', 420, 420, 0, { x: SEAM - s / 2, y: cy - s / 2, w: s, h: s }, (ctx, cw, ch) => paintMoonHalves(ctx, cw, ch, { phase: 1, misalign: 0, whole: 1 }));
};

/** His room (notes, tally, mugs), her cream with her one mark, the seam: glassB's own back plates, so the world behind the
 * glass is the one the picture showed. */
const backdrop = (): { back: Layer[]; mark: Layer[] } => {
  const ls = gb().layers;
  return { back: ls.filter((l) => KEEP.has(l.id)), mark: ls.filter((l) => l.id === 'her-mark') };
};

const GROUND_TOP = FLOOR;
/** Horizon of the night lake on the far plane (world y there). */
const Y_H = 827;
const D_FAR = 420;
const D_MOON = 300;

/** Rows of reflected-moon dashes in canvas px: `x` centre, rows from y0 to y1 (canvas px), half width per row (canvas px). */
const paintPath = (ctx: CanvasRenderingContext2D, f: number, key: string, cx: number, y0: number, y1: number, half: (y: number) => number, sc: number, thick: number): void => {
  const t = sec(f);
  for (let y = y0; y < y1; y += 2.4) {
    const h = half(y);
    const n = 3 + Math.floor(h / (9 * sc));
    const grow = (y - y0) / (y1 - y0);
    for (let k = 0; k < n; k++) {
      const rr = seeded(`${key}:${Math.floor(y)}:${k}`);
      const off = (rr() - 0.5) * 2 * h + 6 * Math.sin(t * 0.9 + rr() * 6.3) * sc * (0.3 + grow);
      const len = (7 + rr() * 30) * sc * (0.45 + grow * 1.4);
      const a = (0.35 + 0.6 * rr()) * (1 - 0.5 * Math.abs(off) / h);
      ctx.fillStyle = `rgba(240,211,90,${a.toFixed(3)})`;
      ctx.fillRect(cx + off - len / 2, y, len, thick * (0.7 + grow * 1.5));
    }
  }
};

/** The far plane: night sky down to a horizon, the lake below it, and the moon's reflection column on the lake. */
const nightLayers = (f: number): Layer[] => {
  const box: Rect = { x: -1100, y: -700, w: 4200, h: 2500 };
  const sc = 0.25;
  const sky = canvasLayer('night', 'p4:coda-night', box.w * sc, box.h * sc, D_FAR, box, (ctx, cw, ch) => {
    const hy = (Y_H - box.y) * sc;
    const g = ctx.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, '#141b33');
    g.addColorStop(1, '#2a3a6c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, hy);
    const lg = ctx.createLinearGradient(0, hy, 0, ch);
    lg.addColorStop(0, '#2c3d72');
    lg.addColorStop(1, '#18203A');
    ctx.fillStyle = lg;
    ctx.fillRect(0, hy, cw, ch - hy);
    const r = seeded('p4:stars');
    ctx.fillStyle = 'rgba(243,239,228,0.7)';
    for (let i = 0; i < 260; i++) {
      const y = r() * hy * 0.9;
      ctx.fillRect(r() * cw, y, 1.2 + r() * 1.6, 1.2 + r() * 1.6);
    }
    // the horizon: a thin light line
    ctx.fillStyle = 'rgba(243,239,228,0.55)';
    ctx.fillRect(0, hy - 0.5, cw, 1.4);
  });
  const lake: Rect = { x: 380, y: Y_H, w: 1160, h: 900 };
  const lsc = 0.8;
  const lakeLayer = canvasLayer('lake', 'p4:coda-lake', lake.w * lsc, lake.h * lsc, D_FAR, lake, (ctx) => {
    const cx = (SEAM - lake.x) * lsc;
    paintPath(ctx, f, 'p4:lake', cx, 0, 560 * lsc, (y) => (6 + (y / lsc) * 0.22) * lsc, lsc, 1.5);
  });
  return [sky, lakeLayer];
};

/** The near ground (navy) below the wall bases, with the long path of moon light that continues the lake's reflection. */
const groundLayer = (f: number): Layer => {
  const box: Rect = { x: -700, y: GROUND_TOP, w: 3400, h: 700 };
  const sc = 0.8;
  return canvasLayer('ground', 'p4:coda-ground', box.w * sc, box.h * sc, 0, box, (ctx, cw, ch) => {
    ctx.fillStyle = palette.navy;
    ctx.fillRect(0, 0, cw, ch);
    const r = seeded('p4:ground');
    ctx.fillStyle = 'rgba(243,239,228,0.16)';
    for (let i = 0; i < 800; i++) ctx.fillRect(r() * cw, r() * ch, 1 + r() * 2.5, 1 + r() * 1.2);
    paintPath(ctx, f, 'p4:path', (SEAM - box.x) * sc, 0, ch, (y) => (58 + (y / sc) * 0.3) * sc, sc, 1.8);
    const g = ctx.createLinearGradient(0, 0, 0, 40 * sc);
    g.addColorStop(0, 'rgba(24,32,58,0.9)');
    g.addColorStop(1, 'rgba(24,32,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, 40 * sc);
  });
};

/** The big whole moon of the last picture: on the far-middle plane, sized and placed as the END camera sees it. */
const bigMoon = (): Layer => {
  const side = 270 / 0.8;
  const r = placeAt({ x: SEAM - side / 2, y: 175 - side / 2, w: side, h: side }, D_MOON, CAM_PAIR1);
  return canvasLayer('coda-moon', 'p4:coda-moon', 420, 420, D_MOON, r, (ctx, cw, ch) => paintMoonHalves(ctx, cw, ch, { phase: 1, misalign: 0, whole: 1 }));
};

const HIS_IDS = new Set(['sroom', 'smoon', 'his-notes', 'tally']);
const HER_IDS = new Set(['cream', 'floor', 'seam', 'her-mark']);
const GAP_HIS = -360;
const GAP_MUG = -300;
const GAP_HER = 330;
/** The two worlds drawn apart: his wall slid left and her cream right, opening the night between them. */
const openedBack = (): Layer[] => {
  const { back, mark } = backdrop();
  return [...back, ...mark].map((l) => (HIS_IDS.has(l.id) ? { ...l, x: l.x + GAP_HIS } : l.id === 'mugs' ? { ...l, x: l.x + GAP_MUG } : HER_IDS.has(l.id) ? { ...l, x: l.x + GAP_HER } : l));
};

const AI_HEAD = (840 / 889) * 136; // screen height of the AI's head at the glass (every standing AI drawing)
const HUMAN_H = 800;
const HUMAN_HEAD = 146; // screen height of the standing man's head at the glass (glassB's SPLIT_HEAD) // screen height of the standing man at the glass

/** A drawing placed by its floor and horizontal centre; `scale` by the measured head (AI) or by its height (human). */
const figureRect = (name: string, cx: number, floor: number, mode: 'ai' | 'human'): { r: Rect; s: number } => {
  const m = sp(name);
  const bb = m.bbox as [number, number, number, number];
  const fy = typeof m.floorY === 'number' ? m.floorY : bb[3];
  const hd = headOf(name);
  const s = mode === 'ai' ? (hd ? AI_HEAD / hd.h : 840 / (fy - bb[1])) : hd ? Math.min(HUMAN_HEAD / hd.h, 900 / (fy - bb[1])) : HUMAN_H / (fy - bb[1]);
  return { r: { x: cx - ((bb[0] + bb[2]) / 2) * s, y: floor - fy * s, w: m.w * s, h: m.h * s }, s };
};

const HE_X = 1265;
const SHE_X = 690;
const heLayers = (f: number): Layer[] => {
  const n = pose('h-cross');
  const { s } = figureRect(n, HE_X, FLOOR, 'human');
  const m = sp(n);
  const rect = spriteRectAt(n, s, ((m.bbox[0] as number) + (m.bbox[2] as number)) / 2, typeof m.floorY === 'number' ? m.floorY : (m.bbox[3] as number), HE_X, FLOOR);
  const hair = m.hair ? { ...m.hair, amp: 1.4, face: 'right' as const } : undefined;
  return [charLayer('human', n, rect, 0, sec(f), { breath: HUMAN_BREATH, hair })];
};
const sheLayers = (f: number): Layer[] => {
  const n = pose('a-cross');
  const { r } = figureRect(n, SHE_X, FLOOR, 'ai');
  return aiLayers('ai', n, r, 0, f, { blinks: [6580, 6650] });
};

const PAIR_FEET = 1070;
const PAIR_S = 0.77;
/** The two of them from behind, hand in hand, on the seam. Stand-in until pair-back exists: ai-stand beside h-hand. */
const pairLayers = (f: number): Layer[] => {
  const n = pose('pair-back');
  if (n === 'pair-back' && hasSprite(n)) {
    const rect = spriteRectAt(n, PAIR_S, num(n, 'seam'), num(n, 'floorY'), SEAM, PAIR_FEET);
    return [charLayer('pair', n, rect, 0, sec(f), { breath: { ...HUMAN_BREATH, amp: 0.006 } })];
  }
  const h = figureRect('h-hand', SEAM - 140, PAIR_FEET, 'human');
  const a = figureRect('ai-stand', SEAM + 90, PAIR_FEET, 'ai');
  const hs = spriteRectAt('h-hand', h.s, (sp('h-hand').bbox[0] as number + (sp('h-hand').bbox[2] as number)) / 2, sp('h-hand').bbox[3] as number, SEAM - 140, PAIR_FEET);
  return [charLayer('human', 'h-hand', hs, 0, sec(f), { breath: HUMAN_BREATH }), ...aiLayers('ai', 'ai-stand', a.r, 0, f, {})];
};

/** Her side's pines (navy silhouettes with print speckle) on the cream wall, right of the seam. */
const treesLayer = (): Layer => {
  const box: Rect = { x: 1380, y: 330, w: 1000, h: 700 };
  const sc = 0.8;
  return canvasLayer('coda-trees', 'p4:coda-trees', box.w * sc, box.h * sc, 30, box, (ctx) => {
    ctx.save();
    ctx.scale(sc, sc);
    ctx.translate(-box.x, -box.y);
    const pine = (cx: number, base: number, h: number, w: number, seed: string): void => {
      const r = seeded(seed);
      ctx.fillStyle = palette.navy;
      ctx.fillRect(cx - w * 0.03, base - h * 0.2, w * 0.06, h * 0.2 + 4);
      const tiers = 9;
      for (let t = 0; t < tiers; t++) {
        const y1 = base - h * 0.14 - (t / tiers) * h * 0.86;
        const th = (h / tiers) * 2.0;
        const tw = w * (1 - t / (tiers + 0.5)) * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, y1 - th);
        const n = 7;
        for (let i = 1; i <= n; i++) ctx.lineTo(cx + tw * (i / n) * (0.9 + r() * 0.3), y1 - th + (th * i) / n + (i % 2 ? -4 : 5) * r());
        ctx.lineTo(cx, y1 + 6);
        for (let i = n; i >= 1; i--) ctx.lineTo(cx - tw * (i / n) * (0.9 + r() * 0.3), y1 - th + (th * i) / n + (i % 2 ? -4 : 5) * r());
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(243,239,228,0.5)';
      for (let i = 0; i < w * 0.9; i++) ctx.fillRect(cx + (r() - 0.5) * w * 0.8, base - r() * h, 1.4, 1.4);
    };
    pine(1500, FLOOR, 430, 200, 'p4:pine:0');
    pine(1700, FLOOR, 640, 270, 'p4:pine:1');
    pine(1900, FLOOR, 380, 180, 'p4:pine:2');
    pine(2080, FLOOR, 540, 230, 'p4:pine:3');
    ctx.restore();
  });
};

/** Loose notes drifting up across the whole width (her side too): the film's notes loose in the new world, two depths. */
const notesField = (f: number): Layer[] => {
  const box: Rect = { x: -450, y: -350, w: 2900, h: 1900 };
  const sc = 0.62;
  return [0, 1].map((layer) => {
    const d = layer === 0 ? -150 : -330;
    const r = seeded(`p4:coda-notes:${layer}`);
    const items = Array.from({ length: layer === 0 ? 18 : 13 }, (_, i) => ({ x: r() * box.w, y0: r() * box.h, v: 6 + r() * 7, ph: r() * 6.3, s: layer === 0 ? 86 + r() * 30 : 120 + r() * 40, rot: (r() - 0.5) * 70, i }));
    const rect: Rect = { x: box.x, y: box.y, w: box.w, h: box.h };
    return canvasLayer(`coda-notes${layer}`, `p4:coda-notes:${layer}`, box.w * sc, box.h * sc, d, rect, (ctx) => {
      ctx.save();
      ctx.scale(sc, sc);
      const t = sec(f);
      for (const n of items) {
        const y = ((((n.y0 - n.v * t) % (box.h + 200)) + box.h + 200) % (box.h + 200)) - 100;
        paintNote(ctx, n.x + 26 * Math.sin(t * 0.4 + n.ph), y, n.s, n.rot + 9 * Math.sin(t * 0.5 + n.ph), `p4:cn:${layer}:${n.i}`);
      }
      ctx.restore();
    });
  });
};

/** Every plane of the new world at song frame f (the shards are not planes: ShatterStage adds them). */
export const codaLayers = (f: number): Layer[] => {
  const { back, mark } = backdrop();
  if (f < F_CLOSE) return [...back, moonLayer(1, MOON_C[1]), ...mark, ...pressLayers(f)];
  if (f < F_HE) return [...back, moonLayer(1, MOON_C[1]), ...mark, ...pressLayers(f), ...notesField(f)];
  if (f < F_SHE) return [...back, moonLayer(1.25, 230), ...mark, treesLayer(), ...heLayers(f), ...notesField(f)];
  if (f < F_PAIR) return [...back, moonLayer(1.25, 230), ...mark, treesLayer(), ...sheLayers(f), ...notesField(f)];
  return [...nightLayers(f), bigMoon(), ...openedBack(), treesLayer(), groundLayer(f), ...pairLayers(f), ...notesField(f)];
};

// ---- the shards

let setCache: ShardSet | null = null;
/** The shard set (seeded, built once). */
export const shardSet = (): ShardSet => (setCache ??= buildShards(gb().cam, [SEAM, 705], camAt, F_END - 8));

/** The source picture of the shards: glassB's last frame painted once into 1920 x 1080 (needs a DOM; ShatterStage only). */
let srcCanvas: HTMLCanvasElement | null = null;
export const shatterSource = (): HTMLCanvasElement => {
  if (srcCanvas) return srcCanvas;
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, 0, 1920, 1080);
  const s = gb();
  paintLayers(ctx, s.layers, s.cam, GB_END);
  srcCanvas = c;
  return c;
};

export interface CodaData {
  layers: Layer[];
  cam: Cam;
  set: ShardSet;
  /** The column the shards keep out of (none while the glass breaks). */
  zone?: Zone;
}

const zoneAt = (f: number): Zone | undefined => {
  if (f < F_CLOSE) return undefined;
  if (f < F_HE) return { xz: SEAM, ex: 400 };
  if (f < F_SHE) return { xz: HE_X, ex: 330 };
  if (f < F_PAIR) return { xz: SHE_X, ex: 330 };
  return { xz: SEAM, ex: 250 };
};

/** The impact flash: two frames of cream bloom over the palms' meeting point. */
const flash = (f: number, cam: Cam): Painter | undefined => {
  const k = f - F_SHATTER;
  if (k < 0 || k > 1) return undefined;
  const kk = 1000 / (cam.z + 0);
  const px = 960 + (SEAM - cam.x) * kk;
  const py = 540 + (705 - cam.y) * kk;
  return (ctx, w, h) => {
    const a = k === 0 ? 0.72 : 0.34;
    const rad = k === 0 ? 900 : 620;
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, `rgba(255,248,222,${a})`);
    g.addColorStop(0.45, `rgba(243,239,228,${a * 0.55})`);
    g.addColorStop(1, 'rgba(243,239,228,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
};

export const codaShot = (f: number): Shot => {
  const cam = camAt(f);
  const data: CodaData = { layers: codaLayers(f), cam, set: shardSet(), zone: zoneAt(f) };
  return { kind: 'shatter', data, overlay: flash(f, cam) };
};

/** The coda picture in 2D (planes only), valid for f >= 6830: the reset's SqueegeePrint "from" side. */
export const codaPainter =
  (f: number): Painter =>
  (ctx, w, h) => {
    paintLayers(ctx, codaLayers(f), camAt(f), f, w, h);
  };

void D_SKYROOM;
