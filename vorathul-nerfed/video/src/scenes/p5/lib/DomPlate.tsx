// Plate-crop stand-ins for screen-space (DOM) shots: a crop of an approved frame in a box, optionally keyed to
// its ink (dark pixels to solid ink, the rest transparent; violet kept). The final asset replaces it when AVAILABLE.
import { Img, staticFile } from 'remotion';
import { AVAILABLE } from '../../../cast/available.ts';

const SRC_W = 1536;
const SRC_H = 1024;

/** The SVG filters the ink key uses; mount once per shot that uses `ink`. */
export const DomPlateFilters = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <filter id="p5-ink-key" colorInterpolationFilters="sRGB">
      {/* alpha = 1 where luminance is low; colour forced to ink. */}
      <feColorMatrix type="matrix" values="0 0 0 0 0.04  0 0 0 0 0.04  0 0 0 0 0.04  -1.6 -3.1 -0.6 0 1.45" />
    </filter>
    <filter id="p5-ivory" colorInterpolationFilters="sRGB">
      <feFlood floodColor="#F4ECD8" result="c" />
      <feComposite in="c" in2="SourceAlpha" operator="in" />
    </filter>
  </svg>
);

export interface DomPlateProps {
  id: string;
  plate: string;
  crop: [number, number, number, number];
  x: number;
  y: number;
  width: number;
  ink?: boolean;
  style?: React.CSSProperties;
}

export const DomPlate = ({ id, plate, crop, x, y, width, ink = false, style }: DomPlateProps) => {
  const [cx, cy, cw, ch] = crop;
  const s = width / cw;
  const height = ch * s;
  if (AVAILABLE.has(id)) {
    return <Img src={staticFile(`assets/${id}.png`)} style={{ position: 'absolute', left: x, top: y, width, height, objectFit: 'contain', ...style }} />;
  }
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height, overflow: 'hidden', filter: ink ? 'url(#p5-ink-key)' : undefined, ...style }}>
      <Img src={staticFile(`plates/${plate}`)} style={{ position: 'absolute', left: -cx * s, top: -cy * s, width: SRC_W * s, height: SRC_H * s, maxWidth: 'none' }} />
    </div>
  );
};
