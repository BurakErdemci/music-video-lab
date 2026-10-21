// The four heroes as flat ink silhouettes. Every figure is built from one skeleton ("rig") of points in a
// 100-unit-tall frame (feet at y=0, facing +x): limbs are two-bone strokes, and each kind only changes the
// body proportions, head, accessories and the carried item. All motion is a pure function of `frame`.
import React from 'react';
import { InkFilter, inkFilterId, INK, IVORY, GOLD, SKY, type Pt } from '../../../vfx/effects.ts';

export type HeroKind = 'knight' | 'mage' | 'archer' | 'rogue';
export type HeroPose =
  | 'ready' | 'cower' | 'flying' | 'ko' | 'dizzy' | 'pancake'
  | 'run' | 'tiptoe' | 'poke' | 'thumbs' | 'cry' | 'gather';

export interface HeroProps {
  kind: HeroKind;
  pose: HeroPose;
  /** Film frame; only drives small loops (wobble, run cycle, sway, tears). */
  frame: number;
  /** Feet-centre in SVG px (y down). For 'ko'/'pancake' the figure lies on the ground at this point. */
  x: number;
  y: number;
  /** Height in px of the figure when standing. */
  height: number;
  flip?: boolean;
  /** Extra degrees clockwise around the body centre. */
  rotate?: number;
}

// ---------------------------------------------------------------- small helpers

const f = (v: number): string => (Math.round(v * 100) / 100).toString();
const pts = (p: readonly Pt[]): string => p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const unit = (a: Pt, b: Pt): Pt => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};
const deg = (r: number): number => (r * 180) / Math.PI;
const hash = (n: number): number => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

/** Two-bone limb from `a` towards `target`; the bend sits on the side of `pref`. Returns [joint, end]. */
const reach = (a: Pt, target: Pt, l1: number, l2: number, pref: Pt): [Pt, Pt] => {
  const dx = target[0] - a[0];
  const dy = target[1] - a[1];
  const full = l1 + l2 - 0.02;
  const raw = Math.hypot(dx, dy) || 0.001;
  const k = Math.min(1, full / raw);
  const d = raw * k;
  const end: Pt = [a[0] + dx * k, a[1] + dy * k];
  const ux = (end[0] - a[0]) / d;
  const uy = (end[1] - a[1]) / d;
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const sideSign = -uy * pref[0] + ux * pref[1] >= 0 ? 1 : -1;
  return [[a[0] + ux * along - uy * h * sideSign, a[1] + uy * along + ux * h * sideSign], end];
};

// ---------------------------------------------------------------- rig

interface Rig {
  hip: Pt; sh: Pt; head: Pt;
  hA: Pt; hB: Pt; fF: Pt; fB: Pt;
  /** Head tilt, degrees clockwise. */
  hd: number;
  /** Weapon axis angle (0 = +x, negative = up) held in hand B. */
  wa: number;
  /** Mage staff angle override (the staff reads better upright). */
  wm?: number;
  /** x shift of the planted mage staff relative to hand B (the hand reaches to it). */
  pm?: number;
  /** Second dagger angle for the rogue (hand A); defaults to wa + 35. */
  oa?: number;
  /** Knight shield: centre relative to hand A (default [6,-2]) or absolute, and its tilt. */
  so?: Pt; sp?: Pt; sa?: number;
  /** Bend preferences: knees, elbows. */
  kp?: Pt; ep?: Pt;
}

