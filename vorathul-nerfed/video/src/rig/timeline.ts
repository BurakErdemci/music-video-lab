// The rig timeline: a pure function of the frame (docs/rig.md sections 3, 5 and 7.3). No clocks, no randomness, no state
// kept between frames; every spring and sway is a closed form of (frame - arrival).
import { CORK_FRAMES, HAND_FADE_FRAMES, RAMP_FRAMES, RIG_STEP_FRAMES, RETURN_FRAMES } from './constants.ts';
import { forward } from './fk.ts';
import { apply, angleOf, clamp, deg, hash01, inOutCubic, lerp, smooth } from './math.ts';
import { pipeGeom, pipeStateAt, pipeTheta, quantFrame, type PipeEvent } from './pipes.ts';
import type { Channels, GroundSword, HandCard, HandName, PoseDef, PoseName, RigModel, RigState, Side, WingState } from './types.ts';

export type Ease = 'inOutCubic' | 'strike';
export interface Key {
  /** Frame the pose is reached (arrival-anchored); comes from hit()/word()/beatFrame() in production timelines. */
  at: number;
  pose: PoseName | Partial<PoseDef>;
  /** Transition length in frames, running over [at - dur, at]. Ignored when `cut`. */
  dur: number;
  ease?: Ease;
  /** No interpolation: the pose changes on frame `at`. Required for any edge to or from sit_alone and some sword re-attaches. */
  cut?: boolean;
  /** Hand variant swap: 6-frame crossfade (default) or instant on this declared frame. */
  hands?: 'crossfade' | 'instant';
  /** A declared impact step: the continuity and jump checks skip it. */
  impact?: boolean;
}
export interface RampKey { at: number; v: number; dur?: number }
export interface Step<T> { at: number; value: T }
export interface Timeline {
  keys: Key[];
  /** Named 0..1 channels: wingS_R, wingS_L, wingsDeleted (both) / wingsDeleted_R / _L, helmSplit, runes, studs, gems,
   *  slitOpacity, capeSway, eye1..eye7. A ramp key reaches `v` on `at`, easing from the previous value over `dur`. */
  ramps?: Record<string, RampKey[]>;
  crown?: Step<'full' | 'small'>[];
  slit?: Step<'lit' | 'sad'>[];
  helm?: Step<'closed' | 'split'>[];
  pipes?: PipeEvent[];
  /** The continuous life layer (30 fps, on top of the 15 fps pose cadence). scale 0 disables it; flags switch single parts off. */
  life?: LifeConfig;
}
export interface LifeConfig { scale?: number; breath?: boolean; head?: boolean; cape?: boolean; glow?: boolean }

const ANTICIPATION_FRAMES = 6;
const ANTICIPATION = 0.08;
const DEFAULT_PLANT: [number, number] = [-0.3, 0];
export const LIMITS = {
  ua: [-40, 160], f: [-10, 150], h: [-45, 45], leg: [-8, 25], torso: [-15, 15], pelvisRot: [-10, 10], pelvisTy: [-0.3, 0.06],
  headRot: [-20, 20], headSink: [-0.01, 0.03], wingRot: [-25, 15], rootRot: [-10, 10],
} as const;

/** Standing keeps pelvis ty to -0.04 H (section 1.3); the seated pose is reached only by a cut. */
export const STANDING_TY_MIN = -0.04;

export const poseChannels = (d: PoseDef, prevWingS: number): Channels => ({
  rootX: d.root?.[0] ?? 0, rootY: d.root?.[1] ?? 0, rootZ: d.root?.[2] ?? 0, rootScale: d.rootScale ?? 1, rootRot: d.lean ?? 0, crownRot: 0,
  pelvisRot: d.pelvis[0], pelvisTy: d.pelvis[1], torso: d.torso, headRot: d.head[0], headSink: d.head[1],
  uaR: d.armR[0], fR: d.armR[1], hR: d.armR[2], uaL: d.armL[0], fL: d.armL[1], hL: d.armL[2],
  legR: d.legs[0], legL: d.legs[1], wingRot: d.wings[1], wingS: d.wings[0] ?? prevWingS, flare: d.flare ?? 0,
});

