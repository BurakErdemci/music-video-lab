import { AbsoluteFill, Audio, Composition, staticFile, useCurrentFrame } from 'remotion';
import { DURATION_FRAMES, FPS } from './timing.ts';
import { W, H } from './layout.ts';
import { Test30Scene } from './scenes/Test30Scene.tsx';
import { LineupScene, PartsScene } from './scenes/PartsScene.tsx';
import { CharMaskScene } from './scenes/CharMaskScene.tsx';
import './style/fonts.ts';
import './style/assets.ts';

const Song = () => <Audio src={staticFile('her-sabah-bastan.wav')} />;

// The scene is built to 1:28.7 (frame 2661); past that the full composition keeps the last frame's state
// running (no events are scheduled after CHECK_UNTIL_FRAME).
const Video = ({ lOverride }: { lOverride?: number }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Test30Scene frame={frame} lOverride={lOverride} />
      <Song />
    </AbsoluteFill>
  );
};

const Parts = () => {
  const frame = useCurrentFrame();
  return <PartsScene frame={frame} />;
};

export const Root = () => (
  <>
    <Composition id="HerSabahBastan" component={Video} durationInFrames={DURATION_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Test30" component={Video} durationInFrames={900} fps={FPS} width={W} height={H} />
    <Composition id="Test90" component={Video} durationInFrames={2700} fps={FPS} width={W} height={H} />
    <Composition id="Lineup" component={LineupScene} durationInFrames={1} fps={FPS} width={W} height={H} />
    <Composition id="CharMask" component={CharMaskScene} defaultProps={{ who: 'human' as 'human' | 'ai' }} durationInFrames={2700} fps={FPS} width={W} height={H} />
    <Composition id="Parts" component={Parts} durationInFrames={130} fps={FPS} width={W} height={H} />
  </>
);
