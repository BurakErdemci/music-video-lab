import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { SHOTS as P1 } from '../scenes/p1/index.ts';
import { SHOTS as P2 } from '../scenes/p2/index.ts';
import { SHOTS as P3 } from '../scenes/p3/index.ts';
import { SHOTS as P4 } from '../scenes/p4/index.ts';
import { SHOTS as P5 } from '../scenes/p5/index.ts';
import { FPS } from '../timing.ts';
import type { Shot } from './shot.ts';
import { TypeLayer } from './typography/TypeLayer.tsx';

export const SHOTS: Shot[] = [...P1, ...P2, ...P3, ...P4, ...P5].sort((a, b) => a.from - b.from);

// Overlapping shots would mount two ThreeCanvases on one frame (a second canvas renders black in parallel renders).
for (let i = 1; i < SHOTS.length; i++) {
  const a = SHOTS[i - 1] as Shot;
  const b = SHOTS[i] as Shot;
  if (b.from < a.to) throw new Error(`shots overlap: ${a.id} [${a.from},${a.to}) and ${b.id} [${b.from},${b.to})`);
}

/** The whole film: exactly one shot is mounted per frame (frames no shot covers yet stay black), with the
 *  typography layer (docs/typography.md) above it. */
export const Film = () => {
  const frame = useCurrentFrame();
  // Scene clock: Nerfed60 feeds frame60 / 2 through <Freeze>, so frames are 30-fps units in both compositions
  // and the composition fps (60 there) must not be used to convert them to seconds.
  const fps = FPS;
  const shot = SHOTS.find((s) => frame >= s.from && frame < s.to);
  return (
    <AbsoluteFill>
      {shot ? <shot.Component frame={frame} /> : <AbsoluteFill style={{ background: '#000' }} />}
      <TypeLayer frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
