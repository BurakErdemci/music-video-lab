// A window onto the painting world, for the office shots: the same throne room and Vorathul as the painting shots, in the
// crumble stage of the film frame. The window is the one Stage of its shot, drawn at full frame size and scaled into the box.
import type { CSSProperties } from 'react';
import { Img, staticFile } from 'remotion';
import { frameAt, hold } from '../../camera/api.ts';
import { Stage } from '../../stage/Stage.tsx';
import { Throne } from './Throne.tsx';
import { nerfTimeline, SCALE_B, stateAt, Vorathul, type Place } from './nerf.tsx';

/** Medium-wide on the stage: his feet near the bottom, the throne above him. */
const CAM = hold(frameAt([0, 4.0, -15], 15));
const PLACE: Place = { pos: [0, 0, -15], scale: SCALE_B };
const TL = {
  conduct: nerfTimeline([{ at: 0, pose: 'conduct_wide', dur: 0, cut: true }], { phase: 'deleted', slit: [{ at: 0, value: 'lit' }], slitOpacity: 0.8 }),
  slump: nerfTimeline([{ at: 0, pose: 'slump', dur: 0, cut: true }], { phase: 'deleted', slitOpacity: 0.4 }),
};

export const PaintingWindow = ({ frame, x, y, w, h, mood }: { frame: number; x: number; y: number; w: number; h: number; mood: 'conduct' | 'slump' }) => {
  const sc = h / 1080;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', background: '#0A0A0A' }}>
      <div style={{ position: 'absolute', left: (w - 1920 * sc) / 2, top: 0, width: 1920, height: 1080, transform: `scale(${sc})`, transformOrigin: '0 0' }}>
        <Stage camera={CAM}>
          <Throne frame={frame} />
          <Vorathul st={stateAt(TL[mood], frame)} place={PLACE} />
        </Stage>
      </div>
    </div>
  );
};

/** The throne room as a flat picture, for windows too small to carry a stage (the office monitors). */
export const FlatPainting = ({ style }: { style?: CSSProperties }) => (
  <Img src={staticFile('assets/L3-wall.png')} style={{ objectFit: 'cover', objectPosition: '50% 72%', ...style }} />
);
