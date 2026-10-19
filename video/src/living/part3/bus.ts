// Scene 11 (bridge, female, the quietest part, song 4341-4676): the night bus. One held seated pose with breathing
// (two pose cuts at the end: he reads the note, he looks up); she exists only as a cream reflection in the window,
// back to back with his reflection; his breath fogs the glass; her fingertip draws a small heart in it; she reaches
// through the window and leaves a yellow note (her arm turns navy past the glass); he reads it and looks up: his stop.
import { palette } from '../../style/palette.ts';
import { paintBusWindow, paintGlassRain, heartTip } from './busWindow.ts';
import { aiLayers, HUMAN_BREATH, tintedSprite } from './figures.ts';
import { F, H, W, canvasLayer, charLayer, clamp01, easeInOut, getImg, imageLayer, mixCam, placeAt, pt, sec, sine, sp, span, url, type Cam, type Layer, type Rect } from './common.ts';

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

type Pose = 'hb-lean' | 'hb-read' | 'hb-lookup';
const poseAt = (f: number): Pose => (f < F.read ? 'hb-lean' : f < F.lookUp ? 'hb-read' : 'hb-lookup');
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
  return charLayer('human', pose, rr, D_MAN, sec(f), { breath: { ...HUMAN_BREATH, amp: 0.012, period: 4.4 }, notes: true }, { rot: sway, pivot: [rr.x + rr.w * 0.25, rr.y + rr.h * 0.65] });
};

// ---- the window: outside, reflections, fog, heart, rain

/** The breath patch, plate px: just in front of his mouth on the glass. */
const MOUTH = humanPt('hb-lean', 'mouth');
const FOG = { x: MOUTH[0] + 120, y: MOUTH[1] - 10, r: 120 };
const HEART = { x: FOG.x + 22, y: FOG.y - 26, size: 124 };
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

type AiPose = 'a-read' | 'a-finger' | 'a-reach' | 'a-lookup';
const aiPoseAt = (f: number): AiPose => (f < F.heart ? 'a-read' : f < F.reach ? 'a-finger' : f < F.read ? 'a-reach' : f < F.lookUp ? 'a-read' : 'a-lookup');
/** Her reflection's scale: head ~ 104 plate px. Heads: a-read/a-lookup ~240 (part 1), finger 163, reach 152. */
const AI_HEAD: Record<AiPose, number> = { 'a-read': 240, 'a-lookup': 165, 'a-finger': 163, 'a-reach': 152 };
const aiScale = (n: AiPose): number => 104 / AI_HEAD[n];
const SIT_Y = 690; // the sill line under the reflections (plate px)
/** Her rect in plate px. Sitting back to back: her back (right edge) against his reflection's back at BACK_X. */
const BACK_X = 1090;
const aiPlateRect = (n: AiPose, f: number): Rect => {
  const m = sp(n);
  const s = aiScale(n);
  const bb = m.bbox as number[];
  if (n === 'a-finger') {
    const tip = pt(n, 'fingertip');
    const p = clamp01((f - F.heart) / (F.heartDone - F.heart));
    const [hx, hy] = heartTip(HEART, p);
    return { x: hx - (tip[0] as number) * s, y: hy - (tip[1] as number) * s, w: m.w * s, h: m.h * s };
  }
  if (n === 'a-reach') {
    // the note lands beyond the glass's left edge, by his elbow on the sill
    const note = pt(n, 'note');
    const nx = glassLeftX(560) - 70;
    const ny = 548;
    return { x: nx - (note[0] as number) * s, y: ny - (note[1] as number) * s, w: m.w * s, h: m.h * s };
  }
  return { x: BACK_X - (bb[2] as number) * s, y: SIT_Y - (bb[3] as number) * s, w: m.w * s, h: m.h * s };
};
/** v2: she is a reflection IN the glass: faint while she sits (0.42), clearer while she draws the heart (0.6) and
 * reaches (0.7); v1's 0.86 read as a figure sitting inside the bus on the sill. */
