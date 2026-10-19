// Scene 10 (bridge, male, song 3894-4341): his side-view room at night. The folded street stands on his worktable
// as the paper city (it IS the street he just walked through); she sets a last tower on the glass from her side.
// "Sildik": he freezes, the wall of notes pours down as line-rain; a counter runs to 17.703; on the click his hands go
// to his head and a big "!" pops; "Yedek": the paper city collapses and he kneels by one small box labelled "yedek".
// Then the camera tilts up to his window: the line-rain becomes rain on the glass (the match into the night bus).
import { palette } from '../../style/palette.ts';
import { TEXT_FONT } from '../../style/fonts.ts';
import { seeded } from '../../style/seeded.ts';
import { paintLayers as paintCompose } from '../compose2d.ts';
import { paintFoldedCity, type FoldCityOpts } from './foldCity.ts';
import { LINE_RAIN_SIZE, paintLineRain } from './lineRain.ts';
import { paintGlassRain } from './busWindow.ts';
import { paintExclaim } from './streetFx.ts';
import { wideRoofCut, wideStage } from './street.ts';
import { aiLayers, HUMAN_BREATH, invertedSprite } from './figures.ts';
import {
  F,
  H,
  W,
  canvasLayer,
  charLayer,
  clamp01,
  easeInOut,
  easeOut,
  getImg,
  imageLayer,
  lerp,
  mixCam,
  num,
  placeAt,
  project,
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
import { planeScale } from '../types.ts';

const D_NIGHT = 1600;
const D_ROOM = 520;
const D_WALL = 505;
const D_TABLE = -20;
const D_FRONT = -280;
export const REF_DESK: Cam = { x: 960, y: 540, z: 1000 };

// The room plate (part 1's room-morning, its window panes transparent) as part 1 places it.
const ROOM_SCR: Rect = { x: -594, y: -284, w: 2600, h: 2600 * (941 / 1672) };
const ROOM_W = placeAt(ROOM_SCR, D_ROOM);
const WIN = { x0: 743, y0: 73, x1: 1025, y1: 446 };
const winScr: Rect = {
  x: ROOM_SCR.x + (WIN.x0 / 1672) * ROOM_SCR.w,
  y: ROOM_SCR.y + (WIN.y0 / 941) * ROOM_SCR.h,
  w: ((WIN.x1 - WIN.x0) / 1672) * ROOM_SCR.w,
  h: ((WIN.y1 - WIN.y0) / 941) * ROOM_SCR.h,
};
export const WIN_W = placeAt(winScr, D_ROOM);
const NIGHT_W = placeAt({ x: winScr.x - winScr.w * 1.2, y: winScr.y - winScr.h * 0.8, w: winScr.w * 3.4, h: winScr.h * 2.6 }, D_NIGHT);

// ---- the table, the seam, the city

const FLOOR = 1000;
const SEAM = 1640;
const LEAN_S = 118 / 131;
const TABLE_TOP = Math.round(FLOOR - (num('h-lean', 'floorY') - num('h-lean', 'handY')) * LEAN_S);
const TABLE_S = (FLOOR - TABLE_TOP) / (num('st-table', 'floorY') - num('st-table', 'topY'));
const TABLE_SCR: Rect = { x: 470, y: TABLE_TOP - num('st-table', 'topY') * TABLE_S, w: sp('st-table').w * TABLE_S, h: sp('st-table').h * TABLE_S };
const TABLE_W = placeAt(TABLE_SCR, D_TABLE);

/** The fold lands the strip's bottom centre on the middle of the tabletop. */
export const CITY_LANDING = { scale: 0.36, x: 1010, y: TABLE_TOP + 3, fold: 40, tilt: 18 } as const;
export const CITY_PANELS = 6;
/** The city canvas: a full frame (screen px under REF_DESK) on the table's plane. */
const CITY_W = placeAt({ x: 0, y: 0, w: W, h: H }, D_TABLE);

let citySrc: HTMLCanvasElement | null = null;
/** The wide street frame at the landing (PaperFold's `from` at progress 1), painted once. */
export const cityTexture = (): HTMLCanvasElement => {
  if (!citySrc) {
    citySrc = document.createElement('canvas');
    citySrc.width = W;
    citySrc.height = H;
    const ctx = citySrc.getContext('2d') as CanvasRenderingContext2D;
    const st = wideStage(F.fold1);
    paintCompose(ctx, st.layers, st.cam, F.fold1, W, H);
  }
  return citySrc;
};
export const cityOpts = (collapse: number): FoldCityOpts => ({ landing: CITY_LANDING, panels: CITY_PANELS, cutout: wideRoofCut(F.fold1), collapse, cacheKey: 'p3-city', seed: 'p3-city' });

const cityLayer = (f: number): Layer => {
  const c = easeIn2(span(f, F.collapse, F.collapse + 48));
  return canvasLayer('city', 'p3:city', W, H, D_TABLE - 1, CITY_W, (ctx, cw, ch) => paintFoldedCity(ctx, cw, ch, cityTexture(), cityOpts(c)));
};
const easeIn2 = (u: number): number => u * u * (1.6 - 0.6 * u);

/** The last tower: a narrow paper building straddling the glass, navy on his side, cream on hers. */
const TOWER = { x: SEAM - 34, w: 68, h: 210 };
const towerLayer = (f: number): Layer | null => {
  if (f < F.tower) return null;
  const fallen = easeIn2(span(f, F.collapse + 30, F.collapse + 52));
  const drop = f < F.tower + 6 ? [10, 4, 0, 2, 1, 0][f - F.tower] ?? 0 : 0;
  const r: Rect = { x: TOWER.x - 20, y: TABLE_TOP - TOWER.h - 30, w: TOWER.w + 40, h: TOWER.h + 34 };
  return canvasLayer('tower', 'p3:tower', 216, 488, D_TABLE - 2, placeAt(r, D_TABLE - 2, REF_DESK), (ctx, cw, ch) => {
    const k = cw / r.w;
    ctx.save();
    ctx.scale(k, k);
    ctx.translate(20, 30 - drop);
    // falls over toward her side on the collapse (the city goes; the tower she set goes too)
    ctx.translate(TOWER.w, TOWER.h);
    ctx.rotate(fallen * 1.45);
    ctx.translate(-TOWER.w, -TOWER.h);
    paintTower(ctx, TOWER.w, TOWER.h, SEAM - TOWER.x);
    ctx.restore();
  });
};
const paintTower = (ctx: CanvasRenderingContext2D, w: number, h: number, seamX: number): void => {
  const roof = h * 0.24;
  const body = new Path2D();
  body.moveTo(0, h);
  body.lineTo(0, roof);
  body.lineTo(w / 2, 0);
  body.lineTo(w, roof);
  body.lineTo(w, h);
  body.closePath();
  for (const side of ['his', 'hers'] as const) {
    ctx.save();
    ctx.beginPath();
    if (side === 'his') ctx.rect(-5, -5, seamX + 5, h + 10);
    else ctx.rect(seamX, -5, w, h + 10);
    ctx.clip();
    ctx.fillStyle = side === 'his' ? palette.navy : palette.cream;
    ctx.fill(body);
    ctx.strokeStyle = side === 'his' ? palette.cream : palette.navy;
    ctx.lineWidth = 3;
    ctx.stroke(body);
    // two lit windows and a fold crease
    ctx.fillStyle = palette.moonYellow;
    ctx.fillRect(w * 0.3, h * 0.38, w * 0.4, h * 0.1);
    ctx.fillRect(w * 0.3, h * 0.58, w * 0.4, h * 0.1);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, roof * 0.2);
    ctx.lineTo(w * 0.5, h);
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();
  }
};

