import type { ReactNode } from 'react';
import { seeded } from './seeded.ts';
import { palette } from './palette.ts';
import { W, H } from '../layout.ts';

/** Slight offset (1-3 px per axis) of the yellow plate against the key plate, per key. */
export const plateOffset = (key: string): { dx: number; dy: number } => {
  const r = seeded(`plate:${key}`);
  const s = (): number => (r() < 0.5 ? -1 : 1);
  return { dx: s() * (1 + Math.floor(r() * 3)), dy: s() * (1 + Math.floor(r() * 3)) };
};

/** Everything yellow is printed through this wrapper so the plate is slightly off. */
export const YellowPlate = ({ k, children }: { k: string; children: ReactNode }) => {
  const { dx, dy } = plateOffset(k);
  return <g transform={`translate(${dx} ${dy})`}>{children}</g>;
};

/** Halftone dot pattern definition; reference with fill="url(#id)". */
export const HalftonePattern = ({
  id,
  spacing = 9,
  radius = 2.1,
  color = palette.navy,
}: {
  id: string;
  spacing?: number;
  radius?: number;
  color?: string;
}) => (
  <pattern id={id} width={spacing} height={spacing} patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
    <circle cx={spacing / 2} cy={spacing / 2} r={radius} fill={color} />
  </pattern>
);

const speckMatrix = (hex: string, gain: number, offset: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3));
  return `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${gain} 0 0 0 ${offset}`;
};

/**
 * Paper grain: seeded feTurbulence thresholded into cream specks (show on navy) and navy specks
 * (show on cream). The seed steps on twos so the grain boils at 12 fps; it depends on the frame.
 */
export const PaperGrain = ({ frame }: { frame: number }) => {
  const step = Math.floor(frame / 2);
  const seedA = 11 + (step % 5);
  const seedB = 41 + (step % 5);
  return (
    <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <filter id="speckCream" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed={seedA} result="n" />
          <feColorMatrix in="n" type="matrix" values={speckMatrix(palette.cream, 22, -15.6)} />
        </filter>
        <filter id="speckNavy" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed={seedB} result="n" />
          <feColorMatrix in="n" type="matrix" values={speckMatrix(palette.navy, 22, -15.7)} />
        </filter>
      </defs>
      <rect width={W} height={H} fill="#000" filter="url(#speckCream)" opacity={0.55} />
      <rect width={W} height={H} fill="#000" filter="url(#speckNavy)" opacity={0.5} />
    </svg>
  );
};
