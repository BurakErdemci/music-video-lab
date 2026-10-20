// One painting-stage shot: the impact camera, the single Stage, the recipe overlays, the HUD and the shot frame.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { anglesFromDir, type CameraPath, type CameraPose } from '../../camera/api.ts';
import { Stage } from '../../stage/Stage.tsx';
import type { Vec3 } from '../../stage/Card.tsx';
import { gradeCues, type DuotoneCue } from '../../vfx/effects.ts';
import { at } from './events.ts';
import { Hud, hudAt, ImpactLayer, impactCamera, impactRoll, type HudState, type Impact } from './fx.tsx';
import { clamp01, INK, IVORY, lerp, ShotFrame } from './kit.tsx';

export interface Ctx {
  frame: number;
  pose: CameraPose;
  /** Impact-frame silhouette pass is on. */
  sil: boolean;
}

export interface PaintingShotProps {
  frame: number;
  camera: CameraPath;
  impacts?: readonly Impact[];
  cues?: readonly DuotoneCue[];
  /** Cards and the rig (inside the one Stage). */
  stage: (c: Ctx) => ReactNode;
  /** 2D overlays above the stage (under the grade). */
  overlay?: (c: Ctx) => ReactNode;
  /** Layers above the grade (captions). */
  top?: (c: Ctx) => ReactNode;
  /** Show the painted health bar (default from its slam-in on). */
  hud?: boolean | ((h: HudState) => HudState);
  /** Base screen roll (Dutch angle), degrees. */
  dutch?: number;
}

/** The health bar's schedule, all from part 1 events. */
export const HUD_EVENTS = {
  in: at('s07-clash'), chip1: at('s12-bash'), regen1: at('s12-regen'), chip2: at('s16-explosion'), regen2: at('s16-gust'),
  fall2: at('s19-strike'), pip1: at('s23-pip-1'), pip2: at('s23-pip-2'), pip3: at('s23-pip-3'), fall3: at('s25-phase3'), pulse: 20,
};

/** Every card faces +z: seen from the side or behind, their flatness shows (director, 20 Oct). Cameras look within
 * this many degrees of straight down -z; variety comes from height, lens, distance, framing and dolly/truck. */
export const MAX_YAW = 15;
const assertFrontal = (pose: CameraPose, frame: number) => {
  const d: [number, number, number] = [pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]];
  const yaw = anglesFromDir(d).yaw;
  if (Math.abs(yaw) > MAX_YAW + 0.5) throw new Error(`p1 f${frame}: camera yaw ${yaw.toFixed(1)} deg, limit ${MAX_YAW}`);
};

export const PaintingShot = ({ frame, camera, impacts = [], cues, stage, overlay, top, hud = true, dutch = 0 }: PaintingShotProps) => {
  assertFrontal(camera(frame), frame);
  const cam = impactCamera(camera, impacts);
  const pose = cam(frame);
  // The impact-frame silhouette (N, N+1) is the collision table's hard ink/ivory DuotoneFlash cue. Toggling the
  // cards' own flat-colour mode instead left the canvas dark for the rest of the shot in sequential renders
  // (measured 20 Oct: every frame after N+3 of S07 in a --concurrency=1 render).
  const sil = false;
  const silCues = impacts.some((i) => i.sil) ? gradeCues(impacts.filter((i) => i.sil).map((i) => ({ at: { frame: i.at }, grade: 'POSTER' as const, hold: 2 })), 'p1 silhouette') : undefined;
  const posterOn = !!silCues && impacts.some((i) => i.sil && frame >= i.at && frame <= i.at + 1);
  const c: Ctx = { frame, pose, sil };
  const h0 = hud ? hudAt(frame, HUD_EVENTS) : null;
  const h = h0 && typeof hud === 'function' ? hud(h0) : h0;
  return (
    <ShotFrame
      frame={frame}
      cues={cues ?? silCues}
      roll={dutch + impactRoll(frame, impacts)}
      over={
        <>
          {h ? <Hud frame={frame} s={h} /> : null}
          {top?.(c)}
        </>
      }
    >
      <AbsoluteFill style={{ background: sil ? IVORY : INK }}>
        <Stage camera={() => pose}>{stage(c)}</Stage>
      </AbsoluteFill>
      {posterOn ? null : <ImpactLayer frame={frame} impacts={impacts} pose={pose} />}
      {posterOn ? null : overlay?.(c)}
    </ShotFrame>
  );
};

// ---- hero motion helpers (painting-space units, frames) ----

/** A thrown or struck hero: from `a` to `b` over [start, start + n) with an apex `h` above the straight line. */
export const arc = (frame: number, start: number, n: number, a: Vec3, b: Vec3, h: number): Vec3 => {
  const t = clamp01((frame - start) / n);
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t) + 4 * h * t * (1 - t), lerp(a[2], b[2], t)];
};
/** Spin of a flying hero: 360 degrees per 12 frames (storyboard 1 §0.2). */
export const spin = (frame: number, start: number, dir = 1): number => (frame < start ? 0 : (-dir * 360 * (frame - start)) / 12);
/** Small hop of a hero on twos (life on a standing figure). */
export const bob = (frame: number, seed: number, amp = 0.05): number => amp * Math.abs(Math.sin(((frame - (frame % 2)) / 30) * Math.PI * 2 * 1.5 + seed));
