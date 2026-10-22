#!/usr/bin/env node
// slidecheck.mjs - the paintings must not read as slides (round 10, Burak on proof232-r9: "slayt resmi gibi duruyor
// hiçbir hareket efekt falan yok"). For every painting shot (a QK*/RK* moment painting, the state's plate at the
// painting distance; the build's flight into RK3 is a camera flight, not a painting shot) it measures the mean
// frame-to-frame motion inside the shot on a render: mean absolute difference of consecutive frames, luma 0-255,
// decoded at 480x270 (tools/intensity.mjs's measure), over the frame pairs inside the shot only - the first 6 frames
// (a cover's 4 frames after the cut, the cut itself) and the last 2 (a cover's 2 frames before the next cut) left
// out, and the film's own fades from or to black (FINALE_FADES) left out.
// The floor: the median motion of the live shots (every other shot of the film) in the same section, times FACTOR.
//   node tools/slidecheck.mjs --video video/out/proof232-r10.mp4 [--start 0] [--range 0-232.12] [--all: list the live shots too]
//   node tools/slidecheck.mjs --selftest   (must exit 1: a clean case passes and a planted static painting fails)
// Exit 1 when a painting shot sits under its floor.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.join(ROOT, 'video');
const FPS = 60;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
/** The painting's floor as a share of its section's live-shot median. Why 0.5: see the round 10 section of
 *  docs/scene-map.md (measured on proof232-r9 and proof232-r10). */
export const FACTOR = 0.5;
const HEAD = 6, TAIL = 2;
const PANEL_DIST = 30;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/** The verdict on measured shots: [{id, section, painting, motion}] -> rows with the floor and the result. */
export const judge = (shots, factor = FACTOR) => {
  const live = new Map();
  for (const s of shots) if (!s.painting && s.motion !== null) live.set(s.section, [...(live.get(s.section) ?? []), s.motion]);
  return shots.filter((s) => s.painting).map((s) => {
    const med = median(live.get(s.section) ?? []);
    const floor = factor * med;
    return { ...s, median: med, floor, ratio: med ? s.motion / med : 0, ok: s.motion !== null && s.motion >= floor };
  });
};

if (process.argv.includes('--selftest')) {
  const live = [10, 12, 14, 16, 30].map((m, i) => ({ id: `live${i}`, section: 'final_chorus', painting: false, motion: m }));
  const clean = judge([...live, { id: 'rk-moving', section: 'final_chorus', painting: true, motion: 7 }]);
  const planted = judge([...live, { id: 'rk-slide', section: 'final_chorus', painting: true, motion: 1.2 }]);
  console.log(`selftest: live median 14, floor ${(FACTOR * 14).toFixed(2)}; moving painting 7 -> ${clean[0].ok ? 'passes' : 'FAILS (wrong)'}; static painting 1.2 -> ${planted[0].ok ? 'PASSES (wrong)' : 'fails'}`);
  process.exit(clean[0].ok && !planted[0].ok ? 1 : 0);
}

const video = arg('video', null);
if (!video) { console.error('slidecheck: --video <mp4> is required'); process.exit(2); }
const start = Number(arg('start', 0));
const [A, B] = arg('range', '0-232.12').split('-').map(Number);

// the film's shots, frame by frame, from the same state the renderer draws (bundled as tools/framecheck.mjs does)
const require = createRequire(path.join(VIDEO, 'package.json'));
const esbuild = require('esbuild');
const outDir = path.join(VIDEO, 'out', '.slidecheck');
mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, 'state.mjs');
await esbuild.build({
  stdin: {
    contents: [
      "export { filmStateAt } from './Film.tsx';",
      "export { sectionAt } from './timing.ts';",
      "export { FINALE_FADES } from './film/finale/FinaleShot.tsx';",
    ].join('\n'),
    resolveDir: path.join(VIDEO, 'src'), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile, jsx: 'automatic', packages: 'external', logLevel: 'error',
});
process.removeAllListeners('warning');
const M = await import(pathToFileURL(outfile).href);
const f0 = Math.round(A * FPS), f1 = Math.round(B * FPS);
const shots = [];
for (let fr = f0; fr < f1; fr++) {
  const st = M.filmStateAt(fr);
  const id = st?.shot ?? '-';
  const pl = st?.plate;
  const painting = !!pl && pl.dist === PANEL_DIST && !pl.view?.push;
  const last = shots.at(-1);
  if (last && last.id === id && last.b === fr) last.b = fr + 1;
  else shots.push({ id, a: fr, b: fr + 1, painting, panel: painting ? pl.id : undefined });
}
rmSync(outDir, { recursive: true, force: true });

// the render's frame differences (diffs[k] = |frame k+1 - frame k|, k counted from the video's first frame)
const diffs = await new Promise((resolve, reject) => {
  const w = 480, h = 270, size = w * h;
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-']);
  const out = [];
  let prev = null, buf = Buffer.alloc(0);
  ff.stdout.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= size) {
      const f = buf.subarray(0, size);
      if (prev) { let s = 0; for (let i = 0; i < size; i++) s += Math.abs(f[i] - prev[i]); out.push(s / size); }
      prev = Buffer.from(f);
      buf = buf.subarray(size);
    }
  });
  ff.on('close', (code) => (code ? reject(new Error(`ffmpeg exit ${code}`)) : resolve(out)));
});
const fades = (M.FINALE_FADES ?? []).map(([a, b]) => [Math.round(a * FPS), Math.round(b * FPS)]);
const v0 = Math.round(start * FPS);
for (const s of shots) {
  s.section = M.sectionAt((s.a + s.b) / 2 / FPS);
  const ks = [];
  // pair (fr, fr + 1) lies inside the shot and outside the fades
  for (let fr = s.a + HEAD; fr + 1 < s.b - TAIL; fr++) {
    if (fades.some(([a, b]) => fr + 1 >= a && fr < b)) continue;
    const k = fr - v0;
    if (k >= 0 && k < diffs.length) ks.push(diffs[k]);
  }
  s.motion = ks.length >= 6 ? mean(ks) : null;
}
const rows = judge(shots);
console.log(`slidecheck ${A}-${B} s on ${video}: ${rows.length} painting shots, floor = ${FACTOR} x the section's live-shot median`);
console.log(`${'shot'.padEnd(14)} ${'painting'.padEnd(8)} ${'section'.padEnd(22)} ${'time'.padEnd(15)} motion  median  floor  ratio`);
for (const r of rows) {
  const m = r.motion === null ? '   -  ' : r.motion.toFixed(2).padStart(6);
  console.log(`${r.id.padEnd(14)} ${r.panel.padEnd(8)} ${r.section.padEnd(22)} ${`${(r.a / FPS).toFixed(2)}-${(r.b / FPS).toFixed(2)}`.padEnd(15)} ${m}  ${r.median.toFixed(2).padStart(6)}  ${r.floor.toFixed(2).padStart(5)}  ${r.ratio.toFixed(2).padStart(5)}  ${r.ok ? 'ok' : 'FAIL'}`);
}
if (process.argv.includes('--all')) for (const s of shots.filter((x) => !x.painting && x.motion !== null)) console.log(`  live ${s.id.padEnd(16)} ${s.section.padEnd(22)} ${(s.a / FPS).toFixed(2)}-${(s.b / FPS).toFixed(2)} ${s.motion.toFixed(2)}`);
const fails = rows.filter((r) => !r.ok);
console.log(fails.length ? `slidecheck: FAIL (${fails.length})` : 'slidecheck: PASS');
process.exit(fails.length ? 1 : 0);