export const clampChannels = (c: Channels): Channels => ({
  ...c,
  uaR: clamp(c.uaR, ...LIMITS.ua), uaL: clamp(c.uaL, ...LIMITS.ua), fR: clamp(c.fR, ...LIMITS.f), fL: clamp(c.fL, ...LIMITS.f),
  hR: clamp(c.hR, ...LIMITS.h), hL: clamp(c.hL, ...LIMITS.h), legR: clamp(c.legR, ...LIMITS.leg), legL: clamp(c.legL, ...LIMITS.leg),
  torso: clamp(c.torso, ...LIMITS.torso), pelvisRot: clamp(c.pelvisRot, ...LIMITS.pelvisRot), pelvisTy: clamp(c.pelvisTy, ...LIMITS.pelvisTy),
  headRot: clamp(c.headRot, ...LIMITS.headRot), headSink: clamp(c.headSink, ...LIMITS.headSink), wingRot: clamp(c.wingRot, ...LIMITS.wingRot),
  rootRot: clamp(c.rootRot, ...LIMITS.rootRot), crownRot: clamp(c.crownRot, -8, 8),
});

const mixChannels = (a: Channels, b: Channels, p: number): Channels => {
  const out = { ...a } as Record<string, number | null>;
  for (const k of Object.keys(a) as (keyof Channels)[]) out[k] = lerp(a[k] as number, b[k] as number, p);
  return out as unknown as Channels;
};

// ---- preparation (resolved poses, sword ground transforms, cape arrivals); cached per timeline ----
interface Prep {
  keys: Key[];
  defs: PoseDef[];
  chs: Channels[];
  ground: GroundSword[];
  starts: number[];
  arrivals: { at: number; amp: number }[];
}
const cache = new WeakMap<Timeline, Prep>();

const plantToGround = (m: RigModel, plant: [number, number]): GroundSword => {
  const b = m.json.bladeBelow;
  const phi = rad2(plant[1]);
  return { x: plant[0] + b * Math.sin(phi), y: b * Math.cos(phi), phi: plant[1] };
};
const rad2 = (d: number): number => (d * Math.PI) / 180;

/** The hand-held sword's root-space grip position and direction in a static pose. */
export const swordInHand = (m: RigModel, def: PoseDef): GroundSword => {
  const st = staticState(m, { ...def, sword: 'hand_R' });
  const w = forward(m, st).get('sword')!;
  const [x, y] = apply(w, 0, 0);
  return { x, y, phi: -deg(angleOf(w)) };
};

const staticState = (m: RigModel, def: PoseDef): RigState => {
  const ch = clampChannels(poseChannels(def, 1));
  return {
    frame: 0, ch,
    handR: [{ variant: def.armR[3], opacity: 1, front: false }], handL: [{ variant: def.armL[3], opacity: 1, front: false }],
    sword: { attach: 'hand_R', z: def.swordZ ?? 64, ground: { x: 0, y: 0, phi: 0 } },
    seated: !!def.seated, helm: { split: false, t: 0 }, crown: 'full', slit: { variant: 'lit', opacity: 1 },
    studs: 1, gems: 1, runes: 1, eyes: [0, 0, 0, 0, 0, 0, 0], capeLower: 0, hems: [0, 0, 0, 0, 0, 0],
    wings: { R: emptyWing(m), L: emptyWing(m) },
  };
};
const emptyWing = (m: RigModel): WingState => ({ s: 1, deleted: 0, pipes: m.json.pipes.items.map((it) => ({ body: true, mouth: true, checker: false, glow: 1, theta: it.open, lengthScale: it.lengthScale, fly: 0, cork: { show: false, travel: 0, scale: 1 } })) });

