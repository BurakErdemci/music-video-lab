import { staticFile } from 'remotion';
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { TEXT_FONT } from '../../style/fonts.ts';
import { FPS, TIMING, nearestBeatIndex } from '../../timing.ts';
import { H, W } from '../../layout.ts';
import { clamp01, lerp } from '../../math.ts';
import { D0, planeScale, type Cam, type CanvasSource, type Layer } from '../types.ts';
import { blink, LIFT_PAD, paintCharacter, paintDust, paintSky, paintSteam, rock, type BreathOpts, type HairOpts } from '../life.ts';
import { paintPenReveal } from '../pen.ts';
import { paintCheck, paintGlassBump, paintInkLift, paintQuestion, paintSweat } from '../icons.ts';
import EVENTS from './events.json' with { type: 'json' };
import SPRITES0 from '../sprites.json' with { type: 'json' };
import SPRITES1 from '../sprites-p1.json' with { type: 'json' };
import SPRITES2 from '../sprites-p1v2.json' with { type: 'json' };

/**
 * Shot design of Part1 (song 0:00-0:58, scene map v2 scenes 1-4). Everything is in SONG frames (= composition
 * frames). Each beat is a complete drawn pose; inside a pose only small life moves; the camera and the depth layers
 * carry the motion; poses change by cuts on the beat, cuts on action, camera reframes and the print transitions.
 *
 *    0- 467  the approved Droste intro (ZoomIntro, SVG), its last bar rushes into cream
 *  468       hand-over: that cream is his screen; the pull-back keeps the intro's momentum (fast start, eases out)
 *  637       P2 sip, closer; 698-722 "Merhaba" types itself, one letter per sung syllable-ish step
 *  700- 750  HalftoneBloom from the cursor into the split (entering her world)
 *  750- 806  the pen draws her (separate tapered strokes), ink fills; he sits on his side sipping
 *  806- 862  she waves (breakdown drawing, then a forearm rig with overshoot and settle); his slow sip
 *  862- 961  he lowers the mug; on "Dun" he rises (cut on action) and is at the glass with yesterday's note
 * 1003       she looks back at her blank wall, "?"
 * 1059-1256  "Bastan anlatiyorum yine": peel / slide notes through the glass, she catches and pins; sweat drop on
 *            "yine"; the handshake the glass stops (1200 / 1214)
 * 1256-1312  the last note: the camera follows it through the glass; the navy side slides out left; her pinned notes
 *            go blank (forgotten)
 * 1312-1706  full cream: the notebook falls, she kneels; page close-ups on "adin / yolun / hatalarin"; she reads
 *            (check mark), looks up, her cursor face close; the ink lifts off the page; InkBleed into the split
 */
export const SONG_START = EVENTS.songStart;
export const SONG_END = EVENTS.songEnd;
const ev = (name: string): number => {
  const e = EVENTS.events.find((x) => x.name.startsWith(name));
  if (!e) throw new Error(`no event ${name}`);
  return e.f;
};
export const F = {
  rush: ev('intro: cream rush'),
  open: ev('hand-over'),
  cut2: ev('cut: P1 mug'),
  type: ev('Merhaba letter 1'),
  bloom0: ev('HalftoneBloom starts'),
  land: ev('HalftoneBloom lands'),
  penFill: ev('pen lines done'),
  raise: ev('AI raises'),
  rig: ev('AI wave rig'),
  stand: ev('AI stands and rocks'),
  rise: ev('he rises'),
  glass: ev('he is at the glass'),
  look: ev('AI turns to her blank wall'),
  wall: ev('AI steps up to her wall'),
  peel1: ev('he peels a note'),
  slide1: ev('he slides a note'),
  sweat: ev('sweat drop'),
  peel2: ev('he peels again'),
  slide2: ev('he slides again'),
  hand: ev('handshake offered'),
  bump: ev('hands meet'),
  last: ev('last note'),
  cream: ev('full cream'),
  book: ev('notebook lands'),
  kneel: ev('AI kneels'),
  pTag: ev('page close-up: name'),
  pRoad: ev('page close-up: road'),
  pCross: ev('page close-up: crossed'),
  read: ev('AI reads'),
  check: ev('check mark'),
  lookUp: ev('AI looks up'),
  face: ev('close-up of her cursor'),
  lift: ev('page close-up, the ink'),
  bleed0: ev('InkBleed starts'),
  bleed1: ev('InkBleed lands'),
};
export const BLOOM_FRAMES = F.land - F.bloom0;
export const BLEED_FRAMES = F.bleed1 - F.bleed0;

// ---------------------------------------------------------------------------------------------------------------
// Sprites: the living-test set (living/*.png, sprites.json) and the part-1 set (living/p1/*.png, sprites-p1.json).

type SpriteMeta = { w: number; h: number; bbox: number[]; eye?: number[]; outline?: number[][]; elbow?: number[]; screen?: number[][]; floorY?: number; legs?: number[][]; mugTop?: number[]; hair?: { x0: number; y0: number; x1: number; y1: number } };
const SP0 = SPRITES0 as unknown as Record<string, SpriteMeta>;
const SP1 = { ...(SPRITES1 as unknown as Record<string, SpriteMeta>), ...(SPRITES2 as unknown as Record<string, SpriteMeta>) };
const sp = (n: string): SpriteMeta => {
  const m = SP1[n] ?? SP0[n];
  if (!m) throw new Error(`no sprite ${n}`);
  return m;
};
/** Url of a sprite png (or one of its -eye / -noeye / -body / -forearm parts). */
const url = (n: string): string => {
  const base = n.replace(/-(eye|noeye)$/, '');
  return SP1[base] || /^(a-wave-|page-)/.test(n) ? staticFile(`living/p1/${n}.png`) : staticFile(`living/${n}.png`);
};
const PAGES = { tag: url('page-tag'), road: url('page-road'), cross: url('page-cross') } as const;
export const ROOM_SPLIT = { key: staticFile('plates/room-key.png'), moon: staticFile('plates/room-moon.png') };

const AI_POSES = ['ai-stand', 'a-raise', 'a-turn', 'a-back34', 'a-watch', 'a-catch', 'a-pin', 'a-hand', 'a-lookdown', 'a-kneel', 'a-read', 'a-lookup'] as const;
type AiPose = (typeof AI_POSES)[number];
export const IMAGE_URLS: readonly string[] = [
  url('room-morning'),
  url('desk2'),
  url('h-mug2'),
  url('h-sip2'),
  url('h-glass-note'),
  url('ai-stand-noeye'),
  ...['h-rise', 'h-peel', 'h-slide', 'h-hand', 'notebook'].map(url),
  ...AI_POSES.flatMap((n) => [url(`${n}-noeye`), url(`${n}-eye`)]),
  url('a-wave-body-noeye'),
  url('a-wave-body-eye'),
  url('a-wave-forearm'),
  PAGES.tag,
  PAGES.road,
  PAGES.cross,
  ROOM_SPLIT.key,
  ROOM_SPLIT.moon,
];

let imgLookup: (u: string) => HTMLImageElement = () => {
  throw new Error('images not ready');
};
const getImg = (u: string): HTMLImageElement => imgLookup(u);
export const setImageLookup = (fn: (u: string) => HTMLImageElement): void => {
  imgLookup = fn;
};

// ---------------------------------------------------------------------------------------------------------------
// Geometry helpers. Layers are designed as screen rectangles under a reference camera and converted to their plane.

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const REF: Cam = { x: W / 2, y: H / 2, z: D0 };
const placeAt = (r: Rect, d: number, ref: Cam = REF): Rect => {
  const k = planeScale(ref, d);
  return { x: ref.x + (r.x - W / 2) / k, y: ref.y + (r.y - H / 2) / k, w: r.w / k, h: r.h / k };
};
export const project = (cam: Cam, d: number, p: readonly [number, number]): [number, number] => {
  const k = planeScale(cam, d);
  return [W / 2 + (p[0] - cam.x) * k, H / 2 + (p[1] - cam.y) * k];
};
/** Screen box of a world rect on plane d under cam (for the checks and the type layout). */
export const projectRect = (cam: Cam, d: number, r: Rect): Rect => {
  const k = planeScale(cam, d);
  const [x, y] = project(cam, d, [r.x, r.y]);
  return { x, y, w: r.w * k, h: r.h * k };
};

const easeInOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
const sine = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
const span = (f: number, a: number, b: number): number => clamp01((f - a) / (b - a));
const sec = (f: number): number => f / FPS;
const mixCam = (a: Cam, b: Cam, u: number): Cam => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)) });

/** Beat phase 0..1 at frame f (a beat lands on the frame it rounds to). */
const beatPhase = (f: number): number => {
  const t = (f + 0.5) / FPS;
  const i = nearestBeatIndex(t);
  const b = TIMING.beats[i] as number;
  const j = t >= b ? i : i - 1;
  const t0 = TIMING.beats[j] as number;
  const t1 = TIMING.beats[j + 1] as number;
  return (t - t0) / (t1 - t0);
};

/** A canvas layer that paints a character sprite with breath / hair / notes stir. */
const charLayer = (id: string, name: string, r: Rect, d: number, t: number, o: { breath: BreathOpts; hair?: HairOpts; notes?: boolean; lift?: number }, extra: Partial<Layer> = {}): Layer => {
  const m = sp(name);
  return {
    id,
    src: { kind: 'canvas', key: `${id}:${name}`, cw: m.w, ch: m.h + LIFT_PAD, paint: (ctx, cw, ch) => paintCharacter(ctx, cw, ch, getImg(url(name)), { t, ...o }) },
    d,
    ...r,
    ...extra,
  };
};
const canvasLayer = (id: string, key: string, cw: number, ch: number, d: number, r: Rect, paint: CanvasSource['paint'], extra: Partial<Layer> = {}): Layer => ({
  id,
  src: { kind: 'canvas', key, cw, ch, paint },
  d,
  ...r,
  ...extra,
});

// ---------------------------------------------------------------------------------------------------------------
// Scene 2: the desk. Depths are spread wide so the pull-back shows real parallax (reviewer: "scales as a flat single
// composite"): the screen/desk in front, him in the middle, the room wall behind, the sky and city far away.

const D_SKY = 1600;
const D_ROOM = 520;
const D_HUMAN = 0;
const D_DESK = -60;
const D_DUST = -320;

const ROOM_SCR: Rect = { x: -594, y: -284, w: 2600, h: 2600 * (941 / 1672) };
const ROOM_W = placeAt(ROOM_SCR, D_ROOM);
/** Window panes of room-morning.png (transparent, measured in prep.py) in plate px. */
const WIN = { x0: 743, y0: 73, x1: 1025, y1: 446, pw: 1672, ph: 941 };
const winScr: Rect = {
  x: ROOM_SCR.x + (WIN.x0 / WIN.pw) * ROOM_SCR.w,
  y: ROOM_SCR.y + (WIN.y0 / WIN.ph) * ROOM_SCR.h,
  w: ((WIN.x1 - WIN.x0) / WIN.pw) * ROOM_SCR.w,
  h: ((WIN.y1 - WIN.y0) / WIN.ph) * ROOM_SCR.h,
};
// The sky is far behind the window, so it is much bigger than the opening (every camera move sees more of it).
const SKY_W = placeAt({ x: winScr.x - winScr.w * 1.1, y: winScr.y - winScr.h * 0.7, w: winScr.w * 3.2, h: winScr.h * 2.3 }, D_SKY);

const HUMAN_S = 0.86;
/** Seated drawings scaled by head size to the living-test seated man (head 158 px): h-mug2 159, h-sip2 151. */
const SEAT_K: Record<string, number> = { 'h-mug2': 158 / 159, 'h-sip2': 158 / 151 };
const HUMAN_X = 300;
const FEET_Y = 965;
const seatedRect = (name: string, s0: number, x: number, feet: number): Rect => {
  const m = sp(name);
  const s = s0 * (SEAT_K[name] ?? 1);
  const top = feet - (m.bbox[3] as number) * s;
  return { x, y: top - LIFT_PAD * s, w: m.w * s, h: (m.h + LIFT_PAD) * s };
};

// desk2: drawn front-on at eye level (part1-v2: the old desk.png was seen from above and floated over the floor
// line). Its leg bottoms (sprite y floorY) stand on the same floor line as his feet and chair.
const DESK_META = sp('desk2');
const DESK_S = 0.86;
const DESK_FLOOR = DESK_META.floorY as number;
const DESK_SCR: Rect = { x: 650, y: FEET_Y + 4 - DESK_FLOOR * DESK_S, w: DESK_META.w * DESK_S, h: DESK_META.h * DESK_S };
const DESK_W = placeAt(DESK_SCR, D_DESK);
const deskPx = (px: number, py: number): [number, number] => [DESK_W.x + (px / DESK_META.w) * DESK_W.w, DESK_W.y + (py / DESK_META.h) * DESK_W.h];
/** Inner screen of desk2.png (sprite px, measured in prep_p1v2.py): TL, TR, BR, BL. */
const SCREEN_Q = DESK_META.screen as unknown as readonly (readonly [number, number])[];
const SCR_BOX = {
  x0: Math.min(...SCREEN_Q.map((q) => q[0])) - 4,
  y0: Math.min(...SCREEN_Q.map((q) => q[1])) - 4,
  x1: Math.max(...SCREEN_Q.map((q) => q[0])) + 4,
  y1: Math.max(...SCREEN_Q.map((q) => q[1])) + 4,
};
// Canvas px per sprite px. The shot opens with the screen filling the frame (about 5 screen px per sprite px), so the
// letters and the cursor are painted at that density.
const SCR_RES = 5;
const scrW: Rect = (() => {
  const a = deskPx(SCR_BOX.x0, SCR_BOX.y0);
  const b = deskPx(SCR_BOX.x1, SCR_BOX.y1);
  return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] };
})();
const quad = (u: number, v: number): [number, number] => {
  const [a, b, c, d] = SCREEN_Q as [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];
  const x = (1 - v) * ((1 - u) * a[0] + u * b[0]) + v * ((1 - u) * d[0] + u * c[0]);
  const y = (1 - v) * ((1 - u) * a[1] + u * b[1]) + v * ((1 - u) * d[1] + u * c[1]);
  return [(x - SCR_BOX.x0) * SCR_RES, (y - SCR_BOX.y0) * SCR_RES];
};
const WORD = 'Merhaba';
/** Letter i appears at song frame LETTERS[i]: the first on the sung "Merhaba" (word start), then every 4 frames, so
 * the word is complete before the bloom starts. */
const LETTERS = Array.from({ length: WORD.length }, (_, i) => F.type + 4 * i);
const FONT_PX = 34;
const ADVANCE = 0.6;
const SCREEN_FRAME = (() => {
  const c = quad(0.5, 0.5);
  const ex = quad(0.6, 0.5);
  const ey = quad(0.5, 0.6);
  const u = [ex[0] - c[0], ex[1] - c[1]] as const;
  const v = [ey[0] - c[0], ey[1] - c[1]] as const;
  const lu = Math.hypot(u[0], u[1]);
  const lv = Math.hypot(v[0], v[1]);
  return { c, u: [u[0] / lu, u[1] / lu] as const, v: [v[0] / lv, v[1] / lv] as const };
})();
const typedCount = (f: number): number => LETTERS.filter((lf) => f >= lf).length;
const cursorOffset = (n: number): number => (n - WORD.length / 2) * ADVANCE * FONT_PX * SCR_RES + 6.5 * SCR_RES;
const paintScreen = (f: number) => (ctx: CanvasRenderingContext2D): void => {
  const n = typedCount(f);
  const { c, u, v } = SCREEN_FRAME;
  ctx.save();
  ctx.setTransform(u[0], u[1], v[0], v[1], c[0], c[1]);
  ctx.font = `500 ${FONT_PX * SCR_RES}px "${TEXT_FONT}"`;
  ctx.fillStyle = palette.navy;
  ctx.textBaseline = 'middle';
  if (n > 0) ctx.fillText(WORD.slice(0, n), -(WORD.length / 2) * ADVANCE * FONT_PX * SCR_RES, 0);
  const typing = n > 0 && n < WORD.length;
  if (typing || beatPhase(f) < 0.5) {
    const ch = FONT_PX * SCR_RES * 1.05;
    ctx.fillRect(cursorOffset(n) - 2.5 * SCR_RES, -ch / 2, 5 * SCR_RES, ch);
  }
  ctx.restore();
};
/** World point on the desk plane of the screen-canvas point (cx, cy). */
const screenWorld = (cx: number, cy: number): [number, number] => {
  const cw = (SCR_BOX.x1 - SCR_BOX.x0) * SCR_RES;
  const ch = (SCR_BOX.y1 - SCR_BOX.y0) * SCR_RES;
  return [scrW.x + (cx / cw) * scrW.w, scrW.y + (cy / ch) * scrW.h];
};
const cursorWorld = (f: number): [number, number] => {
  const { c, u } = SCREEN_FRAME;
  const o = cursorOffset(typedCount(f));
  return screenWorld(c[0] + u[0] * o, c[1] + u[1] * o);
};
const SCREEN_MID = screenWorld(...SCREEN_FRAME.c);

