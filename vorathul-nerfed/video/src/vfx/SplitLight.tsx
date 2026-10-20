// Directional two-colour light grade: a key colour from one side, a fill colour from the other,
// shadows tinted instead of black - except true ink black (his body, the ink lines), which stays.
// Like DuotoneFlash it wraps the picture with a CSS `filter: url()`, so it grades the stage too.
import type { ReactNode } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import type { Swing } from './flash.ts';
import { GOLD, INK, SKY, VIOLET } from './style.tsx';

export interface SplitSetup {
  /** Light from the key side (where `angle` points). */
  key: string;
  /** Light from the opposite side. */
  fill: string;
  /** What the darkest non-ink tones become on both sides. */
  shadow: string;
  /** Degrees, direction toward the key light (0 = key from the right, 180 = from the left). */
  angle: number;
  /** Degrees per frame the light direction drifts. Prefer `swell`: real light rarely sweeps. */
  sweep?: number;
  /** Frames over which the light rises from nothing to `strength` (a slow swell, not a flash). */
  swell?: number;
  /** Width of the key/fill crossover, 0-1 of the frame diagonal; 0.25-0.4 matches the reference. */
  softness?: number;
  /** 0-1: how much of the light grade replaces the original colours. */
  strength?: number;
  /** Luminance below which a pixel is ink and stays exactly ink. */
  keepBlack?: number;
}

export interface SplitCue {
  frame: number;
  /** null returns to the ungraded picture. */
  light: SplitSetup | null;
}

/**
 * Presets inside the film's palettes (no colour outside P / V / O). Hue distance: hard splits want
 * 120-180 degrees (V gold/violet ~133, P gold/sky ~160), soft ones 30-60.
 */
export const SPLITS = {
  /** V: his gold sky against his own violet. */
  V: { key: GOLD, fill: VIOLET, shadow: '#24163A', angle: 180 },
  /** P: warm sun against pale sky. */
  P: { key: GOLD, fill: SKY, shadow: '#2B2418', angle: 180 },
  /** O: monitor blue against office grey. */
  O: { key: '#3B82F6', fill: '#CED4DA', shadow: '#343A40', angle: 0 },
} as const satisfies Record<string, SplitSetup>;

/** Each change of colours is one swing; a cue that only moves the angle or sweep is not. */
export const splitSwings = (cues: readonly SplitCue[]): Swing[] =>
  [...cues]
    .sort((a, b) => a.frame - b.frame)
    .filter((c, i, all) => {
      const p = all[i - 1]?.light;
      const l = c.light;
      return !(p && l && p.key === l.key && p.fill === l.fill && p.shadow === l.shadow);
    })
    .map((c) => ({ frame: c.frame, swings: 1 }));

const rgb = (hex: string): [number, number, number] => {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

/** Alpha ramp across the frame: opaque on the key side, clear on the fill side. */
const rampImage = (w: number, h: number, deg: number, softness: number): string => {
  const a = (deg * Math.PI) / 180;
  const r = Math.hypot(w, h) / 2;
  const [cx, cy] = [w / 2, h / 2];
  const [x1, y1, x2, y2] = [cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  const s0 = Math.max(0, 0.5 - softness / 2);
  const s1 = Math.min(1, 0.5 + softness / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="${s0}" stop-color="#fff" stop-opacity="0"/><stop offset="${s1}" stop-color="#fff" stop-opacity="1"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export const SplitLight = ({ frame, cues, children, id = 'vfx-split' }: { frame: number; cues: readonly SplitCue[]; children: ReactNode; id?: string }) => {
  const { width, height } = useVideoConfig();
  const cue = [...cues].sort((a, b) => a.frame - b.frame).reverse().find((c) => c.frame <= frame);
  if (!cue?.light) return <AbsoluteFill>{children}</AbsoluteFill>;
  const l = cue.light;
  const angle = l.angle + (l.sweep ?? 0) * (frame - cue.frame);
  // Swell: eased rise of the grade's strength after the cue.
  const rise = l.swell ? 1 - (1 - Math.min(1, (frame - cue.frame) / l.swell)) ** 2 : 1;
  const strength = (l.strength ?? 0.85) * rise;
  const kb = l.keepBlack ?? 0.05;
  const fid = `${id}-${cue.frame}-${Math.round(angle * 10)}-${Math.round(strength * 100)}`;
  // Ink mask: alpha 1 below keepBlack luminance, 0 a little above it.
  const k = 1 / Math.max(0.01, kb * 0.6);
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x={0} y={0} width={width} height={height} colorInterpolationFilters="sRGB">
          {/* The light: key colour on the key side, fill colour on the other, crossing over softly. */}
          <feFlood floodColor={l.key} result="kc" />
          <feFlood floodColor={l.fill} result="fc" />
          <feImage href={rampImage(width, height, angle, l.softness ?? 0.32)} x={0} y={0} width={width} height={height} result="ramp" />
          <feComposite in="kc" in2="ramp" operator="in" result="k" />
          <feComposite in="fc" in2="ramp" operator="out" result="f" />
          <feMerge result="light">
            <feMergeNode in="f" />
            <feMergeNode in="k" />
          </feMerge>
          {/* 'color' blend keeps each pixel's own luminance and takes the light's hue and saturation:
              values and contrast survive, colour gets richer, nothing washes toward pastel. */}
          <feBlend in="light" in2="SourceGraphic" mode="color" result="lit" />
          <feFlood floodColor={l.shadow} result="sc" />
          <feBlend in="sc" in2="SourceGraphic" mode="color" result="shadowLit" />
          {/* Weights by luminance: the light takes the mid-tones and leaves highlights (gold stays
              gold, ivory stays ivory); the shadow tint takes the darks only. */}
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2126 0.7152 0.0722 0 0" result="L" />
          <feComponentTransfer in="L" result="wLight">
            <feFuncA type="table" tableValues={[0, 0.5, 0.85, 0.9, 0.6, 0.2, 0].map((v) => v * strength).join(' ')} />
          </feComponentTransfer>
          <feComponentTransfer in="L" result="wShadow">
            <feFuncA type="table" tableValues={[0, 0.75, 0.35, 0, 0, 0, 0].map((v) => v * strength).join(' ')} />
          </feComponentTransfer>
          <feComposite in="shadowLit" in2="wShadow" operator="in" result="s1" />
          <feComposite in="lit" in2="wLight" operator="in" result="l1" />
          <feMerge result="mixed">
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="s1" />
            <feMergeNode in="l1" />
          </feMerge>
          {/* Partial mixing toward a far hue (blue sky under gold light) passes through grey; a
              saturation lift scaled with the grade's strength wins that back (measured). */}
          <feColorMatrix in="mixed" type="saturate" values={String(1 + 0.6 * strength)} result="toned" />
          <feColorMatrix in="SourceGraphic" type="matrix" values={`0 0 0 0 ${rgb(INK)[0]}  0 0 0 0 ${rgb(INK)[1]}  0 0 0 0 ${rgb(INK)[2]}  ${-0.2126 * k} ${-0.7152 * k} ${-0.0722 * k} 0 ${kb * k * 1.6}`} result="ink" />
          <feMerge>
            <feMergeNode in="toned" />
            <feMergeNode in="ink" />
          </feMerge>
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${fid})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
