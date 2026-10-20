import React from 'react';
import { C, easeOut, hashNoise, type Keyframe, pathAt, prog, smoothNoise } from './theme.tsx';

export interface CursorProps {
  frame: number;
  /** Tip position keyframes (parent px); eased between keys. */
  path: Keyframe[];
  /** Frames at which a click happens (press squash + blue pulse ring). */
  clicks?: number[];
  variant?: 'arrow' | 'grab';
  /** Frame range [from, to] during which the grab hand replaces the arrow (overrides `variant`). */
  grabRange?: [number, number];
  /** Cursor size multiplier (1 = 40 px tall arrow). */
  size?: number;
  /** Deterministic hand tremble: amplitude in px, plus a seed. */
  tremble?: { amp: number; seed: number };
  opacity?: number;
}

const Arrow: React.FC = () => (
  <path
    d="M0 0 L0 34 L8.5 26.5 L14.5 40 L21 37 L15 24 L26 24 Z"
    fill={C.white}
    stroke={C.black}
    strokeWidth={3}
    strokeLinejoin="round"
  />
);

/** Closed fist, anchored at the grab point (centre of the palm). */
const Grab: React.FC = () => (
  <g transform="translate(-16 -14)" fill={C.white} stroke={C.black} strokeWidth={3} strokeLinejoin="round">
    <rect x="2" y="12" width="28" height="22" rx="8" />
    <rect x="2" y="6" width="7" height="12" rx="3.5" />
    <rect x="9.5" y="3" width="7" height="14" rx="3.5" />
    <rect x="17" y="3" width="7" height="14" rx="3.5" />
    <rect x="24" y="6" width="7" height="12" rx="3.5" />
  </g>
);

export const Cursor: React.FC<CursorProps> = ({
  frame,
  path,
  clicks = [],
  variant = 'arrow',
  grabRange,
  size = 1,
  tremble,
  opacity = 1,
}) => {
  const p = pathAt(frame, path);
  const jx = tremble ? smoothNoise(frame, tremble.seed, 2) * tremble.amp + hashNoise(frame, tremble.seed + 7) * tremble.amp * 0.25 : 0;
  const jy = tremble ? smoothNoise(frame, tremble.seed + 31, 2) * tremble.amp + hashNoise(frame, tremble.seed + 11) * tremble.amp * 0.25 : 0;
  const grabbing = grabRange ? frame >= grabRange[0] && frame <= grabRange[1] : variant === 'grab';
  const press = clicks.some((c) => frame >= c && frame < c + 3);
  const pulse = clicks.map((c) => ({ c, t: prog(frame, c, 10) })).find((k) => k.t > 0 && k.t < 1);
  const S = 80;
  return (
    <svg
      width={S * size * 2}
      height={S * size * 2}
      viewBox={`${-S} ${-S} ${S * 2} ${S * 2}`}
      style={{ position: 'absolute', left: p.x + jx - S * size, top: p.y + jy - S * size, overflow: 'visible', opacity, pointerEvents: 'none' }}
    >
      {pulse ? (
        <circle r={(8 + easeOut(pulse.t) * 40) * size} fill="none" stroke={C.blue} strokeWidth={4 * (1 - pulse.t) + 1} opacity={1 - pulse.t} />
      ) : null}
      <g transform={`scale(${size * (press ? 0.88 : 1)})`}>{grabbing ? <Grab /> : <Arrow />}</g>
    </svg>
  );
};
