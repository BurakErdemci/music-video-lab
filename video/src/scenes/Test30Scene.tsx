import { AbsoluteFill } from 'remotion';
import { CrossingFigure, PoseFigure, poseBox } from '../characters/Figure.tsx';
import { ev, evFrames } from '../events.ts';
import { AI_X, FLOOR_Y, H, MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { onTwos } from '../math.ts';
import { Halftone, Squeegee } from '../motion/entranceViews.tsx';
import { blinkAlpha, dotP, ENTER_FRAMES, wipeP } from '../motion/entrances.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { TIMING } from '../timing.ts';
import { LyricLine } from '../type/LyricLine.tsx';
import { StampWord } from '../type/StampWord.tsx';
import { Bubble } from '../world/Bubble.tsx';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { NoteFly } from '../world/Notes.tsx';
import { PlateRoom, WallNotes } from '../world/Rooms.tsx';
import { SplitMoon } from '../world/SplitMoon.tsx';
import { ZoomIntro } from './ZoomIntro.tsx';

const LINE1 = (TIMING.lines[1] as { text: string }).text;
const LINE2 = (TIMING.lines[2] as { text: string }).text;

/** Pose h06 carries its own desk: it stands where the old plate's desk was, chair and desk legs on the plate floor. */
const HUMAN_X = 278;
const HUMAN_FLOOR = 1000;
/** Soft edge of the navy room's squeegee, in px. */
const NAVY_SOFT_X = 140;

const pad = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x - 12, y: b.y - 12, w: b.w + 24, h: b.h + 24 });

export const Test30Scene = ({ frame, lOverride }: { frame: number; lOverride?: number }) => {
  // bars 1-8: the zoom; from the bar 9 downbeat the room is printed over the flat cream frame
  if (frame < ev('room.seam').frame) {
    return (
      <AbsoluteFill style={{ background: palette.cream }}>
        <ZoomIntro frame={frame} lOverride={lOverride} />
        <PaperGrain frame={frame} />
      </AbsoluteFill>
    );
  }
  const enterFrames = (id: string): number => ev(id).enter.frames;
  const navyP = wipeP(frame, ev('room.navy').frame, enterFrames('room.navy'));
  const seamP = wipeP(frame, ev('room.seam').frame, enterFrames('room.seam'));
  const moonP = wipeP(frame, ev('room.moon').frame, enterFrames('room.moon'));
  const yellowP = wipeP(frame, ev('room.yellow').frame, enterFrames('room.yellow'));
  const notesP = wipeP(frame, ev('room.notes').frame, enterFrames('room.notes'));
  const humanP = dotP(frame, ev('room.human').frame, enterFrames('room.human'));
  const aiP = dotP(frame, ev('room.ai').frame, enterFrames('room.ai'));

  // ---- verse
  const hold = onTwos(frame);
  const aiBob = Math.round(Math.sin(hold * 0.11 + 1.7) * 2);
  const aiBlink = 1 - blinkAlpha(frame, [ev('ai.blink.imlec').frame]);

  const wallFrames = evFrames('wall.');

  const note1 = { fly: ev('note1.fly').frame, land: ev('note1.land').frame };
  const note2 = { fly: ev('note2.fly').frame, land: ev('note2.land').frame };
  const handFrom = { x: HUMAN_X + 70, y: HUMAN_FLOOR - 280 };

  const headY = FLOOR_Y - 670 + 40;
  const aiY = FLOOR_Y + aiBob;

  return (
    <AbsoluteFill style={{ background: palette.cream }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        {/* right room: the flat cream the zoom ended on, with its floor line */}
        <rect width={W} height={H} fill={palette.cream} />
        <rect x={SEAM_X} y={FLOOR_Y - 1} width={W - SEAM_X} height={4} fill={palette.navy} />

        {/* left room: the navy plates are squeegeed in from the left edge towards the glass */}
        <Squeegee id="sq-navy" p={navyP} axis="x" from={0} to={SEAM_X} soft={NAVY_SOFT_X}>
          <PlateRoom key1={{ p: 1 }} moon={{ p: yellowP }} notes={{ p: notesP }} />
          <WallNotes frame={frame} starts={wallFrames} frames={ENTER_FRAMES.drift} />
        </Squeegee>

        {moonP > 0 && (
          <Squeegee id="sq-crescent" p={moonP} from={20} to={270} soft={80} reg="crescent" regAmp={14}>
            <SplitMoon cx={SEAM_X} cy={MOON_SEAM_Y} r={MOON_R} phase={0.82} split />
          </Squeegee>
        )}

        {seamP > 0 && (
          <Squeegee id="sq-seam" p={seamP} from={0} to={H} soft={140}>
            <GlassSeam />
          </Squeegee>
        )}

        {humanP > 0 && (
          <Halftone
            id="ht-human"
            p={humanP}
            box={pad(poseBox('h06', HUMAN_X, HUMAN_FLOOR))}
            seed="human"
            reg="human"
            proof={<CrossingFigure uid="human-proof" pose="h06" x={HUMAN_X} y={HUMAN_FLOOR} leftBg="cream" rightBg="cream" />}
          >
            <PoseFigure uid="human" frame={frame} keys={[[0, 'h06']]} x={HUMAN_X} y={HUMAN_FLOOR} />
          </Halftone>
        )}
        {aiP > 0 && (
          <Halftone id="ht-ai" p={aiP} box={pad(poseBox('a01', AI_X, aiY))} seed="ai" reg="ai">
            <PoseFigure uid="ai" frame={frame} keys={[[0, 'a01']]} x={AI_X} y={aiY} blink={aiBlink} />
          </Halftone>
        )}

        <NoteFly frame={frame} startFrame={note1.fly} duration={note1.land - note1.fly} from={handFrom} to={{ x: 1560, y: 330 }} seed="n1" settle={enterFrames('note1.land')} />
        <NoteFly frame={frame} startFrame={note2.fly} duration={note2.land - note2.fly} from={handFrom} to={{ x: 1690, y: 470 }} seed="n2" arc={120} settle={enterFrames('note2.land')} />

        {/* the AI's "Merhaba" on the AI side, tail at its head (never over the human) */}
        <Bubble frame={frame} startFrame={ev('bubble.merhaba').frame} frames={enterFrames('bubble.merhaba')} x={AI_X + 22} y={headY + 20} />
      </svg>

      <LyricLine frame={frame} startFrame={ev('line1.show').frame} endFrame={ev('line1.hide').frame} text={LINE1} side="left" y={48} size={26} />
      <LyricLine frame={frame} startFrame={ev('line2.show').frame} endFrame={ev('line2.hide').frame} text={LINE2} side="left" y={48} size={26} />
      <StampWord frame={frame} startFrame={ev('stamp.imlec').frame} endFrame={ev('line1.hide').frame} text="imleç" x={588} y={490} size={104} width={340} />
      <StampWord frame={frame} startFrame={ev('stamp.merhaba').frame} endFrame={ev('line2.hide').frame} text="merhaba" x={588} y={490} size={104} width={340} />

      <PaperGrain frame={frame} />
    </AbsoluteFill>
  );
};
