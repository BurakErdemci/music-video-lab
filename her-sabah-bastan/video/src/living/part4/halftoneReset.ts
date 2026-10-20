// TRIAL (switchable, off in Part4a / Part4b): her morning reset as the print's own halftone. Instead of a white flash,
// her picture breaks into the navy and moon-yellow dots of a two-plate halftone screen, the dots let go and drain
// (shrinking, falling toward the bottom edge) until only clean cream paper is left, then the same dots are printed back
// onto their grid places (a sweep in the squeegee's direction) and turn back into the identical picture.
//
// Print, not particles: only the two inks on cream, dots only shrink or grow (never glow, never tint), the grid is
// fixed. Every dot's timing is a pure function of (window seed, grid cell); no state between frames.
//
// Pop-free by construction: at the first and the last frame of a window the picture is drawn through circle cut-outs
// that cover the whole region (radius > the hex grid's covering radius), i.e. the frame equals the plain picture.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { paintLayers } from '../compose2d.ts';
import { BEAT_FRAMES, D0, type Cam, type Layer, type Painter } from './common.ts';
import { SEAM, SPLIT_CAM } from './splitSet.ts';

/** One reset: lets go at `a` (picture intact), paper is empty on [e0, e1), the picture is whole again at `b`. */
export interface HtWindow {
  a: number;
  e0: number;
  e1: number;
  b: number;
  /** Frames: picture -> ink dots, one dot's drain, one dot's regrowth, ink dots -> picture. */
  brk: number;
  fallLen: number;
  growLen: number;
  set: number;
  /** How far a dot falls while it drains / drops into place, in grid steps. */
  fall: number;
  drop: number;
  seed: string;
}

export interface HtField {
  f: number;
  win: HtWindow;
  /** Picture until the paper is empty, and the picture the dots print back into (same size as the target). */
  before: HTMLCanvasElement;
  after: HTMLCanvasElement;
  /** Adds the region's outline to the current path (target pixels). */
  region: (ctx: CanvasRenderingContext2D) => void;
  /** Integer pixel box around the region. */
  box: { x0: number; y0: number; x1: number; y1: number };
  /** Grid origin and spacing in target pixels (hex grid: rows 0.866 step apart, odd rows offset half a step). */
  grid: { ox: number; oy: number; step: number };
  /** Unit vector the dots drain along. */
  fallDir: readonly [number, number];
  /** Unit vector of the rebuild sweep. */
  sweepDir: readonly [number, number];
  /** Yellow plate misregistration (target px), as the sun's plate in life.ts. */
  yellowShift: readonly [number, number];
  /** The paper the picture is printed on (the empty state), as RGB. */
  paper: Rgb;
}

// ---- windows, snapped to the beats (song frames)

const beatAt = (f: number): number => {
  const b = BEAT_FRAMES.find((x) => x >= f);
  if (b === undefined) throw new Error(`no beat at or after ${f}`);
  return b;
};
/** The full reset: lets go on a beat, the paper is empty on the next one, printed back by the one after. */
const full = (a: number, e0: number, b: number, seed: string): HtWindow => ({ a, e0, e1: e0 + 2, b, brk: 3, fallLen: 6, growLen: 5, set: 3, fall: 22, drop: 1.6, seed });
/** A short reset whose empty paper lands on `beat`: 14 frames on the two-beat days, 8 on the one-beat days. */
const short = (beat: number, fast: boolean, seed: string): HtWindow =>
  fast
    ? { a: beat - 3, e0: beat, e1: beat + 1, b: beat + 5, brk: 1, fallLen: 2, growLen: 2, set: 2, fall: 1, drop: 0.5, seed }
    : { a: beat - 6, e0: beat, e1: beat + 2, b: beat + 8, brk: 2, fallLen: 3, growLen: 3, set: 2, fall: 1.2, drop: 0.6, seed };