export const prepare = (m: RigModel, tl: Timeline): Prep => {
  const hit = cache.get(tl);
  if (hit) return hit;
  const keys = [...tl.keys].sort((a, b) => a.at - b.at);
  const defs: PoseDef[] = [];
  const chs: Channels[] = [];
  const ground: GroundSword[] = [];
  keys.forEach((k, j) => {
    const base = j > 0 ? (defs[j - 1] as PoseDef) : (m.json.poses.base as PoseDef);
    const def: PoseDef = typeof k.pose === 'string' ? ({ ...(m.json.poses[k.pose] as PoseDef) }) : ({ ...base, plant: undefined, ...k.pose } as PoseDef);
    if (typeof k.pose === 'string' && !m.json.poses[k.pose]) throw new Error(`unknown pose ${k.pose}`);
    defs.push(def);
    chs.push(poseChannels(def, j > 0 ? (chs[j - 1] as Channels).wingS! : 1));
    let g: GroundSword;
    if (def.sword === 'ground') {
      const prev = j > 0 ? (defs[j - 1] as PoseDef) : null;
      if (def.plant) g = plantToGround(m, def.plant);
      else if (prev && prev.sword === 'hand_R') g = swordInHand(m, prev);
      else if (j > 0) g = ground[j - 1] as GroundSword;
      else g = plantToGround(m, DEFAULT_PLANT);
    } else g = ground[j - 1] ?? plantToGround(m, DEFAULT_PLANT);
    ground.push(g);
  });
  const starts = keys.map((k) => (k.cut ? k.at : k.at - k.dur));
  const arrivals = keys.slice(1).map((k, i) => {
    const a = chs[i] as Channels;
    const b = chs[i + 1] as Channels;
    const amp = 0.35 * (b.torso + b.pelvisRot - a.torso - a.pelvisRot) + 30 * (b.pelvisTy - a.pelvisTy) + 8 * (b.rootX - a.rootX + b.rootZ - a.rootZ);
    return { at: k.at, amp };
  });
  const p = { keys, defs, chs, ground, starts, arrivals };
  cache.set(tl, p);
  return p;
};

// ---- tracks ----
export const rampAt = (keys: readonly RampKey[] | undefined, init: number, frame: number, tq: number): number => {
  if (!keys || keys.length === 0) return init;
  let idx = -1;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] as RampKey;
    if ((k.dur ?? RAMP_FRAMES) === 0 ? frame >= k.at : tq >= k.at - (k.dur ?? RAMP_FRAMES) || frame >= k.at) idx = i;
  }
  if (idx < 0) return init;
  const k = keys[idx] as RampKey;
  const prev = idx > 0 ? (keys[idx - 1] as RampKey).v : init;
  const dur = k.dur ?? RAMP_FRAMES;
  if (dur === 0 || frame >= k.at) return k.v;
  return lerp(prev, k.v, smooth(clamp((tq - (k.at - dur)) / dur, 0, 1)));
};
export const stepAt = <T>(steps: readonly Step<T>[] | undefined, init: T, frame: number): T => {
  let v = init;
  let best = -Infinity;
  for (const s of steps ?? []) if (s.at <= frame && s.at >= best) { v = s.value; best = s.at; }
  return v;
};

// ---- the state ----
/** Seeded 1D value noise in [0, 1], smooth in x. */
const valueNoise = (x: number, seed: number): number => {
  const i = Math.floor(x);
  return lerp(hash01(i * 131 + seed), hash01((i + 1) * 131 + seed), smooth(x - i));
};

const OMEGA = 2 * Math.PI * 1.2;
const ZETA = 0.4;

