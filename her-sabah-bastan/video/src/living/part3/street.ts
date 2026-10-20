// Scene 9 (chorus 2, song 3340-3894): the day street. Shot 1 he walks past shop windows (chest-up, the camera tracks
// with him, the street's layers slide by in parallax; she walks beside him as a cream reflection in each window);
// shot 2 the TV-shop window (every screen shows her, identical; the moon phase steps across the screens one per beat);
// shot 3 the café window (palms meet on the glass, the hands invert for one beat, the chorus waves wipe her, on every
// sung "daha" she resets to the same "Merhaba" pose and his side gains a note); then the wide street that folds.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { blink } from '../life.ts';
import { paintGlassWave, paintSkyline, paintSun, paintTvScreen } from './streetFx.ts';
import {
  BEAT,
  F,
  getImg,
  H,
  W,
  canvasLayer,
  charLayer,
  clamp01,
  easeInOut,
  headOf,
  imageLayer,
  lerp,
  mixCam,
  num,
  placeAt,
  pt,
  sec,
  sine,
  sp,
  span,
  url,
  type Cam,
  type Layer,
  type Rect,
} from './common.ts';
import { aiLayers, HUMAN_BREATH, invertedSprite, paintNote, tintedSprite } from './figures.ts';
import { D0, planeScale } from '../types.ts';

// ---------------------------------------------------------------------------------------------------------------
// The street set (world units). Depths: sky far, a skyline of far roofs, the shop fronts, him, lamp posts in front.

const D_SKY = 4000;
const D_FAR = 1500;
export const D_FAC = 400;
const D_TREE = 230;
const D_FG = -330;

/** World units per plate px for the shop fronts (on screen at the reference camera: x 1.2). */
const PS = 1.2 / planeScale({ x: 0, y: 0, z: D0 }, D_FAC);
const PLATE_W = 1672 * PS;
const PLATE_H = 941 * PS;
/** Window top (plate y 390) sits at screen y 170 under the reference camera -> plate top in world y. */
const PLATE_Y = 540 + (170 - 540) / planeScale({ x: 0, y: 0, z: D0 }, D_FAC) - 390 * PS;
/** Plates along the street, left to right. */
const STRIP = ['st-shops-b', 'st-shops-a', 'st-tv', 'st-shops-b'] as const;
const plateX = (i: number): number => -PLATE_W + i * (PLATE_W - 6 * PS);
const plateRect = (i: number): Rect => ({ x: plateX(i), y: PLATE_Y, w: PLATE_W, h: PLATE_H });
/** World rect of a plate-px rect on plate i. */
const onPlate = (i: number, r: readonly number[]): Rect => ({ x: plateX(i) + (r[0] as number) * PS, y: PLATE_Y + (r[1] as number) * PS, w: (r[2] as number) * PS, h: (r[3] as number) * PS });

const PLATE_I = { shopsA: 1, tv: 2 } as const;

// ---- cameras

/** Walking speed of the tracking camera (world units / s on his plane). */
const WALK_V = 230;
/** Shot 1: the camera opens looking up at the sun over the roofs (the iris) and tilts down to him while tracking. */
const WALK_X0 = plateX(PLATE_I.shopsA) + 260;
const UP_Y = -760;
const camWalk = (f: number): Cam => {
  const x = WALK_X0 + WALK_V * sec(f - F.iris0);
  const tilt = easeInOut(span(f, F.iris0 + 8, F.iris0 + 64));
  return { x, y: lerp(UP_Y, 455, tilt), z: D0 };
};
/** Shot 2: cut along the street to the TV shop, same height, same tracking speed (slower: he looks). */
const TV_X0 = plateX(PLATE_I.tv) + 0.36 * PLATE_W;
const camTv = (f: number): Cam => ({ x: TV_X0 + 120 * sec(f - F.tv), y: 410, z: D0 * lerp(1, 0.97, sine(span(f, F.tv, F.cafe))) });

