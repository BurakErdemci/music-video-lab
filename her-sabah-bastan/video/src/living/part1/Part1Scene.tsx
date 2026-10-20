import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { palette } from '../../style/palette.ts';
import { PaperGrain } from '../../style/screenprint.tsx';
import { HalftoneBloom } from '../../transitions/HalftoneBloom.tsx';
import { InkBleed } from '../../transitions/InkBleed.tsx';
import { getImage, PainterLayer, useImagesReady, type Painter } from '../../transitions/layers.ts';
import { ZoomIntro } from '../../scenes/ZoomIntro.tsx';
import { FPS } from '../../timing.ts';
import { paintLayers } from '../compose2d.ts';
import { ThreeStage } from '../ThreeStage.tsx';
import { BLEED_FRAMES, BLOOM_FRAMES, F, IMAGE_URLS, setImageLookup, shotAt, type StageShot } from './shots.ts';
import { Part1Type } from './Part1Type.tsx';

setImageLookup(getImage);

const painter = (s: StageShot, frame: number): Painter => (ctx, w, h) => paintLayers(ctx, s.layers, s.cam, frame, w, h);

/**
 * Part1 (song 0:00-0:58). 0-467: the approved Droste intro as it was (SVG). From 468 the living illustration: normal
 * frames through ONE ThreeCanvas (ThreeStage); flat close-ups (pages, her face) as one 2D canvas; during the
 * HalftoneBloom and the InkBleed the transition's own WebGL canvas is the only one and both sides reach it as 2D
 * painters, so there are never two WebGL canvases at once.
 */
const Inner = () => {
  const f = useCurrentFrame();
  const shot = shotAt(f);
  if (shot.kind === 'intro') {
    return (
      <AbsoluteFill style={{ backgroundColor: palette.cream }}>
        <ZoomIntro frame={f} />
        <PaperGrain frame={f} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: palette.navy }}>
      {shot.kind === 'stage' && <ThreeStage layers={shot.layers} cam={shot.cam} frame={f} />}
      {shot.kind === 'flat' && <PainterLayer paint={shot.paint} width={1920} height={1080} />}
      {shot.kind === 'bloom' && (
        <HalftoneBloom progress={shot.p} seconds={BLOOM_FRAMES / FPS} time={(f - F.bloom0) / FPS} from={painter(shot.from, f)} to={painter(shot.to, f)} origin={shot.origin} />
      )}
      {shot.kind === 'bleed' && (
        <InkBleed progress={shot.p} seconds={BLEED_FRAMES / FPS} time={(f - F.bleed0) / FPS} from={shot.from.paint} to={painter(shot.to, f)} origin={shot.origin} seam={0.5} />
      )}
      <Part1Type frame={f} />
      <PaperGrain frame={f} />
    </AbsoluteFill>
  );
};

export const Part1Scene = () => {
  if (!useImagesReady(IMAGE_URLS)) return null;
  return (
    <>
      <Inner />
      <Audio src={staticFile('her-sabah-bastan.wav')} />
    </>
  );
};
