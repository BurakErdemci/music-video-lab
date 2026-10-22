// A finale painting drawn where film/finale/paint.ts puts it (round 9): one frame-locked quad whose shader places
// the painting (its height, offset, depth parallax and near swell) and fills the rest of the frame with the
// painting's own blurred, darkened copy, as worlds/plate.tsx does for a painting at rest. Locked to the frame: the
// camera's moves, punches and shake never crop it; only the view's own push does (the build's flight).
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { Matrix4, NoColorSpace, Quaternion, TextureLoader, Vector3 } from 'three';
import { basis } from '../../camera/camera.ts';
import { useStagePose, useUniforms } from '../../stage/Stage.tsx';
import { PAINT_W, type PaintView } from './paint.ts';

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `uniform sampler2D map; uniform sampler2D uDepth; uniform vec2 uSize; uniform vec2 uOff; uniform vec2 uShift;
uniform vec2 uFocus; uniform float uZoom; uniform float uGain; varying vec2 vUv;
void main() {
  vec2 p = 0.5 + (vUv - 0.5 - uOff) / uSize;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
    // the side bands: the painting cover-fitted to the frame width, blurred (a deep mip level) and darkened
    vec2 b = vec2(vUv.x, 0.5 + (vUv.y - 0.5) / 1.1852);
    gl_FragColor = vec4(texture2D(map, b, 6.0).rgb * 0.34 * uGain, 1.0);
    return;
  }
  // one-sample parallax on the depth map (near = white): near pixels swell about the focus and slide with the
  // shift; the slide fades out at the painting's edges so it never samples past them
  float d = texture2D(uDepth, p).r;
  vec2 e = smoothstep(0.0, 0.06, p) * smoothstep(0.0, 0.06, 1.0 - p);
  vec2 q = uFocus + (p - uFocus) / (1.0 + max(d - 0.3, 0.0) * uZoom) - (d - 0.5) * uShift * e.x * e.y;
  gl_FragColor = vec4(texture2D(map, clamp(q, 0.0, 1.0)).rgb * uGain, 1.0);
}`;

export const Painting = ({ id, view, dist = 30 }: { id: string; view: PaintView; dist?: number }) => {
  const tex = useLoader(TextureLoader, staticFile(`plates/${id}.webp`));
  const depth = useLoader(TextureLoader, staticFile(`plates/depth/${id}.png`));
  tex.colorSpace = NoColorSpace;
  depth.colorSpace = NoColorSpace;
  const pose = useStagePose();
  const [fwd, right, up] = basis(pose);
  const fh = 2 * dist * Math.tan((pose.fov * Math.PI) / 360);
  const quat = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(...right), new Vector3(...up), new Vector3(...fwd).negate()));
  const uni = useUniforms({
    map: tex, uDepth: depth, uSize: [view.h * PAINT_W, view.h], uOff: [view.ox, view.oy], uShift: view.shift,
    uFocus: view.focus, uZoom: view.zoom, uGain: view.gain,
  });
  const centre: [number, number, number] = [pose.position[0] + fwd[0] * dist, pose.position[1] + fwd[1] * dist, pose.position[2] + fwd[2] * dist];
  return (
    <mesh position={centre} quaternion={quat} renderOrder={0} frustumCulled={false}>
      <planeGeometry args={[fh * (16 / 9), fh]} />
      <shaderMaterial {...uni} vertexShader={VERT} fragmentShader={FRAG} depthTest={false} depthWrite={false} />
    </mesh>
  );
};