/** A soft dark contact shadow on the floor under a prop or a seated figure (x0..x1, centred on floor y). */
const contactShadow = (id: string, d: number, x0: number, x1: number, y: number): Layer =>
  canvasLayer(id, `shadow:${id}`, 256, 64, d, { x: x0, y: y - 12, w: x1 - x0, h: 24 }, (ctx, cw, ch) => {
    const g = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2);
    g.addColorStop(0, 'rgba(6,9,20,0.75)');
    g.addColorStop(0.6, 'rgba(6,9,20,0.4)');
    g.addColorStop(1, 'rgba(6,9,20,0)');
    ctx.save();
    ctx.scale(1, ch / cw);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, cw);
    ctx.restore();
  });

const humanBreath: BreathOpts = { top: 0.24, hip: 0.6, amp: 0.012, period: 3.6, phase: 0 };
const sunP = (f: number): number => sine(span(f, F.open, F.land + 20));

const deskLayers = (f: number, pose: 'mug' | 'sip'): Layer[] => {
  const t = sec(f - F.open);
  const name = pose === 'mug' ? 'h-mug2' : 'h-sip2';
  const m = sp(name);
  const hr = seatedRect(name, HUMAN_S, HUMAN_X, FEET_Y);
  const sipT = span(f, F.cut2 + 8, F.cut2 + 8 + 75);
  const lift = pose === 'sip' ? 4 * Math.sin(Math.PI * sine(sipT)) : 0;
  const hair: HairOpts = { ...(m.hair as { x0: number; y0: number; x1: number; y1: number }), amp: 1.4, face: 'right' };
  const mugTop = m.mugTop as [number, number];
  const hs = HUMAN_S * (SEAT_K[name] ?? 1);
  const layers: Layer[] = [
    canvasLayer('sky', 'sky', 900, 900, D_SKY, SKY_W, (ctx, cw, ch) => paintSky(ctx, cw, ch, t, sunP(f), { sunR: 0.075, dotStep: 0.009 })),
    { id: 'room', src: { kind: 'image', url: url('room-morning') }, d: D_ROOM, ...ROOM_W },
    contactShadow('human-shadow', D_HUMAN, hr.x + 0.06 * hr.w, hr.x + 0.98 * hr.w, FEET_Y),
    charLayer('human', name, hr, D_HUMAN, t, { breath: humanBreath, lift, hair, notes: true }),
  ];
  // Steam only while the mug is at his chest, bent away from his face toward the desk (it crossed his profile in v1);
  // with the mug at his mouth there is none.
  if (pose === 'mug') {
    const sx = hr.x + mugTop[0] * hs;
    const sy = hr.y + (mugTop[1] + LIFT_PAD) * hs;
    layers.push(canvasLayer('steam', 'steam', 160, 300, D_HUMAN, { x: sx - 30, y: sy - 118, w: 72, h: 120 }, (ctx, cw, ch) => paintSteam(ctx, cw, ch, t, 'mug', { lean: 0.35 }), { opacity: 0.8 }));
  }
  layers.push(
    ...(DESK_META.legs as number[][]).map((l, i) => {
      const a = deskPx(l[0] as number, DESK_FLOOR);
      const b = deskPx(l[1] as number, DESK_FLOOR);
      return contactShadow(`desk-shadow-${i}`, D_DESK, a[0] - 14, b[0] + 14, a[1]);
    }),
    { id: 'desk', src: { kind: 'image', url: url('desk2') }, d: D_DESK, ...DESK_W },
    canvasLayer('screen', 'screen', Math.round((SCR_BOX.x1 - SCR_BOX.x0) * SCR_RES), Math.round((SCR_BOX.y1 - SCR_BOX.y0) * SCR_RES), D_DESK, scrW, paintScreen(f)),
    canvasLayer('dust', 'desk-dust', 1400, 900, D_DUST, placeAt({ x: 200, y: -100, w: 1700, h: 1100 }, D_DUST), (ctx, cw, ch) => paintDust(ctx, cw, ch, t, 'desk-dust', 30), { opacity: 0.75 }),
  );
  return layers;
};

// Shot 1: the intro's zoom-out keeps going. It opens with the screen filling the frame (the intro's last frame is
// flat cream) and pulls back fast at once, easing out on the whole desk (v1 barely moved for 1.5 s).
const CAM1_END: Cam = { x: 880, y: 540, z: D0 };
const CAM1_Z0 = 165;
const cam1 = (f: number): Cam => {
  const u = easeOut(span(f, F.open, F.open + 150));
  const z = Math.exp(lerp(Math.log(CAM1_Z0), Math.log(CAM1_END.z), u));
  const w = clamp01((z - CAM1_Z0) / (CAM1_END.z - CAM1_Z0));
  const drift = sine(span(f, F.open + 150, F.cut2)) * 18;
  return { x: lerp(SCREEN_MID[0], CAM1_END.x, w) + drift, y: lerp(SCREEN_MID[1], CAM1_END.y, w), z };
};
// Shot 2: closer on him and the screen; while "Merhaba" types, a push toward the cursor (he reads it).
const cam2 = (f: number): Cam => {
  const a: Cam = { x: 760, y: 430, z: 650 };
  const b: Cam = { x: 800, y: 425, z: 600 };
  const c = cursorWorld(F.bloom0);
  const push: Cam = { x: lerp(820, c[0], 0.55), y: lerp(420, c[1], 0.55), z: 570 };
  return f < F.type - 5 ? mixCam(a, b, sine(span(f, F.cut2, F.type - 5))) : mixCam(b, push, easeInOut(span(f, F.type - 5, F.land)));
};

// ---------------------------------------------------------------------------------------------------------------
// Scenes 3-4: the glass split and her full-cream world (one set: the cream plane continues far right of the glass).

const D_SKYROOM = 260; // his room plate
const D_GLASS = 0;
const D_NOTES = -260; // floating notes in front (strong parallax in the pans)
const D_MOON = 900; // her moon, far behind the cream
const D_PAPERS = -110; // loose papers on her floor, in front
const FLOOR = 1008;
const SEAM = W / 2;
// The room plate is scaled 1.15 around the seam so the camera's left moves never show its edge.
const SROOM_W = placeAt({ x: SEAM - 960 * 1.15, y: -0.075 * H, w: 960 * 1.15, h: H * 1.15 }, D_SKYROOM);

const seamPts = (key: string, x: number, amp: number): [number, number][] => {
  const r = seeded(key);
  const pts: [number, number][] = [];
  for (let y = -200; y <= H + 220; y += 26) pts.push([x + (r() - 0.5) * 2 * amp, y]);
  return pts;
};
const SEAM_A = seamPts('seam-a', SEAM - 2.5, 1.2);
const SEAM_B = seamPts('seam-b', SEAM + 1.5, 1.4);
const CREAM_W: Rect = { x: SEAM, y: -800, w: 3400, h: 2800 };

const creamLayers = (): Layer[] => [
  canvasLayer('cream', 'cream', 16, 16, D_GLASS, CREAM_W, (ctx, cw, ch) => {
    ctx.fillStyle = palette.cream;
    ctx.fillRect(0, 0, cw, ch);
  }),
  canvasLayer('floor', 'floor', 3400, 4, D_GLASS, { x: SEAM, y: FLOOR - 2, w: 3400, h: 4 }, (ctx, cw, ch) => {
    ctx.fillStyle = palette.navy;
    ctx.fillRect(0, ch * 0.125, cw, ch * 0.75);
  }),
  canvasLayer('seam', 'seam', 40, 1640, D_GLASS, { x: SEAM - 20, y: -200, w: 40, h: 1640 }, (ctx, cw, ch) => {
    const stroke = (pts: [number, number][], color: string, width: number): void => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x - (SEAM - 20), y + 200) : ctx.moveTo(x - (SEAM - 20), y + 200)));
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    void cw;
    void ch;
    stroke(SEAM_A, palette.cream, 3);
    stroke(SEAM_B, palette.navy, 3.5);
  }),
];

