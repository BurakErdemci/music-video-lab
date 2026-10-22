#!/usr/bin/env node
// particlecheck.mjs - no particle reads as a flat card (round 11): every point sprite's longest side is at most
// PARTICLE_MAX_PX (28 px at 1080 lines; video/src/particles/cap.ts). A point sprite is as large as its gl_PointSize,
// so the cap holds when every shader in video/src writes gl_PointSize = min(<size>, uMaxPx), declares uMaxPx, and its
// component feeds it from useParticleCap() (the cap at the canvas's real size). Any point shader that sizes its
// sprites otherwise fails, so an uncapped one cannot come back.
//   node tools/particlecheck.mjs
//   node tools/particlecheck.mjs --selftest   (must exit 1: the capped shader passes, an uncapped one fails)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'video', 'src');

/** The failures of one source file. */
export const fileFails = (name, s) => {
  const sizes = [...s.matchAll(/gl_PointSize\s*=\s*([^;]+);/g)].map((m) => m[1].trim());
  if (!sizes.length) return [];
  const out = [];
  for (const e of sizes) if (!/^min\(.*,\s*uMaxPx\)$/s.test(e)) out.push(`${name}: gl_PointSize = ${e.slice(0, 70)} is not capped by uMaxPx`);
  if (!/uniform float uMaxPx;/.test(s)) out.push(`${name}: no uniform float uMaxPx`);
  if ((s.match(/uMaxPx: useParticleCap\(\)/g) ?? []).length < sizes.length) out.push(`${name}: uMaxPx not fed from useParticleCap() for every point shader`);
  return out;
};

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = path.join(d, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
});

if (process.argv.includes('--selftest')) {
  const capped = "uniform float uPx; uniform float uMaxPx;\n gl_PointSize = min(size * uPx / -mv.z, uMaxPx);\n useUniforms({ uPx: PX, uMaxPx: useParticleCap() })";
  const uncapped = "uniform float uPx;\n gl_PointSize = size * uPx / -mv.z;\n useUniforms({ uPx: PX })";
  const a = fileFails('capped', capped);
  const b = fileFails('uncapped', uncapped);
  console.log(`selftest: capped -> ${a.join('; ') || 'passes'}; uncapped (round 10's drift) -> ${b.join('; ') || 'PASSES (wrong)'}`);
  process.exit(a.length === 0 && b.length > 0 ? 1 : 0);
}

const fails = [];
let shaders = 0;
for (const f of walk(SRC)) {
  const s = readFileSync(f, 'utf8');
  shaders += (s.match(/gl_PointSize\s*=/g) ?? []).length;
  fails.push(...fileFails(path.relative(SRC, f), s));
}
// cap.ts needs the browser bundle (react-three-fiber) to import; read its constant instead
const capSrc = readFileSync(path.join(SRC, 'particles', 'cap.ts'), 'utf8');
const max = Number(capSrc.match(/PARTICLE_MAX_PX = (\d+(?:\.\d+)?)/)?.[1]);
if (!(max > 0 && max <= 28)) fails.push(`PARTICLE_MAX_PX is ${max}, above the 28 px cap`);
console.log(`particlecheck: ${shaders} point shaders in video/src, cap ${max} px at 1080 lines`);
for (const f of fails) console.log(`FAIL ${f}`);
console.log(fails.length ? `particlecheck: FAIL (${fails.length})` : 'particlecheck: PASS');
process.exit(fails.length ? 1 : 0);
