#!/usr/bin/env node
// covercheck.mjs - the cover rule (scene-map.md "Round 7d", "Covers are events, not punctuation"): from the scream
// (117.36 s) to the end of the song an opaque cover (every transition kind but the ringing 'shock', which draws two
// thin rings and spokes and no fill) fires at most once per 4 s, start to start, and is drawn on at most 6 frames;
// none plays between PUSH! and FORCE! (124.32-125.02 s), where the cuts are hard. The covers come from the film's own
// list (video/src/film/rest/RestShot.tsx restCovers and, from 140.04 s, film/finale/FinaleShot.tsx finaleCovers: the
// same specs the shots draw), so this measures what renders. Since round 9 GIT! PUSH! FORCE! (120.03-125.36 s) is its
// own family (film/push, Film.tsx): a rest cover lying wholly inside that span is never drawn and is dropped, the
// family's own covers (pushCovers) are added, and a cover both families draw a part of counts once (by id).
//   node tools/covercheck.mjs [--range 117.36-232.12] [--selftest]
// Exit 1 on any failure (the selftest must exit 1: it plants covers 2 s apart in both parts, a 15-frame cover and one at PUSH!).
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.join(ROOT, 'video');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const [A, B] = arg('range', '117.36-232.12').split('-').map(Number);
const FPS = 60;

const require = createRequire(path.join(VIDEO, 'package.json'));
const esbuild = require('esbuild');
const outDir = path.join(VIDEO, 'out', '.covercheck');
mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, 'covers.mjs');
await esbuild.build({
  stdin: { contents: "export { restCovers, COVER_GAP, COVER_FRAMES, PUSH_SPAN } from './film/rest/RestShot.tsx';\nexport { finaleCovers } from './film/finale/FinaleShot.tsx';\nexport { pushCovers, PUSH_START, PUSH_END } from './film/push/PushShot.tsx';", resolveDir: path.join(VIDEO, 'src'), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile, jsx: 'automatic', packages: 'external', logLevel: 'error',
});
process.removeAllListeners('warning');
const M = await import(pathToFileURL(outfile).href);
rmSync(outDir, { recursive: true, force: true });

/** The failures of a cover list: [{ id, kind, window: [a, b) seconds }]. */
const check = (covers, gap, maxFrames, span) => {
  const inRange = covers.filter((c) => c.window[1] > A && c.window[0] < B).sort((x, y) => x.window[0] - y.window[0]);
  const fails = [];
  // the frames a cover is drawn on: f with a <= f / 60 < b
  const frames = (c) => Math.ceil(c.window[1] * FPS - 1e-6) - Math.ceil(c.window[0] * FPS - 1e-6);
  for (const [i, c] of inRange.entries()) {
    if (frames(c) > maxFrames) fails.push(`${c.id} (${c.kind}) is drawn on ${frames(c)} frames (max ${maxFrames})`);
    const prev = inRange[i - 1];
    if (prev && c.window[0] - prev.window[0] < gap - 1e-6) fails.push(`${c.id} starts ${(c.window[0] - prev.window[0]).toFixed(2)} s after ${prev.id} (min ${gap} s)`);
    if (c.window[1] > span[0] && c.window[0] < span[1]) fails.push(`${c.id} plays inside PUSH!-FORCE! ${span[0].toFixed(2)}-${span[1].toFixed(2)} s`);
  }
  return { inRange, fails };
};

if (process.argv.includes('--selftest')) {
  const planted = [
    { id: 'a', kind: 'shatter', window: [118, 118.1] },
    { id: 'b-2s-later', kind: 'fire', window: [120, 120.1] },
    { id: 'c-15-frames', kind: 'tear', window: [130, 130.25] },
    { id: 'd-at-push', kind: 'streaks', window: [124.5, 124.6] },
    { id: 'e-finale', kind: 'tear', window: [200, 200.1] },
    { id: 'f-finale-1s-later', kind: 'glitch', window: [201, 201.1] },
  ];
  const { fails } = check(planted, M.COVER_GAP, M.COVER_FRAMES, M.PUSH_SPAN);
  for (const f of fails) console.log(`  planted: ${f}`);
  const caught = fails.length === 4;
  console.log(`covercheck selftest: ${caught ? 'caught the 4 planted defects' : `MISSED (${fails.length} of 4)`}`);
  process.exit(caught ? 1 : 0);
}

// the rest family's covers end at 140.04 s and the finale's start there; the 4 s gap runs across the seam
const notDrawn = M.restCovers().filter((c) => c.window[0] >= M.PUSH_START - 1e-6 && c.window[1] <= M.PUSH_END + 1e-6);
const restDrawn = M.restCovers().filter((c) => !notDrawn.includes(c));
const pushOwn = M.pushCovers().filter((c) => !restDrawn.some((r) => r.id === c.id));
console.log(`push family ${M.PUSH_START}-${M.PUSH_END} s: ${notDrawn.length} rest covers inside it not drawn${notDrawn.length ? ` (${notDrawn.map((c) => c.id).join(', ')})` : ''}, ${pushOwn.length} of its own added`);
const { inRange, fails } = check([...restDrawn, ...pushOwn, ...M.finaleCovers()], M.COVER_GAP, M.COVER_FRAMES, M.PUSH_SPAN);
console.log(`covercheck ${A}-${B} s: ${inRange.length} opaque covers`);
for (const c of inRange) console.log(`  ${c.window[0].toFixed(3)}-${c.window[1].toFixed(3)}  ${c.kind.padEnd(9)} ${c.id}`);
for (const f of fails) console.log(`  FAIL ${f}`);
console.log(fails.length ? `covercheck: FAIL (${fails.length})` : 'covercheck: PASS');
process.exit(fails.length ? 1 : 0);
