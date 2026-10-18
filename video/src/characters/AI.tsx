import { palette } from '../style/palette.ts';
import { HalftonePattern } from '../style/screenprint.tsx';
import { Body, pathOf, segments, type BodyStyle } from './Body.tsx';
import { resolvePose, solve, type Dims, type Pose, type PoseName } from './geometry.ts';

export const AI_DIMS: Dims = { thigh: 200, shin: 200, torso: 235, upperArm: 135, foreArm: 125, headR: 44, neck: 12, foot: 36 };
const STYLE: BodyStyle = { fill: palette.cream, outline: palette.navy, outlineW: 3, torsoW: 86, armW: 28, legW: 40 };

export const aiSkeleton = (pose: PoseName | Pose) => solve(resolvePose(pose), AI_DIMS);

/** Cursor centre in stage coordinates (after flip and scale). */
export const aiCursorStage = (x: number, floorY: number, pose: PoseName | Pose, facing: 1 | -1, scale = 1) => {
  const s = aiSkeleton(pose);
  return { x: x + (s.head.x + 12) * scale * facing, y: floorY + s.head.y * scale };
};

interface Props {
  x: number;
  floorY: number;
  pose?: PoseName | Pose;
  /** Cursor visible (false = blink-off). */
  cursorOn?: boolean;
  facing?: 1 | -1;
  scale?: number;
  bob?: number;
}

export const AI = ({ x, floorY, pose = 'stand', cursorOn = true, facing = -1, scale = 1, bob = 0 }: Props) => {
  const p = resolvePose(pose);
  const s = solve(p, AI_DIMS);
  const { far } = segments(s, STYLE);
  return (
    <g transform={`translate(${x} ${floorY + bob}) scale(${scale * facing} ${scale})`}>
      <defs>
        <HalftonePattern id="ai-dots" spacing={8} radius={1.7} />
        <mask id="ai-body-mask" maskUnits="userSpaceOnUse" x={-400} y={-1000} width={800} height={1100}>
          {far.map((g, i) => (
            <path key={i} d={pathOf(g.pts)} stroke="#fff" strokeWidth={g.w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </mask>
      </defs>
      <Body s={s} d={AI_DIMS} st={STYLE}>
        <g mask="url(#ai-body-mask)">
          <rect x={-90} y={-800} width={70} height={800} fill="url(#ai-dots)" />
        </g>
      </Body>
      {cursorOn && <rect x={s.head.x + 12 - 2.5} y={s.head.y - 19} width={5} height={38} fill={palette.navy} />}
    </g>
  );
};
