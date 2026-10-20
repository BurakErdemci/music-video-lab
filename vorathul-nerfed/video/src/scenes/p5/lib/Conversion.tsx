// The office turning into his world (director, 20 Oct: "he slowly turns the office into HIS world, until office and his
// world are one"). One progress value per film frame drives three layers, all riding on the fight's own cuts:
//   stage 1 (S95-S97)  ink veins and gold paint creep up the office wall from where he landed;
//   stage 2 (S98-S103) his gothic walls show through the spreading paint, organ pipes rise behind the desks,
//                      the office props take his palette (ink, gold, ivory, violet);
//   stage 3 (S104 on)  the room is his hall; the layout of the office is still readable inside it.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DoubleSide } from 'three';
import { AVAILABLE, assetSize } from '../../../cast/available.ts';
import { useCardTexture } from '../../../stage/Card.tsx';
import { E, clamp01, lerp } from './geom.ts';
import { OFFICE_FLOOR } from './vorathul.ts';

/** 0 = office, 1 = his world. Eased between the stage cuts so the shift reads as a progression across shots. */
export const conversionAt = (frame: number): number => {
  // It starts low at the breach in S93 (the paint spills out of it), then grows from where he lands.
  const k: [number, number][] = [[E('s93-cut'), 0], [E('s95-cut'), 0.06], [E('s98-cut'), 0.3], [E('s104-cut'), 0.85], [E('s105-cut'), 1]];
  if (frame <= k[0]![0]) return 0;
  for (let i = 1; i < k.length; i++) {
    const [f1, v1] = k[i]!;
    const [f0, v0] = k[i - 1]!;
    if (frame <= f1) {
      const t = (frame - f0) / (f1 - f0);
      return lerp(v0, v1, t * t * (3 - 2 * t));
    }
  }
  return 1;
};

/** Palette progress for the office's flat props (stage 2 on). */
export const paletteAt = (conv: number): number => clamp01((conv - 0.2) / 0.6);

// ---- palette: the office's flat colours mapped to his ----
const MAP: Record<string, string> = {
  '#E9ECEF': '#F4ECD8', '#F8F9FA': '#F4ECD8', '#FFFFFF': '#F4ECD8', '#F1F3F5': '#EADFC0',
  '#CED4DA': '#E2B33C', '#ADB5BD': '#8A6A2A', '#868E96': '#3A2E1A', '#343A40': '#0A0A0A',
  '#495057': '#0A0A0A', '#3B82F6': '#9B5CE0',
};
const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: number[]): string => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
export const paintColor = (color: string, t: number): string => {
  const to = MAP[color.toUpperCase()];
  if (!to || t <= 0) return color;
  const a = hex(color);
  const b = hex(to);
  return toHex(a.map((v, i) => lerp(v, b[i] as number, t)));
};

/** How far the office's flat colours have turned to his palette (0 = office); read by Office's Rect. */
export const PaletteCtx = createContext(0);
/** Gives every office prop of a shot (also those outside the Room) the palette of that frame. */
export const Paint = ({ frame, children }: { frame: number; children: ReactNode }) => <PaletteCtx.Provider value={paletteAt(conversionAt(frame))}>{children}</PaletteCtx.Provider>;
export const usePalette = (): number => useContext(PaletteCtx);

