import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { palette } from '../../style/palette.ts';
import { PaperGrain } from '../../style/screenprint.tsx';
import { PaperFold } from '../../transitions/PaperFold.tsx';
import { SEAM_SWEEP, WhiteWave } from '../../transitions/WhiteWave.tsx';
import { getImage, PainterLayer, useImagesReady, type Painter } from '../../transitions/layers.ts';
import { paintLayers } from '../compose2d.ts';
import { ThreeStage } from '../ThreeStage.tsx';
import { chorusCamAt, foldLanding, herNoteRowsAt, IMAGE_URLS, seamOnScreen, setImageLookup, shotAt, SONG_START, WAVES, type StageShot } from './shots.ts';
import { Part2Type } from './Part2Type.tsx';

setImageLookup(getImage);

const painter = (s: StageShot, frame: number): Painter => (ctx, w, h) => paintLayers(ctx, s.layers, s.cam, frame, w, h);

/** Chorus waves: her side only (clipped at the glass seam on screen); the last wave covers the whole frame. */
const Waves = ({ f }: { f: number }) => {
  const live = WAVES.map((w, i) => ({ w, i })).filter(({ w }) => f >= w.start && f <= w.end + 1);
  if (!live.length) return null;
  const seam = seamOnScreen(f) ?? 960;
  const rows = herNoteRowsAt(f, chorusCamAt(f));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <clipPath id="p2-ai-side">
          <rect x={seam} y={0} width={1920 - seam} height={1080} />
        </clipPath>
      </defs>
      {live.map(({ w, i }) =>
        w.full ? (
          <WhiteWave key={i} frame={f} startFrame={w.start} endFrame={w.end} seed={`p2:wave:${i}`} bits={60} ink />
        ) : (
          <g key={i} clipPath="url(#p2-ai-side)">
            <WhiteWave frame={f} startFrame={w.start} endFrame={w.end} seed={`p2:wave:${i}`} baseFrom={SEAM_SWEEP.from} baseTo={SEAM_SWEEP.to} bits={30} noteRows={rows} ink />
          </g>
        ),
      )}
    </svg>
  );
};

/**
 * Part2 (song 1706-3375, scene map v2 scenes 5-8). Composition frame 0 = song frame 1706. Normal frames go through ONE
 * ThreeCanvas (ThreeStage); the flat note and the dark end are one 2D canvas; during the PaperFold its own WebGL canvas
 * is the only one and both sides reach it as 2D painters (as Part 1 does with its transitions).
 */
const Inner = () => {
  const f = SONG_START + useCurrentFrame();
  const shot = shotAt(f);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.navy }}>
      {shot.kind === 'stage' && <ThreeStage layers={shot.layers} cam={shot.cam} frame={f} />}
      {shot.kind === 'flat' && <PainterLayer paint={shot.paint} width={1920} height={1080} />}
      {shot.kind === 'fold' && <PaperFold progress={shot.p} from={shot.from.paint} to={painter(shot.to, f)} landing={foldLanding()} panels={6} />}
      <Waves f={f} />
      <Part2Type frame={f} />
      <PaperGrain frame={f} />
    </AbsoluteFill>
  );
};

export const Part2Scene = () => {
  if (!useImagesReady(IMAGE_URLS)) return null;
  return (
    <>
      <Inner />
      <Audio src={staticFile('her-sabah-bastan.wav')} trimBefore={SONG_START} />
    </>
  );
};
