import type { ComponentType } from 'react';
import { Freeze, useCurrentFrame } from 'remotion';

// Wraps an unchanged 30 fps scene for a 60 fps composition: the scene sees the fractional frame (frame60 / 2).
// Even frames equal the 30 fps frames, odd frames are true in-betweens. The scene's own <Audio> is wrong at 60 fps
// (trimBefore counts composition frames), so render with --muted; assembly lays the song separately.
export const at60 = (Scene: ComponentType): ComponentType => () => {
  const f = useCurrentFrame();
  return (
    <Freeze frame={f / 2}>
      <Scene />
    </Freeze>
  );
};
