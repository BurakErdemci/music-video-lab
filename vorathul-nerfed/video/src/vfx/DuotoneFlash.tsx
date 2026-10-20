// Full-frame two-colour grade that switches palettes on given frames (a CSS `filter: url()` on
// the wrapped picture, so it also grades the stage canvas inside it).
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';

export interface DuotoneCue {
  /** First frame of this palette (relative to the same clock as `frame`). */
  frame: number;
  /** [shadow colour, highlight colour] as #RRGGBB; null returns to the ungraded picture. */
  colors: [string, string] | null;
  /** true = posterised to exactly two flat colours; false = smooth ramp between them. */
  hard?: boolean;
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

export const DuotoneFlash = ({ frame, cues, children, id = 'vfx-duotone' }: DuotoneFlashProps) => {
  const cue = [...cues].reverse().find((c) => c.frame <= frame);
  if (!cue?.colors) return <AbsoluteFill>{children}</AbsoluteFill>;
  const [dark, light] = cue.colors.map(rgb) as [[number, number, number], [number, number, number]];
  const fid = `${id}-${cue.colors.join('').replaceAll('#', '')}-${cue.hard ? 'h' : 's'}`;
  const type = cue.hard ? 'discrete' : 'table';
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} colorInterpolationFilters="sRGB">
          {/* Luminance into all three channels, then each channel ramps from shadow to highlight. */}
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type={type} tableValues={`${dark[0]} ${light[0]}`} />
            <feFuncG type={type} tableValues={`${dark[1]} ${light[1]}`} />
            <feFuncB type={type} tableValues={`${dark[2]} ${light[2]}`} />
          </feComponentTransfer>
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${fid})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
