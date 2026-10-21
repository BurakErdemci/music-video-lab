// How the girls are staged behind the type (scene-map.md "The girls are never wallpaper", 2-4):
//  FOCUS ping-pong: the singer of the line is big and sharp, the other small and soft; focus moves with an
//    outQuad of 28-48 frames at 60 fps, then a full stop. The singer comes from the lyric data.
//  FRAMING presets: face close-up, tiny full figure, low angle, clones, split screen (and the plain stage);
//    framingPlan throws when one framing would hold longer than 2 bars (bar lengths from timing.ts).
//  POSE PER BAR: a new pose on every downbeat through the smear swap, the previous 2-3 poses lingering as
//    ghost copies in the singer's colour that fade over one beat.
import { HOME, HOME_Z, type CameraPose, shifted } from '../camera/camera.ts';
import type { CardProps, Placement } from '../cards/Card.tsx';
import { type CardDraw, poseTrack, type SmearPlan, smearPlan, smearSpan } from '../cards/smear.tsx';
import { type Hex, clamp01, lerp, outQuad } from '../lib/ease.ts';
import { beatPos, downbeat, type TimingLine, lyricLine } from '../timing.ts';
import type { Singer } from '../type/forms/common.tsx';

// ---- singer --------------------------------------------------------------------------------------------
/** The singer of a lyric line, from the timing data's `singer` field; throws when the data has none and no
 *  fallback is given (the take of 2026-10-20 has no singer field yet). */
export const singerOf = (i: number, fallback?: Singer): Singer => {
  const s = (lyricLine(i) as TimingLine & { singer?: Singer }).singer ?? fallback;
  if (!s) throw new Error(`lyric line ${i} has no singer in mc-timing.json`);
  return s;
};

// ---- focus ping-pong -----------------------------------------------------------------------------------
export interface FocusKey { t: number; singer: Singer; frames: number }
export const focusPlan = (keys: readonly FocusKey[]): FocusKey[] => {
  let end = -Infinity;
  for (const k of keys) {
    if (k.frames < 28 || k.frames > 48) throw new Error(`focus move at ${k.t.toFixed(2)} s: ${k.frames} frames (allowed 28-48 at 60 fps)`);
    if (k.t < end) throw new Error(`focus move at ${k.t.toFixed(2)} s starts before the previous one stopped`);
    end = k.t + k.frames / 60;
  }
  return [...keys];
};
const weight = (s: Singer) => (s === 'O' ? 1 : s === 'B' ? 0 : 0.5);
/** 1 = the orange girl has the focus, 0 = the blue girl, 0.5 = both (a line sung together). */
export const focusAt = (plan: readonly FocusKey[], t: number): number => {
  let w = plan.length ? weight((plan[0] as FocusKey).singer) : 0.5;
  for (const k of plan) {
    if (t < k.t) break;
    w = lerp(w, weight(k.singer), outQuad(((t - k.t) * 60) / k.frames));
  }
  return w;
};
/** Size and softness of a girl from the focus weight she holds (1 = hers). */
export const focusLook = (mine: number) => ({ scale: lerp(0.62, 1.18, mine), soft: clamp01(1 - mine * 1.25), lit: lerp(0.65, 1.1, mine) });

// ---- framing presets ----------------------------------------------------------------------------------
export { barAt, type FramingCue, type FramingKind, framingAt, framingPlan } from './framing.ts';
import type { FramingKind } from './framing.ts';

