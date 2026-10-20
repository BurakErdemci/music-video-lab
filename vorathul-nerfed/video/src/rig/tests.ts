// The docs/rig.md section 6 test timelines, as pure data. The preview compositions render them and tools/rigcheck.mjs
// measures them, so both read the same frames.
import { beatFrame } from '../timing.ts';
import { forward } from './fk.ts';
import { apply } from './math.ts';
import { RIG } from './model.ts';
import { pipeGeom } from './pipes.ts';
import { isBigChange, rigAt, type Key, type RampKey, type Timeline } from './timeline.ts';
import type { PoseDef, RigModel, RigState, Side } from './types.ts';

export interface RigTest {
  id: string;
  label: string;
  tl: Timeline;
  /** Composition frame n shows timeline frame offset + n. */
  offset: number;
  frames: number;
  /** Camera yaw in degrees as a function of the composition frame. */
  yaw?: (n: number) => number;
  /** Frames (composition) that the checks treat as declared impact steps. */
  impacts: number[];
}

interface Step { pose: string | Partial<PoseDef>; cut?: boolean; ease?: Key['ease']; impact?: boolean; hands?: Key['hands']; hold?: number }

/** Builds arrival-anchored keys: every pose holds `hold` frames (default 30) before the next transition starts. */
export const chain = (steps: Step[], start = 30, m: RigModel = RIG): Key[] => {
  const keys: Key[] = [];
  let at = start;
  let prev: PoseDef | null = null;
  for (const s of steps) {
    const def: PoseDef = typeof s.pose === 'string' ? (m.json.poses[s.pose] as PoseDef) : ({ ...(prev ?? m.json.poses.base), ...s.pose } as PoseDef);
    const dur = s.cut || !prev ? 0 : isBigChange(prev, def) ? 24 : 12;
    if (prev) at += (s.hold ?? 30) + dur;
    const k: Key = { at, pose: s.pose, dur, ease: s.ease };
    if (s.cut) k.cut = true;
    if (s.impact) k.impact = true;
    if (s.hands) k.hands = s.hands;
    keys.push(k);
    prev = def;
  }
  return keys;
};

const ramp = (...ks: [number, number, number?][]): RampKey[] => ks.map(([at, v, dur]) => ({ at, v, dur }));
const impactsOf = (keys: Key[], offset = 0): number[] => keys.filter((k) => k.impact || k.cut).map((k) => k.at - offset);

// ---- 1. pose turntable ----
const turnKeys = chain([
  { pose: 'base' }, { pose: 'raise_sword', hold: 90 }, { pose: 'strike_down', ease: 'strike', impact: true }, { pose: 'base' }, { pose: 'conduct_wide' },
  { pose: 'slump', cut: true }, { pose: 'clutch_throat' }, { pose: 'hand_on_canvas' }, { pose: 'burst', cut: true }, { pose: 'base' },
  { pose: 'sit_alone', cut: true }, { pose: 'base', cut: true },
]);
const turnFrames = (turnKeys[turnKeys.length - 1] as Key).at + 30;
const turntable: RigTest = {
  id: 'RigTurntable', label: 'Pose turntable', tl: { keys: turnKeys }, offset: 0, frames: turnFrames, impacts: impactsOf(turnKeys),
};
const turntableYaw: RigTest = { ...turntable, id: 'RigTurntableYaw', label: 'Pose turntable, camera yaw -12..+12', yaw: (n) => -12 + (24 * n) / turnFrames };

// ---- 2. fan spread / fold and wing rotation ----
const fanKeys = chain([{ pose: 'base' }, { pose: { wings: [null, -25] } }, { pose: { wings: [null, 15] }, hold: 30 }, { pose: { wings: [null, 0] } }], 130);
const fan: RigTest = {
  id: 'RigFan', label: 'Fan spread and fold, wing rotation',
  tl: {
    keys: fanKeys,
    ramps: {
      wingS_R: ramp([0, 0, 0], [30, 1, 30], [60, 0, 30], [120, 1, 30]),
      wingS_L: ramp([0, 0, 0], [60, 0, 0], [90, 1, 30], [120, 0, 30], [130, 1, 10]),
    },
  },
  offset: 0, frames: (fanKeys[fanKeys.length - 1] as Key).at + 20, impacts: [],
};
const fanYaw: RigTest = { ...fan, id: 'RigFanYaw', label: 'Fan with camera yaw', yaw: (n) => -12 + (24 * n) / fan.frames };

