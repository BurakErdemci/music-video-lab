// What happens inside the painting from f1930 on, as a pure function of the frame: the Meteor Rain fight, the patch edits
// (health cap dragged, four cells fall as missing-texture tiles, meteors erased, a sticky note slapped on the helm).
// The shots are only cameras and grades over this one continuing picture, so the office view of the wall shows it live.
import type { ReactNode } from 'react';
import { StickyNote } from '../../../ui/kit.ts';
import { C } from '../../../ui/theme.tsx';
import { easeInQuad, ImpactBurst, InkSplash, Meteor, MissingTextureFillSafe, PaintSeep, seeded } from './fx.tsx';
import { Dust, KoStars, type HeroKind, type HeroPose } from '../art/heroes.tsx';
import { HeroPiece } from './heroArt.tsx';
import { BigHand } from '../art/hands.tsx';
import { EraserArt } from '../art/props.tsx';
import { BAR, CELLS, Caption, type HudState } from './hud.tsx';
import { SHOT_FROM, T } from '../frames.ts';

type Pt = readonly [number, number];
export const FLOOR = 992;
const HERO_H = 116;
/** Where the helm sits in window px (the sticky note lands here); measured on the rig stills. */
export const HELM: Pt = [962, 400];
/** The giant sticky note sits on the upper right of the helm and leaves the eye slit free. */
const NOTE = { x: HELM[0] + 55, y: HELM[1] - 115, w: 150 };

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const easeOut = (t: number): number => 1 - (1 - clamp(t)) ** 3;
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// ---- health bar --------------------------------------------------------------------------------------------------

const REFILL = { at: T.rogueFlat, frames: 12 };
const DRAG = { tension: T.by, pull: T.forty, snap: T.percent };
const CAP_AFTER = 0.6;

export interface BarState extends HudState {
  /** The part of the bar beyond the cap is still drawn as a magenta ghost until the snap. */
  ghost: boolean;
}

export const hudAt = (f: number): BarState => {
  const refill = easeOut((f - REFILL.at) / REFILL.frames);
  const fill = lerp(1 / 3, 1, refill);
  let cap = 1;
  if (f >= DRAG.tension) cap = lerp(1, 0.985, easeOut((f - DRAG.tension) / (DRAG.pull - DRAG.tension)));
  if (f >= DRAG.pull) cap = lerp(0.985, 0.62, easeInOut((f - DRAG.pull) / (DRAG.snap - DRAG.pull)));
  if (f >= DRAG.snap) cap = lerp(0.62, CAP_AFTER, easeOut((f - DRAG.snap) / 3));
  return { fill, cap, pips: [true, true, true], pip3Deleted: f >= T.pipMagenta, ghost: f >= DRAG.tension && f < DRAG.snap };
};

/** Cap position in window px (the right spike of the bar frame). */
export const capPx = (f: number): Pt => {
  const s = hudAt(f);
  return [BAR.x + BAR.w * s.cap + 40, BAR.y + BAR.h / 2];
};

// ---- meteors --------------------------------------------------------------------------------------------------------

interface Met {
  launch: number;
  dur: number;
  from: Pt;
  to: Pt;
  size: number;
  seed: number;
}
const metPos = (m: Met, f: number): Pt => {
  const p = easeInQuad(clamp((f - m.launch + 1) / m.dur));
  return [lerp(m.from[0], m.to[0], p), lerp(m.from[1], m.to[1], p)];
};
const metAngle = (m: Met): number => (Math.atan2(m.to[1] - m.from[1], m.to[0] - m.from[0]) * 180) / Math.PI;
const fall = (land: number, to: Pt, size: number, seed: number, dur = 16): Met => ({ launch: land - dur, dur, from: [to[0] + 640, to[1] - 720], to, size, seed });

// ---- heroes ---------------------------------------------------------------------------------------------------------

