// Dev composition: shows the parts that Test30 does not use yet (palm pose, wave, flying note).
import { AbsoluteFill } from 'remotion';
import { AI, AI_DIMS } from '../characters/AI.tsx';
import { Human } from '../characters/Human.tsx';
import { solve } from '../characters/geometry.ts';
import { HUMAN_DIMS } from '../characters/Human.tsx';
import { AI_X, FLOOR_Y, H, MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { palette } from '../style/palette.ts';
import { WhiteWave } from '../transitions/WhiteWave.tsx';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { NoteFly } from '../world/Notes.tsx';
import { NavyRoom, WhiteRoom } from '../world/Rooms.tsx';
import { SplitMoon } from '../world/SplitMoon.tsx';
import { POSES } from '../characters/geometry.ts';

export const PartsScene = ({ frame }: { frame: number }) => {
  const reach = solve(POSES.palmOnGlass, HUMAN_DIMS).handN.x;
  const humanX = SEAM_X - 6 - reach;
  const aiHand = solve(POSES.palmOnGlass, AI_DIMS).handN.x;
  const aiX = SEAM_X + 6 + aiHand;
  return (
    <AbsoluteFill style={{ background: palette.navy }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <NavyRoom fill={0.85} />
        <WhiteRoom />
        <SplitMoon cx={SEAM_X} cy={MOON_SEAM_Y} r={MOON_R} phase={1} split />
        <GlassSeam />
        <Human x={humanX} floorY={FLOOR_Y} pose="palmOnGlass" notes={14} />
        <AI x={aiX} floorY={FLOOR_Y} pose="palmOnGlass" cursorOn />
        <NoteFly frame={frame} startFrame={0} duration={60} from={{ x: 600, y: 700 }} to={{ x: AI_X + 400, y: 300 }} seed="demo" />
        <WhiteWave frame={frame} startFrame={10} endFrame={80} />
      </svg>
      <PaperGrain frame={frame} />
    </AbsoluteFill>
  );
};
