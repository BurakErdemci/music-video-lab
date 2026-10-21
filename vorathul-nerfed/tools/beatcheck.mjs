#!/usr/bin/env node
// Scalar (README): every beat-locked event drifts 0 frames from its measured anchor, and no section
// breaks the dead-air rule from docs/scene-map.md.
//
//   node tools/beatcheck.mjs [--verbose] [--fps 60]
//
// --fps N checks the film as rendered by a composition at N fps on the 30 fps scene clock (Nerfed60): an event
// authored on scene frame e.frame shows on output frame e.frame * N / 30, i.e. at the same wall-clock time as in
// Nerfed. Drift is then measured in output frames against round(t * N); the scene clock's 30 fps rounding can
// put an event up to (N / 30 - 1) output frames off the nearest N fps frame, and that much is allowed.
//
// Loads video/src/events.ts directly (node strips the types) and recomputes every expected frame
// from data/timing.json, read independently of video/src/timing.ts:
//   anchor 'beat': ref = beat index          -> round(beats[ref] * 30)
//   anchor 'hit':  ref = hit index           -> round(hits[ref].t * 30)
//   anchor 'word': ref = "<text>#<nth>"      -> round(start of the nth phrase match * 30)
// Drift errors fail the run (exit 1). Dead air is reported per section and also fails the run.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');
const FPS = 30;
const fpsArg = process.argv.indexOf('--fps');
const OUT_FPS = fpsArg === -1 ? FPS : Number(process.argv[fpsArg + 1]);
if (!(OUT_FPS >= FPS) || OUT_FPS % FPS) throw new Error(`--fps must be a multiple of ${FPS}, got ${process.argv[fpsArg + 1]}`);
const SCALE = OUT_FPS / FPS;
const TOL = SCALE - 1;

const rawBytes = readFileSync(path.join(ROOT, 'data/timing.json'));
const T = JSON.parse(rawBytes.toString('utf8'));
const copyBytes = readFileSync(path.join(ROOT, 'video/src/data/timing.json'));
const { EVENTS } = await import(pathToFileURL(path.join(ROOT, 'video/src/events.ts')).href);

const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const errors = [];
if (sha(rawBytes) !== sha(copyBytes)) errors.push('video/src/data/timing.json differs from data/timing.json (run: npm run sync-timing in video/)');

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const wordStart = (text, nth) => {
  const target = text.split(/\s+/).map(norm).filter(Boolean);
  const ws = T.words.map((x) => norm(x.w));
  let seen = 0;
  for (let i = 0; i + target.length <= ws.length; i++) {
    if (target.every((tok, k) => ws[i + k] === tok) && seen++ === nth) return T.words[i].start;
  }
  return undefined;
};
const anchorTime = (e) => {
  if (e.anchor === 'beat') return T.beats[e.ref];
  if (e.anchor === 'hit') return T.hits[e.ref]?.t;
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
  if (!['beat', 'hit', 'word'].includes(e.anchor)) {
    errors.push(`${e.id}: unknown anchor ${e.anchor}`);
    continue;
  }
  const t = anchorTime(e);
  if (t === undefined) {
    errors.push(`${e.id}: anchor ${e.anchor} ref ${e.ref} not found in timing.json`);
    continue;
  }
  const expected = Math.round(t * OUT_FPS);
  const shown = e.frame * SCALE;
  const drift = Math.abs(shown - expected);
  maxDrift = Math.max(maxDrift, drift);
  if (!Number.isInteger(e.frame)) errors.push(`${e.id}: frame ${e.frame} is not an integer`);
  if (drift > TOL) errors.push(`${e.id}: frame ${shown} expected ${expected} (drift ${drift})`);
  if (verbose) console.log(`${drift > TOL ? 'DRIFT' : 'ok   '} ${e.id.padEnd(20)} ${e.anchor.padEnd(5)} ${String(e.ref).padEnd(18)} f${String(shown).padStart(5)} (${t.toFixed(3)} s)`);
}
console.log(`beatcheck drift @ ${OUT_FPS} fps: ${EVENTS.length} events, max drift = ${maxDrift} frames (allowed ${TOL}), timing copy ${sha(rawBytes) === sha(copyBytes) ? 'identical' : 'DIFFERS'}`);

// Dead air, in beats between consecutive events within each section (docs/scene-map.md "Rules for every lane").
const beatPos = (t) => {
  const b = T.beats;
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0]);
  for (let i = 0; i < b.length - 1; i++) if (t < b[i + 1]) return i + (t - b[i]) / (b[i + 1] - b[i]);
  return b.length - 1;
};
// Interludes may hold up to 8 beats by design; the base limit of 4 is checked and 8 is the hard ceiling.
const limitFor = (name) => (/^(intro|chorus|final chorus|build|outro)/i.test(name) ? 2 : 4);
const violations = [];
for (const s of T.sections) {
  const evs = EVENTS.filter((e) => e.frame / FPS >= s.start && e.frame / FPS < s.end).sort((a, b) => a.frame - b.frame);
  const pts = [{ pos: beatPos(s.start), id: '(section start)' }, ...evs.map((e) => ({ pos: beatPos(e.frame / FPS), id: e.id })), { pos: beatPos(s.end), id: '(section end)' }];
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
  // Events sit on whole frames, so a gap of exactly 2 beats measures 2.03-2.07 beats once both ends
  // are rounded (storyboard 01 measurement). One frame of tolerance absorbs that rounding only.
  const bad = worst > limit + 1 / FPS / T.beat_period;
  if (bad) violations.push(s.name);
  console.log(`${bad ? 'FAIL' : 'ok  '} ${s.name.padEnd(15)} ${String(evs.length).padStart(3)} ev  max gap ${worst.toFixed(1).padStart(5)} beats (limit ${limit})  ${where}`);
}
for (const m of errors) console.log(`ERROR ${m}`);
console.log(`beatcheck: drift ${errors.length ? 'FAIL' : 'PASS'}, dead air ${violations.length ? `FAIL in ${violations.length}/${T.sections.length} sections` : 'PASS'}`);
// Drift is the gate that must hold now; dead-air failures are expected until the scenes are built.
process.exit(errors.length ? 1 : violations.length ? 2 : 0);