const handCards = (a: HandName, b: HandName, f: number, key: Key): HandCard[] => {
  if (a === b) return [{ variant: b, opacity: 1, front: false }];
  if (key.cut || key.hands === 'instant') return [{ variant: f < key.at ? a : b, opacity: 1, front: false }];
  if (f >= key.at) return [{ variant: b, opacity: 1, front: false }];
  if (f < key.at - HAND_FADE_FRAMES) return [{ variant: a, opacity: 1, front: false }];
  return [{ variant: a, opacity: 1, front: false }, { variant: b, opacity: (f - (key.at - HAND_FADE_FRAMES)) / HAND_FADE_FRAMES, front: true }];
};

/** Progress of a transition after `n` frames of `dur`, on the rig grid; the last frame is always exact. */
export const transitionProgress = (n: number, dur: number, ease: Ease | undefined): number => {
  const nq = n >= dur ? dur : Math.floor(n / RIG_STEP_FRAMES) * RIG_STEP_FRAMES;
  if (ease === 'strike') {
    if (nq < ANTICIPATION_FRAMES) return -ANTICIPATION * smooth(nq / ANTICIPATION_FRAMES);
    return -ANTICIPATION + (1 + ANTICIPATION) * inOutCubic((nq - ANTICIPATION_FRAMES) / (dur - ANTICIPATION_FRAMES));
  }
  return inOutCubic(nq / dur);
};

export interface Held {
  /** Held key, or the source key of a running transition. */
  from: number;
  to: number;
  p: number;
  trans: boolean;
}

/** Which keys the frame sits between; a frame on a key's arrival (or after a cut) holds that key. */
export const segmentAt = (starts: number[], keys: Key[], frame: number): Held => {
  const n = keys.length;
  let j = 0;
  while (j < n && (keys[j] as Key).at < frame) j++;
  if (j === n) return { from: n - 1, to: n - 1, p: 1, trans: false };
  const k = keys[j] as Key;
  if (k.at === frame || j === 0) return { from: j, to: j, p: 1, trans: false };
  const s = starts[j] as number;
  if (frame < s) return { from: j - 1, to: j - 1, p: 1, trans: false };
  return { from: j - 1, to: j, p: transitionProgress(frame - s, k.at - s, k.ease), trans: true };
};

