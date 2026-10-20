// The office stage (storyboard 1 §0.1, O layers) for S59 and S62. Stand-in: approved frame 07 as G27, placed so its
// canvas lies on the 16-unit-wide painting card at z -20. Plate points convert to world and screen through `plateAt`.
import { AssetCard } from '../../cast/AssetCard.tsx';
import { AVAILABLE } from '../../cast/available.ts';
import type { CameraPose } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { PLATE } from './Backdrop.tsx';
import { project, type Screen } from './lib.ts';

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

/** The final G27 is the empty wall: then the black frame and the painting are drawn on it in code (16 x 9 at z -20). */
export const OfficeStage = () => (
  <>
    <AssetCard id="G27" standIn={{ src: PLATE.office }} width={PW} height={PH} position={[CX, CY, Z]} renderOrder={-100} />
    {AVAILABLE.has('G27') ? (
      <>
        <AssetCard id="painting-frame" standIn={{ color: '#0A0A0A' }} width={17} height={10} position={[0, 0, -20.02]} renderOrder={-99} />
        <AssetCard id="painting-live" standIn={{ src: PLATE.nerf }} width={16} height={9} position={[0, 0, -20]} renderOrder={-98} />
      </>
    ) : null}
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