// ---- the wall: paint and his architecture through a growing ink-edged mask ----
const VERT = 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FRAG = `
uniform sampler2D mapA; uniform sampler2D mapB; uniform vec2 origin; uniform float rPaint; uniform float rReveal;
uniform vec2 hole; uniform float tileW; uniform float tileH; uniform float floorY;
varying vec3 vW;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { return 0.55 * vn(p) + 0.3 * vn(p * 2.1 + 7.0) + 0.15 * vn(p * 4.3 + 3.0); }
vec3 enc(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 p = vW.xy;
  if (abs(p.x) < hole.x && abs(p.y) < hole.y) discard;
  // Paint climbs faster than it spreads sideways, and the edge is torn by noise.
  vec2 d = (p - origin) * vec2(1.0, 0.7);
  float r = length(d) + (fbm(p * 0.45) - 0.5) * 3.2;
  // Ink veins run ahead of the paint (ridged noise lines), thinning out with distance.
  float vein = 1.0 - abs(fbm(p * vec2(0.9, 0.55)) * 2.0 - 1.0);
  bool veinOn = r > rPaint && r < rPaint + 3.5 && vein > 0.93 + 0.02 * (r - rPaint);
  if (r > rPaint && !veinOn) discard;
  vec3 col;
  if (veinOn || r > rPaint - 0.22) col = vec3(0.039);
  else if (r > rReveal) {
    // Wet gold paint with a few ink drags.
    col = vec3(0.886, 0.702, 0.235) * (0.86 + 0.14 * vn(p * vec2(6.0, 1.2)));
    if (vn(p * vec2(1.4, 9.0)) > 0.8) col = vec3(0.039);
    if (r < rReveal + 0.18) col = vec3(0.039);
  } else {
    vec2 uv = vec2(fract((p.x + 40.0) / tileW), fract((p.y - floorY) / tileH));
    col = p.x < 0.0 ? enc(texture2D(mapA, uv).rgb) : enc(texture2D(mapB, uv).rgb);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const WALL_A = 'L4-wall-a';
const WALL_B = 'L4-wall-b';
const texOf = (id: string, fallback: string): string => (AVAILABLE.has(id) ? `assets/${id}.png` : `plates/${fallback}`);

/** The converted back wall at depth `z`, from the floor to `top`. `conv` 0..1; `origin` = where the paint starts. */
export const WallConversion = ({ conv, z, top, hole, origin = [-3, OFFICE_FLOOR] }: { conv: number; z: number; top: number; hole: [number, number]; origin?: [number, number] }) => {
  const a = useCardTexture(texOf(WALL_A, '01-tarz-cizgi-roman.jpg'));
  const b = useCardTexture(texOf(WALL_B, '01-tarz-cizgi-roman.jpg'));
  const size = assetSize(WALL_A) ?? [1536, 1024];
  const uniforms = useMemo(
    () => ({ mapA: { value: a }, mapB: { value: b }, origin: { value: [0, 0] }, rPaint: { value: 0 }, rReveal: { value: -1 }, hole: { value: [0, 0] }, tileW: { value: 20 }, tileH: { value: (20 * size[1]) / size[0] }, floorY: { value: OFFICE_FLOOR } }),
    [a, b, size],
  );
  // Stage 1 = paint only (radius up to ~9 units); stage 2 reveals the walls behind a gold band; by 1 the wall is his.
  uniforms.rPaint.value = conv <= 0 ? -10 : 3 + 30 * conv + 40 * conv * conv;
  uniforms.rReveal.value = conv < 0.3 ? -10 : ((uniforms.rPaint.value as number) - 1.6) * Math.sqrt((conv - 0.3) / 0.7);
  uniforms.origin.value = origin;
  uniforms.hole.value = hole;
  if (conv <= 0) return null;
  const bot = OFFICE_FLOOR;
  return (
    <mesh position={[0, (top + bot) / 2, z]}>
      <planeGeometry args={[80, top - bot]} />
      <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} side={DoubleSide} />
    </mesh>
  );
};

/** Organ pipes (L1-pipes-near) rising from behind a desk: hidden under the floor until `rise` > 0. */
export const RisingPipes = ({ at, rise, height = 9 }: { at: [number, number, number]; rise: number; height?: number }) => {
  const size = assetSize('L1-pipes-near') ?? [1024, 1536];
  const tex = useCardTexture(texOf('L1-pipes-near', '03-kanat-yelpaze.jpg'));
  if (rise <= 0) return null;
  const w = (height * size[0]) / size[1];
  return (
    <mesh position={[at[0], at[1] - height / 2 + height * rise, at[2]]}>
      <planeGeometry args={[w, height]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
};
