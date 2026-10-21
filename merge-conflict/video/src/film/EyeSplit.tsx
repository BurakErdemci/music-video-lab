// The stop at the end of the intro: the eye-split, built in-engine from our own close-up cards (fix round 2:
// the generated D01 duo card read as AI and was dropped). The orange girl (O05, mirrored so she faces right)
// glares from the left half lit orange, the blue girl (B09, facing left) from the right half lit blue; each
// card is clipped at the seam, which burns white-hot with sparks. Scribbles trace both, particles drift
// (slowing through the measured stop), and both heads keep the rig's head-only dance.
import { AbsoluteFill } from 'remotion';
import { project } from '../camera/camera.ts';
import { Card, type Placement } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { BLUE, type Grade, ORANGE } from '../grade/grade.ts';
import { type Hex, mixHex } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { Field } from '../particles/field.tsx';
import { Scribble } from '../scribble/Scribble.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { Svg } from '../type/Svg.tsx';
import { fieldClock, SPLIT_CAM } from './proof.ts';

export const SPLIT_O: Placement = { x: -1.45, feet: -5.6, height: 10.2, flip: true };
export const SPLIT_B: Placement = { x: 0.15, feet: -5.9, height: 10.2 };
export const SPLIT_CARDS = { O: 'O05', B: 'B09' } as const;
const SEAM_X = 0;
const GO: Grade = { hue: ORANGE, rival: BLUE, amount: 0.42, rim: 1.4, stage: 1 };
const GB: Grade = { hue: BLUE, rival: ORANGE, amount: 0.42, rim: 1.4, stage: 1 };
const WALL: Grade = { hue: '#ff5a10', rival: BLUE, amount: 0, rim: 0, stage: 0.8 };

/** The seam: a white-hot vertical line with an orange and a blue glow, and sparks re-seeded every 2 frames. */
const Seam = ({ t, x }: { t: number; x: number }) => {
  const step = Math.floor(t * 30);
  const r = seeded(`seam:${step}`);
  const sparks = Array.from({ length: 26 }, () => {
    const y = r.range(0, 1080);
    const side = r.sign();
    const len = r.range(12, 70);
    const ang = r.range(-0.6, 0.6);
    return { y, x2: x + side * len * Math.cos(ang), y2: y + len * Math.sin(ang), c: (side < 0 ? ORANGE : BLUE) as Hex, w: r.range(1.5, 4) };
  });
  return (
    <g>
      <rect x={x - 26} y={0} width={26} height={1080} fill={ORANGE} opacity={0.22} />
      <rect x={x} y={0} width={26} height={1080} fill={BLUE} opacity={0.22} />
      <rect x={x - 9} y={0} width={18} height={1080} fill={mixHex(ORANGE, BLUE, 0.5)} opacity={0.35} />
      <rect x={x - 2.5} y={0} width={5} height={1080} fill="#fffaf2" />
      {sparks.map((s, i) => (
        <line key={i} x1={x} y1={s.y} x2={s.x2} y2={s.y2} stroke={mixHex(s.c, '#ffffff', 0.5)} strokeWidth={s.w} strokeLinecap="round" />
      ))}
    </g>
  );
};

export const EyeSplit = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const ft = fieldClock(t);
  const pose = SPLIT_CAM(t);
  const seam = project(pose, [SEAM_X, 0, 0]).x;
  const t0 = at('eye-split');
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        <SetPlate t={t} grade={WALL} split="#1f5cff" wallOnly />
        <Field t={ft} grade={WALL} layer="back" density={0.6} hueMix={0.3} />
        <Card id={SPLIT_CARDS.O} t={t} grade={GO} {...SPLIT_O} rimDir={[1, 0.15]} clip={{ x: SEAM_X, keep: 'left' }} />
        <Card id={SPLIT_CARDS.B} t={t} grade={GB} {...SPLIT_B} rimDir={[-1, 0.15]} clip={{ x: SEAM_X, keep: 'right' }} />
        <Field t={ft} grade={WALL} layer="front" density={0.7} hueMix={0.3} />
      </Stage>
      <Svg>
        <defs>
          <clipPath id="split-left"><rect x={-100} y={-100} width={seam + 100} height={1280} /></clipPath>
          <clipPath id="split-right"><rect x={seam} y={-100} width={2100 - seam} height={1280} /></clipPath>
        </defs>
        <g clipPath="url(#split-left)">
          <Scribble spec={{ id: 'split-o', card: SPLIT_CARDS.O, at: SPLIT_O, t0: t0 + 0.05, draw: 0.4, t1: at('head-burst'), color: ORANGE, stars: 2 }} t={t} pose={pose} />
        </g>
        <g clipPath="url(#split-right)">
          <Scribble spec={{ id: 'split-b', card: SPLIT_CARDS.B, at: SPLIT_B, t0: t0 + 0.12, draw: 0.4, t1: at('head-burst'), color: BLUE, stars: 2 }} t={t} pose={pose} />
        </g>
        <Seam t={t} x={seam} />
      </Svg>
    </AbsoluteFill>
  );
};
