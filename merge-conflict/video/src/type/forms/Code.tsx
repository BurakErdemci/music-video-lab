// CODE and DIFF: an editor panel in JetBrains Mono.
// CODE: one line typing itself, each word's characters revealed across its measured start..end, syntax
// colours by token class, the key word set larger with a selection highlight, a cursor blinking on the beats.
// DIFF: the song's subject as a unified diff: a struck `-` row (static) over a `+` row that types the sung
// words, the key word large in the singer's colour.
import { type Hex, clamp01, mixHex, outQuad } from '../../lib/ease.ts';
import { beatPos } from '../../timing.ts';
import { familyOf, MONO_ADV } from '../fonts.tsx';
import { clean, type FormSpec, keyFill, keyIndex, tokensOf, visible } from './common.tsx';

const MONO = familyOf('jetbrains');
const SYNTAX = { keyword: '#c792ea', number: '#ffd23a', plain: '#e6edf3', punct: '#89ddff', fn: '#82aaff' } as const;
const KEYWORDS = /^(the|was|and|by|at|i'm|then|who|are|you)$/i;
const classOf = (w: string): Hex => (/^\d/.test(w) ? SYNTAX.number : KEYWORDS.test(clean(w)) ? SYNTAX.keyword : /^[A-Z]/.test(w) ? SYNTAX.fn : SYNTAX.plain);

export interface CodeOptions { gutter: string; size: number; keyScale?: number; chrome?: string }

/** Characters of a token visible at t: typed across its measured start..end. */
export const typed = (text: string, t: number, start: number, end: number): number =>
  t < start ? 0 : Math.max(1, Math.min(text.length, Math.ceil(text.length * clamp01((t - start) / Math.max(0.08, end - start)))));

interface Run { text: string; color: Hex; size: number; x: number; tok: number; isKey: boolean; start: number; end: number }

const runsOf = (spec: FormSpec, size: number, keyScale: number, x0: number): Run[] => {
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  let x = x0;
  return toks.map((tk, i) => {
    const isKey = i === k;
    const sz = isKey ? size * keyScale : size;
    const text = isKey ? clean(tk.text).toUpperCase() + tk.text.slice(clean(tk.text).length) : tk.text;
    const r = { text, color: classOf(tk.text), size: sz, x, tok: i, isKey, start: tk.start, end: tk.end };
    x += (text.length + 1) * MONO_ADV * sz;
    return r;
  });
};

const Panel = ({ x, y, w, h, title }: { x: number; y: number; w: number; h: number; title: string }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={18} fill="#0d1117" fillOpacity={0.88} stroke="#30363d" strokeWidth={3} />
    <rect x={x} y={y} width={w} height={46} rx={18} fill="#161b22" />
    {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <circle key={c} cx={x + 30 + i * 26} cy={y + 23} r={8} fill={c} />)}
    <text x={x + 120} y={y + 31} fontFamily={MONO} fontSize={22} fill="#8b949e">{title}</text>
  </g>
);

export const Code = ({ spec, t, opt }: { spec: FormSpec; t: number; opt: CodeOptions }) => {
  if (!visible(spec, t)) return null;
  const { box } = spec;
  const size = opt.size;
  const keyScale = opt.keyScale ?? 1.9;
  const gw = (opt.gutter.length + 2) * MONO_ADV * size;
  const base = box.y + box.h * 0.66;
  const runs = runsOf(spec, size, keyScale, box.x + 40 + gw);
  const lastTyped = [...runs].reverse().find((r) => t >= r.start);
  const cursorX = lastTyped ? lastTyped.x + typed(lastTyped.text, t, lastTyped.start, lastTyped.end) * MONO_ADV * lastTyped.size : (runs[0]?.x ?? box.x);
  const blink = beatPos(t) % 1 < 0.55;
  return (
    <g fontFamily={MONO} fontWeight={700}>
      <Panel x={box.x} y={box.y} w={box.w} h={box.h} title={opt.chrome ?? 'button.css'} />
      <text x={box.x + 40} y={base} fontSize={size} fill="#6e7681">{opt.gutter}</text>
      {runs.map((r) => {
        const n = typed(r.text, t, r.start, r.end);
        if (!n) return null;
        const pop = outQuad((t - r.start) / (8 / 60));
        if (r.isKey) {
          const w = r.text.length * MONO_ADV * r.size;
          return (
            <g key={r.tok}>
              <rect x={r.x - 8} y={base - r.size * 0.86} width={w + 16} height={r.size * 1.08} rx={8} fill={keyFill(spec.singer)} fillOpacity={0.28 * pop} />
              <text x={r.x} y={base} fontSize={r.size} fill={keyFill(spec.singer)} stroke="#0d1117" strokeWidth={r.size * 0.04} paintOrder="stroke">{r.text.slice(0, n)}</text>
            </g>
          );
        }
        return <text key={r.tok} x={r.x} y={base} fontSize={r.size} fill={r.color}>{r.text.slice(0, n)}</text>;
      })}
      {blink && <rect x={cursorX + 4} y={base - size * 0.82} width={size * 0.12} height={size} fill="#e6edf3" />}
    </g>
  );
};

