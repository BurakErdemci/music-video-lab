#!/usr/bin/env node
// pushcheck.mjs - GIT! PUSH! FORCE! (round 9, scene-map.md "GIT! PUSH! FORCE! rebuilt"), measured on what the family
// draws (video/src/film/push/PushShot.tsx through Film.tsx's filmStateAt, as tools/framecheck.mjs does).
// Rules:
//  1. on the PUSH! shot's first frame both girls are in frame (each action box >= 60 % inside);
//  2. the ring runs between them: while it grows toward blue's soles, its leading edge projects between the two
//     girls' action-box centres (>= 6 frames, every one of them);
//  3. blue's action box moves right by >= 40 % of the frame width between the PUSH! cut and FORCE!;
//  4. one shot from PUSH! to FORCE! (no cut, cover or insert);
//  5. the throw is seen: from the end of the hit-stop, blue's action box stays >= 50 % inside the frame for >= 0.35 s;
//  6. scale: in the GIT! two-shot, the charge and the PUSH! wide, the girls' action boxes are >= 60 % of the frame
//     height (sampled every 0.1 s; orange may lose her soles at the bottom edge, so the box is not clipped);
//  7. with --video: blue is as saturated as orange - the mean HSV saturation of blue's card pixels in the wide shots
//     is >= 0.8x orange's (tools/pushsat.py masks each card by its alpha, warped to its projected box).
//   node tools/pushcheck.mjs [--video out/r9-b-push2.mp4 --start 119.9]
//   node tools/pushcheck.mjs --selftest   (must exit 1: a clean case passes and the planted defects fail)
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.join(ROOT, 'video');
const W = 1920, H = 1080, FPS = 60;

/** The verdict on the measured numbers. */
export const judge = (m) => {
  const f = [];
  if (!(m.startIn.O >= 0.6)) f.push(`orange ${(100 * m.startIn.O).toFixed(0)} % in frame at the PUSH! cut (< 60 %)`);
  if (!(m.startIn.B >= 0.6)) f.push(`blue ${(100 * m.startIn.B).toFixed(0)} % in frame at the PUSH! cut (< 60 %)`);
  if (m.ring.running < 6 || m.ring.between < m.ring.running) f.push(`the ring is between them in ${m.ring.between} of ${m.ring.running} frames (needs all, >= 6)`);
  if (m.blueDx < 0.4 * W) f.push(`blue moves ${m.blueDx.toFixed(0)} px right (< 40 % of the frame width)`);
  if (m.shots !== 1) f.push(`${m.shots} shots between PUSH! and FORCE!`);
  if (m.visible < 0.35) f.push(`the throw is seen for ${m.visible.toFixed(2)} s (< 0.35 s)`);
  for (const x of m.small) f.push(`at ${x.t.toFixed(2)} s (${x.shot}) ${x.card} is ${(100 * x.h).toFixed(0)} % of the frame height (< 60 %)`);
  if (m.sat && m.sat.B < 0.8 * m.sat.O) f.push(`blue's saturation ${m.sat.B.toFixed(3)} < 0.8x orange's ${m.sat.O.toFixed(3)}`);
  return f;
};

const selftest = () => {
  const clean = { startIn: { O: 1, B: 1 }, ring: { running: 9, between: 9 }, blueDx: 900, shots: 1, visible: 0.4, small: [], sat: { O: 0.8, B: 0.7 } };
  const planted = [
    { ...clean, sat: { O: 0.8, B: 0.4 } }, // a pale blue ghost
    { ...clean, visible: 0.12 }, // thrown out of sight at once
    { ...clean, small: [{ t: 120.5, shot: 'push-git', card: 'BB1', h: 0.48 }] }, // girls at half the frame height
    { ...clean, ring: { running: 9, between: 5 } }, // the ring not between them
    { ...clean, shots: 2 }, // a cut inside PUSH!
  ];
  const ok = judge(clean).length === 0;
  const caught = planted.map((p) => judge(p).length > 0);
  console.log(`selftest: clean ${ok ? 'passes' : 'FAILS'}; planted defects caught ${caught.filter(Boolean).length}/${caught.length}`);
  process.exit(ok && caught.every(Boolean) ? 1 : 0);
};

