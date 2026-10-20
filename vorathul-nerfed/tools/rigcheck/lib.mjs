// Shared renderer for the rig tools: one bundle of video/src/rig/index.ts, PNG frames via renderFrames (frame-exact, no ffmpeg).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const VIDEO = path.join(ROOT, 'video');
const req = createRequire(path.join(VIDEO, 'package.json'));
const { bundle } = req('@remotion/bundler');
const { openBrowser, renderFrames, renderStill, selectComposition } = req('@remotion/renderer');

export const makeRenderer = async ({ concurrency = 4, gl = 'angle' } = {}) => {
  const t0 = Date.now();
  const serveUrl = await bundle({ entryPoint: path.join(VIDEO, 'src/rig/index.ts'), publicDir: path.join(VIDEO, 'public') });
  const chromiumOptions = { gl };
  const browser = await openBrowser('chrome', { chromeMode: 'chrome-for-testing', chromiumOptions });
  console.log(`bundle ${Date.now() - t0} ms`);
  const comps = new Map();
  const comp = async (id, pass = 'id') => {
    const key = `${id}/${pass}`;
    if (!comps.has(key)) comps.set(key, await selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions, inputProps: { pass } }));
    return comps.get(key);
  };
  return {
    comp, serveUrl, browser,
    /**
     * Renders [from, to] of a composition into outDir as frame-NNNNN.png. Under load Chrome occasionally captures a frame before
     * the canvas painted (fully transparent); those frames are re-rendered one at a time until they are not blank.
     */
    async frames(id, pass, outDir, from, to, conc = concurrency) {
      mkdirSync(outDir, { recursive: true });
      const composition = await comp(id, pass);
      const s = Date.now();
      await renderFrames({
        composition, serveUrl, outputDir: outDir, imageFormat: 'png', frameRange: [from, to], concurrency: conc,
        puppeteerInstance: browser, chromiumOptions, inputProps: { pass }, onStart: () => {}, onFrameUpdate: () => {},
      });
      for (const n of readdirSync(outDir)) {
        const m = /^element-(\d+)\.png$/.exec(n);
        if (m) renameSync(path.join(outDir, n), path.join(outDir, `frame-${String(Number(m[1])).padStart(5, '0')}.png`));
      }
      let retried = 0;
      for (let f = from; f <= to; f++) {
        const file = path.join(outDir, `frame-${String(f).padStart(5, '0')}.png`);
        for (let attempt = 0; attempt < 6 && isBlankPng(file); attempt++) {
          retried++;
          await renderStill({ composition, serveUrl, output: file, frame: f, puppeteerInstance: browser, chromiumOptions, imageFormat: 'png', inputProps: { pass }, overwrite: true });
        }
      }
      writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify({ frames: to - from + 1, blankRetried: retried }));
      if (retried) console.log(`  ${id}: ${retried} blank captures re-rendered`);
      return Date.now() - s;
    },
    async still(id, pass, frame, output) {
      const composition = await comp(id, pass);
      await renderStill({ composition, serveUrl, output, frame, puppeteerInstance: browser, chromiumOptions, imageFormat: 'png', inputProps: { pass }, overwrite: true });
    },
    /**
     * Like frames(), but every frame is captured at least twice (4 tabs in order, then 2 tabs in reversed 30-frame chunks).
     * Under GPU load Chrome sometimes returns a torn or tiled frame; frames whose two captures differ are captured again in
     * short warm runs and the majority wins. The share of frames that disagreed is the capture-defect rate (stats.json).
     */
    async framesVoted(id, pass, outDir, from, to) {
      const composition = await comp(id, pass);
      const s = Date.now();
      const name = (f) => `frame-${String(f).padStart(5, '0')}.png`;
      const md5 = (file) => createHash('md5').update(readFileSync(file)).digest('hex');
      const run = async (dir, f0, f1, c) => {
        mkdirSync(dir, { recursive: true });
        await renderFrames({
          composition, serveUrl, outputDir: dir, imageFormat: 'png', frameRange: [f0, f1], concurrency: c,
          puppeteerInstance: browser, chromiumOptions, inputProps: { pass }, onStart: () => {}, onFrameUpdate: () => {},
        });
        for (const n of readdirSync(dir)) {
          const m = /^element-(\d+)\.png$/.exec(n);
          if (m) renameSync(path.join(dir, n), path.join(dir, name(Number(m[1]))));
        }
      };
      await run(outDir, from, to, concurrency);
      const dirB = outDir + '.b';
      const chunks = [];
      for (let f = from; f <= to; f += 30) chunks.push([f, Math.min(to, f + 29)]);
      for (const [f0, f1] of chunks.reverse()) await run(dirB, f0, f1, 2);
      const bad = [];
      for (let f = from; f <= to; f++) if (md5(path.join(outDir, name(f))) !== md5(path.join(dirB, name(f)))) bad.push(f);
      let unresolved = 0;
      for (const f of bad) {
        const votes = new Map();
        const add = (file) => { if (isBlankPng(file)) return; const h = md5(file); votes.set(h, [...(votes.get(h) ?? []), file]); };
        add(path.join(outDir, name(f)));
        add(path.join(dirB, name(f)));
        const tmp = outDir + '.t';
        let winner = null;
        for (let attempt = 0; attempt < 5 && !winner; attempt++) {
          rmSync(tmp, { recursive: true, force: true });
          await run(tmp, Math.max(0, f - 4), f, 1);
          const file = path.join(tmp, name(f));
          const keep = path.join(tmp + '.k', `${attempt}-${name(f)}`);
          mkdirSync(tmp + '.k', { recursive: true });
          copyFileSync(file, keep);
          add(keep);
          for (const [, files] of votes) if (files.length >= 2) winner = files[0];
        }
        if (winner) copyFileSync(winner, path.join(outDir, name(f)));
        else unresolved++;
        rmSync(tmp, { recursive: true, force: true });
        rmSync(tmp + '.k', { recursive: true, force: true });
      }
      rmSync(dirB, { recursive: true, force: true });
      writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify({ frames: to - from + 1, disagreed: bad.length, unresolved }));
      console.log(`  ${id}: ${bad.length} of ${to - from + 1} frames disagreed between two captures, ${unresolved} unresolved`);
      return Date.now() - s;
    },
    close: () => browser.close({ silent: true }),
  };
};

