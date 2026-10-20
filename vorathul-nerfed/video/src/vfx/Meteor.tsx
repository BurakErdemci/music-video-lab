import { seeded } from './seeded.ts';
import { blobPath, easeInQuad, INK, InkFilter, inkFilterId, Overlay, polar, polyPath, VIOLET, VIOLET_LIGHT, type Pt } from './style.tsx';

export interface MeteorProps {
  /** Frame relative to launch; the meteor reaches `to` at frame `duration` and is gone from then on. */
  frame: number;
  duration: number;
  seed: number;
  from: Pt;
  to: Pt;
  /** Rock radius, px. */
  size: number;
  /** Trail length at full speed, px. */
  trail?: number;
}

/**
 * One comet tail along -x (behind the rock), local coords: a teardrop whose two edges are
 * sawtooth flame licks. `rng` re-rolls the licks so the fire boils.
 */
const tail = (len: number, w: number, licks: number, rng: () => number): string => {
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let i = 1; i < licks; i++) {
    const t = i / licks;
    // Width narrows from the rock to the tip; every other point juts out as a flame lick.
    const half = w * (1 - t) ** 0.8;
    top.push([-len * t, -half * (i % 2 ? 1 + 0.45 * rng() : 0.55 + 0.2 * rng())]);
    bottom.push([-len * (t + (0.5 / licks) * rng()), half * (i % 2 ? 0.6 + 0.2 * rng() : 1 + 0.45 * rng())]);
  }
  return polyPath([[0, -w], ...top, [-len, 0], ...bottom.reverse(), [0, w]]);
};

/** Black rock with a violet flame trail, accelerating from `from` to `to` (Phase 3 Meteor Rain). */
export const Meteor = ({ frame, duration, seed, from, to, size, trail = size * 9 }: MeteorProps) => {
  if (frame < 0 || frame >= duration) return null;
  const p = easeInQuad((frame + 1) / duration);
  const [x, y] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const ang = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  const base = seeded(`meteor:${seed}`);
  // Flames re-roll on twos so the trail boils like hand-drawn fire.
  const flick = seeded(`meteor:${seed}:${Math.floor(frame / 2)}`);
  const L = trail * (0.55 + 0.45 * p);
  const rock = blobPath(Array.from({ length: 11 }, (_, i) => polar(size * base.range(0.78, 1.08), (i / 11) * Math.PI * 2)));
  return (
    <Overlay>
      <defs>
        <InkFilter seed={seed} rough={size / 7} />
      </defs>
      <g transform={`translate(${x} ${y}) rotate(${ang})`} filter={`url(#${inkFilterId(seed, size / 7)})`}>
        <path d={tail(L, size * 1.15, 14, flick)} fill={VIOLET} />
        <path d={tail(L * 0.7, size * 0.8, 10, flick)} fill={VIOLET_LIGHT} transform={`translate(0 ${-size * 0.12})`} />
        <path d={tail(L * 0.55, size * 0.62, 9, flick)} fill={INK} />
        <g transform={`translate(${-size * 0.08} 0) scale(1.14)`}>
          <path d={rock} fill={VIOLET} />
        </g>
        <path d={rock} fill={INK} />
      </g>
    </Overlay>
  );
};
