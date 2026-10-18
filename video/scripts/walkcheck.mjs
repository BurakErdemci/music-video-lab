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

/** The generated image a walk drawing was cut from. */
const sourceOf = (id) => {
  const [sid, k] = id.split('.');
  return STRIP_TABLE[sid].frames[Number(k) - 1].file.replace(/-\d+\.png$/, '');
};
let bad = 0;
for (const [who, acts] of [['human', HUMAN], ['ai', AI]]) {
  for (const a0 of acts.filter((x) => x.walk)) {
    // one entry per frame (test90-v5 walks hold each drawing several frames)
    const a = { ...a0, steps: a0.steps.flatMap((st) => Array.from({ length: st.hold }, () => st)) };
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
    // cadence (test90-v5, the director: the walk "stutters"): the drawings as runs, their hold lengths, and steps that
    // do not go to the next drawing of the cycle (backwards or skipping). The cycle order is the order of the walk
    // strip's frames; a walk drawn from several strips (v4's pool) is ordered by the pool list.
    const ids = a.steps.map((st) => `${st.strip ?? a.strip}.${st.k}`);
    const runs = [];
    for (const id of ids) {
      const last = runs[runs.length - 1];
      if (last && last.id === id) last.n++;
      else runs.push({ id, n: 1 });
    }
    const order = [...new Set(ids)].sort((p, q) => {
      const [sp, kp] = p.split('.');
      const [sq, kq] = q.split('.');
      return sp === sq ? Number(kp) - Number(kq) : sp < sq ? -1 : 1;
    });
    let notForward = 0;
    for (let i = 0; i + 1 < runs.length; i++) {
      const a0 = order.indexOf(runs[i].id);
      const a1 = order.indexOf(runs[i + 1].id);
      if (a1 !== (a0 + 1) % order.length) notForward++;
    }
    const inner = runs.slice(1, -1).map((r) => r.n);
    const hmin = Math.min(...inner);
    const hmax = Math.max(...inner);
    const sources = new Set(ids.map((id) => sourceOf(id))).size;
    console.log(
      `${who} walk f${a.from} cadence: ${runs.length} drawings shown, ${order.length} distinct from ${sources} generated image(s); holds ${hmin}..${hmax} (spread ${hmax - hmin}); steps not to the next drawing of the cycle: ${notForward}` +
        (process.argv.includes('--verbose') ? `
      ${runs.map((r) => `${r.id}x${r.n}`).join(' ')}` : ''),
    );
    bad += notForward > 0 || hmax - hmin > 1 ? 1 : 0;
    const dist = Math.abs(a.steps.at(-1).x - a.steps[0].x);
    const frames = a.steps.length;
    console.log(
      `${who} walk f${a.from} ${a.steps[0].x.toFixed(0)}->${a.steps.at(-1).x.toFixed(0)}: ${frames} frames, ${(dist / frames * 30).toFixed(0)} px/s, stride ${((2 * WALK_STEP_FRAMES) / 30).toFixed(2)} s, ${new Set(a.steps.map((s) => `${s.strip ?? a.strip}.${s.k}`)).size} drawings; ` +
        `foot slip per frame median ${slips[Math.floor(slips.length / 2)].toFixed(1)} px, p90 ${slips[Math.floor(slips.length * 0.9)].toFixed(1)} px, max ${slips.at(-1).toFixed(1)} px`,
    );
  }
}
process.exit(bad ? 1 : 0);
