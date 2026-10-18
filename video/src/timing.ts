// Typed view of data/timing.json. The file is copied into src/data/ (npm run sync-timing)
// instead of imported across the repo: the Remotion bundler then only sees files inside
// video/, and tools/beatcheck.mjs compares the copy with data/timing.json byte for byte.
// Only erasable TypeScript syntax here: node loads this file directly in tools/.
import raw from './data/timing.json' with { type: 'json' };

export interface TimingWord {
  w: string;
  start: number;
  end: number;
  line: number;
}
export interface TimingLine {
  text: string;
  section: string;
  start: number | null;
  end: number | null;
  energy_hint: { start: number; end: number } | null;
}
export interface TimingSection {
  name: string;
  start: number;
  end: number;
  start_bar: number;
  end_bar: number;
}
export interface Timing {
  fps: number;
  duration: number;
  beats: number[];
  downbeats: number[];
  sections: TimingSection[];
  lines: TimingLine[];
  words: TimingWord[];
  hits: { t: number; frame: number }[];
}

export const TIMING = raw as unknown as Timing;
export const FPS = 30;
export const DURATION_SECONDS = TIMING.duration;
export const DURATION_FRAMES = Math.ceil(DURATION_SECONDS * FPS);
export const BEAT_COUNT = TIMING.beats.length;

export const toFrame = (t: number): number => Math.round(t * FPS);
export const beatTime = (i: number): number => {
  const t = TIMING.beats[i];
  if (t === undefined) throw new Error(`no beat ${i}`);
  return t;
};
export const beatFrame = (i: number): number => toFrame(beatTime(i));

/** 1-based bar number: bar 1 = downbeats[0]. */
export const barTime = (bar: number): number => {
  const t = TIMING.downbeats[bar - 1];
  if (t === undefined) throw new Error(`no bar ${bar}`);
  return t;
};
export const barFrame = (bar: number): number => toFrame(barTime(bar));

export const nearestBeatIndex = (t: number): number => {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < TIMING.beats.length; i++) {
    const d = Math.abs((TIMING.beats[i] as number) - t);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
};
export const nearestBeatFrame = (t: number): number => beatFrame(nearestBeatIndex(t));
export const barBeatIndex = (bar: number): number => nearestBeatIndex(barTime(bar));

const normalize = (s: string): string => s.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]/gu, '');

export interface LineFrames {
  index: number;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
}
/** Line by index or by (normalized) text. Lines without a measured time use energy_hint. */
export const lineFrames = (ref: number | string): LineFrames => {
  const index =
    typeof ref === 'number'
      ? ref
      : TIMING.lines.findIndex((l) => normalize(l.text) === normalize(ref));
  const line = TIMING.lines[index];
  if (!line) throw new Error(`no line ${String(ref)}`);
  const start = line.start ?? line.energy_hint?.start;
  const end = line.end ?? line.energy_hint?.end;
  if (start === undefined || end === undefined) throw new Error(`line ${index} has no time`);
  return { index, start, end, startFrame: toFrame(start), endFrame: toFrame(end) };
};

export const wordStartTime = (word: string, occurrence = 0): number => {
  const key = normalize(word);
  const hits = TIMING.words.filter((w) => normalize(w.w) === key);
  const w = hits[occurrence];
  if (!w) throw new Error(`no word ${word} #${occurrence}`);
  return w.start;
};
export const wordFrame = (word: string, occurrence = 0): number => toFrame(wordStartTime(word, occurrence));

/** Start time of the k-th word of line `lineIndex` (the words table links words to lines). */
export const lineWordTime = (lineIndex: number, k: number): number => {
  const w = TIMING.words.filter((x) => x.line === lineIndex)[k];
  if (!w) throw new Error(`no word ${k} in line ${lineIndex}`);
  return w.start;
};
