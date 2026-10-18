#!/usr/bin/env node
// Stamp check (test90-v5): every stamp word stays inside its room with a margin while it stamps in (the 1.15x squash
// of its first frame, about its left edge; a seam word about its centre) and when settled, and keeps off the moon.
// The director saw "HATIRLAMIYORUM" clipped at the right edge for 2-3 frames and settled 8 px from it, and the two
// seam stamps on the moon.
//
//   node video/scripts/stampcheck.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { STAMPS, MOON_BOX } = await import(url('video/src/type/stamps.ts'));
const { stampWidth } = await import(url('video/src/type/stampLayout.ts'));
const { SEAM_X, W } = await import(url('video/src/layout.ts'));

const { readPng } = await import(url('video/scripts/jumpcheck.mjs'));
const { HUMAN, AI } = await import(url('video/src/scenes/acting.ts'));
const { resolveActor, STRIP_TABLE, frameScale } = await import(url('video/src/characters/actor.ts'));
const { ev } = await import(url('video/src/events.ts'));
const MIN_EDGE = 16;
// the characters' drawn pixels over the frames a word is up (test90-v5: the seam words sat on both heads)
const cache = new Map();
const occupied = (from, to) => {
  const occ = new Uint8Array(W * 1080);
  for (let f = from; f < to; f += 2)
    for (const acts of [HUMAN, AI]) {
      const st = resolveActor(acts, f);
      if (!st) continue;
      const p = st.cur;
      const m = STRIP_TABLE[p.strip];
      const fr = m.frames[p.k];
      const sc = frameScale(m, fr);
      const file = path.join(ROOT, 'video/public', m.dir, fr.file);
      if (!cache.has(file)) cache.set(file, readPng(file));
      const png = cache.get(file);
      for (let y = 0; y < png.h; y += 2)
        for (let x = 0; x < png.w; x += 2) {
          if (png.px[(y * png.w + x) * 4 + 3] < 100) continue;
          const X = Math.round(p.x + (x - fr.ax) * sc * (p.flip ? -1 : 1));
          const Y = Math.round(p.y - (png.h - y) * sc);
          if (X >= 0 && Y >= 0 && X < W && Y < 1080) occ[Y * W + X] = 1;
        }
    }
  return occ;
};
let bad = 0;
for (const st of STAMPS) {
  const w = stampWidth(st.text, st.spot.size) * 1.04; // rendered Anton runs ~4% wider than its advances
  const h = st.spot.size * 1.1;
  const room = st.side === 'human' ? [0, SEAM_X] : st.side === 'ai' ? [SEAM_X, W] : [0, W];
  // widest box: the 1.15x first frame
  let x0;
  let x1;
  if (st.seam) {
    const cx = st.spot.x + st.spot.width / 2;
    x0 = cx - (w * 1.15) / 2;
    x1 = cx + (w * 1.15) / 2;
  } else {
    x0 = st.spot.x;
    x1 = st.spot.x + w * 1.15;
  }
  const settled = st.seam ? null : room[1] - (st.spot.x + w);
  const margin = Math.min(x0 - room[0], room[1] - x1);
  const y0 = st.spot.y;
  const y1 = st.spot.y + h * 1.15;
  const moon = !(x1 < MOON_BOX.x || x0 > MOON_BOX.x + MOON_BOX.w || y1 < MOON_BOX.y || y0 > MOON_BOX.y + MOON_BOX.h);
  const occ = occupied(ev(st.id).frame, ev(st.hide).frame + 8);
  let onChar = 0;
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(1080, y1); y++) for (let x = Math.max(0, Math.round(x0)); x < Math.min(W, x1); x++) onChar += occ[y * W + x];
  const ok = margin >= MIN_EDGE && !moon && onChar === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'BAD '} ${st.text.padEnd(16)} ${st.side.padEnd(5)} x ${st.spot.x} y ${st.spot.y} size ${st.spot.size}: margin while stamping ${margin.toFixed(0)} px${settled !== null ? `, settled right margin ${settled.toFixed(0)} px` : ''}${moon ? ', ON THE MOON' : ''}${onChar ? `, ON A CHARACTER (${onChar} px)` : ''}`);
}
console.log(`stampcheck: ${bad} of ${STAMPS.length} stamps outside their room, on the moon or on a character`);
process.exit(bad ? 1 : 0);
