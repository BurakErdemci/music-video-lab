// The typography schedule (docs/typography.md): key-word slams and location titles. Plain .ts, no JSX:
// src/events.ts imports TYPE_EVENTS and tools/beatcheck.mjs loads it with node.
// Every in-frame is a measured anchor (anchors.ts); every hold is written in seconds and converted with FPS.
// Building the schedule throws when an element leaves the frame's safe area, covers a keep-out box measured
// from the shot stills (HUD bar, helm, existing captions) or grows past the flash area limit.
import { onBeat, onHit, onWord, type VideoEvent } from '../../anchors.ts';
import { FPS, TIMING } from '../../timing.ts';
import { ANTON_CAP, antonLayout, MONO_ADV, MONO_CAP } from './metrics.ts';

export const FRAME_W = 1920;
export const FRAME_H = 1080;
/** Text must stay this far inside the frame. */
const SAFE = 30;
/** A slam's whole footprint (burst and splash included) stays under this share of the frame, below
 *  tools/flashcheck.py's 25 % area rule, so no slam can count as a luminance swing. */
export const MAX_AREA = 0.22;

export const sec = (s: number): number => Math.round(s * FPS);

export interface Box { x0: number; y0: number; x1: number; y1: number }
const box = (x0: number, y0: number, x1: number, y1: number): Box => ({ x0, y0, x1, y1 });

export type Burst = 'violet' | 'ivory' | null;

export interface SlamSpec {
  kind: 'slam';
  id: string;
  text: string;
  /** Landing frame (measured anchor). */
  at: number;
  /** First frame of the crumble. */
  out: number;
  /** Anton font size, px. */
  size: number;
  /** Centre of the cap box, px. */
  cx: number;
  cy: number;
  /** Degrees. */
  rot: number;
  burst: Burst;
  seed: number;
}

export interface HeadlineSpec {
  kind: 'headline';
  id: string;
  title: string;
  kicker: string;
  at: number;
  out: number;
  /** Top-left corner of the card, px. */
  x: number;
  y: number;
}

export interface CardSpec {
  kind: 'card';
  id: string;
  world: 'painting' | 'office';
  soft: boolean;
  kicker: string;
  title: string;
  at: number;
  out: number;
}

export type TypeSpec = SlamSpec | HeadlineSpec | CardSpec;

// ---- geometry, shared with the components so what is checked is what is drawn

/** Halftone shadow offset as a fraction of the font size. */
export const SHADOW = { dx: 0.05, dy: 0.06 };
export const slamGeometry = (s: Pick<SlamSpec, 'text' | 'size'>) => {
  const lay = antonLayout(s.text);
  const w = lay.width * s.size;
  const h = ANTON_CAP * s.size;
  return { xs: lay.xs.map((x) => x * s.size - w / 2), w, h, burstRx: w / 2 + 0.2 * s.size, burstRy: h / 2 + 0.32 * s.size, splashR: 0.24 * s.size };
};

export const HEADLINE = { titleSize: 110, kickerSize: 26, pad: 36, gap: 18, bar: 6 };
export const headlineSize = (title: string) => {
  const w = title.length * MONO_ADV * HEADLINE.titleSize + 2 * HEADLINE.pad;
  const h = HEADLINE.pad + HEADLINE.kickerSize + HEADLINE.gap + MONO_CAP * HEADLINE.titleSize + HEADLINE.gap + HEADLINE.bar + HEADLINE.pad;
  return { w, h };
};

