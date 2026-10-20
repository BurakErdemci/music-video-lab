// Vorathul in part 5: the rig models used on the office stage and the state tracks every p5 shot shares
// (pipes returning, crown, helm split, runes), so continuity holds across cuts. Pure data, no JSX.
import { VORATHUL_RIG } from '../../../rig/model.ts';
import type { Key, LifeConfig, RampKey, Timeline } from '../../../rig/timeline.ts';
import type { PipeEvent } from '../../../rig/pipes.ts';
import type { PoseDef, RigModel, Side } from '../../../rig/types.ts';
import { beatFrame } from '../../../timing.ts';
import { E } from './geom.ts';

export const INK = '#0A0A0A';
export const VIOLET = '#9B5CE0';
export const IVORY = '#F4ECD8';
export const GOLD = '#E2B33C';
export const SKY = '#8EC5E8';
export const MAGENTA = '#E0129A';

/** Out of the painting he is 8.5 office units tall (storyboard 2 section 0.2): 1 H = 8.5 world units. */
export const UNIT = 8.5;
export const OFFICE_FLOOR = -6.2;

// 'beauty' draws the drawn part cards. 'silhouette' is the placeholder-era look through the rig's id pass: ink
// everywhere, violet only where KARAKTER.md allows it (slit, gems, studs, eyes, pipe mouths and glow, runes).
// Echo copies always use the id pass (one flat colour each).
export const LOOK: 'silhouette' | 'beauty' = 'beauty';

const VIOLET_PARTS = /^(eye_slit|crown_gems|chest_studs|eye_\d|sword_runes|pipe_[RL]\d_(mouth|glow))$/;
const recolor = (fn: (id: string) => string): RigModel => ({
  ...VORATHUL_RIG,
  json: { ...VORATHUL_RIG.json, idColors: Object.fromEntries(Object.keys(VORATHUL_RIG.json.idColors).map((id) => [id, fn(id)])) },
});

/** The figure itself. */
export const BODY: RigModel = recolor((id) => (VIOLET_PARTS.test(id) ? VIOLET : INK));
/** One flat colour per echo copy (the chromatic EchoTrail of X21, drawn on the stage). */
const tints = new Map<string, RigModel>();
export const tinted = (color: string): RigModel => {
  const hit = tints.get(color);
  if (hit) return hit;
  const m = recolor(() => color);
  tints.set(color, m);
  return m;
};

// ---- shared state tracks (absolute film frames) ----
const sideOf = (n: number): Side => (n % 2 ? 'L' : 'R');
/** Pipe n (1-16) of the restored fan lands on beat 717 + n (Appendix A: pipe 1 f7039 ... pipe 16 f7184). */
export const pipeLandFrame = (n: number): number => beatFrame(717 + n);
// Before p5 the nerf already happened (S54 delete, S65 corks); replaying it far before f6680 settles the state.
const NERF_AT = 6000;
const pipes: PipeEvent[] = [];
for (let i = 0; i < 5; i++) pipes.push({ at: NERF_AT, wing: 'both', pipe: i, op: 'delete' });
for (let i = 5; i < 8; i++) pipes.push({ at: NERF_AT + 10, wing: 'both', pipe: i, op: 'cork' });
for (let n = 1; n <= 16; n++) {
  const pipe = Math.floor((n - 1) / 2);
  const at = pipeLandFrame(n);
  const wing = sideOf(n - 1);
  if (pipe < 5) pipes.push({ at, wing, pipe, op: 'return' });
  else {
    pipes.push({ at, wing, pipe, op: 'uncork' });
    pipes.push({ at: at + 2, wing, pipe, op: 'relight' });
  }
}
/** Pipe shots for the restored blast (A9): every mouth fires once, two at a time, from the strike frame on. */
export const blastFire = (at: number): PipeEvent[] =>
  Array.from({ length: 16 }, (_, n) => ({ at: at + 2 * Math.floor(n / 2), wing: sideOf(n), pipe: Math.floor(n / 2), op: 'fire' as const }));

