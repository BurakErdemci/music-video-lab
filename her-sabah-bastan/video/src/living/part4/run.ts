// Scene 12 (song 4676-4899): the bus doors part on the +9 dB hit (hard cut), he leaps out, and the run: a time-slice on a
// long night street (each wide beat is a new drawn pose at a new place, the camera tracks right at a constant speed),
// four close inserts (foot in a puddle x2, fist with the note, panting face) and three navy/cream flips on the
// downbeats that each leave one crack across the whole frame. Running is not animated: poses change by cuts, the
// camera and the world carry the motion.
import { paintLayers } from '../compose2d.ts';
import { paintSweat } from '../icons.ts';
import { palette } from '../../style/palette.ts';
import {
  canvasLayer,
  charLayer,
  clamp01,
  easeInOut,
  easeOut,
  H,
  hasSprite,
  headOf,
  imageLayer,
  lerp,
  placeAt,
  planeScale,
  pointAt,
  pose,
  sp,
  span,
  spriteRectAt,
  spriteUrls,
  url,
  W,
  D0,
  type Cam,
  type Layer,
  type Painter,
  type Rect,
  type Shot,
} from './common.ts';
import { aiLayers, HUMAN_BREATH, tintedSprite } from './figures.ts';
import { paintCracks } from './cracks.ts';
import { paintAsphalt, paintBreath, paintDoorLeaves, paintFarRoofs, paintFeetStreak, paintMoon, paintNightSky, paintNoteFlutter, paintSplash } from './runFx.ts';

export const RUN_IMAGES: readonly string[] = [
  ...spriteUrls(['h-leap', 'h-run1', 'h-run2', 'h-run3', 'a-run', 'bus-door', 'ins-foot', 'ins-fist', 'ins-face'].map(pose)),
  ...spriteUrls(['st-shops-a', 'st-shops-b', 'st-lamp', 'st-tree']),
];

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

// ---------------------------------------------------------------------------------------------------------------
// Timeline (song frames).

const DOORS_END = 4704;
const WIDE = [4704, 4732, 4746, 4774, 4788, 4802, 4830, 4844, 4858, 4886] as const;
const INSERTS = [
  { f: 4718, kind: 'foot', dir: [46, 28] },
  { f: 4760, kind: 'fist', dir: [40, -22] },
  { f: 4816, kind: 'face', dir: [-20, 14] },
  { f: 4872, kind: 'foot', dir: [-62, -26] },
] as const;
const INSERT_LEN = 14;
const FLIPS = [4732, 4788, 4844] as const;
const RUN_POSES = ['h-run1', 'h-run2', 'h-run3'] as const;

const wideIdxAt = (f: number): number => {
  let r = 0;
  WIDE.forEach((w, i) => {
    if (w <= f) r = i;
  });
  return r;
};
const insertAt = (f: number): (typeof INSERTS)[number] | null => INSERTS.find((i) => f >= i.f && f < i.f + INSERT_LEN) ?? null;

// ---------------------------------------------------------------------------------------------------------------
// The night street (world units). One camera: x tracks right, y fixed, z a very slight push.

const CAM0 = 6000;
const V = 980;
const TAU = 0.3;
const KR = (d: number): number => planeScale({ x: 0, y: 0, z: D0 }, d);
const D_FAC = 400;
const PS = 0.7 / KR(D_FAC);
const PW = 1672 * PS;
const PH = 941 * PS;
const GAP = 420;
const PERIOD = 2 * PW + GAP;
/** Plate bottom sits at screen y 860 under the reference camera. */
const PLATE_Y = 540 + (860 - 540) / KR(D_FAC) - PH;
const MOON = { x: 1130, y: 250, r: 140 };
const GROUND_Y = 935;
const LAMP_PERIOD = 3100;

const wideCam = (f: number): Cam => {
  const tt = Math.max(0, (f - 4704) / 30);
  const x = CAM0 + V * (tt + TAU * (Math.exp(-tt / TAU) - 1));
  return { x, y: 540, z: 1000 - 25 * easeInOut(clamp01(tt / 7)) };
};

