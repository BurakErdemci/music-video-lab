import React from 'react';
import { ANTON_FONT, type BoxProps, C, easeOut, lerp, prog, Scaled } from './theme.tsx';

export interface BossNameplateProps extends Omit<BoxProps, 'width'> {
  frame: number;
  text?: string;
  /** Frame at which the band slams across the frame. */
  slamAt: number;
  /** Frame at which the band leaves again (omit to stay). */
  outAt?: number;
  /** Band width in px (design is 1920 x 250). */
  width?: number;
}

/** Screen-space boss intro band: black with gold Anton lettering. */
export const BossNameplate: React.FC<BossNameplateProps> = ({ frame, text = 'VORATHUL · THE FINAL BOSS', slamAt, outAt, width = 1920, ...box }) => {
  if (frame < slamAt) return null;
  const inK = easeOut(prog(frame, slamAt, 5));
  const outK = outAt === undefined ? 0 : easeOut(prog(frame, outAt, 5));
  if (outK >= 1) return null;
  const shiftX = lerp(-width, 0, inK) + lerp(0, width, outK);
  return (
    <Scaled {...box} width={width} designW={1920} designH={250} transform={`translateX(${shiftX}px)`}>
      <div style={{ width: 1920, height: 250, background: C.black, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: `8px solid ${C.gold}`, borderBottom: `8px solid ${C.gold}`, boxSizing: 'border-box' }}>
        <span style={{ fontFamily: ANTON_FONT, fontSize: 150, letterSpacing: 8, color: C.gold, whiteSpace: 'nowrap' }}>{text}</span>
      </div>
    </Scaled>
  );
};
