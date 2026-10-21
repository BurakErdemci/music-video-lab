#!/usr/bin/env node
// Limb-length check of the soft-bone rig (fix-round rule: no limb stretching, max change <= 6 %).
//
//   node tools/rigcheck.mjs [--from 0] [--to 1199] [--limit 6]
//
// For every pose card and every 60 fps frame in the range, each limb bone (thighs, shins, upper arms,
// forearms, spine, chest-neck, neck-head) is sampled at 9 points along its rest segment. Each sample is
// deformed with the SAME weights and bone transforms the card shader uses (video/src/rig/rig.ts), and the
// deformed polyline length is compared with the rest length. Exit 1 when any limb changes by more than --limit %.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => pathToFileURL(path.join(ROOT, 'video/src', p)).href;
const rig = await import(src('rig/rig.ts'));
const { POSES } = await import(src('rig/poses.ts'));
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'video/public/cards/manifest.json'), 'utf8'));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : Number(process.argv[i + 1]); };
const from = arg('from', 0), to = arg('to', 1199), limit = arg('limit', 6);
const LIMBS = ['thighL', 'shinL', 'thighR', 'shinR', 'uarmL', 'farmL', 'uarmR', 'farmR', 'spine', 'upper', 'head'];

let worst = { pct: 0 };
const rowsOut = [];
for (const id of Object.keys(POSES).sort()) {
  const e = manifest[id];
  const j = rig.restJoints(POSES[id], e.w / e.h);
  const segs = rig.boneSegments(j);
  const dance = rig.danceOf(id);
  const probes = [];
  for (const name of LIMBS) {
    const b = rig.BONES.indexOf(name);
    segs[b].forEach(([a, z], k) => {
      const pts = Array.from({ length: 9 }, (_, i) => [a[0] + ((z[0] - a[0]) * i) / 8, a[1] + ((z[1] - a[1]) * i) / 8]);
      const ws = pts.map((p) => rig.weightsAt(p, segs));
      const rest = Math.hypot(z[0] - a[0], z[1] - a[1]);
      probes.push({ name: `${name}${segs[b].length > 1 ? `#${k}` : ''}`, pts, ws, rest });
    });
  }
  let cardWorst = { pct: 0 };
  for (let f = from; f <= to; f++) {
    const fr = rig.rigFrame(j, f / 60, dance);
    for (const pr of probes) {
      const d = pr.pts.map((p, i) => rig.deform(fr, p, pr.ws[i]));
      let l = 0;
      for (let i = 1; i < d.length; i++) l += Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]);
      const pct = (Math.abs(l - pr.rest) / pr.rest) * 100;
      if (pct > cardWorst.pct) cardWorst = { pct, limb: pr.name, frame: f };
    }
  }
  rowsOut.push(`${id}  max ${cardWorst.pct.toFixed(2).padStart(5)} %  (${cardWorst.limb ?? '-'} @ f${cardWorst.frame ?? '-'})  ${probes.length} limb segments`);
  if (cardWorst.pct > worst.pct) worst = { ...cardWorst, id };
}
console.log(rowsOut.join('\n'));
console.log(`rigcheck frames ${from}-${to}: max limb length change ${worst.pct.toFixed(2)} % (${worst.id} ${worst.limb} @ f${worst.frame}), limit ${limit} %`);
process.exit(worst.pct > limit ? 1 : 0);