// ---- 3. pipe delete / fold / wing_missing / cork / return and relight, one per beat ----
const B0 = 60;
const T0 = beatFrame(B0) - 45;
const sideOf = (n: number): Side => (n % 2 ? 'L' : 'R');
const pipeEvents = (() => {
  const ev: Timeline['pipes'] = [];
  for (let n = 0; n < 10; n++) ev.push({ at: beatFrame(B0 + n), wing: sideOf(n), pipe: Math.floor(n / 2), op: 'delete' });
  for (let n = 0; n < 6; n++) ev.push({ at: beatFrame(B0 + 16 + n), wing: sideOf(n), pipe: 5 + Math.floor(n / 2), op: 'cork' });
  for (let n = 0; n < 16; n++) {
    const pipe = Math.floor(n / 2);
    ev.push({ at: beatFrame(B0 + 26 + n), wing: sideOf(n), pipe, op: pipe < 5 ? 'return' : 'relight' });
  }
  return ev;
})();
const pipesEnd = beatFrame(B0 + 26 + 15) + 40;
const pipes: RigTest = {
  id: 'RigPipes', label: 'Pipes: delete, fold, wing_missing, cork, return and relight',
  tl: {
    keys: [{ at: 0, pose: 'base', dur: 0 }],
    ramps: {
      wingS_R: ramp([beatFrame(B0 + 12), 0, 12], [beatFrame(B0 + 24), 1, 12]),
      wingS_L: ramp([beatFrame(B0 + 12), 0, 12], [beatFrame(B0 + 24), 1, 12]),
      wingsDeleted: ramp([beatFrame(B0 + 14), 1, 6], [beatFrame(B0 + 24), 0, 6]),
    },
    pipes: pipeEvents,
    life: { scale: 0 }, // exact frame-to-frame equality (check K) needs the life layer off
  },
  offset: T0, frames: pipesEnd - T0, impacts: [],
};

// ---- 4. helm split, crown and slit swaps ----
const helm: RigTest = {
  id: 'RigHelm', label: 'Helm split, eyes, crown and slit',
  tl: {
    keys: [{ at: 0, pose: 'base', dur: 0 }],
    life: { scale: 0 }, // check M compares exact masks across the swap frame
    helm: [{ at: 60, value: 'split' }, { at: 260, value: 'closed' }],
    crown: [{ at: 290, value: 'small' }, { at: 330, value: 'full' }],
    slit: [{ at: 360, value: 'sad' }, { at: 400, value: 'lit' }],
    ramps: {
      helmSplit: ramp([78, 1, 18], [260, 0, 18]),
      ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [`eye${i}`, ramp([84 + 6 * i, 1, 6], [200 + 2 * i, 0, 6])])),
    },
  },
  offset: 0, frames: 430, impacts: [],
};

// ---- 5. runes and glow overlays 1 -> 0 -> 1 ----
const glowNames = ['runes', 'studs', 'gems', 'slitOpacity'];
const glow: RigTest = {
  id: 'RigGlow', label: 'Every overlay 1 -> 0 -> 1',
  tl: { keys: [{ at: 0, pose: 'base', dur: 0 }], life: { scale: 0 }, ramps: Object.fromEntries(glowNames.map((n, i) => [n, ramp([20 + 60 * i, 0, 20], [50 + 60 * i, 1, 20])])) },
  offset: 0, frames: 20 + 60 * glowNames.length + 20, impacts: [],
};

