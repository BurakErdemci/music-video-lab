// Renders a subtree at a remapped frame (fast-forward, play backward, hold). Works because every
// track is a pure function of the frame. Uses Remotion's <Freeze>, so components that call
// useCurrentFrame() inside see the remapped frame; Freeze frames are relative to the enclosing
// Sequence, like useCurrentFrame. Audio/video tags inside would be frozen too: keep media outside.
import type { ReactNode } from 'react';
import { Freeze, useCurrentFrame } from 'remotion';
import { clamp01 } from './style.tsx';

/** Maps the outer frame to the frame the subtree should show. */
export type FrameMap = (frame: number) => number;

export interface TimeRemapProps {
  map: FrameMap;
  /** A node tree that reads useCurrentFrame(), or a function given the remapped frame. */
  children: ReactNode | ((frame: number) => ReactNode);
}

export const TimeRemap = ({ map, children }: TimeRemapProps) => {
  const frame = useCurrentFrame();
  const g = Math.round(map(frame));
  return typeof children === 'function' ? <>{children(g)}</> : <Freeze frame={g}>{children}</Freeze>;
};

/** From `start` on, the subtree runs `rate` times faster, beginning at source frame `from`. */
export const fastForward = (start: number, rate: number, from = start): FrameMap => (frame) => from + Math.max(0, frame - start) * rate;

/**
 * Over `over` frames starting at `start`, play source frames `from` back to `to` (from > to for
 * backward), ease-in so the rewind accelerates; holds `to` afterwards and `from` before.
 */
export const playBetween = (start: number, over: number, from: number, to: number, ease: (t: number) => number = (t) => t * t): FrameMap => (frame) =>
  from + (to - from) * ease(clamp01((frame - start) / over));
