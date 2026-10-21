// The stop at the end of the intro: the D01 eye-split duo card (nose to nose, orange half against blue
// half) as a plate, with a slow 48-frame push and the particle field slowing through the measured stop.
import { AbsoluteFill } from 'remotion';
import { GRADES } from '../grade/grade.ts';
import { Field } from '../particles/field.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { fieldClock, SPLIT_CAM } from './proof.ts';

export const D01 = 'plates/D01-eye-split.png';
// The duo card is painted split-lit already: no tint, no rim.
const SPLIT = { ...GRADES.mainline, amount: 0, rim: 0 };

export const EyeSplit = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const ft = fieldClock(t);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={SPLIT_CAM(t)}>
        <SetPlate plate={D01} t={t} grade={SPLIT} />
        <Field t={ft} grade={GRADES.mainline} layer="back" density={0.5} hueMix={0.1} />
        <Field t={ft} grade={GRADES.mainline} layer="front" density={0.7} hueMix={0.1} />
      </Stage>
    </AbsoluteFill>
  );
};
