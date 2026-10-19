import { palette } from '../style/palette.ts';

const vec3 = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `vec3(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(4)).join(', ')})`;
};

/** The print palette and easing helpers as GLSL, so shaders print in the same three inks as the rest of the clip. */
export const GLSL_PALETTE = `
const vec3 NAVY = ${vec3(palette.navy)};
const vec3 CREAM = ${vec3(palette.cream)};
const vec3 YEL = ${vec3(palette.moonYellow)};
// smoothstep is undefined for edge0 >= edge1 in GLSL: rise() goes 0 -> 1 between a < b, fall() 1 -> 0.
float rise(float a, float b, float x) { return smoothstep(a, b, x); }
float fall(float a, float b, float x) { return 1.0 - smoothstep(a, b, x); }
float eio(float x) { x = clamp(x, 0.0, 1.0); return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0; }
float eout(float x) { x = clamp(x, 0.0, 1.0); return 1.0 - pow(1.0 - x, 3.0); }
`;
