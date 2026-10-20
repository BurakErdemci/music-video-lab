import { palette } from '../style/palette.ts';
import { plateOffset } from '../style/screenprint.tsx';
import { STAMP_FONT } from '../style/fonts.ts';
import { seeded, range } from '../style/seeded.ts';
import { fadeOut, STAMP_EXIT_FRAMES } from '../motion/entrances.ts';

export const upperTr = (s: string): string => s.toLocaleUpperCase('tr-TR');

interface Props {
  frame: number;
  /** Frame the stamp lands (a beat frame). */
  startFrame: number;
  /** Frame the stamp disappears (exclusive); omit to hold. */
  endFrame?: number;
  text: string;
  x: number;
  y: number;
  size?: number;
  /** Background the word sits on: the under-print ghost uses the opposite colour. */
  on?: 'navy' | 'cream';
  /** Fixed box width so main and ghost layers wrap identically. */
  width?: number;
  /**
   * Colour of the word. 'yellow' (default) is the moon-yellow stamp; on cream it gets a navy outline to read.
   * 'navy' is the reversed print (navy word, yellow ghost) used for the right-hand mirror stamp.
   */
  ink?: 'yellow' | 'navy';
  /** Centre the word in its box (for a stamp laid across the glass seam). */
  center?: boolean;
}

const SQUASH = [1.15, 1.1, 1.05];

/**
 * Big key word, moon yellow, stamped in: 3 frames of scale 1.15 -> 1 with a small seeded rotation,
 * then it holds. A ghost print (same box, same text) sits 1-3 px off like a misregistered plate.
 */
export const StampWord = ({ frame, startFrame, endFrame, text, x, y, size = 190, on = 'navy', width = 900, ink = 'yellow', center = false }: Props) => {
  if (frame < startFrame || (endFrame !== undefined && frame >= endFrame + STAMP_EXIT_FRAMES)) return null;
  // the hard hit in stays (it is the accent); the way out is a short fade
  const op = endFrame !== undefined && frame >= endFrame ? fadeOut(frame, endFrame, STAMP_EXIT_FRAMES) : 1;
  const f = frame - startFrame;
  const scale = f < 3 ? (SQUASH[f] as number) : 1;
  const rot = range(seeded(`stamp:${text}`), -2.6, 2.6);
  const { dx, dy } = plateOffset(`stamp:${text}`);
  const base = {
    position: 'absolute',
    left: 0,
    top: 0,
    width,
    whiteSpace: 'nowrap',
    fontFamily: STAMP_FONT,
    fontSize: size,
    lineHeight: 1.05,
    letterSpacing: '0.02em',
    textAlign: center ? 'center' : 'left',
  } as const;
  const ghost = ink === 'navy' ? palette.moonYellow : on === 'navy' ? palette.cream : palette.navy;
  const word = ink === 'navy' ? palette.navy : palette.moonYellow;
  const outline = ink === 'yellow' && on === 'cream' ? ({ WebkitTextStroke: `${Math.max(4, size / 22)}px ${palette.navy}`, paintOrder: 'stroke fill' } as const) : {};
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height: size * 1.1, transform: `rotate(${rot}deg) scale(${scale})`, transformOrigin: center ? '50% 55%' : '0% 55%', opacity: op }}>
      <div style={{ ...base, color: ghost, transform: `translate(${-dx * 1.5}px, ${-dy * 1.5}px)` }}>{upperTr(text)}</div>
      <div style={{ ...base, ...outline, color: word, transform: `translate(${dx}px, ${dy}px)` }}>{upperTr(text)}</div>
    </div>
  );
};
