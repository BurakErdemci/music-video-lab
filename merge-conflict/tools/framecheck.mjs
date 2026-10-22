#!/usr/bin/env node
// framecheck.mjs - the framing rule (scene-map.md "Framing: the face and the action stay in frame"), per frame:
//  - every subject card's face box (video/public/cards/frames.json, extended down to the chin by framing.ts faceFrame)
//    stays inside the frame with a 4 % margin;
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
// --type checks the type instead (scene-map.md "Polish from Gemini's review", item 1, and "Round 7d"): it bundles the
// film once, renders each sampled frame three times under the render lock (the type layer alone, the world without
// the type, the whole frame: the composition's `layer` prop) and hands them with the frame's projected face boxes
// (down to the chin) to tools/typeframe.py (the settled box in a 4 % margin, no face covered, local contrast >= 3:1,
// nothing drawn over the settled type).
//   node tools/framecheck.mjs --ground [--range 0-140.04] [--keep dir]
// --ground checks the floor contact (round 7d, "the girls look pasted on"): on sampled frames of every shot with a
// card standing on the floor it renders the world layer and hands each card's sole line to tools/groundframe.py
// (the band just below the soles >= 25 % darker than the floor beside them at the same height).
// Paintings (round 7d): a moment painting's plane (plategeo.ts paintingView) projects whole inside the frame at >= 97 %
// of its height, and no card is drawn over it.
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
      "export { screenBox, CARD_FRAMES, faceFrame } from './film/framing.ts';",
      "export { KNEE_V } from './film/livecam.ts';",
      "export { cardPoint } from './film/framing.ts';",
      "export { panelParallax, plateView, paintingView, paintingParallax, PAINT_KB } from './worlds/plategeo.ts';",
      "export { solesAt } from './rig/cardRig.ts';",
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
const SCALE_MAX = 1.25, OUT = 4 / 3;
const MANIFEST = JSON.parse(readFileSync(path.join(VIDEO, 'public', 'cards', 'manifest.json'), 'utf8'));
const PANEL_DIST = 30; // RestShot passes dist 30 for a moment panel (far plane only); every other plate is 46

/** Each card's magnification at the 2K output: screen px per texel of its loaded file, measured locally on a 9x9
 *  grid of card points and kept where the point is on screen (a perspective card is larger near the camera, but
 *  only what the frame shows can look blurred). */
const cardScales = (state) => [...state.subjects, ...(state.extras ?? [])].map((s) => {
  const e = MANIFEST[s.card];
  const [nw, nh] = e.px ?? [e.w, e.h];
  const d = 0.02;
  let f = 0;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
    const u = 0.01 + (0.96 * i) / 8, v = 0.01 + (0.96 * j) / 8;
    const p = M.project(state.pose, M.cardPoint(s, u, v));
    if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.s > 4000) continue;
    const pu = M.project(state.pose, M.cardPoint(s, u + d, v));
    const pv = M.project(state.pose, M.cardPoint(s, u, v + d));
    f = Math.max(f, Math.hypot(pu.x - p.x, pu.y - p.y) / (d * nw), Math.hypot(pv.x - p.x, pv.y - p.y) / (d * nh));
  }
  return { id: s.card, kind: 'card', f: OUT * f };
});

/** The plate's far plane (and near plane, unless a moment panel) at the 2K output, from the same placement the
 *  renderer uses (video/src/worlds/plategeo.ts plateView; worlds/plate.tsx passes follow 0.5 far, 0.8 near). */
const plateScales = (state) => {
  const pl = state.plate;
  if (!pl) return [];
  const planes = pl.dist === PANEL_DIST ? [['far', pl.dist, 0.5]] : [['far', pl.dist, 0.5], ['near', pl.dist * 0.45, 0.8]];
  // a moment panel's depth parallax magnifies its near pixels by up to panelParallax's `mag` on top of the plane
  return planes.map(([name, d, follow]) => {
    if (pl.dist === PANEL_DIST) {
      // a painting shown whole (round 7d): fitted to the frame height, its capped parallax on top
      const sc = M.paintingView(state.pose, d, pl.kb ?? 1).scale;
      return { id: pl.id, kind: `plate ${name}`, f: sc * M.paintingParallax(state.pose, pl.base, d, sc).mag };
    }
    const sc = M.plateView(state.pose, pl.base, d, pl.margin, follow).scale;
    return { id: pl.id, kind: `plate ${name}`, f: sc };
  });
};

/** A painting is shown whole (round 7d, "Paintings are always shown whole" and "Nothing is pasted over a painting"):
 *  the painting plane the renderer draws (plategeo.ts paintingView) projects inside the frame and at least
 *  (1 - PAINT_KB) of its height, and no card is drawn over it. `grow` scales the plane (the selftest's planted defect). */
