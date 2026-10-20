import React from 'react';
import { Cursor } from './Cursor.tsx';
import { type BoxProps, C, easeInOut, LINE, lerp, prog, Scaled } from './theme.tsx';

export interface HealthBarProps extends BoxProps {
  frame: number;
  /** Label slot (boss name etc.), shown above the bar. */
  label?: React.ReactNode;
  /** Values are 0..100. */
  from: number;
  to: number;
  startFrame: number;
  durationFrames: number;
  /** A grab cursor drags the end of the bar from `from` to `to`. */
  drag?: boolean;
  /** Magenta ghost segment showing the lost part. */
  ghost?: boolean;
  /** Show the numeric percentage at the right of the label row. */
  showValue?: boolean;
}

const W = 900;
const H = 150;
const BAR_X = 0;
const BAR_Y = 60;
const BAR_W = 900;
const BAR_H = 64;

export const HealthBar: React.FC<HealthBarProps> = ({
  frame,
  label,
  from,
  to,
  startFrame,
  durationFrames,
  drag = false,
  ghost = true,
  showValue = true,
  ...box
}) => {
  const t = easeInOut(prog(frame, startFrame, durationFrames));
  const value = lerp(from, to, t);
  const endX = BAR_X + (value / 100) * BAR_W;
  const fromX = BAR_X + (from / 100) * BAR_W;
  const endFrame = startFrame + durationFrames;
  const cy = BAR_Y + BAR_H / 2;
  const handleX = endX;
  const cursorPath = [
    { f: startFrame - 20, x: fromX + 170, y: cy + 120 },
    { f: startFrame, x: fromX, y: cy },
    { f: endFrame, x: BAR_X + (to / 100) * BAR_W, y: cy },
    { f: endFrame + 16, x: BAR_X + (to / 100) * BAR_W + 150, y: cy + 130 },
  ];
  return (
    <Scaled {...box} designW={W} designH={H}>
      <div style={{ position: 'relative', width: W, height: H }}>
        <div style={{ position: 'absolute', left: 0, top: 4, right: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.ink, letterSpacing: 1.5 }}>{label}</div>
          {showValue ? <div style={{ fontSize: 30, fontWeight: 700, color: C.slate }}>{Math.round(value)}%</div> : null}
        </div>
        <div
          style={{
            position: 'absolute',
            left: BAR_X,
            top: BAR_Y,
            width: BAR_W,
            height: BAR_H,
            borderRadius: BAR_H / 2,
            background: C.white,
            border: `${LINE + 1}px solid ${C.dark}`,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {ghost && value < from ? (
            <div style={{ position: 'absolute', left: endX, top: 0, width: fromX - endX, bottom: 0, background: C.magenta }} />
          ) : null}
          <div style={{ position: 'absolute', left: 0, top: 0, width: endX, bottom: 0, background: C.blue }} />
        </div>
        {drag ? (
          <>
            <div
              style={{
                position: 'absolute',
                left: handleX - 7,
                top: BAR_Y - 8,
                width: 14,
                height: BAR_H + 16,
                borderRadius: 7,
                background: C.white,
                border: `${LINE + 1}px solid ${C.ink}`,
                boxSizing: 'border-box',
              }}
            />
            <Cursor frame={frame} path={cursorPath} grabRange={[startFrame, endFrame]} clicks={[startFrame]} size={1.3} />
          </>
        ) : null}
      </div>
    </Scaled>
  );
};
