import { staticFile } from 'remotion';
import { palette } from '../style/palette.ts';
import { seeded } from '../style/seeded.ts';
import { TEXT_FONT } from '../style/fonts.ts';
import { G1_SPLIT_NOTES } from '../scenes/TransitionsTestScene.tsx';
import { paintNotes } from '../transitions/layers.ts';
import { FPS, TIMING, nearestBeatIndex, toFrame } from '../timing.ts';
import { H, W } from '../layout.ts';
import { clamp01, lerp } from '../math.ts';
import { D0, planeScale, type Cam, type Layer } from './types.ts';
import { blink, LIFT_PAD, paintCharacter, paintDust, paintSky, paintSteam, rock } from './life.ts';
import { paintPenReveal } from './pen.ts';
import EVENTS from './events.json' with { type: 'json' };
import SPRITES from './sprites.json' with { type: 'json' };

/**
 * Shot design of the LivingTest (song 0:15.60-0:31.00, scene map v2 rows "Sabah yine ayni ekran" and "Merhaba
 * yaziyorsun bana"). Everything is in SONG frames; the composition plays songStart..songEnd. Each beat is a complete
 * drawn pose; inside a pose only small life moves; the camera and the depth layers carry the motion.
 *
 *   468  (bar 9)   on his screen's cursor, the camera pulls back to the morning desk; P1 (mug at chest) breathes,
 *                  steam rises, the sun rises in the window
 *   623-665        "Merhaba" types itself on his screen, one letter per half beat
 *   637  (bar 12)  cut: P2 (mug raised, about to sip), closer framing, slow push toward the screen
 *   690-750        HalftoneBloom from the cursor into the split (lands on bar 14)
 *   750-806        the invisible pen draws the AI's outline, the ink fills her
 *   806-848        she waves: two drawn poses alternating on the beat; her cursor eye opens
 *   862  (bar 16)  cut: he stands at the glass holding yesterday's note; she stands and rocks on her heels
 */
export const SONG_START = EVENTS.songStart;
export const SONG_END = EVENTS.songEnd;
const ev = (name: string): number => {
  const e = EVENTS.events.find((x) => x.name.startsWith(name));
  if (!e) throw new Error(`no event ${name}`);
  return e.f;
};
export const F = {
  open: ev('open on the cursor'),
  type: ev('Merhaba letter 1'),
  cut2: ev('cut: P1 wide'),
  bloom0: ev('HalftoneBloom starts'),
  land: ev('HalftoneBloom lands'),
  penFill: ev('pen line closed'),
  wave: ev('AI wave pose A'),
  glass: ev('cut: human at the glass'),
};
export const BLOOM_FRAMES = F.land - F.bloom0;

const url = (n: string): string => staticFile(`living/${n}.png`);
type SpriteMeta = { w: number; h: number; bbox: number[]; eye?: number[]; outline?: number[][] };
const SP = SPRITES as unknown as Record<string, SpriteMeta>;
const sp = (n: string): SpriteMeta => {
  const m = SP[n];
  if (!m) throw new Error(`no sprite ${n}`);
  return m;
};

export const ROOM_SPLIT = { key: staticFile('plates/room-key.png'), moon: staticFile('plates/room-moon.png') };
export const IMAGE_URLS: readonly string[] = [
  url('room-morning'),
  url('desk'),
  url('h-sit-mug'),
  url('h-sit-sip'),
  url('h-glass-note'),
  ...['ai-stand', 'ai-wave-a', 'ai-wave-b'].flatMap((n) => [url(`${n}-noeye`), url(`${n}-eye`)]),
  ROOM_SPLIT.key,
  ROOM_SPLIT.moon,
];

// ---------------------------------------------------------------------------------------------------------------
// Placement: layers are designed as screen rectangles under a reference camera and converted to their own plane.

