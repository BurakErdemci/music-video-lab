// Scene transitions: SVG overlays that hide the film's hard cut from scene A to scene B at `at`.
// Every kind is a pure function of absolute time t (seconds); randomness only from seeded(), keyed by the spec id.
// Cover kinds are fully opaque at t === at and hold only saturated mid-to-dark fills (flash budget); the light
// parts (dots, streaks, edges) stay small in area. No SVG filters anywhere: glow is stacked strokes.
import type { ReactNode } from 'react';
import { H, W } from '../../camera/camera.ts';
import { clamp01, type Hex, inQuad, lerp, mixHex, outQuad, ramp } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { GLOW } from '../../type/Svg.tsx';

export type TransitionKind = 'streaks' | 'mirror' | 'shatter' | 'ink' | 'diff' | 'tunnel' | 'shock' | 'dissolve' | 'laser' | 'glitch' | 'fire' | 'tear';

export interface TransitionSpec {
  id: string;
  kind: TransitionKind;
  /** Cut time in seconds. */
  at: number;
  /** Seconds before the cut (default 6 frames; shock 0). */
  pre?: number;
  /** Seconds after the cut (default 10 frames; shock 14). */
  post?: number;
  /** [primary cover colour, accent]; give saturated mid-to-dark values. */
  colors: [Hex, Hex];
  /** Effect origin in frame pixels; default the frame centre. */
  origin?: [number, number];
  /** Tunnel only: '=' (default) is two bars with a gap, any other character a square window. */
  glyph?: string;
}

const FPS = 60;
const DARK = '#000000';
const LIGHT = '#ffffff';

export const transitionWindow = (s: TransitionSpec): [number, number] => {
  const shock = s.kind === 'shock';
  return [s.at - (s.pre ?? (shock ? 0 : 6 / FPS)), s.at + (s.post ?? (shock ? 14 : 10) / FPS)];
};

/** Progress inputs shared by all kinds: a rises 0..1 over the pre window, b 0..1 over the post window. */
interface Ctx {
  spec: TransitionSpec;
  a: number;
  b: number;
  ox: number;
  oy: number;
  /** Distance from the origin to the farthest frame corner. */
  reach: number;
  t: number;
}

