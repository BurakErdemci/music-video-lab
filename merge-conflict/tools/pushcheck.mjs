#!/usr/bin/env node
// pushcheck.mjs - the PUSH! shot of GIT! PUSH! FORCE! (round 9, scene-map.md "GIT! PUSH! FORCE! rebuilt"), measured on
// what the shot draws (video/src/film/push/PushShot.tsx pushStateAt, through Film.tsx, as tools/framecheck.mjs does):
//  1. on its first frame both girls are in frame (each action box at least 60 % inside the frame);
//  2. the ring leaves orange and runs between them: while it grows from her fists to blue's soles its leading edge
//     projects between the two girls' action boxes on screen;
//  3. blue's action box moves right by >= 40 % of the frame width between the PUSH! cut and FORCE!;
//  4. no other cut inside 124.32-125.02 (one continuous shot).
//   node tools/pushcheck.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.join(ROOT, 'video');
const require = createRequire(path.join(VIDEO, 'package.json'));
const esbuild = require('esbuild');
const outDir = path.join(VIDEO, 'out', '.pushcheck');
mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, 'state.mjs');
await esbuild.build({
  stdin: {
    contents: [
      "export { filmStateAt } from './Film.tsx';",
      "export { PUSH, FORCE, ringR } from './film/push/PushShot.tsx';",
      "export { screenBox, CARD_FRAMES } from './film/framing.ts';",
      "export { project } from './camera/camera.ts';",
    ].join('\n'),
    resolveDir: path.join(VIDEO, 'src'), loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', outfile, jsx: 'automatic', packages: 'external', logLevel: 'error',
});
process.removeAllListeners('warning');
const M = await import(pathToFileURL(outfile).href);
const W = 1920, H = 1080, FPS = 60;
const fails = [];
const all = (st) => [...st.subjects, ...(st.extras ?? [])];
const boxOf = (st, who) => {
  const s = all(st).find((x) => x.card.startsWith(who));
  return s ? M.screenBox(st.pose, s, M.CARD_FRAMES[s.card].action) : null;
};
const inside = (b) => {
  const w = Math.max(0, Math.min(W, b.x1) - Math.max(0, b.x0));
  const h = Math.max(0, Math.min(H, b.y1) - Math.max(0, b.y0));
  return (w * h) / ((b.x1 - b.x0) * (b.y1 - b.y0));
};
const f0 = Math.ceil(M.PUSH * FPS - 1e-6);
const f1 = Math.ceil(M.FORCE * FPS - 1e-6) - 1;

// 1. both in frame at the start
const s0 = M.filmStateAt(f0);
const ob = boxOf(s0, 'O'), bb = boxOf(s0, 'B');
console.log(`first frame ${f0} (${(f0 / FPS).toFixed(3)} s) shot ${s0.shot}: orange ${ob ? (100 * inside(ob)).toFixed(0) : '-'} % in frame, blue ${bb ? (100 * inside(bb)).toFixed(0) : '-'} % in frame`);
if (!ob || inside(ob) < 0.6) fails.push('orange not in frame at the PUSH! cut');
if (!bb || inside(bb) < 0.6) fails.push('blue not in frame at the PUSH! cut');

// 2. the ring between them while it runs to her
let between = 0, running = 0;
for (let f = f0; f <= f1; f++) {
  const st = M.filmStateAt(f);
  const t = f / FPS;
  const r = M.ringR(t);
  const o = boxOf(st, 'O'), b = boxOf(st, 'B');
  if (!r || !o || !b || !all(st).find((x) => x.card === 'BB1')) continue;
  running++;
  // the ring's leading edge: the floor point r to the right of orange's fists
  const lead = M.project(st.pose, [-3.3 + r, -3.38, 0]);
  if (lead.x >= (o.x0 + o.x1) / 2 && lead.x <= (b.x0 + b.x1) / 2 + 40) between++;
}
console.log(`ring running toward blue: ${running} frames, leading edge between the girls in ${between}`);
if (running < 6 || between < running) fails.push(`the ring is between them in ${between} of ${running} frames (needs all, >= 6)`);

// 3. blue thrown right
const b1 = boxOf(M.filmStateAt(f1), 'B');
const dx = b1 && bb ? (b1.x0 + b1.x1) / 2 - (bb.x0 + bb.x1) / 2 : 0;
console.log(`blue's action box centre moves ${dx.toFixed(0)} px right (${((100 * dx) / W).toFixed(0)} % of the frame width) by frame ${f1}; at the end ${b1 ? (100 * inside(b1)).toFixed(0) : '-'} % of it is still in frame`);
if (dx < 0.4 * W) fails.push(`blue moves ${dx.toFixed(0)} px < 40 % of the frame width`);

// 4. one continuous shot
const shots = new Set();
for (let f = f0; f <= f1; f++) shots.add(M.filmStateAt(f).shot);
console.log(`shots in ${(f0 / FPS).toFixed(2)}-${(f1 / FPS).toFixed(2)} s: ${[...shots].join(', ')}`);
if (shots.size !== 1) fails.push(`${shots.size} shots inside PUSH!-FORCE!`);

for (const x of fails) console.log(`FAIL ${x}`);
console.log(fails.length ? `pushcheck: FAIL (${fails.length})` : 'pushcheck: PASS');
process.exit(fails.length ? 1 : 0);
