#!/usr/bin/env node
// Scalar (docs/scene-map.md): every beat-locked event drifts 0 frames from its measured anchor, and no
// section breaks the dead-air rule.
//
//   node tools/beatcheck.mjs [--verbose] [--range A-B]
//   node tools/beatcheck.mjs --selftest [gap|drift]
//
// Loads EVENTS from video/src/events.ts directly (node strips the types) and recomputes every expected
// time from data/take-v4/mc-timing.json, read independently of video/src/timing.ts. The scene
// clock is in seconds and the film renders at 60 fps, so drift is measured in frames at 60 fps:
//   anchor 'beat':     ref = beat index        -> beats[ref]
//   anchor 'offbeat':  ref = beat index        -> halfway between beats[ref] and beats[ref + 1]
//   anchor 'downbeat': ref = downbeat index    -> downbeats[ref]
//   anchor 'hook':     ref = accept_hooks index -> accept_hooks[ref][0]
//   anchor 'word':     ref = "<text>#<nth>"    -> start of the nth phrase match
//   anchor 'token':    ref = "<line>:<token>"  -> the token's time through the token map (video/src/lyrics/bind.ts)
// --range A-B (seconds) clips every section to [A, B) and skips sections outside it, so a film built up to
// B seconds is checked only where it exists. Without --range the whole song is checked, and a section with
// no events is dead air: an empty list FAILS (it used to pass "by construction").
// --selftest replaces EVENTS with a synthetic list on the REAL timing data (one event per intro beat):
// 'gap' removes beats 8-13 (a 6-beat hole, limit 2: dead air), 'drift' moves one event 2 frames off its beat,
// no argument does both. The selftest must exit non-zero: it proves both failure paths fire.
// Exit code: bit 1 = drift errors, bit 2 = dead air (both = 3).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const optVal = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const FPS = 60;

const TAKE = 'data/take-v4';
const rawBytes = readFileSync(path.join(ROOT, TAKE, 'mc-timing.json'));
const mapBytes = readFileSync(path.join(ROOT, TAKE, 'token_map.json'));
const mapCopy = readFileSync(path.join(ROOT, 'video/src/data/token_map.json'));
const T = JSON.parse(rawBytes.toString('utf8'));
const copyBytes = readFileSync(path.join(ROOT, 'video/src/data/mc-timing.json'));
const { EVENTS: AUTHORED } = await import(pathToFileURL(path.join(ROOT, 'video/src/events.ts')).href);
const { bindLine } = await import(pathToFileURL(path.join(ROOT, 'video/src/lyrics/bind.ts')).href);
const MAPPED = JSON.parse(mapBytes.toString('utf8'));
const LINES = T.lyric_alignment.map((l, i) => ({ ...l, tokens: MAPPED[i]?.tokens }));

const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const errors = [];
if (sha(rawBytes) !== sha(copyBytes)) errors.push(`video/src/data/mc-timing.json differs from ${TAKE}/mc-timing.json (run: npm run sync-timing in video/)`);
if (sha(mapBytes) !== sha(mapCopy)) errors.push(`video/src/data/token_map.json differs from ${TAKE}/token_map.json (run: npm run sync-timing in video/)`);

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
  if (e.anchor === 'offbeat') return (T.beats[e.ref] + T.beats[e.ref + 1]) / 2;
  if (e.anchor === 'downbeat') return T.downbeats[e.ref];
  if (e.anchor === 'hook') return T.accept_hooks[e.ref]?.[0];
  if (e.anchor === 'token') {
    const [li, ki] = String(e.ref).split(':').map(Number);
    try { return bindLine(LINES, T.words, li)[ki]?.start; } catch { return undefined; }
  }
  if (e.anchor === 'word') {
    const [text, nth] = String(e.ref).split('#');
    return wordStart(text, Number(nth ?? 0));
  }
  return undefined;
};

// the first intro section of the take (take-v4: intro_robot)
const intro = T.sections.find((s) => /^intro/.test(s.name));
const selftest = argv.includes('--selftest');
const mode = selftest ? (['gap', 'drift'].includes(optVal('--selftest')) ? optVal('--selftest') : 'both') : null;
const synthetic = () => {
  let evs = T.beats.map((b, i) => ({ id: `st-beat-${i}`, anchor: 'beat', ref: i, t: b })).filter((e) => e.t >= intro.start && e.t < intro.end);
  if (mode !== 'drift') evs = evs.filter((e) => e.ref < 8 || e.ref > 13);
  if (mode !== 'gap') evs[3] = { ...evs[3], id: 'st-drifted', t: evs[3].t + 2 / FPS };
  return evs;
};
const EVENTS = selftest ? synthetic() : AUTHORED;
let range = selftest ? [0, intro.end] : [0, Infinity];
if (optVal('--range')) {
  const [a, b] = optVal('--range').split('-').map(Number);
  if (!(b > a)) throw new Error(`bad --range ${optVal('--range')}`);
  range = [a, b];
}
if (selftest) console.log(`SELFTEST (${mode}): ${EVENTS.length} synthetic events on the real timing data; this run MUST fail.`);

