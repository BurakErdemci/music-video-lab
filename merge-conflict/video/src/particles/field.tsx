// The persistent particle field (architecture.md "particles/field.ts"): confetti shards and mirror-ball
// sparkles that outlive every shot, plus up to four confetti bursts. N seeded particles, each a closed-form
// function of the scene clock t (no simulation state): the vertex shader evaluates the position at uTime.
// The field is split into a back layer (behind the cards) and a front layer (in front of them).
import { useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { FOV, H } from '../camera/camera.ts';
import { type Grade, RIOT } from '../grade/grade.ts';
import { rgb } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { ORDER, useUniforms } from '../stage/Stage.tsx';
import { useParticleCap } from './cap.ts';

export interface Burst { t: number; origin: [number, number, number] }
export const MAX_BURSTS = 4;
const PX = H / 2 / Math.tan((FOV * Math.PI) / 360);

const LAYERS = {
  back: { z: [-9, -0.6], confetti: 700, sparkles: 260, burst: 520, spanX: 34 },
  front: { z: [0.8, 5.5], confetti: 160, sparkles: 0, burst: 260, spanX: 20 },
} as const;
export type FieldLayer = keyof typeof LAYERS;

const VERT = /* glsl */ `
uniform float uTime; uniform float uDensity; uniform float uPx; uniform float uMaxPx; uniform float uSpanX; uniform vec2 uZ;
uniform vec4 uBurstT; uniform vec3 uBurstO[4]; uniform float uMetal; uniform float uDust;
attribute vec4 aSeed; attribute vec4 aRnd; attribute vec3 aCol; attribute float aKind;
varying vec3 vCol; varying float vAlpha; varying float vAngle; varying float vFlip; varying float vKind; varying float vEmber;
const float TOP = 7.5; const float BOT = -4.2;
void main() {
  float t = uTime;
  vKind = aKind;
  vCol = aCol;
  vec3 p; float alpha = 1.0; float size = mix(0.09, 0.17, aRnd.w);
  float spin = mix(1.5, 4.5, aRnd.x) * (aRnd.y < 0.5 ? -1.0 : 1.0);
  vAngle = aSeed.w * 6.2832 + t * spin;
  vFlip = 0.15 + 0.85 * abs(cos(t * mix(2.0, 6.0, aRnd.z) + aSeed.x * 40.0));
  // With the metal amount the confetti turns into embers that RISE (and flicker): all of it at full metal,
  // so the all-metal groove has no disco confetti (scene-map.md, 23d272a)
  vEmber = step(aRnd.y, uMetal);
  if (aKind < 0.5) {
    // dust (outside the choruses) floats slowly instead of falling like confetti
    float fall = mix(0.35, 0.95, aSeed.w) * mix(1.0, -1.6, vEmber) * mix(1.0, 0.25, uDust * (1.0 - vEmber));
    float y = BOT + mod(aSeed.y * (TOP - BOT) - fall * t, TOP - BOT);
    p = vec3((aSeed.x - 0.5) * uSpanX + 0.35 * sin(t * (0.5 + aSeed.w) + aSeed.x * 30.0), y, mix(uZ.x, uZ.y, aSeed.z));
    alpha = step(aRnd.z, uDensity);
    size *= mix(1.0, 0.55, uDust * (1.0 - vEmber));
  } else if (aKind < 1.5) {
    // Mirror-ball spots sweeping the back of the room.
    float x = mod(aSeed.x * uSpanX + t * mix(0.35, 0.9, aSeed.w), uSpanX) - uSpanX * 0.5;
    p = vec3(x, mix(-1.5, 6.5, aSeed.y), mix(uZ.x, uZ.y * 0.5 + uZ.x * 0.5, aSeed.z));
    float tw = pow(max(0.0, sin(t * mix(2.0, 6.5, aRnd.x) + aSeed.w * 30.0)), 10.0);
    alpha = tw * step(aRnd.z, uDensity) * (1.0 - uMetal); // mirror-ball spots are disco: gone at full metal
    size = mix(0.28, 0.6, aRnd.w);
  } else {
    int slot = int(aSeed.w * 3.999);
    float tb = slot == 0 ? uBurstT.x : slot == 1 ? uBurstT.y : slot == 2 ? uBurstT.z : uBurstT.w;
    vec3 o = slot == 0 ? uBurstO[0] : slot == 1 ? uBurstO[1] : slot == 2 ? uBurstO[2] : uBurstO[3];
    float a = t - tb;
    if (tb < 0.0 || a < 0.0) { alpha = 0.0; a = 0.0; }
    float spd = mix(9.0, 21.0, aRnd.x);
    float ang = mix(-2.6, 2.6, aSeed.x);
    vec3 v = vec3(sin(ang) * spd, cos(ang) * spd * mix(0.6, 1.1, aSeed.y) + 1.5, (aSeed.z - 0.5) * spd * 0.7);
    float k = 2.2;
    float e = (1.0 - exp(-k * a)) / k;
    p = o + v * e;
    p.y -= mix(0.6, 1.3, aRnd.y) * (a - e);
    p.x += 0.3 * sin(t * 1.3 + aSeed.x * 20.0) * min(a, 1.0);
    alpha *= smoothstep(BOT - 0.2, BOT + 0.6, p.y) * (1.0 - smoothstep(6.0, 8.0, a));
    size *= 1.0 + 1.2 * exp(-a * 3.0);
  }
  vAlpha = alpha;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(alpha > 0.002 ? size * uPx / max(0.5, -mv.z) : 0.0, uMaxPx);
}`;

const FRAG = /* glsl */ `
uniform vec3 uHue; uniform float uHueMix; uniform float uAlpha; uniform float uMetal; uniform float uDust;
varying vec3 vCol; varying float vAlpha; varying float vAngle; varying float vFlip; varying float vKind; varying float vEmber;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  vec3 col; float a;
  if (vKind > 0.5 && vKind < 1.5) {
    vec2 q = abs(c);
    float star = max(0.0, 1.0 - (q.x * 9.0 + q.y * 1.1)) + max(0.0, 1.0 - (q.y * 9.0 + q.x * 1.1));
    a = clamp(star + exp(-length(c) * 14.0), 0.0, 1.0);
    col = mix(vec3(1.0), uHue + 0.35, 0.35);
    col = mix(col, vec3(1.0, 0.82, 0.55), uMetal * 0.6); // sparks run white-hot
  } else if (vEmber > 0.5 && vKind < 0.5) {
    // an ember: a soft hot dot, orange-red, flickering
    float r = length(c);
    a = (1.0 - smoothstep(0.08, 0.5, r));
    col = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.85, 0.4), exp(-r * 8.0)) * (0.7 + 0.3 * vFlip);
  } else if (uDust > 0.5 && vKind < 0.5) {
    // dust: a soft cool mote caught in the light
    float r = length(c);
    a = (1.0 - smoothstep(0.05, 0.5, r)) * 0.55;
    col = mix(vec3(0.85, 0.9, 1.0), uHue + 0.3, 0.3);
  } else if ((uDust > 0.5 || uMetal > 0.5) && vKind > 1.5) {
    // outside the choruses a burst throws sparks, not confetti
    float r = length(c);
    a = 1.0 - smoothstep(0.04, 0.45, r);
    col = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.55, 0.15), uMetal) * (0.8 + 0.4 * exp(-r * 10.0));
  } else {
    float s = sin(vAngle), co = cos(vAngle);
    vec2 r = vec2(co * c.x - s * c.y, s * c.x + co * c.y);
    float hw = 0.40, hh = 0.40 * vFlip;
    float d = max(abs(r.x) - hw, abs(r.y) - hh);
    a = 1.0 - smoothstep(-0.03, 0.0, d);
    col = mix(vCol, uHue, uHueMix) * (0.55 + 0.45 * vFlip) + vec3(pow(vFlip, 12.0) * 0.45);
  }
  a *= vAlpha * uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(min(col, vec3(1.0)), a);
}`;

const build = (layer: FieldLayer): BufferGeometry => {
  const L = LAYERS[layer];
  const kinds = [...Array(L.confetti).fill(0), ...Array(L.sparkles).fill(1), ...Array(L.burst).fill(2)] as number[];
  const n = kinds.length;
  const seed = new Float32Array(n * 4);
  const rnd = new Float32Array(n * 4);
  const col = new Float32Array(n * 3);
  const pos = new Float32Array(n * 3);
  const rng = seeded(`field:${layer}`);
  kinds.forEach((_, i) => {
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = rng();
    for (let k = 0; k < 4; k++) rnd[i * 4 + k] = rng();
    const c = rgb(rng.pick(RIOT));
    col.set(c, i * 3);
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new BufferAttribute(seed, 4));
  g.setAttribute('aRnd', new BufferAttribute(rnd, 4));
  g.setAttribute('aCol', new BufferAttribute(col, 3));
  g.setAttribute('aKind', new BufferAttribute(new Float32Array(kinds), 1));
  return g;
};

export interface FieldProps {
  t: number;
  grade: Grade;
  layer: FieldLayer;
  /** Fraction of the drifting confetti and sparkles shown (density per section). */
  density?: number;
  /** How far the confetti colours pull toward the shot hue. */
  hueMix?: number;
  alpha?: number;
  bursts?: readonly Burst[];
  /** metal amount 0..1: embers rise among the confetti, sparks run hot */
  metal?: number;
  /** Outside the choruses (round 7c): dust motes instead of confetti, and sparks instead of confetti bursts. */
  dust?: boolean;
}

export const Field = ({ t, grade, layer, density = 1, hueMix = 0.35, alpha = 1, bursts = [], metal = 0, dust = false }: FieldProps) => {
  if (bursts.length > MAX_BURSTS) throw new Error(`field: ${bursts.length} bursts (max ${MAX_BURSTS})`);
  const geo = useMemo(() => build(layer), [layer]);
  const L = LAYERS[layer];
  const bt = [0, 1, 2, 3].map((i) => bursts[i]?.t ?? -1);
  const bo = [0, 1, 2, 3].map((i) => bursts[i]?.origin ?? [0, 0, 0]);
  const u = useUniforms({
    uTime: t,
    uDensity: density,
    uPx: PX, uMaxPx: useParticleCap(),
    uSpanX: L.spanX,
    uZ: [L.z[0], L.z[1]],
    uBurstT: bt,
    uBurstO: bo.flat(),
    uHue: rgb(grade.hue),
    uHueMix: hueMix,
    uAlpha: alpha,
    uMetal: metal,
    uDust: dust ? 1 : 0,
  });
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={layer === 'back' ? ORDER.fieldBack : ORDER.fieldFront}>
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} />
    </points>
  );
};