export interface DiffOptions { minus: string; size: number; keyScale?: number; title?: string }

export const Diff = ({ spec, t, opt }: { spec: FormSpec; t: number; opt: DiffOptions }) => {
  if (!visible(spec, t)) return null;
  const { box } = spec;
  const size = opt.size;
  const rowH = box.h * 0.36;
  const y1 = box.y + 60 + rowH * 0.75;
  const y2 = box.y + 60 + rowH * 1.85;
  const runs = runsOf(spec, size, opt.keyScale ?? 1.9, box.x + 40 + 2 * MONO_ADV * size);
  const intro = outQuad((t - spec.t0) / 0.2);
  const strike = outQuad((t - spec.t0 - 0.15) / 0.25);
  const mw = opt.minus.length * MONO_ADV * size;
  return (
    <g fontFamily={MONO} fontWeight={700}>
      <Panel x={box.x} y={box.y} w={box.w} h={box.h} title={opt.title ?? 'git diff button.css'} />
      <rect x={box.x + 6} y={y1 - size * 0.95} width={box.w - 12} height={size * 1.35} fill="#ff4d5e" fillOpacity={0.22 * intro} />
      <text x={box.x + 40} y={y1} fontSize={size} fill="#ff6b7a" opacity={intro}>{`- ${opt.minus}`}</text>
      <line x1={box.x + 40 + 2 * MONO_ADV * size} y1={y1 - size * 0.3} x2={box.x + 40 + 2 * MONO_ADV * size + mw * strike} y2={y1 - size * 0.3} stroke="#ff6b7a" strokeWidth={size * 0.08} />
      <rect x={box.x + 6} y={y2 - size * 1.5} width={box.w - 12} height={size * 2.1} fill="#3dff9a" fillOpacity={0.16 * intro} />
      <text x={box.x + 40} y={y2} fontSize={size} fill="#5cff9f" opacity={intro}>+</text>
      {runs.map((r) => {
        const n = typed(r.text, t, r.start, r.end);
        if (!n) return null;
        return (
          <text key={r.tok} x={r.x} y={y2} fontSize={r.size} fill={r.isKey ? keyFill(spec.singer) : mixHex('#5cff9f', '#ffffff', 0.35)} stroke={r.isKey ? '#0d1117' : 'none'} strokeWidth={r.size * 0.05} paintOrder="stroke">
            {r.text.slice(0, n)}
          </text>
        );
      })}
    </g>
  );
};

/** Where a CODE run's word sits (for transitions that land on it). */
export const codeWordAt = (spec: FormSpec, opt: CodeOptions, i: number): { x: number; y: number; size: number; text: string } => {
  const gw = (opt.gutter.length + 2) * MONO_ADV * opt.size;
  const r = runsOf(spec, opt.size, opt.keyScale ?? 1.9, spec.box.x + 40 + gw)[i];
  if (!r) throw new Error(`code ${spec.id}: no word ${i}`);
  return { x: r.x, y: spec.box.y + spec.box.h * 0.66, size: r.size, text: r.text };
};
