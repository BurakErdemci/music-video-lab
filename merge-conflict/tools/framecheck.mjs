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
// "px" if present, else w x h; a world plate against 3072x2048, its far and near planes; a moment painting by the
// magnification its view reports, its girls' plane included).
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
// Paintings (round 10, worlds/paintview.ts): a moment painting (its 16:9 plate) covers the frame and its original 3:2
// centre is at least 97 % visible (the build's flight into RK3 may push past that); no card is drawn over it. A living
// painting's own girls plane is not a card: its girls stay inside the frame on every side the drawing did not cut
// (losing at most what the painting's 3 % push hides, 1.5 % of the frame), and reach past the frame on every side it
// did (video/public/plates/layers/<ID>.json).
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
      "export { plateView } from './worlds/plategeo.ts';",
      "export { finaleSceneAt } from './film/finale/FinaleShot.tsx';",
      "export { paintRects, girlsAt, girlsMag, COVER, LAYERED } from './worlds/paintview.ts';",
      "export { solesAt } from './rig/cardRig.ts';",
      "export { TYPE_PLAN } from './film/typeplan.ts';",
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
const PANEL_DIST = 30; // the shots pass dist 30 for a moment painting; every world plate is 46
/** The girls drawings' alpha boxes of the living paintings (tools/imagegen/greenkey.py). */
const LAYERS = (() => {
  const out = {};
  for (const id of Object.keys(M.LAYERED)) out[id] = JSON.parse(readFileSync(path.join(VIDEO, 'public', 'plates', 'layers', `${id}.json`), 'utf8'));
  return out;
})();
const DRAWINGS = ['fg', 'fgb', 'fgc'];

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

/** The plate's far and near planes at the 2K output, from the same placement the renderer uses
 *  (video/src/worlds/plategeo.ts plateView; worlds/plate.tsx passes follow 0.5 far, 0.8 near); a moment painting by
 *  the magnification its view reports (its girls' plane too). */
const plateScales = (state) => {
  const pl = state.plate;
  if (!pl) return [];
  if (pl.dist === PANEL_DIST) {
    if (!pl.view) return [{ id: pl.id, kind: 'painting with no view', f: Infinity }];
    const out = [{ id: pl.id, kind: 'plate painting', f: pl.view.mag }];
    if (pl.view.paint?.girls) out.push({ id: pl.id, kind: 'plate girls', f: M.girlsMag(pl.view.paint) });
    return out;
  }
  return [['far', pl.dist, 0.5], ['near', pl.dist * 0.45, 0.8]].map(([name, d, follow]) => ({ id: pl.id, kind: `plate ${name}`, f: M.plateView(state.pose, pl.base, d, pl.margin, follow).scale }));
};

/** A painting covers the frame and shows its original 3:2 centre (round 10, Burak: no bands at the sides), no card is
 *  drawn over it, and a living painting's girls are not cut where the drawing did not cut them. */
