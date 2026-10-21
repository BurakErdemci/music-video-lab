// The transition library of the typography-led clip (scene-map.md "Transitions, the elite part").
// Every transition is a pure function of (t, its plan); outside its window it renders nothing (the forms on
// either side draw themselves). Durations are in frames at 60 fps and checked when a plan is built.
//  - LetterMorph: the letters of one word fly into the next word, reusing shared letters.
//  - MarkerWipe: a mask shaped like <<<<<<<, ======= or >>>>>>> sweeps the old layer off and the new one on.
//  - ThroughCounter: the old layer scales up about the counter of one letter (the O, A or D) until the hole
//    fills the frame; the new layout comes up behind it.
//  - TextShatter: the letters break into particles (from the glyph bitmaps) and re-form as the next word,
//    with the card dissolve's curves and frame limits.
//  - TypeWhip: a one-direction smear whip of a whole type layer, with speed lines.
import type { ReactNode } from 'react';
import { type Hex, clamp01, lerp, mixHex, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { checkDissolveFrames, dissolveCurves } from '../../particles/dissolve.tsx';
import glyphs from '../glyphs.json' with { type: 'json' };
import { capOf, type Face, familyOf, layout } from '../fonts.tsx';
import { INK } from '../forms/common.tsx';

export interface WordAt { text: string; x: number; y: number; size: number; face: Face; fill: Hex }
const frames = (id: string, n: number, lo: number, hi: number) => {
  if (n < lo || n > hi) throw new Error(`transition ${id}: ${n} frames (allowed ${lo}-${hi} at 60 fps)`);
  return n / 60;
};
const progress = (t: number, t0: number, dur: number) => clamp01((t - t0) / dur);
export const active = (t: number, t0: number, dur: number) => t >= t0 && t < t0 + dur;

// ---- letter morph ---------------------------------------------------------------------------------------
export interface MorphPlan { id: string; t0: number; dur: number; from: WordAt; to: WordAt }
export const morphPlan = (p: Omit<MorphPlan, 'dur'> & { frames?: number }): MorphPlan => ({ ...p, dur: frames(p.id, p.frames ?? 24, 16, 36) });

export const LetterMorph = ({ plan, t }: { plan: MorphPlan; t: number }) => {
  if (!active(t, plan.t0, plan.dur)) return null;
  const u = progress(t, plan.t0, plan.dur);
  const A = layout(plan.from.text, plan.from.size, plan.from.face);
  const B = layout(plan.to.text, plan.to.size, plan.to.face);
  const used = new Set<number>();
  // shared letters: each letter of the new word takes the first unused same letter of the old word
  const pairs = [...plan.to.text].map((ch, j) => {
    const i = [...plan.from.text].findIndex((c, n) => !used.has(n) && c.toUpperCase() === ch.toUpperCase());
    if (i >= 0) used.add(i);
    return { j, i };
  });
  const r = seeded(`morph:${plan.id}`);
  const fill = mixHex(plan.from.fill, plan.to.fill, outQuad(u));
  const out: ReactNode[] = [];
  pairs.forEach(({ j, i }) => {
    const delay = (j / Math.max(1, plan.to.text.length)) * 0.25;
    const k = outQuad(clamp01((u - delay) / (1 - delay)));
    const bx = plan.to.x + (B.xs[j] as number);
    const ch = plan.to.text[j] as string;
    if (i >= 0) {
      const ax = plan.from.x + (A.xs[i] as number);
      const lift = Math.sin(Math.PI * k) * -90;
      out.push(<text key={`m${j}`} x={lerp(ax, bx, k)} y={lerp(plan.from.y, plan.to.y, k) + lift} fontSize={lerp(plan.from.size, plan.to.size, k)} fontFamily={familyOf(k < 0.5 ? plan.from.face : plan.to.face)} fill={fill} stroke={INK} strokeWidth={6} paintOrder="stroke">{ch}</text>);
    } else {
      const sx = bx + r.range(-300, 300);
      const sy = plan.to.y + r.range(-400, -150);
      out.push(<text key={`n${j}`} x={lerp(sx, bx, k)} y={lerp(sy, plan.to.y, k)} fontSize={plan.to.size * lerp(0.3, 1, k)} fontFamily={familyOf(plan.to.face)} fill={plan.to.fill} opacity={k} stroke={INK} strokeWidth={6} paintOrder="stroke">{ch}</text>);
    }
  });
  [...plan.from.text].forEach((ch, i) => {
    if (used.has(i) || ch === ' ') return;
    const k = outQuad(u * 1.4);
    const ax = plan.from.x + (A.xs[i] as number);
    out.push(<text key={`o${i}`} x={ax + r.range(-260, 260) * k} y={plan.from.y + r.range(150, 380) * k * k} fontSize={plan.from.size} fontFamily={familyOf(plan.from.face)} fill={plan.from.fill} opacity={1 - k} transform={`rotate(${r.range(-90, 90) * k} ${ax} ${plan.from.y})`}>{ch}</text>);
  });
  return <g>{out}</g>;
};

// ---- conflict-marker wipe -------------------------------------------------------------------------------
export type Marker = '<' | '=' | '>';
export interface WipePlan { id: string; t0: number; dur: number; marker: Marker }
export const wipePlan = (p: Omit<WipePlan, 'dur'> & { frames?: number }): WipePlan => ({ ...p, dur: frames(p.id, p.frames ?? 22, 14, 36) });

const W = 1920;
const H = 1080;
/** The revealed region (the new layer) at progress u: a band edge shaped like the marker. */
const wipePath = (m: Marker, u: number): string => {
  const A = 140; // chevron depth
  const period = 135; // seven chevrons over the frame height, like `<<<<<<<`
  if (m === '=') {
    // ======= : horizontal bars sliding in from alternate sides
    const bars = 7;
    const h = H / bars;
    return Array.from({ length: bars }, (_, i) => {
      const k = clamp01(u * 1.25 - (i % 2) * 0.12);
      const w = W * k;
      const x = i % 2 ? W - w : 0;
      return `M${x} ${i * h} h${w} v${h * 0.82} h${-w} Z M${x} ${i * h + h * 0.82} h${w} v${h * 0.18} h${-w} Z`;
    }).join(' ');
  }
  const edge = lerp(-A, W + A, outQuad(u));
  const pts: string[] = [];
  for (let y = 0; y <= H; y += period / 2) {
    const tip = (y / (period / 2)) % 2 === 1;
    const x = m === '>' ? edge + (tip ? A : 0) : W - edge - (tip ? A : 0);
    pts.push(`${x.toFixed(1)} ${y}`);
  }
  return m === '>' ? `M-10 -10 L${pts.join(' L')} L-10 ${H + 10} Z` : `M${W + 10} -10 L${pts.join(' L')} L${W + 10} ${H + 10} Z`;
};

export const MarkerWipe = ({ plan, t, from, to, color }: { plan: WipePlan; t: number; from: ReactNode; to: ReactNode; color: Hex }) => {
  const u = progress(t, plan.t0, plan.dur);
  if (t < plan.t0) return <>{from}</>;
  if (t >= plan.t0 + plan.dur) return <>{to}</>;
  const d = wipePath(plan.marker, u);
  const id = `wipe-${plan.id}`;
  return (
    <g>
      <defs>
        <mask id={`${id}-new`} maskUnits="userSpaceOnUse" x={-50} y={-50} width={W + 100} height={H + 100}>
          <path d={d} fill="#fff" />
        </mask>
        <mask id={`${id}-old`} maskUnits="userSpaceOnUse" x={-50} y={-50} width={W + 100} height={H + 100}>
          <rect x={-50} y={-50} width={W + 100} height={H + 100} fill="#fff" />
          <path d={d} fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${id}-old)`}>{from}</g>
      <g mask={`url(#${id}-new)`}>{to}</g>
      <path d={d} fill="none" stroke={color} strokeWidth={10} strokeLinejoin="miter" opacity={Math.sin(Math.PI * u)} />
      <path d={d} fill="none" stroke="#ffffff" strokeWidth={3} strokeLinejoin="miter" opacity={Math.sin(Math.PI * u)} />
    </g>
  );
};

// ---- through the counter -------------------------------------------------------------------------------
export interface CounterPlan { id: string; t0: number; dur: number; center: [number, number]; hole: number }
export const counterPlan = (p: Omit<CounterPlan, 'dur'> & { frames?: number }): CounterPlan => ({ ...p, dur: frames(p.id, p.frames ?? 28, 20, 40) });
/** Centre of the counter (the hole) of letter i of a placed word, from its advances and cap height. */
export const counterOf = (w: WordAt, i: number): [number, number] => {
  const l = layout(w.text, w.size, w.face);
  return [w.x + (l.xs[i] as number) + (l.ws[i] as number) / 2, w.y - w.size * capOf(w.face) * 0.5];
};
/** Half-width (px) of the counter of letter i: a conservative share of its advance. */
export const holeOf = (w: WordAt, i: number): number => (layout(w.text, w.size, w.face).ws[i] as number) * 0.14;
const PUNCH = 0.8;
/** Scale of the old layer: exponential, reaching the scale at which the hole covers the whole frame (from
 *  the frame centre to a corner, plus margin) at 80 % of the move; after that the old layer is gone. */
export const counterScale = (u: number, hole: number): number => Math.exp(Math.log(1250 / hole) * Math.min(1, u / PUNCH) ** 2);

export const ThroughCounter = ({ plan, t, from, to }: { plan: CounterPlan; t: number; from: ReactNode; to: ReactNode }) => {
  if (t < plan.t0) return <>{from}</>;
  if (t >= plan.t0 + plan.dur) return <>{to}</>;
  const u = progress(t, plan.t0, plan.dur);
  const [cx, cy] = plan.center;
  const s = counterScale(u, plan.hole);
  // the hole travels to the frame centre as it opens, so the dive goes straight through it
  const k = outQuad(Math.min(1, u / PUNCH));
  const px = lerp(cx, 960, k);
  const py = lerp(cy, 540, k);
  const inS = lerp(0.55, 1, outQuad(clamp01((u - 0.35) / 0.65)));
  const inO = outQuad(clamp01((u - 0.3) / 0.4));
  return (
    <g>
      <g transform={`translate(960 540) scale(${inS}) translate(-960 -540)`} opacity={inO}>{to}</g>
      {/* the old layer fades while it grows: big letter stems sweeping the frame at full strength measured as
          5 flashes in a second (flashcheck, proof v4 15.2-16.2 s) */}
      {u < PUNCH && <g transform={`translate(${px} ${py}) scale(${s}) translate(${-cx} ${-cy})`} opacity={1 - clamp01((u - 0.2) / 0.5)}>{from}</g>}
    </g>
  );
};

// ---- shatter to particles and re-form --------------------------------------------------------------------
const G14 = glyphs.g14 as Record<string, string[]>;
export interface ShatterPlan { id: string; t0: number; scatter: number; gather: number; from: WordAt; to: WordAt }
export const shatterPlan = (p: Omit<ShatterPlan, 'scatter' | 'gather'> & { scatterFrames?: number; gatherFrames?: number }): ShatterPlan => {
  const s = p.scatterFrames ?? 24;
  const g = p.gatherFrames ?? 16;
  checkDissolveFrames(p.id, s, g);
  return { ...p, scatter: s / 60, gather: g / 60 };
};
export const shatterEnd = (p: ShatterPlan) => p.t0 + p.scatter + p.gather + 0.1;

/** The particle cells of a placed word (its glyphs as 10x14 bitmaps scaled into the cap box). */
const cellsOf = (w: WordAt): { x: number; y: number; s: number }[] => {
  const l = layout(w.text, w.size, w.face);
  const capH = w.size * capOf(w.face);
  const out: { x: number; y: number; s: number }[] = [];
  [...w.text].forEach((ch, n) => {
    const bm = G14[ch.toUpperCase()];
    if (!bm) return;
    const cw = ((l.ws[n] as number) * 0.92) / 10;
    const chh = capH / 14;
    bm.forEach((row, r) => [...row].forEach((b, c) => b === '1' && out.push({ x: w.x + (l.xs[n] as number) + c * cw, y: w.y - capH + r * chh, s: Math.max(cw, chh) })));
  });
  return out;
};

export const TextShatter = ({ plan, t }: { plan: ShatterPlan; t: number }) => {
  if (t < plan.t0 || t >= shatterEnd(plan)) return null;
  const A = cellsOf(plan.from);
  const B = cellsOf(plan.to);
  const n = Math.max(A.length, B.length);
  const r = seeded(`shatter:${plan.id}`);
  const u = t - plan.t0;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const a = A[Math.floor((i * A.length) / n)] as { x: number; y: number; s: number };
        const b = B[Math.floor((i * B.length) / n)] as { x: number; y: number; s: number };
        const ang = r() * Math.PI * 2;
        const dist = r.range(120, 520);
        const { pS, pG } = dissolveCurves(u, r() * 0.1, plan.scatter, plan.gather);
        const x = lerp(a.x + Math.cos(ang) * dist * pS, b.x, pG);
        const y = lerp(a.y + Math.sin(ang) * dist * pS * 0.7, b.y, pG);
        const s = lerp(a.s, b.s, pG) * (1 + 0.6 * pS * (1 - pG));
        const c = mixHex(plan.from.fill, plan.to.fill, pG);
        return <rect key={i} x={x} y={y} width={s * 0.9} height={s * 0.9} fill={mixHex(c, '#ffffff', 0.4 * pS * (1 - pG))} transform={`rotate(${360 * pS * (1 - pG) * (r() - 0.5)} ${x + s / 2} ${y + s / 2})`} />;
      })}
    </g>
  );
};

