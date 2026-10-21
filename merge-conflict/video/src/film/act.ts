// The data of the proof from verse 1 to the end of chorus 1 (16.33-64.15 s, round 5): which card stands where,
// when each pose cuts in (anticipation -> release keyed to sung words), and the times of the git objects. Every
// time is an event of events.ts (token times come from the token map). Pose changes are hard cuts.
import type { Placement } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { kneeUp, waistUp } from '../girls/staging.tsx';
import { lineTokens } from '../lyrics/LyricLayer.tsx';
import type { Token } from '../lyrics/bind.ts';
import { sectionNamed } from '../timing.ts';

export const tok = (line: number, k: number): number => at(`tok-${line}-${k}`);
export const toks = (line: number, from = 0, to?: number): Token[] => lineTokens(line).slice(from, to);
export const V2 = sectionNamed('verse2_raspy');
export const PRE = sectionNamed('prechorus');
export const CHORUS = sectionNamed('chorus1');
/** The Verses shot runs to the first pre-chorus shout ("Blue!" is sung 0.5 s before the section starts). */
export const PING_START = tok(10, 0);

/** A figure on the stage: a card, where, and from when (the next entry of the same girl replaces it: a hard cut). */
export interface Pose { t: number; card: string; at: Placement }
/** The card a girl shows at t from her pose list (null before the first entry or when hidden). */
export const poseAt = (list: readonly (Pose | { t: number; card: null })[], t: number): Pose | null => {
  let p: Pose | { t: number; card: null } | null = null;
  for (const e of list) if (t >= e.t - 1e-9) p = e;
  return p && p.card ? (p as Pose) : null;
};

const full = (x: number, height = 5.2): Placement => ({ x, height });
const face = (x: number, flip = false): Placement => ({ x, feet: -7.0, height: 11.5, flip });

// ---- verse 1 (blue alone, disco) and verse 2 (orange, disco), 16.33-38.40 ---------------------------------------
export const BLUE_VERSES: readonly (Pose | { t: number; card: null })[] = [
  { t: sectionNamed('verse1_sweet').start, card: 'BD3', at: kneeUp(-3.9, 10.2) },
  { t: at('kick-anticipate'), card: 'BD5', at: kneeUp(-3.9, 10.2) },
  { t: at('kick-head'), card: 'BD6', at: full(-4.4, 4.6) },
  { t: at('framing-v1-waist'), card: 'BD4', at: waistUp(-4.4, 14) },
  { t: at('framing-v1-face'), card: 'B09', at: face(-3.4) },
  { t: at('orange-anticipate'), card: 'BD7', at: full(-4.4, 4.6) },
  { t: at('orange-release'), card: null },
  // verse 2: blue reacts to the thrown CSS
  { t: at('framing-v2-split'), card: 'BD2', at: full(-3.8, 5.0) },
  { t: tok(8, 4), card: 'B08', at: full(-3.8, 5.0) },
  { t: at('framing-v2-low'), card: null },
];
export const ORANGE_VERSES: readonly (Pose | { t: number; card: null })[] = [
  { t: 0, card: null },
  // the intruder: crouched, half in the dark, on "who"; she springs in on "you?"
  { t: at('orange-anticipate'), card: 'OD5', at: full(4.2, 4.6) },
  { t: at('orange-release'), card: 'OD4', at: kneeUp(3.9, 10.2) },
  { t: at('framing-v2-waist'), card: 'OD3', at: waistUp(4.4, 14) },
  { t: at('framing-v2-split'), card: 'OD7', at: full(3.8, 5.0) },
  { t: at('framing-v2-low'), card: 'OD8', at: full(2.8, 4.6) },
  { t: at('framing-v2-stage'), card: 'OD8', at: full(3.8, 4.8) },
];