const REF: Cam = { x: W / 2, y: H / 2, z: D0 };
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** World rectangle on the plane at depth d that a reference camera sees at screen rect r. */
const placeAt = (r: Rect, d: number): Rect => {
  const k = planeScale(REF, d);
  return { x: REF.x + (r.x - W / 2) / k, y: REF.y + (r.y - H / 2) / k, w: r.w / k, h: r.h / k };
};
/** World point on the plane at depth d seen by the reference camera at screen point (x, y). */
const pointAt = (x: number, y: number, d: number): [number, number] => {
  const k = planeScale(REF, d);
  return [REF.x + (x - W / 2) / k, REF.y + (y - H / 2) / k];
};
/** Where a world point on plane d lands on screen under `cam`. */
export const project = (cam: Cam, d: number, p: readonly [number, number]): [number, number] => {
  const k = planeScale(cam, d);
  return [W / 2 + (p[0] - cam.x) * k, H / 2 + (p[1] - cam.y) * k];
};

const easeInOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const sine = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
const span = (f: number, a: number, b: number): number => clamp01((f - a) / (b - a));
const sec = (f: number): number => f / FPS;

// ---------------------------------------------------------------------------------------------------------------
// Desk shots: depths and screen layout under REF.

const D_SKY = 700;
const D_ROOM = 300;
const D_HUMAN = 0;
const D_DESK = -60;
const D_DUST = -220;

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
// The sky sits far behind the window, so it is bigger than the opening (the camera moves see more of it).
const SKY_W = placeAt({ x: winScr.x - winScr.w * 0.45, y: winScr.y - winScr.h * 0.25, w: winScr.w * 1.9, h: winScr.h * 1.45 }, D_SKY);

/** Seated human: sprite scale and feet line under REF (P1 and P2 share the chair position). */
const HUMAN_S = 0.86;
const HUMAN_X = 300;
const FEET_Y = 965;
const humanRect = (name: string, s: number, x: number, feet: number): Rect => {
  const m = sp(name);
  const top = feet - (m.bbox[3] as number) * s;
  return { x, y: top - LIFT_PAD * s, w: m.w * s, h: (m.h + LIFT_PAD) * s };
};

const DESK_S = 0.8;
const DESK_SCR: Rect = { x: 640, y: 960 - 838 * DESK_S, w: 966 * DESK_S, h: 844 * DESK_S };
const DESK_W = placeAt(DESK_SCR, D_DESK);
const deskPx = (px: number, py: number): [number, number] => [DESK_W.x + (px / 966) * DESK_W.w, DESK_W.y + (py / 844) * DESK_W.h];
/** Inner screen of desk.png (sprite px): TL, TR, BR, BL (measured, the monitor is turned three-quarter). */
const SCREEN_Q: readonly (readonly [number, number])[] = [
  [325, 22],
  [720, 40],
  [711, 229],
  [293, 245],
];
const SCR_BOX = { x0: 288, y0: 16, x1: 726, y1: 252 };
const SCR_RES = 2.4; // canvas px per sprite px
const scrW: Rect = (() => {
  const a = deskPx(SCR_BOX.x0, SCR_BOX.y0);
  const b = deskPx(SCR_BOX.x1, SCR_BOX.y1);
  return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] };
})();
/** Bilinear point on the screen quad, in screen-canvas px. */
const quad = (u: number, v: number): [number, number] => {
  const [a, b, c, d] = SCREEN_Q as [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];
  const x = (1 - v) * ((1 - u) * a[0] + u * b[0]) + v * ((1 - u) * d[0] + u * c[0]);
  const y = (1 - v) * ((1 - u) * a[1] + u * b[1]) + v * ((1 - u) * d[1] + u * c[1]);
  return [(x - SCR_BOX.x0) * SCR_RES, (y - SCR_BOX.y0) * SCR_RES];
};

const WORD = 'Merhaba';
const typeBeat = nearestBeatIndex(F.type / FPS);
/** Song frame of letter i: one letter per half beat from the "Merhaba letter 1" beat. */
const letterFrame = (i: number): number => {
  const b = typeBeat + Math.floor(i / 2);
  const t0 = TIMING.beats[b] as number;
  const t1 = TIMING.beats[b + 1] as number;
  return toFrame(i % 2 === 0 ? t0 : (t0 + t1) / 2);
};
const LETTERS = Array.from({ length: WORD.length }, (_, i) => letterFrame(i));
const beatPhase = (f: number): number => {
  // Half a frame late: a beat lands on the frame it rounds to (f468 is 15.600 s, the beat 15.6048 s).
  const t = (f + 0.5) / FPS;
  const i = nearestBeatIndex(t);
  const b = TIMING.beats[i] as number;
  const j = t >= b ? i : i - 1;
  const t0 = TIMING.beats[j] as number;
  const t1 = TIMING.beats[j + 1] as number;
  return (t - t0) / (t1 - t0);
};

