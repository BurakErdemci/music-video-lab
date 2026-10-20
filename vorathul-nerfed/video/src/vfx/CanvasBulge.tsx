// A gauntlet pushing the painting's canvas out from behind (storyboard 2, N4), as a 2D overlay:
// the picture inside is magnified inside a fist-shaped field (SVG displacement), then flat comic
// marks sell the volume - an ink shadow crescent, an ivory light crescent, a dry-brush contour
// and strain lines where the canvas stretches. The stage lane's 3D card version is separate.
import type { ReactNode } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { DryBrushStroke } from './DryBrushStroke.tsx';
import { seeded } from './seeded.ts';
import { blobPath, INK, IVORY, Overlay, polar, taperedPath, type Pt } from './style.tsx';

export interface CanvasBulgeProps {
  /** Current frame (boils the ink marks on twos). */
  frame: number;
  /** 0 = flat canvas, 1 = full push. Drive it from the shot (e.g. interpolate on the press beats). */
  amount: number;
  /** Fist centre and width, px. */
  x: number;
  y: number;
  size: number;
  /** Degrees; 0 = knuckles up. */
  rotate?: number;
  seed?: number;
  /** The painting to push (DOM content). */
  children: ReactNode;
  id?: string;
}

/** Fist seen from the front: four knuckles on top, a thumb on the left. Unit width, centred. */
const FIST: Pt[] = [
  [-0.4, 0.4], [-0.5, 0.12], [-0.57, -0.06], [-0.46, -0.27], [-0.34, -0.43], [-0.22, -0.34], [-0.11, -0.47], [0, -0.36],
  [0.11, -0.47], [0.22, -0.34], [0.33, -0.42], [0.46, -0.27], [0.5, 0.02], [0.45, 0.33], [0.2, 0.44], [-0.18, 0.45],
];
const VALLEYS = [5, 7, 9];

const fistPts = (x: number, y: number, size: number, rot: number, k = 1, dx = 0, dy = 0): Pt[] => {
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  return FIST.map(([px, py]): Pt => [x + dx + (px * c - py * s) * size * k, y + dy + (px * s + py * c) * size * k]);
};

/** Fist field as an SVG image: one channel ramps across the fist, the rest of the frame sits at 0.5. */
const mapImage = (w: number, h: number, d: string, axis: 'x' | 'y', box: [number, number, number, number]): string => {
  const [x0, y0, x1, y1] = box;
  const bg = axis === 'x' ? 'rgb(128,0,0)' : 'rgb(0,128,0)';
  const hi = axis === 'x' ? 'rgb(255,0,0)' : 'rgb(0,255,0)';
  const lo = 'rgb(0,0,0)';
  const g = axis === 'x' ? `x1="${x0}" y1="0" x2="${x1}" y2="0"` : `x1="0" y1="${y0}" x2="0" y2="${y1}"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" ${g}><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="${bg}"/><path d="${d}" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export const CanvasBulge = ({ frame, amount, x, y, size, rotate = 0, seed = 1, children, id = 'vfx-bulge' }: CanvasBulgeProps) => {
  const { width, height } = useVideoConfig();
  const a = Math.max(0, Math.min(1, amount));
  const rot = (rotate * Math.PI) / 180;
  const fist = blobPath(fistPts(x, y, size, rot));
  const box: [number, number, number, number] = [x - size * 0.6, y - size * 0.6, x + size * 0.6, y + size * 0.6];
  const fid = `${id}-${seed}`;
  const step = Math.floor(frame / 2);
  const rng = seeded(`bulge:${seed}:${step}`);
  // Shadow crescent: the fist offset toward the lower right, masked off the fist itself. The light
  // crescent is the fist's own outline stroked in ivory, shifted up-left and clipped inside.
  const off = size * 0.07 * a;
  const shadowD = blobPath(fistPts(x, y, size, rot, 1.02, off, off * 1.2));
  const strain = Array.from({ length: 22 }, () => {
    const ang = rng() * Math.PI * 2;
    const r0 = size * rng.range(0.5, 0.62);
    const len = size * rng.range(0.12, 0.38) * a;
    const pts = Array.from({ length: 4 }, (_, i): Pt => {
      const [px, py] = polar(r0 + (len * i) / 3, ang + rng.range(-0.02, 0.02));
      return [x + px, y + py * 0.85];
    });
    return taperedPath(pts, size * 0.018, 0.1);
  }).join('');
  const fingers = VALLEYS.map((v) => {
    const pts = fistPts(x, y, size, rot);
    const top = pts[v] as Pt;
    const [c, s] = [Math.cos(rot), Math.sin(rot)];
    const down: Pt = [top[0] - s * size * 0.26, top[1] + c * size * 0.26];
    return `M${top[0]} ${top[1]}L${down[0]} ${down[1]}`;
  });
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x={0} y={0} width={width} height={height} colorInterpolationFilters="sRGB">
          <feImage href={mapImage(width, height, fist, 'x', box)} x={0} y={0} width={width} height={height} result="mx" />
          <feImage href={mapImage(width, height, fist, 'y', box)} x={0} y={0} width={width} height={height} result="my" />
          <feComposite in="mx" in2="my" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="m" />
          {/* Blurring the hard fist edge into the 0.5 surround turns the ramp into a smooth swell. */}
          <feGaussianBlur in="m" stdDeviation={size * 0.1} result="mb" />
          <feDisplacementMap in="SourceGraphic" in2="mb" scale={size * 0.42 * a} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: a > 0 ? `url(#${fid})` : undefined }}>{children}</AbsoluteFill>
      {a > 0.02 ? (
        <Overlay>
          <defs>
            <mask id={`${fid}-out`}>
              <rect width={width} height={height} fill="#fff" />
              <path d={fist} fill="#000" />
            </mask>
            <clipPath id={`${fid}-in`}>
              <path d={fist} />
            </clipPath>
          </defs>
          <path d={shadowD} fill={INK} mask={`url(#${fid}-out)`} opacity={Math.min(1, a * 1.4)} />
          <g clipPath={`url(#${fid}-in)`}>
            <path d={fist} fill="none" stroke={IVORY} strokeWidth={size * 0.06 * a} transform={`translate(${off * 0.8} ${off * 0.9})`} />
          </g>
          <path d={strain} fill={INK} opacity={a} />
          <DryBrushStroke d={fist} width={Math.max(2, size * 0.028 * a)} seed={(seed * 7 + step) % 997} taper={0.15} breakup={0.25} />
          {fingers.map((d, i) => (
            <DryBrushStroke key={i} d={d} width={Math.max(1.5, size * 0.02 * a)} seed={(seed * 11 + step + i) % 997} taper={0.8} breakup={0.2} />
          ))}
        </Overlay>
      ) : null}
    </AbsoluteFill>
  );
};