// ---- 6. attacks ----
const ATTACK_X = [0, -0.2, 0.2, 0, -0.15, 0.15, 0];
const attackSteps: Step[] = [{ pose: 'base' }];
const attackMeta: { id: string; strikeIndex: number }[] = [];
RIG.json.attacks.forEach((a, n) => {
  const x = ATTACK_X[n] as number;
  const staged = (name: string): Partial<PoseDef> => {
    const p = RIG.json.poses[name] as PoseDef;
    return { ...p, root: [x, p.root?.[1] ?? 0, p.root?.[2] ?? 0] };
  };
  attackSteps.push({ pose: staged(a.poses[0]) });
  attackMeta.push({ id: a.id, strikeIndex: attackSteps.length });
  attackSteps.push({ pose: staged(a.poses[1]), ease: 'strike', impact: true });
  attackSteps.push({ pose: staged(a.poses[2]) });
  attackSteps.push({ pose: 'base' });
});
const attackKeys = chain(attackSteps);
const strikeAt = (id: string): number => (attackKeys[(attackMeta.find((a) => a.id === id) as { strikeIndex: number }).strikeIndex] as Key).at;
const lungeStrike = strikeAt('claw_lunge');
const blastStrike = strikeAt('pipe_fan_blast');
const lungeIdx = (attackMeta.find((a) => a.id === 'claw_lunge') as { strikeIndex: number }).strikeIndex;
const lungeEnd = (attackKeys[lungeIdx + 2] as Key).at;
const attackTl: Timeline = {
  keys: attackKeys,
  helm: [{ at: lungeStrike - 12, value: 'split' }, { at: lungeEnd + 12, value: 'closed' }],
  ramps: {
    helmSplit: ramp([lungeStrike, 1, 12], [lungeEnd + 12, 0, 12]),
    ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [`eye${i}`, ramp([lungeStrike + 2 * i, 1, 4], [lungeEnd + 12, 0, 4])])),
  },
  pipes: Array.from({ length: 16 }, (_, n) => ({ at: blastStrike + 3 * n, wing: sideOf(n), pipe: Math.floor(n / 2), op: 'fire' as const })),
};
const attacks: RigTest = {
  id: 'AttackGallery', label: 'All seven attacks, antic -> strike -> follow-through', tl: attackTl, offset: 0,
  frames: (attackKeys[attackKeys.length - 1] as Key).at + 40, impacts: impactsOf(attackKeys),
};

export const RIG_TESTS: RigTest[] = [turntable, turntableYaw, fan, fanYaw, pipes, helm, glow, attacks];
export const TEST_BY_ID = new Map(RIG_TESTS.map((t) => [t.id, t]));
export const ATTACK_STRIKES = attackMeta.map((a) => ({ id: a.id, at: strikeAt(a.id) }));

// ---- 7. joint sweep ----
export interface SweepEntry {
  joint: string;
  /** Parent card id that must stay joined to the child (null: no parent card, nothing to measure). */
  parent: string | null;
  child: string;
  kind: 'ua' | 'f' | 'h' | 'leg' | 'torso' | 'head' | 'crown' | 'wing' | 'pipe' | 'hem' | 'cape' | 'half' | 'pelvis' | 'sword';
  side: Side | null;
  index: number;
  value: number;
  /** Card ids drawn in the isolated render. */
  isolate: string[];
  /** Joint radius, preview px. */
  radiusPx: number;
}

const radiusPx = (m: RigModel, id: string): number => ((m.byId.get(id)?.def.jointRadius ?? 0) * 900) / m.json.unitPx;
const range = (lo: number, hi: number, step: number): number[] => {
  const out: number[] = [];
  for (let v = lo; v < hi; v += step) out.push(v);
  out.push(hi);
  return out;
};

