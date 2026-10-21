// Shared pieces of the world kit: the additive material setup, a world-space vertex shader and noise.
// Every kit element is a pure function of its props (`t` in seconds); per-frame values go through useUniforms.
import { AdditiveBlending } from 'three';
import { FOV, H } from '../../camera/camera.ts';

/** Material props for light: additive, no depth test or write (layers are ordered by renderOrder). The canvas
 *  is flat/linear, so a shader writes raw values and the framebuffer clamps them. */
export const additive = { transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending } as const;
/** The same without additive blending (smoke, a body that covers what is behind it). */
export const plain = { transparent: true, depthTest: false, depthWrite: false } as const;

/** Pixels per world unit at distance 1 (point sizes). */
export const PX = H / 2 / Math.tan((FOV * Math.PI) / 360);

export const VERT = /* glsl */ `varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const NOISE_GLSL = /* glsl */ `
float kitHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float kitNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(kitHash(i), kitHash(i + vec2(1.0, 0.0)), f.x), mix(kitHash(i + vec2(0.0, 1.0)), kitHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float kitFbm(vec2 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++) { s += a * kitNoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; } return s; }`;

export const clampOpacity = (o: number): number => Math.min(1, Math.max(0, o));
