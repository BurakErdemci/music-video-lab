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

export const listFrames = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.png')).sort() : []);
