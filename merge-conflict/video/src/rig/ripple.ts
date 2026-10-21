// The hair and cloth ripple (scene-map.md "Living motion"): a small mesh deformation weighted to the outer
// silhouette of a card (hair ends, flares, coat tails, chains), zero inside the face box and the torso, peak
// displacement RIPPLE_MAX of the card height. Its amplitude follows the section energy; its phase follows the beat
// grid, never a free-running clock. Node-safe: Card.tsx's vertex shader repeats rippleOffset exactly, and
// tools/ripplecheck.mjs measures it.
import { bassAt } from '../film/livecam.ts';
import { CARD_FRAMES, cardAspectOf, type CardFrames } from '../film/framing.ts';
import { beatPos, sectionAt } from '../timing.ts';
import { GRID_COLS, GRID_ROWS } from './rig.ts';

/** Peak displacement, in card heights (0.6 %). */
export const RIPPLE_MAX = 0.006;

const smooth = (a: number, b: number, x: number): number => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** Distance (card-height units) from (u, v) to a box in normalised card coordinates; 0 inside. */
const boxDist = (b: readonly [number, number, number, number], aspect: number, u: number, v: number): number =>
  Math.hypot(Math.max(b[0] - u, 0, u - b[2]) * aspect, Math.max(b[1] - v, 0, v - b[3]));

/** The weight for one card's frames; `faceCells` is the face box's margin in grid cells (1.5 by the rule; the
 *  selftest of tools/ripplecheck.mjs passes 0 to break the face rule on purpose). */
export const rippleWeightFor = (fr: CardFrames, aspect: number, u: number, v: number, faceCells = 1.5): number => {
  const f = fr.face;
  const fw = f[2] - f[0];
  const fh = f[3] - f[1];
  const cu = faceCells / GRID_COLS;
  const cv = faceCells / GRID_ROWS;
  const a: [number, number, number, number] = [f[0] - cu, f[1] - cv, f[2] + cu, f[3] + cv];
  // the torso core takes one grid cell of margin, so no triangle touching the torso box moves (round 7c)
  const tu = 1 / GRID_COLS;
  const tv = 1 / GRID_ROWS;
  const b: [number, number, number, number] = [f[0] - 0.6 * fw - tu, f[1] - tv, f[2] + 0.6 * fw + tu, fr.kind === 'bust' ? 1 : Math.min(1, f[3] + 2.6 * fh + tv)];
  const d = Math.min(boxDist(a, aspect, u, v), boxDist(b, aspect, u, v));
  if (d <= 0) return 0;
  const w = smooth(0, 0.12, d);
  return fr.kind === 'full' ? w * (1 - smooth(0.82, 0.92, v)) : w;
};

/** The ripple weight at a card point (u right, v down, as CARD_FRAMES); 0 for a card without frames. */
export const rippleWeight = (id: string, u: number, v: number): number => {
  const fr = CARD_FRAMES[id];
  return fr ? rippleWeightFor(fr, cardAspectOf(id), u, v) : 0;
};

export const TIER: Record<string, number> = {
  intro_robot: 0.3, intro_groove: 1, verse1_sweet: 0.4, verse2_raspy: 0.4, prechorus: 0.5, chorus1: 1, verse3_rebase: 0.45,
  chorus2: 1, verse4_trade: 0.5, scream: 1, breakdown_git_push_force: 1, whisper: 0.2, guitar_solo: 1, piano_interlude: 0,
  build: 0.4, final_chorus: 1, post_chorus_chant: 1, robot_build_failed: 0.2, scream_end: 1, outro: 0.8,
};

/** The ripple amplitude 0..1 at t: the section's tier, 0.6..1 by the bass around t (a pure function of t). */
export const rippleAmp = (t: number): number => {
  let b = 0;
  for (let i = 0; i < 9; i++) b += bassAt(t - 0.2 + (0.4 * i) / 8);
  return (TIER[sectionAt(t)] ?? 0) * (0.6 + 0.4 * (b / 9));
};

/** One cycle every two beats. */
export const ripplePhase = (t: number): number => Math.PI * beatPos(t);

/** The displacement [dx, dy] in card units (y up, as the mesh) of the point (u, v down) at t; |offset| <= A. */
export const rippleOffset = (id: string, u: number, v: number, t: number): [number, number] => {
  const a = RIPPLE_MAX * rippleAmp(t) * rippleWeight(id, u, v);
  const p = ripplePhase(t);
  return [a * 0.94 * Math.sin(p + 7 * v + 3 * u), a * 0.33 * Math.cos(p + 5 * v)];
};
