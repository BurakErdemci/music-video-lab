#!/usr/bin/env node
// Seamlessness check of the intro zoom: two frames of the same moment whose zoom differs by exactly one loop
// (ln(1/s)); the spiral rotation is part of the camera, so the pictures should match apart from the moon phase
// (and the title overlay, which is excluded below).
//
//   node video/scripts/loopcheck.mjs [--frame 345] [--out video/out/loop]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VIDEO = path.join(ROOT, 'video');
const req = createRequire(path.join(VIDEO, 'package.json'));
const { bundle } = req('@remotion/bundler');
const { openBrowser, renderStill, selectComposition } = req('@remotion/renderer');
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const frame = Number(opt('frame', 345));
const outDir = path.resolve(ROOT, opt('out', 'video/out/loop'));
mkdirSync(outDir, { recursive: true });

const { zoomL } = await import(pathToFileURL(path.join(VIDEO, 'src/scenes/ZoomIntro.tsx')).href).catch(() => ({}));
const { LN_S } = await import(pathToFileURL(path.join(VIDEO, 'src/world/droste.ts')).href);
const { makeZoomCurve } = await import(pathToFileURL(path.join(VIDEO, 'src/world/droste.ts')).href);
// the curve is rebuilt here from the same knots (ZoomIntro.tsx is a React file node cannot load)
const { barFrame } = await import(pathToFileURL(path.join(VIDEO, 'src/timing.ts')).href);
const KNOT_L = [3.17, 3.15, 2.1, 0.35, -1.35, -3.1, -5.45, -8.25, -11.45, -14.9];
const curve = makeZoomCurve(KNOT_L.map((L, i) => ({ f: i === 0 ? 0 : barFrame(i), L })));
void zoomL;
const L1 = curve(frame);
const L2 = L1 - -LN_S; // one loop further in: ln Z grows by ln(1/s) = -LN_S
const L3 = L1 + LN_S; // one loop further out
console.log(`frame ${frame}: L = ${L1.toFixed(4)}, one loop = ${(-LN_S).toFixed(4)}`);

const serveUrl = await bundle({ entryPoint: path.join(VIDEO, 'src/index.ts'), publicDir: path.join(VIDEO, 'public') });
const browser = await openBrowser('chrome', { chromeMode: 'chrome-for-testing' });
const shots = [];
for (const [name, L] of [['A', L1], ['B', L3]]) {
  const inputProps = { lOverride: L };
  const composition = await selectComposition({ serveUrl, id: 'Test30', inputProps, puppeteerInstance: browser });
  const output = path.join(outDir, `loop-${name}.png`);
  await renderStill({ composition, serveUrl, output, frame, inputProps, puppeteerInstance: browser, imageFormat: 'png', overwrite: true });
  shots.push(output);
}
await browser.close({ silent: true });
void L2;

const PY = `
import sys, json
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
d = ImageChops.difference(a, b).convert('L')
def stats(img, label):
    h = img.histogram(); n = sum(h)
    mean = sum(i * c for i, c in enumerate(h)) / n
    big = sum(h[25:]) / n
    print(f'{label}: mean abs diff {mean:.3f}/255, pixels with diff > 24: {100*big:.3f}%')
stats(d, 'whole frame')
band = d.copy(); band.paste(0, (0, 690, a.width, 910))
stats(band, 'without the title band (rows 690-910 zeroed, counted as equal)')
d.point(lambda v: min(255, v * 4)).save(sys.argv[3])
`;
const py = spawnSync('python', ['-I', '-c', PY, shots[0], shots[1], path.join(outDir, 'loop-diff-x4.png')], { encoding: 'utf8' });
process.stdout.write(py.stdout);
if (py.status !== 0) console.error(py.stderr);
