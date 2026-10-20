import { AbsoluteFill, Audio, Composition, staticFile, useCurrentFrame } from 'remotion';
import { DURATION_FRAMES, FPS } from './timing.ts';
import { W, H } from './layout.ts';
import { Test30Scene } from './scenes/Test30Scene.tsx';
import { LineupScene, PartsScene } from './scenes/PartsScene.tsx';
import { CharMaskScene } from './scenes/CharMaskScene.tsx';
import { BLENDER_TEST_FRAMES, BlenderTestScene } from './scenes/BlenderTestScene.tsx';
import { CUTOUT_TEST_FRAMES, CutoutTestScene } from './scenes/CutoutTestScene.tsx';
import './style/fonts.ts';
import './style/assets.ts';

const Song = () => <Audio src={staticFile('her-sabah-bastan.wav')} />;

// The scene is built to 2:09.8 (frame 3894, events.ts CHECK_UNTIL_FRAME); past that the full composition keeps the
// last frame's state running.
const Video = ({ lOverride }: { lOverride?: number }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Test30Scene frame={frame} lOverride={lOverride} />
      <Song />
    </AbsoluteFill>
  );
};

/** Test2: 1:25 -> 2:12 (verse 2, pre-chorus 2, chorus 2 after the calendar), the song in sync. */
export const TEST2_FROM = 2550;
const Test2Video = () => {
  const frame = useCurrentFrame() + TEST2_FROM;
  return (
    <AbsoluteFill>
      <Test30Scene frame={frame} />
      <Audio src={staticFile('her-sabah-bastan.wav')} trimBefore={TEST2_FROM} />
    </AbsoluteFill>
  );
};

/** Blender character test (blender/README.md): the Blender-rendered rigs over the room plates. */
const BlenderTest = ({ bgOnly }: { bgOnly?: boolean }) => <BlenderTestScene frame={useCurrentFrame()} bgOnly={bgOnly} />;

/** 2D cut-out puppet test (blender/cutout/). */
const CutoutTest = ({ bgOnly }: { bgOnly?: boolean }) => <CutoutTestScene frame={useCurrentFrame()} bgOnly={bgOnly} />;

const Parts = () => {
  const frame = useCurrentFrame();
  return <PartsScene frame={frame} />;
};

export const Root = () => (
  <>
    <Composition id="HerSabahBastan" component={Video} durationInFrames={DURATION_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Test30" component={Video} durationInFrames={900} fps={FPS} width={W} height={H} />
    <Composition id="Test90" component={Video} durationInFrames={2700} fps={FPS} width={W} height={H} />
    <Composition id="Test2" component={Test2Video} durationInFrames={3960 - TEST2_FROM} fps={FPS} width={W} height={H} />
    <Composition id="CharMask2" component={CharMaskScene} defaultProps={{ who: 'human' as 'human' | 'ai' }} durationInFrames={3960} fps={FPS} width={W} height={H} />
    <Composition id="Lineup" component={LineupScene} durationInFrames={1} fps={FPS} width={W} height={H} />
    <Composition id="CharMask" component={CharMaskScene} defaultProps={{ who: 'human' as 'human' | 'ai' }} durationInFrames={2700} fps={FPS} width={W} height={H} />
    <Composition id="BlenderTest" component={BlenderTest} defaultProps={{ bgOnly: false }} durationInFrames={BLENDER_TEST_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="CutoutTest" component={CutoutTest} defaultProps={{ bgOnly: false }} durationInFrames={CUTOUT_TEST_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Parts" component={Parts} durationInFrames={130} fps={FPS} width={W} height={H} />
  </>
);
