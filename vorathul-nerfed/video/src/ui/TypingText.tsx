import React from 'react';
import { type BoxProps, C, LINE, MONO_FONT, Scaled } from './theme.tsx';

export interface TypingTextProps extends BoxProps {
  frame: number;
  text: string;
  /** Frame at which the first character appears. */
  startFrame: number;
  /** Frames per character. */
  framesPerChar?: number;
  /** Hard cut: from this frame on nothing is drawn (can land mid-word). */
  cutAtFrame?: number;
  /** Caret blink half-period in frames (floored at 5 = at most 3 flashes per second). */
  blinkFrames?: number;
  /** Draw a plain document window around the text. */
  chrome?: boolean;
}

const W = 1100;
const H = 300;

export const TypingText: React.FC<TypingTextProps> = ({
  frame,
  text,
  startFrame,
  framesPerChar = 3,
  cutAtFrame,
  blinkFrames = 8,
  chrome = true,
  ...box
}) => {
  if (cutAtFrame !== undefined && frame >= cutAtFrame) return null;
  const typed = frame < startFrame ? 0 : Math.min(text.length, Math.floor((frame - startFrame) / framesPerChar) + 1);
  const sinceKey = frame - startFrame - (typed - 1) * framesPerChar;
  const typing = typed > 0 && typed < text.length && sinceKey < framesPerChar + 2;
  const caretOn = typing || Math.floor(Math.max(0, frame - startFrame) / Math.max(5, blinkFrames)) % 2 === 0;
  return (
    <Scaled {...box} designW={W} designH={H}>
      <div
        style={{
          position: 'relative',
          width: W,
          height: H,
          boxSizing: 'border-box',
          background: chrome ? C.white : 'transparent',
          border: chrome ? `${LINE}px solid ${C.dark}` : undefined,
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {chrome ? (
          <div style={{ height: 56, background: C.bg, borderBottom: `${LINE}px solid ${C.dark}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: 7, border: `${LINE}px solid ${C.dark}`, background: C.white, boxSizing: 'border-box' }} />
            ))}
            <div style={{ marginLeft: 14, fontSize: 22, fontWeight: 600, color: C.slate }}>release-notes.txt</div>
          </div>
        ) : null}
        <div
          style={{
            position: 'absolute',
            left: 56,
            top: chrome ? 120 : 60,
            fontFamily: MONO_FONT,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 1,
            color: C.ink,
            whiteSpace: 'pre',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span>{text.slice(0, typed)}</span>
          <span style={{ display: 'inline-block', width: 44, height: 88, marginLeft: 6, background: C.blue, opacity: caretOn ? 1 : 0 }} />
        </div>
      </div>
    </Scaled>
  );
};
