// Light sources as geometry: there is no post-processing pass, so glow is built from soft additive meshes.
import { useMemo } from 'react';
import { CatmullRomCurve3, CylinderGeometry, Quaternion, TubeGeometry, Vector3 } from 'three';
import type { Vec3 } from '../../camera/camera.ts';
import { type Hex, rgb } from '../../lib/ease.ts';
import { useUniforms } from '../../stage/Stage.tsx';
import { additive, clampOpacity, VERT } from './common.tsx';

// ---- Halo ---------------------------------------------------------------------------------------------------
// The billboard is done in the vertex shader (the plane's centre in view space, offset along the view axes), so
// it always faces the camera without reading the camera in React, where the pose of the frame is not yet applied.
const HALO_VERT = /* glsl */ `uniform float uSize; varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
}`;
const HALO_FRAG = /* glsl */ `uniform vec3 uColor; uniform float uInt; uniform float uOpacity; varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float g = exp(-r * r * 5.0) * (1.0 - smoothstep(0.7, 1.0, r));
  float core = exp(-r * 14.0);
  vec3 col = uColor * g + vec3(1.0) * core * 0.6;
  gl_FragColor = vec4(col * uInt * uOpacity, 1.0);
}`;

export interface HaloProps { position: Vec3; size: number; color: Hex; intensity?: number; opacity?: number; order?: number }
export const Halo = ({ position, size, color, intensity = 1, opacity = 1, order = 6 }: HaloProps) => {
  const u = useUniforms({ uSize: size, uColor: rgb(color), uInt: intensity, uOpacity: clampOpacity(opacity) });
  return (
    <mesh position={position} renderOrder={order} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial {...u} vertexShader={HALO_VERT} fragmentShader={HALO_FRAG} {...additive} />
    </mesh>
  );
};

// ---- NeonTube -----------------------------------------------------------------------------------------------
const TUBE_FRAG = /* glsl */ `uniform vec3 uColor; uniform float uWhite; uniform float uGain; uniform float uPow; uniform float uOn; uniform float uOpacity;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float f = pow(clamp(abs(dot(normalize(vNormal), v)), 0.0, 1.0), uPow);
  // uv.x runs along the curve; the lit part ends in a short soft tip with a brighter head
  float full = step(0.999, uOn);
  float lit = max(full, 1.0 - smoothstep(uOn - 0.012, uOn, vUv.x));
  float head = (1.0 - full) * step(0.0005, uOn) * exp(-abs(vUv.x - uOn) * 50.0);
  vec3 col = mix(uColor, vec3(1.0), uWhite) * f * uGain * (lit + 0.8 * head);
  gl_FragColor = vec4(col * uOpacity, 1.0);
}`;

interface TubeLayerProps { geo: TubeGeometry; color: Hex; white: number; gain: number; pow: number; on: number; opacity: number; order: number }
const TubeLayer = ({ geo, color, white, gain, pow, on, opacity, order }: TubeLayerProps) => {
  const u = useUniforms({ uColor: rgb(color), uWhite: white, uGain: gain, uPow: pow, uOn: on, uOpacity: opacity });
  return (
    <mesh geometry={geo} renderOrder={order} frustumCulled={false}>
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={TUBE_FRAG} {...additive} />
    </mesh>
  );
};

export interface NeonTubeProps {
  points: Vec3[];
  color: Hex;
  radius: number;
  /** Fraction of the length lit, along the curve (0..1). */
  on?: number;
  /** Accepted for a uniform kit signature; a tube is static apart from `on`. */
  t?: number;
  opacity?: number;
  order?: number;
}
/** A bright, near-white core and two wider additive halo tubes (the bloom look). */
export const NeonTube = ({ points, color, radius, on = 1, opacity = 1, order = 5 }: NeonTubeProps) => {
  const geos = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    const seg = Math.max(64, points.length * 24);
    return [1, 2.6, 6].map((k) => new TubeGeometry(curve, seg, radius * k, 10, false));
  }, [points, radius]);
  const o = clampOpacity(opacity);
  const lit = clampOpacity(on);
  return (
    <>
      <TubeLayer geo={geos[2] as TubeGeometry} color={color} white={0} gain={0.35} pow={3} on={lit} opacity={o} order={order} />
      <TubeLayer geo={geos[1] as TubeGeometry} color={color} white={0.1} gain={0.7} pow={2.2} on={lit} opacity={o} order={order + 0.01} />
      <TubeLayer geo={geos[0] as TubeGeometry} color={color} white={0.8} gain={1.6} pow={1.2} on={lit} opacity={o} order={order + 0.02} />
    </>
  );
};

