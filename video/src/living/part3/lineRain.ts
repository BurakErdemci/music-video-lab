// Line-rain: a wall of pinned notes comes apart into falling lines of text, then thins into plain rain.
// Frame-pure: the picture is a function of (t, pour, rain, layer, seed); sprites are cached per size+seed.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { TEXT_FONT } from '../../style/fonts.ts';

export interface LineRainOpts {
  /** Seconds since the shot started (drives falling). */
  t: number;
  /** 0 = a still wall of pinned notes; rising to 1 = every note has come apart into falling text. */
  pour: number;
  /** 0 = text strips; 1 = they have thinned into plain rain streaks (cream, thin, fast, slanted ~6 deg). */
  rain: number;
  /** back = the wall itself + dense rain; front = a sparse set of bigger, faster strips in front. */
  layer: 'back' | 'front';
  seed?: string;
}

/** Recommended canvas px: the back canvas covers the room's back wall, the front one the frame. */
export const LINE_RAIN_SIZE: { back: [number, number]; front: [number, number] } = {
  back: [2400, 1350],
  front: [1920, 1080],
};

type Cv = HTMLCanvasElement;
const mk = (w: number, h: number): Cv => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};
const c2d = (c: Cv): CanvasRenderingContext2D => c.getContext('2d') as CanvasRenderingContext2D;
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number): number => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length] as T;

const SLANT = (6 * Math.PI) / 180;
const POUR_SECONDS = 3;

const CODE = [
  'for (let i = 0; i < n; i++) {',
  'const user = await db.get(id);',
  'if (!ok) return null;',
  'export default App;',
  'git commit -m "wip"',
  'def train(model, data):',
  'return res.json(rows);',
  '// TODO: düzelt',
  'SELECT * FROM notlar;',
  'while (true) { tick(); }',
  'import { useState } from "react";',
  'class Oyuncu extends Karakter {',
  'npm run build && deploy',
  'x = np.zeros((64, 64))',
  'catch (e) { log(e); }',
  'public void Update() {',
  'async function kaydet(veri) {',
  'let skor = 0;  skor += 10;',
];
const NOTES_TR = [
  'yarın test yaz',
  'neden çalışmıyor?',
  'fikir: gece modu',
  'toplantı 14:00',
  'ilk sürüm hazır',
  'bir daha deneyelim',
  'sabah erken kalk',
  'yedekle!!',
  'çok yorgunum ama olacak',
  'öğren, dene, tekrarla',
  'menü ekranı bitti',
  'hata: boş liste',
  'şarkı listesi → oyun',
  'bitirince uyuyacağım',
  'her şey burada',
  'bu hafta: seviye 3',
];

const line = (r: () => number, maxCh: number): string => {
  const s = r() < 0.55 ? pick(r, CODE) : pick(r, NOTES_TR);
  return s.length > maxCh ? s.slice(0, Math.max(3, maxCh)) : s;
};

const fontOf = (fs: number): string => `500 ${fs}px "${TEXT_FONT}", monospace`;
const charW = (ctx: CanvasRenderingContext2D, fs: number): number => {
  ctx.font = fontOf(fs);
  return ctx.measureText('M').width;
};

/** A vertical strip: the text chopped into short chunks, one per row, on a colour block. */
const makeVStrip = (r: () => number, color: string, fs: number, chunk: number, rows: number, text?: string): Cv => {
  const probe = c2d(mk(4, 4));
  const cw = charW(probe, fs);
  const lh = fs * 1.4;
  const w = chunk * cw + 7;
  const h = rows * lh + 6;
  const cv = mk(w, h);
  const x = c2d(cv);
  x.fillStyle = color;
  x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = palette.navy;
  x.font = fontOf(fs);
  x.textBaseline = 'middle';
  let src = text ?? '';
  for (let i = 0; i < rows; i++) {
    if (src.length < chunk) src += '  ' + line(r, 30);
    if (r() < 0.08) {
      src = src.slice(chunk);
      continue;
    }
    x.fillText(src.slice(0, chunk), 3.5 + (r() < 0.3 ? 1 : 0), 3 + (i + 0.5) * lh);
    src = src.slice(chunk);
  }
  return cv;
};

