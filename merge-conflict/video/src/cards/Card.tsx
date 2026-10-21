// <Card>: a pose cut-out as a soft-bone mesh with the grade shader (architecture.md "cards/", fix round 1).
// The card dances on the beat grid: a 40x60-quad plane is skinned in the vertex shader by the card's rig
// (rig/rig.ts: a static lower body, spine lean per bar, a sole-anchored squash on the beat, chest bounce,
// head nod, breathing, arm swing, lagged hair). The fragment tints toward the shot hue (luminance kept) and adds a rim of the
// rival colour from the alpha gradient: edge = 1 - blurred alpha, weighted toward the rival light's side.
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { staticFile } from 'remotion';
import { AdditiveBlending, BufferAttribute, DoubleSide, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, PlaneGeometry, TextureLoader } from 'three';
import manifestJson from '../../public/cards/manifest.json' with { type: 'json' };
import { type Hex, rgb } from '../lib/ease.ts';
import { GRADE_GLSL, type Grade, rivalOf } from '../grade/grade.ts';
import { cardRig, frameOf } from '../rig/cardRig.ts';
import { RIPPLE_MAX, rippleAmp, ripplePhase, rippleWeight } from '../rig/ripple.ts';
import { GRID_COLS, GRID_ROWS, MAX_BONES, rows, weightsAt } from '../rig/rig.ts';
import { FLOOR_Y } from '../stage/SetPlate.tsx';
import { ORDER, useUniforms } from '../stage/Stage.tsx';

interface ManifestEntry { file: string; w: number; h: number; bbox: number[]; source: string }
const MANIFEST = manifestJson as Record<string, ManifestEntry>;

export const cardEntry = (id: string): ManifestEntry => {
  const e = MANIFEST[id];
  if (!e) throw new Error(`no card ${id} in public/cards/manifest.json`);
  return e;
};
export const cardAspect = (id: string): number => cardEntry(id).w / cardEntry(id).h;
export const girlOf = (id: string): 'B' | 'O' => (id.startsWith('B') ? 'B' : 'O');

/** Where a card stands: centre x, the y of its feet (default the floor), depth z, height in world units. */
export interface Placement { x: number; feet?: number; z?: number; height: number; /** mirrored left-right */ flip?: boolean }
export const cardCentre = (p: Placement): [number, number, number] => [p.x, (p.feet ?? FLOOR_Y) + p.height / 2, p.z ?? 0];


// All 11 bones per vertex, no truncation: weights in three vec4 attributes, bone i in slot i.
const VERT = /* glsl */ `
uniform vec3 uR0[${MAX_BONES}]; uniform vec3 uR1[${MAX_BONES}]; uniform float uSquash; uniform float uRipAmp; uniform float uRipPhase;
attribute float aRipple; attribute vec4 aW0; attribute vec4 aW1; attribute vec4 aW2;
varying vec2 vUv; varying float vWorldX; varying vec3 vWorld;
vec2 bone(int i, vec2 p) { vec3 a = uR0[i]; vec3 b = uR1[i]; return vec2(a.x * p.x + a.y * p.y + a.z, b.x * p.x + b.y * p.y + b.z); }
void main() {
  vUv = uv;
  vec2 p = position.xy;
  float w[12];
  w[0] = aW0.x; w[1] = aW0.y; w[2] = aW0.z; w[3] = aW0.w; w[4] = aW1.x; w[5] = aW1.y; w[6] = aW1.z; w[7] = aW1.w;
  w[8] = aW2.x; w[9] = aW2.y; w[10] = aW2.z; w[11] = aW2.w;
  vec2 q = vec2(0.0);
  for (int i = 0; i < ${MAX_BONES}; i++) q += bone(i, p) * w[i];
  // the hair and cloth ripple (rig/ripple.ts rippleOffset): outer silhouette only, uv.y is up, the weights' v is down
  q += aRipple * uRipAmp * vec2(0.94 * sin(uRipPhase + 7.0 * (1.0 - uv.y) + 3.0 * uv.x), 0.33 * cos(uRipPhase + 5.0 * (1.0 - uv.y)));
  // the beat dip: a vertical squash about the soles (card bottom), no horizontal change
  q.y = -0.5 + (q.y + 0.5) * (1.0 - uSquash);
  vWorld = (modelMatrix * vec4(q, 0.0, 1.0)).xyz;
  vWorldX = vWorld.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 0.0, 1.0);
}`;

