// METAL AMOUNT (scene-map.md "Final song and the pop-metal blend"): a continuous 0..1 per frame from the
// measured per-bar heaviness (`bars[].heavy`, 0-100), smoothed across bar boundaries, with Burak's ear
// overriding the measurement where listed. It drives the palette (candy -> black, red and steel), the
// particles (confetti -> confetti + embers + sparks) and the type (rounded neon -> blackletter / jagged).
// It does NOT swap the girls' costumes: the costume belongs to the girl (girls/costume.ts, Burak 2026-10-21).
// Pure, closed form, erasable TypeScript (node tests it in tools/gridcheck.mjs).
import { barLengthAt, bars, f, sections, type TimingBar } from '../timing.ts';

export type SingerKey = 'B' | 'O' | 'both';

/** Ear overrides: where Burak's ear overrides the heaviness proxy. Each forces the metal amount for the whole
 *  section; after the section the amount slides back to the measured curve over one (local) bar. */
export const EAR_OVERRIDES: readonly { section: string; metal: number; why: string }[] = [
  { section: 'intro_groove', metal: 1, why: 'Burak 2026-10-21: the intro up to the first lyric is hard metal (the proxy scored it 61, mid)' },
];
/** One "step" of the per-singer bias: the blue (sweet) lines sit a step toward pop, the orange toward metal. */
export const SINGER_STEP = 0.15;

const overrideAt = (t: number): { metal: number; start: number; end: number } | null => {
  for (const o of EAR_OVERRIDES) {
    const s = sections.find((x) => x.name === o.section);
    if (!s) throw new Error(`ear override: no section "${o.section}" in the timing`);
    // compared on the 60 fps frame grid: the frame a section starts on belongs to it (its clock can read a
    // few ms before the measured start)
    if (f(t) >= f(s.start) && f(t) < f(s.end)) return { metal: o.metal, start: s.start, end: s.end };
  }
  return null;
};
const endedOverride = (t: number): { metal: number; end: number } | null => {
  for (const o of EAR_OVERRIDES) {
    const s = sections.find((x) => x.name === o.section) as { start: number; end: number };
    if (f(t) >= f(s.end) && t < s.end + barLengthAt(s.end)) return { metal: o.metal, end: s.end };
  }
  return null;
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mid = (b: TimingBar) => (b.start + b.end) / 2;
/** Measured amount: piecewise linear between bar centres (so a bar boundary never jumps). */
export const measuredAt = (t: number): number => {
  const n = bars.length;
  if (t <= mid(bars[0] as TimingBar)) return (bars[0] as TimingBar).heavy / 100;
  for (let i = 0; i < n - 1; i++) {
    const a = bars[i] as TimingBar;
    const b = bars[i + 1] as TimingBar;
    if (t < mid(b)) {
      const k = (t - mid(a)) / (mid(b) - mid(a));
      return (a.heavy + (b.heavy - a.heavy) * k) / 100;
    }
  }
  return (bars[n - 1] as TimingBar).heavy / 100;
};

/** The metal amount at t (0 pop, 1 metal), with the ear overrides and their one-bar slide out. */
export const metalAt = (t: number): number => {
  const o = overrideAt(t);
  if (o) return o.metal;
  const e = endedOverride(t);
  const m = measuredAt(t);
  if (e) {
    const k = clamp01((t - f(e.end) / 60) / barLengthAt(e.end));
    const ease = 1 - (1 - k) * (1 - k);
    return e.metal + (m - e.metal) * ease;
  }
  return m;
};
/** The metal amount a singer's line takes: blue a step toward pop, orange a step toward metal. */
export const metalFor = (t: number, singer: SingerKey): number => {
  const o = overrideAt(t);
  if (o) return o.metal; // the ear override holds for both girls
  return clamp01(metalAt(t) + (singer === 'O' ? SINGER_STEP : singer === 'B' ? -SINGER_STEP : 0));
};
