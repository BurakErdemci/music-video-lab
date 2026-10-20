// Part4bV3, song frames 6837-7222 (copied from part4/reset.ts and changed): SqueegeePrint in white from the yellow
// union, the white reset room, "Merhaba.", the notebook, the push into the screen. THE ONE DIFFERENCE from Part 1: the
// cursor on his screen is printed in moon-yellow from the white print on, and the union's yellow ink drains into it as
// dots when the room lands (6864-6924). The last frame is Part 1's frame 468 with that yellow cursor.
import { palette } from '../../../style/palette.ts';
import { TEXT_FONT } from '../../../style/fonts.ts';
import { clamp01, lerp } from '../../../math.ts';
import { paintLayers } from '../../compose2d.ts';
import { LIFT_PAD, paintDust, paintSky, paintSteam, type HairOpts } from '../../life.ts';
import * as P1 from '../../part1/shots.ts';
import { heartOverlay } from './heart.ts';
import { unionBoxRect, unionDots, unionOnScreen, worldPainter } from './world.ts';
import { seeded } from '../../../style/seeded.ts';
import { screenReset, type ScreenSet } from '../halftoneReset.ts';
import {
  beatPhase, canvasLayer, charLayer, easeInOut, getImg, placeAt, pose, sec, sine, span, sp, spriteUrls, url,
  type Cam, type Layer, type Painter, type Rect, type Shot,
} from '../common.ts';

const { D_SKY, D_ROOM, D_DESK, D_DUST, D_HUMAN, SKY_W, ROOM_W, DESK_W, DESK_META, SCR_BOX, SCREEN_Q, scrW, FEET_Y, HUMAN_S, HUMAN_X, SEAT_K, humanBreath, deskPx, contactShadow } = {
  ...P1,
  D_HUMAN: 0,
};

const F_PRINT = 6837;
const F_ROOM = 6864;
const F_TYPE = 7067;
const F_BOOK = 7112;
const F_PUSH = 7139;
const F_END = 7222;
const LOOP_AT = 468; // Part 1's hand-over frame

const WORD = 'Merhaba.';
/** The one difference from Part 1: she kept the shared ink. */
const CURSOR_INK = palette.moonYellow;
const TYPE_STEP = 3;
const FLASH_AT = 7164; // peak lands on the beat 7167, where he is cut back to the morning mug pose // the screen flashes white (reset motif): rises over 4 frames, the text is gone at the peak, falls over 10
const FLASH_UP = 4;
const FLASH_DOWN = 10;

// Part 1's screen set (copied: part1 keeps these private). Canvas px per desk sprite px, font and cursor as in Part 1.
const SCR_RES = 5;
const FONT_PX = 34;
const ADVANCE = 0.6;
const P1_WORD_LEN = 7;
const quad = (u: number, v: number): [number, number] => {
  const [a, b, c, d] = SCREEN_Q as [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];
  const x = (1 - v) * ((1 - u) * a[0] + u * b[0]) + v * ((1 - u) * d[0] + u * c[0]);
  const y = (1 - v) * ((1 - u) * a[1] + u * b[1]) + v * ((1 - u) * d[1] + u * c[1]);
  return [(x - SCR_BOX.x0) * SCR_RES, (y - SCR_BOX.y0) * SCR_RES];
};
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
const SCREEN_MID: [number, number] = (() => {
  const cw = (SCR_BOX.x1 - SCR_BOX.x0) * SCR_RES;
  const ch = (SCR_BOX.y1 - SCR_BOX.y0) * SCR_RES;
  return [scrW.x + (SCREEN_FRAME.c[0] / cw) * scrW.w, scrW.y + (SCREEN_FRAME.c[1] / ch) * scrW.h];
})();
const CAM_LOOP: Cam = { x: SCREEN_MID[0], y: SCREEN_MID[1], z: 165 }; // = Part 1's cam1(468)

