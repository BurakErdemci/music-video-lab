// Painted world plates (W01-W11, approved for a trial on 21 Oct 2026) as the back layer of the code-built worlds.
// A plate is laid on two planes facing the shot's opening camera: a far plane covering the whole frame, and a
// near plane at the same angular size showing only the plate's floor (its lower 42 %, faded at the top). At the
// opening pose they coincide; as the camera travels the floor slides faster than the far wall, so the painting
// keeps depth. The neon, particles and girls of the world stand in front.
// A world draws <PlateBackdrop plate={...} />: with no plate the dark code backdrop, with 'shot' nothing (the shot
// draws <PlateLayer/> itself).
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { staticFile } from 'remotion';
import { Matrix4, NoColorSpace, Quaternion, TextureLoader, Vector3 } from 'three';
import { type CameraPose, H, W } from '../camera/camera.ts';
import { useUniforms } from '../stage/Stage.tsx';

const PlateImage = ({ src, z, size }: { src: string; z: number; size: [number, number] }) => {
  const tex = useLoader(TextureLoader, staticFile(src));
  tex.colorSpace = NoColorSpace;
  return (
    <mesh position={[0, 2, z]} renderOrder={0}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} depthTest={false} depthWrite={false} />
    </mesh>
  );
};

export const PlateBackdrop = ({ plate, color = '#04020a', z = -18, size = [140, 80] }: { plate?: string; color?: string; z?: number; size?: [number, number] }) =>
  plate === 'shot' ? null : plate ? (
    <PlateImage src={plate} z={z} size={size} />
  ) : (
    <mesh position={[0, 2, z]} renderOrder={0}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={color} depthTest={false} depthWrite={false} />
    </mesh>
  );

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `uniform sampler2D map; uniform float uNear; uniform float uGain; varying vec2 vUv;
void main() {
  vec4 c = texture2D(map, vUv);
  // the near plane keeps only the floor, fading out toward the horizon
  float a = uNear > 0.5 ? 1.0 - smoothstep(0.30, 0.42, vUv.y) : 1.0;
  gl_FragColor = vec4(c.rgb * uGain, a);
}`;

const PLATE_ASPECT = 1536 / 1024;

const Layer = ({ tex, base, dist, near, gain, margin }: { tex: unknown; base: CameraPose; dist: number; near: boolean; gain: number; margin: number }) => {
  const { pos, quat, w, h } = useMemo(() => {
    const p = new Vector3(...base.position);
    const fwd = new Vector3(...base.target).sub(p).normalize();
    const right = new Vector3().crossVectors(fwd, new Vector3(0, 1, 0)).normalize();
    const up = new Vector3().crossVectors(right, fwd);
    // cover the frame's width with a margin for the camera's travel and the framing guard's widening (round 7c:
    // 1.45, so the 2x plates show at 1.21x their pixels at the 2K output); the 3:2 plate overflows top and bottom
    const ww = 2 * dist * Math.tan((base.fov * Math.PI) / 360) * (W / H) * margin;
    const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, up, fwd.clone().negate()));
    return { pos: p.add(fwd.multiplyScalar(dist)).toArray() as [number, number, number], quat: q, w: ww, h: ww / PLATE_ASPECT };
  }, [base, dist, margin]);
  const u = useUniforms({ map: tex, uNear: near ? 1 : 0, uGain: gain });
  return (
    <mesh position={pos} quaternion={quat} renderOrder={near ? 0.5 : 0} frustumCulled={false}>
      <planeGeometry args={[w, h]} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
};

/** The plate `id` (W01..W11, public/plates/) behind the world, anchored on the shot's opening camera `base`.
 *  `panel`: a full-frame moment painting (QK1-QK5) on the far plane only, no floor layer. */
export const PlateLayer = ({ id, base, dist = 46, gain = 0.92, margin = 1.45, panel = false }: { id: string; base: CameraPose; dist?: number; gain?: number; margin?: number; panel?: boolean }) => {
  const tex = useLoader(TextureLoader, staticFile(`plates/${id}.webp`));
  tex.colorSpace = NoColorSpace;
  return (
    <>
      <Layer tex={tex} base={base} dist={dist} near={false} gain={gain} margin={margin} />
      {!panel && <Layer tex={tex} base={base} dist={dist * 0.45} near gain={gain} margin={margin} />}
    </>
  );
};
