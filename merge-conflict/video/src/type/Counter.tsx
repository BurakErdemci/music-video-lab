// Counter: a racing number from `from` to `to` (verse 2's commit counter), inOutQuad, mono digits so the
// width never jumps. After landing it holds with a blinking cursor so the layer keeps moving.
import { type Hex, inOutQuad, lerp, mixHex } from '../lib/ease.ts';
import { MONO_ADV, MONO } from './fonts.tsx';
import { GLOW } from './Svg.tsx';

export interface CounterSpec { from: number; to: number; t0: number; t1: number; x: number; y: number; size: number; color: Hex; digits?: number; suffix?: string }

export const counterValue = (s: CounterSpec, t: number): number => Math.round(lerp(s.from, s.to, inOutQuad((t - s.t0) / (s.t1 - s.t0))));

export const Counter = ({ spec, t, until = Infinity }: { spec: CounterSpec; t: number; until?: number }) => {
  if (t < spec.t0 || t >= until) return null;
  const v = String(counterValue(spec, t)).padStart(spec.digits ?? 3, '0') + (spec.suffix ?? '');
  const w = v.length * MONO_ADV * spec.size;
  const cursor = t > spec.t1 && Math.floor(t * 3) % 2 === 0;
  return (
    <g transform={`translate(${spec.x - w / 2} ${spec.y})`} fontFamily={MONO} fontSize={spec.size}>
      {GLOW.map((g, k) => (
        <text key={k} fill="none" stroke={spec.color} strokeOpacity={g.o} strokeWidth={spec.size * g.w}>{v}</text>
      ))}
      <text fill={mixHex(spec.color, '#ffffff', 0.6)}>{v}</text>
      {cursor && <rect x={w + spec.size * 0.08} y={-spec.size * 0.72} width={spec.size * 0.45} height={spec.size * 0.8} fill={spec.color} />}
    </g>
  );
};