export const sweepList = (m: RigModel = RIG, quick = false): SweepEntry[] => {
  const out: SweepEntry[] = [];
  const add = (e: Omit<SweepEntry, 'isolate' | 'radiusPx'> & { iso?: string[]; rPx?: number }) => {
    const { iso, rPx, ...rest } = e;
    out.push({ ...rest, isolate: iso ?? [e.parent, e.child].filter((x): x is string => !!x), radiusPx: rPx ?? radiusPx(m, e.child) });
  };
  const sides: Side[] = ['R', 'L'];
  for (const v of range(-10, 10, 5)) add({ joint: 'pelvis', parent: null, child: 'pelvis', kind: 'pelvis', side: null, index: 0, value: v });
  for (const v of range(-15, 15, 5)) add({ joint: 'torso', parent: 'pelvis', child: 'torso', kind: 'torso', side: null, index: 0, value: v });
  for (const v of range(-20, 20, 5)) add({ joint: 'head', parent: 'torso', child: 'head', kind: 'head', side: null, index: 0, value: v });
  for (const v of range(-8, 8, 4)) add({ joint: 'crown', parent: 'head', child: 'crown', kind: 'crown', side: null, index: 0, value: v });
  // The halves leave the closed helm by design; what must stay joined is halves + void head (no hole in the head region, check M).
  for (const s of sides) for (let i = 0; i <= 20; i++) add({ joint: `helm_half_${s}`, parent: 'void_head', child: `helm_half_${s}`, kind: 'half', side: s, index: 0, value: i / 20, iso: ['void_head', 'helm_half_R', 'helm_half_L'] });
  for (const s of sides) {
    for (const v of range(-40, 160, 5)) add({ joint: `upper_arm_${s}`, parent: 'torso', child: `upper_arm_${s}`, kind: 'ua', side: s, index: 0, value: v });
    for (const v of range(-10, 150, 5)) add({ joint: `forearm_${s}`, parent: `upper_arm_${s}`, child: `forearm_${s}`, kind: 'f', side: s, index: 0, value: v });
    for (const v of range(-45, 45, 5)) add({ joint: `hand_${s}`, parent: `forearm_${s}`, child: `hand_${s}`, kind: 'h', side: s, index: 0, value: v });
    for (const v of range(-8, 25, 5)) add({ joint: `leg_${s}`, parent: 'pelvis', child: `leg_${s}`, kind: 'leg', side: s, index: 0, value: v });
  }
  for (const v of range(-8, 8, 4)) add({ joint: 'cape_lower', parent: 'cape_upper', child: 'cape_lower', kind: 'cape', side: null, index: 0, value: v });
  for (let k = 0; k < 6; k++) for (const v of range(-7, 7, 3.5)) add({ joint: `hem_${k + 1}`, parent: 'cape_lower', child: `hem_${k + 1}`, kind: 'hem', side: null, index: k, value: v });
  for (const s of sides) for (const v of range(-25, 15, 5)) add({ joint: `wing_root_${s}`, parent: 'torso', child: `wing_root_${s}`, kind: 'wing', side: s, index: 0, value: v });
  for (const s of sides) {
    for (const it of m.json.pipes.items) {
      if (quick && it.i % 2) continue;
      for (const v of range(-45, 95, 5)) {
        add({ joint: `pipe_${s}${it.i}`, parent: `wing_root_${s}`, child: `pipe_${s}${it.i}_body`, kind: 'pipe', side: s, index: it.i, value: v, iso: [`wing_root_${s}`, `pipe_${s}${it.i}_body`], rPx: (m.json.pipes.widthH / 2) * 900 });
      }
    }
  }
  for (const v of range(-25, 25, 5)) add({ joint: 'sword', parent: null, child: 'sword', kind: 'sword', side: null, index: 0, value: v });
  return out;
};

const BASE_TL: Timeline = { keys: [{ at: 0, pose: 'base', dur: 0 }] };
/** Base pose with exactly one joint driven to the sweep value. */
export const sweepState = (m: RigModel, e: SweepEntry): RigState => {
  const st = rigAt(m, BASE_TL, 0);
  const ch = { ...st.ch };
  const side = e.side;
  switch (e.kind) {
    case 'pelvis': ch.pelvisRot = e.value; break;
    case 'torso': ch.torso = e.value; break;
    case 'head': ch.headRot = e.value; break;
    case 'crown': ch.crownRot = e.value; break;
    case 'ua': if (side === 'R') ch.uaR = e.value; else ch.uaL = e.value; break;
    case 'f': if (side === 'R') ch.fR = e.value; else ch.fL = e.value; break;
    case 'h': if (side === 'R') ch.hR = e.value; else ch.hL = e.value; break;
    case 'leg': if (side === 'R') ch.legR = e.value; else ch.legL = e.value; break;
    case 'wing': ch.wingRot = e.value; break;
    default: break;
  }
  const next: RigState = { ...st, ch, hems: [...st.hems], wings: { R: { ...st.wings.R, pipes: [...st.wings.R.pipes] }, L: { ...st.wings.L, pipes: [...st.wings.L.pipes] } } };
  if (e.kind === 'cape') next.capeLower = e.value;
  if (e.kind === 'hem') next.hems[e.index] = e.value;
  if (e.kind === 'half') next.helm = { split: true, t: e.value };
  if (e.kind === 'pipe') {
    const w = next.wings[side as Side];
    w.pipes[e.index] = { ...(w.pipes[e.index] as RigState['wings']['R']['pipes'][number]), theta: e.value };
  }
  if (e.kind === 'sword') next.sword = { ...next.sword, attach: 'ground', ground: { x: -0.3, y: m.json.bladeBelow, phi: e.value } };
  return next;
};

/** Joint centre of the swept child in root-local H (the pipe root for pipes). */
export const jointPointH = (m: RigModel, e: SweepEntry, st: RigState): [number, number] => {
  const fk = forward(m, st);
  if (e.kind === 'pipe') {
    const wing = fk.get(`wing_root_${e.side}`)!;
    const it = m.json.pipes.items[e.index]!;
    const ps = st.wings[e.side as Side].pipes[e.index]!;
    const g = pipeGeom(m.json.pipes, it, ps.theta, ps.lengthScale, 0);
    return apply(wing, g.root[0], g.root[1]);
  }
  return apply(fk.get(e.child)!, 0, 0);
};