const polyPts = (p: readonly (readonly [number, number])[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const polyPath = (p: readonly (readonly [number, number])[]) => `M${polyPts(p).replace(/ /g, ' L')}`;

/** A polyline stroked as glow layers plus the core. */
const GlowLine = ({ d, color, w }: { d: string; color: Hex; w: number }) => (
  <>
    {GLOW.map((g, k) => (
      <path key={k} d={d} fill="none" stroke={color} strokeOpacity={g.o} strokeWidth={w + g.w * 60} strokeLinecap="round" strokeLinejoin="round" />
    ))}
    <path d={d} fill="none" stroke={mixHex(color, LIGHT, 0.5)} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </>
);

const Veil = ({ color, opacity }: { color: Hex; opacity: number }) => <rect x={-20} y={-20} width={W + 40} height={H + 40} fill={color} opacity={opacity} />;

const Streaks = ({ spec, a, b, ox, oy, reach }: Ctx) => {
  const [c0, c1] = spec.colors;
  const rng = seeded(`streaks-${spec.id}`);
  const gid = `sk-${spec.id}`;
  const veil = b > 0 ? 1 - outQuad(b) : inQuad(a);
  const lines = Array.from({ length: 110 }, () => {
    const th = rng.range(0, Math.PI * 2);
    const ri0 = rng.range(40, 160);
    const roCut = ri0 + rng.range(0.35, 1) * reach * 0.95;
    const w = rng.range(2, 7);
    const col = rng() < 0.5 ? c1 : mixHex(c1, LIGHT, 0.6);
    const ri = b > 0 ? lerp(ri0, reach * 1.25, inQuad(b)) : ri0;
    const ro = b > 0 ? lerp(roCut, reach * 1.3, outQuad(b)) : lerp(ri0 + 30, roCut, a ** 1.5);
    return { th, ri, ro, w, col };
  });
  return (
    <g>
      <defs>
        <radialGradient id={gid} gradientUnits="userSpaceOnUse" cx={ox} cy={oy} r={reach}>
          <stop offset="0" stopColor={mixHex(c1, c0, 0.45)} />
          <stop offset="1" stopColor={mixHex(c0, DARK, 0.15)} />
        </radialGradient>
      </defs>
      <rect x={-20} y={-20} width={W + 40} height={H + 40} fill={`url(#${gid})`} opacity={veil} />
      {lines.map((l, i) => (
        <line key={i} x1={ox + Math.cos(l.th) * l.ri} y1={oy + Math.sin(l.th) * l.ri} x2={ox + Math.cos(l.th) * l.ro} y2={oy + Math.sin(l.th) * l.ro} stroke={l.col} strokeWidth={l.w} strokeLinecap="round" opacity={0.9} />
      ))}
    </g>
  );
};

const Mirror = ({ spec, a, b, t }: Ctx) => {
  const [c0, c1] = spec.colors;
  const rng = seeded(`mirror-${spec.id}`);
  const twinkle = seeded(`mirror-${spec.id}-${Math.floor(t * 30)}`);
  // Band centre on the diagonal axis d in [-1, 1] (frame corners); it is at 0 exactly at the cut.
  const p = b > 0 ? 1.4 * b : -1.4 * (1 - a);
  const veil = clamp01(1 - Math.abs(p) / 1.2) ** 0.6 * 0.97;
  const half = (W + H) * 0.35;
  const pitch = 60;
  const dots: ReactNode[] = [];
  for (let gy = 0; gy * pitch < H + pitch; gy++) {
    for (let gx = 0; gx * pitch < W + pitch; gx++) {
      const x = gx * pitch + rng.range(-8, 8);
      const y = gy * pitch + (gx % 2) * 30 + rng.range(-8, 8);
      const light = rng() < 0.5;
      const op = twinkle.range(0.7, 1);
      const d = ((x - W / 2) * 0.7071 + (y - H / 2) * 0.7071) / half - p;
      const r = 36 * Math.exp(-((d / 0.5) ** 2));
      if (r > 1) dots.push(<circle key={`${gx}-${gy}`} cx={x} cy={y} r={r} fill={light ? mixHex(c0, LIGHT, 0.55) : mixHex(c1, DARK, 0.15)} opacity={op} />);
    }
  }
  return (
    <g>
      <Veil color={mixHex(c0, DARK, 0.15)} opacity={veil} />
      {dots}
    </g>
  );
};

const SECTORS = 14;
const RINGS = 4;

const Shatter = ({ spec, a, b, ox, oy, reach }: Ctx) => {
  const [c0] = spec.colors;
  const rng = seeded(`shatter-${spec.id}`);
  const gid = `sh-${spec.id}`;
  const step = (Math.PI * 2) / SECTORS;
  // Jittered polar grid; ring RINGS lies beyond every frame corner so the shards tile the whole frame.
  const grid: [number, number][][] = Array.from({ length: SECTORS }, (_, j) =>
    Array.from({ length: RINGS + 1 }, (_, k) => {
      const th = (j + rng.range(-0.3, 0.3)) * step;
      const r = k === 0 ? 0 : k === RINGS ? reach + 80 : reach * (k / RINGS) ** 1.4 * rng.range(0.85, 1.15);
      return [ox + Math.cos(th) * r, oy + Math.sin(th) * r] as [number, number];
    }),
  );
  const tris: [number, number][][] = [];
  for (let j = 0; j < SECTORS; j++) {
    const g0 = grid[j] as [number, number][];
    const g1 = grid[(j + 1) % SECTORS] as [number, number][];
    tris.push([g0[0] as [number, number], g0[1] as [number, number], g1[1] as [number, number]]);
    for (let k = 1; k < RINGS; k++) {
      const [p0, p1, p2, p3] = [g0[k], g1[k], g1[k + 1], g0[k + 1]] as [number, number][];
      if (rng() < 0.5) tris.push([p0, p1, p2], [p0, p2, p3]);
      else tris.push([p0, p1, p3], [p1, p2, p3]);
    }
  }
  const cracks = b > 0 ? [] : makeCracks(spec.id, ox, oy, reach, outQuad(a));
  const edge = mixHex(c0, LIGHT, 0.8);
  const fade = b > 0 ? 1 : ramp(a, 0.5, 0.5);
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mixHex(c0, LIGHT, 0.3)} />
          <stop offset="0.5" stopColor={c0} />
          <stop offset="1" stopColor={mixHex(c0, DARK, 0.15)} />
        </linearGradient>
      </defs>
      {cracks.map((d, i) => (
        <GlowLine key={i} d={d} color={edge} w={3} />
      ))}
      {fade > 0 &&
        tris.map((v, i) => {
          const cx = (v[0][0] + v[1][0] + v[2][0]) / 3;
          const cy = (v[0][1] + v[1][1] + v[2][1]) / 3;
          const rs = seeded(`shatter-${spec.id}-${i}`);
          const dist = Math.hypot(cx - ox, cy - oy) || 1;
          const speed = rs.range(0.8, 1.3);
          const spin = rs.range(-140, 140);
          const q = outQuad(b);
          const tx = ((cx - ox) / dist) * reach * 0.9 * speed * inQuad(b);
          const ty = ((cy - oy) / dist) * reach * 0.9 * speed * inQuad(b) + 500 * b * b;
          const e = rs.int(0, 2);
          const [ea, eb] = [v[e], v[(e + 1) % 3]] as [number, number][];
          return (
            <g key={i} opacity={fade * (1 - ramp(b, 0.5, 0.5))} transform={`translate(${cx + tx},${cy + ty}) rotate(${spin * q}) scale(${1 - 0.3 * b}) translate(${-cx},${-cy})`}>
              <polygon points={polyPts(v)} fill={`url(#${gid})`} stroke={edge} strokeOpacity={0.55} strokeWidth={2} strokeLinejoin="round" />
              <line x1={ea[0]} y1={ea[1]} x2={eb[0]} y2={eb[1]} stroke={edge} strokeOpacity={0.8} strokeWidth={4} strokeLinecap="round" />
            </g>
          );
        })}
    </g>
  );
};

