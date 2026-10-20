import { FRAG_HEAD } from './gl.ts';
import { GLSL_PALETTE } from './glslPalette.ts';
import { GLTransition } from './GLTransition.tsx';
import type { Painter } from './layers.ts';

/**
 * G5 "squeegee print". A screen-print frame (navy bars with a cream inner line and a fine mesh) drops over the picture, a
 * squeegee is pulled across it by hand (slow start, fast middle, slow end) and the frame lifts away again. The squeegee is
 * a visible object: a navy handle bar with a cream rim, a thin yellow rubber blade on its leading side, a crisp offset
 * cast shadow, and a rolling ridge of navy ink (cream specular line) pushed in front of the blade. Behind the blade the `to`
 * scene is printed through the screen: coverage is a hard threshold (~1 px edge); a pixel fills when the blade has passed
 * plus a noise delay, so thin streaks along the pull stay starved for a few frames and the print is speckled with pinholes
 * that close up. The fresh film is darker with a navy rim and a sheen line until it dries to plain `to`.
 * progress 0 shows `from` exactly, 1 shows `to` exactly.
 */
const FRAG = `${FRAG_HEAD}
${GLSL_PALETTE}
uniform float uTilt;

float slAt(vec2 p, float A, float tilt) { return p.x * A + (p.y - 0.5) * tilt; }

void main() {
  vec2 uv = topUv();
  float A = uRes.x / uRes.y;
  float px = 1.0 / uRes.y;
  float e = clamp(uP, 0.0, 1.0);
  vec3 cFrom = tex(uFrom, uv).rgb;
  vec3 cTo = tex(uTo, uv).rgb;
  if (e <= 0.0) { gl_FragColor = vec4(cFrom, 1.0); return; }
  if (e >= 1.0) { gl_FragColor = vec4(cTo, 1.0); return; }

  // Hand pull: sine ease in/out along the stroke (slow start, fast middle, slow end).
  float s = 0.5 - 0.5 * cos(3.14159265 * e);
  float Bp = mix(-0.26, A + 0.36, s);
  float B = Bp + 0.03;
  float tilt = uTilt;
  float y = uv.y;
  float sl = slAt(uv, A, tilt);
  float sx = sl - B;
  float hw = 0.05;  // handle thickness (rubber blade is 0.012)

  // ---- print: delay field (starved streaks) and hard coverage threshold
  float streak = snoise(vec2(sl * 0.9 + 3.1, y * 95.0));
  float streak2 = snoise(vec2(sl * 1.7 + 8.0, y * 210.0 + 4.0));
  float patch = fbm(vec2(sl * 1.4, y * 6.0 + 2.0));
  float dl = 0.085 * rise(0.2, 0.75, streak) + 0.035 * rise(0.35, 0.85, streak2) + 0.02 * (patch + 0.4);
  float flow = 0.012 * snoise(vec2(y * 30.0, sl * 2.0)) + 0.01 * patch;
  float fd = Bp - 0.034 - (sl + max(dl, 0.0) + flow);  // > 0: printed
  float cov = rise(-px * 0.7, px * 0.7, fd);

  float bare = rise(0.1, 0.3, snoise(vec2(sl * 0.6 + 9.0, y * 140.0)));
  float behind = rise(-px, px, Bp - sl + 0.02);
  vec3 open = mix(cFrom, CREAM, bare * behind * 0.9);

  // Wet film: darker, navy rim at the edge, sheen line.
  float filmW = 0.085;
  float wet = fall(filmW * 0.8, filmW, fd);
  vec3 film = cTo * (0.78 + 0.22 * rise(0.0, filmW, fd));
  film *= 1.0 - 0.12 * wet * rise(0.1, 0.8, streak);
  film = mix(film, mix(cTo, NAVY, 0.6), fall(0.0, 0.0075, fd));
  float sheenPos = 0.019 + 0.004 * snoise(vec2(y * 22.0, 1.0));
  float sheen = fall(0.0, 1.8 * px, abs(fd - sheenPos)) * rise(-0.2, 0.4, snoise(vec2(y * 17.0, sl * 1.2)));
  film = mix(film, CREAM, sheen * 0.55);
  vec3 printed = mix(cTo, film, wet);
  // Pinholes: starved specks right behind the blade that close up as the ink settles.
  float pin = step(0.62 + 1.6 * rise(0.0, 0.22, fd), snoise(vec2(uv.x * A, y) * 200.0));
  printed = mix(printed, open, pin * cov);
  vec3 col = mix(open, printed, cov);

  // ---- screen: mesh and frame bars drop in, then lift away upward
  float inT = clamp(e / 0.21, 0.0, 1.0);
  float outT = clamp((e - 0.75) / 0.22, 0.0, 1.0);
  float fy = -1.1 * (1.0 - eout(inT)) - 1.1 * outT * outT * (3.0 - 2.0 * outT) + 0.002 * sin(3.14159265 * inT);
  vec2 fuv = vec2(uv.x, uv.y - fy);
  vec2 fp = fuv * uRes;
  vec2 gcell = abs(fract(fp / 6.0) - 0.5) * 6.0;
  float mesh = max(step(2.3, gcell.x), step(2.3, gcell.y));
  float inside = step(0.0, fuv.y) * step(fuv.y, 1.0);
  float lum = dot(col, vec3(0.3, 0.55, 0.15));
  col = mix(col, mix(CREAM, NAVY, step(0.5, lum)), 0.16 * mesh * inside * (1.0 - rise(0.0, 0.7, outT)) * rise(0.3, 1.0, inT));
  float bar = 0.034;
  float eb = min(min(fuv.x * A, (1.0 - fuv.x) * A), min(fuv.y, 1.0 - fuv.y));
  float frameOn = inside * fall(bar - px, bar + px * 0.0001, eb) ;
  frameOn = inside * (1.0 - step(bar, eb));
  float inner = inside * step(bar, eb) * (1.0 - step(bar + 2.5 * px, eb));
  col = mix(col, NAVY, frameOn);
  col = mix(col, CREAM, inner * 0.85);

  // ---- cast shadow (crisp, offset down-right), under the squeegee
  float sxs = slAt(uv - vec2(0.012, 0.024), A, tilt) - B;
  float shadow = step(-hw, sxs) * (1.0 - step(0.012, sxs));
  col = mix(col, vec3(0.015, 0.02, 0.06), 0.75 * shadow);

  // ---- ink bead rolling ahead of the rubber
  float wob = snoise(vec2(y * 9.0, e * 4.0));
  float bw = (0.026 + 0.012 * wob) * rise(0.0, 0.05, e);
  float bd = sx - 0.012;
  float inBead = step(0.0, bd) * (1.0 - step(bw, bd));
  float bpos = bd / max(bw, 0.001);
  vec3 beadCol = mix(NAVY * 0.8, NAVY * 1.7 + 0.03, rise(0.0, 1.0, bpos));
  beadCol = mix(beadCol, CREAM, fall(0.0, 1.7 * px, abs(bd - bw * 0.62)) * rise(-0.5, 0.2, snoise(vec2(y * 21.0, 2.0))));
  float edgeDark = step(lum, 0.35);
  beadCol = mix(beadCol, mix(CREAM, YEL, 0.3) * 0.85, edgeDark * inBead * (1.0 - step(2.0 * px, bw - bd)) );
  col = mix(col, beadCol, inBead);

  // ---- squeegee: rubber blade (yellow, cream line), handle bar (navy, cream rim, grain)
  float rubber = step(-0.002, sx) * (1.0 - step(0.012, sx));
  vec3 rub = mix(YEL, CREAM, fall(0.0, 2.0 * px, abs(sx - 0.002)));
  float handle = step(-hw, sx) * (1.0 - step(-0.002, sx));
  float grain = snoise(vec2(sl * 380.0, y * 3.0));
  vec3 hc = NAVY * (1.15 + 0.35 * grain);
  hc = mix(hc, CREAM, fall(0.0, 2.2 * px, abs(sx + hw - 1.5 * px)));
  hc = mix(hc, CREAM * 0.7, fall(0.0, 1.5 * px, abs(sx + 0.006)));
  hc = mix(hc, YEL * 0.8, fall(0.0, 1.5 * px, abs(sx + hw * 0.5)) * 0.7);
  col = mix(col, rub, rubber);
  col = mix(col, hc, handle);

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface SqueegeePrintProps {
  progress: number;
  seconds: number;
  time: number;
  from: Painter;
  to: Painter;
  /** How far the blade leans off vertical, degrees. */
  tiltDeg?: number;
}

export const SqueegeePrint = ({ progress, time, from, to, tiltDeg = 8 }: SqueegeePrintProps) => (
  <GLTransition frag={FRAG} progress={progress} time={time} from={from} to={to} uniforms={{ uTilt: Math.tan((tiltDeg * Math.PI) / 180) }} />
);
