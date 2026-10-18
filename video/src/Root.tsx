import { AbsoluteFill, Audio, Composition, staticFile, useCurrentFrame } from 'remotion';
import { DURATION_FRAMES, FPS } from './timing.ts';
import { W, H } from './layout.ts';
import { Test30Scene } from './scenes/Test30Scene.tsx';
import { PartsScene } from './scenes/PartsScene.tsx';
import './style/fonts.ts';

const Song = () => <Audio src={staticFile('her-sabah-bastan.wav')} />;

// Scenes after 0:30 are not built yet: the full composition keeps the last test frame's
// structure running (no events are scheduled past frame 900).
const Video = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Test30Scene frame={frame} />
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
    <Composition id="Parts" component={Parts} durationInFrames={90} fps={FPS} width={W} height={H} />
  </>
);
