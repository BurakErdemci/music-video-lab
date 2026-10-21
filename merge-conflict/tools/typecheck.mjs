#!/usr/bin/env node
// typecheck.mjs - the type rule (scene-map.md "Type is the star again"):
//  1. no sung line is drawn with the plain Lyric component: any `<Lyric` in video/src/film/ fails;
//  2. every tokened line sung inside the range is covered, token by token, by entries of the film's type plan
//     (video/src/film/typeplan.ts) with a designed form;
//  3. at least 6 distinct forms in every 30 s window (sliding by 1 s) of the range;
//  4. never the same form twice in a row.
// Prints the line -> form table.   node tools/typecheck.mjs [--range 0-64.15]   Exit 1 on any failure.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const [A, B] = arg('range', '0-64.15').split('-').map(Number);
const { TYPE_PLAN } = await import(pathToFileURL(path.join(ROOT, 'video/src/film/typeplan.ts')).href);
const { EVENTS } = await import(pathToFileURL(path.join(ROOT, 'video/src/events.ts')).href);
const T = await import(pathToFileURL(path.join(ROOT, 'video/src/timing.ts')).href);
const errors = [];

// 1. the plain Lyric component in the film's shots
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk(path.join(ROOT, 'video/src/film')).filter((p) => p.endsWith('.tsx'))) {
  readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/<Lyric[\s>]/.test(l)) errors.push(`plain Lyric at ${path.relative(ROOT, f)}:${i + 1}`); });
}

// 2. token coverage of every line sung in the range
const tokTime = (l, k) => EVENTS.find((e) => e.id === `tok-${l}-${k}`)?.t;
const rows = [];
T.lines.forEach((line, l) => {
  const n = line.text.split(/\s+/).filter(Boolean).length;
  const t0 = tokTime(l, 0);
  if (t0 === undefined || t0 < A || t0 >= B) return;
  const entries = TYPE_PLAN.filter((e) => e.line === l);
  for (let k = 0; k < n; k++) if (!entries.some((e) => k >= e.range[0] && k < e.range[1])) errors.push(`line ${l} token ${k} ("${line.text.split(/\s+/)[k]}") has no designed form`);
  rows.push({ l, t0, text: line.text, forms: entries.map((e) => `${e.form}[${e.range[0]}-${e.range[1]}]`).join(' + ') || '(none)' });
});

// 3. distinct forms per 30 s, 4. no form twice in a row
const plan = TYPE_PLAN.filter((e) => e.t1 > A && e.t0 < B).sort((a, b) => a.t0 - b.t0);
let minForms = Infinity, minAt = A;
for (let w = A; w + 30 <= B + 1e-6 || w === A; w += 1) {
  const set = new Set(plan.filter((e) => e.t0 < w + 30 && e.t1 > w).map((e) => e.form));
  if (set.size < minForms) { minForms = set.size; minAt = w; }
  if (w + 30 > B) break;
}
if (minForms < 6) errors.push(`only ${minForms} distinct forms in the 30 s from ${minAt.toFixed(1)} s (need 6)`);
for (let i = 1; i < plan.length; i++) if (plan[i].form === plan[i - 1].form) errors.push(`${plan[i - 1].id} and ${plan[i].id} both use ${plan[i].form} back to back`);

console.log(`typecheck ${A}-${B} s: ${rows.length} sung lines, ${plan.length} form entries, ${new Set(plan.map((e) => e.form)).size} distinct forms, min ${minForms === Infinity ? 0 : minForms} per 30 s`);
for (const r of rows) console.log(`  ${String(r.l).padStart(2)}  ${r.t0.toFixed(2).padStart(6)}  ${r.text.slice(0, 44).padEnd(44)}  ${r.forms}`);
for (const e of errors) console.log(`FAIL ${e}`);
console.log(errors.length ? `typecheck: FAIL (${errors.length})` : 'typecheck: PASS');
process.exit(errors.length ? 1 : 0);
