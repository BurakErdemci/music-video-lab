// Deterministic randomness for frame-pure effects: the same key always yields the same sequence.

export interface Rng {
  /** Uniform in [0, 1). */
  (): number;
  range: (a: number, b: number) => number;
  /** Integer in [a, b] inclusive. */
  int: (a: number, b: number) => number;
  /** -1 or 1. */
  sign: () => number;
  pick: <T>(items: readonly T[]) => T;
}

/** FNV-1a 32-bit hash of the key's string form. */
export const hashKey = (key: string | number): number => {
  const s = String(key);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32 seeded by the key's hash. */
export const seeded = (key: string | number): Rng => {
  let state = hashKey(key);
  const next = (() => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.range = (a, b) => a + (b - a) * next();
  next.int = (a, b) => Math.floor(a + (b - a + 1) * next());
  next.sign = () => (next() < 0.5 ? -1 : 1);
  next.pick = (items) => items[Math.floor(next() * items.length)] as (typeof items)[number];
  return next;
};
