// The wrapper every part-3 shot draws inside: grade (DuotoneFlash cues), print misregistration, paper grain.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { DuotoneFlash, INK, Misregister, PrintTexture, type DuotoneCue } from '../../vfx/effects.ts';

const NONE: DuotoneCue[] = [];

export const ShotFrame = ({ frame, cues = NONE, bg = INK, children, post }: { frame: number; cues?: readonly DuotoneCue[]; bg?: string; children: ReactNode; post?: ReactNode }) => (
  <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
    <DuotoneFlash frame={frame} cues={cues} id="p3-grade">
      <Misregister id="p3-misreg">
        <AbsoluteFill style={{ background: bg }}>{children}</AbsoluteFill>
      </Misregister>
    </DuotoneFlash>
    {post}
    <PrintTexture />
  </AbsoluteFill>
);

/** Letterbox bars (2.39:1 = 138 px each) with an extra close amount 0..1 (1 leaves `slot` px open at `slotY`). */
export const Letterbox = ({ open = 1, close = 0, slotY = 540, slot = 150 }: { open?: number; close?: number; slotY?: number; slot?: number }) => {
  const bar = 138 * open;
  const top = bar + close * Math.max(0, slotY - slot / 2 - bar);
  const bottom = bar + close * Math.max(0, 1080 - (slotY + slot / 2) - bar);
  if (top <= 0 && bottom <= 0) return null;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: top, background: INK }} />
      <div style={{ position: 'absolute', left: 0, bottom: 0, width: 1920, height: bottom, background: INK }} />
    </>
  );
};
