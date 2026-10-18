// Pose cut-out metadata. Pixel sizes are measured from public/poses/*.png.
// Scale: every STANDING pose renders at BODY_PX tall (62% of the frame) = BODY_PX / pixel height.
// Seated and bent poses (h03 h06 a03 a06) were drawn larger than their standing sibling, so their bbox
// height says nothing: starting from the sibling's factor (h01 0.749, a01 0.803) the factor was divided
// by the measured head-size ratio in the Lineup composition (h03 1.9, h06 1.2, a03 1.45, a06 1.33).
import { H } from '../layout.ts';

export type PoseId =
  | 'h01' | 'h02' | 'h03' | 'h04' | 'h05' | 'h06' | 'h07' | 'h08'
  | 'a01' | 'a02' | 'a03' | 'a04' | 'a05' | 'a06' | 'a07' | 'a08' | 'a09';

export interface PoseMeta {
  /** File stem in public/poses/ (the world-swapped copy adds "-ters"). */
  file: string;
  w: number;
  h: number;
  /** Foot anchor as a fraction of the image width; the anchor's y is always the bottom edge. */
  anchorX: number;
  /** Rendered pixels per image pixel. */
  scale: number;
  /** Pixel offset (in image pixels) of the hand that touches/passes the glass, for placing at the seam. */
  hand?: { x: number; y: number };
  /** The AI's cursor slit in image pixels; a blink paints over it with the body colour. */
  slit?: { x: number; y: number; w: number; h: number };
}

export const BODY_PX = Math.round(H * 0.62);
const stand = (h: number): number => BODY_PX / h;

export const POSES: Record<PoseId, PoseMeta> = {
  h01: { file: 'h01-ayakta', w: 200, h: 894, anchorX: 0.5, scale: stand(894) },
  h02: { file: 'h02-elcamda', w: 306, h: 888, anchorX: 0.3, scale: stand(888) },
  h03: { file: 'h03-oturan-sirt', w: 853, h: 793, anchorX: 0.5, scale: 0.4 },
  h04: { file: 'h04-el-uzatma', w: 364, h: 804, anchorX: 0.3, scale: stand(804) },
  h05: { file: 'h05-fener', w: 295, h: 892, anchorX: 0.5, scale: stand(892) },
  h06: { file: 'h06-masada', w: 674, h: 777, anchorX: 0.5, scale: 0.64 },
  h07: { file: 'h07-kutu', w: 225, h: 887, anchorX: 0.5, scale: stand(887) },
  h08: { file: 'h08-yuruyen', w: 395, h: 837, anchorX: 0.5, scale: stand(837) },
  a01: { file: 'a01-ayakta', w: 126, h: 834, anchorX: 0.5, scale: stand(834), slit: { x: 25, y: 39, w: 11, h: 54 } },
  a02: { file: 'a02-elcamda', w: 230, h: 790, anchorX: 0.3, scale: stand(790) },
  a03: { file: 'a03-okuyan', w: 506, h: 700, anchorX: 0.5, scale: 0.56 },
  a04: { file: 'a04-el-uzatma', w: 330, h: 818, anchorX: 0.3, scale: stand(818) },
  a05: { file: 'a05-igne', w: 288, h: 821, anchorX: 0.5, scale: stand(821) },
  a06: { file: 'a06-egilme', w: 480, h: 583, anchorX: 0.5, scale: 0.6 },
  a07: { file: 'a07-not-cama', w: 292, h: 900, anchorX: 0.5, scale: stand(900) },
  a08: { file: 'a08-bas-egik', w: 167, h: 852, anchorX: 0.5, scale: stand(852) },
  a09: { file: 'a09-yuruyen', w: 425, h: 894, anchorX: 0.5, scale: stand(894) },
};

export const ALL_POSES = Object.keys(POSES) as PoseId[];
export const poseWho = (id: PoseId): 'human' | 'ai' => (id.startsWith('h') ? 'human' : 'ai');