const FONT_PX = 34; // letter size in sprite px of desk.png (the canvas draws it SCR_RES times larger)
const ADVANCE = 0.6; // IBM Plex Mono advance width, em
/** The screen plane's local frame at its centre (canvas px): origin and unit axes along the quad's u and v. */
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
/** Cursor centre along the text line (canvas px from the screen centre) after n letters. */
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
  // The cursor follows the text; it blinks on the beat (on for the first half) except while typing.
  const typing = n > 0 && n < WORD.length;
  if (typing || beatPhase(f) < 0.5) {
    const ch = FONT_PX * SCR_RES * 1.05;
    ctx.fillRect(cursorOffset(n) - 2.5 * SCR_RES, -ch / 2, 5 * SCR_RES, ch);
  }
  ctx.restore();
};
/** Cursor centre in world units on the desk plane at frame f (opening framing, bloom drop). */
const cursorWorld = (f: number): [number, number] => {
  const { c, u } = SCREEN_FRAME;
  const o = cursorOffset(typedCount(f));
  const cw = (SCR_BOX.x1 - SCR_BOX.x0) * SCR_RES;
  const ch = (SCR_BOX.y1 - SCR_BOX.y0) * SCR_RES;
  return [scrW.x + ((c[0] + u[0] * o) / cw) * scrW.w, scrW.y + ((c[1] + u[1] * o) / ch) * scrW.h];
};

const humanBreath = { top: 0.24, hip: 0.6, amp: 0.011, period: 3.6, phase: 0 };

/** Song-frame sun progress: rises through both desk shots. */
const sunP = (f: number): number => sine(span(f, F.open, F.land));

const deskLayers = (f: number, pose: 'mug' | 'sip'): Layer[] => {
  const t = sec(f - F.open);
  const name = pose === 'mug' ? 'h-sit-mug' : 'h-sit-sip';
  const hr = humanRect(name, HUMAN_S, HUMAN_X, FEET_Y);
  const m = sp(name);
  // The sip: in P2 the raised mug and head drift up a few px and settle while he drinks (small life only).
  const sipT = span(f, F.cut2 + 8, F.cut2 + 8 + 75);
  const lift = pose === 'sip' ? 4 * Math.sin(Math.PI * sine(sipT)) : 0;
  const hair = pose === 'mug' ? { x0: 130, y0: 4, x1: 240, y1: 110, amp: 1.4, face: 'right' as const } : { x0: 115, y0: 4, x1: 225, y1: 100, amp: 1.4, face: 'right' as const };
  const mugTop: [number, number] = pose === 'mug' ? [301, 262] : [283, 136];
  const steamX = hr.x + mugTop[0] * HUMAN_S;
  const steamY = hr.y + (mugTop[1] + LIFT_PAD) * HUMAN_S - (pose === 'sip' ? lift : 0);
  const img = { kind: 'image' as const };
  return [
    {
      id: 'sky',
      src: { kind: 'canvas', key: 'sky', cw: 900, ch: 900, paint: (ctx, cw, ch) => paintSky(ctx, cw, ch, t, sunP(f)) },
      d: D_SKY,
      ...SKY_W,
    },
    { id: 'room', src: { ...img, url: url('room-morning') }, d: D_ROOM, ...ROOM_W },
    {
      id: 'human',
      src: {
        kind: 'canvas',
        key: `human-${pose}`,
        cw: m.w,
        ch: m.h + LIFT_PAD,
        paint: (ctx, cw, ch) => paintCharacter(ctx, cw, ch, getImg(url(name)), { t, breath: humanBreath, lift, hair, notes: true }),
      },
      d: D_HUMAN,
      ...hr,
    },
    {
      id: 'steam',
      src: { kind: 'canvas', key: 'steam', cw: 160, ch: 360, paint: (ctx, cw, ch) => paintSteam(ctx, cw, ch, t, 'mug') },
      d: D_HUMAN,
      x: steamX - 36,
      y: steamY - 160,
      w: 72,
      h: 162,
      // In P2 the mug is at his chin: the steam thins out so it does not veil his profile.
      opacity: pose === 'mug' ? 0.85 : 0.45,
    },
    { id: 'desk', src: { ...img, url: url('desk') }, d: D_DESK, ...DESK_W },
    {
      id: 'screen',
      src: { kind: 'canvas', key: 'screen', cw: Math.round((SCR_BOX.x1 - SCR_BOX.x0) * SCR_RES), ch: Math.round((SCR_BOX.y1 - SCR_BOX.y0) * SCR_RES), paint: paintScreen(f) },
      d: D_DESK,
      ...scrW,
    },
    {
      id: 'dust',
      src: { kind: 'canvas', key: 'dust', cw: 1400, ch: 900, paint: (ctx, cw, ch) => paintDust(ctx, cw, ch, t, 'desk-dust', 26) },
      d: D_DUST,
      ...placeAt({ x: 300, y: -60, w: 1400, h: 900 }, D_DUST),
      opacity: 0.7,
    },
  ];
};

