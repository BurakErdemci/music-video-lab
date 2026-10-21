#!/usr/bin/env node
// Rig deformation check (fix rounds 1 and 2):
//   1. Limb lengths: every limb segment (spine, chest-neck, chest-shoulders, neck-head, upper arms, forearms)
//      is sampled at 9 points, deformed with the card's own weights and bone transforms, and its polyline
//      length compared with rest. Limit: change <= 6 %.
//   2. Mesh areas (the check that would have caught the "mermaid tail" legs of proof v2): for every quad of
//      the card's 40x60 mesh that covers paint (public/cards/<id>.cover.json, alpha > 0.1), the deformed/rest
//      area ratio (both triangles' Jacobian determinants). Limits: no fold (det <= 0), ratio in [0.85, 1.15].
// Both run over all 24 cards and every 60 fps frame in the range, with exactly the shader's math
// (video/src/rig/rig.ts, the same weightsAt and the same squash).
//
//   node tools/rigcheck.mjs [--from 0] [--to 1199]
//   node tools/rigcheck.mjs --selftest      (a deliberate pelvis pinch; MUST exit non-zero)
// Exit: bit 1 = limb length over the limit, bit 2 = quad fold or area ratio out of range, bit 4 = off-step motion.
// (Limbs and areas stress-test the old beat loop, energy 1; the stepping check measures what the film plays.)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => pathToFileURL(path.join(ROOT, 'video/src', p)).href;
const rig = await import(src('rig/rig.ts'));
const { POSES } = await import(src('rig/poses.ts'));
const { ACCENTS } = await import(src('rig/accents.ts'));
const CARDS = path.join(ROOT, 'video/public/cards');
const manifest = JSON.parse(readFileSync(path.join(CARDS, 'manifest.json'), 'utf8'));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : Number(process.argv[i + 1]); };
const selftest = process.argv.includes('--selftest');
const from = arg('from', 0), to = arg('to', selftest ? 120 : 1199);
const LIMB_PCT = 6, AREA_MIN = 0.85, AREA_MAX = 1.15;
const LIMBS = ['spine', 'upper', 'head', 'uarmL', 'farmL', 'uarmR', 'farmR'];

// Deform with precomputed rows: the same blend as the vertex shader, then the sole-anchored squash.
const makeDeform = (fr) => {
  const R = fr.xf.map((x) => rig.rows(x));
  return (p, w) => {
    let x = 0, y = 0;
    for (let k = 0; k < w.length; k++) {
      const wk = w[k];
      if (!wk) continue;
      const m = R[k];
      x += (m[0] * p[0] + m[1] * p[1] + m[2]) * wk;
      y += (m[3] * p[0] + m[4] * p[1] + m[5]) * wk;
    }
    return [x, -0.5 + (y + 0.5) * (1 - fr.squash)];
  };
};
// --selftest: squeeze everything below the hips toward the hip line by half (the pinch of proof v2).
const pinch = (j, d) => (p, w) => {
  const q = d(p, w);
  return q[1] < j.hips[1] ? [j.hips[0] + (q[0] - j.hips[0]) * 0.5, q[1]] : q;
};

