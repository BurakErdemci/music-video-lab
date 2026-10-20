// Draws a RigState as a nested tree of Parts (docs/rig.md section 7.2). Pure: no hooks of its own, everything comes from `state`.
import type { ReactNode } from 'react';
import { Card } from '../stage/Card.tsx';
import { Part } from '../stage/Part.tsx';
import { drive } from './fk.ts';
import { rad } from './math.ts';
import { pipeGeom } from './pipes.ts';
import { cardCentre, texOf } from './model.ts';
import type { RigModel, RigNode, RigState, Side } from './types.ts';

export interface RigConfig {
  model: RigModel;
  /** 'beauty' draws the textures; 'id' draws every card as its flat idColor (measurement passes). */
  pass: 'beauty' | 'id';
  /** World units per H. */
  unit: number;
  /** World position of the root (the ground point between the feet). */
  origin: [number, number, number];
  /** Added to every renderOrder, so a second character or layer can sit above or below. */
  renderBase?: number;
  /** When set, only these card ids are drawn (joint sweeps measure two parts in isolation). */
  isolate?: ReadonlySet<string>;
}

const cellsFor = (cfg: RigConfig, slot: string, cellH: number) => {
  const t = texOf(cfg.model, slot);
  const cell = cellH * cfg.model.json.unitPx;
  return { cellsX: t.w / cell, cellsY: t.h / cell };
};

/** Sub-integer tie-break so no two cards ever share a renderOrder (three breaks ties by object id, which changes on remount). */
const tie = (n: number) => n * 1e-4;

const shown = (cfg: RigConfig, id: string): boolean => !cfg.isolate || cfg.isolate.has(id);
const idOf = (cfg: RigConfig, id: string): string | undefined => (cfg.pass === 'id' ? cfg.model.json.idColors[id] : undefined);

/** World-unit pivot offset from the card centre (what Part wants). */
const pivotOf = (cfg: RigConfig, slot: string): [number, number] => {
  const [cx, cy] = cardCentre(cfg.model, slot);
  return [-cx * cfg.unit, -cy * cfg.unit];
};
const sizeOf = (cfg: RigConfig, slot: string): [number, number] => {
  const t = texOf(cfg.model, slot);
  return [t.w * cfg.model.hpx * cfg.unit, t.h * cfg.model.hpx * cfg.unit];
};

const Pipes = ({ cfg, st, side }: { cfg: RigConfig; st: RigState; side: Side }) => {
  const { model, unit } = cfg;
  const p = model.json.pipes;
  const base = cfg.renderBase ?? 0;
  const wing = st.wings[side];
  const items: ReactNode[] = [];
  for (const it of p.items) {
    const ps = wing.pipes[it.i]!;
    const bodySlot = `body_${it.tex}`;
    const mouthSlot = `mouth_${it.tex}`;
    const glowSlot = `glow_${it.tex}`;
    const [bw, bh] = sizeOf(cfg, bodySlot);
    const g = pipeGeom(p, it, ps.theta, ps.lengthScale, ps.fly);
    const sideN = side === 'R' ? 0 : 1;
    const zBody = base + p.z.base + p.z.step * (7 - it.i) + tie(sideN);
    const bodyId = `pipe_${side}${it.i}_body`;
    const mouthId = `pipe_${side}${it.i}_mouth`;
    const glowId = `pipe_${side}${it.i}_glow`;
    const corkId = `pipe_${side}${it.i}_cork`;
    const checker = ps.checker ? cellsFor(cfg, bodySlot, p.checkerCellH) : undefined;
    const mouthChecker = ps.checker ? cellsFor(cfg, mouthSlot, p.checkerCellH) : undefined;
    const [mw, mh] = sizeOf(cfg, mouthSlot);
    const [gw, gh] = sizeOf(cfg, glowSlot);
    const [kw, kh] = sizeOf(cfg, 'cork');
    const corkX = (g.corkStart + (g.corkSeat - g.corkStart) * ps.cork.travel) * unit;
    const bodyW = bw * ps.lengthScale;
    items.push(
      <Part
        key={`p${it.i}`} src={texOf(model, bodySlot).src} width={bodyW} height={bh} pivot={[-bodyW / 2, 0]}
        position={[g.root[0] * unit, g.root[1] * unit, 0]} rotation={[0, 0, g.theta]}
        renderOrder={zBody} hidden={!ps.body || !shown(cfg, bodyId)} idColor={idOf(cfg, bodyId)} checker={checker}
      >
        <Card src={texOf(model, mouthSlot).src} width={mw} height={mh} position={[g.mouthCentre * unit, 0, 0]} renderOrder={zBody + p.z.mouth}
          hidden={!ps.mouth || !shown(cfg, mouthId)} idColor={idOf(cfg, mouthId)} checker={mouthChecker} />
        <Card src={texOf(model, glowSlot).src} width={gw} height={gh} position={[g.mouthCentre * unit, 0, 0]} renderOrder={zBody + p.z.glow}
          opacity={ps.glow} hidden={!ps.mouth || ps.glow <= 0 || !shown(cfg, glowId)} idColor={idOf(cfg, glowId)} />
        <Card src={texOf(model, 'cork').src} width={kw} height={kh} position={[corkX, 0, 0]} scale={ps.cork.scale} renderOrder={zBody + p.z.cork}
          hidden={!ps.cork.show || !shown(cfg, corkId)} idColor={idOf(cfg, corkId)} />
      </Part>,
    );
    // The deleted wing: the same pipes at s = 1, checkerboard, behind everything (director, 20 Oct).
    const wmBody = `wm_${side}${it.i}_body`;
    const wmMouth = `wm_${side}${it.i}_mouth`;
    const wg = pipeGeom(p, it, it.open, it.lengthScale, 0);
    const wbw = bw * it.lengthScale;
    items.push(
      <Part
        key={`w${it.i}`} src={texOf(model, bodySlot).src} width={wbw} height={bh} pivot={[-wbw / 2, 0]}
        position={[wg.root[0] * unit, wg.root[1] * unit, 0]} rotation={[0, 0, wg.theta]} opacity={wing.deleted}
        renderOrder={base + p.missingZ + 0.01 * it.i + tie(sideN)} hidden={wing.deleted <= 0 || !shown(cfg, wmBody)} idColor={idOf(cfg, wmBody)}
        checker={cellsFor(cfg, bodySlot, p.checkerCellH)}
      >
        <Card src={texOf(model, mouthSlot).src} width={mw} height={mh} position={[wg.mouthCentre * unit, 0, 0]} opacity={wing.deleted}
          renderOrder={base + p.missingZ + 0.01 * it.i + 0.005 + tie(sideN)} hidden={wing.deleted <= 0 || !shown(cfg, wmMouth)} idColor={idOf(cfg, wmMouth)}
          checker={cellsFor(cfg, mouthSlot, p.checkerCellH)} />
      </Part>,
    );
  }
  return <>{items}</>;
};

