// Dev compositions: Parts = a walking human crossing the glass seam; Lineup = every pose, for scale checks.
import { AbsoluteFill } from 'remotion';
import { CrossingFigure, Figure } from '../characters/Figure.tsx';
import { ALL_POSES, POSES, poseWho } from '../characters/poses.ts';
import { FLOOR_Y, H, SEAM_X, W } from '../layout.ts';
import { lerp, onTwos } from '../math.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { WhiteRoom } from '../world/Rooms.tsx';

export const PartsScene = ({ frame }: { frame: number }) => {
  const f = onTwos(frame);
  const x = lerp(560, 1360, Math.min(1, f / 80));
  const bob = f % 4 === 0 ? 0 : -6;
  return (
    <AbsoluteFill style={{ background: palette.navy }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={W} height={H} fill={palette.navy} />
        <rect x={0} y={FLOOR_Y} width={SEAM_X} height={3} fill={palette.cream} />
        <WhiteRoom />
        <GlassSeam />
        <CrossingFigure uid="walk" pose="h08" x={x} y={FLOOR_Y + bob} />
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
  const row = (ids: typeof ALL_POSES, bg: 'navy' | 'cream') => {
    let x = 40;
    return ids.map((id) => {
      const m = POSES[id];
      const w = m.w * m.scale;
      const cx = x + w * m.anchorX;
      x += w + 24;
      return <Figure key={id} pose={id} x={cx} y={0} bg={bg} />;
    });
  };
  const base = H / 2 - 20;
  return (
    <AbsoluteFill style={{ background: palette.navy }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={W} height={H / 2} fill={palette.navy} />
        <rect y={H / 2} width={W} height={H / 2} fill={palette.cream} />
        <g transform={`translate(0 ${base}) scale(${K})`}>
          {row(humans, 'navy')}
          <line x1={0} x2={W / K} y1={-670} y2={-670} stroke="#f00" strokeWidth={2} />
        </g>
        <g transform={`translate(0 ${base + H / 2}) scale(${K})`}>
          {row(ais, 'cream')}
          <line x1={0} x2={W / K} y1={-670} y2={-670} stroke="#f00" strokeWidth={2} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
