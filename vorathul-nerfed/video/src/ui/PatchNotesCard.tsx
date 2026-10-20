import React from 'react';
import { type BoxProps, C, easeOut, LINE, lerp, prog, Scaled } from './theme.tsx';

export interface PatchLine {
  text: string;
  /** Relative frame at which the bullet appears. */
  appearAt: number;
  /** Relative frame at which the strike-through starts drawing. */
  strikeAt?: number;
  strikeFrames?: number;
}

export interface PatchNotesCardProps extends BoxProps {
  frame: number;
  title?: string;
  lines: PatchLine[];
  footer?: string;
  /** Frame at which the window pops in. */
  enterAt?: number;
}

const W = 760;
const TITLE_H = 60;
const LINE_H = 62;
const FOOT_H = 70;

export const PatchNotesCard: React.FC<PatchNotesCardProps> = ({
  frame,
  title = 'Patch 2.3',
  lines,
  footer = 'Balance team',
  enterAt = 0,
  ...box
}) => {
  const H = TITLE_H + 28 + Math.max(lines.length, 1) * LINE_H + 14 + FOOT_H;
  const enter = easeOut(prog(frame, enterAt, 8));
  if (frame < enterAt) return null;
  return (
    <Scaled {...box} designW={W} designH={H} opacity={(box.opacity ?? 1) * enter} transform={`scale(${lerp(0.96, 1, enter)})`}>
      <div
        style={{
          width: W,
          height: H,
          boxSizing: 'border-box',
          background: C.white,
          border: `${LINE}px solid ${C.dark}`,
          borderRadius: 18,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: TITLE_H,
            background: C.bg,
            borderBottom: `${LINE}px solid ${C.dark}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 22px',
            gap: 10,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 7, border: `${LINE}px solid ${C.dark}`, background: i === 0 ? C.blue : C.white, boxSizing: 'border-box' }} />
          ))}
          <div style={{ marginLeft: 14, fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: 0.2 }}>{title}</div>
          <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 500, color: C.slate }}>Release notes</div>
        </div>
        <div style={{ padding: '14px 30px 0' }}>
          {lines.map((ln, i) => {
            const a = easeOut(prog(frame, ln.appearAt, 7));
            const s = ln.strikeAt === undefined ? 0 : easeOut(prog(frame, ln.strikeAt, ln.strikeFrames ?? 8));
            return (
              <div
                key={`${i}-${ln.text}`}
                style={{
                  height: LINE_H,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  opacity: a,
                  transform: `translateX(${(1 - a) * 18}px)`,
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: 6, background: s > 0.5 ? C.dark : C.blue, flex: 'none' }} />
                <span style={{ position: 'relative', fontSize: 30, fontWeight: 500, color: s > 0.5 ? C.slate : C.ink, whiteSpace: 'nowrap' }}>
                  {ln.text}
                  {s > 0 ? (
                    <span
                      style={{
                        position: 'absolute',
                        left: -6,
                        top: '54%',
                        height: 5,
                        borderRadius: 3,
                        width: `calc(${s * 100}% + 12px)`,
                        background: C.magenta,
                      }}
                    />
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: FOOT_H,
            borderTop: `${LINE}px solid ${C.mid}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 30px',
            gap: 14,
            background: C.bg,
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 15, background: C.blue, border: `${LINE}px solid ${C.blueDark}`, boxSizing: 'border-box' }} />
          <div style={{ fontSize: 22, fontWeight: 600, color: C.slate }}>{footer}</div>
        </div>
      </div>
    </Scaled>
  );
};
