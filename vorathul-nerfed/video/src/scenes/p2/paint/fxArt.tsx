// Finals for the meteor rain's effects (G21 meteors, G23 floor shards, G24 smoke) with the vfx lane's code-drawn effects as the
// fallback, so the same call draws either. Everything is a pure function of the frame, drawn inside the painting's 1920 x 1080 SVG.
import { staticFile } from 'remotion';
import { Meteor, seeded } from './fx.tsx';
import { finalSize } from './finals.tsx';
import { Dust } from '../art/heroes.tsx';

type Pt = readonly [number, number];

const easeIn = (t: number): number => Math.min(1, Math.max(0, t)) ** 2;

export interface Rock {
  launch: number;
  dur: number;
  from: Pt;
  to: Pt;
  size: number;
  seed: number;
}

/** A falling meteor at frame f (relative launch frame f - launch): the G21 cut-out when final, else the vfx meteor. */
export const RockArt = ({ m, f }: { m: Rock; f: number }) => {
  const t = f - m.launch;
  if (t < 0 || t >= m.dur) return null;
  const id = `G21-${(m.seed % 4) + 1}`;
  const size = finalSize(id);
  if (!size) return <Meteor frame={t} duration={m.dur} seed={m.seed} from={[...m.from]} to={[...m.to]} size={m.size} />;
  const p = easeIn((t + 1) / m.dur);
  const x = m.from[0] + (m.to[0] - m.from[0]) * p;
  const y = m.from[1] + (m.to[1] - m.from[1]) * p;
  const w = m.size * 11 * (0.7 + 0.3 * p);
  const h = (w * size[1]) / size[0];
  // The rock sits at the lower left of the image and the tail runs up and to the right at about 37 degrees; the path is steeper.
  const rot = (Math.atan2(m.to[1] - m.from[1], m.to[0] - m.from[0]) * 180) / Math.PI - 142;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <image href={staticFile(`assets/${id}.png`)} x={-0.12 * w} y={-0.84 * h} width={w} height={h} />
    </g>
  );
};

/** What a landing throws: smoke puffs (G24) and floor shards (G23), or the code-drawn dust puff. t = frames since the landing. */
export const LandingArt = ({ t, x, y, seed }: { t: number; x: number; y: number; seed: number }) => {
  if (t < 0 || t >= 18) return null;
  const smoke = finalSize(`G24-${(seed % 5) + 1}`);
  if (!smoke) return <Dust frame={t} x={x} y={y} size={70} seed={seed} />;
  const r = seeded(`p2land:${seed}`);
  const u = t / 18;
  const h = 150 * (0.45 + 0.7 * Math.min(1, t / 8));
  const w = (h * smoke[0]) / smoke[1];
  return (
    <g opacity={1 - u * u}>
      <image href={staticFile(`assets/G24-${(seed % 5) + 1}.png`)} x={x - w / 2} y={y - h + 20} width={w} height={h} />
      {Array.from({ length: 4 }, (_, i) => {
        const id = `G23-${((seed + i * 3) % 10) + 1}`;
        const s = finalSize(id);
        if (!s) return null;
        const a = -Math.PI / 2 + r.range(-1.1, 1.1);
        const v = r.range(14, 26);
        const sh = r.range(36, 60);
        const sw = (sh * s[0]) / s[1];
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t + 1.6 * t * t;
        return <image key={i} href={staticFile(`assets/${id}.png`)} x={px - sw / 2} y={py - sh / 2} width={sw} height={sh} transform={`rotate(${r.range(-60, 60) + t * r.range(-20, 20)} ${px} ${py})`} />;
      })}
    </g>
  );
};
