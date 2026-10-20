// Vorathul's rig timeline for the whole part, one pure function of the absolute film frame (docs/rig.md 7.3).
// He is in his nerfed state: root scale 0.35, small crown, sad slit, runes off, ten pipes gone and six folded and corked.
import { forward } from '../../rig/fk.ts';
import { apply } from '../../rig/math.ts';
import { VORATHUL_RIG } from '../../rig/model.ts';
import { rigAt, type Key, type Timeline } from '../../rig/timeline.ts';
import type { PipeEvent } from '../../rig/pipes.ts';
import type { PoseDef, RigState } from '../../rig/types.ts';
import { CUE } from './cues.ts';
import { SEAT_Y } from './lib.ts';

export const NERF_SCALE = 0.35;
/** H units of forward root travel from the cathedral steps to the canvas plane (12 world units per H). */
export const CANVAS_STEP = 0.5;

const P = VORATHUL_RIG.json.poses as Record<string, PoseDef>;
const pose = (name: string, extra: Partial<PoseDef> = {}): PoseDef => ({ ...(P[name] as PoseDef), rootScale: NERF_SCALE, ...extra });

/** The seat is the dais top step (inside.tsx), in H. */
export const STEP_UP = SEAT_Y / 12;
const SEAT = pose('sit_alone', { wings: [0, -15], root: [0, STEP_UP, 0] });
const STAND = pose('base', { wings: [0, 0] });
/** Standing at the canvas: root moved to the canvas plane, x set so the raised palm lands on PALM_UV. */
const AT = (name: string, extra: Partial<PoseDef> = {}): PoseDef => pose(name, { wings: [0, 0], root: [0.106, 0, CANVAS_STEP], ...extra });

const c = CUE;

const KEYS: Key[] = [
  { at: c.s74cut.frame, pose: SEAT, dur: 0, cut: true },
  { at: c.s74sink.frame, pose: { ...SEAT, head: [-19, 0.03], torso: -7 }, dur: 16 },
  // S77: he stands (a cut, the only way out of the seat), then steps to the canvas
  { at: c.s77med.frame, pose: STAND, dur: 0, cut: true },
  { at: c.s77step.frame, pose: pose('base', { wings: [0, 0], legs: [8, 14], root: [0.05, 0, CANVAS_STEP * 0.5] }), dur: 14 },
  { at: c.s77canvas.frame, pose: AT('base', { legs: [4, 4] }), dur: 33 },
  // S78 awareness step 3: the gauntlet rises, then the palm meets the canvas
  { at: c.s78raise.frame, pose: AT('base', { armR: [70, 35, 10, 'open'], torso: 3, sword: 'ground', plant: [-0.3, 0] }), dur: 14 },
  { at: c.s78palm.frame, pose: AT('hand_on_canvas'), dur: 31 },
  // S81 awareness step 4: he presses; S83 the free fist punches the canvas; S85 fingers spread; S87 he leans in
  { at: c.s81press.frame, pose: AT('hand_on_canvas', { torso: 9, head: [10, -0.005] }), dur: 12 },
  { at: c.s83punch.frame, pose: AT('hand_on_canvas', { torso: 9, head: [10, -0.005], armL: [125, -5, 20, 'fist'] }), dur: 12, ease: 'strike', impact: true },
  { at: c.s85spread.frame, pose: AT('hand_on_canvas', { torso: 7, armR: [125, -5, 40, 'spread'], armL: [10, 30, 0, 'fist'] }), dur: 14 },
  { at: c.s87lean.frame, pose: AT('hand_on_canvas', { torso: 13, head: [14, -0.008], armR: [125, -5, 40, 'spread'], armL: [60, 40, 0, 'fist'] }), dur: 14 },
  // S89 and S90: a new pose on every inside cut, hidden by the world flip
  { at: c.s89a.frame, pose: AT('hand_on_canvas', { torso: 11, head: [6, 0], armL: [125, -5, 20, 'fist'] }), dur: 0, cut: true },
  { at: c.s89c.frame, pose: AT('hand_on_canvas', { torso: 14, head: [16, -0.01], armL: [100, 30, 20, 'fist'] }), dur: 0, cut: true },
  { at: c.s89e.frame, pose: AT('hand_on_canvas', { torso: 8, head: [2, 0.005], armL: [150, 10, 0, 'spread'] }), dur: 0, cut: true },
  { at: c.s89g.frame, pose: AT('hand_on_canvas', { torso: 15, head: [18, -0.01], armL: [125, -5, 20, 'fist'] }), dur: 0, cut: true },
  { at: c.s90a.frame, pose: AT('hand_on_canvas', { torso: 12, head: [8, 0], armL: [155, -5, 30, 'fist'] }), dur: 0, cut: true },
  { at: c.s90c.frame, pose: AT('hand_on_canvas', { torso: 15, head: [20, -0.01], armL: [125, -5, 20, 'spread'] }), dur: 0, cut: true },
  { at: c.s90e.frame, pose: AT('hand_on_canvas', { torso: 10, head: [4, 0], armL: [155, 5, 20, 'fist'] }), dur: 0, cut: true },
];

/** Ten pipes gone, six folded and corked, on both wings: pipes 0-2 stay (short ones next to the body). */
const PIPES: PipeEvent[] = [];
for (let i = 3; i < 8; i++) PIPES.push({ at: 3000, wing: 'both', pipe: i, op: 'delete' });
for (let i = 0; i < 3; i++) PIPES.push({ at: 3100, wing: 'both', pipe: i, op: 'cork' });

export const TL: Timeline = {
  keys: KEYS,
  ramps: {
    wingsDeleted: [{ at: 3000, v: 1 }],
    runes: [{ at: 3000, v: 0 }],
    // The slit dims on "not", relights to half on "feel", and flares to full on hit[77] (S87).
    slitOpacity: [
      { at: c.s74cut.frame - 20, v: 0.8 },
      { at: c.s74slit.frame, v: 0.3, dur: 24 },
      { at: c.s77relight.frame, v: 0.5, dur: 16 },
      { at: c.s87flare.frame, v: 1, dur: 5 },
    ],
    capeSway: [
      { at: c.s74cut.frame - 20, v: 1 },
      { at: c.s74hem.frame, v: 0.25, dur: 20 },
      { at: c.s77med.frame, v: 1, dur: 10 },
    ],
  },
  crown: [{ at: 3000, value: 'small' }],
  slit: [{ at: 3000, value: 'sad' }, { at: c.s87flare.frame, value: 'lit' }],
  pipes: PIPES,
  life: { scale: 1 },
};

export const vorathulAt = (frame: number): RigState => rigAt(VORATHUL_RIG, TL, frame);

/** World position of a rig joint (units, at the hero's depth) for overlays that must sit on him; `origin` as in <Hero>. */
export const jointWorld = (frame: number, id: string, unit = 12, origin: [number, number, number] = [0, 0, -15]): [number, number, number] => {
  const st = vorathulAt(frame);
  const w = forward(VORATHUL_RIG, st).get(id);
  const p = (w ? apply(w, 0, 0) : [0, 0]) as [number, number];
  const sc = st.ch.rootScale;
  return [origin[0] + (sc * p[0] + st.ch.rootX) * unit, origin[1] + (sc * p[1] + st.ch.rootY) * unit, origin[2] + st.ch.rootZ * unit];
};
