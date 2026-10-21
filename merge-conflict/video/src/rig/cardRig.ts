// The rig of one pose card, cached per card id, plus the placement of a deformed card point in the world.
// The card shader, the scribble outline and the white-out silhouette all deform through these functions,
// so the 2D layers follow the dancing card exactly.
import manifestJson from '../../public/cards/manifest.json' with { type: 'json' };
import { BONES, type Dance, type Frame, type Joints, type P, type WeightGrid, boneSegments, danceOf, deform, restJoints, rigFrame, weightGrid, weightsAt } from './rig.ts';
import { POSES } from './poses.ts';

interface ManifestEntry { w: number; h: number }
const MANIFEST = manifestJson as Record<string, ManifestEntry>;

/** joints null: a card without pose keypoints (not annotated yet): it is drawn rigid, never deformed. */
export interface CardRig { joints: Joints | null; grid: WeightGrid; aspect: number }
const CACHE = new Map<string, CardRig>();
export const cardRig = (id: string): CardRig => {
  const hit = CACHE.get(id);
  if (hit) return hit;
  const pose = POSES[id];
  const e = MANIFEST[id];
  if (!e) throw new Error(`no manifest entry for card ${id}`);
  const aspect = e.w / e.h;
  const joints = pose ? restJoints(pose, aspect) : null;
  // a rigid card: every vertex on the static bone
  const rigid: [P, P][][] = BONES.map((b) => (b === 'static' ? [[[-aspect / 2, -0.5], [aspect / 2, 0.5]] as [P, P]] : []));
  const r = { joints, grid: weightGrid(joints ? boneSegments(joints) : rigid, aspect), aspect };
  CACHE.set(id, r);
  return r;
};

/** Dance of a card instance: its arm factor, scaled by an energy (0 = a still card). */
export const cardDance = (id: string, energy = 1): Dance => danceOf(id, energy);

/** Deform a list of card-unit points at time t (weights computed per point, as the shader's vertices). */
export const deformPoints = (id: string, pts: readonly P[], t: number, energy = 1): P[] => {
  const r = cardRig(id);
  const f = frameOf(id, t, energy);
  return pts.map((p) => deform(f, p, weightsAt(p, r.grid)));
};

/** Where a card stands and how it is squashed for a smear: card units to world. */
export interface Stand { x: number; feet: number; z: number; height: number; sx?: number; sy?: number; flip?: boolean }
export const toWorld = (s: Stand, p: P): [number, number, number] => [
  s.x + (s.flip ? -p[0] : p[0]) * s.height * (s.sx ?? 1),
  s.feet + (p[1] + 0.5) * s.height * (s.sy ?? 1),
  s.z,
];

const STILL: Frame = { xf: BONES.map(() => ({ theta: 0, p: [0, 0] as P, q: [0, 0] as P })), squash: 0, joints: {} };
/** The rig frame of a card at t; a rigid card (no keypoints) stands still. */
export const frameOf = (id: string, t: number, energy = 1): Frame => {
  const r = cardRig(id);
  return r.joints ? rigFrame(r.joints, t, cardDance(id, energy)) : STILL;
};
/** A rest keypoint of a card; throws for a card without keypoints. */
export const restPoint = (id: string, name: 'hips' | 'head' | 'chest' | 'neck'): P => {
  const j = cardRig(id).joints;
  if (!j) throw new Error(`card ${id} has no pose keypoints`);
  return j[name];
};
