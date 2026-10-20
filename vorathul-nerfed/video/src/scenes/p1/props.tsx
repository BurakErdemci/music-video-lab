// Code-drawn fight props of part 1, as screen overlays in projected positions: hero magic (G22 stand-ins: bolt,
// beam, sigil circle), gold arrows (C06), sweat drops / KO stars / comic tears (C07), dust and smoke puffs (G24
// stand-ins) and the gold explosion. Drawn on twos by their callers.
import type { ReactNode } from 'react';
import { blobPath } from '../../vfx/style.tsx';
import { InkFilter, inkFilterId, Overlay, seeded } from '../../vfx/effects.ts';
import { clamp01, GOLD, GOLD_DEEP, INK, IVORY, lerp, outCubic, SKY, VIOLET } from './kit.tsx';

type Pt = [number, number];
const n = (v: number) => (Math.round(v * 10) / 10).toString();

/** Ink-edged group helper (one filter per seed). */
export const Inked = ({ seed, rough = 5, children }: { seed: number; rough?: number; children: ReactNode }) => (
  <g>
    <defs>
      <InkFilter seed={seed} rough={rough} breakup={0.15} />
    </defs>
    <g filter={`url(#${inkFilterId(seed, rough, 0.15)})`}>{children}</g>
  </g>
);

/** A mage bolt in flight from a to b over [t0, t1]; null once it has landed. */
export const Bolt = ({ f, t0, t1, a, b, size = 26, seed = 1 }: { f: number; t0: number; t1: number; a: Pt; b: Pt; size?: number; seed?: number }) => {
  if (f < t0 || f >= t1) return null;
  const t = outCubic((f - t0) / (t1 - t0));
  const x = lerp(a[0], b[0], t);
  const y = lerp(a[1], b[1], t);
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const s = size;
  return (
    <Inked seed={seed}>
      <g transform={`translate(${n(x)} ${n(y)}) rotate(${n(ang)})`}>
        <path d={`M${-s * 5} ${-s * 0.35}L${-s * 0.4} ${-s * 0.6}L${-s * 0.4} ${s * 0.6}L${-s * 5} ${s * 0.35}Z`} fill={GOLD} opacity={0.85} />
        <path d={`M${-s * 1.2} 0L0 ${-s}L${s * 1.6} 0L0 ${s}Z`} fill={GOLD} stroke={INK} strokeWidth={s * 0.18} />
        <path d={`M${-s * 0.5} 0L0 ${-s * 0.42}L${s * 0.8} 0L0 ${s * 0.42}Z`} fill={IVORY} />
      </g>
    </Inked>
  );
};

/** The mage's gold beam: a ragged band with an ivory core, from a to b; `p` 0..1 grows it out. */
export const Beam = ({ a, b, width, p = 1, seed = 2, jitter = 0 }: { a: Pt; b: Pt; width: number; p?: number; seed?: number; jitter?: number }) => {
  const ex = lerp(a[0], b[0], clamp01(p));
  const ey = lerp(a[1], b[1], clamp01(p));
  const ang = Math.atan2(ey - a[1], ex - a[0]);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const band = (w: number) => `M${n(a[0] + nx * w * 0.3)} ${n(a[1] + ny * w * 0.3)}L${n(ex + nx * w)} ${n(ey + ny * w)}L${n(ex - nx * w)} ${n(ey - ny * w)}L${n(a[0] - nx * w * 0.3)} ${n(a[1] - ny * w * 0.3)}Z`;
  return (
    <Inked seed={seed + jitter} rough={width / 5}>
      <path d={band(width * 0.72)} fill={INK} />
      <path d={band(width * 0.6)} fill={GOLD} />
      <path d={band(width * 0.24)} fill={IVORY} />
    </Inked>
  );
};

/** A gold arrow at `p` pointing along `ang` (radians). */
export const Arrow = ({ p, ang, len = 90 }: { p: Pt; ang: number; len?: number }) => {
  const d = (ang * 180) / Math.PI;
  return (
    <g transform={`translate(${n(p[0])} ${n(p[1])}) rotate(${n(d)})`}>
      <path d={`M${-len} 0L0 0`} stroke={GOLD} strokeWidth={len * 0.06} strokeLinecap="round" />
      <path d={`M${len * 0.16} 0L${-len * 0.06} ${-len * 0.08}L${-len * 0.06} ${len * 0.08}Z`} fill={INK} />
      <path d={`M${-len} 0l${-len * 0.12} ${-len * 0.07}M${-len} 0l${-len * 0.12} ${len * 0.07}`} stroke={IVORY} strokeWidth={len * 0.04} />
    </g>
  );
};