/** The sun: world point on the sky plane that the opening camera sees at the hand-over dot (960, 470). */
const SUN_R_SCR = 74;
const SUN_W = ((): [number, number] => {
  const c = camWalk(F.iris0);
  const k = planeScale(c, D_SKY);
  return [c.x + (960 - W / 2) / k, c.y + (470 - H / 2) / k];
})();
export const sunScreenAt = (cam: Cam): { x: number; y: number; r: number } => {
  const k = planeScale(cam, D_SKY);
  return { x: W / 2 + (SUN_W[0] - cam.x) * k, y: H / 2 + (SUN_W[1] - cam.y) * k, r: (SUN_R_SCR / planeScale(camWalk(F.iris0), D_SKY)) * k };
};

// ---- common street layers

/** Flat cream sky (huge, so every camera sees it) + the sun on its own small canvas. */
const skyLayers = (f: number, cam: Cam): Layer[] => {
  const k = planeScale(cam, D_SKY);
  const sky: Rect = { x: cam.x - (W / 2 / k) * 1.2, y: cam.y - (H / 2 / k) * 1.2, w: (W / k) * 1.2, h: (H / k) * 1.2 };
  const sr = SUN_R_SCR / planeScale(camWalk(F.iris0), D_SKY);
  return [
    canvasLayer('sky', 'p3:sky', 8, 8, D_SKY, sky, (ctx, cw, ch) => {
      ctx.fillStyle = palette.cream;
      ctx.fillRect(0, 0, cw, ch);
    }),
    canvasLayer('sun', 'p3:sun', 512, 512, D_SKY - 1, { x: SUN_W[0] - sr * 3, y: SUN_W[1] - sr * 3, w: sr * 6, h: sr * 6 }, (ctx, cw) => paintSun(ctx, cw / 2, cw / 2, cw / 6, sec(f))),
  ];
};
/** Far roofs: tiles of the skyline painter above the shop fronts' roof line. */
const SKYLINE_H = 420;
const skylineLayers = (cam: Cam): Layer[] => {
  const k = planeScale(cam, D_FAR);
  const tileW = 2400 * 1.6;
  const roofScr = 540 + (PLATE_Y + 95 * PS - 540) * planeScale({ x: 0, y: 540, z: D0 }, D_FAC);
  const y = 540 + (roofScr + 40 - 540) / planeScale({ x: 0, y: 540, z: D0 }, D_FAR) - SKYLINE_H;
  const out: Layer[] = [];
  const x0 = Math.floor((cam.x - W / 2 / k) / tileW) * tileW;
  for (let x = x0, i = 0; x < cam.x + W / 2 / k + tileW && i < 6; x += tileW, i++)
    out.push(canvasLayer(`skyline-${i}`, 'p3:skyline', 2400, 560, D_FAR, { x, y, w: tileW, h: SKYLINE_H }, (ctx, cw, ch) => paintSkyline(ctx, cw, ch, 'p3-street')));
  return out;
};
/** The road and kerb under the plates (the plates end at their sidewalk strip). */
const groundLayer = (): Layer =>
  canvasLayer('ground', 'p3:ground', 2400, 780, D_FAC, { x: plateX(0), y: PLATE_Y + PLATE_H - 4, w: PLATE_W * 4, h: 2600 }, paintRoad);
/** The road below the kerb: navy with a cream kerb line, dashed lane marks and a speckle of cream grain. */
const paintRoad = (ctx: CanvasRenderingContext2D, cw: number, ch: number): void => {
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = palette.cream;
  ctx.fillRect(0, 6, cw, 5);
  for (let x = 20; x < cw; x += 120) ctx.fillRect(x, ch * 0.17, 64, 6);
  const r = seeded('p3:road');
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 2600; i++) {
    const y = r() * ch * 0.4;
    ctx.fillRect(r() * cw, y, 1 + r() * 2.5, 1 + r() * 1.5);
  }
  ctx.globalAlpha = 1;
};
const plateLayers = (): Layer[] => STRIP.map((n, i) => imageLayer(`plate-${i}`, url(n), D_FAC, plateRect(i)));

