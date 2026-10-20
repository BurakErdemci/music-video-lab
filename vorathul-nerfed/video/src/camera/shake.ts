// Camera shake composed onto any CameraPath, with the overscan needed so a shake never reveals the canvas edge.
//
// The shake offset (from ../vfx/shake.ts) is applied as a translation of camera position AND target together, along the
// camera's right/up axes. A pure translation moves the visible window by exactly that offset at EVERY depth, so
// the window loses A per side, A = peak offset in world units, whatever the depth of the card behind it.
// vfx shake also returns a roll; CameraPose has no roll, so it is dropped (see report).
//
// Overscan formula. Let T = tan(fov / 2), d = distance along the view axis to the nearest card that must keep covering
// the frame, A = peak shake offset. Half-height of the window at that card is H = d * T. Shrinking the window by A on
// every side (the vertical side is the tight one: half-width = H * aspect > H) needs the zoom factor k = 1 - A / H:
//   fov' = 2 * atan(k * T),       k = 1 - A / (d * T)
// This is a NARROWER lens (widening the fov would reveal more, not less). The card-side equivalent is a card that is
// A larger than the window on every side (`shakeCardMargin`).
import { type CameraPath, type CameraPose, DEFAULT_FOV } from '../stage/Stage.tsx';
import { shake, type ShakeOffset } from '../vfx/shake.ts';
import { add, basis, len, rad, scale, sub } from './math.ts';

export interface ShakeHit {
  start: number;
  seed: number;
  /** Peak offset in world units, or `{ pct }` = fraction of the visible frame height at the look-at distance (storyboard: big 0.025, medium 0.012, small 0.005). */
  amp: number | { pct: number };
  /** Decay length in frames (vfx shake default 14). */
  frames?: number;
}

export const SHAKE_PCT = { big: 0.025, medium: 0.012, small: 0.005 } as const;

/** Peak of vfx `shake` per axis relative to its strength: (1 + 1/2 + 1/3) / 1.83. */
const AXIS_PEAK = (1 + 1 / 2 + 1 / 3) / 1.83;

const T = (fov: number): number => Math.tan(rad(fov) / 2);
/** Visible frame height at distance d. */
export const visibleHeight = (d: number, fov = DEFAULT_FOV): number => 2 * d * T(fov);

const strengthOf = (hit: ShakeHit, base: CameraPose): number =>
  typeof hit.amp === 'number' ? hit.amp : hit.amp.pct * visibleHeight(len(sub(base.target, base.position)), base.fov);

/** Smooth upper bound of the per-axis offset at `frame` (envelope of the vfx shake, summed over hits). */
export const shakeBound = (frame: number, hits: readonly ShakeHit[], base: CameraPose): number =>
  hits.reduce((acc, h) => {
    const t = frame - h.start;
    const frames = h.frames ?? 14;
    return t < 0 || t > frames ? acc : acc + AXIS_PEAK * strengthOf(h, base) * Math.exp((-4 * t) / frames);
  }, 0);

/** Zoomed-in fov that keeps a card at view-axis distance `depth` covering the frame under a peak offset `amp`. */
export const overscanFov = (fov: number, amp: number, depth: number): number => {
  const k = Math.max(0.05, 1 - amp / (depth * T(fov)));
  return (2 * Math.atan(k * T(fov)) * 180) / Math.PI;
};
/** Margin a card must extend beyond the frame window at its depth, per side, to survive shake of peak `amp` unzoomed. */
export const shakeCardMargin = (amp: number): number => amp;

export interface WithShakeOptions {
  hits: readonly ShakeHit[];
  /**
   * View-axis distance to the nearest card that must keep covering the frame. When set, the fov is narrowed by
   * `overscanFov` using the decaying bound, so the shake can never reveal the canvas edge (a punch-in that relaxes
   * as the shake decays). Omit to rely on oversized cards.
   */
  safeDepth?: number;
}

/** Applies vfx shake to `path`. Offsets are in world units on the camera's right/up axes. */
export const withShake = (path: CameraPath, { hits, safeDepth }: WithShakeOptions): CameraPath => (frame) => {
  const base = path(frame);
  let o: ShakeOffset = { x: 0, y: 0, rot: 0 };
  for (const h of hits) {
    const s = shake(frame, h.start, strengthOf(h, base), h.seed, h.frames ?? 14);
    o = { x: o.x + s.x, y: o.y + s.y, rot: 0 };
  }
  const { right, up } = basis(base.position, base.target);
  const off = add(scale(right, o.x), scale(up, o.y));
  const fov = base.fov ?? DEFAULT_FOV;
  return {
    position: add(base.position, off),
    target: add(base.target, off),
    fov: safeDepth === undefined ? fov : overscanFov(fov, shakeBound(frame, hits, base), safeDepth),
  };
};
