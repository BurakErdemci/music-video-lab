#!/usr/bin/env node
// Frame purity (docs/scene-map.md): nothing in video/src may read wall-clock time, randomness or timers.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'video', 'src');
const BANNED = /Math\.random|Date\.now|useFrame|requestAnimationFrame|setTimeout|setInterval/;

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });

let hits = 0;
for (const file of walk(SRC)) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (BANNED.test(line)) {
      hits++;
      console.log(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`);
    }
  });
}
console.log(hits ? `purity: ${hits} violation(s)` : 'purity: ok');
process.exit(hits ? 1 : 0);