/** Street trees on the kerb and lamp posts close in front (strong parallax). */
const TREES = [0.15, 1.95, 2.9].map((u) => plateX(0) + u * PLATE_W);
const LAMPS = [WALK_X0 + 1150, WALK_X0 + 2900, TV_X0 + 1700];
const treeLayers = (): Layer[] => {
  const m = sp('st-tree');
  const s = 1.35;
  const base = PLATE_Y + (num('st-shops-a', 'sidewalkY') + 40) * PS;
  return TREES.map((x, i) => imageLayer(`tree-${i}`, url('st-tree'), D_TREE, { x: x - (m.w * s) / 2, y: base - num('st-tree', 'baseY') * s, w: m.w * s, h: m.h * s }));
};
const lampLayers = (): Layer[] => {
  const m = sp('st-lamp');
  const s = 2.4;
  return LAMPS.map((x, i) => imageLayer(`lamp-${i}`, url('st-lamp'), D_FG, { x, y: 1180 - num('st-lamp', 'baseY') * s + 900, w: m.w * s, h: m.h * s }));
};

// ---- him walking (screen-locked by the tracking camera) and her reflection

/** Gentle upper-body bob: one step per beat, up on the passing position. */
const bob = (f: number): number => -7 * Math.abs(Math.sin((Math.PI * sec(f - F.iris0)) / BEAT));
const sway = (f: number): number => 0.5 * Math.sin((Math.PI * sec(f - F.iris0)) / BEAT);

/** Screen rect of a waist-up sprite scaled so its head is `head` px tall, head top at (x of the sprite's head centre, top). */
const headTopRect = (name: string, head: number, cx: number, top: number): { r: Rect; s: number } => {
  const hd = headOf(name);
  const s = head / hd.h;
  const ht = hd.top;
  return { r: { x: cx - (ht[0] as number) * s, y: top - (ht[1] as number) * s, w: sp(name).w * s, h: sp(name).h * s }, s };
};

const HEAD_H = 300;
const walkerScr = (f: number, x: number): Rect => headTopRect('h-walk', HEAD_H, x, 124 + bob(f)).r;
/** World rect (his plane d = 0) of a screen rect under cam. */
const worldOf = (cam: Cam, d: number, r: Rect): Rect => placeAt(r, d, cam);

const walkerLayer = (f: number, cam: Cam, x: number): Layer => {
  const scr = walkerScr(f, x);
  const r = worldOf(cam, 0, scr);
  const hair = sp('h-walk').hair as { x0: number; y0: number; x1: number; y1: number } | undefined;
  return charLayer('human', 'h-walk', r, 0, sec(f), { breath: { ...HUMAN_BREATH, amp: 0.006 }, hair: hair ? { ...hair, amp: 1.6, face: 'right' } : undefined, notes: true }, { rot: sway(f), pivot: [r.x + r.w * 0.45, r.y + r.h] });
};