interface HeroSpec {
  kind: HeroKind;
  x: number;
  flip: boolean;
  ko: number;
  dx: number;
}
const PARTY: readonly HeroSpec[] = [
  { kind: 'knight', x: 880, flip: false, ko: T.koKnight, dx: -90 },
  { kind: 'mage', x: 1010, flip: false, ko: T.koMage, dx: -70 },
  { kind: 'archer', x: 1240, flip: true, ko: T.koArcher, dx: 80 },
  { kind: 'rogue', x: 1420, flip: true, ko: T.rogueFlat, dx: 0 },
];
const RUN_FROM = T.koArcher + 8;
const WAKE = SHOT_FROM.S43;
export const rogueX = (f: number): number => 1420 + clamp(f - RUN_FROM, 0, 80) * 3;

interface HeroNow {
  kind: HeroKind;
  pose: HeroPose;
  x: number;
  y: number;
  flip: boolean;
  rotate: number;
  stars: boolean;
}

const heroNow = (h: HeroSpec, f: number): HeroNow => {
  const base = { kind: h.kind, flip: h.flip, y: FLOOR, rotate: 0, stars: false };
  if (f >= WAKE) {
    const gatherT = clamp((f - T.was) / 24);
    const thumbs = f >= T.unfair1;
    switch (h.kind) {
      case 'knight':
        return { ...base, flip: false, x: 1330, pose: thumbs ? 'thumbs' : f >= WAKE + 9 ? 'poke' : 'dizzy' };
      case 'mage':
        return { ...base, flip: false, x: lerp(1040, 1230, easeOut(gatherT)), pose: thumbs ? 'thumbs' : f >= T.was ? 'gather' : 'ready' };
      case 'archer':
        return { ...base, flip: true, x: lerp(1180, 1430, easeOut(gatherT)), pose: thumbs ? 'thumbs' : f >= T.was ? 'gather' : 'ready' };
      default:
        return { ...base, flip: true, x: lerp(1520, 1480, easeOut(gatherT)), pose: thumbs ? 'thumbs' : 'ready' };
    }
  }
  if (h.kind === 'rogue') {
    if (f < RUN_FROM) return { ...base, x: h.x, pose: 'cower' };
    if (f < T.rogueFlat) return { ...base, flip: false, x: rogueX(f), pose: 'run' };
    return { ...base, flip: false, x: rogueX(T.rogueFlat), pose: 'pancake' };
  }
  if (f < h.ko) return { ...base, x: h.x, pose: 'cower' };
  const t = f - h.ko;
  if (t < 10) {
    const u = t / 10;
    return { ...base, x: lerp(h.x, h.x + h.dx, u), y: FLOOR - 4 * 150 * u * (1 - u), rotate: (h.dx < 0 ? -1 : 1) * 360 * u, pose: 'flying' };
  }
  return { ...base, x: h.x + h.dx, pose: 'ko', stars: true };
};

// ---- tiles (the four deleted cells) ------------------------------------------------------------------------------------

const cellW = BAR.w / CELLS;
const tilePose = (i: number, f: number): { x: number; y: number; rot: number } | null => {
  const t = f - DRAG.snap;
  if (t < 0) return null;
  const x0 = BAR.x + cellW * (6 + i) + cellW / 2;
  const y0 = BAR.y + BAR.h / 2;
  const vx = -2.6 + i * 0.5;
  const vy = -5 - (i % 2) * 2;
  const g = 2.1;
  const yf = FLOOR + 8;
  const tl = (-vy + Math.sqrt(vy * vy + 2 * g * (yf - y0))) / g;
  const spin = (i % 2 ? 1 : -1) * (7 + i * 2);
  if (t < tl) return { x: x0 + vx * t, y: y0 + vy * t + 0.5 * g * t * t, rot: spin * t };
  const u = t - tl;
  const rotLand = spin * tl;
  const hop = 26 * Math.abs(Math.sin((Math.PI * u) / 9)) * Math.exp(-u / 6);
  return { x: x0 + vx * tl, y: yf - hop, rot: (rotLand % 360) * Math.exp(-u / 4) };
};