interface Slot {
  x: number;
  name: string | null;
}
const slotsIn = (xmin: number, xmax: number): Slot[] => {
  const out: Slot[] = [];
  for (let p = Math.floor(xmin / PERIOD) - 1; p <= Math.floor(xmax / PERIOD) + 1; p++) {
    const first = p % 2 === 0 ? 'st-shops-a' : 'st-shops-b';
    const second = p % 2 === 0 ? 'st-shops-b' : 'st-shops-a';
    out.push({ x: p * PERIOD, name: first }, { x: p * PERIOD + PW, name: second }, { x: p * PERIOD + 2 * PW, name: null });
  }
  return out.filter((s) => s.x + (s.name ? PW : GAP) > xmin && s.x < xmax);
};
const range = (cam: Cam, d: number, pad = 1.06): [number, number] => {
  const half = (W / 2 / planeScale(cam, d)) * pad;
  return [cam.x - half, cam.x + half];
};
const lampXs = (xmin: number, xmax: number): number[] => {
  const out: number[] = [];
  for (let i = Math.floor(xmin / LAMP_PERIOD) - 1; i <= Math.floor(xmax / LAMP_PERIOD) + 1; i++) out.push(i * LAMP_PERIOD + 700);
  return out;
};
const D_LAMP = -330;

const STRIPS = [
  { band: 0, d: D_FAC + 1, ya: 820, yb: 938 },
  { band: 1, d: 150, ya: 930, yb: 1010 },
  { band: 2, d: -100, ya: 1000, yb: 1090 },
] as const;
const SC_W = 2000;

