#!/usr/bin/env node
// Scalar (README): every beat-locked event drifts 0 frames from its measured beat.
//
//   node tools/beatcheck.mjs [--verbose]
//
// Loads video/src/events.ts (node strips the types; no extra dependency) and checks every
// event against data/timing.json read independently of video/src/timing.ts:
//   1. video/src/data/timing.json is byte-identical to data/timing.json
//   2. frame == round(beats[beatIdx] * 30)               (drift 0)
//   3. lyric/word events: beatIdx is the beat nearest to the measured time srcT
//   4. bar events: beats[beatIdx - offset] is the downbeat of that bar
//   5. dead air: longest gap (in beats) between events per section is within the limit
//      (<= 2 in intro/chorus-type sections, <= 4 elsewhere), over frames 0..CHECK_UNTIL_FRAME
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');
const FPS = 30;

const rawBytes = readFileSync(path.join(ROOT, 'data/timing.json'));
const T = JSON.parse(rawBytes.toString('utf8'));
const copyBytes = readFileSync(path.join(ROOT, 'video/src/data/timing.json'));
const { EVENTS, CHECK_UNTIL_FRAME } = await import(pathToFileURL(path.join(ROOT, 'video/src/events.ts')).href);

const errors = [];
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
if (sha(rawBytes) !== sha(copyBytes)) errors.push(`video/src/data/timing.json differs from data/timing.json (run: npm run sync-timing in video/)`);

const nearestBeat = (t) => T.beats.reduce((best, b, i) => (Math.abs(b - t) < Math.abs(T.beats[best] - t) ? i : best), 0);

let maxDrift = 0;
const ids = new Set();
for (const e of EVENTS) {
  if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`);
  ids.add(e.id);
  const bt = T.beats[e.beatIdx];
  if (bt === undefined) {
    errors.push(`${e.id}: no beat ${e.beatIdx}`);
    continue;
  }
  const expected = Math.round(bt * FPS);
  const drift = Math.abs(e.frame - expected);
  maxDrift = Math.max(maxDrift, drift);
  if (!Number.isInteger(e.frame)) errors.push(`${e.id}: frame ${e.frame} is not an integer`);
  if (drift) errors.push(`${e.id}: frame ${e.frame} expected ${expected} (drift ${drift})`);
  if (e.frame >= CHECK_UNTIL_FRAME) errors.push(`${e.id}: frame ${e.frame} beyond ${CHECK_UNTIL_FRAME}`);
  if (e.srcT !== undefined && nearestBeat(e.srcT) !== e.beatIdx) errors.push(`${e.id}: beat ${e.beatIdx} is not the nearest beat to t=${e.srcT} (nearest ${nearestBeat(e.srcT)})`);
  if (e.bar !== undefined) {
    const downIdx = nearestBeat(T.downbeats[e.bar - 1]);
    if (Math.abs(T.beats[downIdx] - T.downbeats[e.bar - 1]) > 0.002) errors.push(`${e.id}: downbeat ${e.bar} is not on a beat`);
    if (downIdx + (e.beatOffset ?? 0) !== e.beatIdx) errors.push(`${e.id}: beatIdx ${e.beatIdx} != bar ${e.bar} + ${e.beatOffset ?? 0}`);
  }
  if (verbose) console.log(`${drift ? 'DRIFT' : 'ok   '} ${e.id.padEnd(22)} ${e.kind.padEnd(7)} beat ${String(e.beatIdx).padStart(3)}  f${String(e.frame).padStart(4)}${e.srcT !== undefined ? `  src ${e.srcT.toFixed(2)}s` : ''}`);
}
console.log(`beatcheck: ${EVENTS.length} events, max drift = ${maxDrift} frames, timing copy ${sha(rawBytes) === sha(copyBytes) ? 'identical' : 'DIFFERS'}`);

// ---- dead air
const beatPos = (t) => {
  const b = T.beats;
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0]);
  for (let i = 0; i < b.length - 1; i++) if (t < b[i + 1]) return i + (t - b[i]) / (b[i + 1] - b[i]);
  return b.length - 1;
};
const limitFor = (name) => (/^(intro|chorus|post-chorus|final chorus|outro)/i.test(name) ? 2 : 4);
const endT = CHECK_UNTIL_FRAME / FPS;
const violations = [];
for (const s of T.sections) {
  if (s.start >= endT) break;
  const sEnd = Math.min(s.end, endT);
  const evs = EVENTS.filter((e) => e.frame / FPS >= s.start && e.frame / FPS < sEnd).sort((a, b) => a.beatIdx - b.beatIdx);
  const pts = [{ pos: beatPos(s.start), id: '(section start)' }, ...evs.map((e) => ({ pos: e.beatIdx, id: e.id })), { pos: beatPos(sEnd), id: '(section end)' }];
  let worst = 0;
  let where = '';
  for (let k = 1; k < pts.length; k++) {
    const gap = pts[k].pos - pts[k - 1].pos;
    if (gap > worst) {
      worst = gap;
      where = `${pts[k - 1].id} -> ${pts[k].id}`;
    }
  }
  const limit = limitFor(s.name);
  const bad = worst > limit + 1e-6;
  if (bad) violations.push(`${s.name}: gap ${worst.toFixed(2)} beats > ${limit} (${where})`);
  console.log(`${bad ? 'FAIL ' : 'ok   '} ${s.name.padEnd(14)} ${String(evs.length).padStart(3)} ev  max gap ${worst.toFixed(2)} beats (limit ${limit})  ${where}`);
}
for (const m of errors) console.log(`ERROR ${m}`);
for (const v of violations) console.log(`DEAD-AIR ${v}`);
process.exit(errors.length || violations.length ? 1 : 0);
