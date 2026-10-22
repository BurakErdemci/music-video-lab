// The build's flight into RK3 (round 9; round 10 on the 16:9 plate). Node-safe: worlds/Painting.tsx draws the view
// and the finale's state reports it, so tools/framecheck.mjs measures what renders. Every other painting's view is
// worlds/paintview.ts paintShotView.
// Burak approved the flight on 2026-10-22: one continuous flight into RK3, covering the frame on the build's first
// downbeat, then the camera accelerates in on the girls' meeting hands and climbs into the fork of the two branches,
// the near pixels swelling ahead of the far ones; every beat a pulse that grows with the build. The push is capped by
// the 1.25x pixel rule (a painting one frame tall is 1440 px at 2K over its 2048: 0.703x).
import { clamp01, outQuad } from '../../lib/ease.ts';
import { beats } from '../../timing.ts';
import { COVER, PAINT_W, type PaintView, SCALE_CAP, WHOLE_SCALE } from '../../worlds/paintview.ts';

const room = (size: number) => Math.abs(1 - size) / 2;
const clampOff = (o: number, size: number) => Math.max(-room(size), Math.min(room(size), o));

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
  const h = (COVER + (hMax - COVER) * push) * (1 + pulse);
  // the focus climbs from the hands into the fork in the second half
  const climb = outQuad(clamp01((u - 0.45) / 0.55));
  const focus: [number, number] = [HANDS[0], HANDS[1] + (FORK[1] - HANDS[1]) * climb];
  // centre the focus as the push grows, plus a sway that widens bar by bar (the truck that works the parallax)
  const m = clamp01((h - 1) / 0.5);
  const sway = (0.004 + 0.03 * u) * Math.sin(u * Math.PI * 5);
  const ox = clampOff(-(focus[0] - 0.5) * h * PAINT_W * m + sway, h * PAINT_W);
  const oy = clampOff(-(focus[1] - 0.5) * h * m, h);
  // the near pixels slide against the sway and drop as the camera climbs past them
  const shift: [number, number] = [(0.004 + 0.03 * u) * Math.sin(u * Math.PI * 5 + 0.6), 0.025 * climb];
  // the last half second the light of the fork floods up: the camera goes through into the rig
  const gain = 1 + 0.35 * clamp01((t - (f.t1 - 0.5)) / 0.5) ** 2;
  return { h, ox, oy, shift, pivot: 0.4, zoom, focus, gain };
};
