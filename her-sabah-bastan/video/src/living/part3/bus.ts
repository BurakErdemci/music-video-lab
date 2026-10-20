// Scene 11 (bridge, female, the quietest part, song 4341-4676): the night bus. One held seated pose with breathing
// (one pose cut at the end: he looks up); she exists only as a cream reflection in the window, back to back with his
// reflection; his breath fogs the glass; her fingertip draws a small heart in it, lowers her hand and watches while the
// heart slowly evaporates into halftone dots (she fades with its last dots: she forgets); he looks up: his stop.
import { palette } from '../../style/palette.ts';
import { paintBusWindow, paintGlassRain, heartTip } from './busWindow.ts';
import { aiLayers, HUMAN_BREATH, tintedSprite } from './figures.ts';
import { skin, solveArm, TIP as FINGER_TIP, type Rig } from './fingerRig.ts';
import { paintCharacter } from '../life.ts';
import { F, H, W, LIFT_PAD, canvasLayer, charLayer, clamp01, easeInOut, getImg, imageLayer, mixCam, placeAt, pt, sec, sine, sp, span, url, type Cam, type Layer, type Rect } from './common.ts';

const D_BUS = 0;
/** The plate fills the frame with a little margin for the camera. */
const BUS_SCR: Rect = { x: -40, y: -24, w: 2000, h: 2000 * (941 / 1672) };
const K = BUS_SCR.w / 1672;
const BUS_W = placeAt(BUS_SCR, D_BUS);
/** Plate px -> world (on the plate's plane; the reference camera sees world = screen at d = 0). */
const P = (x: number, y: number): [number, number] => [BUS_SCR.x + x * K, BUS_SCR.y + y * K];

const QUAD = sp('bus-int').window as number[][];
const QX0 = Math.min(...QUAD.map((q) => q[0] as number));
const QX1 = Math.max(...QUAD.map((q) => q[0] as number));
const QY0 = 0;
const QY1 = Math.max(...QUAD.map((q) => q[1] as number)) + 6;
/** Canvas px per plate px of the window canvas. */
const WK = 1.25;
const WIN_RECT: Rect = (() => {
  const [x0, y0] = P(QX0 - 4, QY0 - 4);
  const [x1, y1] = P(QX1 + 4, QY1 + 4);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
})();
const CW = Math.round((QX1 - QX0 + 8) * WK);
const CH = Math.round((QY1 - QY0 + 8) * WK);
/** Plate px -> window-canvas px. */
const C = (x: number, y: number): [number, number] => [(x - QX0 + 4) * WK, (y - QY0 + 4) * WK];
/** Left edge of the glass (plate px) at height y: the line BL -> TL. */
const glassLeftX = (y: number): number => {
  const tl = QUAD[0] as number[];
  const bl = QUAD[3] as number[];
  const u = ((y - (tl[1] as number)) / ((bl[1] as number) - (tl[1] as number)));
  return (tl[0] as number) + ((bl[0] as number) - (tl[0] as number)) * u;
};

// ---- him

type Pose = 'hb-lean' | 'hb-lookup';
const poseAt = (f: number): Pose => (f < F.lookUp ? 'hb-lean' : 'hb-lookup');
const humanRect = (pose: Pose): Rect => {
  const fit = sp(pose).fit as { scale: number; dx: number; dy: number };
  const [x, y] = P(fit.dx, fit.dy);
  return { x, y, w: sp(pose).w * fit.scale * K, h: sp(pose).h * fit.scale * K };
};
/** A plate-px point of his drawing (sprite point through the fit). */
const humanPt = (pose: Pose, k: string): [number, number] => {
  const fit = sp(pose).fit as { scale: number; dx: number; dy: number };
  const p = pt(pose, k);
  return [fit.dx + (p[0] as number) * fit.scale, fit.dy + (p[1] as number) * fit.scale];
};
/** Small head moves inside the held pose: a slow nod with the bus's sway, a lift of the head on the fog. */
const humanLayer = (f: number): Layer => {
  const pose = poseAt(f);
  const r = humanRect(pose);
  const sway = 0.5 * Math.sin(sec(f) * 1.7) + 0.3 * Math.sin(sec(f) * 0.6 + 1);
  const rr = placeAt(r, D_MAN);
  const o = { breath: { ...HUMAN_BREATH, amp: 0.012, period: 4.4 }, notes: true };
  const extra = { rot: sway, pivot: [rr.x + rr.w * 0.25, rr.y + rr.h * 0.65] as [number, number] };
  if (pose !== 'hb-lookup') return charLayer('human', pose, rr, D_MAN, sec(f), o, extra);
  const m = sp(pose);
  const t = sec(f);
  return { id: 'human', src: { kind: 'canvas', key: 'human:hb-lookup-empty', cw: m.w, ch: m.h + LIFT_PAD, paint: (ctx, cw, ch) => paintCharacter(ctx, cw, ch, emptyHandLookup(), { t, ...o }) }, d: D_MAN, ...rr, ...extra };
};
/** hb-lookup without the card in his hand (the drawing holds the note she no longer hands over): its yellow pixels near
 * the hand are cleared once; the sticky notes on his back are far from that box and stay. */
