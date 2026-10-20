// The painting's 3D card stack (everything that is not a code-drawn overlay): sky, sun, cathedral, galleries, floor,
// pillars and Vorathul's rig. Pure function of the frame.
import { Rig, type RigConfig } from '../../../rig/Rig.tsx';
import { RIG } from '../../../rig/model.ts';
import { rigAt } from '../../../rig/timeline.ts';
import { CropCard, SvgCard } from './cards.tsx';
import { cathedralSvg, pillarSvg, skySvg, sunSvg, SUN_STEPS } from './art.ts';
import { FinalCard, FinalCrop } from './finals.tsx';
import { D0, depthScale } from './space.ts';
import { VORATHUL_TL } from './vorathul.ts';

export interface World3DProps {
  frame: number;
  /** Sun bar: apparent centre y (PS units) and fill percent; null hides it. */
  sun: { y: number; fill: number } | null;
  pillars: boolean;
  /** Sky layer offset (PS units) and the black/violet variant: the S45 scream shakes only the sky. */
  skyShake?: readonly [number, number];
  skyViolet?: boolean;
  /** Draw the rig; false for a backdrop-only frame. */
  rig?: boolean;
  /** The helm tilts up (S45): the rig's head cards are hidden and the caller draws the helm from below. */
  headUp?: boolean;
}

/** Apparent x of the progress-bar sun (right of centre, clear of the health bar). */
const SUN_X = 1.7;
const PLATE = 'plates/01-tarz-cizgi-roman.jpg';
const RIG_UNIT = 6.8;
const FEET_Y = -3.95;

const RIG_CFG: RigConfig = { model: RIG, pass: 'beauty', unit: RIG_UNIT, origin: [0, FEET_Y, 0], renderBase: 100 };

const HEAD = /^(head|eye_slit|crown|crown_gems|void_head|eye_[1-7]|helm_half_[RL]|crown_half_[RL])$/;
/** Every card id of the rig except the head family (pipe cards carry generated ids, so they are listed too). */
const NO_HEAD: ReadonlySet<string> = new Set([
  ...RIG.nodes.map((n) => n.id).filter((id) => !HEAD.test(id)),
  ...['R', 'L'].flatMap((side) => Array.from({ length: 8 }, (_, i) => [`pipe_${side}${i}_body`, `pipe_${side}${i}_mouth`, `pipe_${side}${i}_glow`, `pipe_${side}${i}_cork`, `wm_${side}${i}_body`, `wm_${side}${i}_mouth`]).flat()),
]);
const RIG_NO_HEAD: RigConfig = { ...RIG_CFG, isolate: NO_HEAD };

/** A plane of the stack at depth z whose children are authored in window units (they look that size from the full-window camera). */
const Layer = ({ z, x = 0, y = 0, children }: { z: number; x?: number; y?: number; children: React.ReactNode }) => {
  const k = depthScale(z);
  return (
    <group position={[x * k, y * k, z]} scale={[k, k, 1]}>
      {children}
    </group>
  );
};

const nearestStep = (fill: number): number => SUN_STEPS.reduce((best, s) => (Math.abs(s - fill) < Math.abs(best - fill) ? s : best), SUN_STEPS[0] as number);

export const World3D = ({ frame, sun, pillars, skyShake = [0, 0], skyViolet = false, rig = true, headUp = false }: World3DProps) => {
  const state = rigAt(RIG, VORATHUL_TL, frame);
  const sunStep = sun ? nearestStep(sun.fill) : -1;
  return (
    <>
      <Layer z={-10} x={skyShake[0]} y={skyShake[1]}>
        <FinalCrop id="G01" u0={0} u1={1} v0={0.078} v1={0.922} width={16.6} height={9.4} renderOrder={0} hidden={skyViolet} standIn={<SvgCard svg={skySvg(false)} width={16.6} height={9.4} renderOrder={0} hidden={skyViolet} />} />
        <SvgCard svg={skySvg(true)} width={16.6} height={9.4} renderOrder={1} hidden={!skyViolet} />
        <FinalCard id="G02-1" height={2.4} position={[-5.6, 3.2, 0]} renderOrder={2} hidden={skyViolet} />
        <FinalCard id="G02-3" height={2.1} position={[5.9, 2.6, 0]} renderOrder={2} hidden={skyViolet} />
      </Layer>
      <Layer z={-6} x={SUN_X} y={sun?.y ?? 0}>
        {SUN_STEPS.map((s) => (
          <SvgCard key={s} svg={sunSvg(s)} width={6.2} height={2.48} renderOrder={5} hidden={!sun || s !== sunStep} />
        ))}
      </Layer>
      <Layer z={-7}>
        <FinalCard id="G03" height={7.6} position={[0, -0.1, 0]} renderOrder={10} standIn={<SvgCard svg={cathedralSvg()} width={16} height={9} renderOrder={10} />} />
      </Layer>
      <Layer z={-3.5}>
        <FinalCard id="G08-1" height={4.6} position={[-6.9, 0.9, 0]} renderOrder={12} />
        <FinalCard id="G08-3" height={4.6} position={[6.9, 0.9, 0]} renderOrder={12} />
      </Layer>
      <Layer z={-4.5}>
        <FinalCard
          id="G04a"
          height={8.2}
          position={[-5.6, 0.2, 0]}
          renderOrder={15}
          standIn={<CropCard src={PLATE} u0={0.04} u1={0.24} v0={0.078} v1={0.922} width={3.2} height={9} position={[-6.4, 0, 0]} renderOrder={15} />}
        />
        <FinalCard
          id="G04b"
          height={8.2}
          position={[5.7, 0.2, 0]}
          renderOrder={15}
          standIn={<CropCard src={PLATE} u0={0.76} u1={0.96} v0={0.078} v1={0.922} width={3.2} height={9} position={[6.4, 0, 0]} renderOrder={15} />}
        />
      </Layer>
      <Layer z={-3}>
        <FinalCrop
          id="G06"
          u0={0}
          u1={1}
          v0={0.72}
          v1={1}
          width={16.6}
          height={3}
          position={[0, -3, 0]}
          renderOrder={20}
          standIn={<CropCard src={PLATE} u0={0} u1={1} v0={0.8} v1={0.922} width={16} height={1.3} position={[0, -3.85, 0]} renderOrder={20} />}
        />
      </Layer>
      {rig ? <Rig cfg={headUp ? RIG_NO_HEAD : RIG_CFG} state={state} /> : null}
      {pillars ? (
        <>
          <FinalCrop id="G09-1" u0={0.18} u1={0.82} v0={0} v1={1} width={1} height={6} position={[-2.4, 0, 8]} renderOrder={300} standIn={<SvgCard svg={pillarSvg('L')} width={0.5} height={6} position={[-2.65, 0, 8]} renderOrder={300} />} />
          <FinalCrop id="G09-2" u0={0.18} u1={0.82} v0={0} v1={1} width={1} height={6} position={[2.4, 0, 8]} renderOrder={300} standIn={<SvgCard svg={pillarSvg('R')} width={0.5} height={6} position={[2.65, 0, 8]} renderOrder={300} />} />
        </>
      ) : null}
      <Layer z={1.5}>
        <FinalCard id="G07-1" height={2.5} position={[-6.2, -3.15, 0]} renderOrder={250} />
        <FinalCard id="G07-2" height={2.5} position={[6.2, -3.15, 0]} renderOrder={250} />
      </Layer>
    </>
  );
};

export { D0 };