export const CARD = { right: 60, bottom: 60, titleSize: 64, kickerSize: 30, pad: 26, gap: 14 };
/** Comic cards are sized from Anton advances; the office card's Inter title is estimated (0.7 em per cap). */
export const cardSize = (c: Pick<CardSpec, 'world' | 'kicker' | 'title'>) => {
  const titleW = c.world === 'painting' ? antonLayout(c.title, 0.03).width * CARD.titleSize : c.title.length * 0.7 * CARD.titleSize * 0.82;
  const kickerW = c.world === 'painting' ? antonLayout(c.kicker, 0.08).width * CARD.kickerSize : c.kicker.length * MONO_ADV * CARD.kickerSize * 0.8;
  const w = Math.max(titleW, kickerW) + 2 * CARD.pad;
  const h = CARD.pad + ANTON_CAP * CARD.kickerSize + CARD.gap + ANTON_CAP * CARD.titleSize + CARD.pad;
  return { w, h, x: FRAME_W - CARD.right - w, y: FRAME_H - CARD.bottom - h };
};

const rotatedBounds = (cx: number, cy: number, hw: number, hh: number, deg: number): Box => {
  const a = (deg * Math.PI) / 180;
  const ex = Math.abs(hw * Math.cos(a)) + Math.abs(hh * Math.sin(a));
  const ey = Math.abs(hw * Math.sin(a)) + Math.abs(hh * Math.cos(a));
  return box(cx - ex, cy - ey, cx + ex, cy + ey);
};
const overlaps = (a: Box, b: Box): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const inside = (a: Box): boolean => a.x0 >= SAFE && a.y0 >= SAFE && a.x1 <= FRAME_W - SAFE && a.y1 <= FRAME_H - SAFE;
const area = (a: Box): number => ((a.x1 - a.x0) * (a.y1 - a.y0)) / (FRAME_W * FRAME_H);

/** Text box (shadow included), in frame px, and the share of the frame the element paints. A slam paints
 *  its burst (a star inside the ellipse rx x ry, counted as the full ellipse) and its ink splash (counted as
 *  a solid disc of 1.6 x the splash radius; its arms and drops reach further but are thin). */
export const footprint = (t: TypeSpec): { text: Box; coverage: number } => {
  if (t.kind === 'slam') {
    const g = slamGeometry(t);
    const sh = { x: SHADOW.dx * t.size, y: SHADOW.dy * t.size };
    const text = rotatedBounds(t.cx + sh.x / 2, t.cy + sh.y / 2, g.w / 2 + sh.x / 2 + 6, g.h / 2 + sh.y / 2 + 6, t.rot);
    const burst = t.burst ? Math.PI * g.burstRx * g.burstRy : (text.x1 - text.x0) * (text.y1 - text.y0);
    return { text, coverage: (burst + Math.PI * (1.6 * g.splashR) ** 2) / (FRAME_W * FRAME_H) };
  }
  if (t.kind === 'headline') {
    const s = headlineSize(t.title);
    const b = box(t.x, t.y, t.x + s.w, t.y + s.h);
    return { text: b, coverage: area(b) };
  }
  const c = cardSize(t);
  const b = box(c.x, c.y, c.x + c.w, c.y + c.h);
  return { text: b, coverage: area(b) };
};

// ---- the schedule

const EVENTS: VideoEvent[] = [];
const ev = (e: VideoEvent): number => {
  EVENTS.push(e);
  return e.frame;
};
const word = (id: string, text: string, nth: number): number => ev(onWord(id, 'type', text, nth));
const beat = (id: string, i: number): number => ev(onBeat(id, 'type', TIMING.beats[i] as number));
const hit = (id: string, i: number): number => ev(onHit(id, 'type', (TIMING.hits[i] as { t: number }).t));

const slam = (s: Omit<SlamSpec, 'kind' | 'out'> & { hold: number; out?: number }): SlamSpec => ({ kind: 'slam', ...s, out: s.out ?? s.at + sec(s.hold) });
const headline = (h: Omit<HeadlineSpec, 'kind' | 'out' | 'kicker'> & { hold: number; kicker?: string }): HeadlineSpec => ({
  kind: 'headline', kicker: 'RELEASE NOTES · BALANCE TEAM', ...h, out: h.at + sec(h.hold),
});
const card = (c: Omit<CardSpec, 'kind' | 'out' | 'soft' | 'world'> & { hold: number; out?: number; soft?: boolean; world?: CardSpec['world'] }): CardSpec => ({
  kind: 'card', world: 'painting', soft: false, ...c, out: c.out ?? c.at + sec(c.hold),
});

