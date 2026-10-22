// Dot-matrix forms built from the 5x7 glyph bitmaps (tools/font_metrics.py -> glyphs.json, Bungee).
// MARQUEE: light-box bulbs. The whole line shows from the start, its unsung words dim in their own colour; a word's
//   bulbs light at its measured start; a chase runs through the lit bulbs and every beat kicks them brighter.
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
  const words = toks.map((tk, i) => ({ text: clean(tk.text).toUpperCase(), i }));
  const cells: { x: number; y: number; r: number; tok: number }[] = [];
  const row = (ws: typeof words, x: number, y: number, w: number, h: number, scale: number) => {
    const line = ws.map((v) => v.text).join(' ');
    const p = Math.min(w / Math.max(1, line.length * 6), h / 8);
    const xs = x + (w - line.length * 6 * p) / 2;
    let col = 0;
    for (const v of ws) {
      for (const c of cellsOf(v.text, v.i, col, 0)) cells.push({ x: xs + c.col * p, y: y + c.row * p, r: p * scale, tok: c.tok });
      col += (v.text.length + 1) * 6;
    }
    return p;
  };
  if (k === words.length - 1 && words.length > 1) {
    // the key word last: the other words on row 0, the key word under them at double pitch (reads in order)
    const p0 = row(words.slice(0, k), spec.box.x, spec.box.y, spec.box.w, spec.box.h * 0.3, 0.36);
    row([words[k] as (typeof words)[number]], spec.box.x, spec.box.y + p0 * 9, spec.box.w, spec.box.h * 0.6, 0.38);
  } else {
    // round 11 (Gemini, Burak: "AND WE IT OUT / FIGURED" lit out of order): a key word inside the line stays in its
    // place on one row, in its own colour
    row(words, spec.box.x, spec.box.y + spec.box.h * 0.2, spec.box.w, spec.box.h * 0.6, 0.38);
  }
  const bp = beatPos(t);
  const kick = Math.exp(-5 * (bp - Math.floor(bp)));
  return (
    <g>
      {cells.map((c, i) => {
        const tok = toks[c.tok];
        const on = tok && t >= tok.start;
        const color: Hex = c.tok === k ? mixHex(solidAt(spec.singer, t, 0), '#ffffff', 0.15) : solidAt(spec.singer, t, c.tok);
        // round 11 (the unlit words were near black and the panel read as empty): the whole line shows from the
        // start, an unsung word's bulbs at 38 % of its own colour; each word snaps to full on its sung start
        if (!on) return <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={mixHex(color, '#000000', 0.62)} />;
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
