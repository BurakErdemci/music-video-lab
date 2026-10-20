// Part3 type checks, run by node (node --experimental-strip-types video/src/living/part3/checks.ts; living-checks.mjs
// calls it with --checks-module). Measures, per song frame 3340..4675, with the same shot code the video uses:
//   1. caption overlap: two captions on screen at once (must be 0 frames);
//   2. captions, stamps and the counter clear of the characters' HEADS (projected head box of each drawn figure,
//      margin 6 px) - the waist-up and medium shots of this part fill the frame with bodies, so type over a torso is
//      allowed, over a head is not; the body-box hits are printed too, for information;
//   3. every caption, stamp and the counter inside the frame.
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
const { CAPTIONS, STAMPS, CAPTION_FADE, COUNTER, captionBox, stampBox, counterBox } = await import('./typeLayout.ts');

type Box = { x: number; y: number; w: number; h: number };
const MARGIN = 6;
const hit = (a: Box, b: Box): boolean => a.x < b.x + b.w + MARGIN && b.x < a.x + a.w + MARGIN && a.y < b.y + b.h + MARGIN && b.y < a.y + a.h + MARGIN;
const inside = (a: Box): boolean => a.x >= 0 && a.y >= 0 && a.x + a.w <= 1920 && a.y + a.h <= 1080;

/** Projected body and head boxes of the figures of a frame. */
const figures = (f: number): { who: string; body: Box; head: Box }[] => {
  const s = shotAt(f);
  const st = s.kind === 'stage' ? s : s.kind === 'fold' ? (s.p < 0.5 ? s.from : s.to) : null;
  if (!st) return [];
  const out: { who: string; body: Box; head: Box }[] = [];
  for (const l of st.layers) {
    if (l.id !== 'human' && l.id !== 'ai') continue;
    const key = l.src.kind === 'canvas' ? l.src.key : l.src.url;
    const name = (key.split(':').pop() as string).replace(/^.*\//, '').replace(/(-noeye)?\.png$/, '');
    if (!hasSprite(name)) continue;
    const m = sp(name);
    const pad = l.src.kind === 'canvas' ? LIFT_PAD : 0;
    const sx = l.w / m.w;
    const sy = l.h / (m.h + pad);
    const k = planeScale(st.cam, l.d);
    const toScr = (x: number, y: number): [number, number] => [960 + (l.x + x * sx - st.cam.x) * k, 540 + (l.y + (y + pad) * sy - st.cam.y) * k];
    const bb = m.bbox as number[];
    const [bx0, by0] = toScr(bb[0] as number, bb[1] as number);
    const [bx1, by1] = toScr(bb[2] as number, bb[3] as number);
    let head: Box;
    try {
      const h = headOf(name);
      const [hx, hy] = toScr(h.top[0], h.top[1]);
      const hs = h.h * sy * k;
      head = { x: hx - hs * 0.62, y: hy, w: hs * 1.24, h: hs };
    } catch {
      // drawings without a measured head: the top 22 % of the box
      head = { x: bx0, y: by0, w: bx1 - bx0, h: (by1 - by0) * 0.22 };
    }
    out.push({ who: `${l.id}:${name}`, body: { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 }, head });
  }
  return out;
};

const STAMP_EXIT = 6;
let captionOverlap = 0;
const headHits = new Map<string, number[]>();
const bodyHits = new Map<string, number>();
const outside = new Set<string>();
const note = (k: string, f: number): void => {
  const a = headHits.get(k) ?? [];
  a.push(f);
  headHits.set(k, a);
};
for (let f = 3340; f < 4676; f++) {
  const caps = CAPTIONS.filter((c) => f >= c.show && f < c.hide + CAPTION_FADE);
  if (caps.length > 1) captionOverlap++;
  const stamps = STAMPS.filter((s) => f >= s.show && f < s.hide + STAMP_EXIT);
  const figs = figures(f);
  const items: [string, Box][] = [...caps.map((c): [string, Box] => [`caption ${c.n}`, captionBox(c)]), ...stamps.map((s): [string, Box] => [`stamp ${s.text}`, stampBox(s)])];
  if (f >= COUNTER.show && f < COUNTER.hide) items.push(['counter', counterBox()]);
  for (const [name, b] of items) {
    if (!inside(b)) outside.add(name);
    for (const fg of figs) {
      if (hit(b, fg.head)) note(`${name} x head of ${fg.who}`, f);
      else if (hit(b, fg.body)) bodyHits.set(`${name} x body of ${fg.who}`, (bodyHits.get(`${name} x body of ${fg.who}`) ?? 0) + 1);
    }
  }
  for (const s of stamps) for (const c of caps) if (hit(stampBox(s), captionBox(c))) note(`stamp ${s.text} x caption ${c.n}`, f);
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
console.log(`type x head / type x caption hits: ${headHits.size ? '' : 'none'}`);
for (const [k, fs] of headHits) console.log(`  ${k}: ${fs.length} frames (${runs(fs)})`);
console.log(`type over a body (allowed, information): ${bodyHits.size ? '' : 'none'}`);
for (const [k, n] of bodyHits) console.log(`  ${k}: ${n} frames`);
console.log(`outside the frame: ${outside.size ? [...outside].join(', ') : 'none'}`);
const pass = captionOverlap === 0 && headHits.size === 0 && outside.size === 0;
console.log(`TYPECHECK: ${pass ? 'PASS' : 'FAIL'}`);

export {};