// Shot 1: from the cursor (screen filling the frame) back to the whole desk; one eased move, log-distance.
const CAM1_END: Cam = { x: 880, y: 540, z: D0 };
const cam1 = (f: number): Cam => {
  const u = easeInOut(span(f, F.open, F.cut2 - 4));
  const c = cursorWorld(F.open);
  const z0 = 280;
  const z = Math.exp(lerp(Math.log(z0), Math.log(CAM1_END.z), u));
  // Lateral position follows the zoom so the cursor stays put on screen early and the framing settles late.
  const w = clamp01((z - z0) / (CAM1_END.z - z0));
  return { x: lerp(c[0], CAM1_END.x, w), y: lerp(c[1], CAM1_END.y, w), z };
};
// Shot 2: closer on him and the screen, a slow push toward the cursor.
const cam2 = (f: number): Cam => {
  const u = sine(span(f, F.cut2, F.land));
  return { x: lerp(760, 800, u), y: lerp(468, 462, u), z: lerp(650, 590, u) };
};

// ---------------------------------------------------------------------------------------------------------------
// The split (glass) shots.

const D_SROOM = 150;
const D_GLASS = 0;
const D_NOTES = -250;
const FLOOR = 1008;
const SROOM_W = placeAt({ x: 0, y: 0, w: W / 2, h: H }, D_SROOM);

const seamPts = (key: string, x: number, amp: number): [number, number][] => {
  const r = seeded(key);
  const pts: [number, number][] = [];
  for (let y = -10; y <= H + 20; y += 26) pts.push([x + (r() - 0.5) * 2 * amp, y]);
  return pts;
};
// The approved split's glass seam (same seeded strokes as TransitionsTestScene's paintSplit / GlassSeam.tsx).
const SEAM_A = seamPts('seam-a', W / 2 - 2.5, 1.2);
const SEAM_B = seamPts('seam-b', W / 2 + 1.5, 1.4);
const CREAM_W: Rect = { x: W / 2, y: -500, w: 2600, h: 2200 };

const paintCream = (ctx: CanvasRenderingContext2D, cw: number, ch: number): void => {
  const s = cw / CREAM_W.w;
  ctx.fillStyle = palette.cream;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, (FLOOR - 2 - CREAM_W.y) * s, cw, 3 * s);
  // Glass seam on the cream layer's left edge (world x = W/2 is canvas x = 0..).
  const stroke = (pts: [number, number][], color: string, width: number): void => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const cx = (x - CREAM_W.x) * s;
      const cy = (y - CREAM_W.y) * s;
      if (i) ctx.lineTo(cx, cy);
      else ctx.moveTo(cx, cy);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width * s;
    ctx.stroke();
  };
  stroke(SEAM_B, palette.navy, 3.5);
};

const AI_S = 840 / 889;
const AI_EYE_X = 1212;
type AiPose = 'ai-stand' | 'ai-wave-a' | 'ai-wave-b';
/** AI sprite rect: every pose is aligned on its cursor eye (the head stays put) and its feet on the floor. */
const aiRect = (name: AiPose): Rect => {
  const m = sp(name);
  const eye = m.eye as number[];
  const ex = (eye[0] as number) + (eye[2] as number) / 2;
  return { x: AI_EYE_X - ex * AI_S, y: FLOOR - (m.bbox[3] as number) * AI_S, w: m.w * AI_S, h: m.h * AI_S };
};
const eyeRect = (name: AiPose, scaleY: number): Rect => {
  const m = sp(name);
  const r = aiRect(name);
  const eye = m.eye as number[];
  const ex = (eye[0] as number) - 2;
  const ey = (eye[1] as number) - 2;
  const ew = (eye[2] as number) + 4;
  const eh = (eye[3] as number) + 4;
  const cy = r.y + (ey + eh / 2) * AI_S;
  return { x: r.x + ex * AI_S, y: cy - (eh * AI_S * scaleY) / 2, w: ew * AI_S, h: eh * AI_S * scaleY };
};

