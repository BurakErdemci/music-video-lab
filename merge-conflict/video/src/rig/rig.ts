// Soft-bone rig for the pose cards (Live2D-style mesh deformation). Per-card keypoints come from
// public/cards/<id>.pose.json (u, v in 0..1 from the card's top-left). Bones are rigid 2D transforms
// driven by closed-form dance motion on the beat grid; the mesh blends up to 4 bones per vertex with smooth
// inverse-distance weights.
// The whole lower body (pelvis, both legs, the flares, the cloth between the legs) is ONE static bone: the
// first version hung both thighs from one hip point with IK knees, which pinched the pelvis and folded the
// flares into a "mermaid tail" (Burak, proof v2, O03 and B01). The dance is from the waist up: spine lean,
// chest bounce, head nod, arm swing, hair follow-through; the beat dip is a small vertical squash of the
// whole figure anchored at the soles (card bottom), with no horizontal change.
// Erasable TypeScript only: node loads this file in tools/rigcheck.mjs (limb lengths and quad areas).
import { beatPos } from '../timing.ts';

export type P = [number, number];
type Q = P | null;
export interface PoseFile {
  id: string;
  head: Q; neck: Q; chest: Q; hips: Q;
  lShoulder: Q; lElbow: Q; lWrist: Q; rShoulder: Q; rElbow: Q; rWrist: Q;
  lKnee: Q; lAnkle: Q; rKnee: Q; rAnkle: Q;
  hairRoot: Q; hairTips: P[];
}

export const BONES = ['static', 'spine', 'upper', 'head', 'uarmL', 'farmL', 'uarmR', 'farmR', 'hair0', 'hair1', 'hair2'] as const;
export type BoneName = (typeof BONES)[number];
export const MAX_BONES = BONES.length;

/** Rest joints in card units: the card is 1 tall, x in [-aspect/2, aspect/2], y up, centred. */
export interface Joints {
  head: P; neck: P; chest: P; hips: P;
  lShoulder: Q; lElbow: Q; lWrist: Q; rShoulder: Q; rElbow: Q; rWrist: Q;
  lKnee: Q; lAnkle: Q; rKnee: Q; rAnkle: Q;
  hairRoot: Q; hairTips: P[];
  aspect: number;
  /** Which legs are drawn (their segments weight the static lower body). */
  legs: { L: boolean; R: boolean };
  /** Full-body card (has hips); close-ups dance with the head only. */
  body: boolean;
}

const toCard = (q: Q, aspect: number): Q => (q ? [(q[0] - 0.5) * aspect, 0.5 - q[1]] : null);

export const restJoints = (pose: PoseFile, aspect: number): Joints => {
  const c = (q: Q) => toCard(q, aspect);
  const head = c(pose.head);
  const neck = c(pose.neck);
  const chest = c(pose.chest);
  if (!head || !neck || !chest) throw new Error(`rig ${pose.id}: head, neck and chest are required`);
  // Close-ups have no hips: the spine pivots on the bottom edge of the card, which stays pinned.
  const hips = c(pose.hips) ?? [chest[0], -0.5];
  const j: Joints = {
    head, neck, chest, hips,
    lShoulder: c(pose.lShoulder), lElbow: c(pose.lElbow), lWrist: c(pose.lWrist),
    rShoulder: c(pose.rShoulder), rElbow: c(pose.rElbow), rWrist: c(pose.rWrist),
    lKnee: c(pose.lKnee), lAnkle: c(pose.lAnkle), rKnee: c(pose.rKnee), rAnkle: c(pose.rAnkle),
    hairRoot: c(pose.hairRoot), hairTips: pose.hairTips.slice(0, 3).map((t) => c(t) as P),
    aspect,
    legs: { L: !!(pose.hips && pose.lKnee && pose.lAnkle), R: !!(pose.hips && pose.rKnee && pose.rAnkle) },
    body: !!pose.hips,
  };
  return j;
};

