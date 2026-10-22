// What a shot shows, frame by frame (round 7c, scene-map.md "Framing: the face and the action stay in frame"): the
// camera pose the Stage renders with (punches, shakes and moves included) and every girl's card with the placement
// the Card draws it at. Each shot module exports a stateAt(t) built from the same code its component renders, and
// tools/framecheck.mjs projects the cards' face and action boxes through it.
import type { Placement } from '../cards/Card.tsx';
import { type CameraPose, project } from '../camera/camera.ts';
import framesJson from '../../public/cards/frames.json' with { type: 'json' };
import manifestJson from '../../public/cards/manifest.json' with { type: 'json' };
import { FLOOR_Y } from '../stage/floor.ts';

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
  /** The card is drawn without its floor contact (a world with no floor under her): the grounding check skips it. */
  ground?: false;
  /** A split-screen half: the card only shows on this side of world x. */
  clip?: { x: number; keep: 'left' | 'right' };
}
export interface ShotState {
  pose: CameraPose;
  shot: string;
  subjects: Subject[];
  /** Cards drawn but not the shot's subject (the other girl at the edge of a single): not held in frame. */
  extras?: Subject[];
  /** How far the live camera had to widen (1 = not at all) and whether it could fit every subject. */
  fit?: { z: number; ok: boolean };
  /** The painted plate behind the shot (worlds/plate.tsx): its id, the pose its far plane faces, the plane's
   *  distance and its width over the frame's, for the pixel-scale rule (round 7c, "Resolution"). */
  plate?: { id: string; base: CameraPose; dist: number; margin: number };
}

// ---- the card geometry framecheck and the live camera share --------------------------------------------------

/** A card's measured face box and action box (normalised card coordinates, y down) and whether it is a bust. */
export interface CardFrames {
  face: [number, number, number, number];
  action: [number, number, number, number];
  kind: 'bust' | 'full';
  /** Full cards: the soles' horizontal extent and height [u0, u1, v] (tools/soles.py), where the contact shadow and
   *  the floor reflection sit (round 7d grounding). */
  soles?: [number, number, number];
}
export const CARD_FRAMES = framesJson as unknown as Record<string, CardFrames>;
const MANIFEST = manifestJson as Record<string, { w: number; h: number }>;

/** A normalised card point (u right, v down) in world space, placed as <Card> places it. */
export const cardPoint = (s: Subject, u: number, v: number): [number, number, number] => {
  const e = MANIFEST[s.card] as { w: number; h: number };
  const sx = s.at.flip ? -1 : 1;
  const h = s.at.height;
  return [s.at.x + (s.dx ?? 0) + sx * h * (u - 0.5) * (e.w / e.h), (s.at.feet ?? FLOOR_Y) + (s.dy ?? 0) + h * (1 - v), s.at.z ?? 0];
};
export interface ScreenBox { x0: number; y0: number; x1: number; y1: number }
/** A card box projected to screen pixels through `pose` (the bounding box of its four corners). */
export const screenBox = (pose: CameraPose, s: Subject, box: readonly number[]): ScreenBox => {
  const [u0, v0, u1, v1] = box as [number, number, number, number];
  const pts = [[u0, v0], [u1, v0], [u0, v1], [u1, v1]].map(([u, v]) => project(pose, cardPoint(s, u as number, v as number)));
  return { x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), y1: Math.max(...pts.map((p) => p.y)) };
};

/** A card's width over its height (the manifest), node-safe. */
export const cardAspectOf = (card: string): number => {
  const e = MANIFEST[card];
  if (!e) throw new Error(`no card ${card} in public/cards/manifest.json`);
  return e.w / e.h;
};

/** A placement that frames a card by its measured face box (round 7c, "Framing"): the face box `faceH` world units
 *  tall (the frame is 9 units tall at z = 0 from the home camera), its centre at world (x, cy). A face close-up is
 *  sized by its face, not by the card, so the eyes sit where the shot means them whatever the painting's crop. */
export const faceSized = (card: string, x: number, flip = false, faceH = 2.6, cy = 0.6, z = 0): Placement => {
  const f = CARD_FRAMES[card];
  if (!f) throw new Error(`no face box for ${card} in public/cards/frames.json`);
  const height = faceH / (f.face[3] - f.face[1]);
  const u = (f.face[0] + f.face[2]) / 2;
  const v = (f.face[1] + f.face[3]) / 2;
  const sx = flip ? -1 : 1;
  return { x: x - sx * height * (u - 0.5) * cardAspectOf(card), feet: cy - height * (1 - v), height, z, flip };
};
