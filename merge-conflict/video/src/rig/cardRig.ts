// The rig of one pose card, cached per card id, plus the placement of a deformed card point in the world.
// The card shader, the scribble outline and the white-out silhouette all deform through these functions,
// so the 2D layers follow the dancing card exactly.
import framesJson from '../../public/cards/frames.json' with { type: 'json' };
import manifestJson from '../../public/cards/manifest.json' with { type: 'json' };
import { ACCENTS } from './accents.ts';
import { BONES, type Dance, type Frame, type Joints, type P, type WeightGrid, boneSegments, danceOf, deform, restJoints, rigFrame, weightGrid, weightsAt } from './rig.ts';
import { POSES } from './poses.ts';

interface ManifestEntry { w: number; h: number }
const MANIFEST = manifestJson as Record<string, ManifestEntry>;
const FRAMES: unknown = framesJson;

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
/** The motion of a card: held (energy 0) with the accents of girls' accent table for this card. */
export const cardDance = (id: string, energy = 0): Dance => danceOf(id, energy, ACCENTS[id]);

/** Deform a list of card-unit points at time t (weights computed per point, as the shader's vertices). */
export const deformPoints = (id: string, pts: readonly P[], t: number, energy = 0): P[] => {
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
export const frameOf = (id: string, t: number, energy = 0): Frame => {
  const r = cardRig(id);
  return r.joints ? rigFrame(r.joints, t, cardDance(id, energy)) : STILL;
};
/** The soles of a full card at t, through its rig and the beat squash, as normalised card coordinates [u0, u1, v]
 *  (y down): the sole line of public/cards/frames.json (tools/soles.py) where the drawn boots are, so the contact
 *  shadow follows a leg the rig moves. Null for a card without measured soles. */
export const solesAt = (id: string, t: number, energy = 0): [number, number, number] | null => {
  const s = (FRAMES as Record<string, { soles?: [number, number, number] }>)[id]?.soles;
  if (!s) return null;
  const r = cardRig(id);
  const f = frameOf(id, t, energy);
  const [a, b] = ([[(s[0] - 0.5) * r.aspect, 0.5 - s[2]], [(s[1] - 0.5) * r.aspect, 0.5 - s[2]]] as P[]).map((p) => {
    const q = deform(f, p, weightsAt(p, r.grid));
    return [q[0], -0.5 + (q[1] + 0.5) * (1 - f.squash)] as P;
  }) as [P, P];
  return [Math.min(a[0], b[0]) / r.aspect + 0.5, Math.max(a[0], b[0]) / r.aspect + 0.5, 0.5 - (a[1] + b[1]) / 2];
};

/** A rest keypoint of a card; throws for a card without keypoints. */
export const restPoint = (id: string, name: 'hips' | 'head' | 'chest' | 'neck'): P => {
  const j = cardRig(id).joints;
  if (!j) throw new Error(`card ${id} has no pose keypoints`);
  return j[name];
};
