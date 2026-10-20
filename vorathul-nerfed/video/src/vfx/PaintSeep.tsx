// A flat colour seeping outward from points (storyboard 1, the office-grey seep where each office
// tool touches the painting). Each source grows a seeded blob; bands of alternating colour trail
// behind the front, and all sources are drawn band by band so neighbouring seeps merge.
// For paint pouring out of the frame, use PaintSpread.
import { seeded } from './seeded.ts';
import { blobPath, easeOutCubic, InkFilter, inkFilterId, Overlay, polar } from './style.tsx';

export interface PaintSource {
  x: number;
  y: number;
  /** Frames after the effect start before this source begins to flow. */
  delay?: number;
}

export interface PaintSeepProps {
  /** Frame relative to the start. */
  frame: number;
  seed: number;
  sources: readonly PaintSource[];
  /** Front radius after t frames, px. Default: eases to `reach` over 60 frames. */
  growth?: (t: number) => number;
  reach?: number;
  /** Colours from the front inward, e.g. the O greys. */
  bands: readonly string[];
  /** Width of each band behind the front, px. */
  bandWidth?: number;
  /** 'plain' = clean edge (office); 'dry' = dry-brush ink edge. */
  edge?: 'dry' | 'plain';
}

const POINTS = 40;

/** Per-angle radius multipliers: low-frequency lobes plus a few fingers. */
const front = (seed: number): number[] => {
  const rng = seeded(`paint:${seed}`);
  const phases = [rng() * 6.3, rng() * 6.3, rng() * 6.3];
  const fingers = Array.from({ length: rng.int(4, 7) }, () => ({ a: rng() * Math.PI * 2, k: rng.range(0.12, 0.3) }));
  return Array.from({ length: POINTS }, (_, i) => {
    const a = (i / POINTS) * Math.PI * 2;
    let m = 1 + 0.08 * Math.sin(3 * a + (phases[0] as number)) + 0.05 * Math.sin(5 * a + (phases[1] as number)) + 0.03 * Math.sin(9 * a + (phases[2] as number));
    for (const fg of fingers) m += fg.k * Math.exp(-((Math.atan2(Math.sin(a - fg.a), Math.cos(a - fg.a)) / 0.12) ** 2));
    return m;
  });
};

export const PaintSeep = ({ frame, seed, sources, growth, reach = 300, bands, bandWidth = 40, edge = 'plain' }: PaintSeepProps) => {
  if (frame < 0) return null;
  const grow = growth ?? ((t: number) => reach * easeOutCubic(t / 60));
  const rough = 12;
  return (
    <Overlay>
      {edge === 'dry' ? (
        <defs>
          <InkFilter seed={seed} rough={rough} breakup={0.15} />
        </defs>
      ) : null}
      <g filter={edge === 'dry' ? `url(#${inkFilterId(seed, rough, 0.15)})` : undefined}>
        {bands.map((color, b) => (
          <path
            key={b}
            fill={color}
            d={sources
              .map((s, i) => {
                const r = grow(Math.max(0, frame - (s.delay ?? 0))) - b * bandWidth;
                return r > 4 ? blobPath(front(seed * 101 + i * 7 + b * 13).map((k, j) => { const [px, py] = polar(r * k, (j / POINTS) * Math.PI * 2); return [s.x + px, s.y + py] as [number, number]; })) : '';
              })
              .join('')}
          />
        ))}
      </g>
    </Overlay>
  );
};