/** The card's skinned plane in card units (1 tall, centred), with every bone's weight per vertex. */
const useRigGeometry = (id: string) =>
  useMemo(() => {
    const r = cardRig(id);
    const g = new PlaneGeometry(r.aspect, 1, GRID_COLS, GRID_ROWS);
    const pos = g.getAttribute('position');
    const n = pos.count;
    const ws = [new Float32Array(n * 4), new Float32Array(n * 4), new Float32Array(n * 4)];
    for (let i = 0; i < n; i++) {
      weightsAt([pos.getX(i), pos.getY(i)], r.grid).forEach((w, b) => {
        (ws[b >> 2] as Float32Array)[i * 4 + (b & 3)] = w;
      });
    }
    const rip = new Float32Array(n);
    for (let i = 0; i < n; i++) rip[i] = rippleWeight(id, pos.getX(i) / r.aspect + 0.5, 0.5 - pos.getY(i));
    g.setAttribute('aRipple', new BufferAttribute(rip, 1));
    ws.forEach((a, k) => g.setAttribute(`aW${k}`, new BufferAttribute(a, 4)));
    return g;
  }, [id]);

const FRAG = /* glsl */ `
uniform sampler2D map; uniform vec3 uHue; uniform vec3 uRival; uniform float uAmount; uniform float uRim;
uniform vec2 uTexel; uniform vec2 uRimDir; uniform float uSplit; uniform float uOpacity; uniform float uLit; uniform vec3 uFlat; uniform float uFlatMix;
uniform vec2 uClip; uniform float uSoft; uniform float uGround; uniform float uFade;
uniform vec3 uKey; uniform float uKeyAmt; uniform vec4 uSweep; uniform vec3 uSweepCol; uniform float uDots; uniform vec3 uBall; uniform float uTime;
varying vec2 vUv; varying float vWorldX; varying vec3 vWorld;
// Mirror-ball reflections: dots fixed on a sphere around the ball, rotating with time; a fragment is lit when
// the direction from the ball to it passes near one of them (a closed form of t, no state).
float ballDots(vec3 p) {
  vec3 d = normalize(p - uBall);
  float a = atan(d.z, d.x) + uTime * 0.9;
  float e = asin(clamp(d.y, -1.0, 1.0));
  vec2 g = vec2(a * 9.0, e * 9.0);
  vec2 cell = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  return h > 0.55 ? smoothstep(0.22, 0.08, length(f)) : 0.0;
}
${GRADE_GLSL}
void main() {
  // Depth softness: a mip-level bias is a deterministic low-pass of the painting (the girls sit behind the type).
  vec4 c = texture2D(map, vUv, uSoft * 3.0);
  if (c.a < 0.01) discard;
  // uClip = (side, x): keep only world x < clip (side 1) or x > clip (side -1), for split-screen shots
  if (uClip.x * (uClip.y - vWorldX) < 0.0) discard;
  // Blurred alpha on two rings: the rim lives where the card is near its own silhouette.
  float s = 0.0; vec2 grad = vec2(0.0);
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5235988;
    vec2 d = vec2(cos(a), sin(a));
    float a1 = texture2D(map, vUv + d * uTexel * 30.0).a;
    float a2 = texture2D(map, vUv + d * uTexel * 14.0).a;
    s += a1 + a2;
    grad += d * (a1 + a2);
  }
  float blurA = s / 24.0;
  float edge = clamp((1.0 - blurA) * 2.2, 0.0, 1.0);
  vec2 outward = length(grad) > 0.001 ? -normalize(grad) : vec2(0.0);
  float facing = 0.35 + 0.65 * max(dot(outward, uRimDir), 0.0);
  vec3 col = gradeTint(c.rgb, uHue, uAmount) * uLit;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum), 0.25 * uSoft) * (1.0 - 0.3 * uSoft);
  // Set light: a figure standing on the floor darkens toward her feet and takes the set's hue there (the
  // floor bounce), and keeps the light from above, so she sits in the set instead of on top of it.
  float low = smoothstep(0.42, 0.0, vUv.y);
  col = mix(col, col * (uHue * 1.5 + 0.1), 0.35 * low * uGround) * (1.0 - 0.3 * low * uGround);
  // Split light: the rival's colour washes the side of the figure it comes from (the "cutting light").
  float side = smoothstep(-0.15, 0.45, (vUv.x - 0.5) * sign(uRimDir.x + 1e-4));
  col = mix(col, col * (uRival * 1.7 + 0.15), side * uSplit);
  // Flat silhouettes (in the dark, in white-outs) keep their rim: flatten first, then add the rim light.
  // Scene light (the Arcane recipe): the key colour washes the side facing it, a light band sweeps across her,
  // mirror-ball dots run over her; all zero by default so older shots render unchanged.
  float keySide = 1.0 - side;
  col = mix(col, col * (uKey * 1.6 + 0.2), keySide * uKeyAmt);
  float band = exp(-pow((vWorld.x - uSweep.x - (vWorld.y * uSweep.w)) / max(uSweep.y, 0.01), 2.0));
  col += uSweepCol * band * uSweep.z * (0.35 + 0.65 * c.a);
  col += vec3(1.0, 0.95, 0.9) * ballDots(vWorld) * uDots;
  col = mix(col, uFlat, uFlatMix);
  col += uRival * edge * facing * uRim;
  // the floor reflection fades out within uFade of the card height below her soles (0 = no fade, the card itself)
  float fade = uFade > 0.0 ? 1.0 - smoothstep(0.0, uFade, vUv.y) : 1.0;
  gl_FragColor = vec4(min(col, vec3(1.0)), c.a * uOpacity * fade);
}`;

