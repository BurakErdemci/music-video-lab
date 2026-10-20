import React from 'react';
import { C, lerp } from '../../../ui/theme.tsx';

export type BigHandVariant = 'pinch' | 'grip' | 'pad' | 'pen' | 'thumbs' | 'dust' | 'open' | 'point';

export interface BigHandProps {
  variant: BigHandVariant;
  /** px length from the wrist to the fingertips. */
  size: number;
  /** 'pinch' only: 0 = thumb and index apart, 1 = pinching shut on one point. Default 1. */
  pinch?: number;
  /** px length of the hoodie sleeve behind the wrist (ribbed cuff at the wrist); 0 = none. Default 0. */
  sleeve?: number;
  /** Degrees: direction from the wrist backwards along which the sleeve extends. 0 = LEFT, 90 = UP, -90 = DOWN. */
  sleeveAngle?: number;
  /** Mirror around the origin x. */
  flip?: boolean;
}

// Everything below is drawn in "hand units": the wrist at (0,0), the fingertips at x = 100, y down.
// The whole hand is scaled by size / 100, so the line width (LW units) stays 0.014 x size.
const LW = 1.4;

/** A capsule: a round-capped thick line. Hand parts are unions of capsules, outlined as one shape. */
interface Cap { x1: number; y1: number; x2: number; y2: number; r: number }
type Pt = readonly [number, number];

const cap = (x1: number, y1: number, x2: number, y2: number, r: number): Cap => ({ x1, y1, x2, y2, r });
/** A bent finger: one capsule per joint. */
const chain = (r: number, ...pts: Pt[]): Cap[] =>
  pts.slice(1).map((p, i) => {
    const a = pts[i] as Pt;
    return cap(a[0], a[1], p[0], p[1], r);
  });

interface HandSpec {
  caps: Cap[];
  /** Crease lines as SVG path data. */
  lines: string[];
  /** Contact/grip point of the variant, in hand units. */
  origin: Pt;
  /** Drawn behind / in front of the hand. */
  under?: React.ReactNode;
  over?: React.ReactNode;
}