interface Band {
  hs: Cv; // horizontal band (a slice of the note, identical to it at rest)
  vs: Cv; // the vertical strip it turns into
  ox: number; // band centre relative to the note centre (before rotation)
  oy: number;
  w: number;
  h: number;
  delay: number;
  dx: number;
  rest: number;
  floorU: number;
}
interface Note {
  cx: number;
  cy: number;
  rot: number;
  w: number;
  h: number;
  rel: number;
  spr: Cv;
  bands: Band[];
  pinX: number;
  pinY: number;
  pinCream: boolean;
}
interface Drop {
  spr: Cv;
  x: number;
  v: number;
  off: number;
  vis: number; // density gate
  front: number; // pour-front gate
  far: number; // 1 = far (small, dim)
  len: number; // streak length at rain 1
  sw: number; // streak width at rain 1
  sa: number; // streak alpha at rain 1
}
interface Slip {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  color: string;
  u: number;
}
interface Scene {
  notes: Note[];
  drops: Drop[];
  slips: Slip[];
  sc: number;
}

const buildNote = (r: () => number, cx: number, cy: number, w: number, h: number, rel: number, sc: number): Note => {
  const yellow = r() < 0.55;
  const color = yellow ? palette.moonYellow : palette.cream;
  const nLines = 3 + Math.floor(r() * 4);
  const fs = Math.round(lerp(9, 12, r()) * Math.max(0.9, sc));
  const probe = c2d(mk(4, 4));
  const cw = charW(probe, fs);
  const rowH = h / nLines;
  const pad = 6;
  const spr = mk(w + pad * 2, h + pad * 2);
  const sx = c2d(spr);
  if (yellow) {
    sx.strokeStyle = 'rgba(243,239,228,0.55)';
    sx.lineWidth = 1.5;
    sx.strokeRect(pad + 3, pad + 3, w, h);
  }
  const bands: Band[] = [];
  for (let i = 0; i < nLines; i++) {
    const maxCh = Math.floor((w - 14) / cw);
    const text = line(r, maxCh);
    const hs = mk(w, rowH + 1);
    const hx = c2d(hs);
    hx.fillStyle = color;
    hx.fillRect(0, 0, hs.width, hs.height);
    hx.fillStyle = palette.navy;
    hx.font = fontOf(fs);
    hx.textBaseline = 'middle';
    hx.fillText(text, 7 + r() * 4, rowH * 0.5);
    sx.drawImage(hs, pad, pad + i * rowH);
    const chunk = 3 + Math.floor(r() * 2);
    const rows = 5 + Math.floor(r() * 9);
    const vs = makeVStrip(r, color, fs, chunk, rows, text + '  ' + line(r, 28));
    bands.push({
      hs,
      vs,
      ox: 0,
      oy: (i + 0.5) * rowH - h / 2,
      w,
      h: rowH + 1,
      delay: r() * 0.05,
      dx: (r() - 0.5) * 60 * sc,
      rest: (r() - 0.5) * 0.5,
      floorU: r(),
    });
  }
  return { cx, cy, rot: (r() - 0.5) * 0.12, w, h, rel, spr, bands, pinX: (r() - 0.5) * w * 0.3, pinY: -h / 2 + 5, pinCream: !yellow, };
};

const sceneCache = new Map<string, Scene>();

