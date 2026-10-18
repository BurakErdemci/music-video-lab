import { Figure } from './Figure.tsx';
import type { PoseId } from './poses.ts';

export interface PoseKey {
  /** Event frame the pose takes over on. */
  f: number;
  pose: PoseId;
  x: number;
  flip?: boolean;
  /** Cross-dissolve length in frames (read from the event's enter.frames, never below 8). */
  blend?: number;
}

/** The key in force at `frame` (the last one whose frame has come). */
export const keyIndexAt = (keys: readonly PoseKey[], frame: number): number => {
  let cur = 0;
  keys.forEach((k, i) => {
    if (frame >= k.f) cur = i;
  });
  return cur;
};

/**
 * A figure whose pose, facing and standing place change over time. Every switch dissolves the old pose into the new
 * one over its own blend length; nothing cuts in one frame. Home colouring only (no inverted art).
 */
export const PoseTrack = ({ frame, keys, y, opacity = 1, blink = 0 }: { frame: number; keys: readonly PoseKey[]; y: number; opacity?: number; blink?: number }) => {
  const cur = keyIndexAt(keys, frame);
  const now = keys[cur] as PoseKey;
  const blend = now.blend ?? 10;
  const t = cur === 0 ? 1 : Math.min(1, (frame - now.f + 1) / blend);
  const draw = (k: PoseKey, o: number, id: string) => <Figure key={id} pose={k.pose} x={k.x} y={y} flip={k.flip} opacity={o * opacity} blink={blink} />;
  if (t >= 1) return draw(now, 1, 'n');
  const prev = keys[cur - 1] as PoseKey;
  return (
    <g>
      {draw(prev, 1 - t, 'p')}
      {draw(now, t, 'n')}
    </g>
  );
};
