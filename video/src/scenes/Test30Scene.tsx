import { AbsoluteFill } from 'remotion';
import { CrossingFigure, Figure } from '../characters/Figure.tsx';
import { ev, evFrames } from '../events.ts';
import { AI_X, FLOOR_Y, H, MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { clamp01, lerp, onTwos, smooth } from '../math.ts';
import { STAMP_FONT } from '../style/fonts.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain, plateOffset, printIn } from '../style/screenprint.tsx';
import { TIMING } from '../timing.ts';
import { LyricLine } from '../type/LyricLine.tsx';
import { StampWord, upperTr } from '../type/StampWord.tsx';
import { Bubble } from '../world/Bubble.tsx';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { NoteFly } from '../world/Notes.tsx';
import { PlateRoom, WallNotes, WhiteRoom } from '../world/Rooms.tsx';
import { SplitMoon } from '../world/SplitMoon.tsx';

const LINE1 = (TIMING.lines[1] as { text: string }).text;
const LINE2 = (TIMING.lines[2] as { text: string }).text;

/** The human sits at the plate's desk. */
const HUMAN_DESK_X = 340;
const CURSOR = { x: SEAM_X, y: 528 };
const TITLE = 'Her Sabah Baştan';

/** A blink starts on each event frame: off for 4 frames (two 12 fps steps), then on again. */
const blinkOn = (frame: number, starts: number[]): boolean => !starts.some((s) => frame >= s && frame < s + 4);

/** Crosshair registration marks in the four corners; navy where the cream wipe has passed. */
const RegMarks = ({ front }: { front: number }) => {
  const pts = [
    [44, 44],
    [W - 44, 44],
    [44, H - 44],
    [W - 44, H - 44],
  ] as const;
  return (
    <g>
      {pts.map(([x, y], i) => {
        const ink = x < front ? palette.navy : palette.cream;
        const col = x < SEAM_X ? palette.cream : ink;
        return (
          <g key={i} stroke={col} strokeWidth={2} fill="none">
            <circle cx={x} cy={y} r={11} />
            <line x1={x - 20} x2={x + 20} y1={y} y2={y} />
            <line x1={x} x2={x} y1={y - 20} y2={y + 20} />
          </g>
        );
      })}
    </g>
  );
};

export const Test30Scene = ({ frame }: { frame: number }) => {
  const revStart = ev('room.reveal.start').frame;
  const revEnd = ev('room.reveal.end').frame;
  const reveal = clamp01((frame - revStart) / (revEnd - revStart));
  const e = smooth(reveal);
  const settled = frame >= revEnd;
  const front = SEAM_X + (W - SEAM_X) * e;

  // ---- intro print plates
  const fCursor = ev('intro.cursor').frame;
  const fWake = ev('intro.cursor.wake').frame;
  const fMoon = ev('intro.moon').frame;
  const fSeam = ev('intro.seam').frame;
  const fSeamEnd = ev('intro.seam.end').frame;
  const fTitle = ev('intro.title').frame;
  const fTitleFade = ev('intro.title.fade').frame;
  const fRoom = ev('intro.room').frame;
  const fInk = ev('intro.room.ink').frame;
  const fMoonWin = ev('intro.moonwin').frame;
  const fNotes = ev('intro.notes').frame;
  const fHuman = ev('intro.human').frame;
  const fAi = ev('intro.ai').frame;

  const ohFrames = [ev('intro.oh1').frame, ev('intro.oh2').frame];
  const introBlink = evFrames('intro.blink.');
  const cursorPrint = printIn(frame, fCursor, 'cursor');
  const cursorOn = frame >= fCursor && frame < fAi && blinkOn(frame, introBlink);
  const cursorH = frame < fWake ? 44 : 104;

  const seamP = frame < fSeam ? 0 : clamp01((onTwos(frame) - onTwos(fSeam)) / (fSeamEnd - fSeam));
  const moonPrint = printIn(frame, fMoon, 'crescent');

  const keyPrint = printIn(frame, fRoom, 'room-key');
  const inkPrint = printIn(frame, fInk, 'room-ink');
  const keyLayer = keyPrint && { dx: inkPrint ? inkPrint.dx : keyPrint.dx, dy: inkPrint ? inkPrint.dy : keyPrint.dy, op: frame < fInk ? 0.55 * keyPrint.op : 1 };
  const moonLayer = printIn(frame, fMoonWin, 'room-moon');
  const notesLayer = printIn(frame, fNotes, 'room-notes');
  const humanPrint = printIn(frame, fHuman, 'human');
  const aiPrint = printIn(frame, fAi, 'ai');

  const titleFade = frame < fTitleFade ? 1 : 1 - clamp01((onTwos(frame) - fTitleFade) / (fRoom - fTitleFade));
  const titleStep = Math.floor(onTwos(frame - fTitle) / 2);
  const titleScale = [1.15, 1.1, 1.05][titleStep] ?? 1;
  const titleOff = plateOffset('title');

  // ---- verse
  const hold = onTwos(frame);
  const aiBob = Math.round(Math.sin(hold * 0.11 + 1.7) * 2);
  const aiBlink = frame >= ev('ai.blink.imlec').frame && frame < ev('ai.blink.imlec').frame + 4;

  const wallFrames = evFrames('wall.');
  const wallCount = wallFrames.filter((f) => f <= frame).length;
  const lastWall = wallFrames.filter((f) => f <= frame).pop();
  const popAge = lastWall === undefined ? 9 : Math.floor((onTwos(frame) - onTwos(lastWall)) / 2);

  const note1 = { fly: ev('note1.fly').frame, land: ev('note1.land').frame };
  const note2 = { fly: ev('note2.fly').frame, land: ev('note2.land').frame };
  const handFrom = { x: HUMAN_DESK_X + 130, y: 700 };

  const aiBg = 'cream' as const;
  const headY = FLOOR_Y - 670 + 40;

  return (
    <AbsoluteFill style={{ background: palette.navy }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={W} height={H} fill={palette.navy} />

        {/* left room: key plate, then the yellow plates, then the code notes */}
        <PlateRoom key1={keyLayer} moon={moonLayer} notes={notesLayer} />
        {wallCount > 0 && <WallNotes count={wallCount} popAge={popAge} />}

        {/* right room: the cream wipes open from the glass; its edge is exact, nothing overshoots */}
        {reveal > 0 && (
          <>
            <clipPath id="reveal-clip">
              <rect x={SEAM_X} y={0} width={Math.max(0, front - SEAM_X)} height={H} />
            </clipPath>
            <g clipPath="url(#reveal-clip)">
              <WhiteRoom />
            </g>
          </>
        )}

        {moonPrint && (
          <g transform={`translate(${reveal > 0 ? 0 : moonPrint.dx} ${reveal > 0 ? 0 : moonPrint.dy})`} opacity={reveal > 0 ? 1 : moonPrint.op}>
            <SplitMoon cx={lerp(1710, SEAM_X, e)} cy={lerp(145, MOON_SEAM_Y, e)} r={lerp(100, MOON_R, e)} phase={lerp(0.2, 0.82, e)} split={settled} />
          </g>
        )}

        {seamP > 0 && <GlassSeam bottom={H * seamP} />}

        {humanPrint && (
          <g transform={`translate(${humanPrint.dx} ${humanPrint.dy})`}>
            <Figure pose="h06" x={HUMAN_DESK_X} y={FLOOR_Y} opacity={humanPrint.op} />
          </g>
        )}
        {aiPrint && (
          <g transform={`translate(${aiPrint.dx} ${aiPrint.dy})`}>
            <CrossingFigure uid="ai" pose="a01" x={AI_X} y={FLOOR_Y + aiBob} seamX={front} leftBg={aiBg} rightBg="navy" opacity={aiPrint.op} blink={aiBlink} />
          </g>
        )}

        <NoteFly frame={frame} startFrame={note1.fly} duration={note1.land - note1.fly} from={handFrom} to={{ x: 1560, y: 330 }} seed="n1" />
        <NoteFly frame={frame} startFrame={note2.fly} duration={note2.land - note2.fly} from={handFrom} to={{ x: 1690, y: 470 }} seed="n2" arc={120} />

        {/* intro: the cursor on the seam, the oh rings, the registration marks */}
        {cursorOn && cursorPrint && (
          <rect x={CURSOR.x - 5 + cursorPrint.dx * 0.3} y={CURSOR.y - cursorH / 2} width={10} height={cursorH} fill={palette.cream} opacity={cursorPrint.op} />
        )}
        {ohFrames.map((f, i) => {
          const step = Math.floor((onTwos(frame) - onTwos(f)) / 2);
          if (frame < f || step > 3) return null;
          return <circle key={i} cx={CURSOR.x} cy={CURSOR.y} r={[34, 74, 124, 180][step]} fill="none" stroke={palette.cream} strokeWidth={4} opacity={[1, 0.8, 0.5, 0.25][step]} />;
        })}
        {frame >= fRoom && frame < revEnd && <RegMarks front={front} />}

        {/* the AI's "Merhaba" on the AI side, tail at its head (never over the human) */}
        <Bubble frame={frame} startFrame={ev('intro.bubble').frame} endFrame={revEnd} x={AI_X + 22} y={headY + 20} text={frame < ev('intro.bubble.text').frame ? '...' : 'Merhaba'} />
        <Bubble frame={frame} startFrame={ev('bubble.merhaba').frame} x={AI_X + 22} y={headY + 20} />
      </svg>

      {/* title plate: bar 4, cream, fades by bar 5 */}
      {frame >= fTitle && titleFade > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 300, width: W, textAlign: 'center', opacity: titleFade, transform: `scale(${titleScale})`, fontFamily: STAMP_FONT, fontSize: 176, letterSpacing: '0.03em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
          <div style={{ position: 'absolute', left: 0, width: W, color: palette.moonYellow, transform: `translate(${titleOff.dx * 2}px, ${titleOff.dy * 2}px)` }}>{upperTr(TITLE)}</div>
          <div style={{ position: 'relative', color: palette.cream }}>{upperTr(TITLE)}</div>
        </div>
      )}

      <LyricLine frame={frame} startFrame={ev('line1.show').frame} endFrame={ev('line1.hide').frame} text={LINE1} side="left" y={48} size={26} />
      <LyricLine frame={frame} startFrame={ev('line2.show').frame} endFrame={ev('line2.hide').frame} text={LINE2} side="left" y={48} size={26} />
      <StampWord frame={frame} startFrame={ev('stamp.imlec').frame} endFrame={ev('line1.hide').frame} text="imleç" x={588} y={490} size={104} width={340} />
      <StampWord frame={frame} startFrame={ev('stamp.merhaba').frame} endFrame={ev('line2.hide').frame} text="merhaba" x={588} y={490} size={104} width={340} />

      <PaperGrain frame={frame} />
    </AbsoluteFill>
  );
};
