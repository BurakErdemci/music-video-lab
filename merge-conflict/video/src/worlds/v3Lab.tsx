// V3Lab: the four V3 worlds alone, 120 frames each on their hero camera, a grey stand-in at each girl's spot.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { blendPose } from '../camera/camera.ts';
import { FLOOR_Y } from '../stage/floor.ts';
import { Stage } from '../stage/Stage.tsx';
import { BLAME_CAMERA, BLAME_SPOTS, BlameWorld, CALLGRID_CAMERA, CALLGRID_SPOTS, CallGridWorld, PIPELINE_CAMERA, PIPELINE_SPOTS, PipelineWorld, SQUASH_CAMERA, SQUASH_SPOTS, SquashWorld } from './v3.tsx';

const SEG = 120;
export const V3_LAB_FRAMES = SEG * 4;

const Girl = ({ x, z }: { x: number; z: number }) => (
  <mesh position={[x, FLOOR_Y + 2.4, z]} renderOrder={10}>
    <planeGeometry args={[1.6, 4.8]} />
    <meshBasicMaterial color="#8a8a94" transparent depthTest={false} depthWrite={false} />
  </mesh>
);

type Spots = { B?: { x: number; z: number }; O?: { x: number; z: number } };
const LAB_FAILS = [0, 1, 2, 3, 4, 5].map((i) => 0.4 + i * 0.25);

const SEGMENTS: { cam: typeof SQUASH_CAMERA; spots: Spots }[] = [
  { cam: SQUASH_CAMERA, spots: SQUASH_SPOTS },
  { cam: BLAME_CAMERA, spots: BLAME_SPOTS },
  { cam: PIPELINE_CAMERA, spots: PIPELINE_SPOTS },
  { cam: CALLGRID_CAMERA, spots: CALLGRID_SPOTS },
];

export const V3Lab = () => {
  const frame = useCurrentFrame();
  const seg = Math.min(3, Math.floor(frame / SEG));
  const lf = frame - seg * SEG;
  const t = lf / 60;
  const { cam, spots } = SEGMENTS[seg] as (typeof SEGMENTS)[number];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={blendPose(cam.from, cam.to, lf / (SEG - 1))}>
        {seg === 0 && <SquashWorld t={t} squash={0.8} />}
        {seg === 1 && <BlameWorld t={t} />}
        {seg === 2 && <PipelineWorld t={t} fails={LAB_FAILS} />}
        {seg === 3 && <CallGridWorld t={t} off={0.6} />}
        {spots.B && <Girl x={spots.B.x} z={spots.B.z} />}
        {spots.O && <Girl x={spots.O.x} z={spots.O.z} />}
      </Stage>
    </AbsoluteFill>
  );
};