let maxDrift = 0;
const ids = new Set();
for (const e of EVENTS) {
  if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`);
  ids.add(e.id);
  if (!['beat', 'offbeat', 'downbeat', 'hook', 'word', 'token'].includes(e.anchor)) {
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
  if (verbose) console.log(`${drift ? 'DRIFT' : 'ok   '} ${e.id.padEnd(22)} ${e.anchor.padEnd(8)} ${String(e.ref).padEnd(18)} f${String(Math.round(e.t * FPS)).padStart(6)} (${t.toFixed(3)} s)`);
}
console.log(`beatcheck drift @ ${FPS} fps: ${EVENTS.length} events, max drift = ${maxDrift} frames, timing copy ${sha(rawBytes) === sha(copyBytes) ? 'identical' : 'DIFFERS'}`);

// Dead air, in beats between consecutive events within each section (docs/direction.md "Pace").
const beatPos = (t) => {
  const b = T.beats;
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0]);
  for (let i = 0; i < b.length - 1; i++) if (t < b[i + 1]) return i + (t - b[i]) / (b[i + 1] - b[i]);
  return b.length - 1;
};
// direction.md: chorus, build, final, outro, and the intro (an event-less opening was rejected): at most
// 2 beats; verse: at most 4. Every other section (prechorus, postchorus, breakdown, solo, piano, tail)
// defaults to 4, an assumption, not a measured rule. The hard stop and the end silence are dead by design.
const limitFor = (name) => (/^(chorus|final|build|outro|intro)/i.test(name) ? 2 : 4);
const EXEMPT = /^(hard_stop|silence_end)/;
// One 60 fps frame expressed in beats where the gap ends: the local beat length, not the mean BPM (take-v1's
// intro runs at 156 BPM inside a 180 BPM song).
const beatLenAt = (t) => {
  const b = T.beats;
  const i = Math.max(0, Math.min(b.length - 2, b.findIndex((x, k) => t < (b[k + 1] ?? Infinity))));
  return b[i + 1] - b[i];
};
const violations = [];
for (const s0 of T.sections) {
  if (EXEMPT.test(s0.name)) continue;
  const s = { name: s0.name, start: Math.max(s0.start, range[0]), end: Math.min(s0.end, range[1]) };
  if (s.end <= s.start) continue;
  const clipped = s.start !== s0.start || s.end !== s0.end;
  const evs = EVENTS.filter((e) => e.t >= s.start && e.t < s.end).sort((a, b) => a.t - b.t);
  const endId = s.end < s0.end ? '(range end)' : '(section end)';
  const pts = [{ pos: beatPos(s.start), id: '(section start)' }, ...evs.map((e) => ({ pos: beatPos(e.t), id: e.id })), { pos: beatPos(s.end), id: endId }];
  let worst = 0;
  let worstEnd = s.end;
  let where = '';
  for (let k = 1; k < pts.length; k++) {
    const gap = pts[k].pos - pts[k - 1].pos;
    if (gap > worst) {
      worst = gap;
      worstEnd = k < pts.length - 1 ? evs[k - 1]?.t ?? s.end : s.end;
      where = `${pts[k - 1].id} -> ${pts[k].id}`;
    }
  }
  const limit = limitFor(s.name);
  // One frame of tolerance absorbs rounding of both ends to whole frames.
  const bad = worst > limit + 1 / FPS / beatLenAt(worstEnd);
  if (bad) violations.push(s.name);
  console.log(`${bad ? 'FAIL' : 'ok  '} ${(s.name + (clipped ? '*' : '')).padEnd(26)} ${String(evs.length).padStart(3)} ev  max gap ${worst.toFixed(1).padStart(5)} beats (limit ${limit})  ${where}`);
}
if (range[0] > 0 || range[1] !== Infinity) console.log(`* clipped to the range ${range[0]}-${range[1]} s`);
for (const m of errors) console.log(`ERROR ${m}`);
console.log(`beatcheck: drift ${errors.length ? 'FAIL' : 'PASS'}, dead air ${violations.length ? `FAIL in ${violations.length} sections` : 'PASS'}`);
process.exit((errors.length ? 1 : 0) | (violations.length ? 2 : 0));
