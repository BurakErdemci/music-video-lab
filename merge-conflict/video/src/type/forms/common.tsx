// Shared parts of the type forms (scene-map.md "Typography-led clip"): every form takes a lyric line bound to
// measured words (lyrics/LyricLayer.tsx lineTokens), so each word appears at its measured start; every line
// has a key word, the biggest and most saturated; colour comes from the singer and changes hue on the beats.
import { type Hex, mixHex, outQuad } from '../../lib/ease.ts';
import { lineTokens, type Token } from '../../lyrics/LyricLayer.tsx';
import { beatIndexAt } from '../../timing.ts';

export type Singer = 'O' | 'B' | 'both';
export interface Box { x: number; y: number; w: number; h: number }
export interface FormSpec {
  id: string;
  /** lyric line index (mc-timing.json lyric_alignment) */
  line: number;
  /** index of the key word in the line's tokens */
  key: number;
  singer: Singer;
  /** visible window in seconds */
  t0: number;
  t1: number;
  box: Box;
  /** only these token indices (a line split across two forms); default all */
  range?: [number, number];
}

export const PALETTE: Record<'O' | 'B', readonly Hex[]> = {
  O: ['#ff7a1a', '#ffb020', '#ff4d2e', '#ffd23a', '#ff8f5a'],
  B: ['#2f7bff', '#19c8ff', '#7a6cff', '#8fd8ff', '#3fa0ff'],
};
export const KEY: Record<Singer, Hex> = { O: '#ff5a00', B: '#00b4ff', both: '#ff3d9a' };
/** The gradient used for lines sung together (defined once by <FormDefs/>). */
export const BOTH_FILL = 'url(#mc-both)';

/** Hue of word i at t: steps through the singer's family on every beat. */
export const hueAt = (singer: Singer, t: number, i: number): string => {
  if (singer === 'both') return BOTH_FILL;
  const p = PALETTE[singer];
  return p[(((beatIndexAt(t) + i) % p.length) + p.length) % p.length] as string;
};
/** A solid colour for strokes and glows (the gradient's middle for 'both'). */
export const solidAt = (singer: Singer, t: number, i: number): Hex => {
  if (singer !== 'both') return hueAt(singer, t, i) as Hex;
  const k = (((beatIndexAt(t) + i) % 5) + 5) % 5;
  return mixHex(PALETTE.O[k] as Hex, PALETTE.B[k] as Hex, 0.5);
};
export const keyFill = (singer: Singer): string => (singer === 'both' ? BOTH_FILL : KEY[singer]);

export const FormDefs = () => (
  <defs>
    <linearGradient id="mc-both" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stopColor="#ff7a1a" />
      <stop offset="0.5" stopColor="#ff3d9a" />
      <stop offset="1" stopColor="#2f7bff" />
    </linearGradient>
  </defs>
);

/** The tokens of a form (its line, or the range of it). */
export const tokensOf = (s: FormSpec): Token[] => {
  const all = lineTokens(s.line);
  return s.range ? all.slice(s.range[0], s.range[1]) : all;
};
/** Key index inside tokensOf(s). */
export const keyIndex = (s: FormSpec): number => s.key - (s.range?.[0] ?? 0);

/** 0 before the word is sung, rising to 1 over 6 frames at 60 fps from its measured start. */
export const appear = (t: number, tok: Token): number => (t < tok.start ? 0 : outQuad((t - tok.start) / (6 / 60)));
/** Slam scale for a word landing at its start: 1.5 -> 1 in 8 frames, no bounce. */
export const landScale = (t: number, tok: Token, from = 1.5): number => (t < tok.start ? from : from + (1 - from) * outQuad((t - tok.start) / (8 / 60)));
export const visible = (s: FormSpec, t: number): boolean => t >= s.t0 && t < s.t1;
/** Uppercase display text, keeping the measured token's punctuation out. */
export const clean = (w: string): string => w.replace(/[.,!?…]+$/u, '').replace(/^\.+/u, '');
export const INK = '#0b0614';
