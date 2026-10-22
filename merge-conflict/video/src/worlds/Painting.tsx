// A moment painting drawn where worlds/paintview.ts puts it (round 10): a frame-locked quad whose shader places the
// 16:9 painting so it covers the frame, works its depth map (the near pixels slide and swell against the far ones),
// and lays a light sweep and a soft highlight bloom over it. A living painting (RK1, RK2, RK11, RK12) is its empty
// layer here and the girls on a second frame-locked plane in front, drawn after the back particles and before the
// front ones (renderOrder), sliding against the painting by their own depth, with a contact shadow and a rim glow.
// Locked to the frame: the camera's moves, punches and shake never crop it; the view's own push and shake do.
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { Matrix4, NoColorSpace, Quaternion, type Texture, TextureLoader, Vector3 } from 'three';
import { basis } from '../camera/camera.ts';
import { rgb } from '../lib/ease.ts';
import { ORDER, useStagePose, useUniforms } from '../stage/Stage.tsx';
import { PAINT_W, type PaintView } from './paintview.ts';

/** The girls' plane draws between the back particle field and the front one. */
export const GIRLS_ORDER = ORDER.fieldBack + 0.5;

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// the light both planes share: a soft band crossing the frame along an angle, and a bloom of the painting's own
// highlights (its blurred copy above 0.5), pulsed on the beat - light on the painting, not a filter over the frame
const LIGHT = /* glsl */ `uniform vec4 uSweep; uniform vec3 uSweepCol; uniform float uSweepAmt; uniform float uBloom;
vec3 light(vec2 f, vec3 c, vec3 blur) {
  float along = dot(f - 0.5, uSweep.yz) + 0.5;
  float band = exp(-pow((along - uSweep.x) / uSweep.w, 2.0));
  c += (c * 0.9 + uSweepCol * 0.25) * band * uSweepAmt;
  return c + max(blur - 0.5, 0.0) * 0.17 * uBloom;
}`;
const BG = /* glsl */ `uniform sampler2D map; uniform sampler2D uDepth; uniform vec2 uSize; uniform vec2 uOff; uniform vec2 uShift;
uniform vec2 uFocus; uniform float uPivot; uniform float uZoom; uniform float uGain; varying vec2 vUv;
${LIGHT}
void main() {
  vec2 p = 0.5 + (vUv - 0.5 - uOff) / uSize;
  // one-sample parallax on the depth map (near = white): content at depth d moves by -uShift * (d - pivot) and swells
  // about the focus; a sideways slide fades out at the side edges and an upward one at the top and bottom, over a
  // width that grows with the slide, so it never samples past them or folds (a fold smears the edge column in streaks)
  float k = texture2D(uDepth, p).r - uPivot;
  vec2 w = max(vec2(0.05), abs(uShift) * 1.6);
  vec2 e = smoothstep(vec2(0.0), w, p) * smoothstep(vec2(0.0), w, 1.0 - p);
  vec2 q = clamp(uFocus + (p - uFocus) / (1.0 + uZoom * max(k, 0.0)) + uShift * k * e, 0.0, 1.0);
  vec3 c = texture2D(map, q).rgb;
  gl_FragColor = vec4(light(vUv, c, texture2D(map, q, 4.0).rgb) * uGain, 1.0);
}`;
const GIRLS = /* glsl */ `uniform sampler2D map; uniform vec2 uSize; uniform vec2 uOff; uniform vec2 uShift; uniform vec2 uFocus;
uniform float uPivot; uniform float uZoom; uniform float uDepthG; uniform float uBob; uniform float uGain;
uniform vec3 uGlow; uniform float uGlowAmt; uniform float uShadow; varying vec2 vUv;
${LIGHT}
void main() {
  vec2 f = vec2(vUv.x, vUv.y + uBob);
  vec2 p = 0.5 + (f - 0.5 - uOff) / uSize;
  // the whole plane at the girls' depth: one slide and one swell for all of them
  float k = uDepthG - uPivot;
  vec2 q = uFocus + (p - uFocus) / (1.0 + uZoom * max(k, 0.0)) + uShift * k;
  vec4 g = texture2D(map, q);
  float a = g.a;
  // blurred alpha (a deep mip): the rim inside the silhouette and the glow outside it
  float ab = texture2D(map, q, 4.5).a;
  // the contact shadow falls just below them on the painting (the alpha sampled from a little above)
  float sh = uShadow * texture2D(map, q + vec2(-0.004, 0.016), 5.0).a;
  vec3 col = g.rgb + uGlow * a * (1.0 - ab) * uGlowAmt * 1.4;
  col = light(vUv, col, col) * uGain;
  float halo = max(ab - a, 0.0) * uGlowAmt;
  // premultiplied: the girls over their shadow, the glow added without covering
  gl_FragColor = vec4(col * a + uGlow * halo * 0.5 * (1.0 - a), a + (1.0 - a) * sh);
}`;

