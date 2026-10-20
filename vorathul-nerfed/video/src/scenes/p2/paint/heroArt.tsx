// A hero as the final cut-out (G15-G18 pose sheets, poses numbered in the storyboard's order) once the main loop has made
// it live in AVAILABLE, else the code-drawn stand-in silhouette. The same call places both.
import { staticFile } from 'remotion';
import { AVAILABLE, assetSize } from '../../../cast/available.ts';
import { Hero, type HeroKind, type HeroPose, type HeroProps } from '../art/heroes.tsx';

const SHEET: Record<HeroKind, string> = { knight: 'G15', mage: 'G16', archer: 'G17', rogue: 'G18' };

/** Pose -> number on the sheet (ready, strike/cast, flying, KO, tiptoe, poke or run, thumbs and so on, left to right). */
const NUMBER: Record<HeroKind, Partial<Record<HeroPose, number>>> = {
  knight: { ready: 1, cower: 1, flying: 3, ko: 4, dizzy: 1, run: 1, tiptoe: 5, poke: 6, thumbs: 7, cry: 1, gather: 5 },
  mage: { ready: 1, cower: 1, flying: 4, ko: 5, dizzy: 1, run: 6, tiptoe: 6, poke: 2, thumbs: 7, cry: 1, gather: 6 },
  archer: { ready: 1, cower: 1, flying: 3, ko: 4, dizzy: 1, run: 5, tiptoe: 5, poke: 2, thumbs: 7, cry: 6, gather: 5 },
  rogue: { ready: 1, cower: 1, flying: 4, ko: 4, dizzy: 1, run: 6, tiptoe: 6, poke: 2, thumbs: 7, cry: 1, gather: 6, pancake: 5 },
};

export const HeroPiece = (p: HeroProps) => {
  const id = `${SHEET[p.kind]}-${NUMBER[p.kind][p.pose] ?? 1}`;
  const size = assetSize(id);
  if (!AVAILABLE.has(id) || !size) return <Hero {...p} />;
  const h = p.height * (p.pose === 'ko' || p.pose === 'pancake' ? 0.5 : 1);
  const w = (h * size[0]) / size[1];
  const flip = p.flip ? -1 : 1;
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${p.rotate ?? 0} 0 ${-h / 2}) scale(${flip} 1)`}>
      <image href={staticFile(`assets/${id}.png`)} x={-w / 2} y={-h} width={w} height={h} />
    </g>
  );
};
