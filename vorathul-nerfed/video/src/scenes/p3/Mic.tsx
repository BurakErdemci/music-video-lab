// Chorus 2 (S68-S73): Vorathul grabs a microphone and plays the throne room like a stage (storyboard 4, props P1-*).
// Everything here is a pure function of the film frame. The arm moves are applied to the rig state after `stateAt`
// (channel overrides, each with at least 12 frames of travel), so the poses of the nerf gags underneath stay as they are.
import { useMemo } from 'react';
import { AdditiveBlending, DoubleSide } from 'three';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { VORATHUL_RIG } from '../../rig/model.ts';
import type { HandName, RigState } from '../../rig/types.ts';
import { useCardTexture } from '../../stage/Card.tsx';
import { GOLD, IVORY, Shards } from '../../vfx/effects.ts';
import { at } from './events.ts';
import { keyed } from './lib.ts';
import { FULL_H, nodeAt, type Place } from './nerf.tsx';

const NONE = '#0A0A0A';
const VIOLET_HEX = '#9B5CE0';

/** Arm channels of one side as [frame, value] arrival keys, eased with `keyed`: upper arm, elbow flex, wrist. */
export type ArmKeys = { ua: [number, number][]; f: [number, number][]; h?: [number, number][]; hand?: [number, HandName][] };

export interface Overrides {
  /** Which arm holds what: left arm channels and hand, right arm channels and hand. */
  L?: ArmKeys;
  R?: ArmKeys;
  /** Extra head and torso rotation on top of the underlying pose, degrees. */
  head?: [number, number][];
  torso?: [number, number][];
  /** Plant the sword at his side (frees the right hand); a number plants it at that x (H) instead. */
  plant?: boolean | number;
}

/** One arm pose in rig semantic degrees (docs/rig.md §0): upper arm, elbow flex, wrist. */
export interface ArmPose { ua: number; f: number; h: number }

// Poses measured on the drawn rig with the fist hole below (scratch probe over every a/f/h in the limits), in H:
/** Left fist under the chin, forearm across, the grille at the right edge of the helm's mouth (0.125, 0.80). */
export const SING: ArmPose = { ua: 85, f: 145, h: -35 };
/** The beat bob: the same, pushed into the mic (grille 0.09, 0.80, tilted in toward the mouth). */
export const SING_IN: ArmPose = { ua: 100, f: 150, h: -30 };
/** Left fist on the mic in the stand in front of his chest, mic upright (grip 0.08, 0.54). */
export const REACH: ArmPose = { ua: 45, f: 85, h: -45 };
/** The song is over: left arm out and down, the mic dangling grille-down beside his hip (grip 0.37, 0.53). */
export const HANG: ArmPose = { ua: 40, f: -10, h: 45 };
/** Free right arm thrown out to the side / straight up to the sky (sword planted). */
export const ARM_OUT: ArmPose = { ua: 110, f: 15, h: 0 };
export const ARM_UP: ArmPose = { ua: 155, f: 10, h: 0 };
/** Right fist low at his side (the slump arm without the sword). */
export const ARM_LOW: ArmPose = { ua: -15, f: 55, h: -25 };
/** The stand in the right fist: resting on his shoulder (base up behind him), wound up further, struck out to the left. */
export const STAND_SHOULDER: ArmPose = { ua: 145, f: 100, h: -15 };
export const STAND_WIND: ArmPose = { ua: 160, f: 75, h: -30 };
export const STAND_STRIKE: ArmPose = { ua: 60, f: 20, h: -45 };

/** Arm keys from [frame, pose] arrival keys. */
export const armKeys = (keys: [number, ArmPose][], hand?: [number, HandName][]): ArmKeys => ({
  ua: keys.map(([f, p]) => [f, p.ua]),
  f: keys.map(([f, p]) => [f, p.f]),
  h: keys.map(([f, p]) => [f, p.h]),
  hand,
});

/** Sing keys from..to with a bob into the mic on each beat (10 frames in, 12 out). */
export const singKeys = (from: number, to: number, beats: number[], hand: [number, HandName][] = [[0, 'fist']]): ArmKeys => {
  const k: [number, ArmPose][] = [[from, SING]];
  let last = from;
  for (const b of beats) {
    if (b - 10 < last + 12 || b + 12 > to) continue;
    k.push([b - 10, SING], [b, SING_IN], [b + 12, SING]);
    last = b + 12;
  }
  k.push([to, SING]);
  return armKeys(k, hand);
};

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
    if (o.L.h) ch.hL = keyed(frame, o.L.h);
  }
  if (o.R) {
    ch.uaR = keyed(frame, o.R.ua);
    ch.fR = keyed(frame, o.R.f);
    if (o.R.h) ch.hR = keyed(frame, o.R.h);
  }
  if (o.head) ch.headRot = Math.max(-20, Math.min(20, st.ch.headRot + keyed(frame, o.head)));
  if (o.torso) ch.torso = st.ch.torso + keyed(frame, o.torso);
  const b = VORATHUL_RIG.json.bladeBelow;
  return {
    ...st,
    ch,
    handL: o.L?.hand ? [{ variant: handAt(o.L.hand, frame, st.handL[0]?.variant ?? 'open'), opacity: 1, front: false }] : st.handL,
    handR: o.R?.hand ? [{ variant: handAt(o.R.hand, frame, st.handR[0]?.variant ?? 'open'), opacity: 1, front: false }] : st.handR,
    sword: o.plant ? { attach: 'ground', z: 64, ground: { x: typeof o.plant === 'number' ? o.plant : PLANT_X, y: b, phi: 0 } } : st.sword,
  };
};