/** Rest segments of each bone (for weighting and for the limb-length measurement). */
export const boneSegments = (j: Joints): [P, P][][] => {
  const segs: [P, P][][] = BONES.map(() => []);
  const add = (b: BoneName, a: Q, z: Q) => {
    if (a && z) (segs[BONES.indexOf(b)] as [P, P][]).push([a, z]);
  };
  const half = j.aspect / 2;
  add('static', [-half, -0.5], [half, -0.5]);
  // The lower body is one static bone: legs, pelvis, and a pelvis bar across the hips.
  for (const s of ['L', 'R'] as const) {
    const knee = s === 'L' ? j.lKnee : j.rKnee;
    const ankle = s === 'L' ? j.lAnkle : j.rAnkle;
    if (ankle) add('static', ankle, [ankle[0], -0.5]);
    if (j.legs[s]) {
      add('static', j.hips, knee);
      add('static', knee, ankle);
    }
  }
  if (j.body) {
    const w = Math.max(0.04, ...[j.lKnee, j.rKnee].filter(Boolean).map((k) => Math.abs((k as P)[0] - j.hips[0]) * 0.6));
    add('static', [j.hips[0] - w, j.hips[1]], [j.hips[0] + w, j.hips[1]]);
  }
  // The spine's weight starts a quarter of the way up to the chest, so the waist blends from the static
  // pelvis into the moving torso without a seam (the spine still pivots at the hips).
  add('spine', [j.hips[0] + (j.chest[0] - j.hips[0]) * 0.25, j.hips[1] + (j.chest[1] - j.hips[1]) * 0.25], j.chest);
  add('upper', j.chest, j.neck);
  add('upper', j.chest, j.lShoulder);
  add('upper', j.chest, j.rShoulder);
  add('head', j.neck, j.head);
  if (j.hairRoot) add('head', j.head, j.hairRoot);
  for (const s of ['L', 'R'] as const) {
    const sh = s === 'L' ? j.lShoulder : j.rShoulder;
    const el = s === 'L' ? j.lElbow : j.rElbow;
    const wr = s === 'L' ? j.lWrist : j.rWrist;
    add(s === 'L' ? 'uarmL' : 'uarmR', sh, el);
    if (el && wr) {
      // the hand continues past the wrist
      const hand: P = [wr[0] + (wr[0] - el[0]) * 0.15, wr[1] + (wr[1] - el[1]) * 0.15];
      add(s === 'L' ? 'farmL' : 'farmR', el, hand);
    }
  }
  // Hair weights start a third of the way down the strand: a segment from the crown would cross the face.
  j.hairTips.forEach((tip, k) => {
    const r = j.hairRoot;
    if (r) add(`hair${k}` as BoneName, [r[0] + (tip[0] - r[0]) * 0.35, r[1] + (tip[1] - r[1]) * 0.35], tip);
  });
  return segs;
};

const segDist = (p: P, a: P, b: P): number => {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const l2 = vx * vx + vy * vy || 1e-9;
  const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2));
  return Math.hypot(p[0] - a[0] - k * vx, p[1] - a[1] - k * vy);
};

const EPS = 0.012;
const POWER = 4;
/** Hair bones reach less far than body bones, so a long hair segment never drags the face or torso. */
const REACH: Partial<Record<BoneName, number>> = { hair0: 0.45, hair1: 0.45, hair2: 0.45, static: 1.4 };

/** Raw normalised weights of every bone at a point (card units), before smoothing. */
const rawWeights = (p: P, segs: readonly (readonly [P, P][])[]): number[] => {
  const dist = segs.map((list) => (list.length ? Math.min(...list.map(([a, b]) => segDist(p, a, b))) : Infinity));
  // Hair never drags a limb, the torso or the legs: where any body bone is near, the hair weight fades out
  // smoothly (an arm lying across a long strand would otherwise swing with the hair and stretch).
  const body = Math.min(...dist.filter((_, i) => !(BONES[i] as string).startsWith('hair')));
  const hairGate = Math.min(1, Math.max(0, (body - 0.015) / 0.07)) ** 2;
  const w = dist.map((d, i) => {
    if (d === Infinity) return 0;
    const name = BONES[i] as BoneName;
    return ((REACH[name] ?? 1) * (name.startsWith('hair') ? hairGate : 1)) / (d + EPS) ** POWER;
  });
  const sum = w.reduce((s, x) => s + x, 0);
  return w.map((x) => x / sum);
};

// ---- smoothed weight field ----------------------------------------------------------------------------
// The raw inverse-distance weights change fast between neighbouring vertices (near a segment's end, where
// the hair gate closes), and with long-lever bones that folds the mesh (rigcheck's quad metric caught it:
// thousands of folds). So the weights live on the card's mesh grid, each bone channel is blurred, and every
// point (mesh vertex, scribble outline, white-out silhouette, rigcheck probe) samples the same field.
export const GRID_COLS = 40;
export const GRID_ROWS = 60;
const BLUR_PASSES = 40;

