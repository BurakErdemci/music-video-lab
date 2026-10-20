#!/usr/bin/env node
// Cuts the drawn sheets (tools/rig/cut_drawn.py), then refits the sword so its tip touches the floor in `base` and cuts again.
//   node tools/rig/build-drawn.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cut = (scale) => {
  const args = ['run', '--with', 'pillow', '--with', 'numpy', 'python', path.join(ROOT, 'tools/rig/cut_drawn.py'), ...(scale ? ['--sword-scale', String(scale)] : [])];
  const r = spawnSync('uv', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  console.log(r.stdout.trim());
  return /sword scale ([\d.]+), blade below grip ([\d.]+)/.exec(r.stdout);
};
const first = cut(0.685);
const s0 = Number(first[1]);
const blade0 = Number(first[2]);
// fresh module graph for the measurement: the drawn JSON was just rewritten
const load = async (f) => import(pathToFileURL(path.join(ROOT, 'video/src/rig', f)).href + `?t=${Date.now()}`);
const { RIG_DRAWN, RIG_JSON } = await load('model.ts');
const { swordInHand } = await load('timeline.ts');
const grip = swordInHand(RIG_DRAWN, RIG_JSON.poses.base);
const scale = (s0 * grip.y) / blade0;
console.log(`base grip height ${grip.y.toFixed(4)} H, blade ${blade0} H -> sword scale ${scale.toFixed(4)}`);
cut(scale);