// Her moon, far in the cream, upper right of the full-cream framing (parallax for the long pan into her world).
const MOON_W = placeAt({ x: 1420, y: 70, w: 210, h: 210 }, D_MOON, { x: 1930, y: 540, z: D0 });
const moonLayer = (): Layer =>
  canvasLayer('cmoon', 'cmoon', 420, 420, D_MOON, MOON_W, (ctx, cw, ch) => {
    const r = cw * 0.4;
    ctx.fillStyle = palette.moonYellow;
    ctx.beginPath();
    ctx.arc(cw / 2 + 5, ch / 2 - 4, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.navy;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  });

// Loose cream papers on her floor (as in the approved style frame 08-defter-krem), on a nearer plane.
const PAPERS = (() => {
  const r = seeded('p1:papers');
  return [1560, 1840, 2240, 2560, 2820].map((x) => ({ x, y: FLOOR + 30 + r() * 50, w: 120 + r() * 50, rot: -14 + r() * 28 }));
})();
const papersLayer = (): Layer => {
  const ref: Cam = { x: 1930, y: 540, z: D0 };
  const box = placeAt({ x: 1100, y: FLOOR - 40, w: 2400, h: 160 }, D_PAPERS, ref);
  return canvasLayer('papers', 'papers', 2400, 160, D_PAPERS, box, (ctx) => {
    for (const p of PAPERS) {
      ctx.save();
      ctx.translate(p.x - 1100 - (ref.x - W / 2), p.y - (FLOOR - 40) + 0);
      ctx.transform(1, 0, Math.tan((p.rot * Math.PI) / 180) * 0.6, 0.3, 0, 0);
      ctx.fillStyle = 'rgba(24,32,58,0.35)';
      ctx.fillRect(-p.w / 2 + 6, -p.w / 2 + 10, p.w, p.w * 0.72);
      ctx.fillStyle = palette.cream;
      ctx.strokeStyle = palette.navy;
      ctx.lineWidth = 3;
      ctx.fillRect(-p.w / 2, -p.w / 2, p.w, p.w * 0.72);
      ctx.strokeRect(-p.w / 2, -p.w / 2, p.w, p.w * 0.72);
      ctx.restore();
    }
  });
};

const NOTES_W = placeAt({ x: -240, y: -135, w: 2400, h: 1350 }, D_NOTES);

// ---- characters in the split

const HS = 800 / 864; // the standing human at the glass is 800 px tall (living test)
const AS = 840 / 889;
const AI_EYE_X = 1232;
/** Human sprite rect on the floor; anchor 'left' = sprite bbox left at x, 'right' = bbox right at x. */
const humanAt = (name: string, x: number, anchor: 'left' | 'right'): Rect => {
  const m = sp(name);
  // the seated drawings by head size against the living-test seated man (whose scale here was HS)
  const HS_ = HS * (SEAT_K[name] ?? 1);
  const top = FLOOR - (m.bbox[3] as number) * HS_;
  const bx = anchor === 'left' ? (m.bbox[0] as number) : (m.bbox[2] as number);
  return { x: x - bx * HS_, y: top - LIFT_PAD * HS_, w: m.w * HS_, h: (m.h + LIFT_PAD) * HS_ };
};
const CHAIR_X = 150;
/** AI sprite rect: aligned on its cursor eye's x (profile poses) or its bbox centre / edge; feet on the floor. */
/** Scale of each AI drawing relative to AS, by head height (README-p1: head / figure height x bbox height; the
 * standing poses share the reference head of ~136 px, the seated and kneeling drawings were drawn bigger). */
const AI_HEAD_K: Record<string, number> = { 'a-kneel': 136 / (0.255 * 718), 'a-read': 136 / (0.285 * 840), 'a-lookup': 136 / (0.22 * 749) };
const aiScale = (name: string): number => AS * (AI_HEAD_K[name] ?? 1);
const aiAt = (name: string, x: number, anchor: 'eye' | 'center' | 'left' | 'right', floor = FLOOR): Rect => {
  const m = sp(name);
  const AS = aiScale(name);
  const bb = m.bbox as [number, number, number, number];
  const eye = m.eye;
  const ax =
    anchor === 'eye' && eye ? (eye[0] as number) + (eye[2] as number) / 2 : anchor === 'left' ? bb[0] : anchor === 'right' ? bb[2] : (bb[0] + bb[2]) / 2;
  return { x: x - ax * AS, y: floor - bb[3] * AS, w: m.w * AS, h: m.h * AS };
};
const eyeRectOf = (name: string, r: Rect, scaleY: number): Rect | null => {
  const eye = sp(name).eye;
  const AS = aiScale(name);
  if (!eye) return null;
  const ex = (eye[0] as number) - 2;
  const ey = (eye[1] as number) - 2;
  const ew = (eye[2] as number) + 4;
  const eh = (eye[3] as number) + 4;
  const cy = r.y + (ey + eh / 2) * AS;
  return { x: r.x + ex * AS, y: cy - (eh * AS * scaleY) / 2, w: ew * AS, h: eh * AS * scaleY };
};
const AI_BREATH = { amp: 0.006, period: 4.2, phase: 0.35 };
/** Upward shift of the head rows of a breathing sprite (the same formula as life.ts makeWarp), in sprite px. */
const breathLift = (t: number, h: number, top: number, hip: number): number =>
  AI_BREATH.amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t / AI_BREATH.period + AI_BREATH.phase))) * (hip - top) * h;

/** An AI pose: body (breathing) + cursor eye that blinks and rides the breath. */
const aiLayers = (name: AiPose | 'a-wave-body', r: Rect, f: number, o: { blinks?: readonly number[]; open?: number; rot?: number; pivot?: [number, number]; d?: number; opacity?: number } = {}): Layer[] => {
  const d = o.d ?? D_GLASS;
  const m = sp(name === 'a-wave-body' ? 'a-wave' : name);
  const t = sec(f);
  const still = AI_STILL.has(name);
  const breath: BreathOpts = { top: 0.12, hip: 0.5, ...AI_BREATH };
  const bodyName = `${name}-noeye`;
  const ks = aiScale(name === 'a-wave-body' ? 'a-wave' : name);
  const rr: Rect = { x: r.x, y: r.y - LIFT_PAD * ks, w: r.w, h: r.h + LIFT_PAD * ks };
  const out: Layer[] = [
    {
      id: 'ai',
      src: still
        ? { kind: 'image', url: url(bodyName) }
        : { kind: 'canvas', key: `ai:${name}`, cw: m.w, ch: m.h + LIFT_PAD, paint: (ctx, cw, ch) => paintCharacter(ctx, cw, ch, getImg(url(bodyName)), { t, breath }) },
      d,
      ...(still ? r : rr),
      rot: o.rot,
      pivot: o.pivot,
      opacity: o.opacity,
    },
  ];
  const sy = Math.min(o.open ?? 1, blink(f, o.blinks ?? []));
  const er = eyeRectOf(name === 'a-wave-body' ? 'a-wave' : name, r, sy);
  if (er) {
    const up = still ? 0 : breathLift(t, m.h, 0.12, 0.5) * ks;
    out.push({ id: 'ai-eye', src: { kind: 'image', url: url(`${name}-eye`) }, d, ...er, y: er.y - up, rot: o.rot, pivot: o.pivot, opacity: o.opacity });
  }
  return out;
};

// Positions in the split (world units on the glass plane).
const AI_STAND = aiAt('ai-stand', AI_EYE_X, 'eye');
const AI_BACK_X = (AI_STAND.x + (sp('ai-stand').bbox[2] as number) * AS) as number; // her back edge
const AI_FAR_X = 1560; // where she stands when she steps back to watch the last note (eye x)

/** Hand meeting point at the glass during the handshake (world). */
const HAND_Y = 700;

/** The wave: a-raise breakdown (806-809), then the forearm rig on a-wave-body: it arrives from the breakdown's 45
 * degrees, overshoots past vertical and settles, then waves +-12 degrees on a two-beat period (no pose flicker). */
const waveAngle = (f: number): number => {
  const k = f - F.rig;
  if (k < 0) return -32;
  if (k < 16) {
    // damped spring from -32 to 0: overshoot ~ +9, settle by ~16 frames
    const x = k / 16;
    return -32 * Math.exp(-4.2 * x) * Math.cos(Math.PI * 1.35 * x);
  }
  const tw = (f - (F.rig + 16)) / 28;
  return 12 * Math.sin(2 * Math.PI * tw) * clamp01((f - F.rig - 16) / 8);
};

