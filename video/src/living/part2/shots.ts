import { staticFile } from 'remotion';
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { H, W } from '../../layout.ts';
import { clamp01, lerp } from '../../math.ts';
import { D0, planeScale, type Cam, type CanvasSource, type Layer } from '../types.ts';
import { blink, LIFT_PAD, paintCharacter, type BreathOpts, type HairOpts } from '../life.ts';
import { paintPenReveal } from '../pen.ts';
import * as P1 from '../part1/shots.ts';
import { paintBodyNotes, paintMonitorScreen, paintMugTower, paintTally, paintWindowSky, MUG_CANVAS, TALLY_CANVAS } from './paintDays.ts';
import { COME_APART_MARGIN, paintComeApart, paintCrescent, paintNoteFill, paintPath, paintVersionTag, pathGeom } from './paintVerse.ts';
import { BOX_CANVAS, boxGeom, paintBoxes, paintGlassWall, paintSplitMoon, paintTorchLight } from './paintProps.ts';
import { paintBang, paintVein, paintZzz } from './icons2.ts';
import EVENTS from './events.json' with { type: 'json' };
import SPRITES_H from '../sprites-p2h.json' with { type: 'json' };
import SPRITES_A from '../sprites-p2a.json' with { type: 'json' };

/**
 * Shot design of Part2 (song 0:56.86-1:51.6, scene map v2 scenes 5-8). Everything is in SONG frames; composition
 * frame 0 = song frame SONG_START (1706). Same language as Part 1: each beat is a complete drawn pose, small life inside
 * a pose, the camera and the depth layers carry the motion, poses change on cuts, reframes and print transitions.
 *
 * 1706-2155  chorus 1 in the split. 1706-1761 is Part 1's chorusShot unchanged (the seam). One white wave per bar wipes
 *            her side (DOM overlay, Part2Scene); the split moon on the glass steps a phase per bar and per beat on
 *            "Ay dolar, ay kucumur"; his wall gains a note per bar, hers is blank again after every wave. He cuts from
 *            the mug to the glass (1818); she sits on a box swinging her legs; on "buradayiz" both face the glass.
 *            The last wave (2099) covers the whole frame: that cream IS his monitor's reset flash (2155).
 * 2155-2604  "bir daha": the side-view desk room, one continuous slow push-in; the CONTENT cuts on every sung "daha",
 *            then every beat, then every half beat. One routine pose per day (type / coffee / stretch / type), tally
 *            marks, mugs, body notes, sun/moon, posture sinking; her "Merhaba" on his monitor never changes.
 * 2604-2660  dead stop (one frozen beat), then the split at night: asleep at the glass (zzz), wakes (!), presses his
 *            own "Merhaba" note on the glass; the camera pushes into the note.
 * 2660-2702  one beat of the note's yellow, then PaperFold: the note folds into the pen tip that writes her path.
 * 2702-3053  her cream world: the path of handwriting, strides one per beat, the crescent, the same knot, come apart,
 *            the pen redraws v2 / v3, a row of boxes, one lamp per tap, thumbs-up.
 * 3053-3165  pull back through the glass: the back of his head enters (over-the-shoulder); lids open: empty; the vein.
 * 3165-3375  the split: he sits calmly; the torch: on her boxes, back on his wall, at the glass; click off at 3333,
 *            the light circle shrinks to the hand-over dot (960, 470, r 10) by 3340; black with the last caption.
 */
export const SONG_START = EVENTS.songStart;
export const SONG_END = EVENTS.songEnd;
export const HAND_OVER = EVENTS.handOver;
const ev = (name: string): number => {
  const e = EVENTS.events.find((x) => x.name.startsWith(name));
  if (!e) throw new Error(`no event ${name}`);
  return e.f;
};
const evAll = (prefix: string): number[] => EVENTS.events.filter((x) => x.name.startsWith(prefix)).map((x) => x.f);

export const F = {
  open: ev('chorus 1 opens'),
  waves: evAll('white wave '),
  glass: ev('cut on action: he is at the glass'),
  moonBeats: ev('moon steps per beat'),
  bili: ev('stamp biliyorum'),
  bilmi: ev('stamp bilmiyorum'),
  burada: ev('buradayiz'),
  lastWave: ev('last white wave'),
  days: ev('shape match'),
  stop: ev('DEAD STOP'),
  sleep: ev('split: asleep'),
  wake: ev('wakes with a start'),
  press: ev('presses his own'),
  noteClose: ev('cut: the note close'),
  yellow: ev('cut to the flat note'),
  fold0: ev('PaperFold starts'),
  fold1: ev('PaperFold lands'),
  strides: evAll('stride '),
  crescent: ev('midnight'),
  trip1: ev('trip on the knot'),
  apart1: ev('she comes apart (slices'),
  pen2: ev('the pen redraws her: v2'),
  stride2: ev('v2 strides'),
  trip2: ev('the same trip'),
  apart2: ev('she comes apart again'),
  pen3: ev('the pen redraws her: v3'),
  taps: evAll('taps box '),
  thumb: ev('thumbs-up'),
  pull: ev('pull back through the glass'),
  lids: evAll('lid '),
  vein: ev('anger vein pops'),
  deflate: ev('Kizmiyorum'),
  calm: ev('cut: he sits calmly'),
  torchOn: ev('torch clicks on'),
  swing: ev('the beam swings back'),
  hold: ev('he holds the torch'),
  off: ev('torch clicks off'),
  handOver: ev('hand-over'),
};
/** Day cuts of the montage (2155 = day 1 typing, then every listed cut). */
export const DAY_CUTS: readonly number[] = [F.days, ...EVENTS.events.filter((x) => x.name.startsWith('cut: day')).map((x) => x.f)];
export const FOLD_FRAMES = F.fold1 - F.fold0;

// ---------------------------------------------------------------------------------------------------------------
// Sprites: Part 2's own drawings (living/p2, sprites-p2h.json + sprites-p2a.json); everything else comes from Part 1.

type Pt = [number, number];
interface Meta2 {
  w: number;
  h: number;
  bbox: number[];
  eye?: number[];
  outline?: number[][];
  floorY?: number;
  hair?: { x0: number; y0: number; x1: number; y1: number };
  headPx?: number;
  hands?: number[];
  mugTop?: number[];
  spout?: number[];
  backX?: number;
  headTop?: number[];
  lens?: number[];
  dir?: number[];
  tap?: number[];
  thumb?: number[];
  knee?: number[];
  seat?: number[];
  top?: number;
}
const SP2 = { ...(SPRITES_H as unknown as Record<string, Meta2>), ...(SPRITES_A as unknown as Record<string, Meta2>) };
const has2 = (n: string): boolean => !!SP2[n.replace(/-(eye|noeye)$/, '')];
const sp2 = (n: string): Meta2 => {
  const m = SP2[n] ?? (P1.sp(n) as unknown as Meta2);
  if (!m) throw new Error(`no sprite ${n}`);
  return m;
};
const url2 = (n: string): string => (has2(n) || /^a-sit-(shins|body)/.test(n) ? staticFile(`living/p2/${n}.png`) : P1.url(n));
const img = (n: string) => P1.getImg(url2(n));
const pt = (a: number[] | undefined, what: string): Pt => {
  if (!a || a.length < 2) throw new Error(`sprite point missing: ${what}`);
  return [a[0] as number, a[1] as number];
};

const HUMAN2 = ['h-type1', 'h-type2', 'h-type3', 'h-stretch', 'h-coffee', 'coffee-cab', 'chair2', 'h-sleep', 'h-wake', 'h-ots', 'h-calm', 'h-torch', 'h-torch-back'] as const;
const AI2 = ['a-step1', 'a-step2', 'a-step3', 'a-trip', 'a-tap', 'a-thumb', 'a-squint'] as const;
type Ai2 = (typeof AI2)[number] | 'ai-stand' | 'a-hand' | 'a-sit-body';

export const IMAGE_URLS: readonly string[] = [
  ...P1.IMAGE_URLS,
  P1.url('ai-wave-a'),
  ...HUMAN2.map(url2),
  ...AI2.flatMap((n) => [url2(n), url2(`${n}-noeye`), url2(`${n}-eye`)]),
  url2('a-sit-body-noeye'),
  url2('a-sit-body-eye'),
  url2('a-sit-shins'),
];
export const setImageLookup = P1.setImageLookup;

// ---------------------------------------------------------------------------------------------------------------
// Helpers.

const { mixCam, easeInOut, easeOut, sine, span, sec, canvasLayer, placeAt } = P1;
type Rect = P1.Rect;
const easeIn = (t: number): number => Math.pow(clamp01(t), 3);

/** Camera through keyframes [frame, cam]; each leg eases in and out (the camera never jumps). */
const camKeys = (keys: readonly (readonly [number, Cam])[], f: number, ease: (t: number) => number = sine): Cam => {
  const first = keys[0] as readonly [number, Cam];
  if (f <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, c1] = keys[i] as readonly [number, Cam];
    const [f0, c0] = keys[i - 1] as readonly [number, Cam];
    if (f <= f1) return mixCam(c0, c1, ease(span(f, f0, f1)));
  }
  return (keys[keys.length - 1] as readonly [number, Cam])[1];
};

