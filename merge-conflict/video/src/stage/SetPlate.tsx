// The set plate slot (architecture.md frame stack 1). With `src` it shows a painted plate (or a duo card used
// as a plate) on a far plane, tinted by the grade without the rim. Without `src` it builds the stage in code
// until the painted plates exist: a dark back wall with light rays, a mirror-tile floor and a mirror ball.
// Everything is a closed-form function of the scene clock `t` (seconds).
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { DoubleSide, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, TextureLoader } from 'three';
import { HOME_Z } from '../camera/camera.ts';
import { GRADE_GLSL, type Grade, gradeUniform } from '../grade/grade.ts';
import { type Hex, rgb } from '../lib/ease.ts';
import { ORDER, useUniforms } from './Stage.tsx';

export const FLOOR_Y = -3.4;
const WALL_Z = -10;
const VERT = /* glsl */ `varying vec2 vUv; varying vec3 vWorld;
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const HASH = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`;

const WALL_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uHue; uniform float uStage; uniform vec2 uAspect; uniform vec3 uHue2; uniform float uSplit; uniform float uMetal;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - vec2(0.5, 0.80)) * uAspect;
  // split mode: the left half takes uHue, the right half uHue2, with a crisp seam at the centre
  vec3 hue = mix(uHue, mix(uHue, uHue2, step(0.5, vUv.x)), uSplit);
  float r = length(p);
  float ang = atan(p.y, p.x);
  float rays = pow(0.5 + 0.5 * sin(ang * 13.0 + uTime * 0.32), 7.0) * smoothstep(1.6, 0.15, r);
  float rays2 = pow(0.5 + 0.5 * sin(ang * 21.0 - uTime * 0.21 + 1.3), 12.0) * smoothstep(1.3, 0.1, r);
  float glow = exp(-r * 2.6);
  vec3 base = mix(vec3(0.012, 0.004, 0.03), hue * 0.16, uStage);
  vec3 col = base + hue * uStage * (0.55 * rays + 0.35 * rays2 + 0.9 * glow) + vec3(1.0) * uStage * 0.35 * glow * glow;
  col *= mix(1.0, smoothstep(-0.05, 0.45, vUv.y), 0.6);
  // the metal set: harder, narrower red rays cut by drifting smoke (closed-form sums of sines)
  float smoke = 0.5 + 0.5 * sin(vUv.x * 7.0 + uTime * 0.35 + sin(vUv.y * 5.0 - uTime * 0.21) * 1.7) * sin(vUv.y * 4.0 - uTime * 0.18 + 2.0);
  smoke *= smoothstep(0.85, 0.15, vUv.y);
  col = mix(col, col * 0.55 + vec3(0.09, 0.08, 0.08) * smoke, 0.6 * uMetal);
  gl_FragColor = vec4(col, 1.0);
}`;

/** The metal floor: dark steel plates with rivet lines and a hot sheen from the light, no coloured tiles. */
const METAL_FLOOR_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uHue; uniform float uStage;
varying vec3 vWorld;
${HASH}
void main() {
  vec2 q = vWorld.xz / vec2(2.4, 1.2);
  vec2 id = floor(q);
  vec2 g = fract(q);
  float seam = smoothstep(0.0, 0.02, g.x) * smoothstep(0.0, 0.03, g.y);
  float h = hash12(id);
  float far = smoothstep(4.0, -14.0, vWorld.z);
  float sheen = exp(-abs(vWorld.x) * 0.25) * (0.6 + 0.4 * far);
  vec3 steel = vec3(0.05, 0.05, 0.06) * (0.7 + 0.5 * h);
  vec3 col = steel * seam + uHue * uStage * 0.22 * sheen * seam;
  gl_FragColor = vec4(col, 1.0);
}`;

const FLOOR_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uHue; uniform float uStage; uniform float uAlign; uniform float uDust;
varying vec3 vWorld;
${HASH}
void main() {
  vec2 q = vWorld.xz / 0.9;
  vec2 id = floor(q);
  vec2 g = fract(q);
  float seam = step(0.05, g.x) * step(0.05, g.y);
  float h = hash12(id);
  float tw = pow(0.5 + 0.5 * sin(uTime * (1.5 + 2.5 * h) + h * 40.0), 14.0);
  float far = smoothstep(4.0, -14.0, vWorld.z);
  // The align sweep: rows light front to back as uAlign runs 0 -> 1 ("stable and clean").
  float row = clamp((4.0 - vWorld.z) / 18.0, 0.0, 1.0);
  float sweep = smoothstep(0.12, 0.0, abs(row - uAlign)) * step(0.001, uAlign) * step(uAlign, 0.999);
  vec3 tile = mix(vec3(0.02, 0.01, 0.04), uHue * 0.32, uStage * (0.35 + 0.65 * far));
  vec3 col = tile * (0.75 + 0.5 * h) * seam;
  col += (uHue * 0.6 + 0.4) * tw * (0.25 + 0.75 * uStage) * seam * mix(1.0, 0.35, far) * max(uStage, uDust);
  col += (uHue + 0.3) * sweep * seam * 0.9;
  gl_FragColor = vec4(col, 1.0);
}`;

const BALL_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uHue; uniform float uStage; uniform float uSpin;
varying vec2 vUv;
${HASH}
void main() {
  vec2 q = vec2(fract(vUv.x + uSpin) * 64.0, vUv.y * 32.0);
  vec2 id = floor(q); vec2 g = fract(q);
  float seam = step(0.08, g.x) * step(0.08, g.y);
  float h = hash12(id + 7.0);
  float face = sin(vUv.y * 3.14159);
  float facing = pow(max(0.0, sin((vUv.x + uSpin) * 6.28318 * 1.0 + 1.57)), 1.5);
  float spark = pow(0.5 + 0.5 * sin(uTime * (3.0 + 5.0 * h) + h * 50.0), 24.0);
  vec3 col = (uHue * (0.25 + 0.6 * h) + vec3(0.15)) * face * (0.3 + 0.7 * facing);
  col += vec3(1.0) * spark * facing * 1.2;
  col *= seam * mix(0.25, 1.0, uStage);
  gl_FragColor = vec4(col, 1.0);
}`;

