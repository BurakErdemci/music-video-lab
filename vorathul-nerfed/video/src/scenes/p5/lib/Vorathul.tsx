// Vorathul on a p5 stage: the rig plus its chromatic echo copies, optional billboard pitch (camera from the
// ceiling) and an airborne spin around the hips (rig R3: the rig itself clamps lean to +-10 degrees).
import { Rig, type RigConfig } from '../../../rig/Rig.tsx';
import { VORATHUL_RIG } from '../../../rig/model.ts';
import { rigAt, type Timeline } from '../../../rig/timeline.ts';
import type { Vec3 } from '../../../stage/Card.tsx';
import { BODY, INK, IVORY, LOOK, tinted, UNIT, VIOLET } from './vorathul.ts';

export interface EchoSpec {
  copies?: number;
  /** Frames between copies. */
  delay?: number;
  /** World offset per copy (the chromatic split). */
  offset?: Vec3;
  colors?: readonly string[];
}

export interface VorathulProps {
  tl: Timeline;
  frame: number;
  /** Ground point between the feet, world units. */
  at: Vec3;
  unit?: number;
  /** Rotation about x so the front-only cards face a high camera (storyboard 2, N7). */
  pitch?: number;
  /** Whole-body roll (degrees) around a point `spinPivot` H above the feet: airborne spins. */
  spin?: number;
  spinPivot?: number;
  /** Extra uniform scale (a cut can change his size; he stays a painted giant). */
  scale?: number;
  echo?: EchoSpec;
  /** Only these rig card ids (see RigConfig.isolate). */
  isolate?: ReadonlySet<string>;
  renderBase?: number;
}

const ECHO_COLORS = [VIOLET, INK, IVORY] as const;

const cfgFor = (model: RigConfig['model'], pass: RigConfig['pass'], unit: number, renderBase: number, isolate?: ReadonlySet<string>): RigConfig => ({
  model, pass, unit, origin: [0, 0, 0], renderBase, isolate,
});

export const Vorathul = ({ tl, frame, at, unit = UNIT, pitch = 0, spin = 0, spinPivot = 0.45, scale = 1, echo, isolate, renderBase = 1000 }: VorathulProps) => {
  const st = rigAt(VORATHUL_RIG, tl, frame);
  const copies = echo ? echo.copies ?? 3 : 0;
  const pivotY = spinPivot * unit;
  const body = (
    <group position={[0, pivotY, 0]} rotation={[0, 0, (spin * Math.PI) / 180]}>
      <group position={[0, -pivotY, 0]}>
        <Rig cfg={cfgFor(LOOK === 'beauty' ? VORATHUL_RIG : BODY, LOOK === 'beauty' ? 'beauty' : 'id', unit, renderBase, isolate)} state={st} />
        {Array.from({ length: copies }, (_, i) => {
          const k = i + 1;
          const off = echo?.offset ?? [-0.35, 0.12, -0.05];
          const color = (echo?.colors ?? ECHO_COLORS)[i % (echo?.colors ?? ECHO_COLORS).length] as string;
          return (
            <group key={k} position={[off[0] * k, off[1] * k, off[2] * k]}>
              <Rig cfg={cfgFor(tinted(color), 'id', unit, renderBase - 200 * k, isolate)} state={rigAt(VORATHUL_RIG, tl, frame - k * (echo?.delay ?? 2))} />
            </group>
          );
        })}
      </group>
    </group>
  );
  return (
    <group position={at} rotation={[pitch, 0, 0]} scale={scale}>
      {body}
    </group>
  );
};
