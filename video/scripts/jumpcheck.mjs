#!/usr/bin/env node
// Jump check: how much each character's silhouette changes from one frame to the next, measured on the real
// render (the CharMask composition draws one character alone, as a black silhouette on white, with the same
// Actor, morphs and all, at 1/4 scale).
//
// Metric per consecutive frame pair: the two masks are aligned by the integer shift (dx +-8, dy +-2 px at
// 1/4 scale = +-32 / +-8 screen px) that minimises their difference, and the change is what is still
// different after that, as a share of the larger silhouette:
//     change = |A xor shift(B)| / max(|A|, |B|)
// The shift takes out travel (a walk, a slide) and breathing; what remains is the shape changing.
//
// A JUMP is a change that happens in one frame instead of being spread over several: change >= THRESHOLD
// (15%) AND this one frame carries >= SPIKE (60%) of all the change in the 5-frame window around it. A cut
// between two drawings puts the whole change in one frame (the cut the director cited, H04 f3 -> f4 of
// test90-v2, measures 32% with nothing around it); a fast but continuous move (a 6-frame morph, a walk
// on twos) changes a lot every frame and is not a jump. A walk drawing that lurches the body further than
// the +-32 px the shift can absorb shows up as a jump too.
//
//   node video/scripts/jumpcheck.mjs [--render] [--from 468] [--to 2661] [--threshold 0.15] [--spike 0.6]
//   node video/scripts/jumpcheck.mjs --pair <png> <scale> <ax> <png> <scale> <ax>   (a hard cut between two drawings)
//
// --render renders video/out/jump/<who>/ first (remotion, ~3 min each); without it the existing frames are used.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VIDEO = path.join(ROOT, 'video');
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
const FROM = Number(arg('--from', 468));
const TO = Number(arg('--to', 2661));
const THRESHOLD = Number(arg('--threshold', 0.15));
const SPIKE = Number(arg('--spike', 0.6));
const Q = 4;

// ---- minimal PNG decoder (8-bit, colour types 0/2/4/6, non-interlaced) ------------------------------------------
export const readPng = (file) => {
  const buf = fs.readFileSync(file);
  let p = 8;
  let w = 0;
  let h = 0;
  let ct = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`${file}: only 8-bit non-interlaced PNG`);
      ct = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  if (!bpp) throw new Error(`${file}: colour type ${ct} not supported`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y ? out[dst - stride + x] : 0;
      const c = x >= bpp && y ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[dst + x] = v & 255;
    }
  }
  return { w, h, bpp, ct, px: out };
};

/** Binary mask: dark pixels of a rendered frame (black silhouette on white). */
const frameMask = (png) => {
  const { w, h, bpp, px } = png;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = px[i * bpp] < 128 ? 1 : 0;
  return { w, h, m };
};

const bbox = (M) => {
  let x0 = M.w;
  let y0 = M.h;
  let x1 = -1;
  let y1 = -1;
  let n = 0;
  let sx = 0;
  for (let y = 0; y < M.h; y++)
    for (let x = 0; x < M.w; x++)
      if (M.m[y * M.w + x]) {
        n++;
        sx += x;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1, n, cx: n ? sx / n : 0 };
};

/** change = min over shifts of |A xor shift(B)| / max(|A|, |B|); also the shift found. */
export const change = (A, B) => {
  const ba = bbox(A);
  const bb = bbox(B);
  if (!ba.n && !bb.n) return { c: 0, dx: 0, dy: 0, na: 0, nb: 0 };
  if (!ba.n || !bb.n) return { c: 1, dx: 0, dy: 0, na: ba.n, nb: bb.n };
  const X0 = Math.min(ba.x0, bb.x0) - 9;
  const X1 = Math.max(ba.x1, bb.x1) + 9;
  const Y0 = Math.min(ba.y0, bb.y0) - 3;
  const Y1 = Math.max(ba.y1, bb.y1) + 3;
  const at = (M, x, y) => (x >= 0 && y >= 0 && x < M.w && y < M.h ? M.m[y * M.w + x] : 0);
  const xorAt = (dx, dy, limit) => {
    let n = 0;
    for (let y = Y0; y <= Y1; y++) {
      for (let x = X0; x <= X1; x++) if (at(A, x, y) !== at(B, x + dx, y + dy)) n++;
      if (n > limit) return n;
    }
    return n;
  };
  const den = Math.max(ba.n, bb.n);
  let best = { n: xorAt(0, 0, Infinity), dx: 0, dy: 0 };
  if (best.n / den > 0.02) {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -8; dx <= 8; dx++) {
        if (!dx && !dy) continue;
        const n = xorAt(dx, dy, best.n);
        if (n < best.n) best = { n, dx, dy };
      }
  }
  return { c: best.n / den, dx: best.dx, dy: best.dy, na: ba.n, nb: bb.n, cx: (bb.cx - ba.cx) * Q };
};