/** A canvas layer that covers the whole screen under cam (painted in screen px), on plane d. */
const screenLayer = (id: string, key: string, cam: Cam, d: number, paint: CanvasSource['paint'], extra: Partial<Layer> = {}): Layer => {
  const k = planeScale(cam, d);
  return canvasLayer(id, key, W, H, d, { x: cam.x - W / 2 / k, y: cam.y - H / 2 / k, w: W / k, h: H / k }, paint, extra);
};
const project = P1.project;

/** Sprite layer (image) of a part-2 drawing with its scale s and its sprite-px anchor at world point at. */
const spriteRect = (name: string, s: number, anchor: Pt, at: Pt): Rect => {
  const m = sp2(name);
  return { x: at[0] - anchor[0] * s, y: at[1] - anchor[1] * s, w: m.w * s, h: m.h * s };
};
/** Breathing character layer of a part-2 human drawing (canvas with LIFT_PAD, as Part 1's charLayer). */
const human2Layer = (id: string, name: string, r: Rect, d: number, f: number, breath: BreathOpts, notes = true): Layer => {
  const m = sp2(name);
  const s = r.w / m.w;
  const rr: Rect = { x: r.x, y: r.y - LIFT_PAD * s, w: r.w, h: r.h + LIFT_PAD * s };
  const hair: HairOpts | undefined = m.hair ? { ...m.hair, amp: 1.4, face: name === 'h-torch-back' || name === 'h-coffee' || name === 'h-sleep' || name === 'h-wake' ? 'left' : 'right' } : undefined;
  return {
    id,
    src: { kind: 'canvas', key: `${id}:${name}`, cw: m.w, ch: m.h + LIFT_PAD, paint: (ctx, cw, ch) => paintCharacter(ctx, cw, ch, img(name), { t: sec(f), breath, hair, notes }) },
    d,
    ...rr,
  };
};

// AI drawings of part 2 (and Part 1's ai-stand / a-hand): body (breathing) + the cursor eye that blinks.
const AI_HEAD = 138 * P1.AS; // world px of her head in the split (ai-stand's head 0.153 x 901 px at AS)
const aiScale2 = (name: string, k = 1): number => {
  const m = sp2(name);
  return (m.headPx ? AI_HEAD / m.headPx : P1.AS) * k;
};
const AI_BREATH: BreathOpts = { top: 0.12, hip: 0.5, amp: 0.006, period: 4.2, phase: 0.35 };
const ai2Layers = (name: Ai2, r: Rect, f: number, o: { blinks?: readonly number[]; rot?: number; pivot?: Pt; d?: number; opacity?: number; still?: boolean; eyeH?: number } = {}): Layer[] => {
  const d = o.d ?? 0;
  const m = sp2(name === 'a-sit-body' ? 'a-sit' : name);
  const s = r.w / m.w;
  const body = `${name}-noeye`;
  const out: Layer[] = [
    o.still
      ? { id: 'ai', src: { kind: 'image', url: url2(body) }, d, ...r, rot: o.rot, pivot: o.pivot, opacity: o.opacity }
      : {
          id: 'ai',
          src: { kind: 'canvas', key: `ai:${name}`, cw: m.w, ch: m.h + LIFT_PAD, paint: (ctx, cw, ch) => paintCharacter(ctx, cw, ch, img(body), { t: sec(f), breath: AI_BREATH }) },
          d,
          x: r.x,
          y: r.y - LIFT_PAD * s,
          w: r.w,
          h: r.h + LIFT_PAD * s,
          rot: o.rot,
          pivot: o.pivot,
          opacity: o.opacity,
        },
  ];
  const eye = m.eye;
  if (eye) {
    const sy = Math.min(o.eyeH ?? 1, blink(f, o.blinks ?? []));
    const ex = (eye[0] as number) - 2;
    const ey = (eye[1] as number) - 2;
    const ew = (eye[2] as number) + 4;
    const eh = (eye[3] as number) + 4;
    const cy = r.y + (ey + eh / 2) * s;
    const up = o.still ? 0 : AI_BREATH.amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * (sec(f) / AI_BREATH.period + AI_BREATH.phase))) * (0.5 - 0.12) * m.h * s;
    out.push({ id: 'ai-eye', src: { kind: 'image', url: url2(`${name}-eye`) }, d, x: r.x + ex * s, y: cy - (eh * s * sy) / 2 - up, w: ew * s, h: eh * s * sy, rot: o.rot, pivot: o.pivot, opacity: o.opacity });
  }
  return out;
};
/** AI rect with her feet (floorY or bbox bottom) on floor and the given sprite x at world x. */
const aiFeet = (name: string, s: number, x: number, sx: 'eye' | 'center' | number, floor: number): Rect => {
  const m = sp2(name);
  const bb = m.bbox as [number, number, number, number];
  const fy = m.floorY ?? bb[3];
  const ax = sx === 'eye' && m.eye ? (m.eye[0] as number) + (m.eye[2] as number) / 2 : sx === 'center' || sx === 'eye' ? (bb[0] + bb[2]) / 2 : sx;
  return { x: x - ax * s, y: floor - fy * s, w: m.w * s, h: m.h * s };
};

const iconLayer = (id: string, cx: number, cy: number, size: number, d: number, paint: CanvasSource['paint']): Layer =>
  canvasLayer(id, id, 256, 256, d, { x: cx - size / 2, y: cy - size / 2, w: size, h: size }, paint);

// ---------------------------------------------------------------------------------------------------------------
// Scene 5: chorus 1 in the split.

const SEAM = P1.SEAM;
const FLOOR = P1.FLOOR;
const D_GLASS = P1.D_GLASS;

/** Bar index of frame f inside the chorus waves (0 before the first wave). */
const waveIndex = (f: number): number => F.waves.filter((w) => f >= w).length;
/** A wave runs WAVE_LEN frames from its downbeat; the last wave covers the whole frame by F.days. */
export const WAVE_LEN = 22;
export interface WaveSpec {
  start: number;
  end: number;
  full: boolean;
}
export const WAVES: readonly WaveSpec[] = [...F.waves.map((s) => ({ start: s, end: s + WAVE_LEN, full: false })), { start: F.lastWave, end: F.days - 2, full: true }];

/** Moon phase on the seam: one step per bar, one step per beat on "Ay dolar, ay kucumur" (it fills, then shrinks). */
const MOON_STEPS: readonly (readonly [number, number])[] = [
  [F.waves[0] as number, 0.3],
  [F.glass, 0.4],
  [1846, 0.55],
  [1860, 0.75],
  [1874, 1.0],
  [1902, 0.8],
  [1916, 0.6],
  [1930, 0.45],
  [1944, 0.35],
  [1987, 0.5],
  [2043, 0.65],
  [F.lastWave, 0.8],
];
const moonPhase = (f: number): number => {
  let p = 0.3;
  let prev = 0.3;
  let at = -99;
  for (const [sf, v] of MOON_STEPS) if (f >= sf) {
    prev = p;
    p = v;
    at = sf;
  }
  // each step settles in 5 frames (a printed step, not a slide)
  return lerp(prev, p, easeOut((f - at + 1) / 5));
};
const MOON_C: Pt = [SEAM, 190];
const MOON_R = 80;
const splitMoonLayer = (f: number): Layer => {
  const appear = easeOut(span(f, F.waves[0] as number, (F.waves[0] as number) + 12));
  const size = (MOON_R / 0.4) * (0.6 + 0.4 * appear);
  return canvasLayer('split-moon', 'split-moon', 420, 420, D_GLASS, { x: MOON_C[0] - size / 2, y: MOON_C[1] - size / 2, w: size, h: size }, (ctx, cw, ch) => paintSplitMoon(ctx, cw, ch, moonPhase(f)), { opacity: appear });
};

// His wall gains one note per bar (from the cut to the glass): pinned in a loose grid on the room plate.
const HIS_NOTES: readonly Pt[] = (() => {
  const r = seeded('p2:his-notes');
  const out: Pt[] = [];
  for (let i = 0; i < 12; i++) out.push([250 + (i % 4) * 92 + (r() - 0.5) * 26, 170 + Math.floor(i / 4) * 96 + (r() - 0.5) * 22]);
  return out;
})();
const hisNotesLayer = (f: number, count: number, born: (i: number) => number): Layer => {
  const box = placeAt({ x: 150, y: 80, w: 520, h: 400 }, P1.D_SKYROOM);
  return canvasLayer('his-notes', 'his-notes', 520, 400, P1.D_SKYROOM, box, (ctx) => {
    for (let i = 0; i < count; i++) {
      const k = f - born(i);
      if (k < 0) continue;
      // pinned with a small bounce
      const pop = k < 8 ? 1 + 0.25 * Math.sin((Math.PI * k) / 8) * (1 - k / 8) : 1;
      const [x, y] = HIS_NOTES[i % HIS_NOTES.length] as Pt;
      ctx.save();
      ctx.translate(x - 150, y - 80);
      ctx.scale(pop, pop);
      P1.paintNote(ctx, 0, 0, (seeded(`p2:hn:${i}`)() - 0.5) * 24, 0, `p2:hn:${i}`);
      ctx.restore();
    }
  });
};

