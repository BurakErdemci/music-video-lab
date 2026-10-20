// A dry-brush ink stroke along any SVG path, for use inside an existing <svg> (it renders a <g>).
import type { ReactNode } from 'react';
import { hashKey } from './seeded.ts';
import { type Bounds, INK, InkFilter, inkFilterId } from './style.tsx';

export interface DryBrushStrokeProps {
  /** Any SVG path, in the parent svg's user units. */
  d: string;
  /** Widest stroke width, user units. */
  width: number;
  color?: string;
  seed?: number;
  /** 0 = even width; 1 = needle-thin at both ends, full width only in the middle. */
  taper?: number;
  /** 0 = a few skipped specks; 1 = heavily broken bristles. */
  breakup?: number;
  /** Edge raggedness in user units; defaults to a third of the width. */
  rough?: number;
  /** Filter region; by default computed from the path's absolute coordinates (see pathBounds). */
  bounds?: Bounds;
}

const LAYERS = 4;

/**
 * Rough user-space box of a path from its absolute coordinates, padded. Arcs contribute their
 * end point padded by their radii. Relative commands cannot be bounded without walking the path,
 * so they fall back to a generous box around the numbers seen.
 */
export const pathBounds = (d: string, pad: number): Bounds => {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  let cmd = 'M';
  let args: number[] = [];
  let relative = false;
  let arcPad = 0;
  const flush = () => {
    if (cmd === 'A') {
      for (let i = 0; i + 7 <= args.length; i += 7) {
        xs.push(args[i + 5] as number);
        ys.push(args[i + 6] as number);
        arcPad = Math.max(arcPad, args[i] as number, args[i + 1] as number);
      }
    } else if (cmd === 'H') xs.push(...args);
    else if (cmd === 'V') ys.push(...args);
    else for (let i = 0; i + 1 < args.length; i += 2) (xs.push(args[i] as number), ys.push(args[i + 1] as number));
    args = [];
  };
  for (const t of tokens) {
    if (/[a-zA-Z]/.test(t)) {
      flush();
      cmd = t.toUpperCase();
      if (t !== t.toUpperCase() && t !== 'z') relative = true;
    } else args.push(Number(t));
  }
  flush();
  if (!xs.length || !ys.length) return [-1000, -1000, 4000, 4000];
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const p = pad + arcPad + (relative ? Math.max(x1 - x0, y1 - y0, 500) : 0);
  return [x0 - p, y0 - p, x1 - x0 + 2 * p, y1 - y0 + 2 * p];
};

/**
 * Taper without knowing the path's geometry: LAYERS strokes of the same colour, each wider one
 * covering a shorter middle stretch of the path (pathLength=1 makes dash units fractions of the
 * length). The ink filter then melts the steps into one ragged, broken brush mark.
 */
export const DryBrushStroke = ({ d, width, color = INK, seed = 1, taper = 0.6, breakup = 0.3, rough, bounds }: DryBrushStrokeProps) => {
  const r = rough ?? Math.max(2, width / 3);
  const region = bounds ?? pathBounds(d, width * 2 + r * 2);
  return (
    <g>
      <defs>
        <InkFilter seed={seed} rough={r} breakup={breakup} region={region} />
      </defs>
      <g filter={`url(#${inkFilterId(seed, r, breakup, region)})`} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        {Array.from({ length: LAYERS }, (_, k) => {
          const w = width * ((k + 1) / LAYERS);
          const t = taper * 0.45 * (k / (LAYERS - 1));
          // One dash covering [t, 1 - t]; a leading zero-length dash would draw a round-cap dot at the tip.
          return <path key={k} d={d} pathLength={1} strokeWidth={w} strokeDasharray={t > 0 ? `${1 - 2 * t} ${1 + 2 * t}` : undefined} strokeDashoffset={-t} />;
        })}
      </g>
    </g>
  );
};

/** Render-prop form: wraps any children in the same dry-brush filter (for fills, not only strokes). */
export const DryBrush = ({ seed = 1, rough = 6, breakup = 0.3, region, children }: { seed?: number; rough?: number; breakup?: number; region?: Bounds; children: (filter: string) => ReactNode }) => (
  <g>
    <defs>
      <InkFilter seed={seed} rough={rough} breakup={breakup} region={region} />
    </defs>
    {children(`url(#${inkFilterId(seed, rough, breakup, region)})`)}
  </g>
);

/**
 * Adapter matching the UI kit's OutlineRenderer ({ id, d, width, color }) => ReactNode, so
 * `renderOutline={dryBrushOutline({ taper: 0.3 })}` swaps its plain strokes for brush marks.
 * Each outline gets its own seed from its id, so neighbouring outlines do not share a pattern.
 */
export const dryBrushOutline =
  (opts: Omit<DryBrushStrokeProps, 'd' | 'width' | 'color' | 'seed'> & { seed?: number } = {}) =>
  ({ id, d, width, color }: { id: string; d: string; width: number; color: string }): ReactNode => (
    <DryBrushStroke key={id} {...opts} d={d} width={width} color={color} seed={(hashKey(`${opts.seed ?? 0}:${id}`) % 9973) + 1} />
  );
