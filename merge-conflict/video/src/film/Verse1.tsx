// verse1_sweet from 16.33 s (to the proof end): one hard switch to disco on the downbeat (the disco set with its
// mirror ball and floor, the pop palette, the pop type family), blue gathering out of the particles while a whip
// carries the groove's logo off. "I'm HEAD, I'm main, I'm stable and clean" is a STACK, the biggest thing in the
// frame, beside her (knee-up); she KICKS "HEAD" off on "stable" (kick card BD6); two bars in she is a small
// full figure on the floor (shadow, reflection); CLEAN morphs into LINE, which opens "Line forty-two..." as a DIFF.
import { AbsoluteFill } from 'remotion';
import { shifted, HOME } from '../camera/camera.ts';
import { Card } from '../cards/Card.tsx';
import { poseTrack, SmearStreaks } from '../cards/smear.tsx';
import { framingAt } from '../girls/framing.ts';
import { KickWord } from '../girls/interact.tsx';
import { GRADES, metalGrade } from '../grade/grade.ts';
import { metalFor } from '../metal/metal.ts';
import { Dissolve, dissolveState } from '../particles/dissolve.tsx';
import { Field } from '../particles/field.tsx';
import { Scribble } from '../scribble/Scribble.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { Diff } from '../type/forms/Code.tsx';
import { FormDefs } from '../type/forms/common.tsx';
import { Stack } from '../type/forms/Stack.tsx';
import { Svg } from '../type/Svg.tsx';
import { LetterMorph, TypeWhip } from '../type/transitions/transitions.tsx';
import { GrooveLogo } from './Groove.tsx';
import { BLUE_ENTER, DIFF3, DIFF_OPT, FRAMINGS, GIRL, KICK, MORPH_LINE, STACK2, VERSE_B, VERSE_FULL, VERSE_SMEARS, WHIP_VERSE } from './proof.ts';

export const Verse1 = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const m = metalFor(t, 'B');
  const grade = metalGrade({ ...GRADES.reviewed, amount: 0.46 }, m);
  const full = framingAt(FRAMINGS, t) === 'stage';
  const at = full ? VERSE_FULL : VERSE_B;
  const pose = full ? shifted(HOME, [0, 0.4, 0]) : HOME;
  const enter = dissolveState(BLUE_ENTER, t);
  const draws = poseTrack(GIRL.B.verse, VERSE_SMEARS, t, at.height);
  const morphOn = t >= MORPH_LINE.t0 && t < MORPH_LINE.t0 + MORPH_LINE.dur;
  const verseType = (
    <g>
      <Stack spec={STACK2} t={t} hide={[1, ...(morphOn ? [7] : [])]} />
      <KickWord plan={KICK} t={t} />
      <LetterMorph plan={MORPH_LINE} t={t} />
      {t >= MORPH_LINE.t0 + MORPH_LINE.dur - 1 / 60 && <Diff spec={DIFF3} t={t} opt={DIFF_OPT} />}
    </g>
  );
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        <SetPlate t={t} grade={grade} />
        <Field t={t} grade={grade} layer="back" density={0.75} hueMix={0.5} metal={m} />
        {draws.map((d, i) => (
          <Card key={`${d.card}-${i}`} id={d.card} t={t} grade={grade} {...at} dx={d.dx} stretch={d.stretch} opacity={d.opacity * enter.toOpacity} rimDir={[1, 0.25]} />
        ))}
        <Dissolve plan={BLUE_ENTER} t={t} grade={grade} rival="#ff7a1a" />
        <Field t={t} grade={grade} layer="front" density={0.6} hueMix={0.5} metal={m} />
      </Stage>
      <Svg>
        <FormDefs />
        <Scribble spec={{ id: 'v-kick', card: GIRL.B.kick, at: VERSE_B, t0: KICK.kick + 0.1, draw: 0.3, t1: (VERSE_SMEARS[1] as { t: number }).t - 0.1, color: '#19c8ff', stars: 3 }} t={t} pose={pose} />
        <SmearStreaks smears={VERSE_SMEARS} t={t} at={at} pose={pose} color="#19c8ff" />
        <TypeWhip plan={WHIP_VERSE} t={t} color="#19c8ff" from={<GrooveLogo t={t} />} to={verseType} />
      </Svg>
    </AbsoluteFill>
  );
};
