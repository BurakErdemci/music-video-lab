// Where a moment painting (QK*, RK*) sits in the frame and how it lives, frame by frame (round 10). Node-safe: the
// renderer (worlds/Painting.tsx) draws this view, and the shots report it in their state so tools/framecheck.mjs and
// tools/slidecheck.mjs measure what renders.
//
// Burak on proof232-r9: the paintings were fitted to the frame height with blurred bands at the sides ("çok dandik")
// and read as slides ("slayt resmi gibi"). Now:
//  - every painting is its 16:9 plate (public/plates/wide/<ID>.webp, the 3:2 original untouched in the middle, the
//    sides outpainted) and covers the frame; its Ken Burns only pushes in, from covering (100 %) to 103 %;
//  - a small camera move works the painting's depth map (public/plates/depth/wide/<ID>.png, near = white): a truck or
//    an arc slides the near pixels against the far ones, a push swells the near ones, a rise lifts them; metal shots
//    take the live camera's shake inside the push's room;
//  - a light sweep crosses it every bar (every two in the piano) and a soft bloom on its own highlights pulses on the
//    beat, stronger on the downbeat;
//  - the four long-held ones (RK1, RK2, RK11, RK12) are living paintings: the empty painting (layers/<ID>-bg) and the
//    girls on their own plane in front (layers/<ID>-fg, -fgb, -fgc), which slide against it with real parallax, play
//    their drawn loop base, b, c, b at the section's rate (rig/loop.ts), bob on the beat and keep a contact shadow and
//    a rim glow so they stay seated in the painting.
import { shakeAt } from '../film/livecam.ts';
import { clamp01, type Hex, inOutQuad } from '../lib/ease.ts';
import { loopIndex } from '../rig/loop.ts';
import { barPos, beatPos, sectionAt } from '../timing.ts';

/** The wide plates' pixels; the original 3:2 painting spans x 284..3356 in the middle. */
export const WIDE_PX: readonly [number, number] = [3640, 2048];
export const CENTRE_U: readonly [number, number] = [284 / 3640, 3356 / 3640];
/** A painting's width over the frame's at the same height (16:9 plate over the 16:9 frame: 0.99975). */
export const PAINT_W = WIDE_PX[0] / WIDE_PX[1] / (16 / 9);
/** The height (in frame heights) at which the painting just covers the frame. */
export const COVER = Math.max(1, 1 / PAINT_W);
/** The Ken Burns push-in over a shot (103 % of covering at most). */
export const KB = 0.03;
/** A painting one frame height tall at the 2K output, over its own pixels (1440 of 2048). */
export const WHOLE_SCALE = 1440 / WIDE_PX[1];
/** The pixel rule (scene-map.md "Resolution: no blur") with a little room for rounding. */
export const SCALE_CAP = 1.24;

/** The girls' own plane of a living painting. `drawing` 0 base, 1 b, 2 c; `depth` the girls' depth on the painting's
 *  depth scale; `bob` the beat bob in frame heights (down; negative lifts them). */
export interface GirlsView { drawing: 0 | 1 | 2; depth: number; bob: number; glow: Hex; glowAmt: number; shadow: number }
/** A light band crossing the painting: its position across (-0.4..1.4 along `angle`), width and strength. */
export interface Sweep { pos: number; angle: number; width: number; amt: number; color: Hex }
/** A painting in frame units: its height `h` in frame heights (width h * PAINT_W), its centre offset (ox, oy) from
 *  the frame's centre in frame widths/heights (y up); the depth parallax: content at depth d moves by
 *  -shift * (d - pivot) (painting uv) and swells by 1 + zoom * max(d - pivot, 0) about `focus` (painting uv, y up);
 *  the brightness `gain`, the light sweep and the highlight bloom. `layered`: drawn from its layers, with `girls`. */
export interface PaintView {
  h: number; ox: number; oy: number; shift: [number, number]; pivot: number; zoom: number; focus: [number, number]; gain: number;
  sweep?: Sweep; bloom?: number; layered?: boolean; girls?: GirlsView;
}

/** The paintings drawn from layers (stil/prompts/w-layers -> tools/imagegen/greenkey.py), with the girls' depth on
 *  the depth maps' scale (tools/depthmap.py, measured round 10): where they touch the ground, the ground's depth, so
 *  their soles do not slide on it (RK11: the street under the boots 0.07, the girls 0.13); in the air or cut by the
 *  frame, the median of the wide plate's depth under them (RK2 0.46, RK12 0.62). RK1 sits on the stage edge with her
 *  boots on the near floor (girls 0.33, the floor under the boots 0.77): 0.65 keeps the boots' slip under 15 px. */
