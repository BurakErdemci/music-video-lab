import { palette } from '../style/palette.ts';
import { YellowPlate } from '../style/screenprint.tsx';
import { clamp01, lerp, smooth } from '../math.ts';
import { seeded, range } from '../style/seeded.ts';

/** One yellow sticky note centred on (0,0). */
export const Sticky = ({ size = 64, ink = palette.navy }: { size?: number; ink?: string }) => (
  <g>
    <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={palette.moonYellow} />
    <rect x={-size / 2 + size * 0.14} y={-size / 2 + size * 0.22} width={size * 0.7} height={size * 0.045} fill={ink} />
    <rect x={-size / 2 + size * 0.14} y={-size / 2 + size * 0.4} width={size * 0.52} height={size * 0.045} fill={ink} />
    <rect x={-size / 2 + size * 0.14} y={-size / 2 + size * 0.58} width={size * 0.62} height={size * 0.045} fill={ink} />
  </g>
);

interface FlyProps {
  frame: number;
  startFrame: number;
  /** Flight length in frames (the caller derives it from two beat frames). */
  duration: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  arc?: number;
  seed: string;
  /** Keep the note pinned at `to` after landing. */
  stay?: boolean;
  size?: number;
}

/** A note flying along an arc, crossing the glass; smooth at 30 fps. */
export const NoteFly = ({ frame, startFrame, duration, from, to, arc = 160, seed, stay = true, size = 64 }: FlyProps) => {
  if (frame < startFrame) return null;
  const t = clamp01((frame - startFrame) / duration);
  if (t >= 1 && !stay) return null;
  const r = seeded(`fly:${seed}`);
  const rot0 = range(r, -25, 25);
  const spin = range(r, -140, 140);
  const e = smooth(t);
  const x = lerp(from.x, to.x, e);
  const y = lerp(from.y, to.y, e) - arc * 4 * e * (1 - e);
  const rot = t >= 1 ? rot0 : rot0 + spin * (1 - e);
  return (
    <YellowPlate k={`fly:${seed}`}>
      <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`}>
        <Sticky size={size} />
      </g>
    </YellowPlate>
  );
};
