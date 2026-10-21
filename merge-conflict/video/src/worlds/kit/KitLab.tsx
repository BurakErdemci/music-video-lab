// KitLab: every world-kit element at once in a dark stage, for inspection. t = frame / 60.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { drift, HOME, shifted, type Vec3 } from '../../camera/camera.ts';
import { ramp } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { ORDER, Stage } from '../../stage/Stage.tsx';
import { Embers, FireWall, Smoke } from './atmosphere.tsx';
import { BeamCone, Halo, LaserFan, NeonTube } from './lights.tsx';
import { DotsPlane, type Erupt, GlowBox, type LedPattern, LedWall, TilePlatform } from './surfaces.tsx';

export const KIT_LAB_FRAMES = 360;

const FLOOR = -3.2;
const BALL: Vec3 = [0, 3.8, -3];
const PATTERNS: readonly LedPattern[] = ['bars', 'radial', 'checker', 'scan'];

const POSE_A = { ...shifted(HOME, [-1.6, 2.4, -0.5]), target: [-0.4, -0.6, 0] as Vec3 };
const POSE_B = { ...shifted(HOME, [1.6, 1.6, -1.8]), target: [0.4, -0.2, 0] as Vec3 };
const camera = drift(POSE_A, POSE_B, 0, KIT_LAB_FRAMES / 60);

const RAIL: Vec3[] = [[-7.5, FLOOR, -6], [-7.5, 0, -6], [-5.5, 3.4, -6], [0, 4.4, -6], [5.5, 3.4, -6], [7.5, 0, -6], [7.5, FLOOR, -6]];
const FRONT_RAIL: Vec3[] = [[-7, FLOOR + 0.05, 3], [7, FLOOR + 0.05, 3]];
const BURSTS = [
  { t: 1, origin: [-4, -2.5, 0] as Vec3 },
  { t: 2.4, origin: [4, -2.5, 0] as Vec3 },
  { t: 3.8, origin: [0, -2.8, 1] as Vec3 },
  { t: 5.1, origin: [-2, -2.5, -1] as Vec3 },
];

const Backdrop = () => (
  <mesh position={[0, 2, -14]} renderOrder={ORDER.plate - 1}>
    <planeGeometry args={[70, 40]} />
    <meshBasicMaterial color="#050308" depthTest={false} depthWrite={false} />
  </mesh>
);

export const KitLab = () => {
  const frame = useCurrentFrame();
  const t = frame / 60;
  const pose = camera(t);
  const beat = Math.exp(-(t % 1) * 6);
  const erupt: Erupt[] = [0, 1, 2].flatMap((j) => {
    const k = Math.floor(t) - j;
    if (k < 0) return [];
    const r = seeded(`kitlab:erupt:${k}`);
    return [{ t: k, x: r.range(-6, 6), z: r.range(-6, 1) }];
  });

  return (
    <AbsoluteFill style={{ background: '#050308' }}>
      <Stage pose={pose}>
        <Backdrop />
        <LedWall position={[0, 2.2, -8]} width={15} height={6.5} cols={30} rows={13} colors={['#ff2bd6', '#2be4ff']} pattern={PATTERNS[Math.floor(frame / 90) % 4] as LedPattern} pulse={beat * 0.5} t={t} opacity={0.85} />
        <DotsPlane position={[-9, 1.5, -3]} size={[10, 10]} rotation={[0, 0.9, 0]} color="#bfe6ff" intensity={0.9} t={t} ballPos={BALL} />
        <Halo position={BALL} size={3.2} color="#9fd8ff" intensity={0.8} />
        <FireWall x0={-6} x1={6} z={-5.5} height={5.5} rise={ramp(t, 4, 1.7)} colors={['#ff4a0a', '#ffd23a']} t={t} y={FLOOR} />
        <TilePlatform position={[0, FLOOR, -2]} width={15} depth={10} cols={15} rows={10} splitX={0} left="#ff2bd6" right="#2be4ff" t={t} pulse={beat * 0.5} erupt={erupt} />
        <NeonTube points={RAIL} color="#ff2bd6" radius={0.05} on={ramp(t, 0.2, 3)} />
        <NeonTube points={FRONT_RAIL} color="#2be4ff" radius={0.04} />
        <BeamCone from={[-6, 6.5, -4]} to={[-1.5, FLOOR, -1]} radius={1.4} color="#b58cff" intensity={0.7} />
        <BeamCone from={[6, 6.5, -4]} to={[1.5, FLOOR, -1]} radius={1.4} color="#7fffd0" intensity={0.7} />
        <LaserFan origin={[0, FLOOR + 0.2, -6.5]} count={9} spread={1.7} angle={Math.PI / 2} length={12} color="#4dff6a" width={0.02} />
        <Smoke y={FLOOR + 1} z={-1.5} width={18} height={3.4} color="#9a86c0" density={0.9} t={t} />
        <GlowBox position={[-4.2, FLOOR + 0.35, 1]} size={[1.7, 0.7, 1.7]} color="#ff3b3b" edge={0.9} fill={0.5} rotation={[0, 0.4, 0]} />
        <GlowBox position={[4.2, FLOOR + 0.35, 1]} size={[1.7, 0.7, 1.7]} color="#3bb8ff" edge={0.9} fill={0.5} rotation={[0, -0.4, 0]} />
        <Embers box={[-8, 8, FLOOR, 4, -4, 3]} count={220} t={t} color="#ff7a1a" bursts={BURSTS} />
      </Stage>
    </AbsoluteFill>
  );
};
