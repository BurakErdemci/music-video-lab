// Seeded randomness (the sibling clip's vfx/seeded.ts pattern). Every random value in the film comes from
// seeded(key) with a key built from the frame-independent identity of the thing, plus a time step where a
// value must change over time (e.g. the scribble boil re-seeds every 4 frames at 60 fps).
export interface Rng {
  (): number;
  range: (a: number, b: number) => number;
  int: (a: number, b: number) => number;
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