const rigFor = (pose: HeroPose, frame: number): Rig => {
  const breath = Math.sin(frame / 9) * 0.8;
  const tremble = (Math.floor(frame / 2) % 2 === 0 ? 1 : -1) * 0.9;
  const ph3 = Math.floor(frame / 3) % 2;
  const ph4 = Math.floor(frame / 4) % 2;
  switch (pose) {
    case 'ready':
      return { hip: [-1, -45], sh: [2, -69 + breath], head: [5, -85 + breath], hA: [11, -55], hB: [14, -45], fF: [11, -4], fB: [-10, -4], hd: 0, wa: -42, wm: -88, oa: -8, so: [8, -2], sa: 0 };
    case 'cower':
      return { hip: [-3, -30], sh: [3 + tremble, -48], head: [8 + tremble, -59], hA: [13, -68], hB: [3, -69], fF: [10, -4], fB: [-12, -4], hd: 18, wa: 172, oa: 160, so: [0, -14], sa: 78, ep: [-1, -0.6] };
    case 'flying':
      return { hip: [0, -44], sh: [3, -68], head: [9, -84], hA: [30, -92], hB: [-22, -84], fF: [24, -26], fB: [-12, -4], hd: -20, wa: -25, oa: -60, so: [4, -4], sa: -35, kp: [1, 0.2], ep: [0, -1] };
    case 'ko':
      return { hip: [6, -9], sh: [-22, -9], head: [-36, -10], hA: [-42, -3], hB: [20, -3], fF: [40, -13], fB: [36, -4], hd: -75, wa: 0, oa: 0, sp: [-52, -24], sa: 75, kp: [0, -1], ep: [0, -1] };
    case 'dizzy':
      return { hip: [0, -45], sh: [1, -69], head: [8, -81], hA: [6, -33], hB: [-6, -34], fF: [8, -4], fB: [-9, -4], hd: 28, wa: 84, oa: 100, so: [8, 0], sa: 0, ep: [-0.2, 1] };
    case 'pancake':
      return { hip: [0, -42], sh: [0, -68], head: [0, -83], hA: [30, -80], hB: [-30, -80], fF: [18, -4], fB: [-18, -4], hd: 0, wa: -150, oa: -30, sp: [34, -60], sa: 60, kp: [1, 0], ep: [0, -1] };
    case 'run':
      return ph3 === 0
        ? { hip: [0, -44], sh: [8, -67], head: [15, -81], hA: [21, -57], hB: [-10, -58], fF: [19, -22], fB: [-14, -4], hd: 8, wa: 158, oa: 135, so: [6, -2], sa: 12, kp: [1, 0.3], ep: [0, 1] }
        : { hip: [0, -42], sh: [8, -65], head: [15, -79], hA: [8, -52], hB: [-14, -60], fF: [10, -4], fB: [-19, -16], hd: 8, wa: 150, oa: 135, so: [6, -2], sa: 12, kp: [1, 0.3], ep: [0, 1] };
    case 'tiptoe':
      return { hip: [-2, -44], sh: [7, -67], head: [14, -80], hA: [20, -60], hB: [-2, -52], fF: [15, -25], fB: [-3, -7], hd: 12, wa: 55, oa: 30, so: [4, 2], sa: 0, kp: [1, 0.2] };
    case 'poke':
      return { hip: [-2, -44], sh: [6, -68], head: [11, -83], hA: [-6, -58], hB: [28, -62], fF: [17, -4], fB: [-16, -4], hd: 4, wa: 0, oa: 12, sp: [-4, -48], sa: 0 };
    case 'thumbs':
      return { hip: [0, -45], sh: [1, -69], head: [3, -85], hA: [20, -97], hB: [-4, -42], fF: [8, -4], fB: [-9, -4], hd: 0, pm: -16, wa: 88, oa: 100, sp: [18, -26], sa: 0, ep: [-0.2, 0] };
    case 'cry':
      return { hip: [-3, -43], sh: [5, -64], head: [12, -74], hA: [15, -70], hB: [2, -37], fF: [8, -4], fB: [-9, -4], hd: 22, wa: 90, oa: 100, sp: [14, -26], sa: 0, ep: [0.4, 1] };
    case 'gather':
      return ph4 === 0
        ? { hip: [0, -45], sh: [4, -68], head: [7, -83], hA: [12, -54], hB: [4, -46], fF: [12, -6], fB: [-9, -4], hd: 6, wa: 58, oa: 70, so: [6, 0], sa: 0 }
        : { hip: [0, -44], sh: [4, -67], head: [7, -82], hA: [12, -54], hB: [4, -46], fF: [5, -4], fB: [-13, -8], hd: 6, wa: 58, oa: 70, so: [6, 0], sa: 0 };
  }
};

