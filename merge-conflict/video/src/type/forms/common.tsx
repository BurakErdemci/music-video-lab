// Shared parts of the type forms (scene-map.md "Typography-led clip"): every form takes a lyric line bound to
// measured words (lyrics/LyricLayer.tsx lineTokens), so each word appears at its measured start; every line
// has a key word, the biggest and most saturated; colour comes from the singer and changes hue on the beats.
import { type Hex, mixHex, outQuad } from '../../lib/ease.ts';
import { lineTokens, type Token } from '../../lyrics/LyricLayer.tsx';
import { familyFor } from '../../girls/costume.ts';
import { metalAt } from '../../metal/metal.ts';
import { beatIndexAt } from '../../timing.ts';
import type { Face } from '../fonts.tsx';

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
/** The metal family (black, red and steel) the palette slides into as the metal amount rises. */
export const METAL: readonly Hex[] = ['#e01b1b', '#c8ced6', '#ff4a1a', '#9a1010', '#eef1f4'];
export const METAL_KEY: Hex = '#ff1e1e';
/** How far a form's colours and faces sit in the metal family (scene-map.md "The costume belongs to the girl"):
 *  a solo line follows its singer's costume (metal 1, disco or plain 0, mix by the set), a duet line follows
 *  the set's metal amount. */
export const metalOf = (singer: Singer, t: number): number => {
  const set = metalAt(t);
  if (singer === 'both') return set;
  return familyFor(singer, t, set) === 'metal' ? 1 : 0;
};
/** Rounded neon faces give way to blackletter and jagged faces once the metal amount passes this. */
export const METAL_FACE_AT = 0.55;
const FACE_SWAP: Partial<Record<Face, Face>> = { display: 'metalmania', bebas: 'pirata', righteous: 'fraktur', bungee: 'metalmania', shrikhand: 'fraktur', monoton: 'metalmania' };
export const faceFor = (face: Face, singer: Singer, t: number): Face => (metalOf(singer, t) >= METAL_FACE_AT ? (FACE_SWAP[face] ?? face) : face);
/** The gradient used for lines sung together (defined once by <FormDefs/>). */
export const BOTH_FILL = 'url(#mc-both)';

/** Hue of word i at t: steps through the singer's family on every beat. */
export const hueAt = (singer: Singer, t: number, i: number): string => {
  const m = metalOf(singer, t);
  const k = (((beatIndexAt(t) + i) % 5) + 5) % 5;
  if (singer === 'both') return m >= 0.5 ? mixHex(mixHex(PALETTE.O[k] as Hex, PALETTE.B[k] as Hex, 0.5), METAL[k] as Hex, m) : BOTH_FILL;
  return mixHex(PALETTE[singer][k] as Hex, METAL[k] as Hex, m);
};
/** A solid colour for strokes and glows (the gradient's middle for 'both'). */
export const solidAt = (singer: Singer, t: number, i: number): Hex => {
  const k = (((beatIndexAt(t) + i) % 5) + 5) % 5;
  const pop = singer === 'both' ? mixHex(PALETTE.O[k] as Hex, PALETTE.B[k] as Hex, 0.5) : (PALETTE[singer][k] as Hex);
  return mixHex(pop, METAL[k] as Hex, metalOf(singer, t));
};
/** The key word's fill: the singer's key colour, sliding to the metal key colour (the gradient for a duet at low metal). */
export const keyFill = (singer: Singer, t?: number): string => {
  const m = t === undefined ? 0 : metalOf(singer, t);
  if (singer === 'both' && m < 0.5) return BOTH_FILL;
  return mixHex(KEY[singer], METAL_KEY, m);
};

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
