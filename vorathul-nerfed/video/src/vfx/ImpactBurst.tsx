import { AbsoluteFill } from 'remotion';
import { seeded } from './seeded.ts';
import { clamp01, easeOutExpo, GOLD, INK, InkFilter, inkFilterId, IVORY, Overlay, polar, polyPath, type Pt } from './style.tsx';

export interface ImpactBurstProps {
  /** Frame relative to the impact. */
  frame: number;
  /** Total frames (flash + star + break-up); ~10-14 suits one impact per bar. */
  duration: number;
  seed: number;
  x: number;
  y: number;
  /** Outer star radius, px. */
  size: number;
  /** 0-3 frames of full-frame flash: ivory field, then inverted scene, then black field. */
  flash?: 0 | 1 | 2 | 3;
}

const star = (seed: number, r: number, spikes: number, innerK: number): Pt[] => {
  const rng = seeded(`star:${seed}:${spikes}`);
  const pts: Pt[] = [];
  for (let i = 0; i < spikes; i++) {
    const a = ((i + rng.range(-0.25, 0.25)) / spikes) * Math.PI * 2;
    const long = rng() < 0.25 ? rng.range(1.25, 1.6) : rng.range(0.75, 1.1);
    pts.push(polar(r * long, a));
    pts.push(polar(r * innerK * rng.range(0.8, 1.15), a + (Math.PI / spikes) * rng.range(0.8, 1.2)));
  }
  return pts;
};

/** Jagged comic impact star with optional 1-3 frame ivory/black inversion flash. */
export const ImpactBurst = ({ frame, duration, seed, x, y, size, flash = 2 }: ImpactBurstProps) => {
  if (frame < 0 || frame >= duration) return null;
  const pop = 1.18 - 0.18 * easeOutExpo((frame + 1) / 3);
  // After 55 % of its life the star bursts outward and thins, so it reads as a hit, not a sticker.
  const late = clamp01((frame - duration * 0.55) / (duration * 0.45));
  const r = size * pop * (1 + late * 0.5);
  const outer = star(seed, r, 14, 0.5);
  const mid = star(seed + 1, r * 0.66, 11, 0.55);
  const core = star(seed + 2, r * 0.36, 9, 0.6);
  const rays = seeded(`rays:${seed}`);
  const filterId = inkFilterId(seed, 8);
  const inFlash = frame < flash;
  // Inverted flash frames swap ink and paper for the star itself.
  const [paper, ink] = inFlash && frame !== 1 ? (frame === 0 ? [INK, IVORY] : [IVORY, INK]) : [IVORY, INK];
  return (
    <>
      {inFlash && frame === 0 ? <AbsoluteFill style={{ background: IVORY }} /> : null}
      {inFlash && frame === 1 ? <AbsoluteFill style={{ backdropFilter: 'grayscale(1) contrast(6) invert(1) sepia(0.25) brightness(0.98)' }} /> : null}
      {inFlash && frame === 2 ? <AbsoluteFill style={{ background: INK }} /> : null}
      <Overlay style={{ opacity: 1 - late ** 2 }}>
        <defs>
          <InkFilter seed={seed} rough={8} />
        </defs>
        <g transform={`translate(${x} ${y})`} filter={`url(#${filterId})`}>
          <g fill={ink}>
            {Array.from({ length: 22 }, (_, i) => {
              const a = rays() * Math.PI * 2;
              const w = rays.range(0.01, 0.03);
              const r0 = r * rays.range(0.9, 1.3);
              const r1 = r * rays.range(1.6, 2.4) * (1 + late * 0.4);
              return <path key={i} d={polyPath([polar(r0, a - w), polar(r1, a), polar(r0, a + w)])} />;
            })}
          </g>
          <path d={polyPath(outer)} fill={paper} stroke={ink} strokeWidth={size * 0.07} strokeLinejoin="miter" />
          {late < 0.6 ? <path d={polyPath(mid)} fill={inFlash ? paper : GOLD} /> : null}
          {late < 0.3 ? <path d={polyPath(core)} fill={paper} /> : null}
        </g>
      </Overlay>
    </>
  );
};
