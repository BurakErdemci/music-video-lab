// What a shot shows, frame by frame (round 7c, scene-map.md "Framing: the face and the action stay in frame"): the
// camera pose the Stage renders with (punches, shakes and moves included) and every girl's card with the placement
// the Card draws it at. Each shot module exports a stateAt(t) built from the same code its component renders, and
// tools/framecheck.mjs projects the cards' face and action boxes through it.
import type { CameraPose } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';

export interface Subject {
  card: string;
  at: Placement;
  /** Extra offsets the Card is given (recoils, the logo halves). */
  dx?: number;
  dy?: number;
  /** A framing that cuts deliberately at the knees or below: the action box may leave the frame at the bottom. */
  crop?: 'knee';
  /** A flat silhouette (the groove): no face to keep, only the action rule. */
  silhouette?: boolean;
  /** A split-screen half: the card only shows on this side of world x. */
  clip?: { x: number; keep: 'left' | 'right' };
}
export interface ShotState { pose: CameraPose; shot: string; subjects: Subject[] }
