// STAMP and EXTRUDE.
// STAMP: every word is a plate that lands on its measured start (6-frame outQuad 1.35 -> 1, seeded tilt);
//   the key plate is the biggest, carries a check, and multiplies on every following beat (NWF "RIGHT ✓").
// EXTRUDE: thick 2.5D letters turning in space: a stack of offset layers (the side wall, shaded) under the
//   front face; the turn is a closed-form swing, and each new word turns in. The key word stays once sung.
import { type Hex, lerp, mixHex, outQuad, ramp } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { beats, beatIndexAt } from '../../timing.ts';
import { capOf, type Face, familyOf, widthOf } from '../fonts.tsx';
import { CHECK } from '../Stamp.tsx';
import { clean, type FormSpec, INK, keyFill, keyIndex, solidAt, tokensOf, visible } from './common.tsx';

const PF: Face = 'bungee';

export const Stamp = ({ spec, t }: { spec: FormSpec; t: number }) => {
  if (!visible(spec, t)) return null;
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  const size = Math.min(spec.box.h / 7, spec.box.w / 9);
  // flow the plates through the box, the key plate on its own row
  type P = { i: number; x: number; y: number; w: number; s: number };
  const plates: P[] = [];
  let x = spec.box.x;
  let y = spec.box.y + size;
  toks.forEach((tk, i) => {
    const s = i === k ? size * 1.9 : size;
    const w = widthOf(clean(tk.text).toUpperCase(), s, PF) + s * (i === k ? 1.9 : 0.9);
    if (i === k || x + w > spec.box.x + spec.box.w) {
      x = spec.box.x;
      y += plates.length ? s * 1.6 : 0;
    }
    plates.push({ i, x, y, w, s });
    x += w + size * 0.3;
    if (i === k) {
      x = spec.box.x;
      y += s * 1.5;
    }
  });
  const keyTok = toks[k];
  const copies = keyTok ? beats.filter((b) => b > keyTok.start + 0.05 && b <= t && b < spec.t1).length : 0;
  const lastBeat = beats[beatIndexAt(t)] ?? 0;
  const hit = 1 + 0.06 * (1 - ramp(t, lastBeat, 5 / 60));
  const plate = (p: P, key: string, dx: number, dy: number, tilt: number, land: number) => {
    const tk = toks[p.i];
    const isKey = p.i === k;
    const color: Hex = isKey ? solidAt(spec.singer, t, 0) : solidAt(spec.singer, t, p.i);
    const cx = p.x + p.w / 2 + dx;
    const cy = p.y - p.s * 0.35 + dy;
    const s = lerp(1.35, 1, land) * (isKey ? hit : 1);
    return (
      <g key={key} transform={`translate(${cx} ${cy}) rotate(${tilt}) scale(${s})`} opacity={lerp(0.3, 1, land)}>
        <rect x={-p.w / 2} y={-p.s * 0.75} width={p.w} height={p.s * 1.5} rx={p.s * 0.18} fill="#08040f" fillOpacity={0.85} stroke={color} strokeWidth={p.s * 0.1} />
        <text x={-p.w / 2 + p.s * 0.45} y={p.s * 0.36} fontFamily={familyOf(PF)} fontSize={p.s} fill={mixHex(color, '#ffffff', 0.45)}>
          {clean(tk?.text ?? '').toUpperCase()}
        </text>
        {isKey && <path d={CHECK} transform={`translate(${p.w / 2 - p.s * 0.7} 0) scale(${p.s * 0.95})`} fill="none" stroke={color} strokeWidth={0.2} strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    );
  };
  return (
    <g>
      {plates.map((p) => {
        const tk = toks[p.i];
        if (!tk || t < tk.start) return null;
        const r = seeded(`stamp-form:${spec.id}:${p.i}`);
        return plate(p, `p${p.i}`, 0, 0, r.range(-5, 5), outQuad((t - tk.start) / (6 / 60)));
      })}
      {Array.from({ length: copies }, (_, c) => {
        const kp = plates.find((p) => p.i === k);
        const b = beats.filter((x) => keyTok && x > keyTok.start + 0.05)[c] ?? t;
        const r = seeded(`stamp-copy:${spec.id}:${c}`);
        if (!kp) return null;
        // copies tile the box below and beside the key plate, never outside it
        const perCol = Math.max(1, Math.floor((spec.box.y + spec.box.h - kp.y) / (kp.s * 1.7)));
        const col = Math.floor((c + 1) / perCol);
        const row = (c + 1) % perCol;
        const dx = Math.min(col * (kp.w * 0.55), Math.max(0, spec.box.w - kp.w));
        return plate(kp, `c${c}`, dx, row * kp.s * 1.7, r.range(-9, 9), outQuad((t - b) / (6 / 60)));
      })}
    </g>
  );
};

export interface ExtrudeOptions { size: number; face?: Face; depth?: number }

export const Extrude = ({ spec, t, opt }: { spec: FormSpec; t: number; opt: ExtrudeOptions }) => {
  if (!visible(spec, t)) return null;
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  const face = opt.face ?? 'display';
  const sung = toks.map((tk, i) => ({ tk, i })).filter((w) => t >= w.tk.start);
  const cur = sung.some((w) => w.i === k) ? k : (sung.at(-1)?.i ?? -1);
  const tk = toks[cur];
  if (!tk) return null;
  const text = clean(tk.text).toUpperCase();
  const size = Math.min(opt.size * (cur === k ? 1.35 : 1), (spec.box.w * 0.9) / widthOf(text, 1, face));
  const since = t - tk.start;
  // turn in from the side, then a slow closed-form sway
  const phi = 1.25 * (1 - outQuad(since / 0.35)) + 0.32 * Math.sin(t * 1.4);
  const depth = (opt.depth ?? 0.22) * size;
  const N = 16;
  const cx = spec.box.x + spec.box.w / 2;
  const cy = spec.box.y + spec.box.h / 2 + (size * capOf(face)) / 2;
  const color = solidAt(spec.singer, t, cur);
  const sx = Math.max(0.12, Math.cos(phi));
  const layer = (j: number, fill: string, stroke?: string) => (
    <text key={j} x={0} y={0} textAnchor="middle" fontFamily={familyOf(face)} fontSize={size} fill={fill} stroke={stroke ?? 'none'} strokeWidth={stroke ? size * 0.03 : 0} paintOrder="stroke" transform={`translate(${cx + Math.sin(phi) * depth * (j / N)} ${cy + depth * 0.35 * (j / N)}) scale(${sx} 1)`}>
      {text}
    </text>
  );
  return (
    <g opacity={outQuad(since / 0.12)}>
      {Array.from({ length: N }, (_, j) => N - j).map((j) => layer(j, mixHex(color, '#000000', 0.45 + 0.35 * (j / N))))}
      {layer(0, cur === k ? keyFill(spec.singer) : mixHex(color, '#ffffff', 0.15), INK)}
    </g>
  );
};