// ---- whip ----------------------------------------------------------------------------------------------
export interface WhipPlan { id: string; t0: number; dur: number; dir: 1 | -1 }
export const whipPlan = (p: Omit<WhipPlan, 'dur'> & { frames?: number }): WhipPlan => ({ ...p, dur: frames(p.id, p.frames ?? 12, 8, 16) });

export const TypeWhip = ({ plan, t, from, to, color }: { plan: WhipPlan; t: number; from: ReactNode; to: ReactNode; color: Hex }) => {
  if (t < plan.t0) return <>{from}</>;
  if (t >= plan.t0 + plan.dur) return <>{to}</>;
  const u = progress(t, plan.t0, plan.dur);
  const env = Math.sin(Math.PI * u);
  const sx = 1 + 0.9 * env;
  const out = u < 0.5;
  const dx = out ? plan.dir * 1400 * outQuad(u * 2) * 0.6 : -plan.dir * 1400 * (1 - outQuad((u - 0.5) * 2)) * 0.6;
  const r = seeded(`twhip:${plan.id}`);
  return (
    <g>
      <g transform={`translate(${960 + dx} 540) scale(${sx} 1) translate(-960 -540)`} opacity={out ? 1 - 0.3 * env : 1}>{out ? from : to}</g>
      <g opacity={env}>
        {Array.from({ length: 22 }, (_, i) => {
          const y = r.range(80, 1000);
          const len = r.range(300, 1100) * env;
          const x = r.range(0, 1920);
          return <line key={i} x1={x - len / 2} y1={y} x2={x + len / 2} y2={y} stroke={r() < 0.5 ? color : '#ffffff'} strokeWidth={r.range(2, 9)} strokeLinecap="round" />;
        })}
      </g>
    </g>
  );
};