/** Drawings shown without the breath warp (its row stretch made the outline weight flicker in the held reading shot). */
const AI_STILL = new Set(['a-read']);
const AI_BLINKS = [790, 876, 932, 990, 1046, 1120, 1236, 1290, 1340, 1440, 1510, 1567, 1580];

// ---- notes through the glass

interface Flight {
  f0: number;
  f1: number;
  to: [number, number];
  rot: number;
}
const FLIGHT_STARTS = [1073, 1101, 1115, 1129, 1150, 1157, 1164, 1179, 1186];
/** Her wall of notes: a loose 3 x 3 grid behind her back (part1-v1 scattered them into a ring around her). */
const PIN_SPOTS: readonly [number, number][] = (() => {
  const r = seeded('p1:pin-grid');
  const out: [number, number][] = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) out.push([1445 + col * 112 + (r() - 0.5) * 22, 395 + row * 112 + (r() - 0.5) * 18]);
  return out;
})();
const FLIGHTS: Flight[] = FLIGHT_STARTS.map((f0, i) => {
  const r = seeded(`p1:flight:${i}`);
  return { f0, f1: f0 + Math.round(16 - Math.min(6, i)), to: PIN_SPOTS[i] as [number, number], rot: -18 + r() * 36 };
});
/** The last note (1256): from his hand through the glass, over her, far into her world, settling on the floor. */
const LAST: Flight = { f0: F.last, f1: F.cream + 10, to: [2380, FLOOR - 6], rot: 12 };
const NOTE_FROM: [number, number] = [SEAM - 10, 600];
const NOTE_PX = 46;

const flightPos = (fl: Flight, f: number, arc: number): { x: number; y: number; rot: number } => {
  const u = sine(span(f, fl.f0, fl.f1));
  const x = lerp(NOTE_FROM[0], fl.to[0], u);
  const y = lerp(NOTE_FROM[1], fl.to[1], u) - arc * Math.sin(Math.PI * u);
  return { x, y, rot: fl.rot * u + 8 * Math.sin(u * 7) * (1 - u) };
};
const lastNotePos = (f: number): { x: number; y: number; rot: number } => {
  // floats up over her head, then drifts down like paper, side to side
  const u = span(f, LAST.f0, LAST.f1);
  const x = lerp(NOTE_FROM[0], LAST.to[0], easeInOut(u));
  const lift = 380 * Math.sin(Math.PI * Math.min(1, u * 1.25));
  const y = lerp(NOTE_FROM[1], LAST.to[1], Math.pow(u, 1.6)) - lift * (1 - u * 0.6);
  return { x, y, rot: 25 * Math.sin(u * 9) * (1 - u) + LAST.rot * u };
};

const paintNote = (ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, blank: number, seed: string): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  const s = NOTE_PX;
  ctx.fillStyle = 'rgba(24,32,58,0.25)';
  ctx.fillRect(-s / 2 + 3, -s / 2 + 4, s, s);
  // yellow fades to cream as she forgets it
  const yr = 0xf0 + (0xf3 - 0xf0) * blank;
  const yg = 0xd3 + (0xef - 0xd3) * blank;
  const yb = 0x5a + (0xe4 - 0x5a) * blank;
  ctx.fillStyle = `rgb(${yr.toFixed(0)},${yg.toFixed(0)},${yb.toFixed(0)})`;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 1 - blank;
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

/** Notes on her side, in world units on the glass plane (one canvas covering the region they use). */
const NOTES_BOX: Rect = { x: SEAM - 60, y: 0, w: 2400, h: 1100 };
const notesLayer = (f: number): Layer =>
  canvasLayer('fnotes', 'fnotes', 2400, 1100, D_GLASS, NOTES_BOX, (ctx) => {
    ctx.save();
    ctx.translate(-NOTES_BOX.x, -NOTES_BOX.y);
    // pinned notes go blank and fade while the camera leaves them (she does not keep them)
    const blank = span(f, F.last + 10, F.cream - 8);
    const fade = 1 - span(f, F.cream - 18, F.cream);
    FLIGHTS.forEach((fl, i) => {
      if (f < fl.f0) return;
      if (f >= fl.f1 && fade <= 0) return;
      const p = f < fl.f1 ? flightPos(fl, f, 120 - i * 6) : { x: fl.to[0], y: fl.to[1], rot: fl.rot };
      ctx.globalAlpha = f < fl.f1 ? 1 : fade;
      paintNote(ctx, p.x, p.y, p.rot, f < fl.f1 ? 0 : blank, `p1:n:${i}`);
    });
    ctx.globalAlpha = 1;
    if (f >= LAST.f0) {
      const p = f < LAST.f1 ? lastNotePos(f) : { x: LAST.to[0], y: LAST.to[1], rot: LAST.rot };
      paintNote(ctx, p.x, p.y, p.rot, 0, 'p1:n:last');
    }
    ctx.restore();
  });

/** The floating background notes of the approved split (his side), with strong parallax. */
const floatNotesLayer = (t: number): Layer =>
  canvasLayer('snotes', 'snotes', 1600, 900, D_NOTES, NOTES_W, (ctx, cw, ch) => {
    ctx.save();
    ctx.scale(cw / 2400, ch / 1350);
    const r = seeded('p1:float');
    for (let i = 0; i < 7; i++) {
      const x0 = 80 + r() * 1100;
      const y0 = r() * 1350;
      const vy = 14 + r() * 10;
      const y = ((((y0 - vy * t) % 1500) + 1500) % 1500) - 80;
      const x = x0 + 30 * Math.sin(t * 0.4 + i);
      paintNote(ctx, x, y, -20 + 40 * r() + 10 * Math.sin(t * 0.5 + i * 2), 0, `p1:float:${i}`);
    }
    ctx.restore();
  });

// ---- the pen reveal (750-806)

const penLayer = (f: number): Layer => {
  const m = sp('ai-stand');
  const line = span(f, F.land, F.penFill);
  const fill = sine(span(f, F.penFill, F.raise - 1));
  return canvasLayer('ai-pen', 'ai-pen', m.w, m.h, D_GLASS, AI_STAND, (ctx, cw, ch) =>
    paintPenReveal(ctx, cw, ch, getImg(url('ai-stand-noeye')), { outline: m.outline as [number, number][], line, fill, stroke: 4.2, seed: 'p1:pen' }),
  );
};

// ---- icons

const iconLayer = (id: string, cx: number, cy: number, size: number, paint: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void): Layer =>
  canvasLayer(id, id, 256, 256, D_GLASS - 1, { x: cx - size / 2, y: cy - size / 2, w: size, h: size }, paint);

/** Top-centre of a sprite's drawn head (approx.): bbox top, at the given fraction of the bbox width. */
const headTop = (name: string, r: Rect, s: number, fx: number): [number, number] => {
  const bb = sp(name).bbox as [number, number, number, number];
  return [r.x + (bb[0] + (bb[2] - bb[0]) * fx) * s, r.y + (bb[1] + LIFT_PAD) * s];
};

// ---- human poses in the split

type HumanPose = 'h-sip2' | 'h-mug2' | 'h-rise' | 'h-glass-note' | 'h-peel' | 'h-slide' | 'h-hand';
const humanPoseAt = (f: number): HumanPose | null => {
  if (f < F.stand) return 'h-sip2';
  if (f < F.rise) return 'h-mug2';
  if (f < F.glass) return 'h-rise';
  if (f < F.peel1) return 'h-glass-note';
  if (f < F.slide1) return 'h-peel';
  if (f < F.peel2) return 'h-slide';
  if (f < F.slide2) return 'h-peel';
  if (f < F.hand) return 'h-slide';
  if (f < F.last) return 'h-hand';
  return 'h-slide';
};
const humanRectOf = (pose: HumanPose): Rect => {
  switch (pose) {
    case 'h-sip2':
    case 'h-mug2':
    case 'h-rise':
      return humanAt(pose, CHAIR_X, 'left');
    case 'h-glass-note':
      return humanAt(pose, SEAM - 5, 'right');
    case 'h-peel':
      return humanAt(pose, SEAM - 150, 'right');
    case 'h-slide':
      return humanAt(pose, SEAM + 4, 'right');
    case 'h-hand':
      return humanAt(pose, SEAM - 3, 'right');
  }
};
const humanLayer = (f: number, pose: HumanPose): Layer => {
  const r = humanRectOf(pose);
  const sipT = span(f, F.land + 20, F.land + 110);
  const lift = pose === 'h-sip2' ? 3 * Math.sin(Math.PI * sine(sipT)) : 0;
  const hb = sp(pose).hair;
  const hair: HairOpts | undefined = pose === 'h-glass-note' ? { x0: 95, y0: 4, x1: 185, y1: 90, amp: 1.4, face: 'right' } : hb ? { ...hb, amp: 1.4, face: 'right' } : undefined;
  return charLayer('human', pose, r, D_GLASS, sec(f), { breath: { top: 0.16, hip: 0.52, amp: 0.01, period: 3.8, phase: 0.1 }, hair, notes: true, lift });
};

