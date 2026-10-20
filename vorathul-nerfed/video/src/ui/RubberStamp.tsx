import React, { useId } from 'react';
import { type BoxProps, ANTON_FONT, C, easeIn, hashNoise, lerp, prog, Scaled } from './theme.tsx';

export interface RubberStampProps extends BoxProps {
  frame: number;
  text?: string;
  /** Relative frame of the slam. */
  at: number;
  /** Resting rotation in degrees. */
  rotate?: number;
  color?: string;
  /** Frame at which the stamp is ripped along a jagged line; the halves fall away. */
  tearAt?: number;
  seed?: number;
}

const W = 600;
const H = 240;
// Jagged tear line, top to bottom.
const ZIG: Array<[number, number]> = [[285, -20], [318, 48], [270, 96], [326, 150], [276, 200], [304, 260]];
const polyLeft = `-40,-40 ${ZIG.map((p) => p.join(',')).join(' ')} -40,260`;
const polyRight = `660,-40 ${ZIG.map((p) => p.join(',')).join(' ')} 660,260`;
const SPECKS = 150;

export const RubberStamp: React.FC<RubberStampProps> = ({ frame, text = 'NERFED', at, rotate = -8, color = C.blue, tearAt, seed = 3, ...box }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const t = frame - at;
  if (t < 0) return null;
  // Slam: 1.4 -> 1 in 3 frames, then a 1-frame 0.92 squash.
  const s = t < 3 ? lerp(1.4, 1, easeIn(t / 3)) : t < 4 ? 0.92 : 1;
  const tt = tearAt === undefined ? -1 : frame - tearAt;
  const torn = tt >= 0;
  const fade = torn ? 1 - prog(tt, 10, 14) : 1;
  if (fade <= 0) return null;
  const fall = (dir: number) => {
    const g = 1.3 * tt * tt;
    return `translate(${dir * (6 + tt * 5)} ${g}) rotate(${dir * tt * 1.6} ${W / 2 + dir * 140} ${H / 2})`;
  };
  // Ink texture: seeded speckles knocked out of the stamp.
  const specks = Array.from({ length: SPECKS }, (_, i) => ({
    x: (hashNoise(i, seed) * 0.5 + 0.5) * W,
    y: (hashNoise(i, seed + 101) * 0.5 + 0.5) * H,
    r: 2 + (hashNoise(i, seed + 202) * 0.5 + 0.5) * 7,
  }));
  const body = (
    <g mask={`url(#mask-${uid})`}>
      <rect x={8} y={8} width={W - 16} height={H - 16} rx={26} fill="none" stroke={color} strokeWidth={14} />
      <text x={W / 2} y={H / 2 + 62} textAnchor="middle" fontFamily={ANTON_FONT} fontSize={188} fill={color} letterSpacing={6}>
        {text}
      </text>
    </g>
  );
  return (
    <Scaled {...box} designW={W} designH={H} opacity={(box.opacity ?? 1) * fade} transform={`rotate(${rotate}deg) scale(${s})`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <mask id={`mask-${uid}`}>
            <rect x={-50} y={-50} width={W + 100} height={H + 100} fill="#fff" />
            {specks.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#000" />
            ))}
          </mask>
          <clipPath id={`l-${uid}`}><polygon points={polyLeft} /></clipPath>
          <clipPath id={`r-${uid}`}><polygon points={polyRight} /></clipPath>
        </defs>
        {torn ? (
          <>
            <g clipPath={`url(#l-${uid})`} transform={fall(-1)}>{body}</g>
            <g clipPath={`url(#r-${uid})`} transform={fall(1)}>{body}</g>
          </>
        ) : (
          body
        )}
      </svg>
    </Scaled>
  );
};