const tri = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
let limbWorst = { pct: 0 }, areaMin = { r: Infinity }, areaMax = { r: -Infinity }, folds = 0, quadsChecked = 0;
const rows = [];
for (const id of Object.keys(POSES).sort()) {
  const e = manifest[id];
  const aspect = e.w / e.h;
  const j = rig.restJoints(POSES[id], aspect);
  const segs = rig.boneSegments(j);
  const grid = rig.weightGrid(segs, aspect);
  const dance = rig.danceOf(id, 1);
  const cover = JSON.parse(readFileSync(path.join(CARDS, `${id}.cover.json`), 'utf8'));
  const C = cover.cols, Rn = cover.rows;
  const verts = [];
  for (let i = 0; i <= Rn; i++) for (let k = 0; k <= C; k++) verts.push([-aspect / 2 + (k * aspect) / C, 0.5 - i / Rn]);
  const vw = verts.map((v) => rig.weightsAt(v, grid));
  const quads = [];
  for (let i = 0; i < Rn; i++) for (let k = 0; k < C; k++) if (cover.cells[i * C + k] === '1') {
    const a = i * (C + 1) + k, b = a + 1, c = a + C + 2, d = a + C + 1; // top-left, top-right, bottom-right, bottom-left
    const r1 = tri(verts[a], verts[d], verts[c]), r2 = tri(verts[a], verts[c], verts[b]);
    quads.push({ a, b, c, d, r1, r2, rest: r1 + r2 });
  }
  quadsChecked += quads.length;
  const probes = [];
  for (const name of LIMBS) {
    const bi = rig.BONES.indexOf(name);
    segs[bi].forEach(([p0, p1], k) => {
      const pts = Array.from({ length: 9 }, (_, i) => [p0[0] + ((p1[0] - p0[0]) * i) / 8, p0[1] + ((p1[1] - p0[1]) * i) / 8]);
      probes.push({ name: `${name}${segs[bi].length > 1 ? `#${k}` : ''}`, pts, ws: pts.map((p) => rig.weightsAt(p, grid)), rest: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) });
    });
  }
  let cl = { pct: 0 }, cmin = { r: Infinity }, cmax = { r: -Infinity }, cf = 0;
  for (let f = from; f <= to; f++) {
    const fr = rig.rigFrame(j, f / 60, dance);
    let def = makeDeform(fr);
    if (selftest) def = pinch(j, def);
    for (const pr of probes) {
      const d = pr.pts.map((p, i) => def(p, pr.ws[i]));
      let l = 0;
      for (let i = 1; i < d.length; i++) l += Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]);
      const pct = (Math.abs(l - pr.rest) / pr.rest) * 100;
      if (pct > cl.pct) cl = { pct, limb: pr.name, frame: f };
    }
    const dv = verts.map((v, i) => def(v, vw[i]));
    for (const q of quads) {
      const t1 = tri(dv[q.a], dv[q.d], dv[q.c]), t2 = tri(dv[q.a], dv[q.c], dv[q.b]);
      if (t1 / q.r1 <= 0 || t2 / q.r2 <= 0) cf++;
      const r = (t1 + t2) / q.rest;
      if (r < cmin.r) cmin = { r, frame: f, quad: [Math.floor(q.a / (C + 1)), q.a % (C + 1)] };
      if (r > cmax.r) cmax = { r, frame: f, quad: [Math.floor(q.a / (C + 1)), q.a % (C + 1)] };
    }
  }
  rows.push(`${id}  limb max ${cl.pct.toFixed(2).padStart(5)} % (${cl.limb ?? '-'} @ f${cl.frame ?? '-'})  area [${cmin.r.toFixed(3)}, ${cmax.r.toFixed(3)}] (min @ f${cmin.frame} row,col ${cmin.quad})  folds ${cf}  quads ${quads.length}`);
  if (cl.pct > limbWorst.pct) limbWorst = { ...cl, id };
  if (cmin.r < areaMin.r) areaMin = { ...cmin, id };
  if (cmax.r > areaMax.r) areaMax = { ...cmax, id };
  folds += cf;
}
console.log(rows.join('\n'));

// 3. Stepping (round 4): the film's card motion (held + accents, no loop) changes only on RIG_STEP-frame steps,
//    on the global grid (phase 0) or on an accent's own grid (phase = its start frame mod RIG_STEP).
let stepBad = 0, stepChanges = 0;
const phases = new Set([0]);
for (const id of Object.keys(POSES).sort()) {
  const e = manifest[id];
  const j = rig.restJoints(POSES[id], e.w / e.h);
  const acc = ACCENTS[id] ?? [];
  const allowed = new Set([0, ...acc.map((a) => Math.round(a.t0 * 60) % rig.RIG_STEP)]);
  acc.forEach((a) => phases.add(Math.round(a.t0 * 60) % rig.RIG_STEP));
  let prev = null;
  for (let f = from; f <= to; f++) {
    const key = JSON.stringify(rig.rigFrame(j, f / 60, rig.danceOf(id, 0, acc)).xf.map((x) => rig.rows(x).map((v) => v.toFixed(7))));
    if (prev !== null && key !== prev) {
      stepChanges++;
      if (!allowed.has(((f % rig.RIG_STEP) + rig.RIG_STEP) % rig.RIG_STEP)) { stepBad++; if (stepBad < 5) console.log(`  off-step change: ${id} @ f${f}`); }
    }
    prev = key;
  }
}
const stepFail = stepBad > 0;
const limbBad = limbWorst.pct > LIMB_PCT;
const areaBad = folds > 0 || areaMin.r < AREA_MIN || areaMax.r > AREA_MAX;
if (selftest) console.log('SELFTEST: a deliberate pinch of the lower body (x halved toward the hips); this run MUST fail.');
console.log(`rigcheck frames ${from}-${to}, ${rows.length} cards:`);
console.log(`  limb length: max change ${limbWorst.pct.toFixed(2)} % (${limbWorst.id} ${limbWorst.limb} @ f${limbWorst.frame}), limit ${LIMB_PCT} % -> ${limbBad ? 'FAIL' : 'PASS'}`);
console.log(`  quad area: ${quadsChecked} painted quads per frame, ratio min ${areaMin.r.toFixed(3)} (${areaMin.id} @ f${areaMin.frame}), max ${areaMax.r.toFixed(3)} (${areaMax.id} @ f${areaMax.frame}), folds ${folds}; limits [${AREA_MIN}, ${AREA_MAX}], 0 folds -> ${areaBad ? 'FAIL' : 'PASS'}`);
console.log(`  stepping: the held + accent motion changes only every ${rig.RIG_STEP} frames (phases ${[...phases].sort((a, b) => a - b).join(', ')}): ${stepChanges} changes, ${stepBad} off-step -> ${stepFail ? 'FAIL' : 'PASS'}`);
process.exit((limbBad ? 1 : 0) | (areaBad ? 2 : 0) | (stepFail ? 4 : 0));