const buildScene = (key: string, cw: number, ch: number, layer: 'back' | 'front', seed: string): Scene => {
  const r = seeded(`${seed}|${layer}|${cw}x${ch}`);
  const sc = layer === 'back' ? cw / 2400 : cw / 1920;
  const notes: Note[] = [];
  const slips: Slip[] = [];
  const drops: Drop[] = [];
  if (layer === 'back') {
    const cols = 11;
    const rows = 6;
    const x0 = cw * 0.025;
    const x1 = cw * 0.7;
    const y0 = ch * 0.03;
    const y1 = ch * 0.72;
    const cellW = (x1 - x0) / cols;
    const cellH = (y1 - y0) / rows;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (r() < 0.12) continue;
        const w = lerp(105, 150, r()) * sc;
        const h = lerp(92, 138, r()) * sc;
        const cx = x0 + (i + 0.5) * cellW + (r() - 0.5) * cellW * 0.35;
        const cy = y0 + (j + 0.5) * cellH + (r() - 0.5) * cellH * 0.3;
        const rel = (j / (rows - 1)) * 0.62 + r() * 0.1 + 0.02;
        notes.push(buildNote(r, cx, cy, w, h, rel, sc));
      }
    }
    for (let i = 0; i < 120; i++) {
      slips.push({
        x: r() * cw,
        y: ch * (0.945 + 0.05 * r()),
        w: lerp(34, 100, r()) * sc,
        h: lerp(5, 11, r()) * sc,
        rot: (r() - 0.5) * 0.3,
        color: r() < 0.55 ? palette.moonYellow : palette.cream,
        u: r(),
      });
    }
  }
  // Ambient strips.
  const nDrops = layer === 'back' ? 340 : 14;
  const poolN = layer === 'back' ? 44 : 12;
  const pool: Cv[] = [];
  for (let i = 0; i < poolN; i++) {
    const color = r() < 0.62 ? palette.moonYellow : palette.cream;
    if (layer === 'back') {
      pool.push(makeVStrip(r, color, 8 + Math.floor(r() * 2), 2 + Math.floor(r() * 4), 6 + Math.floor(r() * 18), line(r, 30)));
    } else {
      pool.push(makeVStrip(r, color, 13 + Math.floor(r() * 2), 3 + Math.floor(r() * 3), 7 + Math.floor(r() * 8), line(r, 30)));
    }
  }
  // A few dark gaps so a figure in front stays readable.
  const gaps: Array<[number, number]> = [];
  if (layer === 'back') {
    for (let g = 0; g < 3; g++) {
      const gx = r() * cw;
      gaps.push([gx, gx + cw * lerp(0.05, 0.1, r())]);
    }
  }
  for (let i = 0; i < nDrops; i++) {
    let x = r() * cw;
    let tries = 0;
    while (gaps.some(([a, b]) => x > a && x < b) && r() < 0.88 && tries++ < 6) x = r() * cw;
    const far = layer === 'back' && r() < 0.35 ? 1 : 0;
    drops.push({
      spr: pick(r, pool),
      x,
      v: layer === 'back' ? lerp(520, 1150, r()) * sc * (far ? 0.7 : 1) : lerp(1800, 2600, r()) * sc,
      off: r() * 10000,
      vis: r(),
      front: 0.6 + 0.8 * r(),
      far,
      len: lerp(50, 140, r()) * sc * (layer === 'front' ? 2 : 1),
      sw: (far ? lerp(1, 1.6, r()) : lerp(1.4, 3, r())) * (layer === 'front' ? 1.2 : 1),
      sa: far ? lerp(0.35, 0.55, r()) : lerp(0.6, 0.95, r()),
    });
  }
  const scene: Scene = { notes, drops, slips, sc };
  sceneCache.set(key, scene);
  return scene;
};

const getScene = (cw: number, ch: number, layer: 'back' | 'front', seed: string): Scene => {
  const fontOk = typeof document !== 'undefined' && document.fonts.check(`12px "${TEXT_FONT}"`) ? 1 : 0;
  const key = `${seed}|${layer}|${cw}x${ch}|${fontOk}`;
  return sceneCache.get(key) ?? buildScene(key, cw, ch, layer, seed);
};

