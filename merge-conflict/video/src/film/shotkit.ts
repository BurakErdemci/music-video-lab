// What the shot tables share (verses, round 6; verse 3 through the solo, round 7): the camera variants of a world's
// hero move, the girl-pose lookup and the current shot. Node-safe.
import { blendPose, type CameraPose, type Vec3 } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';
import { clamp01 } from '../lib/ease.ts';
import { FLOOR_Y } from '../stage/floor.ts';

export interface Hero { from: CameraPose; to: CameraPose }
/** Camera variants of a world's hero move: as authored, closer on the girl, from below, travelling back, wider. */
export type CamVariant = 'hero' | 'close' | 'low' | 'reverse' | 'wide';
export interface Pose { t: number; card: string | null; at?: Placement }

const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** A camera variant of the hero move at progress k, around the girl at `focus` (world, chest height). */
export const variant = (h: Hero, v: CamVariant, k: number, focus: Vec3): CameraPose => {
  const p = blendPose(h.from, h.to, k);
  switch (v) {
    case 'close':
      return { ...p, position: lerp3(p.position, [focus[0] * 0.6, focus[1] + 0.3, focus[2] + 6.2], 0.75), target: lerp3(p.target, focus, 0.8), fov: 38 };
    case 'low':
      return { ...p, position: [p.position[0] * 0.8 + focus[0] * 0.2, FLOOR_Y + 0.6, p.position[2] * 0.8 + 1], target: [p.target[0], p.target[1] + 1.6, p.target[2]], fov: p.fov + 6 };
    case 'reverse': {
      const r = blendPose(h.to, h.from, k);
      return { ...r, position: [-r.position[0] - 1.5, r.position[1], r.position[2]] };
    }
    case 'wide':
      return { ...p, position: lerp3(p.target, p.position, 1.35) };
    default:
      return p;
  }
};

/** The pose a girl holds at t (null before her first entry or while hidden). */
export const poseAt = (list: readonly Pose[], t: number): Pose | null => {
  let p: Pose | null = null;
  for (const e of list) if (t >= e.t - 1e-9) p = e;
  return p && p.card ? p : null;
};

/** The shot playing at t and how far into it (0..1) the frame is. */
export const shotIn = <S extends { t: number }>(shots: readonly S[], t: number): { shot: S; k: number } => {
  let i = 0;
  for (let j = 0; j < shots.length; j++) if (t >= (shots[j] as S).t - 1e-9) i = j;
  const shot = shots[i] as S;
  const end = shots[i + 1]?.t ?? shot.t + 1;
  return { shot, k: clamp01((t - shot.t) / (end - shot.t)) };
};

/** The girl's chest in world space, the point the close and low variants frame. */
export const focusOf = (p: Pose | null): Vec3 => (p?.at ? [p.at.x, (p.at.feet ?? FLOOR_Y) + p.at.height * 0.62, p.at.z ?? 0] : [0, 0, 0]);
