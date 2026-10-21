// Lit surfaces: mirror-ball dots, an LED wall, a dance-arcade tile floor and a glowing box.
import type { Vec3 } from '../../camera/camera.ts';
import { clamp01, type Hex, rgb } from '../../lib/ease.ts';
import { useUniforms } from '../../stage/Stage.tsx';
import { Halo } from './lights.tsx';
import { additive, clampOpacity, VERT } from './common.tsx';

// ---- Mirror-ball dots ---------------------------------------------------------------------------------------
/** GLSL chunk for other shaders to include (the girls' cards): coverage 0..1 of mirror-ball reflection dots at
 *  `worldPos`. The dots sit on a sphere of directions around `ballPos`, turn with spin * t (turns per second)
 *  and twinkle; the surface point picks the dot that lies on its direction from the ball. Self-contained. */
export const MIRROR_DOTS_GLSL = /* glsl */ `
float mirrorHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float mirrorDots(vec3 worldPos, float t, vec3 ballPos, float spin) {
  vec3 d = normalize(worldPos - ballPos);
  // 96 columns per turn: the spin offset is added in turns, so the seam of atan() stays on a cell boundary
  vec2 q = vec2((atan(d.z, d.x) / 6.2831853 + spin * t) * 96.0, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 * 48.0 + 24.0);
  vec2 id = floor(q);
  id.x = mod(id.x, 96.0);
  vec2 g = fract(q) - 0.5;
  float h = mirrorHash(id);
  float dotShape = 1.0 - smoothstep(0.08, 0.34, length(g));
  float on = step(0.7, h);
  float twinkle = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(t * (2.0 + 5.0 * h) + h * 60.0), 3.0);
  return dotShape * on * twinkle;
}`;

const DOTS_FRAG = /* glsl */ `uniform float uTime; uniform vec3 uBall; uniform float uSpin; uniform vec3 uColor; uniform float uInt; uniform float uOpacity;
varying vec3 vWorld;
${MIRROR_DOTS_GLSL}
void main() {
  float m = mirrorDots(vWorld, uTime, uBall, uSpin);
  vec3 col = mix(uColor, vec3(1.0), 0.35) * m * uInt;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}`;

export interface DotsPlaneProps {
  position: Vec3;
  size: [number, number];
  rotation?: Vec3;
  color: Hex;
  intensity?: number;
  t: number;
  ballPos: Vec3;
  /** Turns per second. */
  spin?: number;
  opacity?: number;
  order?: number;
}
export const DotsPlane = ({ position, size, rotation = [0, 0, 0], color, intensity = 1, t, ballPos, spin = 0.06, opacity = 1, order = 2 }: DotsPlaneProps) => {
  const u = useUniforms({ uTime: t, uBall: ballPos, uSpin: spin, uColor: rgb(color), uInt: intensity, uOpacity: clampOpacity(opacity) });
  return (
    <mesh position={position} rotation={rotation} renderOrder={order} frustumCulled={false}>
      <planeGeometry args={size} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={DOTS_FRAG} {...additive} />
    </mesh>
  );
};

// ---- LedWall ------------------------------------------------------------------------------------------------
export type LedPattern = 'bars' | 'radial' | 'checker' | 'scan';
const PATTERNS: readonly LedPattern[] = ['bars', 'radial', 'checker', 'scan'];

const LED_FRAG = /* glsl */ `uniform float uTime; uniform vec2 uGrid; uniform float uPattern; uniform float uPulse; uniform vec3 uC0; uniform vec3 uC1; uniform float uOpacity;
varying vec2 vUv;
float ledHash(float n) { return fract(sin(n * 91.345) * 47453.5453); }
void main() {
  vec2 q = vUv * uGrid;
  vec2 id = floor(q);
  vec2 g = fract(q) - 0.5;
  vec2 u = (id + 0.5) / uGrid;
  float cell = 1.0 - smoothstep(0.34, 0.42, max(abs(g.x), abs(g.y)));
  float v;
  if (uPattern < 0.5) { // bars: columns of different height, bouncing
    float h = 0.2 + 0.75 * (0.5 + 0.5 * sin(uTime * (2.0 + 2.0 * ledHash(id.x)) + id.x * 1.7));
    v = step(u.y, h);
  } else if (uPattern < 1.5) { // radial: rings travelling out of the centre
    v = 0.5 + 0.5 * sin(length((u - 0.5) * vec2(uGrid.x / uGrid.y, 1.0)) * 14.0 - uTime * 4.0);
  } else if (uPattern < 2.5) { // checker, flipping twice a second
    v = mod(id.x + id.y + floor(uTime * 2.0), 2.0);
  } else { // scan: a bright line sweeping upward
    v = exp(-abs(u.y - fract(uTime * 0.35)) * 12.0);
  }
  vec3 on = mix(uC0, uC1, clamp(u.x + 0.25 * sin(uTime + u.y * 3.0), 0.0, 1.0));
  vec3 col = on * (0.07 + 0.93 * v) * (1.0 + uPulse * 0.8) * cell;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}`;

export interface LedWallProps {
  position: Vec3;
  width: number;
  height: number;
  cols: number;
  rows: number;
  colors: [Hex, Hex];
  pattern: LedPattern;
  /** 0..1 extra brightness this frame. */
  pulse?: number;
  t: number;
  opacity?: number;
  order?: number;
}
export const LedWall = ({ position, width, height, cols, rows, colors, pattern, pulse = 0, t, opacity = 1, order = 1.5 }: LedWallProps) => {
  const u = useUniforms({ uTime: t, uGrid: [cols, rows], uPattern: PATTERNS.indexOf(pattern), uPulse: clamp01(pulse), uC0: rgb(colors[0]), uC1: rgb(colors[1]), uOpacity: clampOpacity(opacity) });
  return (
    <mesh position={position} renderOrder={order} frustumCulled={false}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={LED_FRAG} {...additive} />
    </mesh>
  );
};

