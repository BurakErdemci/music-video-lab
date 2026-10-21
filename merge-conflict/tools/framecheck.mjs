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
// Pixel scale (scene-map.md "Resolution"): the final render is the 1920x1080 composition at 4/3 (2560x1440), so no card
// or plate may show above 1.25x its native pixels there (a card is measured against the file the manifest loads: its
// "px" if present, else w x h; a plate against 3072x2048, its far plane and, except for a moment panel, its near plane).
//   node tools/framecheck.mjs [--range 0-140.04] [--step 1] [--selftest]
//   node tools/framecheck.mjs --type [--range 0-140.04] [--fps 2]
// --type checks the type instead (scene-map.md "Polish from Gemini's review", item 1): it bundles the film once,
// renders each sampled frame twice under the render lock (the type layer alone, the world without the type, the
// composition's `layer` prop) and hands them with the frame's projected face boxes to tools/typeframe.py (the
// settled box in a 4 % margin, no face covered, local contrast >= 3:1).
// Exit 1 on any failure (the selftest must exit 1: it frames a face card twice the frame).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

// ---- pixel scale at the 2K output ---------------------------------------------------------------------------------
const SCALE_MAX = 1.25, OUT = 4 / 3, PLATE_PX = [3072, 2048];
const MANIFEST = JSON.parse(readFileSync(path.join(VIDEO, 'public', 'cards', 'manifest.json'), 'utf8'));
const PANEL_DIST = 30; // RestShot passes dist 30 for a moment panel (far plane only); every other plate is 46

/** Each card's on-screen size over its loaded file's pixels, at the 2K output. */
const cardScales = (state) => [...state.subjects, ...(state.extras ?? [])].map((s) => {
  const e = MANIFEST[s.card];
  const [nw, nh] = e.px ?? [e.w, e.h];
  const b = screenBox(state.pose, s, [0, 0, 1, 1]);
  return { id: s.card, kind: 'card', f: OUT * Math.max((b.y1 - b.y0) / nh, (b.x1 - b.x0) / nw) };
});

/** The plate's far plane (and near plane, unless a panel) on screen over the plate's pixels, at the 2K output. */
const plateScales = (state) => {
  const pl = state.plate;
  if (!pl) return [];
  const { base, dist, margin } = pl;
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const fwd = norm(sub(base.target, base.position));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const out = [];
  for (const [name, d] of dist === PANEL_DIST ? [['far', dist]] : [['far', dist], ['near', dist * 0.45]]) {
    const w = 2 * d * Math.tan((base.fov * Math.PI) / 360) * (W / H) * margin;
    const h = w / (PLATE_PX[0] / PLATE_PX[1]);
    const c = base.position.map((v, i) => v + fwd[i] * d);
    const cf = norm(sub(state.pose.target, state.pose.position));
    let behind = false; // an edge point behind the camera has no meaningful screen size: skip the plane
    const at = (r, u) => {
      const p = c.map((v, i) => v + right[i] * r * w / 2 + up[i] * u * h / 2);
      if (sub(p, state.pose.position).reduce((t, v, i) => t + v * cf[i], 0) < 0.1) behind = true;
      return M.project(state.pose, p);
    };
    const len = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    const f = OUT * Math.max(len(at(-1, 0), at(1, 0)) / PLATE_PX[0], len(at(0, -1), at(0, 1)) / PLATE_PX[1]);
    if (behind) continue;
    out.push({ id: pl.id, kind: `plate ${name}`, f });
  }
  return out;
};

/** The scale failures of one frame's state, in the shape of check()'s (plus the run key and the size to rank by). */
const scaleFails = (state) => [...cardScales(state), ...plateScales(state)].filter((x) => x.f > SCALE_MAX).map((x) => ({
  s: { card: x.id }, key: `scale ${x.kind}`, size: x.f,
  why: `${x.kind} ${x.id} ${x.f.toFixed(2)}x native at 2K`,
}));

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
  // the scale rule: the same card drawn at 60 units fails it, at 2 units it does not
  const sBig = scaleFails({ pose: M.HOME, subjects: [{ card, at: { x: 0, feet: -20, height: 60 } }] });
  const sOk = scaleFails({ pose: M.HOME, subjects: [{ card, at: { x: 0, feet: -4.5, height: 2 } }] });
  console.log(`selftest scale on ${card}: oversized -> ${sBig.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; small -> ${sOk.map((b) => b.why).join('; ') || 'passed'}`);
  rmSync(outDir, { recursive: true, force: true });
  process.exit(big.length > 0 && ok.length === 0 && sBig.length > 0 && sOk.length === 0 ? 1 : 0);
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
  // a private dir: the shared .framecheck dir is deleted by every other framecheck run that ends
  const shots = mkdtempSync(path.join(tmpdir(), 'typecheck-'));
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
    const subj = st.subjects.filter((x) => !x.silhouette && frames[x.card]);
    const faces = subj.map((x) => { const b = screenBox(st.pose, x, frames[x.card].face); return [b.x0, b.y0, b.x1, b.y1]; });
    samples.push({ frame: fr, t: fr / FPS, shot: st.shot, type: path.join(shots, `type-${fr}.png`), world: path.join(shots, `world-${fr}.png`), faces, cards: subj.map((x) => x.card) });
  }
  const list = path.join(shots, 'samples.json');
  writeFileSync(list, JSON.stringify(samples));
  const py = spawnSync('uv', ['run', '--with', 'pillow', '--with', 'numpy', 'python', '-I', path.join(ROOT, 'tools', 'typeframe.py'), list, path.join(shots, 'failures.json')], { stdio: 'inherit' });
  rmSync(serveUrl, { recursive: true, force: true });
  // --keep <dir> copies the stills there before the temp dir goes
  if (arg('keep')) cpSync(shots, path.resolve(arg('keep')), { recursive: true });
  rmSync(shots, { recursive: true, force: true });
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
  for (const fail of [...check(st), ...scaleFails(st)]) {
    const key = `${st.shot}|${fail.s.card}|${fail.key ?? fail.why.replace(/ \(.*$/, '').replace(/\d+ %/, 'N %')}`;
    // a run reports its worst frame: the largest overshoot in px or share of the frame (a scale failure: its factor)
    const size = fail.size ?? Math.max(0, ...(fail.why.match(/\d+/g) ?? []).map(Number));
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
