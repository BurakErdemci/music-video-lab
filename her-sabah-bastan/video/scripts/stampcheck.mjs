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
// test2: the verse-2 camera zoom moves the characters on screen; the stamps are screen-space
const { cameraScale, cameraBox } = await import(url('video/src/world/verse2Geom.ts'));
const CAM_IN = ev('camera.in');
const CAM_OUT = ev('camera.out');
const camAt = (f) => cameraScale(f, CAM_IN.frame, CAM_IN.enter.frames, CAM_OUT.frame, CAM_OUT.enter.frames);
// ... and at 2:02 both lean through the glass (Test30Scene: crossPush, 46 px, 10 + 10 frames)
const { crossPush, CROSS_DIST, CROSS_HOLD, CROSS_OUT, OVER } = await import(url('video/src/world/verse2Geom.ts'));
const CROSS = ev('cross.hands');
const pushAt = (f) => crossPush(f, CROSS.frame, CROSS.enter.frames, CROSS_HOLD, CROSS_OUT, CROSS_DIST);
// test2-v2: a stamp must keep MARGIN px off the characters' drawn pixels, and must not sit on its own colour: a yellow
// word's part on the human side over the yellow notes (the glass column, the Merhaba note, chorus 2's overflow notes),
// a navy word over the navy room. Above SAME_MAX of that part's box fails. (The notes printed in the room plate image
// itself are not modelled.)
const MARGIN = 12;
const SAME_MAX = 0.15;
const { GLASS_SLOTS, GN_SIZE, GLASS_NOTE } = await import(url('video/src/world/glassGeom.ts'));
const { EVENTS } = await import(url('video/src/events.ts'));
const TALLY = EVENTS.filter((e) => e.id.startsWith('tally.')).map((e) => e.frame).sort((a, b) => a - b);
const OVERS = EVENTS.filter((e) => e.id.startsWith('over.')).map((e) => e.frame).sort((a, b) => a - b);
const FINAL_NOTE = ev('final.note').frame;
/** Yellow note boxes on the human side up at frame f. */
const yellowAt = (f) => {
  const out = [];
  GLASS_SLOTS.slice(0, TALLY.length).forEach((s, k) => {
    if (f >= TALLY[k]) out.push({ x: s.x - GN_SIZE / 2, y: s.y - GN_SIZE / 2, w: GN_SIZE, h: GN_SIZE });
  });
  if (f >= FINAL_NOTE) out.push({ x: GLASS_NOTE.x - GLASS_NOTE.size / 2, y: GLASS_NOTE.y - GLASS_NOTE.size / 2, w: GLASS_NOTE.size, h: GLASS_NOTE.size });
  OVER.forEach((n, k) => {
    const s = OVERS[Math.floor(k / 2)];
    if (s !== undefined && f >= s && n.kind === 'sticky') out.push({ x: n.x - n.w / 2, y: n.y - n.w / 2, w: n.w, h: n.w });
  });
  return out;
};
/** Share of box b covered by the union of boxes (sampled every 4 px). */
const covered = (b, boxes) => {
  let n = 0;
  let c = 0;
  for (let y = b.y; y < b.y + b.h; y += 4)
    for (let x = b.x; x < b.x + b.w; x += 4) {
      n++;
      if (boxes.some((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h)) c++;
    }
  return n ? c / n : 0;
};
// the characters' drawn pixels over the frames a word is up (test90-v5: the seam words sat on both heads)
const cache = new Map();
const occupied = (from, to) => {
  const occ = new Uint8Array(W * 1080);
  for (let f = from; f < to; f += 2)
    for (const acts of [HUMAN, AI]) {
      const push = acts === HUMAN ? pushAt(f) : -pushAt(f);
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
          const wx = p.x + push + (x - fr.ax) * sc * (p.flip ? -1 : 1);
          const wy = p.y - (png.h - y) * sc;
          const cs = camAt(f);
          const q = cs === 1 ? { x: wx, y: wy } : cameraBox({ x: wx, y: wy, w: 0, h: 0 }, cs);
          const X = Math.round(q.x);
          const Y = Math.round(q.y);
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
  // the margin is a test2 rule: the Test90 stamps (approved, before 1:28.7) keep the old 0 px test
  const M = ev(st.id).frame >= 2661 ? MARGIN : 0;
  for (let y = Math.max(0, Math.round(y0 - M)); y < Math.min(1080, y1 + M); y++) for (let x = Math.max(0, Math.round(x0 - M)); x < Math.min(W, x1 + M); x++) onChar += occ[y * W + x];
  // same colour underneath, at the settled frame (stamp frame + 3) and halfway through
  const ink = st.ink ?? 'yellow';
  const left = { x: x0, y: y0, w: Math.max(0, Math.min(x1, SEAM_X) - x0), h: y1 - y0 };
  let same = 0;
  if (left.w > 0)
    for (const f of [ev(st.id).frame + 3, Math.round((ev(st.id).frame + ev(st.hide).frame) / 2)]) {
      const share = ink === 'navy' ? 1 : covered(left, yellowAt(f));
      same = Math.max(same, (share * left.w) / (x1 - x0));
    }
  const sameBad = same > SAME_MAX;
  const ok = margin >= MIN_EDGE && !moon && onChar === 0 && !sameBad;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'BAD '} ${st.text.padEnd(16)} ${st.side.padEnd(5)} x ${st.spot.x} y ${st.spot.y} size ${st.spot.size}: margin while stamping ${margin.toFixed(0)} px${settled !== null ? `, settled right margin ${settled.toFixed(0)} px` : ''}${moon ? ', ON THE MOON' : ''}${onChar ? `, ON A CHARACTER (${onChar} px within ${M} px)` : ''}${same > 0 ? `, ${(same * 100).toFixed(0)}% on its own colour${sameBad ? ' (OVER)' : ''}` : ''}`);
}
console.log(`stampcheck: ${bad} of ${STAMPS.length} stamps outside their room, on the moon or on a character`);
process.exit(bad ? 1 : 0);