let lookupEmpty: HTMLImageElement | null = null;
const emptyHandLookup = (): HTMLImageElement => {
  if (lookupEmpty) return lookupEmpty;
  const img = getImg(url('hb-lookup'));
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.drawImage(img, 0, 0);
  const n = pt('hb-lookup', 'note');
  const x0 = Math.max(0, (n[0] as number) - 4);
  const y0 = Math.max(0, (n[1] as number) - 8);
  const w = (n[2] as number) + 14;
  const h = (n[3] as number) + 16;
  const d = g.getImageData(x0, y0, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i] as number;
    const b = d.data[i + 2] as number;
    if (r > 150 && r - b > 55) d.data[i + 3] = 0;
  }
  g.putImageData(d, x0, y0);
  Object.defineProperty(c, 'naturalWidth', { value: c.width });
  Object.defineProperty(c, 'naturalHeight', { value: c.height });
  lookupEmpty = c as unknown as HTMLImageElement;
  return lookupEmpty;
};

// ---- the window: outside, reflections, fog, heart, rain

/** The breath patch, plate px: just in front of his mouth on the glass. */
const MOUTH = humanPt('hb-lean', 'mouth');
const FOG = { x: MOUTH[0] + 120, y: MOUTH[1] - 10, r: 120 };
const HEART = { x: FOG.x + 22, y: FOG.y - 26, size: 90 };
/** Travel of the scenery (px of the near layer): constant speed, then the bus brakes into the stop. */
const SPEED = 19;
const BRAKE0 = F.reach - 10;
const BRAKE1 = F.lookUp + 4;
const travelAt = (f: number): number => {
  const a = Math.min(f, BRAKE0) - F.bus;
  if (f <= BRAKE0) return SPEED * a;
  const n = BRAKE1 - BRAKE0;
  const u = clamp01((f - BRAKE0) / n);
  return SPEED * (BRAKE0 - F.bus) + SPEED * n * (u - (u * u) / 2);
};
const speedAt = (f: number): number => SPEED * (1 - clamp01((f - BRAKE0) / (BRAKE1 - BRAKE0)));

type AiPose = 'a-read' | 'a-finger';
const aiPoseAt = (f: number): AiPose => (f < F.heart ? 'a-read' : 'a-finger');
/** Her reflection's scale: head ~ 104 plate px. Heads: a-read ~240 (part 1), finger 163. */
const AI_HEAD: Record<AiPose, number> = { 'a-read': 240, 'a-finger': 163 };
const aiScale = (n: AiPose): number => 104 / AI_HEAD[n];
const SIT_Y = 690; // the sill line under the reflections (plate px)
/** Her rect in plate px. Sitting back to back: her back (right edge) against his reflection's back at BACK_X. */
const BACK_X = 1090;
/** Centre of the heart's outline (plate px): the heart is drawn around it, her rest fingertip sits just off it. */
const HEART_C: [number, number] = (() => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= 200; i++) {
    const q = heartTip(HEART, i / 200);
    xs.push(q[0]);
    ys.push(q[1]);
  }
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
})();
/**
 * Drawing the heart: her body holds (a small lean that follows the hand, plus a slow sway) and the arm does the
 * drawing (two bones, see fingerRig.ts), so the fingertip IS the pen: it stays on the stroke tip for the whole
 * stroke. After the stroke the finger lifts off the glass back to its rest place. All plate px / sprite px, continuous in f.
 */
