// Preview compositions for the docs/rig.md section 6 tests. 1920x1080 at 30 fps; the figure is 900 px tall on #808080 (beauty)
// or transparent (id pass: every card a flat unique colour, alpha = silhouette).
import { AbsoluteFill, Composition, useCurrentFrame } from 'remotion';
import { fitDistance, Stage, type CameraPath } from '../stage/Stage.tsx';
import { FRAME_H, FRAME_W, FRAME_WORLD_HEIGHT, WORLD_UNIT } from './constants.ts';
import { RIG, RIG_DRAWN } from './model.ts';
import { Rig, type RigConfig } from './Rig.tsx';
import { RIG_TESTS, sweepList, sweepState, TEST_BY_ID } from './tests.ts';
import { rigAt } from './timeline.ts';

export type Pass = 'beauty' | 'id';
export type Art = 'placeholder' | 'drawn';
export interface ShotProps { pass: Pass; [k: string]: unknown }

const DIST = fitDistance(FRAME_WORLD_HEIGHT);
const yawCamera = (yawDeg: number): CameraPath => () => {
  const y = (yawDeg * Math.PI) / 180;
  return { position: [DIST * Math.sin(y), 0, DIST * Math.cos(y)], target: [0, 0, 0] };
};

const config = (pass: Pass, isolate?: ReadonlySet<string>, art: Art = 'placeholder'): RigConfig => ({
  model: art === 'drawn' ? RIG_DRAWN : RIG, pass, unit: WORLD_UNIT, origin: [0, -WORLD_UNIT / 2, 0], isolate,
});

const Frame = ({ pass, yaw, children }: { pass: Pass; yaw: number; children: React.ReactNode }) => (
  <AbsoluteFill style={pass === 'beauty' ? { background: '#808080' } : undefined}>
    <Stage camera={yawCamera(yaw)}>{children}</Stage>
  </AbsoluteFill>
);

const TestShot = ({ testId, pass, art = 'placeholder' }: { testId: string; pass: Pass; art?: Art }) => {
  const frame = useCurrentFrame();
  const t = TEST_BY_ID.get(testId)!;
  const st = rigAt(art === 'drawn' ? RIG_DRAWN : RIG, t.tl, t.offset + frame);
  return (
    <Frame pass={pass} yaw={t.yaw ? t.yaw(frame) : 0}>
      <Rig cfg={config(pass, undefined, art)} state={st} />
    </Frame>
  );
};

const SWEEP = sweepList(RIG);
const SweepShot = ({ pass }: { pass: Pass }) => {
  const frame = useCurrentFrame();
  const e = SWEEP[Math.min(frame, SWEEP.length - 1)]!;
  return (
    <Frame pass={pass} yaw={0}>
      <Rig cfg={config(pass, new Set(e.isolate))} state={sweepState(RIG, e)} />
    </Frame>
  );
};

export const RigRoot = () => (
  <>
    {RIG_TESTS.map((t) => (
      <Composition
        key={t.id} id={t.id} component={TestShot as never} durationInFrames={t.frames} fps={30} width={FRAME_W} height={FRAME_H}
        defaultProps={{ testId: t.id, pass: 'beauty' as Pass }}
      />
    ))}
    {RIG_TESTS.filter((t) => t.id === 'RigTurntable' || t.id === 'AttackGallery' || t.id === 'RigPipes' || t.id === 'RigHelm').map((t) => (
      <Composition
        key={`${t.id}Drawn`} id={`${t.id}Drawn`} component={TestShot as never} durationInFrames={t.frames} fps={30} width={FRAME_W} height={FRAME_H}
        defaultProps={{ testId: t.id, pass: 'beauty' as Pass, art: 'drawn' as Art }}
      />
    ))}
    <Composition id="RigSweep" component={SweepShot as never} durationInFrames={SWEEP.length} fps={30} width={FRAME_W} height={FRAME_H} defaultProps={{ pass: 'id' as Pass }} />
  </>
);
