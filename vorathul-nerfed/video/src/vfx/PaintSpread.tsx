// Ink and gold paint flooding over a flat plate along a front (storyboard 2, N3). Each source
// grows a seeded blob; bands of alternating colour trail behind the front, and the union of all
// sources is drawn band by band so neighbouring floods merge instead of overlapping.
import { useVideoConfig } from 'remotion';
import { seeded } from './seeded.ts';
import { blobPath, easeOutCubic, GOLD, INK, InkFilter, inkFilterId, Overlay, polar } from './style.tsx';

export interface PaintSource {
  x: number;
  y: number;
  /** Frames after the effect start before this source begins to flow. */
  delay?: number;
}

export interface PaintSpreadProps {
  /** Frame relative to the start. */
  frame: number;
  seed: number;
  sources: readonly PaintSource[];
  /** Front radius after t frames of flow, px. Default: eases to `reach` over 60 frames. */
  growth?: (t: number) => number;
  /** Final radius of the default growth, px. */
  reach?: number;
  /** Colours from the front inward; the front band is the first. */
  bands?: readonly string[];
  /** Width of each band behind the front, px. */
  bandWidth?: number;
  /** >1 stretches the flood downward (paint running down a wall and over a floor). */
  drip?: number;
  /** <1 holds the flood back above its sources (paint does not run uphill). */
  rise?: number;
  /** 'cover' also fills the whole frame with the innermost colour once every source has met the frame edges. */
  mode?: 'overlay' | 'cover';
  /** 'dry' = dry-brush ink edge; 'plain' = clean edge (office-grey seep of storyboard 1). */
  edge?: 'dry' | 'plain';
}

const POINTS = 40;

/**
 * Per-angle radius multipliers: low-frequency lobes, a few fingers all round, and with `drip` > 1
 * long runs pointing down.
 */
const front = (seed: number, drip: number): number[] => {
  const rng = seeded(`paint:${seed}`);
  const phases = [rng() * 6.3, rng() * 6.3, rng() * 6.3];
  const fingers = Array.from({ length: rng.int(4, 7) }, () => ({ a: rng() * Math.PI * 2, k: rng.range(0.12, 0.3) }));
  if (drip > 1) for (let i = rng.int(3, 5); i > 0; i--) fingers.push({ a: Math.PI / 2 + rng.range(-0.7, 0.7), k: rng.range(0.25, 0.6) * (drip - 1) });
  return Array.from({ length: POINTS }, (_, i) => {
    const a = (i / POINTS) * Math.PI * 2;
    let m = 1 + 0.08 * Math.sin(3 * a + (phases[0] as number)) + 0.05 * Math.sin(5 * a + (phases[1] as number)) + 0.03 * Math.sin(9 * a + (phases[2] as number));
    for (const fg of fingers) m += fg.k * Math.exp(-(((Math.atan2(Math.sin(a - fg.a), Math.cos(a - fg.a)) / 0.12) ** 2)));
    return m;
  });
};

export const PaintSpread = ({ frame, seed, sources, growth, reach = 900, bands = [INK, GOLD, INK, GOLD], bandWidth = 70, drip = 1, rise = 1, mode = 'overlay', edge = 'dry' }: PaintSpreadProps) => {
  const { width, height } = useVideoConfig();
  if (frame < 0) return null;
  const grow = growth ?? ((t: number) => reach * easeOutCubic(t / 60));
  const shapes = sources.map((s, i) => ({ s, r: grow(Math.max(0, frame - (s.delay ?? 0))), i }));
  // Each band has its own front, so inner bands read as separate streams inside the flood, not
  // as concentric rings.
  const fronts = bands.map((_, b) => sources.map((_s, i) => front(seed * 101 + i * 7 + b * 13, drip)));
  const blob = (x: number, y: number, r: number, m: readonly number[]) =>
    blobPath(m.map((k, i) => {
      const [px, py] = polar(r * k, (i / POINTS) * Math.PI * 2);
      return [x + px, y + py * (py > 0 ? drip : rise)] as [number, number];
    }));
  // 'cover': the innermost colour takes the frame once any source's inner band reaches its farthest corner.
  const inner = (bands.length - 1) * bandWidth;
  const covered = mode === 'cover' && shapes.some(({ s, r }) => (r - inner) * 0.85 >= Math.max(Math.hypot(s.x, s.y), Math.hypot(width - s.x, s.y), Math.hypot(s.x, height - s.y), Math.hypot(width - s.x, height - s.y)));
  const rough = 12;
  const filter = edge === 'dry' ? `url(#${inkFilterId(seed, rough, 0.15)})` : undefined;
  return (
    <Overlay>
      {edge === 'dry' ? (
        <defs>
          <InkFilter seed={seed} rough={rough} breakup={0.15} />
        </defs>
      ) : null}
      <g filter={filter}>
        {bands.map((color, b) => (
          <path key={b} fill={color} d={shapes.map(({ s, r, i }) => (r - b * bandWidth > 4 ? blob(s.x, s.y + b * bandWidth * 0.4, r - b * bandWidth, fronts[b]![i]!) : '')).join('')} />
        ))}
      </g>
      {covered ? <rect width={width} height={height} fill={bands[bands.length - 1]} /> : null}
    </Overlay>
  );
};