const lightUniforms = (v: PaintView) => {
  const s = v.sweep;
  return {
    uSweep: [s?.pos ?? -9, Math.cos(s?.angle ?? 0), Math.sin(s?.angle ?? 0), s?.width ?? 0.16],
    uSweepCol: rgb(s?.color ?? '#ffffff'), uSweepAmt: s?.amt ?? 0, uBloom: v.bloom ?? 0,
  };
};

const frameQuad = (pose: ReturnType<typeof useStagePose>, dist: number) => {
  const [fwd, right, up] = basis(pose);
  const fh = 2 * dist * Math.tan((pose.fov * Math.PI) / 360);
  const quat = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(...right), new Vector3(...up), new Vector3(...fwd).negate()));
  const centre: [number, number, number] = [pose.position[0] + fwd[0] * dist, pose.position[1] + fwd[1] * dist, pose.position[2] + fwd[2] * dist];
  return { quat, centre, size: [fh * (16 / 9), fh] as [number, number] };
};

/** The textures of painting `id`: its wide plate and depth map, or its layers (the empty painting, its depth map and
 *  the three drawings of the girls). */
const files = (id: string, layered: boolean): string[] =>
  layered
    ? [`plates/layers/${id}-bg.webp`, `plates/depth/layers/${id}-bg.png`, `plates/layers/${id}-fg.webp`, `plates/layers/${id}-fgb.webp`, `plates/layers/${id}-fgc.webp`]
    : [`plates/wide/${id}.webp`, `plates/depth/wide/${id}.png`];

export const Painting = ({ id, view, dist = 30 }: { id: string; view: PaintView; dist?: number }) => {
  const tex = useLoader(TextureLoader, files(id, !!view.layered).map((f) => staticFile(f))) as Texture[];
  for (const x of tex) x.colorSpace = NoColorSpace;
  const pose = useStagePose();
  const q = frameQuad(pose, dist);
  const common = { uSize: [view.h * PAINT_W, view.h], uOff: [view.ox, view.oy], uShift: view.shift, uFocus: view.focus, uPivot: view.pivot, uZoom: view.zoom, uGain: view.gain, ...lightUniforms(view) };
  const bg = useUniforms({ map: tex[0], uDepth: tex[1], ...common });
  const g = view.girls;
  const girls = useUniforms({
    map: tex[2 + (g?.drawing ?? 0)] ?? tex[0], ...common, uDepthG: g?.depth ?? 0, uBob: g?.bob ?? 0,
    uGlow: rgb(g?.glow ?? '#ffffff'), uGlowAmt: g?.glowAmt ?? 0, uShadow: g?.shadow ?? 0,
  });
  return (
    <>
      <mesh position={q.centre} quaternion={q.quat} renderOrder={ORDER.plate} frustumCulled={false}>
        <planeGeometry args={q.size} />
        <shaderMaterial {...bg} vertexShader={VERT} fragmentShader={BG} depthTest={false} depthWrite={false} />
      </mesh>
      {g && (
        <mesh position={q.centre} quaternion={q.quat} renderOrder={GIRLS_ORDER} frustumCulled={false}>
          <planeGeometry args={q.size} />
          <shaderMaterial {...girls} vertexShader={VERT} fragmentShader={GIRLS} transparent premultipliedAlpha depthTest={false} depthWrite={false} />
        </mesh>
      )}
    </>
  );
};
