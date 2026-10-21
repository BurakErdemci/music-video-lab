// Stamp: a plate copy multiplies on beats (the NWF "RIGHT ✓" plates). Copy i lands at times[i] with a
// 6-frame outQuad scale 1.35 -> 1; on every later beat all copies take a 5 % scale hit.
import { type Hex, lerp, mixHex, outQuad, ramp } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { DISPLAY, layout } from './fonts.tsx';

export interface StampSpec { id: string; label: string; times: readonly number[]; slots: readonly [number, number][]; size: number; color: Hex; t1: number }

export const CHECK = 'M -0.36 0.02 L -0.1 0.3 L 0.42 -0.34';

const Plate = ({ label, size, color }: { label: string; size: number; color: Hex }) => {
  const { width } = layout(label, size);
  const w = width + size * 1.55;
  const h = size * 1.3;
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={size * 0.16} fill="#08040f" fillOpacity={0.82} stroke={color} strokeWidth={size * 0.09} />
      <text x={-w / 2 + size * 0.35} y={size * 0.43} fontFamily={DISPLAY} fontSize={size} fill={mixHex(color, '#ffffff', 0.55)}>{label}</text>
      <path d={CHECK} transform={`translate(${w / 2 - size * 0.62} 0) scale(${size * 0.9})`} fill="none" stroke={color} strokeWidth={0.2} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
};

export const Stamp = ({ spec, t }: { spec: StampSpec; t: number }) => {
  if (spec.times.length > spec.slots.length) throw new Error(`stamp ${spec.id}: ${spec.times.length} times but ${spec.slots.length} slots`);
  if (t < (spec.times[0] ?? Infinity) || t >= spec.t1) return null;
  const last = [...spec.times].reverse().find((x) => x <= t) ?? 0;
  const hit = 1 + 0.05 * (1 - ramp(t, last, 5 / 60));
  return (
    <g>
      {spec.times.map((ti, i) => {
        if (t < ti) return null;
        const [x, y] = spec.slots[i] as [number, number];
        const r = seeded(`stamp:${spec.id}:${i}`);
        const land = outQuad((t - ti) / (6 / 60));
        const s = lerp(1.35, 1, land) * (ti === last ? 1 : hit);
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r.range(-7, 7)}) scale(${s})`} opacity={lerp(0.4, 1, land)}>
            <Plate label={spec.label} size={spec.size} color={spec.color} />
          </g>
        );
      })}
    </g>
  );
};
