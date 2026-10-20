// Shared palette, geometry helpers and the ink filter that gives code-drawn shapes the dry-brush
// edge of the approved frames (stil/onayli/01, 06).
import type { CSSProperties, ReactNode } from 'react';
import { useVideoConfig } from 'remotion';

export const INK = '#0A0908';
export const IVORY = '#F4ECD8';
export const GOLD = '#E2B33C';
export const SKY = '#8EC5E8';
export const VIOLET = '#9B5CE0';
/** The lavender highlight inside the violet meteor flames of frame 06; used only next to VIOLET. */
export const VIOLET_LIGHT = '#C9A2F4';

export type Pt = [number, number];

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - 2 ** (-10 * clamp01(t)));
export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const easeInQuad = (t: number): number => clamp01(t) ** 2;
export const polar = (r: number, a: number): Pt => [r * Math.cos(a), r * Math.sin(a)];

const n = (v: number): string => (Math.round(v * 100) / 100).toString();

/** Straight-edged closed polygon. */
export const polyPath = (pts: readonly Pt[]): string => `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;

/** Closed Catmull-Rom curve through the points, as cubic Beziers (organic ink blobs). */
export const blobPath = (pts: readonly Pt[]): string => {
  const k = pts.length;
  const at = (i: number): Pt => pts[((i % k) + k) % k] as Pt;
  let d = `M${n(at(0)[0])} ${n(at(0)[1])}`;
  for (let i = 0; i < k; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return `${d}Z`;
};

/** User-space filter region [x, y, width, height]. */
export type Bounds = [number, number, number, number];

/** Filter id for a parameter set; equal ids always describe identical filters, so duplicates are harmless. */
export const inkFilterId = (seed: number, rough: number, breakup = 0, region?: Bounds): string =>
  `vfx-ink-${seed}-${Math.round(rough * 10)}-${Math.round(breakup * 100)}${region ? `-${region.map(Math.round).join('_')}` : ''}`;

export interface InkFilterProps {
  seed: number;
  /** Coarse edge displacement in local px. */
  rough?: number;
  /** 0 = a few skipped specks, 1 = heavily broken dry brush. */
  breakup?: number;
  /**
   * Explicit user-space region. Needed for thin strokes: the default region is relative to the
   * geometry's bounding box, which is zero-height for a straight horizontal line (nothing renders).
   */
  region?: Bounds;
}

/**
 * Dry-brush ink edge: two scales of displacement make the outline ragged, and a thresholded
 * high-frequency noise punches small paper-coloured holes into the fill, like a dry brush
 * that skipped.
 */
export const InkFilter = ({ seed, rough = 10, breakup = 0, region }: InkFilterProps) => {
  // Holes where the speck noise alpha exceeds a cut; breakup lowers the cut (more holes).
  const cut = 0.776 - 0.2 * breakup;
  const box = region
    ? { filterUnits: 'userSpaceOnUse' as const, x: region[0], y: region[1], width: region[2], height: region[3] }
    : { x: '-30%', y: '-30%', width: '160%', height: '160%' };
  return (
    <filter id={inkFilterId(seed, rough, breakup, region)} {...box} colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={2} seed={seed % 997} result="coarse" />
      <feDisplacementMap in="SourceGraphic" in2="coarse" scale={rough} xChannelSelector="R" yChannelSelector="G" result="d1" />
      <feTurbulence type="turbulence" baseFrequency="0.16" numOctaves={2} seed={(seed + 7) % 997} result="fine" />
      <feDisplacementMap in="d1" in2="fine" scale={rough * 0.45} xChannelSelector="G" yChannelSelector="B" result="d2" />
      <feTurbulence type="fractalNoise" baseFrequency="0.09 0.5" numOctaves={2} seed={(seed + 13) % 997} result="speck" />
      <feColorMatrix in="speck" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -25 ${25 * cut}`} result="holes" />
      <feComposite in="d2" in2="holes" operator="in" />
    </filter>
  );
};

/** Open Catmull-Rom curve through the points (hand-drawn strokes). */
export const curvePath = (pts: readonly Pt[]): string => {
  const k = pts.length;
  const at = (i: number): Pt => pts[Math.max(0, Math.min(k - 1, i))] as Pt;
  let d = `M${n(at(0)[0])} ${n(at(0)[1])}`;
  for (let i = 0; i < k - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
};

/** Tapered polygon along a polyline: full `width` at `peak` (0-1 of the length), needle tips at both ends. */
export const taperedPath = (pts: readonly Pt[], width: number, peak = 0.3): string => {
  const k = pts.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < k; i++) {
    const a = pts[Math.max(0, i - 1)] as Pt;
    const b = pts[Math.min(k - 1, i + 1)] as Pt;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    const t = i / (k - 1);
    const w = (width / 2) * (t < peak ? t / peak : (1 - t) / (1 - peak)) ** 0.7;
    const p = pts[i] as Pt;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  }
  return polyPath([...left, ...right.reverse()]);
};

/** Full-frame SVG layer in composition pixels. */
export const Overlay = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => {
  const { width, height } = useVideoConfig();
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', ...style }}>
      {children}
    </svg>
  );
};
