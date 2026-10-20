// Camera moves: pure functions of the frame returning a CameraPath. World units, see framing.ts.
import { Easing } from 'remotion';
import { seeded } from '../vfx/seeded.ts';
import type { Vec3 } from '../stage/Card.tsx';
import { DEFAULT_FOV, type CameraPath, type CameraPose } from '../stage/Stage.tsx';
import { add, anglesFromDir, basis, clamp01, dirFromAngles, len, lerp, lerp3, norm, rad, scale, sub } from './math.ts';

export type Ease = (t: number) => number;
/** Default ease for every move: slow in, slow out. */
export const EASE: Ease = Easing.inOut(Easing.cubic);

export interface Timed {
  /** First frame of the move. */
  start: number;
  /** Length in frames. */
  frames: number;
  ease?: Ease;
}
const progress = (frame: number, m: Timed): number => (m.ease ?? EASE)(clamp01((frame - m.start) / Math.max(1, m.frames)));

export const blendPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: lerp3(a.position, b.position, t),
  target: lerp3(a.target, b.target, t),
  fov: lerp(a.fov ?? DEFAULT_FOV, b.fov ?? DEFAULT_FOV, t),
});

/** Locked-off shot. */
export const hold = (pose: CameraPose): CameraPath => () => pose;

/** Straight interpolation between two poses (position, target and fov). */
export const tween = (from: CameraPose, to: CameraPose, m: Timed): CameraPath => (frame) => blendPose(from, to, progress(frame, m));

/** Dolly along the view direction: positive `distance` pushes in, negative pulls back. Target stays put. */
export const dolly = (pose: CameraPose, m: Timed & { distance: number }): CameraPath => {
  const fwd = norm(sub(pose.target, pose.position));
  return (frame) => ({ ...pose, position: add(pose.position, scale(fwd, m.distance * progress(frame, m))) });
};
export const push = (pose: CameraPose, m: Timed & { distance: number }): CameraPath => dolly(pose, { ...m, distance: Math.abs(m.distance) });
export const pull = (pose: CameraPose, m: Timed & { distance: number }): CameraPath => dolly(pose, { ...m, distance: -Math.abs(m.distance) });

/**
 * Crane: the camera rises (or sinks) by `lift` while its look-at point moves by `targetLift` (default 0,
 * so the camera tilts down while rising and the subject stays framed). Pass targetLift = lift for a pedestal.
 */
export const crane = (pose: CameraPose, m: Timed & { lift: number; targetLift?: number }): CameraPath => (frame) => {
  const p = progress(frame, m);
  return { ...pose, position: add(pose.position, [0, m.lift * p, 0]), target: add(pose.target, [0, (m.targetLift ?? 0) * p, 0]) };
};

/** Rotate the look direction around the camera position by yaw/pitch degrees (positive yaw = towards +X, pitch = up). */
export const pan = (pose: CameraPose, m: Timed & { yaw?: number; pitch?: number }): CameraPath => {
  const d = sub(pose.target, pose.position);
  const dist = len(d);
  const a = anglesFromDir(d);
  return (frame) => {
    const p = progress(frame, m);
    const dir = dirFromAngles(a.yaw + (m.yaw ?? 0) * p, a.pitch + (m.pitch ?? 0) * p);
    return { ...pose, target: add(pose.position, scale(dir, dist)) };
  };
};
export const tilt = (pose: CameraPose, m: Timed & { pitch: number }): CameraPath => pan(pose, m);

/** Fast pan. Defaults to a short, front-loaded move; pair it with `whipBlur` for a motion-blur hint. */
export const whip = (pose: CameraPose, m: Omit<Timed, 'frames'> & { frames?: number; yaw: number; pitch?: number }): CameraPath =>
  pan(pose, { frames: 6, ease: Easing.inOut(Easing.exp), ...m });

/** 0..1 blur strength during a whip (peaks mid-move). The Stage has no motion blur; this is only a hint for an overlay. */
export const whipBlur = (frame: number, start: number, frames = 6): number => {
  const t = (frame - start) / frames;
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
};

/** Small arc around the look-at point (rotation about +Y through the target), `arc` degrees. */
export const orbit = (pose: CameraPose, m: Timed & { arc: number }): CameraPath => {
  const r = sub(pose.position, pose.target);
  return (frame) => {
    const a = rad(m.arc * progress(frame, m));
    const c = Math.cos(a);
    const s = Math.sin(a);
    return { ...pose, position: add(pose.target, [r[0] * c + r[2] * s, r[1], -r[0] * s + r[2] * c]) };
  };
};

/** Zoom by changing the lens only (no parallax). */
export const zoom = (pose: CameraPose, m: Timed & { fov: number }): CameraPath => (frame) => ({
  ...pose,
  fov: lerp(pose.fov ?? DEFAULT_FOV, m.fov, progress(frame, m)),
});

/** Evaluates `path` on twos (15 fps poses), as the scene map asks for big pose changes. */
export const onTwos = (path: CameraPath): CameraPath => (frame) => path(frame - (((frame % 2) + 2) % 2));

export interface HandheldOptions {
  /** Peak offset in world units (position and target move together, so it never rotates the view much). */
  amp?: number;
  seed?: number | string;
  /** Drift speed in cycles per second at 30 fps. */
  rate?: number;
}
/**
 * Seeded handheld "life": slow drift on the camera's right/up axes plus a hint of depth wobble, every frame.
 * Peak offset on each axis is bounded by `amp` (the three sines per axis are weighted to sum to 1).
 */
export const handheld = (path: CameraPath, { amp = 0.04, seed = 'handheld', rate = 0.55 }: HandheldOptions = {}): CameraPath => {
  const rng = seeded(`handheld:${seed}`);
  const axes = [0, 1, 2].map(() => [0, 1, 2].map(() => ({ w: rng.range(0.5, 1.7) * rate * 2 * Math.PI, ph: rng() * Math.PI * 2 })));
  const wsum = 1 + 0.5 + 0.25;
  return (frame) => {
    const pose = path(frame);
    const t = frame / 30;
    const n = (k: number): number => axes[k]!.reduce((s, a, i) => s + Math.sin(a.w * t * (1 + i * 0.9) + a.ph) / 2 ** i, 0) / wsum;
    const { fwd, right, up } = basis(pose.position, pose.target);
    const off = add(add(scale(right, amp * n(0)), scale(up, amp * n(1))), scale(fwd, amp * 0.5 * n(2)));
    return { ...pose, position: add(pose.position, off), target: add(pose.target, off) };
  };
};

export interface Segment {
  /** Frame on which this path takes over. */
  from: number;
  path: CameraPath;
  /** Frames over which to blend from the previous path (0 or omitted = hard cut). */
  blend?: number;
  ease?: Ease;
}
/** Cuts or blends between paths. Segments must be in ascending `from` order; before the first, the first path is used. */
export const sequence = (segments: readonly Segment[]): CameraPath => {
  if (segments.length === 0) throw new Error('sequence needs at least one segment');
  return (frame) => {
    let i = 0;
    while (i + 1 < segments.length && frame >= segments[i + 1]!.from) i++;
    const seg = segments[i]!;
    const prev = segments[i - 1];
    if (prev && seg.blend && frame < seg.from + seg.blend) {
      return blendPose(prev.path(frame), seg.path(frame), (seg.ease ?? EASE)((frame - seg.from) / seg.blend));
    }
    return seg.path(frame);
  };
};
