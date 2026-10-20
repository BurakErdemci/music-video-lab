// Song frames 5122-5455: he is home at the cracked glass (the navy drains into the run cracks), the camera passes through
// the cracked picture glass into her cream (scene 13: four re-formings on the hits, v7 settles into v1's pose and spot),
// and the PEN transition (her last re-forming falls as yellow pixels into the seam line, the pen draws the seam, then
// redraws her at the glass; 5455 = splitBack + pressLayers at SPLIT_CAM, glassB continues from it).
import { palette } from '../../style/palette.ts';
import { paintLayers } from '../compose2d.ts';
import { paintCracks, RUN_CRACKS } from './cracks.ts';
import { paintDrain } from './flood.ts';
import { paintSweat } from '../icons.ts';
import { imprintLayer, PRESS_IMPRINT } from '../imprint.ts';
import { paintPenReveal } from '../pen.ts';
import { paintVersionTag } from '../part2/paintVerse.ts';
import * as P1 from '../part1/shots.ts';
import {
  canvasLayer,
  charLayer,
  easeInOut,
  easeOut,
  headOf,
  hasSprite,
  img,
  lerp,
  mixCam,
  pose,
  sec,
  sp,
  span,
  spritePoint,
  spriteRectAt,
  spriteUrls,
  type Cam,
  type Layer,
  type Painter,
  type Rect,
  type Shot,
} from './common.ts';
import { eroded, paintApart, paintDottedOutline, paintPixelFall, scratchCtx } from './reform.ts';
import {
  AI_STAND,
  FLOOR,
  SEAM,
  SPLIT_CAM,
  aiAt,
  aiLayersP1,
  humanRectOf,
  picGlassLayer,
  pressLayers,
  splitBack,
  type MoonOpts,
} from './splitSet.ts';

// ---- frames
const F0 = 5122;
const F_DRIP = 5150;
const F_THROUGH = 5164;
const F_PASS = 5190; // the picture glass reaches the camera
const F_SWAP = 5187; // pant -> palm while the crack lines fill the frame
const F_S13 = 5206;
const HITS = [5275, 5303, 5317, 5331] as const;
const MOON_STEPS = [5345, 5359, 5373, 5387] as const;
const F_PEN = 5401;
const F_PULL = 5428;
const F_END = 5455;

const NOTES = 14;
const MISALIGN = 28;
const MOON_PHASES = [0.5, 0.8, 1.0, 0.6, 0.25] as const;
/** What glassB continues from on 5456. */
export const GLASS_A_END_MOON: MoonOpts = { phase: MOON_PHASES[4], misalign: MISALIGN };
export const GLASS_A_END_NOTES = NOTES;
export const GLASS_A_END_CAM: Cam = SPLIT_CAM;

const moonAt = (f: number): MoonOpts => {
  const k = MOON_STEPS.filter((t) => f >= t).length;
  if (k === 0) return { phase: MOON_PHASES[0], misalign: MISALIGN };
  const t = MOON_STEPS[k - 1] as number;
  return { phase: lerp(MOON_PHASES[k - 1] as number, MOON_PHASES[k] as number, easeOut(span(f, t, t + 5))), misalign: MISALIGN };
};

// ---- his poses
const HS = P1.HS;
const HAND_HEAD = 117 * HS; // Part 1's standing man: head height (the h-freeze / h-hand family, 117 sprite px)
const num = (n: string, k: string): number | null => (typeof sp(n)[k] === 'number' ? (sp(n)[k] as number) : null);
const arr = (n: string, k: string): number[] | null => (Array.isArray(sp(n)[k]) ? (sp(n)[k] as number[]) : null);

const PANT = pose('h-pant');
const pantGeom = () => {
  const bb = sp(PANT).bbox as number[];
  const hx = arr(PANT, 'handX');
  const palm = arr(PANT, 'palm') ?? [hx ? (hx[1] as number) : (bb[2] as number), num(PANT, 'handY') ?? (bb[3] as number) * 0.5];
  const glassX = num(PANT, 'glassX') ?? (palm[0] as number);
  const floorY = num(PANT, 'floorY') ?? (bb[3] as number);
  const headH = headOf(PANT)?.h ?? 131;
  return { palm, glassX, floorY, headH };
};
const PG = pantGeom();
const PANT_S = HAND_HEAD / PG.headH;
const PANT_RECT: Rect = spriteRectAt(PANT, PANT_S, PG.glassX, PG.palm[1] as number, SEAM - 3, FLOOR - (PG.floorY - (PG.palm[1] as number)) * PANT_S);

