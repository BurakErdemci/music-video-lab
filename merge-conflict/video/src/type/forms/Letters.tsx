// Letter-placed forms: FLAP, RING and WAVE. Each letter is positioned from the measured advances.
// FLAP: a split-flap departure board; every cell spins through seeded characters and lands on its letter at
//   the word's measured start (the last flaps fold on frames, so the landing is on time).
// RING: the line runs on a circle around a centre (the mirror ball or a girl), turning slowly; the key word is
//   set larger.
// WAVE: the line sits on a baseline that waves; every beat kicks the amplitude.
import type { ReactNode } from 'react';
import { type Hex, mixHex, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { beatPos } from '../../timing.ts';
import { capOf, type Face, familyOf, layout } from '../fonts.tsx';
import { appear, clean, type FormSpec, hueAt, INK, keyFill, keyIndex, landScale, solidAt, tokensOf, visible } from './common.tsx';

const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>=+#';
const MONO = familyOf('jetbrains');

export const Flap = ({ spec, t, cols = 16 }: { spec: FormSpec; t: number; cols?: number }) => {
  if (!visible(spec, t)) return null;
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  // word-wrap the line into board rows of `cols` cells
  const rows: { ch: string; tok: number }[][] = [[]];
  toks.forEach((tk, i) => {
    const w = clean(tk.text).toUpperCase();
    const row = rows[rows.length - 1] as { ch: string; tok: number }[];
    if (row.length && row.length + 1 + w.length > cols) rows.push([]);
    const r = rows[rows.length - 1] as { ch: string; tok: number }[];
    if (r.length) r.push({ ch: ' ', tok: -1 });
    for (const ch of w) r.push({ ch, tok: i });
  });
  const cw = spec.box.w / cols;
  const ch = Math.min(cw * 1.45, spec.box.h / rows.length);
  const size = ch * 0.72;
  const top = spec.box.y + (spec.box.h - ch * rows.length) / 2;
  const step = Math.floor(t * 30);
  return (
    <g fontFamily={MONO} fontWeight={800}>
      {rows.map((row, ri) =>
        Array.from({ length: cols }, (_, ci) => {
          const cell = row[ci];
          const x = spec.box.x + ci * cw;
          const y = top + ri * ch;
          const tok = cell && cell.tok >= 0 ? toks[cell.tok] : undefined;
          let shown = '';
          let fold = 0;
          if (tok) {
            const lead = 0.28 + (ci % 5) * 0.02;
            if (t >= tok.start) shown = cell?.ch ?? '';
            else if (t >= tok.start - lead) {
              shown = seeded(`flap:${spec.id}:${ri}:${ci}:${step}`).pick([...FLAP_CHARS]);
              fold = (t * 30) % 1;
            }
          }
          const isKey = cell?.tok === k;
          const color: string = isKey ? keyFill(spec.singer) : tok ? hueAt(spec.singer, t, cell?.tok ?? 0) : '#ffffff';
          return (
            <g key={`${ri}-${ci}`}>
              <rect x={x + 3} y={y + 3} width={cw - 6} height={ch - 6} rx={6} fill="#14101c" stroke="#2c2438" strokeWidth={2} />
              {shown && (
                <text x={x + cw / 2} y={y + ch / 2 + size * 0.36} fontSize={size} textAnchor="middle" fill={color} transform={fold ? `translate(0 ${y + ch / 2}) scale(1 ${1 - 0.8 * fold}) translate(0 ${-(y + ch / 2)})` : undefined}>
                  {shown}
                </text>
              )}
              <line x1={x + 3} y1={y + ch / 2} x2={x + cw - 3} y2={y + ch / 2} stroke="#000" strokeWidth={3} />
            </g>
          );
        }),
      )}
    </g>
  );
};

export interface RingOptions { cx: number; cy: number; r: number; size: number; face?: Face; turn?: number }

export const Ring = ({ spec, t, opt }: { spec: FormSpec; t: number; opt: RingOptions }) => {
  if (!visible(spec, t)) return null;
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  const face = opt.face ?? 'bungee';
  const letters: { ch: string; tok: number; adv: number; size: number }[] = [];
  toks.forEach((tk, i) => {
    const size = i === k ? opt.size * 1.7 : opt.size;
    const w = `${clean(tk.text).toUpperCase()} `;
    const l = layout(w, size, face);
    [...w].forEach((c, n) => letters.push({ ch: c, tok: i, adv: (l.ws[n] as number) + size * 0.02, size }));
  });
  const total = letters.reduce((a, l) => a + l.adv, 0);
  const circ = 2 * Math.PI * opt.r;
  const spread = Math.min(1, circ / total);
  let a0 = -Math.PI / 2 - (opt.turn ?? 0.35) * t;
  return (
    <g fontFamily={familyOf(face)}>
      {letters.map((l, i) => {
        const span = (l.adv * spread) / opt.r;
        const a = a0 + span / 2;
        a0 += span;
        const tok = toks[l.tok];
        if (!tok || l.ch === ' ') return null;
        const p = appear(t, tok);
        if (!p) return null;
        const x = opt.cx + Math.cos(a) * opt.r;
        const y = opt.cy + Math.sin(a) * opt.r;
        const isKey = l.tok === k;
        return (
          <text key={i} x={0} y={0} fontSize={l.size} textAnchor="middle" fill={isKey ? keyFill(spec.singer) : hueAt(spec.singer, t, l.tok)} stroke={INK} strokeWidth={l.size * 0.05} paintOrder="stroke" opacity={p} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90}) scale(${landScale(t, tok, 1.6)})`}>
            {l.ch}
          </text>
        );
      })}
    </g>
  );
};

export interface WaveOptions { size: number; face?: Face; amp?: number }

export const Wave = ({ spec, t, opt }: { spec: FormSpec; t: number; opt: WaveOptions }) => {
  if (!visible(spec, t)) return null;
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  const face = opt.face ?? 'righteous';
  const words = toks.map((tk, i) => ({ text: clean(tk.text).toUpperCase(), tok: i, size: i === k ? opt.size * 1.8 : opt.size }));
  const widths = words.map((w) => layout(`${w.text} `, w.size, face).width);
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = Math.min(1, spec.box.w / total);
  let x = spec.box.x + (spec.box.w - total * scale) / 2;
  const bp = beatPos(t);
  const kick = Math.exp(-4 * (bp - Math.floor(bp)));
  const amp = (opt.amp ?? 40) * (0.5 + kick);
  const base = spec.box.y + spec.box.h / 2;
  const out: ReactNode[] = [];
  words.forEach((w, wi) => {
    const size = w.size * scale;
    const l = layout(w.text, size, face);
    const tok = toks[w.tok];
    [...w.text].forEach((c, n) => {
      const lx = x + (l.xs[n] as number);
      const y = base + amp * Math.sin(lx / 140 - bp * Math.PI) + (w.tok === k ? size * capOf(face) * 0.35 : 0);
      const p = tok ? appear(t, tok) : 0;
      if (!p) return;
      const drop = (1 - outQuad(p)) * -60;
      out.push(
        <text key={`${wi}-${n}`} x={lx} y={y + drop} fontSize={size} fontFamily={familyOf(face)} fill={w.tok === k ? keyFill(spec.singer) : hueAt(spec.singer, t, w.tok + n)} stroke={INK} strokeWidth={size * 0.05} paintOrder="stroke" opacity={p}>
          {c}
        </text>,
      );
    });
    x += (widths[wi] as number) * scale;
  });
  return <g>{out}</g>;
};

/** A soft glow colour for a singer (used by the lit forms). */
export const glowOf = (spec: FormSpec, t: number, i: number): Hex => mixHex(solidAt(spec.singer, t, i), '#ffffff', 0.2);
