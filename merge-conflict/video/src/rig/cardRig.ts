// The rig of one pose card, cached per card id, plus the placement of a deformed card point in the world.
// The card shader, the scribble outline and the white-out silhouette all deform through these functions,
// so the 2D layers follow the dancing card exactly.
import manifestJson from '../../public/cards/manifest.json' with { type: 'json' };
import { type Dance, type Joints, type P, type WeightGrid, boneSegments, danceOf, deform, restJoints, rigFrame, weightGrid, weightsAt } from './rig.ts';
import { POSES } from './poses.ts';

interface ManifestEntry { w: number; h: number }
const MANIFEST = manifestJson as Record<string, ManifestEntry>;

export interface CardRig { joints: Joints; grid: WeightGrid; aspect: number }
const CACHE = new Map<string, CardRig>();
export const cardRig = (id: string): CardRig => {
  const hit = CACHE.get(id);
  if (hit) return hit;
  const pose = POSES[id];
  const e = MANIFEST[id];
  if (!pose || !e) throw new Error(`no pose or manifest entry for card ${id}`);
  const aspect = e.w / e.h;
  const joints = restJoints(pose, aspect);
  const r = { joints, grid: weightGrid(boneSegments(joints), aspect), aspect };
  CACHE.set(id, r);
  return r;
};

/** Dance of a card instance: its arm factor, scaled by an energy (0 = a still card). */
export const cardDance = (id: string, energy = 1): Dance => danceOf(id, energy);

/** Deform a list of card-unit points at time t (weights computed per point, as the shader's vertices). */
export const deformPoints = (id: string, pts: readonly P[], t: number, energy = 1): P[] => {
  const r = cardRig(id);
  const f = rigFrame(r.joints, t, cardDance(id, energy));
  return pts.map((p) => deform(f, p, weightsAt(p, r.grid)));
};

/** Where a card stands and how it is squashed for a smear: card units to world. */
export interface Stand { x: number; feet: number; z: number; height: number; sx?: number; sy?: number; flip?: boolean }
export const toWorld = (s: Stand, p: P): [number, number, number] => [
  s.x + (s.flip ? -p[0] : p[0]) * s.height * (s.sx ?? 1),
  s.feet + (p[1] + 0.5) * s.height * (s.sy ?? 1),
  s.z,
];