const streetLayers = (f: number, cam: Cam, lamps: boolean): Layer[] => {
  const out: Layer[] = [];
  // sky + stars (follows the camera, stars drift a hair)
  const ks = planeScale(cam, 4000);
  const sw = (W / ks) * 1.2;
  const sh = (H / ks) * 1.2;
  out.push(canvasLayer('sky', 'p4run:sky', 1408, 792, 4000, { x: cam.x - sw / 2, y: cam.y - sh / 2, w: sw, h: sh }, (ctx, cw, ch) => paintNightSky(ctx, cw, ch, (cam.x - CAM0) * 0.02)));
  // the moon: large, far, follows him (it barely moves on screen)
  const kmr = KR(1600);
  const mx = cam.x + (MOON.x - W / 2) / kmr - 0.015 * (cam.x - CAM0);
  const my = 540 + (MOON.y - 540) / kmr;
  const msz = 440 / kmr;
  out.push(canvasLayer('moon', 'p4run:moon', 440, 440, 1600, { x: mx - msz / 2, y: my - msz / 2, w: msz, h: msz }, (ctx, cw) => paintMoon(ctx, cw, MOON.r)));
  // far roofs
  const kf = KR(1500);
  const tileW = 1200 / kf;
  const [fx0, fx1] = range(cam, 1500);
  for (let t = Math.floor(fx0 / tileW); t <= Math.floor(fx1 / tileW); t++)
    out.push(canvasLayer(`far-${t & 7}`, `p4run:far:${((t % 8) + 8) % 8}`, 1200, 720, 1500, { x: t * tileW, y: 540 + (150 - 540) / kf, w: tileW + 1, h: 720 / kf }, (ctx, cw, ch) => paintFarRoofs(ctx, cw, ch, ((t % 8) + 8) % 8)));
  // facades, trees
  const [px0, px1] = range(cam, D_FAC, 1.3);
  const slots = slotsIn(px0, px1);
  const tm = sp('st-tree');
  const ts = 0.76;
  const kt = KR(230);
  slots.forEach((s) => {
    if (s.name) out.push(imageLayer(`fac-${s.x}`, url(s.name), D_FAC, { x: s.x, y: PLATE_Y, w: PW + 1, h: PH }));
    else {
      const cx = s.x + GAP / 2;
      const base = 540 + (822 - 540) / kt;
      out.push(imageLayer(`tree-${s.x}`, url('st-tree'), 230, { x: cx - (tm.w * ts) / 2, y: base - (tm.baseY as number) * ts, w: tm.w * ts, h: tm.h * ts }));
    }
  });
  // the pavement along the whole street (fills the gaps between the plates' own pavements)
  const kp = KR(D_FAC + 2);
  out.push(
    canvasLayer('pave', 'p4run:pave', SC_W, 60, D_FAC + 2, { x: cam.x - SC_W / 2 / kp, y: 540 + (770 - 540) / kp, w: SC_W / kp, h: 60 / kp }, (ctx, cw, ch) => {
      ctx.fillStyle = palette.cream;
      ctx.fillRect(0, 0, cw, ch - 10);
      ctx.fillStyle = palette.navy;
      ctx.fillRect(0, ch - 10, cw, 10);
      ctx.fillStyle = 'rgba(24,32,58,0.5)';
      for (let wx = Math.floor((cam.x - SC_W / 2 / kp) / 230) * 230; wx < cam.x + SC_W / 2 / kp; wx += 230) ctx.fillRect(SC_W / 2 + (wx - cam.x) * kp, 0, 2, ch - 10);
    }),
  );
  // wet asphalt strips
  const lampList = lampXs(...range(cam, D_LAMP, 1.5));
  for (const st of STRIPS) {
    const k = KR(st.d);
    const ch = st.yb - st.ya;
    const streaks: { x: number; w: number; yellow: boolean }[] = [];
    for (const s of slotsIn(...range(cam, D_FAC, 1.6))) {
      if (!s.name) continue;
      const wins = (sp(s.name).windows as number[][]) ?? [];
      wins.forEach((wn, i) => {
        const r = ((s.x * 7 + i * 13) % 17) / 17;
        if (r < 0.2) return;
        const cx = s.x + (wn[0] as number) * PS + ((wn[2] as number) * PS) / 2;
        const base = (SC_W / 2) + (cx - cam.x) * k;
        const w = Math.min(78, Math.max(18, (wn[2] as number) * PS * k * 0.17));
        streaks.push({ x: base, w, yellow: r < 0.75 });
        if ((wn[2] as number) > 300) {
          streaks.push({ x: base - (wn[2] as number) * PS * k * 0.3, w: w * 0.6, yellow: true });
          streaks.push({ x: base + (wn[2] as number) * PS * k * 0.3, w: w * 0.6, yellow: r > 0.5 });
        }
      });
    }
    const pools = st.band > 0 ? lampList.map((lx) => SC_W / 2 + (lx - cam.x) * KR(D_LAMP)) : [];
    const puddles: { x: number; w: number }[] = [];
    if (st.band > 0) {
      const cell = 520;
      const [a, b] = range(cam, st.d, 1.5);
      for (let c = Math.floor(a / cell); c <= Math.floor(b / cell); c++) {
        const rr = (((c * 2654435761 + st.band * 40503) >>> 0) % 1000) / 1000;
        const r2 = (((c * 40503 + st.band * 977) >>> 0) % 1000) / 1000;
        if (rr < 0.45) continue;
        puddles.push({ x: SC_W / 2 + ((c + r2) * cell - cam.x) * k, w: (190 + rr * 220) * (0.75 + 0.25 * st.band) });
      }
    }
    // the moon's screen x, as a canvas x of this strip
    const moonScr = W / 2 + (mx - cam.x) * planeScale(cam, 1600);
    const mxc = moonScr - W / 2 + SC_W / 2;
    out.push(
      canvasLayer(
        `asph-${st.band}`,
        `p4run:asph:${st.band}`,
        SC_W,
        ch,
        st.d,
        { x: cam.x - SC_W / 2 / k, y: 540 + (st.ya - 540) / k, w: SC_W / k, h: ch / k },
        (ctx, cw, c2) => paintAsphalt(ctx, cw, c2, { band: st.band, streaks, pools, puddles, moonX: mxc, phase: -cam.x * k }, `asph${st.band}`),
      ),
    );
  }
  if (lamps) {
    const lm = sp('st-lamp');
    const kl = KR(D_LAMP);
    const ls = 0.518;
    lampList.forEach((lx) => out.push(imageLayer(`lamp-${lx}`, url('st-lamp'), D_LAMP, { x: lx - (lm.w * ls) / 2, y: 540 + (1060 - 540) / kl - (lm.baseY as number) * ls, w: lm.w * ls, h: lm.h * ls })));
  }
  void f;
  return out;
};

// ---------------------------------------------------------------------------------------------------------------
// Him (and her on the flip frames).

const HEAD_PX = 108;
const headHeight = (name: string): number => headOf(name)?.h ?? (sp(name).headPx as number | undefined) ?? 140;
const feetOf = (name: string): { px: number; py: number } => {
  const m = sp(name);
  const b = m.bbox as number[];
  return { px: (m.hipX as number | undefined) ?? (b[0] + b[2]) / 2, py: (m.floorY as number | undefined) ?? (b[3] as number) };
};
const hipScreenX = (idx: number): number => 560 + 30 * idx;

