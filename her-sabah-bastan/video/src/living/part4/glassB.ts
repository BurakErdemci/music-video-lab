// glassB: song frames 5456-6395, scenes 14-15 at the cracked split. The same spot pressed, the days montage in place
// (one squeegee pull per day), MERHABA, ANLATIRSIN, BIR DAHA (tally marks, one on her side), the trembling glass and
// the "Merhaba" bubble. Continues glassA's last picture (palms on the glass, three run cracks, SPLIT_CAM).
import { rock } from '../life.ts';
import { seeded } from '../../style/seeded.ts';
import { paintLayers } from '../compose2d.ts';
import { paintMugTower, MUG_CANVAS } from '../part2/paintDays.ts';
import {
  BEAT_FRAMES,
  canvasLayer,
  charLayer,
  ev,
  easeInOut,
  lastBeat,
  LIFT_PAD,
  lerp,
  mixCam,
  placeAt,
  pose,
  sec,
  sp,
  span,
  spriteRectAt,
  spriteUrls,
  type Cam,
  type GlShot,
  type Layer,
  type Painter,
  type Rect,
  type Shot,
  type StageShot,
} from './common.ts';
import { aiLayers } from './figures.ts';
import { GLASS_A_END_MOON } from './glassA.ts';
import {
  AI_STAND,
  FLOOR,
  HER_MARK_BOX,
  P1_IMAGE_URLS,
  SEAM,
  SPLIT_CAM,
  aiLayersP1,
  humanLayer,
  moonHalvesLayer,
  picGlassLayer,
  aiAt,
  humanRectOf,
  splitBack,
  tallyLayer,
  TALLY_BOX,
  D_SKYROOM,
} from './splitSet.ts';
import { herSideReset } from './halftoneReset.ts';
import { paintHerMark, paintBubble, paintSpread, paintTallyPop, palmsScreen, picPxOf, picScale, spreadCracks, trembleAt, TALLY_CANVAS } from './glassBFx.ts';

const T = {
  start: 5456,
  reframe: 5553,
  days: 5650,
  merhaba: 5872,
  anlat: 5927,
  daha: 5982,
  outro: 6176,
  end: 6395,
};
const DAY_STARTS = [5650, 5678, 5706, 5733, 5761, 5789, 5803, 5816, 5830, 5844, 5858];
const PULL_LEN = (i: number): number => Math.min(i < 6 ? 18 : 11, (DAY_STARTS[i + 1] ?? T.merhaba) - (DAY_STARTS[i] as number));
const DAY_POSE = ['h-hand', 'h-glass-note', 'h-head', 'h-slide', 'h-hand', 'h-sleep', 'h-head', 'h-sleep', 'h-slide', 'h-sleep', 'h-sleep'] as const;
const DAY_NOTES = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const DAY_TALLY = [1, 2, 3, 4, 5, 6, 9, 12, 16, 22, 30];
const DAY_MUGS = [2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 20];
const FLASH = 4;
const TALLY_MARKS = [ev('tally mark daha 1'), ev('tally mark daha 2'), ev('tally mark daha 3')];
const HER_MARK_F = TALLY_MARKS[2] as number;
const BUBBLE_F = ev('the Merhaba bubble');

const FLOOR_UP = pose('h-floor-up');
const FLOOR_BOOK = pose('h-floor-book');
export const GLASS_B_IMAGES: readonly string[] = [
  ...spriteUrls(['h-hand', 'h-glass-note', 'h-slide', 'h-head', 'h-sleep', FLOOR_UP, FLOOR_BOOK, 'a-hand', 'ai-stand', pose('h-palm-full'), pose('a-palm-full')]),
  ...P1_IMAGE_URLS,
];

// ---- camera

const CAM_A: Cam = { x: 956, y: 500, z: 940 };
const CAM_B0: Cam = { x: 958, y: 440, z: 800 };
const CAM_B1: Cam = { x: 960, y: 430, z: 745 };
const CAM_UP: Cam = { x: 938, y: 562, z: 985 };
const CAM_P0: Cam = { x: 955, y: 482, z: 900 };
const CAM_P2: Cam = { x: 960, y: 442, z: 780 };
const camBase = (f: number): Cam => {
  if (f < T.reframe) return mixCam(SPLIT_CAM, CAM_A, span(f, T.start, T.reframe));
  if (f < T.days) return mixCam(CAM_B0, CAM_B1, span(f, T.reframe, T.days));
  if (f < T.merhaba) return SPLIT_CAM;
  if (f < T.daha) return mixCam(SPLIT_CAM, CAM_UP, span(f, T.merhaba, T.daha));
  // one unbroken push from BIR DAHA to the last frame
  return mixCam(CAM_P0, CAM_P2, span(f, T.daha, T.end));
};
/** The push plus a slow breathing drift of the camera (never still in a hold); the montage keeps its fixed camera. */
const camAt = (f: number): Cam => {
  const c = camBase(f);
  if (f >= T.days && f < T.merhaba) return c;
  return { x: c.x + 4 * Math.sin(f / 41), y: c.y + 2.5 * Math.sin(f / 57 + 1), z: c.z };
};