const fingerPose = (f: number): { ox: number; oy: number; rig: Rig; tipPlate: [number, number]; pen: [number, number] } => {
  const s = aiScale('a-finger');
  const rest: [number, number] = [HEART_C[0], HEART_C[1] - 20 * s];
  const p = clamp01((f - F.heart) / (F.heartDone - F.heart));
  const lift = sine(span(f, F.heartDone, F.heartDone + 8));
  const pen = heartTip(HEART, p);
  const tgt: [number, number] = [pen[0] + (rest[0] - pen[0]) * lift, pen[1] + (rest[1] - pen[1]) * lift];
  const dx = (tgt[0] - rest[0]) / s;
  const dy = (tgt[1] - rest[1]) / s;
  const sway = 1.5 * Math.sin(sec(f) * 1.3);
  const b: [number, number] = [0.5 * dx + sway, 0.4 * dy + 0.4 * sway];
  const rig = solveArm([FINGER_TIP[0] + dx, FINGER_TIP[1] + dy], b);
  const ox = rest[0] - FINGER_TIP[0] * s;
  const oy = rest[1] - FINGER_TIP[1] * s;
  const tp = skin(FINGER_TIP[0], FINGER_TIP[1], rig);
  return { ox, oy, rig, tipPlate: [ox + tp[0] * s, oy + tp[1] * s], pen: tgt };
};
/** Her drawing arm posed by the rig, drawn at full alpha into an offscreen canvas (the caller applies the reflection alpha). */
const MARGIN = { l: 160, t: 120, r: 60, b: 60 };
const MESH = { x0: 0, x1: 300, y0: 140, y1: 470, step: 12 };
const paintFingerPose = (f: number, unit: number): HTMLCanvasElement => {
  const m = sp('a-finger');
  const { rig } = fingerPose(f);
  const off = document.createElement('canvas');
  off.width = Math.ceil((m.w + MARGIN.l + MARGIN.r) * unit);
  off.height = Math.ceil((m.h + MARGIN.t + MARGIN.b) * unit);
  const g = off.getContext('2d') as CanvasRenderingContext2D;
  const img = getImg(url('a-finger'));
  // everything outside the mesh box holds with the torso (just the body lean)
  g.save();
  g.setTransform(unit, 0, 0, unit, (MARGIN.l + rig.b[0]) * unit, (MARGIN.t + rig.b[1]) * unit);
  g.beginPath();
  g.rect(-1000, -1000, 4000, 4000);
  g.rect(MESH.x0 - 1000, MESH.y0 + 8, MESH.x1 - MESH.x0 + 1000 - 8, MESH.y1 - MESH.y0 - 16);
  g.clip('evenodd');
  g.drawImage(img, 0, 0);
  g.restore();
  // the mesh box: every cell warped by the skinning (continuous, so no seams except antialiasing, covered by a half-px grow)
  const nx = Math.round((MESH.x1 - MESH.x0) / MESH.step);
  const ny = Math.round((MESH.y1 - MESH.y0) / MESH.step);
  const pos = (i: number, j: number): [number, number] => {
    const q = skin(MESH.x0 + i * MESH.step, MESH.y0 + j * MESH.step, rig);
    return [(MARGIN.l + q[0]) * unit, (MARGIN.t + q[1]) * unit];
  };
  const tri = (s0: [number, number], s1: [number, number], s2: [number, number], d0: [number, number], d1: [number, number], d2: [number, number]): void => {
    const det = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / det;
    const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / det;
    const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / det;
    const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / det;
    const e = d0[0] - a * s0[0] - c * s0[1];
    const ff = d0[1] - b * s0[0] - d * s0[1];
    const cx = (d0[0] + d1[0] + d2[0]) / 3;
    const cy = (d0[1] + d1[1] + d2[1]) / 3;
    const grow = (p: [number, number]): [number, number] => {
      const L = Math.hypot(p[0] - cx, p[1] - cy) || 1;
      return [p[0] + ((p[0] - cx) / L) * 0.6, p[1] + ((p[1] - cy) / L) * 0.6];
    };
    const g0 = grow(d0);
    const g1 = grow(d1);
    const g2 = grow(d2);
    g.save();
    g.beginPath();
    g.moveTo(g0[0], g0[1]);
    g.lineTo(g1[0], g1[1]);
    g.lineTo(g2[0], g2[1]);
    g.closePath();
    g.clip();
    g.setTransform(a, b, c, d, e, ff);
    g.drawImage(img, 0, 0);
    g.restore();
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const sx0 = MESH.x0 + i * MESH.step;
      const sy0 = MESH.y0 + j * MESH.step;
      const sx1 = sx0 + MESH.step;
      const sy1 = sy0 + MESH.step;
      const p00 = pos(i, j);
      const p10 = pos(i + 1, j);
      const p01 = pos(i, j + 1);
      const p11 = pos(i + 1, j + 1);
      tri([sx0, sy0], [sx1, sy0], [sx0, sy1], p00, p10, p01);
      tri([sx1, sy0], [sx1, sy1], [sx0, sy1], p10, p11, p01);
    }
  }
  return off;
};
const aiPlateRect = (n: AiPose, f: number): Rect => {
  const m = sp(n);
  const s = aiScale(n);
  const bb = m.bbox as number[];
  if (n === 'a-finger') return { x: fingerPose(f).ox, y: fingerPose(f).oy, w: m.w * s, h: m.h * s };
  return { x: BACK_X - (bb[2] as number) * s, y: SIT_Y - (bb[3] as number) * s, w: m.w * s, h: m.h * s };
};
/** v2: she is a reflection IN the glass: faint while she sits (0.42), clearer while she draws the heart (0.6);
 * v1's 0.86 read as a figure sitting inside the bus on the sill. She fades out with the heart's last dots. */