export const rigAt = (m: RigModel, tl: Timeline, frame: number): RigState => {
  const pr = prepare(m, tl);
  const tq = quantFrame(frame);
  const seg = segmentAt(pr.starts, pr.keys, frame);
  const A = pr.defs[seg.from] as PoseDef;
  const B = pr.defs[seg.to] as PoseDef;
  const key = pr.keys[seg.to] as Key;
  let ch: Channels;
  let handR: HandCard[];
  let handL: HandCard[];
  let attach: 'hand_R' | 'ground';
  let ground: GroundSword;
  let swordZ: number;
  let seated: boolean;
  if (seg.trans) {
    ch = mixChannels(pr.chs[seg.from] as Channels, pr.chs[seg.to] as Channels, seg.p);
    handR = handCards(A.armR[3], B.armR[3], frame, key);
    handL = handCards(A.armL[3], B.armL[3], frame, key);
    const gA = pr.ground[seg.from] as GroundSword;
    const gB = pr.ground[seg.to] as GroundSword;
    if (A.sword === 'hand_R' && B.sword === 'ground') { attach = 'ground'; ground = gB; }
    else if (A.sword === 'ground' && B.sword === 'hand_R') { attach = 'ground'; ground = gA; }
    else if (A.sword === 'ground') { attach = 'ground'; ground = { x: lerp(gA.x, gB.x, seg.p), y: lerp(gA.y, gB.y, seg.p), phi: lerp(gA.phi, gB.phi, seg.p) }; }
    else { attach = 'hand_R'; ground = gA; }
    swordZ = A.swordZ ?? 64;
    seated = !!A.seated;
  } else {
    ch = pr.chs[seg.from] as Channels;
    handR = [{ variant: A.armR[3], opacity: 1, front: false }];
    handL = [{ variant: A.armL[3], opacity: 1, front: false }];
    attach = A.sword;
    ground = pr.ground[seg.from] as GroundSword;
    swordZ = attach === 'hand_R' ? (A.swordZ ?? 64) : 64;
    seated = !!A.seated;
  }
  const lifeCfg = tl.life ?? {};
  const life = lifeCfg.scale ?? 1;
  const L = (flag: boolean | undefined) => (flag === false ? 0 : life);
  const tf = frame / 30; // life runs on every frame, never on the rig grid
  if (L(lifeCfg.breath) > 0) {
    const b = Math.sin(2 * Math.PI * 0.22 * tf + 0.7) * L(lifeCfg.breath);
    ch = { ...ch, torso: ch.torso + 0.35 * b, uaR: ch.uaR + 0.3 * b, uaL: ch.uaL + 0.3 * b, wingRot: ch.wingRot + 0.25 * b };
  }
  if (L(lifeCfg.head) > 0) {
    const d = L(lifeCfg.head);
    ch = {
      ...ch,
      headRot: ch.headRot + d * (0.5 * Math.sin(2 * Math.PI * 0.17 * tf + 1.9) + 0.25 * Math.sin(2 * Math.PI * 0.41 * tf + 0.3)),
      headSink: ch.headSink + d * 0.0015 * Math.sin(2 * Math.PI * 0.22 * tf + 0.7),
      crownRot: ch.crownRot + d * 0.4 * Math.sin(2 * Math.PI * 0.29 * tf + 2.4),
    };
  }
  ch = clampChannels(ch);

  const rp = tl.ramps ?? {};
  const wing = (side: Side): WingState => {
    const s = rampAt(rp[`wingS_${side}`], ch.wingS as number, frame, tq);
    const deleted = rampAt(rp[`wingsDeleted_${side}`] ?? rp.wingsDeleted, 0, frame, tq);
    const p = m.json.pipes;
    const events = tl.pipes ?? [];
    return {
      s, deleted,
      pipes: p.items.map((it) => {
        const ls = clamp(it.lengthScale, p.scaleLimits[0], p.scaleLimits[1]);
        return pipeStateAt(p, events, side, it.i, frame, tq, clamp(pipeTheta(p, it, s), p.thetaLimits[0], p.thetaLimits[1]), ls);
      }),
    };
  };

  const wings = { R: wing('R'), L: wing('L') };

  // cape (section 3): lower panel counter-rotates against the body lean, hems sway plus a damped response to arrivals
  const sway = rampAt(rp.capeSway, 1, frame, tq);
  const t = tq / 30;
  const lowerSway = 1.0 * Math.sin(2 * Math.PI * 0.35 * t + 2 * Math.PI * hash01(77)) * sway;
  const capeLower = clamp(-0.8 * (ch.rootRot + ch.pelvisRot + ch.torso) + lowerSway + L(lifeCfg.cape) * 0.5 * Math.sin(2 * Math.PI * 0.31 * tf + 4.1), -8, 8);
  const hems: number[] = [];
  for (let k = 0; k < 6; k++) {
    const f = 0.3 + 0.3 * hash01(k + 11);
    const swayK = 2 * Math.sin(2 * Math.PI * f * t + 2 * Math.PI * hash01(k + 1)) * sway;
    let damped = 0;
    for (const a of pr.arrivals) {
      const age = (tq - a.at) / 30;
      if (age < 0 || age > 5) continue;
      const wd = OMEGA * Math.sqrt(1 - ZETA * ZETA);
      damped += a.amp * (1 + 0.3 * (hash01(k * 7 + 3) - 0.5)) * Math.exp(-ZETA * OMEGA * age) * Math.cos(wd * age - 0.4 * k);
    }
    const flare = ch.flare * (k < 3 ? -1 : 1);
    const lifeHem = L(lifeCfg.cape) * 1.2 * Math.sin(2 * Math.PI * (0.35 + 0.25 * hash01(k + 41)) * tf + 2 * Math.PI * hash01(k + 51));
    hems.push(clamp(swayK + damped + flare + lifeHem, -7, 7));
  }

  const flick = (seed: number, amp: number): number => 1 - L(lifeCfg.glow) * amp * valueNoise(frame / 3, seed);
  for (const side of ['R', 'L'] as const) {
    const w = wings[side];
    w.pipes = w.pipes.map((ps, i) => (ps.glow > 0 ? { ...ps, glow: ps.glow * flick(side === 'R' ? 100 + i : 200 + i, 0.12) } : ps));
  }
  const split = stepAt(tl.helm, 'closed', frame) === 'split';
  return {
    frame, ch, handR, handL,
    sword: { attach, z: swordZ, ground },
    seated,
    helm: { split, t: rampAt(rp.helmSplit, 0, frame, tq) },
    crown: stepAt(tl.crown, 'full', frame),
    slit: { variant: stepAt(tl.slit, 'lit', frame), opacity: rampAt(rp.slitOpacity, 1, frame, tq) },
    studs: rampAt(rp.studs, 1, frame, tq) * flick(9, 0.1), gems: rampAt(rp.gems, 1, frame, tq) * flick(7, 0.15), runes: rampAt(rp.runes, 1, frame, tq) * flick(8, 0.1),
    eyes: [1, 2, 3, 4, 5, 6, 7].map((i) => rampAt(rp[`eye${i}`], 0, frame, tq)),
    capeLower, hems,
    wings,
  };
};

