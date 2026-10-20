import { AbsoluteFill, Audio, Composition, staticFile } from 'remotion';
import { Film } from './film/Film.tsx';
import { DURATION_FRAMES, FPS } from './timing.ts';
import { SkeletonScene } from './SkeletonScene.tsx';

const W = 1920;
const H = 1080;

const Video = () => (
  <AbsoluteFill>
    <Film />
    <Audio src={staticFile('audio/song.wav')} />
  </AbsoluteFill>
);

const Skeleton = () => (
  <AbsoluteFill>
    <SkeletonScene />
    <Audio src={staticFile('audio/song.wav')} />
  </AbsoluteFill>
);

export const Root = () => (
  <>
    <Composition id="Nerfed" component={Video} durationInFrames={DURATION_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Test30" component={Skeleton} durationInFrames={30 * FPS} fps={FPS} width={W} height={H} />
  </>
);