/** The gold sigil circle on the floor: an ellipse `rx` x `ry` around c, drawn on as `p` goes 0..1. */
export const Sigil = ({ c, rx, ry, p, f, seed = 3 }: { c: Pt; rx: number; ry: number; p: number; f: number; seed?: number }) => {
  if (p <= 0) return null;
  const rays = 16;
  const rot = f * 0.6;
  return (
    <Inked seed={seed} rough={6}>
      <ellipse cx={c[0]} cy={c[1]} rx={rx} ry={ry} fill="none" stroke={GOLD} strokeWidth={ry * 0.12} pathLength={1} strokeDasharray={`${p} 2`} />
      <ellipse cx={c[0]} cy={c[1]} rx={rx * 0.72} ry={ry * 0.72} fill="none" stroke={GOLD} strokeWidth={ry * 0.06} pathLength={1} strokeDasharray={`${clamp01(p * 1.3 - 0.3)} 2`} />
      {Array.from({ length: rays }, (_, i) => {
        if (i / rays > p) return null;
        const a = ((i / rays) * 360 + rot) * (Math.PI / 180);
        return <path key={i} d={`M${n(c[0] + Math.cos(a) * rx * 0.76)} ${n(c[1] + Math.sin(a) * ry * 0.76)}L${n(c[0] + Math.cos(a) * rx * 0.96)} ${n(c[1] + Math.sin(a) * ry * 0.96)}`} stroke={IVORY} strokeWidth={ry * 0.07} />;
      })}
    </Inked>
  );
};

/** Sweat drops flying off a head (C07). */
export const Sweat = ({ c, s, t }: { c: Pt; s: number; t: number }) => {
  if (t < 0 || t > 20) return null;
  return (
    <g>
      {[-1, 1, 0.3].map((k, i) => {
        const x = c[0] + k * s * (0.5 + t * 0.04);
        const y = c[1] - s * 0.6 - s * 0.6 * Math.sin(Math.min(1, t / 10) * Math.PI) + t * t * 0.02 * s;
        return <path key={i} d={`M${n(x)} ${n(y - s * 0.28)}Q${n(x + s * 0.16)} ${n(y)} ${n(x)} ${n(y + s * 0.12)}Q${n(x - s * 0.16)} ${n(y)} ${n(x)} ${n(y - s * 0.28)}Z`} fill={SKY} stroke={INK} strokeWidth={s * 0.05} />;
      })}
    </g>
  );
};

/** KO stars circling a head. */
export const KoStars = ({ c, s, f }: { c: Pt; s: number; f: number }) => (
  <g>
    {[0, 1, 2].map((i) => {
      const a = f * 0.25 + (i * Math.PI * 2) / 3;
      const x = c[0] + Math.cos(a) * s * 0.7;
      const y = c[1] - s * 0.5 + Math.sin(a) * s * 0.22;
      const r = s * 0.16;
      let d = '';
      for (let k = 0; k < 10; k++) {
        const aa = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = k % 2 ? r * 0.45 : r;
        d += `${k ? 'L' : 'M'}${n(x + Math.cos(aa) * rr)} ${n(y + Math.sin(aa) * rr)}`;
      }
      return <path key={i} d={`${d}Z`} fill={GOLD} stroke={INK} strokeWidth={s * 0.04} />;
    })}
  </g>
);

/** Comic tears: two arcs of drops from the eyes. */
export const Tears = ({ c, s, t }: { c: Pt; s: number; t: number }) => {
  if (t < 0) return null;
  return (
    <g>
      {[-1, 1].map((side) =>
        [0, 1, 2].map((k) => {
          const tt = (t + k * 4) % 12;
          const x = c[0] + side * (s * 0.2 + tt * s * 0.05);
          const y = c[1] + (tt * tt) * s * 0.008;
          return <ellipse key={`${side}${k}`} cx={x} cy={y} rx={s * 0.07} ry={s * 0.1} fill={SKY} stroke={INK} strokeWidth={s * 0.025} />;
        }),
      )}
    </g>
  );
};

/** Ivory dust or smoke puffs with ink edges and a gold shadow band, expanding from c (age in frames). */
export const Puffs = ({ c, s, age, count = 7, seed = 4, life = 30, spread = 1 }: { c: Pt; s: number; age: number; count?: number; seed?: number; life?: number; spread?: number }) => {
  if (age < 0 || age >= life) return null;
  const rng = seeded(`puff:${seed}`);
  const t = age / life;
  return (
    <Inked seed={seed + 50} rough={Math.max(3, s * 0.06)}>
      {Array.from({ length: count }, (_, i) => {
        const a = rng.range(-Math.PI, 0) * spread;
        const d = rng.range(0.4, 1.3) * s * outCubic(t * 1.4);
        const r = s * rng.range(0.3, 0.55) * (0.5 + t) * (1 - t * 0.5);
        const x = c[0] + Math.cos(a) * d * 1.6;
        const y = c[1] + Math.sin(a) * d * 0.6;
        const pts = Array.from({ length: 9 }, (_, k): Pt => {
          const aa = (k / 9) * Math.PI * 2;
          const rr = r * rng.range(0.8, 1.15);
          return [x + Math.cos(aa) * rr, y + Math.sin(aa) * rr];
        });
        return (
          <g key={i} opacity={1 - t * t}>
            <path d={blobPath(pts)} fill={IVORY} stroke={INK} strokeWidth={r * 0.12} />
            <path d={blobPath(pts.map(([px, py]) => [px, py + r * 0.35] as Pt))} fill={GOLD} opacity={0.55} transform={`translate(0 ${n(r * 0.15)})`} />
          </g>
        );
      })}
    </Inked>
  );
};

