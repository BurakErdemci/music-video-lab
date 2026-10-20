// The painting world (P) as part 4 shows it: an emptied cathedral in drained ivory, and Vorathul's nerfed rig inside it.
import { Rig, type RigConfig } from '../../rig/Rig.tsx';
import { VORATHUL_RIG } from '../../rig/model.ts';
import type { CameraPose } from '../../stage/Stage.tsx';
import { assetSize } from '../../cast/available.ts';
import { Asset, Card, Final } from './cards.tsx';
import { CUE } from './cues.ts';
import { DAIS_H, easeOut, prog } from './lib.ts';
import { vorathulAt } from './rigline.ts';

const IVORY = '#F4ECD8';
const PLATE = 'plates/01-tarz-cizgi-roman.jpg';

/** World units per H, as the storyboard's painting stage (helm top at y 12). */
export const UNIT = 12;
export const HERO_Z = -15;
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Drawing order: everything behind the rig is negative, the rig sits in 0-100, foreground props and pillars above. */
const RO = { wall: -100, floor: -90, dais: -60, props: 150, pillars: 160 };

/**
 * The empty drained cathedral (L4 plates): far wall pair, painted floor, the dais he sits on, fallen props, near pillars.
 * Everything faces the camera; no card edge is inside any p4 frame (the wall is 90 wide, the floor 60).
 */
export const Cathedral = ({ frame }: { frame: number }) => {
  // the helm slides in on 'win' and rocks to a stop on 'know' (S74); before that it is not there yet
  const k = easeOut(prog(frame, CUE.s74roll.frame, CUE.s74stop.frame - CUE.s74roll.frame));
  const rock = frame >= CUE.s74stop.frame ? Math.sin((frame - CUE.s74stop.frame) * 0.9) * 0.06 * Math.exp(-(frame - CUE.s74stop.frame) / 8) : (1 - k) * -0.5;
  return (
  <>
    <Final id="L4-wall-a" standIn={{ color: IVORY }} height={30} position={[-22.5, 15, -45]} renderOrder={RO.wall} />
    <Final id="L4-wall-b" standIn={{ color: IVORY }} height={30} position={[22.5, 15, -45]} renderOrder={RO.wall} />
    {assetSize('L4-floor') ? (
      <Card src="assets/L4-floor.png" width={64} height={22} position={[0, -11, -24]} renderOrder={RO.floor} />
    ) : (
      <Asset id="floor" look={{ color: '#EFE3C2' }} width={64} height={22} position={[0, -11, -24]} renderOrder={RO.floor} />
    )}
    <Final id="L4-dais" standIn={{ color: '#F4ECD8' }} height={DAIS_H} position={[0, DAIS_H / 2, -15.8]} renderOrder={RO.dais} />
    <Final id="L4-helm" standIn={{ color: '#0A0908' }} height={1.7} position={[-4.9 + (1 - k) * 8, -1.1, -9]} rotation={[0, 0, rock]} hidden={frame < CUE.s74roll.frame - 1} renderOrder={RO.props} />
    <Final id="L4-candelabra" standIn={{ color: '#0A0908' }} height={2.4} position={[-9.6, -1.5, -10]} renderOrder={RO.props} />
    <Final id="L4-banner" standIn={{ color: '#E2B33C' }} height={3.0} position={[6.2, -1.3, -9]} renderOrder={RO.props} />
    <Final id="L4-pillar" standIn={{ color: '#EADFC0' }} height={22} position={[-10.6, 4, -12]} renderOrder={RO.pillars} />
    <Final id="L4-pillar" standIn={{ color: '#EADFC0' }} height={22} position={[10.6, 4, -12]} scale={[-1, 1, 1]} renderOrder={RO.pillars} />
  </>
  );
};

export interface HeroProps {
  frame: number;
  /** World position of the root (feet) at root channel zero. */
  origin?: [number, number, number];
}

/** The nerfed Vorathul rig at its timeline pose for `frame`. */
export const Hero = ({ frame, origin = [0, 0, HERO_Z] }: HeroProps) => {
  const cfg: RigConfig = { model: VORATHUL_RIG, pass: 'beauty', unit: UNIT, origin };
  return <Rig cfg={cfg} state={vorathulAt(frame)} />;
};

export const cam = (position: [number, number, number], target: [number, number, number], fov = 40): CameraPose => ({ position, target, fov });
