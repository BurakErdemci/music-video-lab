#!/usr/bin/env node
// intensity.mjs - the chorus-is-the-peak measurement (scene-map.md "The chorus is the peak"): per section,
// visible events per beat (distinct event frames from video/src/events.ts over the beats in the section) and,
// given a render, the mean frame-to-frame motion (mean absolute difference of consecutive frames, luma 0-255,
// decoded at 480x270). The rule: the chorus is >= 1.5x the verses on both.
//   node tools/intensity.mjs [--range 0-64.15] [--video video/out/proof64.mp4] [--start 0]
// --start is the film time of the video's first frame. Exit 1 when a chorus falls below 1.5x the verses' mean.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const [A, B] = (arg('range', '0-64.15')).split('-').map(Number);
const video = arg('video', null);
const start = Number(arg('start', 0));
const FPS = 60;
const T = await import(pathToFileURL(path.join(ROOT, 'video/src/timing.ts')).href);
const { EVENTS } = await import(pathToFileURL(path.join(ROOT, 'video/src/events.ts')).href);

const secs = T.sections.map((s) => ({ name: s.name, a: Math.max(A, s.start), b: Math.min(B, s.end) })).filter((s) => s.b - s.a > 0.5);
for (const s of secs) {
  const beats = T.beats.filter((x) => x >= s.a && x < s.b).length || 1;
  const frames = new Set(EVENTS.filter((e) => e.t >= s.a && e.t < s.b).map((e) => Math.round(e.t * FPS)));
  s.evPerBeat = frames.size / beats;
}

const motion = async () => {
  const w = 480, h = 270, size = w * h;
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-']);
  const diffs = [];
  let prev = null, buf = Buffer.alloc(0);
  for await (const chunk of ff.stdout) {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= size) {
      const f = buf.subarray(0, size);
      if (prev) { let s = 0; for (let i = 0; i < size; i++) s += Math.abs(f[i] - prev[i]); diffs.push(s / size); }
      prev = Buffer.from(f);
      buf = buf.subarray(size);
    }
  }
  return diffs; // diffs[k] = |frame k+1 - frame k|
};
if (video) {
  const d = await motion();
  for (const s of secs) {
    const k0 = Math.max(0, Math.round((s.a - start) * FPS)), k1 = Math.min(d.length, Math.round((s.b - start) * FPS) - 1);
    const part = d.slice(k0, k1);
    s.motion = part.reduce((x, y) => x + y, 0) / (part.length || 1);
  }
}
const isVerse = (n) => /^verse/.test(n);
const isChorus = (n) => /^chorus/.test(n);
const mean = (xs) => xs.reduce((x, y) => x + y, 0) / (xs.length || 1);
const vEv = mean(secs.filter((s) => isVerse(s.name)).map((s) => s.evPerBeat));
const vMo = mean(secs.filter((s) => isVerse(s.name)).map((s) => s.motion ?? 0));
let fail = false;
console.log(`intensity ${A}-${B} s${video ? `, motion from ${video}` : ''}`);
for (const s of secs) {
  const r = isChorus(s.name) ? `  x verses: events ${(s.evPerBeat / vEv).toFixed(2)}${video ? `, motion ${(s.motion / vMo).toFixed(2)}` : ''}` : '';
  if (isChorus(s.name) && (s.evPerBeat < 1.5 * vEv || (video && s.motion < 1.5 * vMo))) fail = true;
  console.log(`${s.name.padEnd(14)} ${s.a.toFixed(2)}-${s.b.toFixed(2)}  events/beat ${s.evPerBeat.toFixed(2)}${video ? `  motion ${s.motion.toFixed(2)}` : ''}${r}`);
}
console.log(`verses mean: events/beat ${vEv.toFixed(2)}${video ? `, motion ${vMo.toFixed(2)}` : ''}; chorus rule (>= 1.5x on both): ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
