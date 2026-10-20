import React from 'react';
import { type BoxProps, C, easeIn, LINE, lerp, prog, Scaled } from './theme.tsx';

export interface StickyNoteProps extends BoxProps {
  frame: number;
  text: string;
  /** Relative frame at which the note is slapped on. */
  slapAt: number;
  /** Resting rotation in degrees. */
  rotate?: number;
}

const W = 360;
const H = 330;

/** Scale for the slap: fly in big, hit, 2-frame squash, damped overshoot. Returns [sx, sy, opacity]. */
const slap = (t: number): [number, number, number] => {
  if (t < 0) return [1, 1, 0];
  if (t < 5) {
    const s = lerp(1.8, 1, easeIn(t / 5));
    return [s, s, Math.min(1, (t + 1) / 3)];
  }
  if (t < 7) return [1.14, 0.86, 1];
  const k = t - 7;
  const s = 1 + 0.06 * Math.exp(-k / 3) * Math.cos(k * 0.95);
  return [s, s, 1];
};

export const StickyNote: React.FC<StickyNoteProps> = ({ frame, text, slapAt, rotate = -3, ...box }) => {
  const t = frame - slapAt;
  const [sx, sy, op] = slap(t);
  const pinDrop = prog(frame, slapAt + 5, 3);
  if (op <= 0) return null;
  return (
    <Scaled {...box} designW={W} designH={H} opacity={(box.opacity ?? 1) * op} transform={`rotate(${rotate}deg) scale(${sx}, ${sy})`}>
      <div style={{ position: 'relative', width: W, height: H }}>
        <div style={{ position: 'absolute', left: 10, top: 12, width: W - 14, height: H - 14, borderRadius: 14, background: C.dark }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: W - 14,
            height: H - 14,
            boxSizing: 'border-box',
            borderRadius: 14,
            background: C.note,
            border: `${LINE}px solid ${C.dark}`,
            padding: '58px 28px 24px',
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.18,
            color: C.ink,
          }}
        >
          {text}
        </div>
        <div
          style={{
            position: 'absolute',
            left: (W - 14) / 2 - 17,
            top: 14 - (1 - pinDrop) * 16,
            width: 34,
            height: 34,
            borderRadius: 17,
            background: C.blue,
            border: `${LINE + 1}px solid ${C.blueDark}`,
            boxSizing: 'border-box',
            opacity: pinDrop,
          }}
        >
          <div style={{ position: 'absolute', left: 6, top: 5, width: 8, height: 8, borderRadius: 4, background: C.white, opacity: 0.8 }} />
        </div>
      </div>
    </Scaled>
  );
};
