// Pose = a few absolute segment angles in degrees, drawn facing right (figures flip with scaleX).
// Limb angle 0 = pointing straight down, +90 = forward and horizontal, +180 = straight up.
// lean = torso tilt from vertical (+ = forward). Add a pose by adding one entry to POSES.
import { lerp } from '../math.ts';

export interface Pose {
  lean: number;
  head: number;
  /** [upper, lower] absolute angles. N = near the viewer (drawn on top), F = far. */
  armN: [number, number];
  armF: [number, number];
  legN: [number, number];
  legF: [number, number];
}

export const POSES = {
  stand: { lean: 0, head: 0, armN: [6, 3], armF: [-5, -2], legN: [5, 5], legF: [-5, -5] },
  palmOnGlass: { lean: 4, head: 2, armN: [62, 92], armF: [10, 8], legN: [4, 4], legF: [-6, -6] },
} as const satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;

export const resolvePose = (p: PoseName | Pose): Pose => (typeof p === 'string' ? POSES[p] : p);

export const blendPose = (a: Pose, b: Pose, t: number): Pose => {
  const m = (x: number, y: number): number => lerp(x, y, t);
  const m2 = (x: [number, number], y: [number, number]): [number, number] => [m(x[0], y[0]), m(x[1], y[1])];
  return {
    lean: m(a.lean, b.lean),
    head: m(a.head, b.head),
    armN: m2(a.armN, b.armN),
    armF: m2(a.armF, b.armF),
    legN: m2(a.legN, b.legN),
    legF: m2(a.legF, b.legF),
  };
};

export interface Dims {
  thigh: number;
  shin: number;
  torso: number;
  upperArm: number;
  foreArm: number;
  headR: number;
  neck: number;
  foot: number;
}
export interface P {
  x: number;
  y: number;
}
export interface Skeleton {
  pelvis: P;
  shoulder: P;
  head: P;
  elbowN: P;
  handN: P;
  elbowF: P;
  handF: P;
  kneeN: P;
  ankleN: P;
  toeN: P;
  kneeF: P;
  ankleF: P;
  toeF: P;
  /** unit vectors along the torso: up and forward */
  up: P;
  fwd: P;
}

const rad = (d: number): number => (d * Math.PI) / 180;
const down = (deg: number, len: number): P => ({ x: Math.sin(rad(deg)) * len, y: Math.cos(rad(deg)) * len });
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });

/** Local space: origin at the floor between the feet, x forward, y down. */
export const solve = (pose: Pose, d: Dims): Skeleton => {
  const legReach = (l: [number, number]): number => d.thigh * Math.cos(rad(l[0])) + d.shin * Math.cos(rad(l[1]));
  const pelvis: P = { x: 0, y: -Math.max(legReach(pose.legN), legReach(pose.legF)) };
  const up: P = { x: Math.sin(rad(pose.lean)), y: -Math.cos(rad(pose.lean)) };
  const fwd: P = { x: Math.cos(rad(pose.lean)), y: Math.sin(rad(pose.lean)) };
  const shoulder = add(pelvis, { x: up.x * d.torso, y: up.y * d.torso });
  const hd = rad(pose.lean + pose.head);
  const head = add(shoulder, { x: Math.sin(hd) * (d.neck + d.headR), y: -Math.cos(hd) * (d.neck + d.headR) });
  const arm = (a: [number, number]): [P, P] => {
    const elbow = add(shoulder, down(a[0], d.upperArm));
    return [elbow, add(elbow, down(a[1], d.foreArm))];
  };
  const leg = (l: [number, number]): [P, P, P] => {
    const knee = add(pelvis, down(l[0], d.thigh));
    const ankle = add(knee, down(l[1], d.shin));
    return [knee, ankle, add(ankle, { x: d.foot, y: 0 })];
  };
  const [elbowN, handN] = arm(pose.armN);
  const [elbowF, handF] = arm(pose.armF);
  const [kneeN, ankleN, toeN] = leg(pose.legN);
  const [kneeF, ankleF, toeF] = leg(pose.legF);
  return { pelvis, shoulder, head, elbowN, handN, elbowF, handF, kneeN, ankleN, toeN, kneeF, ankleF, toeF, up, fwd };
};