// ---- the erase ------------------------------------------------------------------------------------------------------

const CAST: Met[] = [
  { launch: T.meteorsIn, dur: 70, from: [1450, 40], to: [850, 900], size: 44, seed: 71 },
  { launch: T.meteorsIn, dur: 74, from: [1000, -20], to: [400, 800], size: 40, seed: 72 },
  { launch: T.meteorsIn, dur: 78, from: [1650, 150], to: [1150, 1000], size: 42, seed: 73 },
];
/** The frame the eraser reaches each meteor; the order of strokes is meteor 2, 1, 3. */
const ERASE_FRAME = [T.removed + 10, T.removed + 4, T.removed + 16] as const;
const CHECKER_FRAMES = 6;
const eraserKeys = (): { f: number; p: Pt }[] => [
  { f: T.rain, p: [1900, -420] },
  { f: T.removed, p: [1480, 10] },
  ...CAST.map((m, i) => ({ f: ERASE_FRAME[i] as number, p: metPos(m, ERASE_FRAME[i] as number) })).sort((a, b) => a.f - b.f),
  { f: T.removed + 30, p: [1000, -460] },
];
const eraserAt = (f: number): Pt | null => {
  const ks = eraserKeys();
  const first = ks[0] as { f: number };
  const last = ks[ks.length - 1] as { f: number };
  if (f < first.f || f > last.f) return null;
  let i = 0;
  while (i + 1 < ks.length && f >= (ks[i + 1] as { f: number }).f) i++;
  const a = ks[i] as { f: number; p: Pt };
  const b = ks[Math.min(i + 1, ks.length - 1)] as { f: number; p: Pt };
  const t = b.f === a.f ? 1 : easeInOut((f - a.f) / (b.f - a.f));
  return [lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t)];
};

// ---- impact moments the camera shakes on ----------------------------------------------------------------------------------

export const SHAKES: readonly { start: number; seed: number; pct: number }[] = [
  { start: T.meteor1, seed: 1, pct: 0.012 },
  { start: T.meteor2, seed: 2, pct: 0.012 },
  { start: T.koKnight, seed: 3, pct: 0.012 },
  { start: T.koMage, seed: 4, pct: 0.012 },
  { start: T.koArcher, seed: 5, pct: 0.012 },
  { start: T.rogueFlat, seed: 6, pct: 0.012 },
  { start: T.percent, seed: 7, pct: 0.005 },
  { start: T.removed, seed: 8, pct: 0.005 },
  { start: T.removed + 6, seed: 9, pct: 0.005 },
  { start: T.removed + 12, seed: 10, pct: 0.005 },
  { start: T.removed2 + 5, seed: 11, pct: 0.012 },
];

// ---- the overlay ----------------------------------------------------------------------------------------------------------

const tail = (len: number, w: number): string => `M0 ${-w}L${-len} 0L0 ${w}Z`;
/** Office grey seeping into the painting where an office tool touches it: a flat ring with a thin plain edge, gone within 12 frames. */
const SEEPS: readonly { at: number; seed: number; at2: (f: number) => Pt }[] = [
  { at: T.health, seed: 301, at2: capPx },
  { at: T.forty, seed: 302, at2: capPx },
  { at: T.rain, seed: 303, at2: () => [1500, 30] },
];
const Seeps = ({ f }: { f: number }): ReactNode => (
  <>
    {SEEPS.map((s) => {
      const t = f - s.at;
      if (t < 0 || t > 12) return null;
      const [x, y] = s.at2(s.at);
      return (
        <div key={s.seed} style={{ position: 'absolute', inset: 0, opacity: 1 - t / 12 }}>
          <PaintSeep frame={t} seed={s.seed} sources={[{ x, y }]} reach={150} growth={(u: number) => 150 * easeOut(u / 8)} bands={['#E9ECEF', '#CED4DA']} bandWidth={26} edge="plain" />
        </div>
      );
    })}
  </>
);