/** Draws a sprite centred at (cx, cy), scaled to (w, h), rotated by `rot`. */
const blit = (ctx: CanvasRenderingContext2D, spr: Cv, cx: number, cy: number, w: number, h: number, rot: number, alpha: number): void => {
  if (alpha <= 0.003) return;
  ctx.globalAlpha = alpha;
  if (rot === 0) {
    ctx.drawImage(spr, cx - w / 2, cy - h / 2, w, h);
    return;
  }
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  ctx.setTransform(cos, sin, -sin, cos, cx, cy);
  ctx.drawImage(spr, -w / 2, -h / 2, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

export const paintLineRain = (ctx: CanvasRenderingContext2D, cw: number, ch: number, o: LineRainOpts): void => {
  const { t, layer } = o;
  const pour = clamp01(o.pour);
  const rain = clamp01(o.rain);
  const seed = o.seed ?? 'lineRain';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  const S = getScene(cw, ch, layer, seed);
  const sc = S.sc;
  const ang = SLANT * rain;
  const cardK = 1 - smooth(0.05, 0.7, rain); // text strips fade out
  const streakK = smooth(0.2, 0.85, rain);
  const g = 2400 * sc;
  const floorBase = ch * 0.945;

  if (layer === 'back') {
    // Pile of flat slips along the bottom 6 %.
    const pileA = (1 - smooth(0.3, 0.9, rain)) * smooth(0.28, 0.5, pour);
    if (pileA > 0.01) {
      for (const s of S.slips) {
        const a = smooth(0.3 + 0.55 * s.u, 0.34 + 0.55 * s.u + 0.08, pour) * pileA;
        if (a < 0.01) continue;
        ctx.globalAlpha = a;
        ctx.setTransform(Math.cos(s.rot), Math.sin(s.rot), -Math.sin(s.rot), Math.cos(s.rot), s.x, s.y);
        ctx.fillStyle = s.color;
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    // The wall of notes: still cards, then bands falling.
    const wallA = 1 - smooth(0.0, 0.5, rain);
    for (const n of S.notes) {
      const released = pour > n.rel;
      const cos = Math.cos(n.rot);
      const sin = Math.sin(n.rot);
      // Pin stays on the wall.
      if (wallA > 0.01) {
        ctx.globalAlpha = wallA;
        ctx.fillStyle = n.pinCream ? palette.navy : palette.cream;
        const px = n.cx + n.pinX * cos - n.pinY * sin;
        const py = n.cy + n.pinX * sin + n.pinY * cos;
        ctx.beginPath();
        ctx.arc(px, py, 3.6 * sc + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!released) {
        blit(ctx, n.spr, n.cx, n.cy, n.spr.width, n.spr.height, n.rot, wallA);
        continue;
      }
      for (const b of n.bands) {
        const tau = Math.max(0, pour - n.rel - b.delay) * POUR_SECONDS;
        // Rest position of the band centre, rotated with the note.
        const bx = n.cx + b.ox * cos - b.oy * sin;
        const by = n.cy + b.ox * sin + b.oy * cos;
        const floorY = floorBase + ch * 0.045 * b.floorU;
        const m = smooth(0, 0.4, tau);
        const fall = 0.5 * g * tau * tau;
        const y = Math.min(by + fall, floorY);
        const v = by + fall >= floorY ? 0 : g * tau;
        const x = bx + b.dx * smooth(0, 1, tau);
        const land = smooth(floorY - 70 * sc, floorY, y);
        const vw = b.vs.width * (layer === 'back' ? 1 : 1);
        const vh = b.vs.height;
        const fw = lerp(b.w, vw, m);
        const fh = lerp(b.h, vh, m);
        const w = lerp(fw, b.w * 0.5, land);
        const h = lerp(fh, Math.max(5 * sc, b.h * 0.3), land);
        const rot = lerp(n.rot, b.rest, Math.max(m * 0.2, land));
        const a = 1 - smooth(0.3, 0.9, rain) * (land > 0.5 ? 1 : 0.6);
        // Motion smear: short trailing copies.
        const vFall = v * (1 - land);
        if (vFall > 350 && cardK > 0.05) {
          for (let k = 3; k >= 1; k--) {
            const ty = y - k * vFall * 0.011;
            blit(ctx, b.hs, x, ty, w, h, rot, a * [0, 0.3, 0.17, 0.08][k]! * (1 - m));
            blit(ctx, b.vs, x, ty, w, h, rot, a * [0, 0.3, 0.17, 0.08][k]! * m);
          }
        }
        if (m < 1) blit(ctx, b.hs, x, y, w, h, rot, a * (1 - m * m));
        if (m > 0) blit(ctx, b.vs, x, y, w, h, rot, a * m);
      }
    }
  }

  // Ambient falling strips / rain.
  const dens = layer === 'back' ? smooth(0.1, 0.85, pour) : 1;
  const frontY = ch * pour * 1.6;
  const gateLo = layer === 'front' ? 0.3 : 0;
  const frontA = layer === 'front' ? smooth(gateLo, gateLo + 0.15, pour) : 1;
  if (frontA > 0.01) {
    ctx.lineCap = 'butt';
    ctx.strokeStyle = palette.cream;
    for (const d of S.drops) {
      const sw0 = d.spr.width * (d.far ? 0.8 : 1);
      const sh0 = d.spr.height * (d.far ? 0.8 : 1);
      const speed = d.v * (1 + 0.35 * rain);
      const cyc = ch + sh0 + 80 * sc;
      const yTop = ((d.off + t * speed) % cyc) - sh0;
      let a: number;
      if (layer === 'back') {
        a = clamp01((dens - d.vis * 0.85) / 0.1) * clamp01((frontY * d.front - yTop) / 60);
      } else {
        a = frontA;
      }
      if (a < 0.01) continue;
      const w = lerp(sw0, Math.max(2, sw0 * 0.3), rain);
      const cy = yTop + sh0 / 2;
      const cx = d.x - Math.tan(ang) * cy;
      const dim = d.far ? 0.62 : 1;
      if (cardK > 0.02) {
        const A = a * cardK * dim;
        if (speed > 350) {
          for (let k = 3; k >= 1; k--) blit(ctx, d.spr, cx, cy - k * speed * 0.011, w, sh0, ang, A * [0, 0.28, 0.15, 0.07][k]!);
        }
        blit(ctx, d.spr, cx, cy, w, sh0, ang, A);
      }
      if (streakK > 0.02) {
        const L = lerp(sh0, d.len, streakK);
        const lw = lerp(2, d.sw, streakK);
        const dx = Math.sin(ang) * L * 0.5;
        const dy = Math.cos(ang) * L * 0.5;
        ctx.globalAlpha = a * streakK * d.sa;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy - dy + L * 0.0);
        ctx.lineTo(cx - dx, cy + dy);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
};
