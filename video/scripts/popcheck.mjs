#!/usr/bin/env node
// Pop check: every event marked visible must take at least MIN_FRAMES frames to come in,
// unless it is a stamp word (the hard hit is the one intentional pop).
//
//   node video/scripts/popcheck.mjs
//
// Scenes read their durations from ev(id).enter.frames, so this table is what the render uses.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIN_FRAMES = 8;
const { EVENTS } = await import(pathToFileURL(path.join(ROOT, 'video/src/events.ts')).href);

const errors = [];
const table = new Map();
for (const e of EVENTS) {
  if (!e.visible) continue;
  if (!e.enter || !Number.isInteger(e.enter.frames)) {
    errors.push(`${e.id}: no integer enter.frames`);
    continue;
  }
  const key = `${e.kind}/${e.enter.type}`;
  const row = table.get(key) ?? { n: 0, min: Infinity, max: 0 };
  row.n++;
  row.min = Math.min(row.min, e.enter.frames);
  row.max = Math.max(row.max, e.enter.frames);
  table.set(key, row);
  if (e.kind !== 'stamp' && e.enter.frames < MIN_FRAMES) errors.push(`${e.id}: ${e.kind} enters in ${e.enter.frames} frames (< ${MIN_FRAMES})`);
  if (e.kind === 'stamp' && e.enter.type !== 'stamp') errors.push(`${e.id}: stamp event must have the stamp entrance`);
  if (e.kind !== 'stamp' && e.enter.type === 'stamp') errors.push(`${e.id}: only stamp events may hard-hit`);
}
console.log('kind/entrance'.padEnd(18), 'events', 'frames (min..max)');
for (const [k, r] of [...table].sort()) console.log(k.padEnd(18), String(r.n).padStart(6), ` ${r.min}..${r.max}`);
const visible = EVENTS.filter((e) => e.visible).length;
for (const e of errors) console.error('POP', e);
console.log(`popcheck: ${visible} visible events, ${errors.length} pops`);
process.exit(errors.length ? 1 : 0);
