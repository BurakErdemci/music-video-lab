// Inked cracks for the build (S81-S90): the seeded crack graph of vfx/CrackGrow, drawn as tapered, jagged, brush-edged
// shapes instead of uniform lines. Width tapers to every tip and opens with age, each fork throws a few chips, the edge is
// roughened by an SVG filter on the strokes only (never on the WebGL canvas, whose filters rendered as mosaic frames).
import { crackGraph, crackStep, INK, InkFilter, inkFilterId, IVORY, Overlay, seeded, type CrackSegment } from '../../vfx/effects.ts';
import type { Box } from './lib.ts';
import { clamp01 } from './lib.ts';

type P = [number, number];

export interface InkCrackProps {
  frame: number;
  cues: readonly number[];
  seed: number;
  origin: P;
  escapeAt: number;
  escapeDir: number;
  box: Box;
  /** inside: only what is on the card; outside: only what has run off it; all: both. */
  surface: 'inside' | 'outside' | 'all';
  /** Trunk width, px. */
  width: number;
  id: string;
}

const DEPTH_K = [1, 0.62, 0.4];
const key = (p: P): string => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;

/** A tapered polygon along a jagged polyline: width wa at the start, wb at the end. */
const taper = (pts: P[], wa: number, wb: number): string => {
  const left: P[] = [];
  const right: P[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)] as P;
    const b = pts[Math.min(pts.length - 1, i + 1)] as P;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    const t = i / (pts.length - 1);
    const w = (wa + (wb - wa) * t) / 2;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  });
  const all = [...left, ...right.reverse()];
  return `M${all.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
};

export const InkCrack = ({ frame, cues, seed, origin, escapeAt, escapeDir, box, surface, width, id }: InkCrackProps) => {
  const { step, partial } = crackStep(frame, cues);
  if (!step) return null;
  const [bx, by, bw, bh] = box;
  const px = ([u, v]: P): P => [bx + u * bw, by + v * bh];
  const segs: CrackSegment[] = crackGraph(seed, cues.length, { origin, escapeAt, escapeDir }).filter((s) => s.step <= step);
  const starts = new Map<string, number>();
  segs.forEach((s) => {
    starts.set(key(s.a), (starts.get(key(s.a)) ?? 0) + 1);
  });
  const rng = seeded(`inkcrack:${seed}`);
  const shapes: string[] = [];
  const lips: string[] = [];
  const chips: string[] = [];
  const forkDone = new Set<string>();
  segs.forEach((s) => {
    const growing = s.step === step;
    const a = px(s.a);
    const full = px(s.b);
    const k = growing ? partial : 1;
    const b: P = [a[0] + (full[0] - a[0]) * k, a[1] + (full[1] - a[1]) * k];
    const leaf = growing || !starts.has(key(s.b));
    const age = 0.5 + 0.5 * clamp01((step - s.step) / 6);
    const w = Math.max(3, width * (DEPTH_K[s.depth] ?? 0.4) * age);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [nx, ny] = len ? [-(b[1] - a[1]) / len, (b[0] - a[0]) / len] : [0, 0];
    // jag: two inner points pushed sideways by a seeded amount, so no segment is a straight stroke
    const j1 = rng.range(-0.12, 0.12) * len;
    const j2 = rng.range(-0.12, 0.12) * len;
    const pts: P[] = [a, [a[0] + (b[0] - a[0]) / 3 + nx * j1, a[1] + (b[1] - a[1]) / 3 + ny * j1], [a[0] + ((b[0] - a[0]) * 2) / 3 + nx * j2, a[1] + ((b[1] - a[1]) * 2) / 3 + ny * j2], b];
    const wb = leaf ? w * 0.1 : w * 0.82;
    shapes.push(taper(pts, w, wb));
    lips.push(taper(pts.map(([x, y]) => [x - 2.2, y - 2.2] as P), w * 1.5 + 2, wb * 1.4 + 1));
    // chips and splinters at a fork: small ink flakes thrown to both sides of the branch
    const fk = key(s.a);
    if ((starts.get(fk) ?? 0) >= 2 && !forkDone.has(fk)) {
      forkDone.add(fk);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let c = 0; c < 3; c++) {
        const side = c === 1 ? -1 : 1;
        const dist = w * rng.range(1.1, 2.4);
        const cx = a[0] + Math.cos(ang + side * rng.range(1.2, 1.9)) * dist;
        const cy = a[1] + Math.sin(ang + side * rng.range(1.2, 1.9)) * dist;
        const r = w * rng.range(0.45, 0.9);
        const rot = rng.range(0, Math.PI * 2);
        const tri = [0, 1, 2].map((m) => [cx + Math.cos(rot + m * 2.2) * r * (m === 1 ? 1.7 : 1), cy + Math.sin(rot + m * 2.2) * r * (m === 1 ? 1.7 : 1)] as P);
        chips.push(`M${tri.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`);
      }
    }
  });
  const fid = `${id}-${seed}-${surface}`;
  const rough = Math.max(2.5, width * 0.22);
  return (
    <Overlay>
      <defs>
        <InkFilter seed={seed} rough={rough} breakup={0.22} />
        <clipPath id={`${fid}-in`}>
          <rect x={bx} y={by} width={bw} height={bh} />
        </clipPath>
        <mask id={`${fid}-out`}>
          <rect x={-5000} y={-5000} width={12000} height={12000} fill="#fff" />
          <rect x={bx} y={by} width={bw} height={bh} fill="#000" />
        </mask>
      </defs>
      <g clipPath={surface === 'inside' ? `url(#${fid}-in)` : undefined} mask={surface === 'outside' ? `url(#${fid}-out)` : undefined}>
        <g filter={`url(#${inkFilterId(seed, rough, 0.22)})`}>
          {/* a hairline of paper on one lip, like broken paint catching light */}
          <path d={lips.join('')} fill={IVORY} />
          <path d={shapes.join('')} fill={INK} />
          <path d={chips.join('')} fill={INK} />
        </g>
      </g>
    </Overlay>
  );
};
