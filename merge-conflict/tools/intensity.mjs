#!/usr/bin/env node
// intensity.mjs - the chorus-is-the-peak measurement (scene-map.md "The chorus is the peak"): per section,
// visible events per beat (distinct event frames from video/src/events.ts over the beats in the section) and,
// given a render, the mean frame-to-frame motion (mean absolute difference of consecutive frames, luma 0-255,
// decoded at 480x270). Rules: each chorus >= 1.5x the verses on both; verses 3-4 >= 0.5x the chorus motion and
// >= the verse 1-2 events; scream and breakdown in [0.7, 1.0]x and the solo in [0.7, 1.15]x the chorus motion with >= 1.10 events per
// beat; the 4 s after each chorus >= 0.5x the chorus motion; the whisper is exempt ("No cliff after the chorus").
//   node tools/intensity.mjs [--range 0-64.15] [--video video/out/proof64.mp4] [--start 0]
// --start is the film time of the video's first frame. Exit 1 when any rule fails.
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
let diffs = null;
if (video) {
  const d = await motion();
  diffs = d;
  for (const s of secs) {
    const k0 = Math.max(0, Math.round((s.a - start) * FPS)), k1 = Math.min(d.length, Math.round((s.b - start) * FPS) - 1);
    const part = d.slice(k0, k1);
    s.motion = part.reduce((x, y) => x + y, 0) / (part.length || 1);
  }
}
const isVerse = (n) => /^verse/.test(n);
const isChorus = (n) => /^chorus/.test(n);
const METAL = ['scream', 'breakdown_git_push_force', 'guitar_solo'];
const mean = (xs) => xs.reduce((x, y) => x + y, 0) / (xs.length || 1);
const byName = (n) => secs.find((s) => s.name === n);
const vEv = mean(secs.filter((s) => isVerse(s.name)).map((s) => s.evPerBeat));
const vMo = mean(secs.filter((s) => isVerse(s.name)).map((s) => s.motion ?? 0));
const choruses = secs.filter((s) => isChorus(s.name));
const cMo = mean(choruses.map((s) => s.motion ?? 0));
const v12Ev = mean(['verse1_sweet', 'verse2_raspy'].map(byName).filter(Boolean).map((s) => s.evPerBeat));
const fails = [];
const ratio = (s) => (video && cMo ? ` (${(s.motion / cMo).toFixed(2)}x chorus)` : '');
console.log(`intensity ${A}-${B} s${video ? `, motion from ${video}` : ''}`);
for (const s of secs) console.log(`${s.name.padEnd(26)} ${s.a.toFixed(2)}-${s.b.toFixed(2)}  events/beat ${s.evPerBeat.toFixed(2)}${video ? `  motion ${s.motion.toFixed(2)}${ratio(s)}` : ''}`);
// 1. the chorus stays the peak (round 6)
for (const c of choruses) {
  if (c.evPerBeat < 1.5 * vEv) fails.push(`${c.name} events/beat ${c.evPerBeat.toFixed(2)} < 1.5x verses ${vEv.toFixed(2)}`);
  if (video && c.motion < 1.5 * vMo) fails.push(`${c.name} motion ${c.motion.toFixed(2)} < 1.5x verses ${vMo.toFixed(2)}`);
}
// 2. the floor after a chorus: verses 3 and 4 (scene-map.md "No cliff after the chorus")
for (const n of ['verse3_rebase', 'verse4_trade']) {
  const s = byName(n);
  if (!s) continue;
  if (s.evPerBeat < v12Ev) fails.push(`${n} events/beat ${s.evPerBeat.toFixed(2)} < verses 1-2 mean ${v12Ev.toFixed(2)}`);
  if (video && choruses.length && s.motion < 0.5 * cMo) fails.push(`${n} motion ${s.motion.toFixed(2)} < 0.5x chorus ${cMo.toFixed(2)}`);
}
// 3. metal sits just under the chorus
for (const n of METAL) {
  const s = byName(n);
  if (!s) continue;
  if (s.evPerBeat < 1.1) fails.push(`${n} events/beat ${s.evPerBeat.toFixed(2)} < 1.10`);
  // the solo may reach 1.15x the chorus (scene-map.md "Living motion", Burak's call); the others stay under it
  const top = n === 'guitar_solo' ? 1.15 : 1.0;
  if (video && choruses.length && (s.motion < 0.7 * cMo || s.motion > top * cMo)) fails.push(`${n} motion ${s.motion.toFixed(2)} outside [0.7, ${top}]x chorus ${cMo.toFixed(2)}`);
}
// 4. no cliff: the 4 s after each chorus
if (video && diffs) {
  for (const c of choruses) {
    if (c.b + 4 > B) continue;
    const k0 = Math.round((c.b - start) * FPS), k1 = Math.min(diffs.length, Math.round((c.b + 4 - start) * FPS));
    const m = mean(diffs.slice(k0, k1));
    console.log(`after ${c.name.padEnd(20)} ${c.b.toFixed(2)}-${(c.b + 4).toFixed(2)}  motion ${m.toFixed(2)} (${(m / cMo).toFixed(2)}x chorus)`);
    if (m < 0.5 * cMo) fails.push(`the 4 s after ${c.name} average ${m.toFixed(2)} < 0.5x chorus ${cMo.toFixed(2)}`);
  }
}
console.log(`verses mean: events/beat ${vEv.toFixed(2)}${video ? `, motion ${vMo.toFixed(2)}` : ''}; chorus mean motion ${video ? cMo.toFixed(2) : '-'}; verses 1-2 events/beat ${v12Ev.toFixed(2)}`);
for (const f of fails) console.log(`FAIL ${f}`);
console.log(`intensity: ${fails.length ? `FAIL (${fails.length})` : 'PASS'}`);
process.exit(fails.length ? 1 : 0);
