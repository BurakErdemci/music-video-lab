#!/usr/bin/env node
// Scalar (docs/scene-map.md): every beat-locked event drifts 0 frames from its measured anchor, and no
// section breaks the dead-air rule.
//
//   node tools/beatcheck.mjs [--verbose]
//
// Loads EVENTS from video/src/events.ts directly (node strips the types) and recomputes every expected
// time from data/take-2026-10-20/mc-timing.json, read independently of video/src/timing.ts. The scene
// clock is in seconds and the film renders at 60 fps, so drift is measured in frames at 60 fps:
//   anchor 'beat':     ref = beat index        -> beats[ref]
//   anchor 'downbeat': ref = downbeat index    -> downbeats[ref]
//   anchor 'hook':     ref = accept_hooks index -> accept_hooks[ref][0]
//   anchor 'word':     ref = "<text>#<nth>"    -> start of the nth phrase match
// Drift errors fail the run (exit 1). Dead air is reported per section and also fails the run (exit 2).
// An empty EVENTS list passes with a note: there is nothing to drift or to leave dead yet.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');
const FPS = 60;

const rawBytes = readFileSync(path.join(ROOT, 'data/take-2026-10-20/mc-timing.json'));
const T = JSON.parse(rawBytes.toString('utf8'));
const copyBytes = readFileSync(path.join(ROOT, 'video/src/data/mc-timing.json'));
const { EVENTS } = await import(pathToFileURL(path.join(ROOT, 'video/src/events.ts')).href);

const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const errors = [];
if (sha(rawBytes) !== sha(copyBytes)) errors.push('video/src/data/mc-timing.json differs from data/take-2026-10-20/mc-timing.json (run: npm run sync-timing in video/)');

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const wordStart = (text, nth) => {
  const target = text.split(/\s+/).map(norm).filter(Boolean);
  const ws = T.words.map((x) => norm(x.w));
  let seen = 0;
  for (let i = 0; i + target.length <= ws.length; i++) {
    if (target.every((tok, k) => ws[i + k] === tok) && seen++ === nth) return T.words[i].s;
  }
  return undefined;
};
const anchorTime = (e) => {
  if (e.anchor === 'beat') return T.beats[e.ref];
  if (e.anchor === 'downbeat') return T.downbeats[e.ref];
  if (e.anchor === 'hook') return T.accept_hooks[e.ref]?.[0];
  if (e.anchor === 'word') {
    const [text, nth] = String(e.ref).split('#');
    return wordStart(text, Number(nth ?? 0));
  }
  return undefined;
};

let maxDrift = 0;
const ids = new Set();
for (const e of EVENTS) {
  if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`);
  ids.add(e.id);
  if (!['beat', 'downbeat', 'hook', 'word'].includes(e.anchor)) {
    errors.push(`${e.id}: unknown anchor ${e.anchor}`);
    continue;
  }
  const t = anchorTime(e);
  if (t === undefined) {
    errors.push(`${e.id}: anchor ${e.anchor} ref ${e.ref} not found in mc-timing.json`);
    continue;
  }
  const drift = Math.abs(Math.round(e.t * FPS) - Math.round(t * FPS));
  maxDrift = Math.max(maxDrift, drift);
  if (drift > 0) errors.push(`${e.id}: frame ${Math.round(e.t * FPS)} expected ${Math.round(t * FPS)} (drift ${drift})`);
  if (verbose) console.log(`${drift ? 'DRIFT' : 'ok   '} ${e.id.padEnd(20)} ${e.anchor.padEnd(8)} ${String(e.ref).padEnd(18)} f${String(Math.round(e.t * FPS)).padStart(6)} (${t.toFixed(3)} s)`);
}
console.log(`beatcheck drift @ ${FPS} fps: ${EVENTS.length} events, max drift = ${maxDrift} frames, timing copy ${sha(rawBytes) === sha(copyBytes) ? 'identical' : 'DIFFERS'}`);
if (!EVENTS.length) console.log('note: video/src/events.ts holds no events yet; drift and dead air have nothing to measure (PASS by construction).');

// Dead air, in beats between consecutive events within each section (docs/direction.md "Pace").
const beatPos = (t) => {
  const b = T.beats;
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0]);
  for (let i = 0; i < b.length - 1; i++) if (t < b[i + 1]) return i + (t - b[i]) / (b[i + 1] - b[i]);
  return b.length - 1;
};
// direction.md: chorus, build, final: at most 2 beats; verse: at most 4. Every other section defaults to 4
// (an assumption, not a measured rule); the hard stop and the end silence are dead air by design.
const limitFor = (name) => (/^(chorus|final|build|outro)/i.test(name) ? 2 : 4);
const EXEMPT = /^(hard_stop|silence_end)/;
const beatLen = 60 / T.bpm_mean;
const violations = [];
for (const s of T.sections) {
  if (EXEMPT.test(s.name)) continue;
  const evs = EVENTS.filter((e) => e.t >= s.start && e.t < s.end).sort((a, b) => a.t - b.t);
  const pts = [{ pos: beatPos(s.start), id: '(section start)' }, ...evs.map((e) => ({ pos: beatPos(e.t), id: e.id })), { pos: beatPos(s.end), id: '(section end)' }];
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
  // One frame of tolerance absorbs rounding of both ends to whole frames.
  const bad = EVENTS.length > 0 && worst > limit + 1 / FPS / beatLen;
  if (bad) violations.push(s.name);
  console.log(`${bad ? 'FAIL' : 'ok  '} ${s.name.padEnd(26)} ${String(evs.length).padStart(3)} ev  max gap ${worst.toFixed(1).padStart(5)} beats (limit ${limit})  ${where}`);
}
for (const m of errors) console.log(`ERROR ${m}`);
console.log(`beatcheck: drift ${errors.length ? 'FAIL' : 'PASS'}, dead air ${violations.length ? `FAIL in ${violations.length} sections` : 'PASS'}`);
process.exit(errors.length ? 1 : violations.length ? 2 : 0);