// ---- TilePlatform -------------------------------------------------------------------------------------------
export interface Erupt { t: number; x: number; z: number }
export const MAX_ERUPTS = 4;
const ERUPT_SECONDS = 0.8;

const TILE_FRAG = /* glsl */ `uniform float uTime; uniform vec2 uCenter; uniform vec2 uSize; uniform vec2 uGrid; uniform float uSplitX; uniform vec3 uL; uniform vec3 uR;
uniform float uPulse; uniform vec3 uEr[4]; uniform float uOpacity;
varying vec3 vWorld;
void main() {
  vec2 q = ((vWorld.xz - uCenter) / uSize + 0.5) * uGrid;
  vec2 id = floor(q);
  vec2 g = fract(q) - 0.5;
  float d = max(abs(g.x), abs(g.y));
  float tile = 1.0 - smoothstep(0.4, 0.45, d);
  vec2 cw = ((id + 0.5) / uGrid - 0.5) * uSize + uCenter; // tile centre in world x, z
  vec3 base = cw.x < uSplitX ? uL : uR;
  float chase = pow(0.5 + 0.5 * sin(id.x * 0.8 - id.y * 0.55 - uTime * 3.5), 3.0);
  float lit = 0.1 + 0.5 * chase + 0.3 * uPulse;
  float wave = 0.0;
  for (int i = 0; i < 4; i++) {
    float a = uTime - uEr[i].x;
    if (a > 0.0 && a < ${ERUPT_SECONDS.toFixed(1)}) {
      float r = (length(cw - uEr[i].yz) - a * 14.0) / 0.9;
      wave += exp(-r * r) * (1.0 - a / ${ERUPT_SECONDS.toFixed(1)});
    }
  }
  vec3 col = base * lit * (0.65 + 0.7 * (1.0 - d)) + mix(base, vec3(1.0), 0.7) * wave * 1.3;
  gl_FragColor = vec4(col * tile * uOpacity, 1.0);
}`;

export interface TilePlatformProps {
  /** Centre of the platform; it lies on the plane y = position[1]. */
  position: Vec3;
  /** Extent along x. */
  width: number;
  /** Extent along z. */
  depth: number;
  cols: number;
  rows: number;
  splitX: number;
  left: Hex;
  right: Hex;
  t: number;
  /** 0..1: a local lift of the whole platform's brightness. */
  pulse?: number;
  erupt?: readonly Erupt[];
  opacity?: number;
  order?: number;
}
/** A floor of glowing square tiles: a base chase, split colours at splitX, and radial waves from each erupt. */
export const TilePlatform = ({ position, width, depth, cols, rows, splitX, left, right, t, pulse = 0, erupt = [], opacity = 1, order = 1 }: TilePlatformProps) => {
  if (erupt.length > MAX_ERUPTS) throw new Error(`tile platform: ${erupt.length} erupts (max ${MAX_ERUPTS})`);
  const u = useUniforms({
    uTime: t,
    uCenter: [position[0], position[2]],
    uSize: [width, depth],
    uGrid: [cols, rows],
    uSplitX: splitX,
    uL: rgb(left),
    uR: rgb(right),
    uPulse: clamp01(pulse),
    uEr: [0, 1, 2, 3].flatMap((i) => (erupt[i] ? [erupt[i].t, erupt[i].x, erupt[i].z] : [-100, 0, 0])),
    uOpacity: clampOpacity(opacity),
  });
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={order} frustumCulled={false}>
      <planeGeometry args={[width, depth]} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={TILE_FRAG} {...additive} />
    </mesh>
  );
};

// ---- GlowBox ------------------------------------------------------------------------------------------------
const BOX_FRAG = /* glsl */ `uniform vec3 uColor; uniform float uEdge; uniform float uFill; uniform float uOpacity;
varying vec2 vUv; varying vec3 vNormal;
void main() {
  float e = 1.0 - smoothstep(0.0, 0.1, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  float shade = 0.55 + 0.45 * clamp(vNormal.y * 0.7 + vNormal.x * 0.3 + 0.4, 0.0, 1.0);
  vec3 col = uColor * uFill * shade * 0.7 + mix(uColor, vec3(1.0), 0.65) * e * uEdge * 1.5;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}`;

export interface GlowBoxProps {
  position: Vec3;
  size: Vec3;
  color: Hex;
  /** 0..1 edge glow. */
  edge?: number;
  /** 0..1 face brightness. */
  fill?: number;
  rotation?: Vec3;
  opacity?: number;
  order?: number;
}
/** A box with glowing edges (buttons, server racks, presses) and a soft halo behind it. */
export const GlowBox = ({ position, size, color, edge = 0.8, fill = 0.4, rotation = [0, 0, 0], opacity = 1, order = 5 }: GlowBoxProps) => {
  const u = useUniforms({ uColor: rgb(color), uEdge: clamp01(edge), uFill: clamp01(fill), uOpacity: clampOpacity(opacity) });
  return (
    <>
      <Halo position={position} size={Math.max(...size) * 2.4} color={color} intensity={0.35 * clamp01(edge)} opacity={opacity} order={order - 0.01} />
      <mesh position={position} rotation={rotation} renderOrder={order} frustumCulled={false}>
        <boxGeometry args={size} />
        <shaderMaterial {...u} vertexShader={VERT} fragmentShader={BOX_FRAG} {...additive} />
      </mesh>
    </>
  );
};
