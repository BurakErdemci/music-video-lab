import { DryBrushStroke } from './DryBrushStroke.tsx';
import { seeded } from './seeded.ts';
import { curvePath, INK, Overlay, type Bounds, type Pt } from './style.tsx';

export interface ScribbleBoilProps {
  /** Frame relative to the effect start. */
  frame: number;
  duration: number;
  seed: number;
  /** Centre and radii of the region the scribbles circle, px. */
  x: number;
  y: number;
  rx: number;
  ry: number;
  color?: string;
  /** Stroke width, px. */
  width?: number;
  /** Number of looping strokes. */
  loops?: number;
  /** Short jagged accent marks around the loops. */
  ticks?: number;
  /** Frames each drawing holds before it re-rolls (2-3 reads as hand-drawn boil). */
  hold?: number;
  /** Radial wobble, fraction of the radius. */
  jitter?: number;
}

/** Hand-drawn looping scribbles around a region that re-draw every `hold` frames. */
export const ScribbleBoil = ({ frame, duration, seed, x, y, rx, ry, color = INK, width = 7, loops = 3, ticks = 6, hold = 2, jitter = 0.14 }: ScribbleBoilProps) => {
  if (frame < 0 || frame >= duration) return null;
  const step = Math.floor(frame / hold);
  const rng = seeded(`scribble:${seed}:${step}`);
  const pad = Math.max(rx, ry) * 0.6 + width * 4;
  const bounds: Bounds = [x - rx - pad, y - ry - pad, 2 * (rx + pad), 2 * (ry + pad)];
  const strokes: string[] = [];
  for (let l = 0; l < loops; l++) {
    const a0 = rng() * Math.PI * 2;
    const sweep = Math.PI * 2 * rng.range(0.8, 1.35);
    const n = 22;
    const pts: Pt[] = Array.from({ length: n }, (_, i) => {
      const a = a0 + (sweep * i) / (n - 1);
      const k = 1 + jitter * (rng() * 2 - 1) + 0.06 * l;
      return [x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k];
    });
    strokes.push(curvePath(pts));
  }
  for (let t = 0; t < ticks; t++) {
    // Zigzag accent pointing outward from the loop.
    const a = rng() * Math.PI * 2;
    const r0 = 1.08 + rng() * 0.12;
    const len = rng.range(0.12, 0.28);
    const zig: Pt[] = Array.from({ length: 4 }, (_, i) => {
      const r = r0 + (len * i) / 3;
      const side = (i % 2 ? 1 : -1) * 0.05;
      return [x + Math.cos(a + side) * rx * r, y + Math.sin(a + side) * ry * r];
    });
    strokes.push(`M${zig.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join('L')}`);
  }
  return (
    <Overlay>
      {strokes.map((d, i) => (
        <DryBrushStroke key={i} d={d} width={i < loops ? width : width * 0.8} color={color} seed={(seed * 31 + step * 7 + i) % 9973} taper={0.7} breakup={0.2} bounds={bounds} />
      ))}
    </Overlay>
  );
};