/** Her reflection: the same framing and bob as him, beside him, painted only inside the shop-window glass. */
const REFL_DX = 520;
const REFL_HEAD = HEAD_H * 0.5;
const reflectionLayers = (f: number, cam: Cam, x: number, plates: readonly number[]): Layer[] => {
  const k = planeScale(cam, D_FAC);
  // her head sits just under the shop windows' top edge, wherever the (tilting) camera puts it
  const winTop = H / 2 + (PLATE_Y + 390 * PS - cam.y) * k;
  const { r: scr } = headTopRect('a-walk', REFL_HEAD, x + REFL_DX, winTop + 26 + bob(f));
  const out: Layer[] = [];
  for (const i of plates) {
    const name = STRIP[i] as string;
    const wins = (sp(name).windows as number[][] | undefined) ?? [];
    wins.forEach((wr, j) => {
      const r = onPlate(i, wr);
      // screen rect of this window
      const sx = W / 2 + (r.x - cam.x) * k;
      const sy = H / 2 + (r.y - cam.y) * k;
      const sw = r.w * k;
      const shh = r.h * k;
      if (sx > W || sx + sw < 0 || scr.x > sx + sw || scr.x + scr.w < sx) return;
      const cw = Math.max(8, Math.round(sw));
      const ch = Math.max(8, Math.round(shh));
      out.push(
        canvasLayer(`refl-${i}-${j}`, `p3:refl:${i}:${j}`, cw, ch, D_FAC - 1, r, (ctx) => {
          ctx.save();
          ctx.globalAlpha = 0.82;
          ctx.translate(-sx, -sy);
          const pv = [scr.x + scr.w * 0.5, scr.y + scr.h];
          ctx.translate(pv[0] as number, pv[1] as number);
          ctx.rotate((sway(f) * Math.PI) / 180);
          ctx.translate(-(pv[0] as number), -(pv[1] as number));
          // a soft navy print under her (the glass darkens behind a reflection), then her in cream
          ctx.globalAlpha = 0.45;
          ctx.drawImage(tintedSprite('a-walk', palette.navy), scr.x + 7, scr.y + 5, scr.w, scr.h);
          ctx.globalAlpha = 0.9;
          ctx.drawImage(getImg(url('a-walk')), scr.x, scr.y, scr.w, scr.h);
          ctx.restore();
          paintGlare(ctx, cw, ch, `glare-${i}-${j}`);
        }),
      );
    });
  }
  return out;
};
/** Glass: two or three diagonal cream glare strokes. */
const paintGlare = (ctx: CanvasRenderingContext2D, cw: number, ch: number, seed: string): void => {
  const r = seeded(seed);
  ctx.save();
  ctx.strokeStyle = 'rgba(243,239,228,0.32)';
  ctx.lineCap = 'butt';
  for (let i = 0; i < 3; i++) {
    const x = cw * (0.1 + r() * 0.8);
    ctx.lineWidth = Math.max(2, cw * (0.01 + r() * 0.03));
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.lineTo(x - ch * 0.35, ch + 10);
    ctx.stroke();
  }
  ctx.restore();
};

const WALK_SCR_X = 560;
const walkLayers = (f: number, cam: Cam): Layer[] => [
  ...skyLayers(f, cam),
  groundLayer(),
  ...plateLayers(),
  ...reflectionLayers(f, cam, WALK_SCR_X, [0, 1, 2]),
  ...treeLayers(),
  walkerLayer(f, cam, WALK_SCR_X),
  ...lampLayers(),
];

// ---- shot 2: the TV-shop window

const SCREENS = (): number[][] => sp('st-tv').screens as number[][];
/** Screens light their moon one per beat, left to right then the lower row: screen j's moon is phase j / (n - 1). */
const TV_STEPS = [F.tv, 3488, 3502, 3516, 3530, 3544, 3558, 3572];
const tvLayers = (f: number, cam: Cam): Layer[] => {
  const scr = SCREENS();
  const n = scr.length;
  const step = TV_STEPS.filter((s) => f >= s).length; // 1..8
  const lit = Math.ceil((n * step) / TV_STEPS.length);
  const stepF = TV_STEPS[step - 1] as number;
  const fig = getImgSafe('ai-stand');
  const screens = scr.map((s, j) =>
    canvasLayer(`tv-${j}`, `p3:tv:${j}`, 330, 264, D_FAC + 1, onPlate(PLATE_I.tv, [(s[0] as number) - 3, (s[1] as number) - 3, (s[2] as number) + 6, (s[3] as number) + 6]), (ctx, cw, ch) => {
      const on = j < lit;
      paintTvScreen(ctx, cw, ch, fig(), { phase: on ? j / (n - 1) : -1, t: sec(f), flick: on && j >= Math.ceil((n * (step - 1)) / TV_STEPS.length) && f - stepF < 2 ? 1 : 0, fit: { sx: 0, sy: 0, sw: 151, sh: 520 }, seed: 'tv' });
    }),
  );
  return [
    ...skyLayers(f, cam),
    groundLayer(),
    ...screens,
    ...plateLayers(),
    ...treeLayers(),
    walkerLayer(f, cam, 330),
  ];
};
const getImgSafe = (n: string) => (): HTMLImageElement => getImg(url(n));

