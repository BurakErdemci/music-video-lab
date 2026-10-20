// Code-drawn stand-ins for the part-3 cut-outs (the level-12 kid G32, his boot G33, the queueing knights G34) and
// the painting props drawn in code (C24 tablets, C07 KO stars, C08 flakes, C09 HP bar, clouds, dust).
// DOM SVG in screen pixels, placed through lib.project; a flat colour card cannot read as a figure.
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { InkFilter, inkFilterId, seeded, GOLD, INK, IVORY, VIOLET } from '../../vfx/effects.ts';
import { clamp01, easeOut, lerp } from './lib.ts';

export const MAGENTA = '#E0129A';
const ANTON = "'UiAnton', 'Anton', Impact, sans-serif";

interface FigBox {
  /** Feet point in frame px. */
  x: number;
  y: number;
  /** Figure height in px. */
  h: number;
  flip?: boolean;
  rot?: number;
  opacity?: number;
  style?: CSSProperties;
}

const Fig = ({ x, y, h, flip, rot = 0, opacity = 1, style, vw, vh, seed, children }: FigBox & { vw: number; vh: number; seed: number; children: ReactNode }) => {
  const w = (h * vw) / vh;
  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      style={{
        position: 'absolute', left: x - w / 2, top: y - h, width: w, height: h, overflow: 'visible', opacity,
        transform: `rotate(${rot}deg) scaleX(${flip ? -1 : 1})`, transformOrigin: '50% 100%', ...style,
      }}
    >
      <defs>
        <InkFilter seed={seed} rough={3} breakup={0.15} />
      </defs>
      <g filter={`url(#${inkFilterId(seed, 3, 0.15)})`}>{children}</g>
    </svg>
  );
};

const limb = (x: number, y: number, len: number, deg: number, side: 1 | -1): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [x + side * Math.sin(a) * len, y + Math.cos(a) * len];
};

export interface KidPose {
  /** Arm angles from straight down, degrees, + = outward/up. */
  armL?: number;
  armR?: number;
  lean?: number;
  head?: number;
  /** Boot in the right hand at this angle (deg), 'none' = no boot. */
  boot?: number | 'none';
  /** Boot hangs on its laces and spins around the hand (twirl), radians. */
  twirl?: number;
  step?: number;
  /** 0..1 vertical squash/stretch for anticipation. */
  squash?: number;
}

/** The level-12 kid (G32 stand-in): oversized ivory hood, black body, mismatched gold armour, one foot in a sock. */
export const Kid = ({ pose = {}, seed = 31, ...box }: FigBox & { pose?: KidPose; seed?: number }) => {
  const { armL = 20, armR = 20, lean = 0, head = 0, boot = 0, twirl, step = 0, squash = 0 } = pose;
  const shL: [number, number] = [38, 90];
  const shR: [number, number] = [82, 90];
  const hl = limb(shL[0], shL[1], 30, armL, -1);
  const hr = limb(shR[0], shR[1], 30, armR, 1);
  const bootPos: [number, number] = twirl === undefined ? hr : [hr[0] + Math.cos(twirl) * 30, hr[1] + Math.sin(twirl) * 30];
  const bootRot = twirl === undefined ? (boot === 'none' ? 0 : boot) : (twirl * 180) / Math.PI + 90;
  return (
    <Fig {...box} vw={120} vh={160} seed={seed}>
      <g transform={`translate(60 160) scale(${1 + squash * 0.12} ${1 - squash * 0.15}) translate(-60 -160) rotate(${lean} 60 160)`}>
        <ellipse cx={60} cy={158} rx={34} ry={5} fill={INK} opacity={0.35} />
        {/* legs: left in a boot, right in a sock */}
        <path d={`M50 114 L${48 - step * 8} 150`} stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <path d={`M70 114 L${72 + step * 8} 150`} stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <path d={`M${38 - step * 8} 146 h18 q6 0 6 8 h-26 z`} fill={INK} />
        <path d={`M${66 + step * 8} 145 h14 q9 1 9 9 h-25 z`} fill={IVORY} stroke={INK} strokeWidth={3} />
        {/* body and mismatched armour */}
        <ellipse cx={60} cy={100} rx={26} ry={22} fill={INK} />
        <path d="M46 98 L74 98 L70 114 L50 114 Z" fill={GOLD} stroke={INK} strokeWidth={3} />
        <path d="M30 84 Q38 74 50 82 L46 94 Q36 96 30 84 Z" fill={GOLD} stroke={INK} strokeWidth={3} />
        {/* arms */}
        <path d={`M${shL[0]} ${shL[1]} L${hl[0]} ${hl[1]}`} stroke={INK} strokeWidth={10} strokeLinecap="round" />
        <path d={`M${shR[0]} ${shR[1]} L${hr[0]} ${hr[1]}`} stroke={INK} strokeWidth={10} strokeLinecap="round" />
        {twirl !== undefined ? <path d={`M${hr[0]} ${hr[1]} L${bootPos[0]} ${bootPos[1]}`} stroke={IVORY} strokeWidth={2.5} /> : null}
        {boot !== 'none' ? (
          <g transform={`translate(${bootPos[0]} ${bootPos[1]}) rotate(${bootRot})`}>
            <path d="M-6 -14 L6 -14 L6 4 Q18 6 18 14 L-8 14 Z" fill={INK} stroke={IVORY} strokeWidth={2} />
            <rect x={-6} y={-2} width={12} height={4} fill={GOLD} />
          </g>
        ) : null}
        {/* the hood, far too big */}
        <g transform={`rotate(${head} 60 82)`}>
          <path d="M28 70 Q24 26 64 26 Q98 30 94 66 Q92 84 60 86 Q32 86 28 70 Z" fill={IVORY} stroke={INK} strokeWidth={4} />
          <path d="M64 26 Q84 14 98 22 Q86 30 84 38 Z" fill={IVORY} stroke={INK} strokeWidth={3} />
          <ellipse cx={62} cy={62} rx={18} ry={15} fill={INK} />
          <circle cx={55} cy={60} r={3} fill={IVORY} />
          <circle cx={69} cy={60} r={3} fill={IVORY} />
        </g>
      </g>
    </Fig>
  );
};

