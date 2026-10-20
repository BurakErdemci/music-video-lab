// Paper cut-out (storyboard 2, N2): whatever is inside (an image, a rig render, an overlay) gets
// a torn ivory paper border that boils on twos, an optional drop shadow, and can peel one corner.
// A CSS `filter: url()` on the wrapper, so it works on any DOM content.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { INK, IVORY, Overlay, polyPath, type Pt } from './style.tsx';

export interface StickerCutoutProps {
  /** Current frame (absolute or relative; only used for the boil and the peel). */
  frame: number;
  children: ReactNode;
  /** Border width, px. */
  border?: number;
  seed?: number;
  /** Frames per boil step (2 = on twos). */
  hold?: number;
  paper?: string;
  /** Drop-shadow offset, px; 0 for none. */
  shadow?: number;
  /** Peel: the sticker's box in frame px, which corner, when, and how far (px along each edge). */
  peel?: { box: [number, number, number, number]; corner: 'tl' | 'tr' | 'bl' | 'br'; at: number; size: number; frames?: number };
  id?: string;
}

const STEPS = 4;

export const StickerCutout = ({ frame, children, border = 14, seed = 1, hold = 2, paper = IVORY, shadow = 8, peel, id = 'vfx-sticker' }: StickerCutoutProps) => {
  // Cycle through a few noise seeds instead of a new one every step: the boil reads as the same
  // torn edge redrawn, not as a different sticker.
  const step = Math.floor(frame / hold) % STEPS;
  const fid = `${id}-${seed}-${step}-${border}`;
  let clip: string | undefined;
  let flap: Pt[] | null = null;
  if (peel && frame >= peel.at) {
    const [bx, by, bw, bh] = peel.box;
    const e = border * 2;
    const [x0, y0, x1, y1] = [bx - e, by - e, bx + bw + e, by + bh + e];
    const s = peel.size * Math.min(1, (frame - peel.at + 1) / (peel.frames ?? 8));
    const C: Pt = { tl: [x0, y0], tr: [x1, y0], bl: [x0, y1], br: [x1, y1] }[peel.corner] as Pt;
    const sx = peel.corner.endsWith('l') ? 1 : -1;
    const sy = peel.corner.startsWith('t') ? 1 : -1;
    const P1: Pt = [C[0] + sx * s, C[1]];
    const P2: Pt = [C[0], C[1] + sy * s];
    // The lifted corner, reflected across the fold line P1-P2, is the paper's back showing.
    const [dx, dy] = [P2[0] - P1[0], P2[1] - P1[1]];
    const t = ((C[0] - P1[0]) * dx + (C[1] - P1[1]) * dy) / (dx * dx + dy * dy);
    const foot: Pt = [P1[0] + t * dx, P1[1] + t * dy];
    flap = [P1, P2, [2 * foot[0] - C[0], 2 * foot[1] - C[1]]];
    const rect: Pt[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const order = { tl: 0, tr: 1, br: 2, bl: 3 }[peel.corner];
    const pts: Pt[] = [];
    rect.forEach((p, i) => {
      if (i === order) pts.push(peel.corner === 'tl' || peel.corner === 'br' ? P2 : P1, peel.corner === 'tl' || peel.corner === 'br' ? P1 : P2);
      else pts.push(p);
    });
    clip = `polygon(${pts.map(([px, py]) => `${px}px ${py}px`).join(', ')})`;
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius={border} result="grown" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={seed * 13 + step} result="n" />
          <feDisplacementMap in="grown" in2="n" scale={border * 1.4} xChannelSelector="R" yChannelSelector="G" result="torn" />
          <feFlood floodColor={paper} result="p" />
          <feComposite in="p" in2="torn" operator="in" result="ring" />
          <feFlood floodColor={INK} floodOpacity={0.55} result="ink" />
          <feComposite in="ink" in2="torn" operator="in" result="sh0" />
          <feOffset in="sh0" dx={shadow} dy={shadow} result="sh" />
          <feMerge>
            {shadow > 0 ? <feMergeNode in="sh" /> : null}
            <feMergeNode in="ring" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      <AbsoluteFill style={{ clipPath: clip }}>
        <AbsoluteFill style={{ filter: `url(#${fid})` }}>{children}</AbsoluteFill>
      </AbsoluteFill>
      {flap ? (
        <Overlay>
          {/* The lifted flap casts a shadow on what it uncovers, so it reads even on paper-coloured ground. */}
          <path d={polyPath(flap)} fill={INK} opacity={0.45} transform={`translate(${shadow} ${shadow})`} />
          <path d={polyPath(flap)} fill={paper} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        </Overlay>
      ) : null}
    </AbsoluteFill>
  );
};
