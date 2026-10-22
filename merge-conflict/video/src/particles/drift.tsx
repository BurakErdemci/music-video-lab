// Particles drifting through depth in front of a painting (round 10, Burak: the paintings read as slides). Seeded
// points, each a closed-form function of the clock (no simulation state): they come toward the camera from far to
// near along fixed world lines, so the ones off the centre stream outward like a slow flight through the room, and
// the camera's own moves give them true parallax against the frame-locked painting. Two layers: 'mid' (drawn behind
// a living painting's girls) and 'near' (in front of everything but the type). The kind matches the painting: dust
// in a light, embers rising off fire, sparks, confetti, glitter. `advance` (seconds of extra travel) is the hits'
// surge: on an accent they rush forward for a moment.
import { useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import type { CameraPose } from '../camera/camera.ts';
import { basis, FOV, H } from '../camera/camera.ts';
import { type Hex, rgb } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { ORDER, useUniforms } from '../stage/Stage.tsx';
import type { Particles } from '../worlds/paintview.ts';
import { useParticleCap } from './cap.ts';

const PX = H / 2 / Math.tan((FOV * Math.PI) / 360);
const LAYERS = {
  mid: { n: 520, z: [11, 26], order: ORDER.fieldBack + 0.2 },
  near: { n: 300, z: [2.5, 11], order: ORDER.fieldFront + 0.5 },
} as const;
export type DriftLayer = keyof typeof LAYERS;
/** kind -> [shader kind, cycle seconds, size, rise per cycle (frame halves), alpha] */
const KINDS: Record<Particles, [number, number, number, number, number]> = {
  dust: [0, 9, 0.08, 0.1, 0.6],
  embers: [1, 4.5, 0.07, 0.9, 0.95],
  sparks: [2, 2.6, 0.045, 0.35, 1],
  confetti: [3, 5, 0.12, -0.6, 1],
  glitter: [4, 6, 0.1, 0.05, 0.9],
};

const VERT = /* glsl */ `
uniform float uT; uniform vec3 uO; uniform vec3 uF; uniform vec3 uR; uniform vec3 uU; uniform vec2 uZ; uniform float uTan;
uniform float uCycle; uniform float uSize; uniform float uRise; uniform float uPx; uniform float uMaxPx; uniform float uDensity;
attribute vec4 aSeed;
varying float vA; varying float vAng; varying float vTw; varying float vMix;
void main() {
  float c = fract(aSeed.x + uT / (uCycle * mix(0.75, 1.3, aSeed.y)));
  float z = mix(uZ.y, uZ.x, c);
  // a fixed world line: its offset is the frame point it crosses at the layer's middle distance
  float zm = 0.5 * (uZ.x + uZ.y);
  vec2 fr = (aSeed.zw * 2.0 - 1.0) * vec2(uTan * 1.7778, uTan) * 1.1 * zm;
  fr.y += uRise * uTan * zm * (c - 0.5);
  fr.x += 0.25 * sin(uT * (0.6 + aSeed.y) + aSeed.z * 31.0);
  vec3 w = uO + uF * z + uR * fr.x + uU * fr.y;
  vec4 mv = modelViewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(uSize * mix(0.6, 1.4, aSeed.y) * uPx / max(-mv.z, 0.5), uMaxPx);
  vA = smoothstep(0.0, 0.18, c) * (1.0 - smoothstep(0.82, 1.0, c)) * step(aSeed.y, uDensity);
  vAng = aSeed.w * 6.2832 + uT * mix(-4.0, 4.0, aSeed.z);
  vTw = sin(uT * mix(3.0, 9.0, aSeed.x) + aSeed.y * 40.0);
  vMix = aSeed.z;
}`;
const FRAG = /* glsl */ `
uniform float uKind; uniform vec3 uColA; uniform vec3 uColB; uniform float uAlpha;
varying float vA; varying float vAng; varying float vTw; varying float vMix;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  vec3 col = mix(uColA, uColB, step(0.5, vMix));
  float a;
  if (uKind < 0.5) { a = 0.5 * smoothstep(0.5, 0.0, r); }                                   // dust: a soft mote
  else if (uKind < 1.5) { a = smoothstep(0.5, 0.05, r) * (0.65 + 0.35 * vTw); col = mix(col, vec3(1.0, 0.9, 0.6), smoothstep(0.2, 0.0, r)); } // ember
  else if (uKind < 2.5) { a = smoothstep(0.5, 0.15, r) * step(0.0, vTw); col = mix(col, vec3(1.0), 0.6 * smoothstep(0.25, 0.0, r)); } // spark
  else if (uKind < 3.5) {                                                                     // confetti: a spinning, flipping strip
    vec2 q = mat2(cos(vAng), -sin(vAng), sin(vAng), cos(vAng)) * p;
    float flip = 0.25 + 0.75 * abs(vTw);
    a = step(abs(q.x), 0.42) * step(abs(q.y), 0.2 * flip);
    col *= 0.6 + 0.4 * flip;
  } else {                                                                                    // glitter: a twinkling star
    float star = max(smoothstep(0.08, 0.0, abs(p.x)) * smoothstep(0.5, 0.0, abs(p.y)), smoothstep(0.08, 0.0, abs(p.y)) * smoothstep(0.5, 0.0, abs(p.x)));
    a = max(star, smoothstep(0.18, 0.0, r)) * max(0.0, vTw);
    col = mix(col, vec3(1.0), 0.5);
  }
  a *= vA * uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(min(col, vec3(1.0)), a);
}`;

const build = (layer: DriftLayer): BufferGeometry => {
  const { n } = LAYERS[layer];
  const seed = new Float32Array(n * 4);
  const rng = seeded(`drift:${layer}`);
  for (let i = 0; i < n * 4; i++) seed[i] = rng();
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSeed', new BufferAttribute(seed, 4));
  return g;
};

/** `base`: the shot's opening camera, the volume's anchor (so the live camera's moves parallax it). */
export const Drift = ({ t, layer, kind, colors, base, advance = 0, alpha = 1, density = 1 }: { t: number; layer: DriftLayer; kind: Particles; colors: [Hex, Hex]; base: CameraPose; advance?: number; alpha?: number; density?: number }) => {
  const geo = useMemo(() => build(layer), [layer]);
  const L = LAYERS[layer];
  const [k, cycle, size, rise, a] = KINDS[kind];
  const [f, r, u] = basis({ ...base, roll: 0 });
  const uni = useUniforms({
    uT: t + advance, uO: base.position, uF: f, uR: r, uU: u, uZ: [L.z[0], L.z[1]], uTan: Math.tan((base.fov * Math.PI) / 360),
    uCycle: cycle, uSize: size, uRise: rise, uPx: PX, uMaxPx: useParticleCap(), uKind: k, uColA: rgb(colors[0]), uColB: rgb(colors[1]), uAlpha: a * alpha, uDensity: density,
  });
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={L.order}>
      <shaderMaterial {...uni} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} />
    </points>
  );
};