const SHADOW_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
/** A soft contact shadow: an elliptical falloff, darkest under the feet. */
const SHADOW_FRAG = /* glsl */ `uniform float uOpacity; varying vec2 vUv;
void main() { float r = length((vUv - 0.5) * 2.0); float a = (1.0 - smoothstep(0.0, 1.0, r)) * uOpacity; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }`;

const lightUniforms = (l: CardLight | undefined, t: number) => ({
  uKey: rgb(l?.key ?? '#ffffff'),
  uKeyAmt: l?.key ? (l.keyAmt ?? 0.35) : 0,
  uSweep: l?.sweep ? [l.sweep.x, l.sweep.width, l.sweep.amt, l.sweep.slope ?? 0] : [0, 1, 0, 0],
  uSweepCol: rgb(l?.sweep?.color ?? '#ffffff'),
  uDots: l?.dots ?? 0,
  uBall: l?.ball ?? [0, 5.3, -7],
  uTime: t,
});

/** The floor glow: a soft additive pool of the set's colour, brightest under the feet. */
const GLOW_FRAG = /* glsl */ `uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
void main() { float r = length((vUv - 0.5) * 2.0); float a = (1.0 - smoothstep(0.0, 1.0, r)); gl_FragColor = vec4(uColor * a * uOpacity, 1.0); }`;

export const useCardTexture = (id: string) => {
  const tex = useLoader(TextureLoader, staticFile(cardEntry(id).file));
  tex.colorSpace = NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 4;
  return tex;
};

export interface CardProps extends Placement {
  id: string;
  t: number;
  grade: Grade;
  opacity?: number;
  /** Brightness multiplier, e.g. from standing in the spotlight. */
  lit?: number;
  /** Direction (screen, unit) the rival light comes from; default from the side away from frame centre. */
  rimDir?: [number, number];
  /** Rim colour override (default: the other girl's colour). */
  rival?: Hex;
  /** Extra offset (world units) for drops and shoves. */
  dy?: number;
  /** Extra horizontal offset (world units), e.g. smear streak copies. */
  dx?: number;
  /** Flat silhouette colour mix (white-out frames, silhouettes in the dark). */
  flat?: { color: Hex; mix: number };
  /** The old beat-loop energy; 0 (default) = a held card. The film never sets it. */
  dance?: number;
  /** Smear squash and stretch about the feet: [sx, sy]. */
  stretch?: [number, number];
  /** Depth softness 0..1: blurred, dimmed and a little desaturated behind the type; 0 = sharp. */
  soft?: number;
  /** Grounding (default on for a figure whose feet stand on the floor): a soft contact shadow, a faint
   *  floor reflection and the floor bounce of the set light. Off for silhouettes in the air, close-ups. */
  ground?: boolean;
  /** Split-screen clip: keep the side of world x = `x` given by `keep`. */
  clip?: { x: number; keep: 'left' | 'right' };
  /** Scene light: a key colour on the side away from the rim, a sweeping light band, mirror-ball dots. */
  light?: CardLight;
}

export interface CardLight {
  key?: Hex;
  keyAmt?: number;
  /** A vertical light band at world x (slanted by `slope` per unit of height), `width` world units. */
  sweep?: { x: number; width: number; amt: number; color: Hex; slope?: number };
  dots?: number;
  ball?: [number, number, number];
  /** Rim strength multiplier on top of the grade's (rim light from the side away from the key). */
  rim?: number;
}

