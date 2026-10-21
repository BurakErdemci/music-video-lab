// Dot-matrix forms built from the 5x7 glyph bitmaps (tools/font_metrics.py -> glyphs.json, Bungee).
// MARQUEE: light-box bulbs. The whole sign shows as dim bulbs; a word's bulbs light at its measured start; a
//   chase runs through the lit bulbs and every beat kicks them brighter.
// FLOOR: letters lit in the dance-floor tiles. The tiles are projected through the shot camera onto the floor
//   plane, so they sit on the 3D floor; the latest sung word lights, the key word holds once sung.
import { type CameraPose, project } from '../../camera/camera.ts';
import { type Hex, mixHex } from '../../lib/ease.ts';
import { FLOOR_Y } from '../../stage/SetPlate.tsx';
import { beatPos } from '../../timing.ts';
import glyphs from '../glyphs.json' with { type: 'json' };
import { clean, type FormSpec, keyIndex, solidAt, tokensOf, visible } from './common.tsx';

const G7 = glyphs.g7 as Record<string, string[]>;
const bits = (ch: string): string[] => G7[ch.toUpperCase()] ?? G7[' '] ?? [];

interface Cell { col: number; row: number; tok: number }
/** Cells of a text laid out in 5x7 glyphs with 1 column of spacing. */
const cellsOf = (text: string, tok: number, col0: number, row0: number): Cell[] => {
  const out: Cell[] = [];
  [...text].forEach((ch, n) => {
    bits(ch).forEach((line, r) => [...line].forEach((b, c) => b === '1' && out.push({ col: col0 + n * 6 + c, row: row0 + r, tok })));
  });
  return out;
};

export const Marquee = ({ spec, t }: { spec: FormSpec; t: number }) => {
  if (!visible(spec, t)) return null;
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  const rest = toks.map((tk, i) => ({ text: clean(tk.text).toUpperCase(), i })).filter((w) => w.i !== k);
  const keyText = clean(toks[k]?.text ?? '').toUpperCase();
  // row 0: the other words; row 1: the key word at double pitch
  const line = rest.map((w) => w.text).join(' ');
  const cols0 = line.length * 6;
  const cols1 = keyText.length * 6;
  const pitch0 = Math.min(spec.box.w / Math.max(1, cols0), spec.box.h * 0.3 / 8);
  const pitch1 = Math.min(spec.box.w / Math.max(1, cols1), spec.box.h * 0.6 / 8);
  const cells: { x: number; y: number; r: number; tok: number }[] = [];
  let col = 0;
  const x0 = spec.box.x + (spec.box.w - cols0 * pitch0) / 2;
  for (const w of rest) {
    for (const c of cellsOf(w.text, w.i, col, 0)) cells.push({ x: x0 + c.col * pitch0, y: spec.box.y + c.row * pitch0, r: pitch0 * 0.36, tok: c.tok });
    col += (w.text.length + 1) * 6;
  }
  const x1 = spec.box.x + (spec.box.w - cols1 * pitch1) / 2;
  const y1 = spec.box.y + pitch0 * 9;
  for (const c of cellsOf(keyText, k, 0, 0)) cells.push({ x: x1 + c.col * pitch1, y: y1 + c.row * pitch1, r: pitch1 * 0.38, tok: c.tok });
  const bp = beatPos(t);
  const kick = Math.exp(-5 * (bp - Math.floor(bp)));
  return (
    <g>
      {cells.map((c, i) => {
        const tok = toks[c.tok];
        const on = tok && t >= tok.start;
        const color: Hex = c.tok === k ? mixHex(solidAt(spec.singer, t, 0), '#ffffff', 0.15) : solidAt(spec.singer, t, c.tok);
        if (!on) return <circle key={i} cx={c.x} cy={c.y} r={c.r * 0.8} fill="#2a2030" />;
        const chase = 0.7 + 0.3 * Math.sin(t * 9 - (c.x + c.y) * 0.03);
        const lv = Math.min(1, chase + 0.35 * kick);
        return (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={c.r * 2} fill={color} opacity={0.22 * lv} />
            <circle cx={c.x} cy={c.y} r={c.r} fill={mixHex(color, '#ffffff', 0.45 * lv)} />
          </g>
        );
      })}
    </g>
  );
};

export interface FloorOptions { pose: CameraPose; x: number; z: number; tile: number }

export const Floor = ({ spec, t, opt }: { spec: FormSpec; t: number; opt: FloorOptions }) => {
  if (!visible(spec, t)) return null;
  const toks = tokensOf(spec);
  const k = keyIndex(spec);
  const sung = toks.map((tk, i) => ({ tk, i })).filter((w) => t >= w.tk.start);
  const keySung = sung.some((w) => w.i === k);
  const cur = keySung ? k : (sung.at(-1)?.i ?? -1);
  if (cur < 0) return null;
  const text = clean(toks[cur]?.text ?? '').toUpperCase();
  const cells = cellsOf(text, cur, 0, 0);
  const width = text.length * 6 * opt.tile;
  const y = FLOOR_Y + 0.01;
  const quad = (c: Cell, grow: number) => {
    const x0 = opt.x - width / 2 + c.col * opt.tile - grow;
    const z0 = opt.z - (6 - c.row) * opt.tile - grow;
    const s = opt.tile + 2 * grow;
    return [[x0, z0], [x0 + s, z0], [x0 + s, z0 + s], [x0, z0 + s]]
      .map(([x, z]) => project(opt.pose, [x as number, y, z as number]))
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
  };
  const since = t - (toks[cur]?.start ?? t);
  const flash = Math.exp(-6 * since);
  return (
    <g>
      {cells.map((c, i) => {
        const color = cur === k ? solidAt(spec.singer, t, 0) : solidAt(spec.singer, t, c.col);
        return (
          <g key={i}>
            <polygon points={quad(c, opt.tile * 0.25)} fill={color} opacity={0.25 + 0.3 * flash} />
            <polygon points={quad(c, -opt.tile * 0.06)} fill={mixHex(color, '#ffffff', 0.35 + 0.4 * flash)} />
          </g>
        );
      })}
    </g>
  );
};
