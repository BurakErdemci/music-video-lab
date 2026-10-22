// The MERGE CONFLICT signature logo, three candidates (Burak picks one; nothing is wired into the film yet).
// Each has a CONFLICT state (the two girls' families fighting) and a RESOLVED state (176.80 s "Merge conflict
// resolved inside my soul": the two colours joined). `beat` is the position inside the current beat (0..1) so
// the lockups can shove on the beat once wired; the stills use a fixed value.
//  A  conflict-marker lockup: <<<<<<< MERGE / ======= / CONFLICT >>>>>>>; MERGE pop (blue neon), CONFLICT metal
//     (orange blackletter flame); the ======= bar is the split line and the halves shove against each other.
//  B  split word: MERGE CONFLICT cut on a diagonal; one side disco (blue chrome), the other metal (orange
//     blackletter with flame); the cut edge jitters like a diff line.
//  C  metal band logo: a symmetric spiky construction with a lightning underline; the O of CONFLICT is a
//     mirror ball, so both girls live in one mark.
import type { ReactNode } from 'react';
import { seeded } from '../../lib/seeded.ts';
import { capOf, type Face, familyOf, layout, widthOf } from '../fonts.tsx';

export type LogoDesign = 'A' | 'B' | 'C';
/** beat: position inside the current beat (0..1, the shove); beatIndex: the beat number, which re-seeds the
 *  split edge's diff-line jitter on every beat. */
/** apart: px the two halves are shoved apart (B: the disco side left, the metal side right; 0 = locked). */
/** aligned (B): each metal letter is centred on its disco letter, so the cut takes each letter from one side only
 *  (round 7d: the two faces' own spacings put R twice and lost an F at the seam, unreadable in chorus 2). */
export interface LogoProps { design: LogoDesign; resolved: boolean; cx: number; cy: number; width: number; beat?: number; beatIndex?: number; apart?: number; id: string; aligned?: boolean }

const BLUE = '#2f7bff';
const CYAN = '#7fe3ff';
const ORANGE = '#ff6a10';
const RED = '#e8230f';
const INK = '#07040c';

/** Shared paint servers: blue chrome, orange flame, the resolved orange->blue gradient, steel. */
const Defs = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={`${id}-chrome`} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="#f4fbff" />
      <stop offset="0.42" stopColor={CYAN} />
      <stop offset="0.5" stopColor="#1240b8" />
      <stop offset="0.62" stopColor={BLUE} />
      <stop offset="1" stopColor="#dff4ff" />
    </linearGradient>
    <linearGradient id={`${id}-flame`} x1="0" x2="0" y1="1" y2="0">
      <stop offset="0" stopColor="#5a0700" />
      <stop offset="0.35" stopColor={RED} />
      <stop offset="0.7" stopColor={ORANGE} />
      <stop offset="1" stopColor="#ffd23a" />
    </linearGradient>
    <linearGradient id={`${id}-joined`} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stopColor={ORANGE} />
      <stop offset="0.5" stopColor="#ff3d9a" />
      <stop offset="1" stopColor={BLUE} />
    </linearGradient>
    <linearGradient id={`${id}-steel`} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="0.45" stopColor="#aab3bd" />
      <stop offset="0.52" stopColor="#3b424a" />
      <stop offset="1" stopColor="#d8dee6" />
    </linearGradient>
  </defs>
);

/** A word set at size px with its left edge at x and baseline at y, with an ink outline and a glow colour. */
const Word = ({ text, x, y, size, face, fill, glow, stroke = INK, sw = 0.05, track }: { text: string; x: number; y: number; size: number; face: Face; fill: string; glow?: string; stroke?: string; sw?: number; track?: number }) => (
  <g fontFamily={familyOf(face)} fontSize={size} letterSpacing={track ? track * size : undefined}>
    {glow && (
      <>
        <text x={x} y={y} fill="none" stroke={glow} strokeOpacity={0.18} strokeWidth={size * 0.22} strokeLinejoin="round">{text}</text>
        <text x={x} y={y} fill="none" stroke={glow} strokeOpacity={0.35} strokeWidth={size * 0.1} strokeLinejoin="round">{text}</text>
      </>
    )}
    <text x={x} y={y} fill={fill} stroke={stroke} strokeWidth={size * sw} strokeLinejoin="round" paintOrder="stroke">{text}</text>
  </g>
);

