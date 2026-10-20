// Builds the PaintView inputs for a film frame: one picture, many cameras.
import type { ReactNode } from 'react';
import { Hud } from './hud.tsx';
import type { PaintViewProps } from './PaintView.tsx';
import { captionsAt, hudAt, PaintScript2D } from './script.tsx';
import { sunFillAt, sunYAt } from './state.ts';
import { SHOT_FROM, T } from '../frames.ts';

/** The world, overlay and HUD at film frame `f` (the clock may be held, as in the freeze). */
export const paintAt = (f: number, extra?: { skyShake?: readonly [number, number]; skyViolet?: boolean; headUp?: boolean; under?: ReactNode; overlayTop?: ReactNode }): Omit<PaintViewProps, 'view' | 'place'> => ({
  world: {
    frame: f,
    sun: f >= T.sunEdge ? { y: sunYAt(f), fill: sunFillAt(f) } : null,
    pillars: f >= SHOT_FROM.S29,
    skyShake: extra?.skyShake,
    skyViolet: extra?.skyViolet,
    headUp: extra?.headUp,
  },
  overlay: (
    <>
      {extra?.under}
      <PaintScript2D frame={f} />
      {extra?.overlayTop}
    </>
  ),
  hud: (
    <>
      <Hud state={hudAt(f)} />
      {captionsAt(f)}
    </>
  ),
});