// ---- pre-chorus and chorus 1 (38.40-64.15): blue disco on the left, orange metal on the right from "ORANGE!" ----
export const BLUE_CHORUS: readonly (Pose | { t: number; card: null })[] = [
  { t: tok(10, 0), card: 'B05', at: face(-3.0) },
  { t: tok(11, 0), card: null },
  { t: tok(12, 0), card: 'BD4', at: full(-3.6) },
  { t: tok(13, 0), card: null },
  { t: at('framing-pre-both'), card: 'BD7', at: full(-3.8, 5.0) },
  // chorus: anticipation on "Accept", the stomp on "current"; "(NO!)" / "(NEVER!)" as a shout
  { t: at('framing-c1'), card: 'BD5', at: full(-4.0) },
  { t: tok(15, 1), card: 'B07', at: full(-4.0) },
  { t: tok(15, 3), card: null },
  { t: at('framing-c3'), card: 'B07', at: full(-4.0) },
  { t: tok(16, 3), card: 'BD7', at: full(-4.0) },
  { t: tok(17, 0), card: 'BD4', at: full(-4.2, 5.0) },
  { t: tok(18, 0), card: 'BD8', at: full(-2.4, 2.6) },
  { t: tok(18, 2), card: null },
  { t: at('framing-c7'), card: 'BD1', at: full(-4.0) },
  { t: tok(19, 0), card: 'BD5', at: full(-4.0) },
  { t: tok(19, 1), card: 'B07', at: full(-4.0) },
  { t: at('framing-c8'), card: null },
  { t: at('framing-c9'), card: 'B07', at: full(-4.0) },
  { t: tok(20, 3), card: 'BD7', at: full(-4.0) },
  { t: tok(21, 0), card: 'BD4', at: full(-4.4, 5.0) },
  { t: tok(22, 0), card: 'BD8', at: full(-2.4, 2.6) },
  { t: tok(22, 2), card: null },
  { t: at('framing-c13'), card: 'BD3', at: full(-4.0) },
];
export const ORANGE_CHORUS: readonly (Pose | { t: number; card: null })[] = [
  { t: tok(10, 0), card: null },
  { t: tok(11, 0), card: 'O05', at: face(3.0, true) },
  // anticipation on the "Blue!" before "ORANGE!": her crouch (disco); the release is the metal transformation
  { t: tok(12, 0), card: 'OD5', at: full(3.6) },
  { t: tok(13, 0), card: 'OM8', at: kneeUp(3.4, 10.6) },
  { t: at('framing-pre-both'), card: 'OM3', at: full(3.8) },
  { t: at('framing-c1'), card: 'OM3', at: full(4.0) },
  { t: tok(15, 3), card: 'OM8', at: kneeUp(3.6, 10.6) },
  { t: tok(16, 1), card: 'OM6', at: kneeUp(3.6, 10.6) },
  { t: at('framing-c3'), card: 'OM6', at: full(4.0) },
  { t: tok(17, 0), card: 'OM1', at: full(4.2, 5.0) },
  { t: tok(18, 0), card: 'OM2', at: full(2.4, 2.6) },
  { t: tok(18, 2), card: 'OM5', at: waistUp(4.4, 13) },
  { t: at('framing-c7'), card: 'OM3', at: full(4.0) },
  { t: at('framing-c8'), card: 'OM8', at: kneeUp(3.6, 10.6) },
  { t: tok(20, 1), card: 'OM6', at: kneeUp(3.6, 10.6) },
  { t: at('framing-c9'), card: 'OM6', at: full(4.0) },
  { t: tok(21, 0), card: 'OM3', at: full(4.4, 5.0) },
  { t: tok(22, 0), card: 'OM2', at: full(2.4, 2.6) },
  { t: tok(22, 2), card: 'OM5', at: waistUp(4.4, 13) },
  { t: at('framing-c13'), card: 'OM1', at: full(4.0) },
];

/** Anticipation -> release pairs (reported; the cards above implement them). */
export const PAIRS = [
  { who: 'O', anticipation: 'marker-sep', release: 'marker-feature', what: 'groove: crouch OM4 on =======, horns OM1 on >>>>>>>' },
  { who: 'B', anticipation: 'kick-anticipate', release: 'kick-head', what: 'verse 1: crouch BD5 on "main", kick BD6 on "stable"' },
  { who: 'O', anticipation: 'orange-anticipate', release: 'orange-release', what: 'verse 1: intruder crouch OD5 on "who", springs in OD4 on "you?"' },
  { who: 'O', anticipation: 'tok-12-0', release: 'tok-13-0', what: 'pre-chorus: crouch OD5 on "Blue!", METAL transformation OM8 on "ORANGE!"' },
  { who: 'B', anticipation: 'framing-c1', release: 'tok-15-1', what: 'chorus: crouch BD5 on the downbeat, stomp B07 on "current"' },
  { who: 'O', anticipation: 'tok-15-3', release: 'tok-16-1', what: 'chorus: scream OM8 on "(NO!)", stomp OM6 on "incoming"' },
  { who: 'B', anticipation: 'tok-19-0', release: 'tok-19-1', what: 'chorus: crouch BD5 on "Accept", stomp B07 on "current"' },
  { who: 'O', anticipation: 'framing-c8', release: 'tok-20-1', what: 'chorus: scream OM8, stomp OM6 on "incoming"' },
] as const;