// ---- A: conflict-marker lockup ------------------------------------------------------------------------------
const LogoA = ({ resolved, cx, cy, width, beat = 0, id }: LogoProps) => {
  const mono: Face = 'jetbrains';
  const popFace: Face = 'bungee';
  // Pirata One: blackletter that stays readable in capitals (UnifrakturMaguntia capitals did not read)
  const metalFace: Face = 'pirata';
  const sMerge = (width * 0.62) / widthOf('MERGE', 1, popFace);
  const sConf = (width * 0.74) / widthOf('CONFLICT', 1, metalFace);
  const mk = sMerge * 0.42;
  const shove = resolved ? 0 : 26 * Math.sin(Math.PI * beat);
  const top = cy - sMerge * capOf(popFace) * 0.25;
  const barY = top + sMerge * 0.32;
  const confY = barY + sConf * capOf(metalFace) + sConf * 0.16;
  // each row centred, the top row nudged left and the bottom row right, so they overlap at the bar
  const row1 = widthOf('<<<<<<< ', mk, mono) + widthOf('MERGE', sMerge, popFace);
  const row3 = widthOf('CONFLICT', sConf, metalFace) + widthOf(' >>>>>>>', mk, mono);
  const r1x = cx - row1 / 2 - width * 0.07 + shove;
  const r3x = cx - row3 / 2 + width * 0.07 - shove;
  const mergeX = r1x + widthOf('<<<<<<< ', mk, mono);
  const confX = r3x;
  if (resolved) {
    const s = (width * 0.95) / widthOf('MERGE CONFLICT', 1, 'bungee');
    return (
      <g>
        <Word text="MERGE CONFLICT" x={cx - widthOf('MERGE CONFLICT', s, 'bungee') / 2} y={cy + (s * capOf('bungee')) / 2} size={s} face="bungee" fill={`url(#${id}-joined)`} glow="#ff3d9a" />
        <rect x={cx - width / 2} y={cy + (s * capOf('bungee')) / 2 + s * 0.22} width={width} height={s * 0.12} rx={s * 0.06} fill={`url(#${id}-joined)`} />
        <Word text="======= resolved" x={cx - widthOf('======= resolved', s * 0.3, mono) / 2} y={cy + (s * capOf('bungee')) / 2 + s * 0.72} size={s * 0.3} face={mono} fill="#ffffff" sw={0.03} />
        <Word text="<<<<<<< ours" x={cx - width / 2} y={cy - (s * capOf('bungee')) / 2 - s * 0.3} size={s * 0.22} face={mono} fill={BLUE} sw={0.02} />
        <Word text="theirs >>>>>>>" x={cx + width / 2 - widthOf('theirs >>>>>>>', s * 0.22, mono)} y={cy - (s * capOf('bungee')) / 2 - s * 0.3} size={s * 0.22} face={mono} fill={ORANGE} sw={0.02} />
      </g>
    );
  }
  return (
    <g>
      <Word text="<<<<<<<" x={r1x} y={top - sMerge * 0.2} size={mk} face={mono} fill={CYAN} glow={BLUE} sw={0.03} />
      <Word text="MERGE" x={mergeX} y={top} size={sMerge} face={popFace} fill={`url(#${id}-chrome)`} glow={BLUE} />
      {/* the split line: the ======= bar, the two halves pressed against it */}
      <g transform={`translate(${-shove * 0.4} 0)`}>
        {Array.from({ length: 7 }, (_, k) => (
          <g key={k}>
            <rect x={cx - width / 2 + (k * width) / 7 + 8} y={barY} width={width / 7 - 16} height={sMerge * 0.07} fill={k < 3.5 ? BLUE : ORANGE} />
            <rect x={cx - width / 2 + (k * width) / 7 + 8} y={barY + sMerge * 0.11} width={width / 7 - 16} height={sMerge * 0.07} fill={k < 3.5 ? BLUE : ORANGE} />
          </g>
        ))}
      </g>
      <Word text="CONFLICT" x={confX} y={confY} size={sConf} face={metalFace} fill={`url(#${id}-flame)`} glow={RED} sw={0.035} />
      <Word text=">>>>>>>" x={confX + widthOf('CONFLICT ', sConf, metalFace)} y={confY - sConf * 0.2} size={mk} face={mono} fill={ORANGE} glow={RED} sw={0.03} />
    </g>
  );
};