// ---------------------------------------------------------------------------------------------------------------
// Shot 3: the café window. The plate fills the frame; he stands at the glass on the street side, she is inside.

const D_CAFE = 150;
const CAFE_SCR: Rect = { x: -110, y: -60, w: 2150, h: 2150 * (941 / 1672) };
const CAFE_W = placeAt(CAFE_SCR, D_CAFE);
const CAFE_K = CAFE_SCR.w / 1672;
/** The glass surface on screen (reference camera) and the contact line of the two palms. */
const GLASS_SCR_X = CAFE_SCR.x + num('st-cafe', 'glassX') * CAFE_K;
const CONTACT_X = GLASS_SCR_X + 46;
const D_HER_GLASS = 20;
const D_HER_BACK = 110;
const TILT_DEG = 5;

const palmScr = (name: 'h-palm' | 'a-palm', head: number): Rect => {
  const s = head / headOf(name).h;
  const g = num(name, 'glassX');
  const palm = pt(name, 'palm');
  // palms on one row: y of the palm centre at PALM_Y
  return { x: CONTACT_X + (name === 'h-palm' ? -2 : 2) - g * s, y: PALM_Y - (palm[1] as number) * s, w: sp(name).w * s, h: sp(name).h * s };
};
/** v2: both waist-up drawings end in a straight cut at the hips. The palm row and the scale are chosen so that cut lies
 * below the frame bottom under every café camera (bottoms at 1110 / 1108 px under the widest one, 1080 + 28);
 * in v1 it ended at ~950 px and the two read as floating torsos. */
const PALM_Y = 560;
const HIS_PALM = (): Rect => palmScr('h-palm', 242);
const HER_PALM = (): Rect => palmScr('a-palm', 240);
/** Where she stands a few steps back inside (full figure), and the same spot for the "Merhaba" reset. */
const HER_BACK = (name: string): Rect => {
  const m = sp(name);
  const s = 0.98;
  const bb = m.bbox as number[];
  const cx = 1330;
  const feet = 1030;
  return { x: cx - (((bb[0] as number) + (bb[2] as number)) / 2) * s, y: feet - (bb[3] as number) * s, w: m.w * s, h: m.h * s };
};

/** Her pose inside the café at frame f. */
const herCafePose = (f: number): 'palm' | 'merhaba' => {
  if (f < F.reset0) return 'palm';
  if (f < F.daha1) return f < F.reach0 ? 'merhaba' : 'palm';
  if (f < F.reach1) return 'merhaba';
  if (f < F.daha2) return 'palm';
  if (f < F.reach2) return 'merhaba';
  return 'palm';
};
/** His notes: one more on every sung "daha" (beyond those drawn). Fractions of his sprite's bbox. */
const EXTRA_NOTES: readonly [number, number, number][] = [
  [0.2, 0.62, -12],
  [0.1, 0.8, 9],
  [0.27, 0.9, -4],
];
const notesFor = (f: number): number => [F.daha1, F.daha2, F.wide].filter((x) => f >= x).length;

/** The shot opens on the palms two-shot (both palms on the glass from the first frame) and drifts slowly closer. */
const cafeCam = (f: number): Cam => {
  const b: Cam = { x: 990, y: 520, z: 930 };
  const c: Cam = { x: 1020, y: 505, z: 880 };
  return mixCam(b, c, span(f, F.cafe, F.wide));
};

