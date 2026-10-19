#!/usr/bin/env node
// Measurement tooling for the living test video.
//   node video/scripts/living-checks.mjs <video.mp4> [--out video/out/living-checks]
// Writes sheets, jumpscan.json, jumpscan.png and prints a compact report. No dependencies beyond ffmpeg/ffprobe,
// node built-ins and (for the plot only) Python+PIL. Frames are selected by number only (select=between(n,A,B)),
// never by -ss seeking and never with drawtext.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = path.resolve(HERE, '..');
const ROOT = path.resolve(VIDEO_DIR, '..');
const args = process.argv.slice(2);
const VALUE_FLAGS = ['--out', '--events', '--span', '--checks-module', '--concurrency-note'];
const flagVals = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const flagVal = (name) => flagVals(name)[0];
const OUT = path.resolve(flagVal('--out') ?? path.join(VIDEO_DIR, 'out/living-checks'));
const input = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));
if (!input) {
  console.error('usage: node video/scripts/living-checks.mjs <video.mp4> [--out dir] [--events events.json] [--span A:B:step:name]... [--checks-module m.ts] [--concurrency-note text]');
  process.exit(2);
}
const EVENTS_PATH = flagVal('--events') ? path.resolve(flagVal('--events')) : path.join(VIDEO_DIR, 'src/living/events.json');
const CUSTOM_EVENTS = !!flagVal('--events');
const CHECKS_MODULE = flagVal('--checks-module') ? path.resolve(flagVal('--checks-module')) : null;
const NOTE = flagVal('--concurrency-note');
// --span A:B:step:name, song frames (converted to composition frames below)
const spans = flagVals('--span').map((s) => {
  const [a, b, st, ...nm] = s.split(':');
  const sp = { A: Number(a), B: Number(b), step: Number(st), name: nm.join(':') };
  if (![sp.A, sp.B, sp.step].every(Number.isInteger) || sp.step < 1 || sp.B < sp.A || !sp.name) { console.error(`bad --span "${s}" (want A:B:step:name)`); process.exit(2); }
  return sp;
});
const VID = path.resolve(input);
fs.mkdirSync(OUT, { recursive: true });

const FPS = 30;
const SW = 480, SH = 270; // scan size
const FLOOR = 2.0; // mean abs diff of 0..255 gray; a cut moves whole regions (>>10), codec noise / slow motion is <1
const RATIO = 3; // spike must exceed 3x the 75th percentile of its +-15 neighbours
const NEIGH = 15;
const DARK = 8; // mean luma below this = black / near-empty
const DUP_RUN = 20;
const DUP_EPS = 0.02; // diff below this counts as an exact duplicate (codec noise on identical frames is ~0)

