// Motion grammar of the typography layer (docs/typography.md), in seconds. Components convert with the
// composition fps, so the same numbers hold at 30 and 60 fps.
export const MOTION = {
  /** Slam: 2.2x -> 0.9x. */
  slamIn: 0.1,
  /** Overshoot settle 0.9x -> 1x. */
  slamSettle: 0.07,
  /** Delay between syllable groups ("VO-" "RA-" "THUL!"). */
  stagger: 0.067,
  /** Crumble out. */
  crumble: 0.27,
  /** The hold jitter and other 2D overlay detail step on twos of 30 fps (1/15 s). */
  twos: 1 / 15,
  /** Office headline and card: slide-up pop, bar sweep, wipe out. */
  popIn: 0.13,
  barSweep: 0.2,
  wipe: 0.2,
  /** Soft chapter card (interlude). */
  softIn: 0.5,
  softOut: 0.6,
} as const;

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOut = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const easeIn = (t: number): number => clamp01(t) ** 2;
