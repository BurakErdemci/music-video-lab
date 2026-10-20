// Soft coloured light spilling over whatever is underneath (the stage canvas included): radial
// pools from moving sources, blended with a CSS mix-blend-mode, so it is a 2D overlay that needs
// no lights on the unlit stage.
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { clamp01 } from './style.tsx';

export interface LightSource {
  x: number;
  y: number;
  color: string;
  /** Falloff radius, px. */
  radius: number;
  /** 0-1.5, a number or a function of the frame (use `pulse` for flares). */
  intensity: number | ((frame: number) => number);
}

export interface LightSpillProps {
  frame: number;
  sources: readonly LightSource[];
  /** How the light combines with the picture; screen brightens, soft-light tints. */
  blend?: CSSProperties['mixBlendMode'];
  /** CSS clip-path limiting the light to a region (e.g. 'ellipse(300px 500px at 960px 560px)'). */
  region?: string;
  /** 1 = linear falloff, higher = a tighter hot core. */
  falloff?: number;
  id?: string;
}

/**
 * Attack / hold / release envelope for an intensity, frame-pure. Photosensitivity: a spill that
 * covers much of the frame and attacks in under ~6 frames is a luminance swing (and its release
 * another) - count it in the shot's flash budget, and gate the render on tools/flashcheck.py.
 */
export const pulse = (start: number, attack: number, hold: number, release: number, peak = 1) => (frame: number): number => {
  const t = frame - start;
  if (t < 0) return 0;
  if (t < attack) return (peak * (t + 1)) / attack;
  if (t < attack + hold) return peak;
  return peak * (1 - clamp01((t - attack - hold) / release));
};

export const LightSpill = ({ frame, sources, blend = 'screen', region, falloff = 1.6, id = 'vfx-spill' }: LightSpillProps) => {
  const { width, height } = useVideoConfig();
  const stops = [0, 0.15, 0.35, 0.6, 0.85, 1];
  return (
    <AbsoluteFill style={{ mixBlendMode: blend, clipPath: region, pointerEvents: 'none' }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {sources.map((s, i) => {
            const k = Math.max(0, typeof s.intensity === 'function' ? s.intensity(frame) : s.intensity);
            return (
              <radialGradient key={i} id={`${id}-${i}`} cx={s.x} cy={s.y} r={s.radius} gradientUnits="userSpaceOnUse">
                {stops.map((o) => (
                  <stop key={o} offset={o} stopColor={s.color} stopOpacity={Math.min(1, k * (1 - o) ** falloff)} />
                ))}
              </radialGradient>
            );
          })}
        </defs>
        {sources.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.radius} fill={`url(#${id}-${i})`} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Light that SWELLS (measured: reference light rarely sweeps; it rises slowly over seconds with its
 * centre nearly fixed). Eased rise from `start` over `rise` frames to `peak`, then holds.
 */
export const swell = (start: number, rise: number, peak = 1, from = 0) => (frame: number): number =>
  from + (peak - from) * (1 - (1 - clamp01((frame - start) / rise)) ** 2);

/** Sparks or confetti as tiny light sources taking the current key hue. */
export const sparkLights = (points: readonly { x: number; y: number }[], color: string, radius = 60, intensity = 0.6): LightSource[] =>
  points.map((p) => ({ x: p.x, y: p.y, color, radius, intensity }));

export interface FigureSpillProps {
  children: ReactNode;
  color: string;
  /** 0.15-0.35 reads as light on the figure without washing it out. */
  strength?: number;
  /** Where the light comes from: the figure's tint is weighted toward that edge. */
  from?: 'top' | 'bottom';
  /** Optional big blurred colour quad behind the figure, frame px [x, y, w, h]. */
  quad?: [number, number, number, number];
  /** Opacity of the quad. */
  quadStrength?: number;
  id?: string;
}

/**
 * Coloured light falling ON a figure (measured recipe): a big blurred colour quad behind it plus
 * the same hue screened over the figure at 0.15-0.35, masked to its alpha, weighted along a
 * vertical gradient toward the light.
 */
export const FigureSpill = ({ children, color, strength = 0.25, from = 'bottom', quad, quadStrength = 0.5, id = 'vfx-figspill' }: FigureSpillProps) => {
  const { width, height } = useVideoConfig();
  const fid = `${id}-${color.replace('#', '')}-${Math.round(strength * 100)}-${from}`;
  const [y1, y2] = from === 'bottom' ? [height, 0] : [0, height];
  const grad = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${y1}" x2="0" y2="${y2}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0.15"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {quad ? <div style={{ position: 'absolute', left: quad[0], top: quad[1], width: quad[2], height: quad[3], background: color, opacity: quadStrength, filter: `blur(${Math.round(Math.min(quad[2], quad[3]) * 0.25)}px)` }} /> : null}
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x={0} y={0} width={width} height={height} colorInterpolationFilters="sRGB">
          <feImage href={`data:image/svg+xml,${encodeURIComponent(grad)}`} x={0} y={0} width={width} height={height} result="w" />
          <feFlood floodColor={color} result="c" />
          <feComposite in="c" in2="SourceAlpha" operator="in" result="onFig" />
          <feComposite in="onFig" in2="w" operator="in" result="weighted" />
          <feComponentTransfer in="weighted" result="tint">
            <feFuncA type="linear" slope={strength} />
          </feComponentTransfer>
          <feBlend in="tint" in2="SourceGraphic" mode="screen" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${fid})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
