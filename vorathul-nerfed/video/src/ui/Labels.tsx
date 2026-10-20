import React from 'react';
import { type BoxProps, C, easeOut, LINE, lerp, MONO_FONT, prog, Scaled, UI_FONT } from './theme.tsx';

export interface NameplateProps extends BoxProps {
  frame: number;
  text: string;
  /** Frame at which the first character is typed. */
  appearAt: number;
  framesPerChar?: number;
}

/** Office-UI nameplate pill whose text types in ("LV 12"). */
export const Nameplate: React.FC<NameplateProps> = ({ frame, text, appearAt, framesPerChar = 2, ...box }) => {
  if (frame < appearAt) return null;
  const typed = Math.min(text.length, Math.floor((frame - appearAt) / framesPerChar) + 1);
  const W = 100 + text.length * 30;
  return (
    <Scaled {...box} designW={W} designH={84}>
      <div
        style={{
          width: W,
          height: 84,
          boxSizing: 'border-box',
          borderRadius: 42,
          background: C.white,
          border: `${LINE + 1}px solid ${C.blue}`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 28px',
        }}
      >
        <div style={{ width: 20, height: 20, borderRadius: 10, background: C.blue, flex: 'none' }} />
        <span style={{ fontSize: 44, fontWeight: 800, color: C.ink, whiteSpace: 'pre' }}>{text.slice(0, typed)}</span>
      </div>
    </Scaled>
  );
};

export interface DamageNumberProps {
  frame: number;
  text: string;
  /** Frame at which the number pops. */
  at: number;
  /** Position in the parent (px); the text rises from here. */
  x: number;
  y: number;
  /** Font size in px. */
  size?: number;
  color?: string;
  rise?: number;
  lifeFrames?: number;
}

/** Floating "-1" / "MISS": pops, rises, fades. */
export const DamageNumber: React.FC<DamageNumberProps> = ({ frame, text, at, x, y, size = 72, color = C.blue, rise = 90, lifeFrames = 28 }) => {
  const t = prog(frame, at, lifeFrames);
  if (frame < at || t >= 1) return null;
  const pop = frame - at < 4 ? lerp(1.5, 1, easeOut((frame - at) / 4)) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y - easeOut(t) * rise,
        transform: `translate(-50%, -50%) scale(${pop})`,
        opacity: t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3,
        fontFamily: UI_FONT,
        fontSize: size,
        fontWeight: 900,
        color,
        WebkitTextStroke: `${Math.max(4, size / 8)}px ${C.white}`,
        paintOrder: 'stroke fill',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

export interface TicketPillProps extends BoxProps {
  frame: number;
  /** e.g. "#47" */
  text: string;
  appearAt: number;
}

export const TicketPill: React.FC<TicketPillProps> = ({ frame, text, appearAt, ...box }) => {
  const a = easeOut(prog(frame, appearAt, 6));
  if (a <= 0) return null;
  const W = 70 + text.length * 34;
  return (
    <Scaled {...box} designW={W} designH={72} opacity={(box.opacity ?? 1) * a} transform={`scale(${lerp(0.7, 1, a)})`}>
      <div
        style={{
          width: W,
          height: 72,
          boxSizing: 'border-box',
          borderRadius: 14,
          background: C.white,
          border: `${LINE + 1}px solid ${C.dark}`,
          borderLeft: `18px solid ${C.blue}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: MONO_FONT,
          fontWeight: 500,
          fontSize: 40,
          color: C.ink,
        }}
      >
        {text}
      </div>
    </Scaled>
  );
};