export interface KnightPose {
  hop?: number;
  armL?: number;
  armR?: number;
  lean?: number;
  item?: 'spear' | 'broom' | 'none';
  /** Broom angle, degrees from vertical. */
  itemRot?: number;
  laugh?: number;
}

/** A small golden knight (G34 / G15 stand-in): black silhouette, ivory tabard with the gold sun, plumed helm. */
export const Knight = ({ pose = {}, seed = 41, ...box }: FigBox & { pose?: KnightPose; seed?: number }) => {
  const { hop = 0, armL = 15, armR = 15, lean = 0, item = 'none', itemRot = 0, laugh = 0 } = pose;
  const knee = clamp01(hop) * 14;
  const hl = limb(30, 66, 26, armL, -1);
  const hr = limb(70, 66, 26, armR, 1);
  return (
    <Fig {...box} vw={100} vh={150} seed={seed}>
      <g transform={`translate(0 ${-hop * 34}) rotate(${lean} 50 150)`}>
        <ellipse cx={50} cy={148 + hop * 34} rx={24 * (1 - hop * 0.4)} ry={4} fill={INK} opacity={0.3} />
        <path d={`M40 104 L${40 - knee * 0.3} ${124 - knee} L40 146`} stroke={INK} strokeWidth={11} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d={`M60 104 L${60 + knee * 0.3} ${124 - knee} L60 146`} stroke={INK} strokeWidth={11} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M28 62 Q50 52 72 62 L76 108 L24 108 Z" fill={INK} />
        <path d="M36 66 L64 66 L66 106 L34 106 Z" fill={IVORY} stroke={INK} strokeWidth={2} />
        <circle cx={50} cy={84} r={8} fill={GOLD} stroke={INK} strokeWidth={2} />
        <path d={`M30 66 L${hl[0]} ${hl[1]}`} stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <path d={`M70 66 L${hr[0]} ${hr[1]}`} stroke={INK} strokeWidth={9} strokeLinecap="round" />
        {item === 'spear' ? <path d={`M${hr[0]} ${hr[1] + 30} L${hr[0]} ${hr[1] - 60} l-5 10 h10 z`} stroke={INK} strokeWidth={4} fill={GOLD} /> : null}
        {item === 'broom' ? (
          <g transform={`translate(${hr[0]} ${hr[1]}) rotate(${itemRot})`}>
            <path d="M0 -40 L0 50" stroke={GOLD} strokeWidth={5} />
            <path d="M-14 50 L14 50 L22 78 L-22 78 Z" fill={IVORY} stroke={INK} strokeWidth={3} />
            <path d="M-12 60 L-15 76 M0 60 L0 77 M12 60 L15 76" stroke={INK} strokeWidth={2} />
          </g>
        ) : null}
        <g transform={`rotate(${laugh * 14} 50 60)`}>
          <path d="M32 46 Q32 20 50 20 Q68 20 68 46 L68 60 L32 60 Z" fill={INK} />
          <rect x={36} y={38} width={28} height={5} fill={IVORY} />
          <path d="M50 20 Q58 4 72 8 Q60 12 56 22 Z" fill={GOLD} stroke={INK} strokeWidth={2} />
        </g>
      </g>
    </Fig>
  );
};

