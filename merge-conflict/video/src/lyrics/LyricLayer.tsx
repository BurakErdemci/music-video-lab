// The persistent kinetic lyric layer (architecture.md frame stack 3): it sits outside the shots, so it
// carries continuity across every scene change. Every token is bound to a MEASURED word: a line's tokens
// pair one-to-one, in order, with the measured words between its start and the next line's start, and the
// pairing throws when the counts differ (never a guessed time). The key word of each line is big.
import { AbsoluteFill } from 'remotion';
import { BLUE, CYAN, ORANGE } from '../grade/grade.ts';
import { type Hex, lerp, outQuad, ramp } from '../lib/ease.ts';
import { lyricLine, lines, words } from '../timing.ts';
import { DISPLAY, SANS } from '../type/fonts.tsx';

export interface Token { text: string; start: number; end: number }

/** The lyric line's tokens with the measured start/end of the word each one is sung on. */
export const lineTokens = (i: number): Token[] => {
  const line = lyricLine(i);
  const next = lines[i + 1];
  const until = next && next.start !== null ? next.start : line.end + 1.5;
  const sung = words.filter((w) => w.s >= line.start - 0.005 && w.s < until - 0.005);
  const toks = line.text.split(/\s+/).filter(Boolean);
  if (toks.length !== sung.length) {
    throw new Error(`lyric line ${i} "${line.text}": ${toks.length} tokens but ${sung.length} measured words (${sung.map((w) => w.w).join(' ')})`);
  }
  return toks.map((text, k) => ({ text, start: (sung[k] as { s: number }).s, end: (sung[k] as { e: number }).e }));
};

export interface LineDesign { line: number; key: number; keyColor: Hex; x: number; y: number; keyText?: string }

/** Proof (0-20 s) designs: the line's key word big, in the colour the story gives it. */
export const DESIGNS: readonly LineDesign[] = [
  { line: 0, key: 1, keyColor: CYAN, x: 1190, y: 120 },
  { line: 1, key: 5, keyColor: BLUE, x: 1190, y: 120 },
  { line: 2, key: 2, keyColor: CYAN, x: 1190, y: 120 },
  { line: 3, key: 0, keyColor: ORANGE, x: 1190, y: 120 },
];

const Line = ({ d, t }: { d: LineDesign; t: number }) => {
  const toks = lineTokens(d.line);
  const first = (toks[0] as Token).start;
  const next = DESIGNS.find((x) => x.line === d.line + 1);
  const out = next ? lineTokens(next.line)[0]?.start ?? Infinity : (toks.at(-1) as Token).end + 1.2;
  if (t < first - 0.2 || t >= out) return null;
  const fadeOut = ramp(t, out - 0.1, 0.1);
  return (
    <div style={{ position: 'absolute', left: d.x, top: d.y, width: 1920 - d.x - 70, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 22, rowGap: 0, opacity: 1 - fadeOut }}>
      {toks.map((tk, k) => {
        const key = k === d.key;
        const inP = outQuad((t - tk.start) / (6 / 60));
        const sung = t >= tk.start;
        const singing = t >= tk.start && t < tk.end + 0.05;
        // Unsung tokens keep their place (hidden) so the line never reflows as words arrive.
        const hide = sung ? 'visible' : 'hidden';
        if (key) {
          const s = lerp(1.6, 1, inP) * (1 + 0.025 * Math.sin(t * 5));
          return (
            <span key={k} style={{ visibility: hide, display: 'inline-block', fontFamily: DISPLAY, fontSize: 150, lineHeight: 1.0, color: d.keyColor, transform: `scale(${s})`, transformOrigin: 'left bottom', WebkitTextStroke: '5px #0b0614', paintOrder: 'stroke', textShadow: `0 0 26px ${d.keyColor}` }}>
              {(d.keyText ?? tk.text).toUpperCase()}
            </span>
          );
        }
        return (
          <span key={k} style={{ visibility: hide, display: 'inline-block', fontFamily: SANS, fontWeight: 800, fontSize: 46, color: singing ? '#ffffff' : '#d9d2ea', transform: `translateY(${lerp(18, 0, inP)}px)`, opacity: inP, WebkitTextStroke: '3px #0b0614', paintOrder: 'stroke' }}>
            {tk.text}
          </span>
        );
      })}
    </div>
  );
};

export const LyricLayer = ({ t, until = Infinity }: { t: number; until?: number }) => {
  if (t >= until) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {DESIGNS.map((d) => <Line key={d.line} d={d} t={t} />)}
    </AbsoluteFill>
  );
};
