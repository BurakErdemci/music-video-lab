import React from 'react';
import { type BoxProps, C, easeInOut, lerp, MONO_FONT, numFrame, prog, Scaled, UI_FONT } from './theme.tsx';

export interface VideoTimelineProps extends BoxProps {
  frame: number;
  /** Playhead position as a fraction of the whole video. */
  progressFrom?: number;
  progressTo: number;
  startFrame: number;
  durationFrames: number;
  /** Whole video length in seconds (7:00 = 420). */
  totalSeconds?: number;
  /** From this frame on the "x16" fast-forward badge shows. */
  ffAt?: number;
  ffLabel?: string;
  /** Hold-to-skip ring: starts filling at holdAt and is full after holdFrames. */
  holdAt?: number;
  holdFrames?: number;
}

const W = 1500;
const H = 130;
const TRACK_X = 420;
const TRACK_W = 520;

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  frame,
  progressFrom = 0,
  progressTo,
  startFrame,
  durationFrames,
  totalSeconds = 420,
  ffAt,
  ffLabel = 'x16',
  holdAt,
  holdFrames = 30,
  ...box
}) => {
  const end = startFrame + durationFrames;
  const at = (f: number) => lerp(progressFrom, progressTo, easeInOut(prog(f, startFrame, durationFrames)));
  const p = at(frame);
  // The clock text only changes 3 times a second.
  const shown = at(numFrame(frame, end));
  const x = TRACK_X + p * TRACK_W;
  const ff = ffAt !== undefined && frame >= ffAt;
  const hold = holdAt === undefined ? 0 : prog(frame, holdAt, holdFrames);
  const RING_R = 40;
  const circ = 2 * Math.PI * RING_R;
  return (
    <Scaled {...box} designW={W} designH={H}>
      <div style={{ position: 'relative', width: W, height: H, boxSizing: 'border-box', borderRadius: 28, background: C.ink, fontFamily: UI_FONT }}>
        <svg width={70} height={H} viewBox={`0 0 70 ${H}`} style={{ position: 'absolute', left: 30, top: 0 }}>
          <path d="M14 38 L50 65 L14 92 Z" fill={C.white} />
        </svg>
        <div style={{ position: 'absolute', left: 110, top: 0, height: H, display: 'flex', alignItems: 'center', fontFamily: MONO_FONT, fontWeight: 500, fontSize: 40, color: C.white, whiteSpace: 'pre' }}>
          {`${mmss(shown * totalSeconds)} / ${mmss(totalSeconds)}`}
        </div>
        <div style={{ position: 'absolute', left: TRACK_X, top: H / 2 - 7, width: TRACK_W, height: 14, borderRadius: 7, background: C.slate }} />
        <div style={{ position: 'absolute', left: TRACK_X, top: H / 2 - 7, width: p * TRACK_W, height: 14, borderRadius: 7, background: C.blue }} />
        <div style={{ position: 'absolute', left: x - 12, top: H / 2 - 24, width: 24, height: 48, borderRadius: 8, background: C.white }} />
        {ff ? (
          <div style={{ position: 'absolute', left: 975, top: 30, height: 70, padding: '0 22px', borderRadius: 35, background: C.blue, display: 'flex', alignItems: 'center', gap: 12, color: C.white, fontFamily: MONO_FONT, fontWeight: 500, fontSize: 38 }}>
            <svg width={56} height={34} viewBox="0 0 56 34"><path d="M2 2 L26 17 L2 32 Z M30 2 L54 17 L30 32 Z" fill={C.white} /></svg>
            {ffLabel}
          </div>
        ) : null}
        {holdAt !== undefined && frame >= holdAt - 6 ? (
          <div style={{ position: 'absolute', right: 34, top: 0, height: H, display: 'flex', alignItems: 'center', gap: 16, color: C.white, fontFamily: MONO_FONT, fontWeight: 500, fontSize: 22 }}>
            <span>HOLD TO SKIP</span>
            <svg width={100} height={100} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={RING_R} fill="none" stroke={C.slate} strokeWidth={9} />
              <circle cx={50} cy={50} r={RING_R} fill="none" stroke={C.blue} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${circ * hold} ${circ}`} transform="rotate(-90 50 50)" />
            </svg>
          </div>
        ) : null}
      </div>
    </Scaled>
  );
};