// ---- Beams --------------------------------------------------------------------------------------------------
const BEAM_FRAG = /* glsl */ `uniform vec3 uColor; uniform float uInt; uniform float uPow; uniform float uFall; uniform float uOpacity;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float f = pow(clamp(abs(dot(normalize(vNormal), v)), 0.0, 1.0), uPow);
  float along = 1.0 - vUv.y; // 0 at the source, 1 at the far end
  float fall = pow(1.0 - along, uFall) * (1.0 - smoothstep(0.82, 1.0, along));
  gl_FragColor = vec4(uColor * f * fall * uInt * uOpacity, 1.0);
}`;

interface BeamProps { from: Vec3; to: Vec3; r0: number; r1: number; color: Hex; intensity: number; pow: number; fall: number; opacity: number; order: number }
const Beam = ({ from, to, r0, r1, color, intensity, pow, fall, opacity, order }: BeamProps) => {
  const { geo, mid, quat } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    // CylinderGeometry has its top (+y, uv.y = 1) at the source
    return {
      geo: new CylinderGeometry(r0, r1, a.distanceTo(b), 32, 1, true),
      mid: a.clone().add(b).multiplyScalar(0.5).toArray() as Vec3,
      quat: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), a.clone().sub(b).normalize()),
    };
  }, [from, to, r0, r1]);
  const u = useUniforms({ uColor: rgb(color), uInt: intensity, uPow: pow, uFall: fall, uOpacity: clampOpacity(opacity) });
  return (
    <mesh geometry={geo} position={mid} quaternion={quat} renderOrder={order} frustumCulled={false}>
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={BEAM_FRAG} {...additive} />
    </mesh>
  );
};

export interface BeamConeProps { from: Vec3; to: Vec3; radius: number; color: Hex; intensity?: number; opacity?: number; order?: number }
/** A volumetric light cone: soft toward its edges (view angle) and toward its far end. `radius` is the far end's. */
export const BeamCone = ({ from, to, radius, color, intensity = 0.6, opacity = 1, order = 4 }: BeamConeProps) => (
  <Beam from={from} to={to} r0={0.04} r1={radius} color={color} intensity={intensity} pow={1.6} fall={0.9} opacity={opacity} order={order} />
);

export interface LaserFanProps {
  origin: Vec3;
  count: number;
  /** Total angle of the fan, radians. */
  spread: number;
  /** Centre direction, radians counter-clockwise from +x in the x-y plane. */
  angle: number;
  length: number;
  color: Hex;
  width: number;
  intensity?: number;
  opacity?: number;
  order?: number;
}
/** Thin additive beams, each a white-hot core inside a wider tinted halo. */
export const LaserFan = ({ origin, count, spread, angle, length, color, width, intensity = 1, opacity = 1, order = 4.5 }: LaserFanProps) => {
  const ends = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = angle + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
        return [origin[0] + Math.cos(a) * length, origin[1] + Math.sin(a) * length, origin[2]] as Vec3;
      }),
    [origin, count, spread, angle, length],
  );
  return (
    <>
      {ends.map((to, i) => (
        <group key={i}>
          <Beam from={origin} to={to} r0={width * 4} r1={width * 4} color={color} intensity={0.35 * intensity} pow={2.2} fall={0.25} opacity={opacity} order={order} />
          <Beam from={origin} to={to} r0={width} r1={width} color="#ffffff" intensity={0.9 * intensity} pow={1.1} fall={0.25} opacity={opacity} order={order + 0.01} />
        </group>
      ))}
    </>
  );
};
