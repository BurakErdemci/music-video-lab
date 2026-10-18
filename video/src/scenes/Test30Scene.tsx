import { AbsoluteFill } from 'remotion';
import { PoseFigure, poseBox } from '../characters/Figure.tsx';
import { ev, evFrames } from '../events.ts';
import { AI_X, FLOOR_Y, H, MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { lerp, onTwos } from '../math.ts';
import { Halftone, Squeegee } from '../motion/entranceViews.tsx';
import { blinkAlpha, dotP, EASE_WIPE, ENTER_FRAMES, fadeIn, fadeOut, glide, progress, regOffset, wipeP } from '../motion/entrances.ts';
import { STAMP_FONT } from '../style/fonts.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain, plateOffset } from '../style/screenprint.tsx';
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

/** Pose h06 carries its own desk: it stands where the old plate's desk was, chair and desk legs on the plate floor. */
const HUMAN_X = 278;
const HUMAN_FLOOR = 1000;
const CURSOR = { x: SEAM_X, y: 528 };
const TITLE = 'Her Sabah Baştan';
const TITLE_H = 200;
/** Soft edge of the room-open squeegee, in px. */
const WIPE_SOFT_X = 140;

/** Crosshair registration marks in the four corners; navy where the cream wipe has passed. */
const RegMarks = ({ front, op }: { front: number; op: number }) => {
  const pts = [
    [44, 44],
    [W - 44, 44],
    [44, H - 44],
    [W - 44, H - 44],
  ] as const;
  return (
    <g opacity={op}>
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

const pad = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x - 12, y: b.y - 12, w: b.w + 24, h: b.h + 24 });

export const Test30Scene = ({ frame }: { frame: number }) => {
  const enterFrames = (id: string): number => ev(id).enter.frames;
  const revStart = ev('room.reveal.start').frame;
  const revEnd = ev('room.reveal.end').frame;
  // the room opens with a soft squeegee wipe from the glass to the right edge; e is its eased progress
  const e = wipeP(frame, revStart, enterFrames('room.reveal.start'), EASE_WIPE);
  const front = SEAM_X + e * (W - SEAM_X + WIPE_SOFT_X);

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
  const cursorP = wipeP(frame, fCursor, enterFrames('intro.cursor'));
  const cursorH = lerp(44, 104, glide(frame, fWake, enterFrames('intro.cursor.wake')));
  // the cursor hands over to the AI figure: it fades out while the figure's dots grow in
  const cursorOp = blinkAlpha(frame, introBlink) * (frame >= fAi ? fadeOut(frame, fAi, enterFrames('intro.ai')) : 1);

  const seamP = wipeP(frame, fSeam, enterFrames('intro.seam'));
  const seamSettle = regOffset('seam', progress(frame, fSeamEnd, enterFrames('intro.seam.end')), 6);
  const moonP = wipeP(frame, fMoon, enterFrames('intro.moon'));

  const keyP = wipeP(frame, fRoom, enterFrames('intro.room'));
  const keyOp = lerp(0.55, 1, glide(frame, fInk, enterFrames('intro.room.ink')));
  const moonWinP = wipeP(frame, fMoonWin, enterFrames('intro.moonwin'));
  const notesP = wipeP(frame, fNotes, enterFrames('intro.notes'));
  const humanP = dotP(frame, fHuman, enterFrames('intro.human'));
  const aiP = dotP(frame, fAi, enterFrames('intro.ai'));

  const titleFade = frame < fTitleFade ? 1 : fadeOut(frame, fTitleFade, enterFrames('intro.title.fade'));
  const titleP = wipeP(frame, fTitle, enterFrames('intro.title'));
  const titleScale = 1 + 0.08 * (1 - titleP);
  const titleOff = plateOffset('title');
  const titleFront = titleP * (TITLE_H + 60);
  const titleMask = titleP >= 1 ? undefined : `linear-gradient(180deg, #000 ${(titleFront - 60).toFixed(1)}px, transparent ${titleFront.toFixed(1)}px)`;

  // ---- verse
  const hold = onTwos(frame);
  const aiBob = Math.round(Math.sin(hold * 0.11 + 1.7) * 2);
  const aiBlink = 1 - blinkAlpha(frame, [ev('ai.blink.imlec').frame]);

  const wallFrames = evFrames('wall.');

  const note1 = { fly: ev('note1.fly').frame, land: ev('note1.land').frame };
  const note2 = { fly: ev('note2.fly').frame, land: ev('note2.land').frame };
  const handFrom = { x: HUMAN_X + 70, y: HUMAN_FLOOR - 280 };

  const aiBg = 'cream' as const;
  const headY = FLOOR_Y - 670 + 40;
  const aiY = FLOOR_Y + aiBob;

  const regOp = Math.min(fadeIn(frame, fRoom, ENTER_FRAMES.ease), frame >= revEnd ? fadeOut(frame, revEnd, ENTER_FRAMES.ease) : 1);

  return (
    <AbsoluteFill style={{ background: palette.navy }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={W} height={H} fill={palette.navy} />

        {/* left room: key plate, then the yellow plates, then the code notes */}
        <PlateRoom key1={{ p: keyP, op: keyOp }} moon={{ p: moonWinP }} notes={{ p: notesP }} />
        <WallNotes frame={frame} starts={wallFrames} frames={ENTER_FRAMES.drift} />

        {/* right room: the cream is pulled across from the glass by a soft squeegee edge */}
        {e > 0 && (
          <Squeegee id="sq-room" p={e} axis="x" from={SEAM_X} to={W} soft={WIPE_SOFT_X}>
            <WhiteRoom />
          </Squeegee>
        )}

        {moonP > 0 && (
          <Squeegee id="sq-crescent" p={moonP} from={20} to={270} soft={80} reg="crescent" regAmp={14}>
            <SplitMoon cx={lerp(1710, SEAM_X, e)} cy={lerp(145, MOON_SEAM_Y, e)} r={lerp(100, MOON_R, e)} phase={lerp(0.2, 0.82, e)} split />
          </Squeegee>
        )}

        {seamP > 0 && (
          <g transform={`translate(${seamSettle.dx.toFixed(2)} 0)`}>
            <Squeegee id="sq-seam" p={seamP} from={0} to={H} soft={140}>
              <GlassSeam />
            </Squeegee>
          </g>
        )}

        {humanP > 0 && (
          <Halftone
            id="ht-human"
            p={humanP}
            box={pad(poseBox('h06', HUMAN_X, HUMAN_FLOOR))}
            seed="human"
            reg="human"
            proof={<PoseFigure uid="human-proof" frame={frame} keys={[[0, 'h06']]} x={HUMAN_X} y={HUMAN_FLOOR} leftBg="cream" rightBg="cream" />}
          >
            <PoseFigure uid="human" frame={frame} keys={[[0, 'h06']]} x={HUMAN_X} y={HUMAN_FLOOR} />
          </Halftone>
        )}
        {aiP > 0 && (
          <Halftone id="ht-ai" p={aiP} box={pad(poseBox('a01', AI_X, aiY))} seed="ai" reg="ai">
            <PoseFigure uid="ai" frame={frame} keys={[[0, 'a01']]} x={AI_X} y={aiY} seamX={front} leftBg={aiBg} rightBg="navy" soft={WIPE_SOFT_X} blink={aiBlink} />
          </Halftone>
        )}

        <NoteFly frame={frame} startFrame={note1.fly} duration={note1.land - note1.fly} from={handFrom} to={{ x: 1560, y: 330 }} seed="n1" settle={enterFrames('note1.land')} />
        <NoteFly frame={frame} startFrame={note2.fly} duration={note2.land - note2.fly} from={handFrom} to={{ x: 1690, y: 470 }} seed="n2" arc={120} settle={enterFrames('note2.land')} />

        {/* intro: the cursor on the seam, the oh rings, the registration marks */}
        {cursorP > 0 && cursorOp > 0 && (
          <g opacity={cursorOp}>
            <Squeegee id="sq-cursor" p={cursorP} from={CURSOR.y - 70} to={CURSOR.y + 70} soft={50} reg="cursor" regAmp={10}>
              <rect x={CURSOR.x - 5} y={CURSOR.y - cursorH / 2} width={10} height={cursorH} fill={palette.cream} />
            </Squeegee>
          </g>
        )}
        {ohFrames.map((f, i) => {
          const t = progress(frame, f, ENTER_FRAMES.ring);
          if (frame < f || t >= 1) return null;
          const grow = 1 - Math.pow(1 - t, 3);
          return <circle key={i} cx={CURSOR.x} cy={CURSOR.y} r={lerp(18, 190, grow)} fill="none" stroke={palette.cream} strokeWidth={lerp(6, 2, t)} opacity={Math.min(1, (frame - f + 1) / 4) * (1 - t) * 0.9} />;
        })}
        {frame >= fRoom && regOp > 0 && <RegMarks front={front} op={regOp} />}

        {/* the AI's "Merhaba" on the AI side, tail at its head (never over the human) */}
        <Bubble
          frame={frame}
          startFrame={ev('intro.bubble').frame}
          frames={enterFrames('intro.bubble')}
          endFrame={revEnd}
          x={AI_X + 22}
          y={headY + 20}
          text="Merhaba"
          swap={{ frame: ev('intro.bubble.text').frame, from: '...', frames: enterFrames('intro.bubble.text') }}
        />
        <Bubble frame={frame} startFrame={ev('bubble.merhaba').frame} frames={enterFrames('bubble.merhaba')} x={AI_X + 22} y={headY + 20} />
      </svg>

      {/* title plate: bar 4, cream, pulled in by a squeegee, fades by bar 5 */}
      {frame >= fTitle && titleFade > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 300, width: W, height: TITLE_H, opacity: titleFade, transform: `scale(${titleScale})` }}>
          <div style={{ position: 'absolute', inset: 0, textAlign: 'center', fontFamily: STAMP_FONT, fontSize: 176, letterSpacing: '0.03em', lineHeight: 1.1, whiteSpace: 'nowrap', maskImage: titleMask, WebkitMaskImage: titleMask }}>
            <div style={{ position: 'absolute', left: 0, width: W, color: palette.moonYellow, transform: `translate(${titleOff.dx * 2}px, ${titleOff.dy * 2}px)` }}>{upperTr(TITLE)}</div>
            <div style={{ position: 'relative', color: palette.cream }}>{upperTr(TITLE)}</div>
          </div>
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
