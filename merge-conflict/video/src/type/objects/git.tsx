// Git objects as PROPS inside the disco or metal stage (scene-map.md "Type: every line is a git object", binding:
// never a flat app screen; each object is built from its side's material: disco = neon tubes, light boxes, lit
// floor tiles, glitter; metal = forged steel, flame, blackletter). Every time is passed in from the token map;
// nothing here knows the song. All are drawn in the type plane (HOME screen px), so the camera parallaxes them.
import type { ReactNode } from 'react';
import { type Hex, clamp01, lerp, mixHex, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import type { Token } from '../../lyrics/bind.ts';
import { beatIndexAt, beatLengthAt, beatPos } from '../../timing.ts';
import { capOf, type Face, familyOf, MONO_ADV, widthOf } from '../fonts.tsx';
import { clean, faceFor, hueAt, INK, keyFill, type Singer } from '../forms/common.tsx';
import { MergeConflictLogo, type LogoDesign } from '../logo/Logo.tsx';
import { GLOW } from '../Svg.tsx';

const MONO = familyOf('jetbrains');

// ---- the kinetic lyric line (LGTM: big, left-aligned, revealed word by word, key word in the accent) ----------
export interface LyricSpec { id: string; tokens: readonly Token[]; key: number; singer: Singer; x: number; y: number; w: number; size: number; face?: Face; t1: number }
export const Lyric = ({ spec, t }: { spec: LyricSpec; t: number }) => {
  if (t >= spec.t1 || t < (spec.tokens[0]?.start ?? Infinity) - 0.1) return null;
  const face = faceFor(spec.face ?? 'display', spec.singer, t);
  const out: ReactNode[] = [];
  let x = spec.x;
  let y = spec.y;
  spec.tokens.forEach((tk, i) => {
    const isKey = i === spec.key;
    const size = isKey ? spec.size * 1.55 : spec.size;
    const text = clean(tk.text).toUpperCase();
    const w = widthOf(`${text} `, size, face);
    if (x + w - widthOf(' ', size, face) > spec.x + spec.w && x > spec.x) {
      x = spec.x;
      y += spec.size * 1.05;
    }
    const p = t < tk.start ? 0 : outQuad((t - tk.start) / (6 / 60));
    if (p > 0) {
      const s = lerp(1.35, 1, p);
      out.push(
        <text key={i} x={x} y={y} fontFamily={familyOf(face)} fontSize={size} fill={isKey ? keyFill(spec.singer, t) : hueAt(spec.singer, t, i)} stroke={INK} strokeWidth={size * 0.045} strokeLinejoin="round" paintOrder="stroke" opacity={p} transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
          {text}
        </text>,
      );
    }
    x += w;
  });
  return <g>{out}</g>;
};

// ---- a neon sign of rows (disco light box): `git branch`, line 42, the diff ----------------------------------
export interface SignRow { text: string; color: Hex; on: number; dim?: boolean; strike?: number }
/** A neon light-box sign: a dark box with a tube border; each row lights (flicker, then hum) at its `on` time;
 *  `strike` draws a red strike-through tube at that time. Tubes are glow strokes, never a filter. */
export const NeonSign = ({ rows, x, y, size, t, border = '#5fd3ff', title }: { rows: readonly SignRow[]; x: number; y: number; size: number; t: number; border?: Hex; title?: string }) => {
  const lh = size * 1.25;
  const w = Math.max(...rows.map((r) => r.text.length)) * MONO_ADV * size + size * 1.6;
  const h = rows.length * lh + size * 1.1 + (title ? size * 0.9 : 0);
  const step = Math.floor(t * 60);
  const hum = 0.9 + 0.1 * Math.sin(t * 7);
  return (
    <g fontFamily={MONO} fontWeight={800}>
      <rect x={x} y={y} width={w} height={h} rx={size * 0.4} fill="#06040e" fillOpacity={0.82} />
      {GLOW.map((g, k) => <rect key={k} x={x} y={y} width={w} height={h} rx={size * 0.4} fill="none" stroke={border} strokeOpacity={g.o * hum} strokeWidth={size * g.w * 0.6} />)}
      <rect x={x} y={y} width={w} height={h} rx={size * 0.4} fill="none" stroke={mixHex(border, '#ffffff', 0.5)} strokeWidth={size * 0.035} />
      {title && <text x={x + size * 0.8} y={y + size * 1.15} fontSize={size * 0.62} fill="#8b949e">{title}</text>}
      {rows.map((r, i) => {
        const ry = y + (title ? size * 0.9 : 0) + size * 0.55 + (i + 1) * lh - size * 0.25;
        const lit = t >= r.on;
        const flick = lit && t < r.on + 7 / 60 && seeded(`neon:${i}:${step}`)() < 0.5;
        const lv = !lit ? 0 : flick ? 0.25 : r.dim ? 0.45 : 1;
        const st = r.strike !== undefined && t >= r.strike ? outQuad((t - r.strike) / (8 / 60)) : 0;
        const tw = r.text.length * MONO_ADV * size;
        return (
          <g key={i}>
            <text x={x + size * 0.8} y={ry} fontSize={size} fill="none" stroke={r.color} strokeOpacity={0.18} strokeWidth={size * 0.03}>{r.text}</text>
            {lv > 0 && GLOW.map((g, k) => <text key={k} x={x + size * 0.8} y={ry} fontSize={size} fill="none" stroke={r.color} strokeOpacity={g.o * lv} strokeWidth={size * g.w}>{r.text}</text>)}
            {lv > 0 && <text x={x + size * 0.8} y={ry} fontSize={size} fill={mixHex(r.color, '#ffffff', 0.55)} fillOpacity={lv}>{r.text}</text>}
            {st > 0 && <line x1={x + size * 0.7} y1={ry - size * 0.32} x2={x + size * 0.7 + (tw + size * 0.2) * st} y2={ry - size * 0.32} stroke="#ff3b5c" strokeWidth={size * 0.12} strokeLinecap="round" />}
          </g>
        );
      })}
    </g>
  );
};

// ---- the 00:00 push notification (a neon light-box card) -------------------------------------------------------
export const PushNote = ({ x, y, t, inAt, clockAt, whoAt, revealAt }: { x: number; y: number; t: number; inAt: number; clockAt: number; whoAt: number; revealAt: number }) => {
  if (t < inAt) return null;
  const slide = outQuad((t - inAt) / (10 / 60));
  const W = 760;
  const H = 300;
  const ox = lerp(900, 0, slide);
  const shake = t >= whoAt && t < revealAt ? 6 * Math.sin(t * 90) : 0;
  const pulse = 0.85 + 0.15 * Math.sin(t * 9);
  return (
    <g transform={`translate(${x + ox + shake} ${y})`} fontFamily={MONO} fontWeight={800}>
      <rect width={W} height={H} rx={36} fill="#08040f" fillOpacity={0.85} />
      {GLOW.map((g, k) => <rect key={k} width={W} height={H} rx={36} fill="none" stroke="#ff4fd8" strokeOpacity={g.o * pulse} strokeWidth={60 * g.w} />)}
      <rect width={W} height={H} rx={36} fill="none" stroke="#ffd0f6" strokeWidth={3} />
      <text x={40} y={70} fontSize={34} fill="#ff9be8">git push origin main</text>
      <text x={40} y={190} fontSize={120} fill={t >= clockAt ? '#ffffff' : '#3a2a4a'}>{t >= clockAt ? '00:00' : '--:--'}</text>
      <circle cx={W - 110} cy={170} r={70} fill={t >= revealAt ? '#ff7a1a' : '#1a1026'} stroke="#ff4fd8" strokeWidth={5} />
      <text x={W - 110} y={198} fontSize={84} textAnchor="middle" fill={t >= revealAt ? '#0b0614' : '#ff9be8'}>{t >= revealAt ? '!' : '?'}</text>
      {t >= whoAt && <text x={40} y={262} fontSize={34} fill="#ffd0f6">author: {t >= revealAt ? 'orange' : 'unknown'}</text>}
    </g>
  );
};

// ---- git log --graph in neon tubes: a blue main line, an orange branch splitting off ------------------------------
export const GitGraph = ({ x, y, t, splitAt, labelAt, commits }: { x: number; y: number; t: number; splitAt: number; labelAt: number; commits: readonly number[] }) => {
  const H = 640;
  const tube = (d: string, c: Hex, p: number, key: string) => (
    <g key={key}>
      {GLOW.map((g, k) => <path key={k} d={d} fill="none" stroke={c} strokeOpacity={g.o} strokeWidth={110 * g.w} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />)}
      <path d={d} fill="none" stroke={mixHex(c, '#ffffff', 0.5)} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
    </g>
  );
  const p = outQuad(clamp01((t - splitAt) / 0.45));
  const branch = `M ${x} ${y + H * 0.75} C ${x} ${y + H * 0.45}, ${x + 260} ${y + H * 0.5}, ${x + 260} ${y + H * 0.2} L ${x + 260} ${y}`;
  return (
    <g fontFamily={MONO} fontWeight={800}>
      {tube(`M ${x} ${y + H} L ${x} ${y}`, '#2f7bff', 1, 'main')}
      {[0.9, 0.7, 0.5, 0.3, 0.1].map((k, i) => <circle key={i} cx={x} cy={y + H * k} r={16} fill="#8fd8ff" />)}
      <text x={x - 30} y={y + H + 50} fontSize={36} textAnchor="end" fill="#8fd8ff">main</text>
      {t >= splitAt && tube(branch, '#ff7a1a', p, 'branch')}
      {commits.map((c, i) => (t >= c ? <circle key={`c${i}`} cx={x + 260} cy={y + H * (0.2 - i * 0.07) + 40} r={18 * outQuad((t - c) / 0.1)} fill="#ffd2a8" /> : null))}
      {t >= labelAt && (
        <g opacity={outQuad((t - labelAt) / 0.12)}>
          {GLOW.map((g, k) => <text key={k} x={x + 310} y={y + 60} fontSize={54} fill="none" stroke="#ff7a1a" strokeOpacity={g.o} strokeWidth={54 * g.w}>feature</text>)}
          <text x={x + 310} y={y + 60} fontSize={54} fill="#ffe0c8">feature</text>
        </g>
      )}
    </g>
  );
};

// ---- the editor's conflict buttons: disco floor tiles on blue's side, steel plaques on orange's ----------------
export type ButtonStyle = 'disco' | 'steel' | 'dim';
export interface ConflictButton { label: string; style: ButtonStyle; press?: number }
export const ConflictButtons = ({ buttons, x, y, w, t }: { buttons: readonly ConflictButton[]; x: number; y: number; w: number; t: number }) => {
  const gap = 30;
  const bw = (w - gap * (buttons.length - 1)) / buttons.length;
  const bh = 160;
  return (
    <g fontWeight={800}>
      {buttons.map((b, i) => {
        const bx = x + i * (bw + gap);
        const pressed = b.press !== undefined && t >= b.press;
        const k = pressed ? 1 - outQuad((t - (b.press as number)) / (12 / 60)) : 0;
        const s = pressed ? 0.94 + 0.06 * (1 - k) : 1;
        const cx = bx + bw / 2;
        const cy = y + bh / 2;
        let body: ReactNode;
        if (b.style === 'disco') {
          // a lit disco floor tile: mirror-tile grid, glowing on press
          const lv = pressed ? 1 : 0.45;
          body = (
            <g>
              <rect x={bx} y={y} width={bw} height={bh} rx={10} fill={mixHex('#1a3a8a', '#7fe3ff', pressed ? 0.55 : 0.15)} />
              {Array.from({ length: 12 }, (_, c) => <line key={c} x1={bx + (c * bw) / 12} y1={y} x2={bx + (c * bw) / 12} y2={y + bh} stroke="#0b1430" strokeWidth={3} />)}
              <line x1={bx} y1={cy} x2={bx + bw} y2={cy} stroke="#0b1430" strokeWidth={3} />
              {GLOW.map((g, q) => <rect key={q} x={bx} y={y} width={bw} height={bh} rx={10} fill="none" stroke="#19c8ff" strokeOpacity={g.o * lv} strokeWidth={70 * g.w} />)}
            </g>
          );
        } else if (b.style === 'steel') {
          body = (
            <g>
              <rect x={bx} y={y} width={bw} height={bh} rx={6} fill="url(#steel-plaque)" stroke={pressed ? '#ff4a1a' : '#3b424a'} strokeWidth={pressed ? 8 : 4} />
              {[[14, 14], [bw - 14, 14], [14, bh - 14], [bw - 14, bh - 14]].map(([rx, ry], q) => <circle key={q} cx={bx + (rx as number)} cy={y + (ry as number)} r={7} fill="#20252b" stroke="#aab3bd" strokeWidth={2} />)}
              {pressed && <rect x={bx} y={y + bh - 10} width={bw} height={10} fill="#ff4a1a" opacity={0.85} />}
            </g>
          );
        } else {
          body = <rect x={bx} y={y} width={bw} height={bh} rx={10} fill="#140f1e" stroke="#3a2a4a" strokeWidth={3} />;
        }
        const size = Math.min(58, (bw * 0.9) / (b.label.length * 0.55));
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
            {body}
            <text x={cx} y={cy + size * 0.36} textAnchor="middle" fontFamily={b.style === 'steel' ? familyOf('pirata') : familyOf('bungee')} fontSize={size * (b.style === 'steel' ? 1.25 : 1)} fill={b.style === 'disco' ? '#ffffff' : b.style === 'steel' ? '#ffffff' : '#6e6a7a'} stroke={INK} strokeWidth={3} paintOrder="stroke">
              {b.label}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="steel-plaque" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d8dee6" />
          <stop offset="0.48" stopColor="#7a838d" />
          <stop offset="0.52" stopColor="#3b424a" />
          <stop offset="1" stopColor="#9aa3ad" />
        </linearGradient>
      </defs>
    </g>
  );
};

// ---- a rubber stamp word ("(NO!)", "(NEVER!)") in the shouter's family -------------------------------------------
export const StampWord = ({ text, at, x, y, size, singer, t, rot = -8, until = Infinity }: { text: string; at: number; x: number; y: number; size: number; singer: Singer; t: number; rot?: number; until?: number }) => {
  if (t < at || t >= until) return null;
  const face = faceFor('bungee', singer, t);
  const land = outQuad((t - at) / (6 / 60));
  const s = lerp(1.6, 1, land);
  const w = widthOf(text, size, face) + size * 0.7;
  const h = size * 1.25;
  const c: Hex = '#ff2a3a';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={lerp(0.4, 1, land)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={size * 0.12} fill="none" stroke={c} strokeWidth={size * 0.1} />
      <text x={0} y={size * capOf(face) * 0.5} textAnchor="middle" fontFamily={familyOf(face)} fontSize={size} fill={c}>{text}</text>
    </g>
  );
};

// ---- the build is on fire: flames along the bottom edge (shape flicker, luminance held) ----------------------------
export const Flames = ({ t, from, intensity = 1 }: { t: number; from: number; intensity?: number }) => {
  if (t < from) return null;
  const grow = outQuad((t - from) / 0.35) * intensity;
  const step = Math.floor(t * 20);
  const tongues = Array.from({ length: 26 }, (_, i) => {
    const r = seeded(`flame:${i}:${step}`);
    const x = (i + 0.5) * (1920 / 26) + r.range(-18, 18);
    const h = (140 + r.range(0, 170)) * grow;
    const w = 90 + r.range(0, 40);
    return { x, h, w, side: x < 960 };
  });
  return (
    <g>
      {tongues.map((f, i) => (
        <g key={i}>
          <path d={`M ${f.x - f.w / 2} 1080 Q ${f.x - f.w * 0.3} ${1080 - f.h * 0.6} ${f.x} ${1080 - f.h} Q ${f.x + f.w * 0.3} ${1080 - f.h * 0.6} ${f.x + f.w / 2} 1080 Z`} fill={f.side ? '#2f7bff' : '#ff4a1a'} opacity={0.75} />
          <path d={`M ${f.x - f.w / 4} 1080 Q ${f.x} ${1080 - f.h * 0.55} ${f.x + f.w / 4} 1080 Z`} fill={f.side ? '#bfe8ff' : '#ffd23a'} opacity={0.85} />
        </g>
      ))}
    </g>
  );
};

// ---- the ======= divider filling the frame, one bar slamming per "equals" ------------------------------------------
export const Divider = ({ t, hits, until }: { t: number; hits: readonly number[]; until: number }) => {
  if (t >= until || t < (hits[0] ?? Infinity)) return null;
  return (
    <g>
      {hits.map((h, i) => {
        if (t < h) return null;
        const p = outQuad((t - h) / (8 / 60));
        const y = 360 + i * 150;
        const w = 1920 * p;
        return (
          <g key={i}>
            {Array.from({ length: 7 }, (_, k) => {
              const bx = 960 - w / 2 + (k * w) / 7 + 10;
              const c: Hex = k < 3.5 ? '#2f7bff' : '#ff4a1a';
              return (
                <g key={k}>
                  <rect x={bx} y={y} width={w / 7 - 20} height={34} fill={c} />
                  <rect x={bx} y={y + 52} width={w / 7 - 20} height={34} fill={c} />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

// ---- logo B's signature move: slam on the first "Merge", shove apart on the second, re-lock on the line's end ----
export interface LogoMoveSpec { slam: number; shove: number; lock: number; until: number }
export const LogoMove = ({ spec, t, design }: { spec: LogoMoveSpec; t: number; design: LogoDesign }) => {
  if (t < spec.slam || t >= spec.until) return null;
  const land = 1.35 - 0.35 * outQuad((t - spec.slam) / (8 / 60));
  // shove: the halves pull apart from the second "merge" and hold, then slam back together on the lock word
  const apart = t < spec.shove ? 0 : t < spec.lock ? 210 * outQuad((t - spec.shove) / beatLengthAt(spec.shove)) : 210 * (1 - outQuad((t - spec.lock) / (6 / 60)));
  const punch = t < spec.lock ? 1 : 1 + 0.18 * (1 - outQuad((t - spec.lock) / (10 / 60)));
  const bp = beatPos(t);
  return (
    <g transform={`translate(960 470) scale(${land * punch}) translate(-960 -470)`}>
      <MergeConflictLogo id={`logo-move-${spec.slam.toFixed(2)}`} design={design} resolved={false} cx={960} cy={470} width={1500} beat={bp - Math.floor(bp)} beatIndex={beatIndexAt(t)} apart={Math.max(0, apart)} />
    </g>
  );
};