// ---- the moon: phases step on the beats, the halves align from BIR DAHA on

const PH = [0.6, 0.72, 0.84, 0.96, 0.84, 0.72, 0.6, 0.48, 0.36, 0.24, 0.36, 0.48];
const beatsSince = (a: number, f: number): number => BEAT_FRAMES.filter((b) => b > a && b <= f).length;
const phase0 = (f: number): number => PH[beatsSince(T.start, f) % PH.length] as number;
const moonAt = (f: number): { phase: number; misalign: number } => {
  const m0 = GLASS_A_END_MOON;
  const k0 = m0.phase - 0.6;
  if (f < T.daha) return { phase: phase0(f) + k0, misalign: m0.misalign };
  const u = span(lastBeat(f), T.daha, 6380);
  if (f >= 6380) return { phase: 1, misalign: 0 };
  return { phase: lerp(phase0(T.daha - 1) + k0, 1, u), misalign: m0.misalign * Math.pow(1 - u, 2.2) };
};

// ---- cracks

const SPREAD = spreadCracks(T.start, T.days - 1, camAt);

// ---- his place

const HS = 800 / 864;
const SPLIT_HEAD = 158 * HS * (158 / 159);
const sitRect = (name: string): Rect => {
  const m = sp(name);
  const s = SPLIT_HEAD / ((m.headPx as number | undefined) ?? 150);
  const back = (m.backX as number | undefined) ?? (m.bbox[2] as number);
  const floorY = (m.floorY as number | undefined) ?? (m.bbox[3] as number);
  return spriteRectAt(name, s, back, floorY, SEAM - 4, FLOOR);
};
const sitLayer = (name: string, f: number, amp: number, period: number): Layer => {
  const m = sp(name);
  return charLayer('human', name, sitRect(name), 0, sec(f), {
    breath: { top: 0.2, hip: 0.7, amp, period, phase: 0 },
    hair: m.hair ? { ...m.hair, amp: 1.4, face: 'left' } : undefined,
    notes: true,
  });
};
const standLayer = (name: (typeof DAY_POSE)[number], f: number): Layer => {
  if (name === 'h-sleep') return sitLayer(name, f, 0.014, 4.6);
  if (name === 'h-head') {
    const m = sp(name);
    const bb = m.bbox as number[];
    const r: Rect = { x: SEAM - 40 - (bb[2] as number) * HS, y: FLOOR - (bb[3] as number) * HS - LIFT_PAD * HS, w: m.w * HS, h: (m.h + LIFT_PAD) * HS };
    return charLayer('human', name, r, 0, sec(f), {
      breath: { top: 0.16, hip: 0.52, amp: 0.01, period: 3.8, phase: 0.1 },
      hair: m.hair ? { ...m.hair, amp: 1.4, face: 'right' } : undefined,
      notes: true,
    });
  }
  return humanLayer(f, name);
};

// ---- the picture

type View = { kind: 'press' } | { kind: 'day'; i: number } | { kind: 'up' } | { kind: 'book' };
const mugsBox = (n: number): Rect => {
  const h = 300 + 140 * Math.min(1, n / 20);
  return { x: 300, y: FLOOR - h, w: (h * 2) / 3, h };
};
// a blink every ~2-3 s (irregular, seeded)
const BLINKS: number[] = (() => {
  const r = seeded('p4:gb-blinks');
  const out: number[] = [];
  for (let f = 5468; f < T.end; f += 62 + Math.floor(r() * 30)) out.push(f);
  return out;
})();

