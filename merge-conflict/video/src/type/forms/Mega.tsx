// The chorus forms (round 6, scene-map.md "The chorus is the peak" + "Type is the star again"):
//  Shout     a frame-filling shout word (NO!, NEVER!): per-letter slam-in, extruded, chrome (pop) or steel (metal),
//            neon outline in the singer's colour, decaying shake, glitch slices on the hit.
//  FlameText words on fire: a fire gradient fill and flame tongues licking up from every letter.
//  GlitchText words breaking apart: RGB-split copies and horizontal slices that slip more toward the end.
//  RunwayLine a code line lying ON a world plane (the line-42 runway): every glyph projected in perspective.
// All pure functions of t; randomness from seeded keys with a time step.
import type { ReactNode } from 'react';
import { type CameraPose, project, type Vec3 } from '../../camera/camera.ts';
import { clamp01, type Hex, lerp, mixHex, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import type { Token } from '../../lyrics/bind.ts';
import { capOf, type Face, familyOf, layout, MONO_ADV, widthOf } from '../fonts.tsx';
import { FRAME, FRAME_ALPHA, FRAME_W } from '../Scrim.tsx';
import { GLOW } from '../Svg.tsx';
import { clean, INK } from './common.tsx';

const FAMILY_OF: Record<'chrome' | 'steel', Face> = { chrome: 'bungee', steel: 'metalmania' };

/** The chrome and steel gradients a Shout fills with (one set per id, vertical bands). */
const ShoutDefs = ({ id, style, color }: { id: string; style: 'chrome' | 'steel'; color: Hex }) => {
  const stops: [number, string][] =
    style === 'chrome'
      ? [[0, '#ffffff'], [0.32, mixHex(color, '#ffffff', 0.55)], [0.5, mixHex(color, '#000000', 0.45)], [0.53, '#ffffff'], [0.7, color], [1, '#ff4fd8']]
      : [[0, '#f4f6f8'], [0.4, '#8a929c'], [0.5, '#2b3036'], [0.56, '#c7ccd2'], [0.8, '#5b636c'], [1, '#ff3a1a']];
  return (
    <defs>
      <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
        {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
      </linearGradient>
    </defs>
  );
};

export interface ShoutSpec { id: string; text: string; at: number; until: number; style: 'chrome' | 'steel'; color: Hex; cx: number; cy: number; w: number; rot?: number }

export const Shout = ({ spec, t }: { spec: ShoutSpec; t: number }) => {
  if (t < spec.at || t >= spec.until) return null;
  const face = FAMILY_OF[spec.style];
  const text = spec.text;
  const size = spec.w / widthOf(text, 1, face);
  const { xs } = layout(text, size, face);
  const x0 = spec.cx - widthOf(text, size, face) / 2;
  const base = spec.cy + (size * capOf(face)) / 2;
  const since = t - spec.at;
  const step = Math.floor(t * 30);
  // shake: a 30 Hz jolt that dies over 0.5 s, then a slow breath of scale until the word leaves
  const r = seeded(`shout-shake:${spec.id}:${step}`);
  const jolt = 26 * Math.max(0, 1 - since / 0.5);
  const sx = r.range(-1, 1) * jolt;
  const sy = r.range(-1, 1) * jolt;
  const grow = 1 + 0.06 * clamp01((since - 0.15) / (spec.until - spec.at));
  const out = clamp01((spec.until - t) / (4 / 60));
  const letters = [...text];
  const depth = size * 0.09;
  // glitch slices on the hit: three bands of the word slip sideways for 8 frames
  const slip = since < 8 / 60;
  const fill = `url(#${spec.id}-fill)`;
  const word = (dx: number, dy: number, paint: string, key: string, stroke?: string, sw = 0) => (
    <g key={key}>
      {letters.map((ch, i) => {
        const li = since - i * (1.2 / 60);
        if (li < 0) return null;
        const k = outQuad(li / (6 / 60));
        const s = lerp(2.4, 1, k);
        const lx = x0 + (xs[i] ?? 0);
        const lw = widthOf(ch, size, face);
        const ox = lx + lw / 2;
        return (
          <text key={i} x={lx + dx} y={base + dy} fontFamily={familyOf(face)} fontSize={size} fill={paint} stroke={stroke ?? 'none'} strokeWidth={sw} strokeLinejoin="round" paintOrder="stroke" opacity={k} transform={`translate(${ox} ${base}) scale(${s}) translate(${-ox} ${-base})`}>
            {ch}
          </text>
        );
      })}
    </g>
  );
  const body = (
    <g>
      {Array.from({ length: 9 }, (_, j) => 9 - j).map((j) => word((depth * j) / 9, (depth * j) / 9, mixHex(spec.color, '#000000', 0.55 + 0.04 * j), `d${j}`))}
      {GLOW.map((g, k) => word(0, 0, 'none', `g${k}`, spec.color, size * g.w * 0.5))}
      {word(0, 0, fill, 'face', INK, size * 0.025)}
    </g>
  );
  const bands: ReactNode[] = [];
  if (slip) {
    const rs = seeded(`shout-slip:${spec.id}:${Math.floor(t * 60)}`);
    const top = base - size * capOf(face) - depth;
    const hh = size * capOf(face) + depth * 2;
    for (let b = 0; b < 3; b++) {
      const y = top + rs.range(0, hh * 0.8);
      const h = rs.range(hh * 0.06, hh * 0.16);
      bands.push(
        <g key={b}>
          <clipPath id={`${spec.id}-slip-${b}`}><rect x={0} y={y} width={1920} height={h} /></clipPath>
          <g clipPath={`url(#${spec.id}-slip-${b})`} transform={`translate(${rs.range(-90, 90)} 0)`}>{body}</g>
        </g>,
      );
    }
  }
  return (
    <g opacity={out} transform={`translate(${sx} ${sy}) rotate(${spec.rot ?? 0} ${spec.cx} ${spec.cy}) translate(${spec.cx} ${spec.cy}) scale(${grow}) translate(${-spec.cx} ${-spec.cy})`}>
      <ShoutDefs id={spec.id} style={spec.style} color={spec.color} />
      {body}
      {bands}
    </g>
  );
};

// ---- words on fire -------------------------------------------------------------------------------------------
export interface WordsSpec { id: string; tokens: readonly Token[]; x: number; y: number; size: number; face: Face; until: number; key?: number; color?: Hex }

/** The words of a line laid left to right (wrapping at 1800 px), each appearing on its sung time. */
const placeWords = (s: WordsSpec) => {
  let x = s.x;
  let y = s.y;
  return s.tokens.map((tk, i) => {
    const text = clean(tk.text).toUpperCase();
    const size = i === s.key ? s.size * 1.4 : s.size;
    const w = widthOf(text, size, s.face);
    if (x + w > 1860 && x > s.x) {
      x = s.x;
      y += s.size * 1.08;
    }
    const at = { text, x, y, size, w, tk };
    x += w + s.size * 0.28;
    return at;
  });
};

export const FlameText = ({ spec, t }: { spec: WordsSpec; t: number }) => {
  if (t >= spec.until || t < (spec.tokens[0]?.start ?? Infinity)) return null;
  const step = Math.floor(t * 20);
  return (
    <g>
      <defs>
        <linearGradient id={`${spec.id}-fire`} x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor="#fff2a8" />
          <stop offset="0.35" stopColor="#ffb020" />
          <stop offset="0.7" stopColor="#ff4a10" />
          <stop offset="1" stopColor="#a80c0c" />
        </linearGradient>
      </defs>
      {placeWords(spec).map((w, i) => {
        if (t < w.tk.start) return null;
        const k = outQuad((t - w.tk.start) / (7 / 60));
        const cap = w.size * capOf(spec.face);
        const tongues = Math.max(3, Math.round(w.w / (w.size * 0.28)));
        return (
          <g key={i} opacity={k} transform={`translate(0 ${(1 - k) * 60})`}>
            {Array.from({ length: tongues }, (_, j) => {
              const r = seeded(`flame:${spec.id}:${i}:${j}:${step}`);
              const fx = w.x + ((j + 0.5) / tongues) * w.w + r.range(-8, 8);
              const fh = cap * r.range(0.35, 0.95) * k;
              const fw = (w.w / tongues) * r.range(0.9, 1.5);
              const top = w.y - cap * 0.75;
              return <path key={j} d={`M ${fx - fw / 2} ${top} Q ${fx - fw * 0.25} ${top - fh * 0.55} ${fx + r.range(-6, 6)} ${top - fh} Q ${fx + fw * 0.25} ${top - fh * 0.55} ${fx + fw / 2} ${top} Z`} fill={j % 2 ? '#ff6a10' : '#ffb020'} opacity={0.85} />;
            })}
            {GLOW.map((g, q) => <text key={q} x={w.x} y={w.y} fontFamily={familyOf(spec.face)} fontSize={w.size} fill="none" stroke="#ff4a10" strokeOpacity={g.o} strokeWidth={w.size * g.w * 0.6}>{w.text}</text>)}
            <text x={w.x} y={w.y} fontFamily={familyOf(spec.face)} fontSize={w.size} fill={`url(#${spec.id}-fire)`} stroke={INK} strokeWidth={w.size * 0.03} paintOrder="stroke">{w.text}</text>
          </g>
        );
      })}
    </g>
  );
};

export const GlitchText = ({ spec, t }: { spec: WordsSpec; t: number }) => {
  if (t >= spec.until || t < (spec.tokens[0]?.start ?? Infinity)) return null;
  const first = spec.tokens[0]?.start ?? 0;
  // the slip grows over the line: control is lost word by word
  const amount = clamp01((t - first) / Math.max(0.5, spec.until - first));
  const step = Math.floor(t * 15);
  const words = placeWords(spec).filter((w) => t >= w.tk.start);
  const line = (paint: Hex, dx: number, key: string, op = 1) => (
    <g key={key} opacity={op}>
      {words.map((w, i) => (
        <text key={i} x={w.x + dx} y={w.y} fontFamily={familyOf(spec.face)} fontSize={w.size} fill={paint} stroke={key === 'face' ? INK : 'none'} strokeWidth={w.size * 0.03} paintOrder="stroke" opacity={outQuad((t - w.tk.start) / (5 / 60))}>
          {w.text}
        </text>
      ))}
    </g>
  );
  const body = (
    <g>
      {line('#ff2a5a', -6 - 10 * amount, 'r', 0.75)}
      {line('#19e0ff', 6 + 10 * amount, 'c', 0.75)}
      {line(spec.color ?? '#ffffff', 0, 'face')}
    </g>
  );
  const r = seeded(`glitch:${spec.id}:${step}`);
  const top = Math.min(...words.map((w) => w.y - w.size)) - 20;
  const bot = Math.max(...words.map((w) => w.y)) + 30;
  const n = 7;
  return (
    <g>
      <rect x={Math.min(...words.map((w) => w.x)) - 30} y={top - 10} width={Math.max(...words.map((w) => w.x + w.w)) - Math.min(...words.map((w) => w.x)) + 60} height={bot - top + 20} fill="#05030a" fillOpacity={0.7} />
      {Array.from({ length: n }, (_, b) => {
        const y0 = top + ((bot - top) * b) / n;
        const h = (bot - top) / n;
        // the slip stays small enough to read (round 7c: 250 px slices made "I can't take control" illegible)
        const dx = r() < 0.2 + 0.4 * amount ? r.range(-1, 1) * (12 + 60 * amount) : 0;
        return (
          <g key={b}>
            <clipPath id={`${spec.id}-band-${b}`}><rect x={0} y={y0} width={1920} height={h + 1} /></clipPath>
            <g clipPath={`url(#${spec.id}-band-${b})`} transform={`translate(${dx} 0)`}>{body}</g>
          </g>
        );
      })}
    </g>
  );
};

// ---- a code line lying on a world plane ------------------------------------------------------------------------
export interface RunwaySpec { id: string; text: string; t0: number; t1: number; cps: number; origin: Vec3; dir: Vec3; up: Vec3; size: number; color: Hex; gutter?: string }

/** A monospace line laid on the plane through `origin` spanned by `dir` (along the line) and `up` (glyph up):
 *  each glyph is placed by projecting its own corner points, so it recedes in true perspective. */
export const RunwayLine = ({ spec, t, pose }: { spec: RunwaySpec; t: number; pose: CameraPose }) => {
  if (t < spec.t0 || t >= spec.t1) return null;
  const full = (spec.gutter ? `${spec.gutter}  ` : '') + spec.text;
  const n = Math.min(full.length, Math.floor((t - spec.t0) * spec.cps) + (spec.gutter?.length ?? 0) + 2);
  const adv = MONO_ADV * spec.size;
  const at = (u: number, v: number): Vec3 => [spec.origin[0] + spec.dir[0] * u + spec.up[0] * v, spec.origin[1] + spec.dir[1] * u + spec.up[1] * v, spec.origin[2] + spec.dir[2] * u + spec.up[2] * v];
  const glyphs: ReactNode[] = [];
  // a dark backing on the floor under the typed part (round 7c: cyan glyphs on the blue runway read at ~1.5:1)
  const len = Math.max(1, n) * adv + adv * 0.6;
  const quad = [at(-adv * 0.4, -spec.size * 0.35), at(len, -spec.size * 0.35), at(len, spec.size * 1.45), at(-adv * 0.4, spec.size * 1.45)].map((q) => project(pose, q));
  if (quad.every((q) => q.s >= 1 && Math.abs(q.x) < 6000 && Math.abs(q.y) < 6000)) {
    // a light edge and a soft shadow carry the 3:1 on a bright floor (the shadow's alpha stays under the 0.5 the type layer counts)
    const pts = quad.map((q) => `${q.x},${q.y}`).join(' ');
    glyphs.push(<polygon key="shadow" points={pts} fill="none" stroke="#000" strokeOpacity={0.49} strokeWidth={56} strokeLinejoin="round" />, <polygon key="backing" points={pts} fill="#05030a" fillOpacity={0.72} stroke={FRAME} strokeOpacity={FRAME_ALPHA} strokeWidth={FRAME_W} strokeLinejoin="round" />);
  }
  for (let i = 0; i < n; i++) {
    const ch = full[i] ?? ' ';
    if (ch === ' ') continue;
    const p0 = project(pose, at(i * adv, 0));
    const px = project(pose, at(i * adv + adv, 0));
    const py = project(pose, at(i * adv, spec.size));
    // the glyph's local affine frame: x along the line, y up the plane (SVG y points down, so the up vector flips)
    const a = (px.x - p0.x) / adv;
    const b = (px.y - p0.y) / adv;
    const c = -(py.x - p0.x) / spec.size;
    const d = -(py.y - p0.y) / spec.size;
    // a glyph beside or behind the camera projects to an enormous scale; Chrome hung rasterising one (frame 2836,
    // round 6), so glyphs off the frame or larger than about a third of it are skipped
    const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) * spec.size;
    if (p0.s < 1 || scale > 420 || p0.x < -600 || p0.x > 2520 || p0.y < -600 || p0.y > 1680) continue;
    const g = spec.gutter && i < spec.gutter.length;
    const col = g ? '#8b949e' : spec.color;
    glyphs.push(
      <g key={i} transform={`matrix(${a} ${b} ${c} ${d} ${p0.x} ${p0.y})`}>
        {!g && GLOW.map((gl, k) => <text key={k} x={0} y={0} fontFamily={familyOf('jetbrains')} fontWeight={800} fontSize={spec.size * 1.2} fill="none" stroke={col} strokeOpacity={gl.o} strokeWidth={spec.size * gl.w}>{ch}</text>)}
        <text x={0} y={0} fontFamily={familyOf('jetbrains')} fontWeight={800} fontSize={spec.size * 1.2} fill={mixHex(col, '#ffffff', 0.5)}>{ch}</text>
      </g>,
    );
  }
  return <g>{glyphs}</g>;
};
