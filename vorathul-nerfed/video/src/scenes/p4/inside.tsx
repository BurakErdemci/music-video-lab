// The painting world (P) as part 4 shows it: an emptied cathedral in drained ivory, and Vorathul's nerfed rig inside it.
import { Rig, type RigConfig } from '../../rig/Rig.tsx';
import { RIG } from '../../rig/model.ts';
import type { CameraPose } from '../../stage/Stage.tsx';
import { Asset } from './cards.tsx';
import { vorathulAt } from './rigline.ts';

const IVORY = '#F4ECD8';
const PLATE = 'plates/01-tarz-cizgi-roman.jpg';

/** World units per H, as the storyboard's painting stage (helm top at y 12). */
export const UNIT = 12;
export const HERO_Z = -15;
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Drawing order: everything behind the rig is negative, the rig sits in 0-100, foreground props above. */
const RO = { sky: -100, pillars: -95, gallery: -90, floor: -80, stepA: -70, stepB: -60, props: 150 };

/** A banner lying on the floor with its broken pole beside it; `rot` is the yaw. */
const Banner = ({ x, z, rot, len = 6 }: { x: number; z: number; rot: number; len?: number }) => (
  <group position={[x, 0.03, z]} rotation={[0, rot, 0]}>
    <Asset id="p4-flat" look={{ color: '#E2B33C' }} width={1.5} height={len} rotation={FLAT} renderOrder={RO.props} />
    <Asset id="p4-flat" look={{ color: '#0A0908' }} width={0.14} height={len + 1.4} position={[-0.95, 0.01, -0.3]} rotation={FLAT} renderOrder={RO.props + 1} />
  </group>
);

export const Cathedral = ({ banners = true }: { banners?: boolean }) => (
  <>
    {/* sky plate, swapped to ivory: the blue has drained */}
    <Asset id="G35-sky" look={{ color: IVORY }} width={300} height={170} position={[0, 30, -60]} renderOrder={RO.sky} />
    {[-14, 14, -27, 27].map((x) => (
      <Asset key={x} id="G35-pillar" look={{ color: '#EADFC0' }} width={4.2} height={80} position={[x, 24, -50]} renderOrder={RO.pillars} />
    ))}
    <Asset id="G35a" look={{ src: PLATE, crop: [0, 0.02, 0.27, 0.8] }} width={14.2} height={27.4} position={[-23.5, 13.7, -38]} renderOrder={RO.gallery} />
    <Asset id="G35b" look={{ src: PLATE, crop: [0.73, 0.02, 1, 0.8] }} width={14.2} height={27.4} position={[23.5, 13.7, -38]} renderOrder={RO.gallery} />
    <Asset id="floor" look={{ color: '#EFE3C2' }} width={160} height={70} position={[0, 0, -28]} rotation={FLAT} renderOrder={RO.floor} />
    {/* two low steps: gold edge, ivory tread (G36) */}
    <Asset id="p4-flat" look={{ color: '#E2B33C' }} width={16} height={0.55} position={[0, 0.275, -11.5]} renderOrder={RO.stepA} />
    <Asset id="p4-flat" look={{ color: '#F4ECD8' }} width={16} height={7.5} position={[0, 0.55, -15.25]} rotation={FLAT} renderOrder={RO.stepA} />
    <Asset id="p4-flat" look={{ color: '#E2B33C' }} width={12} height={0.55} position={[0, 0.825, -13.5]} renderOrder={RO.stepB} />
    <Asset id="p4-flat" look={{ color: '#F4ECD8' }} width={12} height={5.5} position={[0, 1.1, -16.25]} rotation={FLAT} renderOrder={RO.stepB} />
    {banners ? (
      <>
        <Banner x={-7.5} z={-8.5} rot={0.5} />
        <Banner x={6.8} z={-9.5} rot={-0.35} len={5} />
        <Banner x={-3.5} z={-6.5} rot={-0.2} len={4.4} />
      </>
    ) : null}
  </>
);

export interface HeroProps {
  frame: number;
  /** World position of the root (feet) at root channel zero. */
  origin?: [number, number, number];
}

/** The nerfed Vorathul rig at its timeline pose for `frame`. */
export const Hero = ({ frame, origin = [0, 0, HERO_Z] }: HeroProps) => {
  const cfg: RigConfig = { model: RIG, pass: 'beauty', unit: UNIT, origin };
  return <Rig cfg={cfg} state={vorathulAt(frame)} />;
};

export const cam = (position: [number, number, number], target: [number, number, number], fov = 40): CameraPose => ({ position, target, fov });