/** The boot sole straight at the lens (G33 stand-in): cracked ink tread, gold buckle. */
export const BootSole = ({ x, y, h, rot = 0 }: { x: number; y: number; h: number; rot?: number }) => {
  const w = h * 0.72;
  return (
    <svg viewBox="0 0 360 500" style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, overflow: 'visible', transform: `rotate(${rot}deg)` }}>
      <defs>
        <InkFilter seed={77} rough={10} breakup={0.25} />
      </defs>
      <g filter={`url(#${inkFilterId(77, 10, 0.25)})`}>
        <path d="M70 40 Q180 -10 290 40 Q340 140 320 250 Q300 330 260 360 Q290 420 250 480 Q180 520 110 480 Q70 420 100 360 Q50 300 40 220 Q30 110 70 40 Z" fill={INK} />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${80 + (i % 2) * 10} ${70 + i * 34} L${180} ${86 + i * 34} L${280 - (i % 2) * 10} ${70 + i * 34}`} stroke={IVORY} strokeWidth={10} fill="none" strokeLinejoin="round" />
        ))}
        <path d="M150 200 L170 240 L150 280 M210 330 L230 370" stroke={GOLD} strokeWidth={6} fill="none" />
        <rect x={150} y={378} width={60} height={34} rx={6} fill={GOLD} stroke={INK} strokeWidth={6} />
      </g>
    </svg>
  );
};

/** A gold stone tablet with an engraved patch-note line (C24). `crack` 0..1 grows the crack. */
export const Tablet = ({ x, y, h, text, rot = 0, crack = 0, seed = 5 }: { x: number; y: number; h: number; text: string[]; rot?: number; crack?: number; seed?: number }) => {
  const w = h * 0.78;
  const rng = seeded(`tablet-crack:${seed}`);
  const pts = Array.from({ length: 7 }, (_, i) => [140 + rng.range(-40, 40), 20 + i * 54] as [number, number]);
  const n = Math.max(0, Math.round(crack * (pts.length - 1)));
  return (
    <svg viewBox="0 0 280 360" style={{ position: 'absolute', left: x - w / 2, top: y - h, width: w, height: h, overflow: 'visible', transform: `rotate(${rot}deg)`, transformOrigin: '50% 100%' }}>
      <defs>
        <InkFilter seed={seed} rough={7} breakup={0.2} />
      </defs>
      <g filter={`url(#${inkFilterId(seed, 7, 0.2)})`}>
        <path d="M14 70 Q14 10 140 10 Q266 10 266 70 L266 350 L14 350 Z" fill={GOLD} stroke={INK} strokeWidth={12} />
        <path d="M40 80 Q40 40 140 40 Q240 40 240 80 L240 326 L40 326 Z" fill="none" stroke={INK} strokeWidth={4} opacity={0.6} />
        <path d="M230 30 L258 60 L258 340" stroke={IVORY} strokeWidth={6} fill="none" opacity={0.8} />
        {n > 0 ? <path d={`M${pts.slice(0, n + 1).map(([a, b]) => `${a} ${b}`).join(' L')}`} stroke={INK} strokeWidth={7} fill="none" /> : null}
      </g>
      {text.map((t, i) => {
        const size = t.length > 9 ? 40 : 56;
        const ty = 150 + (i - (text.length - 1) / 2) * 66;
        return (
          <g key={i} style={{ fontFamily: ANTON, fontSize: size }} textAnchor="middle">
            <text x={142} y={ty + 2} fill={IVORY}>{t}</text>
            <text x={140} y={ty} fill={INK}>{t}</text>
          </g>
        );
      })}
    </svg>
  );
};

