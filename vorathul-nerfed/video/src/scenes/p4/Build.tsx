// S81-S90, the build: awareness step 4. Cracks grow from his palm one step per downbeat; the shots alternate between inside
// the painting and the office wall, and from S89 every cut flips the world with the crack kept at the same screen position.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { blendPose, frameAt, OFF_WIDE } from '../../camera/api.ts';
import { Stage, type CameraPath, type CameraPose } from '../../stage/Stage.tsx';
import { Monitor, ForumCard, C, UiFonts } from '../../ui/kit.ts';
import { ImpactBurst, Overlay, SpeedLines, VIOLET, IVORY, GOLD, INK } from '../../vfx/effects.ts';
import { seeded } from '../../vfx/seeded.ts';
import { CRACK_STEPS, CUE } from './cues.ts';
import { Cathedral, Hero } from './inside.tsx';
import { DevHead } from './People.tsx';
import { InsideCracks, OfficeCracks, OfficeStage, WallItems } from './office.tsx';
import { jointWorld } from './rigline.ts';
import { CANVAS, CANVAS_CAM, H, PALM_UV, W, clamp01, easeInOut, officeCam, paintingWorld, project, prog, twos } from './lib.ts';

const DRAIN = 'saturate(0.8)';

/** Camera kicks on the crack steps (and any extra cue): a short decaying jolt, applied to position and target alike. */
const kicked = (path: CameraPath, cues: readonly number[], amp = 0.07, len = 9): CameraPath => (frame) => {
  const pose = path(frame);
  let dx = 0;
  let dy = 0;
  cues.forEach((c, i) => {
    const t = frame - c;
    if (t < 0 || t >= len) return;
    const k = (1 - t / len) ** 2 * amp;
    dx += Math.sin(i * 2.7 + t * 2.1) * k;
    dy += Math.cos(i * 1.9 + t * 2.6) * k;
  });
  return { ...pose, position: [pose.position[0] + dx, pose.position[1] + dy, pose.position[2]], target: [pose.target[0] + dx, pose.target[1] + dy, pose.target[2]] };
};

const PALM_WORLD: [number, number] = [CANVAS.cx - CANVAS.w / 2 + PALM_UV[0] * CANVAS.w, CANVAS.cy + CANVAS.h / 2 - PALM_UV[1] * CANVAS.h];

interface InsideProps { frame: number; camera: CameraPath; children?: (pose: CameraPose) => ReactNode }

/** The painting world seen from inside, with the crack on the canvas in front of everything. */
const Inside = ({ frame, camera, children }: InsideProps) => {
  const pose = camera(frame);
  return (
    <AbsoluteFill style={{ background: '#F4ECD8' }}>
      <AbsoluteFill style={{ filter: DRAIN }}>
        <Stage camera={camera}>
          <Cathedral banners={false} />
          <Hero frame={frame} />
        </Stage>
      </AbsoluteFill>
      <InsideCracks frame={frame} pose={pose} />
      {children ? children(pose) : null}
    </AbsoluteFill>
  );
};

interface OfficeProps { frame: number; camera: CameraPath; children?: (pose: CameraPose) => ReactNode; wall?: boolean }

/** The office wall with the cracked painting and what the players have stuck up so far. */
const Office = ({ frame, camera, children, wall = true }: OfficeProps) => {
  const pose = camera(frame);
  return (
    <AbsoluteFill style={{ background: '#E9ECEF' }}>
      <OfficeStage camera={camera} />
      <OfficeCracks frame={frame} pose={pose} />
      {wall ? <WallItems frame={frame} pose={pose} /> : null}
      {children ? children(pose) : null}
    </AbsoluteFill>
  );
};

const drift = (pose: CameraPose, from: number, frames: number, towards: number): CameraPath => (frame) => {
  const t = easeInOut(prog(frame, from, frames));
  const fwd: [number, number, number] = [pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]];
  const len = Math.hypot(fwd[0], fwd[1], fwd[2]);
  const k = (towards * t) / len;
  return { ...pose, position: [pose.position[0] + fwd[0] * k, pose.position[1] + fwd[1] * k, pose.position[2] + fwd[2] * k] };
};

const KICKS = [...CRACK_STEPS];

