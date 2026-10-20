import { palette } from '../style/palette.ts';
import { seeded } from '../style/seeded.ts';
import { H, SEAM_X } from '../layout.ts';

const jagged = (key: string, x: number, amp: number): string => {
  const r = seeded(key);
  let d = `M${x} -10`;
  for (let y = 20; y <= H + 20; y += 26) d += ` L${(x + (r() - 0.5) * 2 * amp).toFixed(1)} ${y}`;
  return d;
};

/** Vertical glass seam at x = 960: a cream edge on the navy side, a navy edge on the cream side. */
export const GlassSeam = ({ top = 0, bottom = H }: { top?: number; bottom?: number }) => (
  <g>
    <clipPath id="seam-clip">
      <rect x={SEAM_X - 12} y={top} width={24} height={bottom - top} />
    </clipPath>
    <g clipPath="url(#seam-clip)">
      <path d={jagged('seam-a', SEAM_X - 2.5, 1.2)} stroke={palette.cream} strokeWidth={3} fill="none" />
      <path d={jagged('seam-b', SEAM_X + 1.5, 1.4)} stroke={palette.navy} strokeWidth={3.5} fill="none" />
    </g>
  </g>
);
