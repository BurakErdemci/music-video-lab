// The throne room behind the nerfed Vorathul (storyboard 3 §1, §2): one painted location that crumbles as the
// nerfs land. Everything is a flat card stacked by depth; the stage is chosen from the film frame.
//   S46-S53 intact; from S54 the L3-cracks layer opens one step per nerf beat (it is one image of three crack
//   clusters, so the steps open a cluster each and then widen all of them); from S64 the ruined wall and broken
//   column replace the intact ones and L3-rubble drops in at S65. The ruin art is already drained.
import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { useCardTexture } from '../../stage/Card.tsx';
import { Sky } from './Backdrop.tsx';
import { at } from './events.ts';
import { easeOut, prog } from './lib.ts';

const WALL_H = 74;
/** The wall image's floor line sits this far (fraction of its height) above its bottom edge. */
const WALL_FLOOR = 0.17;
const WALL_Z = -50;
const COLUMN_H = 46;
const COLUMN_X = 27;
const COLUMN_Z = -30;
const NONE = '#0A0A0A';

/** Frames of the five crack steps: the existing nerf events of S54, S55, S56, S57 and S61. */
const crackSteps = () => [at('s54-gone'), at('s55-split'), at('s56-fire'), at('s57-gone'), at('s61-out')];

export type ThroneStage = 'intact' | 'cracked' | 'ruin';
export const throneStage = (frame: number): ThroneStage => (frame >= at('s64-cut') ? 'ruin' : frame >= at('s54-cut') ? 'cracked' : 'intact');

/** [u0, u1] of the three crack clusters in L3-cracks (gaps measured in the png at x 442-500 and 1025-1047 of 1488). */
const CLUSTERS: [number, number][] = [[0, 0.317], [0.317, 0.685], [0.685, 1]];

const Cracks = ({ frame, wallW }: { frame: number; wallW: number }) => {
  const tex = useCardTexture('assets/L3-cracks.png');
  const steps = crackSteps();
  const f = frame;
  const textures = useMemo(() => CLUSTERS.map(([u0, u1]) => {
    const t = tex.clone();
    t.repeat.set(u1 - u0, 1);
    t.offset.set(u0, 0);
    t.needsUpdate = true;
    return t;
  }), [tex]);
  // Cluster order of opening: left, right, centre (the throne last); steps 4 and 5 widen every cluster.
  const open = [steps[0]!, steps[2]!, steps[1]!];
  const cardH = WALL_H;
  const cardW = wallW;
  const grow = 1 + 0.06 * easeOut(prog(f, steps[3]!, 6)) + 0.06 * easeOut(prog(f, steps[4]!, 6));
  return (
    <group position={[0, WALL_H * (0.5 - WALL_FLOOR), WALL_Z + 0.1]}>
      {CLUSTERS.map(([u0, u1], i) => {
        const t = easeOut(prog(f, open[i]!, 5));
        const cx = ((u0 + u1) / 2 - 0.5) * cardW;
        const s = (0.8 + 0.2 * t) * grow;
        return (
          <group key={i} position={[cx, 0, 0]} scale={[s, s, 1]} visible={t > 0}>
            <mesh renderOrder={-89}>
              <planeGeometry args={[(u1 - u0) * cardW, cardH]} />
              <meshBasicMaterial map={textures[i]} toneMapped={false} transparent opacity={t} depthWrite={false} side={DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Mid and near columns, mirrored for the right side. `broken` is the drained pair of the ruin. */
const Columns = ({ broken }: { broken: boolean }) => {
  const id = broken ? 'L3-column-broken' : 'L3-column';
  const h = broken ? (COLUMN_H * 965) / 1536 : COLUMN_H;
  return (
    <>
      <AssetCard id={id} standIn={{ color: NONE }} height={h} width={h} position={[-COLUMN_X, h / 2, COLUMN_Z]} renderOrder={-70} />
      <group scale={[-1, 1, 1]}>
        <AssetCard id={id} standIn={{ color: NONE }} height={h} width={h} position={[-COLUMN_X, h / 2, COLUMN_Z]} renderOrder={-70} />
      </group>
    </>
  );
};

/** P4 floor: the image already draws its own perspective, so it stands upright and its horizon (22 % down the image,
 *  the part above is cream and cropped away) sits on the foot of the wall's steps. */
const FLOOR_V0 = 0.225;
const FLOOR_H = 62;
const ThroneFloor = ({ pitch }: { pitch: number }) => {
  const tex = useCardTexture('assets/L3-floor.png');
  const floor = useMemo(() => {
    const t = tex.clone();
    t.repeat.set(1, 1 - FLOOR_V0);
    t.offset.set(0, 0);
    t.needsUpdate = true;
    return t;
  }, [tex]);
  return (
    <group position={[0, 0, WALL_Z + 0.2]} rotation={[pitch, 0, 0]}>
      <mesh position={[0, -FLOOR_H / 2, 0]} renderOrder={-80}>
        <planeGeometry args={[(FLOOR_H * 1536) / ((1 - FLOOR_V0) * 1024), FLOOR_H]} />
        <meshBasicMaterial map={floor} toneMapped={false} transparent depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
};

/** L3-rubble (1521 x 514) just behind him: a pile much taller than he is, as the room is much bigger than he is. */
const RUBBLE_W = 30;
const RUBBLE_H = (RUBBLE_W * 514) / 1521;
const Rubble = ({ frame }: { frame: number }) => {
  const rise = easeOut(prog(frame, at('s65-cut'), 8));
  return <AssetCard id="L3-rubble" standIn={{ color: NONE }} height={RUBBLE_H} width={RUBBLE_W} position={[0, RUBBLE_H / 2 - 0.5 - (1 - rise) * RUBBLE_H, -20]} renderOrder={-60} />;
};

export const Throne = ({ frame, wallPitch = 0, sky, skyZ }: { frame: number; wallPitch?: number; sky?: [number, number, number, number]; skyZ?: number }) => {
  const stage = throneStage(frame);
  const ruin = stage === 'ruin';
  const wallW = (WALL_H * 1536) / 1024;
  return (
    <>
      <Sky rect={sky} z={skyZ} />
      <group position={[0, -WALL_H * WALL_FLOOR, WALL_Z]} rotation={[wallPitch, 0, 0]}>
        <AssetCard id={ruin ? 'L3-wall-ruin' : 'L3-wall'} standIn={{ color: NONE }} height={WALL_H} width={wallW} position={[0, WALL_H / 2, 0]} renderOrder={-90} />
      </group>
      {stage === 'cracked' ? <Cracks frame={frame} wallW={wallW} /> : null}
      <Columns broken={ruin} />
      <ThroneFloor pitch={wallPitch} />
      {frame >= at('s65-cut') ? <Rubble frame={frame} /> : null}
    </>
  );
};