// ---- inside cameras ----
const IN_MED: CameraPath = kicked((f) => blendPose(CANVAS_CAM, frameAt([0.1, 4.0, CANVAS.z], 8.8), easeInOut(prog(f, CUE.s81cut.frame, 77))), KICKS);
const IN_CLOSE: CameraPath = kicked(drift(frameAt([-0.1, 3.9, CANVAS.z], 6.6), CUE.s83cut.frame, 78, 0.8), [...KICKS, CUE.s83branch.frame, CUE.s83punch.frame], 0.07);
const IN_ECU: CameraPath = kicked(drift(frameAt([-0.2, 3.85, CANVAS.z], 2.7), CUE.s85cut.frame, 39, 0.3), KICKS);
const IN_CLOSE2: CameraPath = kicked(drift(frameAt([0.5, 3.7, CANVAS.z], 5.2), CUE.s87cut.frame, 39, 0.5), KICKS);
/** S89-S90 inside: a slow pull back from the palm until the whole canvas fills the frame (the crack then touches its edge). */
const IN_PULL: CameraPath = kicked(
  (f) => {
    const t = easeInOut(prog(f, CUE.s89a.frame, CUE.s90e.frame - CUE.s89a.frame));
    const vis = 6.6 + (CANVAS.h - 6.6) * t;
    return frameAt([0.2 * (1 - t), 3.9 + 0.3 * t, CANVAS.z], vis);
  },
  [...KICKS, CUE.s90a2.frame, CUE.s90b2.frame, CUE.s90c2.frame, CUE.s90d2.frame, CUE.s90e2.frame],
  0.09,
);

// ---- office cameras ----
const palmScreen = (pose: CameraPose): [number, number] => project(pose, [PALM_WORLD[0], PALM_WORLD[1], CANVAS.z]) as [number, number];

/** Office camera at `distance` that puts the crack origin on screen position (sx, sy): the crack keeps its place across a world flip. */
const officeCamFor = (distance: number, sx: number, sy: number): CameraPose => {
  const p = paintingWorld();
  const x0 = p.cx - p.w / 2 + PALM_UV[0] * p.w;
  const y0 = p.cy + p.h / 2 - PALM_UV[1] * p.h;
  const k = H / (2 * distance * Math.tan((40 * Math.PI) / 360));
  return officeCam(distance, x0 - (sx - W / 2) / k, y0 + (sy - H / 2) / k);
};
const OFF_STROBE: CameraPath = kicked(
  (f) => {
    const [sx, sy] = palmScreen(IN_PULL(f));
    return officeCamFor(14, sx, sy);
  },
  [...KICKS, CUE.s90a2.frame, CUE.s90b2.frame, CUE.s90c2.frame, CUE.s90d2.frame, CUE.s90e2.frame],
  0.1,
);

// ---- small effects ----
/** Chips of dry paint falling from the crack (S81, "canvas dust falls"). */
const DustFall = ({ frame, start, seed = 5 }: { frame: number; start: number; seed?: number }) => {
  const f = twos(frame);
  const t0 = f - start;
  if (t0 < 0 || t0 > 44) return null;
  const rng = seeded(`dustfall:${seed}`);
  return (
    <Overlay>
      {Array.from({ length: 34 }, (_, i) => {
        const x = rng.range(0.22, 0.82) * W;
        const y0 = rng.range(0.25, 0.6) * H;
        const delay = rng.range(0, 14);
        const t = t0 - delay;
        if (t < 0) return null;
        const g = 0.9 + rng() * 0.8;
        const s = rng.range(3, 9);
        return <rect key={i} x={x + Math.sin(i + t / 5) * 6} y={y0 + g * t * t * 0.55} width={s} height={s * rng.range(0.6, 1.4)} fill={i % 3 === 0 ? INK : i % 3 === 1 ? IVORY : GOLD} opacity={clamp01(1 - t / 36)} transform={`rotate(${t * 11} ${x} ${y0})`} />;
      })}
    </Overlay>
  );
};

const worldPx = (pose: CameraPose, p: [number, number, number]): [number, number] => project(pose, p) ?? [W / 2, H / 2];

// ---- the shots ----
/** S81 03:18.20: MED inside, front. Awareness step 4: crack 1 opens under his palm on the downbeat. */
export const S81 = ({ frame }: { frame: number }) => (
  <Inside frame={frame} camera={IN_MED}>{() => <DustFall frame={frame} start={CUE.s81dust.frame} />}</Inside>
);

const MONITOR_W = 700;
/** S82 03:20.77: OFF-MED on the monitors. Forum cards pop up; the painting behind shows each new crack step. */
export const S82 = ({ frame }: { frame: number }) => {
  const cam = kicked(drift(officeCam(14, 0, 0.35), CUE.s82cut.frame, 77, 0.6), KICKS);
  return (
    <Office frame={frame} camera={cam}>
      {() => (
        <>
          <UiFonts />
          <Monitor x={40} y={650} width={MONITOR_W} screen={C.white}>
            <ForumCard frame={frame} popAt={CUE.s82cut.frame} x={170} y={14} width={860} title="bring back phase 3" votes={214} replies={38} rotate={-1} />
            <ForumCard frame={frame} popAt={CUE.s82forum2.frame} x={170} y={342} width={860} title="boss is a tutorial now 2/10" votes={873} replies={120} rotate={1} author="gamer_77" />
          </Monitor>
          <Monitor x={W - MONITOR_W - 40} y={650} width={MONITOR_W} screen={C.white}>
            <ForumCard frame={frame} popAt={CUE.s82forum3.frame} x={170} y={170} width={860} title="#UnnerfVorathul" votes={1500} replies={402} rotate={-1} author="mod_team" />
          </Monitor>
        </>
      )}
    </Office>
  );
};

