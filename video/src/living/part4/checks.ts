// Part4 type checks, run by node (node --experimental-strip-types video/src/living/part4/checks.ts [A-B]; living-checks.mjs
// calls it with --checks-module and the range comes from env PART4_RANGE, e.g. 4676-6395 or 6396-7222; default both).
// Measures, per song frame, with the same shot code the video uses:
//   1. caption overlap: two captions on screen at once (must be 0 frames);
//   2. captions and stamps clear of the characters' HEADS (projected head box of every stage layer whose sprite
//      resolves with hasSprite and has a measured head; margin 6 px). 'flat', 'gl' and 'shatter' shots expose only
//      painters, so their frames are skipped for this check and counted;
//   3. every caption and stamp inside the frame.
// Then a purity grep of video/src/living/part4.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const g = globalThis as unknown as Record<string, unknown>;
g.FontFace = class {
  load(): Promise<unknown> {
    return Promise.resolve(this);
  }
};
g.document = { fonts: { add: () => undefined } };
g.window = g.window ?? {};

const { shotAt } = await import('./shots.ts');
const { headOf, hasSprite, sp, LIFT_PAD } = await import('./common.ts');
const { planeScale } = await import('../types.ts');

type Box = { x: number; y: number; w: number; h: number };
const MARGIN = 6;
const hit = (a: Box, b: Box): boolean => a.x < b.x + b.w + MARGIN && b.x < a.x + a.w + MARGIN && a.y < b.y + b.h + MARGIN && b.y < a.y + a.h + MARGIN;
const inside = (a: Box): boolean => a.x >= 0 && a.y >= 0 && a.x + a.w <= 1920 && a.y + a.h <= 1080;

const rangeArg = (process.argv[2] ?? process.env.PART4_RANGE ?? '4676-7222').trim();
const ranges: [number, number][] = [rangeArg.split('-').map(Number) as [number, number]];
const HERE = path.dirname(fileURLToPath(import.meta.url));

