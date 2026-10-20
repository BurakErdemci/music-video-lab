import { FRAG_HEAD } from './gl.ts';
import { GLSL_PALETTE } from './glslPalette.ts';
import { GLTransition } from './GLTransition.tsx';
import type { Painter } from './layers.ts';

/**
 * G1 "dive into the screen" (v2). The screen is a liquid surface: a few drops (the first on the drop point) send out
 * decaying ring packets that interfere. Nothing is drawn: the waves exist only as a height field whose slope refracts
 * the screen image, plus a soft specular glint and a slow lens wobble.
 *
 * Camera: the plate pushes in to 1.6x at most (no upscale blur); the monitor, being nearer the camera, grows faster
 * (a crisp vector bezel) until its surface fills the frame. The surface turns transparent first on the wave crests,
 * the room behind is seen through it with the refraction peaking as we pass, then the room's own surface calms.
 *
 * `aux` is the room without the AI's cream side: the cream side (and with it the seam) comes in from the right only as
 * the room settles, landing on `seam`. progress 0 shows `from` exactly, 1 shows `to` exactly (aux must equal `to`
 * left of `seam`).
 */
const FRAG = `${FRAG_HEAD}
${GLSL_PALETTE}
uniform vec2 uC;
uniform vec4 uRect;
uniform float uDur;
uniform float uSeam;

float TAU;

// One drop: a ring packet travelling out and spreading, plus the bob at its centre. Aspect units, seconds.
float drop(vec2 q, float t, float a) {
  if (t <= 0.0) return 0.0;
  float r = length(q);
  float front = 0.21 * t;
  float sig = 0.045 + 0.05 * t;
  float on = rise(0.0, 0.06, t);
  float ring = exp(-pow((r - front) / sig, 2.0)) * exp(-0.9 * t);
  float bob = 0.4 * exp(-pow(r / (0.025 + 0.05 * t), 2.0)) * exp(-2.2 * t);
  return a * on * (ring * cos(125.0 * (r - front)) + bob * cos(9.0 * t));
}

float height(vec2 s) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float h = drop((s - uC) * asp, TAU, 1.0);
  h += drop((s - uC - vec2(0.075, 0.055)) * asp, TAU - 0.35, 0.65);
  h += drop((s - uC - vec2(-0.095, -0.05)) * asp, TAU - 0.7, 0.5);
  return h;
}

float inRect(vec2 p, vec4 r, float aa) {
  return rise(r.x - aa, r.x + aa, p.x) * fall(r.z - aa, r.z + aa, p.x) * rise(r.y - aa, r.y + aa, p.y) * fall(r.w - aa, r.w + aa, p.y);
}

void main() {
  vec2 uv = topUv();
  float e = clamp(uP, 0.0, 1.0);
  TAU = e * uDur;
  vec2 sc = 0.5 * (uRect.xy + uRect.zw);

  // Camera: the plate pushes to 1.6x; the monitor surface (nearer) grows another 1.5x on top, filling the frame.
  float zF = 1.0 + 0.6 * eio(e / 0.62);
  float gW = 1.0 + 0.5 * eio((e - 0.3) / 0.42);
  vec2 pUv = sc + (uv - sc) / zF;
  vec2 sUv = sc + (uv - sc) / (zF * gW);
  float px = 1.0 / (uRes.y * zF * gW);
  float inW = inRect(sUv, uRect, px);
  float bez = inRect(sUv, uRect + vec4(-0.016, -0.02, 0.016, 0.02), px) - inW;

  // Water: slope of the height field (finite differences), normalised to about 1 at a full crest.
  float eps = 0.0012;
  float h0 = height(sUv);
  vec2 g = vec2(height(sUv + vec2(eps, 0.0)) - h0, height(sUv + vec2(0.0, eps)) - h0) / eps / 125.0;
  float amp = rise(0.0, 0.05, e) * (0.6 + 0.9 * exp(-pow((e - 0.52) / 0.15, 2.0))) * fall(0.55, 1.0, e);
  vec2 wob = vec2(snoise(sUv * 2.1 + vec2(0.0, TAU * 0.35)), snoise(sUv * 2.1 + vec2(5.0, -TAU * 0.3)));
  vec2 dScr = (g * 0.007 + wob * 0.0035) * amp;

  // The camera touches the surface at the drop first: an opening widens from there, its rim a water lens (a strong
  // refraction, both sides bent apart), no drawn line. Output space, aspect units.
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 qo = (uv - (sc + (uC - sc) * zF * gW)) * asp;
  float ro = length(qo);
  // Spread over e 0.3..0.86: v2's first cut (0.34..0.72, eased) swapped half the frame in ~4 frames (a burst).
  float R = 1.3 * rise(0.3, 0.86, e);
  float open = rise(0.0, 0.12, R);
  float rr = ro + open * (0.06 * fbm(qo * 2.0 + vec2(1.3, TAU * 0.3)) + 0.025 * h0 * amp);
  float rim = exp(-pow((rr - R) / 0.09, 2.0)) * open;
  vec2 dirO = qo / max(ro, 1e-4) / asp;
  float inside = rise(R - 0.012, R + 0.012, R + (R - rr)) * open;
  inside = max(inside, rise(0.9, 1.0, e));

  // The room through the surface: pulled back from 1.3x, refracted hardest while we pass, then calming to still.
  float zT = mix(1.3, 1.0, eout((e - 0.34) / 0.66));
  float ampR = rise(0.3, 0.5, e) * fall(0.5, 1.0, e) * 1.6;
  vec2 rUv = sc + (uv - sc) / zT + (g * 0.02 + wob * 0.005) * ampR - dirO * rim * 0.08;
  // The cream side arrives from the right as the surface settles; its edge comes to rest on the seam.
  float xw = mix(1.08, uSeam, rise(0.45, 1.0, e));
  float calm = fall(0.85, 1.0, e);
  float wav = (0.025 * sin(rUv.y * 11.0 + TAU * 4.0) + 0.03 * fbm(vec2(rUv.y * 3.0, TAU * 0.4))) * calm;
  float side = rise(xw - 0.0012, xw + 0.0012, rUv.x + wav);
  vec3 cRoom = mix(tex(uAux, rUv).rgb, tex(uTo, rUv).rgb, side);
  vec3 cScr2 = tex(uFrom, sUv + dScr + dirO * rim * 0.035 / (zF * gW)).rgb;
  vec3 surf = mix(cScr2, cRoom, inside);

  // Soft specular glint on the crests (light from the top left) and along the rim; yellow on the screen, cream in
  // the room.
  vec3 n = normalize(vec3(-g, 1.0));
  vec3 hv = normalize(normalize(vec3(-0.45, -0.55, 0.7)) + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, hv), 0.0), 180.0) * (amp + ampR * 0.9);
  spec += exp(-pow((rr - R + 0.01) / 0.01, 2.0)) * open * 0.35 * rise(0.0, 0.02, 1.4 - R);
  surf = mix(surf, mix(YEL, CREAM, inside), clamp(spec * 0.9, 0.0, 0.7));

  vec3 col = mix(tex(uFrom, pUv).rgb, surf, inW);
  col = mix(col, NAVY, bez * rise(0.26, 0.4, e));
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface WaterDiveProps {
  progress: number;
  /** Transition length in seconds: the waves run on transition time. */
  seconds: number;
  time: number;
  from: Painter;
  to: Painter;
  /** `to` without whatever should only appear once the surface calms (here: the cream side right of the seam). */
  aux: Painter;
  /** Drop point in the from-layer, uv (top-left origin). */
  center?: readonly [number, number];
  /** The liquid surface (the screen) in the from-layer: x0, y0, x1, y1 in uv. */
  surface?: readonly [number, number, number, number];
  /** Where the late part of `to` ends on the left, as a share of the width. */
  seam?: number;
}

export const WaterDive = ({ progress, seconds, time, from, to, aux, center = [0.5, 0.5], surface = [0.25, 0.25, 0.75, 0.75], seam = 0.5 }: WaterDiveProps) => (
  <GLTransition frag={FRAG} progress={progress} time={time} from={from} to={to} aux={aux} uniforms={{ uC: center, uRect: surface, uDur: seconds, uSeam: seam }} />
);
