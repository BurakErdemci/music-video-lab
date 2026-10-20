// Thick wet paint pouring out of the painting's frame (storyboard 2, N3: S92/X20, S115/X29).
// Liquid language, all geometry (no noise edge): a lip of paint overflowing the edge, gravity-led
// streams that narrow and end in a bulbous drip, drops that break free and splat on the floor,
// puddles, a glossy ivory highlight down every stream, a clean ink outline on gold paint.
// `cover` floods the whole frame in the same language and ends on solid ink.
import { useVideoConfig } from 'remotion';
import { seeded } from './seeded.ts';
import { blobPath, clamp01, easeInQuad, easeOutCubic, GOLD, INK, IVORY, Overlay, taperedPath, type Pt } from './style.tsx';

export interface PaintSpreadProps {
  /** Frame relative to the start. */
  frame: number;
  seed: number;
  /** 'pour' = out of one edge (the frame's bottom edge) down the wall; 'cover' = from all four edges until the frame is ink. */
  mode?: 'pour' | 'cover';
  /** Pour: the edge the paint overflows, px. */
  edge?: { x0: number; x1: number; y: number };
  /** Pour: y of the floor where streams pool and drops splat; omit to let them run off frame. */
  floor?: number;
  /** Pour: number of streams. */
  streams?: number;
  /** Stream colours in turn; gold-ish colours get the ink outline. */
  colors?: readonly string[];
  /** Widest stream, px. */
  width?: number;
  /** Stream run, px per frame. */
  speed?: number;
  /** Ink outline width on non-ink paint, px. */
  outline?: number;
  /** Cover: frames until the frame is solid ink. */
  duration?: number;
}

interface Stream { x: number; w: number; delay: number; speed: number; color: string; phase: number; amp: number; drops: number[]; stop: number }

const makeStreams = (seed: number, n: number, x0: number, x1: number, width: number, speed: number, colors: readonly string[], spread = 18): Stream[] => {
  const rng = seeded(`pour:${seed}`);
  return Array.from({ length: n }, (_, i) => ({
    // Uneven spacing and widths: real runs bunch where the paint is thickest.
    x: x0 + ((x1 - x0) * (i + 0.5 + rng.range(-0.45, 0.45))) / n,
    w: width * (rng() < 0.3 ? rng.range(0.25, 0.45) : rng.range(0.5, 1.1)),
    delay: rng.range(0, spread),
    speed: speed * rng.range(0.35, 1.3),
    // Fraction of the drop to the floor at which the run stalls; about a third never get there.
    stop: rng() < 0.35 ? rng.range(0.15, 0.6) : 1,
    color: colors[(i + rng.int(0, 1)) % colors.length] as string,
    phase: rng() * 6.3,
    amp: rng.range(0.1, 0.35),
    drops: Array.from({ length: rng.int(0, 2) }, () => rng.range(16, 40)),
  }));
};

const STEPS = 12;
const xAt = (s: Stream, y: number, w: number): number => s.x + s.amp * w * Math.sin(y / 85 + s.phase);

/** Body (narrowing run + bulb), gloss stroke and bulb highlight of one stream of length `len` from `top`. */
const streamPaths = (s: Stream, top: number, len: number, w: number) => {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let k = 0; k <= STEPS; k++) {
    const y = top + (len * k) / STEPS;
    const ww = w * (1 - (0.62 * k) / STEPS);
    const xc = xAt(s, y, w);
    left.push([xc - ww / 2, y]);
    right.push([xc + ww / 2, y]);
  }
  const tipY = top + len;
  const xe = xAt(s, tipY, w);
  const rb = w * 0.3;
  const by = tipY + rb * 0.4;
  // The bulb is wider than the neck: thick paint gathers at the bottom of a run before it drops.
  const bulb = Array.from({ length: 7 }, (_, j): Pt => {
    const a = Math.PI - (Math.PI * j) / 6;
    return [xe + rb * Math.cos(a), by + rb * Math.sin(a)];
  });
  const body = blobPath([...left, ...bulb, ...right.reverse()]);
  const glossPts = Array.from({ length: 8 }, (_, k): Pt => {
    const y = top + len * (0.04 + (0.7 * k) / 7);
    const ww = w * (1 - (0.62 * (y - top)) / Math.max(1, len));
    return [xAt(s, y, w) - ww * 0.22, y];
  });
  return { body, gloss: len > w ? taperedPath(glossPts, w * 0.15, 0.25) : '', bulb: { x: xe, y: by, r: rb } };
};

