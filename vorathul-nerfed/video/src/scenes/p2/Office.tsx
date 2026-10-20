// The office as stacked flat layers under a straight-on perspective camera, with the live painting on the wall.
// World units as in art/office.tsx (SVG y down, origin = painting centre); the camera is `cam`: distance D from the
// painting plane (z -20) and the point (tx, ty) it looks at (ty measured UP, like the painting's own units).
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { FrameArt, OFFICE, StickyNotesArt, WallArt } from './art/office.tsx';
import { Desk, DeskCorner, Plant } from './FinalOffice.tsx';
import { PaintView, type PaintViewProps } from './paint/PaintView.tsx';
import { sunFillAt } from './paint/state.ts';

export interface OfficeCam {
  D: number;
  tx: number;
  ty: number;
}

const TAN20 = Math.tan((20 * Math.PI) / 180);
export const WALL_Z = -20;
/** Depths of the layers (world z). The developer stands between the wall and the desks. */
export const Z = { wall: -20.05, paint: -20, dev: -16, desks: -12, plant: -19, corner: -8 } as const;

/** Screen px per world unit on the plane at depth z. */
export const scaleAt = (cam: OfficeCam, z: number): number => 1080 / (2 * (cam.D + WALL_Z - z) * TAN20);

/** A flat SVG layer at depth z; children use world units (y down). */
const Layer = ({ cam, z, children }: { cam: OfficeCam; z: number; children: ReactNode }) => {
  const s = scaleAt(cam, z);
  if (!Number.isFinite(s) || s <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translate(960px, 540px) scale(${s}) translate(${-cam.tx}px, ${cam.ty}px)` }}>
      <svg width={1} height={1} style={{ overflow: 'visible', display: 'block' }}>
        {children}
      </svg>
    </div>
  );
};

export interface OfficeProps {
  /** Time of the office itself (sticky notes, monitors); the painting and the developer carry their own clock. */
  frame: number;
  cam: OfficeCam;
  paint: Omit<PaintViewProps, 'place' | 'view'>;
  /** Progress of the five sticky notes on the frame (0-1 each). */
  notes: readonly number[];
  /** The developer (world units, origin at his feet), drawn on the plane at Z.dev. */
  dev?: ReactNode;
  /** Props of the developer that live in the painting's plane (pinned card etc.), drawn above the frame. */
  onFrame?: ReactNode;
  drain?: number;
  monitorFill?: number;
}

export const OfficeScene = ({ frame, cam, paint, notes, dev, onFrame, drain = 0, monitorFill }: OfficeProps) => {
  const fill = monitorFill ?? sunFillAt(frame);
  const screen = { title: 'Updater', fill: fill / 100, label: fill >= 100 ? 'UPDATE 2.3  100%' : `UPDATE 2.3  ${fill}%` };
  const fl = OFFICE.floorY;
  return (
    <AbsoluteFill style={{ background: '#E6E9ED', overflow: 'hidden' }}>
      <Layer cam={cam} z={Z.wall}>
        <WallArt />
      </Layer>
      <Layer cam={cam} z={Z.plant}>
        <g transform={`translate(11.5 ${fl})`}>
          <Plant />
        </g>
      </Layer>
      <PaintView {...paint} view={{ cx: 0, cy: 0, h: 9 }} place={{ tx: cam.tx, ty: cam.ty, sP: scaleAt(cam, Z.paint) }} drain={drain} />
      <Layer cam={cam} z={Z.paint}>
        <FrameArt />
        <StickyNotesArt progress={notes} />
        {onFrame}
      </Layer>
      <Layer cam={cam} z={Z.desks}>
        <g transform={`translate(-6 ${fl})`}>
          <Desk side="L" fill={fill} label={screen.label} />
        </g>
        <g transform={`translate(6 ${fl})`}>
          <Desk side="R" fill={0} label="" />
        </g>
      </Layer>
      {/* Drawn after the desks on purpose: he walks in across the room in front of the right desk, so he is never half hidden by it. */}
      {dev ? (
        <Layer cam={cam} z={Z.dev}>
          {dev}
        </Layer>
      ) : null}
      <Layer cam={cam} z={Z.corner}>
        <g transform={`translate(-6.4 ${fl})`}>
          <DeskCorner />
        </g>
      </Layer>
    </AbsoluteFill>
  );
};
