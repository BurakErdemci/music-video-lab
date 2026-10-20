import React from 'react';
import { type BoxProps, C, easeIn, easeInOut, easeOut, LINE, lerp, prog, Scaled } from './theme.tsx';

export interface ToggleProps extends BoxProps {
  frame: number;
  label?: string;
  /** Frame at which the switch flips from on to off (or off to on with `startOn=false`). */
  flipAt: number;
  startOn?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ frame, label = 'Cursed storm', flipAt, startOn = true, ...box }) => {
  const k = easeInOut(prog(frame, flipAt, 4));
  const on = startOn ? 1 - k : k;
  return (
    <Scaled {...box} designW={620} designH={110}>
      <div style={{ width: 620, height: 110, boxSizing: 'border-box', borderRadius: 26, background: C.white, border: `${LINE}px solid ${C.dark}`, display: 'flex', alignItems: 'center', padding: '0 30px', gap: 28 }}>
        <div style={{ position: 'relative', width: 140, height: 70, borderRadius: 35, background: on > 0.5 ? C.blue : C.mid, flex: 'none' }}>
          <div style={{ position: 'absolute', top: 7, left: lerp(7, 77, on), width: 56, height: 56, borderRadius: 28, background: C.white, border: `${LINE}px solid ${on > 0.5 ? C.blueDark : C.dark}`, boxSizing: 'border-box' }} />
        </div>
        <div style={{ fontSize: 42, fontWeight: 700, color: C.ink }}>{label}</div>
      </div>
    </Scaled>
  );
};

export interface PadlockProps extends BoxProps {
  frame: number;
  appearAt: number;
  /** Frame at which the shackle slams shut. */
  clampAt: number;
}

export const Padlock: React.FC<PadlockProps> = ({ frame, appearAt, clampAt, ...box }) => {
  const a = easeOut(prog(frame, appearAt, 5));
  if (a <= 0) return null;
  const drop = easeIn(prog(frame, clampAt - 4, 4));
  const bump = frame >= clampAt && frame < clampAt + 2 ? 0.94 : 1;
  return (
    <Scaled {...box} designW={140} designH={180} opacity={(box.opacity ?? 1) * a} transform={`scale(${bump})`}>
      <svg width={140} height={180} viewBox="0 0 140 180">
        <path d="M34 82 V52 A36 36 0 0 1 106 52 V82" fill="none" stroke={C.ink} strokeWidth={16} strokeLinecap="round" transform={`translate(0 ${-26 * (1 - drop)})`} />
        <rect x={10} y={80} width={120} height={92} rx={18} fill={C.blue} stroke={C.blueDark} strokeWidth={LINE + 2} />
        <circle cx={70} cy={120} r={11} fill={C.white} />
        <rect x={64} y={124} width={12} height={28} rx={5} fill={C.white} />
      </svg>
    </Scaled>
  );
};

export interface Rect { x: number; y: number; w: number; h: number }

export interface MarqueeProps {
  frame: number;
  /** Selection rectangle (parent px) at startFrame and at startFrame + durationFrames. */
  from: Rect;
  to: Rect;
  startFrame: number;
  durationFrames: number;
  /** Line width in px. */
  stroke?: number;
  /** Marching speed in px per frame (kept slow: no flicker). */
  speed?: number;
}

/** Drag-select marquee with marching ants, drawn in parent pixels. */
export const Marquee: React.FC<MarqueeProps> = ({ frame, from, to, startFrame, durationFrames, stroke = 4, speed = 0.6 }) => {
  if (frame < startFrame) return null;
  const t = easeInOut(prog(frame, startFrame, durationFrames));
  const r = { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), w: Math.max(2, lerp(from.w, to.w, t)), h: Math.max(2, lerp(from.h, to.h, t)) };
  const off = -(frame - startFrame) * speed;
  return (
    <svg style={{ position: 'absolute', left: r.x - stroke, top: r.y - stroke, overflow: 'visible', pointerEvents: 'none' }} width={r.w + 2 * stroke} height={r.h + 2 * stroke}>
      <rect x={stroke} y={stroke} width={r.w} height={r.h} fill={C.blue} fillOpacity={0.1} stroke={C.white} strokeWidth={stroke} />
      <rect x={stroke} y={stroke} width={r.w} height={r.h} fill="none" stroke={C.blue} strokeWidth={stroke} strokeDasharray={`${stroke * 3} ${stroke * 2}`} strokeDashoffset={off} />
    </svg>
  );
};
