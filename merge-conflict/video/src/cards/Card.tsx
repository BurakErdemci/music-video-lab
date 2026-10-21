// <Card>: a pose cut-out as a textured plane with the grade shader (architecture.md "cards/").
// Alive while still, all closed-form in seconds: a float of +-0.6 % scale, a slow bob, and a hair-side sway
// in the vertex shader that bends only the top third's hair edges (the face stays put).
// The fragment tints toward the shot hue (luminance kept) and adds a rim of the rival colour from the
// alpha gradient: edge = 1 - blurred alpha, weighted toward the side the rival light comes from.
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { DoubleSide, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, TextureLoader } from 'three';
import manifestJson from '../../public/cards/manifest.json' with { type: 'json' };
import { type Hex, rgb } from '../lib/ease.ts';
import { hashKey } from '../lib/seeded.ts';
import { GRADE_GLSL, type Grade, rivalOf } from '../grade/grade.ts';
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

/** Which side the hair hangs on (-1 left, +1 right, 0 both), read off the cards (public/cards contact sheet). */
const HAIR: Record<string, number> = { B01: -1, B02: 1, B03: -1, B04: -1, B07: -1, B08: -1, B10: -1, B11: -1, B12: -1 };
export const hairSide = (id: string): number => HAIR[id] ?? 0;

/** Where a card stands: centre x, the y of its feet (default the floor), depth z, height in world units. */
export interface Placement { x: number; feet?: number; z?: number; height: number }
export const cardCentre = (p: Placement): [number, number, number] => [p.x, (p.feet ?? FLOOR_Y) + p.height / 2, p.z ?? 0];

/** The living-still transform at time t (seconds): same numbers drive the 3D card and its 2D scribble. */
export const alive = (id: string, t: number, seed = 0) => {
  const ph = (hashKey(`alive:${id}:${seed}`) % 1000) / 1000;
  const TAU = Math.PI * 2;
  return {
    scale: 1 + 0.006 * Math.sin(TAU * (0.37 * t + ph)),
    bob: 0.035 * Math.sin(TAU * (0.5 * t + ph * 1.7)),
    sway: Math.sin(TAU * (0.23 * t + ph)) * 0.5 + 0.5,
  };
};

const VERT = /* glsl */ `
uniform float uTime; uniform float uSway; uniform float uHair; uniform float uPhase;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float top = smoothstep(0.58, 1.0, uv.y);
  float dx = uv.x - 0.5;
  // Hair hangs at the card's edges; the centre column (face, body) stays rigid.
  float edge = smoothstep(0.08, 0.42, abs(dx));
  float side = uHair == 0.0 ? 1.0 : smoothstep(-0.1, 0.25, dx * uHair);
  float w = top * edge * side + 0.35 * top * top * side * (1.0 - edge);
  float s = sin(uTime * 1.9 + uv.y * 3.0 + uPhase) * 0.6 + sin(uTime * 3.1 + uv.y * 5.0 + uPhase * 2.0) * 0.4;
  p.x += w * uSway * s;
  p.y += w * uSway * 0.25 * cos(uTime * 1.3 + uPhase);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D map; uniform vec3 uHue; uniform vec3 uRival; uniform float uAmount; uniform float uRim;
uniform vec2 uTexel; uniform vec2 uRimDir; uniform float uSplit; uniform float uOpacity; uniform float uLit; uniform vec3 uFlat; uniform float uFlatMix;
varying vec2 vUv;
${GRADE_GLSL}
void main() {
  vec4 c = texture2D(map, vUv);
  if (c.a < 0.01) discard;
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
  // Split light: the rival's colour washes the side of the figure it comes from (the "cutting light").
  float side = smoothstep(-0.15, 0.45, (vUv.x - 0.5) * sign(uRimDir.x + 1e-4));
  col = mix(col, col * (uRival * 1.7 + 0.15), side * uSplit);
  col += uRival * edge * facing * uRim;
  col = mix(col, uFlat, uFlatMix);
  gl_FragColor = vec4(min(col, vec3(1.0)), c.a * uOpacity);
}`;

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
  /** Flat silhouette colour mix (white-out frames). */
  flat?: { color: Hex; mix: number };
  seed?: number;
}

export const Card = ({ id, t, grade, x, feet, z, height, opacity = 1, lit = 1, rimDir, rival, dy = 0, flat, seed = 0 }: CardProps) => {
  const tex = useCardTexture(id);
  const e = cardEntry(id);
  const width = height * cardAspect(id);
  const a = alive(id, t, seed);
  const [cx, cy, cz] = cardCentre({ x, feet, z, height });
  const dir = rimDir ?? [x >= 0 ? 1 : -1, 0.35];
  const dl = Math.hypot(dir[0], dir[1]) || 1;
  const u = useUniforms({
    map: tex,
    uTime: t,
    uSway: height * 0.012 * (0.6 + 0.4 * a.sway),
    uHair: hairSide(id),
    uPhase: (hashKey(`${id}:${seed}`) % 628) / 100,
    uHue: rgb(grade.hue),
    uRival: rgb(rival ?? rivalOf(girlOf(id))),
    uAmount: grade.amount,
    uRim: grade.rim,
    uSplit: grade.rim > 0 ? 0.32 : 0,
    uTexel: [1 / e.w, 1 / e.h],
    uRimDir: [dir[0] / dl, dir[1] / dl],
    uOpacity: opacity,
    uLit: lit,
    uFlat: rgb(flat?.color ?? '#000000'),
    uFlatMix: flat?.mix ?? 0,
  });
  // Scale about the feet so the float never lifts the boots off the floor line.
  const h2 = (height * a.scale) / 2;
  return (
    <group position={[cx, cy - height / 2 + a.bob + dy, cz]} scale={[a.scale, a.scale, 1]} visible={opacity > 0.001}>
      <mesh position={[0, h2 / a.scale, 0]} renderOrder={ORDER.card}>
        <planeGeometry args={[width, height, 10, 32]} />
        <shaderMaterial uniforms={u} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
};