/** The sigil's gold explosion on him: a jagged gold fireball with ivory core and ink spikes. */
export const GoldBlast = ({ c, s, age, seed = 9 }: { c: Pt; s: number; age: number; seed?: number }) => {
  if (age < 0 || age > 22) return null;
  const rng = seeded(`blast:${seed}`);
  const t = age / 22;
  const r = s * (0.5 + 0.7 * outCubic(t * 2));
  const spikes = (rr: number, k: number, inner: number) => {
    let d = '';
    for (let i = 0; i < k * 2; i++) {
      const a = (i / (k * 2)) * Math.PI * 2;
      const q = i % 2 ? rr * inner : rr * rng.range(0.85, 1.25);
      d += `${i ? 'L' : 'M'}${n(c[0] + Math.cos(a) * q)} ${n(c[1] + Math.sin(a) * q * 0.85)}`;
    }
    return `${d}Z`;
  };
  return (
    <Inked seed={seed} rough={s * 0.05}>
      <g opacity={1 - clamp01((t - 0.6) / 0.4)}>
        <path d={spikes(r * 1.25, 18, 0.55)} fill={INK} />
        <path d={spikes(r, 16, 0.6)} fill={GOLD} />
        <path d={spikes(r * 0.62, 12, 0.6)} fill={GOLD_DEEP} opacity={0.5} />
        <path d={spikes(r * 0.48, 10, 0.65)} fill={IVORY} />
      </g>
    </Inked>
  );
};

/** A shattering cartoon shield (S24): the kite splits in four wedges that fly apart. */
export const ShieldShatter = ({ c, s, age }: { c: Pt; s: number; age: number }) => {
  if (age < 0 || age > 18) return null;
  const parts: Pt[][] = [
    [[0, 0], [-0.5, -0.6], [0, -0.6]], [[0, 0], [0, -0.6], [0.5, -0.6]], [[0, 0], [0.5, -0.6], [0.5, 0.1], [0, 0.9]], [[0, 0], [0, 0.9], [-0.5, 0.1], [-0.5, -0.6]],
  ];
  const dirs: Pt[] = [[-1, -1.2], [1, -1.3], [1.2, 0.4], [-1.1, 0.5]];
  return (
    <Inked seed={13}>
      {parts.map((poly, i) => {
        const dx = (dirs[i] as Pt)[0] * age * s * 0.09;
        const dy = (dirs[i] as Pt)[1] * age * s * 0.09 + age * age * s * 0.004;
        return <path key={i} d={`M${poly.map(([x, y]) => `${n(c[0] + x * s + dx)} ${n(c[1] + y * s + dy)}`).join('L')}Z`} fill={GOLD} stroke={INK} strokeWidth={s * 0.06} transform={`rotate(${(i % 2 ? 1 : -1) * age * 9} ${n(c[0] + dx)} ${n(c[1] + dy)})`} />;
      })}
    </Inked>
  );
};

/** A violet energy streak (his strikes): a tapered slash along a polyline. */
export const Slash = ({ pts, width, p = 1, color = VIOLET }: { pts: Pt[]; width: number; p?: number; color?: string }) => {
  const k = Math.max(2, Math.ceil(pts.length * clamp01(p)));
  const sub = pts.slice(0, k);
  const left: Pt[] = [];
  const right: Pt[] = [];
  sub.forEach((q, i) => {
    const a = sub[Math.max(0, i - 1)] as Pt;
    const b = sub[Math.min(sub.length - 1, i + 1)] as Pt;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const w = (width / 2) * Math.sin((Math.PI * (i + 0.5)) / sub.length);
    left.push([q[0] - ((b[1] - a[1]) / L) * w, q[1] + ((b[0] - a[0]) / L) * w]);
    right.push([q[0] + ((b[1] - a[1]) / L) * w, q[1] - ((b[0] - a[0]) / L) * w]);
  });
  const d = `M${[...left, ...right.reverse()].map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;
  return <path d={d} fill={color} />;
};

export { Overlay };
