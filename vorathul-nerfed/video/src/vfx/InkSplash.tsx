import { seeded } from './seeded.ts';
import { blobPath, easeOutCubic, easeOutExpo, INK, InkFilter, inkFilterId, Overlay, polar, taperedPath, VIOLET, VIOLET_LIGHT, type Pt } from './style.tsx';

export interface InkSplashProps {
  /** Frame relative to the splash start. */
  frame: number;
  /** Frames the splash stays on screen. */
  duration: number;
  seed: number;
  x: number;
  y: number;
  /** Approximate radius of the main blob arms, in px. */
  size: number;
  /** 'violet' adds a violet core and rim for Vorathul's strikes. */
  variant?: 'black' | 'violet';
  /** Frames to reach full size (fast). */
  grow?: number;
  /** Frames at the end over which it fades; 0 keeps it solid until it disappears. */
  fade?: number;
  /** Direction the ink was flung, radians (0 = right); drag streaks and longer arms trail this way. Seeded if omitted. */
  direction?: number;
}

interface Arm { a: number; len: number; w: number; bulb: number }
interface Drop { a: number; d: number; r: number; stretch: number }
/** A dry-brush drag streak: broken into pieces along one bristle path; `from`/`to` are fractions of its length. */
interface Streak { a: number; len: number; w: number; bow: number; pieces: { from: number; to: number }[] }

const build = (seed: number) => {
  const rng = seeded(`splash:${seed}`);
  const corePts = rng.int(14, 20);
  const lean = (a: number): number => Math.max(0, Math.cos(a));
  const core = Array.from({ length: corePts }, (_, i) => rng.range(0.38, 0.56) * (1 + 0.3 * lean((i / corePts) * Math.PI * 2)));
  const armCount = rng.int(8, 13);
  const arms: Arm[] = Array.from({ length: armCount }, (_, i) => ({
    a: ((i + rng.range(-0.35, 0.35)) / armCount) * Math.PI * 2,
    len: rng() < 0.3 ? rng.range(1.15, 1.55) : rng.range(0.65, 1.05),
    w: rng.range(0.1, 0.22),
    bulb: rng() < 0.6 ? rng.range(0.035, 0.08) : 0,
  }));
  arms.forEach((arm) => (arm.len *= 1 + 0.5 * lean(arm.a)));
  const drops: Drop[] = Array.from({ length: rng.int(22, 34) }, () => ({
    a: rng() < 0.55 ? rng.range(-0.6, 0.6) : rng() * Math.PI * 2,
    d: rng.range(0.75, 1.9),
    r: rng() < 0.15 ? rng.range(0.05, 0.08) : rng.range(0.012, 0.04),
    stretch: rng.range(1, 2.6),
  }));
  const streaks: Streak[] = Array.from({ length: rng.int(7, 12) }, () => {
    const pieces: { from: number; to: number }[] = [];
    let t = 0;
    while (t < 0.95) {
      const to = Math.min(1, t + rng.range(0.18, 0.45));
      pieces.push({ from: t, to });
      t = to + rng.range(0.03, 0.1);
    }
    return { a: rng.range(-0.34, 0.34), len: rng.range(1.3, 2.6), w: rng.range(0.06, 0.15), bow: rng.range(-0.12, 0.12), pieces };
  });
  return { core, arms, drops, streaks };
};

const corePath = (core: readonly number[], s: number): string =>
  blobPath(core.map((r, i) => polar(r * s, (i / core.length) * Math.PI * 2)));

/** A tapered tongue from the core edge to its tip; the curve bows slightly so arms are not ruler-straight. */
const armPath = ({ a, len, w }: Arm, s: number): string => {
  const base = 0.3 * s;
  const tip = len * s;
  const [bl, br, mid, end] = [polar(base, a - w), polar(base, a + w), polar((base + tip) / 2, a + w * 0.12), polar(tip, a)];
  const side = (w * s * 0.5) / 2;
  const ml: Pt = [mid[0] - Math.sin(a) * side, mid[1] + Math.cos(a) * side];
  const mr: Pt = [mid[0] + Math.sin(a) * side, mid[1] - Math.cos(a) * side];
  return `M${bl[0]} ${bl[1]}Q${mr[0]} ${mr[1]} ${end[0]} ${end[1]}Q${ml[0]} ${ml[1]} ${br[0]} ${br[1]}Z`;
};

