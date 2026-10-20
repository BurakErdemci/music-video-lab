import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { HalftoneBloom } from '../transitions/HalftoneBloom.tsx';
import { getImage, useImagesReady, type Painter } from '../transitions/layers.ts';
import { FPS } from '../timing.ts';
import { paintLayers } from './compose2d.ts';
import { ThreeStage } from './ThreeStage.tsx';
import { BLOOM_FRAMES, IMAGE_URLS, SONG_START, setImageLookup, shotAt, type StageShot } from './shots.ts';

setImageLookup(getImage);

const painter = (s: StageShot, frame: number): Painter => (ctx, w, h) => paintLayers(ctx, s.layers, s.cam, frame, w, h);

/**
 * The living-illustration test. Normal frames go through ONE ThreeCanvas (ThreeStage); during the HalftoneBloom the
 * bloom's own WebGL canvas is the only one on the page and both scenes reach it as 2D painters (compose2d, the same
 * projection), so there are never two WebGL canvases at once.
 */
const Inner = () => {
  const local = useCurrentFrame();
  const f = SONG_START + local;
  const shot = shotAt(f);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.navy }}>
      {shot.kind === 'stage' ? (
        <ThreeStage layers={shot.layers} cam={shot.cam} frame={f} />
      ) : (
        <HalftoneBloom progress={shot.p} seconds={BLOOM_FRAMES / FPS} time={local / FPS} from={painter(shot.from, f)} to={painter(shot.to, f)} origin={shot.origin} />
      )}
      <PaperGrain frame={local} />
    </AbsoluteFill>
  );
};

export const LivingScene = () => {
  if (!useImagesReady(IMAGE_URLS)) return null;
  return (
    <>
      <Inner />
      <Audio src={staticFile('her-sabah-bastan.wav')} trimBefore={SONG_START} />
    </>
  );
};
