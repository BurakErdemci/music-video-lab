import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { palette } from '../../style/palette.ts';
import { PaperGrain } from '../../style/screenprint.tsx';
import { InkBleed } from '../../transitions/InkBleed.tsx';
import { PlateShift } from '../../transitions/PlateShift.tsx';
import { SqueegeePrint } from '../../transitions/SqueegeePrint.tsx';
import { getImage, PainterLayer, useImagesReady } from '../../transitions/layers.ts';
import { ThreeStage } from '../ThreeStage.tsx';
import { setImageLookup, SONG_END, SPLIT_AT, type GlShot } from './common.ts';
import { setP1ImageLookup } from './splitSet.ts';
import { shotAt } from './shots.ts';
import { IMAGE_URLS } from './images.ts';
import { ShatterStage } from './ShatterStage.tsx';
import { Part4Type } from './Part4Type.tsx';

setImageLookup(getImage);
setP1ImageLookup(getImage);

/** The loop: the very last frame is Part 1's frame 468, grain included. */
const LOOP_FRAME = SONG_END - 1;
const P1_HANDOVER = 468;

const Gl = ({ s }: { s: GlShot }) => {
  if (s.fx === 'ink') return <InkBleed progress={s.p} seconds={s.seconds} time={s.time} from={s.from} to={s.to} origin={s.origin} seam={s.seam} />;
  if (s.fx === 'plate') return <PlateShift progress={s.p} seconds={s.seconds} time={s.time} from={s.from} to={s.to} peel={s.peel} lay={s.lay} snap={s.snap} />;
  return <SqueegeePrint progress={s.p} seconds={s.seconds} time={s.time} from={s.from} to={s.to} tiltDeg={s.tiltDeg} />;
};

/**
 * Part4 (song 2:35.88-4:00.76) as two compositions (Part4a from song 4676, Part4b from 6396). Every frame has at most
 * ONE WebGL canvas: the stage (ThreeStage), a print transition (both sides as 2D painters) or the shatter's canvas.
 */
const Inner = ({ start, ht }: { start: number; ht: boolean }) => {
  const f = start + useCurrentFrame();
  const shot = shotAt(f, ht);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.navy }}>
      {shot.kind === 'stage' && <ThreeStage layers={shot.layers} cam={shot.cam} frame={f} />}
      {shot.kind === 'flat' && <PainterLayer paint={shot.paint} width={1920} height={1080} />}
      {shot.kind === 'gl' && <Gl s={shot} />}
      {shot.kind === 'shatter' && <ShatterStage data={shot.data} frame={f} />}
      {shot.kind !== 'flat' && shot.overlay && <PainterLayer paint={shot.overlay} width={1920} height={1080} />}
      <Part4Type frame={f} />
      <PaperGrain frame={f === LOOP_FRAME ? P1_HANDOVER : f} />
    </AbsoluteFill>
  );
};

const scene = (start: number, ht = false) => {
  const Scene = () => {
    if (!useImagesReady(IMAGE_URLS)) return null;
    return (
      <>
        <Inner start={start} ht={ht} />
        <Audio src={staticFile('her-sabah-bastan.wav')} trimBefore={start} />
      </>
    );
  };
  return Scene;
};
export const Part4aScene = scene(4676);
export const Part4bScene = scene(SPLIT_AT);
// TRIAL: the same two halves with the halftone reset in place of the white reset flashes.
export const Part4aHalftoneScene = scene(4676, true);
export const Part4bHalftoneScene = scene(SPLIT_AT, true);
export const PART4A_FRAMES = SPLIT_AT - 4676;
export const PART4B_FRAMES = SONG_END - SPLIT_AT;
