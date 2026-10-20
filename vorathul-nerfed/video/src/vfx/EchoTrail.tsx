// Chromatic afterimage: delayed copies of a subject, each flat-tinted, or smeared into paint
// streaks. The subject is a render function of the frame, so delayed copies stay frame-pure.
// DOM/SVG only: it re-renders the subject per copy, which must not be the stage canvas (one
// WebGL canvas per frame) - use it on cut-out images or overlay layers.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { GOLD, SKY, VIOLET, type Pt } from './style.tsx';

export interface EchoTrailProps {
  frame: number;
  /** The subject as a full-frame layer at a given frame. */
  render: (frame: number) => ReactNode;
  copies?: number;
  /** Frames between copies. */
  delay?: number;
  /** Extra offset per copy, px (the chromatic split); multiplied by the copy index. */
  offset?: Pt;
  /** Tint per copy, nearest first; cycles if shorter than `copies`. */
  colors?: readonly string[];
  /** 'echo' = flat tinted silhouettes; 'smear' = the copies stretched into tapered streaks. */
  variant?: 'echo' | 'smear';
  /** Smear only: direction of motion, radians (streaks trail the opposite way). */
  angle?: number;
  /** Smear only: streak length, px. */
  length?: number;
  /** Prefix for filter ids; set it when two trails with different settings share a frame. */
  id?: string;
}

const tintFilter = (id: string, color: string) => (
  <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
    <feFlood floodColor={color} result="c" />
    <feComposite in="c" in2="SourceAlpha" operator="in" />
  </filter>
);

/**
 * Directional blur of the alpha in x (the wrapper rotates the motion onto x), pushed backward,
 * then hard-thresholded: thin parts of the blur drop out first, so each streak tapers. A
 * horizontally stretched noise splits the streaks into bristle lines.
 */
const smearFilter = (id: string, color: string, length: number, seed: number) => (
  <filter id={id} x="-30%" y="-10%" width="160%" height="120%" colorInterpolationFilters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation={`${length / 2.5} 3`} result="b" />
    <feOffset in="b" dx={-length / 2} result="bo" />
    <feComponentTransfer in="bo" result="hard">
      <feFuncA type="linear" slope={7} intercept={-1.2} />
    </feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency="0.0015 0.035" numOctaves={2} seed={seed} result="n" />
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -10 6.2" result="bristles" />
    <feComposite in="hard" in2="bristles" operator="in" result="clean" />
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed + 1} result="edge" />
    <feDisplacementMap in="clean" in2="edge" scale={14} xChannelSelector="R" yChannelSelector="G" result="streaks" />
    <feFlood floodColor={color} result="c" />
    <feComposite in="c" in2="streaks" operator="in" />
  </filter>
);

export const EchoTrail = ({ frame, render, copies = 3, delay = 2, offset = [-14, 6], colors = [VIOLET, SKY, GOLD], variant = 'echo', angle = 0, length = 160, id = 'vfx-echo' }: EchoTrailProps) => {
  const deg = (angle * 180) / Math.PI;
  const layers = Array.from({ length: copies }, (_, i) => copies - i).map((k) => {
    const color = colors[(k - 1) % colors.length] as string;
    const fid = `${id}-${variant}-${k}`;
    const content = (
      <AbsoluteFill style={{ transform: `translate(${offset[0] * k}px, ${offset[1] * k}px)` }}>{render(frame - k * delay)}</AbsoluteFill>
    );
    return (
      <AbsoluteFill key={k} style={{ opacity: 1 - (k - 1) / (copies + 1) }}>
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          {variant === 'echo' ? tintFilter(fid, color) : smearFilter(fid, color, length * (0.6 + 0.4 * k / copies), 5 + k)}
        </svg>
        {variant === 'echo' ? (
          <AbsoluteFill style={{ filter: `url(#${fid})` }}>{content}</AbsoluteFill>
        ) : (
          // Rotate the motion onto x, filter there, rotate back: SVG blur is only axis-aligned.
          <AbsoluteFill style={{ transform: `rotate(${deg}deg)` }}>
            <AbsoluteFill style={{ filter: `url(#${fid})` }}>
              <AbsoluteFill style={{ transform: `rotate(${-deg}deg)` }}>{content}</AbsoluteFill>
            </AbsoluteFill>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    );
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {layers}
      {render(frame)}
    </AbsoluteFill>
  );
};
