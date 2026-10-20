// Chorus 2 (S68-S73): Vorathul grabs a microphone and plays the throne room like a stage (storyboard 4, props P1-*).
// Everything here is a pure function of the film frame. The arm moves are applied to the rig state after `stateAt`
// (channel overrides, each with at least 12 frames of travel), so the poses of the nerf gags underneath stay as they are.
import { useMemo } from 'react';
import { AdditiveBlending, DoubleSide } from 'three';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { VORATHUL_RIG } from '../../rig/model.ts';
import type { HandName, RigState } from '../../rig/types.ts';
import { useCardTexture } from '../../stage/Card.tsx';
import { at } from './events.ts';
import { keyed, twos } from './lib.ts';
import { nodeAt, type Place } from './nerf.tsx';

const NONE = '#0A0A0A';
const VIOLET_HEX = '#9B5CE0';

/** Arm channels of one side as [frame, upper arm, forearm] arrival keys, eased with `keyed`. */
export type ArmKeys = { ua: [number, number][]; f: [number, number][]; hand?: [number, HandName][] };

export interface Overrides {
  /** Which arm holds what: left arm channels and hand, right arm channels and hand. */
  L?: ArmKeys;
  R?: ArmKeys;
  /** Extra head and torso rotation on top of the underlying pose, degrees. */
  head?: [number, number][];
  torso?: [number, number][];
  /** Plant the sword at his side (frees the right hand). */
  plant?: boolean;
}

const handAt = (keys: [number, HandName][] | undefined, frame: number, fallback: HandName): HandName => {
  let v = fallback;
  for (const [f, h] of keys ?? []) if (frame >= f) v = h;
  return v;
};

const PLANT_X = -0.3;
/** The rig state with the performance overrides applied. */
export const perform = (st: RigState, frame: number, o: Overrides): RigState => {
  const ch = { ...st.ch };
  if (o.L) {
    ch.uaL = keyed(frame, o.L.ua);
    ch.fL = keyed(frame, o.L.f);
  }
  if (o.R) {
    ch.uaR = keyed(frame, o.R.ua);
    ch.fR = keyed(frame, o.R.f);
  }
  if (o.head) ch.headRot = Math.min(20, st.ch.headRot + keyed(frame, o.head));
  if (o.torso) ch.torso = st.ch.torso + keyed(frame, o.torso);
  const b = VORATHUL_RIG.json.bladeBelow;
  return {
    ...st,
    ch,
    handL: o.L?.hand ? [{ variant: handAt(o.L.hand, frame, st.handL[0]?.variant ?? 'open'), opacity: 1, front: false }] : st.handL,
    handR: o.R?.hand ? [{ variant: handAt(o.R.hand, frame, st.handR[0]?.variant ?? 'open'), opacity: 1, front: false }] : st.handR,
    sword: o.plant ? { attach: 'ground', z: 64, ground: { x: PLANT_X, y: b, phi: 0 } } : st.sword,
  };
};

/** World pose of a prop held in a hand: centre (grip point pushed `grip` along the forearm) and rotation (rad, z). */
export const heldAt = (st: RigState, place: Place, side: 'L' | 'R', grip: number): { pos: [number, number, number]; rot: number; wrist: [number, number, number] } => {
  const w = nodeAt(st, place, `hand_${side}`);
  const e = nodeAt(st, place, `forearm_${side}`);
  const dx = w[0] - e[0];
  const dy = w[1] - e[1];
  const n = Math.hypot(dx, dy) || 1;
  return { pos: [w[0] + (dx / n) * grip, w[1] + (dy / n) * grip, place.pos[2] + 0.3], rot: Math.atan2(dy, dx) - Math.PI / 2, wrist: w };
};

export const MIC_H = 2.0;
/** The mic in a hand: grille up along the forearm, rotating with it. */
export const HeldMic = ({ st, place, side, h = MIC_H }: { st: RigState; place: Place; side: 'L' | 'R'; h?: number }) => {
  const p = heldAt(st, place, side, 0.12 * h);
  return <AssetCard id="P1-mic" standIn={{ color: NONE }} height={h} width={h} position={p.pos} rotation={[0, 0, p.rot]} renderOrder={600} />;
};

