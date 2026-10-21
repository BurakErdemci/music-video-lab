// GrooveLab: the three Groove worlds in sequence, 120 frames each, each flying its hero camera, for inspection.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { blendPose } from '../camera/camera.ts';
import { Stage } from '../stage/Stage.tsx';
import { FLOOR_Y } from '../stage/floor.ts';
import { CATHEDRAL_CAMERA, CATHEDRAL_SPOTS, CathedralWorld, CHEVRON_TUNNEL_CAMERA, CHEVRON_TUNNEL_SPOTS, ChevronTunnelWorld, FORGE_CAMERA, FORGE_SPOTS, ForgeWorld } from './groove.tsx';

const SEG = 120;
export const GROOVE_LAB_FRAMES = SEG * 3;
const HITS = Array.from({ length: 6 }, (_, i) => i * 0.667);

const SEGMENTS = [
  { World: CathedralWorld, cam: CATHEDRAL_CAMERA, spot: CATHEDRAL_SPOTS.O },
  { World: ChevronTunnelWorld, cam: CHEVRON_TUNNEL_CAMERA, spot: CHEVRON_TUNNEL_SPOTS.O },
  { World: ForgeWorld, cam: FORGE_CAMERA, spot: FORGE_SPOTS.O },
] as const;

export const GrooveLab = () => {
  const frame = useCurrentFrame();
  const { World, cam, spot } = SEGMENTS[Math.min(2, Math.floor(frame / SEG))] as (typeof SEGMENTS)[number];
  const local = frame % SEG;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={blendPose(cam.from, cam.to, local / (SEG - 1))}>
        <World t={local / 60} hits={HITS} />
        {/* stand-in for the girl: 1.6 x 5, feet on the floor */}
        <mesh position={[spot.x, FLOOR_Y + 2.5, spot.z]} renderOrder={10}>
          <planeGeometry args={[1.6, 5]} />
          <meshBasicMaterial color="#3a3a3a" transparent depthTest={false} depthWrite={false} />
        </mesh>
      </Stage>
    </AbsoluteFill>
  );
};