export interface Girl { full: string; close: string; color: Hex }
type Draw = Omit<CardProps, 'grade'> & { key: string };
/** What a framing puts on the stage: the camera and the cards (grade added by the caller). */
export const framing = (kind: FramingKind, t: number, singer: Girl, other: Girl): { pose: CameraPose; cards: Draw[]; split?: boolean } => {
  const at = (x: number, height: number, extra: Partial<Placement> = {}): Placement => ({ x, height, ...extra });
  switch (kind) {
    case 'face':
      return { pose: HOME, cards: [{ key: 'face', id: singer.close, t, ...at(0, 12, { feet: -7.2 }) }] };
    case 'tiny':
      return { pose: HOME, cards: [{ key: 'tiny', id: singer.full, t, ...at(0, 2.6) }] };
    case 'low':
      return { pose: { position: [0, -2.6, HOME_Z - 3], target: [0, 1.2, 0], fov: 46 }, cards: [{ key: 'low', id: singer.full, t, ...at(0, 7.4) }] };
    case 'clones':
      // five copies in a row, each a little later in the dance (phase-offset), alternating mirror
      return {
        pose: HOME,
        cards: [-2, -1, 0, 1, 2].map((k) => ({ key: `clone${k}`, id: singer.full, t: t + k * 0.13, ...at(k * 3.1, 5.2 - Math.abs(k) * 0.5, { z: -Math.abs(k) * 0.6, flip: k % 2 !== 0 }), soft: Math.abs(k) * 0.25 })),
      };
    case 'split':
      return {
        pose: HOME,
        split: true,
        cards: [
          { key: 'splitO', id: singer.full, t, ...at(-2.6, 7), clip: { x: 0, keep: 'left' } },
          { key: 'splitB', id: other.full, t, ...at(2.6, 7), clip: { x: 0, keep: 'right' } },
        ],
      };
    default:
      return { pose: shifted(HOME, [0, 0, -0.5]), cards: [{ key: 'stage', id: singer.full, t, ...at(-2.4, 6.6), soft: 0.6 }] };
  }
};

/** The pose-per-bar pool of each girl: the 16 disco dance cards first (hip-bump, arm-roll, strut, Y-arms,
 *  crouch-snap, kick, point-cross, shimmy), then the full-figure poses of the first set. */
export const DANCE_POOL = {
  B: ['BD1', 'BD2', 'BD3', 'BD4', 'BD5', 'BD6', 'BD7', 'BD8', 'B03', 'B04', 'B07', 'B10'],
  O: ['OD1', 'OD2', 'OD3', 'OD4', 'OD5', 'OD6', 'OD7', 'OD8', 'O06', 'O07', 'O08', 'O12'],
} as const;
/** The kick card of each girl, for KICK. */
export const KICK_CARD = { B: 'BD6', O: 'OD6' } as const;

// ---- pose per bar with ghost trails --------------------------------------------------------------------
export interface PoseBarPlan { id: string; cards: readonly string[]; first: number; bars: number; color: Hex; smears: SmearPlan[] }
/** A new pose on each of `bars` downbeats from downbeat index `first`, cycling through `cards`. */
export const poseBarPlan = (id: string, cards: readonly string[], first: number, bars: number, color: Hex): PoseBarPlan => ({
  id,
  cards,
  first,
  bars,
  color,
  smears: Array.from({ length: bars }, (_, b) =>
    smearPlan({ id: `${id}-${b}`, t: downbeat(first + b), from: cards[b % cards.length] as string, to: cards[(b + 1) % cards.length] as string, dir: b % 2 ? -1 : 1, frames: 10 }),
  ),
});
/** The live pose (with its smear) plus up to 3 ghost copies of the previous poses, fading over one beat. */
export const poseBarDraws = (p: PoseBarPlan, t: number, height: number): (CardDraw & { ghost?: number })[] => {
  const live = poseTrack(p.cards[0] as string, p.smears, t, height);
  const past = p.smears.filter((s) => t >= smearSpan(s)[1]).slice(-3).reverse();
  const ghosts = past
    .map((s, k) => {
      // the ghost fades over one measured beat: its age counted in beats from where it was left behind
      const age = beatPos(t) - beatPos(smearSpan(s)[1]);
      const op = 0.6 * (1 - clamp01(age)) * (1 - k * 0.25);
      return { card: s.from, opacity: op, dx: -s.dir * (0.5 + 0.35 * k) * (height / 6.6), stretch: [1, 1] as [number, number], ghost: k };
    })
    .filter((g) => g.opacity > 0.01);
  return [...ghosts, ...live];
};