const lineStyle = { fill: 'none', stroke: C.dark, strokeWidth: LW * 0.85, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const penArt = (): React.ReactNode => (
  // Pen in its own frame: tip at the origin, barrel extending along +x (towards the tail).
  <g strokeLinejoin="round" strokeLinecap="round">
    <rect x={8} y={-4.2} width={70} height={8.4} rx={4} fill={C.white} stroke={C.dark} strokeWidth={LW} />
    <rect x={60} y={-4.2} width={18} height={8.4} rx={4} fill={C.blue} stroke={C.blueDark} strokeWidth={LW} />
    <path d="M0 0 L9 -3.4 L9 3.4 Z" fill={C.ink} stroke={C.ink} strokeWidth={LW} />
  </g>
);

const tick = (x1: number, y1: number, x2: number, y2: number): string => `M${x1} ${y1} L${x2} ${y2}`;

const buildHand = (variant: BigHandVariant, pinch: number): HandSpec => {
  switch (variant) {
    case 'open':
      return {
        origin: [32, 0],
        caps: [
          cap(6, 0, 38, 0, 17),
          cap(42, -11, 88, -19, 5.5),
          cap(44, -3.5, 94.5, -6, 5.5),
          cap(44, 4, 90, 6, 5.5),
          cap(42, 12, 78, 22, 5),
          ...chain(6.5, [20, -14], [44, -33], [58, -42]),
        ],
        lines: [tick(46, -7.5, 72, -10.5), tick(48, 0.2, 74, 0), tick(47, 8.3, 66, 10.5), 'M18 -6 Q27 2 36 -2', 'M20 6 Q28 10 36 7'],
      };
    case 'dust':
      return {
        origin: [45, 0],
        caps: [
          cap(6, 0, 38, 0, 17),
          cap(42, -12, 92, -12, 5.2),
          cap(42, -4, 95, -4, 5.2),
          cap(42, 4, 93, 4, 5.2),
          cap(42, 12, 86, 12, 5.2),
          cap(24, -16, 46, -24, 6),
        ],
        lines: [tick(52, -8, 88, -8), tick(52, 0, 90, 0), tick(52, 8, 84, 8)],
        over: (
          <g stroke={C.slate} strokeWidth={LW * 1.3} strokeLinecap="round">
            <path d={tick(110, -12, 124, -20)} />
            <path d={tick(110, 12, 124, 20)} />
          </g>
        ),
      };
    case 'pad':
      // Seen from the side: the palm and fingers form a flat shelf, the thumb presses on the top at the near edge.
      return {
        origin: [50, -16],
        caps: [cap(6, 0, 46, 0, 17), cap(46, 0, 85, 0, 15), ...chain(6.5, [16, -8], [34, -27], [60, -26])],
        lines: [tick(58, 6, 90, 6), 'M20 4 Q30 9 42 6'],
      };
    case 'grip':
      // Fist wrapped round a horizontal shaft that the caller draws BEHIND the hand: fingers cross it vertically.
      return {
        origin: [56, 0],
        caps: [
          cap(4, 0, 34, 0, 17),
          cap(40, -13, 40, 15, 5.8),
          cap(50, -14, 50, 17, 5.8),
          cap(60, -13, 60, 16, 5.8),
          cap(69, -10, 69, 12, 5.2),
          ...chain(6.2, [28, -15], [56, -22], [78, -9]),
        ],
        lines: [tick(45, -8, 45, 12), tick(55, -8, 55, 13), tick(64.5, -7, 64.5, 10), 'M16 -4 Q24 2 32 -2'],
      };
    case 'thumbs':
      return {
        origin: [40, 0],
        caps: [
          cap(4, 0, 40, 0, 20),
          cap(42, -15, 62, -15, 6.5),
          cap(42, -5, 62, -5, 6.5),
          cap(42, 5, 62, 5, 6.5),
          cap(42, 15, 60, 15, 6.5),
          cap(30, -18, 42, -50, 9),
        ],
        lines: [tick(46, -10, 64, -10), tick(46, 0, 64, 0), tick(46, 10, 62, 10), 'M30 -24 Q34 -20 40 -22'],
      };
    case 'point':
      return {
        origin: [100, -8],
        caps: [
          cap(4, 0, 36, 0, 17),
          cap(36, -8, 94, -8, 6),
          cap(38, 4, 54, 4, 6),
          cap(36, 13, 52, 13, 6),
          cap(34, 21, 48, 21, 5.5),
          ...chain(6, [22, -10], [46, -3], [58, 3]),
        ],
        lines: [tick(60, -12.5, 60, -3.5), tick(76, -13.5, 76, -2.5), tick(40, 8.5, 56, 8.5), tick(38, 17, 52, 17)],
      };
    case 'pen': {
      const tip: Pt = [100, 16];
      return {
        origin: tip,
        under: (
          <g transform={`translate(${tip[0]} ${tip[1]}) rotate(-128.45)`}>{penArt()}</g>
        ),
        caps: [
          cap(4, 0, 34, 0, 17),
          ...chain(5.5, [36, -10], [62, -14], [84, -5]),
          ...chain(5.5, [22, 12], [54, 17], [79, 9]),
          ...chain(5.5, [40, 8], [64, 20], [80, 23]),
        ],
        lines: [tick(46, -9, 56, -10), 'M17 -4 Q26 2 33 -1'],
      };
    }
    case 'pinch': {
      const p = Math.min(1, Math.max(0, pinch));
      const ix = lerp(92, 98, p);
      const iy = lerp(-30, -4.6, p);
      const ty = lerp(30, 4.6, p);
      const k: Pt = [36, -9];
      const idxEnd: Pt = [ix, iy];
      const idxJ: Pt = [(k[0] + ix) / 2 + 2, (k[1] + iy) / 2 - 10];
      const tb: Pt = [20, 12];
      const thEnd: Pt = [ix, ty];
      const thJ: Pt = [(tb[0] + ix) / 2 - 2, (tb[1] + ty) / 2 + 7];
      return {
        origin: [98, 0],
        caps: [
          cap(4, 0, 34, 0, 17),
          ...chain(5.5, k, idxJ, idxEnd),
          ...chain(6, tb, thJ, thEnd),
          cap(38, 7, 54, 11, 6),
          cap(36, 15, 50, 19, 5.5),
        ],
        lines: [tick(44, 3, 56, 6), 'M16 -4 Q24 2 32 -2'],
      };
    }
  }
};

const outlinePass = (caps: Cap[]): React.ReactNode =>
  caps.map((c, i) => <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={C.dark} strokeWidth={2 * c.r + 2 * LW} />);
const fillPass = (caps: Cap[]): React.ReactNode =>
  caps.map((c, i) => <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={C.white} strokeWidth={2 * c.r} />);

/** Hoodie sleeve extending to the LEFT from the wrist, ribbed cuff at the wrist. `len` in hand units. */
const Sleeve: React.FC<{ len: number }> = ({ len }) => {
  const far = -len;
  const flare = 5;
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path
        d={`M4 -20 L${far + 6} ${-20 - flare} Q${far} ${-20 - flare} ${far} ${-14 - flare} L${far} ${14 + flare} Q${far} ${20 + flare} ${far + 6} ${20 + flare} L4 20 Z`}
        fill={C.mid}
        stroke={C.dark}
        strokeWidth={LW}
      />
      <rect x={-9} y={-21.5} width={14} height={43} rx={4} fill={C.dark} stroke={C.slate} strokeWidth={LW} />
      <path d="M-4 -19 L-4 19 M0 -19 L0 19" stroke={C.slate} strokeWidth={LW * 0.8} fill="none" />
      <path d={`M${-26} -17 Q${-24} 0 ${-26} 17`} stroke={C.dark} strokeWidth={LW * 0.8} fill="none" opacity={len > 60 ? 1 : 0} />
    </g>
  );
};

export const BigHand: React.FC<BigHandProps> = ({ variant, size, pinch = 1, sleeve = 0, sleeveAngle = 0, flip = false }) => {
  const s = size / 100;
  const built = buildHand(variant, pinch);
  // A narrower wrist stub so the hand has a neck even without a sleeve.
  const spec = { ...built, caps: [cap(-9, 0, 4, 0, 12.5), ...built.caps] };
  const sx = flip ? -s : s;
  return (
    <g transform={`scale(${sx} ${s}) translate(${-spec.origin[0]} ${-spec.origin[1]})`}>
      {spec.under}
      <g strokeLinecap="round" strokeLinejoin="round">
        {outlinePass(spec.caps)}
        {fillPass(spec.caps)}
      </g>
      <g style={lineStyle}>
        {spec.lines.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {sleeve > 0 && (
        <g transform={`rotate(${sleeveAngle})`}>
          <Sleeve len={sleeve / s} />
        </g>
      )}
      {spec.over}
    </g>
  );
};
