#!/usr/bin/env node
// Copy of part4/finale/repair-tiles.mjs: composition is argv[3] (the still is rendered from that composition), crf 18.
// Finds and repairs Chrome's corrupted captures in a Part4bV3 render.
//   node src/living/fps60/repair-tiles60.mjs <video.mp4> <Composition> [--dry]
// The corruption: the frame shows its own top-left third tiled 3x3, so the top-left tile equals its right and lower
// neighbours. A real frame of this film never has three identical tiles. Detection works on that signature directly
// (the jump scan only sees pairs of spikes and misses runs). Each bad frame is rendered alone as a still from ONE
// bundle (clean when rendered alone, see part4/repair.mjs), checked to differ from the bad frame, and overlaid onto
// exactly that frame. Process cap: one bundle + one still per bad frame, at most MAX_FRAMES.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_FRAMES = Number(process.env.MAX_FRAMES ?? 80);
const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const video = path.resolve(process.argv[2] ?? '');
const comp = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'Part4bV3';
const dry = process.argv.includes('--dry');
if (!fs.existsSync(video)) {
  console.error('usage: repair-tiles.mjs <video.mp4> <Composition> [--dry]');
  process.exit(2);
}
const run = (cmd, args, opt = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'npx', maxBuffer: 1 << 30, ...opt });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    throw new Error(`${cmd} failed`);
  }
  return r;
};
const SW = 480;
const SH = 270;
const raw = run('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${SW}:${SH}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { encoding: 'buffer' }).stdout;
const N = raw.length / (SW * SH);
// measured on glitched frames of this render (480 x 270 scan): the picture repeats every 191 px across
const shiftDiff = (off, dx, dy) => {
  let s = 0;
  let c = 0;
  for (let y = 0; y + dy < SH; y += 2) for (let x = 0; x + dx < SW; x += 2) {
    s += Math.abs(raw[off + y * SW + x] - raw[off + (y + dy) * SW + x + dx]);
    c++;
  }
  return s / c;
};
const minOver = (off, a, b, horiz) => {
  let m = 1e9;
  for (let k = a; k <= b; k++) m = Math.min(m, horiz ? shiftDiff(off, k, 0) : shiftDiff(off, 0, k));
  return m;
};
const bad = [];
for (let n = 0; n < N; n++) {
  const off = n * SW * SH;
  const h = minOver(off, 187, 195, true);
  if (h > 2.5) continue;
  // the vertical period varies between captures (186 px, or ~94 px), so only the horizontal one is required; a flat
  // frame (the cream screen) repeats at every shift, so the picture must NOT repeat at half that period
  if (shiftDiff(off, 95, 0) > 2 * h + 0.8) bad.push(n);
}
console.log(`frames ${N}; tiled captures: ${bad.length ? bad.join(', ') : 'none'}`);
if (!bad.length || dry) process.exit(0);
if (bad.length > MAX_FRAMES) {
  console.error(`too many (${bad.length} > ${MAX_FRAMES}); render again instead`);
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p4f-repair-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const bundle = path.join(tmp, 'bundle');
run('npx', ['remotion', 'bundle', 'src/living-index.ts', `--out-dir=${bundle}`, '--log=error'], { cwd: VIDEO_DIR });
const skip = new Set();
for (const n of bad) {
  const png = path.join(tmp, `f${n}.png`);
  // a still can fail on a flaky image decode under load: retry, still bounded (3 tries per frame)
  for (let t = 1; ; t++) {
    try {
      run('npx', ['remotion', 'still', bundle, comp, png, `--frame=${n}`, '--log=error'], { cwd: VIDEO_DIR });
      break;
    } catch (e) {
      if (t >= 3) throw e;
    }
  }
  const still = run('ffmpeg', ['-v', 'error', '-i', png, '-vf', `scale=${SW}:${SH}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { encoding: 'buffer' }).stdout;
  let s = 0;
  const off = n * SW * SH;
  for (let i = 0; i < still.length; i++) s += Math.abs(still[i] - raw[off + i]);
  const d = s / still.length;
  console.log(`frame ${n}: still vs bad frame ${d.toFixed(2)}`);
  // a near-flat frame (the union flash) can look periodic: if its still matches, it was never broken
  if (d < 4) skip.add(n);
}
const fixList = bad.filter((n) => !skip.has(n));
console.log(`skipped (still matches, not a glitch): ${[...skip].join(', ') || 'none'}`);
// overlay in chunks (one filter graph per chunk keeps the command line short)
let cur = video;
const CH = 20;
for (let c = 0; c < fixList.length; c += CH) {
  const part = fixList.slice(c, c + CH);
  const inputs = part.flatMap((n) => ['-i', path.join(tmp, `f${n}.png`)]);
  let chain = '[0:v]';
  const g = part.map((n, i) => {
    const out = i === part.length - 1 ? '[v]' : `[v${i}]`;
    const s = `${chain}[${i + 1}:v]overlay=0:0:enable='eq(n\\,${n})'${out}`;
    chain = out;
    return s;
  });
  const next = path.join(tmp, `fixed${c}.mp4`);
  run('ffmpeg', ['-v', 'error', '-y', '-i', cur, ...inputs, '-filter_complex', g.join(';'), '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', next]);
  cur = next;
}
fs.copyFileSync(cur, video);
console.log(`repaired frames ${fixList.join(', ')} of ${video}`);