/**
 * The days montage (glassB, song 5650-5872). The days run two beats each, then one beat each, so a full drain on every
 * day would keep her side permanently empty: the FIRST morning (after day 0's print lands) and the LAST one (into
 * MERHABA) get the full reset over two beats (lets go on a beat, empty on the next, printed back by the one after);
 * every morning in between gets a short drain whose empty paper lands on the beat nearest the day's print landing
 * (where the white flash was), so she is whole for most of each day and the resets keep the beat.
 */
export const HER_RESETS: readonly HtWindow[] = [
  full(5664, 5678, 5692, 'p4:ht:her:0'),
  ...[5724, 5751, 5779, 5803, 5814, 5827, 5841].map((land, i) => short(beatAt(land - 6), land > 5790, `p4:ht:her:s${i}`)),
  full(5858, 5872, 5886, 'p4:ht:her:9'),
];

/** The reset room (reset.ts): the screen's reset wipes "Merhaba."; it lets go on the beat 7153, the paper is empty on
 *  the beat 7167 (where the white flash peaked and he is cut back to the mug), the cursor is printed back by 7181. */
export const SCREEN_RESET: HtWindow = full(7153, 7167, 7181, 'p4:ht:screen');

export const htWindowAt = (ws: readonly HtWindow[], f: number): HtWindow | undefined => ws.find((w) => f >= w.a && f < w.b);

// ---- inks

export type Rgb = readonly [number, number, number];
const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
export const CREAM = rgb(palette.cream);
const NAVY = rgb(palette.navy);
const YELLOW = rgb(palette.moonYellow);
const dot3 = (a: Rgb, b: Rgb): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Ink coverage of a mean colour: paper + n * (navy - paper) + y * (yellow - paper), least squares, clamped. */
const unmixer = (PAPER: Rgb) => {
  const DN = NAVY.map((v, i) => v - (PAPER[i] as number)) as unknown as Rgb;
  const DY = YELLOW.map((v, i) => v - (PAPER[i] as number)) as unknown as Rgb;
  const NN = dot3(DN, DN);
  const NY = dot3(DN, DY);
  const YY = dot3(DY, DY);
  const DET = NN * YY - NY * NY;
  return (r: number, g: number, b: number): [number, number] => {
  const v: Rgb = [r - PAPER[0], g - PAPER[1], b - PAPER[2]];
  const pn = dot3(DN, v);
  const py = dot3(DY, v);
  let n = (YY * pn - NY * py) / DET;
  let y = (NN * py - NY * pn) / DET;
  if (n < 0) {
    n = 0;
    y = py / YY;
  } else if (y < 0) {
    y = 0;
    n = pn / NN;
  }
  return [Math.min(1, Math.max(0, n)), Math.min(1, Math.max(0, y))];
  };
};

// ---- the cells of a picture (mean colour per hex cell via integral images)

interface Cell {
  x: number;
  y: number;
  /** Dot radii of the two plates at rest (px). */
  rn: number;
  ry: number;
  /** 0..1 position along the drain / the sweep, and the cell's own jitter. */
  down: number;
  across: number;
}

const ROW = Math.sqrt(3) / 2;
/** Covering radius of the hex grid is step / sqrt(3) = 0.577 step; the cut-outs start a little above it. */
const R_COVER = 0.62;
/** Dot radius at full coverage: area = coverage * cell area (step^2 * 0.866). */
const R_FULL = Math.sqrt(ROW / Math.PI);
const MIN_COVER = 0.05;

