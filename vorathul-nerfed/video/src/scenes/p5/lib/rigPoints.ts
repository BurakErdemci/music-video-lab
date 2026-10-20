// World positions of rig points (hands, sword tip, helm, pipe mouths) so effects and props attach to the
// figure exactly: forward kinematics of the same RigState the stage draws.
import { forward } from '../../../rig/fk.ts';
import { apply } from '../../../rig/math.ts';
import { VORATHUL_RIG } from '../../../rig/model.ts';
import { pipeGeom } from '../../../rig/pipes.ts';
import { rigAt, type Timeline } from '../../../rig/timeline.ts';
import type { RigState } from '../../../rig/types.ts';
import type { Vec3 } from '../../../stage/Card.tsx';
import { UNIT } from './vorathul.ts';

export interface Placement {
  at: Vec3;
  unit?: number;
  /** Must match the Vorathul props (pitch is not supported here: billboarded shots attach in screen space). */
  scale?: number;
}

const toWorld = (st: RigState, p: [number, number], { at, unit = UNIT, scale = 1 }: Placement): Vec3 => {
  const r = (st.ch.rootRot * Math.PI) / 180;
  const s = st.ch.rootScale;
  const x = s * (p[0] * Math.cos(r) - p[1] * Math.sin(r)) + st.ch.rootX;
  const y = s * (p[0] * Math.sin(r) + p[1] * Math.cos(r)) + st.ch.rootY;
  return [at[0] + x * unit * scale, at[1] + y * unit * scale, at[2] + st.ch.rootZ * unit * scale];
};

export interface RigPoints {
  handR: Vec3;
  handL: Vec3;
  head: Vec3;
  chest: Vec3;
  swordTip: Vec3;
  swordGrip: Vec3;
  /** 16 mouths, R0..R7 then L0..L7, with whether each pipe is there and lit. */
  mouths: { p: Vec3; lit: boolean }[];
}

export const rigPoints = (tl: Timeline, frame: number, place: Placement): RigPoints => {
  const st = rigAt(VORATHUL_RIG, tl, frame);
  const fk = forward(VORATHUL_RIG, st);
  const joint = (id: string, x = 0, y = 0): Vec3 => {
    const m = fk.get(id);
    return m ? toWorld(st, apply(m, x, y), place) : toWorld(st, [0, 0.5], place);
  };
  const b = VORATHUL_RIG.json.bladeBelow;
  let swordTip: Vec3;
  let swordGrip: Vec3;
  if (st.sword.attach === 'ground') {
    const g = st.sword.ground;
    swordGrip = toWorld(st, [g.x, g.y], place);
    const phi = (g.phi * Math.PI) / 180;
    swordTip = toWorld(st, [g.x - b * Math.sin(phi), g.y - b * Math.cos(phi)], place);
  } else {
    swordGrip = joint('sword');
    swordTip = joint('sword', 0, -b);
  }
  const p = VORATHUL_RIG.json.pipes;
  const mouths: RigPoints['mouths'] = [];
  for (const side of ['R', 'L'] as const) {
    const w = fk.get(`wing_root_${side}`);
    for (const it of p.items) {
      const ps = st.wings[side].pipes[it.i]!;
      const g = pipeGeom(p, it, ps.theta, ps.lengthScale, ps.fly);
      const local: [number, number] = [g.root[0] + g.dir[0] * g.mouthCentre, g.root[1] + g.dir[1] * g.mouthCentre];
      mouths.push({ p: w ? toWorld(st, apply(w, local[0], local[1]), place) : toWorld(st, [0, 0.8], place), lit: ps.mouth && ps.glow > 0.5 });
    }
  }
  return { handR: joint('hand_R'), handL: joint('hand_L'), head: joint('head', 0, 0.06), chest: joint('torso', 0, 0.12), swordTip, swordGrip, mouths };
};

/** Root placement that puts a rig point (a hand, the helm) on a world target at `frame`; z stays as given. */
export const solveAt = (tl: Timeline, frame: number, which: 'handR' | 'handL' | 'head' | 'swordTip', target: [number, number], z: number, unit = UNIT): Vec3 => {
  const p = rigPoints(tl, frame, { at: [0, 0, z], unit })[which];
  return [target[0] - p[0], target[1] - p[1], z];
};