/** Pancake: the whole skeleton is squashed to ~22% height and 190% width; stroke widths are thinned separately. */
const squashRig = (r: Rig): Rig => {
  const q = (p: Pt): Pt => [p[0] * 1.9, p[1] * 0.22];
  return { ...r, hip: q(r.hip), sh: q(r.sh), head: q(r.head), hA: q(r.hA), hB: q(r.hB), fF: q(r.fF), fB: q(r.fB), sp: r.sp ? q(r.sp) : undefined, wa: 0, wm: 0, oa: 8, hd: 0 };
};

// ---------------------------------------------------------------- kind looks

interface Look {
  H: number;       // height factor so every kind stands about equally tall
  tw: number;      // torso width
  lw: number;      // leg width
  aw: number;      // arm width
  hunch: number;   // forward stoop of shoulders and head in standing poses
  seed: number;
}

const LOOKS: Record<HeroKind, Look> = {
  knight: { H: 1, tw: 19, lw: 8.5, aw: 7.5, hunch: 0, seed: 31 },
  mage: { H: 1.07, tw: 14, lw: 8, aw: 6, hunch: 0, seed: 32 },
  archer: { H: 1.03, tw: 11.5, lw: 6.2, aw: 5.6, hunch: 0, seed: 33 },
  rogue: { H: 0.88, tw: 14, lw: 7, aw: 6, hunch: 9, seed: 34 },
};

const Stroke: React.FC<{ p: readonly Pt[]; w: number; c?: string }> = ({ p, w, c = INK }) => (
  <polyline points={pts(p)} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);

/** Outlined flat shape: colour fill, ink edge. */
const Shape: React.FC<{ d: string; fill: string; w?: number }> = ({ d, fill, w = 1.4 }) => (
  <path d={d} fill={fill} stroke={INK} strokeWidth={w} strokeLinejoin="round" />
);

// ---------------------------------------------------------------- carried items (drawn in a hand frame)

const SunMark: React.FC<{ r: number }> = ({ r }) => (
  <g>
    <circle r={r} fill={INK} />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={Math.cos(a) * r * 1.25} y1={Math.sin(a) * r * 1.25} x2={Math.cos(a) * r * 1.95} y2={Math.sin(a) * r * 1.95} stroke={INK} strokeWidth={r * 0.45} strokeLinecap="round" />;
    })}
  </g>
);

const Sword: React.FC = () => (
  <g>
    <Stroke p={[[-6, 0], [3, 0]]} w={3.2} />
    <Stroke p={[[3, -6], [3, 6]]} w={3.4} c={INK} />
    <Stroke p={[[3, -5], [3, 5]]} w={1.8} c={GOLD} />
    <Shape d="M3 -2.6L30 -1.6L36 0L30 1.6L3 2.6Z" fill={IVORY} w={1.3} />
  </g>
);

const Staff: React.FC<{ x0: number }> = ({ x0 }) => (
  <g>
    <Stroke p={[[x0, 0], [52, 0]]} w={5} />
    <Stroke p={[[x0, 0], [52, 0]]} w={2.6} c={GOLD} />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      const p: Pt[] = [[58 + Math.cos(a) * 8.5, Math.sin(a) * 8.5], [58 + Math.cos(a) * 12.5, Math.sin(a) * 12.5]];
      return (
        <g key={i}>
          <Stroke p={p} w={4.4} />
          <Stroke p={p} w={2.2} c={GOLD} />
        </g>
      );
    })}
    <circle cx={58} cy={0} r={7} fill="none" stroke={INK} strokeWidth={5.6} />
    <circle cx={58} cy={0} r={7} fill="none" stroke={GOLD} strokeWidth={3.2} />
  </g>
);