// ---- B: split word -----------------------------------------------------------------------------------------
const LogoB = ({ resolved, cx, cy, width, beatIndex = 0, apart = 0, id, aligned = false }: LogoProps) => {
  const disco: Face = 'bungee';
  const metal: Face = 'pirata';
  const lines = ['MERGE', 'CONFLICT'];
  const set = (face: Face) => {
    const s = (width * 0.92) / Math.max(...lines.map((l) => widthOf(l, 1, face)));
    const capH = s * capOf(face);
    const gap = s * 0.14;
    const y0 = cy - (2 * capH + gap) / 2 + capH;
    return lines.map((l, i) => ({ text: l, x: cx - widthOf(l, s, face) / 2, y: y0 + i * (capH + gap), s, face }));
  };
  // the words letter by letter, every letter centred where the disco face sets it
  const glyphs = (face: Face) => {
    const own = set(face);
    return set(disco).flatMap((d, i) => {
      const o = own[i] as (typeof own)[number];
      let x = d.x;
      return [...d.text].map((c, k) => {
        const w = widthOf(c, d.s, disco);
        const g = { text: c, x: x + w / 2 - widthOf(c, o.s, face) / 2, y: o.y, s: o.s, face, key: `${i}-${k}` };
        x += w;
        return g;
      });
    });
  };
  const words = (face: Face) => (aligned ? glyphs(face) : set(face).map((w) => ({ ...w, key: w.text })));
  const half = width * 0.55;
  const r = seeded(`logoB:${beatIndex}`);
  // the cut: a diagonal from top-right to bottom-left, jittering like a diff line
  const pts: [number, number][] = Array.from({ length: 13 }, (_, k) => {
    const u = k / 12;
    const jit = resolved ? 0 : r.range(-14, 14);
    return [cx + half * 0.35 - u * half * 0.7 + jit, cy - half * 0.55 + u * half * 1.1];
  });
  const cut = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const discoSide = `${cut} L ${cx - width} ${cy + width} L ${cx - width} ${cy - width} Z`;
  const metalSide = `${cut} L ${cx + width} ${cy + width} L ${cx + width} ${cy - width} Z`;
  if (resolved) {
    return (
      <g>
        {set('bungee').map((w) => <Word key={w.text} text={w.text} x={w.x} y={w.y} size={w.s} face="bungee" fill={`url(#${id}-joined)`} glow="#ff3d9a" />)}
        <path d={cut} fill="none" stroke="#ffffff" strokeWidth={6} strokeDasharray="18 14" opacity={0.85} />
      </g>
    );
  }
  return (
    <g>
      <defs>
        <clipPath id={`${id}-disco`}><path d={discoSide} /></clipPath>
        <clipPath id={`${id}-metal`}><path d={metalSide} /></clipPath>
      </defs>
      <g transform={`translate(${-apart} ${-apart * 0.35})`}><g clipPath={`url(#${id}-disco)`}>{words(disco).map((w) => <Word key={w.key} text={w.text} x={w.x} y={w.y} size={w.s} face={disco} fill={`url(#${id}-chrome)`} glow={BLUE} />)}</g></g>
      <g transform={`translate(${apart} ${apart * 0.35})`}><g clipPath={`url(#${id}-metal)`}>{words(metal).map((w) => <Word key={w.key} text={w.text} x={w.x} y={w.y} size={w.s} face={metal} fill={`url(#${id}-flame)`} glow={RED} sw={0.035} />)}</g></g>
      {/* the cut edge as a diff line: red - marks on the disco side, green + marks on the metal side */}
      <path d={cut} fill="none" stroke="#ffffff" strokeWidth={5} />
      {pts.filter((_, k) => k % 2).map(([x, y], k) => (
        <g key={k} fontFamily={familyOf('jetbrains')} fontWeight={800} fontSize={30}>
          <text x={x - 44} y={y + 10} fill="#ff4d5e">-</text>
          <text x={x + 22} y={y + 10} fill="#3dff9a">+</text>
        </g>
      ))}
    </g>
  );
};

