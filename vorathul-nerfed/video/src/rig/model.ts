import raw from './vorathul.rig.json' with { type: 'json' };
import type { PartDef, RigJson, RigModel, RigNode, Side } from './types.ts';

/** Expands the JSON part list into the node tree (sided parts become _R/_L, mirrored families get a flip root). */
export const loadRig = (json: RigJson): RigModel => {
  const hpx = 1 / json.unitPx;
  const defs = new Map<string, PartDef>();
  for (const p of json.parts) defs.set(p.id, p);
  const nodes: RigNode[] = [];
  const byId = new Map<string, RigNode>();

  // Pass 1: one node per part and side, with its parent id.
  for (const p of json.parts) {
    for (const id of p.sided ? [`${p.id}_R`, `${p.id}_L`] : [p.id]) {
      const side: Side | null = p.sided ? (id.endsWith('_R') ? 'R' : 'L') : (p.side ?? null);
      let parent: string | null = null;
      if (p.parent !== 'root') parent = defs.get(p.parent)?.sided ? `${p.parent}_${side}` : p.parent;
      const node: RigNode = {
        id, def: p, side, parent, children: [], offset: [0, 0], flip: false,
        z: p.zBySide && side ? p.zBySide[side] : p.z, dz: p.dz ?? 0, sign: p.sign ?? 1,
        slots: [...new Set([p.texture, ...(p.variants ?? [])])],
      };
      nodes.push(node);
      byId.set(id, node);
    }
  }
  // Pass 2: offsets from the parent's pivot and the mirror flags.
  const roots: string[] = [];
  for (const n of nodes) {
    const p = n.def;
    if (n.parent === null) roots.push(n.id);
    else byId.get(n.parent)!.children.push(n.id);
    let [ox, oy] = p.offsetH ?? [0, 0];
    if (!p.offsetH) {
      const par = byId.get(n.parent!)!;
      const pp = json.textures[par.def.texture]!.pivot;
      ox = (p.socket[0] - pp[0]) * hpx;
      oy = -(p.socket[1] - pp[1]) * hpx;
      // The mirrored node of a family starts a flip unless its parent is the same mirrored family.
      const parentMirrored = !!par.def.sided && !!par.def.mirror;
      n.flip = !!p.sided && !!p.mirror && n.side !== (p.baseSide ?? 'R') && !parentMirrored;
    } else {
      n.flip = !!p.sided && !!p.mirror && n.side !== (p.baseSide ?? 'R');
    }
    // A flipped root's offset is given in the unmirrored parent, so it mirrors; children inside the flip stay as drawn.
    n.offset = [n.flip ? -ox : ox, oy];
  }
  return { json, nodes, byId, roots, hpx };
};

export const RIG_JSON = raw as unknown as RigJson;
export const RIG: RigModel = loadRig(RIG_JSON);

export const texOf = (m: RigModel, slot: string) => m.json.textures[slot]!;
/** Card centre offset from the joint (H, y up): where the card sits relative to its pivot. */
export const cardCentre = (m: RigModel, slot: string): [number, number] => {
  const t = texOf(m, slot);
  return [(t.w / 2 - t.pivot[0]) * m.hpx, -(t.h / 2 - t.pivot[1]) * m.hpx];
};