const GLASS_S = 800 / 864;
const glassHumanRect = (): Rect => {
  const m = sp('h-glass-note');
  const s = GLASS_S;
  const top = FLOOR - (m.bbox[3] as number) * s;
  const x = W / 2 - 5 - (m.bbox[2] as number) * s;
  return { x, y: top - LIFT_PAD * s, w: m.w * s, h: (m.h + LIFT_PAD) * s };
};

const wavePose = (f: number): AiPose => {
  // The wave beats come from events.json (A, B, A, B); she stands from the glass cut on.
  const marks = EVENTS.events.filter((e) => e.name.startsWith('AI wave pose')).map((e) => ({ f: e.f, b: e.name.endsWith('B') }));
  let pose: AiPose = 'ai-wave-a';
  for (const m of marks) if (f >= m.f) pose = m.b ? 'ai-wave-b' : 'ai-wave-a';
  return pose;
};
const AI_BLINKS = [876, 904];

const splitLayers = (f: number): Layer[] => {
  const t = sec(f - F.bloom0);
  const layers: Layer[] = [
    { id: 'sroom', src: { kind: 'image', url: ROOM_SPLIT.key }, d: D_SROOM, ...SROOM_W },
    { id: 'smoon', src: { kind: 'image', url: ROOM_SPLIT.moon }, d: D_SROOM, ...SROOM_W },
    {
      id: 'cream',
      src: { kind: 'canvas', key: 'cream', cw: 1300, ch: 1100, paint: paintCream },
      d: D_GLASS,
      ...CREAM_W,
    },
  ];
  // The room side's cream rim of the seam is drawn over the room, on the glass plane.
  layers.push({
    id: 'seam-rim',
    src: {
      kind: 'canvas',
      key: 'seam-rim',
      cw: 40,
      ch: 1200,
      paint: (ctx, cw, ch) => {
        ctx.beginPath();
        SEAM_A.forEach(([x, y], i) => {
          const cx = ((x - (W / 2 - 20)) / 40) * cw;
          const cy = ((y + 60) / 1200) * ch;
          if (i) ctx.lineTo(cx, cy);
          else ctx.moveTo(cx, cy);
        });
        ctx.strokeStyle = palette.cream;
        ctx.lineWidth = 3;
        ctx.stroke();
      },
    },
    d: D_GLASS,
    x: W / 2 - 20,
    y: -60,
    w: 40,
    h: 1200,
  });

  // The AI: drawn by the pen (750-806), waving (806-862), standing and rocking (862-).
  if (f >= F.land) {
    if (f < F.wave) {
      const line = easeInOut(span(f, F.land, F.penFill));
      const fill = sine(span(f, F.penFill, F.wave - 1));
      const m = sp('ai-stand');
      layers.push({
        id: 'ai-pen',
        src: {
          kind: 'canvas',
          key: 'ai-pen',
          cw: m.w,
          ch: m.h,
          paint: (ctx, cw, ch) => paintPenReveal(ctx, cw, ch, getImg(url('ai-stand-noeye')), { outline: m.outline as [number, number][], line, fill, stroke: 4.2 }),
        },
        d: D_GLASS,
        ...aiRect('ai-stand'),
      });
    } else {
      const pose: AiPose = f >= F.glass ? 'ai-stand' : wavePose(f);
      const r = aiRect(pose);
      const m = sp(pose);
      const rot = f >= F.glass ? rock(f, F.glass, 56, 1.1) : 0;
      // Heel: facing left, the heel is the right end of the foot.
      const pivot: [number, number] = [r.x + ((m.bbox[2] as number) - 14) * AI_S, FLOOR];
      // Eye opens on the wave downbeat (grows from a line), then blinks on beats.
      const open = f < F.wave + 4 ? [0.1, 0.45, 0.8, 1][f - F.wave] ?? 1 : 1;
      const sy = Math.min(open, blink(f, AI_BLINKS));
      layers.push({ id: 'ai', src: { kind: 'image', url: url(`${pose}-noeye`) }, d: D_GLASS, ...r, rot, pivot });
      layers.push({ id: 'ai-eye', src: { kind: 'image', url: url(`${pose}-eye`) }, d: D_GLASS, ...eyeRect(pose, sy), rot, pivot });
    }
  }
  if (f >= F.glass) {
    const m = sp('h-glass-note');
    layers.push({
      id: 'h-glass',
      src: {
        kind: 'canvas',
        key: 'h-glass',
        cw: m.w,
        ch: m.h + LIFT_PAD,
        paint: (ctx, cw, ch) =>
          paintCharacter(ctx, cw, ch, getImg(url('h-glass-note')), {
            t: sec(f - F.glass),
            breath: { top: 0.16, hip: 0.5, amp: 0.009, period: 3.8, phase: 0.1 },
            hair: { x0: 95, y0: 4, x1: 185, y1: 90, amp: 1.2, face: 'right' },
            notes: true,
          }),
      },
      d: D_GLASS,
      ...glassHumanRect(),
    });
  }
  const NOTES_W = placeAt({ x: -240, y: -135, w: 2400, h: 1350 }, D_NOTES);
  layers.push({
    id: 'snotes',
    src: { kind: 'canvas', key: 'snotes', cw: 1600, ch: 900, paint: (ctx, cw, ch) => {
      ctx.save();
      ctx.scale(cw / 2400, ch / 1350);
      paintNotes(ctx, G1_SPLIT_NOTES, t + 3, 2400, 1350, { s: 1, x: 0, y: 0 });
      ctx.restore();
    } },
    d: D_NOTES,
    ...NOTES_W,
  });
  return layers;
};