/** `walk`: the drawings are a walk cycle, stepped one drawing a beat (round 11; the section's rate made it hurry). */
export const LAYERED: Record<string, { depth: number; bob: boolean; walk?: boolean }> = {
  RK1: { depth: 0.65, bob: true },
  // RK2's girls are cut by the frame on every side (layers/RK2.json): a bob would open a gap at one edge
  RK2: { depth: 0.46, bob: false },
  RK11: { depth: 0.1, bob: true, walk: true },
  RK12: { depth: 0.62, bob: true },
  // RK13: walking toward the camera, cut at the frame's bottom (no bob); the depth map puts them at 0.19 against a
  // near sky, but they are the nearest thing in the frame: 0.6, so the push brings them toward us
  RK13: { depth: 0.6, bob: false, walk: true },
};

export type Particles = 'dust' | 'embers' | 'sparks' | 'confetti' | 'glitter';
export type PaintMove = 'arc' | 'truck' | 'push' | 'rise';
/** What a painting shot does: its camera move and direction, the particles in front of it (matched to the painting)
 *  and their two colours, the sweep's colour and angle (radians, 0 = left to right). */
export interface Life { move: PaintMove; dir: 1 | -1; particles: Particles; colors: [Hex, Hex]; sweep: Hex; angle: number; /** the depth that holds still, if not the move's own */ pivot?: number; /** the shared field's kind, if not the particles' */ field?: Particles; /** the point the push swells about (painting uv, y up) */ focus?: [number, number]; /** the two-bar sway's amplitude, if not the hold's own */ sway?: number }

/** Every painting shot of the film, by shot id (film/rest/plan.ts and film/finale/plan.ts). */
export const LIFE: Record<string, Life> = {
  // verse 3: the rebase heist under the mirror ball (dust in the moonlight, glints), the corridor sprint (speed)
  'rebase-asleep': { move: 'truck', dir: 1, particles: 'glitter', colors: ['#bcd2ff', '#ffd08a'], sweep: '#cfe0ff', angle: -0.5 },
  nobody: { move: 'truck', dir: -1, particles: 'sparks', colors: ['#ff6ad5', '#8ad8ff'], sweep: '#ffd0f0', angle: 0.2 },
  // the scream: forehead to forehead, fire against ice
  'scream-b': { move: 'arc', dir: 1, particles: 'embers', colors: ['#ff6a1a', '#4aa8ff'], sweep: '#fff0d0', angle: 1.57 },
  // the solo's stage painting
  'solo-cathedral-2': { move: 'arc', dir: -1, particles: 'sparks', colors: ['#ffb040', '#7ab8ff'], sweep: '#ffe0b0', angle: -0.3 },
  // the piano truce: dust in the spotlight with slow confetti, glitter along the mirror seam
  rk1: { move: 'arc', dir: 1, particles: 'dust', colors: ['#ffd8a0', '#9fc0ff'], sweep: '#ffe2b8', angle: -0.6 },
  rk2: { move: 'arc', dir: -1, particles: 'glitter', colors: ['#9fc8ff', '#ffc890'], sweep: '#f4ecff', angle: 1.57 },
  // the final chorus: confetti and stars
  rk4: { move: 'arc', dir: 1, particles: 'confetti', colors: ['#ff8a2a', '#3a8cff'], sweep: '#fff2e0', angle: 0.4 },
  rk5: { move: 'truck', dir: 1, particles: 'confetti', colors: ['#ff4fd8', '#ffb020'], sweep: '#ffe8f6', angle: -0.4 },
  rk6: { move: 'rise', dir: 1, particles: 'confetti', colors: ['#ff8a2a', '#8ab8ff'], sweep: '#fff4e0', angle: 1.2 },
  rk7: { move: 'arc', dir: -1, particles: 'confetti', colors: ['#ff4fd8', '#ffd040'], sweep: '#ffe6ff', angle: 0.3 },
  // the chant and the scream end: embers off the rocket and the pillar, sparks
  rk8: { move: 'truck', dir: 1, particles: 'embers', colors: ['#ff7a1a', '#ffd040'], sweep: '#ffe0b0', angle: 0.2 },
  rk9: { move: 'truck', dir: 1, particles: 'sparks', colors: ['#ff5a2a', '#ffd040'], sweep: '#ffd0c0', angle: -0.2 },
  pillar: { move: 'rise', dir: 1, particles: 'embers', colors: ['#ff6a1a', '#7ab8ff'], sweep: '#e0f0ff', angle: 1.4 },
  'rk8-scream': { move: 'truck', dir: -1, particles: 'sparks', colors: ['#ff7a1a', '#ffe060'], sweep: '#ffe0b0', angle: -0.2 },
  // the outro: the dawn walk under the last confetti, then the last jump in confetti and sparks
  // the 5.35 s dawn walk holds still at mid depth, so the girls and the city slide one way and the near rubble the other
  // (round 11: two bars now, the walk stepping once a beat; a wider sway keeps it off the slide floor)
  dawn: { move: 'arc', dir: 1, particles: 'confetti', colors: ['#ffd890', '#ffb060'], sweep: '#fff0c8', angle: -0.25, pivot: 0.45, sway: 0.1 },
  // the last jump: an arc about the girls (their hair reaches the top edge, so they may not rise or swell)
  // the walk toward us (round 11): a slow push toward the girls, the last confetti in the drift and dust in the light
  // (the swell is about their heads, so the push grows them down past the cut at the frame's bottom, never up out of it)
  'dawn-us': { move: 'push', dir: 1, particles: 'confetti', field: 'dust', colors: ['#ffd890', '#ffb070'], sweep: '#fff0c8', angle: -0.25, focus: [0.5, 0.95] },
  freeze: { move: 'arc', dir: 1, particles: 'confetti', colors: ['#ff4fd8', '#4aa8ff'], sweep: '#ffe6ff', angle: 0.5 },
};

