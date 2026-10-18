import { palette } from '../style/palette.ts';
import { YellowPlate } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { Body, type BodyStyle } from './Body.tsx';
import { resolvePose, solve, type Dims, type Pose, type PoseName } from './geometry.ts';

export const HUMAN_DIMS: Dims = { thigh: 190, shin: 190, torso: 225, upperArm: 130, foreArm: 120, headR: 44, neck: 14, foot: 40 };
const STYLE: BodyStyle = { fill: palette.navy, outline: palette.cream, outlineW: 2.5, torsoW: 112, armW: 34, legW: 50 };

export const humanSkeleton = (pose: PoseName | Pose) => solve(resolvePose(pose), HUMAN_DIMS);

interface Props {
  x: number;
  floorY: number;
  pose?: PoseName | Pose;
  /** Number of yellow sticky notes on shoulders and back. */
  notes?: number;
  facing?: 1 | -1;
  scale?: number;
  /** Vertical bob in px (the caller steps it on twos). */
  bob?: number;
}

export const Human = ({ x, floorY, pose = 'stand', notes = 10, facing = 1, scale = 1, bob = 0 }: Props) => {
  const p = resolvePose(pose);
  const s = solve(p, HUMAN_DIMS);
  const r = seeded('human-notes');
  const stickies = Array.from({ length: notes }, (_, i) => {
    const shoulderNote = i < Math.min(3, notes);
    const t = (i - 3) / Math.max(1, notes - 4);
    const along = HUMAN_DIMS.torso * (shoulderNote ? 1 - i * 0.05 : 0.9 - t * 0.78);
    const back = STYLE.torsoW / 2 - (shoulderNote ? 14 : 8);
    return {
      cx: s.pelvis.x + s.up.x * along - s.fwd.x * back,
      cy: s.pelvis.y + s.up.y * along - s.fwd.y * back,
      rot: range(r, -24, 24) + p.lean,
      size: range(r, 30, 38),
    };
  });
  return (
    <g transform={`translate(${x} ${floorY + bob}) scale(${scale * facing} ${scale})`}>
      <Body s={s} d={HUMAN_DIMS} st={STYLE}>
        <YellowPlate k="human-notes">
          {stickies.map((n, i) => (
            <g key={i} transform={`translate(${n.cx.toFixed(1)} ${n.cy.toFixed(1)}) rotate(${n.rot.toFixed(1)})`}>
              <rect x={-n.size / 2} y={-n.size / 2} width={n.size} height={n.size} fill={palette.moonYellow} />
              <rect x={-n.size / 2 + 5} y={-n.size / 2 + 9} width={n.size - 12} height={2} fill={palette.navy} />
              <rect x={-n.size / 2 + 5} y={-n.size / 2 + 16} width={n.size - 18} height={2} fill={palette.navy} />
            </g>
          ))}
        </YellowPlate>
      </Body>
    </g>
  );
};
