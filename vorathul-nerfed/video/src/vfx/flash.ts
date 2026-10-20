// Photosensitivity budget (contract: at most 3 flashes in any 1-second window) and the grade
// cue-list builder (storyboard 2, N10). Strict counting, the same rule as tools/flashcheck.py's
// default: every large luminance swing is one flash, so at most 3 swings in any `fps`-frame window.
// (Counting a flash as a PAIR of swings allowed 6, and the gallery built that way failed flashcheck.)
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
  return { maxSwingsPerSecond: max, flashesPerSecond: max, ok: max <= MAX_FLASHES_PER_SECOND };
};

/** Throws when the swings exceed the budget; call it where the schedule is built, like timing.ts's helpers. */
export const assertFlashBudget = (swings: readonly Swing[], label: string, fps = FPS): void => {
  const r = flashRate(swings, fps);
  if (!r.ok) throw new Error(`${label}: ${r.flashesPerSecond} flashes in one second (limit ${MAX_FLASHES_PER_SECOND})`);
};

/**
 * Every palette change counts as one swing. Conservative on purpose: a hard two-colour grade
 * changes most pixels even when the frame's mean luminance barely moves. A cue that keeps the
 * same two colours and only changes detail (halftone, outline) is not a swing.
 */
export const duotoneSwings = (cues: readonly DuotoneCue[]): Swing[] =>
  cues.filter((c, i) => {
    const prev = cues[i - 1];
    return !(prev?.colors && c.colors && prev.colors[0] === c.colors[0] && prev.colors[1] === c.colors[1]);
  }).map((c) => ({ frame: c.frame, swings: 1 }));

/**
 * Swings caused by one ImpactBurst with `flash` frames (0-3): in, each change between the
 * ivory field / inverted scene / black field, and out. One impact per bar stays far inside the budget.
 */
export const impactSwings = (frame: number, flash: number): Swing[] => (flash > 0 ? [{ frame, swings: flash + 1 }] : []);

/** Palette presets of storyboard 2 §3 (P painting = null: back to the ungraded picture). */
export const GRADES = {
  V: { colors: [INK, VIOLET], hard: true },
  // The office grade (director's pick, O-b): his world drained to dark grey ink on office grey,
  // mid-tones as a fine dot screen, the darkest shapes edged in UI blue like a tool selection.
  O: { colors: ['#495057', '#E9ECEF'], hard: true, halftone: 7, outline: '#3B82F6' },
  // Alternatives kept for comparison, not for the default path: O-a = O without the edge;
  // O-c = MEMORY's soft inverted two-tone in office colours (white figure on pale UI blue).
  O_A: { colors: ['#495057', '#E9ECEF'], hard: true, halftone: 7 },
  O_C: { colors: ['#FFFFFF', '#A5C4F8'], hard: false },
  // O's colours as a soft, half-strength screen for seeps and one-beat drains. No selection edge:
  // on a soft, partial grade the blue line reads as a tool acting, which is the hard cut's job.
  O_SOFT: { colors: ['#495057', '#E9ECEF'], hard: false, halftone: 7, mix: 0.5 },
  P: { colors: null, hard: false },
  POSTER: { colors: [INK, IVORY], hard: true },
  GOLD: { colors: [INK, GOLD], hard: true },
  M: { colors: [INK, '#E0129A'], hard: true },
  MEMORY: { colors: [IVORY, '#8EC5E8'], hard: false },
} as const satisfies Record<string, { colors: readonly [string, string] | null; hard: boolean; halftone?: number; mix?: number; outline?: string }>;
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
    const g: { colors: readonly [string, string] | null; hard: boolean; halftone?: number; mix?: number; outline?: string } = GRADES[s.grade];
    cues.push({ frame: s.frame, colors: g.colors ? [g.colors[0], g.colors[1]] : null, hard: g.hard, halftone: g.halftone, mix: g.mix, outline: g.outline });
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
