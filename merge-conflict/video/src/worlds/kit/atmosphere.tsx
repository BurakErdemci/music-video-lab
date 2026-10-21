// Atmosphere: smoke planes, rising embers with radial spark bursts, and a flame wall. All closed-form in `t`.
import { useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import type { Vec3 } from '../../camera/camera.ts';
import { clamp01, type Hex, rgb } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { useUniforms } from '../../stage/Stage.tsx';
import { additive, clampOpacity, NOISE_GLSL, plain, PX, VERT } from './common.tsx';

// ---- Smoke --------------------------------------------------------------------------------------------------
const SMOKE_FRAG = /* glsl */ `uniform float uTime; uniform vec3 uColor; uniform float uDensity; uniform float uSeed; uniform float uDir; uniform float uOpacity;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  vec2 p = vUv * vec2(2.6, 1.5) + vec2(uSeed * 17.0, uSeed * 5.0);
  p.x += uTime * 0.05 * uDir;
  vec2 warp = vec2(kitFbm(p + vec2(0.0, uTime * 0.04)), kitFbm(p + vec2(5.2, 1.3) - vec2(uTime * 0.03, 0.0)));
  float n = kitFbm(p + warp * 1.4 + vec2(0.0, uTime * 0.02));
  float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x) * smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
  float a = smoothstep(0.32, 0.8, n) * edge * uDensity;
  gl_FragColor = vec4(uColor * (0.7 + 0.5 * n), a * 0.75 * uOpacity);
}`;

const SmokePlane = ({ t, position, size, color, density, seed, dir, opacity, order }: { t: number; position: Vec3; size: [number, number]; color: Hex; density: number; seed: number; dir: number; opacity: number; order: number }) => {
  const u = useUniforms({ uTime: t, uColor: rgb(color), uDensity: density, uSeed: seed, uDir: dir, uOpacity: opacity });
  return (
    <mesh position={position} renderOrder={order} frustumCulled={false}>
      <planeGeometry args={size} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={SMOKE_FRAG} {...plain} />
    </mesh>
  );
};

export interface SmokeProps { y: number; z: number; width: number; height: number; color: Hex; density: number; t: number; opacity?: number; order?: number }
/** Four large drifting fbm planes, low alpha, stacked in depth around `z`. */
export const Smoke = ({ y, z, width, height, color, density, t, opacity = 1, order = 3.5 }: SmokeProps) => (
  <>
    {[0, 1, 2, 3].map((i) => (
      <SmokePlane
        key={i}
        t={t}
        position={[(i - 1.5) * width * 0.04, y + (i % 2) * height * 0.12, z - i * 0.9]}
        size={[width * (1 - i * 0.07), height * (1 + i * 0.1)]}
        color={color}
        density={density}
        seed={i + 1}
        dir={i % 2 ? -1 : 1}
        opacity={clampOpacity(opacity)}
        order={order + i * 0.01}
      />
    ))}
  </>
);

// ---- Embers -------------------------------------------------------------------------------------------------
export interface EmberBurst { t: number; origin: Vec3 }
export const MAX_EMBER_BURSTS = 4;
const SPARKS_PER_BURST = 90;

const EMBER_VERT = /* glsl */ `uniform float uTime; uniform float uPx; uniform vec3 uBoxA; uniform vec3 uBoxB; uniform vec4 uBurstT; uniform vec3 uBurstO[4];
attribute vec4 aSeed; attribute vec4 aRnd; attribute float aKind;
varying float vA; varying float vHot;
void main() {
  float t = uTime;
  vec3 p; float alpha; float size;
  if (aKind < 0.5) {
    vec3 sz = uBoxB - uBoxA;
    float y = mod(aSeed.y * sz.y + mix(0.25, 0.9, aRnd.x) * t, sz.y);
    float life = y / sz.y;
    float sway = 0.3 * sin(t * (0.6 + aRnd.y) + aSeed.w * 40.0) + 0.12 * sin(t * 2.3 + aRnd.z * 30.0);
    p = uBoxA + vec3(aSeed.x * sz.x + sway, y, aSeed.z * sz.z);
    alpha = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.55, 1.0, life));
    alpha *= 0.55 + 0.45 * sin(t * mix(5.0, 14.0, aRnd.z) + aSeed.w * 60.0);
    size = mix(0.05, 0.12, aRnd.w);
    vHot = 0.0;
  } else {
    int slot = int(aKind + 0.5) - 1;
    float tb = slot == 0 ? uBurstT.x : slot == 1 ? uBurstT.y : slot == 2 ? uBurstT.z : uBurstT.w;
    vec3 o = slot == 0 ? uBurstO[0] : slot == 1 ? uBurstO[1] : slot == 2 ? uBurstO[2] : uBurstO[3];
    float a = t - tb;
    float theta = aSeed.x * 6.2832;
    float cp = aSeed.y * 2.0 - 1.0;
    float sp = sqrt(1.0 - cp * cp);
    vec3 dir = vec3(sp * cos(theta), cp, sp * sin(theta));
    float spd = mix(2.5, 7.0, aRnd.x);
    float e = (1.0 - exp(-2.0 * a)) * 0.5; // drag: the sparks slow as they travel
    p = o + dir * spd * e;
    p.y -= 3.0 * a * a; // gravity
    float f = clamp(1.0 - a, 0.0, 1.0);
    alpha = (a < 0.0 || a > 1.0) ? 0.0 : f * f * (0.6 + 0.4 * sin(t * 40.0 + aSeed.w * 50.0));
    size = mix(0.04, 0.09, aRnd.w) * (1.0 + 0.8 * f);
    vHot = f;
  }
  vA = alpha;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = alpha > 0.002 ? size * uPx / max(0.5, -mv.z) : 0.0;
}`;

const EMBER_FRAG = /* glsl */ `uniform vec3 uColor; uniform float uOpacity; varying float vA; varying float vHot;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float g = exp(-r * r * 3.5) * (1.0 - smoothstep(0.8, 1.0, r));
  vec3 col = mix(uColor, vec3(1.0, 0.92, 0.7), clamp(exp(-r * 5.0) * 0.6 + vHot * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(col * g * vA * uOpacity, 1.0);
}`;

export interface EmbersProps {
  box: [number, number, number, number, number, number];
  count: number;
  t: number;
  color: Hex;
  bursts?: readonly EmberBurst[];
  opacity?: number;
  order?: number;
}
/** Rising, flickering points inside `box`; each burst throws radial sparks with drag and gravity for 1 s. */
export const Embers = ({ box, count, t, color, bursts = [], opacity = 1, order = 12 }: EmbersProps) => {
  if (bursts.length > MAX_EMBER_BURSTS) throw new Error(`embers: ${bursts.length} bursts (max ${MAX_EMBER_BURSTS})`);
  const geo = useMemo(() => {
    const kinds = [...Array(count).fill(0), ...Array.from({ length: MAX_EMBER_BURSTS * SPARKS_PER_BURST }, (_, i) => 1 + Math.floor(i / SPARKS_PER_BURST))] as number[];
    const n = kinds.length;
    const seed = new Float32Array(n * 4);
    const rnd = new Float32Array(n * 4);
    const rng = seeded(`embers:${count}`);
    for (let i = 0; i < n * 4; i++) {
      seed[i] = rng();
      rnd[i] = rng();
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new BufferAttribute(seed, 4));
    g.setAttribute('aRnd', new BufferAttribute(rnd, 4));
    g.setAttribute('aKind', new BufferAttribute(new Float32Array(kinds), 1));
    return g;
  }, [count]);
  const u = useUniforms({
    uTime: t,
    uPx: PX,
    uBoxA: [box[0], box[2], box[4]],
    uBoxB: [box[1], box[3], box[5]],
    uBurstT: [0, 1, 2, 3].map((i) => bursts[i]?.t ?? -100),
    uBurstO: [0, 1, 2, 3].flatMap((i) => bursts[i]?.origin ?? [0, 0, 0]),
    uColor: rgb(color),
    uOpacity: clampOpacity(opacity),
  });
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={order}>
      <shaderMaterial {...u} vertexShader={EMBER_VERT} fragmentShader={EMBER_FRAG} {...additive} />
    </points>
  );
};

