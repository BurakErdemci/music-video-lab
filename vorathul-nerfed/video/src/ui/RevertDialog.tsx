import React from 'react';
import { Cursor } from './Cursor.tsx';
import { type BoxProps, C, easeOut, LINE, lerp, prog, Scaled } from './theme.tsx';

export interface RevertDialogProps extends BoxProps {
  frame: number;
  title?: string;
  body?: string;
  /** Relative frame at which the dialog pops in. */
  enterAt: number;
  /** Frame the cursor starts moving toward the Revert button. */
  approachAt: number;
  /** Frame the Revert button is pressed. */
  pressAt: number;
  /** Trembling hand: seeded, deterministic cursor jitter that grows as it nears the button. */
  tremble?: boolean;
  seed?: number;
  /** Fade the dialog out this many frames after the press (0 = stays). */
  closeAfter?: number;
}

const W = 900;
const H = 430;
const REVERT = { x: 470, y: 300, w: 380, h: 84 };
const CANCEL = { x: 50, y: 300, w: 380, h: 84 };

const Button: React.FC<{ r: typeof REVERT; label: string; primary: boolean; pressed: boolean; hover: boolean }> = ({
  r,
  label,
  primary,
  pressed,
  hover,
}) => (
  <div
    style={{
      position: 'absolute',
      left: r.x,
      top: r.y,
      width: r.w,
      height: r.h,
      boxSizing: 'border-box',
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 34,
      fontWeight: 700,
      background: primary ? (pressed ? C.blueDark : C.blue) : hover ? C.bg : C.white,
      color: primary ? C.white : C.ink,
      border: `${LINE}px solid ${primary ? C.blueDark : C.dark}`,
      transform: pressed ? 'scale(0.96)' : undefined,
    }}
  >
    {label}
  </div>
);

export const RevertDialog: React.FC<RevertDialogProps> = ({
  frame,
  title = 'Revert patch 2.5?',
  body = 'All changes from this patch will be undone.',
  enterAt,
  approachAt,
  pressAt,
  tremble = false,
  seed = 5,
  closeAfter = 0,
  ...box
}) => {
  const enter = easeOut(prog(frame, enterAt, 8));
  const close = closeAfter > 0 ? prog(frame, pressAt + 4, closeAfter) : 0;
  if (enter <= 0 || close >= 1) return null;
  const target = { x: REVERT.x + REVERT.w * 0.55, y: REVERT.y + REVERT.h * 0.55 };
  // Hesitate: drift over Cancel first, then commit to Revert.
  const mid = approachAt + Math.round((pressAt - approachAt) * 0.55);
  const path = [
    { f: approachAt, x: W + 70, y: H + 90 },
    { f: mid, x: CANCEL.x + CANCEL.w * 0.8, y: CANCEL.y + 10 },
    { f: pressAt - 8, x: target.x - 30, y: target.y - 18 },
    { f: pressAt, x: target.x, y: target.y },
  ];
  const near = prog(frame, approachAt, pressAt - approachAt);
  const pressed = frame >= pressAt && frame < pressAt + 5;
  const hoverRevert = frame >= pressAt - 6;
  return (
    <Scaled
      {...box}
      designW={W}
      designH={H}
      opacity={(box.opacity ?? 1) * enter * (1 - close)}
      transform={`scale(${lerp(0.94, 1, enter) * lerp(1, 0.97, close)})`}
    >
      <div style={{ position: 'relative', width: W, height: H }}>
        <div style={{ position: 'absolute', left: 10, top: 12, width: W - 10, height: H - 10, borderRadius: 22, background: C.mid }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: W - 10,
            height: H - 10,
            boxSizing: 'border-box',
            background: C.white,
            border: `${LINE}px solid ${C.dark}`,
            borderRadius: 22,
            overflow: 'hidden',
          }}
        >
          <div style={{ height: 64, background: C.bg, borderBottom: `${LINE}px solid ${C.dark}`, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: C.blue }} />
            <div style={{ fontSize: 24, fontWeight: 600, color: C.slate }}>Confirm</div>
          </div>
          <div style={{ padding: '30px 50px 0', fontSize: 46, fontWeight: 800, color: C.ink }}>{title}</div>
          <div style={{ padding: '12px 50px 0', fontSize: 28, fontWeight: 500, color: C.slate }}>{body}</div>
        </div>
        <Button r={CANCEL} label="Cancel" primary={false} pressed={false} hover={false} />
        <Button r={REVERT} label="Revert" primary pressed={pressed} hover={hoverRevert} />
        <Cursor
          frame={frame}
          path={path}
          clicks={[pressAt]}
          size={1.5}
          tremble={tremble ? { amp: 2 + near * 7, seed } : undefined}
          opacity={enter}
        />
      </div>
    </Scaled>
  );
};