const cafeLayers = (f: number, cam: Cam): Layer[] => {
  const layers: Layer[] = [imageLayer('cafe', url('st-cafe'), D_CAFE, CAFE_W)];
  const pose = herCafePose(f);
  const blinks = [3600, 3640, 3700, 3760, 3830];
  if (pose === 'merhaba') {
    const r = placeAt(HER_BACK('a-raise'), D_HER_BACK);
    layers.push(...aiLayers('ai', 'a-raise', r, D_HER_BACK, f, { blinks }));
  } else {
    const r = placeAt(HER_PALM(), D_HER_GLASS);
    // "Bilmiyorum": her head tilts (the whole drawing leans about her palm, which stays on the glass), then rights itself
    const tilt = TILT_DEG * sine(span(f, F.tilt - 4, F.tilt + 8)) * (1 - sine(span(f, F.palms - 14, F.palms)));
    const s = r.w / sp('a-palm').w;
    const palm = pt('a-palm', 'palm');
    layers.push(...aiLayers('ai', 'a-palm', r, D_HER_GLASS, f, { blinks, rot: tilt, pivot: [r.x + (palm[0] as number) * s, r.y + (palm[1] as number) * s] }));
  }
  // the glass between: faint glare over her side
  const glassW = placeAt({ x: GLASS_SCR_X, y: -60, w: 2040 - GLASS_SCR_X, h: 1200 }, D_HER_GLASS - 2);
  layers.push(canvasLayer('cafe-glare', 'p3:cafe-glare', 512, 640, D_HER_GLASS - 2, glassW, (ctx, cw, ch) => paintGlare(ctx, cw, ch, 'cafe-glass')));
  // the chorus waves wipe her side (the glass), one per bar
  for (const [a, b, key] of CAFE_WAVES) {
    if (f >= a && f < b) {
      const p = waveP((f - a) / (b - a));
      layers.push(canvasLayer('cafe-wave', `p3:cafe-wave`, 640, 540, D_HER_GLASS - 3, glassW, (ctx, cw, ch) => paintGlassWave(ctx, cw, ch, p, f, key)));
    }
  }
  // him
  const hr = placeAt(HIS_PALM(), 0);
  const hair = sp('h-palm').hair as { x0: number; y0: number; x1: number; y1: number } | undefined;
  layers.push(charLayer('human', 'h-palm', hr, 0, sec(f), { breath: HUMAN_BREATH, hair: hair ? { ...hair, amp: 1.4, face: 'right' } : undefined, notes: true }));
  const nn = notesFor(f);
  if (nn > 0) {
    const bb = sp('h-palm').bbox as number[];
    const s = hr.w / sp('h-palm').w;
    layers.push(
      canvasLayer('his-notes', 'p3:his-notes', 400, 600, -1, { x: hr.x + (bb[0] as number) * s, y: hr.y + (bb[1] as number) * s, w: ((bb[2] as number) - (bb[0] as number)) * s, h: ((bb[3] as number) - (bb[1] as number)) * s }, (ctx, cw, ch) => {
        EXTRA_NOTES.slice(0, nn).forEach(([u, v, rot], i) => {
          const k = clamp01((f - ([F.daha1, F.daha2, F.wide][i] as number)) / 3);
          paintNote(ctx, u * cw, v * ch, 46 * (1.25 - 0.25 * k), rot, `p3:extra:${i}`);
        });
      }),
    );
  }
  // the hands invert for one beat where they meet (the approved crossing hint)
  if (f >= F.palms && f < F.invertBack) layers.push(...invertedHands());
  void cam;
  return layers;
};
// v2: two beats per wave (front one beat, retreat one beat), so the cream never sits on the glass for more than about
// a beat; each wave changes her pose while the glass is covered (3740, 3768) and is gone before the sung "daha" cut
// (3782), which stays a crisp cut with nothing over it.
const CAFE_WAVES: readonly [number, number, string][] = [
  // the glass is fully covered at the window's midpoint (painter p 0.75): exactly the pose change frame
  [F.reset0 - 14, F.reset0 + 14, 'cafe-w1'],
  [F.reach0 - 14, F.reach0 + 14, 'cafe-w2'],
];
/** Window progress -> painter progress: the front crosses in the first half, the cream retreats in the second half
 * (the painter's own split is 75/25, whose retreat crossed the glass in ~10 frames: an unlisted jump). */
const waveP = (u: number): number => (u < 0.5 ? (u / 0.5) * 0.75 : 0.75 + ((u - 0.5) / 0.5) * 0.25);

