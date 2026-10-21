// STACK: a truly justified block of words in mixed faces and sizes: every row is exactly the box width.
// The key word gets a row to itself (the biggest); the other words share rows, grouped so the block fits
// the box height. A row that would be too tall at full width is set smaller and justified with letter
// tracking instead. Words land on their measured starts with a no-bounce slam; unsung words keep their slot.
import { capOf, type Face, familyOf, layout, widthOf } from '../fonts.tsx';
import { appear, clean, type FormSpec, hueAt, INK, keyFill, keyIndex, landScale, tokensOf, visible } from './common.tsx';

const FACES: Face[] = ['bebas', 'display', 'righteous', 'bungee'];
const GAP = 14;
const KEY_SHARE = 0.4;
export interface PlacedWord { text: string; x: number; y: number; size: number; face: Face; tok: number; track: number }

interface Row { toks: number[]; face: Face; text: string }
const rowsFor = (s: FormSpec, perRow: number): Row[] => {
  const toks = tokensOf(s);
  const k = keyIndex(s);
  const rows: Row[] = [];
  for (let i = 0; i < toks.length; ) {
    const end = i === k ? i + 1 : Math.min(i + perRow, k > i ? k : toks.length);
    const ids = Array.from({ length: end - i }, (_, n) => i + n);
    const face = i === k ? 'display' : (FACES[rows.length % FACES.length] as Face);
    rows.push({ toks: ids, face, text: ids.map((n) => clean(toks[n]?.text ?? '').toUpperCase()).join(' ') });
    i = end;
  }
  return rows;
};

export const stackLayout = (s: FormSpec): PlacedWord[] => {
  const k = keyIndex(s);
  const capFor = (r: Row) => (r.toks[0] === k ? (s.box.h * KEY_SHARE) / capOf(r.face) : Infinity);
  const heightOf = (rows: Row[], f: number) => rows.reduce((a, r) => a + Math.min(s.box.w / widthOf(r.text, 1, r.face), capFor(r)) * f * capOf(r.face), 0) + GAP * (rows.length - 1);
  // fewest words per row whose block fits the box height; failing that, the densest grouping scaled down
  let rows = rowsFor(s, 4);
  for (let per = 1; per <= 4; per++) {
    const r = rowsFor(s, per);
    if (heightOf(r, 1) <= s.box.h) {
      rows = r;
      break;
    }
  }
  const total = heightOf(rows, 1);
  const f = Math.min(1, (s.box.h - GAP * (rows.length - 1)) / (total - GAP * (rows.length - 1)));
  const out: PlacedWord[] = [];
  let y = s.box.y + Math.max(0, (s.box.h - heightOf(rows, f)) / 2);
  const toks = tokensOf(s);
  for (const r of rows) {
    const size = Math.min(s.box.w / widthOf(r.text, 1, r.face), capFor(r)) * f;
    // tracking (em) that stretches the row to exactly the box width
    const natural = widthOf(r.text, size, r.face, 0);
    const track = r.text.length > 1 ? (s.box.w - natural) / (size * (r.text.length - 1)) : 0;
    const l = layout(r.text, size, r.face, track);
    y += size * capOf(r.face);
    let c = 0;
    for (const n of r.toks) {
      const text = clean(toks[n]?.text ?? '').toUpperCase();
      out.push({ text, x: s.box.x + (l.xs[c] as number), y, size, face: r.face, tok: n, track });
      c += text.length + 1;
    }
    y += GAP;
  }
  return out;
};

export const Stack = ({ spec, t, hide = [] }: { spec: FormSpec; t: number; hide?: readonly number[] }) => {
  if (!visible(spec, t)) return null;
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  return (
    <g>
      {stackLayout(spec).map((w) => {
        const tok = toks[w.tok];
        if (!tok || hide.includes(w.tok)) return null;
        const a = appear(t, tok);
        if (a <= 0) return null;
        const s = landScale(t, tok);
        const cx = w.x + widthOf(w.text, w.size, w.face, w.track) / 2;
        const cy = w.y - (w.size * capOf(w.face)) / 2;
        const isKey = w.tok === k;
        return (
          <g key={w.tok} transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} opacity={a}>
            <text x={w.x} y={w.y} fontFamily={familyOf(w.face)} fontSize={w.size} letterSpacing={w.track * w.size} fill={isKey ? keyFill(spec.singer) : hueAt(spec.singer, t, w.tok)} stroke={INK} strokeWidth={w.size * (isKey ? 0.05 : 0.035)} strokeLinejoin="round" paintOrder="stroke">
              {w.text}
            </text>
          </g>
        );
      })}
    </g>
  );
};
