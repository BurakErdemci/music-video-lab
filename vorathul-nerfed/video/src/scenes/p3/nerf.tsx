// Vorathul in his nerfed state (storyboard 2 §0.3): the rig with the nerf state tracks, placed on the painting
// stage. The rig lane's code is only imported. Placement (scale, squash, airborne spin) wraps the rig in a group,
// so requests R3 (airborne rotation) and R5 (scale steps, squash) need nothing from the rig itself.
import { forward } from '../../rig/fk.ts';
import { apply } from '../../rig/math.ts';
import { RIG } from '../../rig/model.ts';
import { pipeGeom, type PipeEvent } from '../../rig/pipes.ts';
import { Rig } from '../../rig/Rig.tsx';
import { rigAt, type Key, type RampKey, type Step, type Timeline } from '../../rig/timeline.ts';
import type { RigState, Side } from '../../rig/types.ts';
import type { Vec3 } from '../../stage/Card.tsx';

/** Height of the drawn (unnerfed) figure on the painting stage, world units: feet y 0, helm top y 12. */
export const FULL_H = 12;
export const SCALE_A = 0.55;
export const SCALE_B = 0.45;
export const SCALE_C = 0.35;

/** pre = S46-S53 (fan folded, all pipes dark); deleted = after S54 (10 pipes gone, checker fan); corked = after S65. */
export type Phase = 'pre' | 'deleted' | 'corked';
export const DELETED_PIPES = [0, 1, 2, 3, 4];
export const KEPT_PIPES = [5, 6, 7];

export interface NerfOptions {
  phase: Phase;
  /** Fan spread (0 folded); a ramp list overrides it. */
  wingS?: number | RampKey[];
  pipes?: PipeEvent[];
  ramps?: Record<string, RampKey[]>;
  slit?: Step<'lit' | 'sad'>[];
  slitOpacity?: number | RampKey[];
  helm?: Step<'closed' | 'split'>[];
  crown?: Step<'full' | 'small'>[];
  life?: Timeline['life'];
}

const constRamp = (v: number): RampKey[] => [{ at: 0, v, dur: 0 }];

/** A rig timeline with the nerf tracks; keys are arrival-anchored film frames. Build it once (module level). */
export const nerfTimeline = (keys: Key[], o: NerfOptions): Timeline => {
  const wing = typeof o.wingS === 'object' ? o.wingS : constRamp(o.wingS ?? (o.phase === 'pre' ? 0.2 : 0));
  const pipes: PipeEvent[] = [{ at: 0, wing: 'both', pipe: 'all', op: 'dark' }];
  if (o.phase !== 'pre') for (const i of DELETED_PIPES) pipes.push({ at: 1, wing: 'both', pipe: i, op: 'delete' });
  if (o.phase === 'corked') for (const i of KEPT_PIPES) pipes.push({ at: 2, wing: 'both', pipe: i, op: 'cork' });
  return {
    keys,
    crown: o.crown ?? [{ at: 0, value: 'small' }],
    slit: o.slit ?? [{ at: 0, value: 'sad' }],
    helm: o.helm,
    pipes: [...pipes, ...(o.pipes ?? [])],
    life: o.life,
    ramps: {
      runes: constRamp(0),
      gems: constRamp(0.5),
      studs: constRamp(0.4),
      slitOpacity: typeof o.slitOpacity === 'object' ? o.slitOpacity : constRamp(o.slitOpacity ?? 0.4),
      wingS_R: wing,
      wingS_L: wing,
      wingsDeleted: o.phase === 'pre' ? constRamp(0) : constRamp(1),
      ...o.ramps,
    },
  };
};

/** Where and how big he stands; rot (deg) and squash wrap the whole figure about its feet. */
export interface Place {
  pos: Vec3;
  scale: number;
  /** Whole-figure spin about the feet point, degrees (airborne flight). */
  rot?: number;
  /** y squash (tablet hit). */
  squash?: number;
  /** Billboard pitch toward a high camera, radians. */
  pitch?: number;
  hidden?: boolean;
}

export const stateAt = (tl: Timeline, frame: number): RigState => rigAt(RIG, tl, frame);

