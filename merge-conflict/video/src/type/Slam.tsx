// Slam: scale 1.6 -> 1 in 8 frames at 60 fps, outQuad, no bounce (architecture.md "type/"). While held it
// keeps a slow 2 % push so the word never freezes; out is a 4-frame scale-up fade.
import { type Hex, lerp, outQuad, ramp } from '../lib/ease.ts';
import { type Face, familyOf } from './fonts.tsx';

export interface SlamSpec { text: string; t0: number; t1: number; x: number; y: number; size: number; color: Hex; ink?: Hex; rot?: number; anchor?: 'start' | 'middle' | 'end'; face?: Face }

export const slamScale = (t: number, t0: number): number => {
  const u = t - t0;
  return u < 8 / 60 ? lerp(1.6, 1, outQuad(u / (8 / 60))) : 1 + 0.02 * ramp(u, 8 / 60, 1.2);
};

export const Slam = ({ spec, t }: { spec: SlamSpec; t: number }) => {
  if (t < spec.t0 || t >= spec.t1 + 4 / 60) return null;
  const out = ramp(t, spec.t1, 4 / 60);
  const s = slamScale(t, spec.t0) * (1 + 0.15 * out);
  return (
    <g transform={`translate(${spec.x} ${spec.y}) rotate(${spec.rot ?? 0}) scale(${s})`} opacity={1 - out}>
      <text textAnchor={spec.anchor ?? 'middle'} fontFamily={familyOf(spec.face ?? 'display')} fontSize={spec.size} fill={spec.color} stroke={spec.ink ?? '#0b0614'} strokeWidth={spec.size * 0.06} strokeLinejoin="round" paintOrder="stroke" y={spec.size * 0.43}>
        {spec.text}
      </text>
    </g>
  );
};
