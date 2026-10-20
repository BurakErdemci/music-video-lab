import { Freeze, useCurrentFrame } from 'remotion';
import { Part3Scene } from '../part3/Part3Scene.tsx';

// 60 fps test wrapper: the unchanged 30 fps scene sees the fractional frame (frame60 / 2).
// Its own <Audio> is wrong at 60 fps (trimBefore is in comp frames); the test mux replaces the audio track.
export const PART3_AT60_FRAMES = 600;
export const Part3At60 = () => {
  const f = useCurrentFrame();
  return (
    <Freeze frame={f / 2}>
      <Part3Scene />
    </Freeze>
  );
};