/** A flat ivory cloud with an ink outline and a gold shadow band; `storm` = ink cloud with a violet rim. */
export const Cloud = ({ x, y, w, seed = 1, storm = 0, opacity = 1 }: { x: number; y: number; w: number; seed?: number; storm?: number; opacity?: number }) => {
  const rng = seeded(`cloud:${seed}`);
  const bumps = Array.from({ length: 6 }, (_, i) => ({ cx: 40 + i * 44 + rng.range(-8, 8), cy: 70 - Math.sin((i / 5) * Math.PI) * 30 + rng.range(-6, 6), r: 30 + rng.range(0, 22) }));
  const fill = storm > 0.5 ? INK : IVORY;
  const fid = `cl-${seed}`;
  return (
    <svg viewBox="0 0 300 130" style={{ position: 'absolute', left: x - w / 2, top: y - (w * 130) / 600, width: w, height: (w * 130) / 300, overflow: 'visible', opacity }}>
      <defs>
        <InkFilter seed={seed + 300} rough={8} breakup={0.2} />
        <clipPath id={fid}>
          {bumps.map((b, i) => <circle key={i} cx={b.cx} cy={b.cy} r={b.r} />)}
          <rect x={20} y={70} width={260} height={40} rx={20} />
        </clipPath>
      </defs>
      <g filter={`url(#${inkFilterId(seed + 300, 8, 0.2)})`}>
        <g stroke={storm > 0.5 ? VIOLET : INK} strokeWidth={12}>
          {bumps.map((b, i) => <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={fill} />)}
          <rect x={20} y={70} width={260} height={40} rx={20} fill={fill} />
        </g>
        <g clipPath={`url(#${fid})`}>
          {bumps.map((b, i) => <circle key={i} cx={b.cx} cy={b.cy} r={b.r - 6} fill={fill} />)}
          <rect x={26} y={74} width={248} height={32} rx={16} fill={fill} />
          <rect x={0} y={92} width={300} height={22} fill={storm > 0.5 ? VIOLET : GOLD} opacity={storm > 0.5 ? 0.5 : 1} />
        </g>
      </g>
    </svg>
  );
};

/** Ivory dust puffs expanding from a point, life `t` 0..1. */
export const DustPuff = ({ x, y, size, t, seed = 1, color = IVORY }: { x: number; y: number; size: number; t: number; seed?: number; color?: string }) => {
  if (t <= 0 || t >= 1) return null;
  const rng = seeded(`dust:${seed}`);
  const r = size * (0.4 + 0.6 * easeOut(t));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: 1 - t ** 2 }}>
      <defs>
        <InkFilter seed={seed + 90} rough={6} breakup={0.3} />
      </defs>
      <g filter={`url(#${inkFilterId(seed + 90, 6, 0.3)})`}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = rng() * Math.PI * 2;
          const d = r * rng.range(0.3, 1);
          return <circle key={i} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d * 0.55} r={size * rng.range(0.18, 0.34) * (1 - 0.4 * t)} fill={color} stroke={INK} strokeWidth={4} />;
        })}
      </g>
    </svg>
  );
};

/** KO stars orbiting a point (C07). */
export const KoStars = ({ x, y, r, frame, n = 4 }: { x: number; y: number; r: number; frame: number; n?: number }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
    {Array.from({ length: n }, (_, i) => {
      const a = (frame - (frame % 2)) * 0.32 + (i / n) * Math.PI * 2;
      const sx = x + Math.cos(a) * r;
      const sy = y + Math.sin(a) * r * 0.35;
      const k = r * 0.28;
      const pts = Array.from({ length: 10 }, (_, j) => {
        const aa = (j / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = j % 2 ? k * 0.45 : k;
        return `${sx + Math.cos(aa) * rr} ${sy + Math.sin(aa) * rr}`;
      });
      return <path key={i} d={`M${pts.join('L')}Z`} fill={GOLD} stroke={INK} strokeWidth={4} />;
    })}
  </svg>
);

/** Paint flakes settling (C08): seeded ivory and gold chips falling with a flutter. */
export const Flakes = ({ frame, start, count = 26, seed = 3, fall = 2.4 }: { frame: number; start: number; count?: number; seed?: number; fall?: number }) => {
  const rng = seeded(`flakes:${seed}`);
  const t = frame - start;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const x0 = rng.range(80, 1840);
        const y0 = rng.range(-300, 500);
        const sp = rng.range(0.6, 1.4) * fall;
        const sz = rng.range(8, 20);
        const ph = rng() * 6;
        const y = y0 + t * sp * 4;
        if (y > 1000) return null;
        const x = x0 + Math.sin(t * 0.12 + ph) * 24;
        const rot = (t * 6 + ph * 60) % 360;
        return <rect key={i} x={-sz / 2} y={-sz / 3} width={sz} height={sz * 0.66} fill={i % 3 ? IVORY : GOLD} stroke={INK} strokeWidth={2} transform={`translate(${x} ${y}) rotate(${rot}) scale(1 ${Math.abs(Math.cos(t * 0.2 + ph))})`} />;
      })}
    </svg>
  );
};