// ---- C: metal band logo with a mirror-ball O ------------------------------------------------------------------
const MirrorBall = ({ cx, cy, r, resolved, id }: { cx: number; cy: number; r: number; resolved: boolean; id: string }) => {
  const rows = 9;
  const tiles: ReactNode[] = [];
  for (let i = 0; i < rows; i++) {
    const a0 = -Math.PI / 2 + (i * Math.PI) / rows;
    const a1 = a0 + Math.PI / rows;
    const y0 = cy + Math.sin(a0) * r;
    const y1 = cy + Math.sin(a1) * r;
    const w0 = Math.cos((a0 + a1) / 2) * r;
    const cols = Math.max(3, Math.round(w0 / (r / 5)));
    for (let j = 0; j < cols; j++) {
      const x0 = cx - w0 + (j * 2 * w0) / cols;
      const k = (i * 7 + j * 3) % 5;
      tiles.push(<rect key={`${i}-${j}`} x={x0 + 1.5} y={y0 + 1.5} width={(2 * w0) / cols - 3} height={y1 - y0 - 3} fill={resolved ? `url(#${id}-joined)` : ['#e6f2ff', '#9fb4cc', '#5b6f8a', CYAN, '#ffffff'][k]} opacity={resolved ? 0.6 + 0.08 * k : 1} />);
    }
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.08} fill={INK} />
      {tiles}
      <path d={`M ${cx + r * 0.35} ${cy - r * 0.55} l 10 -34 l 10 34 l 34 10 l -34 10 l -10 34 l -10 -34 l -34 -10 Z`} fill="#ffffff" />
    </g>
  );
};

const LogoC = ({ resolved, cx, cy, width, id }: LogoProps) => {
  const face: Face = 'metalmania';
  const text = 'MERGE CONFLICT';
  const s = (width * 0.86) / widthOf(text, 1, face);
  const l = layout(text, s, face);
  const x0 = cx - l.width / 2;
  const capH = s * capOf(face);
  const base = cy + capH / 2;
  const fill = resolved ? `url(#${id}-joined)` : `url(#${id}-steel)`;
  const edge = resolved ? '#ff3d9a' : ORANGE;
  const oIndex = text.indexOf('O', 6); // the O of CONFLICT
  // symmetric spikes off the first and last letters, mirrored about cx
  const spike = (dir: 1 | -1) => {
    const x = cx + dir * (l.width / 2 + s * 0.05);
    return `M ${x} ${base - capH * 0.05} L ${x + dir * s * 1.2} ${base - capH * 0.55} L ${x + dir * s * 0.3} ${base - capH * 0.55} L ${x + dir * s * 0.95} ${base - capH * 1.45} L ${x} ${base - capH * 0.95} Z`;
  };
  const bolt = `M ${cx - l.width * 0.55} ${base + s * 0.2} L ${cx - s * 0.2} ${base + s * 0.2} L ${cx - s * 0.05} ${base + s * 0.42} L ${cx + s * 0.12} ${base + s * 0.2} L ${cx + l.width * 0.55} ${base + s * 0.2} L ${cx + s * 0.08} ${base + s * 0.3} L ${cx - s * 0.05} ${base + s * 0.56} L ${cx - s * 0.18} ${base + s * 0.3} Z`;
  return (
    <g>
      <path d={spike(-1)} fill={fill} stroke={edge} strokeWidth={4} />
      <path d={spike(1)} fill={fill} stroke={edge} strokeWidth={4} />
      <g fontFamily={familyOf(face)} fontSize={s}>
        {[...text].map((ch, i) => {
          if (i === oIndex || ch === ' ') return null;
          const x = x0 + (l.xs[i] as number);
          return (
            <g key={i}>
              <text x={x} y={base} fill="none" stroke={edge} strokeOpacity={0.35} strokeWidth={s * 0.12}>{ch}</text>
              <text x={x} y={base} fill={fill} stroke={INK} strokeWidth={s * 0.04} paintOrder="stroke">{ch}</text>
            </g>
          );
        })}
      </g>
      <MirrorBall cx={x0 + (l.xs[oIndex] as number) + (l.ws[oIndex] as number) / 2} cy={base - capH / 2} r={capH * 0.5} resolved={resolved} id={id} />
      <path d={bolt} fill={resolved ? `url(#${id}-joined)` : `url(#${id}-flame)`} stroke={INK} strokeWidth={3} />
    </g>
  );
};

export const MergeConflictLogo = (p: LogoProps) => (
  <g>
    <Defs id={p.id} />
    {p.design === 'A' ? <LogoA {...p} /> : p.design === 'B' ? <LogoB {...p} /> : <LogoC {...p} />}
  </g>
);
