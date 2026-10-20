import React, { useId } from 'react';
import { type BoxProps, C, easeInOut, easeOut, lerp, prog, Scaled } from './theme.tsx';

export interface ProgressSunProps extends BoxProps {
  frame: number;
  /** 'office' = thin-line UI progress bar; 'comic' = ivory/gold fill with thick black dry-brush outline. */
  variant: 'office' | 'comic';
  /** Progress values are 0..100. */
  from: number;
  to: number;
  startFrame: number;
  durationFrames: number;
  /** Caption under the bar (office only). */
  label?: string;
}

const W = 1000;
const H = 470;
const BAR_Y = 300;
const BAR_H = 64;
const R = 170;
const CX = W / 2;
const RAYS = 13;

export const ProgressSun: React.FC<ProgressSunProps> = ({
  frame,
  variant,
  from,
  to,
  startFrame,
  durationFrames,
  label = 'Installing update',
  ...box
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const comic = variant === 'comic';
  const t = easeInOut(prog(frame, startFrame, durationFrames));
  const value = lerp(from, to, t);
  const p = value / 100;
  const sunCy = lerp(BAR_Y + R + 20, BAR_Y - R * 0.35, easeOut(p));
  const rayT = easeOut(prog(p, 0.25, 0.6));
  const stroke = comic ? 13 : 3;
  const ink = comic ? C.black : C.dark;
  const barFillW = (value / 100) * (W - 2 * stroke);
  const rays = Array.from({ length: RAYS }, (_, i) => {
    const ang = Math.PI + (i / (RAYS - 1)) * Math.PI;
    const r0 = R + 26;
    const r1 = R + 26 + rayT * (i % 2 === 0 ? 95 : 60);
    const wd = comic ? 0.075 : 0.0;
    const pt = (r: number, a: number) => `${CX + Math.cos(a) * r},${sunCy + Math.sin(a) * r}`;
    return comic ? (
      <polygon key={i} points={`${pt(r0, ang - wd)} ${pt(r1, ang)} ${pt(r0, ang + wd)}`} fill={C.gold} stroke={C.black} strokeWidth={9} strokeLinejoin="round" />
    ) : (
      <line key={i} x1={CX + Math.cos(ang) * r0} y1={sunCy + Math.sin(ang) * r0} x2={CX + Math.cos(ang) * r1} y2={sunCy + Math.sin(ang) * r1} stroke={C.blue} strokeWidth={5} strokeLinecap="round" />
    );
  });
  return (
    <Scaled {...box} designW={W} designH={H}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id={`sky-${uid}`}>
            <rect x={-200} y={-200} width={W + 400} height={BAR_Y + 200} />
          </clipPath>
          <filter id={`dry-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g filter={comic ? `url(#dry-${uid})` : undefined}>
          <g clipPath={`url(#sky-${uid})`}>
            {rays}
            <circle cx={CX} cy={sunCy} r={R} fill={comic ? C.gold : C.blue} stroke={comic ? C.black : C.blueDark} strokeWidth={comic ? 14 : 3} />
            {comic ? <circle cx={CX} cy={sunCy} r={R * 0.62} fill={C.ivory} stroke={C.black} strokeWidth={8} /> : <circle cx={CX} cy={sunCy} r={R * 0.62} fill="none" stroke={C.white} strokeWidth={3} opacity={0.7} />}
          </g>
          <rect
            x={stroke / 2}
            y={BAR_Y}
            width={W - stroke}
            height={BAR_H}
            rx={comic ? 10 : BAR_H / 2}
            fill={comic ? C.ivory : C.white}
            stroke={ink}
            strokeWidth={stroke}
          />
          <rect x={stroke} y={BAR_Y + stroke} width={Math.max(0, barFillW)} height={BAR_H - 2 * stroke} rx={comic ? 4 : (BAR_H - 2 * stroke) / 2} fill={comic ? C.gold : C.blue} />
          {comic
            ? Array.from({ length: 14 }, (_, i) => {
                const x = stroke + 40 + i * 66;
                return x < stroke + barFillW - 10 ? <line key={i} x1={x} y1={BAR_Y + BAR_H - stroke - 4} x2={x + 22} y2={BAR_Y + stroke + 6} stroke={C.black} strokeWidth={5} strokeLinecap="round" /> : null;
              })
            : null}
        </g>
        {comic ? null : (
          <>
            <text x={0} y={BAR_Y + BAR_H + 52} fontFamily="'UiInter', sans-serif" fontSize={32} fontWeight={600} fill={C.slate}>
              {label}
            </text>
            <text x={W} y={BAR_Y + BAR_H + 52} textAnchor="end" fontFamily="'UiInter', sans-serif" fontSize={32} fontWeight={800} fill={C.ink}>
              {Math.round(value)}%
            </text>
          </>
        )}
      </svg>
    </Scaled>
  );
};