/** Jagged crack polylines from the origin, each trimmed to `grow` of its full length. */
const makeCracks = (id: string, ox: number, oy: number, reach: number, grow: number): string[] => {
  if (grow <= 0) return [];
  const rng = seeded(`cracks-${id}`);
  const out: string[] = [];
  const walk = (x: number, y: number, th: number, len: number, depth: number) => {
    const pts: [number, number][] = [[x, y]];
    let run = 0;
    while (run < len) {
      const seg = rng.range(50, 110);
      th += rng.range(-0.35, 0.35);
      x += Math.cos(th) * seg;
      y += Math.sin(th) * seg;
      run += seg;
      const over = run - len * grow;
      if (over > 0) {
        const keep = 1 - over / seg;
        if (keep <= 0) break;
        pts.push([lerp(pts[pts.length - 1]![0], x, keep), lerp(pts[pts.length - 1]![1], y, keep)]);
        break;
      }
      pts.push([x, y]);
      if (depth === 0 && rng() < 0.3) walk(x, y, th + rng.sign() * rng.range(0.5, 1), len * 0.35, 1);
    }
    if (pts.length > 1) out.push(polyPath(pts));
  };
  for (let i = 0; i < 11; i++) walk(ox, oy, (i + rng.range(-0.3, 0.3)) * ((Math.PI * 2) / 11), reach * rng.range(0.6, 1), 0);
  return out;
};

