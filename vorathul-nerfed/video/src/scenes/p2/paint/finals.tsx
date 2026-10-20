// Final cut-outs with the code-drawn art as the fallback. A final is used when the main loop has made its id live
// (cast/available.ts) or while PREVIEW_FINALS is on: a p2-only switch to look at the finals before they go live.
import { AVAILABLE, assetSize } from '../../../cast/available.ts';
import { Card, type Vec3 } from '../../../stage/Card.tsx';
import { CropCard } from './cards.tsx';

export const PREVIEW_FINALS = true;

/** Pixel size of the final image for `id`, or undefined when the code-drawn stand-in should be used. */
export const finalSize = (id: string): [number, number] | undefined => (PREVIEW_FINALS || AVAILABLE.has(id) ? assetSize(id) : undefined);

interface Place {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  opacity?: number;
  renderOrder?: number;
  hidden?: boolean;
}

/** A final cut-out card sized by its HEIGHT (the image keeps its own aspect), or the stand-in when there is no final. */
export const FinalCard = ({ id, height, standIn, ...place }: Place & { id: string; height: number; standIn?: React.ReactNode }) => {
  const size = finalSize(id);
  if (!size) return <>{standIn ?? null}</>;
  return <Card src={`assets/${id}.png`} width={(height * size[0]) / size[1]} height={height} {...place} />;
};

/** A crop of a final image (fractions from the top left) at a world size, or the stand-in. */
export const FinalCrop = ({ id, u0, u1, v0, v1, width, height, standIn, ...place }: Place & { id: string; u0: number; u1: number; v0: number; v1: number; width: number; height: number; standIn?: React.ReactNode }) => {
  if (!finalSize(id)) return <>{standIn ?? null}</>;
  return <CropCard src={`assets/${id}.png`} u0={u0} u1={u1} v0={v0} v1={v1} width={width} height={height} {...place} />;
};
