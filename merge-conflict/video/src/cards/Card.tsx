// <Card>: a pose cut-out as a soft-bone mesh with the grade shader (architecture.md "cards/", fix round 1).
// The card dances on the beat grid: a 40x60-quad plane is skinned in the vertex shader by the card's rig
// (rig/rig.ts: hip sway per bar, beat dip with IK knees and pinned feet, chest bounce, head nod, breathing,
// arm swing, lagged hair). The fragment tints toward the shot hue (luminance kept) and adds a rim of the
// rival colour from the alpha gradient: edge = 1 - blurred alpha, weighted toward the rival light's side.
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { staticFile } from 'remotion';
import { BufferAttribute, DoubleSide, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, PlaneGeometry, TextureLoader } from 'three';
import manifestJson from '../../public/cards/manifest.json' with { type: 'json' };
import { type Hex, rgb } from '../lib/ease.ts';
import { GRADE_GLSL, type Grade, rivalOf } from '../grade/grade.ts';
import { cardDance, cardRig } from '../rig/cardRig.ts';
import { MAX_BONES, rigFrame, rows, weightsAt } from '../rig/rig.ts';
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
export interface Placement { x: number; feet?: number; z?: number; height: number }
export const cardCentre = (p: Placement): [number, number, number] => [p.x, (p.feet ?? FLOOR_Y) + p.height / 2, p.z ?? 0];

const COLS = 40;
const ROWS = 60;

const VERT = /* glsl */ `
uniform vec3 uR0[${MAX_BONES}]; uniform vec3 uR1[${MAX_BONES}];
attribute vec4 aBone; attribute vec4 aW;
varying vec2 vUv;
vec2 bone(int i, vec2 p) { vec3 a = uR0[i]; vec3 b = uR1[i]; return vec2(a.x * p.x + a.y * p.y + a.z, b.x * p.x + b.y * p.y + b.z); }
void main() {
  vUv = uv;
  vec2 p = position.xy;
  vec2 q = bone(int(aBone.x), p) * aW.x + bone(int(aBone.y), p) * aW.y + bone(int(aBone.z), p) * aW.z + bone(int(aBone.w), p) * aW.w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 0.0, 1.0);
}`;

/** The card's skinned plane in card units (1 tall, centred), with 4 bone indices and weights per vertex. */
const useRigGeometry = (id: string) =>
  useMemo(() => {
    const r = cardRig(id);
    const g = new PlaneGeometry(r.aspect, 1, COLS, ROWS);
    const pos = g.getAttribute('position');
    const n = pos.count;
    const bi = new Float32Array(n * 4);
    const bw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const w = weightsAt([pos.getX(i), pos.getY(i)], r.segs);
      bi.set(w.idx, i * 4);
      bw.set(w.w, i * 4);
    }
    g.setAttribute('aBone', new BufferAttribute(bi, 4));
    g.setAttribute('aW', new BufferAttribute(bw, 4));
    return g;
  }, [id]);

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
  // Flat silhouettes (in the dark, in white-outs) keep their rim: flatten first, then add the rim light.
  col = mix(col, uFlat, uFlatMix);
  col += uRival * edge * facing * uRim;
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
  /** Extra horizontal offset (world units), e.g. smear streak copies. */
  dx?: number;
  /** Flat silhouette colour mix (white-out frames, silhouettes in the dark). */
  flat?: { color: Hex; mix: number };
  /** Dance energy, 0 = still. */
  dance?: number;
  /** Smear squash and stretch about the feet: [sx, sy]. */
  stretch?: [number, number];
}

export const Card = ({ id, t, grade, x, feet, z, height, opacity = 1, lit = 1, rimDir, rival, dy = 0, dx = 0, flat, dance = 1, stretch = [1, 1] }: CardProps) => {
  const tex = useCardTexture(id);
  const geo = useRigGeometry(id);
  const e = cardEntry(id);
  const r = cardRig(id);
  const f = rigFrame(r.joints, t, cardDance(id, dance));
  const r0: number[] = [];
  const r1: number[] = [];
  for (const xf of f.xf) {
    const m = rows(xf);
    r0.push(m[0], m[1], m[2]);
    r1.push(m[3], m[4], m[5]);
  }
  const dir = rimDir ?? [x >= 0 ? 1 : -1, 0.35];
  const dl = Math.hypot(dir[0], dir[1]) || 1;
  const u = useUniforms({
    map: tex,
    uR0: r0,
    uR1: r1,
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
  // The mesh is in card units; the group places its feet and scales it (smears squash about the feet).
  const fy = feet ?? FLOOR_Y;
  return (
    <group position={[x + dx, fy + dy, z ?? 0]} scale={[height * stretch[0], height * stretch[1], 1]} visible={opacity > 0.001}>
      <mesh geometry={geo} position={[0, 0.5, 0]} renderOrder={ORDER.card} frustumCulled={false}>
        <shaderMaterial {...u} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
};