const paintingFails = (state) => {
  const pl = state.plate;
  if (!pl || pl.dist !== PANEL_DIST) return [];
  const out = [];
  const v = pl.view?.paint;
  if (!v) return [{ s: { card: pl.id }, key: 'painting view', why: `painting ${pl.id} reports no view` }];
  const { plate, centre } = M.paintRects(v, W, H);
  const gap = ['left', -plate.x0, 'right', plate.x1 - W, 'top', -plate.y0, 'bottom', plate.y1 - H].reduce((acc, x, i, arr) => (i % 2 === 0 && arr[i + 1] < -1 ? [...acc, `${x} ${Math.round(-arr[i + 1])}`] : acc), []);
  if (gap.length) out.push({ s: { card: pl.id }, key: 'painting uncovered', why: `painting ${pl.id} leaves the frame uncovered (${gap.join(', ')} px)` });
  // the build's flight (round 9, Burak approved) may push into the painting past its centre, within the pixel rule
  if (!pl.view.push) {
    const ix = Math.max(0, Math.min(W, centre.x1) - Math.max(0, centre.x0));
    const iy = Math.max(0, Math.min(H, centre.y1) - Math.max(0, centre.y0));
    const seen = (ix * iy) / ((centre.x1 - centre.x0) * (centre.y1 - centre.y0));
    if (seen < 0.97 - 1e-6) out.push({ s: { card: pl.id }, key: 'painting centre', why: `painting ${pl.id} shows ${(100 * seen).toFixed(1)} % of its original centre` });
  }
  if (v.girls) {
    const d = LAYERS[pl.id]?.drawings?.[DRAWINGS[v.girls.drawing]];
    if (!d) out.push({ s: { card: pl.id }, key: 'girls box', why: `no girls box for ${pl.id} drawing ${v.girls.drawing}` });
    else {
      // the drawing's box (uv, y down) through the girls' plane, to frame px (y down)
      const [u0, v0, u1, v1] = d.box;
      const a = M.girlsAt(v, [u0, 1 - v1]);
      const b = M.girlsAt(v, [u1, 1 - v0]);
      const box = { x0: a[0] * W, x1: b[0] * W, y0: (1 - b[1]) * H, y1: (1 - a[1]) * H };
      const bad = [];
      // a side the drawing did not cut may lose what the painting's own 3 % push hides of it (1.5 % of the frame)
      const mx = 0.015 * W + 1, my = 0.015 * H + 1;
      for (const [side, inside, beyond] of [['left', box.x0 >= -mx, box.x0 <= 1], ['right', box.x1 <= W + mx, box.x1 >= W - 1], ['top', box.y0 >= -my, box.y0 <= 1], ['bottom', box.y1 <= H + my, box.y1 >= H - 1]]) {
        if (d.touch[side] ? !beyond : !inside) bad.push(`${side} ${d.touch[side] ? 'leaves a gap' : 'cut'}`);
      }
      if (bad.length) out.push({ s: { card: pl.id }, key: 'girls cut', why: `painting ${pl.id} girls ${bad.join(', ')}` });
    }
  }
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
const whoOf = (card) => (card.startsWith('B') || card.startsWith('PB') ? 'B' : 'O');
const check = (state) => {
  const out = [];
  // round 11d: a girl the shot's plan entry sets is a subject (her face in frame at the shot's middle), not an extra
  for (const w of state.authored ?? []) {
    if (!state.subjects.some((s) => whoOf(s.card) === w)) out.push({ s: { card: w === 'B' ? 'blue' : 'orange' }, key: 'authored', why: `the ${w === 'B' ? 'blue' : 'orange'} girl the shot sets is not in frame as a subject` });
  }
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
    // a bust is cut at the bottom of its card: that straight edge never shows inside the frame (round 11, Burak via
    // Gemini: the YES! busts slid in with their cut edge and the LED wall under it), entrance frames included
    if (f.kind === 'bust') {
      const seen = [];
      for (let i = 0; i <= 20; i++) {
        const p = M.project(state.pose, M.cardPoint(s, i / 20, 1));
        if (p.x > L + 1 && p.x < R - 1 && p.y > 1 && p.y < H - 1) seen.push(p);
      }
      if (seen.length) out.push({ s, why: `cut edge in frame (${seen.length}/21 points, lowest gap ${Math.round(H - Math.max(...seen.map((p) => p.y)))} px above the bottom)` });
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
  // the cut edge (round 11): the same bust lifted so its card ends 2 units above the frame's bottom fails; run off the
  // bottom it passes
  const cutIn = check({ pose: M.HOME, shot: 'selftest-cut', subjects: [{ card, at: { x: 0, feet: -2.5, height: 6 } }] }).filter((x) => /cut edge/.test(x.why));
  const cutOff = check({ pose: M.HOME, shot: 'selftest-cut', subjects: [{ card, at: { x: 0, feet: -7, height: 9 } }] }).filter((x) => /cut edge/.test(x.why));
  console.log(`selftest cut edge on ${card}: lifted -> ${cutIn.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; run off the bottom -> ${cutOff.map((b) => b.why).join('; ') || 'passed'}`);
  // the authored girls (round 11d): a shot that sets both girls with only orange a subject fails; with both it passes
  const okCard = (who) => Object.keys(frames).find((k) => frames[k].kind === 'bust' && whoOf(k) === who);
  const aLost = check({ pose: M.HOME, shot: 'selftest-authored', authored: ['B', 'O'], subjects: [{ card: okCard('O'), at: { x: 0, feet: -7, height: 9 } }] }).filter((x) => x.key === 'authored');
  const aBoth = check({ pose: M.HOME, shot: 'selftest-authored', authored: ['B', 'O'], subjects: [{ card: okCard('O'), at: { x: 2, feet: -7, height: 9 } }, { card: okCard('B'), at: { x: -2, feet: -7, height: 9 } }] }).filter((x) => x.key === 'authored');
  console.log(`selftest authored: blue lost -> ${aLost.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; both in frame -> ${aBoth.map((b) => b.why).join('; ') || 'passed'}`);
  // the scale rule: the same card drawn at 60 units fails it, at 2 units it does not
  const sBig = scaleFails({ pose: M.HOME, subjects: [{ card, at: { x: 0, feet: -20, height: 60 } }] });
  const sOk = scaleFails({ pose: M.HOME, subjects: [{ card, at: { x: 0, feet: -4.5, height: 2 } }] });
  console.log(`selftest scale on ${card}: oversized -> ${sBig.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; small -> ${sOk.map((b) => b.why).join('; ') || 'passed'}`);
  // the painting rule (round 10): covering at 101.5 % passes; shrunk to 97 % (the old fitted painting, bands at the
  // sides) fails; pushed to 110 % hides its centre and fails; a card over it fails; the flight may push to 150 %
  const paint = (h, extra = {}) => ({ h, ox: 0, oy: 0, shift: [0, 0], pivot: 0.3, zoom: 0, focus: [0.5, 0.5], gain: 1, ...extra });
  const vState = (p, push = false, subjects = [], id = 'RK4') => ({ pose: M.HOME, shot: 'selftest-painting', subjects, plate: { id, base: M.HOME, dist: PANEL_DIST, margin: 1.25, view: { h: p.h, ox: p.ox, oy: p.oy, mag: 0.72 * p.h, push, paint: p } } });
  const pOk = paintingFails(vState(paint(M.COVER * 1.015)));
  const pSmall = paintingFails(vState(paint(0.97)));
  const pBig = paintingFails(vState(paint(1.1)));
  const pCard = paintingFails(vState(paint(M.COVER * 1.015), false, [{ card, at: { x: 0, feet: -4.5, height: 6 } }]));
  const vFlight = [...paintingFails(vState(paint(1.5, { oy: -0.2 }), true)), ...scaleFails(vState(paint(1.5, { oy: -0.2 }), true))];
  const vOver = scaleFails(vState(paint(1.9), true));
  console.log(`selftest painting: as drawn -> ${pOk.map((b) => b.why).join('; ') || 'passed'}; fitted with bands -> ${pSmall.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; pushed to 110 % -> ${pBig.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; card over it -> ${pCard.map((b) => b.why).join('; ') || 'PASSED (wrong)'}`);
  console.log(`selftest painting flight: push to 150 % -> ${vFlight.map((b) => b.why).join('; ') || 'passed'}; pushed past 1.25x -> ${vOver.map((b) => b.why ?? b.key).join('; ') || 'PASSED (wrong)'}`);
  // a living painting's girls (RK2's drawing is cut by the frame on every side, RK11's on none): as drawn they pass;
  // RK2's girls slid 3 % right leave a gap at the left edge, RK11's slid 40 % right are cut at the right edge
  const girls = (id, dx) => vState(paint(M.COVER * 1.015, { girls: { drawing: 0, depth: 0.5, bob: 0, glow: '#ffffff', glowAmt: 0, shadow: 0 }, shift: [-dx / 0.2, 0], pivot: 0.3 }), false, [], id);
  const gOk = [...paintingFails(girls('RK2', 0)), ...paintingFails(girls('RK11', 0))];
  const gGap = paintingFails(girls('RK2', 0.03));
  const gCut = paintingFails(girls('RK11', 0.4));
  console.log(`selftest painting girls: as drawn -> ${gOk.map((b) => b.why).join('; ') || 'passed'}; RK2 slid -> ${gGap.map((b) => b.why).join('; ') || 'PASSED (wrong)'}; RK11 slid out -> ${gCut.map((b) => b.why).join('; ') || 'PASSED (wrong)'}`);
  rmSync(outDir, { recursive: true, force: true });
  process.exit(big.length > 0 && ok.length === 0 && aLost.length > 0 && aBoth.length === 0 && cutIn.length > 0 && cutOff.length === 0 && sBig.length > 0 && sOk.length === 0 && pOk.length === 0 && pSmall.length > 0 && pBig.length > 0 && pCard.length > 0 && vFlight.length === 0 && vOver.length > 0 && gOk.length === 0 && gGap.length > 0 && gCut.length > 0 ? 1 : 0);
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
    // a layer is a name ('type', 'world', 'all': every pick) or { key, props, frames } (its own props and frames)
    for (const spec of layers) {
      const { key, props, frames: own } = typeof spec === 'string' ? { key: spec, props: { layer: spec }, frames: picks } : spec;
      const composition = await selectComposition({ serveUrl, id: 'MC60', inputProps: props, puppeteerInstance: browser, chromiumOptions });
      for (const fr of own) {
        const output = path.join(shots, `${key}-${fr}.png`);
        await renderStill({ composition, serveUrl, output, frame: fr, inputProps: props, puppeteerInstance: browser, chromiumOptions, imageFormat: 'png', overwrite: true });
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
    // a barrel roll past 40 degrees (chorus 2's spin-out) turns the floor away from below her soles on screen: the band
    // and the floor beside would sample the plate or the void, so such a sole is reported as skipped, not measured
    const rolled = Math.abs(st.pose.roll ?? 0) > (40 * Math.PI) / 180;
    const sole = { card: x.card, ...(rolled ? { skip: 'camera rolled past 40 degrees' } : {}), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, half: Math.abs((b.x - a.x) * down[1] - (b.y - a.y) * down[0]) / 2, down, hpx, others: rects.filter((_, j) => j !== i) };
    return sole.cx < 0 || sole.cx > W || sole.cy < 4 || sole.cy > H - 12 ? [] : [sole];
  });
};

// ---- the set covers the frame (round 11d) ---------------------------------------------------------------------
// --set renders the set alone (no girls, no type) at --fps samples a second, plain and with the dark backdrops keyed,
// and hands both to tools/setframe.py: at most 1 % of the border band may show the bare backdrop (no set drawn there).
// The limit is 1 % of the border band. The finale's worlds whose dark space is the set itself are designed voids
// (not measured): the piano's empty club after hours ('quiet', a lit floor under a dark room), the light-box rig the
// girls rise in ('flight'), the single line of light ('line'), the equals walls closing in ('walls'), the logo stage
// ('logo'), the intro's terminal room ('terminal'), the resolved title ('title') and the face inserts ('faceO',
// 'faceB'). Two dark worlds hold a measured limit: the LED-wall split screens ('split', 'duel': 42 %, the approved
// framings measure up to 39 %) and the chevron tunnel floating in the dark ('tunnel': 82 %, approved up to 77 %); on
// proof232-r11c's tree the re-cammed yes2, sky-faces and outro-faces measured 44-54 % and tunnel-3 and outro-dive
// 91-97 % (round 11d).
const VOID_LIMITS = { split: 0.42, duel: 0.42, tunnel: 0.82 };
const VOID_SCENES = ['quiet', 'flight', 'line', 'walls', 'logo', 'terminal', 'title', 'faceO', 'faceB'];
if (process.argv.includes('--set')) {
  const every = Math.round(FPS / Number(arg('fps', 4)));
  const picks = [];
  for (let fr = Math.round(A * FPS); fr <= Math.round(B * FPS); fr += every) if (M.filmStateAt(fr)) picks.push(fr);
  console.log(`set ${A}-${B} s: ${picks.length} frames of the set layer`);
  const { shots, done } = await renderLayers(picks, [{ key: 'world', props: { layer: 'world' }, frames: picks }, { key: 'worldkey', props: { layer: 'worldkey' }, frames: picks }], 'setcheck-');
  const samples = picks.map((fr) => { const st = M.filmStateAt(fr); const scene = fr / FPS >= 140.04 ? M.finaleSceneAt(fr / FPS) : null; return { frame: fr, t: fr / FPS, shot: st.shot, scene, png: path.join(shots, `world-${fr}.png`), keyed: path.join(shots, `worldkey-${fr}.png`), limit: VOID_SCENES.includes(scene) ? 1.01 : VOID_LIMITS[scene] ?? 0.01 }; });
  const list = path.join(shots, 'samples.json');
  writeFileSync(list, JSON.stringify(samples));
  const py = spawnSync('uv', ['run', '--with', 'pillow', '--with', 'numpy', 'python', '-I', path.join(ROOT, 'tools', 'setframe.py'), list, ...(process.argv.includes('--all') ? ['--all'] : [])], { stdio: 'inherit' });
  done(py.status);
}

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

// the glyph-size rule once skipped GIT! PUSH! FORCE! while it was rebuilt; no span is skipped now
const CAP_EXEMPT = []; // round 9: GIT! PUSH! FORCE! is rebuilt (film/push), so no span is skipped any more

if (process.argv.includes('--type')) {
  const every = Math.round(FPS / Number(arg('fps', 2)));
  const picks = [];
  for (let fr = Math.round(A * FPS); fr <= Math.round(B * FPS); fr += every) if (M.filmStateAt(fr)) picks.push(fr);
  // type over type (round 9): where two or more type-plan entries are on screen and one has settled (0.4 s after it
  // starts, 0.1 s before it ends), each is rendered alone (the `only` prop) and once with none (the type outside the
  // plan), so tools/typeframe.py can tell whether a settled form is covered by another form
  const activeAt = (t) => M.TYPE_PLAN.filter((e) => t >= e.t0 - 0.02 && t < e.t1);
  const settledAt = (e, t) => t >= e.t0 + 0.4 && t < e.t1 - 0.1;
  const overlapPicks = picks.filter((fr) => { const a = activeAt(fr / FPS); return a.length >= 2 && a.some((e) => settledAt(e, fr / FPS)); });
  // round 11: every entry on screen is rendered alone at every sample, so tools/typeframe.py measures each form on its
  // own (its margin with any backing, turned or projected; its cap height; a dot-matrix panel's unsung words against
  // the same words lit, rendered once 0.12 s before the entry ends)
  const byId = new Map();
  for (const fr of picks) for (const e of activeAt(fr / FPS)) byId.set(e.id, [...(byId.get(e.id) ?? []), fr]);
  const onlyLayers = [...byId].map(([id, frs]) => ({ key: `only_${id}`, props: { layer: 'type', only: id }, frames: frs }));
  const litFrame = (e) => Math.round((e.t1 - 0.12) * FPS);
  // (an id can return: the two choruses share their plan, so each of its entries gets its own lit frame)
  for (const id of byId.keys()) {
    const lits = [...new Set(M.TYPE_PLAN.filter((x) => x.id === id && x.form === 'Marquee').map(litFrame))];
    if (lits.length) onlyLayers.push({ key: `lit_${id}`, props: { layer: 'type', only: id }, frames: lits });
  }
  if (overlapPicks.length) onlyLayers.push({ key: 'only___none', props: { layer: 'type', only: '__none__' }, frames: overlapPicks });
  console.log(`type over type: ${overlapPicks.length} samples with two or more forms on screen, ${byId.size} forms rendered alone`);
  // 'all' is the frame as it renders: tools/typeframe.py checks that nothing is drawn over the settled type
  const { shots, done } = await renderLayers(picks, ['type', 'world', 'all', ...onlyLayers], 'typecheck-');
  const samples = [];
  for (const fr of picks) {
    const st = M.filmStateAt(fr);
    const subj = st.subjects.filter((x) => !x.silhouette && frames[x.card]);
    const faces = subj.map((x) => { const b = screenBox(st.pose, x, M.faceFrame(x.card)); return [b.x0, b.y0, b.x1, b.y1]; });
    const overlap = overlapPicks.includes(fr)
      ? { none: path.join(shots, `only___none-${fr}.png`), forms: activeAt(fr / FPS).map((e) => ({ id: e.id, png: path.join(shots, `only_${e.id}-${fr}.png`), settled: settledAt(e, fr / FPS) })) }
      : undefined;
    const entries = activeAt(fr / FPS).map((e) => ({ id: e.id, form: e.form, png: path.join(shots, `only_${e.id}-${fr}.png`), settled: settledAt(e, fr / FPS), ...(e.form === 'Marquee' ? { lit: path.join(shots, `lit_${e.id}-${litFrame(e)}.png`) } : {}) }));
    samples.push({ frame: fr, t: fr / FPS, shot: st.shot, type: path.join(shots, `type-${fr}.png`), world: path.join(shots, `world-${fr}.png`), final: path.join(shots, `all-${fr}.png`), cap_exempt: CAP_EXEMPT.some(([a, b]) => fr / FPS >= a && fr / FPS < b), faces, cards: subj.map((x) => x.card), entries, ...(overlap ? { overlap } : {}) });
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
