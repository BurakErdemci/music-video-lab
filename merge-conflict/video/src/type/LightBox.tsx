// LightBox: a sign whose letters light one by one with a glow, one colour per word (architecture.md).
// Each letter flickers for its first 7 frames (seeded per frame), then hums. Unlit letters show as dim
// tubes so the rig reads as a sign before it lights. Optional t1 flickers the sign back off.
import { type Hex, mixHex } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { type Face, CAP, familyOf, layout } from './fonts.tsx';
import { slamScale } from './Slam.tsx';
import { GLOW } from './Svg.tsx';

export interface LightBoxSpec {
  id: string;
  words: readonly { text: string; color: Hex }[];
  /** Time the first letter lights, seconds. */
  t0: number;
  /** Seconds between letters. */
  stagger: number;
  t1?: number;
  x: number;
  y: number;
  size: number;
  face?: Face;
  /** Seconds before t0 the dark sign is already visible (default: always). */
  pre?: number;
  /** Slam the whole sign in (1.6 -> 1 in 8 frames) when its first letter lights. */
  slam?: boolean;
  /** Draw the box around the letters. */
  box?: boolean;
}

const FLICKER = 7 / 60;

/** 0 (dark) or a brightness, for a letter that lit at `on` (and goes off at `off`). */
const letterLevel = (id: string, i: number, t: number, on: number, off: number): number => {
  const step = Math.floor(t * 60);
  const flick = (from: number) => seeded(`lightbox:${id}:${i}:${step}:${from}`)() < 0.55;
  if (t < on) return 0;
  if (t < on + FLICKER) return flick(on) ? 1 : 0.15;
  if (t >= off) return t < off + FLICKER ? (flick(off) ? 0.8 : 0) : 0;
  return 0.9 + 0.1 * Math.sin(t * 7 + i * 1.7);
};

export const LightBox = ({ spec, t }: { spec: LightBoxSpec; t: number }) => {
  const face = spec.face ?? 'display';
  const text = spec.words.map((w) => w.text).join(' ');
  const colors: Hex[] = spec.words.flatMap((w, k) => [...w.text].map(() => w.color).concat(k < spec.words.length - 1 ? [w.color] : []));
  const { xs, width } = layout(text, spec.size, face, face === 'mono' ? 0 : 0.06);
  const off = spec.t1 ?? Infinity;
  if (t >= off + FLICKER || t < spec.t0 - (spec.pre ?? Infinity)) return null;
  const pad = spec.size * 0.35;
  const capH = spec.size * (face === 'mono' ? 0.7 : CAP);
  let lit = 0;
  return (
    <g transform={`translate(${spec.x} ${spec.y - capH / 2}) scale(${spec.slam && t >= spec.t0 ? slamScale(t, spec.t0) : 1}) translate(${-width / 2} ${capH / 2})`} fontFamily={familyOf(face)} fontSize={spec.size}>
      {spec.box && (
        <rect x={-pad} y={-capH - pad} width={width + 2 * pad} height={capH + 2 * pad} rx={spec.size * 0.08} fill="#07030c" fillOpacity={0.78} stroke="#3a2a4a" strokeWidth={spec.size * 0.035} />
      )}
      {[...text].map((ch, i) => {
        if (ch === ' ') return null;
        const on = spec.t0 + spec.stagger * lit++;
        const lv = letterLevel(spec.id, i, t, on, off);
        const c = colors[i] as Hex;
        const x = xs[i] as number;
        return (
          <g key={i}>
            <text x={x} y={0} fill="none" stroke={c} strokeOpacity={0.22} strokeWidth={spec.size * 0.03}>{ch}</text>
            {lv > 0 &&
              GLOW.map((g, k) => (
                <text key={k} x={x} y={0} fill="none" stroke={c} strokeOpacity={g.o * lv} strokeWidth={spec.size * g.w} strokeLinejoin="round">{ch}</text>
              ))}
            {lv > 0 && <text x={x} y={0} fill={mixHex(c, '#ffffff', 0.6)} fillOpacity={lv}>{ch}</text>}
          </g>
        );
      })}
    </g>
  );
};
