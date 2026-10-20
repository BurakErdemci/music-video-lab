import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { palette } from '../../style/palette.ts';
import { PaperGrain } from '../../style/screenprint.tsx';
import { PlateShift } from '../../transitions/PlateShift.tsx';
import { drawCover, driftCam, getImage, paintNotes, useImagesReady, type Painter } from '../../transitions/layers.ts';
import { FPS } from '../../timing.ts';
import { G1_CAM, G1_NOTES, G1_SPLIT_NOTES, PL, PL_URLS, paintSplit, paintTyping, segProgress, segStart, type Segment } from '../TransitionsTestScene.tsx';

/** G1 alternative A: the screen close-up (typing "Merhaba") -> the split room, as a plate registration shift. */
export const PlateShiftSegment = ({ seg }: { seg: Segment }) => {
  const local = useCurrentFrame();
  const ready = useImagesReady(PL_URLS);
  if (!ready) return null;
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
  return (
    <AbsoluteFill style={{ backgroundColor: palette.cream }}>
      <PlateShift progress={p} seconds={seg.dur / FPS} time={t} from={from} to={to} />
      <PaperGrain frame={local} />
    </AbsoluteFill>
  );
};
