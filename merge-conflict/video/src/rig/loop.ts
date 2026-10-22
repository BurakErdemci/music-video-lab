// Drawn motion loops (scene-map.md, last section "Drawn motion loops everywhere", Burak): a card that has in-between
// drawings <id>b and <id>c in the manifest plays them as a stepped loop - base, b, c, b - with the phase on the beat
// grid and the speed following the section energy: 3 drawings a beat (about 9 a second at 180 BPM) in the choruses
// and metal, 2 in the verses, 1 in the quiet parts, one every two beats in the piano (RATE). The drawings share the base card's framing,
// so its rig, face/action boxes and placement are the base card's. Node-safe.
import manifestJson from '../../public/cards/manifest.json' with { type: 'json' };
import { beatPos, sectionAt } from '../timing.ts';
import { TIER } from './ripple.ts';

const MANIFEST = manifestJson as Record<string, unknown>;
const PATTERN = [0, 1, 2, 1] as const;

/** The card ids of a loop: [base, b, c], or the base three times when it has no in-betweens. */
export const loopIds = (id: string): [string, string, string] =>
  MANIFEST[`${id}b`] && MANIFEST[`${id}c`] ? [id, `${id}b`, `${id}c`] : [id, id, id];

/** Sections whose loop speed is set apart from their ripple tier (drawings per beat). The piano keeps its ripple off
 *  (tier 0) but its girls breathe: one drawing every two beats (round 9, Burak: no frozen 4 s in the piano). */
const RATE: Record<string, number> = { piano_interlude: 0.5 };

/** Drawings per beat at t, from the section's energy tier. */
export const loopRate = (t: number): number => {
  const sec = sectionAt(t);
  if (RATE[sec] !== undefined) return RATE[sec] as number;
  const tier = TIER[sec] ?? 0;
  return tier >= 0.7 ? 3 : tier >= 0.35 ? 2 : tier > 0 ? 1 : 0;
};

/** Which drawing (0 base, 1 b, 2 c) shows at t, at the section's rate or at `rate` drawings a beat (round 11: a walk
 *  steps one drawing a beat, so base, b, c, b is one stride cycle of four beats, whatever the section's tier). */
export const loopIndex = (t: number, rate?: number): 0 | 1 | 2 => {
  const r = rate ?? loopRate(t);
  return r === 0 ? 0 : PATTERN[Math.floor(beatPos(t) * r) % PATTERN.length] as 0 | 1 | 2;
};
