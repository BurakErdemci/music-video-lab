#!/usr/bin/env node
// framecheck.mjs - the framing rule (scene-map.md "Framing: the face and the action stay in frame"), per frame:
//  - every subject card's face box (video/public/cards/frames.json) stays inside the frame with a 4 % margin;
//  - a face box is at most 70 % of the frame height;
//  - a full-body card ("kind": "full") shows its whole action box (a 1 % margin), unless its shot crops at the
//    knees on purpose (then only the bottom may leave);
//  - a split-screen half counts its own half as the frame; silhouettes (the groove) have no face to keep.
// The cards and camera come from the film itself: video/src/Film.tsx filmStateAt(frame), the same pose and placements
// the shots render (moves, punches, shakes, dolly zooms, recoils, the logo halves). The bundle is built with the
// project's own esbuild, so this tool reads the TSX shots without a browser. Card rig deformation is not modelled
// (held cards move only by the 6-frame accent step).
//   node tools/framecheck.mjs [--range 0-140.04] [--step 1] [--selftest]
//   node tools/framecheck.mjs --type [--range 0-140.04] [--fps 2]
// --type checks the type instead (scene-map.md "Polish from Gemini's review", item 1): it bundles the film once,
// renders each sampled frame twice under the render lock (the type layer alone, the world without the type, the
// composition's `layer` prop) and hands them with the frame's projected face boxes to tools/typeframe.py (the
// settled box in a 4 % margin, no face covered, local contrast >= 3:1).
// Exit 1 on any failure (the selftest must exit 1: it frames a face card twice the frame).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.join(ROOT, 'video');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const selftest = process.argv.includes('--selftest');
const [A, B] = arg('range', '0-140.04').split('-').map(Number);
const step = Number(arg('step', 1));
const W = 1920, H = 1080, FPS = 60;

// bundle the film's state functions (TSX) for node, inside video/ so its node_modules resolve
const require = createRequire(path.join(VIDEO, 'package.json'));
const esbuild = require('esbuild');
const outDir = path.join(VIDEO, 'out', '.framecheck');
mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, 'state.mjs');
await esbuild.build({
  stdin: { contents: "export { filmStateAt } from './Film.tsx';\nexport { project, HOME } from './camera/camera.ts';\nexport { sectionAt } from './timing.ts';", resolveDir: path.join(VIDEO, 'src'), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile, jsx: 'automatic', packages: 'external', logLevel: 'error',
});
process.removeAllListeners('warning');
const M = await import(pathToFileURL(outfile).href);
const manifest = JSON.parse(readFileSync(path.join(VIDEO, 'public/cards/manifest.json'), 'utf8'));
const frames = JSON.parse(readFileSync(path.join(VIDEO, 'public/cards/frames.json'), 'utf8'));

const FLOOR_Y = -3.4;
/** A normalised card point (u right, v down) in world space, placed as <Card> places it. */
const worldOf = (s, u, v) => {
  const e = manifest[s.card];
  const aspect = e.w / e.h;
  const sx = s.at.flip ? -1 : 1;
  const h = s.at.height;
  return [s.at.x + (s.dx ?? 0) + sx * h * (u - 0.5) * aspect, (s.at.feet ?? FLOOR_Y) + (s.dy ?? 0) + h * (1 - v), s.at.z ?? 0];
};
const screenBox = (pose, s, box) => {
  const pts = [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]].map(([u, v]) => M.project(pose, worldOf(s, u, v)));
  return { x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), y1: Math.max(...pts.map((p) => p.y)) };
};

/** The failures of one frame's state. */
const check = (state) => {
  const out = [];
  for (const s of state.subjects) {
    const f = frames[s.card];
    if (!f) { out.push({ s, why: 'no face/action box in frames.json' }); continue; }
    // the frame this subject may use: the whole frame, or its half of a split screen
    let L = 0, R = W;
    if (s.clip) {
      const c = M.project(state.pose, [s.clip.x, (s.at.feet ?? FLOOR_Y) + s.at.height * 0.8, s.at.z ?? 0]).x;
      if (s.clip.keep === 'left') R = Math.min(R, c); else L = Math.max(L, c);
    }
    if (!s.silhouette) {
      const fb = screenBox(state.pose, s, f.face);
      const mx = 0.04 * W, my = 0.04 * H;
      if (fb.x0 < L + mx || fb.x1 > R - mx || fb.y0 < my || fb.y1 > H - my) out.push({ s, why: 'face leaves the frame' });
      if (fb.y1 - fb.y0 > 0.7 * H) out.push({ s, why: `face ${(100 * (fb.y1 - fb.y0) / H).toFixed(0)} % of the frame height` });
    }
    if (f.kind === 'full') {
      const ab = screenBox(state.pose, s, f.action);
      const m = 0.01 * H;
      const cut = ab.x0 < L - m || ab.x1 > R + m || ab.y0 < -m || (s.crop !== 'knee' && ab.y1 > H + m);
      if (cut) out.push({ s, why: s.crop === 'knee' ? 'action cut at the sides or top' : 'action box cut' });
    }
  }
  return out;
};