const Bow: React.FC = () => (
  <g>
    <path d="M-28 0C-14 15 14 15 28 0" fill="none" stroke={INK} strokeWidth={4.6} strokeLinecap="round" />
    <path d="M-28 0C-14 15 14 15 28 0" fill="none" stroke={GOLD} strokeWidth={2.6} strokeLinecap="round" />
    <line x1={-28} y1={0} x2={28} y2={0} stroke={INK} strokeWidth={1} />
  </g>
);

const Dagger: React.FC = () => (
  <g>
    <Stroke p={[[-4, 0], [1, 0]]} w={3} />
    <Stroke p={[[1.5, -4.5], [1.5, 4.5]]} w={3.2} />
    <Stroke p={[[1.5, -3.8], [1.5, 3.8]]} w={1.6} c={GOLD} />
    <Shape d="M2 -2.2L15 -1.2L19 0L15 1.2L2 2.2Z" fill={GOLD} w={1.2} />
  </g>
);

const Shield: React.FC = () => (
  <g>
    <Shape d="M0 -26C9 -26 17 -24 17 -24C17 -8 13 12 0 27C-13 12 -17 -8 -17 -24C-17 -24 -9 -26 0 -26Z" fill={GOLD} w={2.2} />
    <path d="M0 -22C6 -22 12 -20.5 12.5 -20.5C12.5 -7 9.5 9 0 21C-9.5 9 -12.5 -7 -12.5 -20.5C-12 -20.5 -6 -22 0 -22Z" fill="none" stroke={INK} strokeWidth={1.1} />
    <g transform="translate(0 -4)"><SunMark r={4.2} /></g>
  </g>
);

// ---------------------------------------------------------------- heads

const EyeGlint: React.FC<{ x?: number; y?: number }> = ({ x = 3, y = -2 }) => (
  <rect x={x} y={y} width={5} height={1.8} fill={IVORY} />
);