/** Pieces of one streak, cut off at `reach` (0-1) while the drag is still forming. Each piece thins along the streak. */
const streakPaths = ({ a, len, w, bow, pieces }: Streak, s: number, reach: number): string =>
  pieces
    .filter((p) => p.from < reach)
    .map((p) => {
      const to = Math.min(p.to, reach);
      const pts: Pt[] = Array.from({ length: 6 }, (_, i) => {
        const t = p.from + ((to - p.from) * i) / 5;
        const r = s * (0.3 + len * t);
        // Bristles bow sideways a little, as a dragged brush does.
        return polar(r, a + bow * Math.sin(t * Math.PI));
      });
      return taperedPath(pts, w * s * (1 - p.from * 0.8), 0.15);
    })
    .join('');

const Splat = ({ geo, s, drift, reach, fill }: { geo: ReturnType<typeof build>; s: number; drift: number; reach: number; fill: string }) => (
  <g fill={fill}>
    <path d={corePath(geo.core, s)} />
    <path d={geo.streaks.map((st) => streakPaths(st, s, reach)).join('')} />
    {geo.arms.map((arm, i) => (
      <g key={i}>
        <path d={armPath(arm, s)} />
        {arm.bulb > 0 ? <circle cx={polar(arm.len * s * 1.02, arm.a)[0]} cy={polar(arm.len * s * 1.02, arm.a)[1]} r={arm.bulb * s} /> : null}
      </g>
    ))}
    {geo.drops.map((d, i) => {
      const [cx, cy] = polar(d.d * s * drift, d.a);
      return <ellipse key={i} cx={cx} cy={cy} rx={d.r * s * d.stretch} ry={d.r * s} transform={`rotate(${(d.a * 180) / Math.PI} ${cx} ${cy})`} />;
    })}
  </g>
);

/**
 * Burst of black ink flung in one direction: core blob, tapered arms with bulbous tips, broken
 * dry-brush drag streaks trailing the throw, flung droplets. Grows in a few frames, then holds.
 */
export const InkSplash = ({ frame, duration, seed, x, y, size, variant = 'black', grow = 5, fade = 0, direction }: InkSplashProps) => {
  if (frame < 0 || frame >= duration) return null;
  const geo = build(seed);
  const g = easeOutExpo((frame + 1) / grow);
  const s = size * (0.25 + 0.75 * g);
  // Droplets keep drifting outward a little after the blob has landed.
  const drift = 0.7 + 0.3 * g + 0.12 * easeOutCubic((frame - grow) / 24);
  const opacity = fade > 0 ? Math.min(1, (duration - frame) / fade) : 1;
  const rot = ((direction ?? seeded(`splashrot:${seed}`)() * Math.PI * 2) * 180) / Math.PI;
  // The drag forms a little after the blob lands.
  const reach = easeOutCubic((frame + 1) / (grow * 2.2));
  const filter = `url(#${inkFilterId(seed, size / 14)})`;
  return (
    <Overlay style={{ opacity }}>
      <defs>
        <InkFilter seed={seed} rough={size / 14} />
      </defs>
      <g transform={`translate(${x} ${y}) rotate(${rot})`} filter={filter}>
        {variant === 'violet' ? (
          <g transform="rotate(4)">
            <Splat geo={geo} s={s * 1.05} drift={drift * 1.02} reach={reach} fill={VIOLET} />
          </g>
        ) : null}
        <Splat geo={geo} s={s} drift={drift} reach={reach} fill={INK} />
        {variant === 'violet' ? (
          <>
            <path d={corePath(geo.core, s * 0.36)} fill={VIOLET} />
            <path d={corePath(geo.core, s * 0.16)} fill={VIOLET_LIGHT} transform="rotate(40)" />
          </>
        ) : null}
      </g>
    </Overlay>
  );
};