const PLATE_FRAG = /* glsl */ `
uniform sampler2D map; uniform vec3 uHue; uniform float uAmount; uniform float uOpacity; uniform vec2 uCrop;
varying vec2 vUv;
${GRADE_GLSL}
void main() {
  vec2 uv = (vUv - 0.5) * uCrop + 0.5;
  vec3 c = texture2D(map, uv).rgb;
  gl_FragColor = vec4(gradeTint(c, uHue, uAmount), uOpacity);
}`;

export interface SetProps {
  t: number;
  grade: Grade;
  /** 0..1: a sweep of lit rows across the mirror tiles. */
  align?: number;
  /** Floor glints in the dark before the stage lights (0..1). */
  dust?: number;
  /** Mirror-ball spin speed in turns per second. */
  spin?: number;
  /** Split-screen wall: the right half takes this hue. */
  split?: Hex;
  /** Only the back wall (close-ups: no floor, no mirror ball peeking behind the heads). */
  wallOnly?: boolean;
  /** The all-metal set (scene-map.md, 23d272a): no mirror ball, steel floor plates, smoke. */
  metal?: boolean;
}

export const CodeSet = ({ t, grade, align = 0, dust = 0, spin = 0.06, split, wallOnly = false, metal = false }: SetProps) => {
  const g = gradeUniform(grade);
  const depth = HOME_Z - WALL_Z;
  const wallH = 2 * depth * Math.tan((40 * Math.PI) / 360) * 1.6;
  const wallW = wallH * 1.9;
  const wall = useUniforms({ uTime: t, uHue: g.hue, uStage: g.stage, uAspect: [wallW / wallH, 1], uHue2: rgb(split ?? grade.hue), uSplit: split ? 1 : 0, uMetal: metal ? 1 : 0 });
  const floor = useUniforms({ uTime: t, uHue: g.hue, uStage: g.stage, uAlign: align, uDust: dust });
  const ball = useUniforms({ uTime: t, uHue: g.hue, uStage: g.stage, uSpin: t * spin });
  return (
    <>
      <mesh position={[0, 2, WALL_Z]} renderOrder={ORDER.plate}>
        <planeGeometry args={[wallW, wallH]} />
        <shaderMaterial {...wall} vertexShader={VERT} fragmentShader={WALL_FRAG} depthTest={false} depthWrite={false} />
      </mesh>
      {!wallOnly && (
        <>
      <mesh position={[0, FLOOR_Y, -6]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={ORDER.floor}>
        <planeGeometry args={[60, 20]} />
        <shaderMaterial key={metal ? 'metal' : 'disco'} {...floor} vertexShader={VERT} fragmentShader={metal ? METAL_FLOOR_FRAG : FLOOR_FRAG} depthTest={false} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 5.3, -7]} renderOrder={ORDER.ball} visible={!metal}>
        <sphereGeometry args={[1.9, 64, 32]} />
        <shaderMaterial {...ball} vertexShader={VERT} fragmentShader={BALL_FRAG} depthTest={false} depthWrite={false} />
      </mesh>
        </>
      )}
    </>
  );
};

export const usePlateTexture = (src: string) => {
  const tex = useLoader(TextureLoader, staticFile(src));
  // Raw in, raw out (see Stage): the texture is read as stored, no sRGB decode.
  tex.colorSpace = NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 4;
  return tex;
};

/** A painted plate (or duo card) filling the frame at the wall depth, `cover`-fitted with overscan for camera moves. */
export const PlateImage = ({ src, grade, opacity = 1, overscan = 1.12 }: { src: string; grade: Grade; opacity?: number; overscan?: number }) => {
  const tex = usePlateTexture(src);
  const img = tex.image as { width: number; height: number };
  const depth = HOME_Z - WALL_Z;
  const h = 2 * depth * Math.tan((40 * Math.PI) / 360) * overscan;
  const w = (h * 16) / 9;
  const imgAspect = img.width / img.height;
  // cover: crop the image's longer side so the plane's 16:9 is filled without stretching
  const crop: [number, number] = imgAspect > 16 / 9 ? [16 / 9 / imgAspect, 1] : [1, imgAspect / (16 / 9)];
  const u = useUniforms({ map: tex, uHue: gradeUniform(grade).hue, uAmount: grade.amount, uOpacity: opacity, uCrop: crop });
  return (
    <mesh position={[0, 0, WALL_Z]} renderOrder={ORDER.plate}>
      <planeGeometry args={[w, h]} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={PLATE_FRAG} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
};

/** The slot: a painted plate when one exists, else the code-built stage. */
export const SetPlate = ({ plate, ...set }: SetProps & { plate?: string }) =>
  plate ? <PlateImage src={plate} grade={set.grade} /> : <CodeSet {...set} />;

