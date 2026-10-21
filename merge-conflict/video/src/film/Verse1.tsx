// verse1_sweet from 16.33 s (to the proof end): the blue girl alone in her disco costume; the set slides from
// the groove's metal toward pop over a bar (metalAt's one-bar slide out) and the type is the pop family.
// "I'm HEAD, I'm main, I'm stable and clean" is a STACK; she KICKS "HEAD" off on "stable" (kick card BD6);
// CLEAN morphs into LINE, which opens "Line forty-two, the button was blue..." as a DIFF. Framing: stage for
// two bars, then a low angle with the next pose.
import { AbsoluteFill } from 'remotion';
import { Card } from '../cards/Card.tsx';
import { poseTrack, SmearStreaks } from '../cards/smear.tsx';
import { framingAt } from '../girls/framing.ts';
import { KickWord } from '../girls/interact.tsx';
import { framing } from '../girls/staging.tsx';
import { GRADES, metalGrade } from '../grade/grade.ts';
import { metalFor } from '../metal/metal.ts';
import { Field } from '../particles/field.tsx';
import { Scribble } from '../scribble/Scribble.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { shifted } from '../camera/camera.ts';
import { HOME } from '../camera/camera.ts';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { Diff } from '../type/forms/Code.tsx';
import { FormDefs } from '../type/forms/common.tsx';
import { Stack } from '../type/forms/Stack.tsx';
import { Svg } from '../type/Svg.tsx';
import { LetterMorph } from '../type/transitions/transitions.tsx';
import { DIFF3, DIFF_OPT, FRAMINGS, GIRL, KICK, MORPH_LINE, STACK2, VERSE, VERSE_B, VERSE_SMEARS } from './proof.ts';

export const Verse1 = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const m = metalFor(t, 'B');
  const grade = metalGrade(GRADES.reviewed, m);
  const low = framingAt(FRAMINGS, t) === 'low';
  const pose = low ? framing('low', t, { full: GIRL.B.next, close: GIRL.B.close, color: '#2f7bff' }, { full: GIRL.B.next, close: GIRL.B.close, color: '#2f7bff' }).pose : shifted(HOME, [0, 0, -0.5]);
  const draws = poseTrack(VERSE_SMEARS[0].from, VERSE_SMEARS, t, VERSE_B.height);
  const morphOn = t >= MORPH_LINE.t0 && t < MORPH_LINE.t0 + MORPH_LINE.dur;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        <SetPlate t={t} grade={grade} />
        <Field t={t} grade={grade} layer="back" density={0.75} hueMix={0.5} metal={m} />
        {draws.map((d, i) => (
          <Card key={`${d.card}-${i}`} id={d.card} t={t} grade={grade} {...VERSE_B} dx={d.dx} stretch={d.stretch} opacity={d.opacity} rimDir={[1, 0.25]} />
        ))}
        <Field t={t} grade={grade} layer="front" density={0.6} hueMix={0.5} metal={m} />
      </Stage>
      <Svg>
        <FormDefs />
        <Scribble spec={{ id: 'v-kick', card: GIRL.B.kick, at: VERSE_B, t0: KICK.kick + 0.1, draw: 0.3, t1: VERSE_SMEARS[2].t - 0.1, color: '#19c8ff', stars: 3 }} t={t} pose={pose} />
        <SmearStreaks smears={VERSE_SMEARS} t={t} at={VERSE_B} pose={pose} color="#19c8ff" />
        <Stack spec={STACK2} t={t} hide={[1, ...(morphOn ? [7] : [])]} />
        <KickWord plan={KICK} t={t} />
        <LetterMorph plan={MORPH_LINE} t={t} />
        {t >= MORPH_LINE.t0 + MORPH_LINE.dur - 1 / 60 && t >= VERSE.start && <Diff spec={DIFF3} t={t} opt={DIFF_OPT} />}
      </Svg>
    </AbsoluteFill>
  );
};