const teardrop = (x: number, y: number, r: number): string =>
  blobPath([[x, y - r * 2.3], [x + r * 0.5, y - r * 1.1], [x + r, y], [x + r * 0.7, y + r * 0.75], [x, y + r], [x - r * 0.7, y + r * 0.75], [x - r, y], [x - r * 0.5, y - r * 1.1]]);

const isInk = (c: string): boolean => c.toUpperCase() === INK.toUpperCase();

interface Shape { d: string; color: string }

/** Everything one stream contributes at time t: puddle, body, falling drops, splats, gloss. */
const pourStream = (s: Stream, t: number, top: number, floor: number | undefined, seed: number, i: number) => {
  const back: Shape[] = [];
  const front: Shape[] = [];
  const gloss: string[] = [];
  const run = Math.max(0, t - s.delay);
  if (run <= 0) return { back, front, gloss };
  const rb = s.w * 0.3;
  const toFloor = floor === undefined ? Infinity : floor - top - rb * 1.2;
  const maxLen = s.stop < 1 && floor !== undefined ? toFloor * s.stop : toFloor;
  const len = Math.min(s.speed * run, maxLen);
  const landedAt = floor === undefined || s.stop < 1 ? Infinity : s.delay + maxLen / s.speed;
  const p = streamPaths(s, top, len, s.w);
  front.push({ d: p.body, color: s.color });
  gloss.push(p.gloss, `M${p.bulb.x - p.bulb.r * 0.38} ${p.bulb.y - p.bulb.r * 0.25}m-${p.bulb.r * 0.2} 0a${p.bulb.r * 0.2} ${p.bulb.r * 0.28} 0 1 0 ${p.bulb.r * 0.4} 0a${p.bulb.r * 0.2} ${p.bulb.r * 0.28} 0 1 0 -${p.bulb.r * 0.4} 0`);
  const splatRng = seeded(`splat:${seed}:${i}`);
  const splat = (x: number, y: number, size: number, age: number) => {
    // A flattened puddle plus a ring of small flung droplets that appear on impact.
    const rx = size * (0.8 + 1.6 * easeOutCubic(age / 10));
    back.push({ d: blobPath(Array.from({ length: 10 }, (_, j): Pt => [x + Math.cos((j / 10) * Math.PI * 2) * rx * (1 + 0.08 * Math.sin(j * 2.1 + x)), y + Math.sin((j / 10) * Math.PI * 2) * rx * 0.17])), color: s.color });
    for (let k = 0; k < 4; k++) {
      const dx = splatRng.range(1.1, 2.4) * size * splatRng.sign();
      const dy = -splatRng.range(0.1, 0.6) * size;
      const r = size * splatRng.range(0.06, 0.14);
      front.push({ d: blobPath(Array.from({ length: 6 }, (_, j): Pt => [x + dx + Math.cos(j) * r, y + dy + Math.sin(j) * r])), color: s.color });
    }
  };
  if (t > landedAt) splat(p.bulb.x, floor as number, s.w * 0.9 + (t - landedAt) * s.speed * 0.25, t - landedAt);
  for (const off of s.drops) {
    const ts = s.delay + off;
    if (t < ts || ts > landedAt) continue;
    // Breaks off the tip at ts, then falls under gravity faster than the run creeps.
    const y0 = top + Math.min(s.speed * off, maxLen) + rb * 1.4;
    if (floor !== undefined && y0 >= floor) continue;
    const dt = t - ts;
    const y = y0 + s.speed * dt + 0.9 * dt * dt;
    const r = s.w * 0.17;
    const x = xAt(s, y0, s.w);
    if (floor !== undefined && y + r >= floor) {
      // Time since impact: solve y0 + v*dt + 0.9*dt^2 = floor - r for the hit time.
      const hit = (-s.speed + Math.sqrt(s.speed * s.speed + 3.6 * (floor - r - y0))) / 1.8;
      splat(x, floor, s.w * 0.4, dt - hit);
    }
    else {
      front.push({ d: teardrop(x, y, r), color: s.color });
      gloss.push(`M${x - r * 0.35} ${y - r * 0.2}m-${r * 0.16} 0a${r * 0.16} ${r * 0.24} 0 1 0 ${r * 0.32} 0a${r * 0.16} ${r * 0.24} 0 1 0 -${r * 0.32} 0`);
    }
  }
  return { back, front, gloss };
};

