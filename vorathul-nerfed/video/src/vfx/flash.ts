// Photosensitivity budget (contract: at most 3 flashes in any 1-second window) and the grade
// cue-list builder (storyboard 2, N10). A flash is a pair of opposing large luminance swings, so
// the budget is counted in swings: at most 6 swings in any `fps`-frame window.
import type { DuotoneCue } from './DuotoneFlash.tsx';
import { beatFrame, f, FPS, word } from '../timing.ts';
import { GOLD, INK, IVORY, VIOLET } from './style.tsx';

export const MAX_FLASHES_PER_SECOND = 3;

/** A frame on which the picture's luminance jumps, with how many swings it causes. */
export interface Swing {
  frame: number;
  swings: number;
}

/** Most swings in any window of `fps` frames, and whether that stays within the budget. */
export const flashRate = (swings: readonly Swing[], fps = FPS): { maxSwingsPerSecond: number; flashesPerSecond: number; ok: boolean } => {
  const s = [...swings].sort((a, b) => a.frame - b.frame);
  let max = 0;
  for (let i = 0; i < s.length; i++) {
    let sum = 0;
    for (let j = i; j < s.length && (s[j] as Swing).frame < (s[i] as Swing).frame + fps; j++) sum += (s[j] as Swing).swings;
    max = Math.max(max, sum);
  }
  return { maxSwingsPerSecond: max, flashesPerSecond: max / 2, ok: max <= MAX_FLASHES_PER_SECOND * 2 };
};

/** Throws when the swings exceed the budget; call it where the schedule is built, like timing.ts's helpers. */
export const assertFlashBudget = (swings: readonly Swing[], label: string, fps = FPS): void => {
  const r = flashRate(swings, fps);
  if (!r.ok) throw new Error(`${label}: ${r.flashesPerSecond} flashes in one second (limit ${MAX_FLASHES_PER_SECOND})`);
};

/**
 * Every cue change counts as one swing. Conservative on purpose: a hard two-colour grade changes
 * most pixels even when the frame's mean luminance barely moves, so mean-luminance tests undercount.
 */
export const duotoneSwings = (cues: readonly DuotoneCue[]): Swing[] => cues.map((c) => ({ frame: c.frame, swings: 1 }));

/**
 * Swings caused by one ImpactBurst with `flash` frames (0-3): in, each change between the
 * ivory field / inverted scene / black field, and out. One impact per bar stays far inside the budget.
 */
export const impactSwings = (frame: number, flash: number): Swing[] => (flash > 0 ? [{ frame, swings: flash + 1 }] : []);

/** Palette presets of storyboard 2 §3 (P painting = null: back to the ungraded picture). */
export const GRADES = {
  V: { colors: [INK, VIOLET], hard: true },
  O: { colors: ['#ADB5BD', '#FFFFFF'], hard: true },
  O_SOFT: { colors: ['#ADB5BD', '#FFFFFF'], hard: false },
  P: { colors: null, hard: false },
  POSTER: { colors: [INK, IVORY], hard: true },
  GOLD: { colors: [INK, GOLD], hard: true },
  M: { colors: [INK, '#E0129A'], hard: true },
  MEMORY: { colors: [IVORY, '#8EC5E8'], hard: false },
} as const satisfies Record<string, { colors: readonly [string, string] | null; hard: boolean }>;
export type GradeName = keyof typeof GRADES;

/** Where a grade starts: a beat index, a measured word, a measured hit time, or a frame computed elsewhere. */
export type Anchor = { beat: number } | { word: string; nth?: number } | { frame: number };

export interface GradeStep {
  at: Anchor;
  grade: GradeName;
  /** Frames until the picture returns ungraded; omit to hold until the next step. */
  hold?: number;
}

const anchorFrame = (a: Anchor): number => ('beat' in a ? beatFrame(a.beat) : 'word' in a ? f(word(a.word, a.nth ?? 0).start) : a.frame);

/**
 * DuotoneFlash cues from anchors, so no grade carries a hand-typed frame. Throws if two steps
 * land on the same frame or the result breaks the flash budget.
 */
export const gradeCues = (steps: readonly GradeStep[], label = 'grade cues'): DuotoneCue[] => {
  const cues: DuotoneCue[] = [];
  const placed = steps.map((s) => ({ ...s, frame: anchorFrame(s.at) })).sort((a, b) => a.frame - b.frame);
  placed.forEach((s, i) => {
    const g = GRADES[s.grade];
    cues.push({ frame: s.frame, colors: g.colors ? [g.colors[0], g.colors[1]] : null, hard: g.hard });
    // A hold that reaches the next step is dropped: the next grade replaces this one directly.
    const next = placed[i + 1];
    if (s.hold !== undefined && (!next || next.frame > s.frame + s.hold)) cues.push({ frame: s.frame + s.hold, colors: null });
  });
  cues.sort((a, b) => a.frame - b.frame);
  for (let i = 1; i < cues.length; i++) {
    if ((cues[i] as DuotoneCue).frame === (cues[i - 1] as DuotoneCue).frame) throw new Error(`${label}: two cues on frame ${(cues[i] as DuotoneCue).frame}`);
  }
  assertFlashBudget(duotoneSwings(cues), label);
  return cues;
};