export const Card = ({ id, t, grade, x, feet, z, height, flip = false, opacity = 1, lit = 1, rimDir, rival, dy = 0, dx = 0, flat, dance = 0, stretch = [1, 1], clip, soft = 0, ground, light }: CardProps) => {
  const tex = useCardTexture(id);
  const geo = useRigGeometry(id);
  const e = cardEntry(id);
  const r = cardRig(id);
  const f = frameOf(id, t, dance);
  const r0: number[] = [];
  const r1: number[] = [];
  for (const xf of f.xf) {
    const m = rows(xf);
    r0.push(m[0], m[1], m[2]);
    r1.push(m[3], m[4], m[5]);
  }
  const dir = rimDir ?? [x >= 0 ? 1 : -1, 0.35];
  const dl = Math.hypot(dir[0], dir[1]) || 1;
  // the rim and split light work in texture space, which a mirrored card reverses
  const sx = flip ? -1 : 1;
  const fy = feet ?? FLOOR_Y;
  const grounded = ground ?? Math.abs(fy - FLOOR_Y) < 0.01;
  const u = useUniforms({
    map: tex,
    uR0: r0,
    uR1: r1,
    uSquash: f.squash,
    uRipAmp: RIPPLE_MAX * rippleAmp(t),
    uRipPhase: ripplePhase(t),
    uHue: rgb(grade.hue),
    uRival: rgb(rival ?? rivalOf(girlOf(id))),
    uAmount: grade.amount,
    uRim: grade.rim * (light?.rim ?? 1),
    uSplit: grade.rim > 0 ? 0.32 : 0,
    ...lightUniforms(light, t),
    uTexel: [1 / e.w, 1 / e.h],
    uRimDir: [(sx * dir[0]) / dl, dir[1] / dl],
    uClip: clip ? [clip.keep === 'left' ? 1 : -1, clip.x] : [0, 0],
    uSoft: soft,
    uOpacity: opacity,
    uLit: lit,
    uFlat: rgb(flat?.color ?? '#000000'),
    uFlatMix: flat?.mix ?? 0,
    uGround: grounded ? 1 : 0,
    uFade: 0,
  });
  // The mesh is in card units; the group places its feet and scales it (smears squash about the feet).
  // the reflection (round 7c, Burak): the same skinned card mirrored below her soles at full length, 32 % opaque,
  // blurred, tinted to the floor and fading out over 30 % of her height, so she stands on the glossy floor
  const refl = useUniforms({
    map: tex, uR0: r0, uR1: r1, uSquash: f.squash, uRipAmp: RIPPLE_MAX * rippleAmp(t), uRipPhase: ripplePhase(t), uHue: rgb(grade.hue), uRival: rgb(rival ?? rivalOf(girlOf(id))),
    uAmount: Math.min(1, grade.amount + 0.3), uRim: 0, uSplit: 0, uTexel: [1 / e.w, 1 / e.h], uRimDir: [0, 1],
    uClip: clip ? [clip.keep === 'left' ? 1 : -1, clip.x] : [0, 0], uSoft: 1, uOpacity: grounded ? opacity * 0.32 : 0, uFade: 0.3,
    uLit: lit * 0.8, uFlat: rgb(flat?.color ?? '#000000'), uFlatMix: flat?.mix ?? 0, uGround: 0, ...lightUniforms(undefined, t),
  });
  const shadow = useUniforms({ uOpacity: grounded ? opacity * 0.78 : 0 });
  // the floor glow: the set's light pooling around her feet (round 7c, Gemini: the girls looked pasted on)
  const glow = useUniforms({ uOpacity: grounded ? opacity * 0.5 : 0, uColor: rgb(grade.hue) });
  const w = height * cardAspect(id);
  return (
    <>
      {grounded && (
        <>
          <mesh position={[x + dx, FLOOR_Y + 0.003, z ?? 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={ORDER.pool} visible={opacity > 0.001}>
            <planeGeometry args={[w * 2.2, height * 0.42]} />
            <shaderMaterial {...glow} vertexShader={SHADOW_VERT} fragmentShader={GLOW_FRAG} transparent depthTest={false} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
          </mesh>
          <mesh position={[x + dx, FLOOR_Y + 0.004, z ?? 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={ORDER.pool + 1} visible={opacity > 0.001}>
            <planeGeometry args={[w * 1.3, height * 0.2]} />
            <shaderMaterial {...shadow} vertexShader={SHADOW_VERT} fragmentShader={SHADOW_FRAG} transparent depthTest={false} depthWrite={false} side={DoubleSide} />
          </mesh>
          <group position={[x + dx, fy + dy, z ?? 0]} scale={[sx * height * stretch[0], -height * stretch[1], 1]} visible={opacity > 0.001}>
            <mesh geometry={geo} position={[0, 0.5, 0]} renderOrder={ORDER.pool + 1} frustumCulled={false}>
              <shaderMaterial {...refl} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} side={DoubleSide} />
            </mesh>
          </group>
        </>
      )}
      <group position={[x + dx, fy + dy, z ?? 0]} scale={[sx * height * stretch[0], height * stretch[1], 1]} visible={opacity > 0.001}>
        <mesh geometry={geo} position={[0, 0.5, 0]} renderOrder={ORDER.card} frustumCulled={false}>
          <shaderMaterial {...u} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} side={DoubleSide} />
        </mesh>
      </group>
    </>
  );
};