const Head: React.FC<{ kind: HeroKind; at: Pt; tilt: number; frame: number; flat?: boolean }> = ({ kind, at, tilt, frame, flat = false }) => {
  const wob = Math.sin(frame * 0.35) * 3;
  return (
    <g transform={`translate(${f(at[0])} ${f(at[1])}) rotate(${f(tilt)})${flat ? ' scale(1.5 0.55)' : ''}`}>
      {kind === 'knight' && (
        <g>
          <path d="M-8.5 -9Q0 -13 8 -8.5L9.5 6L6 10L-8.5 10Z" fill={INK} stroke={INK} strokeWidth={1} strokeLinejoin="round" />
          <Stroke p={[[-6, -10.5], [6, -10]]} w={1.8} c={GOLD} />
          <rect x={1} y={-3} width={9} height={2.4} fill={IVORY} />
        </g>
      )}
      {kind === 'mage' && (
        <g>
          <path d="M-8 -7L-21 -15L-11 4Z" fill={INK} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
          <circle r={10} fill={INK} />
          <EyeGlint x={3.5} y={-1.5} />
        </g>
      )}
      {kind === 'archer' && (
        <g>
          <path d={`M-5 -6C-15 -8 -22 ${f(-1 + wob)} -27 ${f(12 + wob)}C-30 ${f(22 + wob)} -33 ${f(30 + wob * 1.5)} -32 ${f(36 + wob * 1.6)}C-22 ${f(26 + wob)} -17 ${f(14 + wob * 0.5)} -6 4Z`} fill={INK} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
          <circle r={8.4} fill={INK} />
          <Stroke p={[[-8, -3], [8, -4.2]]} w={2.2} c={IVORY} />
          <EyeGlint x={3} y={0} />
        </g>
      )}
      {kind === 'rogue' && (
        <g>
          <path d="M-6 -7L-16 -2L-8 7Z" fill={INK} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
          <circle r={9} fill={INK} />
          <EyeGlint x={3} y={-1.5} />
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------- figure

const HeroBody: React.FC<{ kind: HeroKind; pose: HeroPose; frame: number }> = ({ kind, pose, frame }) => {
  const flat = pose === 'pancake';
  const look = flat ? { ...LOOKS[kind], tw: LOOKS[kind].tw * 0.55, lw: LOOKS[kind].lw * 0.8, aw: LOOKS[kind].aw * 0.8 } : LOOKS[kind];
  const rig = flat ? squashRig(rigFor(pose, frame)) : rigFor(pose, frame);
  const standing = pose !== 'ko' && pose !== 'flying' && pose !== 'pancake';
  const hunch = standing ? look.hunch : 0;
  const sh: Pt = add(rig.sh, [hunch, hunch * 0.35]);
  const head: Pt = add(rig.head, [hunch * 1.15, hunch * 0.6]);
  const hip = rig.hip;
  const u = unit(sh, hip);
  const back: Pt = [-u[1], u[0]];
  const planted = kind === 'mage' && !flat && Math.sin((rig.wm ?? rig.wa) * Math.PI / 180) > 0.4;
  const hB: Pt = planted ? [rig.hB[0] + (rig.pm ?? 12), rig.hB[1] - 6] : rig.hB;
  const kp = rig.kp ?? [1, 0];
  const ep = rig.ep ?? [-0.35, 1];

  const legLen = flat ? 17 : 22;
  const armLen = flat ? 26 : 14;
  const legF = reach(hip, rig.fF, legLen, legLen, kp);
  const legB = reach(hip, rig.fB, legLen, legLen, kp);
  const armA = reach(sh, rig.hA, armLen, armLen, ep);
  const armB = reach(sh, hB, armLen, armLen, ep);
  const legPts = (l: [Pt, Pt]): Pt[] => [hip, l[0], l[1]];
  const armPts = (a: [Pt, Pt]): Pt[] => [sh, a[0], a[1]];
  const torsoAngle = deg(Math.atan2(hip[1] - sh[1], hip[0] - sh[0])) - 90;
  const flutter = Math.sin(frame * 0.4) * 2.5;

  // Weapon frame. The mage's staff is planted upright when it would point down, so it reaches the ground.
  let wa = kind === 'mage' ? rig.wm ?? rig.wa : rig.wa;
  let staffStart = -28;
  if (planted) {
    wa = -90;
    staffStart = hB[1] + 3;
  }

  const cape = (len: number, trim: boolean): React.ReactNode => {
    const w2 = look.tw / 2;
    const P = (b: number, a: number): Pt => add(add(sh, mul(back, b)), mul(u, a));
    const a = P(w2 - 2, 0);
    const b = P(w2 + 8, len * 0.45);
    const c = P(w2 + 14 + flutter, len);
    const d = P(w2 - 3, len + 3);
    const e = P(-2, len * 0.75);
    return (
      <g>
        <Shape d={`M${pts([a, b, c, d, e, sh]).replace(/ /g, 'L').replace(/,/g, ' ')}Z`} fill={IVORY} w={1.5} />
        {trim && <Stroke p={[c, d]} w={2.6} c={GOLD} />}
      </g>
    );
  };

  const hand = (p: Pt, w: number): React.ReactNode => <circle cx={p[0]} cy={p[1]} r={w * 0.62} fill={INK} />;

  const shieldAt: Pt = rig.sp ?? add(rig.hA, rig.so ?? [6, -2]);

  return (
    <g>
      {kind === 'knight' && !flat && cape(36, true)}
      {kind === 'archer' && !flat && cape(26, false)}
      {kind === 'archer' && (
        <g>
          <Stroke p={[add(sh, add(mul(back, 6), mul(u, -9))), add(hip, mul(back, 5))]} w={6.5} />
          {[-1, 0, 1].map((i) => {
            const base = add(sh, add(mul(back, 6), mul(u, -9)));
            return <Stroke key={i} p={[base, add(base, add(mul(u, -8), mul(back, i * 3 - 1)))]} w={1.8} c={IVORY} />;
          })}
        </g>
      )}
      <Stroke p={legPts(legB)} w={look.lw} />
      <Stroke p={armPts(armB)} w={look.aw} />
      {hand(hB, look.aw)}
      {kind === 'mage' && (
        <path d={`M${f(hip[0] + back[0] * 9)} ${f(hip[1] + back[1] * 9)}L${f(hip[0] - back[0] * 9)} ${f(hip[1] - back[1] * 9)}L${f(rig.fF[0] + 5)} ${f(rig.fF[1] + 3)}L${f(rig.fB[0] - 5)} ${f(rig.fB[1] + 3)}Z`} fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      )}
      <Stroke p={[sh, hip]} w={look.tw} />
      {kind === 'knight' && (
        <g>
          <circle cx={sh[0]} cy={sh[1]} r={look.tw * 0.4} fill={INK} />
          <Stroke p={[add(hip, mul(back, look.tw * 0.45)), add(hip, mul(back, -look.tw * 0.45))]} w={2.4} c={GOLD} />
        </g>
      )}
      {kind === 'mage' && (
        <g>
          <Stroke p={[add(hip, mul(back, look.tw * 0.5)), add(hip, mul(back, -look.tw * 0.5))]} w={2.2} c={GOLD} />
          <ellipse cx={sh[0]} cy={sh[1] - 1} rx={12.5} ry={5.8} transform={`rotate(${f(torsoAngle)} ${f(sh[0])} ${f(sh[1])})`} fill={IVORY} stroke={INK} strokeWidth={1.5} />
        </g>
      )}
      {kind === 'rogue' && (
        <g>
          <Stroke p={[add(sh, mul(u, 3)), add(sh, mul(u, 3.1))]} w={look.tw * 0.9} />
          <Shape d={`M${f(sh[0] + back[0] * 5)} ${f(sh[1] + back[1] * 5)}L${f(sh[0] + back[0] * 20)} ${f(sh[1] + back[1] * 20 + 6 + flutter)}L${f(sh[0] + back[0] * 13 + u[0] * 5)} ${f(sh[1] + back[1] * 13 + u[1] * 5 + 7 + flutter)}L${f(sh[0] + back[0] * 2)} ${f(sh[1] + back[1] * 2 + 4)}Z`} fill={IVORY} w={1.3} />
        </g>
      )}
      <Stroke p={legPts(legF)} w={look.lw} />
      {kind === 'mage' && (
        <Stroke p={[add(rig.fB, [-4, 1.5]), add(rig.fF, [5, 1.5])]} w={2} c={GOLD} />
      )}
      {kind === 'rogue' && (
        <Stroke p={[add(sh, mul(back, -1)), add(head, mul(u, -4))]} w={5.5} c={IVORY} />
      )}
      <Head kind={kind} at={head} tilt={rig.hd} frame={frame} flat={flat} />
      {/* weapon in hand B */}
      <g transform={`translate(${f(hB[0])} ${f(hB[1])}) rotate(${f(wa)})`}>
        {kind === 'knight' && <Sword />}
        {kind === 'mage' && <Staff x0={staffStart} />}
        {kind === 'archer' && <Bow />}
        {kind === 'rogue' && <Dagger />}
      </g>
      <Stroke p={armPts(armA)} w={look.aw} />
      {hand(rig.hA, look.aw)}
      {kind === 'rogue' && (
        <g transform={`translate(${f(rig.hA[0])} ${f(rig.hA[1])}) rotate(${f(rig.oa ?? rig.wa + 35)})`}>
          <Dagger />
        </g>
      )}
      {kind === 'knight' && (
        <g transform={`translate(${f(shieldAt[0])} ${f(shieldAt[1])}) rotate(${f(rig.sa ?? 0)})${flat ? ' scale(1.5 0.4)' : ''}`}>
          <Shield />
        </g>
      )}
      {pose === 'thumbs' && (
        <g transform={`translate(${f(rig.hA[0])} ${f(rig.hA[1])})`}>
          <rect x={-2.4} y={-15} width={5.2} height={11} rx={2.6} fill={GOLD} stroke={INK} strokeWidth={1.5} />
          <rect x={-7} y={-6} width={14} height={12} rx={4.4} fill={GOLD} stroke={INK} strokeWidth={1.6} />
          <Stroke p={[[-6, -0.5], [5.5, -0.5]]} w={1.1} />
        </g>
      )}
      {pose === 'cry' && <Tears head={head} tilt={rig.hd} frame={frame} />}
    </g>
  );
};

/** Two comic tear streams that run out of the eyes; sky-blue drops slide down them on a 12-frame loop. */
const Tears: React.FC<{ head: Pt; tilt: number; frame: number }> = ({ head, tilt, frame }) => {
  const streams: Array<[Pt, Pt, Pt]> = [
    [[7, -1], [21, -6], [27, 14]],
    [[7, 2], [17, 6], [18, 25]],
  ];
  const bez = (s: [Pt, Pt, Pt], t: number): Pt => {
    const m = 1 - t;
    return [m * m * s[0][0] + 2 * m * t * s[1][0] + t * t * s[2][0], m * m * s[0][1] + 2 * m * t * s[1][1] + t * t * s[2][1]];
  };
  return (
    <g transform={`translate(${f(head[0])} ${f(head[1])}) rotate(${f(tilt)})`}>
      {streams.map((s, i) => (
        <g key={i}>
          <path d={`M${s[0][0]} ${s[0][1]}Q${s[1][0]} ${s[1][1]} ${s[2][0]} ${s[2][1]}`} fill="none" stroke={INK} strokeWidth={4.2} strokeLinecap="round" />
          <path d={`M${s[0][0]} ${s[0][1]}Q${s[1][0]} ${s[1][1]} ${s[2][0]} ${s[2][1]}`} fill="none" stroke={SKY} strokeWidth={2.2} strokeLinecap="round" />
          {[0, 1, 2].map((k) => {
            const t = ((frame + k * 4 + i * 2) % 12) / 12;
            const p = bez(s, 0.25 + t * 0.9 > 1 ? 1 : 0.25 + t * 0.9);
            return <circle key={k} cx={p[0]} cy={p[1] + 2} r={1.9} fill={SKY} stroke={INK} strokeWidth={1} />;
          })}
        </g>
      ))}
    </g>
  );
};

export const Hero: React.FC<HeroProps> = ({ kind, pose, frame, x, y, height, flip = false, rotate = 0 }) => {
  const look = LOOKS[kind];
  const s = (height / 100) * look.H;
  const seed = look.seed;
  const sway = pose === 'dizzy' ? 6 * Math.sin((2 * Math.PI * frame) / 40) : 0;
  return (
    <g transform={`translate(${f(x)} ${f(y)})`} filter={`url(#${inkFilterId(seed, 2)})`}>
      <defs>
        <InkFilter seed={seed} rough={2} />
      </defs>
      <g transform={`rotate(${f(rotate)} 0 ${f(-45 * s)}) scale(${flip ? -s : s} ${s})`}>
        <g transform={`rotate(${f(sway)})`}>
          <HeroBody kind={kind} pose={pose} frame={frame} />
        </g>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- effects

const starPath = (r: number, inner: number): string => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : inner;
    p.push(`${f(Math.cos(a) * rr)} ${f(Math.sin(a) * rr)}`);
  }
  return `M${p.join('L')}Z`;
};

/** Three gold stars orbiting above a head, moving on every frame. `size` is the orbit radius. */
export const KoStars: React.FC<{ frame: number; x: number; y: number; size: number }> = ({ frame, x, y, size }) => {
  const step = frame / 2;
  return (
    <g transform={`translate(${f(x)} ${f(y)})`}>
      {[0, 1, 2].map((k) => {
        const a = step * 0.55 + (k * 2 * Math.PI) / 3;
        const px = Math.cos(a) * size;
        const py = Math.sin(a) * size * 0.35;
        const r = size * 0.32;
        return (
          <g key={k} transform={`translate(${f(px)} ${f(py)}) rotate(${f(step * 12 + k * 20)})`}>
            <path d={starPath(r, r * 0.45)} fill={GOLD} stroke={INK} strokeWidth={Math.max(1.4, size * 0.07)} strokeLinejoin="round" />
            <path d={starPath(r * 0.5, r * 0.22)} fill={IVORY} />
          </g>
        );
      })}
    </g>
  );
};

/** Sky-blue drops flung off a head on a 12-frame loop. `size` is the drop radius scale. */
export const SweatDrops: React.FC<{ frame: number; x: number; y: number; size: number }> = ({ frame, x, y, size }) => (
  <g transform={`translate(${f(x)} ${f(y)})`}>
    {[0, 1, 2].map((k) => {
      const t = ((frame + k * 4) % 12) / 12;
      const dir = k === 1 ? 0.15 : k === 0 ? -1 : 1;
      const px = dir * size * (1.1 + t * 1.8);
      const py = -size * (1.6 - 2.6 * t * t + 0.9 * t) + size * 0.6;
      const r = size * 0.42;
      return (
        <path
          key={k}
          transform={`translate(${f(px)} ${f(py)}) rotate(${f(dir * 25)})`}
          d={`M0 ${f(-r * 1.9)}C${f(r * 0.6)} ${f(-r * 0.7)} ${f(r)} ${f(-r * 0.1)} ${f(r)} ${f(r * 0.6)}A${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r * 0.6)}C${f(-r)} ${f(-r * 0.1)} ${f(-r * 0.6)} ${f(-r * 0.7)} 0 ${f(-r * 1.9)}Z`}
          fill={SKY}
          stroke={INK}
          strokeWidth={Math.max(1.2, size * 0.1)}
          strokeLinejoin="round"
        />
      );
    })}
  </g>
);

/** Three ivory dust puffs billowing up and out over 14 frames from frame 0. `seed` varies the spread. */
export const Dust: React.FC<{ frame: number; x: number; y: number; size: number; seed: number }> = ({ frame, x, y, size, seed }) => {
  if (frame < 0 || frame >= 14) return null;
  const t = frame / 14;
  const grow = 1 - (1 - t) ** 3;
  const lw = Math.max(1.6, size * 0.09);
  return (
    <g transform={`translate(${f(x)} ${f(y)})`}>
      {[0, 1, 2].map((k) => {
        const base = [-165, -90, -15][k] as number;
        const a = ((base + (hash(seed * 7 + k) - 0.5) * 40) * Math.PI) / 180;
        const dist = size * (0.5 + 1.1 * grow) * (0.85 + hash(seed + k * 3) * 0.3);
        const px = Math.cos(a) * dist * 1.25;
        const py = Math.sin(a) * dist * 0.75 - size * 0.25 * grow;
        const r = size * (0.28 + 0.34 * grow) * (1 - t * t * 0.5);
        return (
          <g key={k} transform={`translate(${f(px)} ${f(py)})`} stroke={INK} strokeWidth={lw} fill={IVORY}>
            <circle cx={0} cy={0} r={r} />
            <circle cx={-r * 0.8} cy={r * 0.25} r={r * 0.62} />
            <circle cx={r * 0.8} cy={r * 0.3} r={r * 0.58} />
            <circle cx={0} cy={0} r={r * 0.98} stroke="none" />
            <circle cx={-r * 0.8} cy={r * 0.25} r={r * 0.6} stroke="none" />
            <circle cx={r * 0.8} cy={r * 0.3} r={r * 0.56} stroke="none" />
          </g>
        );
      })}
    </g>
  );
};