const paintingFails = (state, grow = 1) => {
  const pl = state.plate;
  if (!pl || pl.dist !== PANEL_DIST) return [];
  const v = M.paintingView(state.pose, pl.dist, pl.kb ?? 1);
  const corner = (a, b) => M.project(state.pose, [0, 1, 2].map((i) => v.centre[i] + v.right[i] * a * v.w * grow / 2 + v.up[i] * b * v.h * grow / 2));
  const ps = [corner(-1, -1), corner(1, -1), corner(-1, 1), corner(1, 1)];
  const x0 = Math.min(...ps.map((p) => p.x)), x1 = Math.max(...ps.map((p) => p.x)), y0 = Math.min(...ps.map((p) => p.y)), y1 = Math.max(...ps.map((p) => p.y));
  const out = [];
  if (x0 < -1 || y0 < -1 || x1 > W + 1 || y1 > H + 1) out.push({ s: { card: pl.id }, key: 'painting cut', why: `painting ${pl.id} cut by the frame (${Math.round(x0)},${Math.round(y0)})-(${Math.round(x1)},${Math.round(y1)})` });
  if (y1 - y0 < (1 - M.PAINT_KB) * H - 2) out.push({ s: { card: pl.id }, key: 'painting small', why: `painting ${pl.id} ${(100 * (y1 - y0) / H).toFixed(0)} % of the frame height` });
  const over = [...state.subjects, ...(state.extras ?? [])];
  if (over.length) out.push({ s: { card: pl.id }, key: 'painting covered', why: `cards ${over.map((x) => x.card).join(', ')} drawn over painting ${pl.id}` });
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
      // the face down to the chin (round 7d)
      const fb = screenBox(state.pose, s, M.faceFrame(s.card));
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
  // the painting rule: a painting plane grown 10 % past the frame height, and a card over it, must fail; as drawn it passes
  const pState = { pose: M.HOME, shot: 'selftest-painting', subjects: [], plate: { id: 'QK3', base: M.HOME, dist: PANEL_DIST, margin: 1.25, kb: 0.5 } };
  const pOk = paintingFails(pState);
  const pBig = paintingFails(pState, 1.1);
  const pCard = paintingFails({ ...pState, subjects: [{ card, at: { x: 0, feet: -4.5, height: 6 } }] });
  console.log(`selftest painting: grown -> ${pBig.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; card over it -> ${pCard.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; as drawn -> ${pOk.map((b) => b.why).join('; ') || 'passed'}`);
  rmSync(outDir, { recursive: true, force: true });
  process.exit(big.length > 0 && ok.length === 0 && sBig.length > 0 && sOk.length === 0 && pBig.length > 0 && pCard.length > 0 && pOk.length === 0 ? 1 : 0);
}

if (arg('dump')) {
  // the projected face and action boxes of the listed frames, for drawing them over stills
  const out = arg('dump').split(',').map(Number).map((fr) => {
    const st = M.filmStateAt(fr);
    if (!st) return { frame: fr, shot: null, subjects: [] };
    return { frame: fr, shot: st.shot, fit: st.fit, subjects: st.subjects.filter((x) => frames[x.card]).map((x) => {
      const box = (b) => { const r = screenBox(st.pose, x, b); return [r.x0, r.y0, r.x1, r.y1].map((v) => Math.round(v)); };
      return { card: x.card, face: box(M.faceFrame(x.card)), action: box(frames[x.card].action), fails: check({ ...st, subjects: [x] }).map((f) => f.why) };
    }) };
  });
  console.log(JSON.stringify(out));
  rmSync(outDir, { recursive: true, force: true });
  process.exit(0);
}

/** Render `picks` once per layer into a private temp dir (under the render lock); `done` deletes the bundle (about
 *  300 MB each), copies the stills to --keep if given, deletes them and exits. */
