// Coloured edge light on a cut-out, faked from its alpha (the stage is unlit flat cards).
// Measured recipe (reference study): rim = alpha minus alpha eroded by 2-3 px, blurred 1-2 px,
// kept only on the side facing the rim light, tinted and screened at 0.7-1. Real rims are thin
// and saturated, and sit on the side opposite the key light. The side mask comes from the
// silhouette shifted away from the light, so every part's own lit edge is picked, not one global
// half of the frame.
import { seeded } from './seeded.ts';
import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

export interface RimLightProps {
  /** The cut-out: any DOM/SVG content with real transparency around the figure. */
  children?: ReactNode;
  /** Or an image under public/ with an alpha channel, drawn full frame. */
  src?: string;
  /** Needed only for the flicker. */
  frame?: number;
  color: string;
  /** Direction from the figure toward the light, radians (0 = light on the right, -PI/2 = above). */
  angle: number;
  /** Rim thickness, px (2-3 reads as a real rim). */
  width?: number;
  /** Blur of the rim, px (1-2). */
  softness?: number;
  /** 0-1.5; 0.7-1 matches the reference. */
  intensity?: number;
  /** A second light, e.g. gold from the sky on one side and violet from his energy on the other. */
  color2?: string;
  angle2?: number;
  intensity2?: number;
  /** 0-1: how much light leaks outside the silhouette. */
  bleed?: number;
  /**
   * 'decay' (default): on each cue frame the rim jumps up and settles back in `hold`-frame steps.
   * 'levels': a screen/wall light stepping between three levels, each held 5-7 frames (seeded).
   */
  flicker?: { cues?: readonly number[]; hold?: number; boost?: number; mode?: 'decay' | 'levels'; seed?: number };
  id?: string;
}

/** Flicker gain at `frame`: 1 + boost, halving every `hold` frames after the latest cue (frame-pure). */
export const flickerGain = (frame: number, cues: readonly number[], hold = 2, boost = 0.8): number => {
  let last = -Infinity;
  for (const c of cues) if (c <= frame && c > last) last = c;
  if (last === -Infinity) return 1;
  const steps = Math.floor((frame - last) / hold);
  return steps > 6 ? 1 : 1 + boost * 0.5 ** steps;
};

/** Measured screen-light levels (relative luminance) of the reference's 3-level state machine. */
export const SCREEN_LEVELS = [0.25, 0.42, 0.68] as const;

/**
 * Screen/wall light as a 3-level state machine: a seeded level held 5-7 frames, then the next.
 * Frame-pure. Photosensitivity: a jump between levels counts as a swing only when it is large
 * and frame-wide (a lit wall), not on a rim.
 */
export const screenLevel = (frame: number, seed = 1, levels: readonly number[] = SCREEN_LEVELS): number => {
  const rng = seeded(`levels:${seed}`);
  let t = 0;
  let level = levels[1] as number;
  // Walk the schedule from frame 0; at 5-7 frames per state this is cheap for a film's length.
  while (t <= frame) {
    level = levels[rng.int(0, levels.length - 1)] as number;
    t += rng.int(5, 7);
  }
  return level;
};

const Rim = ({ n, color, angle, width, softness, intensity, bleed, input }: { n: string; color: string; angle: number; width: number; softness: number; intensity: number; bleed: number; input: string }) => (
  <>
    {/* Thin outline band: alpha minus eroded alpha. */}
    <feMorphology in="SourceAlpha" operator="erode" radius={width} result={`${n}er`} />
    <feComposite in="SourceAlpha" in2={`${n}er`} operator="out" result={`${n}ring`} />
    {/* Side mask: what the silhouette uncovers when shifted away from the light, softened into a gradient. */}
    <feOffset in="SourceAlpha" dx={-Math.cos(angle) * (width * 4 + 6)} dy={-Math.sin(angle) * (width * 4 + 6)} result={`${n}sh`} />
    <feComposite in="SourceAlpha" in2={`${n}sh`} operator="out" result={`${n}face`} />
    <feGaussianBlur in={`${n}face`} stdDeviation={width * 2 + 3} result={`${n}faceSoft`} />
    <feComposite in={`${n}ring`} in2={`${n}faceSoft`} operator="in" result={`${n}band`} />
    <feGaussianBlur in={`${n}band`} stdDeviation={softness} result={`${n}soft`} />
    <feComposite in={`${n}soft`} in2="SourceAlpha" operator="in" result={`${n}inside`} />
    {/* Bleed: a wider blur of the band, outside the silhouette only. */}
    <feGaussianBlur in={`${n}band`} stdDeviation={softness * 4 + width * 2} result={`${n}wide`} />
    <feComposite in={`${n}wide`} in2="SourceAlpha" operator="out" result={`${n}outside`} />
    <feComponentTransfer in={`${n}outside`} result={`${n}outsideK`}>
      <feFuncA type="linear" slope={bleed * 1.5} />
    </feComponentTransfer>
    <feMerge result={`${n}mask`}>
      <feMergeNode in={`${n}inside`} />
      <feMergeNode in={`${n}outsideK`} />
    </feMerge>
    <feFlood floodColor={color} result={`${n}c`} />
    <feComposite in={`${n}c`} in2={`${n}mask`} operator="in" result={`${n}col`} />
    <feComponentTransfer in={`${n}col`} result={`${n}lit`}>
      <feFuncA type="linear" slope={intensity} />
    </feComponentTransfer>
    <feBlend in={`${n}lit`} in2={input} mode="screen" result={`${n}out`} />
  </>
);

export const RimLight = ({ children, src, frame = 0, color, angle, width = 2.5, softness = 1.5, intensity = 0.85, color2, angle2 = angle + Math.PI, intensity2, bleed = 0, flicker, id = 'vfx-rim' }: RimLightProps) => {
  const g = !flicker ? 1 : flicker.mode === 'levels' ? screenLevel(frame, flicker.seed) / (SCREEN_LEVELS[1] as number) : flickerGain(frame, flicker.cues ?? [], flicker.hold, flicker.boost);
  const fid = `${id}-${Math.round(g * 100)}`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <Rim n="a" color={color} angle={angle} width={width} softness={softness} intensity={intensity * g} bleed={bleed} input="SourceGraphic" />
          {color2 ? <Rim n="b" color={color2} angle={angle2} width={width} softness={softness} intensity={(intensity2 ?? intensity) * g} bleed={bleed} input="aout" /> : null}
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${fid})` }}>
        {src ? <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : null}
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
