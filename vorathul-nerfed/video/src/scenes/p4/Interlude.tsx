// S74, S75 and S77: the empty cathedral, the spawn rings, and the turn back to the canvas.
import { AbsoluteFill } from 'remotion';
import { push } from '../../camera/moves.ts';
import { Stage, type CameraPath } from '../../stage/Stage.tsx';
import { UiFonts } from '../../ui/kit.ts';
import { CUE } from './cues.ts';
import { cam, Cathedral, Hero } from './inside.tsx';
import { SLOW_EASE } from './lib.ts';
import { DustLayer, DustMotes, FloorGlints, SpawnRings } from './fx.tsx';

const DRAIN = 'none';

/** S74 02:51.33: WIDE, slow push (never still, about 20 % closer by the cut). The galleries are empty, the sky has drained to ivory, he sits alone on the steps. */
export const S74 = ({ frame }: { frame: number }) => {
  const start = CUE.s74cut.frame;
  const path: CameraPath = push(cam([0, 4.6, 6], [0, 5.6, -15]), { start, frames: CUE.s75cut.frame - start, distance: 4.2, ease: SLOW_EASE });
  return (
    <AbsoluteFill style={{ background: '#F4ECD8' }}>
      <AbsoluteFill style={{ filter: DRAIN }}>
        <Stage camera={path}>
          <Cathedral frame={frame} />
          <Hero frame={frame} />
        </Stage>
      </AbsoluteFill>
      <DustLayer frame={frame} />
      <DustMotes frame={frame} start={CUE.s74motes.frame} gust={CUE.s74drift.frame} />
    </AbsoluteFill>
  );
};

const S75_CAM = cam([0, 2.6, -2.5], [0, 4.6, -15]);

/** S75 02:56.93: hero height, facing him. Where the heroes always stood, four faint spawn rings fade in, one per word. */
export const S75 = ({ frame }: { frame: number }) => {
  const start = CUE.s75cut.frame;
  const path: CameraPath = push(S75_CAM, { start, frames: 156, distance: 1.4 });
  const pose = path(frame);
  const glints: [number, number][] = [[480, 780], [1310, 700], [900, 960], [1590, 880], [260, 640]];
  return (
    <AbsoluteFill style={{ background: '#F4ECD8' }}>
      <UiFonts />
      <AbsoluteFill style={{ filter: DRAIN }}>
        <Stage camera={path}>
          <Cathedral frame={frame} />
          <Hero frame={frame} />
        </Stage>
      </AbsoluteFill>
      <DustLayer frame={frame} />
      <FloorGlints frame={frame} start={CUE.s75glint.frame} points={glints} />
      <SpawnRings
        frame={frame}
        pose={pose}
        outlineAt={CUE.s75ring.frame}
        pulseAt={CUE.s75pulse.frame}
        rings={[
          { x: -4.6, z: -9.6, label: 'P1', fillAt: CUE.s75p1.frame },
          { x: -1.55, z: -10.6, label: 'P2', fillAt: CUE.s75p2.frame },
          { x: 1.55, z: -10.6, label: 'P3', fillAt: CUE.s75p3.frame },
          { x: 4.6, z: -9.6, label: 'P4', fillAt: CUE.s75p4.frame },
        ]}
      />
    </AbsoluteFill>
  );
};