const main = async () => {
  if (process.argv.includes('--selftest')) return selftest();
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
  const require = createRequire(path.join(VIDEO, 'package.json'));
  const esbuild = require('esbuild');
  const outDir = path.join(VIDEO, 'out', '.pushcheck');
  mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, 'state.mjs');
  await esbuild.build({
    stdin: {
      contents: [
        "export { filmStateAt } from './Film.tsx';",
        "export { PUSH, FORCE, THROW_AT, ringR, frozen, PSHOTS, PUSH_START } from './film/push/PushShot.tsx';",
        "export { screenBox, CARD_FRAMES } from './film/framing.ts';",
        "export { project } from './camera/camera.ts';",
      ].join('\n'),
      resolveDir: path.join(VIDEO, 'src'), loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile, jsx: 'automatic', packages: 'external', logLevel: 'error',
  });
  process.removeAllListeners('warning');
  const M = await import(pathToFileURL(outfile).href);
  const all = (st) => [...st.subjects, ...(st.extras ?? [])];
  const subj = (st, who) => all(st).find((x) => x.card.startsWith(who));
  const boxOf = (st, who, box) => { const s = subj(st, who); return s ? M.screenBox(st.pose, s, box ?? M.CARD_FRAMES[s.card].action) : null; };
  const inside = (b) => (b ? (Math.max(0, Math.min(W, b.x1) - Math.max(0, b.x0)) * Math.max(0, Math.min(H, b.y1) - Math.max(0, b.y0))) / ((b.x1 - b.x0) * (b.y1 - b.y0)) : 0);
  const fr = (t) => Math.ceil(t * FPS - 1e-6);
  const f0 = fr(M.PUSH), f1 = fr(M.FORCE) - 1;
  const s0 = M.filmStateAt(f0);
  const startIn = { O: inside(boxOf(s0, 'O')), B: inside(boxOf(s0, 'B')) };
  // 2. the ring
  let running = 0, between = 0;
  for (let f = f0; f <= f1; f++) {
    const st = M.filmStateAt(f);
    const r = M.ringR(M.frozen(f / FPS));
    const o = boxOf(st, 'O'), b = boxOf(st, 'B');
    if (!r || !o || !b || subj(st, 'B').card !== 'BB1') continue;
    running++;
    const ox = subj(st, 'O').at.x;
    const lead = M.project(st.pose, [ox + r, -3.38, 0]);
    if (lead.x >= (o.x0 + o.x1) / 2 && lead.x <= (b.x0 + b.x1) / 2 + 40) between++;
  }
  // 3, 5. the throw
  const bStart = boxOf(s0, 'B');
  const bEnd = boxOf(M.filmStateAt(f1), 'B');
  const blueDx = (bEnd.x0 + bEnd.x1) / 2 - (bStart.x0 + bStart.x1) / 2;
  let visibleFrames = 0;
  for (let f = fr(M.THROW_AT); f <= f1; f++) if (inside(boxOf(M.filmStateAt(f), 'B')) >= 0.5) visibleFrames++; else break;
  // 4. one shot
  const shots = new Set();
  for (let f = f0; f <= f1; f++) shots.add(M.filmStateAt(f).shot);
  // 6. scale in the wide shots
  const WIDE = new Set(['push-git', 'push-charge', 'push-charge-2', 'push-push']);
  const small = [];
  const samples = [];
  for (let t = M.PUSH_START + 0.05; t < M.THROW_AT; t += 0.1) {
    const st = M.filmStateAt(fr(t));
    if (!WIDE.has(st.shot)) continue;
    const sample = { frame: fr(t), t, shot: st.shot, cards: [] };
    for (const s of all(st)) {
      const a = M.screenBox(st.pose, s, M.CARD_FRAMES[s.card].action);
      const h = (a.y1 - a.y0) / H;
      // the charge pushes in on orange: blue leaving the frame there is not a subject of it
      const held = st.subjects.includes(s) || st.shot === 'push-push';
      if (held && h < 0.6) small.push({ t, shot: st.shot, card: s.card, h });
      const full = M.screenBox(st.pose, s, [0, 0, 1, 1]);
      sample.cards.push({ who: s.card[0] === 'B' ? 'B' : 'O', card: s.card, flip: !!s.at.flip, box: [full.x0, full.y0, full.x1, full.y1] });
    }
    samples.push(sample);
  }
  // 7. saturation on the render
  let sat = null;
  const video = arg('video', null);
  if (video) {
    const jf = path.join(outDir, 'sat.json');
    writeFileSync(jf, JSON.stringify({ video: path.resolve(video), start: Number(arg('start', 0)), samples }));
    const r = spawnSync('uv', ['run', '--with', 'pillow', '--with', 'numpy', 'python', '-I', path.join(ROOT, 'tools', 'pushsat.py'), jf], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pushsat.py failed: ${r.stderr}`);
    sat = JSON.parse(readFileSync(jf.replace(/\.json$/, '.out.json'), 'utf8'));
  }
  const m = { startIn, ring: { running, between }, blueDx, shots: shots.size, visible: visibleFrames / FPS, small, sat };
  console.log(`PUSH! cut ${(f0 / FPS).toFixed(3)} s: orange ${(100 * startIn.O).toFixed(0)} % in frame, blue ${(100 * startIn.B).toFixed(0)} %`);
  console.log(`ring running toward blue ${running} frames, its edge between the girls in ${between}`);
  console.log(`blue's action box moves ${blueDx.toFixed(0)} px right (${((100 * blueDx) / W).toFixed(0)} % of the width); the throw is seen for ${(visibleFrames / FPS).toFixed(2)} s`);
  console.log(`shots in PUSH!-FORCE!: ${[...shots].join(', ')}`);
  console.log(`scale: ${samples.length} wide samples, ${small.length} under 60 % of the frame height`);
  if (sat) console.log(`saturation of the card pixels in the wide shots: blue ${sat.B.toFixed(3)}, orange ${sat.O.toFixed(3)} (ratio ${(sat.B / sat.O).toFixed(2)}, ${sat.n} samples)`);
  const fails = judge(m);
  for (const x of fails) console.log(`FAIL ${x}`);
  console.log(fails.length ? `pushcheck: FAIL (${fails.length})` : 'pushcheck: PASS');
  process.exit(fails.length ? 1 : 0);
};
await main();
