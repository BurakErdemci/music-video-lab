// V1Lab: the V1 worlds alone, 120 frames each in sequence, each in its own Stage on its hero camera, with a
// flat stand-in for the girl at each spot so the framing can be judged.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { blendPose } from '../camera/camera.ts';
import { ramp } from '../lib/ease.ts';
import { FLOOR_Y } from '../stage/floor.ts';
import { Stage } from '../stage/Stage.tsx';
import {
  CLOCK_CAMERA,
  CLOCK_SPOTS,
  ClockWorld,
  PRESS_CAMERA,
  PRESS_SPOTS,
  PressWorld,
  SUBWAY_CAMERA,
  SUBWAY_SPOTS,
  SubwayWorld,
  TERMINAL_CAMERA,
  TERMINAL_SPOTS,
  TerminalWorld,
  type Spot,
} from './v1.tsx';

const SEG = 120;
export const V1_LAB_FRAMES = SEG * 4;

const StandIn = ({ x, z }: Spot) => (
  <mesh position={[x, FLOOR_Y + 2.4, z]} renderOrder={10}>
    <planeGeometry args={[1.6, 4.8]} />
    <meshBasicMaterial color="#8a8a94" depthTest={false} depthWrite={false} />
  </mesh>
);

export const V1Lab = () => {
  const frame = useCurrentFrame();
  const seg = Math.min(3, Math.floor(frame / SEG));
  const local = frame - seg * SEG;
  const t = local / 60;
  const k = local / (SEG - 1);
  const slams = Array.from({ length: 6 }, (_, i) => 0.2 + i * 0.33);
  const lit = { main: ramp(t, 0.1, 1.8), feature: ramp(t, 0.6, 1.4), stable: ramp(t, 0.3, 1.7) };
  const scenes = [
    { cam: TERMINAL_CAMERA, spots: Object.values(TERMINAL_SPOTS), world: <TerminalWorld t={t} fail={1} /> },
    { cam: SUBWAY_CAMERA, spots: Object.values(SUBWAY_SPOTS), world: <SubwayWorld t={t} lit={lit} /> },
    { cam: PRESS_CAMERA, spots: Object.values(PRESS_SPOTS), world: <PressWorld t={t} slams={slams} /> },
    { cam: CLOCK_CAMERA, spots: Object.values(CLOCK_SPOTS), world: <ClockWorld t={t} strike={1.2} /> },
  ] as const;
  const s = scenes[seg]!;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={blendPose(s.cam.from, s.cam.to, k)}>
        {s.world}
        {s.spots.map((p, i) => (
          <StandIn key={i} x={p.x} z={p.z} />
        ))}
      </Stage>
    </AbsoluteFill>
  );
};