export interface WeightGrid { aspect: number; w: Float32Array }
export const weightGrid = (segs: readonly (readonly [P, P][])[], aspect: number): WeightGrid => {
  const nb = BONES.length;
  const W = GRID_COLS + 1;
  const H = GRID_ROWS + 1;
  let a = new Float32Array(W * H * nb);
  for (let i = 0; i < H; i++)
    for (let k = 0; k < W; k++) {
      const r = rawWeights([-aspect / 2 + (k * aspect) / GRID_COLS, 0.5 - i / GRID_ROWS], segs);
      for (let b = 0; b < nb; b++) a[(i * W + k) * nb + b] = r[b] as number;
    }
  // separable 1-2-1 blur, clamped at the edges; each pass keeps every vertex's weights summing to 1
  let t = new Float32Array(a.length);
  const at = (x: Float32Array, i: number, k: number, b: number) => x[(Math.min(H - 1, Math.max(0, i)) * W + Math.min(W - 1, Math.max(0, k))) * nb + b] as number;
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    for (let i = 0; i < H; i++) for (let k = 0; k < W; k++) for (let b = 0; b < nb; b++) t[(i * W + k) * nb + b] = (at(a, i, k - 1, b) + 2 * at(a, i, k, b) + at(a, i, k + 1, b)) / 4;
    for (let i = 0; i < H; i++) for (let k = 0; k < W; k++) for (let b = 0; b < nb; b++) a[(i * W + k) * nb + b] = (at(t, i - 1, k, b) + 2 * at(t, i, k, b) + at(t, i + 1, k, b)) / 4;
  }
  t = a;
  return { aspect, w: t };
};

/** The weight of every bone at a point (card units), bilinear from the smoothed grid. All bones are kept
 *  (11, three vec4 attributes in the shader): truncating to the 4 strongest made the smoothed field steep
 *  where many bones overlap (rigcheck: 9 % area change with the dance switched off). */
export const weightsAt = (p: P, g: WeightGrid): number[] => {
  const nb = BONES.length;
  const W = GRID_COLS + 1;
  const fx = Math.min(GRID_COLS, Math.max(0, ((p[0] + g.aspect / 2) / g.aspect) * GRID_COLS));
  const fy = Math.min(GRID_ROWS, Math.max(0, (0.5 - p[1]) * GRID_ROWS));
  const k0 = Math.min(GRID_COLS - 1, Math.floor(fx));
  const i0 = Math.min(GRID_ROWS - 1, Math.floor(fy));
  const u = fx - k0;
  const v = fy - i0;
  const c = (i: number, k: number, b: number) => g.w[(i * W + k) * nb + b] as number;
  return BONES.map((_, b) => (1 - v) * ((1 - u) * c(i0, k0, b) + u * c(i0, k0 + 1, b)) + v * ((1 - u) * c(i0 + 1, k0, b) + u * c(i0 + 1, k0 + 1, b)));
};

/** A rigid bone transform: x' = q + R(theta) (x - p). */
export interface Xf { theta: number; p: P; q: P }
const ID: Xf = { theta: 0, p: [0, 0], q: [0, 0] };
export const apply = (x: Xf, v: P): P => {
  const c = Math.cos(x.theta);
  const s = Math.sin(x.theta);
  const dx = v[0] - x.p[0];
  const dy = v[1] - x.p[1];
  return [x.q[0] + c * dx - s * dy, x.q[1] + s * dx + c * dy];
};
/** Row form for the shader: [a, b, tx], [c, d, ty]. */
export const rows = (x: Xf): [number, number, number, number, number, number] => {
  const c = Math.cos(x.theta);
  const s = Math.sin(x.theta);
  return [c, -s, x.q[0] - (c * x.p[0] - s * x.p[1]), s, c, x.q[1] - (s * x.p[0] + c * x.p[1])];
};

// ---- dance motion on the beat grid ----------------------------------------------------------------
export interface Dance {
  /** 0 = still, 1 = full dance. */
  energy: number;
  /** 0..1 how much the arms swing (crossed arms or hands on hips: low). */
  arms: number;
}
export const DANCE: Dance = { energy: 1, arms: 1 };
/** Cards whose arms are locked to the body (crossed, hands on hips, hand at the chin) swing them less. */
const ARMS: Record<string, number> = { B01: 0.15, O03: 0.1, B04: 0.6, O04: 0.5, O06: 0.6, O07: 0.6, B11: 0.3, O11: 0.3, O10: 0.2 };
export const danceOf = (id: string, energy = 1): Dance => ({ energy, arms: ARMS[id] ?? 1 });

const TAU = Math.PI * 2;
// Amplitude scales, tuned against tools/rigcheck.mjs (quad area within [0.85, 1.15], no folds, limbs <= 6 %).
const BODY_AMP = 0.45;
const HAIR_AMP = 0.2;
const ARM_AMP = 0.35;
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];

/** squash: the beat dip as a vertical scale about the soles (y = -0.5), 0..0.03. */
export interface Frame { xf: Xf[]; squash: number; joints: Record<string, P> }

