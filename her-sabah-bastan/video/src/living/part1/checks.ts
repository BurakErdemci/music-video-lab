// Part1 type checks, run by node (node --experimental-strip-types video/src/living/part1/checks.ts; living-checks.mjs
// calls it with --checks-module). Measures, per song frame 468..1739, with the same shot code the video uses:
//   1. caption overlap: two captions on screen at once (must be 0 frames; one caption line at a time);
//   2. captions and stamps clear of the characters' drawn boxes (bbox of the sprite, projected; margin 6 px);
//   3. every caption and stamp inside the frame.
// fonts.ts loads FontFaces at import: stub the browser bits it touches before importing the shot code.
const g = globalThis as unknown as Record<string, unknown>;
g.FontFace = class {
  load(): Promise<unknown> {
    return Promise.resolve(this);
  }
};
g.document = { fonts: { add: () => undefined } };
g.window = g.window ?? {};

const { characterBoxes } = await import('./shots.ts');
const { CAPTIONS, STAMPS, CAPTION_FADE, captionBox, stampBox } = await import('./typeLayout.ts');

type Box = { x: number; y: number; w: number; h: number };
const MARGIN = 6;
const hit = (a: Box, b: Box): boolean => a.x < b.x + b.w + MARGIN && b.x < a.x + a.w + MARGIN && a.y < b.y + b.h + MARGIN && b.y < a.y + a.h + MARGIN;
const inside = (a: Box): boolean => a.x >= 0 && a.y >= 0 && a.x + a.w <= 1920 && a.y + a.h <= 1080;

const STAMP_EXIT = 6;
let captionOverlap = 0;
const charHits = new Map<string, number[]>();
const outside = new Set<string>();
const note = (k: string, f: number): void => {
  const a = charHits.get(k) ?? [];
  a.push(f);
  charHits.set(k, a);
};
for (let f = 468; f < 1740; f++) {
  const caps = CAPTIONS.filter((c) => f >= c.show && f < c.hide + CAPTION_FADE);
  if (caps.length > 1) captionOverlap++;
  const stamps = STAMPS.filter((s) => f >= s.show && f < s.hide + STAMP_EXIT);
  const chars = characterBoxes(f);
  for (const c of caps) {
    const b = captionBox(c);
    if (!inside(b)) outside.add(`caption ${c.n}`);
    for (const ch of chars) if (hit(b, ch.box)) note(`caption ${c.n} x ${ch.who}`, f);
  }
  for (const s of stamps) {
    const b = stampBox(s);
    if (!inside(b)) outside.add(`stamp ${s.text}`);
    for (const ch of chars) if (hit(b, ch.box)) note(`stamp ${s.text} x ${ch.who}`, f);
    for (const c of caps) if (hit(b, captionBox(c))) note(`stamp ${s.text} x caption ${c.n}`, f);
  }
}
const runs = (fs: number[]): string => {
  const out: string[] = [];
  let a = fs[0] as number;
  let p = a;
  for (const f of fs.slice(1).concat([-1])) {
    if (f !== p + 1) {
      out.push(a === p ? `${a}` : `${a}-${p}`);
      a = f;
    }
    p = f;
  }
  return out.join(',');
};
console.log(`caption overlap frames: ${captionOverlap}`);
console.log(`type x character / caption hits: ${charHits.size ? '' : 'none'}`);
for (const [k, fs] of charHits) console.log(`  ${k}: ${fs.length} frames (${runs(fs)})`);
console.log(`outside the frame: ${outside.size ? [...outside].join(', ') : 'none'}`);
const pass = captionOverlap === 0 && charHits.size === 0 && outside.size === 0;
console.log(`TYPECHECK: ${pass ? 'PASS' : 'FAIL'}`);

export {};