const renderLayers = async (picks, layers, prefix) => {
  const { bundle } = require('@remotion/bundler');
  const { openBrowser, renderStill, selectComposition } = require('@remotion/renderer');
  const { withRenderLock } = await import(pathToFileURL(path.join(ROOT, 'tools', 'renderlock.mjs')).href);
  const serveUrl = await bundle({ entryPoint: path.join(VIDEO, 'src/index.ts'), publicDir: path.join(VIDEO, 'public') });
  // a private dir: the shared .framecheck dir is deleted by every other framecheck run that ends
  const shots = mkdtempSync(path.join(tmpdir(), prefix));
  await withRenderLock(async () => {
    const chromiumOptions = { gl: 'angle' };
    const browser = await openBrowser('chrome', { chromeMode: 'chrome-for-testing', chromiumOptions });
    for (const layer of layers) {
      const composition = await selectComposition({ serveUrl, id: 'MC60', inputProps: { layer }, puppeteerInstance: browser, chromiumOptions });
      for (const fr of picks) {
        const output = path.join(shots, `${layer}-${fr}.png`);
        await renderStill({ composition, serveUrl, output, frame: fr, inputProps: { layer }, puppeteerInstance: browser, chromiumOptions, imageFormat: 'png', overwrite: true });
      }
    }
    await browser.close({ silent: true });
  });
  const done = (code) => {
    rmSync(serveUrl, { recursive: true, force: true });
    if (arg('keep')) cpSync(shots, path.resolve(arg('keep')), { recursive: true });
    rmSync(shots, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
    process.exit(code ?? 1);
  };
  return { shots, done };
};

/** The cards of a state standing on the floor with their soles in frame: the sole line on screen, the card's screen
 *  height, and the screen boxes of the other cards (the beside-floor samples must not land on them). A split half,
 *  a card off the floor (feet or a drop) and one drawn without floor contact (ground: false) are not checked. */
const standing = (st, t) => {
  const all = [...st.subjects, ...(st.extras ?? [])];
  const rects = all.map((x) => { const b = screenBox(st.pose, x, frames[x.card]?.action ?? [0, 0, 1, 1]); return [b.x0, b.y0, b.x1, b.y1]; });
  return all.flatMap((x, i) => {
    // the soles where the rig draws the boots at t (Card.tsx places the shadow from the same function)
    const so = M.solesAt(x.card, t);
    if (!so || x.silhouette || x.clip || x.ground === false) return [];
    if (Math.abs((x.at.feet ?? FLOOR_Y) - FLOOR_Y) > 0.01 || Math.abs(x.dy ?? 0) > 0.01) return [];
    const [u0, u1, v] = so;
    const a = M.project(st.pose, M.cardPoint(x, u0, v));
    const b = M.project(st.pose, M.cardPoint(x, u1, v));
    const top = M.project(st.pose, M.cardPoint(x, 0.5, 0));
    const bot = M.project(st.pose, M.cardPoint(x, 0.5, 1));
    // the card's own down direction on screen (a barrel roll turns it) and the sole line's half length across it
    const hpx = Math.hypot(bot.x - top.x, bot.y - top.y);
    const down = [(bot.x - top.x) / hpx, (bot.y - top.y) / hpx];
    const sole = { card: x.card, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, half: Math.abs((b.x - a.x) * down[1] - (b.y - a.y) * down[0]) / 2, down, hpx, others: rects.filter((_, j) => j !== i) };
    return sole.cx < 0 || sole.cx > W || sole.cy < 4 || sole.cy > H - 12 ? [] : [sole];
  });
};

if (process.argv.includes('--ground')) {
  // every shot with a standing card, sampled at its middle (and its quarters when longer than 2 s): away from the
  // cuts and their covers
  const runs = [];
  for (let fr = Math.round(A * FPS); fr <= Math.round(B * FPS); fr++) {
    const st = M.filmStateAt(fr);
    if (!st) continue;
    const r = runs.at(-1);
    if (r && r.shot === st.shot && r.last === fr - 1) r.last = fr;
    else runs.push({ shot: st.shot, first: fr, last: fr });
  }
  const picks = runs.flatMap((r) => {
    const n = r.last - r.first + 1;
    return (n > 2 * FPS ? [0.25, 0.5, 0.75] : [0.5]).map((k) => r.first + Math.round(k * (n - 1))).filter((fr) => standing(M.filmStateAt(fr), fr / FPS).length);
  });
  console.log(`ground ${A}-${B} s: ${runs.length} shots, ${picks.length} sampled frames with a standing card`);
  const { shots, done } = await renderLayers(picks, ['world'], 'groundcheck-');
  const samples = picks.map((fr) => { const st = M.filmStateAt(fr); return { frame: fr, t: fr / FPS, shot: st.shot, world: path.join(shots, `world-${fr}.png`), soles: standing(st, fr / FPS) }; });
  const list = path.join(shots, 'samples.json');
  writeFileSync(list, JSON.stringify(samples));
  const py = spawnSync('uv', ['run', '--with', 'pillow', '--with', 'numpy', 'python', '-I', path.join(ROOT, 'tools', 'groundframe.py'), list], { stdio: 'inherit' });
  done(py.status);
}

if (process.argv.includes('--type')) {
  const every = Math.round(FPS / Number(arg('fps', 2)));
  const picks = [];
  for (let fr = Math.round(A * FPS); fr <= Math.round(B * FPS); fr += every) if (M.filmStateAt(fr)) picks.push(fr);
  // 'all' is the frame as it renders: tools/typeframe.py checks that nothing is drawn over the settled type
  const { shots, done } = await renderLayers(picks, ['type', 'world', 'all'], 'typecheck-');
  const samples = [];
  for (const fr of picks) {
    const st = M.filmStateAt(fr);
    const subj = st.subjects.filter((x) => !x.silhouette && frames[x.card]);
    const faces = subj.map((x) => { const b = screenBox(st.pose, x, M.faceFrame(x.card)); return [b.x0, b.y0, b.x1, b.y1]; });
    samples.push({ frame: fr, t: fr / FPS, shot: st.shot, type: path.join(shots, `type-${fr}.png`), world: path.join(shots, `world-${fr}.png`), final: path.join(shots, `all-${fr}.png`), faces, cards: subj.map((x) => x.card) });
  }
  const list = path.join(shots, 'samples.json');
  writeFileSync(list, JSON.stringify(samples));
  const py = spawnSync('uv', ['run', '--with', 'pillow', '--with', 'numpy', 'python', '-I', path.join(ROOT, 'tools', 'typeframe.py'), list, path.join(shots, 'failures.json')], { stdio: 'inherit' });
  done(py.status);
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
  for (const fail of [...check(st), ...scaleFails(st), ...paintingFails(st)]) {
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