const REFL_ALPHA: Record<AiPose, number> = { 'a-read': 0.42, 'a-lookup': 0.42, 'a-finger': 0.6, 'a-reach': 0.7 };
const herAlpha = (f: number): number => REFL_ALPHA[aiPoseAt(f)] * sine(span(f, F.fade, F.fog));

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
  ctx.drawImage(getImg(url(n)), x, y, r.w * WK, r.h * WK);
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

const fogAt = (f: number): number => sine(span(f, F.fog, F.fog + 40)) * (1 - 0.35 * span(f, F.reach, F.lookUp));
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
const windowLayer = (f: number): Layer => {
  const [fx, fy] = C(FOG.x, FOG.y);
  const [hx, hy] = C(HEART.x, HEART.y);
  const fog = fogAt(f);
  const heartP = clamp01((f - F.heart) / (F.heartDone - F.heart));
  return canvasLayer('bus-window', 'p3:bus-window', CW, CH, D_GLASS, placeAt(WIN_RECT, D_GLASS), (ctx, cw, ch) =>
    paintBusWindow(ctx, cw, ch, {
      t: sec(f - F.bus),
      travel: travelAt(f),
      speed: speedAt(f),
      stop: sine(span(f, BRAKE0, BRAKE1)),
      rain: 1 - 0.4 * span(f, F.bus, F.fade + 30),
      fog: fog > 0 ? { x: fx, y: fy, r: FOG.r * WK, a: fog } : null,
      heart: f >= F.heart ? { x: hx, y: hy, size: HEART.size * WK, p: heartP } : null,
      reflection: paintReflections(f),
      seed: 'p3-bus',
      part: 'glass',
    }),
  );
};

/** Her arm past the glass: the part of her reaching drawing outside the window turns navy (the note stays yellow). */
const crossingLayer = (f: number): Layer | null => {
  if (aiPoseAt(f) !== 'a-reach') return null;
  const r = aiPlateRect('a-reach', f);
  const s = aiScale('a-reach');
  const note = pt('a-reach', 'note');
  const [x0, y0] = P(r.x - 10, r.y - 10);
  const [x1, y1] = P(r.x + r.w + 10, r.y + r.h + 10);
  const box: Rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const cw = Math.round((r.w + 20) * WK);
  const ch = Math.round((r.h + 20) * WK);
  return canvasLayer('crossing', 'p3:crossing', cw, ch, D_BUS - 1, box, (ctx) => {
    const ox = (px: number): number => (px - r.x + 10) * WK;
    const oy = (py: number): number => (py - r.y + 10) * WK;
    // clip: the region left of the glass's left edge
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ox(r.x - 20), oy(r.y - 20));
    ctx.lineTo(ox(glassLeftX(r.y - 20)), oy(r.y - 20));
    ctx.lineTo(ox(glassLeftX(r.y + r.h + 20)), oy(r.y + r.h + 20));
    ctx.lineTo(ox(r.x - 20), oy(r.y + r.h + 20));
    ctx.closePath();
    ctx.clip();
    const appear = clamp01((f - F.reach) / 4);
    ctx.globalAlpha = appear;
    ctx.drawImage(tintedSprite('a-reach', palette.navy), ox(r.x), oy(r.y), r.w * WK, r.h * WK);
    // a thin cream rim around the navy arm so it reads against the dark interior
    ctx.restore();
    // the note itself (yellow), drawn from the original drawing
    ctx.save();
    ctx.globalAlpha = appear;
    const nx = note[0] as number;
    const ny = note[1] as number;
    const nw = note[2] as number;
    const nh = note[3] as number;
    ctx.drawImage(getImg(url('a-reach')), nx, ny, nw, nh, ox(r.x + nx * s), oy(r.y + ny * s), nw * s * WK, nh * s * WK);
    ctx.restore();
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
  const cross = crossingLayer(f);
  if (cross) layers.push(cross);
  const mr = matchRainLayer(f, cam, -200);
  if (mr) layers.push(mr);
  return layers;
};
export const busHumanRect = (f: number): Rect => humanRect(poseAt(f));
void aiLayers;