// ---- the night outside, the room, the glass, her side

const nightLayer = (f: number): Layer =>
  canvasLayer('night', 'p3:night', 900, 700, D_NIGHT, NIGHT_W, (ctx, cw, ch) => {
    ctx.fillStyle = palette.navy;
    ctx.fillRect(0, 0, cw, ch);
    // moon
    ctx.fillStyle = palette.moonYellow;
    ctx.beginPath();
    ctx.arc(cw * 0.62 + 3, ch * 0.3 - 2, cw * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cw * 0.62, ch * 0.3, cw * 0.06, 0, Math.PI * 2);
    ctx.stroke();
    // far towers with lit windows
    const r = seeded('p3:night-towers');
    for (let x = 0; x < cw; ) {
      const bw = 30 + r() * 60;
      const bh = ch * (0.12 + r() * 0.3);
      ctx.fillStyle = '#0d1226';
      ctx.fillRect(x, ch - bh, bw, bh);
      ctx.fillStyle = palette.moonYellow;
      for (let wy = ch - bh + 8; wy < ch - 6; wy += 14) for (let wx = x + 6; wx < x + bw - 6; wx += 12) if (r() < 0.22) ctx.fillRect(wx, wy, 4, 6);
      x += bw + 4;
    }
    // stars (blink slowly)
    const s = seeded('p3:stars');
    ctx.fillStyle = palette.cream;
    for (let i = 0; i < 40; i++) {
      const x = s() * cw;
      const y = s() * ch * 0.6;
      if (0.5 + 0.5 * Math.sin(sec(f) * 1.3 + i) > 0.25) ctx.fillRect(x, y, 2, 2);
    }
  });