// ---- AI poses in the split

const aiSplitLayers = (f: number): Layer[] => {
  if (f < F.land) return [];
  if (f < F.raise) return [penLayer(f)];
  if (f < F.rig) return aiLayers('a-raise', aiAt('a-raise', AI_EYE_X, 'eye'), f, { blinks: AI_BLINKS });
  if (f < F.stand) {
    const r = aiAt('a-wave', AI_EYE_X, 'eye');
    const m = sp('a-wave');
    const el = m.elbow as [number, number];
    const pivot: [number, number] = [r.x + el[0] * AS, r.y + el[1] * AS];
    const open = f < F.raise + 4 ? ([0.1, 0.45, 0.8, 1][f - F.raise] ?? 1) : 1;
    return [
      ...aiLayers('a-wave-body', r, f, { blinks: AI_BLINKS, open }),
      { id: 'ai-forearm', src: { kind: 'image', url: url('a-wave-forearm') }, d: D_GLASS, ...r, rot: waveAngle(f), pivot },
    ];
  }
  if (f < F.look) {
    const pivot: [number, number] = [AI_BACK_X - 14 * AS, FLOOR];
    return aiLayers('ai-stand', AI_STAND, f, { blinks: AI_BLINKS, rot: rock(f, F.stand, 56, 1.1), pivot });
  }
  // "nerede kalmistik hani": she turns her WHOLE body to her blank wall (cut on the beat), then steps up to it (3/4
  // back view, cut on the bar). part1-v1 turned only her head (a-lookback): owl-like, removed.
  if (f < F.wall) return aiLayers('a-turn', aiAt('a-turn', AI_STAND.x + AI_STAND.w / 2, 'center'), f, { blinks: AI_BLINKS });
  if (f < F.peel1) return aiLayers('a-back34', aiAt('a-back34', AI_BACK_X + 60, 'center'), f, {});
  if (f < F.slide1) return aiLayers('ai-stand', AI_STAND, f, { blinks: AI_BLINKS });
  if (f < F.peel2) return aiLayers('a-catch', aiAt('a-catch', AI_BACK_X, 'right'), f, { blinks: AI_BLINKS });
  if (f < F.slide2) return aiLayers('a-pin', aiAt('a-pin', 1470, 'center'), f, { blinks: AI_BLINKS });
  if (f < F.hand) return aiLayers('a-catch', aiAt('a-catch', AI_BACK_X, 'right'), f, { blinks: AI_BLINKS });
  if (f < F.last) return aiLayers('a-hand', aiAt('a-hand', SEAM + 3, 'left'), f, { blinks: AI_BLINKS });
  if (f < F.cream) return aiLayers('a-watch', aiAt('a-watch', AI_FAR_X, 'center'), f, { blinks: AI_BLINKS });
  return [];
};

const splitLayers = (f: number): Layer[] => {
  const t = sec(f - F.bloom0);
  const layers: Layer[] = [
    { id: 'sroom', src: { kind: 'image', url: ROOM_SPLIT.key }, d: D_SKYROOM, ...SROOM_W },
    { id: 'smoon', src: { kind: 'image', url: ROOM_SPLIT.moon }, d: D_SKYROOM, ...SROOM_W },
    ...creamLayers(),
    moonLayer(),
  ];
  if (f >= F.slide1 - 20) layers.push(notesLayer(f));
  const hp = humanPoseAt(f);
  if (hp) layers.push(humanLayer(f, hp));
  // the mug steams while he holds it at his chest
  if (hp === 'h-mug2') {
    const r = humanRectOf(hp);
    const k = r.w / sp(hp).w;
    const mt = sp(hp).mugTop as [number, number];
    layers.push(canvasLayer('steam', 'steam', 160, 300, D_GLASS, { x: r.x + mt[0] * k - 30, y: r.y + (mt[1] + LIFT_PAD) * k - 118, w: 66, h: 110 }, (ctx, cw, ch) => paintSteam(ctx, cw, ch, sec(f), 'split-mug', { lean: 0.35 }), { opacity: 0.8 }));
  }
  layers.push(...aiSplitLayers(f));
  // "?" over her head on "nerede kalmistik hani"
  if (f >= F.look && f < F.peel1) {
    const pose = f < F.wall ? 'a-turn' : 'a-back34';
    const r = f < F.wall ? aiAt('a-turn', AI_STAND.x + AI_STAND.w / 2, 'center') : aiAt('a-back34', AI_BACK_X + 60, 'center');
    const [hx, hy] = headTop(pose, r, aiScale(pose), 0.5);
    const p = (f - F.look) / 30;
    const out = span(f, F.peel1 - 10, F.peel1);
    layers.push(iconLayer('icon-q', hx - 150, hy + 50, 240, (ctx, cw, ch) => paintQuestion(ctx, cw, ch, p, { out })));
  }
  // sweat drop on "yine": above his head, sliding down
  if (f >= F.sweat && f < F.sweat + 50) {
    const pose = humanPoseAt(f) as HumanPose;
    const r = humanRectOf(pose);
    const [hx, hy] = headTop(pose, r, HS, 0.62);
    const p = (f - F.sweat) / 30;
    layers.push(iconLayer('icon-sweat', hx + 70, hy + 20, 180, (ctx, cw, ch) => paintSweat(ctx, cw, ch, p, { fall: span(f, F.sweat + 18, F.sweat + 50), out: span(f, F.sweat + 38, F.sweat + 50) })));
  }
  // the glass stops the handshake: a small ripple where the two hands meet
  if (f >= F.bump && f < F.bump + 30) {
    layers.push(canvasLayer('bump', 'bump', 256, 256, D_GLASS - 1, { x: SEAM - 150, y: HAND_Y - 150, w: 300, h: 300 }, (ctx, cw, ch) => paintGlassBump(ctx, cw, ch, (f - F.bump) / 30)));
  }
  layers.push(floatNotesLayer(t));
  return layers;
};

// Split cameras.
const CAM_WIDE: Cam = { x: 900, y: 560, z: 1000 };
const CAM_TWO: Cam = { x: 930, y: 525, z: 900 };
const CAM_GLASS: Cam = { x: 985, y: 520, z: 860 };
const CAM_HANDS: Cam = { x: 975, y: 455, z: 700 };
const CAM_CREAM: Cam = { x: 1930, y: 540, z: D0 };
const camSplit = (f: number): Cam => {
  if (f < F.raise) return mixCam({ x: 960, y: 540, z: 1000 }, { x: 1010, y: 525, z: 900 }, sine(span(f, F.bloom0, F.raise)));
  if (f < F.rise) return mixCam({ x: 1010, y: 525, z: 900 }, CAM_TWO, sine(span(f, F.raise, F.rise)));
  if (f < F.look) return mixCam(CAM_TWO, CAM_GLASS, easeInOut(span(f, F.rise, F.glass + 24)));
  if (f < F.hand) return mixCam(CAM_GLASS, { x: 1000, y: 522, z: 880 }, sine(span(f, F.look, F.hand)));
  if (f < F.last) return mixCam({ x: 1000, y: 522, z: 880 }, CAM_HANDS, easeInOut(span(f, F.hand, F.bump + 6)));
  // follow the last note through the glass and into her world
  const u = easeInOut(span(f, F.last, F.cream));
  const n = lastNotePos(Math.min(f, F.cream));
  const follow = { x: n.x, y: lerp(CAM_HANDS.y, 540, u), z: lerp(CAM_HANDS.z, CAM_CREAM.z, u) };
  const w = Math.sin(Math.PI * u) * 0.35;
  const base = mixCam(CAM_HANDS, CAM_CREAM, u);
  return { x: lerp(base.x, follow.x, w), y: base.y, z: base.z };
};
void CAM_WIDE;

