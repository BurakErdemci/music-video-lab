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
  stdin: {
    contents: [
      "export { filmStateAt } from './Film.tsx';",
      "export { project, HOME } from './camera/camera.ts';",
      "export { sectionAt } from './timing.ts';",
      "export { screenBox, CARD_FRAMES } from './film/framing.ts';",
      "export { KNEE_V } from './film/livecam.ts';",
    ].join('\n'),
    resolveDir: path.join(VIDEO, 'src'), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile, jsx: 'automatic', packages: 'external', logLevel: 'error',
});
process.removeAllListeners('warning');
const M = await import(pathToFileURL(outfile).href);
const frames = M.CARD_FRAMES;

const FLOOR_Y = -3.4;
const screenBox = M.screenBox;

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
    // a card the camera does not show at all (its whole figure off the frame, the other girl while the shot is on
    // one) is not a subject in this frame
    const ab = screenBox(state.pose, s, f.action);
    if (ab.x1 <= L || ab.x0 >= R || ab.y1 <= 0 || ab.y0 >= H) continue;
    // how far (px) a box crosses each edge of its allowed area
    const over = (b, l, r, t, bt) => ['left', l - b.x0, 'right', b.x1 - r, 'top', t - b.y0, 'bottom', b.y1 - bt]
      .reduce((a, v, i, arr) => (i % 2 === 0 && arr[i + 1] > 0 ? [...a, `${v} ${Math.round(arr[i + 1])}`] : a), []);
    if (!s.silhouette) {
      const fb = screenBox(state.pose, s, f.face);
      const mx = 0.04 * W, my = 0.04 * H;
      const fo = over(fb, L + mx, R - mx, my, H - my);
      if (fo.length) out.push({ s, why: `face leaves the frame (${fo.join(', ')} px)` });
      if (fb.y1 - fb.y0 > 0.7 * H) out.push({ s, why: `face ${(100 * (fb.y1 - fb.y0) / H).toFixed(0)} % of the frame height` });
    }
    if (f.kind === 'full') {
      const m = 0.01 * H;
      const ao = over(ab, L - m, R + m, -m, s.crop === 'knee' ? Infinity : H + m);
      if (ao.length) out.push({ s, why: `${s.crop === 'knee' ? 'action cut at the sides or top' : 'action box cut'} (${ao.join(', ')} px)` });
      if (s.crop === 'knee') {
        // a knee framing must still cut at the knees or below
        const knee = screenBox(state.pose, s, [(f.action[0] + f.action[2]) / 2, M.KNEE_V, (f.action[0] + f.action[2]) / 2, M.KNEE_V]);
        if (knee.y0 > H + m) out.push({ s, why: `knee framing cut above the knees (${Math.round(knee.y0 - H)} px)` });
      }
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

if (arg('dump')) {
  // the projected face and action boxes of the listed frames, for drawing them over stills
  const out = arg('dump').split(',').map(Number).map((fr) => {
    const st = M.filmStateAt(fr);
    if (!st) return { frame: fr, shot: null, subjects: [] };
    return { frame: fr, shot: st.shot, fit: st.fit, subjects: st.subjects.filter((x) => frames[x.card]).map((x) => {
      const box = (b) => { const r = screenBox(st.pose, x, b); return [r.x0, r.y0, r.x1, r.y1].map((v) => Math.round(v)); };
      return { card: x.card, face: box(frames[x.card].face), action: box(frames[x.card].action), fails: check({ ...st, subjects: [x] }).map((f) => f.why) };
    }) };
  });
  console.log(JSON.stringify(out));
  rmSync(outDir, { recursive: true, force: true });
  process.exit(0);
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
let widened = 0;
const maxZ = [1, -1];
for (let fr = Math.round(A * FPS); fr <= Math.round(B * FPS); fr += step) {
  const st = M.filmStateAt(fr);
  if (!st) continue;
  checked++;
  if (st.fit && st.fit.z > 1.005) { widened++; if (st.fit.z > maxZ[0]) maxZ.splice(0, 2, st.fit.z, fr); }
  for (const fail of check(st)) {
    const key = `${st.shot}|${fail.s.card}|${fail.why.replace(/ \(.*$/, '').replace(/\d+ %/, 'N %')}`;
    // a run reports its worst frame: the largest overshoot in px or share of the frame
    const size = Math.max(0, ...(fail.why.match(/\d+/g) ?? []).map(Number));
    const r = open.get(key);
    if (r && fr - r.last <= step) {
      r.last = fr;
      if (size >= r.size) { r.worst = fail.why; r.size = size; }
    } else {
      const run = { shot: st.shot, card: fail.s.card, first: fr, last: fr, worst: fail.why, size };
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
console.log(`  live camera guard: widened in ${widened} frames (${(100 * widened / Math.max(1, checked)).toFixed(1)} %), most ${maxZ[0].toFixed(3)}x at ${(maxZ[1] / FPS).toFixed(2)} s`);
console.log(list.length ? `framecheck: FAIL (${list.length})` : 'framecheck: PASS');
rmSync(outDir, { recursive: true, force: true });
process.exit(list.length ? 1 : 0);
