import { palette } from '../style/palette.ts';
import { YellowPlate } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { onTwos, clamp01, smooth } from '../math.ts';
import { H, W } from '../layout.ts';

interface Props {
  frame: number;
  startFrame: number;
  endFrame: number;
  seed?: string;
}

const BULGE = 300;
const ROWS = 54;

/** Right edge of the wave at row y when the wave front is at x = base. */
const edgeX = (base: number, y: number, jag: number): number => base + BULGE * Math.pow(Math.sin((Math.PI * y) / H), 1.2) - 240 + jag;

/**
 * Hard-edged cream wave sweeping left to right (smooth at 30 fps, torn edge jitters on twos).
 * Notes are torn off its edge and trail behind it, shrinking into small dots.
 */
export const WhiteWave = ({ frame, startFrame, endFrame, seed = 'wave' }: Props) => {
  const p = clamp01((frame - startFrame) / (endFrame - startFrame));
  if (frame < startFrame || frame > endFrame + 1) return null;
  const e = smooth(p);
  const base = -BULGE + e * (W + BULGE * 2 + 280);
  const step = Math.floor(onTwos(frame) / 2);
  const jagAt = (row: number): number => {
    const r = seeded(`${seed}:jag:${row}:${step}`);
    return (r() - 0.5) * 30 + (r() < 0.12 ? r() * 46 : 0);
  };
  const pts: string[] = [];
  for (let i = 0; i <= ROWS; i++) {
    const y = (i / ROWS) * H;
    pts.push(`${edgeX(base, y, jagAt(i)).toFixed(1)},${y.toFixed(1)}`);
  }
  const d = `M-60,-10 L${pts.join(' L')} L-60,${H + 10} Z`;

  const r = seeded(`${seed}:bits`);
  const bits = Array.from({ length: 44 }, () => ({ yf: r(), born: range(r, 0.05, 0.95), rot: range(r, 0, 360), spin: range(r, -200, 200), size: range(r, 26, 44), lag: range(r, 0.35, 0.8) }));
  return (
    <g>
      <path d={d} fill={palette.cream} />
      <YellowPlate k={`${seed}:bits`}>
        {bits.map((b, i) => {
          if (p < b.born) return null;
          const y = b.yf * H;
          const eBorn = smooth(b.born);
          const baseBorn = -BULGE + eBorn * (W + BULGE * 2 + 280);
          const xBorn = edgeX(baseBorn, y, 0);
          const xNow = edgeX(base, y, 0);
          const x = xBorn + (xNow - xBorn) * b.lag - 6;
          const age = clamp01((p - b.born) * 3.2);
          const size = b.size + (7 - b.size) * age;
          return (
            <rect
              key={i}
              x={x - size / 2}
              y={y + Math.sin(age * 5 + i) * 14 - size / 2}
              width={size}
              height={size}
              fill={palette.moonYellow}
              transform={`rotate(${(b.rot + b.spin * age).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
            />
          );
        })}
      </YellowPlate>
    </g>
  );
};