/** The palm of Part 1's h-hand at the glass (sprite point measured at 336, 351 on its bbox edge), world. */
const HAND_PALM = (): [number, number] => spritePoint('h-hand', humanRectOf('h-hand'), 336, 351);
const PALM_S = HAND_HEAD / (headOf('h-palm')?.h ?? 240);
const palmRect = (): Rect => {
  const gx = num('h-palm', 'glassX') ?? 734;
  const pl = arr('h-palm', 'palm') ?? [708, 385];
  return spriteRectAt('h-palm', PALM_S, gx, pl[1] as number, SEAM - 3, HAND_PALM()[1]);
};

const PANT_BREATH = { top: 0.16, hip: 0.52, amp: 0.018, period: 0.75, phase: 0.1 };
const hairOf = (n: string) => {
  const hb = sp(n).hair;
  return hb ? { ...hb, amp: 1.4, face: 'right' as const } : undefined;
};
const humanPose = (f: number, name: string, r: Rect, breath: typeof PANT_BREATH): Layer =>
  charLayer('human', name, r, 0, sec(f), { breath, hair: hairOf(name), notes: true });

const sweatLayers = (f: number): Layer[] => {
  const out: Layer[] = [];
  const hd = headOf(PANT);
  if (!hd) return out;
  const hx = PANT_RECT.x + (hd.top[0] as number) * PANT_S;
  const hy = PANT_RECT.y + (hd.top[1] as number) * PANT_S;
  const Hh = hd.h * PANT_S;
  // [start frame, x, y, icon size]: one big drop (1.4x Part 1's 180) touching the forehead, small ones flicking off
  const drops: [number, number, number, number][] = [
    [F_DRIP, hx + 0.3 * Hh, hy - 0.62 * Hh, 252],
    [F_DRIP + 7, hx - 0.85 * Hh, hy + 0.05 * Hh, 112],
    [F_DRIP + 13, hx + 0.95 * Hh, hy - 0.45 * Hh, 96],
    [F_DRIP + 19, hx - 0.5 * Hh, hy - 0.9 * Hh, 84],
  ];
  drops.forEach(([t0, x, y, size], i) => {
    if (f < t0) return;
    const p = (f - t0) / 30;
    const out0 = span(f, t0 + 20, t0 + 32);
    const end = Math.min(t0 + 32, F_SWAP - 2);
    if (f >= end) return;
    out.push(
      P1.iconLayer(`icon-sweat${i}`, x, y, size, (ctx, cw, ch) => paintSweat(ctx, cw, ch, p, { fall: span(f, t0 + 12, t0 + 32), out: out0 })),
    );
  });
  return out;
};

// ---- her versions
interface Ver {
  name: string;
  dx: number;
  label: string;
}
const VERS: readonly Ver[] = [
  { name: 'ai-stand', dx: 0, label: 'v3' },
  { name: 'a-watch', dx: 60, label: 'v4' },
  { name: 'a-turn', dx: -40, label: 'v5' },
  { name: 'a-lookdown', dx: 90, label: 'v6' },
  { name: 'ai-stand', dx: 0, label: 'v7' },
];
const BLINKS = [5140, 5236, 5262, 5296, 5352, 5382, 5440];
const GL_LEN = 8; // PlateShift frames, h+6 .. h+13
const APART = 6;
type HerState = { kind: 'pose'; i: number } | { kind: 'apart'; i: number; p: number } | { kind: 'plate'; i: number; p: number };
const herState = (f: number): HerState => {
  for (let i = 0; i < HITS.length; i++) {
    const h = HITS[i] as number;
    if (f >= h && f < h + APART) return { kind: 'apart', i, p: lerp(0.32, 0.93, easeOut(span(f, h, h + 3.5))) };
    if (f >= h + APART && f < h + APART + GL_LEN) return { kind: 'plate', i: i + 1, p: (f - h - APART) / (GL_LEN - 1) };
  }
  return { kind: 'pose', i: HITS.filter((h) => f >= h + APART + GL_LEN).length };
};
const verRect = (v: Ver): Rect => aiAt(v.name as Parameters<typeof aiAt>[0], P1.AI_EYE_X + v.dx, 'eye');
const AI_NAMES = ['ai-stand', 'a-watch', 'a-turn', 'a-lookdown', 'a-hand'] as const;

const herPose = (f: number, v: Ver): Layer[] => aiLayersP1(v.name as Parameters<typeof aiLayersP1>[0], verRect(v), f, { blinks: BLINKS });