// Split cameras: after the bloom a slow push toward the cream side where the pen draws her; the glass cut reframes
// on both of them.
const camSplit = (f: number): Cam => {
  if (f < F.glass) {
    const u = sine(span(f, F.bloom0, F.glass));
    return { x: lerp(960, 1110, u), y: lerp(540, 560, u), z: lerp(1000, 880, u) };
  }
  const u = sine(span(f, F.glass, SONG_END));
  return { x: lerp(1010, 1000, u), y: lerp(566, 560, u), z: lerp(930, 885, u) };
};

// ---------------------------------------------------------------------------------------------------------------

let imgLookup: (u: string) => HTMLImageElement = () => {
  throw new Error('images not ready');
};
const getImg = (u: string): HTMLImageElement => imgLookup(u);
export const setImageLookup = (fn: (u: string) => HTMLImageElement): void => {
  imgLookup = fn;
};

export interface StageShot {
  kind: 'stage';
  layers: Layer[];
  cam: Cam;
}
export interface BloomShot {
  kind: 'bloom';
  p: number;
  from: StageShot;
  to: StageShot;
  /** Drop origin in uv (top-left). */
  origin: [number, number];
}
export type Shot = StageShot | BloomShot;

const deskShot = (f: number): StageShot =>
  f < F.cut2 ? { kind: 'stage', layers: deskLayers(f, 'mug'), cam: cam1(f) } : { kind: 'stage', layers: deskLayers(f, 'sip'), cam: cam2(f) };
const splitShot = (f: number): StageShot => ({ kind: 'stage', layers: splitLayers(f), cam: camSplit(f) });

export const shotAt = (f: number): Shot => {
  if (f < F.bloom0) return deskShot(f);
  if (f < F.land) {
    const c = project(cam2(F.bloom0), D_DESK, cursorWorld(F.bloom0));
    return { kind: 'bloom', p: (f - F.bloom0) / BLOOM_FRAMES, from: deskShot(f), to: splitShot(f), origin: [c[0] / W, c[1] / H] };
  }
  return splitShot(f);
};

/** Probe for checks: screen position of the cursor at song frame f (desk shots). */
export const cursorOnScreen = (f: number): [number, number] => project(f < F.cut2 ? cam1(f) : cam2(f), D_DESK, cursorWorld(f));
export { pointAt };
