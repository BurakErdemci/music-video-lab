#!/usr/bin/env node
// Repetition check: the longest run of back-to-back identical cycles per character, bar 9 to 1:28.7.
// A "cycle" is any block of 2..24 consecutive drawings; identical = same drawings AND same hold lengths
// (strict, the director's rule: no identical cycle more than 2 times in a row). Walks are excluded (a walk
// cycle is supposed to repeat). The loose figure ignores hold lengths and only counts cycles of 3+ drawings,
// as a hint of how loop-like a stretch may still feel.
//
//   node video/scripts/repcheck.mjs [--limit 2]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { HUMAN, AI } = await import(url('video/src/scenes/acting.ts'));
const { spansOf } = await import(url('video/src/characters/actor.ts'));
const { CHECK_UNTIL_FRAME, ev } = await import(url('video/src/events.ts'));

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 2;
const FROM = ev('room.seam').frame;
/** A drawing counts as new if it was not on screen in this many frames before (6 s). */
const NOVEL = 180;
/** Longest allowed stretch of only recently seen drawings (the director: ~6 s). */
const STALE = 180;

const longest = (tokens, minL) => {
  let best = { r: 1, L: 0, i: 0 };
  for (let L = minL; L <= 24; L++) {
    for (let i = 0; i + 2 * L <= tokens.length; i++) {
      let r = 1;
      while (i + (r + 1) * L <= tokens.length) {
        let same = true;
        for (let q = 0; q < L && same; q++) same = tokens[i + q].key === tokens[i + r * L + q].key;
        if (!same) break;
        r++;
      }
      if (r > best.r) best = { r, L, i };
    }
  }
  return best;
};

let bad = 0;
for (const [name, acts] of [['human', HUMAN], ['ai', AI]]) {
  // runs of non-walk spans inside the checked window, split at every walk
  const spans = spansOf(acts).filter((s) => s.to > FROM && s.from <= CHECK_UNTIL_FRAME);
  const runs = [[]];
  for (const s of spans) {
    if (s.walk) runs.push([]);
    else runs[runs.length - 1].push(s);
  }
  let strict = { r: 1, L: 0, at: 0, desc: '' };
  let loose = { r: 1, L: 0, at: 0, desc: '' };
  for (const run of runs) {
    const t1 = run.map((s) => ({ key: `${s.strip}.${s.k + 1}${s.flip ? 'm' : ''}:${s.to - s.from}`, s }));
    const t2 = run.map((s) => ({ key: `${s.strip}.${s.k + 1}${s.flip ? 'm' : ''}`, s }));
    const a = longest(t1, 1);
    const b = longest(t2, 3);
    if (a.r > strict.r) strict = { r: a.r, L: a.L, at: t1[a.i].s.from, desc: t1.slice(a.i, a.i + a.L).map((t) => t.key).join(' ') };
    if (b.r > loose.r) loose = { r: b.r, L: b.L, at: t2[b.i].s.from, desc: t2.slice(b.i, b.i + b.L).map((t) => t.key).join(' ') };
  }
  console.log(`${name}: max identical cycles in a row (strict) = ${strict.r}${strict.L ? `  (f${strict.at}, ${strict.L} drawings: ${strict.desc})` : ''}${strict.r > LIMIT ? '  OVER LIMIT' : ''}`);
  console.log(`${name}: loose (same drawings, any timing, 3+ drawings) = ${loose.r}${loose.L ? `  (f${loose.at}: ${loose.desc})` : ''}`);
  if (strict.r > LIMIT) bad++;
  // pose-set staleness: the longest stretch in which no drawing appears that was not already on screen in the
  // NOVEL frames before it (the character only cycles through drawings we have just seen)
  const all = spansOf(acts).filter((s) => s.to > FROM && s.from <= CHECK_UNTIL_FRAME);
  const lastSeen = new Map();
  let lastNew = FROM;
  let stale = { frames: 0, from: FROM };
  for (const s of all) {
    const id = `${s.strip}.${s.k + 1}${s.flip ? 'm' : ''}`;
    const seen = lastSeen.get(id);
    if (seen === undefined || s.from - seen > NOVEL) {
      if (s.from - lastNew > stale.frames) stale = { frames: s.from - lastNew, from: lastNew };
      lastNew = s.from;
    }
    lastSeen.set(id, s.to);
  }
  const end = Math.min(CHECK_UNTIL_FRAME, all.at(-1).to);
  if (end - lastNew > stale.frames) stale = { frames: end - lastNew, from: lastNew };
  console.log(`${name}: longest stretch without a drawing unseen in the ${NOVEL / 30} s before = ${(stale.frames / 30).toFixed(1)} s (f${stale.from})${stale.frames > STALE ? '  OVER LIMIT' : ''}`);
  if (stale.frames > STALE) bad++;
}
process.exit(bad ? 1 : 0);