const Ink = ({ spec, a, b }: Ctx) => {
  const [c0, c1] = spec.colors;
  const cols = [c0, mixHex(c1, DARK, 0.15), mixHex(mixHex(c0, c1, 0.5), DARK, 0.15)];
  const centres = [100, 540, 980];
  const STEP = 40;
  const X0 = -300;
  const NX = Math.ceil((W + 600) / STEP);
  return (
    <g transform={`rotate(-4 ${W / 2} ${H / 2})`}>
      {cols.map((col, i) => {
        const rng = seeded(`ink-${spec.id}-${i}`);
        const dir = i === 1 ? -1 : 1;
        // Roughness is fixed per stroke so the edges stay put while the wipe front moves.
        const rough = Array.from({ length: NX + 1 }, () => [rng.range(-45, 45), rng.range(-45, 45)] as const);
        // Front (leading edge) in stroke-space px: all strokes enter before the cut; rears leave after it.
        const f0 = ramp(a, i * 0.1, 0.6);
        const front = lerp(X0, W + 300, outQuad(f0));
        const rear = lerp(X0, W + 300, inQuad(ramp(b, i * 0.12, 0.6)));
        if (front <= rear + 1) return null;
        const top: [number, number][] = [];
        const bot: [number, number][] = [];
        for (let k = 0; k <= NX; k++) {
          const u = Math.min(front, Math.max(rear, X0 + k * STEP));
          const env = clamp01(Math.min(front - u, u - rear) / 140);
          const half = 350 * Math.sqrt(env);
          const x = dir > 0 ? u : W - u;
          top.push([x, centres[i]! - half + rough[k]![0]]);
          bot.push([x, centres[i]! + half + rough[k]![1]]);
        }
        const shape = [...top, ...bot.reverse()];
        const hi = top.map(([x, y], k) => [x, y + 80 + (bot[bot.length - 1 - k]![1] - y) * 0.06] as [number, number]);
        return (
          <g key={i}>
            <polygon points={polyPts(shape)} fill={col} />
            <polyline points={polyPts(hi)} fill="none" stroke={mixHex(col, LIGHT, 0.25)} strokeWidth={14} strokeOpacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
};

const DIFF_ROWS = 12;
const DIFF_TEXT = ['const merged = ours ?? theirs;', 'if (a.id !== b.id) return null;', 'export const MERGE = resolve(HEAD);', 'while (conflicts.length) fix();', 'return state.filter(Boolean);', 'let tip = rebase(base, onto);', 'throw new Error("conflict");', 'await push({ force: false });'];

const Diff = ({ spec, a, b }: Ctx) => {
  const [del, ins] = spec.colors;
  const rh = H / DIFF_ROWS;
  return (
    <g>
      {Array.from({ length: DIFF_ROWS }, (_, i) => {
        const rng = seeded(`diff-${spec.id}-${i}`);
        const line = rng.pick(DIFF_TEXT);
        const frac = i / (DIFF_ROWS - 1);
        const slideIn = outQuad(ramp(a, frac * 0.6, 0.4));
        const out = inQuad(ramp(b, frac * 0.45, 0.5));
        const inserted = b > 0 && ramp(b, frac * 0.45, 0.5) > 0;
        const x = (1 - slideIn) * -W + out * W;
        if (slideIn <= 0 || out >= 1) return null;
        const base = inserted ? ins : del;
        return (
          <g key={i} transform={`translate(${x},${i * rh})`}>
            <rect x={0} y={0} width={W} height={rh + 1} fill={mixHex(base, DARK, 0.15)} />
            <rect x={0} y={0} width={14} height={rh + 1} fill={base} />
            <text x={50} y={rh * 0.66} fontFamily="monospace" fontSize={rh * 0.5} fill={mixHex(base, LIGHT, 0.55)}>
              {inserted ? '+ ' : '- '}
              {line}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/** Plates around a hole, in px about the origin: bars ('=') leave only a horizontal gap, otherwise a square window. */
const Tunnel = ({ spec, a, b, ox, oy }: Ctx) => {
  const [c0, c1] = spec.colors;
  const bars = (spec.glyph ?? '=') === '=';
  const S = 90 * (1700 / 90) ** a;
  // Outer extent 0.6S x 0.35S exceeds the frame at the cut scale; the hole is under 12 % of the frame there.
  const ex = 0.6 * S;
  const ey = 0.35 * S;
  const e = inQuad(b);
  const hy = lerp(bars ? 0.035 * S : 0.05 * S, 575, e);
  const hx = bars ? ex : lerp(0.05 * S, 995, e);
  const plates: [number, number, number, number][] = [
    [-ex, -ey, 2 * ex, ey - hy],
    [-ex, hy, 2 * ex, ey - hy],
  ];
  if (!bars) plates.push([-ex, -hy, ex - hx, 2 * hy], [hx, -hy, ex - hx, 2 * hy]);
  const rim = `M${ox - hx},${oy - hy} L${ox + hx},${oy - hy} L${ox + hx},${oy + hy} L${ox - hx},${oy + hy} Z`;
  return (
    <g opacity={ramp(a, 0, 0.3)}>
      {plates.map(([x, y, w, h], i) => (h > 0 && w > 0 ? <rect key={i} x={ox + x} y={oy + y} width={w} height={h} fill={c0} /> : null))}
      <GlowLine d={rim} color={c1} w={6} />
    </g>
  );
};

const Shock = ({ spec, b, ox, oy, reach }: Ctx) => {
  const [c0, c1] = spec.colors;
  const rng = seeded(`shock-${spec.id}`);
  const rings = [0, 1].map((i) => {
    const s = clamp01((b - i * 0.12) / (1 - i * 0.12));
    return s > 0 && s < 1 ? <circle key={i} cx={ox} cy={oy} r={reach * 0.7 * outQuad(s)} fill="none" stroke={i === 0 ? c1 : mixHex(c0, LIGHT, 0.4)} strokeWidth={lerp(34, 3, s)} opacity={1 - s} /> : null;
  });
  return (
    <g>
      {rings}
      {Array.from({ length: 30 }, (_, i) => {
        const th = rng.range(0, Math.PI * 2);
        const r0 = rng.range(60, 200) + rng.range(0.3, 1) * reach * 0.6 * outQuad(b);
        const r1 = r0 + rng.range(60, 300) * (1 - b);
        return <line key={i} x1={ox + Math.cos(th) * r0} y1={oy + Math.sin(th) * r0} x2={ox + Math.cos(th) * r1} y2={oy + Math.sin(th) * r1} stroke={mixHex(c1, LIGHT, 0.5)} strokeWidth={rng.range(2, 6)} strokeLinecap="round" opacity={1 - b} />;
      })}
    </g>
  );
};

const DIS_COLS = 24;
const DIS_ROWS = 14;

const Dissolve = ({ spec, a, b, ox, oy, reach }: Ctx) => {
  const [c0, c1] = spec.colors;
  const cw = W / DIS_COLS;
  const ch = H / DIS_ROWS;
  const squares: ReactNode[] = [];
  for (let r = 0; r < DIS_ROWS; r++) {
    for (let c = 0; c < DIS_COLS; c++) {
      const rng = seeded(`dissolve-${spec.id}-${r}-${c}`);
      const hx = (c + 0.5) * cw;
      const hy = (r + 0.5) * ch;
      const dx = hx - ox;
      const dy = hy - oy;
      const dist = Math.hypot(dx, dy) || 1;
      const away = rng.range(0.3, 0.9) * reach;
      const side = rng.range(-200, 200);
      const d1 = rng.range(0, 0.5);
      const d2 = rng.range(0, 0.5);
      const fill = mixHex(c0, c1, rng.range(0, 0.4));
      const p = b > 0 ? 1 : outQuad((a - d1) / (1 - d1));
      const q = clamp01((b - d2) / 0.5);
      const k = b > 0 ? inQuad(q) : 1 - p;
      const x = hx + (dx / dist) * away * k - (dy / dist) * side * k;
      const y = hy + (dy / dist) * away * k + (dx / dist) * side * k;
      const op = b > 0 ? 1 - ramp(q, 0.3, 0.7) : ramp(p, 0, 0.4);
      const sc = b > 0 ? 1 - 0.7 * q : 0.4 + 0.6 * p;
      if (op > 0) squares.push(<rect key={`${r}-${c}`} x={x - (cw * sc) / 2 - 2} y={y - (ch * sc) / 2 - 2} width={cw * sc + 4} height={ch * sc + 4} fill={fill} opacity={op} />);
    }
  }
  return <g>{squares}</g>;
};

/** Cover amount: rises to 1 at the cut, falls back after it. */
const coverOf = (c: Ctx) => (c.b > 0 ? 1 - c.b : c.a);

/** The a/b progress re-derived from time snapped to every `n` frames, plus the snap index (the seed key for stepped jitter). */
const stepped = (c: Ctx, n: number) => {
  const k = Math.floor(Math.round(c.t * FPS) / n);
  const tq = (k * n) / FPS;
  const [t0, t1] = transitionWindow(c.spec);
  const pre = c.spec.at - t0;
  return { k, a: pre > 0 ? ramp(tq, t0, pre) : 1, b: ramp(tq, c.spec.at, t1 - c.spec.at) };
};

const FullRect = ({ fill, opacity }: { fill: string; opacity: number }) => <rect x={-20} y={-20} width={W + 40} height={H + 40} fill={fill} opacity={opacity} />;

const LASER_BEAMS = 8;

/** Two emitters per side fan beams that sweep in, cross into a grid at the cut and sweep off the other way. */
const Laser = (ctx: Ctx) => {
  const { spec, a, b, t } = ctx;
  const [c0, c1] = spec.colors;
  const cover = coverOf(ctx);
  const gid = `lz-${spec.id}`;
  // Sweep offset in radians: zero at the cut, opposite directions before and after it.
  const sweep = b > 0 ? 0.9 * inQuad(b) : -0.9 * (1 - outQuad(a));
  const beams: ReactNode[] = [];
  for (const side of [1, -1]) {
    for (const e of [0, 1]) {
      for (let i = 0; i < LASER_BEAMS; i++) {
        const f = i / (LASER_BEAMS - 1);
        const th = (e === 0 ? lerp(-0.25, 1.3, f) : lerp(-1.3, 0.25, f)) + sweep * (e === 0 ? 1 : -1);
        const ox = side > 0 ? -60 : W + 60;
        const oy = H * (e === 0 ? 0.2 : 0.8);
        const op = ramp(cover, ((i + e * 3) / (LASER_BEAMS + 3)) * 0.4, 0.4);
        if (op <= 0) continue;
        // The slow shimmer keeps the grid alive between frames.
        const wob = 1 + 0.25 * Math.sin(t * 40 + i * 1.7 + e);
        const col = (i + e) % 2 ? mixHex(c0, LIGHT, 0.5) : c1;
        beams.push(
          <g key={`${side}-${e}-${i}`} opacity={op}>
            <GlowLine d={`M${ox},${oy} L${ox + Math.cos(th) * side * 2700},${oy + Math.sin(th) * 2700}`} color={col} w={3 * wob} />
          </g>,
        );
      }
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mixHex(c0, DARK, 0.05)} />
          <stop offset="0.5" stopColor={mixHex(mixHex(c0, c1, 0.35), DARK, 0.2)} />
          <stop offset="1" stopColor={mixHex(c1, DARK, 0.3)} />
        </linearGradient>
      </defs>
      <FullRect fill={`url(#${gid})`} opacity={cover ** 1.5} />
      {beams}
    </g>
  );
};

/** Horizontal slices with cyan/magenta fringes that slide in opposite directions in 2-frame steps. */
const Glitch = (ctx: Ctx) => {
  const { spec } = ctx;
  const [c0, c1] = spec.colors;
  const { k, a, b } = stepped(ctx, 2);
  const cover = coverOf(ctx);
  const rng = seeded(`glitch-${spec.id}`);
  const n = rng.int(10, 16);
  const weights = Array.from({ length: n }, () => rng.range(0.5, 1.5));
  const total = weights.reduce((s, w) => s + w, 0);
  const fills = [mixHex(c0, LIGHT, 0.3), mixHex(c1, DARK, 0.1), mixHex(c0, c1, 0.5)];
  const hold = Math.min(a, 1 - b);
  let y = 0;
  const slices = weights.map((w, i) => {
    const h = (w / total) * H;
    const y0 = y;
    y += h;
    const sw = W * rng.range(0.7, 1);
    const x0 = rng.range(-0.1, 1 - sw / W + 0.1) * W;
    const fill = rng.pick(fills);
    const dir = rng() < 0.5 ? -1 : 1;
    const r = seeded(`glitch-${spec.id}-${i}-${k}`);
    const slide = dir * W * 1.2 * (b > 0 ? inQuad(b) : 1 - outQuad(a));
    const off = slide + r.range(-1, 1) * 170 * hold;
    const split = (10 + r.range(0, 32)) * hold;
    return (
      <g key={i} transform={`translate(${off},0)`}>
        <rect x={x0 - split} y={y0} width={sw} height={h + 1} fill="#19e6ff" opacity={0.75} />
        <rect x={x0 + split} y={y0} width={sw} height={h + 1} fill="#ff2fd6" opacity={0.75} />
        <rect x={x0} y={y0} width={sw} height={h + 1} fill={fill} />
        <rect x={x0} y={y0} width={sw} height={4} fill={mixHex(fill, LIGHT, 0.6)} opacity={0.8} />
      </g>
    );
  });
  return (
    <g>
      <FullRect fill={mixHex(mixHex(c0, c1, 0.3), DARK, 0.55)} opacity={b > 0 ? 1 - ramp(b, 0, 0.5) : cover ** 1.5} />
      {slices}
    </g>
  );
};

const FIRE_LAYERS = [
  { base: '#8f1010', tip: '#c81e12', amp: 230, target: -150, rise: 0, burn: 0.25 },
  { base: '#d6480f', tip: '#ff7a1a', amp: 180, target: 0.3 * H, rise: 0.1, burn: 0.12 },
  { base: '#e8a014', tip: '#ffd23a', amp: 130, target: 0.78 * H, rise: 0.2, burn: 0 },
] as const;

/** Flame wall in three stacked layers (red leads, yellow trails); tongue heights re-seed every 3 frames. */
const Fire = (ctx: Ctx) => {
  const { spec, a, b } = ctx;
  const [c0, c1] = spec.colors;
  const k = stepped(ctx, 3).k;
  return (
    <g>
      {FIRE_LAYERS.map((L, l) => {
        const xr = seeded(`fire-${spec.id}-${l}`);
        const yr = seeded(`fire-${spec.id}-${l}-${k}`);
        const rise = outQuad(clamp01((a - L.rise) / (1 - L.rise)));
        const top = lerp(H + L.amp + 40, L.target, rise) - (b > 0 ? inQuad(b) * H * 1.2 : 0);
        const bot = b > 0 ? lerp(H + 400, -400, inQuad(clamp01((b - L.burn) / (1 - L.burn)))) : H + 400;
        if (bot <= top || (a <= 0 && b <= 0)) return null;
        const edge = (y: number) => {
          const pts: [number, number][] = [];
          for (let x = -80; x < W + 160; x += 80) {
            const jx = xr.range(-15, 15);
            pts.push([x + jx, y], [x + 40 + jx, y - L.amp * yr.range(0.3, 1)]);
          }
          return pts;
        };
        const topPts = edge(top);
        const botPts = edge(bot).reverse();
        const gid = `fr-${spec.id}-${l}`;
        const body = mixHex(mixHex(L.base, c0, 0.15), DARK, 0.05);
        return (
          <g key={l}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={mixHex(L.tip, c1, 0.12)} />
                <stop offset="0.35" stopColor={body} />
                <stop offset="1" stopColor={mixHex(body, DARK, 0.3)} />
              </linearGradient>
            </defs>
            <polygon points={polyPts([...topPts, ...botPts])} fill={`url(#${gid})`} />
          </g>
        );
      })}
    </g>
  );
};

/** Slabs between jagged diagonal cracks; they jolt in 2-frame steps, sit tight at the cut, then fall. */
const Tear = (ctx: Ctx) => {
  const { spec } = ctx;
  const [c0, c1] = spec.colors;
  const { k, a, b } = stepped(ctx, 2);
  const rng = seeded(`tear-${spec.id}`);
  const n = rng.int(3, 5);
  const lean = rng.sign() * W * 0.22;
  const ys: number[] = [];
  for (let y = -60; y < H + 120; y += 90) ys.push(y);
  const bounds: [number, number][][] = [ys.map((y) => [-600, y] as [number, number])];
  for (let i = 0; i < n; i++) {
    const xt = (W * (i + 1)) / (n + 1) + rng.range(-70, 70);
    const sl = lean + rng.range(-0.04, 0.04) * W;
    bounds.push(ys.map((y) => [xt + (sl * (y + 60)) / (H + 120) + rng.range(-34, 34), y] as [number, number]));
  }
  bounds.push(ys.map((y) => [W + 600, y] as [number, number]));
  const hold = Math.min(a, 1 - b);
  const slabs: ReactNode[] = [];
  for (let j = 0; j <= n; j++) {
    const lo = bounds[j]!;
    const hi = bounds[j + 1]!;
    const r = seeded(`tear-${spec.id}-${j}-${k}`);
    const ps = seeded(`tear-${spec.id}-fall-${j}`);
    const speed = ps.range(0.8, 1.25);
    const spin = ps.range(-14, 14);
    const drift = ps.range(-120, 120);
    const cx = (lo[0]![0] + hi[0]![0]) / 2;
    const fall = inQuad(b);
    const dy = (j % 2 ? 1 : -1) * H * 1.1 * (1 - outQuad(a)) + fall * H * 1.5 * speed + r.range(-1, 1) * 14 * hold;
    const dx = r.range(-1, 1) * 22 * hold + fall * drift;
    const gid = `tr-${spec.id}-${j}`;
    slabs.push(
      <g key={j} transform={`translate(${dx},${dy}) rotate(${spin * fall} ${cx} ${H / 2})`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={mixHex(mixHex(c0, c1, 0.15 + 0.5 * (j / n)), LIGHT, 0.12)} />
            <stop offset="1" stopColor={mixHex(c0, DARK, 0.3)} />
          </linearGradient>
        </defs>
        <polygon points={polyPts([...lo, ...hi.slice().reverse()])} fill={`url(#${gid})`} />
        <GlowLine d={polyPath(j < n ? hi : lo)} color={c1} w={5} />
      </g>,
    );
  }
  return (
    <g>
      <FullRect fill={mixHex(c0, DARK, 0.6)} opacity={b > 0 ? 1 - ramp(b, 0, 0.35) : a ** 1.2} />
      {slabs}
    </g>
  );
};

const KINDS: Record<TransitionKind, (c: Ctx) => ReactNode> = { streaks: Streaks, mirror: Mirror, shatter: Shatter, ink: Ink, diff: Diff, tunnel: Tunnel, shock: Shock, dissolve: Dissolve, laser: Laser, glitch: Glitch, fire: Fire, tear: Tear };

export const SceneTransition = ({ spec, t }: { spec: TransitionSpec; t: number }) => {
  const [t0, t1] = transitionWindow(spec);
  if (t < t0 || t > t1) return null;
  const [ox, oy] = spec.origin ?? [W / 2, H / 2];
  const pre = spec.at - t0;
  const post = t1 - spec.at;
  const ctx: Ctx = {
    spec,
    a: pre > 0 ? ramp(t, t0, pre) : 1,
    b: ramp(t, spec.at, post),
    ox,
    oy,
    reach: Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)),
    t,
  };
  return (
    <g>
      {KINDS[spec.kind](ctx)}
      {spec.kind !== 'shock' && <CoverLife ctx={ctx} />}
    </g>
  );
};

/** Life inside a cover: around the cut every cover kind is near full frame, and a flat single-colour frame reads
 *  as a dropout (round 6 review, 0:25 / 0:30 / 0:41 / 1:03). Moving light bands and drifting sparks in the accent
 *  colour ride on top while the cover is at its peak, so no frame of a cover is ever one flat colour. */
const CoverLife = ({ ctx }: { ctx: Ctx }) => {
  const { spec, t } = ctx;
  const peak = Math.min(ctx.a, 1 - ctx.b * 0.8);
  if (peak <= 0.02) return null;
  const [, accent] = spec.colors;
  const u = (t - spec.at) * 2.2;
  const r = seeded(`cover-life:${spec.id}`);
  return (
    <g opacity={0.55 * peak}>
      {[0, 1, 2, 3].map((i) => {
        const x = ((i * 0.3 + u) % 1.3) * (W + 800) - 600;
        return <rect key={i} x={x} y={-200} width={140 + i * 40} height={H + 400} fill={accent} opacity={0.22 + 0.08 * i} transform={`rotate(-18 ${x} ${H / 2})`} />;
      })}
      {Array.from({ length: 36 }, (_, i) => {
        const sx = r() * W;
        const sy = r() * H;
        const v = r.range(260, 620);
        const x = (sx + (t - spec.at) * v) % W;
        const y = (sy - (t - spec.at) * v * 0.4 + H) % H;
        return <circle key={`s${i}`} cx={x} cy={y} r={r.range(3, 9)} fill={LIGHT} opacity={0.5} />;
      })}
    </g>
  );
};

/** Mirrors `children` into `wedges` rotating wedges about (cx, cy); odd wedges are reflected so the seams match. */
export const Kaleido = ({ t, at, dur, wedges, cx, cy, children }: { t: number; at: number; dur: number; wedges: number; cx: number; cy: number; children: ReactNode }) => {
  if (t < at || t > at + dur) return null;
  const step = 360 / wedges;
  const rot = (t - at) * 24;
  const opacity = ramp(t, at, dur * 0.25) * (1 - ramp(t, at + dur * 0.75, dur * 0.25));
  const id = `kal-${Math.round(cx)}-${Math.round(cy)}-${wedges}-${Math.round(at * 1000)}`;
  const R = 2400;
  const rad = (d: number) => (d * Math.PI) / 180;
  return (
    <g opacity={opacity}>
      <defs>
        {Array.from({ length: wedges }, (_, i) => (
          <clipPath key={i} id={`${id}-${i}`}>
            <polygon points={polyPts([[cx, cy], [cx + R * Math.cos(rad(i * step)), cy + R * Math.sin(rad(i * step))], [cx + R * Math.cos(rad((i + 1) * step)), cy + R * Math.sin(rad((i + 1) * step))]])} />
          </clipPath>
        ))}
      </defs>
      {Array.from({ length: wedges }, (_, i) => (
        <g key={i} clipPath={`url(#${id}-${i})`}>
          <g transform={`translate(${cx},${cy}) rotate(${i % 2 ? (i + 1) * step : i * step}) ${i % 2 ? 'scale(1,-1)' : ''} rotate(${rot}) translate(${-cx},${-cy})`}>{children}</g>
        </g>
      ))}
    </g>
  );
};