// ---- FireWall -----------------------------------------------------------------------------------------------
const FIRE_FRAG = /* glsl */ `uniform float uTime; uniform float uRise; uniform float uW; uniform float uH; uniform float uPhase; uniform vec3 uC0; uniform vec3 uC1; uniform float uOpacity;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  float x = vUv.x; float y = vUv.y;
  vec2 p = vec2(x * uW * 0.5 + uPhase * 7.0, y * uH * 0.32 - uTime * 1.7);
  float n = kitFbm(p + vec2(kitFbm(p * 1.7 + uTime * 0.35) * 0.9, 0.0));
  float tongue = 0.5 + 0.5 * kitFbm(vec2(x * uW * 0.35 + uPhase * 3.0, uTime * 0.7));
  float top = uRise * tongue;
  float flame = clamp(((1.0 - y / max(top, 0.001)) + (n - 0.5) * 0.9) * 1.3, 0.0, 1.0);
  flame *= smoothstep(0.0, 0.04, x) * smoothstep(1.0, 0.96, x);
  vec3 col = mix(uC0, uC1, smoothstep(0.3, 0.9, flame)) + vec3(1.0, 0.85, 0.6) * pow(flame, 4.0) * 0.4;
  gl_FragColor = vec4(col * flame * 0.9 * uOpacity, 1.0);
}`;

const FireLayer = ({ t, x0, x1, z, y, height, rise, colors, phase, opacity, order }: { t: number; x0: number; x1: number; z: number; y: number; height: number; rise: number; colors: [Hex, Hex]; phase: number; opacity: number; order: number }) => {
  const u = useUniforms({ uTime: t, uRise: rise, uW: x1 - x0, uH: height, uPhase: phase, uC0: rgb(colors[0]), uC1: rgb(colors[1]), uOpacity: opacity });
  return (
    <mesh position={[(x0 + x1) / 2, y + height / 2, z]} renderOrder={order} frustumCulled={false}>
      <planeGeometry args={[x1 - x0, height]} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={FIRE_FRAG} {...additive} />
    </mesh>
  );
};

export interface FireWallProps {
  x0: number;
  x1: number;
  z: number;
  /** Full height of the wall at rise = 1. */
  height: number;
  /** 0..1: how far the flames have risen. */
  rise: number;
  colors: [Hex, Hex];
  t: number;
  /** World y of the wall's foot (the stage floor). */
  y?: number;
  opacity?: number;
  order?: number;
}
/** Two noise-driven flame sheets (one slightly behind the other) whose height follows `rise`. */
export const FireWall = ({ x0, x1, z, height, rise, colors, t, y = -3.4, opacity = 1, order = 3 }: FireWallProps) => (
  <>
    <FireLayer t={t} x0={x0} x1={x1} z={z - 0.4} y={y} height={height} rise={clamp01(rise)} colors={colors} phase={0.37} opacity={clampOpacity(opacity)} order={order} />
    <FireLayer t={t + 0.9} x0={x0} x1={x1} z={z} y={y} height={height} rise={clamp01(rise)} colors={colors} phase={1.91} opacity={clampOpacity(opacity)} order={order + 0.01} />
  </>
);
