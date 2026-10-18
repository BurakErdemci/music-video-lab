import { AbsoluteFill } from 'remotion';
import { AI, aiCursorStage } from '../characters/AI.tsx';
import { Human } from '../characters/Human.tsx';
import { ev, evFrames } from '../events.ts';
import { AI_X, FLOOR_Y, H, HUMAN_X, MOON_R, MOON_SEAM_Y, SEAM_X, W } from '../layout.ts';
import { clamp01, lerp, onTwos, smooth } from '../math.ts';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { LyricLine } from '../type/LyricLine.tsx';
import { StampWord } from '../type/StampWord.tsx';
import { Bubble } from '../world/Bubble.tsx';
import { GlassSeam } from '../world/GlassSeam.tsx';
import { NoteFly } from '../world/Notes.tsx';
import { NavyRoom, WhiteRoom } from '../world/Rooms.tsx';
import { SplitMoon } from '../world/SplitMoon.tsx';

const LINE1 = 'Sabah yine aynı ekran, imleç yanıp sönüyor';
const LINE2 = '"Merhaba" yazıyorsun bana, sesin hiç yorulmuyor';

/** A blink starts on each event frame: off for 4 frames (two 12 fps steps), then on again. */
const blinkOn = (frame: number, starts: number[]): boolean => !starts.some((s) => frame >= s && frame < s + 4);

const CURSOR_START = { x: SEAM_X, y: 528 };

/** Free cursor of the intro: cream on the navy half, navy on the cream half, shrinks into the AI's face cursor. */
const FreeCursor = ({ x, y, w, h, on }: { x: number; y: number; w: number; h: number; on: boolean }) => {
  if (!on) return null;
  return (
    <g>
      <clipPath id="cur-left">
        <rect x={0} y={0} width={SEAM_X} height={H} />
      </clipPath>
      <clipPath id="cur-right">
        <rect x={SEAM_X} y={0} width={W - SEAM_X} height={H} />
      </clipPath>
      <g clipPath="url(#cur-left)">
        <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={palette.cream} />
      </g>
      <g clipPath="url(#cur-right)">
        <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={palette.navy} />
      </g>
    </g>
  );
};

export const Test30Scene = ({ frame }: { frame: number }) => {
  const revStart = ev('room.reveal.start').frame;
  const revEnd = ev('room.reveal.end').frame;
  const reveal = clamp01((frame - revStart) / (revEnd - revStart));
  const e = smooth(reveal);
  const settled = frame >= revEnd;

  const ai = aiCursorStage(AI_X, FLOOR_Y, 'stand', -1);
  const ohFrames = [ev('intro.oh1').frame, ev('intro.oh2').frame];
  const introBlink = [...evFrames('intro.blink.'), ...ohFrames];
  const aiBlink = [...evFrames('verse.blink.'), ev('ai.blink.imlec').frame];

  const sinceOh = ohFrames.map((f) => frame - f).filter((d) => d >= 0 && d < 8);
  const pulse = sinceOh.length > 0 ? 1.35 : 1;
  const cursorX = lerp(CURSOR_START.x, ai.x, e);
  const cursorY = lerp(CURSOR_START.y, ai.y, e);
  const cursorW = lerp(10, 5, e);
  const cursorH = lerp(104 * pulse, 38, e);

  const hold = onTwos(frame);
  const bob = Math.round(Math.sin(hold * 0.11) * 2);
  const aiBob = Math.round(Math.sin(hold * 0.11 + 1.7) * 2);

  const fill = lerp(0.18, 0.4, smooth(clamp01((frame - revStart) / 400)));
  const push = 1 + 0.015 * (frame / 900);

  const note1 = { fly: ev('note1.fly').frame, land: ev('note1.land').frame };
  const note2 = { fly: ev('note2.fly').frame, land: ev('note2.land').frame };
  const handFrom = { x: HUMAN_X + 70, y: 640 };

  const moonSplit = settled;

  return (
    <AbsoluteFill style={{ background: palette.navy }}>
      <svg key={frame} data-frame={frame} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={W} height={H} fill={palette.navy} />
        <g transform={`translate(${W / 2} ${H / 2}) scale(${push}) translate(${-W / 2} ${-H / 2})`}>
          {reveal > 0 && (
            <>
              <clipPath id="reveal-clip">
                <rect x={SEAM_X - SEAM_X * e} y={0} width={SEAM_X * 2 * e} height={H} />
              </clipPath>
              <g clipPath="url(#reveal-clip)">
                <NavyRoom fill={fill} />
                <WhiteRoom />
              </g>
            </>
          )}

          <SplitMoon
            cx={lerp(1710, SEAM_X, e)}
            cy={lerp(145, MOON_SEAM_Y, e)}
            r={lerp(100, MOON_R, e)}
            phase={lerp(0.2, 0.82, e)}
            split={moonSplit}
          />

          {reveal > 0 && (
            <g clipPath="url(#reveal-clip)">
              <GlassSeam />
              <Human x={HUMAN_X} floorY={FLOOR_Y} notes={10} bob={bob} />
              <AI x={AI_X} floorY={FLOOR_Y} cursorOn={settled && blinkOn(frame, aiBlink)} bob={aiBob} />
              <NoteFly frame={frame} startFrame={note1.fly} duration={note1.land - note1.fly} from={handFrom} to={{ x: 1560, y: 330 }} seed="n1" />
              <NoteFly frame={frame} startFrame={note2.fly} duration={note2.land - note2.fly} from={handFrom} to={{ x: 1690, y: 470 }} seed="n2" arc={120} />
            </g>
          )}

          <Bubble frame={frame} startFrame={ev('intro.bubble').frame} endFrame={revEnd} x={CURSOR_START.x - 30} y={CURSOR_START.y - 40} dir={-1} />
          <Bubble frame={frame} startFrame={ev('bubble.merhaba').frame} x={ai.x + 20} y={ai.y - 60} />
          {!settled && <FreeCursor x={cursorX} y={cursorY} w={cursorW} h={cursorH} on={blinkOn(frame, introBlink)} />}
        </g>
      </svg>

      <LyricLine frame={frame} startFrame={ev('line1.show').frame} endFrame={ev('line1.hide').frame} text={LINE1} side="left" y={48} size={26} />
      <LyricLine frame={frame} startFrame={ev('line2.show').frame} endFrame={ev('line2.hide').frame} text={LINE2} side="left" y={48} size={26} />
      <StampWord frame={frame} startFrame={ev('stamp.imlec').frame} endFrame={ev('line1.hide').frame} text="imleç" x={72} y={690} />
      <StampWord frame={frame} startFrame={ev('stamp.merhaba').frame} endFrame={ev('line2.hide').frame} text="merhaba" x={72} y={690} />

      <PaperGrain frame={frame} />
    </AbsoluteFill>
  );
};
