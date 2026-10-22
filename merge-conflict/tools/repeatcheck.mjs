#!/usr/bin/env node
// repeatcheck.mjs - no scene comes round again the same way in the last section (round 11, Burak via Gemini: the
// rocket ride and the tunnel float came back with the same look). Over the finale's shot table (140.04-232.12 s,
// video/src/film/finale/plan.ts FSHOTS) every (scene, camera variant, move) appears once; a painting appears once
// (a painting cannot be reframed: it covers the frame, scene-map round 10). The chorus's "Merge conflict" motif (the
// logo scene) repeats its move by design and is not counted.
//   node tools/repeatcheck.mjs
//   node tools/repeatcheck.mjs --selftest   (must exit 1: a clean table passes, a repeated pair and a reused painting fail)
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.join(ROOT, 'video');
export const MOTIF = ['logo'];

/** The repeats in a shot table: [{key, ids}] for every key used more than once. */
export const repeats = (shots) => {
  const seen = new Map();
  for (const s of shots) {
    if (MOTIF.includes(s.scene)) continue;
    const key = s.scene === 'panel' ? `painting ${s.panel}` : `${s.scene} ${s.cam} ${s.move}`;
    seen.set(key, [...(seen.get(key) ?? []), s.id]);
  }
  return [...seen].filter(([, ids]) => ids.length > 1).map(([key, ids]) => ({ key, ids }));
};

if (process.argv.includes('--selftest')) {
  const clean = [{ id: 'a', scene: 'tunnel', cam: 'hero', move: 'push' }, { id: 'b', scene: 'tunnel', cam: 'close', move: 'push' }, { id: 'c', scene: 'panel', panel: 'RK8' }, { id: 'm1', scene: 'logo', cam: 'hero', move: 'push' }, { id: 'm2', scene: 'logo', cam: 'hero', move: 'push' }];
  const bad = [...clean, { id: 'd', scene: 'tunnel', cam: 'hero', move: 'push' }, { id: 'e', scene: 'panel', panel: 'RK8' }];
  const a = repeats(clean);
  const b = repeats(bad);
  console.log(`selftest: clean -> ${a.map((r) => r.key).join('; ') || 'passes'}; repeated -> ${b.map((r) => `${r.key} (${r.ids.join(', ')})`).join('; ') || 'PASSES (wrong)'}`);
  process.exit(a.length === 0 && b.length === 2 ? 1 : 0);
}

const require = createRequire(path.join(VIDEO, 'package.json'));
const esbuild = require('esbuild');
const outDir = path.join(VIDEO, 'out', '.repeatcheck');
mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, 'plan.mjs');
await esbuild.build({
  stdin: { contents: "export { FSHOTS } from './film/finale/plan.ts';", resolveDir: path.join(VIDEO, 'src'), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile, jsx: 'automatic', packages: 'external', logLevel: 'error',
});
const { FSHOTS } = await import(pathToFileURL(outfile).href);
rmSync(outDir, { recursive: true, force: true });
const found = repeats(FSHOTS);
console.log(`repeatcheck: ${FSHOTS.length} finale shots`);
for (const r of found) console.log(`FAIL ${r.key}: ${r.ids.map((id) => `${id} (${FSHOTS.find((s) => s.id === id).t.toFixed(2)} s)`).join(', ')}`);
console.log(found.length ? `repeatcheck: FAIL (${found.length})` : 'repeatcheck: PASS');
process.exit(found.length ? 1 : 0);
