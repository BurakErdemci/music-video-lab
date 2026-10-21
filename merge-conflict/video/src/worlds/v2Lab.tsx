// V2Lab: the four V2 worlds alone, 120 frames each on their hero camera, a grey stand-in at each girl's spot.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { blendPose } from '../camera/camera.ts';
import { FLOOR_Y } from '../stage/floor.ts';
import { Stage } from '../stage/Stage.tsx';
import { ALLEY_CAMERA, ALLEY_SPOTS, AlleyWorld, GRAFFITI_CAMERA, GRAFFITI_SPOTS, GraffitiWorld, RAILS_CAMERA, RAILS_SPOTS, RailsWorld, STADIUM_CAMERA, STADIUM_SPOTS, StadiumWorld } from './v2.tsx';

const SEG = 120;
export const V2_LAB_FRAMES = SEG * 4;

const Girl = ({ x, z }: { x: number; z: number }) => (
  <mesh position={[x, FLOOR_Y + 2.4, z]} renderOrder={10}>
    <planeGeometry args={[1.6, 4.8]} />
    <meshBasicMaterial color="#3a3a3a" depthTest={false} depthWrite={false} />
  </mesh>
);

const SEGMENTS = [
  { cam: RAILS_CAMERA, spots: RAILS_SPOTS as { O: { x: number; z: number }; B?: { x: number; z: number } } },
  { cam: GRAFFITI_CAMERA, spots: GRAFFITI_SPOTS },
  { cam: ALLEY_CAMERA, spots: ALLEY_SPOTS },
  { cam: STADIUM_CAMERA, spots: STADIUM_SPOTS as { O: { x: number; z: number }; B?: { x: number; z: number } } },
];

export const V2Lab = () => {
  const frame = useCurrentFrame();
  const seg = Math.min(3, Math.floor(frame / SEG));
  const lf = frame - seg * SEG;
  const t = lf / 60;
  const pulse = (1 - (lf % 20) / 20) ** 2;
  const { cam, spots } = SEGMENTS[seg] as (typeof SEGMENTS)[number];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={blendPose(cam.from, cam.to, lf / (SEG - 1))}>
        {seg === 0 && <RailsWorld t={t} split={0.4} />}
        {seg === 1 && <GraffitiWorld t={t} spray={0.3} />}
        {seg === 2 && <AlleyWorld t={t} />}
        {seg === 3 && <StadiumWorld t={t} pulse={pulse} />}
        <Girl x={spots.O.x} z={spots.O.z} />
        {spots.B && <Girl x={spots.B.x} z={spots.B.z} />}
      </Stage>
    </AbsoluteFill>
  );
};
