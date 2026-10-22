#!/usr/bin/env node
// intensity_finale.mjs - the intensity rules of the last section (140.04-232.12 s, round 8), next to
// tools/intensity.mjs (whose rules for 0-140 stay as they are). Motion and events per beat are measured the same
// way: events per beat = distinct event frames of video/src/events.ts over the beats of the section; motion = mean
// absolute difference of consecutive frames, luma 0-255, decoded at 480x270.
// Rules:
//  1. final_chorus: events/beat and motion >= 1.5x the verses' mean, and motion >= 0.95x chorus 1's;
//  2. post_chorus_chant and scream_end: motion in [0.7, 1.0]x the chorus mean, events/beat >= 1.10;
//  3. the piano and the outro are deliberate drops (exempt from 1-2), but no 4 s window between 140.04 and the end
//     may average under 0.1x the chorus mean motion, except windows inside the final freeze's hold;
//  4. the build rises monotonically per bar (each bar's motion >= the bar before, 3 % measuring tolerance).
// The references (verses, chorus 1 and 2) are measured when the video covers them (a full-film proof); for a section
// render pass them with --ref "verses_ev=1.1,verses_mo=8.2,chorus_mo=26.4,chorus1_mo=26.4".
//   node tools/intensity_finale.mjs --video video/out/proof232-r8.mp4 [--start 0] [--ref ...]
//   node tools/intensity_finale.mjs --selftest   (must exit 1: a clean case passes and a planted defect fails)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 60;
const mean = (xs) => xs.reduce((x, y) => x + y, 0) / (xs.length || 1);
export const A = 140.04;

/** The verdict on measured numbers. m: { secs: [{name, a, b, evPerBeat, motion}], ref: {verses_ev, verses_mo,
 *  chorus_mo, chorus1_mo}, windows: [{a, b, motion}], freeze: [a, b], buildBars: [{a, b, motion}] } */
export const judge = (m) => {
  const fails = [];
  const by = (n) => m.secs.find((s) => s.name === n);
  const { verses_ev: vEv, verses_mo: vMo, chorus_mo: cMo, chorus1_mo: c1Mo } = m.ref;
  const fc = by('final_chorus');
  if (fc) {
    if (fc.evPerBeat < 1.5 * vEv) fails.push(`final_chorus events/beat ${fc.evPerBeat.toFixed(2)} < 1.5x verses ${vEv.toFixed(2)}`);
    if (fc.motion < 1.5 * vMo) fails.push(`final_chorus motion ${fc.motion.toFixed(2)} < 1.5x verses ${vMo.toFixed(2)}`);
    if (fc.motion < 0.95 * c1Mo) fails.push(`final_chorus motion ${fc.motion.toFixed(2)} < 0.95x chorus 1 ${c1Mo.toFixed(2)}`);
  }
  for (const n of ['post_chorus_chant', 'scream_end']) {
    const s = by(n);
    if (!s) continue;
    if (s.evPerBeat < 1.1) fails.push(`${n} events/beat ${s.evPerBeat.toFixed(2)} < 1.10`);
    if (s.motion < 0.7 * cMo || s.motion > 1.0 * cMo) fails.push(`${n} motion ${s.motion.toFixed(2)} outside [0.7, 1.0]x chorus ${cMo.toFixed(2)}`);
  }
  for (const w of m.windows) {
    const inFreeze = m.freeze && w.a >= m.freeze[0] - 1e-6;
    if (!inFreeze && w.motion < 0.1 * cMo) fails.push(`4 s window ${w.a.toFixed(2)}-${w.b.toFixed(2)} motion ${w.motion.toFixed(2)} < 0.1x chorus ${cMo.toFixed(2)}`);
  }
  for (let i = 1; i < m.buildBars.length; i++) {
    const p = m.buildBars[i - 1];
    const c = m.buildBars[i];
    if (c.motion < 0.97 * p.motion) fails.push(`build bar ${c.a.toFixed(2)} motion ${c.motion.toFixed(2)} < bar before ${p.motion.toFixed(2)}`);
  }
  return fails;
};

const selftest = () => {
  const ref = { verses_ev: 1.1, verses_mo: 8, chorus_mo: 26, chorus1_mo: 26 };
  const clean = {
    secs: [{ name: 'final_chorus', evPerBeat: 1.9, motion: 26 }, { name: 'post_chorus_chant', evPerBeat: 1.6, motion: 22 }, { name: 'scream_end', evPerBeat: 1.6, motion: 21 }],
    ref, windows: [{ a: 140, b: 144, motion: 4 }, { a: 229, b: 233, motion: 0.2 }], freeze: [228.25, 232.12],
    buildBars: [{ a: 149, b: 150, motion: 5 }, { a: 150, b: 151, motion: 6 }, { a: 151, b: 152, motion: 7 }],
  };
  const okClean = judge(clean).length === 0;
  const planted = [
    { ...clean, secs: [{ ...clean.secs[0], motion: 20 }, ...clean.secs.slice(1)] }, // final under chorus 1
    { ...clean, secs: [clean.secs[0], { ...clean.secs[1], motion: 30 }, clean.secs[2]] }, // chant over the chorus
    { ...clean, windows: [{ a: 150, b: 154, motion: 1 }] }, // a dead window outside the freeze
    { ...clean, buildBars: [...clean.buildBars, { a: 152, b: 153, motion: 5 }] }, // the build falls
    { ...clean, secs: [{ ...clean.secs[0], evPerBeat: 1.2 }, ...clean.secs.slice(1)] }, // too few events
  ];
  const caught = planted.map((p) => judge(p).length > 0);
  console.log(`selftest: clean ${okClean ? 'passes' : 'FAILS'}; planted defects caught ${caught.filter(Boolean).length}/${caught.length}`);
  // like the other checkers' selftests: exit 1 when the planted defects are caught (the checker works)
  process.exit(okClean && caught.every(Boolean) ? 1 : 0);
};

