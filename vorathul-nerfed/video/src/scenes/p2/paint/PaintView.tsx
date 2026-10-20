// The painting as a picture: one 1920 x 1080 WebGL canvas (the card stack) with 2D layers above it, either filling the
// frame (painting shots) or placed inside the office as the live canvas on the wall (office shots).
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { Stage } from '../../../stage/Stage.tsx';
import { World3D, type World3DProps } from './World3D.tsx';
import { poseOf, PX as PX_PER_UNIT, WIN_H, WIN_W, type View } from './space.ts';

/** Office camera over the painting plane: centre (tx, ty) in PS units and screen px per unit. */
export interface Placement {
  tx: number;
  ty: number;
  sP: number;
}

export interface PaintViewProps {
  world: World3DProps;
  /** Painting shots: the camera view. Ignored when `place` is set (the view is then the visible part of the painting). */
  view: View;
  place?: Placement;
  /** SVG children in window px (1920 x 1080 = the whole painting), mapped like the world. */
  overlay?: ReactNode;
  /** The painted HUD (health bar, captions): attached to the canvas in painting shots (`hudFixed`), else mapped like the world. */
  hud?: ReactNode;
  hudFixed?: boolean;
  /** 0-1: office grey drains the painting's colour from the edges inward (S31); 0 = untouched. */
  drain?: number;
}

/** The part of the painting an office camera sees, as the canvas view that covers it (null when none is visible). */
export const officeView = (p: Placement): { view: View; x0: number; x1: number; y0: number; y1: number } | null => {
  const x0 = Math.max(-WIN_W / 2, p.tx - 960 / p.sP);
  const x1 = Math.min(WIN_W / 2, p.tx + 960 / p.sP);
  const y0 = Math.max(-WIN_H / 2, p.ty - 540 / p.sP);
  const y1 = Math.min(WIN_H / 2, p.ty + 540 / p.sP);
  if (x1 <= x0 || y1 <= y0) return null;
  const h = Math.max(y1 - y0, ((x1 - x0) * 9) / 16);
  return { view: { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, h }, x0, x1, y0, y1 };
};

const mapTo = (v: View): string => {
  const k = 1080 / v.h;
  return `translate(${960 - (WIN_W / 2 + v.cx) * k}px, ${540 - (WIN_H / 2 - v.cy) * k}px) scale(${WIN_H / v.h})`;
};

const Layer2D = ({ v, children }: { v: View; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: mapTo(v) }}>{children}</div>
);

export const PaintView = ({ world, view, place, overlay, hud, hudFixed = false, drain = 0 }: PaintViewProps) => {
  const ov = place ? officeView(place) : null;
  if (place && !ov) return null;
  const v = ov ? ov.view : view;
  const k = 1080 / v.h;
  const content = (
    <>
      <Stage camera={() => poseOf(v)}>
        <World3D {...world} />
      </Stage>
      <Layer2D v={v}>{overlay}</Layer2D>
      {hud ? hudFixed && !place ? <AbsoluteFill>{hud}</AbsoluteFill> : <Layer2D v={v}>{hud}</Layer2D> : null}
      {drain > 0 ? (
        <div
          style={{
            position: 'absolute', inset: 0, background: '#ADB5BD', mixBlendMode: 'color',
            WebkitMaskImage: `radial-gradient(ellipse at center, transparent ${Math.round((1 - drain) * 90)}%, #000 ${Math.round((1 - drain) * 90 + 12)}%)`,
          }}
        />
      ) : null}
    </>
  );
  if (!place || !ov) return <AbsoluteFill>{content}</AbsoluteFill>;
  const a = (v.h * place.sP) / 1080;
  const clip = `inset(${540 - (WIN_H / 2 - v.cy) * k}px ${1920 - (960 + (WIN_W / 2 - v.cx) * k)}px ${1080 - (540 + (WIN_H / 2 + v.cy) * k)}px ${960 + (-WIN_W / 2 - v.cx) * k}px)`;
  return (
    <div
      style={{
        position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '50% 50%', clipPath: clip,
        transform: `translate(${(v.cx - place.tx) * place.sP}px, ${-(v.cy - place.ty) * place.sP}px) scale(${a})`,
      }}
    >
      {content}
    </div>
  );
};

/** Window px (the overlay space) to px of the 1920 x 1080 canvas for a view. */
export const winToCanvas = (v: View, X: number, Y: number): [number, number] => {
  const k = 1080 / v.h;
  return [960 + (X / PX_PER_UNIT - WIN_W / 2 - v.cx) * k, 540 - (WIN_H / 2 - Y / PX_PER_UNIT - v.cy) * k];
};
