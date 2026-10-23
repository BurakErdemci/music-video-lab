// Painted world plates (W01-W11, approved for a trial on 21 Oct 2026) as the back layer of the code-built worlds.
// A plate is laid on two planes facing the frame's camera (round 7c: placed by worlds/plategeo.ts so it never
// shows above 1.25x its pixels at 2K): a far plane covering the whole frame, and a near plane showing only the
// plate's floor (its lower 42 %, faded at the top). At the opening pose they coincide; as the camera travels the
// floor slides further than the far wall, so the painting keeps depth. The neon, particles and girls of the world stand in front.
// A world draws <PlateBackdrop plate={...} />: with no plate the dark code backdrop, with 'shot' nothing (the shot
// draws <PlateLayer/> itself).
import { isKeyed, SET_KEY, useLayer } from '../layer.ts';
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { Matrix4, NoColorSpace, Quaternion, TextureLoader, Vector3 } from 'three';
import type { CameraPose } from '../camera/camera.ts';
import { useStagePose, useUniforms } from '../stage/Stage.tsx';
import { plateView } from './plategeo.ts';

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

export const PlateBackdrop = ({ plate, color = '#04020a', z = -18, size = [140, 80] }: { plate?: string; color?: string; z?: number; size?: [number, number] }) => {
  // the dark code backdrop is "no set": in the set layer it shows the key (framecheck --set, round 11d)
  const keyed = isKeyed(useLayer());
  return plate === 'shot' ? null : plate ? (
    <PlateImage src={plate} z={z} size={size} />
  ) : (
    <mesh position={[0, 2, z]} renderOrder={0}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={keyed ? SET_KEY : color} depthTest={false} depthWrite={false} />
    </mesh>
  );
};

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `uniform sampler2D map; uniform float uNear; uniform float uGain; varying vec2 vUv;
void main() {
  vec4 c = texture2D(map, vUv);
  // the near plane keeps only the floor, fading out toward the horizon
  float a = uNear > 0.5 ? 1.0 - smoothstep(0.30, 0.42, vUv.y) : 1.0;
  gl_FragColor = vec4(c.rgb * uGain, a);
}`;

/** One plane of a plate, placed for the frame's camera by plateView (worlds/plategeo.ts). */
const Layer = ({ tex, base, dist, near, gain, margin, follow }: { tex: unknown; base: CameraPose; dist: number; near: boolean; gain: number; margin: number; follow: number }) => {
  const pose = useStagePose();
  const v = plateView(pose, base, dist, margin, follow);
  const r = new Vector3(...v.right);
  const u = new Vector3(...v.up);
  const quat = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(r, u, new Vector3().crossVectors(r, u)));
  const uni = useUniforms({ map: tex, uNear: near ? 1 : 0, uGain: gain });
  return (
    <mesh position={v.centre} quaternion={quat} renderOrder={near ? 0.5 : 0} frustumCulled={false}>
      <planeGeometry args={[v.w, v.h]} />
      <shaderMaterial {...uni} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
};

/** The plate `id` (W01..W12, public/plates/) behind the world, anchored on the shot's opening camera `base`. The
 *  moment paintings (QK*, RK*) are drawn by worlds/Painting.tsx (round 10). */
export const PlateLayer = ({ id, base, dist = 46, gain = 0.92, margin = 1.45 }: { id: string; base: CameraPose; dist?: number; gain?: number; margin?: number }) => {
  const tex = useLoader(TextureLoader, staticFile(`plates/${id}.webp`));
  tex.colorSpace = NoColorSpace;
  return (
    <>
      <Layer tex={tex} base={base} dist={dist} near={false} gain={gain} margin={margin} follow={0.5} />
      <Layer tex={tex} base={base} dist={dist * 0.45} near gain={gain} margin={margin} follow={0.8} />
    </>
  );
};
