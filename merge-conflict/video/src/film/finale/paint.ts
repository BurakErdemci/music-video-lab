// Where a finale painting sits in the frame at t (round 9). Node-safe: film/finale/Painting.tsx draws it and the
// finale's state reports it, so tools/framecheck.mjs measures what renders.
//
// Two kinds of move, both on the painting's own depth map:
//  - at rest (the piano's RK1 and RK2, the outro's RK11): the painting stays whole - its height runs 97 % -> 100 % of
//    the frame (Ken Burns <= 3 %) while it drifts sideways inside the side bands it leaves free, and its near pixels
//    lead the drift (depth parallax sampled inside the painting). Burak: no frozen 4 s in the piano, no 5 s still hold
//    on the dawn walk.
//  - the build's flight (Burak approved, 2026-10-22): one continuous flight into RK3. Whole on the build's first
//    downbeat, then the camera accelerates in on the girls' meeting hands and climbs into the fork of the two
//    branches, the near pixels swelling ahead of the far ones; every beat a pulse that grows with the build. The push
//    is capped by the 1.25x pixel rule (a painting is 1440 px tall at 2K over its 2048: 0.703x when whole).
import { clamp01, inOutQuad, outQuad } from '../../lib/ease.ts';
import { beats } from '../../timing.ts';

/** The frame's aspect over the painting's (16:9 over 3:2): a painting fitted to the height spans 0.84 frame widths. */
export const PAINT_W = 1.5 / (16 / 9);
/** A painting fitted to the frame height at the 2K output, over its own pixels (2048 px tall, shown 1440). */
export const WHOLE_SCALE = 1440 / 2048;
/** The pixel rule (scene-map.md "Resolution: no blur") with a little room for rounding. */
export const SCALE_CAP = 1.24;

/** A painting in frame units: its height `h` in frame heights (width h * PAINT_W), its centre offset (ox, oy) from
 *  the frame's centre in frame widths/heights (y up), the parallax `shift` (texture units at full depth, near =
 *  white), the near-pixel swell `zoom` about `focus` (painting uv, y up), and the brightness `gain`. */
export interface PaintView { h: number; ox: number; oy: number; shift: [number, number]; zoom: number; focus: [number, number]; gain: number }

/** The most a pixel is magnified at the 2K output (the plane's scale times the near swell). */
export const paintMag = (v: PaintView): number => WHOLE_SCALE * v.h * (1 + 0.7 * v.zoom);
/** Whether the painting is whole in the frame (every edge inside it). */
export const paintWhole = (v: PaintView): boolean =>
  v.h <= 1 + 1e-6 && Math.abs(v.ox) <= (1 - v.h * PAINT_W) / 2 + 1e-6 && Math.abs(v.oy) <= (1 - v.h) / 2 + 1e-6;

/** Keep the offset where it may be: whole (inside the frame) when the painting is smaller than the frame in that
 *  direction, covering the frame when it is larger. */
const room = (size: number) => Math.abs(1 - size) / 2;
const clampOff = (o: number, size: number) => Math.max(-room(size), Math.min(room(size), o));

/** A painting at rest across a shot of `dur` seconds, `u` its progress 0..1: whole, drifting sideways by `drift`
 *  frame widths in all (dir -1 or 1), its near pixels leading by up to 1.6 % of the painting. */
export const restView = (u: number, dur: number, dir: number, drift = 0.1): PaintView => {
  const k = clamp01(u);
  // a continuous move: eased only at the ends, so it never stops inside the shot
  const s = 0.15 * inOutQuad(k) + 0.85 * k;
  const h = 0.97 + 0.03 * s;
  const ox = clampOff(dir * drift * (s - 0.5), h * PAINT_W);
  // the near pixels lead the drift; the swell grows over the shot (a slow push into the depth)
  const lead = Math.min(1, dur / 4);
  return { h, ox, oy: 0, shift: [dir * 0.016 * lead * (s - 0.5) * 2, 0.004 * Math.sin(Math.PI * s)], zoom: 0.06 * s, focus: [0.5, 0.5], gain: 1 };
};

// ---- the build's flight into RK3 -------------------------------------------------------------------------------
/** The meeting hands and the fork of the two branches above them (RK3, uv with y up). */
const HANDS: [number, number] = [0.5, 0.6];
const FORK: [number, number] = [0.5, 0.8];
export interface Flight { t0: number; t1: number }

/** The flight at t (t0 the build's first downbeat, t1 when the camera goes through into the light). */
export const flightView = (t: number, f: Flight): PaintView => {
  const u = clamp01((t - f.t0) / (f.t1 - f.t0));
  // whole on the first downbeat, then a push that accelerates every bar (the build rises bar by bar)
  const go = clamp01((u - 0.04) / 0.96);
  const push = 0.4 * go + 0.6 * go * go * go;
  // the beat pulse: a short swell on every beat, growing with the build
  const b = [...beats].reverse().find((x) => x <= t && x >= f.t0);
  const pulse = b === undefined ? 0 : (0.006 + 0.03 * u) * (1 - outQuad(clamp01((t - b) * 5)));
  const zoom = 0.16 * go * go;
  // the height the pixel rule allows with this swell, and the push toward it
  const hMax = SCALE_CAP / (WHOLE_SCALE * (1 + 0.7 * zoom) * (1 + 0.036));
  const h = (0.97 + (hMax - 0.97) * push) * (1 + pulse);
  // the focus climbs from the hands into the fork in the second half
  const climb = outQuad(clamp01((u - 0.45) / 0.55));
  const focus: [number, number] = [HANDS[0], HANDS[1] + (FORK[1] - HANDS[1]) * climb];
  // centre the focus as the push grows, plus a sway that widens bar by bar (the truck that works the parallax)
  const m = clamp01((h - 1) / 0.5);
  const sway = (0.004 + 0.03 * u) * Math.sin(u * Math.PI * 5);
  const ox = clampOff(-(focus[0] - 0.5) * h * PAINT_W * m + sway, h * PAINT_W);
  const oy = clampOff(-(focus[1] - 0.5) * h * m, h);
  // the near pixels slide against the sway and drop as the camera climbs past them
  const shift: [number, number] = [-(0.004 + 0.03 * u) * Math.sin(u * Math.PI * 5 + 0.6), -0.025 * climb];
  // the last half second the light of the fork floods up: the camera goes through into the rig
  const gain = 1 + 0.35 * clamp01((t - (f.t1 - 0.5)) / 0.5) ** 2;
  return { h, ox, oy, shift, zoom, focus, gain };
};
