import React, { useId } from 'react';
import { C } from './theme.tsx';

export interface MissingTextureFillProps {
  /** SVG path data the checkerboard is clipped to (in the parent svg's user units). */
  d: string;
  /** Checker cell size in user units. */
  cell?: number;
  /** Checker rotation in degrees around the origin. */
  rotate?: number;
  /** Pattern offset in user units (animate this to scroll the texture). */
  offsetX?: number;
  offsetY?: number;
  colorA?: string;
  colorB?: string;
  /** Fill rule of the clip path. */
  clipRule?: 'nonzero' | 'evenodd';
}

/** Missing-texture checkerboard clipped to a path; drop it inside any <svg>. */
export const MissingTextureFill: React.FC<MissingTextureFillProps> = ({
  d,
  cell = 24,
  rotate = 0,
  offsetX = 0,
  offsetY = 0,
  colorA = C.magenta,
  colorB = C.black,
  clipRule = 'nonzero',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const pat = `mt-pat-${uid}`;
  const clip = `mt-clip-${uid}`;
  return (
    <g>
      <defs>
        <pattern
          id={pat}
          width={cell * 2}
          height={cell * 2}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX} ${offsetY}) rotate(${rotate})`}
        >
          <rect width={cell * 2} height={cell * 2} fill={colorA} />
          <rect width={cell} height={cell} fill={colorB} />
          <rect x={cell} y={cell} width={cell} height={cell} fill={colorB} />
        </pattern>
        <clipPath id={clip}>
          <path d={d} clipRule={clipRule} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={-5000} y={-5000} width={10000} height={10000} fill={`url(#${pat})`} />
      </g>
    </g>
  );
};

export interface MissingTextureProps extends MissingTextureFillProps {
  /** Rendered size in px; the viewBox keeps path units. */
  width: number;
  height: number;
  viewBox: string;
  x?: number;
  y?: number;
  opacity?: number;
}

export const MissingTexture: React.FC<MissingTextureProps> = ({ width, height, viewBox, x, y, opacity = 1, ...fill }) => (
  <svg
    width={width}
    height={height}
    viewBox={viewBox}
    style={{ position: x === undefined && y === undefined ? 'relative' : 'absolute', left: x, top: y, opacity, overflow: 'visible' }}
  >
    <MissingTextureFill {...fill} />
  </svg>
);
