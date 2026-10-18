#!/usr/bin/env node
// Walk check: speed, stride time and foot slip of every walk in the acting timeline.
// Foot slip per frame = how far the floor contact that moved least travelled since the previous frame
// (a planted foot would be 0). Contacts are the opaque runs on the bottom rows of each drawing
// (make-strips.py `ground`), measured at the toe end.
//
//   node video/scripts/walkcheck.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { HUMAN, AI } = await import(url('video/src/scenes/acting.ts'));
const { STRIP_TABLE, frameScale, FACING, WALK_STEP_FRAMES } = await import(url('video/src/characters/actor.ts'));

const contactsAt = (strip, k, x, flip) => {
  const m = STRIP_TABLE[strip];
  const f = m.frames[k - 1];
  const s = frameScale(m, f);
  const facing = FACING[strip] * (flip ? -1 : 1);
  return (f.ground ?? []).map(([a, b]) => {
    // the toe end in the drawing's own facing (mirroring moves it, it stays the toe): a planted foot keeps its toe
    // still while the heel lifts, so the heel end (used here before test90-v4 for mirrored walks) is not a fixed point
    const toe = FACING[strip] > 0 ? b : a;
    return x + (toe - f.ax) * s * (flip ? -1 : 1) * (facing === facing ? 1 : 1);
  });
};

for (const [who, acts] of [['human', HUMAN], ['ai', AI]]) {
  for (const a of acts.filter((x) => x.walk)) {
    const slips = [];
    let prev = null;
    for (const st of a.steps) {
      const cs = contactsAt(st.strip ?? a.strip, st.k, st.x, a.flip);
      if (prev && cs.length && prev.length) {
        let best = Infinity;
        for (const c of cs) for (const p of prev) best = Math.min(best, Math.abs(c - p));
        slips.push(best);
      }
      prev = cs;
    }
    slips.sort((p, q) => p - q);
    const dist = Math.abs(a.steps.at(-1).x - a.steps[0].x);
    const frames = a.steps.length;
    console.log(
      `${who} walk f${a.from} ${a.steps[0].x.toFixed(0)}->${a.steps.at(-1).x.toFixed(0)}: ${frames} frames, ${(dist / frames * 30).toFixed(0)} px/s, stride ${((2 * WALK_STEP_FRAMES) / 30).toFixed(2)} s, ${new Set(a.steps.map((s) => `${s.strip ?? a.strip}.${s.k}`)).size} drawings; ` +
        `foot slip per frame median ${slips[Math.floor(slips.length / 2)].toFixed(1)} px, p90 ${slips[Math.floor(slips.length * 0.9)].toFixed(1)} px, max ${slips.at(-1).toFixed(1)} px`,
    );
  }
}