const hisLayers = (f: number, cam: Cam, idx: number): Layer[] => {
  const name = pose(RUN_POSES[idx % 3] as string);
  const m = sp(name);
  const k0 = planeScale(cam, 0);
  const s = HEAD_PX / headHeight(name) / k0;
  const { px, py } = feetOf(name);
  const [xw, yw] = pointAt(hipScreenX(idx), GROUND_Y, 0, { x: cam.x, y: 540, z: cam.z });
  const r = spriteRectAt(name, s, px, py, xw, yw);
  const hair = m.hair as { x0: number; y0: number; x1: number; y1: number } | undefined;
  return [
    canvasLayer('feet-streak', 'p4run:feetstreak', 160, 220, 1, { x: xw - 80 / k0, y: yw - 6 / k0, w: 160 / k0, h: 220 / k0 }, (ctx, cw, ch) => paintFeetStreak(ctx, cw, ch)),
    charLayer('human', name, r, 0, f / 30, { breath: { ...HUMAN_BREATH, amp: 0.014, period: 0.8, phase: idx * 0.31 }, hair: hair ? { ...hair, amp: 2.4, face: 'right' } : undefined, notes: true }),
  ];
};

const herLayers = (f: number, cam: Cam, idx: number): Layer[] => {
  const name = pose('a-run');
  const k0 = planeScale(cam, 0);
  const s = HEAD_PX / headHeight(name) / k0;
  const { py } = feetOf(name);
  const b = sp(name).bbox as number[];
  const [xw, yw] = pointAt(hipScreenX(idx) - 330, GROUND_Y - 8, 0, { x: cam.x, y: 540, z: cam.z });
  const r = spriteRectAt(name, s, (b[0] + b[2]) / 2, py, xw, yw, false);
  const shadow = canvasLayer('her-shadow', `p4run:hershadow:${name}`, sp(name).w, sp(name).h, 2, { x: r.x + 7 / k0, y: r.y + 5 / k0, w: r.w, h: r.h }, (ctx, cw, ch) => {
    ctx.globalAlpha = 0.55;
    ctx.drawImage(tintedSprite(`${name}-noeye`, palette.navy), 0, 0, cw, ch);
  });
  return [shadow, ...aiLayers('her', name, r, 1, f, { still: true })];
};

const wideLayers = (f: number, cam: Cam, idx: number): Layer[] => [...streetLayers(f, cam, true), ...hisLayers(f, cam, idx)];

const crackOverlay: (f: number) => Painter = (f) => (ctx) => paintCracks(ctx, f);

const wideShot = (f: number): Shot => {
  const cam = wideCam(f);
  return { kind: 'stage', layers: wideLayers(f, cam, wideIdxAt(f)), cam, overlay: crackOverlay(f) };
};

// ---------------------------------------------------------------------------------------------------------------
// The flips: the whole frame navy <-> cream, the yellow plate printed off register.

const scratch: HTMLCanvasElement[] = [];
const scr = (i: number, w: number, h: number): HTMLCanvasElement => {
  let c = scratch[i];
  if (!c) {
    c = document.createElement('canvas');
    scratch[i] = c;
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
};
const NAVY = [0x18, 0x20, 0x3a];
const CREAM = [0xf3, 0xef, 0xe4];

/** Paints the normal wide frame `f` (no cracks) on ctx. */
const paintWide = (ctx: Ctx, f: number, w: number, h: number): void => {
  const cam = wideCam(f);
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, 0, w, h);
  paintLayers(ctx, wideLayers(f, cam, wideIdxAt(f)), cam, f, w, h);
};

/** The frame with navy and cream swapped (yellow stays) and the yellow plate moved 14 px right, 9 px up. */
const paintInverted = (ctx: Ctx, f: number, w: number, h: number): void => {
  const a = scr(0, w, h);
  const actx = a.getContext('2d', { willReadFrequently: true }) as Ctx;
  paintWide(actx, f, w, h);
  const im = actx.getImageData(0, 0, w, h);
  const p = im.data;
  const yim = new ImageData(w, h);
  const yp = yim.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i] as number;
    const g = p[i + 1] as number;
    const b = p[i + 2] as number;
    if (r > 170 && g > 150 && b < 140) {
      yp[i] = r;
      yp[i + 1] = g;
      yp[i + 2] = b;
      yp[i + 3] = 255;
      p[i] = CREAM[0] as number;
      p[i + 1] = CREAM[1] as number;
      p[i + 2] = CREAM[2] as number;
      continue;
    }
    const l = clamp01((0.299 * r + 0.587 * g + 0.114 * b - 33) / (236 - 33));
    p[i] = Math.round((CREAM[0] as number) + ((NAVY[0] as number) - (CREAM[0] as number)) * l);
    p[i + 1] = Math.round((CREAM[1] as number) + ((NAVY[1] as number) - (CREAM[1] as number)) * l);
    p[i + 2] = Math.round((CREAM[2] as number) + ((NAVY[2] as number) - (CREAM[2] as number)) * l);
  }
  actx.putImageData(im, 0, 0);
  const y = scr(1, w, h);
  (y.getContext('2d') as Ctx).putImageData(yim, 0, 0);
  ctx.drawImage(a, 0, 0);
  ctx.drawImage(y, 14, -9);
};