const REFL_ALPHA: Record<AiPose, number> = { 'a-read': 0.42, 'a-finger': 0.6 };
/** The heart evaporates slowly from just after her hand is down to just before his look-up (a beat is 14 frames);
 * the AI's reflection fades over the last 40% of it. */
const ERASE0 = F.heartDone + 3;
const ERASE1 = F.lookUp - 4;
const HER_FADE0 = ERASE0 + 0.6 * (ERASE1 - ERASE0);
const HER_FADE1 = ERASE1;
/** Eased in (slow start), so the heart is still half there when the stop's lit panel slides in behind it. */
const eraseAt = (f: number): number => sine(Math.pow(span(f, ERASE0, ERASE1), 1.6));
const herAlpha = (f: number): number => REFL_ALPHA[aiPoseAt(f)] * sine(span(f, F.fade, F.fog)) * (1 - sine(span(f, HER_FADE0, HER_FADE1)));

const paintReflections = (f: number) => (ctx: CanvasRenderingContext2D): void => {
  // his reflection: a faint cream ghost of a seated side view, back to back with hers
  const hm = sp('hb-refl');
  const hs = 0.62;
  const hb = hm.bbox as number[];
  const [hx, hy] = C(BACK_X - (sp('hb-refl').backX as number) * hs, SIT_Y - (hb[3] as number) * hs);
  ctx.globalAlpha = 0.14 * sine(span(f, F.bus, F.fade));
  ctx.drawImage(tintedSprite('hb-refl', palette.cream), hx, hy, hm.w * hs * WK, hm.h * hs * WK);
  // her
  const a = herAlpha(f);
  if (a <= 0) return;
  const n = aiPoseAt(f);
  const r = aiPlateRect(n, f);
  const [x, y] = C(r.x, r.y);
  ctx.globalAlpha = a;
  if (n === 'a-finger') {
    const unit = (r.w * WK) / sp(n).w;
    ctx.drawImage(paintFingerPose(f, unit), x - MARGIN.l * unit, y - MARGIN.t * unit);
  } else ctx.drawImage(getImg(url(n)), x, y, r.w * WK, r.h * WK);
  if (n === 'a-read') paintPageTurn(ctx, f, x, y, r.w * WK / sp(n).w);
  ctx.globalAlpha = 1;
};
/** "Unutmaya": a page of her notebook turns over (a cream leaf swinging over the spine, 10 frames). */
const BOOK = { x: 60, y: 190, w: 200, h: 120 }; // a-read book (sprite px, by eye)
const paintPageTurn = (ctx: CanvasRenderingContext2D, f: number, x: number, y: number, s: number): void => {
  const k = f - F.page;
  if (k < 0 || k > 12) return;
  const u = k / 12;
  const sx = Math.cos(Math.PI * u);
  const spine = x + (BOOK.x + BOOK.w / 2) * s;
  ctx.save();
  ctx.fillStyle = palette.cream;
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const top = y + BOOK.y * s;
  const lw = (BOOK.w / 2) * s * sx;
  ctx.moveTo(spine, top + 6);
  ctx.lineTo(spine + lw, top - 6 * Math.sin(Math.PI * u));
  ctx.lineTo(spine + lw, top + BOOK.h * s * 0.8);
  ctx.lineTo(spine, top + BOOK.h * s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

/** The fog holds for over half of the heart's erase (the haze is what makes the wiped heart readable), then thins out with it. */
const fogAt = (f: number): number => sine(span(f, F.fog, F.fog + 40)) * (1 - sine(span(f, ERASE0 + 0.55 * (ERASE1 - ERASE0), ERASE1)));
/** v2 parallax: the city is a separate deeper plane (D_CITY, 1.6x the window so no camera move reaches its edge);
 * the glass (reflections, fog, heart, rain) stays just behind the plate's window hole; he sits in front (D_MAN). */
const D_CITY = 600;
const D_GLASS = D_BUS + 2;
const D_MAN = -70;
const CITY_PAD = 0.3;
const CITY_RECT: Rect = placeAt({ x: WIN_RECT.x - WIN_RECT.w * CITY_PAD, y: WIN_RECT.y - WIN_RECT.h * CITY_PAD, w: WIN_RECT.w * (1 + 2 * CITY_PAD), h: WIN_RECT.h * (1 + 2 * CITY_PAD) }, D_CITY);
const cityLayer = (f: number): Layer =>
  canvasLayer('bus-city', 'p3:bus-city', Math.round(CW * (1 + 2 * CITY_PAD)), Math.round(CH * (1 + 2 * CITY_PAD)), D_CITY, CITY_RECT, (ctx, cw, ch) =>
    paintBusWindow(ctx, cw, ch, { t: sec(f - F.bus), travel: travelAt(f), speed: speedAt(f), stop: sine(span(f, BRAKE0, BRAKE1)), rain: 0, fog: null, heart: null, seed: 'p3-bus', part: 'outside' }),
  );
/** Small integer hash -> [0,1): the per-dot randomness of the evaporation (fixed per grid cell, so frame-pure). */
const cellHash = (a: number, b: number): number => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/**
 * The heart evaporating: the window is painted twice (without the heart = the canvas, with it = `full`); where the dots
 * of a hex grid are, the canvas is replaced by `full`. The dots shrink and vanish cell by cell (the outer lobes first,
 * with some scatter), so the stroke breaks into fine halftone dots that thin out; at u=1 only the heart-free window is left.
 */
const evaporate = (ctx: CanvasRenderingContext2D, full: HTMLCanvasElement, cw: number, ch: number, u: number, cx: number, cy: number, size: number): void => {
  const step = Math.max(5, 7 * (cw / 1600));
  const m = size * 0.8;
  const x0 = Math.max(0, Math.floor(cx - m));
  const y0 = Math.max(0, Math.floor(cy - m));
  const x1 = Math.min(cw, Math.ceil(cx + m));
  const y1 = Math.min(ch, Math.ceil(cy + m));
  const rowH = step * 0.866;
  ctx.save();
  ctx.beginPath();
  for (let row = Math.floor(y0 / rowH) - 1; row <= Math.ceil(y1 / rowH) + 1; row++) {
    const y = row * rowH;
    const off = (((row % 2) + 2) % 2) * step * 0.5;
    for (let col = Math.floor((x0 - off) / step) - 1; col <= Math.ceil((x1 - off) / step) + 1; col++) {
      const x = col * step + off;
      const outer = clamp01(Math.hypot(x - cx, y - cy) / (size * 0.62));
      const c = 0.55 * (1 - outer) + 0.45 * cellHash(col, row);
      const local = clamp01((u * 1.3 - c) / 0.3);
      const rad = step * 0.62 * Math.pow(1 - local, 0.9);
      if (rad < 0.35) continue;
      ctx.moveTo(x + rad, y);
      ctx.arc(x, y, rad, 0, Math.PI * 2);
    }
  }
  ctx.clip();
  ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
  ctx.drawImage(full, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
};
const windowLayer = (f: number): Layer => {
  const [fx, fy] = C(FOG.x, FOG.y);
  const [hx, hy] = C(HEART.x, HEART.y);
  const fog = fogAt(f);
  const heartP = clamp01((f - F.heart) / (F.heartDone - F.heart));
  const u = eraseAt(f);
  const opts = (heart: boolean): Parameters<typeof paintBusWindow>[3] => ({
    t: sec(f - F.bus),
    travel: travelAt(f),
    speed: speedAt(f),
    stop: sine(span(f, BRAKE0, BRAKE1)),
    rain: 1 - 0.4 * span(f, F.bus, F.fade + 30),
    fog: fog > 0 ? { x: fx, y: fy, r: FOG.r * WK, a: fog } : null,
    heart: heart && f >= F.heart ? { x: hx, y: hy, size: HEART.size * WK, p: heartP } : null,
    reflection: paintReflections(f),
    seed: 'p3-bus',
    part: 'glass',
  });
  return canvasLayer('bus-window', 'p3:bus-window', CW, CH, D_GLASS, placeAt(WIN_RECT, D_GLASS), (ctx, cw, ch) => {
    if (u <= 0) {
      paintBusWindow(ctx, cw, ch, opts(true));
      return;
    }
    paintBusWindow(ctx, cw, ch, opts(false));
    if (u >= 1) return;
    const full = document.createElement('canvas');
    full.width = cw;
    full.height = ch;
    paintBusWindow(full.getContext('2d') as CanvasRenderingContext2D, cw, ch, opts(true));
    evaporate(ctx, full, cw, ch, u, hx, hy, HEART.size * WK);
  });
};

// ---- the match: a screen-locked rain overlay across the cut from his room window

export const matchRainLayer = (f: number, cam: Cam, d: number): Layer | null => {
  const a = f < F.bus ? span(f, F.bus - 22, F.bus) : 1 - span(f, F.bus, F.bus + 26);
  if (a <= 0) return null;
  return canvasLayer('match-rain', 'p3:match-rain', 1920, 1080, d, placeAt({ x: 0, y: 0, w: W, h: H }, d, cam), (ctx, cw, ch) => {
    ctx.globalAlpha = a;
    paintGlassRain(ctx, cw, ch, sec(f), 1, 'p3-match');
    ctx.globalAlpha = 1;
  });
};

// ---- camera

/** v2: the match opens on the window alone (his head out of frame, a slow push), then a cut on the beat (F.fade) to
 * the medium shot; v1 pulled back from the glass and his head entered clipped at the left edge for ~1 s. */
const C_GLASS: Cam = (() => {
  const [gx, gy] = P(1310, 330);
  return { x: gx, y: gy, z: 1000 * 0.44 };
})();
const C_GLASS2: Cam = { ...C_GLASS, x: C_GLASS.x + 24, z: 1000 * 0.4 };
/** Slow calm drift over the seated hold: the planes slide against each other (period 9 s, +-26 / +-7 units). */
const drift = (f: number, c: Cam): Cam => {
  const u = (2 * Math.PI * (f - F.fade)) / (30 * 9);
  const w = sine(span(f, F.fade, F.fade + 40));
  return { x: c.x + 26 * Math.sin(u) * w, y: c.y + 7 * Math.sin(u * 0.7 + 1) * w, z: c.z };
};
const C_MED: Cam = { x: 960, y: 540, z: 1000 };
const C_MED2: Cam = { x: 990, y: 520, z: 950 };
const C_HEART: Cam = (() => {
  const [hx, hy] = P(HEART.x, HEART.y + 60);
  return { x: (hx + 960) / 2 + 40, y: (hy + 540) / 2, z: 860 };
})();
const C_END: Cam = { x: 900, y: 500, z: 900 };
export const busCam = (f: number): Cam => {
  if (f < F.fade) return mixCam(C_GLASS, C_GLASS2, sine(span(f, F.bus, F.fade)));
  if (f < F.fog) return drift(f, mixCam({ x: 940, y: 545, z: 1040 }, C_MED, sine(span(f, F.fade, F.fog))));
  if (f < F.heart) return drift(f, mixCam(C_MED, C_MED2, sine(span(f, F.fog, F.heart))));
  if (f < F.reach) return drift(f, mixCam(C_MED2, C_HEART, sine(span(f, F.heart - 10, F.heartDone))));
  return drift(f, mixCam(C_HEART, C_END, sine(span(f, F.reach, F.lookUp + 10))));
};

export const busLayers = (f: number): Layer[] => {
  const cam = busCam(f);
  const layers: Layer[] = [cityLayer(f), windowLayer(f), imageLayer('bus', url('bus-int'), D_BUS, BUS_W), humanLayer(f)];
  const mr = matchRainLayer(f, cam, -200);
  if (mr) layers.push(mr);
  return layers;
};
export const busHumanRect = (f: number): Rect => humanRect(poseAt(f));
void aiLayers;