// ---- the pair with their palms on the glass: the new full-body drawings when they exist (glassX exactly on the seam),
// else part 1's handshake drawings at part 1's places. Breath, a slight sway, hair and her blinks run in every hold.
// By the palm keys (0.80 / 0.84 of the body heights) these two scales put the palms within ~16 px of one height, with
// both pairs of feet on the floor and the pair still near part 1 sizes (a fuller match would shrink her head).
const PALM_S_HIS = 0.96;
const PALM_S_HER = 0.912;
// palm centre rows and flat-edge columns measured by alpha on the sprites (h-palm-full 169 / 391, a-palm-full 155 / 6)
const PALM_ROW = { h: 169, a: 155 };
const PALM_EDGE_HER = 6;
const SWAY = (f: number, ph: number): number => 0.55 * Math.sin((2 * Math.PI * f) / 150 + ph);
const HIS_PRESS = pose('h-palm-full');
const HER_PRESS = pose('a-palm-full');
const pairLayers = (f: number): Layer[] => {
  const t = sec(f);
  // the reaching handshake drawings until BIR DAHA (glassA hands them over), the flat-palm drawings from it
  const hisName = f >= T.daha ? HIS_PRESS : 'h-hand';
  const herName = f >= T.daha ? HER_PRESS : 'a-hand';
  const hm = sp(hisName);
  const am = sp(herName);
  const hasHis = typeof hm.glassX === 'number';
  const hasHer = typeof am.glassX === 'number';
  const out: Layer[] = [];
  let hr: Rect;
  if (hasHis) {
    hr = spriteRectAt(hisName, PALM_S_HIS, hm.glassX as number, (hm.floorY as number | undefined) ?? (hm.bbox[3] as number), SEAM, FLOOR);
  } else hr = humanRectOf('h-hand');
  const hs = hr.w / hm.w;
  out.push(
    charLayer(
      'human',
      hisName,
      hr,
      0,
      t,
      { breath: { top: 0.16, hip: 0.52, amp: 0.02, period: 3.4, phase: 0.1 }, hair: hm.hair ? { ...hm.hair, amp: 2.4, face: 'right' } : undefined, notes: true },
      { rot: SWAY(f, 0), pivot: hasHis ? [SEAM, FLOOR - ((hm.floorY as number) - PALM_ROW.h) * PALM_S_HIS] : [hr.x + hr.w * 0.5, FLOOR] },
    ),
  );
  void hs;
  let ar: Rect;
  if (hasHer) {
    const s = PALM_S_HER;
    ar = { x: SEAM - PALM_EDGE_HER * s, y: FLOOR - ((am.floorY as number | undefined) ?? (am.bbox[3] as number)) * s, w: am.w * s, h: am.h * s };
  } else ar = aiAt('a-hand', SEAM + 3, 'left');
  out.push(...aiLayers('ai', herName, ar, 0, f, { blinks: BLINKS, rot: SWAY(f, 2.1), pivot: hasHer ? [SEAM, FLOOR - ((am.floorY as number) - PALM_ROW.a) * PALM_S_HER] : [ar.x + ar.w * 0.5, FLOOR], breath: { top: 0.12, hip: 0.5, amp: 0.015, period: 3.8, phase: 0.35 } }));
  return out;
};

const viewAt = (f: number): View => {
  if (f < T.days) return { kind: 'press' };
  if (f < T.merhaba) {
    let i = 0;
    DAY_STARTS.forEach((s, k) => {
      if (f >= s) i = k;
    });
    return { kind: 'day', i };
  }
  if (f < T.anlat) return { kind: 'up' };
  if (f < T.daha) return { kind: 'book' };
  return { kind: 'press' };
};

const tallyN = (f: number, v: View): number =>
  v.kind === 'day' ? (DAY_TALLY[v.i] as number) : v.kind === 'press' && f < T.merhaba ? 0 : 30 + TALLY_MARKS.filter((m) => f >= m).length;