// ---- a hard cut between two drawings, rasterised the way the Actor places them (feet on one floor) ------------
const rasterDrawing = (file, scale, ax, x, floor, W, H) => {
  const png = readPng(file);
  const s = scale / Q;
  const M = { w: W, h: H, m: new Uint8Array(W * H) };
  const ow = Math.round(png.w * s);
  const oh = Math.round(png.h * s);
  const left = Math.round(x / Q - ax * s);
  const top = Math.round(floor / Q - oh);
  for (let y = 0; y < oh; y++)
    for (let xx = 0; xx < ow; xx++) {
      const sx = Math.min(png.w - 1, Math.floor(xx / s));
      const sy = Math.min(png.h - 1, Math.floor(y / s));
      const a = png.bpp === 4 ? png.px[(sy * png.w + sx) * 4 + 3] : 255;
      const X = left + xx;
      const Y = top + y;
      if (a > 127 && X >= 0 && Y >= 0 && X < W && Y < H) M.m[Y * W + X] = 1;
    }
  return M;
};

const main = () => {
  if (process.argv.includes('--pair')) {
    const i = process.argv.indexOf('--pair');
    const [fa, sa, aa, fb, sb, ab] = process.argv.slice(i + 1, i + 7);
    const A = rasterDrawing(path.resolve(fa), Number(sa), Number(aa), 960, 1000, 480, 270);
    const B = rasterDrawing(path.resolve(fb), Number(sb), Number(ab), 960, 1000, 480, 270);
    const r = change(A, B);
    console.log(`cut ${path.basename(fa)} -> ${path.basename(fb)}: change ${(r.c * 100).toFixed(1)}% (shift ${r.dx},${r.dy})`);
    return 0;
  }
  let bad = 0;
  for (const who of ['human', 'ai']) {
    const dir = path.join(VIDEO, 'out', 'jump', who);
    if (process.argv.includes('--render')) {
      fs.rmSync(dir, { recursive: true, force: true });
      // props through a file: Windows mangles the quotes of inline JSON
      const propsFile = path.join(VIDEO, 'out', 'jump', `${who}.json`);
      fs.mkdirSync(path.dirname(propsFile), { recursive: true });
      fs.writeFileSync(propsFile, JSON.stringify({ who }));
      const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', 'CharMask', dir, '--sequence', '--scale=0.25', `--frames=${FROM}-${TO}`, '--image-format=png', '--concurrency=4', `--props=${propsFile}`], { cwd: VIDEO, stdio: 'inherit', shell: true });
      if (r.status !== 0) throw new Error(`render ${who} failed`);
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
    const frameOf = (f) => Number(/(\d+)\.png$/.exec(f)[1]);
    let prev = null;
    const pairs = [];
    let max = { c: 0, f: 0 };
    const all = [];
    for (const f of files) {
      const n = frameOf(f);
      if (n < FROM || n > TO) continue;
      const M = frameMask(readPng(path.join(dir, f)));
      if (prev && prev.n === n - 1) {
        const r = change(prev.M, M);
        all.push(r.c);
        pairs.push({ f: n, ...r });
        if (r.c > max.c) max = { c: r.c, f: n };
      }
      prev = { n, M };
    }
    const hits = [];
    pairs.forEach((p, i) => {
      if (p.c < THRESHOLD) return;
      let win = 0;
      for (let j = i - 2; j <= i + 2; j++) win += pairs[j] && pairs[j].f - p.f === j - i ? pairs[j].c : 0;
      p.share = p.c / win;
      if (p.share >= SPIKE) hits.push(p);
    });
    all.sort((a, b) => a - b);
    const pct = (q) => ((all[Math.floor(q * (all.length - 1))] ?? 0) * 100).toFixed(1);
    console.log(`${who}: ${all.length} frame pairs; change median ${pct(0.5)}%, p95 ${pct(0.95)}%, p99 ${pct(0.99)}%, max ${(max.c * 100).toFixed(1)}% at f${max.f}`);
    for (const h of hits) console.log(`   JUMP f${h.f - 1}->f${h.f}: ${(h.c * 100).toFixed(1)}%, ${(h.share * 100).toFixed(0)}% of its 5-frame window (after shift ${h.dx * Q},${h.dy * Q} px; area ${h.na}->${h.nb})`);
    console.log(`${who}: ${hits.length} jumps (change >= ${(THRESHOLD * 100).toFixed(0)}% in one frame, >= ${(SPIKE * 100).toFixed(0)}% of the window)`);
    bad += hits.length;
  }
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
