// Typed view of ../data/take-2026-10-20/mc-timing.json (copied here by `npm run sync-timing`; tools/beatcheck.mjs
// requires the copy to be byte-identical). The scene clock is in SECONDS; frames only appear at render time.
// Erasable TypeScript only: node loads this file in tools/.
import raw from './data/mc-timing.json' with { type: 'json' };

export interface TimingWord { w: string; s: number; e: number; p: number }
export interface TimingSection { name: string; start: number; end: number }
export interface TimingBar { bar: number; start: number; end: number }
export interface TimingStop { start: number; end: number; note?: string }
export interface TimingLine { section: string; text: string; ratio: number; start: number; end: number; heard: string }
/** [time in seconds, first word as heard, second word as heard] */
export type TimingHook = [number, string, string];
export interface Timing {
  duration: number;
  bpm_mean: number;
  beats: number[];
  downbeats: number[];
  bars: TimingBar[];
  sections: TimingSection[];
  words: TimingWord[];
  lyric_alignment: TimingLine[];
  accept_hooks: TimingHook[];
  hard_stops: TimingStop[];
  /** Short measured drops in level, [start, end] seconds (e.g. the stop at the end of the intro, 10.72-11.02). */
  micro_gaps: [number, number][];
}

export const TIMING = raw as unknown as Timing;
export const FPS = 60;
export const DURATION_SEC = TIMING.duration;
export const DURATION_FRAMES = Math.ceil(DURATION_SEC * FPS);

/** Frame to scene-clock seconds. */
export const sec = (frame: number): number => frame / FPS;
/** Seconds to frame. */
export const f = (t: number): number => Math.round(t * FPS);

const at = <T>(list: readonly T[], i: number, what: string): T => {
  const v = list[i];
  if (v === undefined) throw new Error(`no ${what} ${i}`);
  return v;
};

export const beats: readonly number[] = TIMING.beats;
export const downbeats: readonly number[] = TIMING.downbeats;
export const bars: readonly TimingBar[] = TIMING.bars;
export const sections: readonly TimingSection[] = TIMING.sections;
export const words: readonly TimingWord[] = TIMING.words;
export const lines: readonly TimingLine[] = TIMING.lyric_alignment;
export const acceptHooks: readonly TimingHook[] = TIMING.accept_hooks;
export const hardStops: readonly TimingStop[] = TIMING.hard_stops;
export const microGaps: readonly [number, number][] = TIMING.micro_gaps;

export const beat = (i: number): number => at(beats, i, 'beat');
export const downbeat = (i: number): number => at(downbeats, i, 'downbeat');
export const bar = (i: number): TimingBar => at(bars, i, 'bar');
export const lyricLine = (i: number): TimingLine => at(lines, i, 'lyric line');
export const acceptHook = (i: number): TimingHook => at(acceptHooks, i, 'accept hook');
export const hardStop = (i: number): TimingStop => at(hardStops, i, 'hard stop');

/** Section by name; throws when the name is unknown. */
export const sectionNamed = (name: string): TimingSection => {
  const s = sections.find((x) => x.name === name);
  if (!s) throw new Error(`no section "${name}" in mc-timing.json`);
  return s;
};

/** Name of the section a time (seconds) falls in; the last section for t past the end. */
export const sectionAt = (t: number): string => {
  const s = sections.find((x) => t >= x.start && t < x.end);
  return (s ?? at(sections, sections.length - 1, 'section')).name;
};

/** Index of the beat closest to t seconds. */
export const nearestBeat = (t: number): number => {
  let best = 0;
  for (let i = 1; i < beats.length; i++) {
    if (Math.abs(beat(i) - t) < Math.abs(beat(best) - t)) best = i;
  }
  return best;
};

/** Number of beats at or before t seconds, minus one (-1 before the first beat). */
export const beatIndexAt = (t: number): number => {
  let n = -1;
  for (let i = 0; i < beats.length && beat(i) <= t; i++) n = i;
  return n;
};

const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Measured index, text, start and end (seconds) of the nth occurrence of a word or phrase; throws if absent. */
export const word = (text: string, nth = 0): { index: number; text: string; start: number; end: number } => {
  const target = text.split(/\s+/).map(norm).filter(Boolean);
  if (!target.length) throw new Error('word(): empty text');
  const ws = words.map((x) => norm(x.w));
  let seen = 0;
  for (let i = 0; i + target.length <= ws.length; i++) {
    if (target.every((tok, k) => ws[i + k] === tok) && seen++ === nth) {
      const first = at(words, i, 'word');
      const last = at(words, i + target.length - 1, 'word');
      return { index: i, text: words.slice(i, i + target.length).map((x) => x.w).join(' '), start: first.s, end: last.e };
    }
  }
  throw new Error(`measured word "${text}" #${nth} not found in mc-timing.json`);
};
