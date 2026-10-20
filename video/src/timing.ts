// Typed view of ../data/timing.json (copied to src/data/ by `npm run sync-timing`; tools/beatcheck.mjs
// requires the copy to be byte-identical). Erasable TypeScript only: node loads this file in tools/.
import raw from './data/timing.json' with { type: 'json' };

export interface TimingWord { w: string; start: number; end: number; line: number }
export interface TimingSection { name: string; start: number; end: number; start_frame: number; end_frame: number }
export interface TimingHit { t: number; frame: number }
export interface Timing {
  fps: number;
  duration: number;
  beats: number[];
  downbeats: number[];
  sections: TimingSection[];
  words: TimingWord[];
  hits: TimingHit[];
}

export const TIMING = raw as unknown as Timing;
export const FPS = 30;
export const DURATION_FRAMES = Math.round(TIMING.duration * FPS);

/** Seconds to frame. */
export const f = (t: number): number => Math.round(t * FPS);

export const beatFrame = (i: number): number => {
  const t = TIMING.beats[i];
  if (t === undefined) throw new Error(`no beat ${i}`);
  return f(t);
};

/** Index of the beat closest to t seconds. */
export const nearestBeat = (t: number): number => {
  let best = 0;
  for (let i = 1; i < TIMING.beats.length; i++) {
    if (Math.abs((TIMING.beats[i] as number) - t) < Math.abs((TIMING.beats[best] as number) - t)) best = i;
  }
  return best;
};

/** Nearest measured hit to t; throws when none is within tolMs. */
export const hit = (t: number, tolMs: number): TimingHit & { index: number } => {
  let best = -1;
  for (let i = 0; i < TIMING.hits.length; i++) {
    if (best < 0 || Math.abs((TIMING.hits[i] as TimingHit).t - t) < Math.abs((TIMING.hits[best] as TimingHit).t - t)) best = i;
  }
  const h = TIMING.hits[best];
  if (!h || Math.abs(h.t - t) * 1000 > tolMs) throw new Error(`no measured hit within ${tolMs} ms of ${t}s`);
  return { ...h, index: best };
};

const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Measured start/end of the nth occurrence of a word or phrase in `words`; throws if absent. */
export const word = (text: string, nth = 0): { start: number; end: number } => {
  const target = text.split(/\s+/).map(norm).filter(Boolean);
  const ws = TIMING.words.map((x) => norm(x.w));
  let seen = 0;
  for (let i = 0; i + target.length <= ws.length; i++) {
    if (target.every((tok, k) => ws[i + k] === tok)) {
      if (seen++ === nth) return { start: (TIMING.words[i] as TimingWord).start, end: (TIMING.words[i + target.length - 1] as TimingWord).end };
    }
  }
  throw new Error(`measured word "${text}" #${nth} not found in timing.json`);
};

/** Name of the section a frame falls in. */
export const section = (frame: number): string => {
  const s = TIMING.sections.find((x) => frame >= x.start_frame && frame < x.end_frame);
  return (s ?? (TIMING.sections[TIMING.sections.length - 1] as TimingSection)).name;
};
