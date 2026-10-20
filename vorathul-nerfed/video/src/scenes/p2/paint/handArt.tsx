// The developer's hands as the final cut-outs (G31) with the code-drawn BigHand as the fallback. The origin of every variant is
// the working point: the pinch contact, the middle of the pad's face, the pen tip. The images point up and to the right with the
// sleeve at the lower left; `flip` mirrors them, `rotate` turns them about the origin (degrees).
import type { ReactNode } from 'react';
import { staticFile } from 'remotion';
import { finalSize } from './finals.tsx';

const SHEET = { pinch: { id: 'G31-1', ax: 0.95, ay: 0.27 }, pad: { id: 'G31-3', ax: 0.72, ay: 0.36 }, pen: { id: 'G31-4', ax: 0.95, ay: 0.93 } } as const;
export type HandVariant = keyof typeof SHEET;

export const HandPiece = ({ variant, height, flip = false, rotate = 0, sleeve = 0, fallback }: { variant: HandVariant; height: number; flip?: boolean; rotate?: number; sleeve?: number; fallback: ReactNode }) => {
  const s = SHEET[variant];
  const size = finalSize(s.id);
  if (!size) return <>{fallback}</>;
  const w = (height * size[0]) / size[1];
  return (
    <g transform={`rotate(${rotate}) scale(${flip ? -1 : 1} 1)`}>
      {sleeve > 0 ? <rect x={-s.ax * w - sleeve} y={-s.ay * height + 0.36 * height} width={sleeve + 0.1 * w} height={0.52 * height} fill="#CED4DA" stroke="#ADB5BD" strokeWidth={height * 0.012} /> : null}
      <image href={staticFile(`assets/${s.id}.png`)} x={-s.ax * w} y={-s.ay * height} width={w} height={height} />
    </g>
  );
};
