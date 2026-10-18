#!/usr/bin/env node
// Tempo check (test90-v5, the director after test90-v4: "transitions look 4x fast, things teleport, 50-56 s has so
// many transitions the animation cannot keep up"). The song is melancholic: calm, unhurried acting.
//
// Per character, from bar 9 to the end of Test90 (frame 2700), every frame is either inside an ACTION (a stable
// state: the action's label, see Action.act in characters/actor.ts; in-action motion such as typing or a wave and
// breathing stay inside it) or inside a TRANSITION (a morph between two spans of different labels, or a breakdown
// drawing whose label starts with '~'). A change of label without a morph is a cut: a transition of 0 frames.
// Measured:
//   changes/10 s  - most state changes (transition starts) in any 10 s window           rule: <= 3
//   transition    - shortest transition, frames                                         rule: >= 12
//   hold          - shortest calm hold between two transitions, frames                  rule: >= 30 (1 s)
//   action        - longest single action, seconds (frames of one stable label)         rule: <= 5 s
// Timelines without labels (test90-v4) fall back to one label per drawing, so every drawing change is a state
// change; --drawings applies that fallback to a labelled timeline too (a stricter view of the same frames).
//
//   node video/scripts/tempocheck.mjs [--drawings] [--from 468] [--to 2700] [--verbose]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const ACTING = await import(url('video/src/scenes/acting.ts'));
const { HUMAN, AI } = ACTING;
// labels whose drawings may change inside one action (a continuous motion); in any other action every change of
// drawing counts as a change of state (the director: "a loop cycling 4 drawings every few frames counts as constant
// switching unless it is a deliberate continuous motion")
const CONTINUOUS = new Set(ACTING.CONTINUOUS_ACTS ?? []);
const { spansOf, tweenLength } = await import(url('video/src/characters/actor.ts'));

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? Number(process.argv[i + 1]) : def;
};
const FROM = arg('--from', 468);
const TO = arg('--to', 2700);
const DRAWINGS = process.argv.includes('--drawings');
const VERBOSE = process.argv.includes('--verbose');
const RULES = { changes: 3, transition: 12, hold: 30, action: 150 };

const labelOf = (s) => {
  if (s.walk) return 'walk';
  const d = `${s.strip}.${s.k + 1}${s.flip ? 'm' : ''}`;
  if (DRAWINGS || s.act === undefined) return d;
  if (s.act.startsWith('~') || CONTINUOUS.has(s.act)) return s.act;
  return `${s.act}:${d}`;
};

let bad = 0;
const fmt = (f) => `${(f / 30).toFixed(2)} s`;
for (const [who, acts] of [['human', HUMAN], ['ai', AI]]) {
  const spans = spansOf(acts);
  // per-frame state: a label, or 'T' (transition)
  const lab = new Array(TO - FROM).fill(null);
  for (const s of spans) for (let f = Math.max(s.from, FROM); f < Math.min(s.to, TO); f++) lab[f - FROM] = labelOf(s).startsWith('~') ? 'T' : labelOf(s);
  spans.forEach((s, i) => {
    const nx = spans[i + 1];
    if (!nx) return;
    const n = tweenLength(s, nx);
    if (!n || labelOf(s) === labelOf(nx)) return;
    const t0 = nx.from - Math.floor(n / 2);
    for (let f = t0; f < t0 + n; f++) if (f >= FROM && f < TO) lab[f - FROM] = 'T';
  });
  // runs
  const runs = [];
  for (let f = FROM; f < TO; f++) {
    const l = lab[f - FROM] ?? 'none';
    const last = runs[runs.length - 1];
    if (last && last.l === l) last.n++;
    else runs.push({ l, from: f, n: 1 });
  }
  // transitions: T runs, and direct label changes (cuts, 0 frames)
  const trans = [];
  runs.forEach((r, i) => {
    if (r.l === 'T') trans.push({ from: r.from, n: r.n, a: runs[i - 1]?.l, b: runs[i + 1]?.l });
    else if (i > 0 && runs[i - 1].l !== 'T') trans.push({ from: r.from, n: 0, a: runs[i - 1].l, b: r.l });
  });
  const actions = runs.filter((r) => r.l !== 'T' && r.l !== 'none');
  // most transition starts in a 10 s window
  let maxWin = { n: 0, at: FROM };
  for (const t of trans) {
    const n = trans.filter((u) => u.from >= t.from && u.from < t.from + 300).length;
    if (n > maxWin.n) maxWin = { n, at: t.from };
  }
  const shortT = trans.reduce((m, t) => (t.n < m.n ? t : m), { n: Infinity });
  // holds between two transitions (not the first/last run of the range)
  const inner = actions.filter((r) => r.from > FROM && r.from + r.n < TO);
  const shortH = inner.reduce((m, r) => (r.n < m.n ? r : m), { n: Infinity });
  const longA = actions.reduce((m, r) => (r.n > m.n ? r : m), { n: 0 });
  // in-action motion: drawing changes inside one label
  let inAction = 0;
  let minInner = Infinity;
  spans.forEach((s, i) => {
    const nx = spans[i + 1];
    if (!nx || s.walk || nx.walk || labelOf(s) !== labelOf(nx) || labelOf(s).startsWith('~')) return;
    if (nx.from < FROM || nx.from >= TO) return;
    inAction++;
    minInner = Math.min(minInner, tweenLength(s, nx));
  });
  const over = {
    changes: maxWin.n > RULES.changes,
    transition: shortT.n < RULES.transition,
    hold: shortH.n < RULES.hold,
    action: longA.n > RULES.action,
  };
  console.log(`${who}${DRAWINGS ? ' (one state per drawing)' : ''}: ${actions.length} actions, ${trans.length} state changes from ${fmt(FROM)} to ${fmt(TO)}`);
  console.log(`   changes per 10 s (max)   ${maxWin.n} (window from ${fmt(maxWin.at)})${over.changes ? '  OVER' : ''}`);
  console.log(`   shortest transition      ${shortT.n} frames at ${fmt(shortT.from ?? 0)} (${shortT.a} -> ${shortT.b})${over.transition ? '  UNDER' : ''}`);
  console.log(`   shortest hold            ${shortH.n} frames at ${fmt(shortH.from ?? 0)} (${shortH.l})${over.hold ? '  UNDER' : ''}`);
  console.log(`   longest action           ${(longA.n / 30).toFixed(2)} s at ${fmt(longA.from ?? 0)} (${longA.l})${over.action ? '  OVER' : ''}`);
  console.log(`   transitions: median ${[...trans].map((t) => t.n).sort((p, q) => p - q)[Math.floor(trans.length / 2)] ?? 0} frames; in-action drawing changes ${inAction}, shortest in-action morph ${minInner === Infinity ? '-' : minInner} frames`);
  if (VERBOSE) {
    for (const r of runs) console.log(`      ${fmt(r.from).padStart(8)} ${String(r.n).padStart(4)}  ${r.l}`);
  }
  bad += Object.values(over).filter(Boolean).length;
}
process.exit(bad ? 1 : 0);