// ---------------------------------------------------------------------------------------------------------------
// Scene 4 in full cream.

const AI_C_X = AI_FAR_X; // her eye x in the cream framing
const BOOK = { x: AI_C_X - 175, w: 120 };
const bookY = (f: number): { y: number; rot: number; sq: number } => {
  // falls from above the frame tumbling (about a turn and a half, slowing as it drops), lands on the beat with a
  // squash, bounces twice (34 then 9 px, rocking) and settles flat about 18 frames after the landing
  const u = span(f, F.cream, F.book);
  if (u < 1) return { y: lerp(-320, FLOOR, u * u), rot: -10 - 520 * (1 - u) * (1 - u * 0.35), sq: 1 };
  const k = f - F.book;
  const hop = (a: number, len: number, h: number): number => (k >= a && k < a + len ? h * Math.sin((Math.PI * (k - a)) / len) : 0);
  const b = hop(2, 9, 34) + hop(11, 6, 9);
  const wob = k < 20 ? 9 * Math.exp(-k / 6) * Math.cos(k * 0.75) : 0;
  return { y: FLOOR - b, rot: -10 + wob, sq: k < 2 ? ([0.7, 0.86][k] ?? 1) : k === 11 ? 0.9 : 1 };
};
/** Dust puff where the notebook lands: small navy-outlined cream puffs rolling out along the floor, then gone. */
const dustLayer = (f: number): Layer | null => {
  const k = f - F.book;
  if (k < 0 || k > 24) return null;
  const cx = BOOK.x + BOOK.w / 2;
  return canvasLayer('dust-puff', 'dust-puff', 520, 200, D_GLASS - 1, { x: cx - 260, y: FLOOR - 150, w: 520, h: 200 }, (ctx, cw, ch) => {
    const r = seeded('p1:puff');
    const u = k / 24;
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette.navy;
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const dist = (40 + r() * 70) * Math.sqrt(u) + 30;
      const x = cw / 2 + side * dist + (r() - 0.5) * 20;
      const y = ch - 52 - r() * 30 * u - 40 * u * r();
      const rad = (10 + r() * 14) * (0.5 + u) * (1 - u * 0.4);
      ctx.globalAlpha = Math.max(0, 1 - u * 1.1);
      ctx.fillStyle = palette.cream;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = palette.navy;
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (0.1 + 0.8 * r());
      const v = 60 + r() * 90;
      const x = cw / 2 + Math.cos(a) * v * u * (i % 2 ? 1 : -1);
      const y = ch - 50 - Math.sin(a) * v * u + 120 * u * u;
      ctx.globalAlpha = Math.max(0, 1 - u);
      ctx.fillRect(x, y, 4, 4);
    }
    ctx.globalAlpha = 1;
  });
};
const bookLayer = (f: number): Layer => {
  const m = sp('notebook');
  const s = BOOK.w / ((m.bbox[2] as number) - (m.bbox[0] as number));
  const p = bookY(f);
  const h = m.h * s * p.sq;
  return { id: 'book', src: { kind: 'image', url: url('notebook') }, d: D_GLASS, x: BOOK.x - (m.bbox[0] as number) * s, y: p.y - (m.bbox[3] as number) * s * p.sq + 6, w: m.w * s, h, rot: p.rot, pivot: [BOOK.x + BOOK.w / 2, p.y] };
};

/** Seated reading spot: a new framing (cut on the downbeat), a little right of where she knelt. */
const READ_X = 1680;
const creamLayersAt = (f: number): Layer[] => {
  const layers: Layer[] = [...creamLayers(), moonLayer(), notesLayer(f)];
  if (f < F.read) {
    if (f < F.kneel) layers.push(...aiLayers('a-lookdown', aiAt('a-lookdown', AI_C_X, 'eye'), f, { blinks: AI_BLINKS }));
    else layers.push(...aiLayers('a-kneel', aiAt('a-kneel', BOOK.x + BOOK.w - 20, 'left'), f, { blinks: AI_BLINKS }));
    layers.push(bookLayer(f));
    const dust = dustLayer(f);
    if (dust) layers.push(dust);
  } else {
    const pose: AiPose = f < F.lookUp ? 'a-read' : 'a-lookup';
    const r = aiAt(pose, READ_X, 'center');
    // a small head tilt on "anliyorum": the whole drawing leans 2 degrees about her seat
    const tilt = pose === 'a-read' ? 2 * sine(span(f, F.check - 6, F.check + 10)) : 0;
    layers.push(...aiLayers(pose, r, f, { blinks: AI_BLINKS, rot: tilt, pivot: [r.x + r.w / 2, FLOOR] }));
    if (f >= F.check) {
      const [hx, hy] = headTop(pose, r, aiScale(pose), 0.5);
      const out = span(f, F.lookUp, F.lookUp + 26);
      layers.push(iconLayer('icon-check', hx, hy - 110, 170, (ctx, cw, ch) => paintCheck(ctx, cw, ch, (f - F.check) / 30, { out })));
    }
  }
  layers.push(papersLayer());
  return layers;
};
const camCream = (f: number): Cam => {
  if (f < F.read) return mixCam(CAM_CREAM, { x: 1840, y: 600, z: 860 }, sine(span(f, F.cream, F.pTag)));
  // held still: the slow push re-sampled the outline every frame and its line weight shimmered (Gemini, part1-v1)
  if (f < F.lookUp) return { x: 1712, y: 744, z: 635 };
  // she looks up: the camera eases back and up into the empty sky
  return mixCam({ x: 1705, y: 748, z: 610 }, { x: 1740, y: 640, z: 840 }, easeInOut(span(f, F.lookUp, F.face)));
};

// Page close-ups: full-frame plates with a slow push; on each new page the previous right page turns over (5 frames).
const PAGE_ORDER: readonly { f: number; url: string }[] = [
  { f: F.pTag, url: PAGES.tag },
  { f: F.pRoad, url: PAGES.road },
  { f: F.pCross, url: PAGES.cross },
];
const drawCover = (ctx: CanvasRenderingContext2D, img: CanvasImageSource, w: number, h: number, s: number, ox = 0, oy = 0): void => {
  const iw = (img as HTMLImageElement).naturalWidth || w;
  const ih = (img as HTMLImageElement).naturalHeight || h;
  const k = Math.max(w / iw, h / ih) * s;
  ctx.drawImage(img, (w - iw * k) / 2 + ox, (h - ih * k) / 2 + oy, iw * k, ih * k);
};
const paintPages = (f: number) => (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  let i = 0;
  PAGE_ORDER.forEach((p, k) => {
    if (f >= p.f) i = k;
  });
  const cur = PAGE_ORDER[i] as { f: number; url: string };
  const s = 1.02 + 0.05 * span(f, F.pTag, F.read);
  drawCover(ctx, getImg(cur.url), w, h, s);
  const k = f - cur.f;
  const prev = PAGE_ORDER[i - 1];
  if (prev && k < 6) {
    // the old right page swings over the spine: squeezed toward the spine, darkening, gone in 6 frames
    const u = (k + 1) / 7;
    const sx = Math.cos((Math.PI / 2) * u);
    ctx.save();
    ctx.beginPath();
    ctx.rect(w / 2, 0, (w / 2) * sx, h);
    ctx.clip();
    ctx.translate(w / 2, 0);
    ctx.scale(sx, 1);
    ctx.translate(-w / 2, 0);
    drawCover(ctx, getImg(prev.url), w, h, s);
    ctx.restore();
    ctx.fillStyle = `rgba(24,32,58,${(0.35 * u).toFixed(3)})`;
    ctx.fillRect(w / 2, 0, (w / 2) * sx, h);
  }
};
const paintLiftPage = (f: number) => (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  const p = 0.9 * sine(span(f, F.lift + 2, F.bleed1 - 6));
  const s = 1.04 + 0.04 * span(f, F.lift, F.bleed1);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(s, s);
  ctx.translate(-w / 2, -h / 2);
  paintInkLift(ctx, w, h, getImg(PAGES.cross), p, 'p1:inklift');
  ctx.restore();
};

