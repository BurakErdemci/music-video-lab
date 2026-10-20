import { palette } from '../style/palette.ts';
import { TEXT_FONT } from '../style/fonts.ts';
import { SEAM_X } from '../layout.ts';
import { fadeIn, fadeOut, LYRIC_FRAMES } from '../motion/entrances.ts';

interface Props {
  frame: number;
  startFrame: number;
  endFrame: number;
  text: string;
  /** left = human (cream on navy), right = AI (navy on cream), seam = both (straddles the glass). */
  side: 'left' | 'right' | 'seam';
  y: number;
  size?: number;
  /** Distance from the frame edge (left) or the glass (right) to the text. */
  inset?: number;
}

const BOX = 880;

/** Small quiet lyric line. All layers share one fixed box so they wrap identically. */
export const LyricLine = ({ frame, startFrame, endFrame, text, side, y, size = 28, inset = 72 }: Props) => {
  if (frame < startFrame || frame >= endFrame + LYRIC_FRAMES) return null;
  // soft 8-frame fade and 8 px slide in on the show beat, the same out on the hide beat
  const op = Math.min(fadeIn(frame, startFrame, LYRIC_FRAMES), frame >= endFrame ? fadeOut(frame, endFrame, LYRIC_FRAMES) : 1);
  const slide = frame >= endFrame ? -8 * (1 - fadeOut(frame, endFrame, LYRIC_FRAMES)) : 8 * (1 - fadeIn(frame, startFrame, LYRIC_FRAMES));
  const style = {
    position: 'absolute',
    top: 0,
    width: BOX,
    whiteSpace: 'nowrap',
    fontFamily: TEXT_FONT,
    fontWeight: 400,
    fontSize: size,
    letterSpacing: '0.02em',
  } as const;
  if (side === 'seam') {
    const left = SEAM_X - BOX / 2;
    return (
      <div style={{ position: 'absolute', left, top: y + slide, width: BOX, height: size * 1.4, opacity: op }}>
        <div style={{ ...style, left: 0, textAlign: 'center', color: palette.cream, clipPath: `inset(0 ${BOX / 2}px 0 0)` }}>{text}</div>
        <div style={{ ...style, left: 0, textAlign: 'center', color: palette.navy, clipPath: `inset(0 0 0 ${BOX / 2}px)` }}>{text}</div>
      </div>
    );
  }
  const left = side === 'left' ? inset : SEAM_X + inset;
  return (
    <div style={{ position: 'absolute', left, top: y + slide, width: BOX - 40, height: size * 1.4, opacity: op }}>
      <div style={{ ...style, left: 0, color: side === 'left' ? palette.cream : palette.navy }}>{text}</div>
    </div>
  );
};
