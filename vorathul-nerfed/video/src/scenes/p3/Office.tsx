// The office wall (storyboard 1 §0.1, O layers) for S59 and S62. Plate 07 carries the office, both desks and the standing
// developer; its painting is the old cathedral, so the canvas is covered by a live window onto the throne room (the
// painting world as it is at that moment) and the developer is drawn again on top, cut out of the same plate
// (dev-cut.png, 260 x 290 px at plate px 430, 370: the part of him that overlaps the canvas).
// The plate is a flat image placed by the office camera's projection (a single Stage per shot belongs to the painting).
import { Img, staticFile } from 'remotion';
import type { CameraPose } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import devCut from './dev-cut.png';
import { PLATE } from './Backdrop.tsx';
import { project, type Screen } from './lib.ts';
import { PaintingWindow } from './PaintingView.tsx';

const PW = 16 / 0.555;
const PH = (PW * 1024) / 1536;
const CX = -(0.4975 - 0.5) * PW;
const CY = -(0.5 - 0.34) * PH;
const Z = -20.05;

/** World point of a plate-07 pixel fraction (u from the left, v from the top). */
export const plateAt = (u: number, v: number): Vec3 => [CX + (u - 0.5) * PW, CY + (0.5 - v) * PH, Z];
export const plateRect = (pose: CameraPose, u0: number, v0: number, u1: number, v1: number): { a: Screen; b: Screen } => ({
  a: project(pose, plateAt(u0, v0)),
  b: project(pose, plateAt(u1, v1)),
});

/** The painting's canvas inside its black frame, plate fractions (measured on the plate: px 339-1193 x 57-638). */
const CANVAS: [number, number, number, number] = [339 / 1536, 57 / 1024, 1193 / 1536, 638 / 1024];
/** Where the cut-out developer sits on the plate, plate px. */
const DEV = { x0: 430, y0: 370, x1: 690, y1: 660 };
/** Pixels the window reaches into the black frame so no old painting shows at the edge. */
const BLEED = 2;

const Placed = ({ pose, box, children }: { pose: CameraPose; box: [number, number, number, number]; children: (r: { x: number; y: number; w: number; h: number }) => React.ReactNode }) => {
  const { a, b } = plateRect(pose, ...box);
  return <>{children({ x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y })}</>;
};

/** Plate, painting window and the developer in front of it, for the office camera `pose`. */
export const OfficeWall = ({ frame, pose, pose62 = false }: { frame: number; pose: CameraPose; pose62?: boolean }) => (
  <>
    <Placed pose={pose} box={[0, 0, 1, 1]}>
      {(r) => <Img src={staticFile(PLATE.office)} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }} />}
    </Placed>
    <Placed pose={pose} box={CANVAS}>
      {(r) => <PaintingWindow frame={frame} x={r.x - BLEED} y={r.y - BLEED} w={r.w + 2 * BLEED} h={r.h + 2 * BLEED} mood={pose62 ? 'slump' : 'conduct'} />}
    </Placed>
    <Placed pose={pose} box={[DEV.x0 / 1536, DEV.y0 / 1024, DEV.x1 / 1536, DEV.y1 / 1024]}>
      {(r) => <Img src={devCut} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }} />}
    </Placed>
  </>
);

/** Monitor screens of plate 07 (left and right desks), plate fractions. */
export const MONITORS: [number, number, number, number][] = [
  [0.036, 0.567, 0.224, 0.698],
  [0.806, 0.567, 0.995, 0.698],
];
/** Where the three developers' hands are (left seated, standing, right seated). */
export const HANDS: [number, number][] = [
  [0.165, 0.74],
  [0.31, 0.71],
  [0.88, 0.745],
];