if (selftest) {
  // a face close-up card twice the frame height, centred: its face must fail; the same card at 1/3 must pass
  const card = Object.keys(frames).find((k) => frames[k].kind === 'bust');
  const big = check({ pose: M.HOME, shot: 'selftest-big', subjects: [{ card, at: { x: 0, feet: -9, height: 22 } }] });
  const ok = check({ pose: M.HOME, shot: 'selftest-ok', subjects: [{ card, at: { x: 0, feet: -4.5, height: 6 } }] });
  console.log(`selftest on ${card}: oversized -> ${big.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; fitted -> ${ok.map((b) => b.why).join('; ') || 'passed'}`);
  rmSync(outDir, { recursive: true, force: true });
  process.exit(big.length > 0 && ok.length === 0 ? 1 : 0);
}

if (process.argv.includes('--type')) {
  const { bundle } = require('@remotion/bundler');
  const { openBrowser, renderStill, selectComposition } = require('@remotion/renderer');
  const { withRenderLock } = await import(pathToFileURL(path.join(ROOT, 'tools', 'renderlock.mjs')).href);
  const every = Math.round(FPS / Number(arg('fps', 2)));
  const picks = [];
  for (let fr = Math.round(A * FPS); fr <= Math.round(B * FPS); fr += every) if (M.filmStateAt(fr)) picks.push(fr);
  const serveUrl = await bundle({ entryPoint: path.join(VIDEO, 'src/index.ts'), publicDir: path.join(VIDEO, 'public') });
  const shots = path.join(outDir, 'shots');
  mkdirSync(shots, { recursive: true });
  const samples = [];
  await withRenderLock(async () => {
    const chromiumOptions = { gl: 'angle' };
    const browser = await openBrowser('chrome', { chromeMode: 'chrome-for-testing', chromiumOptions });
    for (const layer of ['type', 'world']) {
      const composition = await selectComposition({ serveUrl, id: 'MC60', inputProps: { layer }, puppeteerInstance: browser, chromiumOptions });
      for (const fr of picks) {
        const output = path.join(shots, `${layer}-${fr}.png`);
        await renderStill({ composition, serveUrl, output, frame: fr, inputProps: { layer }, puppeteerInstance: browser, chromiumOptions, imageFormat: 'png', overwrite: true });
      }
    }
    await browser.close({ silent: true });
  });
  for (const fr of picks) {
    const st = M.filmStateAt(fr);
    const faces = st.subjects.filter((x) => !x.silhouette && frames[x.card]).map((x) => { const b = screenBox(st.pose, x, frames[x.card].face); return [b.x0, b.y0, b.x1, b.y1]; });
    samples.push({ frame: fr, t: fr / FPS, type: path.join(shots, `type-${fr}.png`), world: path.join(shots, `world-${fr}.png`), faces });
  }
  const list = path.join(outDir, 'samples.json');
  writeFileSync(list, JSON.stringify(samples));
  const py = spawnSync('uv', ['run', '--with', 'pillow', '--with', 'numpy', 'python', '-I', path.join(ROOT, 'tools', 'typeframe.py'), list], { stdio: 'inherit' });
  rmSync(serveUrl, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
  process.exit(py.status ?? 1);
}

// walk the range; consecutive failing frames of one shot, card and reason merge into one run
const open = new Map();
const list = [];
let checked = 0;
for (let fr = Math.round(A * FPS); fr <= Math.round(B * FPS); fr += step) {
  const st = M.filmStateAt(fr);
  if (!st) continue;
  checked++;
  for (const fail of check(st)) {
    const key = `${st.shot}|${fail.s.card}|${fail.why.replace(/\d+ %/, 'N %')}`;
    const r = open.get(key);
    if (r && fr - r.last <= step) {
      r.last = fr;
      r.worst = fail.why;
    } else {
      const run = { shot: st.shot, card: fail.s.card, first: fr, last: fr, worst: fail.why };
      open.set(key, run);
      list.push(run);
    }
  }
}
const bySection = new Map();
for (const r of list) {
  const sec = M.sectionAt(r.first / FPS);
  bySection.set(sec, (bySection.get(sec) ?? 0) + 1);
}
console.log(`framecheck ${A}-${B} s: ${checked} frames checked (every ${step}), ${list.length} failing shot runs`);
for (const r of list) console.log(`  ${(r.first / FPS).toFixed(2)}-${((r.last + 1) / FPS).toFixed(2)}  ${r.shot.padEnd(22)} ${r.card.padEnd(5)} ${r.worst}`);
for (const [sec, n] of bySection) console.log(`  section ${sec}: ${n}`);
console.log(list.length ? `framecheck: FAIL (${list.length})` : 'framecheck: PASS');
rmSync(outDir, { recursive: true, force: true });
process.exit(list.length ? 1 : 0);