/** Pose channels as authored, before clamping (limit check I). */
export const rawChannelsAt = (m: RigModel, tl: Timeline, frame: number): Channels => {
  const pr = prepare(m, tl);
  const seg = segmentAt(pr.starts, pr.keys, frame);
  if (!seg.trans) return pr.chs[seg.from] as Channels;
  return mixChannels(pr.chs[seg.from] as Channels, pr.chs[seg.to] as Channels, seg.p);
};

/** Frames on which a card may legitimately change texture, visibility or z (check F); a conservative declared set. */
export const declaredChangeFrames = (m: RigModel, tl: Timeline): Set<number> => {
  const pr = prepare(m, tl);
  const out = new Set<number>();
  const span = (a: number, b: number) => { for (let f = a; f <= b; f++) out.add(f); };
  pr.keys.forEach((k, j) => {
    if (j === 0) return;
    out.add(k.at);
    span(k.at - HAND_FADE_FRAMES, k.at);
    out.add(pr.starts[j] as number);
  });
  for (const [, ks] of Object.entries(tl.ramps ?? {})) for (const k of ks) span(k.at - (k.dur ?? RAMP_FRAMES) - RIG_STEP_FRAMES, k.at + RIG_STEP_FRAMES);
  for (const s of [...(tl.crown ?? []), ...(tl.slit ?? []), ...(tl.helm ?? [])]) out.add(s.at);
  for (const e of tl.pipes ?? []) span(e.at - Math.max(CORK_FRAMES, RETURN_FRAMES), e.at + 12);
  return out;
};

export { pipeGeom };

/** Section 5.2: "big" body changes need 18-30 frames, everything else at least 12. */
export const isBigChange = (a: PoseDef, b: PoseDef): boolean => {
  const arm = (x: PoseDef['armR'], y: PoseDef['armR']) => Math.max(Math.abs(x[0] - y[0]), Math.abs(x[1] - y[1]), Math.abs(x[2] - y[2]));
  return Math.abs(a.torso - b.torso) > 8 || Math.abs(a.pelvis[0] - b.pelvis[0]) > 8 || Math.abs(a.pelvis[1] - b.pelvis[1]) > 0.05
    || arm(a.armR, b.armR) > 90 || arm(a.armL, b.armL) > 90 || a.sword !== b.sword;
};
