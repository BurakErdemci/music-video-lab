// Debris chunks. The geometry and the ballistic pose are plain functions so the same shards can
// later be put on stage cards for the canvas breakout; <Shards> is the SVG overlay renderer.
import { seeded } from './seeded.ts';
import { GOLD, INK, InkFilter, inkFilterId, IVORY, Overlay, polar, polyPath, taperedPath, type Pt } from './style.tsx';

export interface ShardSpec {
  /** Polygon around the shard's own centre, px. */
  points: Pt[];
  /** Dark side face (black band) that makes a flat chunk read as a block, as in frame 06. */
  facet: Pt[];
  /** Tapered ink hatch strokes inside the lit face, parallel to the shadow side (pre-built path). */
  hatch: string;
  fill: string;
  /** Initial velocity, px per frame. */
  vx: number;
  vy: number;
  rot0: number;
  /** Degrees per frame. */
  spin: number;
  /** A tiny all-black pebble instead of a lit chunk. */
  pebble: boolean;
}

export interface ShardOptions {
  count: number;
  /** Typical chunk radius, px. */
  size: number;
  /** Launch speed, px per frame. */
  speed: number;
  /** Centre of the launch cone, radians (-PI/2 = up). */
  direction: number;
  /** Full cone width, radians (2*PI = all around). */
  spread: number;
  fills: readonly string[];
}

export const shardSpecs = (seed: number, o: ShardOptions): ShardSpec[] => {
  const rng = seeded(`shards:${seed}`);
  return Array.from({ length: o.count }, () => {
    const pebble = rng() < 0.35;
    const r = o.size * (pebble ? rng.range(0.12, 0.3) : rng.range(0.5, 1.2));
    const k = rng.int(4, 6);
    const start = rng() * Math.PI * 2;
    const points = Array.from({ length: k }, (_, i) => polar(r * rng.range(0.8, 1), start + ((i + rng.range(-0.3, 0.3)) / k) * Math.PI * 2));
    const j = rng.int(0, k - 1);
    const a = points[j] as Pt;
    const b = points[(j + 1) % k] as Pt;
    // A band along one edge, not a wedge to the centre: reads as the block's shaded side.
    const inset = rng.range(0.45, 0.65);
    const facet: Pt[] = [a, b, [b[0] * inset, b[1] * inset], [a[0] * inset, a[1] * inset]];
    // Hatches start on the shadow band's inner edge and run into the lit face, thick at the band
    // and tapering out, the way an inker shades the turn of a block face.
    const hatchCount = rng.int(3, 5);
    const hatch = Array.from({ length: hatchCount }, (_, h) => {
      const t = 0.15 + (0.7 * (h + rng.range(0.2, 0.8))) / hatchCount;
      const start: Pt = [(a[0] + (b[0] - a[0]) * t) * inset, (a[1] + (b[1] - a[1]) * t) * inset];
      // Across the centre and most of the way to the far edge.
      const reach = rng.range(1.2, 1.7);
      const line = Array.from({ length: 5 }, (_, i): Pt => [start[0] * (1 - (reach * i) / 4), start[1] * (1 - (reach * i) / 4)]);
      return taperedPath(line, o.size * rng.range(0.1, 0.14), 0.06);
    }).join('');
    const ang = o.direction + rng.range(-o.spread / 2, o.spread / 2);
    const sp = o.speed * rng.range(0.45, 1.25) * (pebble ? 1.2 : 1);
    return { points, facet, hatch, fill: rng.pick(o.fills), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, rot0: rng() * 360, spin: rng.range(-14, 14), pebble };
  });
};

/** Ballistic pose of a shard `t` frames after launch (y down, `gravity` in px per frame squared). */
export const shardPose = (s: Pick<ShardSpec, 'vx' | 'vy' | 'rot0' | 'spin'>, t: number, origin: Pt, gravity: number): { x: number; y: number; rot: number } => ({
  x: origin[0] + s.vx * t,
  y: origin[1] + s.vy * t + 0.5 * gravity * t * t,
  rot: s.rot0 + s.spin * t,
});

export interface ShardsProps extends Partial<ShardOptions> {
  /** Frame relative to the launch. */
  frame: number;
  duration: number;
  seed: number;
  origin: Pt;
  gravity?: number;
}

/** Gold/ivory flat chunks with black edges and a black side face, flying outward under gravity. */
export const Shards = ({ frame, duration, seed, origin, gravity = 1.4, count = 28, size = 46, speed = 34, direction = -Math.PI / 2, spread = Math.PI * 1.4, fills = [GOLD, GOLD, IVORY] }: ShardsProps) => {
  if (frame < 0 || frame >= duration) return null;
  const specs = shardSpecs(seed, { count, size, speed, direction, spread, fills });
  const filterId = inkFilterId(seed, 5, 0.25);
  return (
    <Overlay>
      <defs>
        <InkFilter seed={seed} rough={5} breakup={0.25} />
      </defs>
      <g filter={`url(#${filterId})`}>
        {specs.map((s, i) => {
          const p = shardPose(s, frame, origin, gravity);
          return (
            <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              {s.pebble ? (
                <path d={polyPath(s.points)} fill={INK} />
              ) : (
                <>
                  <path d={polyPath(s.points)} fill={s.fill} stroke={INK} strokeWidth={size * 0.12} strokeLinejoin="miter" />
                  <path d={polyPath(s.facet)} fill={INK} />
                  <path d={s.hatch} fill={INK} />
                </>
              )}
            </g>
          );
        })}
      </g>
    </Overlay>
  );
};
