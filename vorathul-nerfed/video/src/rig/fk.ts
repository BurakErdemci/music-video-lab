// How a rig state moves each node, and forward kinematics over it. The renderer and every measurement share `drive`,
// so what rigcheck computes is what Rig.tsx draws.
import { apply, clamp, flipX, IDENTITY, mul, rad, rotate, translate, type Affine } from './math.ts';
import type { RigModel, RigNode, RigState, Side, HandCard } from './types.ts';

export interface DriveCard { slot: string; opacity: number; front: boolean }
export interface Drive {
  /** The joint rotation, radians (already includes the semantic-to-rotation.z sign). */
  rot: number;
  /** Extra translation inside the node's own frame, H. */
  tx: number;
  ty: number;
  /** Cards of this node; a card is drawn when `opacity > 0` and the node is not hidden. */
  cards: DriveCard[];
  hidden: boolean;
}

const arm = (st: RigState, side: Side | null): [number, number, number] =>
  side === 'R' ? [st.ch.uaR, st.ch.fR, st.ch.hR] : [st.ch.uaL, st.ch.fL, st.ch.hL];

const one = (slot: string, opacity = 1): DriveCard[] => [{ slot, opacity, front: false }];

export const drive = (node: RigNode, st: RigState): Drive => {
  const d = node.def;
  const sign = node.sign;
  const out: Drive = { rot: 0, tx: 0, ty: 0, cards: one(node.slots[0] as string), hidden: false };
  const split = st.helm.split;
  switch (d.driver) {
    case 'pelvis': out.rot = sign * rad(st.ch.pelvisRot); out.ty = st.ch.pelvisTy; break;
    case 'leg': out.rot = sign * rad(node.side === 'R' ? st.ch.legR : st.ch.legL); out.hidden = st.seated; break;
    case 'legs_seated': out.hidden = !st.seated; break;
    case 'torso': out.rot = sign * rad(st.ch.torso); break;
    case 'studs': out.cards = one(node.slots[0] as string, st.studs); break;
    case 'cape_lower':
      out.rot = sign * rad(st.capeLower);
      out.cards = one(st.seated ? 'cape_lower_seated' : 'cape_lower');
      break;
    case 'hem': out.rot = sign * rad(st.hems[d.hemIndex as number] as number); out.hidden = st.seated; break;
    case 'wing_root': out.rot = sign * rad(st.ch.wingRot); break;
    case 'head': out.rot = sign * rad(st.ch.headRot); out.ty = -st.ch.headSink; out.hidden = split; break;
    case 'slit': out.cards = one(st.slit.variant === 'lit' ? 'slit_lit' : 'slit_sad', st.slit.opacity); out.hidden = split; break;
    case 'crown': out.cards = one(st.crown === 'full' ? 'crown_full' : 'crown_small'); out.rot = sign * rad(st.ch.crownRot); out.hidden = split; break;
    case 'gems': out.cards = one(st.crown === 'full' ? 'gems_full' : 'gems_small', st.gems); out.hidden = split; break;
    case 'void': out.hidden = !split; break;
    case 'eye': out.cards = one(node.slots[0] as string, st.eyes[d.eyeIndex as number] as number); out.hidden = !split; break;
    case 'helm_half':
      out.hidden = !split;
      out.rot = sign * rad(35 * st.helm.t);
      out.tx = (node.side === 'R' ? -1 : 1) * 0.03 * st.helm.t;
      break;
    case 'crown_half': out.hidden = !split; break;
    case 'pauldron': {
      const a = arm(st, node.side)[0];
      out.rot = sign * rad(clamp(0.35 * a, -40, 40));
      break;
    }
    case 'upper_arm': out.rot = sign * rad(arm(st, node.side)[0]); break;
    case 'forearm': out.rot = sign * rad(arm(st, node.side)[1]); break;
    case 'hand': {
      out.rot = sign * rad(arm(st, node.side)[2]);
      const cards: HandCard[] = node.side === 'R' ? st.handR : st.handL;
      out.cards = cards.map((c) => ({ slot: `hand_${c.variant}`, opacity: c.opacity, front: c.front }));
      break;
    }
    case 'sword': out.rot = sign * rad(d.attachOffsetDeg ?? 0); break;
    case 'runes': out.cards = one(node.slots[0] as string, st.runes); break;
    default: break;
  }
  return out;
};

/** Local matrix of a node: T(offset) . flip . T(tx, ty) . R(rot); the sword is re-parented to the root while on the ground. */
export const localMatrix = (m: RigModel, node: RigNode, st: RigState): Affine => {
  const dr = drive(node, st);
  if (node.def.driver === 'sword' && st.sword.attach === 'ground') return mul(translate(st.sword.ground.x, st.sword.ground.y), rotate(-rad(st.sword.ground.phi)));
  let mat = translate(node.offset[0], node.offset[1]);
  if (node.flip) mat = mul(mat, flipX);
  mat = mul(mat, translate(dr.tx, dr.ty));
  return mul(mat, rotate(dr.rot));
};

/** Joint frames of every node in root-local H (y up). The root's own translation, lean and scale are applied by the caller. */
export const forward = (m: RigModel, st: RigState): Map<string, Affine> => {
  const world = new Map<string, Affine>();
  const walk = (id: string, parent: Affine) => {
    const n = m.byId.get(id)!;
    const w = mul(parent, localMatrix(m, n, st));
    world.set(id, w);
    for (const c of n.children) {
      // The sword is a child of hand_R in the tree but hangs from the root while grounded.
      if (c === 'sword' && st.sword.attach === 'ground') continue;
      walk(c, w);
    }
  };
  for (const r of m.roots) walk(r, IDENTITY);
  if (st.sword.attach === 'ground') {
    const sw = m.byId.get('sword')!;
    const w = localMatrix(m, sw, st);
    world.set('sword', w);
    for (const c of sw.children) walk(c, w);
  }
  return world;
};

/** Root-space point -> screen pixel, in the preview framing (1 H = 900 px, floor at the figure's feet). */
export const toPx = (st: RigState, x: number, y: number, figurePx: number, rootPx: [number, number]): [number, number] => {
  const r = rad(st.ch.rootRot);
  const sx = st.ch.rootScale * (x * Math.cos(r) - y * Math.sin(r)) + st.ch.rootX;
  const sy = st.ch.rootScale * (x * Math.sin(r) + y * Math.cos(r)) + st.ch.rootY;
  return [rootPx[0] + sx * figurePx, rootPx[1] - sy * figurePx];
};

export { apply };
