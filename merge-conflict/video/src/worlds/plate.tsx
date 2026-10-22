// Painted world plates (W01-W11, approved for a trial on 21 Oct 2026) as the back layer of the code-built worlds.
// A plate is laid on two planes facing the frame's camera (round 7c: placed by worlds/plategeo.ts so it never
// shows above 1.25x its pixels at 2K): a far plane covering the whole frame, and a near plane showing only the
// plate's floor (its lower 42 %, faded at the top). At the opening pose they coincide; as the camera travels the
// floor slides further than the far wall, so the painting keeps depth. The neon, particles and girls of the world stand in front.
// A world draws <PlateBackdrop plate={...} />: with no plate the dark code backdrop, with 'shot' nothing (the shot
// draws <PlateLayer/> itself).
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { Matrix4, NoColorSpace, Quaternion, TextureLoader, Vector3 } from 'three';
import type { CameraPose } from '../camera/camera.ts';
import { useStagePose, useUniforms } from '../stage/Stage.tsx';
import { basis } from '../camera/camera.ts';
import { paintingParallax, paintingView, panelParallax, plateView } from './plategeo.ts';

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
const FRAG = /* glsl */ `uniform sampler2D map; uniform sampler2D uDepth; uniform float uPanel; uniform vec2 uShift; uniform float uZoom;
uniform float uNear; uniform float uGain; uniform float uBand; varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  // a moment painting: one-sample parallax mapping on its depth map (near = white) - near pixels slide and swell,
  // sampled inside the painting's own bounds
  if (uPanel > 0.5) {
    float d = texture2D(uDepth, vUv).r;
    uv = clamp(0.5 + (vUv - 0.5) / (1.0 + max(d - 0.3, 0.0) * uZoom) - (d - 0.5) * uShift, 0.0, 1.0);
  }
  // the side bands behind a painting shown whole: the painting itself, blurred (a deep mip level) and darkened
  vec4 c = uBand > 0.5 ? texture2D(map, uv, 6.0) * 0.34 : texture2D(map, uv);
  // the near plane keeps only the floor, fading out toward the horizon
  float a = uNear > 0.5 ? 1.0 - smoothstep(0.30, 0.42, vUv.y) : 1.0;
  gl_FragColor = vec4(c.rgb * uGain, a);
}`;

/** One plane of a plate, placed for the frame's camera by plateView (worlds/plategeo.ts). */
const Layer = ({ tex, depth, base, dist, near, gain, margin, follow }: { tex: unknown; depth?: unknown; base: CameraPose; dist: number; near: boolean; gain: number; margin: number; follow: number }) => {
  const pose = useStagePose();
  const v = plateView(pose, base, dist, margin, follow);
  const px = panelParallax(pose, base, dist, v.scale);
  const r = new Vector3(...v.right);
  const u = new Vector3(...v.up);
  const quat = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(r, u, new Vector3().crossVectors(r, u)));
  const uni = useUniforms({ map: tex, uDepth: depth ?? tex, uPanel: depth ? 1 : 0, uShift: px.shift, uZoom: px.zoom, uNear: near ? 1 : 0, uGain: gain, uBand: 0 });
  return (
    <mesh position={v.centre} quaternion={quat} renderOrder={near ? 0.5 : 0} frustumCulled={false}>
      <planeGeometry args={[v.w, v.h]} />
      <shaderMaterial {...uni} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
};

/** The plate `id` (W01..W11, public/plates/) behind the world, anchored on the shot's opening camera `base`.
 *  `panel`: a moment painting (QK*, RK*) shown whole (plategeo.ts paintingView), `kb` the shot's progress 0..1. */
export const PlateLayer = ({ id, base, dist = 46, gain = 0.92, margin = 1.45, panel = false, kb = 1 }: { id: string; base: CameraPose; dist?: number; gain?: number; margin?: number; panel?: boolean; kb?: number }) => {
  const tex = useLoader(TextureLoader, staticFile(`plates/${id}.webp`));
  tex.colorSpace = NoColorSpace;
  return panel ? (
    <PanelLayer id={id} tex={tex} base={base} dist={dist} gain={gain} kb={kb} />
  ) : (
    <>
      <Layer tex={tex} base={base} dist={dist} near={false} gain={gain} margin={margin} follow={0.5} />
      <Layer tex={tex} base={base} dist={dist * 0.45} near gain={gain} margin={margin} follow={0.8} />
    </>
  );
};

/** A moment painting shown whole (round 7d), with its depth map (public/plates/depth/<id>.png) for a capped 2.5D
 *  parallax, over its own blurred, darkened copy filling the side bands. Locked to the frame: the camera's moves,
 *  punches and shake do not crop it. */
const PanelLayer = ({ id, tex, base, dist, gain, kb }: { id: string; tex: unknown; base: CameraPose; dist: number; gain: number; kb: number }) => {
  const depth = useLoader(TextureLoader, staticFile(`plates/depth/${id}.png`));
  depth.colorSpace = NoColorSpace;
  const pose = useStagePose();
  const v = paintingView(pose, dist, kb);
  const px = paintingParallax(pose, base, dist, v.scale);
  const [fwd] = basis(pose);
  const quat = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(...v.right), new Vector3(...v.up), new Vector3(...fwd).negate()));
  const band = useUniforms({ map: tex, uDepth: tex, uPanel: 0, uShift: [0, 0], uZoom: 0, uNear: 0, uGain: gain, uBand: 1 });
  const paint = useUniforms({ map: tex, uDepth: depth, uPanel: 1, uShift: px.shift, uZoom: px.zoom, uNear: 0, uGain: gain, uBand: 0 });
  return (
    <>
      <mesh position={v.centre} quaternion={quat} renderOrder={0} frustumCulled={false}>
        <planeGeometry args={[v.bandW, v.bandH]} />
        <shaderMaterial {...band} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} />
      </mesh>
      <mesh position={v.centre} quaternion={quat} renderOrder={0.25} frustumCulled={false}>
        <planeGeometry args={[v.w, v.h]} />
        <shaderMaterial {...paint} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} />
      </mesh>
    </>
  );
};
