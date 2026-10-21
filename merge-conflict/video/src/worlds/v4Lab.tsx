// V4Lab: the four V4 worlds alone, 120 frames each on their hero camera, a grey stand-in at each girl's spot.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { blendPose, type CameraPose } from '../camera/camera.ts';
import { FLOOR_Y } from '../stage/floor.ts';
import { Stage } from '../stage/Stage.tsx';
import { LASERCASE_CAMERA, LASERCASE_SPOTS, LaserCaseWorld, NAMETAG_CAMERA, NAMETAG_SPOTS, NameTagWorld, WHISPER_CAMERA, WHISPER_SPOTS, WhisperWorld, WHITESPACE_CAMERA, WHITESPACE_SPOTS, WhitespaceWorld } from './v4.tsx';

const SEG = 120;
export const V4_LAB_FRAMES = SEG * 4;

const Girl = ({ x, z }: { x: number; z: number }) => (
  <mesh position={[x, FLOOR_Y + 2.4, z]} renderOrder={10}>
    <planeGeometry args={[1.6, 4.8]} />
    <meshBasicMaterial color="#8a8a94" transparent depthTest={false} depthWrite={false} />
  </mesh>
);

type Spots = { B?: { x: number; z: number }; O?: { x: number; z: number } };
const SEGMENTS: { cam: { from: CameraPose; to: CameraPose }; spots: Spots }[] = [
  { cam: WHITESPACE_CAMERA, spots: WHITESPACE_SPOTS },
  { cam: NAMETAG_CAMERA, spots: NAMETAG_SPOTS },
  { cam: LASERCASE_CAMERA, spots: LASERCASE_SPOTS },
  { cam: WHISPER_CAMERA, spots: WHISPER_SPOTS },
];

export const V4Lab = () => {
  const frame = useCurrentFrame();
  const seg = Math.min(3, Math.floor(frame / SEG));
  const lf = frame - seg * SEG;
  const t = lf / 60;
  const { cam, spots } = SEGMENTS[seg] as (typeof SEGMENTS)[number];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={blendPose(cam.from, cam.to, lf / (SEG - 1))}>
        {seg === 0 && <WhitespaceWorld t={t} />}
        {seg === 1 && <NameTagWorld t={t} reveal={0.6} />}
        {seg === 2 && <LaserCaseWorld t={t} smash={0.9} />}
        {seg === 3 && <WhisperWorld t={t} />}
        {spots.B && <Girl x={spots.B.x} z={spots.B.z} />}
        {spots.O && <Girl x={spots.O.x} z={spots.O.z} />}
      </Stage>
    </AbsoluteFill>
  );
};
