// STACK: a justified block of words in mixed faces and sizes: every row fills the box width.
// The key word gets a row to itself (the biggest); the other words share rows, grouped so the block fits
// the box height. A row whose full-width size would be too tall (a short row, like "I'M") is set at its height
// limit and widened instead: first a horizontal stretch of the letters (up to 1.6x, as on posters), then
// tracking (up to 0.25 em). Only a row still short after both is centred. Words land on their measured
// starts with a no-bounce slam; unsung words keep their slot.
import { capOf, type Face, familyOf, layout, widthOf } from '../fonts.tsx';
import { appear, clean, faceFor, type FormSpec, hueAt, INK, keyFill, keyIndex, landScale, tokensOf, visible } from './common.tsx';

const FACES: Face[] = ['bebas', 'display', 'righteous', 'bungee'];
const GAP = 14;
const KEY_SHARE = 0.4;
export interface PlacedWord { text: string; x: number; y: number; size: number; face: Face; tok: number; track: number; sx: number }
const MAX_STRETCH = 1.6;
const MAX_TRACK = 0.25;

interface Row { toks: number[]; face: Face; text: string }
const rowsFor = (s: FormSpec, perRow: number, t: number): Row[] => {
  const toks = tokensOf(s);
  const k = keyIndex(s);
  const rows: Row[] = [];
  for (let i = 0; i < toks.length; ) {
    const end = i === k ? i + 1 : Math.min(i + perRow, k > i ? k : toks.length);
    const ids = Array.from({ length: end - i }, (_, n) => i + n);
    const face = faceFor(i === k ? 'display' : (FACES[rows.length % FACES.length] as Face), s.singer, t);
    rows.push({ toks: ids, face, text: ids.map((n) => clean(toks[n]?.text ?? '').toUpperCase()).join(' ') });
    i = end;
  }
  return rows;
};

export const stackLayout = (s: FormSpec, t = 0): PlacedWord[] => {
  const k = keyIndex(s);
  const others = (rows: Row[]) => Math.max(1, rows.filter((r) => r.toks[0] !== k).length);
  let current: Row[] = [];
  const capFor = (r: Row) => (s.box.h * (r.toks[0] === k ? KEY_SHARE : (1 - KEY_SHARE) / others(current))) / capOf(r.face);
  const heightOf = (rows: Row[], f: number) => rows.reduce((a, r) => a + Math.min(s.box.w / widthOf(r.text, 1, r.face), capFor(r)) * f * capOf(r.face), 0) + GAP * (rows.length - 1);
  // fewest words per row whose block fits the box height; failing that, the densest grouping scaled down
  let rows = rowsFor(s, 4, t);
  for (let per = 1; per <= 4; per++) {
    current = rowsFor(s, per, t);
    if (heightOf(current, 1) <= s.box.h) {
      rows = current;
      break;
    }
  }
  current = rows;
  const total = heightOf(rows, 1);
  const f = Math.min(1, (s.box.h - GAP * (rows.length - 1)) / (total - GAP * (rows.length - 1)));
  const out: PlacedWord[] = [];
  let y = s.box.y + Math.max(0, (s.box.h - heightOf(rows, f)) / 2);
  const toks = tokensOf(s);
  for (const r of rows) {
    const size = Math.min(s.box.w / widthOf(r.text, 1, r.face), capFor(r)) * f;
    const natural = widthOf(r.text, size, r.face, 0);
    // widen a short row: horizontal stretch first, then tracking, each capped; centre what is left
    const sx = Math.min(MAX_STRETCH, s.box.w / natural);
    const gaps = Math.max(1, r.text.length - 1);
    const track = Math.min(MAX_TRACK, Math.max(0, (s.box.w - natural * sx) / (size * sx * gaps)));
    const l = layout(r.text, size, r.face, track);
    const rowW = l.width * sx;
    const x0 = s.box.x + (s.box.w - rowW) / 2;
    y += size * capOf(r.face);
    let c = 0;
    for (const n of r.toks) {
      const text = clean(toks[n]?.text ?? '').toUpperCase();
      out.push({ text, x: x0 + (l.xs[c] as number) * sx, y, size, face: r.face, tok: n, track, sx });
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
      {stackLayout(spec, t).map((w) => {
        const tok = toks[w.tok];
        if (!tok || hide.includes(w.tok)) return null;
        const a = appear(t, tok);
        if (a <= 0) return null;
        const s = landScale(t, tok);
        const cx = w.x + (widthOf(w.text, w.size, w.face, w.track) * w.sx) / 2;
        const cy = w.y - (w.size * capOf(w.face)) / 2;
        const isKey = w.tok === k;
        return (
          <g key={w.tok} transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy}) translate(${w.x} 0) scale(${w.sx} 1) translate(${-w.x} 0)`} opacity={a}>
            <text x={w.x} y={w.y} fontFamily={familyOf(w.face)} fontSize={w.size} letterSpacing={w.track * w.size} fill={isKey ? keyFill(spec.singer, t) : hueAt(spec.singer, t, w.tok)} stroke={INK} strokeWidth={w.size * (isKey ? 0.05 : 0.035)} strokeLinejoin="round" paintOrder="stroke">
              {w.text}
            </text>
          </g>
        );
      })}
    </g>
  );
};
