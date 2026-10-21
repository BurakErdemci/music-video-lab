// Soft-bone rig for the pose cards (Live2D-style mesh deformation). Per-card keypoints come from
// public/cards/<id>.pose.json (u, v in 0..1 from the card's top-left). Bones are rigid 2D transforms
// driven by closed-form dance motion on the beat grid; the mesh blends up to 4 bones per vertex with smooth
// inverse-distance weights. Feet are pinned: a static bone holds the ankles and the bottom edge, and the legs
// are solved with two-bone IK so thigh and shin keep their exact lengths while the hips sway and dip.
// Erasable TypeScript only: node loads this file in tools/rigcheck.mjs, which measures limb lengths.
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

export const BONES = ['static', 'thighL', 'shinL', 'thighR', 'shinR', 'spine', 'upper', 'head', 'uarmL', 'farmL', 'uarmR', 'farmR', 'hair0', 'hair1', 'hair2'] as const;
export type BoneName = (typeof BONES)[number];
export const MAX_BONES = BONES.length;

/** Rest joints in card units: the card is 1 tall, x in [-aspect/2, aspect/2], y up, centred. */
export interface Joints {
  head: P; neck: P; chest: P; hips: P;
  lShoulder: Q; lElbow: Q; lWrist: Q; rShoulder: Q; rElbow: Q; rWrist: Q;
  lKnee: Q; lAnkle: Q; rKnee: Q; rAnkle: Q;
  hairRoot: Q; hairTips: P[];
  aspect: number;
  /** Full-body card with both legs solvable by IK. */
  legs: { L: boolean; R: boolean };
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
  for (const s of ['L', 'R'] as const) {
    const knee = s === 'L' ? j.lKnee : j.rKnee;
    const ankle = s === 'L' ? j.lAnkle : j.rAnkle;
    if (ankle) add('static', ankle, [ankle[0], -0.5]);
    if (j.legs[s]) {
      add(s === 'L' ? 'thighL' : 'thighR', j.hips, knee);
      add(s === 'L' ? 'shinL' : 'shinR', knee, ankle);
    }
  }
  add('spine', j.hips, j.chest);
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

/** Up to 4 bone indices and normalised weights for a point (card units). */
export const weightsAt = (p: P, segs: readonly (readonly [P, P][])[]): { idx: number[]; w: number[] } => {
  const dist = segs.map((list) => (list.length ? Math.min(...list.map(([a, b]) => segDist(p, a, b))) : Infinity));
  // Hair never drags a limb or the torso: where any body bone is near, the hair weight fades out smoothly
  // (an arm lying across a long strand would otherwise swing with the hair and stretch).
  const body = Math.min(...dist.filter((_, i) => !(BONES[i] as string).startsWith('hair') && BONES[i] !== 'static'));
  const hairGate = Math.min(1, Math.max(0, (body - 0.015) / 0.07)) ** 2;
  const all: { i: number; w: number }[] = [];
  dist.forEach((d, i) => {
    if (d === Infinity) return;
    const name = BONES[i] as BoneName;
    const gate = name.startsWith('hair') ? hairGate : 1;
    all.push({ i, w: ((REACH[name] ?? 1) * gate) / (d + EPS) ** POWER });
  });
  all.sort((a, b) => b.w - a.w);
  const top = all.slice(0, 4);
  const sum = top.reduce((s, x) => s + x.w, 0);
  while (top.length < 4) top.push({ i: 0, w: 0 });
  return { idx: top.map((x) => x.i), w: top.map((x) => x.w / sum) };
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
const rot = (v: P, a: number): P => [Math.cos(a) * v[0] - Math.sin(a) * v[1], Math.sin(a) * v[0] + Math.cos(a) * v[1]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const len = (a: P): number => Math.hypot(a[0], a[1]);
const ang = (a: P): number => Math.atan2(a[1], a[0]);

/** Two-bone IK: the knee for a hip at h, a pinned ankle at a, segment lengths l1, l2, on the side `side`. */
const knee = (h: P, a: P, l1: number, l2: number, side: number): P => {
  const d = Math.min(len(sub(a, h)), l1 + l2 - 1e-6);
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const base = ang(sub(a, h));
  return add(h, rot([l1, 0], base + side * Math.acos(cosA)));
};

export interface Frame { xf: Xf[]; joints: Record<string, P> }

/** Bone transforms of a card at t seconds. Pure function of (joints, t, dance). */
export const rigFrame = (j: Joints, t: number, d: Dance = DANCE): Frame => {
  const E = d.energy;
  const bp = beatPos(t);
  const fr = bp - Math.floor(bp);
  // downbeats are beats with index % 4 == 1 (mc-timing.json downbeat_note)
  const bar = (bp - 1) / 4;
  const sway = E * 0.03 * Math.sin(TAU * bar);
  const dip = E * 0.024 * (0.5 + 0.5 * Math.cos(TAU * fr)) ** 2;
  const lean = -E * 0.065 * Math.sin(TAU * bar + 0.35);
  const chest = E * 0.045 * Math.sin(Math.PI * bp + 0.3);
  const nod = E * 0.075 * Math.sin(Math.PI * (bp - 0.18));
  const breath = 0.0022 * Math.sin((TAU * t) / 3.4);
  const armU = E * d.arms * 0.1;
  const armF = E * d.arms * 0.08;

  const H = j.hips;
  const legs = (['L', 'R'] as const).filter((s) => j.legs[s]).map((s) => {
    const k = (s === 'L' ? j.lKnee : j.rKnee) as P;
    const a = (s === 'L' ? j.lAnkle : j.rAnkle) as P;
    const l1 = len(sub(k, H));
    const l2 = len(sub(a, k));
    const cr = (a[0] - H[0]) * (k[1] - H[1]) - (a[1] - H[1]) * (k[0] - H[0]);
    // bend the knee the way it is bent at rest; a straight rest leg bends outward, away from the body
    const side = Math.abs(cr) > 1e-4 * l1 * l2 ? -Math.sign(cr) : k[0] < H[0] ? -1 : 1;
    return { s, k, a, l1, l2, d0: len(sub(a, H)), side };
  });
  // Hip offset: the sway and the beat dip, plus whatever extra dip keeps every leg within its rest reach
  // (so IK never has to stretch a leg). Bisection: closed form per frame, deterministic.
  const reach = (extra: number) => legs.every((g) => len(sub(g.a, [H[0] + sway, H[1] - dip - extra])) <= g.d0 + 1e-9);
  let extra = 0;
  if (!reach(0)) {
    let lo = 0;
    let hi = 0.08;
    for (let i = 0; i < 24; i++) {
      const m = (lo + hi) / 2;
      if (reach(m)) hi = m;
      else lo = m;
    }
    extra = hi;
  }
  const hasLegs = legs.length > 0;
  const H2: P = hasLegs ? [H[0] + sway, H[1] - dip - extra] : H;
  // Close-ups pivot on the pinned bottom edge, so the "sway" becomes a rock of the whole bust.
  const spineTheta = hasLegs ? lean : lean * 0.5 - sway * 1.2;
  const xf: Xf[] = BONES.map(() => ID);
  const set = (b: BoneName, x: Xf) => {
    xf[BONES.indexOf(b)] = x;
  };
  const spine: Xf = { theta: spineTheta, p: H, q: H2 };
  set('spine', spine);
  const C2 = add(apply(spine, j.chest), [0, breath]);
  const upperT = spineTheta + chest;
  const upper: Xf = { theta: upperT, p: j.chest, q: C2 };
  set('upper', upper);
  const N2 = apply(upper, j.neck);
  const headT = upperT + nod;
  const head: Xf = { theta: headT, p: j.neck, q: N2 };
  set('head', head);
  const joints: Record<string, P> = { hips: H2, chest: C2, neck: N2, head: apply(head, j.head) };
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
  for (const g of legs) {
    const K2 = knee(H2, g.a, g.l1, g.l2, g.side);
    const thigh: Xf = { theta: ang(sub(K2, H2)) - ang(sub(g.k, H)), p: H, q: H2 };
    const shin: Xf = { theta: ang(sub(g.a, K2)) - ang(sub(g.a, g.k)), p: g.k, q: K2 };
    set(g.s === 'L' ? 'thighL' : 'thighR', thigh);
    set(g.s === 'L' ? 'shinL' : 'shinR', shin);
    joints[`${g.s.toLowerCase()}Knee`] = K2;
    joints[`${g.s.toLowerCase()}Ankle`] = apply(shin, g.a);
  }
  if (j.hairRoot) {
    const R2 = apply(head, j.hairRoot);
    // Hair follows through: the same bar and beat motion, lagged, with a little overshoot (hair only).
    const follow = E * (0.085 * Math.sin(TAU * bar - 1.15) + 0.05 * Math.sin(Math.PI * bp - 1.0) + 0.02 * Math.sin(Math.PI * 2 * bp - 2.0));
    j.hairTips.forEach((_, k) => {
      set(`hair${k}` as BoneName, { theta: headT + follow * (1 - 0.2 * k), p: j.hairRoot as P, q: R2 });
    });
  }
  return { xf, joints };
};

/** Deform one point with given weights. */
export const deform = (f: Frame, v: P, w: { idx: number[]; w: number[] }): P => {
  let x = 0;
  let y = 0;
  for (let k = 0; k < 4; k++) {
    const wk = w.w[k] as number;
    if (!wk) continue;
    const p = apply(f.xf[w.idx[k] as number] as Xf, v);
    x += p[0] * wk;
    y += p[1] * wk;
  }
  return [x, y];
};
