// The persistent kinetic lyric layer (architecture.md frame stack 3): it sits outside the shots, so it
// carries continuity across every scene change. Every token is bound to a MEASURED word: a line's tokens
// pair one-to-one, in order, with the measured words between its start and the next line's start, and the
// pairing throws when the counts differ (never a guessed time). The key word of each line is big.
import { AbsoluteFill } from 'remotion';
import { BLUE, CYAN, ORANGE } from '../grade/grade.ts';
import { type Hex, lerp, outQuad, ramp } from '../lib/ease.ts';
import { lines, words } from '../timing.ts';
import { bindLine, type Token } from './bind.ts';
import { DISPLAY, SANS } from '../type/fonts.tsx';

export type { Token } from './bind.ts';

/** The lyric line's tokens with the measured start/end of the word(s) each one is sung on (lyrics/bind.ts). */
export const lineTokens = (i: number): Token[] => bindLine(lines, words, i);

export interface LineDesign { line: number; key: number; keyColor: Hex; x: number; y: number; /** key outline (default ink) */ keyStroke?: Hex }

/** Proof (0-20 s) designs: the line's key word big, in the colour the story gives it. "BLUE" is outlined in
 *  the rival orange so it does not sink into the blue stage. */
export const DESIGNS: readonly LineDesign[] = [
  { line: 0, key: 1, keyColor: CYAN, x: 1010, y: 70 },
  { line: 1, key: 5, keyColor: BLUE, keyStroke: ORANGE, x: 1010, y: 70 },
  { line: 2, key: 2, keyColor: CYAN, x: 1010, y: 70 },
  { line: 3, key: 0, keyColor: ORANGE, x: 1010, y: 70 },
];

const Word = ({ tk, t }: { tk: Token; t: number }) => {
  const inP = outQuad((t - tk.start) / (6 / 60));
  const singing = t >= tk.start && t < tk.end + 0.05;
  // Unsung tokens keep their place (hidden) so the line never reflows as words arrive.
  return (
    <span style={{ visibility: t >= tk.start ? 'visible' : 'hidden', display: 'inline-block', fontFamily: SANS, fontWeight: 800, fontSize: 60, color: singing ? '#ffffff' : '#d9d2ea', transform: `translateY(${lerp(18, 0, inP)}px)`, opacity: inP, WebkitTextStroke: '3px #0b0614', paintOrder: 'stroke' }}>
      {tk.text}
    </span>
  );
};

const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 22 } as const;

/** A line in three designed rows: the words before the key word, the key word alone and big, the rest. */
const Line = ({ d, t }: { d: LineDesign; t: number }) => {
  const toks = lineTokens(d.line);
  const first = (toks[0] as Token).start;
  const next = DESIGNS.find((x) => x.line === d.line + 1);
  const out = next ? lineTokens(next.line)[0]?.start ?? Infinity : (toks.at(-1) as Token).end + 1.2;
  if (t < first - 0.2 || t >= out) return null;
  const fadeOut = ramp(t, out - 0.1, 0.1);
  const key = toks[d.key] as Token;
  const inP = outQuad((t - key.start) / (6 / 60));
  const s = lerp(1.6, 1, inP) * (1 + 0.025 * Math.sin(t * 5));
  return (
    <div style={{ position: 'absolute', left: d.x, top: d.y, width: 1920 - d.x - 60, opacity: 1 - fadeOut }}>
      <div style={row}>{toks.slice(0, d.key).map((tk, k) => <Word key={k} tk={tk} t={t} />)}</div>
      <div style={{ visibility: t >= key.start ? 'visible' : 'hidden', fontFamily: DISPLAY, fontSize: 210, lineHeight: 1.0, color: d.keyColor, transform: `scale(${s})`, transformOrigin: 'left bottom', WebkitTextStroke: `7px ${d.keyStroke ?? '#0b0614'}`, paintOrder: 'stroke', textShadow: `0 0 0 #0b0614, 0 0 26px ${d.keyColor}`, whiteSpace: 'nowrap' }}>
        {key.text.toUpperCase()}
      </div>
      <div style={row}>{toks.slice(d.key + 1).map((tk, k) => <Word key={k} tk={tk} t={t} />)}</div>
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