const herSideLayers = (): Layer[] => [
  canvasLayer('cream', 'p3:desk-cream', 8, 8, 0, { x: SEAM, y: -900, w: 3000, h: 3000 }, (ctx, cw, ch) => {
    ctx.fillStyle = palette.cream;
    ctx.fillRect(0, 0, cw, ch);
  }),
  canvasLayer('cream-floor', 'p3:desk-cream-floor', 64, 4, 0, { x: SEAM, y: FLOOR - 2, w: 3000, h: 4 }, (ctx, cw, ch) => {
    ctx.fillStyle = palette.navy;
    ctx.fillRect(0, ch * 0.125, cw, ch * 0.75);
  }),
  canvasLayer('seam', 'p3:desk-seam', 40, 1640, 0, { x: SEAM - 20, y: -300, w: 40, h: 1640 }, (ctx, cw, ch) => {
    const r = seeded('p3:desk-seam');
    const line = (dx: number, color: string, width: number): void => {
      ctx.beginPath();
      for (let y = 0; y <= ch; y += 26) ctx.lineTo(cw / 2 + dx + (r() - 0.5) * 2.4, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    line(-2.5, palette.cream, 3);
    line(1.5, palette.navy, 3.5);
  }),
];

/** The table, its part beyond the glass printed in her colours. */
const tableLayers = (): Layer[] => {
  const cut = (SEAM - TABLE_SCR.x) / TABLE_SCR.w;
  const m = sp('st-table');
  return [
    imageLayer('table', url('st-table'), D_TABLE, TABLE_W),
    canvasLayer('table-hers', 'p3:table-hers', Math.round(m.w * (1 - cut)), m.h, D_TABLE, { x: TABLE_W.x + TABLE_W.w * cut, y: TABLE_W.y, w: TABLE_W.w * (1 - cut), h: TABLE_W.h }, (ctx, cw, ch) => {
      ctx.drawImage(invertedSprite('st-table'), m.w * cut, 0, cw, ch, 0, 0, cw, ch);
    }),
  ];
};

// ---- him

type HumanPose = 'h-lean' | 'h-freeze' | 'h-head' | 'h-kneel';
const humanPoseAt = (f: number): HumanPose => (f < F.freeze ? 'h-lean' : f < F.click ? 'h-freeze' : f < F.kneel ? 'h-head' : 'h-kneel');
/** Screen rects (REF_DESK) of his poses: the standing ones on the floor at the table's left end, by head size. */
/** Scale: h-lean and h-kneel by head size (118 px, part 1's standing man has ~135 at 800 tall); the upright standing
 * poses by height (800 px floor to hair, part 1's HS) since h-freeze's head is drawn small for its body. */
const scaleOf = (pose: HumanPose): number => {
  if (pose === 'h-lean') return LEAN_S;
  if (pose === 'h-kneel') return 118 / headH(pose);
  return 800 / (num(pose, 'floorY') - (sp(pose).bbox[1] as number));
};
const humanScr = (pose: HumanPose): Rect => {
  const m = sp(pose);
  const s = scaleOf(pose);
  const floorY = num(pose, 'floorY');
  if (pose === 'h-lean') {
    const hx = pt(pose, 'handX');
    return { x: TABLE_SCR.x + 90 - (hx[1] as number) * s, y: FLOOR - floorY * s, w: m.w * s, h: m.h * s };
  }
  if (pose === 'h-kneel') {
    const box = pt(pose, 'box');
    return { x: 330 - (box[0] as number) * s, y: FLOOR + 6 - floorY * s, w: m.w * s, h: m.h * s };
  }
  // standing: back of the body where h-lean's back was (bbox left), a little back from the table
  const bb = m.bbox as number[];
  return { x: TABLE_SCR.x - 120 - (bb[0] as number) * s, y: FLOOR - floorY * s, w: m.w * s, h: m.h * s };
};
const headH = (pose: HumanPose): number => ({ 'h-lean': 131, 'h-head': 150, 'h-kneel': 147, 'h-freeze': 117 })[pose];
const humanLayer = (f: number, pose: HumanPose): Layer => {
  const r = placeAt(humanScr(pose), 0, REF_DESK);
  const hb = sp(pose).hair as { x0: number; y0: number; x1: number; y1: number } | undefined;
  // frozen: no breath at all (shock); the others breathe; h-head shakes a little after the click
  const breath = pose === 'h-freeze' ? { ...HUMAN_BREATH, amp: 0 } : pose === 'h-head' ? { ...HUMAN_BREATH, amp: 0.016, period: 1.6 } : HUMAN_BREATH;
  const shake = pose === 'h-head' && f - F.click < 10 ? 5 * Math.sin((f - F.click) * 2.4) * (1 - (f - F.click) / 10) : 0;
  return charLayer('human', pose, { ...r, x: r.x + shake }, 0, sec(f), { breath, hair: hb ? { ...hb, amp: 1.2, face: 'right' } : undefined, notes: true });
};
/** The box label: "yedek", stamped in the typewriter face. */
const labelLayer = (f: number): Layer | null => {
  if (humanPoseAt(f) !== 'h-kneel') return null;
  const scr = humanScr('h-kneel');
  const s = scr.w / sp('h-kneel').w;
  const lb = pt('h-kneel', 'label');
  const r: Rect = { x: scr.x + (lb[0] as number) * s, y: scr.y + (lb[1] as number) * s, w: (lb[2] as number) * s, h: (lb[3] as number) * s };
  return canvasLayer('label', 'p3:yedek', 288, 172, -1, placeAt(r, -1, REF_DESK), (ctx, cw, ch) => {
    ctx.fillStyle = palette.cream;
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = palette.navy;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, cw - 6, ch - 6);
    ctx.fillStyle = palette.navy;
    ctx.font = `600 ${Math.round(ch * 0.52)}px "${TEXT_FONT}", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('yedek', cw / 2, ch * 0.54);
  });
};

// ---- her

const herLayers = (f: number): Layer[] => {
  const blinks = [3930, 3990, 4210, 4260, 4320];
  if (f < F.tower) {
    // a-tower: the tower in her hands just right of the glass, at tabletop height
    const m = sp('a-tower');
    const s = 136 / (sp('a-tower').headH as number);
    const tb = pt('a-tower', 'towerBase');
    const scr: Rect = { x: SEAM + 26 - (tb[0] as number) * s, y: FLOOR - num('a-tower', 'floorY') * s, w: m.w * s, h: m.h * s };
    void tb;
    return aiLayers('ai', 'a-tower', placeAt(scr, 0, REF_DESK), 0, f, { blinks });
  }
  const name = f < F.collapse ? 'ai-stand' : 'a-lookdown';
  const m = sp(name);
  const bb = m.bbox as number[];
  const s = 0.95;
  const scr: Rect = { x: SEAM + 150 - (bb[0] as number) * s, y: FLOOR - (bb[3] as number) * s, w: m.w * s, h: m.h * s };
  return aiLayers('ai', name, placeAt(scr, 0, REF_DESK), 0, f, { blinks });
};

// ---- rain of lines

const pourAt = (f: number): number => span(f, F.pour, F.pour + 100);
const rainAt = (f: number): number => sine(span(f, F.tiltUp, F.bus - 6));
const WALL_W = placeAt({ x: ROOM_SCR.x + 120, y: ROOM_SCR.y + 40, w: ROOM_SCR.w - 240, h: (ROOM_SCR.w - 240) * (1350 / 2400) }, D_WALL);
const rainLayers = (f: number): { back: Layer; front: Layer | null } => {
  const o = { t: sec(f - F.freeze), pour: pourAt(f), rain: rainAt(f) };
  const back = canvasLayer('rain-back', 'p3:rain-back', LINE_RAIN_SIZE.back[0], LINE_RAIN_SIZE.back[1], D_WALL, WALL_W, (ctx, cw, ch) => paintLineRain(ctx, cw, ch, { ...o, layer: 'back', seed: 'p3' }));
  const front =
    o.pour > 0.3
      ? canvasLayer('rain-front', 'p3:rain-front', LINE_RAIN_SIZE.front[0], LINE_RAIN_SIZE.front[1], D_FRONT, placeAt({ x: -300, y: -200, w: 2520, h: 1418 }, D_FRONT, REF_DESK), (ctx, cw, ch) =>
          paintLineRain(ctx, cw, ch, { ...o, layer: 'front', seed: 'p3' }),
          { opacity: 0.72 },
        )
      : null;
  return { back, front };
};
/** Rain on his window glass, growing as the line-rain turns to rain (the match into the bus window). */
const windowRainLayer = (f: number): Layer | null => {
  const a = span(f, F.tiltUp, F.bus);
  if (a <= 0) return null;
  return canvasLayer('win-rain', 'p3:win-rain', 900, 1180, D_ROOM - 2, WIN_W, (ctx, cw, ch) => paintGlassRain(ctx, cw, ch, sec(f), a, 'p3-glass'));
};

// ---- the "!" on the click

const bangLayer = (f: number): Layer | null => {
  if (f < F.click || f >= F.collapse + 10) return null;
  const scr = humanScr('h-head');
  const s = scr.w / sp('h-head').w;
  const ht = pt('h-head', 'headTop');
  const cx = scr.x + (ht[0] as number) * s - 190;
  const cy = scr.y + (ht[1] as number) * s + 90;
  const size = 260;
  return canvasLayer('bang', 'p3:bang', 256, 256, -2, placeAt({ x: cx - size / 2, y: cy - size / 2, w: size, h: size }, -2, REF_DESK), (ctx, cw, ch) =>
    paintExclaim(ctx, cw, ch, (f - F.click) / 30, { out: span(f, F.collapse - 2, F.collapse + 10) }),
  );
};

// ---- cameras

const C_WIDE: Cam = { x: 960, y: 540, z: 1000 };
const C_WIDE2: Cam = { x: 1000, y: 525, z: 930 };
const C_HIM: Cam = { x: 640, y: 470, z: 720 };
const C_HIM2: Cam = { x: 610, y: 450, z: 640 };
const C_KNEEL: Cam = { x: 560, y: 690, z: 760 };
/** The window seen straight on, filling the frame (the match into the bus window). */
/** As close as the stage allows (layers nearer than the camera are dropped by deskLayers): the window ~2.5x. */
const C_WIN: Cam = { x: WIN_W.x + WIN_W.w / 2, y: WIN_W.y + WIN_W.h * 0.55, z: 60 };
export const deskCam = (f: number): Cam => {
  if (f < F.freeze) return mixCam(C_WIDE, C_WIDE2, sine(span(f, F.fold1, F.freeze)));
  if (f < F.click) return mixCam(C_HIM, C_HIM2, easeInOut(span(f, F.freeze, F.click)));
  if (f < F.collapse) {
    // a small jolt on the click
    const j = f - F.click;
    return { x: C_HIM2.x + (j < 8 ? 6 * Math.sin(j * 2.1) * (1 - j / 8) : 0), y: C_HIM2.y, z: C_HIM2.z - 30 * easeOut(j / 12) };
  }
  if (f < F.kneel) return mixCam(C_WIDE, C_WIDE2, sine(span(f, F.collapse, F.kneel)));
  if (f < F.tiltUp) return mixCam(C_KNEEL, { ...C_KNEEL, x: C_KNEEL.x + 30, z: C_KNEEL.z - 40 }, sine(span(f, F.kneel, F.tiltUp)));
  return mixCam({ ...C_KNEEL, x: C_KNEEL.x + 30, z: C_KNEEL.z - 40 }, C_WIN, easeInOut(span(f, F.tiltUp, F.bus)));
};

export const deskLayers = (f: number, o: { city: boolean } = { city: true }): Layer[] => {
  const pose = humanPoseAt(f);
  const rain = rainLayers(f);
  const layers: Layer[] = [nightLayer(f), imageLayer('room', url('room-morning'), D_ROOM, ROOM_W)];
  const wr = windowRainLayer(f);
  if (wr) layers.push(wr);
  layers.push(rain.back, ...herSideLayers(), ...tableLayers());
  if (o.city) layers.push(cityLayer(f));
  const tw = towerLayer(f);
  if (tw) layers.push(tw);
  layers.push(...herLayers(f), humanLayer(f, pose));
  const lab = labelLayer(f);
  if (lab) layers.push(lab);
  const bang = bangLayer(f);
  if (bang) layers.push(bang);
  if (rain.front) layers.push(rain.front);
  // the tilt-up pushes the camera past the near planes: drop what is behind it
  const z = deskCam(f).z;
  return layers.filter((l) => l.d > -z + 40);
};
/** Screen box of a world-placed point, used by the type layout (where his head is). */
export const deskHeadOnScreen = (f: number): [number, number] => {
  const pose = humanPoseAt(f);
  const scr = humanScr(pose);
  return project(deskCam(f), 0, [scr.x + scr.w * 0.5, scr.y]);
};
void clamp01;
void lerp;
void getImg;
void planeScale;
