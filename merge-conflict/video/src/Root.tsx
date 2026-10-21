import { AbsoluteFill, Audio, Composition, staticFile } from 'remotion';
import { Film } from './Film.tsx';
import { Lab, LAB_FRAMES } from './lab/Lab.tsx';
import { DURATION_FRAMES, FPS } from './timing.ts';

const W = 1920;
const H = 1080;
const SMOKE_FRAMES = 240;

const Video = () => (
  <AbsoluteFill>
    <Film />
    <Audio src={staticFile('audio/merge-conflict-v4.wav')} />
  </AbsoluteFill>
);

export const Root = () => (
  <>
    <Composition id="MC60" component={Video} durationInFrames={DURATION_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Smoke" component={Video} durationInFrames={SMOKE_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Lab" component={Lab} durationInFrames={LAB_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
