#!/usr/bin/env node
// ripplecheck.mjs - measures the hair/cloth ripple (scene-map.md "Living motion", video/src/rig/ripple.ts):
//  - face: on the mesh vertex grid, the max ripple weight over every vertex of every grid cell that overlaps the
//    face box (a triangle touching the box moves pixels inside it); must be exactly 0. The same for the torso box;
//  - max displacement: max over frames of RIPPLE_MAX * rippleAmp(t) * max weight, in % of the card height, <= 0.6;
//  - correlation: Pearson r of rippleAmp(t) per frame with (i) the bass smoothed over one bar and (ii) the mean
//    bass of the frame's section; printed with a per-section table (no threshold).
//   node tools/ripplecheck.mjs [--range 0-140.04] [--selftest]
// Exit 1 on a face/torso displacement or a max above 0.6 %. --selftest ripples every vertex (no face or torso core) and must
// exit 1.
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.join(ROOT, 'video');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const selftest = process.argv.includes('--selftest');
const [A, B] = arg('range', '0-140.04').split('-').map(Number);
const FPS = 60;

const require = createRequire(path.join(VIDEO, 'package.json'));
const esbuild = require('esbuild');
const outDir = path.join(VIDEO, 'out', '.ripplecheck');
mkdirSync(outDir, { recursive: true });
let M;
try {
  const outfile = path.join(outDir, 'ripple.mjs');
  await esbuild.build({
    stdin: {
      contents: [
        "export { RIPPLE_MAX, rippleAmp, rippleWeightFor, rippleWeight } from './rig/ripple.ts';",
        "export { GRID_COLS, GRID_ROWS } from './rig/rig.ts';",
        "export { CARD_FRAMES, cardAspectOf } from './film/framing.ts';",
        "export { bassAt } from './film/livecam.ts';",
        "export { sectionAt, sections, barLengthAt } from './timing.ts';",
      ].join('\n'),
      resolveDir: path.join(VIDEO, 'src'), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile, jsx: 'automatic', packages: 'external', logLevel: 'error',
  });
  process.removeAllListeners('warning');
  M = await import(pathToFileURL(outfile).href);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

const { GRID_COLS: C, GRID_ROWS: R, CARD_FRAMES, RIPPLE_MAX } = M;
let fail = false;

// ---- 1. face and torso: the max weight over the vertices of every cell overlapping the box -----------------------
const cells = (box) => {
  const i0 = Math.max(0, Math.floor(box[0] * C)), i1 = Math.min(C - 1, Math.ceil(box[2] * C) - 1);
  const j0 = Math.max(0, Math.floor(box[1] * R)), j1 = Math.min(R - 1, Math.ceil(box[3] * R) - 1);
  return { i0, i1, j0, j1 };
};
let maxW = 0, faceMax = 0, torsoMax = 0, n = 0;
for (const [id, fr] of Object.entries(CARD_FRAMES)) {
  const asp = M.cardAspectOf(id);
  // the selftest drops the cores (every vertex ripples): the face and torso rules must catch it
  const w = selftest ? () => 1 : (i, j) => M.rippleWeightFor(fr, asp, i / C, j / R);
  const f = fr.face, fw = f[2] - f[0], fh = f[3] - f[1];
  const torso = [f[0] - 0.6 * fw, f[1], f[2] + 0.6 * fw, fr.kind === 'bust' ? 1 : Math.min(1, f[3] + 2.6 * fh)];
  const over = (box) => {
    const { i0, i1, j0, j1 } = cells(box);
    let m = 0;
    for (let j = j0; j <= j1 + 1; j++) for (let i = i0; i <= i1 + 1; i++) m = Math.max(m, w(i, j));
    return m;
  };
  const fm = over(f), tm = over(torso);
  faceMax = Math.max(faceMax, fm); torsoMax = Math.max(torsoMax, tm);
  if (fm > 0 || tm > 0) console.log(`  ${id}: face weight ${fm.toFixed(4)}, torso weight ${tm.toFixed(4)}`);
  for (let j = 0; j <= R; j++) for (let i = 0; i <= C; i++) maxW = Math.max(maxW, w(i, j));
  n++;
}
console.log(`cards ${n}, grid ${C + 1}x${R + 1}: face-box displacement weight ${faceMax}, torso-box weight ${torsoMax}, max weight ${maxW.toFixed(4)}`);
if (faceMax > 0 || torsoMax > 0) { fail = true; console.log('  face/torso displacement > 0 -> FAIL'); }

// ---- 2. max displacement and 3. correlation over the frames -------------------------------------------------------
const f0 = Math.round(A * FPS), f1 = Math.round(B * FPS);
const amp = [], bar = [], sec = [], secName = [];
const secMean = {};
const secBass = {};
for (const s of M.sections) {
  let sum = 0, k = 0;
  for (let f = Math.round(s.start * FPS); f < Math.round(s.end * FPS); f++) { sum += M.bassAt(f / FPS); k++; }
  secBass[s.name] = k ? sum / k : 0;
}
for (let f = f0; f <= f1; f++) {
  const t = f / FPS;
  amp.push(M.rippleAmp(t));
  const half = M.barLengthAt(t) / 2;
  let b = 0;
  const m = 25;
  for (let i = 0; i < m; i++) b += M.bassAt(t - half + (2 * half * i) / (m - 1));
  bar.push(b / m);
  const name = M.sectionAt(t);
  secName.push(name);
  sec.push(secBass[name] ?? 0);
}
const pearson = (x, y) => {
  const mx = x.reduce((a, b) => a + b, 0) / x.length, my = y.reduce((a, b) => a + b, 0) / y.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};
const maxAmp = Math.max(...amp);
const maxPct = RIPPLE_MAX * maxAmp * maxW * 100;
console.log(`frames ${f0}-${f1}: max displacement ${maxPct.toFixed(4)} % of the card height (limit 0.6) -> ${maxPct <= 0.6 ? 'PASS' : 'FAIL'}`);
if (maxPct > 0.6) fail = true;
console.log(`correlation of rippleAmp with the bass smoothed over one bar: r = ${pearson(amp, bar).toFixed(3)}`);
console.log(`correlation of rippleAmp with the section's mean bass:        r = ${pearson(amp, sec).toFixed(3)}`);
console.log('section'.padEnd(26) + 'frames'.padStart(7) + 'mean amp'.padStart(10) + 'mean bass'.padStart(11));
for (const s of M.sections) {
  const idx = secName.map((x, i) => (x === s.name ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) continue;
  const ma = idx.reduce((a, i) => a + amp[i], 0) / idx.length;
  console.log(s.name.padEnd(26) + String(idx.length).padStart(7) + ma.toFixed(3).padStart(10) + secBass[s.name].toFixed(3).padStart(11));
}
if (selftest) console.log(fail ? 'selftest: the broken face rule was caught' : 'selftest: NOT caught');
process.exit(fail ? 1 : 0);