const cellsOf = (pic: HTMLCanvasElement, fd: HtField): Cell[] => {
  const { box, grid, fallDir, sweepDir } = fd;
  const PAPER = fd.paper;
  const unmix = unmixer(PAPER);
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const ctx = pic.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d context unavailable');
  const data = ctx.getImageData(box.x0, box.y0, w, h).data;
  // integral images, (w+1) x (h+1); integer sums fit 32 bits (2.6M px x 255 at most)
  const W1 = w + 1;
  const S = [new Uint32Array(W1 * (h + 1)), new Uint32Array(W1 * (h + 1)), new Uint32Array(W1 * (h + 1))] as const;
  for (let y = 0; y < h; y++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const a = (data[p + 3] as number) / 255;
      // transparent pixels read as paper
      r += Math.round((data[p] as number) * a + (PAPER[0] as number) * (1 - a));
      g += Math.round((data[p + 1] as number) * a + (PAPER[1] as number) * (1 - a));
      b += Math.round((data[p + 2] as number) * a + (PAPER[2] as number) * (1 - a));
      const o = (y + 1) * W1 + x + 1;
      S[0][o] = (S[0][o - W1] as number) + r;
      S[1][o] = (S[1][o - W1] as number) + g;
      S[2][o] = (S[2][o - W1] as number) + b;
    }
  }
  const sum = (k: 0 | 1 | 2, x0: number, y0: number, x1: number, y1: number): number => {
    const s = S[k];
    return (s[y1 * W1 + x1] as number) - (s[y0 * W1 + x1] as number) - (s[y1 * W1 + x0] as number) + (s[y0 * W1 + x0] as number);
  };
  const { ox, oy, step } = grid;
  const dy = step * ROW;
  const out: Cell[] = [];
  // extent of the box along the drain and the sweep (for 0..1 positions)
  const corners = [
    [box.x0, box.y0],
    [box.x1, box.y0],
    [box.x0, box.y1],
    [box.x1, box.y1],
  ] as const;
  const along = (d: readonly [number, number]) => {
    const v = corners.map((c) => c[0] * d[0] + c[1] * d[1]);
    return [Math.min(...v), Math.max(...v)] as const;
  };
  const [d0, d1] = along(fallDir);
  const [s0, s1] = along(sweepDir);
  const r0 = Math.floor((box.y0 - oy) / dy) - 1;
  const r1 = Math.ceil((box.y1 - oy) / dy) + 1;
  for (let row = r0; row <= r1; row++) {
    const cy = oy + row * dy;
    const shift = (((row % 2) + 2) % 2) * step * 0.5;
    const c0 = Math.floor((box.x0 - ox - shift) / step) - 1;
    const c1 = Math.ceil((box.x1 - ox - shift) / step) + 1;
    for (let col = c0; col <= c1; col++) {
      const cx = ox + shift + col * step;
      const x0 = Math.max(0, Math.min(w, Math.round(cx - step / 2 - box.x0)));
      const x1 = Math.max(0, Math.min(w, Math.round(cx + step / 2 - box.x0)));
      const y0 = Math.max(0, Math.min(h, Math.round(cy - dy / 2 - box.y0)));
      const y1 = Math.max(0, Math.min(h, Math.round(cy + dy / 2 - box.y0)));
      const n = (x1 - x0) * (y1 - y0);
      let rn = 0;
      let ry = 0;
      if (n > 0) {
        const [cn, cyl] = unmix(sum(0, x0, y0, x1, y1) / n, sum(1, x0, y0, x1, y1) / n, sum(2, x0, y0, x1, y1) / n);
        if (cn >= MIN_COVER) rn = step * R_FULL * Math.sqrt(cn);
        if (cyl >= MIN_COVER) ry = step * R_FULL * Math.sqrt(cyl);
      }
      out.push({
        x: cx,
        y: cy,
        rn,
        ry,
        down: ((cx * fallDir[0] + cy * fallDir[1]) - d0) / Math.max(1, d1 - d0),
        across: ((cx * sweepDir[0] + cy * sweepDir[1]) - s0) / Math.max(1, s1 - s0),
      });
    }
  }
  return out;
};

// ---- easing

const clamp01 = (u: number): number => (u < 0 ? 0 : u > 1 ? 1 : u);
const smooth = (u: number): number => u * u * (3 - 2 * u);
const outCubic = (u: number): number => 1 - Math.pow(1 - u, 3);