// Her box (she sits on it, swinging her legs): a plain cardboard box drawn in code.
const BOX_X = 1150;
const BOX_W = 190;
/** Box height = her seat-to-feet length minus a little, so her feet swing just above the floor. */
const BOX_H = ((): number => {
  const m = SP2['a-sit'];
  if (!m?.seat) return 205;
  const s = (m.headPx ? (138 * P1.AS) / m.headPx : P1.AS);
  return ((m.bbox[3] as number) - (m.seat[1] as number)) * s - 14;
})();
const sitBoxLayer = (): Layer =>
  canvasLayer('sit-box', 'sit-box', 400, 440, D_GLASS, { x: BOX_X - 5, y: FLOOR - BOX_H - 26, w: BOX_W + 10, h: BOX_H + 30 }, (ctx, cw, ch) => {
    const sx = cw / (BOX_W + 10);
    const sy = ch / (BOX_H + 30);
    ctx.save();
    ctx.scale(sx, sy);
    ctx.translate(5, 26);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette.navy;
    // top (a thin sliver: the box is seen almost side-on, like the room)
    ctx.fillStyle = palette.cream;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, -18);
    ctx.lineTo(BOX_W + 2, -18);
    ctx.lineTo(BOX_W - 12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(0, 0, BOX_W - 12, BOX_H);
    ctx.strokeRect(0, 0, BOX_W - 12, BOX_H);
    // the side face, hatched
    ctx.beginPath();
    ctx.moveTo(BOX_W - 12, 0);
    ctx.lineTo(BOX_W + 2, -18);
    ctx.lineTo(BOX_W + 2, BOX_H - 18);
    ctx.lineTo(BOX_W - 12, BOX_H);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 1.6;
    for (let y = -20; y < BOX_H + 20; y += 7) {
      ctx.beginPath();
      ctx.moveTo(BOX_W - 14, y + 12);
      ctx.lineTo(BOX_W + 4, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  });

/** The sitting AI on the box: body + shins on a knee rig swinging (one swing per two beats, eased in). */
const AI_SIT_S = (): number => aiScale2('a-sit');
const sitLayers = (f: number): Layer[] => {
  const m = sp2('a-sit');
  const s = AI_SIT_S();
  const seat = pt(m.seat, 'a-sit seat');
  const at: Pt = [BOX_X + BOX_W * 0.62, FLOOR - BOX_H];
  const r = spriteRect('a-sit', s, seat, at);
  const out = ai2Layers('a-sit-body', r, f, { blinks: [1800, 1890, 1972] });
  const knee = pt(m.knee, 'a-sit knee');
  const pivot: Pt = [r.x + knee[0] * s, r.y + knee[1] * s];
  const k = f - (F.waves[0] as number);
  const ramp = clamp01(k / 14);
  const ang = 14 * Math.sin((2 * Math.PI * k) / 28) * ramp;
  out.unshift({ id: 'ai-shins', src: { kind: 'image', url: url2('a-sit-shins') }, d: D_GLASS, ...r, rot: ang, pivot });
  return out;
};

/** Her note per bar: it comes through the glass mid-bar and is pinned near her; the next wave wipes it. */
const HER_PIN: Pt = [1520, 330];
const herNoteBorn = (bar: number): number => (F.waves[bar] as number) + 28;
const waveFrontX = (wave: WaveSpec, f: number, yScreen: number): number => {
  // the WhiteWave's front (transitions/WhiteWave.tsx edgeX with jag 0) on screen; SEAM_SWEEP for her side
  const p = clamp01((f - wave.start) / (wave.end - wave.start));
  const s = p * p * (3 - 2 * p);
  const from = wave.full ? -300 : 900;
  const to = W + 260 + 240;
  const base = from + s * (to - from);
  return base + 300 * Math.pow(Math.sin((Math.PI * yScreen) / H), 1.2) - 240;
};
const herNotesLayer = (f: number, cam: Cam): Layer | null => {
  // which note is alive: born in bar b (b >= 1), wiped by wave b+1
  const notes: { x: number; y: number; rot: number; seed: string }[] = [];
  for (let b = 1; b < F.waves.length; b++) {
    const born = herNoteBorn(b);
    if (f < born) continue;
    const wipe = WAVES[b + 1] as WaveSpec;
    if (f >= wipe.start) {
      const [sx, sy] = project(cam, D_GLASS, HER_PIN);
      if (waveFrontX(wipe, f, sy) > sx || f > wipe.end) continue;
    }
    const u = sine(span(f, born, born + 12));
    const from: Pt = [SEAM - 30, 360];
    notes.push({ x: lerp(from[0], HER_PIN[0], u), y: lerp(from[1], HER_PIN[1], u) - 110 * Math.sin(Math.PI * u), rot: 14 * u + 10 * Math.sin(u * 6) * (1 - u), seed: `p2:her:${b}` });
  }
  if (!notes.length) return null;
  const box: Rect = { x: SEAM - 100, y: 120, w: 800, h: 400 };
  return canvasLayer('her-notes', 'her-notes', 800, 400, D_GLASS, box, (ctx) => {
    for (const n of notes) P1.paintNote(ctx, n.x - box.x, n.y - box.y, n.rot, 0, n.seed);
  });
};
export const herNoteRowsAt = (f: number, cam: Cam): number[] => {
  const b = WAVES.findIndex((w) => f >= w.start && f <= w.end + 1);
  if (b < 1) return [];
  return [project(cam, D_GLASS, HER_PIN)[1] / H];
};

const humanSplit = (f: number): Layer => P1.humanLayer(f, f < F.glass ? 'h-mug2' : 'h-glass-note');

const herSplit = (f: number, cam: Cam): Layer[] => {
  if (f >= F.burada) return P1.aiLayers('a-hand', P1.aiAt('a-hand', SEAM + 3, 'left'), f, { blinks: [2080, 2130] });
  const w0 = F.waves[0] as number;
  // the first wave carries her from standing to sitting: the cut happens the frame the cream front passes her
  const standing = (() => {
    if (f < w0) return true;
    if (f > w0 + WAVE_LEN + 1) return false;
    const [sx, sy] = project(cam, D_GLASS, [P1.AI_STAND.x + P1.AI_STAND.w, 600]);
    return !(waveFrontX(WAVES[0] as WaveSpec, f, sy) > sx);
  })();
  if (standing) return P1.aiLayers('ai-stand', P1.AI_STAND, f, { blinks: [1722] });
  return [sitBoxLayer(), ...sitLayers(f)];
};

const chorusLayers2 = (f: number, cam: Cam): Layer[] => {
  if (f < (F.waves[0] as number)) return P1.chorusLayers(f);
  const glassBars = (n: number): number => F.waves[Math.min(F.waves.length - 1, n + 1)] as number;
  const hisCount = Math.max(0, waveIndex(f) - 1);
  const layers: Layer[] = [
    { id: 'sroom', src: { kind: 'image', url: P1.ROOM_SPLIT.key }, d: P1.D_SKYROOM, ...P1.SROOM_W },
    { id: 'smoon', src: { kind: 'image', url: P1.ROOM_SPLIT.moon }, d: P1.D_SKYROOM, ...P1.SROOM_W },
    hisNotesLayer(f, hisCount, (i) => glassBars(i)),
    ...P1.creamLayers(),
    splitMoonLayer(f),
  ];
  const hn = herNotesLayer(f, cam);
  if (hn) layers.push(hn);
  layers.push(humanSplit(f));
  layers.push(...herSplit(f, cam));
  layers.push(P1.floatNotesLayer(sec(f)));
  return layers;
};

// The chorus camera: Part 1's chorusCam to its end (1740), then reframes on the lines.
const CC0: Cam = { x: 950, y: 560, z: 1010 };
const CHORUS_KEYS: readonly (readonly [number, Cam])[] = [
  [1740, CC0],
  [1818, { x: 956, y: 548, z: 975 }],
  [1902, { x: 962, y: 470, z: 930 }],
  [1950, { x: 960, y: 540, z: 1000 }],
  [2068, { x: 961, y: 545, z: 985 }],
  [2140, { x: 962, y: 560, z: 860 }],
  [F.days, { x: 962, y: 562, z: 820 }],
];
const chorusCam2 = (f: number): Cam => (f < 1740 ? P1.chorusCam(f) : camKeys(CHORUS_KEYS, f));
const chorusShot = (f: number): StageShot => {
  const cam = chorusCam2(f);
  return { kind: 'stage', layers: chorusLayers2(f, cam), cam };
};

// ---------------------------------------------------------------------------------------------------------------
// Scene 6: "bir daha" at the side-view desk (Part 1's desk2 and room-morning, the same perspective and place).

/** Day number (1-based) and pose of each montage frame. */
export const dayAt = (f: number): { day: number; cut: number } => {
  let i = 0;
  DAY_CUTS.forEach((c, k) => {
    if (f >= c) i = k;
  });
  // day 1 shows four poses (2155-2211); every later cut is a new day
  const day1 = DAY_CUTS.filter((c) => c < 2211).length;
  return { day: i < day1 ? 1 : i - day1 + 2, cut: DAY_CUTS[i] as number };
};
type DayPose = 'h-type1' | 'h-type2' | 'h-type3' | 'h-coffee' | 'h-stretch';
const ROUTINE: readonly ('type' | 'coffee' | 'stretch')[] = ['type', 'coffee', 'stretch', 'type'];
const poseOfCut = (idx: number, day: number): DayPose => {
  // the last cut before the dead stop is the frame that freezes: at the desk, sunk lowest
  if (idx === DAY_CUTS.length - 1) return 'h-type3';
  const step = ROUTINE[idx % ROUTINE.length] as 'type' | 'coffee' | 'stretch';
  if (step === 'coffee') return 'h-coffee';
  if (step === 'stretch') return 'h-stretch';
  // posture sinks: three typing levels over the days
  return day < 9 ? 'h-type1' : day < 20 ? 'h-type2' : 'h-type3';
};
const cutIndex = (f: number): number => {
  let i = 0;
  DAY_CUTS.forEach((c, k) => {
    if (f >= c) i = k;
  });
  return i;
};
/** The frozen frame of the dead stop is the last montage frame (2597's content, the camera stopped). */
const montageF = (f: number): number => (f >= F.stop ? F.stop : f);

const KEYS_PX = { x: 300, y: 320 }; // desk2 sprite px: where the fingers rest on the keyboard (measured on a 3x grid)
const SEAT_HEAD = 158 * P1.HUMAN_S; // world px of his head in the desk set (Part 1's seated man)
const humanScaleDesk = (name: string): number => {
  const m = sp2(name);
  return m.headPx ? SEAT_HEAD / m.headPx : P1.HUMAN_S;
};
const KEY_W = P1.deskPx(KEYS_PX.x, KEYS_PX.y);
/** Typing: the fingertips on the keys and the chair on the floor fix the scale; the head-size scale is the check. */
const typeRect = (name: string): Rect => {
  const m = sp2(name);
  const hands = pt(m.hands, `${name} hands`);
  const floorY = m.floorY ?? (m.bbox[3] as number);
  const sFit = (P1.FEET_Y - KEY_W[1]) / (floorY - hands[1]);
  const sHead = humanScaleDesk(name);
  // keep within 8 % of the head-size scale (a bigger mismatch would change his size between cuts)
  const s = Math.min(sHead * 1.08, Math.max(sHead * 0.92, sFit));
  return { x: KEY_W[0] - hands[0] * s, y: P1.FEET_Y - floorY * s, w: m.w * s, h: m.h * s };
};
const CHAIR_BACK_X = (): number => {
  const r = typeRect('h-type1');
  return r.x + (sp2('h-type1').bbox[0] as number) * (r.w / sp2('h-type1').w);
};
const seatedAt = (name: string): Rect => {
  const m = sp2(name);
  const s = humanScaleDesk(name);
  const floorY = m.floorY ?? (m.bbox[3] as number);
  return { x: CHAIR_BACK_X() - (m.bbox[0] as number) * s, y: P1.FEET_Y - floorY * s, w: m.w * s, h: m.h * s };
};
// The coffee corner: the cabinet left of his chair; standing at it he faces left with the mug under the spout.
const CAB_RIGHT = (): number => CHAIR_BACK_X() - 150;
const cabRect = (): Rect => {
  const m = sp2('coffee-cab');
  const s = humanScaleDesk('h-coffee');
  const floorY = m.floorY ?? (m.bbox[3] as number);
  return { x: CAB_RIGHT() - (m.bbox[2] as number) * s, y: P1.FEET_Y - floorY * s, w: m.w * s, h: m.h * s };
};
const coffeeRect = (): Rect => {
  const c = cabRect();
  const cm = sp2('coffee-cab');
  const cs = c.w / cm.w;
  const spout = pt(cm.spout, 'coffee-cab spout');
  const m = sp2('h-coffee');
  const s = humanScaleDesk('h-coffee');
  const mug = pt(m.mugTop, 'h-coffee mugTop');
  const floorY = m.floorY ?? (m.bbox[3] as number);
  // the mug under the spout (x), his feet on the floor (y)
  return { x: c.x + spout[0] * cs - mug[0] * s, y: P1.FEET_Y - floorY * s, w: m.w * s, h: m.h * s };
};
const chairRect = (): Rect => {
  const m = sp2('chair2');
  const s = humanScaleDesk('h-type1');
  const floorY = m.floorY ?? (m.bbox[3] as number);
  return { x: CHAIR_BACK_X() - (m.bbox[0] as number) * s, y: P1.FEET_Y - floorY * s, w: m.w * s, h: m.h * s };
};
const deskPoseRect = (p: DayPose): Rect => (p === 'h-coffee' ? coffeeRect() : p === 'h-stretch' ? stretchRect() : typeRect(p));
// h-stretch: scaled by its chair (the lane normalised the chairs to a 150 px head); its own head is drawn ~30 % small
// (6 generations, the model always shrinks the head in this pose), so scaling it by the head would grow the chair.
const stretchRect = (): Rect => {
  const m = sp2('h-stretch');
  const s = SEAT_HEAD / 150;
  const floorY = m.floorY ?? (m.bbox[3] as number);
  return { x: CHAIR_BACK_X() - (m.bbox[0] as number) * s, y: P1.FEET_Y - floorY * s, w: m.w * s, h: m.h * s };
};

// Tally wall: left of the window, above his head; mugs: on the desk right of the monitor.
const TALLY_W = placeAt({ x: 40, y: 40, w: 560, h: 350 }, P1.D_ROOM);
const MUG_W: Rect = (() => {
  const a = P1.deskPx(705, 346);
  const b = P1.deskPx(1010, 346);
  const w = b[0] - a[0];
  const h = (w * MUG_CANVAS.h) / MUG_CANVAS.w;
  return { x: a[0], y: a[1] - h + 2, w, h };
})();
/** Tally strokes after day n: one per day while the "daha" is sung, then faster, then a flood (uncountable). */
export const tallyCount = (day: number): number => (day <= 6 ? day : day <= 26 ? 6 + (day - 6) * 3 : 66 + (day - 26) * 60);
const mugCount = (day: number): number => Math.min(55, Math.round(day * 1.6) - 1);
// more notes on him every day, capped so the drawing stays readable (34 covered him completely: a yellow suit)
const notesCount = (day: number): number => Math.min(14, Math.round(day * 0.55));

const SCREEN_RES = 4;
const monitorLayer = (flash: number): Layer => {
  const sb = P1.SCR_BOX;
  const cw = Math.round((sb.x1 - sb.x0) * SCREEN_RES);
  const ch = Math.round((sb.y1 - sb.y0) * SCREEN_RES);
  const q = P1.SCREEN_Q as unknown as readonly Pt[];
  // the flat screen picture mapped onto the screen quad by an affine fit of its three corners (TL, TR, BL)
  const [tl, tr, , bl] = q as [Pt, Pt, Pt, Pt];
  const map = (p: Pt): Pt => [(p[0] - sb.x0) * SCREEN_RES, (p[1] - sb.y0) * SCREEN_RES];
  const a = map(tl);
  const b = map(tr);
  const c = map(bl);
  const SW = 800;
  const SH = 500;
  return canvasLayer('screen', 'screen', cw, ch, P1.D_DESK, P1.scrW, (ctx) => {
    ctx.save();
    ctx.beginPath();
    (q as Pt[]).forEach((p, i) => (i ? ctx.lineTo(...map(p)) : ctx.moveTo(...map(p))));
    ctx.closePath();
    ctx.clip();
    ctx.setTransform((b[0] - a[0]) / SW, (b[1] - a[1]) / SW, (c[0] - a[0]) / SH, (c[1] - a[1]) / SH, a[0], a[1]);
    paintMonitorScreen(ctx, SW, SH, P1.getImg(P1.url('ai-wave-a')), flash);
    ctx.restore();
  });
};

const DAY_BREATH: BreathOpts = { top: 0.22, hip: 0.6, amp: 0.008, period: 3.6, phase: 0.2 };
const daysLayers = (f0: number, cam: Cam): Layer[] => {
  const f = montageF(f0);
  const i = cutIndex(f);
  const { day } = dayAt(f);
  const pose = poseOfCut(i, day);
  const night = i % 2 === 1;
  const r = deskPoseRect(pose);
  const layers: Layer[] = [
    canvasLayer('sky', night ? 'sky-night' : 'sky-day', 900, 900, P1.D_SKY, P1.SKY_W, (ctx, cw, ch) => paintWindowSky(ctx, cw, ch, night, 'p2:sky')),
    { id: 'room', src: { kind: 'image', url: P1.url('room-morning') }, d: P1.D_ROOM, ...P1.ROOM_W },
    canvasLayer('tally', 'tally', TALLY_CANVAS.w, TALLY_CANVAS.h, P1.D_ROOM - 1, TALLY_W, (ctx, cw, ch) => paintTally(ctx, cw, ch, tallyCount(day), 'p2:tally')),
    { id: 'cab', src: { kind: 'image', url: url2('coffee-cab') }, d: 0, ...cabRect() },
  ];
  if (pose === 'h-coffee') layers.push({ id: 'chair', src: { kind: 'image', url: url2('chair2') }, d: 0, ...chairRect() });
  layers.push(P1.contactShadow('human-shadow', 0, r.x + 0.1 * r.w, r.x + 0.9 * r.w, P1.FEET_Y));
  layers.push(human2Layer('human', pose, r, 0, f, DAY_BREATH));
  layers.push(canvasLayer('body-notes', 'body-notes', sp2(pose).w, sp2(pose).h, 0, r, (ctx, cw, ch) => paintBodyNotes(ctx, cw, ch, img(pose), notesCount(day), 'p2:bn')));
  layers.push(
    ...(P1.DESK_META.legs as number[][]).map((l, k) => {
      const a = P1.deskPx(l[0] as number, P1.DESK_META.floorY as number);
      const b = P1.deskPx(l[1] as number, P1.DESK_META.floorY as number);
      return P1.contactShadow(`desk-shadow-${k}`, P1.D_DESK, a[0] - 14, b[0] + 14, a[1]);
    }),
    { id: 'desk', src: { kind: 'image', url: P1.url('desk2') }, d: P1.D_DESK, ...P1.DESK_W },
  );
  // the reset flash: every day her screen flashes white and comes back identical
  const flash = f < F.days + 12 ? 1 : 1 - clamp01((f - (F.days + 12)) / 10);
  const dayFlash = i > 0 ? 1 - clamp01((f - DAY_CUTS[i]!) / 5) : 0;
  layers.push(monitorLayer(Math.max(flash, dayFlash * 0.9)));
  layers.push(canvasLayer('mugs', 'mugs', MUG_CANVAS.w, MUG_CANVAS.h, P1.D_DESK - 1, MUG_W, (ctx, cw, ch) => paintMugTower(ctx, cw, ch, mugCount(day), 'p2:mugs')));
  // 2155: shape match cut on the white. The chorus's last wave left the frame all cream; the cut lands on his
  // monitor flashing the same cream, with a halo that fades (a contracting full-frame shape jumped frame to frame).
  if (f < F.days + 12) {
    const u = sine(span(f, F.days, F.days + 11));
    const qc = (P1.SCREEN_Q as unknown as readonly Pt[]).map((p) => project(cam, P1.D_DESK, P1.deskPx(p[0], p[1])));
    const cx = qc.reduce((a, p) => a + p[0], 0) / 4;
    const cy = qc.reduce((a, p) => a + p[1], 0) / 4;
    layers.push(
      screenLayer('flash', 'flash', cam, -100, (ctx, cw, ch) => {
        const g = ctx.createRadialGradient(cx, cy, 120, cx, cy, 720);
        g.addColorStop(0, 'rgba(243,239,228,0.85)');
        g.addColorStop(1, 'rgba(243,239,228,0)');
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
      }),
    );
  }
  return layers;
};
// One continuous slow push-in toward him, 2155 -> 2604 (it never jumps; at the dead stop it simply stops).
const DAYS_A: Cam = { x: 905, y: 520, z: 1060 };
// end framing keeps the standing (coffee) pose's head inside the top edge
const DAYS_B: Cam = { x: 770, y: 432, z: 760 };
const daysCam = (f: number): Cam => {
  const u = span(Math.min(f, F.stop), F.days, F.stop);
  // eases in, keeps moving until the stop (the stop is the music's, not the camera's)
  return mixCam(DAYS_A, DAYS_B, u < 0.2 ? 2.5 * u * u : 0.1 + (u - 0.2) * 1.125);
};
const daysShot = (f: number): StageShot => {
  const cam = daysCam(f);
  return { kind: 'stage', layers: daysLayers(f, cam), cam };
};

// ---------------------------------------------------------------------------------------------------------------
// End of scene 6: the split at night. Asleep against the glass, wakes, presses his "Merhaba" note on the glass.

const SPLIT_HEAD = 158 * P1.HS * (158 / 159); // his head in the split (h-mug2's 159 px at HS * SEAT_K)
const humanScaleSplit = (name: string): number => {
  const m = sp2(name);
  return m.headPx ? SPLIT_HEAD / m.headPx : P1.HS;
};
const glassSitRect = (name: 'h-sleep' | 'h-wake'): Rect => {
  const m = sp2(name);
  const s = humanScaleSplit(name);
  const back = m.backX ?? (m.bbox[2] as number);
  const floorY = m.floorY ?? (m.bbox[3] as number);
  return { x: SEAM - 4 - back * s, y: FLOOR - floorY * s, w: m.w * s, h: m.h * s };
};
/** His note on the glass (h-glass-note's note, sprite px 267..333 x 79..172), redrawn in code so the push can enter it. */
const NOTE_SPR = { x0: 262, y0: 76, x1: 338, y1: 176 };
const NOTE_HAND: readonly Pt[] = [
  [283, 108],
  [301, 110],
  [306, 138],
  [313, 150],
  [306, 178],
  [290, 205],
  [236, 205],
  [252, 172],
  [270, 146],
  [276, 120],
];
const glassNoteRect = (): Rect => P1.humanRectOf('h-glass-note');
const noteWorld = (): Rect => {
  const r = glassNoteRect();
  const s = r.w / 339;
  // humanLayer's rect includes LIFT_PAD on top: the sprite starts LIFT_PAD * s lower
  const top = r.y + LIFT_PAD * s;
  return { x: r.x + NOTE_SPR.x0 * s, y: top + NOTE_SPR.y0 * s, w: (NOTE_SPR.x1 - NOTE_SPR.x0) * s, h: (NOTE_SPR.y1 - NOTE_SPR.y0) * s };
};
const pressNoteLayers = (): Layer[] => {
  const nw = noteWorld();
  const r = glassNoteRect();
  const s = r.w / 339;
  const top = r.y + LIFT_PAD * s;
  return [
    canvasLayer('press-note', 'press-note', 1200, 1580, D_GLASS - 1, nw, (ctx, cw, ch) => {
      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate((-4 * Math.PI) / 180);
      ctx.translate(-cw / 2, -ch / 2);
      paintNoteFill(ctx, cw, ch, 'Merhaba', true);
      ctx.restore();
    }),
    // his hand stays on top of the note
    canvasLayer('press-hand', 'press-hand', 339, 220, D_GLASS - 2, { x: r.x, y: top, w: 339 * s, h: 220 * s }, (ctx) => {
      ctx.save();
      ctx.beginPath();
      NOTE_HAND.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(P1.getImg(P1.url('h-glass-note')), 0, 0);
      ctx.restore();
    }),
  ];
};

const nightSplitLayers = (f: number): Layer[] => {
  const layers: Layer[] = [
    { id: 'sroom', src: { kind: 'image', url: P1.ROOM_SPLIT.key }, d: P1.D_SKYROOM, ...P1.SROOM_W },
    { id: 'smoon', src: { kind: 'image', url: P1.ROOM_SPLIT.moon }, d: P1.D_SKYROOM, ...P1.SROOM_W },
    ...P1.creamLayers(),
    P1.moonLayer(),
  ];
  if (f < F.press) {
    const name = f < F.wake ? 'h-sleep' : 'h-wake';
    const r = glassSitRect(name);
    layers.push(human2Layer('human', name, r, D_GLASS, f, { top: 0.2, hip: 0.7, amp: f < F.wake ? 0.016 : 0.008, period: f < F.wake ? 4.8 : 2.4, phase: 0 }));
    const ht = sp2(name).headTop ?? [(sp2(name).bbox[0] as number) + 0.4 * ((sp2(name).bbox[2] as number) - (sp2(name).bbox[0] as number)), sp2(name).bbox[1] as number];
    const s = r.w / sp2(name).w;
    const hx = r.x + (ht[0] as number) * s;
    const hy = r.y + (ht[1] as number) * s;
    if (f < F.wake) layers.push(iconLayer('icon-zzz', hx - 90, hy - 110, 360, D_GLASS - 1, (ctx, cw, ch) => paintZzz(ctx, cw, ch, sec(f - F.sleep))));
    else layers.push(iconLayer('icon-bang', hx + 10, hy - 110, 320, D_GLASS - 1, (ctx, cw, ch) => paintBang(ctx, cw, ch, sec(f - F.wake), { out: span(f, F.press - 4, F.press) })));
  } else if (f < F.noteClose) {
    layers.push(P1.humanLayer(f, 'h-glass-note'));
    layers.push(...pressNoteLayers());
  } else {
    // the close shot: the note stuck on the glass, his hand gone (the sprite's hand, magnified 25x, was a blur)
    layers.push(...pressNoteLayers().filter((l) => l.id === 'press-note'));
  }
  // she stands facing the glass; when he presses the note first, she tilts her head (the whole drawing, 3 degrees)
  const tilt = 3 * sine(span(f, F.press + 2, F.press + 12));
  layers.push(...P1.aiLayers('ai-stand', P1.AI_STAND, f, { blinks: [2626, 2650], rot: tilt, pivot: [P1.AI_STAND.x + P1.AI_STAND.w / 2, FLOOR] }));
  if (f < F.yellow - 30) layers.push(P1.floatNotesLayer(sec(f)));
  return layers;
};
const nightCam = (f: number): Cam => {
  const base: Cam = { x: 900, y: 600, z: 820 };
  if (f < F.press) return mixCam(base, { x: 905, y: 610, z: 790 }, sine(span(f, F.sleep, F.press)));
  // the push into the note, in two shots: a slow push on him pressing it (2646-2653), then on the half beat a cut to
  // the note close (his fingertips at its lower left) pushing into the "Merhaba" line until it is all yellow (2660).
  // One continuous 56x zoom over 14 frames jumped frame to frame in the first renders.
  const nw = noteWorld();
  const target: Cam = { x: nw.x + nw.w * 0.52, y: nw.y + nw.h * 0.18, z: 14 };
  const start: Cam = { x: 905, y: 610, z: 790 };
  if (f < F.noteClose) {
    const near: Cam = { x: lerp(start.x, nw.x + nw.w * 0.5, 0.5), y: lerp(start.y, nw.y + nw.h * 0.5, 0.5), z: 520 };
    return mixCam(start, near, sine(span(f, F.press, F.noteClose)));
  }
  const close: Cam = { x: nw.x + nw.w * 0.5, y: nw.y + nw.h * 0.3, z: 40 };
  return mixCam(close, target, sine(span(f, F.noteClose, F.yellow - 1)));
};
const nightShot = (f: number): StageShot => {
  const cam = nightCam(f);
  return { kind: 'stage', layers: nightSplitLayers(f).filter((l) => cam.z + l.d > 6), cam };
};

// ---------------------------------------------------------------------------------------------------------------
// Scenes 7: her cream world. The path of handwriting, strides, the knot, come apart, the pen redraws her.

const C_FLOOR = 820; // the path's baseline (world y on the d = 0 plane)
const SEGS = 26;
const SEG_W = 260;
const PATH_X0 = -300;
const PATH_CANVAS = { w: 4096, h: 192 };
const PATH_W: Rect = (() => {
  const w = SEGS * SEG_W;
  const h = (w * PATH_CANVAS.h) / PATH_CANVAS.w;
  return { x: PATH_X0, y: C_FLOOR - h / 2, w, h };
})();
const PG = pathGeom(PATH_CANVAS.w, PATH_CANVAS.h, SEGS);
const segX = (i: number): number => PATH_X0 + (PG.segX(i) / PATH_CANVAS.w) * PATH_W.w;
const KNOT_SEG = 8;
const KNOT_X = PATH_X0 + (PG.knotX(KNOT_SEG) / PATH_CANVAS.w) * PATH_W.w;
const AI_SMALL = 0.55; // she is small in the wide cream frame

/** Her place and pose per stride (time-slice: one stride drawing per beat at a new place). */
const STRIDE_X0 = 300;
const STRIDE_DX = (): number => (KNOT_X - 70 - STRIDE_X0) / (F.strides.length - 0.5);
interface CPose {
  name: Ai2;
  x: number;
  ver: number;
  mode: 'pose' | 'apart' | 'pen' | 'gone';
  p: number;
}
const BOXES_N = 4;
const BOX_X0 = KNOT_X + 520;
const boxScale = (): number => {
  // the box tops at the height of her tapping fingertip
  const m = sp2('a-tap');
  const s = aiScale2('a-tap', AI_SMALL);
  const tap = pt(m.tap, 'a-tap tap');
  const floorY = m.floorY ?? (m.bbox[3] as number);
  const tapH = (floorY - tap[1]) * s;
  return tapH / (boxGeom(0, BOXES_N).h + 2);
};
const BOXES_W = (): Rect => {
  const k = boxScale();
  return { x: BOX_X0, y: C_FLOOR + 20 * k - BOX_CANVAS.h * k, w: BOX_CANVAS.w * k, h: BOX_CANVAS.h * k };
};
const boxTop = (i: number): Pt => {
  const g = boxGeom(i, BOXES_N);
  const bw = BOXES_W();
  const k = bw.w / BOX_CANVAS.w;
  // her fingertip lands on the near (left) quarter of the lid, so she stands beside the box, not in front of it
  return [bw.x + (g.x + g.w * 0.22) * k, bw.y + g.top * k];
};

const herPose = (f: number): CPose => {
  const st = F.strides;
  const dx = STRIDE_DX();
  const stridePose = (k: number): Ai2 => (['a-step1', 'a-step2', 'a-step3'] as const)[k % 3] as Ai2;
  if (f < (st[0] as number)) return { name: 'a-step2', x: STRIDE_X0 - dx * 0.5, ver: 1, mode: 'pose', p: 0 };
  if (f < F.trip1) {
    const k = st.filter((s) => f >= s).length - 1;
    return { name: stridePose(k), x: STRIDE_X0 + dx * k, ver: 1, mode: 'pose', p: 0 };
  }
  const redrawX = KNOT_X - 70 - dx;
  if (f < F.apart1) return { name: 'a-trip', x: KNOT_X - 40, ver: 1, mode: 'pose', p: 0 };
  if (f < F.pen2) return { name: 'a-trip', x: KNOT_X - 40, ver: 1, mode: 'apart', p: span(f, F.apart1, F.pen2 - 2) };
  if (f < F.stride2) return { name: 'a-step1', x: redrawX, ver: 2, mode: 'pen', p: span(f, F.pen2, F.stride2 - 2) };
  if (f < F.trip2) return { name: 'a-step3', x: redrawX + dx, ver: 2, mode: 'pose', p: 0 };
  if (f < F.apart2) return { name: 'a-trip', x: KNOT_X - 40, ver: 2, mode: 'pose', p: 0 };
  if (f < F.pen3) return { name: 'a-trip', x: KNOT_X - 40, ver: 2, mode: 'apart', p: span(f, F.apart2, F.pen3 - 2) };
  const t0 = F.taps[0] as number;
  if (f < t0) return { name: 'a-step1', x: redrawX, ver: 3, mode: 'pen', p: span(f, F.pen3, F.pen3 + 18) };
  if (f < F.thumb) {
    const k = F.taps.filter((s) => f >= s).length - 1;
    const tp = pt(sp2('a-tap').tap, 'a-tap tap');
    return { name: 'a-tap', x: boxTop(k)[0] - tp[0] * 0 /* x anchored by tap below */, ver: 3, mode: 'pose', p: k };
  }
  // left of the first box (not in it), facing back toward the glass
  return { name: 'a-thumb', x: BOXES_W().x + (boxGeom(0, BOXES_N).x / BOX_CANVAS.w) * BOXES_W().w - 90, ver: 3, mode: 'pose', p: 0 };
};

const herRect = (cp: CPose): Rect => {
  const s = aiScale2(cp.name, AI_SMALL);
  if (cp.name === 'a-tap') {
    const m = sp2('a-tap');
    const tap = pt(m.tap, 'a-tap tap');
    const floorY = m.floorY ?? (m.bbox[3] as number);
    const [bx] = boxTop(cp.p);
    return { x: bx - tap[0] * s, y: C_FLOOR - floorY * s, w: m.w * s, h: m.h * s };
  }
  return aiFeet(cp.name, s, cp.x, 'center', C_FLOOR);
};

const C_BLINKS = [2740, 2790, 2950, 3010, 3040, 3100, 3140];
const herCreamLayers = (f: number, d = 0): Layer[] => {
  const cp = herPose(f);
  const r = herRect(cp);
  const m = sp2(cp.name);
  const out: Layer[] = [];
  if (cp.mode === 'pose') {
    out.push(...ai2Layers(cp.name, r, f, { blinks: C_BLINKS, d, still: cp.ver === 3 }));
  } else if (cp.mode === 'apart') {
    const s = r.w / m.w;
    const M = COME_APART_MARGIN;
    out.push(
      canvasLayer('ai-apart', `ai-apart:${cp.name}`, m.w + 2 * M, m.h + 2 * M, d, { x: r.x - M * s, y: r.y - M * s, w: (m.w + 2 * M) * s, h: (m.h + 2 * M) * s }, (ctx, cw, ch) =>
        paintComeApart(ctx, cw, ch, img(cp.name), cp.p, `p2:apart:${cp.ver}`),
      ),
    );
  } else if (cp.mode === 'pen') {
    // the PEN redraws her as the next version: the same drawing, a slightly cleaner (thinner, steadier) line
    const line = clamp01(cp.p / 0.7);
    const fill = sine(clamp01((cp.p - 0.55) / 0.45));
    out.push(
      canvasLayer('ai-pen', `ai-pen:${cp.ver}`, m.w, m.h, d, r, (ctx, cw, ch) =>
        paintPenReveal(ctx, cw, ch, img(`${cp.name}-noeye`), { outline: (m.outline ?? []) as unknown as [number, number][], line, fill, stroke: cp.ver === 2 ? 3.8 : 3.4, seed: `p2:pen:${cp.ver}` }),
      ),
    );
    if (cp.p > 0.85) out.push(...ai2Layers(cp.name, r, f, { d, still: true, opacity: clamp01((cp.p - 0.85) / 0.15) }).filter((l) => l.id === 'ai-eye'));
  }
  return out;
};

/** Path laid down ahead of her: about two segments ahead of where she stands, written on the beat. */
const leadAt = (f: number): number => {
  const cp = herPose(f);
  return (cp.x - PATH_X0) / SEG_W + 2.2;
};
const writtenAt = (f: number): number => {
  if (f < F.fold1) return 0;
  if (f >= F.trip1) {
    // after the first trip the rest of the path is written out to the boxes, steadily (it never shrinks)
    const w0 = leadAt(F.trip1 - 1);
    return lerp(w0, SEGS, sine(span(f, F.trip1, F.taps[0] as number)));
  }
  // the new writing runs for 12 frames after each stride cut
  const k = F.strides.filter((x) => f >= x).pop() ?? F.fold1;
  const prev = leadAt(Math.max(F.fold1, k - 1));
  return lerp(prev, leadAt(f), clamp01((f - k) / 12));
};

const creamWorld = (f: number): Layer[] => {
  const layers: Layer[] = [
    canvasLayer('cream', 'cream-c', 16, 16, 900, placeAt({ x: -2000, y: -1200, w: 9000, h: 4000 }, 900), (ctx, cw, ch) => {
      ctx.fillStyle = palette.cream;
      ctx.fillRect(0, 0, cw, ch);
    }),
  ];
  // the crescent at midnight (AYNI HATA), far behind (it barely moves while the camera tracks)
  if (f >= F.crescent) {
    const mw = placeAt({ x: 1500, y: 60, w: 260, h: 260 }, 900, { x: KNOT_X, y: 540, z: D0 });
    layers.push(canvasLayer('crescent', 'crescent', 420, 420, 900, mw, (ctx, cw, ch) => paintCrescent(ctx, cw, ch, span(f, F.crescent, F.crescent + 16))));
  }
  layers.push(canvasLayer('path', `path`, PATH_CANVAS.w, PATH_CANVAS.h, 0, PATH_W, (ctx, cw, ch) => paintPath(ctx, cw, ch, writtenAt(f), { seed: 'p2:path', segments: SEGS, knots: [KNOT_SEG] })));
  if (f >= (F.taps[0] as number) - 30 || f >= F.pull) {
    const lit = f < (F.taps[0] as number) ? 0 : F.taps.filter((t) => f >= t).length - 1 + clamp01((f - (F.taps.filter((t) => f >= t).pop() as number)) / 4);
    const open = f < F.pull ? 0 : F.lids.filter((t) => f >= t).length - 1 + clamp01((f - ((F.lids.filter((t) => f >= t).pop() as number) ?? f)) / 10) + (f >= (F.lids[0] as number) ? 0 : -1 + 0);
    layers.push(canvasLayer('boxes', 'boxes', BOX_CANVAS.w, BOX_CANVAS.h, 0, BOXES_W(), (ctx, cw, ch) => paintBoxes(ctx, cw, ch, { n: BOXES_N, lit: f >= (F.taps[0] as number) ? Math.min(BOXES_N, lit + 1) : 0, open: f >= (F.lids[0] as number) ? Math.max(0, open + 1) : 0, seed: 'p2:boxes' })));
  }
  layers.push(...herCreamLayers(f));
  // the version tag: printed small at her feet, it changes with each redraw
  const cp = herPose(f);
  if (f >= F.fold1 + 6 && f < F.pull) {
    const r = herRect(cp);
    const label = `v${cp.ver}`;
    const born = cp.ver === 1 ? F.fold1 + 6 : cp.ver === 2 ? F.pen2 + 8 : F.pen3 + 8;
    layers.push(canvasLayer('tag', `tag:${label}`, 256, 128, -1, { x: r.x + r.w * 0.5 - 20, y: C_FLOOR + 24, w: 96, h: 48 }, (ctx, cw, ch) => paintVersionTag(ctx, cw, ch, label, sec(f - born))));
  }
  return layers;
};

const herCamX = (f: number): number => {
  const cp = herPose(f);
  return herRect(cp).x + herRect(cp).w / 2;
};
const creamCam = (f: number): Cam => {
  // tracks her smoothly: the target is her place, eased over the beat (never a jump), z wide
  const a = herCamX(Math.max(F.fold1, f - 14));
  const b = herCamX(f);
  const u = sine(clamp01(((f - F.fold1) % 14) / 14));
  const tx = f < (F.strides[0] as number) ? b : lerp(a, b, u);
  const boxesMid = BOXES_W().x + BOXES_W().w * 0.45;
  const toBoxes = sine(span(f, F.pen3 + 10, (F.taps[0] as number) + 4));
  const x = lerp(tx + 160, boxesMid, toBoxes);
  return { x, y: C_FLOOR - 250, z: lerp(1150, 1000, toBoxes) };
};
const creamShot = (f: number): StageShot => {
  const cam = creamCam(f);
  return { kind: 'stage', layers: creamWorld(f), cam };
};

// ---------------------------------------------------------------------------------------------------------------
// Scene 8a: pull back through the glass: the back of his head enters; the lids open (empty); the anger vein.

const D_WALL = -320;
const D_HEAD = -700;
const OTS_END: Cam = { x: 0, y: 0, z: 1450 };
const otsCenter = (): Pt => {
  const bw = BOXES_W();
  return [bw.x + bw.w * 0.42, C_FLOOR - 200];
};
const HOLE = (): Rect => {
  const [cx, cy] = otsCenter();
  return { x: cx - 900, y: cy - 520, w: 1700, h: 980 };
};
const otsCam = (f: number): Cam => {
  const c = creamCam(F.pull - 1);
  const [cx, cy] = otsCenter();
  const end: Cam = { x: cx - 330, y: cy + 60, z: OTS_END.z };
  // starts with the cut (no dead first second) and settles
  if (f < F.calm) return mixCam(c, end, easeOut(span(f, F.pull, F.pull + 60)));
  return end;
};
const otsLayers = (f: number, cam: Cam): Layer[] => {
  const layers = creamWorld(f);
  const hole = HOLE();
  const wallBox: Rect = { x: hole.x - 1400, y: hole.y - 800, w: hole.w + 2800, h: hole.h + 1600 };
  const sc = 2400 / wallBox.w;
  if (cam.z + D_WALL > 30)
    layers.push(
      canvasLayer('glass-wall', 'glass-wall', 2400, Math.round(wallBox.h * sc), D_WALL, wallBox, (ctx, cw, ch) =>
        paintGlassWall(ctx, cw, ch, { hole: { x: (hole.x - wallBox.x) * sc, y: (hole.y - wallBox.y) * sc, w: hole.w * sc, h: hole.h * sc }, seed: 'p2:wall' }),
        { opacity: easeOut(span(f, F.pull, F.pull + 10)) },
      ),
    );
  // his head: big, lower left, nearer than the wall
  if (cam.z + D_HEAD > 40) {
    const m = sp2('h-ots');
    const end = OTS_END.z;
    const kEnd = D0 / (end + D_HEAD);
    const hEnd = 900 / kEnd; // 900 px tall on screen at the end
    const s = hEnd / m.h;
    const [cx, cy] = otsCenter();
    const endCam: Cam = { x: cx - 330, y: cy + 60, z: end };
    // its bottom-left corner at screen (-40, 1100) at the end of the pull
    const x = endCam.x + (-40 - W / 2) / kEnd;
    const yb = endCam.y + (1100 - H / 2) / kEnd;
    const r: Rect = { x, y: yb - m.h * s, w: m.w * s, h: m.h * s };
    layers.push(human2Layer('human', 'h-ots', r, D_HEAD, f, { top: 0.3, hip: 0.95, amp: 0.008, period: 3.8, phase: 0.1 }));
    if (f >= F.vein) {
      const ht = pt(m.headTop, 'h-ots headTop');
      const out = f >= F.deflate ? 0 : 0;
      layers.push(
        iconLayer('icon-vein', r.x + ht[0] * s + 60 / kEnd, r.y + ht[1] * s + 60 / kEnd, 200 / kEnd, D_HEAD - 1, (ctx, cw, ch) =>
          paintVein(ctx, cw, ch, sec(f - F.vein), { deflate: span(f, F.deflate, F.deflate + 30), out }),
        ),
      );
    }
  }
  return layers;
};
const otsShot = (f: number): StageShot => {
  const cam = otsCam(f);
  return { kind: 'stage', layers: otsLayers(f, cam), cam };
};

// ---------------------------------------------------------------------------------------------------------------
// Scene 8b: the split again. He sits calmly; the torch; click off; the dot.

const SPLIT_BOXES_W: Rect = { x: 1330, y: FLOOR + 18 - BOX_CANVAS.h * 0.22, w: BOX_CANVAS.w * 0.22, h: BOX_CANVAS.h * 0.22 };
const seatedSplit = (name: string): Rect => {
  const m = sp2(name);
  const s = humanScaleSplit(name);
  const floorY = m.floorY ?? (m.bbox[3] as number);
  if (name === 'h-torch-back') return { x: 470 - (m.bbox[2] as number) * s, y: FLOOR - floorY * s, w: m.w * s, h: m.h * s };
  return { x: 150 - (m.bbox[0] as number) * s, y: FLOOR - floorY * s, w: m.w * s, h: m.h * s };
};
const torchPose = (f: number): 'h-calm' | 'h-torch' | 'h-torch-back' => (f < F.torchOn ? 'h-calm' : f < F.swing ? 'h-torch' : f < F.hold ? 'h-torch-back' : 'h-torch');
const TORCH_CAM: Cam = { x: 960, y: 540, z: 1000 };
const torchCam = (f: number): Cam => camKeys([[F.calm, { x: 930, y: 560, z: 960 }], [F.torchOn, { x: 950, y: 545, z: 990 }], [F.hold, TORCH_CAM]], f);
const lensScreen = (f: number, cam: Cam): Pt => {
  const pose = torchPose(f);
  const r = seatedSplit(pose);
  const m = sp2(pose);
  const s = r.w / m.w;
  const l = pt(m.lens, `${pose} lens`);
  return project(cam, D_GLASS, [r.x + l[0] * s, r.y + l[1] * s]);
};
const torchTarget = (f: number, cam: Cam): { at: Pt; r: number } => {
  const boxes: Pt = project(cam, D_GLASS, [SPLIT_BOXES_W.x + SPLIT_BOXES_W.w * 0.45, FLOOR - 120]);
  // his wall of pinned notes, upper left of his room (clear of his own head; [330, 280] lit his head in part2-v1)
  const wall: Pt = project(cam, P1.D_SKYROOM, [-100, 270]);
  const glass: Pt = [HAND_OVER.x, HAND_OVER.y];
  if (f < F.swing) return { at: boxes, r: 150 };
  if (f < F.hold) {
    // cut on action: the new pose already points up-left; the beam travels the last stretch onto the wall
    const lens = lensScreen(f, cam);
    const m = sp2('h-torch-back');
    const dir = pt(m.dir, 'h-torch-back dir');
    const from: Pt = [lens[0] + dir[0] * 160, lens[1] + dir[1] * 160];
    const u = easeOut(span(f, F.swing, F.swing + 8));
    return { at: [lerp(from[0], wall[0], u), lerp(from[1], wall[1], u)], r: lerp(60, 120, u) };
  }
  return { at: glass, r: 110 };
};
const torchLayers = (f: number, cam: Cam): Layer[] => {
  const layers: Layer[] = [
    { id: 'sroom', src: { kind: 'image', url: P1.ROOM_SPLIT.key }, d: P1.D_SKYROOM, ...P1.SROOM_W },
    { id: 'smoon', src: { kind: 'image', url: P1.ROOM_SPLIT.moon }, d: P1.D_SKYROOM, ...P1.SROOM_W },
    ...P1.creamLayers(),
    P1.moonLayer(),
    canvasLayer('sboxes', 'sboxes', BOX_CANVAS.w, BOX_CANVAS.h, D_GLASS, SPLIT_BOXES_W, (ctx, cw, ch) => paintBoxes(ctx, cw, ch, { n: BOXES_N, lit: BOXES_N, open: BOXES_N, seed: 'p2:boxes' })),
  ];
  const pose = torchPose(f);
  // "Kizmiyorum": the vein that popped in the over-the-shoulder shot finishes deflating on his head here
  const veinLayers: Layer[] = [];
  if (f < F.deflate + 32) {
    const r = seatedSplit(pose);
    const m = sp2(pose);
    const s = r.w / m.w;
    const hx = r.x + ((m.hair?.x1 ?? (m.bbox[2] as number)) - 20) * s;
    const hy = r.y + (m.bbox[1] as number) * s;
    veinLayers.push(iconLayer('icon-vein', hx, hy + 10, 150, D_GLASS - 1, (ctx, cw, ch) => paintVein(ctx, cw, ch, sec(f - F.vein), { deflate: span(f, F.deflate, F.deflate + 30) })));
  }
  layers.push(human2Layer('human', pose, seatedSplit(pose), D_GLASS, f, { top: 0.16, hip: 0.55, amp: pose === 'h-calm' ? 0.016 : 0.009, period: pose === 'h-calm' ? 5.0 : 3.8, phase: 0.1 }));
  layers.push(...veinLayers);
  // her: she lowers her thumb and tilts; squints in the beam; then stands again
  const aiX = SPLIT_BOXES_W.x + (boxGeom(0, BOXES_N).x / BOX_CANVAS.w) * SPLIT_BOXES_W.w - 70;
  if (f < F.torchOn) {
    const tilt = 3 * sine(span(f, F.calm + 8, F.calm + 24));
    layers.push(...P1.aiLayers('ai-stand', P1.aiAt('ai-stand', aiX, 'eye'), f, { blinks: [3180], rot: tilt, pivot: [aiX, FLOOR] }));
  } else if (f < F.swing) {
    const s = aiScale2('a-squint');
    layers.push(...ai2Layers('a-squint', aiFeet('a-squint', s, aiX, 'eye', FLOOR), f, { eyeH: 0.5 }));
  } else layers.push(...P1.aiLayers('ai-stand', P1.aiAt('ai-stand', aiX, 'eye'), f, { blinks: [3290] }));
  // the room goes dark around the torch light
  if (f >= F.torchOn) {
    const lens = lensScreen(f, cam);
    const tg = torchTarget(f, cam);
    // a click is instant: the torch on and the room lights off on the same frame (a flicker read as glitches)
    const flick = 1;
    const dark = 0.82;
    layers.push(screenLayer('torch', 'torch', cam, -40, (ctx, cw, ch) => paintTorchLight(ctx, cw, ch, { lens, target: tg.at, r: tg.r, on: flick, dark, seed: 'p2:torch' })));
  }
  return layers;
};
const torchShot = (f: number): StageShot => {
  const cam = torchCam(f);
  return { kind: 'stage', layers: torchLayers(f, cam), cam };
};
/** Click off (3333): the beam is gone, the room black; the light circle shrinks to the hand-over dot by 3340. */
const paintOff = (f: number) => (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  const u = easeIn(span(f, F.off, F.handOver));
  const r = lerp(110, HAND_OVER.r, u);
  paintTorchLight(ctx, w, h, { lens: [HAND_OVER.x - 1, HAND_OVER.y], target: [HAND_OVER.x, HAND_OVER.y], r, on: 1, dark: 1, seed: 'p2:torch' });
  if (f >= F.handOver) {
    ctx.fillStyle = '#0B0F1E';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = HAND_OVER.color;
    ctx.beginPath();
    ctx.arc(HAND_OVER.x, HAND_OVER.y, HAND_OVER.r, 0, Math.PI * 2);
    ctx.fill();
  }
};

// ---------------------------------------------------------------------------------------------------------------
// The shot list.

export interface StageShot {
  kind: 'stage';
  layers: Layer[];
  cam: Cam;
}
export interface FlatShot {
  kind: 'flat';
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}
export interface FoldShot {
  kind: 'fold';
  p: number;
  from: FlatShot;
  to: StageShot;
}
export type Shot = StageShot | FlatShot | FoldShot;

const noteFlat = (): FlatShot => ({ kind: 'flat', paint: (ctx, w, h) => paintNoteFill(ctx, w, h, 'Merhaba', true) });
/** Where the folded note lands: the pen tip at the start of her path (it becomes the pen that writes it). */
export const foldLanding = (): { scale: number; x: number; y: number; fold: number; tilt: number } => {
  const cam = creamCam(F.fold1);
  const [x, y] = project(cam, 0, [segX(0) + 40, C_FLOOR]);
  return { scale: 0.012, x, y, fold: 70, tilt: 20 };
};

export const shotAt = (f: number): Shot => {
  if (f < F.days) return chorusShot(f);
  if (f < F.sleep) return daysShot(f);
  if (f < F.yellow) return nightShot(f);
  if (f < F.fold0) return noteFlat();
  if (f < F.fold1) return { kind: 'fold', p: span(f, F.fold0, F.fold1), from: noteFlat(), to: creamShot(f) };
  if (f < F.pull) return creamShot(f);
  if (f < F.calm) return otsShot(f);
  if (f < F.off) return torchShot(f);
  return { kind: 'flat', paint: paintOff(f) };
};

// ---------------------------------------------------------------------------------------------------------------
// Probes for the checks and the type layout.

export const characterBoxes = (f: number): { who: 'human' | 'ai'; box: Rect }[] => {
  const s = shotAt(f);
  const stage = s.kind === 'stage' ? s : s.kind === 'fold' ? (s.p > 0.5 ? s.to : null) : null;
  if (!stage) return [];
  const out: { who: 'human' | 'ai'; box: Rect }[] = [];
  for (const l of stage.layers) {
    const who = l.id === 'human' ? 'human' : l.id === 'ai' || l.id === 'ai-pen' || l.id === 'ai-apart' ? 'ai' : null;
    if (!who) continue;
    const key = l.src.kind === 'canvas' ? l.src.key : l.src.url;
    let name = key.split(':').pop() as string;
    name = name.replace(/^.*\//, '').replace(/\.png$/, '').replace(/-(noeye|eye)$/, '');
    if (name === 'a-sit-body') name = 'a-sit';
    if (l.id === 'ai-pen' || l.id === 'ai-apart') name = herPose(f).name;
    const m = SP2[name] ?? (P1.sp(name) as unknown as Meta2 | undefined);
    if (!m) continue;
    const bb = m.bbox as [number, number, number, number];
    const isCanvas = l.src.kind === 'canvas' && l.id !== 'ai-apart' && l.id !== 'ai-pen';
    const pad = isCanvas ? LIFT_PAD : 0;
    const M = l.id === 'ai-apart' ? COME_APART_MARGIN : 0;
    const sx = l.w / (m.w + 2 * M);
    const sy = l.h / (m.h + pad + 2 * M);
    const world: Rect = { x: l.x + (bb[0] + M) * sx, y: l.y + (bb[1] + pad + M) * sy, w: (bb[2] - bb[0]) * sx, h: (bb[3] - bb[1]) * sy };
    out.push({ who, box: P1.projectRect(stage.cam, l.d, world) });
  }
  return out;
};
export const seamOnScreen = (f: number): number | null => {
  const s = shotAt(f);
  if (s.kind !== 'stage' || f >= F.days) return null;
  return project(s.cam, D_GLASS, [SEAM, 0])[0];
};
export const chorusCamAt = chorusCam2;
