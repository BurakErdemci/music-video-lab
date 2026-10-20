// Dev compositions: Parts = a walking human crossing the glass seam; Lineup = every pose, for scale checks.
import { AbsoluteFill } from 'remotion';
import { Figure, PoseFigure } from '../characters/Figure.tsx';
import { ALL_POSES, POSES, poseWho } from '../characters/poses.ts';
import { FLOOR_Y, H, SEAM_X, W } from '../layout.ts';
import { clamp01, lerp, onTwos } from '../math.ts';
import { Halftone, Squeegee } from '../motion/entranceViews.tsx';
import { dotP, ENTER_FRAMES, wipeP } from '../motion/entrances.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { WhiteRoom } from '../world/Rooms.tsx';

/** Parts timeline (frames): the room and glass are pulled in, the human dissolves in, switches pose, walks, dissolves out. */
const P = { room: 0, seam: 6, figIn: 12, switchPose: 40, walk: 40, figOut: 104 };

export const PartsScene = ({ frame }: { frame: number }) => {
  const f = onTwos(frame);
  const x = lerp(560, 1360, clamp01((f - P.walk) / 60));
  const walking = f >= P.walk + 2;
  const bob = walking && f % 4 === 0 ? 0 : walking ? -6 : 0;
  const roomP = wipeP(frame, P.room, ENTER_FRAMES.squeegee);
  const seamP = wipeP(frame, P.seam, ENTER_FRAMES.squeegee);
  const inP = dotP(frame, P.figIn, ENTER_FRAMES.halftone);
  const figP = frame >= P.figOut ? 1 - dotP(frame, P.figOut, ENTER_FRAMES.halftone) : inP;
  const y = FLOOR_Y + bob;
  return (
    <AbsoluteFill style={{ background: palette.navy }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={W} height={H} fill={palette.navy} />
        <Squeegee id="sq-floor" p={roomP} from={0} to={SEAM_X} axis="x" soft={120}>
          <rect x={0} y={FLOOR_Y} width={SEAM_X} height={3} fill={palette.cream} />
        </Squeegee>
        <Squeegee id="sq-room" p={roomP} from={SEAM_X} to={W} axis="x" soft={120}>
          <WhiteRoom />
        </Squeegee>
        <Squeegee id="sq-seam" p={seamP} from={0} to={H} soft={140}>
          <GlassSeam />
        </Squeegee>
        <Halftone id="ht-walk" p={figP} box={{ x: x - 260, y: FLOOR_Y - 900, w: 520, h: 940 }} seed="walk" reg="walk">
          <PoseFigure
            uid="walk"
            frame={frame}
            keys={[
              [0, 'h01'],
              [P.switchPose, 'h08'],
            ]}
            x={x}
            y={y}
          />
        </Halftone>
      </svg>
      <PaperGrain frame={frame} />
    </AbsoluteFill>
  );
};

/** Every pose in one row per world at 55% size; the red line marks the 670 px standing body height. */
export const LineupScene = () => {
  const humans = ALL_POSES.filter((p) => poseWho(p) === 'human');
  const ais = ALL_POSES.filter((p) => poseWho(p) === 'ai');
  const K = 0.55;
  const row = (ids: typeof ALL_POSES) => {
    let x = 40;
    return ids.map((id) => {
      const m = POSES[id];
      const w = m.w * m.scale;
      const cx = x + w * m.anchorX;
      x += w + 24;
      return <Figure key={id} pose={id} x={cx} y={0} />;
    });
  };
  const base = H / 2 - 20;
  return (
    <AbsoluteFill style={{ background: palette.navy }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={W} height={H / 2} fill={palette.navy} />
        <rect y={H / 2} width={W} height={H / 2} fill={palette.cream} />
        <g transform={`translate(0 ${base}) scale(${K})`}>
          {row(humans)}
          <line x1={0} x2={W / K} y1={-670} y2={-670} stroke="#f00" strokeWidth={2} />
        </g>
        <g transform={`translate(0 ${base + H / 2}) scale(${K})`}>
          {row(ais)}
          <line x1={0} x2={W / K} y1={-670} y2={-670} stroke="#f00" strokeWidth={2} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
