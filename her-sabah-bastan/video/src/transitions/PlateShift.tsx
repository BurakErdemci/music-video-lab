import { FRAG_HEAD } from './gl.ts';
import { GLSL_PALETTE } from './glslPalette.ts';
import { GLTransition } from './GLTransition.tsx';
import type { Painter } from './layers.ts';

/**
 * "Plate registration shift". A screenprint frame is a yellow plate and a navy plate on paper; each plate is the colour
 * separation of the WHOLE image (barycentric weights in the navy / yellow / cream triangle), printed paper -> yellow -> navy.
 * Outgoing: the plates drift slightly off-register (tens of px, 1-3 degrees: yellow ghosts and cream gaps beside the navy
 * line art), then are peeled off the print bed one by one (yellow and navy lift together as one sheet) by a curved front; at the front a narrow
 * lifted curl (foreshortened strip, cream highlight crest, navy shadow line, paper tint) shows the bent sheet, and behind
 * it that plate's ink is gone. Incoming: the plates are laid down the same way (yellow, then navy), land off by a few
 * px / degrees and snap into register on a damped spring with a small overshoot; navy settles exactly before progress 1.
 * Overlaps use print logic (navy over yellow over paper), never a mix of the two images.
 * progress 0 shows `from` exactly and 1 shows `to` exactly (sampled directly in the first/last 3 percent).
 */
