import { palette } from '../style/palette.ts';
import { HalftonePattern, YellowPlate } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { clamp01, smooth } from '../math.ts';
import { onTwos } from '../math.ts';
import { H, SEAM_X, W } from '../layout.ts';

interface Props {
  frame: number;
  startFrame: number;
  endFrame: number;
  seed: string;
  /** Rows (0..1 of the frame height) where pinned notes sit on the AI side: the yellow dots are born there. */
  noteRows?: readonly number[];
  bits?: number;
}

const ROWS = 48;
const BULGE = 150;
const X0 = -520;
const X1 = W + 560;
/** The navy band's width, px: the cream cover follows the navy front this far behind (test90-v4). In v3 the cover
 * started a share of the wave later, so for 2-3 frames the band spanned the whole frame: a full-navy flicker. Now
 * the band is a wave of fixed width sweeping across, never the whole picture. */
const BAND = 560;
const LEAD = 1;

/** Frame-wide breathing of the whole picture on a flood bar: 1 -> 1.014 -> 1. */
export const floodPulse = (frame: number, startFrame: number, endFrame: number): number => {
  if (frame < startFrame || frame > endFrame) return 1;
  const t = (frame - startFrame) / (endFrame - startFrame);
  return 1 + 0.014 * Math.sin(Math.PI * t);
};

/**
 * One chorus bar. A navy flood sweeps across the WHOLE frame (both rooms) and, right behind it, a cream wave
 * covers the AI side only: the AI room is left blank (its notes torn into yellow dots), the human room is
 * uncovered again as it was. Draw it after the rooms' contents and before the characters.
 */
export const BarFlood = ({ frame, startFrame, endFrame, seed, noteRows = [], bits = 40 }: Props) => {
  if (frame < startFrame || frame > endFrame + 1) return null;
  const p = clamp01((frame - startFrame + 1) / (endFrame - startFrame));
  const xLead = X0 + smooth(p) * (X1 + BAND - X0);
  const xTrail = xLead - BAND;
  const step = Math.floor(onTwos(frame) / 2);
  const jag = (row: number, tag: string): number => {
    const r = seeded(`${seed}:${tag}:${row}:${step}`);
    return (r() - 0.5) * 26 + (r() < 0.12 ? r() * 40 : 0);
  };
  const edge = (base: number, i: number, tag: string, bulge: number): { x: number; y: number } => {
    const y = (i / ROWS) * H;
    return { x: base + bulge * Math.pow(Math.sin((Math.PI * y) / H), 1.2) + jag(i, tag), y };
  };
  const lead = Array.from({ length: ROWS + 1 }, (_, i) => edge(xLead, i, 'l', BULGE));
  const trail = Array.from({ length: ROWS + 1 }, (_, i) => edge(xTrail, i, 't', BULGE * 0.6));
  const pts = (a: { x: number; y: number }[]): string => a.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' L');
  const band = `M${pts(lead)} L${pts([...trail].reverse())} Z`;
  const cover = `M-60,-10 L${pts(trail)} L-60,${H + 10} Z`;
  const wake = `M${pts(trail)} L${pts(trail.map((q) => ({ x: q.x - 170, y: q.y })).reverse())} Z`;

  const r = seeded(`${seed}:bits`);
  const rows = noteRows.flatMap((yf) => [yf, yf + 0.03, yf - 0.03]);
  const items = Array.from({ length: Math.max(bits, rows.length) }, (_, i) => ({
    yf: i < rows.length ? clamp01((rows[i] as number) + (r() - 0.5) * 0.02) : r(),
    born: range(r, 0.05, 0.6),
    rot: range(r, 0, 360),
    spin: range(r, -240, 240),
    size: range(r, 24, 42),
    lag: range(r, 0.3, 0.75),
  }));
  const streaks = Array.from({ length: 11 }, () => ({ yf: r(), len: range(r, 140, 380), w: range(r, 1.6, 3.4) }));
  const id = `flood-${seed.replace(/[^a-z0-9]/gi, '')}`;
  const edgeAt = (b: number, y: number): number => b + BULGE * Math.pow(Math.sin((Math.PI * y) / H), 1.2);
  return (
    <g>
      <defs>
        <HalftonePattern id={`${id}-dots`} spacing={11} radius={2.3} />
        <clipPath id={`${id}-ai`}>
          <rect x={SEAM_X} y={0} width={W - SEAM_X} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-ai)`}>
        <path d={cover} fill={palette.cream} />
        <path d={wake} fill={`url(#${id}-dots)`} />
      </g>
      <path d={band} fill={palette.navy} />
      <g fill="none" strokeLinecap="round">
        {streaks.map((s, i) => {
          const y = s.yf * H;
          const x = edgeAt(xLead, y) - 10;
          return <line key={i} x1={x - s.len} y1={y} x2={x} y2={y + (i % 2 ? 2 : -2)} stroke={palette.cream} strokeWidth={s.w} opacity={0.5} />;
        })}
        <YellowPlate k={`${seed}:edge`}>
          <path d={`M${pts(lead)}`} stroke={palette.moonYellow} strokeWidth={6} opacity={0.9} strokeLinejoin="round" />
        </YellowPlate>
        <path d={`M${pts(lead)}`} stroke={palette.cream} strokeWidth={3} strokeDasharray="60 12 22 10 40 14" strokeLinejoin="round" opacity={0.8} />
      </g>
      <YellowPlate k={`${seed}:bits`}>
        {items.map((b, i) => {
          const q = p / LEAD;
          if (q < b.born) return null;
          const y = b.yf * H;
          const xBorn = edgeAt(X0 + smooth(clamp01(b.born)) * (X1 - X0), y);
          const xNow = edgeAt(xLead, y);
          const x = xBorn + (xNow - xBorn) * b.lag - 8;
          if (x < SEAM_X - 40) return null;
          const age = clamp01((q - b.born) * 2.6);
          const size = b.size + (7 - b.size) * age;
          return (
            <rect
              key={i}
              x={x - size / 2}
              y={y + Math.sin(age * 5 + i) * 14 - size / 2}
              width={size}
              height={size}
              fill={palette.moonYellow}
              opacity={1 - clamp01((p - 0.82) / 0.18)}
              transform={`rotate(${(b.rot + b.spin * age).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
            />
          );
        })}
      </YellowPlate>
    </g>
  );
};
