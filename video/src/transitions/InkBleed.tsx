import { FRAG_HEAD } from './gl.ts';
import { GLSL_PALETTE } from './glslPalette.ts';
import { GLTransition } from './GLTransition.tsx';
import type { Painter } from './layers.ts';

/**
 * G2 "ink spreads into the seam". Navy ink blooms from a point (the notebook page) like ink on wet paper: a domain-warped
 * front with a darker pooled rim, granulated interior and spatter ahead of it. Left of the seam the ink develops into the
 * `to` layer (the navy room); right of the seam it may overflow, then retreats so its edge settles on a straight seam.
 * Behind a separate wet wash (with a tide line) the right side turns from `from` into `to`.
 * progress 0 shows `from` exactly, 1 shows `to` exactly.
 */
const FRAG = `${FRAG_HEAD}
${GLSL_PALETTE}
uniform vec2 uO;
uniform float uSeam;
uniform float uDur;

void main() {
  vec2 uv = topUv();
  float A = uRes.x / uRes.y;
  float e = clamp(uP, 0.0, 1.0);
  float tau = e * uDur;
  vec2 q = (uv - uO) * vec2(A, 1.0);
  float sx = (uv.x - uSeam) * A;

  // Ink front. The warp is scaled by the radius: it starts as a small round drop on the page and grows ragged.
  // Radii are sized to the frame (farthest corner ~1.36 incl. warp), so each front leaves the frame while it is
  // already slowing down: no sudden stop in the motion.
  // Covered area grows with R^2: a power curve keeps the area rate even. Measured (v1): the warped front covers the
  // far top-left corner at R ~ 1.0, so 1.12 lets that last corner close at e ~ 0.92 while the front is slowing.
  float Ri = 1.12 * pow(rise(0.03, 0.97, e), 2.0);
  float rough = rise(0.0, 0.3, Ri);
  vec2 qa = q * vec2(mix(1.0, 1.9, rise(-0.05, 0.12, sx)), 1.0);
  float d = length(qa) + rough * (0.22 * fbm(q * 1.6 + vec2(5.2, 1.3 + tau * 0.04)) + 0.05 * fbm(q * 7.0 + vec2(tau * 0.15, 7.0)));
  // Right of the seam the ink may run only L past it; L swells then shrinks to 0. Past L the paper resists (a distance
  // penalty), so the front slows and stops organically; a straight cut takes over only as the edge comes to rest.
  float L = 0.2 * sin(3.14159 * clamp((e - 0.1) / 0.9, 0.0, 1.0)) * fall(0.6, 1.0, e);
  float ragged = pow(1.0 - e, 1.5) * 0.09 * fbm(vec2(uv.y * 5.0, tau * 0.3 + 2.0) + q * 1.5);
  d += mix(2.5, 90.0, rise(0.45, 0.88, e)) * max(sx + ragged - L, 0.0);
  float edgeW = 0.012;
  float inkOrg = fall(Ri - edgeW, Ri, d) * rise(0.0, 0.006, Ri);
  float seamCut = mix(1.0, fall(L, L + 0.0018, sx + ragged), rise(0.8, 0.97, e));

  // Spatter: drops just ahead of the front, absorbed when it passes, gone by the end.
  float spat = rise(0.5, 0.56, snoise(q * 11.0 + vec2(11.0, 3.0))) * fall(Ri, Ri + 0.13, d) * rise(Ri - 0.01, Ri + 0.01, d)
             * rise(0.02, 0.08, Ri) * fall(0.7, 0.92, e);
  float left = fall(-0.004, 0.004, sx);
  float I = clamp(max(inkOrg, rise(0.93, 1.0, e) * left) + spat, 0.0, 1.0) * seamCut;

  // Ink colour: granulated navy, darker where it pooled at the rim (classic wet-paper edge).
  float depth = Ri - d;
  float gran = fbm(q * 5.0 + vec2(2.0, 9.0));
  vec3 ink = mix(NAVY, NAVY * 1.45 + vec3(0.02), 0.25 + 0.25 * gran);
  ink = mix(ink, NAVY * 0.7, fall(0.0, 0.035, depth) * 0.85);
  // Left of the seam the ink develops into the to-layer from the inside out; overflow right of the seam stays ink.
  float dev = max(rise(0.06, 0.32, depth + 0.08 * gran) * rise(0.12, 0.55, e) * left, rise(0.8, 0.97, e));

  // Wet wash on the right: from -> to behind a soft front marked by a thin water line.
  float Rw = 1.38 * pow(rise(0.06, 0.97, e), 1.3);
  float dw = length(q) + rise(0.0, 0.3, Rw) * 0.16 * fbm(q * 2.0 + vec2(3.0, 0.5));
  float wash = fall(Rw - 0.01, Rw, dw) * rise(0.0, 0.006, Rw);
  // Only a thin water line marks the wash front (v1 also greyed the paper behind it: read as a cloud outline).
  float tide = exp(-pow((dw - Rw) / 0.0022, 2.0)) * rise(0.0, 0.05, Rw) * fall(0.8, 1.0, e);
  float right = 1.0 - left;

  vec3 cFrom = tex(uFrom, uv).rgb;
  vec3 cTo = tex(uTo, uv).rgb;
  vec3 base = mix(cFrom, cTo, wash * right);
  base = mix(base, NAVY, tide * 0.3 * right);
  base = mix(base, cTo, rise(0.9, 1.0, e));
  vec3 inked = mix(ink, cTo, dev);
  gl_FragColor = vec4(mix(base, inked, I), 1.0);
}
`;

export interface InkBleedProps {
  progress: number;
  seconds: number;
  time: number;
  from: Painter;
  to: Painter;
  /** Where the ink lifts off (uv, top-left origin). */
  origin?: readonly [number, number];
  /** Seam position as a share of the width; the ink side is left of it. */
  seam?: number;
}

export const InkBleed = ({ progress, seconds, time, from, to, origin = [0.5, 0.5], seam = 0.5 }: InkBleedProps) => (
  <GLTransition frag={FRAG} progress={progress} time={time} from={from} to={to} uniforms={{ uO: origin, uSeam: seam, uDur: seconds }} />
);
