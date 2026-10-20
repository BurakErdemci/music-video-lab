import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { palette } from '../../../style/palette.ts';
import { PaperGrain } from '../../../style/screenprint.tsx';
import { SqueegeePrint } from '../../../transitions/SqueegeePrint.tsx';
import { getImage, PainterLayer, useImagesReady } from '../../../transitions/layers.ts';
import { ThreeStage } from '../../ThreeStage.tsx';
import { setImageLookup, type Painter } from '../common.ts';
import { setP1ImageLookup } from '../splitSet.ts';
import { IMAGE_URLS as P4_IMAGES } from '../images.ts';
import { FinaleStage } from './FinaleStage.tsx';
import { flightData, impactFlash } from './flight.ts';
import { heartOverlay } from './heart.ts';
import { RECAP_IMAGES } from './recap.ts';
import { resetV3Shot, RESET_V3_IMAGES } from './resetV3.ts';
import { unionFlash, WORLD_IMAGES, worldCam, worldLayers } from './world.ts';
import { F_END, F_LAND, F_PRINT, F_START } from './timeline.ts';

setImageLookup(getImage);
setP1ImageLookup(getImage);

/** Same range and length as Part4b: song frames 6396-7222. */
export const PART4B_V3_FRAMES = F_END + 1 - F_START;
const P1_HANDOVER = 468;
const IMAGES: readonly string[] = [...new Set([...P4_IMAGES, ...WORLD_IMAGES, ...RECAP_IMAGES, ...RESET_V3_IMAGES])];

const Overlay = ({ paint }: { paint?: Painter }) => (paint ? <PainterLayer paint={paint} width={1920} height={1080} /> : null);

/**
 * The new finale (concept "two print plates come into register"). At most ONE WebGL canvas per frame: the flight's
 * Three canvas (FinaleStage), the world's ThreeStage, or the white SqueegeePrint (both sides as 2D painters).
 * Every function takes the song frame as a possibly fractional number (the 60 fps render passes half frames).
 */
const Inner = () => {
  const f = F_START + useCurrentFrame();
  let body;
  if (f < F_LAND) {
    body = (
      <>
        <FinaleStage data={flightData(f)} frame={f} />
        <Overlay paint={impactFlash(f)} />
      </>
    );
  } else if (f < F_PRINT) {
    body = (
      <>
        <ThreeStage layers={worldLayers(f)} cam={worldCam(f)} frame={f} />
        <Overlay paint={heartOverlay(f)} />
        <Overlay paint={unionFlash(f)} />
      </>
    );
  } else {
    // the approved halftone reset (commit 5bd960e) on his screen: "Merhaba." breaks into dots and drains, the cursor is
    // printed back, in moon-yellow
    const s = resetV3Shot(f, true);
    if (s.kind === 'gl') body = <SqueegeePrint progress={s.p} seconds={s.seconds} time={s.time} from={s.from} to={s.to} tiltDeg={s.tiltDeg} />;
    else if (s.kind === 'stage')
      body = (
        <>
          <ThreeStage layers={s.layers} cam={s.cam} frame={f} />
          <Overlay paint={s.overlay} />
        </>
      );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: palette.navy }}>
      {body}
      <PaperGrain frame={f >= F_END ? P1_HANDOVER : f} />
    </AbsoluteFill>
  );
};

export const Part4bV3Scene = () => {
  if (!useImagesReady(IMAGES)) return null;
  return (
    <>
      <Inner />
      <Audio src={staticFile('her-sabah-bastan.wav')} trimBefore={F_START} />
    </>
  );
};
