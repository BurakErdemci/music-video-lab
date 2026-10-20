import React from 'react';
import { type BoxProps, C, easeInOut, LINE, lerp, prog, Scaled } from './theme.tsx';

export interface VolumeSliderProps extends BoxProps {
  frame: number;
  /** Levels are 0..100. */
  from: number;
  to: number;
  startFrame: number;
  durationFrames: number;
  /** Frame at which the slider becomes muted (icon crossed out, fill greyed). */
  mutedAt?: number;
  /** Show the numeric level at the right. */
  showValue?: boolean;
}

const W = 760;
const H = 110;
const TRACK_X = 130;
const TRACK_W = 500;
const CY = 55;

const Speaker: React.FC<{ waves: number; muted: boolean }> = ({ waves, muted }) => (
  <g transform="translate(18 18)" fill="none" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
    <path d="M2 28 L16 28 L34 12 L34 68 L16 52 L2 52 Z" fill={C.white} transform="translate(0 -9)" />
    {muted ? (
      <path d="M46 24 L70 50 M70 24 L46 50" stroke={C.magenta} strokeWidth={6} transform="translate(0 -1)" />
    ) : (
      <>
        {waves >= 1 ? <path d="M46 30 Q54 40 46 50" transform="translate(0 -9)" /> : null}
        {waves >= 2 ? <path d="M56 22 Q70 40 56 58" transform="translate(0 -9)" /> : null}
        {waves >= 3 ? <path d="M66 14 Q86 40 66 66" transform="translate(0 -9)" /> : null}
      </>
    )}
  </g>
);

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  frame,
  from,
  to,
  startFrame,
  durationFrames,
  mutedAt,
  showValue = true,
  ...box
}) => {
  const level = lerp(from, to, easeInOut(prog(frame, startFrame, durationFrames)));
  const muted = mutedAt !== undefined && frame >= mutedAt;
  const x = TRACK_X + (level / 100) * TRACK_W;
  const waves = level <= 0.5 ? 0 : level < 34 ? 1 : level < 67 ? 2 : 3;
  return (
    <Scaled {...box} designW={W} designH={H}>
      <div
        style={{
          position: 'relative',
          width: W,
          height: H,
          boxSizing: 'border-box',
          borderRadius: 24,
          background: C.white,
          border: `${LINE}px solid ${C.dark}`,
        }}
      >
        <svg width={120} height={H} viewBox={`0 0 120 ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Speaker waves={waves} muted={muted} />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: TRACK_X,
            top: CY - 8,
            width: TRACK_W,
            height: 16,
            borderRadius: 8,
            background: C.mid,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: TRACK_X,
            top: CY - 8,
            width: x - TRACK_X,
            height: 16,
            borderRadius: 8,
            background: muted ? C.dark : C.blue,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: x - 17,
            top: CY - 17,
            width: 34,
            height: 34,
            borderRadius: 17,
            boxSizing: 'border-box',
            background: C.white,
            border: `${LINE + 1}px solid ${muted ? C.dark : C.blue}`,
          }}
        />
        {showValue ? (
          <div style={{ position: 'absolute', right: 26, top: 0, height: H, display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, color: muted ? C.slate : C.ink }}>
            {muted ? 'MUTE' : Math.round(level)}
          </div>
        ) : null}
      </div>
    </Scaled>
  );
};