let skippedFlat = 0;
let skippedGl = 0;
let skippedShatter = 0;
/** Projected body and head boxes of the figures of a frame; painter-only shots give none and are counted. */
const figures = (f: number): { who: string; body: Box; head: Box }[] => {
  const s = shotAt(f);
  if (s.kind === 'flat') {
    skippedFlat++;
    return [];
  }
  if (s.kind === 'gl') {
    skippedGl++;
    return [];
  }
  if (s.kind === 'shatter') {
    skippedShatter++;
    return [];
  }
  const out: { who: string; body: Box; head: Box }[] = [];
  for (const l of s.layers) {
    const key = l.src.kind === 'canvas' ? l.src.key : l.src.url;
    const name = (key.split(':').pop() as string).replace(/^.*\//, '').replace(/(-noeye|-eye)?\.png$/, '');
    if (!hasSprite(name)) continue;
    const m = sp(name);
    let h: ReturnType<typeof headOf> = null;
    try {
      h = headOf(name);
    } catch {
      h = null;
    }
    if (!h) continue; // props and backgrounds have no head
    const pad = l.src.kind === 'canvas' ? LIFT_PAD : 0;
    const sx = l.w / m.w;
    const sy = l.h / (m.h + pad);
    const k = planeScale(s.cam, l.d);
    const toScr = (x: number, y: number): [number, number] => [960 + (l.x + x * sx - s.cam.x) * k, 540 + (l.y + (y + pad) * sy - s.cam.y) * k];
    const bb = m.bbox as number[] | undefined;
    if (!bb) continue;
    const [bx0, by0] = toScr(bb[0] as number, bb[1] as number);
    const [bx1, by1] = toScr(bb[2] as number, bb[3] as number);
    const [hx, hy] = toScr(h.top[0], h.top[1]);
    const hs = h.h * sy * k;
    out.push({ who: `${l.id}:${name}`, body: { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 }, head: { x: hx - hs * 0.62, y: hy, w: hs * 1.24, h: hs } });
  }
  return out;
};

const runs = (fs2: number[]): string => {
  const out: string[] = [];
  let a = fs2[0] as number;
  let p = a;
  for (const f of fs2.slice(1).concat([-1])) {
    if (f !== p + 1) {
      out.push(a === p ? `${a}` : `${a}-${p}`);
      a = f;
    }
    p = f;
  }
  return out.join(',');
};

let pass = true;
let TL: Record<string, any> | null = null;
try {
  TL = (await import('./typeLayout.ts')) as Record<string, any>;
} catch (e) {
  console.log(`typeLayout missing (${(e as Error).message.split('\n')[0]}); caption and stamp checks skipped`);
  pass = false;
}

if (TL) {
  const { CAPTIONS, STAMPS, CAPTION_FADE, captionBox, stampBox } = TL;
  const STAMP_EXIT = 6;
  let captionOverlap = 0;
  let frames = 0;
  const headHits = new Map<string, number[]>();
  const bodyHits = new Map<string, number>();
  const outside = new Set<string>();
  const note = (k: string, f: number): void => {
    const a = headHits.get(k) ?? [];
    a.push(f);
    headHits.set(k, a);
  };
  for (const [from, to] of ranges) {
    for (let f = from; f <= to; f++) {
      frames++;
      const caps = CAPTIONS.filter((c: any) => f >= c.show && f < c.hide + CAPTION_FADE);
      if (caps.length > 1) captionOverlap++;
      const stamps = STAMPS.filter((s: any) => f >= s.show && f < s.hide + STAMP_EXIT);
      const figs = figures(f);
      const items: [string, Box][] = [...caps.map((c: any): [string, Box] => [`caption ${c.n}`, captionBox(c)]), ...stamps.map((s: any): [string, Box] => [`stamp ${s.text}`, stampBox(s)])];
      for (const [name, b] of items) {
        if (!inside(b)) outside.add(name);
        for (const fg of figs) {
          if (hit(b, fg.head)) note(`${name} x head of ${fg.who}`, f);
          else if (hit(b, fg.body)) bodyHits.set(`${name} x body of ${fg.who}`, (bodyHits.get(`${name} x body of ${fg.who}`) ?? 0) + 1);
        }
      }
      for (const s of stamps) for (const c of caps) if (hit(stampBox(s), captionBox(c))) note(`stamp ${s.text} x caption ${c.n}`, f);
    }
  }
  console.log(`range ${ranges.map((r) => r.join('-')).join(', ')} (${frames} frames); head check skipped on flat ${skippedFlat}, gl ${skippedGl}, shatter ${skippedShatter} frames`);
  console.log(`caption overlap frames: ${captionOverlap}`);
  console.log(`type x head / type x caption hits: ${headHits.size ? '' : 'none'}`);
  for (const [k, fs2] of headHits) console.log(`  ${k}: ${fs2.length} frames (${runs(fs2)})`);
  console.log(`type over a body (allowed, information): ${bodyHits.size ? '' : 'none'}`);
  for (const [k, n] of bodyHits) console.log(`  ${k}: ${n} frames`);
  console.log(`outside the frame: ${outside.size ? [...outside].join(', ') : 'none'}`);
  pass = captionOverlap === 0 && headHits.size === 0 && outside.size === 0;
}

// Purity grep of part4 (comment-only lines do not count).
// The names are joined at run time so this file does not match the purity scan of living-checks.mjs itself.
const J = (...p: string[]): string => p.join('');
const pat: [string, RegExp][] = [
  [J('Math', '.random'), new RegExp(J('Math', '\.random'))],
  ['Date', new RegExp(J('Date', '\.now|new ', 'Date'))],
  [J('performance', '.now'), new RegExp(J('performance', '\.now'))],
  [J('request', 'AnimationFrame'), new RegExp(J('request', 'AnimationFrame'))],
  [J('set', 'Timeout'), new RegExp(J('set', 'Timeout'))],
  [J('set', 'Interval'), new RegExp(J('set', 'Interval'))],
  [J('use', 'Frame'), new RegExp(J('use', 'Frame'))],
];
const counts = new Map<string, number>(pat.map(([n]) => [n, 0]));
const where: string[] = [];
for (const n of fs.readdirSync(HERE)) {
  if (!/\.(tsx?|mjs|jsx?)$/.test(n) || n === 'checks.ts') continue;
  fs.readFileSync(path.join(HERE, n), 'utf8').split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const [name, re] of pat) {
      if (re.test(line)) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
        where.push(`${n}:${i + 1} ${line.trim().slice(0, 90)}`);
      }
    }
  });
}
const total = [...counts.values()].reduce((a, b) => a + b, 0);
console.log(`purity grep of part4: ${[...counts].map(([n, c]) => `${n} ${c}`).join(', ')}`);
for (const w of where) console.log(`  ${w}`);
if (total) pass = false;
console.log(`TYPECHECK: ${pass ? 'PASS' : 'FAIL'}`);

export {};
