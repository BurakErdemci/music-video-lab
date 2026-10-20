// node tools/rigcheck/sheet.mjs <CompId> <frame,frame,...> <out.jpg> [--cols 4] [--tile 480] [--labels a,b,c]
// Renders beauty stills of a rig test composition and tiles them into a labelled contact sheet.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { makeRenderer, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
const [id, frameList, out] = args;
const frames = frameList.split(',').map(Number);
const labels = (opt('labels', '') || '').split(',').filter(Boolean);
const cols = Number(opt('cols', 4));
const tile = Number(opt('tile', 480));
const dir = path.resolve(ROOT, 'video/out/rig-sheet', id);
mkdirSync(dir, { recursive: true });

const PY = `
import json, sys
from PIL import Image, ImageDraw, ImageFont
spec = json.loads(sys.argv[1])
ims = [Image.open(f).convert('RGB') for f in spec['files']]
w = spec['tile']; h = round(w * ims[0].height / ims[0].width); lab = 26; pad = 6; cols = spec['cols']
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + lab + pad) + pad), (13, 16, 24))
try: font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 15)
except Exception: font = ImageFont.load_default()
d = ImageDraw.Draw(sheet)
for i, im in enumerate(ims):
    x = pad + (i % cols) * (w + pad); y = pad + (i // cols) * (h + lab + pad)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + lab))
    d.text((x + 4, y + 5), spec['labels'][i], fill=(236, 233, 226), font=font)
sheet.save(spec['out'], quality=88)
`;

const r = await makeRenderer();
const files = [];
for (const f of frames) {
  const file = path.join(dir, `f${String(f).padStart(5, '0')}.png`);
  await r.still(id, 'beauty', f, file);
  files.push(file);
}
await r.close();
const outPath = path.resolve(ROOT, out);
const spec = { files, labels: frames.map((f, i) => labels[i] ?? `${id} f${f}`), cols, tile, out: outPath };
const py = spawnSync('uv', ['run', '--with', 'pillow', 'python', '-I', '-c', PY, JSON.stringify(spec)], { encoding: 'utf8' });
if (py.status !== 0) { console.error(py.stderr); process.exit(1); }
console.log(`sheet: ${outPath}`);