const main = async () => {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
  if (process.argv.includes('--selftest')) return selftest();
  const video = arg('video', null);
  if (!video) throw new Error('--video <mp4> is required');
  const start = Number(arg('start', 0));
  const T = await import(pathToFileURL(path.join(ROOT, 'video/src/timing.ts')).href);
  const { EVENTS } = await import(pathToFileURL(path.join(ROOT, 'video/src/events.ts')).href);
  const { FSHOTS } = await import(pathToFileURL(path.join(ROOT, 'video/src/film/finale/plan.ts')).href);
  const w = 480, h = 270, size = w * h;
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-']);
  const d = [];
  let prev = null, buf = Buffer.alloc(0);
  for await (const chunk of ff.stdout) {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= size) {
      const f = buf.subarray(0, size);
      if (prev) { let s = 0; for (let i = 0; i < size; i++) s += Math.abs(f[i] - prev[i]); d.push(s / size); }
      prev = Buffer.from(f);
      buf = buf.subarray(size);
    }
  }
  const end = start + (d.length + 1) / FPS;
  const motionOf = (a, b) => mean(d.slice(Math.max(0, Math.round((a - start) * FPS)), Math.min(d.length, Math.round((b - start) * FPS) - 1)));
  const covers = (a, b) => a >= start - 1e-6 && b <= end + 1 / FPS;
  const secs = T.sections.map((s) => {
    const beats = T.beats.filter((x) => x >= s.start && x < s.end).length || 1;
    const frames = new Set(EVENTS.filter((e) => e.t >= s.start && e.t < s.end).map((e) => Math.round(e.t * FPS)));
    return { name: s.name, a: s.start, b: s.end, evPerBeat: frames.size / beats, motion: covers(s.start, s.end) ? motionOf(s.start, s.end) : null };
  });
  const parsed = Object.fromEntries((arg('ref', '') || '').split(',').filter(Boolean).map((kv) => kv.split('=')).map(([k, v]) => [k, Number(v)]));
  const verses = secs.filter((s) => /^verse/.test(s.name));
  const choruses = secs.filter((s) => /^chorus/.test(s.name));
  const measured = verses.every((s) => s.motion !== null) && choruses.every((s) => s.motion !== null);
  const ref = measured
    ? { verses_ev: mean(verses.map((s) => s.evPerBeat)), verses_mo: mean(verses.map((s) => s.motion)), chorus_mo: mean(choruses.map((s) => s.motion)), chorus1_mo: choruses[0].motion }
    : { verses_ev: mean(verses.map((s) => s.evPerBeat)), ...parsed };
  for (const k of ['verses_mo', 'chorus_mo', 'chorus1_mo']) if (!(ref[k] > 0)) throw new Error(`the video does not cover the verses and choruses: pass --ref with ${k}`);
  const B = Math.min(end, T.sections.at(-1).end);
  const windows = [];
  for (let a = Math.max(A, start); a + 4 <= B + 1e-6; a += 0.25) windows.push({ a, b: a + 4, motion: motionOf(a, a + 4) });
  const freezeShot = FSHOTS.find((s) => s.id === 'freeze');
  const build = T.sections.find((s) => s.name === 'build');
  const buildBars = T.bars.filter((b) => b.start >= build.start - 0.02 && b.end <= build.end + 0.02 && covers(b.start, b.end)).map((b) => ({ a: b.start, b: b.end, motion: motionOf(b.start, b.end) }));
  const mine = secs.filter((s) => s.b > A && s.motion !== null);
  console.log(`intensity (finale) ${A}-${B.toFixed(2)} s, motion from ${video}${measured ? '' : ' (references from --ref)'}`);
  for (const s of mine) console.log(`${s.name.padEnd(22)} ${s.a.toFixed(2)}-${s.b.toFixed(2)}  events/beat ${s.evPerBeat.toFixed(2)}  motion ${s.motion.toFixed(2)} (${(s.motion / ref.chorus_mo).toFixed(2)}x chorus)`);
  for (const b of buildBars) console.log(`  build bar ${b.a.toFixed(2)}  motion ${b.motion.toFixed(2)}`);
  const low = windows.reduce((x, y) => (y.motion < x.motion && !(y.a >= freezeShot.t) ? y : x), { motion: Infinity });
  console.log(`lowest 4 s window outside the freeze: ${low.a?.toFixed(2)}-${low.b?.toFixed(2)} motion ${low.motion.toFixed(2)} (${(low.motion / ref.chorus_mo).toFixed(2)}x chorus)`);
  console.log(`references: verses events/beat ${ref.verses_ev.toFixed(2)}, verses motion ${ref.verses_mo.toFixed(2)}, chorus mean motion ${ref.chorus_mo.toFixed(2)}, chorus 1 ${ref.chorus1_mo.toFixed(2)}`);
  const fails = judge({ secs: mine, ref, windows, freeze: [freezeShot.t, T.sections.at(-1).end], buildBars });
  for (const f of fails) console.log(`FAIL ${f}`);
  console.log(`intensity (finale): ${fails.length ? `FAIL (${fails.length})` : 'PASS'}`);
  process.exit(fails.length ? 1 : 0);
};
await main();
