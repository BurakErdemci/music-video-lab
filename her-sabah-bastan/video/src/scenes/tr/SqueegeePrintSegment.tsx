import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { palette } from '../../style/palette.ts';
import { PaperGrain } from '../../style/screenprint.tsx';
import { SqueegeePrint } from '../../transitions/SqueegeePrint.tsx';
import { drawCover, driftCam, getImage, useImagesReady, type Painter } from '../../transitions/layers.ts';
import { FPS } from '../../timing.ts';
import { PL, PL_URLS, paintStreet, segProgress, segStart, streetCam, type Segment } from '../TransitionsTestScene.tsx';

export const SqueegeePrintSegment = ({ seg }: { seg: Segment }) => {
  const local = useCurrentFrame();
  const ready = useImagesReady(PL_URLS);
  if (!ready) return null;
  const t = local / FPS;
  const p = segProgress(seg, segStart(seg) + local);
  const to: Painter = (ctx, w, h) => drawCover(ctx, getImage(PL.desk), w, h, driftCam(t));
  return (
    <AbsoluteFill style={{ backgroundColor: palette.cream }}>
      <SqueegeePrint progress={p} seconds={seg.dur / FPS} time={t} from={paintStreet(t, streetCam(t))} to={to} />
      <PaperGrain frame={local} />
    </AbsoluteFill>
  );
};
