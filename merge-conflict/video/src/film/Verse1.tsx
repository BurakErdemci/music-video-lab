// verse1_sweet from 16.33 s (to the proof end): one hard switch to disco on the downbeat (the disco set with its
// mirror ball and floor, the pop palette, the pop type family) and blue cut in crisp, in a held pose, ON the
// downbeat; her confetti bursts outward from her a frame after the hit. Round 4: no rig loop, the camera moves:
//  16.33  BD3 knee-up, held 2 bars, a slow push toward the STACK "I'm HEAD, I'm main, I'm stable and clean"
//  18.98  a hard cut on the downbeat to BD6, the kick, as a small full figure on the floor; HEAD flies off;
//         a lateral dolly; her one accent, a head turn on "clean" (rig/accents.ts); CLEAN morphs into LINE,
//         which opens "Line forty-two..." as a DIFF.
import { AbsoluteFill } from 'remotion';
import { typePlane } from '../camera/camera.ts';
import { Card } from '../cards/Card.tsx';
import { framingAt } from '../girls/framing.ts';
import { KickWord } from '../girls/interact.tsx';
import { GRADES, metalGrade } from '../grade/grade.ts';
import { metalFor } from '../metal/metal.ts';
import { Field } from '../particles/field.tsx';
import { Scribble } from '../scribble/Scribble.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { Diff } from '../type/forms/Code.tsx';
import { FormDefs } from '../type/forms/common.tsx';
import { Stack } from '../type/forms/Stack.tsx';
import { Svg } from '../type/Svg.tsx';
import { LetterMorph } from '../type/transitions/transitions.tsx';
import { BLUE_BURST, cameraAt, DIFF3, DIFF_OPT, FRAMINGS, GIRL, KICK, MORPH_LINE, STACK2, VERSE_B, VERSE_FULL } from './proof.ts';

export const Verse1 = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const m = metalFor(t, 'B');
  const grade = metalGrade({ ...GRADES.reviewed, amount: 0.46 }, m);
  const kicked = framingAt(FRAMINGS, t) === 'stage';
  const at = kicked ? VERSE_FULL : VERSE_B;
  const card = kicked ? GIRL.B.kick : GIRL.B.verse;
  const cam = cameraAt(t);
  const plane = typePlane(cam.pose, cam.base, cam.typeZ);
  const morphOn = t >= MORPH_LINE.t0 && t < MORPH_LINE.t0 + MORPH_LINE.dur;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={cam.pose}>
        <SetPlate t={t} grade={grade} />
        <Field t={t} grade={grade} layer="back" density={0.75} hueMix={0.5} metal={m} bursts={[BLUE_BURST]} />
        <Card id={card} t={t} grade={grade} {...at} rimDir={[1, 0.25]} />
        <Field t={t} grade={grade} layer="front" density={0.6} hueMix={0.5} metal={m} bursts={[BLUE_BURST]} />
      </Stage>
      <Svg>
        <FormDefs />
        <Scribble spec={{ id: 'v-kick', card: GIRL.B.kick, at: VERSE_FULL, t0: KICK.kick + 0.05, draw: 0.3, t1: 30, color: '#19c8ff', stars: 3 }} t={t} pose={cam.pose} />
        <g transform={plane.transform}>
          <Stack spec={STACK2} t={t} hide={[1, ...(morphOn ? [7] : [])]} />
          <KickWord plan={KICK} t={t} />
          <LetterMorph plan={MORPH_LINE} t={t} />
          {t >= MORPH_LINE.t0 + MORPH_LINE.dur - 1 / 60 && <Diff spec={DIFF3} t={t} opt={DIFF_OPT} />}
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
