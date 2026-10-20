// Shared frame furniture for p5 shots.
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import type { CameraPose } from '../../../camera/api.ts';
import type { Vec3 } from '../../../stage/Card.tsx';
import { UiFonts } from '../../../ui/kit.ts';
import { PrintTexture } from '../../../vfx/effects.ts';
import { O } from './Office.tsx';

/** Background, UI fonts and the paper grain (subtle: the room is being painted). */
export const Shot = ({ children, bg = O.bg, grain = 0.45, style }: { children: ReactNode; bg?: string; grain?: number; style?: CSSProperties }) => (
  <AbsoluteFill style={{ background: bg, overflow: 'hidden', ...style }}>
    <UiFonts />
    {children}
    {grain > 0 ? <PrintTexture strength={grain} /> : null}
  </AbsoluteFill>
);

/**
 * Draws its children (built for depth `from`) at depth `to` with the same projection: a scaling about the
 * camera. Used to push one part of a figure through a plane (the helm through the canvas) while the rest
 * stays behind it, with no visible seam.
 */
export const InFront = ({ pose, from, to, children }: { pose: CameraPose; from: number; to: number; children: ReactNode }) => {
  const c = pose.position;
  const k = (to - c[2]) / (from - c[2]);
  const at: Vec3 = [c[0] * (1 - k), c[1] * (1 - k), c[2] * (1 - k)];
  return (
    <group position={at} scale={k}>
      {children}
    </group>
  );
};

/** Absolutely positioned DOM box centred on a frame point. */
export const At = ({ x, y, children, style }: { x: number; y: number; children: ReactNode; style?: CSSProperties }) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', ...style }}>{children}</div>
);
