import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { palette } from '../../style/palette.ts';
import { PaperGrain } from '../../style/screenprint.tsx';
import { PaperFold } from '../../transitions/PaperFold.tsx';
import { getImage, PainterLayer, useImagesReady } from '../../transitions/layers.ts';
import { ThreeStage } from '../ThreeStage.tsx';
import { CITY_LANDING, CITY_PANELS, SONG_START, setImageLookup, shotAt, stagePainter } from './shots.ts';
import { IMAGE_URLS } from './images.ts';
import { Part3Type } from './Part3Type.tsx';

setImageLookup(getImage);

/**
 * Part3 (song 1:51.3-2:35.88). Normal frames through ONE ThreeCanvas (ThreeStage); the hand-over dot as a 2D canvas;
 * the iris as a 2D painter over the stage; during the PaperFold its own WebGL canvas is the only one and both sides
 * reach it as 2D painters (compose2d), as in parts 1-2.
 */
const Inner = () => {
  const local = useCurrentFrame();
  const f = SONG_START + local;
  const shot = shotAt(f);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.navy }}>
      {shot.kind === 'stage' && <ThreeStage layers={shot.layers} cam={shot.cam} frame={f} />}
      {shot.kind === 'stage' && shot.overlay && <PainterLayer paint={shot.overlay} width={1920} height={1080} />}
      {shot.kind === 'flat' && <PainterLayer paint={shot.paint} width={1920} height={1080} />}
      {shot.kind === 'fold' && (
        <PaperFold progress={shot.p} from={stagePainter(shot.from, f)} to={stagePainter(shot.to, f)} landing={CITY_LANDING} panels={CITY_PANELS} cutout={shot.cutout} />
      )}
      <Part3Type frame={f} />
      <PaperGrain frame={f} />
    </AbsoluteFill>
  );
};

export const Part3Scene = () => {
  if (!useImagesReady(IMAGE_URLS)) return null;
  return (
    <>
      <Inner />
      <Audio src={staticFile('her-sabah-bastan.wav')} trimBefore={SONG_START} />
    </>
  );
};
