#!/usr/bin/env node
// Bubble check (test90-v5): the smallest gap between each speech bubble (tail and body, as Bubble.tsx draws it) and
// the speaker's drawn pixels, over every frame the bubble is up. The director saw tails touching heads (AI 18-30 s,
// human 72-73.5 s). Rule: >= MIN_GAP px. The drawing is the one on screen at that frame (during a morph, the drawing
// the morph is closer to); the weight shift (+-3 px) is subtracted from the gap.
//
//   node video/scripts/bubblecheck.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPng } from './jumpcheck.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { HUMAN, AI } = await import(url('video/src/scenes/acting.ts'));
const { resolveActor, STRIP_TABLE, frameScale, SHIFT } = await import(url('video/src/characters/actor.ts'));
const { AI_BUBBLES, HUMAN_BUBBLE_SPECS, bubbleGeom } = await import(url('video/src/world/bubbleLayout.ts'));

const MIN_GAP = 16;
const cache = new Map();
const pngOf = (file) => {
  if (!cache.has(file)) cache.set(file, readPng(file));
  return cache.get(file);
};

/** Opaque pixels (every 2nd) of a pose in world coordinates. */
const pixels = (pose) => {
  const m = STRIP_TABLE[pose.strip];
  const f = m.frames[pose.k];
  const s = frameScale(m, f);
  const png = pngOf(path.join(ROOT, 'video/public', m.dir, f.file));
  const out = [];
  for (let y = 0; y < png.h; y += 2)
    for (let x = 0; x < png.w; x += 2) {
      const a = png.bpp === 4 ? png.px[(y * png.w + x) * 4 + 3] : 255;
      if (a < 100) continue;
      const dx = (x - f.ax) * s * (pose.flip ? -1 : 1);
      out.push([pose.x + dx, pose.y - (png.h - y) * s]);
    }
  return out;
};

const segDist = (p, a, b) => {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - ax - t * vx, py - ay - t * vy);
};
const inTri = (p, [a, b, c]) => {
  const s = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const distTo = (p, g) => {
  const { tail, box } = g;
  if (inTri(p, tail)) return 0;
  let d = Math.min(segDist(p, tail[0], tail[1]), segDist(p, tail[1], tail[2]), segDist(p, tail[2], tail[0]));
  const bx = Math.max(box.x - p[0], 0, p[0] - (box.x + box.w));
  const by = Math.max(box.y - p[1], 0, p[1] - (box.y + box.h));
  return Math.min(d, Math.hypot(bx, by));
};

let bad = 0;
for (const [who, acts, list] of [['ai', AI, AI_BUBBLES], ['human', HUMAN, HUMAN_BUBBLE_SPECS]]) {
  let worst = { gap: Infinity };
  for (const b of list) {
    const g = bubbleGeom(b);
    const to = b.end ?? b.start + 40;
    let gap = Infinity;
    let at = b.start;
    for (let f = b.start; f < to; f += 2) {
      const st = resolveActor(acts, f);
      if (!st) continue;
      for (const p of pixels(st.cur)) {
        const d = distTo(p, g) - SHIFT;
        if (d < gap) {
          gap = d;
          at = f;
        }
      }
    }
    if (gap < MIN_GAP) bad++;
    if (gap < worst.gap) worst = { gap, at, key: b.key };
    if (gap < MIN_GAP || process.argv.includes('--verbose')) console.log(`   ${gap < MIN_GAP ? 'TOUCH' : 'ok   '} ${who} ${b.key} "${b.text}" f${b.start}: gap ${gap.toFixed(0)} px (f${at})`);
  }
  console.log(`${who}: ${list.length} bubbles, smallest gap ${worst.gap.toFixed(0)} px (${worst.key}, f${worst.at})`);
}
console.log(`bubblecheck: ${bad} bubbles closer than ${MIN_GAP} px to their speaker`);
process.exit(bad ? 1 : 0);