/** The figure on the stage. `renderBase` lifts every card above the backdrop. */
export const Vorathul = ({ st, place, renderBase = 200 }: { st: RigState; place: Place; renderBase?: number }) => (
  <group position={place.pos} rotation={[place.pitch ?? 0, 0, ((place.rot ?? 0) * Math.PI) / 180]} scale={[1, place.squash ?? 1, 1]} visible={!place.hidden}>
    <Rig cfg={{ model: RIG, pass: 'beauty', unit: FULL_H * place.scale, origin: [0, 0, 0], renderBase }} state={st} />
  </group>
);

/** Root-space H point to world, through the root channels and the placement (pitch ignored: used flat only). */
const toWorld = (st: RigState, place: Place, p: [number, number]): Vec3 => {
  const c = st.ch;
  const r = (c.rootRot * Math.PI) / 180;
  const x = c.rootScale * (p[0] * Math.cos(r) - p[1] * Math.sin(r)) + c.rootX;
  const y = c.rootScale * (p[0] * Math.sin(r) + p[1] * Math.cos(r)) + c.rootY;
  const u = FULL_H * place.scale;
  const pr = ((place.rot ?? 0) * Math.PI) / 180;
  const lx = x * u;
  const ly = y * u * (place.squash ?? 1);
  return [place.pos[0] + lx * Math.cos(pr) - ly * Math.sin(pr), place.pos[1] + lx * Math.sin(pr) + ly * Math.cos(pr), place.pos[2] + c.rootZ * u];
};

/** World position of a rig node's joint (plus a local offset in H). */
export const nodeAt = (st: RigState, place: Place, id: string, local: [number, number] = [0, 0]): Vec3 => {
  const m = forward(RIG, st).get(id);
  if (!m) throw new Error(`p3: rig node ${id} missing`);
  return toWorld(st, place, apply(m, local[0], local[1]));
};

/** Named anchor points of the figure (helm centre, slit, chest, sword tip). */
export const helmAt = (st: RigState, place: Place): Vec3 => nodeAt(st, place, 'head', [0, 0.065]);
export const slitAt = (st: RigState, place: Place): Vec3 => nodeAt(st, place, 'eye_slit');
export const chestAt = (st: RigState, place: Place): Vec3 => nodeAt(st, place, 'torso', [0, 0.1]);
export const swordTipAt = (st: RigState, place: Place): Vec3 => nodeAt(st, place, 'sword', [0, -RIG.json.bladeBelow]);

/** World position of pipe i's mouth on a wing. */
export const pipeMouthAt = (st: RigState, place: Place, side: Side, i: number): Vec3 => {
  const p = RIG.json.pipes;
  const it = p.items[i]!;
  const ps = st.wings[side].pipes[i]!;
  const g = pipeGeom(p, it, ps.theta, ps.lengthScale, ps.fly);
  const m = forward(RIG, st).get(`wing_root_${side}`)!;
  return toWorld(st, place, apply(m, g.root[0] + g.dir[0] * g.rimTip, g.root[1] + g.dir[1] * g.rimTip));
};

/** A copy of the state with extra head rotation (rattle) and hem flick; pure. */
export const withHead = (st: RigState, rot: number, sink = 0): RigState => ({ ...st, ch: { ...st.ch, headRot: Math.max(-20, Math.min(20, st.ch.headRot + rot)), headSink: st.ch.headSink + sink } });
export const withHems = (st: RigState, add: number): RigState => ({ ...st, hems: st.hems.map((h, k) => Math.max(-7, Math.min(7, h + add * (k % 2 ? 1 : -0.7)))) });
/** Cork bulge on the corked pipes (S67): scale on the cork, small recoil on the pipe. */
export const withCorks = (st: RigState, scale: number, push: number): RigState => {
  const w = (side: Side) => ({
    ...st.wings[side],
    pipes: st.wings[side].pipes.map((ps) => (ps.cork.show ? { ...ps, fly: ps.fly + push, cork: { ...ps.cork, scale: ps.cork.scale * scale } } : ps)),
  });
  return { ...st, wings: { R: w('R'), L: w('L') } };
};