/** Per-cell jitter in 0..1 from the window's seed (seeded once per window, then an integer hash of the cell). */
const jitterOf = (seed: string) => {
  const s = Math.floor(seeded(seed)() * 4294967296) >>> 0;
  return (x: number, y: number): number => {
    let h = (s ^ Math.imul(Math.round(x * 8), 374761393) ^ Math.imul(Math.round(y * 8), 668265263)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
};

// ---- painting

const circlesPath = (ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number, number])[]): void => {
  ctx.beginPath();
  for (const [x, y, r] of pts) {
    if (r <= 0.15) continue;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
};

/** Paints the reset into ctx (target pixels) when f is inside the window; draws nothing outside it. */
export const paintHalftoneReset = (ctx: CanvasRenderingContext2D, fd: HtField): void => {
  const { f, win } = fd;
  if (f < win.a || f >= win.b) return;
  const step = fd.grid.step;
  const { brk, set, fallLen, growLen } = win;
  const jit = jitterOf(win.seed);

  ctx.save();
  ctx.beginPath();
  fd.region(ctx);
  ctx.clip();
  ctx.fillStyle = `rgb(${fd.paper[0]}, ${fd.paper[1]}, ${fd.paper[2]})`;
  ctx.fillRect(fd.box.x0, fd.box.y0, fd.box.x1 - fd.box.x0, fd.box.y1 - fd.box.y0);

  if (f >= win.e0 && f < win.e1) {
    ctx.restore();
    return;
  }
  const breaking = f < win.e0;
  const pic = breaking ? fd.before : fd.after;
  const cells = cellsOf(pic, fd);
  // q: share of the cut-out picture that has turned into flat ink dots (0 = the plain picture)
  const q = breaking ? smooth(clamp01((f - win.a) / brk)) : 1 - smooth(clamp01((f - (win.b - set) + 1) / set));
  const navy: [number, number, number][] = [];
  const yellow: [number, number, number][] = [];
  const cut: [number, number, number][] = [];
  const [fx, fy] = fd.fallDir;
  for (const c of cells) {
    const j = jit(c.x, c.y);
    let s = 1;
    let ox = 0;
    let oy = 0;
    if (breaking) {
      // bottom rows let go first: the picture pours out of the bottom edge
      const t0 = win.a + brk + (0.72 * (1 - c.down) + 0.28 * j) * Math.max(0, win.e0 - fallLen - win.a - brk);
      const u = clamp01((f - t0) / fallLen);
      s = 1 - smooth(u);
      const d = win.fall * step * u * u;
      ox = fx * d;
      oy = fy * d;
    } else {
      // printed back along the squeegee's direction, each dot dropping the last few px into its place
      const t1 = win.e1 + (0.8 * c.across + 0.2 * j) * Math.max(0, win.b - set - growLen - win.e1);
      const u = clamp01((f - t1) / growLen);
      s = outCubic(u);
      const d = -win.drop * step * (1 - u) * (1 - u);
      ox = fx * d;
      oy = fy * d;
    }
    if (c.rn > 0) navy.push([c.x + ox, c.y + oy, c.rn * s]);
    if (c.ry > 0) yellow.push([c.x + ox + fd.yellowShift[0], c.y + oy + fd.yellowShift[1], c.ry * s]);
    if (q < 1) cut.push([c.x, c.y, step * R_COVER + (Math.max(c.rn, c.ry) - step * R_COVER) * q]);
  }
  if (q < 1) {
    ctx.save();
    circlesPath(ctx, cut);
    ctx.clip();
    ctx.globalAlpha = 1 - q;
    ctx.drawImage(pic, 0, 0);
    ctx.restore();
  }
  if (q > 0) {
    ctx.globalAlpha = q;
    ctx.fillStyle = palette.moonYellow;
    circlesPath(ctx, yellow);
    ctx.fill();
    ctx.fillStyle = palette.navy;
    circlesPath(ctx, navy);
    ctx.fill();
  }
  ctx.restore();
};

/** A reusable offscreen canvas per key (one per picture role), sized on demand. */
const offscreen = new Map<string, HTMLCanvasElement>();
export const htCanvas = (key: string, w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
  let c = offscreen.get(key);
  if (!c) {
    c = document.createElement('canvas');
    offscreen.set(key, c);
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d context unavailable');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  return { canvas: c, ctx };
};

// ---- glassB: her side of the split during the days montage

/** Grid spacing on her side at SPLIT_CAM (screen px); the grid is anchored to the d = 0 plane so it rides the camera. */
const HER_STEP = 10;

/**
 * Her side's reset painter for song frame f, or undefined outside the reset windows. `layers` / `cam` are the picture
 * the frame shows (the stage, or one side of a squeegee pull); `key` names its offscreen picture canvas. Her room is
 * redrawn in 2D, broken into dots right of the seam, and the picture glass (the cracks) is drawn back over it: the
 * room drains behind the glass, the glass stays.
 */
export const herSideReset = (f: number, layers: readonly Layer[], cam: Cam, key: string): Painter | undefined => {
  const win = htWindowAt(HER_RESETS, f);
  if (!win) return undefined;
  return (ctx, w, h) => {
    const k = D0 / cam.z;
    // the seam column exactly as the white flash it replaces
    const sx = w / 2 + (SEAM - cam.x) * k;
    // Only layers that reach her side, and never his figure: painting a character a second time in a frame changes
    // the shared scratch canvases life.ts paints the next frame's characters through (measured: the notes on his body
    // drifted in sequence renders). Own canvas keys: painting the stage's sources here first would mark them painted
    // for this frame and ThreeStage would skip their texture upload.
    const reaches = (l: Layer): boolean => {
      if (l.id.startsWith('human')) return false;
      const s = D0 / (cam.z + l.d);
      const right = w / 2 + (l.x + l.w - cam.x) * s;
      return l.rot ? true : right > sx;
    };
    const own = (l: Layer): Layer => (l.src.kind === 'canvas' ? { ...l, src: { ...l.src, key: `${l.src.key}:ht${key}` } } : l);
    const room = layers.filter((l) => l.id !== 'pic-glass' && reaches(l)).map(own);
    const glass = layers.filter((l) => l.id === 'pic-glass').map(own);
    const pic = htCanvas(`p4:ht:her${key}`, w, h);
    paintLayers(pic.ctx, room, cam, f, w, h);
    const region = (c: CanvasRenderingContext2D): void => c.rect(sx, 0, w - sx, h);
    paintHalftoneReset(ctx, {
      f,
      win,
      before: pic.canvas,
      after: pic.canvas,
      region,
      box: { x0: Math.max(0, Math.floor(sx)), y0: 0, x1: w, y1: h },
      grid: { ox: sx, oy: h / 2 - cam.y * k, step: HER_STEP * (k / (D0 / SPLIT_CAM.z)) },
      fallDir: [0, 1],
      sweepDir: [1, 0],
      yellowShift: [2, -1.5],
      paper: CREAM,
    });
    ctx.save();
    ctx.beginPath();
    region(ctx);
    ctx.clip();
    paintLayers(ctx, glass, cam, f, w, h);
    ctx.restore();
  };
};

// ---- reset.ts: his screen's reset (the "Merhaba." she typed is wiped)

/** The screen's own paper: the mean colour of the bare screen inside its quad (measured once; desk2 is fixed). */
let SCREEN_PAPER: Rgb | null = null;
const screenPaper = (bare: HTMLCanvasElement, quad: readonly (readonly [number, number])[]): Rgb => {
  if (SCREEN_PAPER) return SCREEN_PAPER;
  const xs = quad.map((q) => q[0]);
  const ys = quad.map((q) => q[1]);
  // the middle half of the quad's box lies well inside the screen
  const x0 = Math.round((3 * Math.min(...xs) + Math.max(...xs)) / 4);
  const x1 = Math.round((Math.min(...xs) + 3 * Math.max(...xs)) / 4);
  const y0 = Math.round((3 * Math.min(...ys) + Math.max(...ys)) / 4);
  const y1 = Math.round((Math.min(...ys) + 3 * Math.max(...ys)) / 4);
  const d = (bare.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D).getImageData(x0, y0, x1 - x0, y1 - y0).data;
  const acc = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) acc[k] = (acc[k] as number) + (d[i + k] as number);
  const n = d.length / 4;
  SCREEN_PAPER = [Math.round((acc[0] as number) / n), Math.round((acc[1] as number) / n), Math.round((acc[2] as number) / n)];
  return SCREEN_PAPER;
};

/** Grid spacing in screen-canvas px: about 9-12 output px while the camera pushes in over the window. */
const SCREEN_STEP = 18;

export interface ScreenSet {
  /** The screen's inner quad in screen-canvas px (TL, TR, BR, BL), and its unit axes (u across, v down). */
  quad: readonly (readonly [number, number])[];
  u: readonly [number, number];
  v: readonly [number, number];
  /** The screen's own painter for a frame (letters + cursor, transparent elsewhere). */
  content: (g: number) => (ctx: CanvasRenderingContext2D) => void;
  /** The desk drawing and the sprite-px box the screen canvas covers (the paper behind the letters). */
  desk: HTMLImageElement;
  deskW: number;
  box: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * The screen canvas painter for song frame f inside SCREEN_RESET, else undefined. The letters as they stood when the
 * reset lets go break into dots and drain toward the screen's bottom edge; the screen is printed back as it is after
 * the reset (the cursor alone).
 */
export const screenReset = (f: number, set: ScreenSet): ((ctx: CanvasRenderingContext2D) => void) | undefined => {
  const win = htWindowAt([SCREEN_RESET], f);
  if (!win) return undefined;
  return (ctx) => {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const s = (set.desk.naturalWidth || set.deskW) / set.deskW;
    const region = (c: CanvasRenderingContext2D): void => {
      set.quad.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.closePath();
    };
    // The screen only (clipped to its quad, so the bezel never turns into dots), letters of frame g on it.
    const picture = (key: string, g: number | null): HTMLCanvasElement => {
      const p = htCanvas(key, cw, ch);
      p.ctx.save();
      p.ctx.beginPath();
      region(p.ctx);
      p.ctx.clip();
      p.ctx.drawImage(set.desk, set.box.x0 * s, set.box.y0 * s, (set.box.x1 - set.box.x0) * s, (set.box.y1 - set.box.y0) * s, 0, 0, cw, ch);
      p.ctx.restore();
      if (g !== null) set.content(g)(p.ctx);
      return p.canvas;
    };
    const xs = set.quad.map((q) => q[0]);
    const ys = set.quad.map((q) => q[1]);
    paintHalftoneReset(ctx, {
      f,
      win,
      before: picture('p4:ht:scr:before', win.a),
      after: picture('p4:ht:scr:after', win.b),
      region,
      box: {
        x0: Math.max(0, Math.floor(Math.min(...xs))),
        y0: Math.max(0, Math.floor(Math.min(...ys))),
        x1: Math.min(cw, Math.ceil(Math.max(...xs))),
        y1: Math.min(ch, Math.ceil(Math.max(...ys))),
      },
      grid: { ox: (xs[0] as number), oy: (ys[0] as number), step: SCREEN_STEP },
      fallDir: set.v,
      sweepDir: set.u,
      yellowShift: [0, 0],
      paper: SCREEN_PAPER ?? screenPaper(picture('p4:ht:scr:paper', null), set.quad),
    });
  };
};