/** The stand image with its top (the mic and the clamp, 20 % of the height) cropped away once the mic is gone. */
const STAND_TOP = 0.2;
const STAND_ASPECT = 591 / 1492;
const StandCard = ({ height, mic, position, rotation, renderOrder }: { height: number; mic: boolean; position: [number, number, number]; rotation?: [number, number, number]; renderOrder: number }) => {
  const tex = useCardTexture('assets/P1-mic-stand.png');
  const bare = useMemo(() => {
    const t = tex.clone();
    t.repeat.set(1, 1 - STAND_TOP);
    t.offset.set(0, 0);
    t.needsUpdate = true;
    return t;
  }, [tex]);
  const h = mic ? height : height * (1 - STAND_TOP);
  return (
    <mesh position={position} rotation={rotation} renderOrder={renderOrder}>
      <planeGeometry args={[height * STAND_ASPECT, h]} />
      <meshBasicMaterial map={mic ? tex : bare} toneMapped={false} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  );
};

/** The stand on the floor: base on y 0, its top at `height` (full image) while the mic is still on it. */
export const FloorStand = ({ x, z, height, mic }: { x: number; z: number; height: number; mic: boolean }) => (
  <StandCard height={height} mic={mic} position={[x, (mic ? height : height * (1 - STAND_TOP)) / 2, z]} renderOrder={-50} />
);

/** The stand in his hand, pole along the forearm, gripped a third of the way up. */
export const HeldStand = ({ st, place, side, height }: { st: RigState; place: Place; side: 'L' | 'R'; height: number }) => {
  const bare = height * (1 - STAND_TOP);
  const p = heldAt(st, place, side, 0.3 * bare - 0.05);
  return <StandCard height={height} mic={false} position={p.pos} rotation={[0, 0, p.rot]} renderOrder={599} />;
};

// ---------------------------------------------------------------- lights

const LIGHTS_W = 38;
const LIGHTS_H = (LIGHTS_W * 907) / 1520;
export const LIGHTS_Z = -26;
const LIGHTS_TOP = 22;

/** The chorus's hard beats: the lantern rig swings and flares violet on each. */
export const flareFrames = (): number[] => [at('s68-cut'), at('s68-step'), at('s69-hop1'), at('s69-bonk'), at('s70-swept'), at('s71-edge')];
const decay = (frame: number, f0: number, len: number): number => (frame < f0 ? 0 : Math.exp(-(frame - f0) / len));

/** The hanging lantern rig across the top of the throne room (P1-stage-lights): pendulum sway and a violet flare per beat. */
export const StageLights = ({ frame }: { frame: number }) => {
  const f = twos(frame);
  const flares = flareFrames();
  let sway = 0;
  let flare = 0;
  for (const b of flares) {
    sway += 0.03 * decay(f, b, 16) * Math.sin(0.34 * (f - b));
    flare = Math.max(flare, decay(f, b, 7));
  }
  const tex = useCardTexture('assets/P1-stage-lights.png');
  return (
    <group position={[0, LIGHTS_TOP, LIGHTS_Z]} rotation={[0, 0, sway]}>
      <AssetCard id="P1-stage-lights" standIn={{ color: NONE }} height={LIGHTS_H} width={LIGHTS_W} position={[0, -LIGHTS_H / 2, 0]} renderOrder={-65} />
      {flare > 0.02 ? (
        <mesh position={[0, -LIGHTS_H / 2, 0.05]} renderOrder={-64}>
          <planeGeometry args={[LIGHTS_W, LIGHTS_H]} />
          <meshBasicMaterial map={tex} color={VIOLET_HEX} toneMapped={false} transparent blending={AdditiveBlending} opacity={0.85 * flare} depthWrite={false} side={DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
};
