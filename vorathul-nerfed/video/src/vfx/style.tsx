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

/** Filter id for a seed/roughness pair; equal ids always describe identical filters, so duplicates are harmless. */
export const inkFilterId = (seed: number, rough: number): string => `vfx-ink-${seed}-${Math.round(rough * 10)}`;

/**
 * Dry-brush ink edge: two scales of displacement make the outline ragged, and a thresholded
 * high-frequency noise punches small paper-coloured holes into the fill, like a dry brush
 * that skipped. `rough` is the coarse displacement in local pixels.
 */
export const InkFilter = ({ seed, rough = 10 }: { seed: number; rough?: number }) => (
  <filter id={inkFilterId(seed, rough)} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={2} seed={seed % 997} result="coarse" />
    <feDisplacementMap in="SourceGraphic" in2="coarse" scale={rough} xChannelSelector="R" yChannelSelector="G" result="d1" />
    <feTurbulence type="turbulence" baseFrequency="0.16" numOctaves={2} seed={(seed + 7) % 997} result="fine" />
    <feDisplacementMap in="d1" in2="fine" scale={rough * 0.45} xChannelSelector="G" yChannelSelector="B" result="d2" />
    <feTurbulence type="fractalNoise" baseFrequency="0.09 0.5" numOctaves={2} seed={(seed + 13) % 997} result="speck" />
    <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -25 19.4" result="holes" />
    <feComposite in="d2" in2="holes" operator="in" />
  </filter>
);

/** Full-frame SVG layer in composition pixels. */
export const Overlay = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => {
  const { width, height } = useVideoConfig();
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', ...style }}>
      {children}
    </svg>
  );
};