const flipFrame = (f: number, d: number): Shot => ({
  kind: 'flat',
  paint: (ctx, w, h) => {
    paintInverted(ctx, f, w, h);
    if (f === d) {
      const cam = wideCam(f);
      paintLayers(ctx, herLayers(f, cam, wideIdxAt(f)), cam, f, w, h);
    }
    paintCracks(ctx, f);
  },
});

const shiftBack = (f: number, d: number): Shot => {
  const k = f - (d + 4);
  return {
    kind: 'gl',
    fx: 'plate',
    p: (k + 0.5) / 10,
    seconds: 10 / 30,
    time: k / 30,
    from: (ctx, w, h) => paintInverted(ctx, f, w, h),
    to: (ctx, w, h) => paintWide(ctx, f, w, h),
    peel: [0.02, 0.8, 0.02, 0.8],
    lay: [0.1, 0.88, 0.1, 0.88],
    snap: [0.55, 0.92, 0.6, 0.96],
    overlay: crackOverlay(f),
  };
};

/** The run picture at frame f in 2D incl. the cracks (the flood's InkBleed `from` side; works past 4899 by continuing the last wide shot's camera). */
export const runStagePainter = (f: number): Painter => (ctx, w, h) => {
  paintWide(ctx, f, w, h);
  paintCracks(ctx, f);
};

// ---------------------------------------------------------------------------------------------------------------
// Inserts: full-frame close plates with a small push (1.0 -> 1.06) and code-drawn action on top.

const PLATE_RECT = (): Rect => ({ x: 0, y: 0, w: W, h: H });
const FALLBACK = {
  splash: [830, 585],
  puddle: [0, 590, 1672, 941],
  note: [1235, 128, 1600, 500],
  fist: [820, 470],
  mouth: [800, 560],
} as const;
const key = <T extends readonly number[]>(name: string, k: string, fb: T): number[] => {
  const v = sp(name)[k];
  return Array.isArray(v) && typeof v[0] === 'number' ? (v as number[]) : [...fb];
};
const fxLayer = (id: string, paint: (ctx: Ctx) => void): Layer => canvasLayer(id, `p4run:${id}`, 1672, 941, -1, PLATE_RECT(), (ctx) => paint(ctx));

const insertShot = (f: number, ins: (typeof INSERTS)[number]): Shot => {
  const fi = f - ins.f;
  const u = (fi + 1) / INSERT_LEN;
  const names = { foot: 'ins-foot', fist: 'ins-fist', face: 'ins-face' } as const;
  const name = pose(names[ins.kind]);
  const layers: Layer[] = [imageLayer('ins-plate', url(name), 0, PLATE_RECT())];
  if (ins.kind === 'foot') {
    const splash = key(name, 'splash', FALLBACK.splash);
    const puddle = key(name, 'puddle', FALLBACK.puddle);
    layers.push(fxLayer('ins-splash', (ctx) => paintSplash(ctx, fi, splash as [number, number], puddle, `splash:${ins.f}`)));
  } else if (ins.kind === 'fist') {
    const note = key(name, 'note', FALLBACK.note);
    layers.push(fxLayer('ins-flutter', (ctx) => paintNoteFlutter(ctx, f, note, 'streaks')));
  } else {
    const mouth = key(name, 'mouth', FALLBACK.mouth);
    const m = sp(name);
    const hd = typeof m.headH === 'number' ? m.headH : 400;
    const ht = Array.isArray(m.headTop) ? (m.headTop as number[]) : [mouth[0] as number, typeof m.headTop === 'number' ? m.headTop : (mouth[1] as number) - hd * 0.8];
    layers.push(fxLayer('ins-breath', (ctx) => paintBreath(ctx, fi, mouth as [number, number], hd * 0.5)));
    const sx = (ht[0] as number) + hd * 0.72;
    const sy = (ht[1] as number) + hd * 0.28;
    layers.push(
      canvasLayer('ins-sweat', 'p4run:sweat', 360, 360, -2, { x: sx - 180, y: sy - 180, w: 360, h: 360 }, (ctx, cw, ch) =>
        paintSweat(ctx, cw, ch, fi * 0.05, { fall: span(fi, 5, 13), out: span(fi, 10, 14) }),
      ),
    );
  }
  const e = easeOut(u);
  const cam: Cam = { x: W / 2 + ins.dir[0] * e, y: H / 2 + ins.dir[1] * e, z: D0 / lerp(1, 1.06, u) };
  return { kind: 'stage', layers, cam, overlay: crackOverlay(f) };
};

