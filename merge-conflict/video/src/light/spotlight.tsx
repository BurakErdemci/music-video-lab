// The spotlight is "line 42" (scene-map.md): a hard white cone from above plus a floor pool, aimed at an x.
// A whip is an outQuad move of 28-48 frames at 60 fps, then a full stop; snaps switch it on or off in one
// frame. The cone is a trapezoid facing the (frontal) camera, rebuilt each frame from the closed-form aim.
import { useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide } from 'three';
import { type Hex, clamp01, lerp, outQuad, rgb } from '../lib/ease.ts';
import { FLOOR_Y } from '../stage/SetPlate.tsx';
import { ORDER, useUniforms } from '../stage/Stage.tsx';
import { f } from '../timing.ts';

export interface Whip { id: string; t: number; frames: number; x: number }
export interface Snap { id: string; t: number; on: boolean }
export interface SpotPlan { label: string; x0: number; whips: readonly Whip[]; snaps: readonly Snap[]; on0?: boolean }

export const spotPlan = (p: SpotPlan): SpotPlan => {
  let prevEnd = -Infinity;
  for (const w of p.whips) {
    if (w.frames < 28 || w.frames > 48) throw new Error(`${p.label}/${w.id}: spotlight whip of ${w.frames} frames (allowed 28-48 at 60 fps)`);
    if (f(w.t) < prevEnd) throw new Error(`${p.label}/${w.id}: whip starts before the previous one stopped`);
    prevEnd = f(w.t) + w.frames;
  }
  return p;
};

/** Aim x and on/off at time t. */
export const spotAt = (p: SpotPlan, t: number): { x: number; on: number } => {
  let x = p.x0;
  for (const w of p.whips) {
    if (t < w.t) break;
    x = lerp(x, w.x, outQuad(((t - w.t) * 60) / w.frames));
  }
  let on = p.on0 ?? false;
  for (const s of p.snaps) if (t >= s.t) on = s.on;
  return { x, on: on ? 1 : 0 };
};

/** Brightness a card at x takes from the spot (dimmer outside the cone, brighter inside). */
export const litAt = (spot: { x: number; on: number }, x: number, base = 0.7): number =>
  lerp(1, base + 0.5 * clamp01(1 - Math.abs(x - spot.x) / 2.6), spot.on);

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CONE_FRAG = /* glsl */ `
uniform vec3 uTint; uniform float uOn; uniform float uTime;
varying vec2 vUv;
void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float hard = 1.0 - smoothstep(0.92, 1.0, across);
  float core = pow(1.0 - across * across, 2.0);
  float shimmer = 0.92 + 0.08 * sin(vUv.y * 40.0 - uTime * 3.0 + vUv.x * 9.0);
  float i = (0.16 * hard + 0.22 * core) * mix(1.25, 0.8, vUv.y) * shimmer;
  gl_FragColor = vec4(uTint * i * uOn, 1.0);
}`;
const POOL_FRAG = /* glsl */ `
uniform vec3 uTint; uniform float uOn;
varying vec2 vUv;
void main() {
  float r = length((vUv - 0.5) * 2.0);
  float i = (1.0 - smoothstep(0.9, 1.0, r)) * (0.38 + 0.4 * (1.0 - r * r));
  gl_FragColor = vec4(uTint * i * uOn, 1.0);
}`;

const APEX: [number, number, number] = [0, 7.2, -3];
const TOP_W = 0.5;
const BOTTOM_W = 3.6;

export const Spotlight = ({ plan, t, tint = '#fff6ee' }: { plan: SpotPlan; t: number; tint?: Hex }) => {
  const s = spotAt(plan, t);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    return g;
  }, []);
  // The apex leans a little toward the aim so the cone swings like a hung light, not a sliding wedge.
  const ax = APEX[0] + s.x * 0.35;
  const bottom: [number, number, number] = [s.x, FLOOR_Y, 0];
  const dx = bottom[0] - ax;
  const dy = bottom[1] - APEX[1];
  const len = Math.hypot(dx, dy);
  const px = -dy / len;
  const py = dx / len;
  const pos = geo.getAttribute('position') as BufferAttribute;
  pos.setXYZ(0, ax - (px * TOP_W) / 2, APEX[1] - (py * TOP_W) / 2, APEX[2]);
  pos.setXYZ(1, ax + (px * TOP_W) / 2, APEX[1] + (py * TOP_W) / 2, APEX[2]);
  pos.setXYZ(2, bottom[0] - (px * BOTTOM_W) / 2, bottom[1] - (py * BOTTOM_W) / 2, bottom[2]);
  pos.setXYZ(3, bottom[0] + (px * BOTTOM_W) / 2, bottom[1] + (py * BOTTOM_W) / 2, bottom[2]);
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  const cone = useUniforms({ uTint: rgb(tint), uOn: s.on, uTime: t });
  const pool = useUniforms({ uTint: rgb(tint), uOn: s.on });
  return (
    <>
      <mesh geometry={geo} renderOrder={ORDER.cone} frustumCulled={false}>
        <shaderMaterial uniforms={cone} vertexShader={VERT} fragmentShader={CONE_FRAG} transparent blending={AdditiveBlending} depthTest={false} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh position={[s.x, FLOOR_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={ORDER.pool}>
        <planeGeometry args={[BOTTOM_W * 1.45, 2.0]} />
        <shaderMaterial uniforms={pool} vertexShader={VERT} fragmentShader={POOL_FRAG} transparent blending={AdditiveBlending} depthTest={false} depthWrite={false} side={DoubleSide} />
      </mesh>
    </>
  );
};
