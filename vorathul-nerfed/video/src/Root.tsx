import { AbsoluteFill, Audio, Composition, Freeze, staticFile, useCurrentFrame } from 'remotion';
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

/** Frames of the 60 fps composition per scene-clock frame. */
const SCALE_60 = 60 / FPS;

// The same film at 60 fps: the scene clock stays in 30-fps units and only becomes fractional (frame60 / 2),
// so even frames equal Nerfed's frames and odd frames are true in-betweens. No <Audio> here: render with
// --muted and mux the song afterwards (tools/render_film.py --song), as audio inside a fractional clock is
// offset wrongly at 60 fps (Her Sabah Baştan, living/fps60/At60.tsx).
const Video60 = () => {
  const frame = useCurrentFrame();
  return (
    <Freeze frame={frame / SCALE_60}>
      <AbsoluteFill>
        <Film />
      </AbsoluteFill>
    </Freeze>
  );
};

const Skeleton = () => (
  <AbsoluteFill>
    <SkeletonScene />
    <Audio src={staticFile('audio/song.wav')} />
  </AbsoluteFill>
);

export const Root = () => (
  <>
    <Composition id="Nerfed" component={Video} durationInFrames={DURATION_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Nerfed60" component={Video60} durationInFrames={DURATION_FRAMES * SCALE_60} fps={FPS * SCALE_60} width={W} height={H} />
    <Composition id="Test30" component={Skeleton} durationInFrames={30 * FPS} fps={FPS} width={W} height={H} />
  </>
);
