#!/usr/bin/env node
// Render a list of frames from one bundle into video/out/stills/ and build a labelled contact sheet.
//
//   node tools/stills.mjs --frames 0,100,468 [--comp Test30] [--out video/out/stills]
//                         [--cols 3] [--tile 640] [--gl angle]
//
// Uses @remotion/bundler and @remotion/renderer from video/node_modules (they ship with
// @remotion/cli at the same pinned version). The labelled sheet needs python + Pillow;
// without them an unlabelled ffmpeg tile is written instead.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.join(ROOT, 'video');
const req = createRequire(path.join(VIDEO, 'package.json'));
const { bundle } = req('@remotion/bundler');
const { openBrowser, renderStill, selectComposition } = req('@remotion/renderer');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const comp = opt('comp', 'Test30');
const outDir = path.resolve(ROOT, opt('out', 'video/out/stills'));
const cols = Number(opt('cols', 3));
const tile = Number(opt('tile', 640));
const gl = opt('gl', null);
const frames = String(opt('frames', '0')).split(',').map((s) => Number(s.trim()));

const PY = `
import json, sys
from PIL import Image, ImageDraw, ImageFont
spec = json.loads(sys.argv[1])
files, labels, cols, tile, out = spec['files'], spec['labels'], spec['cols'], spec['tile'], spec['out']
ims = [Image.open(f).convert('RGB') for f in files]
w = tile; h = round(tile * ims[0].height / ims[0].width); lab = 30; pad = 8
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + lab + pad) + pad), (13, 16, 24))
font = None
for p in ('C:/Windows/Fonts/consola.ttf', '/System/Library/Fonts/Menlo.ttc'):
    try:
        font = ImageFont.truetype(p, 16); break
    except Exception:
        pass
font = font or ImageFont.load_default()
d = ImageDraw.Draw(sheet)
for i, im in enumerate(ims):
    x = pad + (i % cols) * (w + pad); y = pad + (i // cols) * (h + lab + pad)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + lab))
    d.text((x + 4, y + 6), labels[i], fill=(236, 233, 226), font=font)
sheet.save(out, quality=90)
`;

const contactSheet = (files, labels, out) => {
  const py = spawnSync('python', ['-I', '-c', PY, JSON.stringify({ files, labels, cols, tile, out })], { encoding: 'utf8' });
  if (py.status === 0 && existsSync(out)) return;
  console.warn('python/Pillow unavailable, writing an unlabelled ffmpeg sheet', py.stderr?.slice(0, 200));
  const list = path.join(path.dirname(out), '_list.txt');
  writeFileSync(list, files.map((f) => `file '${f.replaceAll('\\', '/')}'`).join('\n'));
  const rows = Math.ceil(files.length / cols);
  spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `scale=${tile}:-1,tile=${cols}x${rows}:padding=8:color=0x0D1018`, '-frames:v', '1', out], { stdio: 'inherit' });
};

const main = async () => {
  mkdirSync(outDir, { recursive: true });
  const t0 = Date.now();
  const serveUrl = await bundle({ entryPoint: path.join(VIDEO, 'src/index.ts'), publicDir: path.join(VIDEO, 'public') });
  const chromiumOptions = gl ? { gl } : {};
  const browser = await openBrowser('chrome', { chromeMode: 'chrome-for-testing', chromiumOptions });
  const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser, chromiumOptions });
  const files = [];
  for (const f of frames) {
    const output = path.join(outDir, `${comp}-${String(f).padStart(5, '0')}.png`);
    const s = Date.now();
    await renderStill({ composition, serveUrl, output, frame: f, puppeteerInstance: browser, chromiumOptions, imageFormat: 'png', overwrite: true });
    files.push(output);
    console.log(`  frame ${f} -> ${path.relative(ROOT, output)} (${Date.now() - s} ms)`);
  }
  await browser.close({ silent: true });
  const sheet = path.join(outDir, 'contact.jpg');
  contactSheet(files, frames.map((f) => `${comp} f${f}`), sheet);
  console.log(`bundle+render ${Date.now() - t0} ms, ${frames.length} stills, contact sheet: ${path.relative(ROOT, sheet)}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