const SVG_STYLE = { position: 'absolute', inset: 0, overflow: 'visible' } as const;

export const PaintScript2D = ({ frame: f }: { frame: number }) => {
  const landing: Met[] = [
    fall(T.meteor1, [300, FLOOR], 40, 21),
    fall(T.meteor2, [1560, FLOOR], 40, 22),
    fall(T.koKnight, [PARTY[0]!.x, FLOOR - 40], 44, 23),
    fall(T.koMage, [PARTY[1]!.x, FLOOR - 40], 44, 24),
    fall(T.koArcher, [PARTY[2]!.x, FLOOR - 40], 44, 25),
  ];
  const big: Met = { launch: T.bigMeteor, dur: T.rogueFlat - T.bigMeteor, from: [rogueX(T.rogueFlat) + 700, -200], to: [rogueX(T.rogueFlat), FLOOR - 20], size: 96, seed: 26 };
  // background streaks that leave through the bottom of the frame: one every ten frames of the rain
  const fillers: Met[] = Array.from({ length: 10 }, (_, i) => {
    const r = seeded(`p2fill:${i}`);
    const land = SHOT_FROM.S27 + 6 + i * 10;
    const x = r.range(140, 1780);
    return { launch: land - 28, dur: 28, from: [x + 760, -260], to: [x - 120, 1240], size: r.range(26, 34), seed: 40 + i };
  });
  const rain = f >= SHOT_FROM.S27 && f < T.helmClose;
  const heroes = PARTY.map((p) => heroNow(p, f));
  const eraser = eraserAt(f);
  const tiles = [0, 1, 2, 3].map((i) => tilePose(i, f));
  const hand = f >= DRAG.tension - 40 && f < DRAG.snap + 14 ? handAt(f) : null;
  const noteSlap = T.removed2 + 4;
  return (
    <>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={SVG_STYLE}>
        {rain
          ? [...fillers, ...landing, big].map((m) =>
              f >= m.launch && f < m.launch + m.dur ? <Meteor key={m.seed} frame={f - m.launch} duration={m.dur} seed={m.seed} from={[...m.from]} to={[...m.to]} size={m.size} /> : null,
            )
          : null}
        {landing.map((m) => {
          const t = f - (m.launch + m.dur);
          return t >= 0 && t < 16 ? (
            <g key={`imp${m.seed}`}>
              <InkSplash frame={t} duration={16} seed={m.seed} x={m.to[0]} y={m.to[1] + 20} size={96} variant="violet" />
              <Dust frame={t} x={m.to[0]} y={m.to[1] + 30} size={70} seed={m.seed} />
            </g>
          ) : null;
        })}
        {heroes.map((h) => (
          <g key={h.kind}>
            <HeroPiece kind={h.kind} pose={h.pose} frame={f} x={h.x} y={h.y} height={HERO_H} flip={h.flip} rotate={h.rotate} />
            {h.stars ? <KoStars frame={f} x={h.x} y={h.y - 70} size={34} /> : null}
          </g>
        ))}
        {tiles.map((t, i) =>
          t ? (
            <g key={`tile${i}`} transform={`translate(${t.x} ${t.y}) rotate(${t.rot})`}>
              <MissingTextureFillSafe d={`M${-cellW / 2} -26H${cellW / 2}V26H${-cellW / 2}Z`} cell={13} outline={{ width: 6, color: '#0A0908' }} />
            </g>
          ) : null,
        )}
        {f >= T.meteorsIn && f < T.removed + 24
          ? CAST.map((m, i) => {
              const gone = ERASE_FRAME[i] as number;
              if (f >= gone + CHECKER_FRAMES) return null;
              if (f >= gone) {
                const [x, y] = metPos(m, gone);
                return (
                  <g key={m.seed} transform={`translate(${x} ${y}) rotate(${metAngle(m)})`}>
                    <MissingTextureFillSafe d={`${tail(m.size * 6, m.size * 0.8)}M${m.size} 0A${m.size} ${m.size} 0 1 0 ${-m.size} 0A${m.size} ${m.size} 0 1 0 ${m.size} 0Z`} cell={12} />
                  </g>
                );
              }
              const t = f - m.launch;
              return t >= 0 && t < m.dur ? <Meteor key={m.seed} frame={t} duration={m.dur} seed={m.seed} from={[...m.from]} to={[...m.to]} size={m.size} /> : null;
            })
          : null}
        {f >= T.removed + 18 && f < T.removed + 40 ? <Crumbs f={f} /> : null}
        {hand ? (
          <g transform={`translate(${hand.x} ${hand.y}) rotate(${hand.rot})`}>
            <BigHand variant="pinch" size={300} pinch={hand.pinch} sleeve={1100} sleeveAngle={0} />
          </g>
        ) : null}
        {eraser ? (
          <g transform={`translate(${eraser[0]} ${eraser[1]}) rotate(${f < T.removed ? -62 : -14})`}>
            <EraserArt size={760} />
          </g>
        ) : null}
        {[T.meteor1, T.meteor2].map((s, i) => (f >= s && f < s + 6 ? <ImpactBurst key={s} frame={f - s} duration={12} seed={80 + i} x={i ? 1560 : 300} y={FLOOR - 30} size={110} flash={0} /> : null))}
      </svg>
      <Seeps f={f} />
      {f >= noteSlap ? (
        <StickyNote
          frame={f}
          x={NOTE.x - NOTE.w / 2 + (f >= T.tug && f < T.tug + 18 ? Math.sin((f - T.tug) * 2.4) * 10 : 0)}
          y={NOTE.y - NOTE.w * 0.46}
          width={NOTE.w}
          text="Phase 3"
          slapAt={noteSlap}
          rotate={-7}
        />
      ) : null}
      {f >= noteSlap + 6 ? (
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={SVG_STYLE}>
          <path d={`M${NOTE.x - NOTE.w * 0.4} ${NOTE.y - NOTE.w * 0.04} L${NOTE.x + NOTE.w * 0.4} ${NOTE.y + NOTE.w * 0.2}`} stroke={C.blue} strokeWidth={9} strokeLinecap="round" opacity={clamp((f - noteSlap - 6) / 5)} />
        </svg>
      ) : null}
    </>
  );
};