/** A band of paint overflowing a horizontal edge, scalloped on its lower side. */
const lipPath = (x0: number, x1: number, y: number, h: number, seed: number, dir = 1): string => {
  const rng = seeded(`lip:${seed}`);
  const ph = rng() * 6.3;
  const pts: Pt[] = [[x0, y - 4 * dir], [x1, y - 4 * dir]];
  const n = Math.max(4, Math.round((x1 - x0) / 38));
  for (let k = n; k >= 0; k--) {
    const x = x0 + ((x1 - x0) * k) / n;
    // Sagging scallops, deeper here and there, thinning to nothing at both ends.
    const end = Math.sin((Math.PI * k) / n) ** 0.5;
    pts.push([x, y + dir * h * end * (0.45 + 0.55 * Math.abs(Math.sin(x / 47 + ph)) + 0.3 * rng())]);
  }
  return blobPath(pts);
};

const Paint = ({ shapes, outline }: { shapes: Shape[]; outline: number }) => (
  <>
    {shapes.map((s, i) => (
      <path key={i} d={s.d} fill={s.color} stroke={isInk(s.color) ? 'none' : INK} strokeWidth={outline} strokeLinejoin="round" />
    ))}
  </>
);

export const PaintSpread = ({ frame, seed, mode = 'pour', edge, floor, streams = 7, colors = [GOLD, INK], width = 70, speed = 9, outline = 5, duration = 40 }: PaintSpreadProps) => {
  const { width: W, height: H } = useVideoConfig();
  if (frame < 0) return null;
  const t = frame;
  if (mode === 'cover' && t >= duration) {
    return (
      <Overlay>
        <rect width={W} height={H} fill={INK} />
      </Overlay>
    );
  }
  const back: Shape[] = [];
  const front: Shape[] = [];
  const gloss: string[] = [];
  const lips: Shape[] = [];
  const add = (r: { back: Shape[]; front: Shape[]; gloss: string[] }) => (back.push(...r.back), front.push(...r.front), gloss.push(...r.gloss));
  let pool = '';
  if (mode === 'pour') {
    const e = edge ?? { x0: W * 0.3, x1: W * 0.7, y: H * 0.6 };
    makeStreams(seed, streams, e.x0, e.x1, width, speed, colors).forEach((s, i) => add(pourStream(s, t, e.y, floor, seed, i)));
    // The lip starts above the edge, so the paint visibly spills over the frame instead of sitting under it.
    lips.push({ d: lipPath(e.x0 - width * 0.2, e.x1 + width * 0.2, e.y - width * 0.25, width * 0.55 * easeOutCubic((t + 1) / 10), seed), color: colors[0] as string });
  } else {
    const k = clamp01(t / duration);
    // Top: a curtain of streams that widen until they merge.
    const curtain = makeStreams(seed, 16, -40, W + 40, width * 1.4, H / (duration * 0.55), colors, 6);
    curtain.forEach((s, i) => add(pourStream({ ...s, w: s.w * (1 + k * 2.2) }, t, 0, undefined, seed, i)));
    lips.push({ d: lipPath(-60, W + 60, 0, width * (0.6 + 2 * k), seed), color: colors[0] as string });
    // Sides: paint sheets creeping in from left and right.
    const side = (x: number, dir: number, c: string, s2: number) => {
      const rng = seeded(`side:${seed}:${s2}`);
      const ph = rng() * 6.3;
      const reach = W * 0.55 * easeInQuad(k) + 30;
      const pts: Pt[] = [[x, -20], [x, H + 20]];
      for (let j = 10; j >= 0; j--) {
        const y = (H * j) / 10;
        pts.push([x + dir * reach * (0.8 + 0.2 * Math.sin(y / 70 + ph)), y]);
      }
      front.push({ d: blobPath(pts), color: c });
    };
    side(-10, 1, INK, 1);
    side(W + 10, -1, colors[0] as string, 2);
    // Bottom: a pool of ink rising with a wavy, glossy surface.
    const level = H + 40 - (H + 120) * easeInQuad(k);
    const surf: Pt[] = Array.from({ length: 13 }, (_, j): Pt => [(W * j) / 12, level + 14 * Math.sin(j * 1.3 + t * 0.25)]);
    pool = blobPath([...surf, [W + 30, H + 30], [-30, H + 30]]);
    gloss.push(taperedPath(surf.map(([x, y]) => [x, y + 10] as Pt), 9, 0.5));
  }
  return (
    <Overlay>
      <Paint shapes={back} outline={outline} />
      <Paint shapes={front} outline={outline} />
      <Paint shapes={lips} outline={outline} />
      {pool ? <path d={pool} fill={INK} /> : null}
      {/* In cover the highlights die out as the flood closes, so the end frame is clean ink. */}
      <path d={gloss.join('')} fill={IVORY} opacity={mode === 'cover' ? 0.9 * (1 - clamp01(t / duration)) ** 1.5 : 0.9} />
    </Overlay>
  );
};