/** The hole of the closed fist (hand_fist.png px 100,140 against its pivot 85.2,16.4), in the hand's own frame, H.
 *  A held prop runs through it along the hand's x axis: out of the thumb side, at a right angle to the forearm. */
const FIST: [number, number] = [(100 - 85.2) * VORATHUL_RIG.hpx, -(140 - 16.4) * VORATHUL_RIG.hpx];

/** World grip of a prop in a fist: the hole and the card rotation (rad, z) that puts the card's +y on the thumb side. */
export const gripAt = (st: RigState, place: Place, side: 'L' | 'R'): { pos: [number, number, number]; rot: number; axis: [number, number] } => {
  const g = nodeAt(st, place, `hand_${side}`, FIST);
  const u = nodeAt(st, place, `hand_${side}`, [FIST[0] + 0.05, FIST[1]]);
  const n = Math.hypot(u[0] - g[0], u[1] - g[1]) || 1;
  const axis: [number, number] = [(u[0] - g[0]) / n, (u[1] - g[1]) / n];
  return { pos: [g[0], g[1], place.pos[2] + 0.3], rot: Math.atan2(axis[1], axis[0]) - Math.PI / 2, axis };
};

/** Mic length (H, the whole P1-mic image) and the grip point down from its top (the handle under the crown collar). */
export const MIC = { h: 0.28, grip: 0.62 } as const;
/** Draw order inside the rig (renderBase 200): over the helm (78), crown (80) and collar (82), under the fist (91). */
const PROP_ORDER = 288;

const MicCard = ({ pos, rot, axis, h }: { pos: [number, number, number]; rot: number; axis: [number, number]; h: number }) => {
  const off = (MIC.grip - 0.5) * h;
  return <AssetCard id="P1-mic" standIn={{ color: NONE }} height={h} width={h} position={[pos[0] + axis[0] * off, pos[1] + axis[1] * off, pos[2]]} rotation={[0, 0, rot]} renderOrder={PROP_ORDER} />;
};

/** The mic in a fist: grille out of the thumb side, turning with the hand. */
export const HeldMic = ({ st, place, side }: { st: RigState; place: Place; side: 'L' | 'R' }) => {
  const g = gripAt(st, place, side);
  return <MicCard {...g} h={MIC.h * FULL_H * place.scale} />;
};

/** Where the mic rests in the stand: exactly where the fist will close on it (state = the reach pose). */
export const restMic = (st: RigState, place: Place) => {
  const g = gripAt(st, place, 'L');
  const h = MIC.h * FULL_H * place.scale;
  return { ...g, h, standTop: g.pos[1] - (1 - MIC.grip) * h };
};
export const RestingMic = ({ rest }: { rest: ReturnType<typeof restMic> }) => <MicCard pos={rest.pos} rot={rest.rot} axis={rest.axis} h={rest.h} />;

/** The stand image with its top (its own small mic and the clamp, 20 % of the height) cropped away: the hero mic sits there. */
const STAND_TOP = 0.2;
const STAND_ASPECT = 591 / 1492;
const StandCard = ({ bare, position, rotation, renderOrder }: { bare: number; position: [number, number, number]; rotation?: [number, number, number]; renderOrder: number }) => {
  const tex = useCardTexture('assets/P1-mic-stand.png');
  const cropped = useMemo(() => {
    const t = tex.clone();
    t.repeat.set(1, 1 - STAND_TOP);
    t.offset.set(0, 0);
    t.needsUpdate = true;
    return t;
  }, [tex]);
  return (
    <mesh position={position} rotation={rotation} renderOrder={renderOrder}>
      <planeGeometry args={[(bare / (1 - STAND_TOP)) * STAND_ASPECT, bare]} />
      <meshBasicMaterial map={cropped} toneMapped={false} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  );
};

