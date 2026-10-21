// Every SVG layer of the film goes through <Svg>: it carries a frame-dependent attribute so React rewrites
// it on every frame (architecture.md: static SVG layers vanished in 11 of 48 frames of PRESS START).
import type { ReactNode } from 'react';
import { useLayer } from '../layer.ts';
import { useCurrentFrame } from 'remotion';
import { H, W } from '../camera/camera.ts';

export const Svg = ({ children, opacity = 1 }: { children: ReactNode; opacity?: number }) => {
  const frame = useCurrentFrame();
  if (useLayer() === 'world') return null;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} data-frame={frame} opacity={opacity} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {children}
    </svg>
  );
};

/** Neon glow without an SVG filter (filters near the WebGL canvas produced mosaic frames in the sibling):
 *  the same shape stroked wide and faint, then narrower, then the core. */
export const GLOW = [
  { w: 0.22, o: 0.14 },
  { w: 0.11, o: 0.3 },
  { w: 0.045, o: 0.75 },
] as const;