/** Bone transforms of a card at t seconds. Pure function of (joints, t, dance). */
export const rigFrame = (j: Joints, t: number, d: Dance = DANCE): Frame => {
  const E = d.energy;
  const bp = beatPos(t);
  const fr = bp - Math.floor(bp);
  // downbeats are beats with index % 4 == 1 (mc-timing.json downbeat_note)
  const bar = (bp - 1) / 4;
  const dip = E * 0.025 * (0.5 + 0.5 * Math.cos(TAU * fr)) ** 2;
  const lean = -E * BODY_AMP * 0.075 * Math.sin(TAU * bar + 0.35);
  const chest = E * BODY_AMP * 0.045 * Math.sin(Math.PI * bp + 0.3);
  const nod = E * BODY_AMP * 0.075 * Math.sin(Math.PI * (bp - 0.18));
  const breath = 0.0022 * Math.sin((TAU * t) / 3.4);
  const armU = E * d.arms * 0.1 * ARM_AMP;
  const armF = E * d.arms * 0.08 * ARM_AMP;
  const H = j.hips;
  // Close-ups dance with the head only: the bust stays on the pinned bottom edge.
  const spineTheta = j.body ? lean : 0;
  const chestTheta = j.body ? chest : chest * 0.25;
  const xf: Xf[] = BONES.map(() => ID);
  const set = (b: BoneName, x: Xf) => {
    xf[BONES.indexOf(b)] = x;
  };
  const spine: Xf = { theta: spineTheta, p: H, q: H };
  set('spine', spine);
  const C2 = add(apply(spine, j.chest), [0, breath]);
  const upperT = spineTheta + chestTheta;
  const upper: Xf = { theta: upperT, p: j.chest, q: C2 };
  set('upper', upper);
  const N2 = apply(upper, j.neck);
  const headT = upperT + nod;
  const head: Xf = { theta: headT, p: j.neck, q: N2 };
  set('head', head);
  const joints: Record<string, P> = { hips: H, chest: C2, neck: N2, head: apply(head, j.head) };
  for (const s of ['L', 'R'] as const) {
    const sh = s === 'L' ? j.lShoulder : j.rShoulder;
    const el = s === 'L' ? j.lElbow : j.rElbow;
    const wr = s === 'L' ? j.lWrist : j.rWrist;
    if (!sh || !el) continue;
    const ph = s === 'L' ? 0 : Math.PI;
    const S2 = apply(upper, sh);
    const ua: Xf = { theta: upperT + armU * Math.sin(Math.PI * bp + ph + 0.4), p: sh, q: S2 };
    set(s === 'L' ? 'uarmL' : 'uarmR', ua);
    const E2 = apply(ua, el);
    const fa: Xf = { theta: ua.theta + armF * Math.sin(Math.PI * bp + ph + 1.1), p: el, q: E2 };
    set(s === 'L' ? 'farmL' : 'farmR', fa);
    joints[`${s.toLowerCase()}Shoulder`] = S2;
    joints[`${s.toLowerCase()}Elbow`] = E2;
    if (wr) joints[`${s.toLowerCase()}Wrist`] = apply(fa, wr);
  }
  if (j.hairRoot) {
    const R2 = apply(head, j.hairRoot);
    // Hair follows through: the same bar and beat motion, lagged, with a little overshoot (hair only).
    const follow = E * HAIR_AMP * (0.085 * Math.sin(TAU * bar - 1.15) + 0.05 * Math.sin(Math.PI * bp - 1.0) + 0.02 * Math.sin(Math.PI * 2 * bp - 2.0));
    j.hairTips.forEach((_, k) => {
      // Hair takes only half of the head's turn: long hair hangs down by the pelvis, which does not move.
      set(`hair${k}` as BoneName, { theta: headT * 0.5 + follow * (1 - 0.2 * k), p: j.hairRoot as P, q: R2 });
    });
  }
  const squash = j.body ? dip : 0;
  const sq = (p: P): P => [p[0], -0.5 + (p[1] + 0.5) * (1 - squash)];
  for (const k of Object.keys(joints)) joints[k] = sq(joints[k] as P);
  return { xf, squash, joints };
};

/** Deform one point with its bone weights (one per bone), then the sole-anchored squash. */
export const deform = (f: Frame, v: P, w: readonly number[]): P => {
  let x = 0;
  let y = 0;
  for (let k = 0; k < w.length; k++) {
    const wk = w[k] as number;
    if (!wk) continue;
    const p = apply(f.xf[k] as Xf, v);
    x += p[0] * wk;
    y += p[1] * wk;
  }
  return [x, -0.5 + (y + 0.5) * (1 - f.squash)];
};