const herLayers = (f: number, st: HerState): Layer[] => {
  if (st.kind === 'apart') {
    const v = VERS[st.i] as Ver;
    const r = verRect(v);
    const m = sp(v.name);
    const s = r.w / m.w;
    const M = 160;
    return [
      canvasLayer('ai-apart', `p4:apart:${v.name}:${st.i}`, m.w + 2 * M, m.h + 2 * M, 0, { x: r.x - M * s, y: r.y - M * s, w: (m.w + 2 * M) * s, h: (m.h + 2 * M) * s }, (ctx, cw, ch) =>
        paintApart(ctx, cw, ch, img(v.name), Math.min(st.p, 0.92), `p4:apart:${st.i}`, st.i === 2),
      ),
    ];
  }
  return herPose(f, VERS[st.i] as Ver);
};

const tagLayer = (f: number, st: HerState): Layer | null => {
  if (st.kind === 'apart' || f < F_S13 + 6 || f >= F_PEN) return null;
  if (HITS.some((h) => f >= h && f < h + 10)) return null;
  const born = Math.max(F_S13 + 6, ...HITS.filter((h) => f >= h + 10).map((h) => h + 10));
  const v = VERS[st.i] as Ver;
  const r = verRect(v);
  const bb = sp(v.name).bbox as number[];
  const cx = r.x + (((bb[0] as number) + (bb[2] as number)) / 2) * (r.w / sp(v.name).w);
  return canvasLayer('tag', `p4:tag:${v.label}`, 256, 128, -1, { x: cx - 56, y: FLOOR + 3, w: 112, h: 56 }, (ctx, cw, ch) => paintVersionTag(ctx, cw, ch, v.label, sec(f - born)));
};

const outlineLayer = (f: number): Layer | null => {
  const a = span(f, 5322, 5330) * (1 - span(f, 5384, 5398)) * 0.6;
  if (a <= 0) return null;
  const m = sp('ai-stand');
  return canvasLayer('v1-outline', 'p4:v1-outline', m.w, m.h, 0, AI_STAND, (ctx) => paintDottedOutline(ctx, m.outline as number[][], a));
};

// ---- cameras
const sx13 = (f: number): number => lerp(112, 96, span(f, F_S13, 5400));
const cam13 = (f: number): Cam => {
  const z = lerp(1050, 1025, span(f, F_S13, 5400));
  const k = 1000 / z;
  return { x: SEAM + (960 - sx13(f)) / k, y: 548, z };
};
const cam1 = (f: number): Cam => ({ x: SPLIT_CAM.x, y: SPLIT_CAM.y, z: SPLIT_CAM.z - 10 * easeInOut(span(f, F0, F_THROUGH)) });
/** The glass-plane point (world) the camera is looking at when the crack plane passes it: screen (1546, 600) of the run frame. */
const PASS_AT = { x: SPLIT_CAM.x + (1546 - 960) / (1000 / (SPLIT_CAM.z - 300)), y: SPLIT_CAM.y + (600 - 540) / (1000 / (SPLIT_CAM.z - 300)) };
/** y: a -> m (reached at 5182, held to F_PASS) -> b, eased. */
const throughY = (f: number, a: number, m: number, b: number): number => {
  if (f <= 5182) return lerp(a, m, easeInOut(span(f, F_THROUGH, 5182)));
  if (f <= F_PASS) return m;
  return lerp(m, b, easeInOut(span(f, F_PASS, F_S13)));
};
/**
 * x: a -> m (5182), held to F_PASS; then it drifts right at a few px per frame (that is hundreds of px per frame on the
 * crack plane at this magnification, so the bands slide out sideways over ~4 frames), and a Hermite curve carries the
 * speed on into b.
 */
const throughX = (f: number, a: number, m: number, b: number): number => {
  if (f <= 5182) return lerp(a, m, easeInOut(span(f, F_THROUGH, 5182)));
  if (f <= F_PASS) return m;
  const u0 = DRIFT_END - F_PASS;
  const drift = (u: number): number => 2.5 * u + 0.35 * u * u;
  const u = f - F_PASS;
  if (u <= u0) return m + drift(u);
  const p0 = m + drift(u0);
  const v0 = 2.5 + 0.7 * u0;
  const len = F_S13 - DRIFT_END;
  const t = span(f, DRIFT_END, F_S13);
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * v0 * len + (-2 * t3 + 3 * t2) * b;
};
const DRIFT_END = F_PASS + 6;
const camAt = (f: number): Cam => {
  if (f < F_THROUGH) return cam1(f);
  if (f < F_S13) {
    // x/y pass through T (a point on the right run crack) at the moment the glass reaches the camera, so that crack's
    // lines fill the frame; z eases straight to the scene-13 framing
    const a = cam1(F_THROUGH);
    const b = cam13(F_S13);
    const e = easeInOut(span(f, F_THROUGH, F_S13));
    return { x: throughX(f, a.x, PASS_AT.x, b.x), y: throughY(f, a.y, PASS_AT.y, b.y), z: mixCam(a, b, e).z };
  }
  if (f < F_PEN) return cam13(f);
  if (f < F_PULL) return mixCam(cam13(F_PEN), SPLIT_CAM, easeInOut(span(f, F_PEN, F_PULL)));
  return SPLIT_CAM;
};