/** How alive a section's paintings are: the camera's travel speed (painting widths per second), the sweep's strength
 *  and period (bars), the bloom's strength, and whether the beat punches the push. */
interface Energy { speed: number; sweep: number; period: number; bloom: number; punch: boolean; /** share of the drift particles */ drift: number }
const CALM: Energy = { speed: 0.03, sweep: 0.12, period: 2, bloom: 0.35, punch: false, drift: 0.55 };
const VERSE: Energy = { speed: 0.09, sweep: 0.2, period: 1, bloom: 0.5, punch: false, drift: 1 };
const PEAK: Energy = { speed: 0.12, sweep: 0.32, period: 1, bloom: 0.7, punch: true, drift: 1 };
const ENERGY: Record<string, Energy> = {
  piano_interlude: CALM, robot_build_failed: { ...CALM, speed: 0.06, sweep: 0.2 }, verse3_rebase: VERSE, verse4_trade: VERSE,
  outro: { ...VERSE, sweep: 0.36, bloom: 0.6, drift: 1 }, final_chorus: PEAK, scream: PEAK, guitar_solo: PEAK, post_chorus_chant: PEAK, scream_end: PEAK,
};

const room = (size: number) => Math.max(0, (size - 1) / 2);
const clampTo = (o: number, r: number) => Math.max(-r, Math.min(r, o));
/** A decay after the last grid point (beats or bars), 1 on it. */
const after = (pos: number, k: number) => Math.exp(-(pos - Math.floor(pos)) * k);

/** The view of painting shot `shot` (a LIFE key) at t, the shot running t0..t1, for painting `id`. */
export const paintShotView = (shot: string, id: string, t: number, t0: number, t1: number): PaintView => {
  const life = LIFE[shot];
  if (!life) throw new Error(`paintview: no LIFE entry for painting shot ${shot}`);
  const dur = Math.max(0.2, t1 - t0);
  const u = clamp01((t - t0) / dur);
  // a continuous move, eased only at the ends so it never stops inside the shot
  const e = 0.15 * inOutQuad(u) + 0.85 * u;
  const en = ENERGY[sectionAt(t)] ?? VERSE;
  // the push-in: 100 % -> 103 % of covering; on the peaks a beat punch spends a fifth of that room
  const punch = en.punch ? after(beatPos(t), 7) : 0;
  const h = COVER * (1 + KB * Math.min(1, 0.8 * e + 0.2 * punch));
  // the camera's travel across the shot: the speed times the shot's length, at least 2 % and at most 14 % of the
  // painting; plus a sway over two bars, wider the longer the hold, so it keeps moving after its travel is spent
  const travel = Math.min(0.14, Math.max(0.02, en.speed * dur));
  const sway = life.sway ?? 0.012 + 0.02 * Math.max(0, dur - 2);
  const m = life.dir * (travel * (e - 0.5) * 2 + sway * Math.sin(Math.PI * barPos(t)));
  const layered = LAYERED[id];
  // an arc pivots on the girls (they hold, the depth slides past them); a truck and a rise pivot near the back
  const pivot = life.pivot ?? (life.move === 'arc' ? (layered?.depth ?? 0.55) : life.move === 'push' ? 0.25 : 0.1);
  const shift: [number, number] = life.move === 'rise' ? [0.15 * m, -m] : life.move === 'push' ? [0.25 * m, 0] : [m, 0.1 * m];
  const zoom = (life.move === 'push' ? 0.25 : 0.05) * e + 0.012 * punch;
  // the whole plate drifts a little with the move and takes the shake (metal), inside the push's room
  const [sx, sy] = shakeAt(t);
  const rx = room(h * PAINT_W);
  const ry = room(h);
  const ox = clampTo(-0.25 * shift[0] + sx / 1920, rx);
  const oy = clampTo(0.25 * shift[1] - sy / 1080, ry);
  const sweep: Sweep = { pos: -0.4 + 1.8 * ((barPos(t) / en.period) % 1), angle: life.angle, width: 0.16, amt: en.sweep, color: life.sweep };
  // the bloom: a soft pulse on the beat (every second beat in the piano), stronger on the downbeat
  const beat = en === CALM ? after(beatPos(t) / 2, 4) : after(beatPos(t), 5);
  const bloom = en.bloom * (0.55 * beat + 0.45 * after(barPos(t), 3.5));
  const focus: [number, number] = life.focus ?? [0.5, 0.55];
  const view: PaintView = { h, ox, oy, shift, pivot, zoom, focus, gain: 1, sweep, bloom };
  if (!layered) return view;
  return {
    ...view, layered: true,
        // the bob lifts them on the beat (a lift keeps a drawing cut at the top edge, RK12's c, from opening a gap)
    girls: { drawing: loopIndex(t, layered.walk ? 1 : undefined), depth: layered.depth, bob: layered.bob ? -0.0025 * after(beatPos(t), 6) : 0, glow: life.sweep, glowAmt: 0.35 + 0.25 * beat, shadow: 0.55 },
  };
};