const FRAG = `${FRAG_HEAD}
${GLSL_PALETTE}
uniform vec4 uOut;   // peel windows (progress): yellow start, end; navy start, end
uniform vec4 uIn;    // lay-down windows: yellow start, end; navy start, end
uniform vec4 uSnap;  // spring windows: yellow start, end; navy start, end

float A;
const float W = 0.07;      // curl strip width (height = 1, so ~59 px)

// Rigid sheet transform about the frame centre: aspect-space offset (height = 1) and rotation in radians.
vec2 sheet(vec2 uv, vec2 off, float rot) {
  vec2 p = (uv - 0.5) * vec2(A, 1.0) - off;
  float c = cos(rot), s = sin(rot);
  p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  return p / vec2(A, 1.0) + 0.5;
}

// Ink coverage of one plate (ch 0 yellow, 1 navy) of a layer at uv; outside the sheet there is bare paper.
float plateCov(sampler2D s, float ch, vec2 uv, vec2 off, float rot) {
  vec2 q = sheet(uv, off, rot);
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return 0.0;
  vec3 c = tex(s, q).rgb;
  vec3 y = YEL - CREAM, n = NAVY - CREAM, d = c - CREAM;
  float yy = dot(y, y), nn = dot(n, n), yn = dot(y, n);
  float det = yy * nn - yn * yn;
  float a = (dot(d, y) * nn - dot(d, n) * yn) / det;
  float b = (dot(d, n) * yy - dot(d, y) * yn) / det;
  b = clamp(b, 0.0, 1.0);
  a = clamp(a, 0.0, 1.0 - b);
  return ch < 0.5 ? a / max(1.0 - b, 0.001) : b;
}

// Slightly curved, wobbling front coordinate: s grows along dir; the front is the line s = f.
float frontCoord(vec2 p, vec2 dir, float curv, float seed) {
  float perp = dot(p, vec2(-dir.y, dir.x));
  return dot(p, dir) + curv * perp * perp + 0.035 * snoise(p * 1.3 + seed);
}
float frontPos(float u, vec2 dir, float curv) {
  float ext = 0.5 * (abs(dir.x) * A + abs(dir.y));
  float E = ext + W + 0.32;
  return mix(-E, E, mix(u, eio(u), 0.45));
}
float band(float lo, float hi, float x) { return rise(lo - 0.0012, lo + 0.0012, x) * fall(hi - 0.0012, hi + 0.0012, x); }

// Both return (ink coverage, curl-strip mask, strip shade, cast-shadow mask).
// Peeled: ink is gone behind the front (d < 0); the lifted sheet is seen from its back in the strip 0 < d < W.
vec4 peelOut(sampler2D S, float ch, vec2 uv, vec2 off, float rot, vec2 dir, float curv, float seed, float u) {
  vec2 p = (uv - 0.5) * vec2(A, 1.0);
  float d = frontCoord(p, dir, curv, seed) - frontPos(u, dir, curv);
  float plain = plateCov(S, ch, uv, off, rot);
  float inStrip = band(0.0, W, d);
  float shade = d < 0.012 ? 1.05 : 1.0;
  float act = rise(0.002, 0.03, u) * fall(0.97, 0.995, u);
  return vec4(plain * rise(W - 0.0012, W + 0.0012, d), inStrip * act, shade, max(band(-0.045, 0.0, d) * (1.0 + d / 0.045), 2.0 * band(-0.0025, 0.0, d)) * act);
}

// Laid down: ink is present behind the front (d < 0); the lifted back of the sheet trails ahead of it.
vec4 layIn(sampler2D S, float ch, vec2 uv, vec2 off, float rot, vec2 dir, float curv, float seed, float u) {
  vec2 p = (uv - 0.5) * vec2(A, 1.0);
  float d = frontCoord(p, dir, curv, seed) - frontPos(u, dir, curv);
  float plain = plateCov(S, ch, uv, off, rot);
  float inStrip = band(0.0, W, d);
  float shade = d > W - 0.012 ? 1.05 : 1.0;
  float act = rise(0.002, 0.03, u) * fall(0.97, 0.995, u);
  return vec4(plain * fall(-0.0012, 0.0012, d), inStrip * act, shade, max(band(W, W + 0.045, d) * (1.0 - (d - W) / 0.045), 2.0 * band(W, W + 0.0025, d)) * act);
}

float win(float e, vec2 w) { return clamp((e - w.x) / (w.y - w.x), 0.0, 1.0); }
// Damped spring from 1 (off) to 0 (in register); zeta < 1 overshoots; the tail is cut so it is exactly 0.
float snap(float e, vec2 w, float zeta, float wn) {
  float u = win(e, w);
  float wd = wn * sqrt(1.0 - zeta * zeta);
  return exp(-zeta * wn * u) * (cos(wd * u) + zeta * wn / wd * sin(wd * u)) * fall(0.8, 1.0, u);
}

void main() {
  vec2 uv = topUv();
  A = uRes.x / uRes.y;
  float e = clamp(uP, 0.0, 1.0);

  // Outgoing plates drift 25-40 px apart (1-2 degrees) in the first fifth, then are peeled; the incoming plates are laid
  // right behind the navy peel front (same sweep), land off-register and snap in.
  float dY = rise(0.0, 0.17, e), dN = rise(0.02, 0.2, e);
  vec2 dA = normalize(vec2(1.0, 0.8)), dB = normalize(vec2(1.0, 0.35));
  vec4 oy = peelOut(uFrom, 0.0, uv, vec2(-0.036, -0.016) * dY, 0.03 * dY, dA, 0.26, 3.0, win(e, uOut.xy));
  vec4 on = peelOut(uFrom, 1.0, uv, vec2(0.03, 0.026) * dN, -0.03 * dN, dB, -0.24, 8.0, win(e, uOut.zw));

  float sy = snap(e, uSnap.xy, 0.5, 9.0), sn = snap(e, uSnap.zw, 0.45, 9.0);
  vec4 iy = layIn(uTo, 0.0, uv, vec2(0.04, -0.026) * sy, 0.035 * sy, dB, -0.24, 8.0, win(e, uIn.xy));
  vec4 in_ = layIn(uTo, 1.0, uv, vec2(-0.034, 0.036) * sn, -0.03 * sn, dB, -0.24, 8.0, win(e, uIn.zw));

  float ay = max(oy.x, iy.x);
  float bn = max(on.x, in_.x);
  vec3 col = mix(CREAM, YEL, ay);
  col = mix(col, NAVY, bn);
  float shadow = max(max(oy.w, on.w), max(iy.w, in_.w));
  // Cast shadow printed as ink: a 45 degree navy halftone (7 px cells, dot size by strength) plus a ~2 px solid hairline.
  vec2 hc = vec2(gl_FragCoord.x + gl_FragCoord.y, gl_FragCoord.x - gl_FragCoord.y) * 0.7071 / 7.0;
  float dots = shadow > 1.5 ? 1.0 : step(length(fract(hc) - 0.5), 0.62 * sqrt(clamp(shadow, 0.0, 1.0)));
  col = mix(col, NAVY, dots * step(0.001, shadow));
  float sm = oy.y + on.y + iy.y + in_.y;
  float shade = (oy.y * oy.z + on.y * on.z + iy.y * iy.z + in_.y * in_.z) / max(sm, 0.0001);
  vec3 back = CREAM * shade * (1.0 - 0.035 * snoise(vec2(uv.x * A * 40.0, uv.y * 4.0)));
  col = mix(col, back, min(sm, 1.0));

  col = mix(col, tex(uFrom, uv).rgb, fall(0.0, 0.03, e));
  col = mix(col, tex(uTo, uv).rgb, rise(0.97, 1.0, e));
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface PlateShiftProps {
  progress: number;
  seconds: number;
  time: number;
  from: Painter;
  to: Painter;
  /** Outgoing peel windows as progress ranges [yellow start, end, navy start, end]. */
  peel?: readonly [number, number, number, number];
  /** Incoming lay-down windows [yellow start, end, navy start, end]. */
  lay?: readonly [number, number, number, number];
  /** Incoming snap-into-register spring windows [yellow start, end, navy start, end]; navy must end before 0.97. */
  snap?: readonly [number, number, number, number];
}

export const PlateShift = ({ progress, time, from, to, peel = [0.04, 0.54, 0.04, 0.54], lay = [0.12, 0.62, 0.12, 0.62], snap = [0.42, 0.8, 0.58, 0.95] }: PlateShiftProps) => (
  <GLTransition frag={FRAG} progress={progress} time={time} from={from} to={to} uniforms={{ uOut: peel, uIn: lay, uSnap: snap }} />
);