const layersOf = (f: number, v: View): { layers: Layer[]; cam: Cam } => {
  const cam = camAt(f);
  const afterDays = f >= T.merhaba;
  const day = v.kind === 'day' ? v.i : afterDays ? 10 : -1;
  const notes = day < 0 ? 14 : (DAY_NOTES[day] as number);
  const mugs = day < 0 ? 0 : (DAY_MUGS[day] as number);
  const m = moonAt(f);
  const n = tallyN(f, v);
  const layers: Layer[] = splitBack(f, { notes, moon: m });
  // the tally wall: the last mark pops in as the difference of two counts
  const popK = (() => {
    const j = TALLY_MARKS.findIndex((x) => f >= x && f < x + 12);
    return j < 0 ? -1 : f - (TALLY_MARKS[j] as number);
  })();
  if (n > 0) {
    if (popK >= 0) {
      layers.push(tallyLayer(n - 1));
      layers.push(
        canvasLayer('tally-pop', 'p4:tally-pop', TALLY_CANVAS.w, TALLY_CANVAS.h, D_SKYROOM, placeAt(TALLY_BOX, D_SKYROOM, SPLIT_CAM), (ctx, cw, ch) => paintTallyPop(ctx, cw, ch, n, popK, 'p4:tally')),
      );
    } else layers.push(tallyLayer(n));
  }
  if (mugs > 0) layers.push(canvasLayer('mugs', 'p4:mugs-b', MUG_CANVAS.w, MUG_CANVAS.h, 1, mugsBox(mugs), (ctx, cw, ch) => paintMugTower(ctx, cw, ch, mugs, 'p4:mugs')));

  // characters
  const inMontage = v.kind === 'day';
  if (v.kind === 'press') {
    layers.push(...pairLayers(f));
  } else {
    if (v.kind === 'day') layers.push(standLayer(DAY_POSE[v.i] as (typeof DAY_POSE)[number], f));
    else layers.push(sitLayer(v.kind === 'up' ? FLOOR_UP : FLOOR_BOOK, f, 0.01, 3.6));
    if (inMontage) layers.push(...aiLayers('ai', 'ai-stand', AI_STAND, 0, f, { still: true }));
    else {
      const rot = v.kind === 'book' ? rock(f, T.anlat, 30, 1.6) : 0;
      layers.push(...aiLayersP1('ai-stand', AI_STAND, f, { blinks: BLINKS, rot, pivot: [AI_STAND.x + AI_STAND.w / 2, FLOOR] }));
    }
  }
  if (afterDays && v.kind === 'press') {
    // her one mark, the first day she keeps
    const k = f - HER_MARK_F;
    if (k >= 0) {
      layers.push(canvasLayer('her-mark', 'p4:her-mark', 320, 200, 0, placeAt(HER_MARK_BOX, 0, SPLIT_CAM), (ctx, cw, ch) => paintHerMark(ctx, cw, ch, k)));
    }
  }

  // the picture glass: the cracks (and the bubble) tremble with it
  const shake: [number, number] = f < T.daha ? [0, 0] : f < T.outro ? trembleAt(f, T.daha, T.outro, 2, 6, 2.2) : trembleAt(f, T.outro, T.end + 1, 6, 14, 1.25);
  const sc = picScale(cam);
  const tip = picPxOf(cam, palmsScreen(cam, true));
  layers.push(
    picGlassLayer('glassB', (ctx) => {
      paintSpread(ctx, f, SPREAD, sc);
      if (f >= BUBBLE_F) paintBubble(ctx, tip, sc, f - BUBBLE_F);
    }, shake),
  );
  layers.sort((a, b) => b.d - a.d);
  return { layers, cam };
};

const rekey = (ls: Layer[], s: string): Layer[] => ls.map((l) => (l.src.kind === 'canvas' ? { ...l, src: { ...l.src, key: l.src.key + s } } : l));

/** The plain picture at song frame f (no transition); the coda's shatter starts from glassBStage(6395). */
export const glassBStage = (f: number, ht = false): StageShot => {
  const v = viewAt(f);
  const { layers, cam } = layersOf(f, v);
  let overlay: Painter | undefined;
  // TRIAL: the halftone reset replaces the white flash (only the *Halftone compositions pass ht)
  if (ht) overlay = herSideReset(f, layers, cam, '');
  else if (v.kind === 'day' && v.i >= 0) {
    const k = f - ((DAY_STARTS[v.i] as number) + PULL_LEN(v.i));
    if (k >= 0 && k < FLASH) {
      const sx = 960 + (SEAM - cam.x) * (1000 / (cam.z + 0));
      overlay = (ctx, w, h) => {
        ctx.save();
        ctx.globalAlpha = 0.95 * (1 - k / FLASH);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx, 0, w - sx, h);
        ctx.restore();
      };
    }
  }
  return { kind: 'stage', layers, cam, overlay };
};

const stageAs = (f: number, v: View, suffix: string, ht = false): Painter => {
  const { layers, cam } = layersOf(f, v);
  const ls = rekey(layers, suffix);
  const her = ht ? herSideReset(f, ls, cam, suffix) : undefined;
  if (her) {
    return (ctx, w, h) => {
      paintLayers(ctx, ls, cam, f, w, h);
      her(ctx, w, h);
    };
  }
  return (ctx, w, h) => paintLayers(ctx, ls, cam, f, w, h);
};

export const glassBShot = (f: number, ht = false): Shot => {
  if (f >= T.days && f < T.merhaba) {
    const i = viewAt(f).kind === 'day' ? (viewAt(f) as { i: number }).i : 0;
    const k = f - (DAY_STARTS[i] as number);
    const len = PULL_LEN(i);
    if (k < len) {
      const prev: View = i === 0 ? { kind: 'press' } : { kind: 'day', i: i - 1 };
      const g: GlShot = {
        kind: 'gl',
        fx: 'squeegee',
        p: (k + 1) / (len + 1),
        seconds: len / 30,
        time: k / 30,
        from: stageAs(f, i === 0 ? ({ kind: 'press' } as View) : prev, ':from', ht),
        to: stageAs(f, { kind: 'day', i }, ':to', ht),
      };
      return g;
    }
  }
  return glassBStage(f, ht);
};