/** Gold light rays fanning from a point (the hero-angle glory, C01). */
export const LightRays = ({ x, y, frame, opacity = 0.85, n = 14, len = 1600 }: { x: number; y: number; frame: number; opacity?: number; n?: number; len?: number }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity }}>
    {Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + (frame - (frame % 2)) * 0.004;
      const w = 0.07;
      return <path key={i} d={`M${x} ${y} L${x + Math.cos(a - w) * len} ${y + Math.sin(a - w) * len} L${x + Math.cos(a + w) * len} ${y + Math.sin(a + w) * len} Z`} fill={i % 2 ? GOLD : IVORY} opacity={i % 2 ? 0.9 : 0.6} />;
    })}
  </svg>
);

/** The painted boss health bar (C09 / G25 stand-in), attached to the painting camera. */
export const ComicHpBar = ({ value = 60, x = 960, y = 92, width = 980, wobble = 0, children }: { value?: number; x?: number; y?: number; width?: number; wobble?: number; children?: ReactNode }) => {
  const k = width / 980;
  return (
    <div style={{ position: 'absolute', left: x - width / 2, top: y - 40 * k, width, height: 120 * k, transform: `rotate(${wobble}deg)`, transformOrigin: '12% 30%' }}>
      <svg viewBox="0 0 980 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <InkFilter seed={606} rough={5} breakup={0.15} />
          <pattern id="hp-check" width={20} height={20} patternUnits="userSpaceOnUse">
            <rect width={20} height={20} fill={INK} />
            <rect width={10} height={10} fill={MAGENTA} />
            <rect x={10} y={10} width={10} height={10} fill={MAGENTA} />
          </pattern>
        </defs>
        <g filter={`url(#${inkFilterId(606, 5, 0.15)})`}>
          <rect x={10} y={8} width={260} height={40} fill={IVORY} stroke={INK} strokeWidth={5} />
          <text x={140} y={40} textAnchor="middle" fill={INK} style={{ fontFamily: ANTON, fontSize: 32, letterSpacing: 3 }}>VORATHUL</text>
          <rect x={10} y={58} width={960} height={44} fill={INK} />
          <rect x={18} y={64} width={(944 * value) / 100} height={32} fill={GOLD} />
          <rect x={18 + (944 * value) / 100} y={64} width={944 * (1 - value / 100)} height={32} fill="url(#hp-check)" />
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${18 + 94.4 * (i + 1)} 64 v32`} stroke={INK} strokeWidth={4} />)}
          {['I', 'II', 'III'].map((p, i) => (
            <g key={p} transform={`translate(${830 + i * 50} 30)`}>
              <circle r={18} fill={i === 2 ? 'url(#hp-check)' : GOLD} stroke={INK} strokeWidth={4} />
              <text y={8} textAnchor="middle" fill={i === 2 ? IVORY : INK} style={{ fontFamily: ANTON, fontSize: 20 }}>{p}</text>
            </g>
          ))}
        </g>
      </svg>
      {children}
    </div>
  );
};

/** Comic speech balloon, ivory with an ink border, tail toward (tx, ty) in px relative to the box. */
export const Balloon = ({ x, y, w, text, tx, ty, size = 34, opacity = 1 }: { x: number; y: number; w: number; text: string; tx: number; ty: number; size?: number; opacity?: number }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, opacity }}>
    <svg width={w} height={size * 3.2} style={{ position: 'absolute', overflow: 'visible' }}>
      <path d={`M${w * 0.3} ${size * 2.6} L${tx} ${ty} L${w * 0.45} ${size * 2.4}`} fill={IVORY} stroke={INK} strokeWidth={5} />
      <ellipse cx={w / 2} cy={size * 1.5} rx={w / 2} ry={size * 1.3} fill={IVORY} stroke={INK} strokeWidth={6} />
    </svg>
    <div style={{ position: 'relative', top: size * 0.85, textAlign: 'center', fontFamily: ANTON, fontSize: size, color: INK, letterSpacing: 1, lineHeight: 1.1 }}>{text}</div>
  </div>
);

/** Full-frame darkening layer (lights dim). */
export const Dim = ({ amount }: { amount: number }) => (amount > 0 ? <AbsoluteFill style={{ background: INK, opacity: amount }} /> : null);

/** Twin tapered beam path helper for the S56 lasers (screen px). */
export const beamPath = (x0: number, y0: number, x1: number, y1: number, w: number, sag = 0): string => {
  const mx = lerp(x0, x1, 0.5);
  const my = lerp(y0, y1, 0.5) + sag;
  return `M${x0} ${y0 - w / 2} Q${mx} ${my - w / 2} ${x1} ${y1} Q${mx} ${my + w / 2} ${x0} ${y0 + w / 2} Z`;
};