/** Her cursor face, close: a big cream head, the navy cursor blinking on the beat, nothing behind it. */
const paintFace = (f: number) => (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  const u = sine(span(f, F.face, F.lift));
  ctx.fillStyle = palette.cream;
  ctx.fillRect(0, 0, w, h);
  const R = lerp(520, 560, u);
  const bob = 3 * Math.sin((2 * Math.PI * sec(f)) / 4.2);
  const cx = w * 0.56;
  const cy = h * 0.62 + bob;
  // neck
  ctx.fillStyle = palette.cream;
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx + R * 0.05, cy + R * 0.7);
  ctx.quadraticCurveTo(cx + R * 0.18, cy + R * 1.2, cx + R * 0.1, cy + R * 1.6);
  ctx.moveTo(cx + R * 0.62, cy + R * 0.62);
  ctx.quadraticCurveTo(cx + R * 0.55, cy + R * 1.1, cx + R * 0.66, cy + R * 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // stipple
  const r = seeded('p1:face-stipple');
  ctx.fillStyle = 'rgba(24,32,58,0.55)';
  for (let i = 0; i < 5200; i++) {
    const a = r() * Math.PI * 2;
    const rr = R * Math.sqrt(r()) * 0.985;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    // shading: dense along the lower right rim (away from the cursor side), sparse elsewhere
    const edge = Math.pow(rr / R, 3);
    const side = 0.5 + 0.5 * Math.cos(a - 0.6);
    if (r() < 0.04 + 0.8 * edge * side) ctx.fillRect(x, y, 3, 3);
  }
  // cursor: on for the first half of every beat, nothing behind it
  // the slit is the whole face: on for the first three quarters of every beat (a text cursor's blink), wide and
  // tall enough to read at once (part1-v1: thin and on half the time, the close-up read as an empty circle)
  const on = beatPhase(f) < 0.75 ? 1 : 0;
  const open = blink(f, [1567]);
  if (on) {
    const ch = R * 0.44 * open;
    const cw = R * 0.11;
    const x = cx - R * 0.56;
    const y = cy - R * 0.1 - ch / 2;
    ctx.fillStyle = palette.moonYellow;
    ctx.fillRect(x + 6, y - 4, cw, ch);
    ctx.fillStyle = palette.navy;
    ctx.fillRect(x, y, cw, ch);
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
export interface IntroShot {
  kind: 'intro';
}
export interface BloomShot {
  kind: 'bloom';
  p: number;
  from: StageShot;
  to: StageShot;
  origin: [number, number];
}
export interface BleedShot {
  kind: 'bleed';
  p: number;
  from: FlatShot;
  to: StageShot;
  origin: [number, number];
}
export type Shot = IntroShot | StageShot | FlatShot | BloomShot | BleedShot;

const deskShot = (f: number): StageShot =>
  f < F.cut2 ? { kind: 'stage', layers: deskLayers(f, 'mug'), cam: cam1(f) } : { kind: 'stage', layers: deskLayers(f, 'sip'), cam: cam2(f) };
const splitShot = (f: number): StageShot => ({ kind: 'stage', layers: splitLayers(f), cam: camSplit(f) });
const creamShot = (f: number): StageShot => ({ kind: 'stage', layers: creamLayersAt(f), cam: camCream(f) });

// Chorus 1 opening (after the bleed): the home split, wide; he sits with his coffee, she stands.
const chorusLayers = (f: number): Layer[] => {
  const t = sec(f);
  return [
    { id: 'sroom', src: { kind: 'image', url: ROOM_SPLIT.key }, d: D_SKYROOM, ...SROOM_W },
    { id: 'smoon', src: { kind: 'image', url: ROOM_SPLIT.moon }, d: D_SKYROOM, ...SROOM_W },
    ...creamLayers(),
    moonLayer(),
    humanLayer(f, 'h-mug2'),
    ...aiLayers('ai-stand', AI_STAND, f, { blinks: [1722] }),
    floatNotesLayer(t),
  ];
};
const chorusCam = (f: number): Cam => mixCam({ x: 940, y: 560, z: 1060 }, { x: 950, y: 560, z: 1010 }, sine(span(f, F.bleed0, SONG_END)));
const chorusShot = (f: number): StageShot => ({ kind: 'stage', layers: chorusLayers(f), cam: chorusCam(f) });

/** Bloom timing (its look is locked; timing is ours): the ring's sweep (progress 0.15-0.5) is stretched over 60 % of
 * the bloom and the settle is quick, so the sweep never jumps frame to frame (a 6-frame rush at 724-726 in part1-v2). */
const bloomP = (u: number): number => (u < 0.15 ? u : u < 0.75 ? 0.15 + ((u - 0.15) / 0.6) * 0.35 : 0.5 + ((u - 0.75) / 0.25) * 0.5);

export const shotAt = (f: number): Shot => {
  if (f < F.open) return { kind: 'intro' };
  if (f < F.bloom0) return deskShot(f);
  if (f < F.land) {
    const c = project(cam2(F.bloom0), D_DESK, cursorWorld(F.bloom0));
    return { kind: 'bloom', p: bloomP((f - F.bloom0) / BLOOM_FRAMES), from: deskShot(f), to: splitShot(f), origin: [c[0] / W, c[1] / H] };
  }
  if (f < F.cream) return splitShot(f);
  if (f < F.pTag) return creamShot(f);
  if (f < F.read) return { kind: 'flat', paint: paintPages(f) };
  if (f < F.face) return creamShot(f);
  if (f < F.lift) return { kind: 'flat', paint: paintFace(f) };
  if (f < F.bleed0) return { kind: 'flat', paint: paintLiftPage(f) };
  if (f < F.bleed1) return { kind: 'bleed', p: (f - F.bleed0) / BLEED_FRAMES, from: { kind: 'flat', paint: paintLiftPage(f) }, to: chorusShot(f), origin: [0.62, 0.5] };
  return chorusShot(f);
};

// ---------------------------------------------------------------------------------------------------------------
// Probes for the checks and the type layout (pure; no images needed).

/** Screen boxes of the characters at song frame f (empty for the intro, pages and face close-up). */
export const characterBoxes = (f: number): { who: 'human' | 'ai'; box: Rect }[] => {
  const s = shotAt(f);
  const stage = s.kind === 'stage' ? s : s.kind === 'bloom' ? (s.p < 0.5 ? s.from : s.to) : s.kind === 'bleed' ? (s.p > 0.5 ? s.to : null) : null;
  if (!stage) return [];
  const out: { who: 'human' | 'ai'; box: Rect }[] = [];
  for (const l of stage.layers) {
    const key = l.src.kind === 'canvas' ? l.src.key : l.src.url;
    const who = l.id === 'human' ? 'human' : l.id === 'ai' || l.id === 'ai-pen' ? 'ai' : null;
    if (!who) continue;
    const name = key.split(':').pop() as string;
    const m = SP1[name] ?? SP0[name] ?? (name === 'a-wave-body' ? SP1['a-wave'] : name === 'ai-pen' ? SP0['ai-stand'] : undefined);
    const bb = (m?.bbox ?? [0, 0, m?.w ?? 0, m?.h ?? 0]) as [number, number, number, number];
    const sx = l.w / (m?.w ?? 1);
    const pad = l.src.kind === 'canvas' && who === 'human' ? LIFT_PAD : l.src.kind === 'canvas' ? LIFT_PAD : 0;
    const sy = l.h / ((m?.h ?? 1) + pad);
    const world: Rect = { x: l.x + bb[0] * sx, y: l.y + (bb[1] + pad) * sy, w: (bb[2] - bb[0]) * sx, h: (bb[3] - bb[1]) * sy };
    out.push({ who, box: projectRect(stage.cam, l.d, world) });
  }
  return out;
};
export const shotKind = (f: number): Shot['kind'] => shotAt(f).kind;
/** Which set the frame is in, for the type colours: navy background (desk, his side) or cream. */
export const backdropAt = (f: number): 'desk' | 'split' | 'cream' | 'page' | 'face' | 'intro' => {
  if (f < F.open) return 'intro';
  if (f < F.land) return 'desk';
  if (f < F.cream) return 'split';
  if (f < F.pTag) return 'cream';
  if (f < F.read) return 'page';
  if (f < F.face) return 'cream';
  if (f < F.bleed1) return f < F.lift ? 'face' : 'page';
  return 'split';
};
/** Camera of a stage frame (for the type layout of the split: where the glass is on screen). */
export const seamOnScreen = (f: number): number | null => {
  const s = shotAt(f);
  if (s.kind !== 'stage') return null;
  return project(s.cam, D_GLASS, [SEAM, 0])[0];
};
export const cursorOnScreen = (f: number): [number, number] => project(f < F.cut2 ? cam1(f) : cam2(f), D_DESK, cursorWorld(f));
void AI_BACK_X;
void HAND_Y;
