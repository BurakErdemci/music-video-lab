#!/usr/bin/env node
// Caption check (test2-v1 f1150: "yine de buradayiz" and "her sabah baştan, bir daha" overprinted at the bottom for
// 8 frames). Every frame at most one lyric line per row: lines on the same side, or two seam lines, may not be on
// screen at once. A line is on screen from its show frame until end + LYRIC_FRAMES (type/LyricLine.tsx).
// Lines that start before --from are reported but only lines from --from count towards the exit code.
//
//   node video/scripts/captioncheck.mjs [--from 2661] [--to 3894]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { LYRICS, sameRow } = await import(url('video/src/type/lyricLayout.ts'));
const { LYRIC_FRAMES } = await import(url('video/src/motion/entrances.ts'));
const arg = (n, d) => (process.argv.includes(n) ? Number(process.argv[process.argv.indexOf(n) + 1]) : d);
const FROM = arg('--from', 2661);
const TO = arg('--to', 3894);

let bad = 0;
let pairs = 0;
const win = (l) => [l.show, l.end + LYRIC_FRAMES];
for (let i = 0; i < LYRICS.length; i++)
  for (let j = i + 1; j < LYRICS.length; j++) {
    const a = LYRICS[i];
    const b = LYRICS[j];
    if (!sameRow(a.side, b.side)) continue;
    const [a0, a1] = win(a);
    const [b0, b1] = win(b);
    const lo = Math.max(a0, b0);
    const hi = Math.min(a1, b1);
    const inRange = Math.max(a0, b0) >= FROM && Math.min(a0, b0) < TO;
    const nextOnRow = !LYRICS.some((c) => c !== a && c !== b && sameRow(a.side, c.side) && c.show > a.show && c.show < b.show);
    if (inRange && nextOnRow && b.show >= a.show) pairs++;
    if (hi > lo) {
      const counts = inRange;
      if (counts) bad++;
      console.log(`${counts ? 'OVERLAP' : 'old    '} line ${a.n} (${a.side}, ${a0}-${a1}) and line ${b.n} (${b.side}, ${b0}-${b1}): ${hi - lo} frames together at ${lo}`);
    }
  }
console.log(`captioncheck: ${pairs} caption hand-overs from f${FROM} to f${TO}, ${bad} overlapping`);
process.exit(bad ? 1 : 0);