/** The two hands drawn from the colour-swapped sprites, clipped to their palm boxes. */
const invertedHands = (): Layer[] =>
  (['h-palm', 'a-palm'] as const).map((name) => {
    const r = name === 'h-palm' ? placeAt(HIS_PALM(), 0) : placeAt(HER_PALM(), D_HER_GLASS);
    const d = name === 'h-palm' ? -2 : D_HER_GLASS - 4;
    const s = r.w / sp(name).w;
    const pb = pt(name, 'palmBox');
    const pad = 10;
    const box: Rect = { x: r.x + ((pb[0] as number) - pad) * s, y: r.y + ((pb[1] as number) - pad) * s, w: ((pb[2] as number) + 2 * pad) * s, h: ((pb[3] as number) + 2 * pad) * s };
    return canvasLayer(`inv-${name}`, `p3:inv:${name}`, Math.round((pb[2] as number) + 2 * pad), Math.round((pb[3] as number) + 2 * pad), d, box, (ctx, cw, ch) => {
      ctx.drawImage(invertedSprite(name), (pb[0] as number) - pad, (pb[1] as number) - pad, cw, ch, 0, 0, cw, ch);
    });
  });

// ---------------------------------------------------------------------------------------------------------------
// The wide street (the last bar): the whole row in elevation, he small at the bakery window, her identical
// "Merhaba" reflections in every window and on every screen, the third wave rolling down the street. Then it folds.

const WIDE_PLATES = [1, 2, 3] as const;
/** The third wave rolls down the whole street and keeps rolling while the street folds; gone before the landing. */
const WAVE3_END = F.fold1 - 6;
/** World x of the third wave's front: from the street's left end to past its right end, F.wide..WAVE3_END. */
const wave3X = (f: number): number => plateX(1) - 300 + (PLATE_W * 3 + 900) * clamp01((f - F.wide) / (WAVE3_END - F.wide));
export const camWide = (f: number): Cam => {
  const c0 = plateX(2) + PLATE_W / 2;
  const u = sine(span(f, F.wide, F.fold1));
  const z = 2300 + 120 * (1 - u);
  // the plates' bottom edge (the end of their sidewalk) on the frame's bottom row: the folding paper has no road
  return { x: c0 - 120 + 60 * u, y: PLATE_Y + PLATE_H - 4 - ((H / 2) * (z + D_FAC)) / D0, z };
};
/** He stands at shops-a's bakery window (its 3rd window), small, palm on the glass (part 1's h-slide). */
const WIDE_WIN = (): Rect => onPlate(PLATE_I.shopsA, (sp('st-shops-a').windows as number[][])[2] as number[]);
const wideLayers = (f: number, cam: Cam, opts: { wave: boolean }): Layer[] => {
  const layers: Layer[] = [...skyLayers(f, cam), groundLayer()];
  const scr = SCREENS();
  const fig = getImgSafe('a-raise');
  scr.forEach((s, j) =>
    layers.push(
      canvasLayer(`tv-${j}`, `p3:tvw:${j}`, 220, 176, D_FAC + 1, onPlate(PLATE_I.tv, [(s[0] as number) - 3, (s[1] as number) - 3, (s[2] as number) + 6, (s[3] as number) + 6]), (ctx, cw, ch) =>
        paintTvScreen(ctx, cw, ch, fig(), { phase: 0.5, t: sec(f), fit: { sx: 0, sy: 0, sw: 295, sh: 560 }, seed: 'tvw' }),
      ),
    ),
  );
  layers.push(...STRIP.map((n, i) => imageLayer(`plate-${i}`, url(n), D_FAC, plateRect(i))).filter((_, i) => (WIDE_PLATES as readonly number[]).includes(i)));
  // her identical reflections in every ground-floor window (a-raise, the "Merhaba" pose), scaled to the window
  for (const i of WIDE_PLATES) {
    if (i === PLATE_I.tv) continue;
    const name = STRIP[i] as string;
    ((sp(name).windows as number[][] | undefined) ?? []).forEach((wr, j) => {
      const r = onPlate(i, wr);
      layers.push(
        canvasLayer(`wrefl-${i}-${j}`, `p3:wrefl:${i}:${j}`, 200, 240, D_FAC - 1, r, (ctx, cw, ch) => {
          const m = sp('a-raise');
          const s = (ch * 0.86) / m.h;
          ctx.globalAlpha = 0.85;
          ctx.drawImage(getImg(url('a-raise')), cw / 2 - (m.w * s) / 2, ch - m.h * s, m.w * s, m.h * s);
          ctx.globalAlpha = 1;
          paintGlare(ctx, cw, ch, `wglare-${j}`);
          // the third wave runs down the street window by window, wiping each glass and retreating
          if (opts.wave) {
            const p = waveP(clamp01((wave3X(f) - r.x) / (r.w * 2.2)));
            if (p > 0 && p < 1) paintGlassWave(ctx, cw, ch, p, f, `w3-${i}-${j}`);
          }
        }),
      );
    });
  }
  // him, small, at the bakery window (h-slide: palm on the glass)
  const win = WIDE_WIN();
  const m = sp('h-slide');
  const bb = m.bbox as number[];
  const feet = PLATE_Y + num('st-shops-a', 'sidewalkY') * PS + 30;
  const s = (feet - (win.y + win.h * 0.05)) / ((bb[3] as number) - (bb[1] as number)) / 1.25;
  const hr: Rect = { x: win.x + win.w * 0.18 - (bb[0] as number) * s, y: feet - (bb[3] as number) * s, w: m.w * s, h: m.h * s };
  layers.push(imageLayer('human', url('h-slide'), D_FAC - 40, placeAt({ ...projRect(cam, D_FAC, hr) }, D_FAC - 40, cam)));
  layers.push(...treeLayers());
  return layers;
};
const projRect = (cam: Cam, d: number, r: Rect): Rect => {
  const k = planeScale(cam, d);
  return { x: W / 2 + (r.x - cam.x) * k, y: H / 2 + (r.y - cam.y) * k, w: r.w * k, h: r.h * k };
};

