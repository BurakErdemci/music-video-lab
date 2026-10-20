// Full-frame two-colour grade that switches palettes on given frames (a CSS `filter: url()` on
// the wrapped picture, so it also grades the stage canvas inside it).
import type { ReactNode } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';

export interface DuotoneCue {
  /** First frame of this palette (relative to the same clock as `frame`). */
  frame: number;
  /** [shadow colour, highlight colour] as #RRGGBB; null returns to the ungraded picture. */
  colors: [string, string] | null;
  /** true = posterised to exactly two flat colours; false = smooth ramp between them. */
  hard?: boolean;
  /** Halftone screen cell, px: mid-tones become a 45-degree dot screen (replaces `hard`). */
  halftone?: number;
  /** With halftone: 1 = pure dots, lower blends the smooth ramp back in (a softer screen). */
  mix?: number;
  /** A thin outline of this colour around the darkest shapes (an office selection edge). */
  outline?: string;
}

export interface DuotoneFlashProps {
  frame: number;
  /** Cues sorted by frame; the latest cue at or before `frame` is active. */
  cues: readonly DuotoneCue[];
  children: ReactNode;
  id?: string;
}

const rgb = (hex: string): [number, number, number] => {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

const GRAY = '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0';

/**
 * Dot screen image: a radial gradient per cell, opaque at the centre and clear at the corners.
 * The screen value lives in ALPHA: filters work on premultiplied colour, so subtracting a colour
 * channel would also zero the result's alpha and lose it.
 */
const screenImage = (w: number, h: number, cell: number): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" r="0.71"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><pattern id="p" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${cell}" height="${cell}" fill="url(#g)"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#p)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const Ramp = ({ dark, light, type, result }: { dark: number[]; light: number[]; type: 'table' | 'discrete'; result?: string }) => (
  <feComponentTransfer result={result}>
    <feFuncR type={type} tableValues={`${dark[0]} ${light[0]}`} />
    <feFuncG type={type} tableValues={`${dark[1]} ${light[1]}`} />
    <feFuncB type={type} tableValues={`${dark[2]} ${light[2]}`} />
  </feComponentTransfer>
);

export const DuotoneFlash = ({ frame, cues, children, id = 'vfx-duotone' }: DuotoneFlashProps) => {
  const { width, height } = useVideoConfig();
  const cue = [...cues].reverse().find((c) => c.frame <= frame);
  if (!cue?.colors) return <AbsoluteFill>{children}</AbsoluteFill>;
  const [dark, light] = cue.colors.map(rgb) as [[number, number, number], [number, number, number]];
  const extra = cue.halftone ? `-ht${cue.halftone}-${Math.round((cue.mix ?? 1) * 100)}${cue.outline ? `-o${cue.outline.replace('#', '')}` : ''}` : '';
  const fid = `${id}-${cue.colors.join('').replaceAll('#', '')}-${cue.hard ? 'h' : 's'}${extra}`;
  const type = cue.hard ? 'discrete' : 'table';
  const mix = cue.mix ?? 1;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        {cue.halftone ? (
          <filter id={fid} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x={0} y={0} width={width} height={height} colorInterpolationFilters="sRGB">
            {/* Luminance, stretched so true blacks stay solid and true whites stay clean. */}
            <feColorMatrix in="SourceGraphic" type="matrix" values="0.253 0.851 0.086 0 -0.095  0.253 0.851 0.086 0 -0.095  0.253 0.851 0.086 0 -0.095  0 0 0 1 0" result="g" />
            <feImage href={screenImage(width, height, cue.halftone)} x={0} y={0} width={width} height={height} result="scr" />
            {/* Positive where the picture is lighter than the screen: a dark dot grows as tones darken. */}
            <feComposite in="g" in2="scr" operator="arithmetic" k1={0} k2={1} k3={-1} k4={0} result="diff" />
            <feComponentTransfer in="diff" result="bin">
              <feFuncR type="discrete" tableValues={`0 ${'1 '.repeat(63).trim()}`} />
              <feFuncG type="discrete" tableValues={`0 ${'1 '.repeat(63).trim()}`} />
              <feFuncB type="discrete" tableValues={`0 ${'1 '.repeat(63).trim()}`} />
              <feFuncA type="table" tableValues="1 1" />
            </feComponentTransfer>
            <Ramp dark={dark} light={light} type="table" result="dots" />
            <feComponentTransfer in="g" result="smooth0">
              <feFuncA type="table" tableValues="1 1" />
            </feComponentTransfer>
            <Ramp dark={dark} light={light} type="table" result="smooth" />
            <feComposite in="dots" in2="smooth" operator="arithmetic" k1={0} k2={mix} k3={1 - mix} k4={0} result="toned" />
            {cue.outline ? (
              <>
                {/* Darkest shapes as a mask, grown by 2 px; the ring between is the selection edge. */}
                <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.1 -7.2 -0.7 0 2.2" result="m" />
                <feMorphology in="m" operator="dilate" radius={2} result="md" />
                <feComposite in="md" in2="m" operator="out" result="ring" />
                <feFlood floodColor={cue.outline} result="oc" />
                <feComposite in="oc" in2="ring" operator="in" result="edge" />
                <feMerge>
                  <feMergeNode in="toned" />
                  <feMergeNode in="edge" />
                </feMerge>
              </>
            ) : null}
          </filter>
        ) : (
          <filter id={fid} colorInterpolationFilters="sRGB">
            {/* Luminance into all three channels, then each channel ramps from shadow to highlight. */}
            <feColorMatrix type="matrix" values={GRAY} />
            <Ramp dark={dark} light={light} type={type} />
          </filter>
        )}
      </svg>
      <AbsoluteFill style={{ filter: `url(#${fid})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
