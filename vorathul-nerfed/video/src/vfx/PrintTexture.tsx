// Screen-print finish so code-drawn layers sit in the same print as the generated frames.
// DOM/SVG overlay: grain and blending are compositing operations on whatever is underneath,
// including the stage canvas, so they need no second WebGL context.
import type { ReactNode } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';

export interface PrintTextureProps {
  /** Overall strength, 0-1; 1 is the tuned default, keep it subtle. */
  strength?: number;
  /** Seed for the paper; change per shot only if a static grain would read as dirt on the lens. */
  seed?: number;
}

/**
 * Paper grain (multiply), uneven ink density (soft multiply blotches) and ivory specks where the
 * ink skipped (screen), matching the speckled blacks of frames 01 and 06.
 */
export const PrintTexture = ({ strength = 1, seed = 3 }: PrintTextureProps) => {
  const { width, height } = useVideoConfig();
  const svg = (id: string, body: ReactNode) => (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
      <filter id={id} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        {body}
      </filter>
      <rect width={width} height={height} filter={`url(#${id})`} />
    </svg>
  );
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ mixBlendMode: 'multiply', opacity: 0.55 * strength }}>
        {svg(
          `vfx-paper-${seed}`,
          <>
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={seed} />
            {/* Grain: warm grey around white; only the darker half of the noise shows. */}
            <feColorMatrix type="matrix" values="0 0 0 0 0.86  0 0 0 0 0.82  0 0 0 0 0.74  0 0 0 -2.2 1.25" />
          </>,
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ mixBlendMode: 'multiply', opacity: 0.14 * strength }}>
        {svg(
          `vfx-blotch-${seed}`,
          <>
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves={3} seed={seed + 1} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.84  0 0 0 0 0.78  0 0 0 0 0.66  0 0 0 -3 1.75" />
          </>,
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.32 * strength }}>
        {svg(
          `vfx-specks-${seed}`,
          <>
            <feTurbulence type="fractalNoise" baseFrequency="0.35 0.6" numOctaves={2} seed={seed + 2} />
            {/* Ivory specks only where the noise peaks: a few percent of the area. */}
            <feColorMatrix type="matrix" values="0 0 0 0 0.957  0 0 0 0 0.925  0 0 0 0 0.847  0 0 0 22 -15.4" />
          </>,
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export interface MisregisterProps {
  children: ReactNode;
  /** Plate offset in px; 1-3 reads as print, more reads as a glitch. */
  dx?: number;
  dy?: number;
  id?: string;
}

/**
 * Offsets the red plate of everything inside (stage canvas included) by a pixel or two, the
 * slight misregistration of a screen print. A CSS `filter: url()` on the wrapper; costs one
 * full-frame filter pass, so wrap the whole picture once rather than individual layers.
 */
export const Misregister = ({ children, dx = 1, dy = 1, id = 'vfx-misreg' }: MisregisterProps) => (
  <AbsoluteFill>
    <svg width={0} height={0} style={{ position: 'absolute' }}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={dx} dy={dy} result="ro" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
        <feComposite in="ro" in2="gb" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} />
      </filter>
    </svg>
    <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);
