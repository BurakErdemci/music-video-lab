#!/usr/bin/env node
// Lists every drawing change of the two characters' timelines that gets a morph, with what make-tweens.py needs
// to render it, into video/out/tween-pairs.json.
//
//   node video/scripts/tween-pairs.mjs && python video/scripts/make-tweens.py
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { HUMAN, AI } = await import(url('video/src/scenes/acting.ts'));
const { neededPairs, STRIP_TABLE, frameScale } = await import(url('video/src/characters/actor.ts'));
const { DESK_X } = await import(url('video/src/scenes/acting.ts'));
const { CHAIR_SHIFT, DESK_SPLIT, DESK_SX } = await import(url('video/src/world/deskGeom.ts'));

// A morph between a desk drawing and one without the desk: the side without it is rendered over the desk prop
// (placed as world/Desk.tsx places it), so the furniture stays put instead of melting away.
const deskM = STRIP_TABLE.DESK;
const deskF = deskM.frames[0];
const PROP = { file: `video/public/${deskM.dir}/${deskF.file}`, scale: frameScale(deskM, deskF), ax: deskF.ax, x: DESK_X, split: DESK_SPLIT, chairShift: CHAIR_SHIFT, sx: DESK_SX };

const draw = (s) => {
  const m = STRIP_TABLE[s.strip];
  const f = m.frames[s.k];
  const d = { file: `video/public/${m.dir}/${f.file}`, scale: frameScale(m, f), ax: f.ax, flip: s.flip, x: s.x, who: m.who };
  if (f.slit) d.slit = f.slit; // the AI's head is carried whole in the morph (make-tweens.py head_piece)
  return d;
};
const out = new Map();
const isDesk = (s) => STRIP_TABLE[s.strip].desk === true;
for (const acts of [HUMAN, AI]) {
  for (const p of neededPairs(acts)) {
    if (out.has(p.key)) continue;
    const a = draw(p.a);
    const b = draw(p.b);
    const pair = { key: p.key, a, b, d: Math.round(p.b.x - p.a.x) };
    // inside a walk (test90-v5): the next drawing is aligned onto this one and the morph slides the rest of the way,
    // so the body glides between the planted-foot places instead of melting across a quarter step
    if (isDesk(p.a) !== isDesk(p.b)) {
      (isDesk(p.a) ? b : a).prop = PROP;
      pair.fixed = true; // the furniture fixes the offset: no best-overlap realignment
    }
    out.set(p.key, pair);
  }
}
fs.mkdirSync(path.join(ROOT, 'video/out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'video/out/tween-pairs.json'), JSON.stringify([...out.values()], null, 1));
console.log(`tween-pairs: ${out.size} morphs`);
