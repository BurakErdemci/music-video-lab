// The repo-wide one-Chrome render lock for node tools, same protocol as tools/locked.sh: a .render.lock
// directory holding the holder's Windows pid (node's process.pid), taken over once that pid is gone.
// tools/rigcheck/lib.mjs carries the same function; it predates this module and the rig lane owns it.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCK = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), '.render.lock');

export const withRenderLock = async (fn) => {
  // Already inside tools/locked.sh: the shell holds the lock for us; waiting here would deadlock.
  if (process.env.RENDER_LOCK_HELD) return fn();
  for (;;) {
    try { mkdirSync(LOCK); break; } catch { /* held */ }
    let pid = NaN;
    try { pid = Number(readFileSync(path.join(LOCK, 'pid'), 'utf8')); } catch { /* no pid yet */ }
    let alive = true;
    if (pid) { try { process.kill(pid, 0); } catch { alive = false; } }
    if (pid && !alive) { rmSync(LOCK, { recursive: true, force: true }); continue; }
    await new Promise((r) => setTimeout(r, 5000));
  }
  writeFileSync(path.join(LOCK, 'pid'), String(process.pid));
  try { return await fn(); } finally { rmSync(LOCK, { recursive: true, force: true }); }
};
