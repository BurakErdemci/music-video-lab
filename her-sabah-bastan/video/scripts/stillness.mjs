#!/usr/bin/env node
// Stillness check: for each character, the longest run of consecutive frames in which the same key-pose image is
// on screen AND the figure does not translate (breathing and weight shift do not count as movement), from bar 9
// to 1:28.7. Target: <= ~2 bars (~110 frames).
//
//   node video/scripts/stillness.mjs [--limit 110]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { HUMAN, AI } = await import(url('video/src/scenes/acting.ts'));
const { resolveActor, stateKey, STRIP_TABLE } = await import(url('video/src/characters/actor.ts'));
const { CHECK_UNTIL_FRAME, ev } = await import(url('video/src/events.ts'));

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 110;
const FROM = ev('room.seam').frame;
const TO = CHECK_UNTIL_FRAME;

let bad = 0;
for (const [name, acts] of [['human', HUMAN], ['ai', AI]]) {
  const runs = [];
  let last = null;
  let start = FROM;
  for (let f = FROM; f <= TO; f++) {
    const key = stateKey(resolveActor(acts, f));
    if (key !== last) {
      if (last !== null) runs.push({ key: last, from: start, frames: f - start });
      last = key;
      start = f;
    }
  }
  runs.push({ key: last, from: start, frames: TO + 1 - start });
  runs.sort((a, b) => b.frames - a.frames);
  const strips = new Set(acts.map((a) => a.strip));
  for (const s of strips) if (!STRIP_TABLE[s]) throw new Error(`unknown strip ${s}`);
  console.log(`${name}: ${acts.length} actions, ${strips.size} strips (${[...strips].join(' ')}); first action at f${acts[0].from}`);
  for (const r of runs.slice(0, 4)) console.log(`   still ${String(r.frames).padStart(3)} frames from f${r.from}  ${r.key}`);
  const max = runs[0].frames;
  console.log(`${name}: max still run = ${max} frames (${(max / 56).toFixed(2)} bars)${max > LIMIT ? '  OVER LIMIT' : ''}`);
  if (max > LIMIT) bad++;
}
process.exit(bad ? 1 : 0);
