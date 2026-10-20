import React from 'react';
import { type BoxProps, C, easeOut, LINE, lerp, prog, Scaled } from './theme.tsx';

export interface SkipButtonProps extends Omit<BoxProps, 'x' | 'y'> {
  frame: number;
  label?: string;
  /** Frame at which the pill slides in. */
  appearAt: number;
  /** Frame at which the hover state begins. */
  hoverAt?: number;
  /** Frame at which the press state begins, and how long it is held. */
  pressAt?: number;
  pressFrames?: number;
  /** Distance from the parent's bottom-right corner, in px. */
  margin?: number;
}

const W = 230;
const H = 76;

const Chevron: React.FC<{ x: number; color: string }> = ({ x, color }) => (
  <path d={`M${x} 26 L${x + 22} 38 L${x} 50 Z`} fill={color} />
);

export const SkipButton: React.FC<SkipButtonProps> = ({
  frame,
  label = 'SKIP',
  appearAt,
  hoverAt,
  pressAt,
  pressFrames = 4,
  margin = 56,
  width,
  opacity = 1,
}) => {
  const a = easeOut(prog(frame, appearAt, 8));
  if (a <= 0) return null;
  const hover = hoverAt !== undefined && frame >= hoverAt;
  const pressed = pressAt !== undefined && frame >= pressAt && frame < pressAt + pressFrames;
  const fill = pressed ? C.blue : hover ? C.white : C.ink;
  const text = pressed ? C.white : hover ? C.ink : C.white;
  const s = width / W;
  return (
    <div
      style={{
        position: 'absolute',
        right: margin,
        bottom: margin,
        width,
        height: H * s,
        opacity: opacity * a,
        transform: `translateX(${lerp(40, 0, a)}px) scale(${pressed ? 0.94 : 1})`,
        transformOrigin: 'right bottom',
      }}
    >
      <Scaled width={width} designW={W} designH={H}>
        <div
          style={{
            width: W,
            height: H,
            boxSizing: 'border-box',
            borderRadius: H / 2,
            background: fill,
            border: `${LINE + 1}px solid ${hover || pressed ? C.ink : C.white}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 2, color: text }}>{label}</span>
          <svg width={52} height={H} viewBox="0 0 52 76">
            <Chevron x={2} color={text} />
            <Chevron x={26} color={text} />
          </svg>
        </div>
      </Scaled>
    </div>
  );
};