// ---------------------------------------------------------------------------------------------------------------

export interface StreetStage {
  layers: Layer[];
  cam: Cam;
}
export const streetStage = (f: number): StreetStage => {
  if (f < F.tv) {
    const cam = camWalk(f);
    return { layers: walkLayers(f, cam), cam };
  }
  if (f < F.cafe) {
    const cam = camTv(f);
    return { layers: tvLayers(f, cam), cam };
  }
  if (f < F.wide) {
    const cam = cafeCam(f);
    return { layers: cafeLayers(f, cam), cam };
  }
  const cam = camWide(f);
  return { layers: wideLayers(f, cam, { wave: true }), cam };
};
/** The wide street frozen at frame f without the wave (the fold's paper; also the city's texture). */
export const wideStage = (f: number): StreetStage => {
  const cam = camWide(f);
  return { layers: wideLayers(f, cam, { wave: f < WAVE3_END }), cam };
};
/** Roof line of the folding paper in screen px at frame f: the top of the shop-front plates (incl. chimneys, coarse). */
export const wideRoofCut = (f: number): [number, number][] => {
  const cam = camWide(f);
  const k = planeScale(cam, D_FAC);
  const out: [number, number][] = [];
  for (const i of WIDE_PLATES) {
    const roof = num(STRIP[i] as string, 'roofY');
    const x0 = W / 2 + (plateX(i) - cam.x) * k;
    const x1 = x0 + PLATE_W * k;
    const y = H / 2 + (PLATE_Y + (roof - 6) * PS - cam.y) * k;
    out.push([x0, y], [x1, y]);
  }
  const first = out[0] as [number, number];
  const last = out[out.length - 1] as [number, number];
  const bottom = H / 2 + (PLATE_Y + PLATE_H - cam.y) * k;
  return [[first[0], bottom + 400], ...out, [last[0], bottom + 400]];
};

/** Screen boxes of the characters (for the type checks). */
export const streetCharacterNames = { walker: 'h-walk', refl: 'a-walk' };
void blink;
void skylineLayers;
void easeInOut;
