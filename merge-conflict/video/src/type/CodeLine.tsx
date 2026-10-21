// CodeLine: a line of code typing itself in the dark, one character per 16th note on the beat grid, with a
// line-number gutter and a cursor that blinks on the beats. Mono advances are fixed, so it lines up exactly
// with a DissolveText of the same text (mono face) that can break it apart later.
import { type Hex, mixHex } from '../lib/ease.ts';
import { beatPos } from '../timing.ts';
import { MONO, MONO_ADV } from './fonts.tsx';
import { GLOW } from './Svg.tsx';

export interface CodeLineSpec { gutter: string; text: string; color: Hex; gutterColor: Hex; x: number; y: number; size: number; t0: number; t1: number; perBeat: number }

/** Characters shown at t: perBeat characters per beat from t0. */
export const typedCount = (s: CodeLineSpec, t: number): number =>
  t < s.t0 ? 0 : Math.min(s.text.length, 1 + Math.floor((beatPos(t) - beatPos(s.t0)) * s.perBeat));

export const codeLineWidth = (s: CodeLineSpec): number => s.text.length * MONO_ADV * s.size;

export const CodeLine = ({ spec, t }: { spec: CodeLineSpec; t: number }) => {
  if (t < spec.t0 || t >= spec.t1) return null;
  const n = typedCount(spec, t);
  const shown = spec.text.slice(0, n);
  const left = spec.x - codeLineWidth(spec) / 2;
  const fr = beatPos(t) % 1;
  const cursorOn = n < spec.text.length || fr < 0.5;
  const gw = (spec.gutter.length + 1) * MONO_ADV * spec.size;
  return (
    <g fontFamily={MONO} fontSize={spec.size}>
      <text x={left - gw} y={spec.y} fill={spec.gutterColor} fillOpacity={0.85}>{spec.gutter}</text>
      {GLOW.slice(0, 2).map((g, k) => (
        <text key={k} x={left} y={spec.y} fill="none" stroke={spec.color} strokeOpacity={g.o * 0.8} strokeWidth={spec.size * g.w}>{shown}</text>
      ))}
      <text x={left} y={spec.y} fill={mixHex(spec.color, '#ffffff', 0.55)}>{shown}</text>
      {cursorOn && <rect x={left + n * MONO_ADV * spec.size + spec.size * 0.06} y={spec.y - spec.size * 0.78} width={spec.size * 0.5} height={spec.size * 0.95} fill={spec.color} />}
    </g>
  );
};
