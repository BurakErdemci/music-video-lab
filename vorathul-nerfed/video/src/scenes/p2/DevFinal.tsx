// The developer as the drawn G46 poses. Every pose was cut from the same 1024 x 1536 canvas (feet near y 1462, body centre at
// x 512) and auto-cropped, so each is placed by the centre of its content box in that canvas and scaled by the canvas, never by
// the crop: the body keeps one scale and one floor line across poses. A pose swap is a cut of a flat drawing: it lands on an
// event frame; between swaps only a small breath bob runs every frame.
import { staticFile } from 'remotion';
import { OFFICE } from './art/office.tsx';
import { bf, T } from './frames.ts';
import { finalSize } from './paint/finals.tsx';

/** World units per canvas px: the figure (head top to feet, about 1390 canvas px) is 5.6 units tall. */
const S = 5.6 / 1390;
const FLOOR_C = 1462;

/** Centre of each pose's content box in the 1024 x 1536 canvas, measured from stil/prompts/f-developer/out. */
const BOX = {
  walk: { id: 'G46-walk', cx: 483.5, cy: 753 },
  click: { id: 'G46-click', cx: 509.5, cy: 754 },
  bored: { id: 'G46-bored', cx: 556, cy: 768 },
  tap: { id: 'G46-tap', cx: 547.5, cy: 749.5 },
  pin: { id: 'G46-pin', cx: 539.5, cy: 763 },
  dust: { id: 'G46-dust', cx: 523.5, cy: 762.5 },
} as const;
type Pose = keyof typeof BOX;

const WALK_FROM = 11;
const WALK_TO = 3.0;
const TAP_END = bf(260);
/** S35 opens one step closer to the painting. */
const S35_FROM = T.tapVorathul - 16;

/** Which pose, where, mirrored or not, at film frame f. */
export const devFinalAt = (f: number): { pose: Pose; x: number; mirror: boolean; walk: boolean } => {
  if (f < T.clicker) {
    const t = Math.min(1, Math.max(0, (f - T.devEnters) / (T.clicker - 1 - T.devEnters)));
    return { pose: 'walk', x: WALK_FROM + (WALK_TO - WALK_FROM) * t, mirror: false, walk: true };
  }
  if (f < T.unfreeze) return { pose: 'click', x: WALK_TO, mirror: false, walk: false };
  if (f < T.tapVorathul) return { pose: 'bored', x: f < S35_FROM ? WALK_TO : 2.3, mirror: false, walk: false };
  // the tap reaches to the right in the drawing; he stands right of the painting, so the card is mirrored
  if (f < TAP_END) return { pose: 'tap', x: 2.3, mirror: true, walk: false };
  if (f < T.players) return { pose: 'bored', x: 2.3, mirror: false, walk: false };
  if (f < T.felt) return { pose: 'pin', x: 4.8, mirror: false, walk: false };
  return { pose: 'dust', x: 4.8, mirror: false, walk: false };
};

export const hasDevFinals = (): boolean => (Object.values(BOX) as { id: string }[]).every((b) => finalSize(b.id));

export const DevFinal = ({ frame }: { frame: number }) => {
  const d = devFinalAt(frame);
  const b = BOX[d.pose];
  const size = finalSize(b.id) as [number, number];
  const w = size[0] * S;
  const h = size[1] * S;
  // breath, and the walk's step bounce
  const bob = d.walk ? -0.05 * Math.abs(Math.sin(((WALK_FROM - d.x) / 2.6) * Math.PI * 2)) : 0.02 * Math.sin(frame * 0.21);
  const x = (b.cx - 512) * S - w / 2;
  const y = (b.cy - FLOOR_C) * S - h / 2;
  return (
    <g transform={`translate(${d.x} ${OFFICE.floorY + bob}) scale(${d.mirror ? -1 : 1} 1)`}>
      <image href={staticFile(`assets/${b.id}.png`)} x={x} y={y} width={w} height={h} />
    </g>
  );
};
