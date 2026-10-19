import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { palette } from '../../style/palette.ts';
import { PaperGrain } from '../../style/screenprint.tsx';
import { HalftoneBloom } from '../../transitions/HalftoneBloom.tsx';
import { camPoint, drawCover, driftCam, getImage, paintNotes, useImagesReady, type Painter } from '../../transitions/layers.ts';
import { FPS } from '../../timing.ts';
import { H, W } from '../../layout.ts';
import { CURSOR, G1_CAM, G1_NOTES, G1_SPLIT_NOTES, PL, PL_URLS, paintSplit, paintTyping, segProgress, segStart, type Segment } from '../TransitionsTestScene.tsx';

const Inner = ({ seg }: { seg: Segment }) => {
  const local = useCurrentFrame();
  const song = segStart(seg) + local;
  const t = local / FPS;
  const p = segProgress(seg, song);
  const tt = t - (seg.before + seg.dur) / FPS;
  const toCam = driftCam(tt + 3, { push: 0.008, sway: 6, base: 1.02 });
  const from: Painter = (ctx, w, h) => {
    const cam = G1_CAM(t);
    drawCover(ctx, getImage(PL.screen), w, h, cam);
    paintTyping(ctx, w, h, cam, t);
    paintNotes(ctx, G1_NOTES, t, w, h, { s: cam.s, x: cam.x * 1.8, y: cam.y * 1.8 });
  };
  const to: Painter = (ctx, w, h) => {
    paintSplit(ctx, w, h, toCam);
    paintNotes(ctx, G1_SPLIT_NOTES, tt + 3, w, h, toCam);
  };
  const c = camPoint(G1_CAM(seg.before / FPS), W, H, CURSOR.x * W, CURSOR.y * H);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.cream }}>
      <HalftoneBloom progress={p} seconds={seg.dur / FPS} time={t} from={from} to={to} origin={[c.x / W, c.y / H]} />
      <PaperGrain frame={local} />
    </AbsoluteFill>
  );
};

export const HalftoneBloomSegment = ({ seg }: { seg: Segment }) => {
  if (!useImagesReady(PL_URLS)) return null;
  return <Inner seg={seg} />;
};
