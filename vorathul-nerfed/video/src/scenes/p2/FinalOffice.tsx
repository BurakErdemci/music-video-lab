// Final office cut-outs (G28 desks with their seated developers, G29 plant and desk corner) drawn as SVG images in world units,
// with the code-drawn art from art/office.tsx as the fallback. Local origin = the floor point under the image's bottom centre.
import { staticFile } from 'remotion';
import { DeskArt, DeskCornerArt, PlantArt } from './art/office.tsx';
import { C } from '../../ui/theme.tsx';
import { finalSize } from './paint/finals.tsx';

const Img = ({ id, height, dx = 0 }: { id: string; height: number; dx?: number }) => {
  const s = finalSize(id);
  if (!s) return null;
  const w = (height * s[0]) / s[1];
  return <image href={staticFile(`assets/${id}.png`)} x={-w / 2 + dx} y={-height} width={w} height={height} />;
};

const DESK_H = 5.0;

/** The left monitor's updater window on top of the final desk: UPDATE 2.3 with the same fill as the sun. */
const Updater = ({ fill, label }: { fill: number; label: string }) => {
  // The label is "UPDATE 2.3  NN%": the name sits left and the percentage right so neither can run out of the card.
  const name = label.replace(/\s*\d+%$/, '');
  const pct = label.match(/\d+%$/)?.[0] ?? '';
  const [w] = finalSize('G28-1') as [number, number];
  const [, h] = finalSize('G28-1') as [number, number];
  const W = (DESK_H * w) / h;
  const x0 = -W / 2 + 0.4 * W;
  const y0 = -DESK_H + 0.115 * DESK_H;
  const sw = 0.385 * W;
  const sh = 0.275 * DESK_H;
  return (
    <g>
      <rect x={x0 + 0.1} y={y0 + 0.1} width={sw - 0.2} height={sh - 0.2} rx={0.08} fill={C.white} stroke={C.dark} strokeWidth={0.035} />
      <text x={x0 + 0.28} y={y0 + 0.52} fontFamily="'UiInter', sans-serif" fontWeight={600} fontSize={0.3} fill={C.ink}>
        Updater
      </text>
      <rect x={x0 + 0.28} y={y0 + 0.72} width={sw - 0.56} height={0.2} rx={0.1} fill={C.mid} />
      {fill > 0 ? <rect x={x0 + 0.28} y={y0 + 0.72} width={(sw - 0.56) * (fill / 100)} height={0.2} rx={0.1} fill={C.blue} /> : null}
      <text x={x0 + 0.28} y={y0 + 1.2} fontFamily="'UiInter', sans-serif" fontWeight={600} fontSize={0.15} fill={C.slate}>
        {name}
      </text>
      <text x={x0 + sw - 0.28} y={y0 + 1.2} textAnchor="end" fontFamily="'UiInter', sans-serif" fontWeight={700} fontSize={0.15} fill={C.ink}>
        {pct}
      </text>
    </g>
  );
};

export const Desk = ({ side, fill, label }: { side: 'L' | 'R'; fill: number; label: string }) => {
  const id = side === 'L' ? 'G28-1' : 'G28-2';
  if (!finalSize(id)) return <DeskArt side={side} screen={side === 'L' ? { title: 'Updater', fill: fill / 100, label } : undefined} />;
  return (
    <>
      <Img id={id} height={DESK_H} />
      {side === 'L' ? <Updater fill={fill} label={label} /> : null}
    </>
  );
};

export const Plant = () => (finalSize('G29-1') ? <Img id="G29-1" height={4.6} /> : <PlantArt />);
export const DeskCorner = () => (finalSize('G29-2') ? <Img id="G29-2" height={3.2} dx={1.3} /> : <DeskCornerArt />);
