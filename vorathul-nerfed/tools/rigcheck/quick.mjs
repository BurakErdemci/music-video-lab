// node tools/rigcheck/quick.mjs <CompId> <pass> <frames,comma> <outDir>  -- renders a few frames to look at.
import path from 'node:path';
import { makeRenderer, ROOT } from './lib.mjs';

const [id, pass, frames, out] = process.argv.slice(2);
const r = await makeRenderer();
for (const f of frames.split(',').map(Number)) {
  const s = Date.now();
  await r.still(id, pass, f, path.resolve(ROOT, out, `${id}-${pass}-${String(f).padStart(5, '0')}.png`));
  console.log(`frame ${f} ${Date.now() - s} ms`);
}
await r.close();
