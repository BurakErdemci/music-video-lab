#!/usr/bin/env node
// Tests of the song-independent timing pieces, run against a take other than the film's (default take-v1):
//   1. the beat grid is read locally (video/src/timing/grid.ts): the bar holding 60 s is 1.333 +- 0.01 s and
//      its beat 0.333 +- 0.005 s in take-v1 (180 BPM), although take-v1's first beats were fitted at 156 BPM;
//      the median beat matches the song tempo; positions and times invert.
//   2. the lyric binding (video/src/lyrics/bind.ts) with the take's token map (data/<take>/token_map.json):
//      every sung line binds, every token's time is a measured word's time, null tokens share a neighbour's
//      time, a line with no mapped token throws, and without the map the mismatched lines throw.
//
//   node tools/gridcheck.mjs [take-v1]
// Exit 1 on any failed assertion.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const take = process.argv[2] ?? 'take-v1';
const T = JSON.parse(readFileSync(path.join(ROOT, 'data', take, 'mc-timing.json'), 'utf8'));
const MAP = JSON.parse(readFileSync(path.join(ROOT, 'data', take, 'token_map.json'), 'utf8'));
const grid = await import(pathToFileURL(path.join(ROOT, 'video/src/timing/grid.ts')).href);
const bind = await import(pathToFileURL(path.join(ROOT, 'video/src/lyrics/bind.ts')).href);

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- 1. grid ------------------------------------------------------------------------------------------
const bar60 = grid.gridLenAt(T.downbeats, 60);
const beat60 = grid.gridLenAt(T.beats, 60);
const medBeat = grid.medianStep(T.beats);
const songBeat = 60 / T.bpm_mean;       // a song-independent expectation: the local beat is within 1 % of the song tempo (take-v1 and take-v4 are both ~180 BPM)
check('bar length at 60 s is 4 beats of the song tempo +- 0.01 s', near(bar60, 4 * songBeat, 0.01), `${bar60.toFixed(4)} s`);
check('beat length at 60 s matches the song tempo +- 0.005 s', near(beat60, songBeat, 0.005), `${beat60.toFixed(4)} s`);
check('median beat matches the song tempo (60 / bpm_mean +- 2 ms)', near(medBeat, 60 / T.bpm_mean, 0.002), `${medBeat.toFixed(4)} s vs ${(60 / T.bpm_mean).toFixed(4)} s`);
const first = T.beats[1] - T.beats[0];
if (take === 'take-v1') check('the first beat interval is NOT what the grid uses at 60 s (the old bug)', !near(first, beat60, 0.01), `first ${first.toFixed(4)} s`);
const odd = T.downbeats.slice(1).map((d, i) => d - T.downbeats[i]).findIndex((l) => l > 1.6);
if (odd >= 0) check('a 5-beat bar is measured as its own length', near(grid.gridLenAt(T.downbeats, T.downbeats[odd] + 0.1), T.downbeats[odd + 1] - T.downbeats[odd], 1e-9));
let inv = 0;
for (let t = 0.5; t < T.duration; t += 3.7) inv = Math.max(inv, Math.abs(grid.gridTime(T.beats, grid.gridPos(T.beats, t)) - t));
check('gridTime inverts gridPos', inv < 1e-9, `max error ${inv.toExponential(1)} s`);

// ---- 2. lyric binding -----------------------------------------------------------------------------------
const lines = T.lyric_alignment.map((l, i) => ({ ...l, tokens: MAP[i].tokens }));
const measured = new Set(T.words.flatMap((w) => [w.s, w.e]));
let bound = 0, allMeasured = true, nullsShare = true, monotone = true;
lines.forEach((l, i) => {
  if (l.start === null) return;
  const toks = bind.bindLine(lines, T.words, i);
  bound++;
  toks.forEach((tk, k) => {
    if (!measured.has(tk.start) || !measured.has(tk.end)) allMeasured = false;
    if (tk.word === null) {
      const prev = toks.slice(0, k).reverse().find((x) => x.word !== null) ?? toks.slice(k).find((x) => x.word !== null);
      if (!prev || prev.start !== tk.start) nullsShare = false;
    }
    if (k && tk.start < toks[k - 1].start) monotone = false;
  });
});
const sung = lines.filter((l) => l.start !== null).length;
check(`every sung line binds with the token map (${bound} of ${sung})`, bound === sung);
check('every token time is a measured word time', allMeasured);
check('a null token shares the time of its neighbouring mapped token', nullsShare);
check('token times never go backwards in a line', monotone);
// a line whose tokens share one measured word ("Three hundred" sung as "300"), and a line that starts with a null token ("Commit" not heard)
const shared = MAP.findIndex((m, i) => lines[i].start !== null && m.tokens.some((t, k) => k && t.word !== null && t.word === m.tokens[k - 1].word));
if (shared >= 0) {
  const tk = bind.bindLine(lines, T.words, shared);
  const k = MAP[shared].tokens.findIndex((t, j) => j && t.word !== null && t.word === MAP[shared].tokens[j - 1].word);
  check('tokens pointing at one measured word share its time', tk[k].start === tk[k - 1].start && tk[k].end === tk[k - 1].end, `line ${shared}: "${tk[k - 1].text} ${tk[k].text}"`);
}
const nullFirst = MAP.findIndex((m, i) => lines[i].start !== null && m.tokens[0].word === null && m.tokens.some((t) => t.word !== null));
if (nullFirst >= 0) {
  const tk = bind.bindLine(lines, T.words, nullFirst);
  const j = MAP[nullFirst].tokens.findIndex((t) => t.word !== null);
  check('a null first token takes the next mapped token time', tk[0].start === tk[j].start, `line ${nullFirst}: "${tk[0].text}"`);
}
let threw = false;
try {
  bind.bindLine([{ text: 'nothing here', start: null, end: null, tokens: [{ text: 'nothing', word: null }, { text: 'here', word: null }] }], T.words, 0);
} catch { threw = true; }
check('a line with no mapped token throws', threw);
const raw = T.lyric_alignment.map((l) => ({ ...l, tokens: undefined }));
let strictFail = 0;
raw.forEach((l, i) => {
  if (l.start === null) return;
  try { bind.bindLine(raw, T.words, i); } catch { strictFail++; }
});
check('without the map, the mismatched lines throw (no guessing)', strictFail > 0, `${strictFail} lines throw`);

console.log(`gridcheck ${take}: ${fails ? `${fails} FAILED` : 'all passed'}`);
process.exit(fails ? 1 : 0);
