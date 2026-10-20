import React, { useId } from 'react';
import { type BoxProps, C, easeInOut, easeOut, lerp, type OutlineRenderer, prog, Scaled } from './theme.tsx';

export interface ProgressSunProps extends BoxProps {
  frame: number;
  /** 'office' = thin-line UI progress bar; 'comic' = ivory/gold fill with thick black outline. */
  variant: 'office' | 'comic';
  /** Progress values are 0..100. */
  from: number;
  to: number;
  startFrame: number;
  durationFrames: number;
  /** Caption under the bar (office only). */
  label?: string;
  /** Top edge of the bar in design units (1000 x 470 box); the sun rises above it. Default: office 300, comic 230. */
  horizon?: number;
  /**
   * Comic only: plug-in outline painter (e.g. the shared dry-brush stroke). Called for the sun disc,
   * core, every ray and the bar. When omitted, a plain round-joined stroke is drawn.
   */
  renderOutline?: OutlineRenderer;
}

const W = 1000;
const H = 470;
const BAR_H = 64;
const R = 170;
const CX = W / 2;
const RAYS = 13;

const circleD = (cx: number, cy: number, r: number): string =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const rectD = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;

const defaultOutline: OutlineRenderer = ({ id, d, width, color }) => (
  <path key={id} d={d} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" />
);

export const ProgressSun: React.FC<ProgressSunProps> = ({
  frame,
  variant,
  from,
  to,
  startFrame,
  durationFrames,
  label = 'Installing update',
  horizon,
  renderOutline = defaultOutline,
  ...box
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const comic = variant === 'comic';
  const barY = horizon ?? (comic ? 230 : 300);
  const t = easeInOut(prog(frame, startFrame, durationFrames));
  const value = lerp(from, to, t);
  const p = value / 100;
  // Starts fully below the bar line and ends well above it.
  const sunCy = lerp(barY + R + 20, barY - R * 0.45, easeOut(p));
  const rayT = easeOut(prog(p, 0.25, 0.6));
  const stroke = comic ? 13 : 3;
  const barFillW = (value / 100) * (W - 2 * stroke);
  const pt = (r: number, a: number) => `${CX + Math.cos(a) * r} ${sunCy + Math.sin(a) * r}`;
  const rays = Array.from({ length: RAYS }, (_, i) => {
    const ang = Math.PI + (i / (RAYS - 1)) * Math.PI;
    const r0 = R + 26;
    const r1 = R + 26 + rayT * (i % 2 === 0 ? 95 : 60);
    if (!comic) {
      return (
        <line key={i} x1={CX + Math.cos(ang) * r0} y1={sunCy + Math.sin(ang) * r0} x2={CX + Math.cos(ang) * r1} y2={sunCy + Math.sin(ang) * r1} stroke={C.blue} strokeWidth={5} strokeLinecap="round" />
      );
    }
    const d = `M${pt(r0, ang - 0.075)} L${pt(r1, ang)} L${pt(r0, ang + 0.075)} Z`;
    return (
      <g key={i}>
        <path d={d} fill={C.gold} />
        {renderOutline({ id: `ray-${i}`, d, width: 9, color: C.black })}
      </g>
    );
  });
  const barD = rectD(stroke / 2, barY, W - stroke, BAR_H, comic ? 10 : BAR_H / 2);
  return (
    <Scaled {...box} designW={W} designH={H}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id={`sky-${uid}`}>
            <rect x={-200} y={-400} width={W + 400} height={barY + 400} />
          </clipPath>
        </defs>
        <g clipPath={`url(#sky-${uid})`}>
          {rays}
          <circle cx={CX} cy={sunCy} r={R} fill={comic ? C.gold : C.blue} stroke={comic ? undefined : C.blueDark} strokeWidth={comic ? 0 : 3} />
          {comic ? (
            <>
              {renderOutline({ id: 'disc', d: circleD(CX, sunCy, R), width: 14, color: C.black })}
              <circle cx={CX} cy={sunCy} r={R * 0.62} fill={C.ivory} />
              {renderOutline({ id: 'core', d: circleD(CX, sunCy, R * 0.62), width: 8, color: C.black })}
            </>
          ) : (
            <circle cx={CX} cy={sunCy} r={R * 0.62} fill="none" stroke={C.white} strokeWidth={3} opacity={0.7} />
          )}
        </g>
        <path d={barD} fill={comic ? C.ivory : C.white} stroke={comic ? undefined : C.dark} strokeWidth={comic ? 0 : stroke} />
        <rect x={stroke} y={barY + stroke} width={Math.max(0, barFillW)} height={BAR_H - 2 * stroke} rx={comic ? 4 : (BAR_H - 2 * stroke) / 2} fill={comic ? C.gold : C.blue} />
        {comic ? (
          <>
            {Array.from({ length: 14 }, (_, i) => {
              const x = stroke + 40 + i * 66;
              return x < stroke + barFillW - 10 ? (
                <line key={i} x1={x} y1={barY + BAR_H - stroke - 4} x2={x + 22} y2={barY + stroke + 6} stroke={C.black} strokeWidth={5} strokeLinecap="round" />
              ) : null;
            })}
            {renderOutline({ id: 'bar', d: barD, width: stroke, color: C.black })}
          </>
        ) : (
          <>
            <text x={0} y={barY + BAR_H + 52} fontFamily="'UiInter', sans-serif" fontSize={32} fontWeight={600} fill={C.slate}>
              {label}
            </text>
            <text x={W} y={barY + BAR_H + 52} textAnchor="end" fontFamily="'UiInter', sans-serif" fontSize={32} fontWeight={800} fill={C.ink}>
              {Math.round(value)}%
            </text>
          </>
        )}
      </svg>
    </Scaled>
  );
};
