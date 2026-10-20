// 2D cut-out puppet test (blender/cutout/): the two characters are rendered by Blender from flat image planes on armatures with
// alpha (video/public/blender/cutout-v1/{human,ai}/NNNN.png, one PNG per film frame) and laid over the existing room
// plates, desk prop and glass seam; paper grain goes on top as in the film.
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { H, MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { DeskProp } from '../world/Desk.tsx';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { PlateRoom, WhiteRoom } from '../world/Rooms.tsx';
import { SplitMoon } from '../world/SplitMoon.tsx';

/** Frames rendered by blender/cutout/render.py (take.py). */
export const CUTOUT_TEST_FRAMES = 510;
const DIR = 'blender/cutout-v1';
const frameUrl = (who: 'human' | 'ai', frame: number): string => staticFile(`${DIR}/${who}/${String(frame + 1).padStart(4, '0')}.png`);

export const CutoutTestScene = ({ frame, bgOnly = false }: { frame: number; bgOnly?: boolean }) => (
  <AbsoluteFill style={{ background: palette.cream }}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <WhiteRoom />
      <PlateRoom key1={{ p: 1 }} moon={{ p: 1 }} notes={{ p: 1 }} />
      <SplitMoon cx={SEAM_X} cy={MOON_SEAM_Y} r={MOON_R} phase={0.8} split />
      <GlassSeam />
      <DeskProp />
    </svg>
    {!bgOnly && (
      <>
        <Img src={frameUrl('human', frame)} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />
        <Img src={frameUrl('ai', frame)} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />
      </>
    )}
    <PaperGrain frame={frame} />
  </AbsoluteFill>
);
