// Dissolve: a word holds, then its letters break into seeded flying glyphs (NWF words dissolving into
// letters). Closed form: each letter and each spawned glyph is a function of the time since t1.
import { type Hex, inQuad, lerp, outQuad, ramp } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { type Face, familyOf, layout } from './fonts.tsx';

export interface DissolveSpec { id: string; text: string; t0: number; t1: number; x: number; y: number; size: number; color: Hex; face?: Face }
const GLYPHS = ['0', '1', '<', '>', '=', '{', '}', ';', '/', '#'];
const LIFE = 0.6;

export const DissolveText = ({ spec, t }: { spec: DissolveSpec; t: number }) => {
  if (t < spec.t0 || t >= spec.t1 + LIFE) return null;
  const face = spec.face ?? 'display';
  const { xs, ws, width } = layout(spec.text, spec.size, face);
  const u = Math.max(0, t - spec.t1);
  const k = outQuad(u / LIFE);
  const pop = outQuad((t - spec.t0) / (6 / 60));
  return (
    <g transform={`translate(${spec.x - width / 2} ${spec.y})`} fontFamily={familyOf(face)}>
      {[...spec.text].map((ch, i) => {
        const r = seeded(`dissolve-text:${spec.id}:${i}`);
        const cx = (xs[i] as number) + (ws[i] as number) / 2;
        const dx = r.range(-260, 260) * k;
        const dy = (r.range(-220, 60) * k) + 300 * inQuad(u / LIFE);
        const rot = r.range(-120, 120) * k;
        const glyphs = Array.from({ length: 5 }, (_, j) => {
          const g = seeded(`dissolve-glyph:${spec.id}:${i}:${j}`);
          const gk = outQuad(ramp(u, g.range(0, 0.12), LIFE * 0.8));
          if (u <= 0 || gk <= 0) return null;
          return (
            <text key={j} x={cx + g.range(-420, 420) * gk} y={g.range(-360, 200) * gk} fontSize={spec.size * g.range(0.18, 0.34)} fill={spec.color} opacity={1 - gk} textAnchor="middle">
              {g.pick(GLYPHS)}
            </text>
          );
        });
        return (
          <g key={i}>
            <text x={cx + dx} y={dy} fontSize={spec.size} fill={spec.color} stroke="#0b0614" strokeWidth={spec.size * 0.05} paintOrder="stroke" textAnchor="middle" opacity={(1 - k) * lerp(0, 1, pop)} transform={`rotate(${rot} ${cx + dx} ${dy - spec.size * 0.4})`}>
              {ch}
            </text>
            {glyphs}
          </g>
        );
      })}
    </g>
  );
};
