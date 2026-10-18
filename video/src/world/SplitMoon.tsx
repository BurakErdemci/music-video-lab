import { palette } from '../style/palette.ts';
import { HalftonePattern } from '../style/screenprint.tsx';
import { seeded } from '../style/seeded.ts';
import { H, SEAM_X, W } from '../layout.ts';

interface Props {
  cx: number;
  cy: number;
  r: number;
  /** 0 = new, 1 = full. Lit shape = disc minus the same disc shifted by 2r * phase. */
  phase: number;
  /** true: cut by the seam, one half on each side (cx should be SEAM_X). */
  split: boolean;
}

const craters = (() => {
  const r = seeded('moon-craters');
  return Array.from({ length: 9 }, () => ({ a: r() * Math.PI * 2, d: Math.sqrt(r()) * 0.7, s: 0.07 + r() * 0.1 }));
})();

const Disc = ({ cx, cy, r, phase }: Omit<Props, 'split'>) => {
  const full = phase >= 0.999;
  const shift = 2 * r * phase;
  return (
    <g>
      {!full && (
        <mask id="moon-mask" maskUnits="userSpaceOnUse" x={cx - r * 3} y={cy - r * 2} width={r * 6} height={r * 4}>
          <circle cx={cx} cy={cy} r={r} fill="#fff" />
          <circle cx={cx - shift} cy={cy} r={r} fill="#000" />
        </mask>
      )}
      <g mask={full ? undefined : 'url(#moon-mask)'}>
        <circle cx={cx} cy={cy} r={r} fill={palette.moonYellow} />
        {craters.map((c, i) => (
          <circle key={i} cx={cx + Math.cos(c.a) * c.d * r} cy={cy + Math.sin(c.a) * c.d * r} r={c.s * r} fill="url(#moon-dots)" />
        ))}
      </g>
    </g>
  );
};

/** Halves are clipped at the seam; the cream-side half gets a thin navy keyline to read on paper. */
export const SplitMoon = ({ cx, cy, r, phase, split }: Props) => (
  <g>
    <defs>
      <HalftonePattern id="moon-dots" spacing={6} radius={1.6} />
      <clipPath id="moon-left">
        <rect x={0} y={0} width={SEAM_X - 1} height={H} />
      </clipPath>
      <clipPath id="moon-right">
        <rect x={SEAM_X + 1} y={0} width={W - SEAM_X} height={H} />
      </clipPath>
    </defs>
    {split ? (
      <>
        <g clipPath="url(#moon-left)">
          <Disc cx={cx} cy={cy} r={r} phase={phase} />
        </g>
        <g clipPath="url(#moon-right)">
          <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={palette.navy} strokeWidth={2} />
          <Disc cx={cx} cy={cy} r={r} phase={phase} />
        </g>
      </>
    ) : (
      <>
        <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={palette.navy} strokeWidth={2} />
        <Disc cx={cx} cy={cy} r={r} phase={phase} />
      </>
    )}
  </g>
);