const SONG_AT = word('ty-theme-song', 'song', 1);
const THEME_OUT = SONG_AT + sec(1.6);

interface Planned { spec: TypeSpec; avoid: Box[] }
// Keep-out boxes are measured on the baseline stills (video/out/typo-base*/), frame px.
const PLAN: Planned[] = [
  // S02 nave wide: he stands at x 880-1040, horns from y 385; out before the S03 cut (f227).
  { spec: slam({ id: 'ty-intro', text: 'VO-RA-THUL!', at: word('ty-intro', 'VORASOL', 0), hold: 2.5, size: 210, cx: 960, cy: 200, rot: -3, burst: 'violet', seed: 104 }), avoid: [box(870, 380, 1050, 740)] },
  // Location: nave -> organ loft (S17, hero panels top left / left).
  { spec: card({ id: 'ty-loc-loft', kicker: 'HIS HOME', title: 'THE ORGAN LOFT', at: beat('ty-loc-loft', 123), hold: 2.0 }), avoid: [box(0, 0, 1220, 720)] },
  // Location: -> rooftop (S25): PHASE III top left, METEOR RAIN top right (f1806), VORATHUL plate bottom left.
  { spec: card({ id: 'ty-loc-roof', kicker: 'OPEN SKY', title: 'THE ROOFTOP', at: hit('ty-loc-roof', 37), hold: 1.8 }), avoid: [box(110, 60, 760, 280), box(1060, 70, 1700, 260), box(0, 960, 640, 1080)] },
  // S32 office wide: Updater window x 230-450 y 560-820, standing dev x 1160-1330, Patch 2.3 window top right.
  { spec: headline({ id: 'ty-patch-23', title: 'PATCH 2.3', at: word('ty-patch-23', 'two point three', 0), hold: 1.6, x: 470, y: 820 }), avoid: [box(230, 560, 450, 840), box(1150, 380, 1340, 1080), box(1290, 60, 1920, 320)] },
  // S45 (camera pushed in, measured on f2968): HUD and HP bar y < 380, helm and horns x 540-1380. Out before f3000.
  { spec: slam({ id: 'ty-unfair', text: 'UNFAIR?!', at: word('ty-unfair', 'UNFAIR', 1), hold: 0.75, size: 128, cx: 1624, cy: 735, rot: -3, burst: 'violet', seed: 2963 }), avoid: [box(0, 0, 1920, 380), box(540, 0, 1380, 1080)] },
  // Location: -> throne room (S46). The NERFED stamp (Nerf#0) knocks the card out.
  { spec: card({ id: 'ty-loc-throne', kicker: 'AFTER THE PATCH', title: 'THE THRONE ROOM', at: beat('ty-loc-throne', 308), hold: 0, out: word('ty-loc-throne-out', 'Nerf', 0) }), avoid: [box(400, 0, 1520, 260)] },
  // S62 office: the dev with the bottle stands at x 610-830; out before the S63 cut (f4183), whose timeline fills the lower right.
  { spec: headline({ id: 'ty-patch-24', title: 'PATCH 2.4', at: word('ty-patch-24', 'two', 1), hold: 1.1, x: 1010, y: 820 }), avoid: [box(600, 400, 840, 1080)] },
  // S67: his wings end at x 600, helm x 870-950; THEME sits above the volume slider cut-in (top y 420).
  { spec: slam({ id: 'ty-theme-my', text: 'MY', at: word('ty-theme-my', 'My', 5), hold: 0, out: THEME_OUT, size: 170, cx: 190, cy: 135, rot: -6, burst: null, seed: 4427 }), avoid: [box(600, 0, 1220, 1080), box(0, 420, 1920, 680)] },
  { spec: slam({ id: 'ty-theme-theme', text: 'THEME', at: word('ty-theme-theme', 'theme', 1), hold: 0, out: THEME_OUT, size: 180, cx: 330, cy: 305, rot: 3, burst: null, seed: 4443 }), avoid: [box(600, 0, 1220, 1080), box(0, 420, 1920, 680)] },
  { spec: slam({ id: 'ty-theme-song', text: 'SONG?!', at: SONG_AT, hold: 0, out: THEME_OUT, size: 180, cx: 318, cy: 600, rot: -4, burst: 'violet', seed: 4465 }), avoid: [box(600, 0, 1220, 1080)] },
  // Location: -> drained cathedral (S74), the soft interlude.
  { spec: card({ id: 'ty-loc-hall', kicker: 'LATER', title: 'THE EMPTY CATHEDRAL', at: beat('ty-loc-hall', 526), hold: 3.5, soft: true }), avoid: [box(820, 560, 1120, 780)] },
  // S93: the dev reaches in from the left (x < 760), his helm and body x 700-1350; crumbles as the frame breaks (burst#0).
  { spec: slam({ id: 'ty-nerfed-burst', text: 'NERFED!', at: word('ty-nerfed', 'Nerf', 5), hold: 0, out: word('ty-nerfed-out', 'burst', 0), size: 200, cx: 1545, cy: 255, rot: 5, burst: 'ivory', seed: 6855 }), avoid: [box(0, 360, 760, 1080), box(720, 120, 1180, 1080)] },
  // Location: -> the office, the first full shot of him standing in it (S96). Out before S98's monitor (f7039).
  { spec: card({ id: 'ty-loc-office', world: 'office', kicker: 'LOCATION', title: 'THE REAL WORLD', at: word('ty-loc-office', 'Restore', 0), hold: 1.0 }), avoid: [box(640, 0, 1300, 820)] },
  // S106 monitor: the Revert dialog is centred x 640-1280, y 380-640; out before the S107 cut (f7417).
  { spec: headline({ id: 'ty-patch-25', title: 'PATCH 2.5', at: word('ty-patch-25', 'five', 0), hold: 0.95, x: 60, y: 820 }), avoid: [box(640, 380, 1280, 640)] },
  // S108: the violet blast and the raised sword are upper left / centre (x < 1090), the pipe-wing tips reach x 1090.
  { spec: slam({ id: 'ty-choir-1', text: 'VO-RA-THUL!', at: word('ty-choir-1', 'Vorathul', 2), hold: 1.6, size: 150, cx: 1490, cy: 205, rot: 4, burst: 'violet', seed: 7454 }), avoid: [box(440, 0, 1090, 560), box(700, 330, 1640, 1080)] },
  // S110: the ink pool is centre, his figure top centre-right; the lower left floor is free. Out before the S111
  // cut (f7753), whose robe fills the lower centre.
  { spec: slam({ id: 'ty-choir-4', text: 'VO-RA-THUL!', at: word('ty-choir-4', 'Vorathul', 4), hold: 0.62, size: 165, cx: 520, cy: 880, rot: -4, burst: 'violet', seed: 7725 }), avoid: [box(820, 0, 1500, 640)] },
];

for (const { spec, avoid } of PLAN) {
  const fp = footprint(spec);
  if (!inside(fp.text)) throw new Error(`typography ${spec.id}: text leaves the safe area ${JSON.stringify(fp.text)}`);
  if (fp.coverage > MAX_AREA) throw new Error(`typography ${spec.id}: paints ${(fp.coverage * 100).toFixed(1)} % of the frame (limit ${MAX_AREA * 100} %)`);
  for (const k of avoid) if (overlaps(fp.text, k)) throw new Error(`typography ${spec.id}: text ${JSON.stringify(fp.text)} covers keep-out ${JSON.stringify(k)}`);
  if (spec.out < spec.at) throw new Error(`typography ${spec.id}: out ${spec.out} before in ${spec.at}`);
}

export const TYPE_SCHEDULE: TypeSpec[] = PLAN.map((p) => p.spec);
export const TYPE_EVENTS: VideoEvent[] = EVENTS;
