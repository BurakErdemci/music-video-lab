// SVG views for the entrance types in entrances.ts. Ids must be unique inside one frame's SVG.
import type { ReactNode } from 'react';
import { H, W } from '../layout.ts';
import { dotField, dotRadius, regOffset, type Box } from './entrances.ts';

const PAD = 120;

/** Gradient line of a soft wipe: white behind the front, black ahead of it. */
export const wipeLine = (axis: 'x' | 'y', from: number, to: number, p: number, soft: number) => {
  const d = to >= from ? 1 : -1;
  const len = Math.abs(to - from);
  const front = from + d * p * (len + soft);
  const a = front - d * soft;
  return axis === 'y' ? { x1: 0, y1: a, x2: 0, y2: front } : { x1: a, y1: 0, x2: front, y2: 0 };
};

/** Mask definition for a soft wipe; reference with mask="url(#id)". `invert` shows what the wipe has not reached. */
export const WipeMask = ({ id, p, axis, from, to, soft, invert = false }: { id: string; p: number; axis: 'x' | 'y'; from: number; to: number; soft: number; invert?: boolean }) => {
  const g = wipeLine(axis, from, to, p, soft);
  return (
    <>
      <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
        <stop offset="0" stopColor={invert ? '#000' : '#fff'} />
        <stop offset="1" stopColor={invert ? '#fff' : '#000'} />
      </linearGradient>
      <mask id={id} maskUnits="userSpaceOnUse" x={-PAD} y={-PAD} width={W + 2 * PAD} height={H + 2 * PAD}>
        <rect x={-PAD} y={-PAD} width={W + 2 * PAD} height={H + 2 * PAD} fill={`url(#${id}-g)`} />
      </mask>
    </>
  );
};

interface SqueegeeProps {
  id: string;
  /** Eased progress, see wipeP(). 0 = nothing yet, 1 = fully printed. */
  p: number;
  axis?: 'x' | 'y';
  from: number;
  to: number;
  /** Width of the soft edge in px. */
  soft?: number;
  /** Registration key: the print lands off by a few px and settles with the wipe (omit for none). */
  reg?: string;
  regAmp?: number;
  children: ReactNode;
}

/** Screen-print squeegee pull: the children are revealed by a soft-edged wipe. */
export const Squeegee = ({ id, p, axis = 'y', from, to, soft = 90, reg, regAmp = 16, children }: SqueegeeProps) => {
  if (p <= 0) return null;
  const off = reg ? regOffset(reg, p, regAmp) : { dx: 0, dy: 0 };
  const inner = off.dx || off.dy ? <g transform={`translate(${off.dx.toFixed(2)} ${off.dy.toFixed(2)})`}>{children}</g> : <g>{children}</g>;
  if (p >= 1) return inner;
  return (
    <>
      <defs>
        <WipeMask id={id} p={p} axis={axis} from={from} to={to} soft={soft} />
      </defs>
      <g mask={`url(#${id})`}>{inner}</g>
    </>
  );
};

interface HalftoneProps {
  id: string;
  /** Eased progress, see dotP(). An exit passes 1 - dotP(). */
  p: number;
  /** Where the figure is; the dot screen covers this box. */
  box: Box;
  spacing?: number;
  seed: string;
  reg?: string;
  regAmp?: number;
  /**
   * For a figure whose body is the same colour as the ground (navy on navy): a light copy of it is
   * printed through the same dots and fades out once the dots have merged, so the screen stays visible.
   */
  proof?: ReactNode;
  children: ReactNode;
}

/** Halftone dissolve: the children show through dots whose radius grows from 0 until they overlap solid. */
export const Halftone = ({ id, p, box, spacing = 12, seed, reg, regAmp = 10, proof, children }: HalftoneProps) => {
  if (p <= 0) return null;
  const off = reg ? regOffset(reg, p, regAmp) : { dx: 0, dy: 0 };
  const inner = off.dx || off.dy ? <g transform={`translate(${off.dx.toFixed(2)} ${off.dy.toFixed(2)})`}>{children}</g> : <g>{children}</g>;
  if (p >= 1) return inner;
  const dots = dotField(box, spacing, seed);
  return (
    <>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={box.x - spacing * 2} y={box.y - spacing * 2} width={box.w + spacing * 4} height={box.h + spacing * 4}>
          {dots.map((d, i) => {
            const r = dotRadius(p, d.th, spacing);
            return r < 0.2 ? null : <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={r.toFixed(2)} fill="#fff" />;
          })}
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        {inner}
        {proof && (
          <g opacity={0.75 * (1 - Math.min(1, Math.max(0, (p - 0.55) / 0.45)))} transform={`translate(${off.dx.toFixed(2)} ${off.dy.toFixed(2)})`}>
            {proof}
          </g>
        )}
      </g>
    </>
  );
};