/** The most a pixel is magnified at the 2K output (the plane's scale times the near swell). */
export const paintMag = (v: PaintView): number => WHOLE_SCALE * v.h * (1 + v.zoom * (1 - v.pivot));

/** Painting uv (y up) -> frame position (0..1 both, y up) for a plane at h, ox, oy. */
const toFrame = (v: PaintView, p: readonly [number, number]): [number, number] => [0.5 + v.ox + (p[0] - 0.5) * v.h * PAINT_W, 0.5 + v.oy + (p[1] - 0.5) * v.h];

/** The painting's rectangle and its original 3:2 centre in frame pixels (y down), for framecheck. */
export const paintRects = (v: PaintView, W: number, H: number) => {
  const rect = (u0: number, u1: number) => {
    const a = toFrame(v, [u0, 0]);
    const b = toFrame(v, [u1, 1]);
    return { x0: a[0] * W, x1: b[0] * W, y0: (1 - b[1]) * H, y1: (1 - a[1]) * H };
  };
  return { plate: rect(0, 1), centre: rect(CENTRE_U[0], CENTRE_U[1]) };
};

/** Where the girls' plane shows a texture point q (girls uv, y up): the inverse of the girls shader's mapping
 *  (q = focus + (p - focus) / swell + shift * (depth - pivot), then the bob), in frame 0..1 (y up). */
export const girlsAt = (v: PaintView, q: readonly [number, number]): [number, number] => {
  const g = v.girls as GirlsView;
  const k = g.depth - v.pivot;
  const swell = 1 + v.zoom * Math.max(k, 0);
  const p: [number, number] = [v.focus[0] + (q[0] - v.shift[0] * k - v.focus[0]) * swell, v.focus[1] + (q[1] - v.shift[1] * k - v.focus[1]) * swell];
  const f = toFrame(v, p);
  return [f[0], f[1] - g.bob];
};
/** The girls' plane's magnification at 2K (its scale times its swell). */
export const girlsMag = (v: PaintView): number => WHOLE_SCALE * v.h * (1 + v.zoom * Math.max((v.girls?.depth ?? 0) - v.pivot, 0));

/** The particles' surge on the hits (seconds of extra travel): every downbeat they rush forward and settle, more in
 *  the loud sections. Monotonic within a bar; between bars it steps by under 5 % of a surge. */
export const driftAdvance = (t: number): number => {
  const en = ENERGY[sectionAt(t)] ?? VERSE;
  const a = en === CALM ? 0.25 : en === PEAK ? 0.9 : 0.55;
  const bp = barPos(t);
  return a * (Math.floor(bp) + 1 - Math.exp(-(bp - Math.floor(bp)) * 6));
};
/** The shared particle field (particles/field.tsx) in the painting's kind: embers in metal, dust motes and sparks
 *  for dust and sparks, confetti otherwise. */
export const fieldKind = (p: Particles): { metal: number; dust: boolean } =>
  p === 'embers' ? { metal: 1, dust: false } : p === 'dust' || p === 'sparks' ? { metal: 0, dust: true } : { metal: 0, dust: false };
/** The share of the drift particles a section shows (calm sections are sparse). */
export const driftDensity = (t: number): number => (ENERGY[sectionAt(t)] ?? VERSE).drift;