const NodeView = ({ node, cfg, st, parentDz, ground }: { node: RigNode; cfg: RigConfig; st: RigState; parentDz: number; ground?: boolean }): ReactNode => {
  const { model, unit } = cfg;
  const base = cfg.renderBase ?? 0;
  const dr = drive(node, st);
  const isSword = node.def.driver === 'sword';
  const z = (isSword ? st.sword.z : node.def.driver === 'runes' ? st.sword.z + 1 : node.z) + tie(model.nodes.indexOf(node) + 1);
  const slots = node.slots;
  const visible = (slot: string) => dr.cards.find((c) => c.slot === slot);
  const first = slots[0] as string;
  const firstCard = visible(first);
  const children = node.children
    .filter((c) => !(c === 'sword' && st.sword.attach === 'ground' && !ground))
    .map((c) => <NodeView key={c} node={model.byId.get(c)!} cfg={cfg} st={st} parentDz={node.dz} />);
  const extra = slots.slice(1).map((slot) => {
    const c = visible(slot);
    const [w, h] = sizeOf(cfg, slot);
    const [px, py] = pivotOf(cfg, slot);
    return (
      <Card key={slot} src={texOf(model, slot).src} width={w} height={h} position={[-px, -py, 0]} opacity={c?.opacity ?? 0}
        renderOrder={base + z + (c?.front ? 0.5 : 0)} hidden={!c || c.opacity <= 0 || dr.hidden || !shown(cfg, node.id)} idColor={idOf(cfg, node.id)} />
    );
  });
  const [w, h] = sizeOf(cfg, first);
  const pivot = pivotOf(cfg, first);
  let pos: [number, number, number];
  let rot = dr.rot;
  let flip = node.flip;
  if (isSword && st.sword.attach === 'ground') {
    pos = [st.sword.ground.x * unit, st.sword.ground.y * unit, 0];
    rot = -rad(st.sword.ground.phi);
    flip = false;
  } else pos = [node.offset[0] * unit, node.offset[1] * unit, (node.dz - parentDz) * unit];
  const tx = isSword && st.sword.attach === 'ground' ? 0 : dr.tx;
  const ty = isSword && st.sword.attach === 'ground' ? 0 : dr.ty;
  const wingSide = node.def.driver === 'wing_root' ? (node.side as Side) : null;
  return (
    <group position={pos} scale={flip ? [-1, 1, 1] : 1}>
      <Part
        src={texOf(model, first).src} width={w} height={h} pivot={pivot} position={[tx * unit, ty * unit, 0]} rotation={[0, 0, rot]}
        opacity={firstCard?.opacity ?? 0} renderOrder={base + z + (firstCard?.front ? 0.5 : 0)}
        hidden={!firstCard || firstCard.opacity <= 0 || dr.hidden || !shown(cfg, node.id)} idColor={idOf(cfg, node.id)}
      >
        {extra}
        {wingSide ? <Pipes cfg={cfg} st={st} side={wingSide} /> : null}
        {children}
      </Part>
    </group>
  );
};

/** The whole figure. Root placement (x, y, z, scale, lean) comes from the state's root channels. */
export const Rig = ({ cfg, state }: { cfg: RigConfig; state: RigState }) => {
  const { model, unit, origin } = cfg;
  const c = state.ch;
  const rootGroup = (
    <group
      position={[origin[0] + c.rootX * unit, origin[1] + c.rootY * unit, origin[2] + c.rootZ * unit]}
      rotation={[0, 0, rad(c.rootRot)]} scale={c.rootScale}
    >
      {model.roots.map((id) => <NodeView key={id} node={model.byId.get(id)!} cfg={cfg} st={state} parentDz={0} />)}
      {state.sword.attach === 'ground' ? <NodeView node={model.byId.get('sword')!} cfg={cfg} st={state} parentDz={0} ground /> : null}
    </group>
  );
  return rootGroup;
};
