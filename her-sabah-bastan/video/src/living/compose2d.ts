import { getImage } from '../transitions/layers.ts';
import { planeScale } from './types.ts';
import type { Cam, Layer } from './types.ts';
import { paintSource } from './sources.ts';

/** Default pivot of a rotated layer: the centre of its rectangle. Shared with ThreeStage. */
export const pivotOf = (l: Layer): readonly [number, number] => l.pivot ?? [l.x + l.w / 2, l.y + l.h / 2];

/** Draws the layers back to front with the projection screen = (w/2, h/2) + (P - cam.xy) * D0 / (cam.z + d). */
export const paintLayers = (ctx: CanvasRenderingContext2D, layers: readonly Layer[], cam: Cam, frame: number, w = 1920, h = 1080): void => {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const l of layers) {
    const opacity = l.opacity ?? 1;
    if (opacity <= 0) continue;
    const k = planeScale(cam, l.d);
    const sx = (wx: number) => w / 2 + (wx - cam.x) * k;
    const sy = (wy: number) => h / 2 + (wy - cam.y) * k;
    const img = l.src.kind === 'image' ? getImage(l.src.url) : paintSource(l.src, frame).canvas;
    ctx.save();
    ctx.globalAlpha = opacity;
    if (l.rot) {
      const [px, py] = pivotOf(l);
      ctx.translate(sx(px), sy(py));
      ctx.rotate((l.rot * Math.PI) / 180);
      ctx.drawImage(img, (l.x - px) * k, (l.y - py) * k, l.w * k, l.h * k);
    } else {
      ctx.drawImage(img, sx(l.x), sy(l.y), l.w * k, l.h * k);
    }
    ctx.restore();
  }
  ctx.restore();
};
