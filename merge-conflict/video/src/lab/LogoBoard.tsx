// LogoBoard: the three MERGE CONFLICT logo candidates as stills from the real engine (real set, real fonts).
// Frame 0-2: designs A, B, C in the CONFLICT state on the groove's all-metal wall (no ball, no checker floor); frame 3-5: the same in the
// RESOLVED state on a joined orange/blue stage. Not part of the film.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HOME } from '../camera/camera.ts';
import { GRADES, type Grade, metalGrade } from '../grade/grade.ts';
import { Field } from '../particles/field.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { Fonts } from '../type/fonts.tsx';
import { type LogoDesign, MergeConflictLogo } from '../type/logo/Logo.tsx';
import { Svg } from '../type/Svg.tsx';

export const LOGO_FRAMES = 6;
const JOINED: Grade = { hue: '#b0309a', rival: '#ffffff', amount: 0.3, rim: 1, stage: 0.9 };

export const LogoBoard = () => {
  const frame = useCurrentFrame();
  const design = (['A', 'B', 'C'] as LogoDesign[])[frame % 3] as LogoDesign;
  const resolved = frame >= 3;
  const grade = resolved ? JOINED : metalGrade(GRADES.mainline, 1);
  const t = 10 + frame * 0.37;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Fonts />
      <Stage pose={HOME}>
        <SetPlate t={t} grade={grade} split={resolved ? '#1f5cff' : undefined} wallOnly />
        <Field t={t} grade={grade} layer="back" density={0.7} metal={resolved ? 0.2 : 1} />
      </Stage>
      <Svg>
        <MergeConflictLogo id={`logo-${frame}`} design={design} resolved={resolved} cx={960} cy={540} width={design === 'C' ? 1500 : 1560} beat={0.5} />
      </Svg>
    </AbsoluteFill>
  );
};
