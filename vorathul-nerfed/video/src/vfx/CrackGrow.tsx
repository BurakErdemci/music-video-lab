// A crack that grows one step per cue frame (storyboard 2, N5). The graph lives in the painting
// card's UV space (0-1), so the same crack can be drawn inside the painting, on the office's view
// of the card, and - once the trunk escapes past the card edge - on the wall around it.
import { seeded } from './seeded.ts';
import { clamp01, INK, InkFilter, inkFilterId, IVORY, Overlay, type Pt } from './style.tsx';

export interface CrackSegment {
  a: Pt;
  b: Pt;
  /** Step (1-based) on which this segment appears. */
  step: number;
  /** 0 = trunk, 1 = branch, 2 = twig. */
  depth: number;
}

export interface CrackOptions {
  /** Start point in UV. */
  origin: Pt;
  /** From this step on, the trunk heads for `escapeDir` with longer strides and leaves the card. */
  escapeAt?: number;
  /** Radians in UV space (0 = +u, PI/2 = +v). */
  escapeDir?: number;
}

interface Tip { p: Pt; dir: number; depth: number; trunk: boolean }

/** The whole crack, every step, as segments. Pure: same seed and options, same crack. */
export const crackGraph = (seed: number, steps: number, o: CrackOptions): CrackSegment[] => {
  const rng = seeded(`crack:${seed}`);
  const segs: CrackSegment[] = [];
  const start = rng() * Math.PI * 2;
  // A star of three cracks from the impact point; the first one is the trunk.
  let tips: Tip[] = [0, 1, 2].map((i) => ({ p: o.origin, dir: start + (i * Math.PI * 2) / 3 + rng.range(-0.3, 0.3), depth: i ? 1 : 0, trunk: i === 0 }));
  for (let s = 1; s <= steps; s++) {
    const next: Tip[] = [];
    for (const t of tips) {
      const escaping = t.trunk && o.escapeAt !== undefined && s >= o.escapeAt;
      let dir = t.dir + rng.range(-0.45, 0.45);
      if (escaping) dir = dir * 0.4 + (o.escapeDir ?? 0) * 0.6;
      const len = (escaping ? rng.range(0.09, 0.13) : rng.range(0.03, 0.065)) * (t.depth ? 0.75 : 1);
      let b: Pt = [t.p[0] + Math.cos(dir) * len, t.p[1] + Math.sin(dir) * len];
      // Only the escaping trunk may leave the card: before that the trunk turns back from the
      // edge, a branch that reaches it simply ends.
      const out = (q: Pt) => q[0] < 0.02 || q[0] > 0.98 || q[1] < 0.02 || q[1] > 0.98;
      if (!escaping && out(b)) {
        if (!t.trunk) continue;
        dir += Math.PI * 0.75;
        b = [t.p[0] + Math.cos(dir) * len, t.p[1] + Math.sin(dir) * len];
        if (out(b)) continue;
      }
      segs.push({ a: t.p, b, step: s, depth: t.depth });
      // Branches and twigs stop now and then; the trunk never does.
      if (t.depth > 0 && rng() < 0.22) continue;
      next.push({ ...t, p: b, dir });
      if (next.length < 9 && t.depth < 2 && rng() < 0.35) next.push({ p: b, dir: dir + rng.sign() * rng.range(0.5, 1.1), depth: t.depth + 1, trunk: false });
    }
    tips = next;
  }
  return segs;
};

/** How many steps are visible at `frame` and how far the newest one has grown (0-1, over `grow` frames). */
export const crackStep = (frame: number, cues: readonly number[], grow = 3): { step: number; partial: number } => {
  let step = 0;
  let last = 0;
  for (const c of cues) if (c <= frame) (step++, (last = c));
  return { step, partial: step ? clamp01((frame - last + 1) / grow) : 0 };
};

export interface CrackGrowProps {
  frame: number;
  /** One frame per step (e.g. the build's downbeats). */
  cues: readonly number[];
  seed: number;
  origin: Pt;
  escapeAt?: number;
  escapeDir?: number;
  /** The card's box in frame px: UV (0,0)-(1,1) maps onto it. */
  box: [number, number, number, number];
  /** Which part to draw: on the card, off the card (the wall), or both. */
  surface?: 'inside' | 'outside' | 'all';
  color?: string;
  /** Trunk width, px. */
  width?: number;
  id?: string;
}

export const CrackGrow = ({ frame, cues, seed, origin, escapeAt, escapeDir, box, surface = 'all', color = INK, width = 9, id = 'vfx-crack' }: CrackGrowProps) => {
  const { step, partial } = crackStep(frame, cues);
  if (!step) return null;
  const [bx, by, bw, bh] = box;
  const px = ([u, v]: Pt): Pt => [bx + u * bw, by + v * bh];
  const segs = crackGraph(seed, cues.length, { origin, escapeAt, escapeDir }).filter((s) => s.step <= step);
  const fid = `${id}-${seed}-${surface}`;
  const lines = segs.map((s) => {
    const a = px(s.a);
    const full = px(s.b);
    const k = s.step === step ? partial : 1;
    const b: Pt = [a[0] + (full[0] - a[0]) * k, a[1] + (full[1] - a[1]) * k];
    // Older segments have opened wider; branches are thinner than the trunk.
    const w = Math.max(2.5, width * [1, 0.6, 0.38][s.depth]! * (0.55 + 0.45 * clamp01((step - s.step) / 5)));
    return { a, b, w };
  });
  return (
    <Overlay>
      <defs>
        <InkFilter seed={seed} rough={3} breakup={0.1} />
        <clipPath id={`${fid}-in`}>
          <rect x={bx} y={by} width={bw} height={bh} />
        </clipPath>
        <mask id={`${fid}-out`}>
          <rect x={-5000} y={-5000} width={12000} height={12000} fill="#fff" />
          <rect x={bx} y={by} width={bw} height={bh} fill="#000" />
        </mask>
      </defs>
      <g clipPath={surface === 'inside' ? `url(#${fid}-in)` : undefined} mask={surface === 'outside' ? `url(#${fid}-out)` : undefined}>
        <g filter={`url(#${inkFilterId(seed, 3, 0.1)})`} strokeLinecap="round">
          {/* A hairline of paper on one lip of each crack, like broken paint catching light. */}
          {lines.map((l, i) => (
            <line key={`h${i}`} x1={l.a[0] - 2} y1={l.a[1] - 2} x2={l.b[0] - 2} y2={l.b[1] - 2} stroke={IVORY} strokeWidth={Math.max(2, l.w * 0.6)} />
          ))}
          {lines.map((l, i) => (
            <line key={i} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={color} strokeWidth={l.w} />
          ))}
        </g>
      </g>
    </Overlay>
  );
};
