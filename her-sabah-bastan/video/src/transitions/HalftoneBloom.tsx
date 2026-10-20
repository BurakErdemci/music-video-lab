import { FRAG_HEAD } from './gl.ts';
import { GLSL_PALETTE } from './glslPalette.ts';
import { GLTransition } from './GLTransition.tsx';
import type { Painter } from './layers.ts';

/**
 * "Halftone bloom". A drop falls on `origin` and a wobbling ring runs outward. Behind the ring the picture is re-screened
 * as a real two-plate halftone: navy dots on a 45 deg grid, moon-yellow dots on a 15 deg grid, on cream paper. Every dot's
 * size is the ink coverage of the picture sampled at its own cell centre (least squares onto the navy/yellow/cream inks).
 * The pitch swells from a few pixels to ~54 px, then each cell individually re-inks: its dot dips, its centre starts
 * sampling `to` instead of `from` (per-cell threshold, never an alpha mix of the images) and it grows back. The pitch then
 * shrinks to ~2 px and the screen hands over to the continuous `to` image. progress 0 is `from`, 1 is `to`.
 */
const FRAG = `${FRAG_HEAD}
${GLSL_PALETTE}
uniform vec2 uO;     // drop, pixels, top-left origin
uniform float uRfar; // ring radius that is safely past the farthest corner, pixels

const float PI = 3.14159265;
const float AMAX = 0.5;  // ring ease: it has left the frame by progress ~0.38
const float LIFE = 0.6;  // a pixel's own bloom lasts this share of the transition

float ringRn(float e) { float x = clamp(e / AMAX, 0.0, 1.0); return 1.0 - pow(1.0 - x, 1.8); }

// Radius from the drop with a slow noise wobble over the angle, growing in with the ring.
float rWob(vec2 Q, float rn) {
  vec2 d = Q - uO;
  float r = length(d);
  vec2 dir = d / max(r, 1e-3);
  float w = 0.7 * snoise(dir * 1.4 + vec2(uT * 0.7, 3.1)) + 0.3 * snoise(dir * 3.1 + vec2(7.7, -uT * 0.9));
  return r + w * 16.0 * rise(0.0, 0.2, rn);
}

// Local bloom age 0..1 of the pixel at Q; negative until the ring has passed it.
float ageAt(vec2 Q) {
  float r = rWob(Q, ringRn(uP));
  float a = AMAX * (1.0 - pow(max(1.0 - r / uRfar, 0.0), 1.0 / 1.8));
  return (uP - a) / LIFE;
}

// Global pitch: tiny -> ~54 px at the peak -> tiny; young cells (near the ring) a bit finer than old ones.
float pitchAt(vec2 Q) {
  float bell = rise(0.0, 0.5, uP) * fall(0.5, 0.96, uP);
  float g = 2.2 + 52.0 * pow(bell, 1.2);
  float rn = ringRn(uP);
  float ageN = clamp((uRfar * rn - rWob(Q, rn)) / uRfar, 0.0, 1.0);
  return g * mix(0.55, 1.0, rise(0.0, 0.4, ageN));
}

vec2 lat(vec2 Q, mat2 Rm) { return Rm * (Q - uO) / pitchAt(Q); }

float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Least squares of colour c onto cream + a*(navy-cream) + b*(yellow-cream): ink coverage of each plate.
vec2 inkCov(vec3 c) {
  vec3 v1 = NAVY - CREAM; vec3 v2 = YEL - CREAM; vec3 d = c - CREAM;
  float a11 = dot(v1, v1); float a12 = dot(v1, v2); float a22 = dot(v2, v2);
  float b1 = dot(v1, d); float b2 = dot(v2, d);
  float det = a11 * a22 - a12 * a12;
  return clamp(vec2((b1 * a22 - b2 * a12) / det, (a11 * b2 - a12 * b1) / det), 0.0, 1.0);
}

// One plate: antialiased dot mask at pixel P. chan 0 = navy coverage, 1 = yellow coverage.
float plate(vec2 P, float ang, float seed, float chan) {
  mat2 Rm = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 L0 = lat(P, Rm);
  vec2 Lx = lat(P + vec2(1.0, 0.0), Rm) - L0;
  vec2 Ly = lat(P + vec2(0.0, 1.0), Rm) - L0;
  float det = Lx.x * Ly.y - Ly.x * Lx.y;
  if (abs(det) < 1e-9) return 0.0;
  float sp = 1.0 / sqrt(abs(det)); // true local pitch in pixels
  vec2 base = floor(L0 - 0.5);
  float res = 0.0;
  for (int i = 0; i < 2; i++) {
    for (int j = 0; j < 2; j++) {
      vec2 cell = base + vec2(float(i), float(j));
      vec2 v = cell + 0.5 - L0;
      vec2 C = P + vec2(Ly.y * v.x - Ly.x * v.y, -Lx.y * v.x + Lx.x * v.y) / det; // cell centre in pixels
      float u = ageAt(C);
      if (u <= 0.0) continue;
      float thr = 0.36 + 0.24 * hash21(cell + seed);
      float o = 0.22 * sp;
      vec2 uv0 = C / uRes;
      vec2 ox = vec2(o, 0.0) / uRes;
      vec2 oy = vec2(0.0, o) / uRes;
      vec3 c;
      if (u < thr) {
        c = 0.36 * tex(uFrom, uv0).rgb + 0.16 * (tex(uFrom, uv0 + ox).rgb + tex(uFrom, uv0 - ox).rgb + tex(uFrom, uv0 + oy).rgb + tex(uFrom, uv0 - oy).rgb);
      } else {
        c = 0.36 * tex(uTo, uv0).rgb + 0.16 * (tex(uTo, uv0 + ox).rgb + tex(uTo, uv0 - ox).rgb + tex(uTo, uv0 + oy).rgb + tex(uTo, uv0 - oy).rgb);
      }
      vec2 ik = inkCov(c);
      float cov = max((chan < 0.5 ? ik.x : ik.y) - 0.02, 0.0);
      float dip = exp(-pow((u - thr) / 0.07, 2.0));
      float rL = sqrt(cov / PI) * (1.0 + 0.26 * pow(cov, 4.0)) * (1.0 - 0.88 * dip) * mix(0.6, 1.0, rise(0.0, 0.03, u));
      res = max(res, clamp((rL - length(L0 - (cell + 0.5))) * sp + 0.5, 0.0, 1.0));
    }
  }
  return res;
}

void main() {
  vec2 P = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = P / uRes;
  float e = clamp(uP, 0.0, 1.0);
  float rn = ringRn(e);
  float Rring = uRfar * rn;
  float r = rWob(P, rn);
  float u = ageAt(P);

  // Continuous picture: from until the cells have long flipped, to afterwards.
  vec3 direct = u < 0.5 ? tex(uFrom, uv).rgb : tex(uTo, uv).rgb;
  vec3 col = direct;

  float behind = smoothstep(0.0, 1.5, Rring - r);
  float screened = behind * rise(2.4, 4.2, pitchAt(P));
  if (screened > 0.0) {
    vec3 h = CREAM;
    h = mix(h, YEL, plate(P, 0.2618, 3.7, 1.0));
    h = mix(h, NAVY, plate(P, 0.7854, 11.3, 0.0));
    col = mix(direct, h, screened);
  }

  // The ring itself: a thin printed line at the front, gone before the end.
  float line = (1.0 - smoothstep(1.0, 3.0, abs(Rring - r))) * rise(0.0, 0.03, e) * fall(0.3, 0.42, e);
  col = mix(col, NAVY, line * 0.85);
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface HalftoneBloomProps {
  progress: number;
  seconds: number;
  time: number;
  from: Painter;
  to: Painter;
  /** Where the drop falls (uv, top-left origin). */
  origin?: readonly [number, number];
  width?: number;
  height?: number;
}

export const HalftoneBloom = ({ progress, time, from, to, origin = [0.5, 0.5], width = 1920, height = 1080 }: HalftoneBloomProps) => {
  const ox = origin[0] * width;
  const oy = origin[1] * height;
  const far = Math.max(Math.hypot(ox, oy), Math.hypot(width - ox, oy), Math.hypot(ox, height - oy), Math.hypot(width - ox, height - oy));
  return <GLTransition frag={FRAG} progress={progress} time={time} from={from} to={to} uniforms={{ uO: [ox, oy], uRfar: far * 1.08 + 40 }} width={width} height={height} />;
};