/** True when no pixel of an 8-bit RGBA PNG has alpha > 0 (a frame Chrome captured before the WebGL canvas painted). */
export const isBlankPng = (file) => {
  const b = readFileSync(file);
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  const idat = [];
  for (let p = 8; p < b.length; ) {
    const len = b.readUInt32BE(p);
    if (b.toString('latin1', p + 4, p + 8) === 'IDAT') idat.push(b.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a0 = x >= bpp ? line[x - bpp] : 0;
      const b0 = prev[x];
      const c0 = x >= bpp ? prev[x - bpp] : 0;
      let add = 0;
      if (ft === 1) add = a0;
      else if (ft === 2) add = b0;
      else if (ft === 3) add = (a0 + b0) >> 1;
      else if (ft === 4) {
        const p0 = a0 + b0 - c0;
        const pa = Math.abs(p0 - a0), pb = Math.abs(p0 - b0), pc = Math.abs(p0 - c0);
        add = pa <= pb && pa <= pc ? a0 : pb <= pc ? b0 : c0;
      }
      line[x] = (line[x] + add) & 255;
    }
    for (let x = 3; x < stride; x += bpp) if (line[x] !== 0) return false;
    prev = line;
  }
  return true;
};

/** The repo-wide one-Chrome render lock (tools/locked.sh protocol: .render.lock/pid, stale locks are taken over). */
export const withRenderLock = async (fn) => {
  const lock = path.join(ROOT, '.render.lock');
  for (;;) {
    try { mkdirSync(lock); break; } catch { /* held */ }
    let pid = NaN;
    try { pid = Number(readFileSync(path.join(lock, 'pid'), 'utf8')); } catch { /* no pid yet */ }
    let alive = true;
    if (pid) { try { process.kill(pid, 0); } catch { alive = false; } }
    if (pid && !alive) { rmSync(lock, { recursive: true, force: true }); continue; }
    await new Promise((r) => setTimeout(r, 5000));
  }
  writeFileSync(path.join(lock, 'pid'), String(process.pid));
  try { return await fn(); } finally { rmSync(lock, { recursive: true, force: true }); }
};

export const listFrames = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.png')).sort() : []);
