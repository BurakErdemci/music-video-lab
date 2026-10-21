// STACK: a justified block of words in mixed faces and sizes. The key word gets a row to itself (the
// biggest), the other words are grouped up to three to a row; every row is scaled to the box width, then the
// block to the box height. Words land on their measured starts with a no-bounce slam.
import { capOf, type Face, familyOf, widthOf } from '../fonts.tsx';
import { appear, clean, type FormSpec, hueAt, INK, keyFill, keyIndex, landScale, tokensOf, visible } from './common.tsx';

const FACES: Face[] = ['bebas', 'display', 'righteous', 'bungee'];
export interface PlacedWord { text: string; x: number; y: number; size: number; face: Face; tok: number }

export const stackLayout = (s: FormSpec): PlacedWord[] => {
  const toks = tokensOf(s);
  const k = keyIndex(s);
  const rows: number[][] = [];
  for (let i = 0; i < toks.length; ) {
    if (i === k) {
      rows.push([i]);
      i++;
      continue;
    }
    const end = Math.min(i + 3, k > i ? k : toks.length);
    rows.push(Array.from({ length: end - i }, (_, n) => i + n));
    i = end;
  }
  const GAP = 14;
  const others = Math.max(1, rows.filter((r) => r[0] !== k).length);
  const placed = rows.map((r, ri) => {
    const face = r[0] === k ? 'display' : (FACES[ri % FACES.length] as Face);
    const text = r.map((i) => clean(toks[i]?.text ?? '').toUpperCase()).join(' ');
    // justified to the box width, but no row taller than its share of the box (the key row gets the most)
    const share = r[0] === k ? 0.42 : 0.55 / others;
    const size = Math.min(s.box.w / widthOf(text, 1, face), (s.box.h * share) / capOf(face));
    return { r, face, size, h: size * capOf(face) };
  });
  const total = placed.reduce((a, p) => a + p.h, 0) + GAP * (placed.length - 1);
  const fit = Math.min(1, s.box.h / total);
  const out: PlacedWord[] = [];
  let y = s.box.y;
  for (const p of placed) {
    const size = p.size * fit;
    const w = widthOf(p.r.map((i) => clean(toks[i]?.text ?? '').toUpperCase()).join(' '), size, p.face);
    let x = s.box.x + (s.box.w - w) / 2;
    y += size * capOf(p.face);
    for (const i of p.r) {
      const text = clean(toks[i]?.text ?? '').toUpperCase();
      out.push({ text, x, y, size, face: p.face, tok: i });
      x += widthOf(`${text} `, size, p.face);
    }
    y += GAP * fit;
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
        const cx = w.x + widthOf(w.text, w.size, w.face) / 2;
        const cy = w.y - (w.size * capOf(w.face)) / 2;
        const isKey = w.tok === k;
        return (
          <g key={w.tok} transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} opacity={a}>
            <text x={w.x} y={w.y} fontFamily={familyOf(w.face)} fontSize={w.size} fill={isKey ? keyFill(spec.singer) : hueAt(spec.singer, t, w.tok)} stroke={INK} strokeWidth={w.size * (isKey ? 0.05 : 0.035)} strokeLinejoin="round" paintOrder="stroke">
              {w.text}
            </text>
          </g>
        );
      })}
    </g>
  );
};