// ---- the picture glass (cracks); in the pass it flies at the camera
/** Distance of the flying crack plane from the camera during the pass. */
const PASS_OUT = 8; // the plane keeps closing in after F_PASS so the bands grow out past the frame edges
const passDist = (f: number, cam: Cam): number =>
  f < F_PASS ? 6 + (cam.z - 300 - 6) * Math.pow(1 - span(f, F_THROUGH, F_PASS), 2.2) : 6 * Math.pow(0.93, f - F_PASS + 1);
/**
 * The cracks during the pass: the same plane/camera projection as the layer, but stroked as vectors at screen
 * resolution (line width grows with the magnification), so the lines stay crisp however close the plane gets.
 */
const crackOverlay = (f: number, cam: Cam): Painter => (ctx, w, h) => {
  const k = 1000 / passDist(f, cam);
  const sc = k / (1000 / (SPLIT_CAM.z - 300));
  const t = scratchCtx('crack-pass', w, h);
  paintCracks(t, 6000, RUN_CRACKS, { scale: sc, dx: 960 * (1 - sc) + (SPLIT_CAM.x - cam.x) * k, dy: 540 * (1 - sc) + (SPLIT_CAM.y - cam.y) * k });
  eroded(t, w, h);
  ctx.drawImage(t.canvas, 0, 0);
};
const crackLayer = (f: number, cam: Cam): Layer | null => {
  const l = picGlassLayer('cracks', (ctx) => paintCracks(ctx, 6000));
  if (f < F_THROUGH) return l;
  if (f < F_PASS) return null; // drawn as a screen-space vector overlay (crackOverlay)
  if (f < F_PEN) return null;
  return { ...l, opacity: span(f, F_PEN + 9, F_PULL - 2) };
};

// ---- the seam pen (5401-5428): the seam layer drawn top to bottom with a nib, over the pixel column
const SEAM_TOP = -200;
const seamFront = (f: number): number => lerp(-60, FLOOR + 80, easeInOut(span(f, F_PEN + 9, F_PULL)));
const seamPen = (f: number): Layer | null => {
  const base = P1.creamLayers().find((l) => l.id === 'seam');
  if (!base || base.src.kind !== 'canvas') return null;
  const src = base.src;
  const front = seamFront(f);
  if (f >= F_PULL) return base;
  if (front <= -50) return null;
  return {
    ...base,
    src: {
      ...src,
      key: 'p4:seam-pen',
      paint: (ctx, cw, ch) => {
        const fy = front - SEAM_TOP;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, cw, fy);
        ctx.clip();
        src.paint(ctx, cw, ch);
        ctx.restore();
        ctx.fillStyle = palette.navy;
        ctx.beginPath();
        ctx.arc(cw / 2, fy, 4.6, 0, Math.PI * 2);
        ctx.fill();
      },
    },
  };
};

const PIXEL_BOX: Rect = { x: SEAM - 80, y: -20, w: 960, h: FLOOR + 80 };
const pixelLayer = (f: number): Layer => {
  const r = verRect(VERS[4] as Ver);
  const p = span(f, F_PEN, F_PEN + 12);
  return canvasLayer('ai-pixels', 'p4:ai-pixels', PIXEL_BOX.w, PIXEL_BOX.h, 0, PIXEL_BOX, (ctx) =>
    paintPixelFall(ctx, { img: img('ai-stand'), rect: r, box: PIXEL_BOX, p, seamX: SEAM, colH: FLOOR + 40, front: seamFront(f), key: 'p4:v7-pixels' }),
  );
};

// ---- the pen redraws her at the glass (a-hand, as Part 1 drew her)
const penHer = (f: number): Layer[] => {
  const r = aiAt('a-hand', SEAM + 3, 'left');
  const m = sp('a-hand');
  const line = span(f, F_PULL, 5447);
  const fill = easeInOut(span(f, 5441, 5451));
  if (fill >= 1) return aiLayersP1('a-hand', r, f, { blinks: [] });
  const eye = aiLayersP1('a-hand', r, f, { blinks: [] }).filter((l) => l.id === 'ai-eye').map((l) => ({ ...l, opacity: span(fill, 0.75, 1) }));
  return [
    canvasLayer('ai-pen', 'p4:ai-pen', m.w, m.h, 0, r, (ctx, cw, ch) =>
      paintPenReveal(ctx, cw, ch, img('a-hand-noeye'), { outline: m.outline as [number, number][], line, fill, stroke: 4.2, seed: 'p4:pen-hand' }),
    ),
    ...eye,
  ];
};