/** The stand on the floor, `bare` tall (its top is the clamp), rocking about its base by `rock` rad. In front of him. */
export const FloorStand = ({ x, z, bare, rock = 0 }: { x: number; z: number; bare: number; rock?: number }) => (
  <group position={[x, 0, z]} rotation={[0, 0, rock]}>
    <StandCard bare={bare} position={[0, bare / 2, 0]} renderOrder={PROP_ORDER - 2} />
  </group>
);

/** The bare stand in a fist, the pole through it a quarter down from its top, top on the thumb side. */
export const HeldStand = ({ st, place, side, bare }: { st: RigState; place: Place; side: 'L' | 'R'; bare: number }) => {
  const g = gripAt(st, place, side);
  const off = -0.25 * bare;
  return <StandCard bare={bare} position={[g.pos[0] + g.axis[0] * off, g.pos[1] + g.axis[1] * off, g.pos[2]]} rotation={[0, 0, g.rot]} renderOrder={PROP_ORDER - 1} />;
};

// ---------------------------------------------------------------- lights

/** The chorus's hard beats: the lantern rig swings and flares violet on each (all existing measured events). */
export const flareFrames = (): number[] => [
  at('s68-step'), at('s69-hop1'), at('s69-bonk'), at('s70-swept'), at('s71-sky'), at('s71-edge'), at('s71-ecu'),
];
const decay = (frame: number, f0: number, len: number): number => (frame < f0 ? 0 : Math.exp(-(frame - f0) / len));
/** 0..1 flare level of the lantern rig. */
export const flareAt = (frame: number): number => {
  let v = 0;
  for (const b of flareFrames()) v = Math.max(v, decay(frame, b, 7));
  return v;
};

const LIGHTS_ASPECT = 907 / 1520;
/** The png's top 20 % is bare chain; it is cropped so the beam sits near the card's top. */
const LIGHTS_CROP = 0.2;

/**
 * The hanging lantern rig (P1-stage-lights) across the top of the throne room: pendulum sway and a violet flare per hard
 * beat, with the painted LX-rays layer added under it while it flares (never a flat strip). `top` is the world y of the
 * card's top edge; each shot hangs it where its camera sees it.
 */
export const StageLights = ({ frame, top, z, width, rays = 0.35 }: { frame: number; top: number; z: number; width: number; rays?: number }) => {
  let sway = 0;
  for (const b of flareFrames()) sway += 0.035 * decay(frame, b, 16) * Math.sin(0.34 * (frame - b));
  const flare = flareAt(frame);
  const tex = useCardTexture('assets/P1-stage-lights.png');
  const rayTex = useCardTexture('assets/LX-rays.png');
  const cropped = useMemo(() => {
    const t = tex.clone();
    t.repeat.set(1, 1 - LIGHTS_CROP);
    t.offset.set(0, 0);
    t.needsUpdate = true;
    return t;
  }, [tex]);
  const h = width * LIGHTS_ASPECT * (1 - LIGHTS_CROP);
  const rayH = width * (1024 / 1536);
  return (
    <group position={[0, top, z]} rotation={[0, 0, sway]}>
      <mesh position={[0, -h / 2, 0]} renderOrder={-65}>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial map={cropped} toneMapped={false} transparent depthWrite={false} side={DoubleSide} />
      </mesh>
      {flare > 0.02 ? (
        <>
          <mesh position={[0, -h / 2, 0.05]} renderOrder={-64}>
            <planeGeometry args={[width, h]} />
            <meshBasicMaterial map={cropped} color={VIOLET_HEX} toneMapped={false} transparent blending={AdditiveBlending} opacity={0.8 * flare} depthWrite={false} side={DoubleSide} />
          </mesh>
          {/* The rays fall from the lantern row (about 60 % down the cropped card), mirrored so they fan to both sides. */}
          {[1, -1].map((s) => (
            <mesh key={s} position={[(s * width) / 4, -0.6 * h - rayH / 2, 0.1]} scale={[s, 1, 1]} renderOrder={-63}>
              <planeGeometry args={[width / 2, rayH]} />
              <meshBasicMaterial map={rayTex} toneMapped={false} transparent blending={AdditiveBlending} opacity={rays * flare} depthWrite={false} depthTest={false} side={DoubleSide} />
            </mesh>
          ))}
        </>
      ) : null}
    </group>
  );
};

/** The crumble going on around him: stone chips drop from the top of the frame on each flare beat (DOM overlay). */
export const Crumble = ({ frame, xs = [380, 1010, 1560] }: { frame: number; xs?: number[] }) => (
  <>
    {flareFrames().map((b, i) => {
      const x = xs[i % xs.length] as number;
      return <Shards key={b} frame={frame - b} duration={34} seed={7300 + i} origin={[x + ((i * 137) % 220) - 110, -40]} direction={Math.PI / 2} spread={0.7} speed={5} gravity={1.1} count={9} size={18} fills={[IVORY, '#C9C0AE', GOLD]} />;
    })}
  </>
);