const T0 = Date.now();
const lap = (s) => console.log(`  [${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);
const run = (cmd, a, opt = {}) => spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 28, shell: process.platform === 'win32' && cmd === 'npx', ...opt });

const ev = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8'));
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timing.json'), 'utf8'));
const S0 = ev.songStart ?? 0;
const events = ev.events;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const probe = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets', '-of', 'json', VID]);
const st = JSON.parse(probe.stdout).streams[0];
const NF = Number(st.nb_read_packets);
console.log(`video ${path.relative(ROOT, VID)}  ${st.width}x${st.height} ${st.r_frame_rate}  ${NF} frames (songStart ${S0}, ${events.length} events)`);
if (CUSTOM_EVENTS) console.log(`events file ${path.relative(ROOT, EVENTS_PATH)}`);
if (NOTE) console.log(`note: ${NOTE}`);

// ---------- 1. frame-exact sheets ----------
const selectFrames = (expr, count, tmp) => {
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  run('ffmpeg', ['-v', 'error', '-y', '-i', VID, '-vf', `select='${expr}',scale=480:-1`, '-vsync', '0', '-frames:v', String(count), path.join(tmp, '%04d.png')]);
  return fs.readdirSync(tmp).length;
};
const tile = (tmp, cols, rows, out) => run('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, '%04d.png'), '-vf', `tile=${cols}x${rows}`, '-frames:v', '1', out]);
const sheets = [];
const tmpDir = path.join(OUT, '_tmp');
for (const e of events) {
  if (e.sheet === false) continue;
  const c = e.f - S0, A = Math.max(0, c - 3), B = Math.min(NF - 1, c + 3); // window clipped at the video ends
  const name = `sheet-${e.f}-${slug(e.name)}.png`;
  const want = B - A + 1;
  if (c < 0 || c >= NF) { sheets.push({ name, expected: want, got: 0, ok: false, note: 'event outside video' }); continue; }
  const got = selectFrames(`between(n\,${A}\,${B})`, want, tmpDir);
  if (got === want) tile(tmpDir, want, 1, path.join(OUT, name));
  sheets.push({ name, expected: want, got, ok: got === want && fs.existsSync(path.join(OUT, name)), note: want < 7 ? `window clipped to ${A}..${B}` : undefined });
}
const allSpans = CUSTOM_EVENTS ? spans : [{ A: 750, B: 806, step: 2, name: 'pen-reveal' }, ...spans];
for (const sp of allSpans) {
  const A = sp.A - S0, B = sp.B - S0, n = Math.floor((B - A) / sp.step) + 1;
  const name = `sheet-${sp.name === 'pen-reveal' ? 'pen-reveal-750-806' : `span-${slug(sp.name)}-${sp.A}-${sp.B}`}.png`;
  if (A < 0 || B >= NF) sheets.push({ name, expected: n, got: 0, ok: false, note: 'outside video' });
  else {
    const got = selectFrames(`between(n\,${A}\,${B})*not(mod(n-${A}\,${sp.step}))`, n, tmpDir);
    if (got === n) tile(tmpDir, Math.min(6, n), Math.ceil(n / 6), path.join(OUT, name));
    sheets.push({ name, expected: n, got, ok: got === n && fs.existsSync(path.join(OUT, name)) });
  }
}
fs.rmSync(tmpDir, { recursive: true, force: true });
lap('sheets done');

// ---------- 2. jump scan + black frames ----------
const scan = () => new Promise((resolve, reject) => {
  const p = spawn('ffmpeg', ['-v', 'error', '-i', VID, '-vf', `scale=${SW}:${SH},format=gray`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
  const fsz = SW * SH, half = SW / 2;
  let buf = Buffer.alloc(0), prev = null, n = 0;
  const left = [], right = [], luma = [];
  p.stdout.on('data', (chunk) => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= fsz) {
      const f = buf.subarray(0, fsz);
      let sum = 0;
      for (let i = 0; i < fsz; i++) sum += f[i];
      luma.push(sum / fsz);
      if (prev) {
        let l = 0, r = 0;
        for (let y = 0; y < SH; y++) {
          const o = y * SW;
          for (let x = 0; x < half; x++) l += Math.abs(f[o + x] - prev[o + x]);
          for (let x = half; x < SW; x++) r += Math.abs(f[o + x] - prev[o + x]);
        }
        left.push(l / (fsz / 2)); right.push(r / (fsz / 2));
      } else { left.push(0); right.push(0); }
      prev = Buffer.from(f);
      buf = buf.subarray(fsz);
      n++;
    }
  });
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.on('close', () => resolve({ n, left, right, luma }));
  p.on('error', reject);
});
const { n: DEC, left, right, luma } = await scan();
lap(`decoded ${DEC} frames for the scan`);
if (DEC !== NF) console.log(`  WARNING: decoded ${DEC} frames, packets ${NF}`);

// Reference level of the neighbourhood = its 75th percentile (>= the median). Animation on twos alternates 0 / step,
// so the median is ~0 and every step would look like a spike; the 75th percentile sits at the step level there,
// while around a lone cut all neighbours are still low.
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.75))] : 0; };
const cutFrames = events.filter((e) => e.kind === 'cut').map((e) => e.f - S0);
const spikes = [];
for (const [half, arr] of [['left', left], ['right', right]]) {
  for (let i = 1; i < arr.length; i++) {
    const nb = [];
    for (let k = Math.max(1, i - NEIGH); k <= Math.min(arr.length - 1, i + NEIGH); k++) if (k !== i) nb.push(arr[k]);
    const med = median(nb);
    if (arr[i] > RATIO * med && arr[i] > FLOOR) {
      spikes.push({ frame: i, songFrame: i + S0, half, value: +arr[i].toFixed(2), neighbourMedian: +med.toFixed(3), class: cutFrames.includes(i) ? 'ALLOWED' : 'UNINTENDED' });
    }
  }
}
spikes.sort((a, b) => a.frame - b.frame || (a.half < b.half ? -1 : 1));
const darkAll = [];
luma.forEach((v, i) => { if (v < DARK) darkAll.push(i); });
// events.json "deliberateBlack": [[A, B], ...] in song frames, inclusive; dark frames inside are reported, not failed.
const blackRanges = (ev.deliberateBlack ?? []).map(([a, b]) => [a - S0, b - S0]);
const inBlack = (i) => blackRanges.some(([a, b]) => i >= a && i <= b);
const dark = darkAll.filter((i) => !inBlack(i));
const deliberateDark = darkAll.filter(inBlack);
const both = left.map((l, i) => Math.max(l, right[i]));
const dupRuns = [];
for (let i = 1; i < both.length;) {
  if (both[i] < DUP_EPS) {
    let j = i;
    while (j + 1 < both.length && both[j + 1] < DUP_EPS) j++;
    const len = j - i + 2; // identical frames: i-1..j
    if (len > DUP_RUN) dupRuns.push({ from: i - 1, to: j, frames: len, songFrom: i - 1 + S0 });
    i = j + 1;
  } else i++;
}
// A listed cut without a spike (camera moving, diff under ratio/floor) is soft if the picture really changed there
// (max L/R diff >= CUT_MIN, well above codec noise), else it changed nothing and is a bug.
const CUT_MIN = 1.0;
const nbP75 = (arr, i) => { const nb = []; for (let k = Math.max(1, i - NEIGH); k <= Math.min(arr.length - 1, i + NEIGH); k++) if (k !== i) nb.push(arr[k]); return median(nb); };
const noSpikeCuts = cutFrames.filter((c) => c < DEC && !spikes.some((s) => s.frame === c)).map((c) => ({
  frame: c, songFrame: c + S0, left: +(left[c] ?? 0).toFixed(2), right: +(right[c] ?? 0).toFixed(2),
  neighbourP75: +Math.max(nbP75(left, c), nbP75(right, c)).toFixed(3),
}));
const softCuts = noSpikeCuts.filter((m) => Math.max(m.left, m.right) >= CUT_MIN);
const missedCuts = noSpikeCuts.filter((m) => Math.max(m.left, m.right) < CUT_MIN);
fs.writeFileSync(path.join(OUT, 'jumpscan.json'), JSON.stringify({
  video: VID, frames: DEC, floor: FLOOR, ratio: RATIO, neighbourhood: NEIGH, cutFrames, spikes, darkFrames: dark, duplicateRuns: dupRuns, cutsWithoutSpike: noSpikeCuts, softCuts, noChangeCuts: missedCuts, deliberateBlackFrames: deliberateDark,
  leftDiff: left.map((v) => +v.toFixed(3)), rightDiff: right.map((v) => +v.toFixed(3)), luma: luma.map((v) => +v.toFixed(2)),
}));
const py = run('python', [path.join(HERE, 'living-checks.py'), path.join(OUT, 'jumpscan.json'), path.join(OUT, 'jumpscan.png')]);
lap('scan written');

// ---------- 3. beat landing ----------
const beats = timing.beats.map((t) => Math.round(t * FPS));
const downs = timing.downbeats.map((t) => Math.round(t * FPS));
const halves = beats.slice(0, -1).flatMap((b, i) => [b, Math.round(((timing.beats[i] + timing.beats[i + 1]) / 2) * FPS)]);
const nearest = (grid, f) => grid.reduce((b, g) => (Math.abs(g - f) < Math.abs(b - f) ? g : b), grid[0]);
const beatRows = [];
for (const e of events) {
  if (e.on === 'word') {
    const norm = (w) => String(w ?? '').replace(/[^\p{L}\p{N}]+/gu, '').toLocaleLowerCase('tr');
    const cand = timing.words.filter((w) => norm(w.w) === norm(e.word)).map((w) => Math.round(w.start * FPS));
    if (!e.word || !cand.length) { beatRows.push({ f: e.f, on: e.on, grid: null, drift: null, name: e.name, msg: `word "${e.word}" not found in timing.json` }); continue; }
    const g = nearest(cand, e.f);
    beatRows.push({ f: e.f, on: e.on, grid: g, drift: e.f - g, name: e.name, msg: `word "${e.word}"${cand.length > 1 ? ` (${cand.length} matches)` : ''}` });
    continue;
  }
  const grid = e.on === 'downbeat' ? downs : e.on === 'beat' ? beats : e.on === 'half-beat' ? halves : null;
  if (!grid) {
    if (e.on !== 'none') beatRows.push({ f: e.f, on: String(e.on), grid: null, drift: null, name: e.name, msg: `unknown grid "${e.on}"` });
    continue;
  }
  const g = nearest(grid, e.f);
  beatRows.push({ f: e.f, on: e.on, grid: g, drift: e.f - g, name: e.name });
}
const beatPass = beatRows.every((r) => r.drift === 0);

// ---------- 4. purity grep ----------
const pat = /Math\.random|Date\.now|new Date|performance\.now|requestAnimationFrame|setTimeout|setInterval|useFrame/;
const walk = (p) => (!fs.existsSync(p) ? [] : fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((n) => walk(path.join(p, n))) : [p]);
const files = [...walk(path.join(VIDEO_DIR, 'src/living')), ...walk(path.join(VIDEO_DIR, 'src/LivingRoot.tsx')), ...walk(path.join(VIDEO_DIR, 'src/living-index.ts'))].filter((f) => /\.(tsx?|jsx?|mjs)$/.test(f));
const hits = [];
for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
  if (pat.test(l)) hits.push({ at: `${path.relative(ROOT, f)}:${i + 1}`, comment: /^\s*(\/\/|\*|\/\*)/.test(l), text: l.trim().slice(0, 100) });
});
const realHits = hits.filter((h) => !h.comment);

// ---------- 5. tsc ----------
const tsc = run('npx tsc --noEmit', [], { cwd: VIDEO_DIR, shell: true });
const tscOut = (tsc.stdout || '') + (tsc.stderr || '');
const tscErrors = (tscOut.match(/error TS\d+/g) || []).length;
const tscFirst = tscOut.split('\n').filter((l) => /error TS/.test(l)).slice(0, 5);
lap('tsc done');

// ---------- 5b. external checks module (caption overlap, stamps clear of characters, ...) ----------
let modOut = null, modPass = true;
if (CHECKS_MODULE) {
  const m = run('node', ['--experimental-strip-types', '--no-warnings', CHECKS_MODULE], { cwd: VIDEO_DIR });
  modOut = (m.stdout || '') + (m.stderr ? `
[stderr] ${m.stderr}` : '');
  modPass = m.status === 0 && /^TYPECHECK: PASS\s*$/m.test(modOut) && !/^TYPECHECK: FAIL\s*$/m.test(modOut);
  lap('checks module done');
}

// ---------- report ----------
const unintended = spikes.filter((s) => s.class === 'UNINTENDED');
console.log(`\n== 1. sheets (${OUT})`);
for (const s of sheets) console.log(`  ${s.ok ? 'ok  ' : 'FAIL'} ${s.name}  frames ${s.got}/${s.expected}${s.note ? '  (' + s.note + ')' : ''}`);
console.log(`\n== 2. jump scan  floor ${FLOOR}, ratio ${RATIO}x p75(+-${NEIGH}), ${DEC} frames`);
console.log(`  spikes ${spikes.length}: ALLOWED ${spikes.length - unintended.length}, UNINTENDED ${unintended.length}`);
for (const s of spikes.slice(0, 40)) console.log(`  ${s.class.padEnd(10)} frame ${s.frame} (song ${s.songFrame}) ${s.half} ${s.value} (neighbour median ${s.neighbourMedian})`);
if (spikes.length > 40) console.log(`  ... ${spikes.length - 40} more in jumpscan.json`);
const cutRow = (m) => `${m.frame} (L${m.left}/R${m.right}, neighbour p75 ${m.neighbourP75})`;
console.log(`  listed cut, soft (below threshold; does not fail): ${softCuts.length ? softCuts.map(cutRow).join(', ') : 'none'}`);
console.log(`  listed cut, NO CHANGE (max L/R < ${CUT_MIN}; fails): ${missedCuts.length ? missedCuts.map(cutRow).join(', ') : 'none'}`);
console.log(`  exact-duplicate runs > ${DUP_RUN} frames: ${dupRuns.length ? dupRuns.map((r) => `${r.from}-${r.to} (${r.frames})`).join(', ') : 'none'}`);
console.log(`  plot: ${py.status === 0 ? 'jumpscan.png' : 'FAILED ' + (py.stderr || '').slice(0, 200)}`);
console.log(`\n== 3. beat landing: ${beatPass ? 'PASS' : 'FAIL'} (${beatRows.length} events)`);
for (const r of beatRows) console.log(r.drift === null ? `  FAIL f${r.f} ${r.on.padEnd(9)} ${r.msg}  ${r.name}` : `  f${r.f} ${r.on.padEnd(9)} grid ${r.grid} drift ${r.drift >= 0 ? '+' : ''}${r.drift}  ${r.name}${r.msg ? '  [' + r.msg + ']' : ''}`);
console.log(`\n== 4. purity: ${realHits.length ? 'FAIL' : 'PASS'} (${files.length} files scanned, ${realHits.length} hits, ${hits.length - realHits.length} comment-only)`);
for (const h of hits) console.log(`  ${h.comment ? '(comment) ' : ''}${h.at}  ${h.text}`);
console.log(`\n== 5. tsc --noEmit: ${tsc.status === 0 ? 'PASS' : 'FAIL'} (${tscErrors} errors)`);
for (const l of tscFirst) console.log('  ' + l);
console.log(`\n== 6. black frames (mean luma < ${DARK}): ${dark.length}${dark.length ? '  frames ' + dark.slice(0, 20).join(',') : ''}`);
console.log(`   deliberate black (inside deliberateBlack ranges, not failed): ${deliberateDark.length}${deliberateDark.length ? '  frames ' + deliberateDark.slice(0, 20).join(',') + (deliberateDark.length > 20 ? ',...' : '') : ''}`);
if (CHECKS_MODULE) {
  console.log(`
== 7. checks module ${path.relative(ROOT, CHECKS_MODULE)}: ${modPass ? 'PASS' : 'FAIL'}`);
  for (const l of modOut.split('\n')) if (l.trim()) console.log('  ' + l);
}
const verdict = sheets.every((s) => s.ok) && !unintended.length && !missedCuts.length && beatPass && !realHits.length && tsc.status === 0 && !dark.length && modPass;
console.log(`\nOVERALL: ${verdict ? 'PASS' : 'FAIL'}   total ${((Date.now() - T0) / 1000).toFixed(1)}s`);