// ---------------------------------------------------------------------------------------------------------------
// 4676-4703: the bus doors.

const REFD: Cam = { x: CAM0, y: 540, z: D0 };
const SX = W / 1672;
const SY = H / 941;
const doorsShot = (f: number): Shot => {
  const fi = f - 4676;
  const bus = pose('bus-door');
  const m = sp(bus);
  const dw = (Array.isArray(m.doorway) ? m.doorway : [720, 100, 1560, 580]) as number[];
  const [dx0, dy0, dx1, dy1] = dw as [number, number, number, number];
  const stepY = typeof m.stepY === 'number' ? m.stepY : dy1;
  // door opening: 25 % at the cut, fully slid by ~4684 with a small overshoot onto the stops
  const o = Math.min(0.9, 0.225 + 0.675 * easeOut(fi / 7)) + 0.06 * Math.sin(Math.PI * clamp01((fi - 5) / 7));
  const u = clamp01(fi / 27);
  const dcx = ((dx0 + dx1) / 2) * SX;
  const dcy = ((dy0 + dy1) / 2) * SY;
  const pu = 1 - (1 - u) * (1 - u);
  const cam: Cam = { x: lerp(CAM0, CAM0 + (dcx - W / 2) * 0.8, pu), y: lerp(540, 540 + (dcy - 540) * 0.7, pu), z: lerp(1000, 800, pu) };
  // the plate carries the night street in its doorway; him and the door leaves (code) go over it, clipped to the doorway
  const layers: Layer[] = [imageLayer('bus', url(bus), 0, placeAt({ x: 0, y: 0, w: W, h: H }, 0, REFD))];
  const hn = pose('h-leap');
  const hm = sp(hn);
  const b = hm.bbox as number[];
  const sScr = (0.8 * (dy1 - dy0) * SY) / ((b[3] as number) - (b[1] as number));
  const [hx, hy] = pointAt(dcx, stepY * SY, -1, REFD);
  const py = (hm.floorY as number | undefined) ?? (b[3] as number);
  const r = spriteRectAt(hn, sScr / KR(-1), (b[0] + b[2]) / 2, py, hx, hy);
  const hair = hm.hair as { x0: number; y0: number; x1: number; y1: number } | undefined;
  layers.push(charLayer('human', hn, r, -1, f / 30, { breath: { ...HUMAN_BREATH, amp: 0.014, period: 0.8 }, hair: hair ? { ...hair, amp: 2.4, face: 'right' } : undefined, notes: true }));
  const rect = placeAt({ x: dx0 * SX, y: dy0 * SY, w: (dx1 - dx0) * SX, h: (dy1 - dy0) * SY }, -2, REFD);
  layers.push(canvasLayer('door-leaves', 'p4run:doors', Math.round(dx1 - dx0), Math.round(dy1 - dy0), -2, rect, (ctx, cw, ch) => paintDoorLeaves(ctx, cw, ch, o)));
  // the +9 dB hit: a cream flash that dies in three frames
  const flash = Math.max(0, 1 - fi / 3) * 0.28;
  return {
    kind: 'stage',
    layers,
    cam,
    overlay: (ctx, w, h) => {
      if (flash <= 0) return;
      ctx.fillStyle = `rgba(243,239,228,${flash.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    },
  };
};
void hasSprite;

// ---------------------------------------------------------------------------------------------------------------

export const runShot = (f: number): Shot => {
  if (f < DOORS_END) return doorsShot(f);
  const ins = insertAt(f);
  if (ins) return insertShot(f, ins);
  const d = FLIPS.find((x) => f >= x && f < x + 14);
  if (d !== undefined) {
    if (f - d < 4) return flipFrame(f, d);
    return shiftBack(f, d);
  }
  return wideShot(f);
};
