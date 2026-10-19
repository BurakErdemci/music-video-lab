#!/usr/bin/env node
// Repairs single render-glitch frames of the Part3 video.
//   node video/src/living/part3/repair.mjs <video.mp4> <jumpscan.json>
// Why: at --concurrency=4 Chrome now and then captures a frame whose picture is the top-left third of the real
// frame tiled 3x3 (seen at song 3501-3502 in one render, 4670-4671 in the next; a still of the same frame is clean),
// so the defect is in the capture, not in the frame-pure shot code. The jump scan reports such a frame as an
// UNINTENDED spike pair (into it and out of it). This script re-renders every UNINTENDED frame as a still, checks that
// the still differs from the video frame (else the spike is real content and it stops), and overlays the stills onto
// exactly those frames (ffmpeg overlay enabled by frame number; the audio is copied). Process cap: one remotion still
// per bad frame, at most MAX_FRAMES.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MAX_FRAMES = 16;
const [video, scan] = process.argv.slice(2);
if (!video || !scan) {
  console.error('usage: repair.mjs <video.mp4> <jumpscan.json>');
  process.exit(2);
}
const VIDEO_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../../..');
const js = JSON.parse(fs.readFileSync(scan, 'utf8'));
// a glitch run shows as a spike INTO it at n and OUT of it at n+k (k = 1..3 glitched frames in a row): the bad frames
// are n..n+k-1 for each such pair of spikes
const spikeFrames = [...new Set(js.spikes.filter((s) => s.class === 'UNINTENDED').map((s) => s.frame))].sort((a, b) => a - b);
const bad = [];
for (let i = 0; i + 1 < spikeFrames.length; i++) {
  const a = spikeFrames[i];
  const b = spikeFrames[i + 1];
  if (b - a <= 3) {
    for (let n = a; n < b; n++) bad.push(n);
    i++;
  }
}
if (!bad.length) {
  console.log('no glitch pairs; nothing to repair');
  process.exit(0);
}
if (bad.length > MAX_FRAMES) {
  console.error(`too many glitch frames (${bad.length} > ${MAX_FRAMES}); render again instead`);
  process.exit(1);
}
const tmp = path.join(path.dirname(path.resolve(video)), 'part3-repair-tmp');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const run = (cmd, args, opt = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'npx', maxBuffer: 1 << 26, ...opt });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    throw new Error(`${cmd} failed`);
  }
  return r;
};
const meanAbs = (a, b) => {
  // mean abs diff of two same-size raw rgb24 buffers
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};
const rawFrameOfVideo = (n) => run('ffmpeg', ['-v', 'error', '-i', video, '-vf', `select='eq(n\\,${n})',scale=480:270`, '-vsync', 'vfr', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer' }).stdout;
const rawOfPng = (p) => run('ffmpeg', ['-v', 'error', '-i', p, '-vf', 'scale=480:270', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer' }).stdout;
for (const n of bad) {
  const png = path.join(tmp, `f${n}.png`);
  run('npx', ['remotion', 'still', 'src/living-index.ts', 'Part3', png, `--frame=${n}`, '--log=error'], { cwd: VIDEO_DIR });
  const d = meanAbs(rawFrameOfVideo(n), rawOfPng(png));
  const prev = meanAbs(rawFrameOfVideo(n - 1), rawOfPng(png));
  console.log(`frame ${n}: video vs still ${d.toFixed(2)}, previous video frame vs still ${prev.toFixed(2)}`);
  if (d < 6) throw new Error(`frame ${n} matches its still: a real picture change, not a capture glitch`);
}
const inputs = bad.flatMap((n) => ['-i', path.join(tmp, `f${n}.png`)]);
let chain = '[0:v]';
const parts = bad.map((n, i) => {
  const out = i === bad.length - 1 ? '[v]' : `[v${i}]`;
  const s = `${chain}[${i + 1}:v]overlay=0:0:enable='eq(n\\,${n})'${out}`;
  chain = out;
  return s;
});
const fixed = path.join(tmp, 'fixed.mp4');
run('ffmpeg', ['-v', 'error', '-y', '-i', video, ...inputs, '-filter_complex', parts.join(';'), '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'copy', fixed]);
fs.copyFileSync(fixed, video);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`repaired frames ${bad.join(', ')} of ${video}`);