const Crumbs = ({ f }: { f: number }): ReactNode => {
  const r = seeded('p2crumbs');
  const t = f - (T.removed + 18);
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const x = HELM[0] + r.range(-90, 90);
        const y0 = HELM[1] - 160 + r.range(-80, 40);
        const rot = r.range(0, 90);
        const s = r.range(7, 14);
        const y = y0 + t * 9;
        return <rect key={i} x={x} y={y} width={s} height={s} transform={`rotate(${rot + t * 11} ${x} ${y})`} fill={C.dark} opacity={clamp(1 - (y - (HELM[1] - 40)) / 80)} />;
      })}
    </>
  );
};

const handAt = (f: number): { x: number; y: number; rot: number; pinch: number } => {
  const [cx, cy] = capPx(f);
  const arrive = easeOut((f - (DRAG.tension - 40)) / 12);
  const leave = easeOut((f - (DRAG.snap + 1)) / 12);
  return { x: cx + 30 + 500 * (1 - arrive) + leave * 300, y: cy + 10 - 400 * (1 - arrive) - leave * 320, rot: 142, pinch: f >= DRAG.snap ? clamp(1 - leave * 2) : 1 };
};

export const captionsAt = (f: number): ReactNode =>
  f >= T.meteorsIn && f < T.removed + 30 ? (
    <Caption text="METEOR RAIN" x={1190} y={190} rotate={-3} strike={f >= T.removed + 6 ? easeOut((f - T.removed - 6) / 6) : 0} />
  ) : null;