// ---- the scene
const back = (f: number, hideSeam = false): Layer[] => {
  const ls = splitBack(f, { notes: NOTES, moon: moonAt(f) });
  return hideSeam ? ls.filter((l) => l.id !== 'seam') : ls;
};

const stageAt = (f: number): { layers: Layer[]; cam: Cam } => {
  const cam = camAt(f);
  let layers: Layer[];
  if (f < F_S13) {
    layers = back(f);
    if (f < F_SWAP) layers.push(humanPose(f, PANT, PANT_RECT, PANT_BREATH));
    else layers.push(humanPose(f, 'h-palm', palmRect(), P1.humanBreath));
    layers.push(...herPose(f, VERS[0] as Ver), ...sweatLayers(f));
    const c = crackLayer(f, cam);
    if (c) layers.push(c);
    return { layers, cam };
  }
  if (f < F_PEN) {
    const st = herState(f);
    layers = back(f);
    layers.push(humanPose(f, 'h-palm', palmRect(), P1.humanBreath));
    layers.push(...herLayers(f, st));
    const o = outlineLayer(f);
    if (o) layers.push(o);
    const t = tagLayer(f, st);
    if (t) layers.push(t);
    return { layers, cam };
  }
  if (f < F_END) {
    layers = back(f, true);
    const sp_ = seamPen(f);
    layers.push(P1.humanLayer(f, 'h-hand'));
    if (sp_) layers.push(sp_);
    if (f < F_PULL) layers.push(pixelLayer(f));
    else layers.push(...penHer(f));
    const imp = imprintLayer('imprint-press', f, PRESS_IMPRINT, -1);
    if (imp) layers.push(imp);
    const c = crackLayer(f, cam);
    if (c) layers.push(c);
    return { layers, cam };
  }
  layers = [...back(F_END), ...pressLayers(f)];
  const imp = imprintLayer('imprint-press', f, PRESS_IMPRINT, -1);
  if (imp) layers.push(imp);
  const c = crackLayer(f, cam);
  if (c) layers.push(c);
  return { layers, cam };
};

const painter = (f: number, st: HerState, frozenApart?: number): Painter => {
  const cam = camAt(f);
  return (ctx, w, h) => {
    const layers = back(f);
    layers.push(humanPose(f, 'h-palm', palmRect(), P1.humanBreath));
    if (frozenApart !== undefined && st.kind === 'plate') {
      layers.push(...herLayers(f, { kind: 'apart', i: st.i - 1, p: frozenApart }));
    } else {
      layers.push(...herPose(f, VERS[st.i] as Ver));
      const t = tagLayer(f, st);
      if (t) layers.push(t);
    }
    const o = outlineLayer(f);
    if (o) layers.push(o);
    paintLayers(ctx, layers, cam, f, w, h);
  };
};

export const GLASS_A_IMAGES: readonly string[] = [
  ...new Set([
    ...spriteUrls([PANT, 'h-palm', 'h-hand', ...AI_NAMES, 'ai-stand'].filter((n) => hasSprite(n))),
  ]),
];

export const glassAShot = (f: number): Shot => {
  if (f >= F_S13 && f < F_PEN) {
    const st = herState(f);
    if (st.kind === 'plate') {
      return {
        kind: 'gl',
        fx: 'plate',
        p: st.p,
        seconds: GL_LEN / 30,
        time: (f - (HITS[st.i - 1] as number) - APART) / 30,
        // the plates peel and lay between two sampled frames (no curl is ever caught crossing the frame); the lay is
        // out of register and snaps in over the remaining frames
        peel: [0.19, 0.2, 0.2, 0.21],
        lay: [0.19, 0.2, 0.2, 0.21],
        snap: [0.2, 0.75, 0.24, 0.95],
        from: painter(f, { kind: 'plate', i: st.i, p: 0 }, 1),
        to: painter(f, { kind: 'pose', i: st.i }),
      };
    }
  }
  const { layers, cam } = stageAt(f);
  const overlay: Painter | undefined = f < F_DRIP ? (ctx, w, h) => paintDrain(ctx, w, h, f) : f >= F_THROUGH && f < F_PASS + PASS_OUT - 1 ? crackOverlay(f, cam) : undefined;
  return { kind: 'stage', layers, cam, overlay };
};