const r = (at: number, v: number, dur?: number): RampKey => ({ at, v, dur });
const split = E('s99-split');
const unsplit = E('s100-cut');
const fanOpen = E('s98-cut') + 6;
const rage = E('s99-cut');

const RAMPS: Record<string, RampKey[]> = {
  // The six corked pipes stay folded until the first pipe comes back; then the fan opens to take the others.
  wingS_R: [r(NERF_AT, 0, 0), r(fanOpen, 1, 8)],
  wingS_L: [r(NERF_AT, 0, 0), r(fanOpen + 2, 1, 8)],
  // The magenta checker outline of the deleted fan stays behind him until the 16th pipe is home.
  wingsDeleted: [r(NERF_AT, 1, 0), r(E('s102-fan') + 6, 0, 6)],
  helmSplit: [r(split + 4, 1, 4), r(unsplit, 0, 0)],
  runes: [r(NERF_AT, 0, 0), r(rage + 8, 1, 8)],
  studs: [r(NERF_AT, 0.45, 0), r(rage + 8, 1, 8)],
  gems: [r(NERF_AT, 0.45, 0), r(E('s92-crown'), 1, 4)],
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [`eye${i}`, [r(split + 3 + i, 1, 2), r(unsplit, 0, 0)]])),
};

const TRACKS = {
  ramps: RAMPS,
  crown: [{ at: NERF_AT, value: 'small' as const }, { at: E('s92-crown'), value: 'full' as const }],
  slit: [{ at: NERF_AT, value: 'lit' as const }],
  helm: [{ at: split, value: 'split' as const }, { at: unsplit, value: 'closed' as const }],
  pipes,
};

/** A shot's timeline: its own pose keys over the shared state tracks. Extra pipe events (fire) are merged in. */
export const timeline = (keys: Key[], opts: { extraPipes?: PipeEvent[]; life?: LifeConfig } = {}): Timeline => ({
  keys,
  ramps: TRACKS.ramps,
  crown: TRACKS.crown,
  slit: TRACKS.slit,
  helm: TRACKS.helm,
  pipes: opts.extraPipes ? [...TRACKS.pipes, ...opts.extraPipes] : TRACKS.pipes,
  life: opts.life,
});

/** Key helpers: a cut (no transition), a move arriving on `at` over `dur`, a strike with anticipation. */
export const cut = (at: number, pose: string | Partial<PoseDef>): Key => ({ at, pose, dur: 0, cut: true });
export const move = (at: number, pose: string | Partial<PoseDef>, dur: number): Key => ({ at, pose, dur: Math.max(12, dur) });
export const strike = (at: number, pose: string | Partial<PoseDef>, dur: number): Key => ({ at, pose, dur: Math.max(12, dur), ease: 'strike', impact: true, hands: 'instant' });

/** A pose from the library with overrides (keeps the named pose's arms unless replaced). */
export const pose = (name: string, over: Partial<PoseDef> = {}): Partial<PoseDef> => ({ ...(VORATHUL_RIG.json.poses[name] as PoseDef), ...over });

// Missing rig poses (storyboard 2 R1, R2; rig lane still open): built here from the nearest library pose.
/** R1 throne_sit -> sit_alone with arms on the armrests, head up, sword planted in front. */
export const THRONE_SIT: Partial<PoseDef> = pose('sit_alone', {
  head: [6, -0.005], torso: 2, armR: [30, 60, 0, 'grip'], armL: [30, 60, 0, 'fist'], wings: [1, 10], plant: [0.05, 0],
});
/** R1 seated + summon arms (A13): sword straight up over the throne. */
export const THRONE_SUMMON: Partial<PoseDef> = pose('sit_alone', {
  head: [14, -0.01], torso: 8, armR: [155, 15, -40, 'grip'], armL: [70, 20, 0, 'spread'], wings: [1, 15], sword: 'hand_R', swordDir: 185, swordZ: 92,
});
/** R2 laugh -> base with the head thrown back and arms out. */
export const LAUGH: Partial<PoseDef> = pose('base', { head: [18, -0.01], torso: 8, pelvis: [0, 0.01], armR: [60, 20, 0, 'grip'], armL: [60, 20, 0, 'spread'], wings: [1, 15] });
