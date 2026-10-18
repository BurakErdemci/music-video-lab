import { palette } from '../style/palette.ts';
import { HalftonePattern, YellowPlate } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { onTwos, clamp01, smooth } from '../math.ts';
import { H, W } from '../layout.ts';

interface Props {
  frame: number;
  startFrame: number;
  endFrame: number;
  seed?: string;
  /** Where the wave front is (mid-height, before the bulge) at the start and the end. Default: left of the frame to beyond the right edge. */
  baseFrom?: number;
  baseTo?: number;
  /** Number of notes torn into yellow dots along the front. */
  bits?: number;
  /** Rows (0..1 of the frame height) where pinned notes sit: the dots are born there. */
  noteRows?: readonly number[];
  /** Navy squeegee drag lines and a broken ink edge: the wave reads on a cream room too. */
  ink?: boolean;
}

const BULGE = 300;
const ROWS = 54;
const BASE_FROM = -BULGE;
const BASE_TO = W + BULGE + 280;

/** Right edge of the wave at row y when the wave front is at x = base. */
const edgeX = (base: number, y: number, jag: number): number => base + BULGE * Math.pow(Math.sin((Math.PI * y) / H), 1.2) - 240 + jag;

/** Base of the front at progress p. */
export const waveBase = (p: number, from = BASE_FROM, to = BASE_TO): number => from + smooth(p) * (to - from);

/** The seam-to-right-edge sweep used for the AI side: front starts behind the glass and ends past the edge for every row. */
export const SEAM_SWEEP = { from: 900, to: W + 260 + 240 } as const;

/**
 * Hard-edged cream wave sweeping left to right (smooth at 30 fps, torn edge jitters on twos).
 * Notes are torn off its edge and trail behind it, shrinking into small dots.
 */
export const WhiteWave = ({ frame, startFrame, endFrame, seed = 'wave', baseFrom = BASE_FROM, baseTo = BASE_TO, bits = 44, noteRows = [], ink = false }: Props) => {
  const p = clamp01((frame - startFrame) / (endFrame - startFrame));
  if (frame < startFrame || frame > endFrame + 1) return null;
  const base = waveBase(p, baseFrom, baseTo);
  const step = Math.floor(onTwos(frame) / 2);
  const jagAt = (row: number): number => {
    const r = seeded(`${seed}:jag:${row}:${step}`);
    return (r() - 0.5) * 30 + (r() < 0.12 ? r() * 46 : 0);
  };
  const edgePts: string[] = [];
  for (let i = 0; i <= ROWS; i++) {
    const y = (i / ROWS) * H;
    edgePts.push(`${edgeX(base, y, jagAt(i)).toFixed(1)},${y.toFixed(1)}`);
  }
  const d = `M-60,-10 L${edgePts.join(' L')} L-60,${H + 10} Z`;

  const r = seeded(`${seed}:bits`);
  const rows = noteRows.flatMap((yf) => [yf, yf + 0.03, yf - 0.03]);
  const items = Array.from({ length: Math.max(bits, rows.length) }, (_, i) => ({
    yf: i < rows.length ? clamp01((rows[i] as number) + (r() - 0.5) * 0.02) : r(),
    born: range(r, 0.05, 0.95),
    rot: range(r, 0, 360),
    spin: range(r, -200, 200),
    size: range(r, 26, 44),
    lag: range(r, 0.35, 0.8),
  }));
  const streaks = ink ? Array.from({ length: 9 }, () => ({ yf: r(), len: range(r, 90, 260), w: range(r, 1.5, 3.2) })) : [];
  const wakeId = `wake-${seed.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <g>
      <defs>
        <HalftonePattern id={wakeId} spacing={11} radius={2.2} />
      </defs>
      <path d={d} fill={palette.cream} />
      {ink && (
        <path
          d={`M${edgePts.join(' L')} L${[...edgePts].reverse().map((q) => `${(Number(q.split(',')[0]) - 150).toFixed(1)},${q.split(',')[1]}`).join(' L')} Z`}
          fill={`url(#${wakeId})`}
        />
      )}
      {ink && (
        <g fill="none" strokeLinejoin="round">
          {streaks.map((s, i) => {
            const y = s.yf * H;
            const x = edgeX(base, y, 0) - 6;
            return <line key={i} x1={x - s.len} y1={y} x2={x} y2={y + (i % 2 ? 2 : -2)} stroke={palette.navy} strokeWidth={s.w} opacity={0.55} />;
          })}
          <YellowPlate k={`${seed}:edge`}>
            <path d={`M${edgePts.join(' L')}`} stroke={palette.moonYellow} strokeWidth={5} opacity={0.85} />
          </YellowPlate>
          <path d={`M${edgePts.join(' L')}`} stroke={palette.navy} strokeWidth={3.4} strokeDasharray="70 12 26 9 44 14" />
        </g>
      )}
      <YellowPlate k={`${seed}:bits`}>
        {items.map((b, i) => {
          if (p < b.born) return null;
          const y = b.yf * H;
          const baseBorn = waveBase(b.born, baseFrom, baseTo);
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
              opacity={1 - clamp01((p - 0.8) / 0.2)}
              transform={`rotate(${(b.rot + b.spin * age).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
            />
          );
        })}
      </YellowPlate>
    </g>
  );
};