/** S83 03:23.33: CLOSE inside. The cracks branch across the sky; on beat[627] his free fist punches the canvas beside the palm. */
export const S83 = ({ frame }: { frame: number }) => {
  const rel = frame - CUE.s83punch.frame;
  return (
    <Inside frame={frame} camera={IN_CLOSE}>
      {(pose) => {
        const fist = worldPx(pose, jointWorld(CUE.s83punch.frame, 'hand_L'));
        return (
          <>
            <ImpactBurst frame={rel} duration={12} seed={83} x={fist[0]} y={fist[1]} size={230} flash={0} />
            <SpeedLines mode="radial" frame={rel} duration={7} seed={84} focus={fist} count={36} thickness={60} inner={190} color={INK} />
          </>
        );
      }}
    </Inside>
  );
};

/** S84 03:25.93: OFF-WIDE. Posters go up on the wall round the painting, a petition bar climbs one step per beat. */
export const S84 = ({ frame }: { frame: number }) => (
  <Office frame={frame} camera={kicked(drift(OFF_WIDE, CUE.s84cut.frame, 77, 0.8), KICKS)} />
);

/** S85 03:28.50: ECU on the gauntlet. Crack 9 runs out from between his spread fingers. */
export const S85 = ({ frame }: { frame: number }) => <Inside frame={frame} camera={IN_ECU} />;

/** S86 03:29.80: OFF-MED on the frame. Sticky notes multiply round the painting. */
export const S86 = ({ frame }: { frame: number }) => (
  <Office frame={frame} camera={kicked(drift(officeCam(14, 0, 0), CUE.s86cut.frame, 38, 0.5), KICKS)} />
);

/** S87 03:31.07: CLOSE inside. Crack 11; on hit[77] the eye slit flares violet for the first time since the patch. */
export const S87 = ({ frame }: { frame: number }) => (
  <Inside frame={frame} camera={IN_CLOSE2}>
    {(pose) => {
      const eye = worldPx(pose, jointWorld(CUE.s87flare.frame, 'eye_slit'));
      const t = frame - CUE.s87flare.frame;
      const a = t < 0 ? 0 : t < 4 ? 0.8 : 0.8 - 0.55 * clamp01((t - 4) / 24);
      return (
        <Overlay>
          <defs>
            <radialGradient id="p4-flare">
              <stop offset="0" stopColor={VIOLET} stopOpacity="0.9" />
              <stop offset="1" stopColor={VIOLET} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={eye[0]} cy={eye[1]} r={280} fill="url(#p4-flare)" opacity={a} />
        </Overlay>
      );
    }}
  </Inside>
);

/** S88 03:32.37: OFF-MED on the bored developer. He turns, sees the cracked painting, and coffee spurts out of his mouth. */
export const S88 = ({ frame }: { frame: number }) => {
  const cam = kicked(drift(officeCam(12, -3.2, -2.5), CUE.s88cut.frame, 39, 0.4), KICKS);
  return (
    <Office frame={frame} camera={cam}>
      {(pose) => {
        const head = worldPx(pose, [-3.77, -1.63, -20]);
        const k = (project(pose, [1, 0, -20]) as [number, number])[0] - (project(pose, [0, 0, -20]) as [number, number])[0];
        return <DevHead frame={frame} turnAt={CUE.s88cut.frame + 6} spurtAt={CUE.s88spurt.frame} x={head[0]} y={head[1]} r={0.9 * k} seed={7} />;
      }}
    </Office>
  );
};

/** Frames on which the strobe flips: inside on the first, then alternating every two beats. */
const FLIPS = [
  CUE.s89a, CUE.s89b, CUE.s89c, CUE.s89d, CUE.s89e, CUE.s89f, CUE.s89g, CUE.s89h,
  CUE.s90a, CUE.s90b, CUE.s90c, CUE.s90d, CUE.s90e, CUE.s90f,
].map((c) => c.frame);
const isInside = (frame: number): boolean => FLIPS.filter((f) => f <= frame).length % 2 === 1;

const Strobe = ({ frame }: { frame: number }) =>
  isInside(frame) ? <Inside frame={frame} camera={IN_PULL} /> : <Office frame={frame} camera={OFF_STROBE} />;

/** S89 03:33.67: a hard cut every two beats, painting gold and office grey; the crack sits at the same screen position in both worlds. */
export const S89 = Strobe;

/** S90 03:38.80: the same strobe. Crack 19 reaches the painting's edge; on beat[679] the office cut shows it crossing into the wall plaster. */
export const S90 = Strobe;