/** Letters on his screen: typed on the voice; the reset flash wipes them. */
const typedCount = (f: number): number => (f >= FLASH_AT + FLASH_UP - 1 ? 0 : Math.min(WORD.length, Math.max(0, Math.floor((f - F_TYPE) / TYPE_STEP) + 1)));
const flashAt = (f: number): number => (f < FLASH_AT ? 0 : f < FLASH_AT + FLASH_UP ? (f - FLASH_AT + 1) / FLASH_UP : 1 - easeInOut(span(f, FLASH_AT + FLASH_UP, FLASH_AT + FLASH_UP + FLASH_DOWN)));
const FLASH_END = FLASH_AT + FLASH_UP + FLASH_DOWN;
const paintScreen = (f: number, ht = false) => (ctx: CanvasRenderingContext2D): void => {
  // TRIAL: the halftone reset replaces the white flash (only the *Halftone compositions pass ht)
  const halftone = ht ? screenReset(f, SCREEN_SET) : undefined;
  if (halftone) return halftone(ctx);
  const n = typedCount(f);
  const { c, u, v } = SCREEN_FRAME;
  const left = -(P1_WORD_LEN / 2) * ADVANCE * FONT_PX * SCR_RES;
  ctx.save();
  ctx.setTransform(u[0], u[1], v[0], v[1], c[0], c[1]);
  ctx.font = `500 ${FONT_PX * SCR_RES}px "${TEXT_FONT}"`;
  ctx.fillStyle = palette.navy;
  ctx.textBaseline = 'middle';
  if (n > 0) ctx.fillText(WORD.slice(0, n), left, 0);
  const busy = f >= F_TYPE && f < F_TYPE + TYPE_STEP * WORD.length;
  // After the flash the cursor stays solid to the last frame (Part 1's 468 shows it on).
  const on = busy || f >= FLASH_END - 4 || beatPhase(f) < 0.5;
  if (on) {
    const ch = FONT_PX * SCR_RES * 1.05;
    ctx.fillStyle = CURSOR_INK;
    ctx.fillRect(left + n * ADVANCE * FONT_PX * SCR_RES + 6.5 * SCR_RES - 2.5 * SCR_RES, -ch / 2, 5 * SCR_RES, ch);
  }
  ctx.restore();
  const fl = flashAt(f);
  if (fl > 0) {
    ctx.save();
    ctx.globalAlpha = fl;
    ctx.fillStyle = '#FFFEF8';
    ctx.beginPath();
    SCREEN_Q.forEach((q, i) => {
      const x = (q[0] - SCR_BOX.x0) * SCR_RES;
      const y = (q[1] - SCR_BOX.y0) * SCR_RES;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

const SCREEN_SET: ScreenSet = {
  get quad() {
    return SCREEN_Q.map((q) => [(q[0] - SCR_BOX.x0) * SCR_RES, (q[1] - SCR_BOX.y0) * SCR_RES] as const);
  },
  u: SCREEN_FRAME.u,
  v: SCREEN_FRAME.v,
  content: (g) => paintScreen(g),
  get desk() {
    return getImg(P1.url('desk2'));
  },
  deskW: DESK_META.w,
  box: SCR_BOX,
};

// ---------------------------------------------------------------------------------------------------------------
// Veils: the room is printed pale. One plane in front of him (room, sky, him), one over the desk with the screen cut out
// (the screen stays pure Part 1 cream).
// Warm cream-yellow so the veil over the navy plates lands on cream (about #E8E2CD at the start), not on neutral grey.
const VEIL = '#FFF4CD';
const washAt = (f: number): number => (f < F_PUSH ? lerp(0.88, 0.3, sine(Math.pow(span(f, F_ROOM, F_PUSH), 1.5))) : lerp(0.3, 0, easeInOut(span(f, F_PUSH, F_END - 6))));
const VEIL_A: Rect = { x: -2500, y: -1800, w: 7000, h: 4600 };
const veilLayers = (f: number): Layer[] => {
  const a = washAt(f);
  if (a <= 0.002) return [];
  const veilA = canvasLayer('veil-a', 'veil-a', 4, 4, -10, VEIL_A, (ctx, cw, ch) => {
    ctx.fillStyle = VEIL;
    ctx.fillRect(0, 0, cw, ch);
  }, { opacity: a });
  const veilB = canvasLayer('veil-b', 'veil-b', DESK_META.w, DESK_META.h, D_DESK, DESK_W, (ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(getImg(P1.url('desk2')), 0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = VEIL;
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    SCREEN_Q.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }, { opacity: a });
  return [veilA, veilB];
};

// ---------------------------------------------------------------------------------------------------------------
// The room: Part 1's opening set. Seated with the mug until the notebook cut, then h-desk-book.
const SEAT_HEAD = 158 * HUMAN_S;
const KEYS_PX = { x: 300, y: 320 };
const bookRect = (name: string): Rect => {
  const m = sp(name);
  const hands = m.hands as number[];
  const key = deskPx(KEYS_PX.x, KEYS_PX.y);
  const floorY = (m.floorY as number | undefined) ?? (m.bbox[3] as number);
  const sHead = m.headPx ? SEAT_HEAD / (m.headPx as number) : HUMAN_S;
  const sFit = (FEET_Y - key[1]) / (floorY - (hands[1] as number));
  const s = Math.min(sHead * 1.08, Math.max(sHead * 0.92, sFit));
  return { x: key[0] - (hands[0] as number) * s, y: FEET_Y - floorY * s - LIFT_PAD * s, w: m.w * s, h: (m.h + LIFT_PAD) * s };
};
const seatedRect = (name: string): Rect => {
  const m = sp(name);
  const s = HUMAN_S * (SEAT_K[name] ?? 1);
  const top = FEET_Y - (m.bbox[3] as number) * s;
  return { x: HUMAN_X, y: top - LIFT_PAD * s, w: m.w * s, h: (m.h + LIFT_PAD) * s };
};

/** Life clock: continues through the shot, then eases back to 0 so the dust equals Part 1's t = 0 on the loop frame. */
const lifeT = (f: number): number => sec(f - F_ROOM) * (1 - easeInOut(span(f, F_PUSH, F_END)));

const roomLayers = (f: number, ht = false): Layer[] => {
  const t = lifeT(f);
  const book = f >= F_BOOK && f < FLASH_AT + FLASH_UP - 1;
  const name = book ? pose('h-desk-book') : 'h-mug2';
  const m = sp(name);
  const hr = book ? bookRect(name) : seatedRect(name);
  const hs = book ? hr.w / m.w : HUMAN_S * (SEAT_K[name] ?? 1);
  const hair: HairOpts = { ...(m.hair as { x0: number; y0: number; x1: number; y1: number }), amp: 1.4, face: 'right' };
  const layers: Layer[] = [
    canvasLayer('sky', 'sky', 900, 900, D_SKY, SKY_W, (ctx, cw, ch) => paintSky(ctx, cw, ch, t, 0, { sunR: 0.075, dotStep: 0.009 })),
    { id: 'room', src: { kind: 'image', url: P1.url('room-morning') }, d: D_ROOM, ...ROOM_W },
    contactShadow('human-shadow', D_HUMAN, hr.x + 0.06 * hr.w, hr.x + 0.98 * hr.w, FEET_Y),
    charLayer('human', name, hr, D_HUMAN, t, { breath: humanBreath, hair, notes: true }),
  ];
  if (!book) {
    const mugTop = m.mugTop as [number, number];
    const sx = hr.x + mugTop[0] * hs;
    const sy = hr.y + (mugTop[1] + LIFT_PAD) * hs;
    layers.push(canvasLayer('steam', 'steam', 160, 300, D_HUMAN, { x: sx - 30, y: sy - 118, w: 72, h: 120 }, (ctx, cw, ch) => paintSteam(ctx, cw, ch, t, 'mug', { lean: 0.35 }), { opacity: 0.8 }));
  }
  const wash = veilLayers(f);
  layers.push(...wash.filter((l) => l.id === 'veil-a'));
  // The notebook and the hand on it are drawn side-on at tabletop height: behind the desk plane they vanish behind the
  // keyboard and the monitor foot, so that slice of the drawing is repeated in front of the desk (identical pixels).
  const front: Layer[] = [];
  const frontA = 1;
  if (book && frontA > 0) {
    const own = charLayer('human-book', name, hr, D_HUMAN, t, { breath: humanBreath, hair, notes: true });
    const src = own.src as { paint: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void; key: string; cw: number; ch: number; kind: 'canvas' };
    const crop = (ctx: CanvasRenderingContext2D, cw: number): void => {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillRect(330, LIFT_PAD + 240, cw, 175);
      ctx.globalCompositeOperation = 'source-over';
    };
    front.push({ ...own, d: D_DESK, src: { ...src, paint: (ctx, cw, ch) => { src.paint(ctx, cw, ch); crop(ctx, cw); } } });
    // Its veil goes through the same layer blend as the room's veil (tinting inside the canvas left a visible seam).
    const a = washAt(f);
    if (a > 0.002) {
      front.push({
        ...own,
        id: 'human-book-veil',
        d: D_DESK,
        opacity: a,
        src: {
          ...src,
          key: `${src.key}:veil`,
          paint: (ctx, cw, ch) => {
            src.paint(ctx, cw, ch);
            crop(ctx, cw);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = VEIL;
            ctx.fillRect(0, 0, cw, ch);
            ctx.globalCompositeOperation = 'source-over';
          },
        },
      });
    }
  }
  layers.push(
    ...(DESK_META.legs as number[][]).map((l, i) => {
      const a = deskPx(l[0] as number, DESK_META.floorY as number);
      const b = deskPx(l[1] as number, DESK_META.floorY as number);
      return contactShadow(`desk-shadow-${i}`, D_DESK, a[0] - 14, b[0] + 14, a[1]);
    }),
    { id: 'desk', src: { kind: 'image', url: P1.url('desk2') }, d: D_DESK, ...DESK_W },
    ...wash.filter((l) => l.id === 'veil-b'),
    canvasLayer('screen', 'screen', Math.round((SCR_BOX.x1 - SCR_BOX.x0) * SCR_RES), Math.round((SCR_BOX.y1 - SCR_BOX.y0) * SCR_RES), D_DESK, scrW, paintScreen(f, ht)),
    ...front,
    canvasLayer('dust', 'desk-dust', 1400, 900, D_DUST, placeAt({ x: 200, y: -100, w: 1700, h: 1100 }, D_DUST), (ctx, cw, ch) => paintDust(ctx, cw, ch, t, 'desk-dust', 30), { opacity: 0.75 }),
  );
  return layers;
};

// Camera: one continuous curve from the squeegee landing to Part 1's hand-over camera. It creeps from the start (the
// room is never static) and gathers speed toward the end (the reverse of Part 1's pull-back); no corner on the way.
const CAM_START: Cam = { x: 880, y: 540, z: 1000 };
const camAt = (f: number): Cam => {
  const s = span(f, F_ROOM, F_END);
  const u = 1 - (0.25 * s + 0.75 * s * s * s * s);
  const z = Math.exp(lerp(Math.log(CAM_LOOP.z), Math.log(CAM_START.z), u));
  const w = clamp01((z - CAM_LOOP.z) / (CAM_START.z - CAM_LOOP.z));
  return { x: lerp(CAM_LOOP.x, CAM_START.x, w), y: lerp(CAM_LOOP.y, CAM_START.y, w), z: f >= F_END ? CAM_LOOP.z : z };
};

const roomPainter = (f: number): Painter => (ctx, w, h) => paintLayers(ctx, roomLayers(f), camAt(f), f, w, h);
/** The squeegee's to side: the morning room with the union's yellow plate still on top. */
const roomWithGhost = (f: number): Painter => (ctx, w, h) => {
  roomPainter(f)(ctx, w, h);
  ghostPainter(f)(ctx, w, h);
};
const unionBoxW = (): number => unionBoxRect().w;
const unionBoxX = (): number => unionBoxRect().x;
const unionBoxY = (): number => unionBoxRect().y;

/** The print: the shader's own pull ease is flattened in the middle so the blade never jumps frame to frame. */
const printP = (f: number): number => {
  const u = clamp01((f - F_PRINT) / (F_ROOM - 1 - F_PRINT));
  if (u <= 0 || u >= 1) return u;
  return 0.3 * u + 0.7 * (Math.acos(1 - 2 * u) / Math.PI);
};
/** The squeegee's from side: the world with the union's one yellow field over it. */
const codaPainter = (f: number): Painter => (ctx, w, h) => {
  worldPainter(f)(ctx, w, h);
  heartOverlay(f)?.(ctx, w, h);
};

// ---------------------------------------------------------------------------------------------------------------
// The union's yellow plate stays on the paper through the white print (the squeegee prints the morning UNDER it), then
// breaks into its own halftone dots, which lift from the palms outward and drain, shrinking, into the cursor: the
// cursor is printed in the ink they shared. Flat moon-yellow dots with a thin navy rim (the union's keyline); no glow.
const GHOST_HOLD = F_ROOM + 2;
const CURSOR_X = (): number => -(P1_WORD_LEN / 2) * ADVANCE * FONT_PX * SCR_RES + 6.5 * SCR_RES;
const cursorScreen = (f: number): [number, number] => {
  const { c, u } = SCREEN_FRAME;
  const px = c[0] + u[0] * CURSOR_X();
  const py = c[1] + u[1] * CURSOR_X();
  const cw = (SCR_BOX.x1 - SCR_BOX.x0) * SCR_RES;
  const ch = (SCR_BOX.y1 - SCR_BOX.y0) * SCR_RES;
  const wx = scrW.x + (px / cw) * scrW.w;
  const wy = scrW.y + (py / ch) * scrW.h;
  const cam = camAt(f);
  const k = 1000 / (cam.z + D_DESK);
  return [960 + (wx - cam.x) * k, 540 + (wy - cam.y) * k];
};
interface Drop {
  x: number;
  y: number;
  r: number;
  a: number;
  len: number;
  bend: number;
}
let dropsCache: Drop[] | null = null;
const drops = (): Drop[] => {
  if (dropsCache) return dropsCache;
  const { rect } = unionOnScreen(GHOST_HOLD);
  const k = rect.w / unionBoxW();
  const palm: [number, number] = [rect.x + rect.w / 2, rect.y + rect.h * 0.28];
  const reach = Math.hypot(rect.w, rect.h) * 0.75;
  const rnd = seeded('p4f:drain');
  dropsCache = unionDots().map(([wx, wy]) => {
    const x = rect.x + (wx - unionBoxX()) * k;
    const y = rect.y + (wy - unionBoxY()) * k;
    const d = Math.hypot(x - palm[0], y - palm[1]) / reach;
    // ordered from the palms outward, small bends: the ink flows as one ribbon, not a swarm
    return { x, y, r: 16 * k * 0.62, a: GHOST_HOLD + 36 * Math.min(1, d) + 4 * rnd(), len: 26 + 8 * rnd(), bend: (rnd() - 0.5) * 140 };
  });
  return dropsCache;
};
const DRAIN_END = GHOST_HOLD + 36 + 4 + 34 + 1;

/** The union print as a screen-space painter (the yellow plate left on the paper). */
const ghostPainter = (f: number): Painter => (ctx) => {
  const { canvas, rect } = unionOnScreen(Math.min(f, GHOST_HOLD));
  ctx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h);
};
const drainOverlay = (f: number): Painter | undefined => {
  if (f < F_ROOM || f >= DRAIN_END) return undefined;
  if (f < GHOST_HOLD) return ghostPainter(f);
  const [tx, ty] = cursorScreen(f);
  const ds = drops();
  return (ctx) => {
    for (const pass of [0, 1] as const) {
      ctx.save();
      ctx.fillStyle = pass === 0 ? palette.navy : palette.moonYellow;
      ctx.beginPath();
      for (const d of ds) {
        const u = (f - d.a) / d.len;
        if (u >= 1) continue;
        const e = easeInOut(Math.max(0, u));
        const mx = (d.x + tx) / 2 + d.bend * 0.5;
        const my = (d.y + ty) / 2 - Math.abs(d.bend) * 0.35;
        const x = (1 - e) * (1 - e) * d.x + 2 * (1 - e) * e * mx + e * e * tx;
        const y = (1 - e) * (1 - e) * d.y + 2 * (1 - e) * e * my + e * e * ty;
        // waiting dots sit at full size (together they still read as the figure); travelling ones shrink
        // the navy rim comes with the travel (a waiting dot is plain ink, like the union it was)
        const r = d.r * (1 - 0.72 * e) + (pass === 0 ? 1.4 * Math.min(1, e * 3) : 0);
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  };
};

export const RESET_V3_IMAGES: readonly string[] = [P1.url('room-morning'), P1.url('desk2'), ...spriteUrls(['h-mug2', pose('h-desk-book')]), url('h-mug2')];

export const resetV3Shot = (f: number, ht = false): Shot => {
  if (f < F_ROOM) {
    return { kind: 'gl', fx: 'squeegee', p: printP(f), seconds: (F_ROOM - F_PRINT) / 30, time: (f - F_PRINT) / 30, from: codaPainter(f), to: roomWithGhost(f) };
  }
  return { kind: 'stage', layers: roomLayers(f, ht), cam: camAt(f), overlay: drainOverlay(f) };
};
void LOOP_AT;
