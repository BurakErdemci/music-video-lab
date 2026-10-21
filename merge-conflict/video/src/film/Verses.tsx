// Verse 1 and verse 2 (16.33-38.40 s, round 5). The stage is the disco club; every line is either big kinetic
// type or ONE git object built from disco material (neon tubes, light boxes), with a girl playing with it:
//  V1 blue alone: "I'm HEAD, I'm main" STACK + the `git branch` neon sign (* main lights on "main"), the kick
//     on "stable" sends HEAD flying; "Line forty-two..." with the line-42 sign (`color: blue;` lights on "blue");
//     "Reviewed and approved..." as APPROVED neon stamps; "Then someone pushed at midnight... who are you?" as
//     the 00:00 push notification; orange crouches in as the intruder on "who" and springs in on "you?".
//  V2 orange (disco, pop family by her costume): `git log --graph` neon tubes with her branch splitting off;
//     the same line 42 as the diff `- blue` / `+ orange`; "CSS" thrown at blue, who is knocked back; the
//     commit counter racing 0 -> 300.
// Poses are hard cuts on words (act.ts); the camera moves continuously (proof.ts cameraAt).
import { AbsoluteFill } from 'remotion';
import { typePlane } from '../camera/camera.ts';
import { Card } from '../cards/Card.tsx';
import { framingAt } from '../girls/framing.ts';
import { KickWord, throwPlan, throwRecoil, ThrowWords } from '../girls/interact.tsx';
import { GRADES, type Grade, metalGrade } from '../grade/grade.ts';
import { metalFor } from '../metal/metal.ts';
import { Field } from '../particles/field.tsx';
import { Scribble } from '../scribble/Scribble.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { Counter } from '../type/Counter.tsx';
import { FormDefs } from '../type/forms/common.tsx';
import { Stamp as StampForm } from '../type/forms/Plates.tsx';
import { Stack } from '../type/forms/Stack.tsx';
import { GitGraph, Lyric, NeonSign, PushNote } from '../type/objects/git.tsx';
import { Svg } from '../type/Svg.tsx';
import { LetterMorph } from '../type/transitions/transitions.tsx';
import { BLUE_VERSES, ORANGE_VERSES, poseAt, tok, toks } from './act.ts';
import { at } from '../events.ts';
import { BLUE_BURST, cameraAt, FRAMINGS, GIRL, KICK, LYRIC3, MORPH_LINE, ORANGE_BURST, STACK2 } from './proof.ts';

const ORANGE_DISCO: Grade = { hue: '#ff7a1a', rival: '#2f7bff', amount: 0.42, rim: 1.3, stage: 1 };

export const Verses = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const cam = cameraAt(t);
  const plane = typePlane(cam.pose, cam.base, cam.typeZ);
  const orangeSings = t >= at('orange-release');
  const blueGrade = metalGrade({ ...GRADES.reviewed, amount: 0.46 }, metalFor(t, 'B'));
  const setGrade = orangeSings ? ORANGE_DISCO : blueGrade;
  const blue = poseAt(BLUE_VERSES, t);
  const orange = poseAt(ORANGE_VERSES, t);
  const intruder = t < at('orange-release');
  const morphOn = t >= MORPH_LINE.t0 && t < MORPH_LINE.t0 + MORPH_LINE.dur;
  const throwP = throwPlan({
    id: 'throw-css',
    throws: [{ tok: toks(8, 3, 4)[0] as never, from: 'A', land: tok(8, 4) }],
    A: { card: 'OD7', at: { x: 3.8, height: 5.0 }, color: '#ff7a1a' },
    B: { card: 'BD2', at: { x: -3.8, height: 5.0 }, color: '#2f7bff' },
    pose: cam.pose,
    size: 120,
  });
  const inSplit = framingAt(FRAMINGS, t) === 'split';
  const bursts = [BLUE_BURST, ORANGE_BURST];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={cam.pose}>
        <SetPlate t={t} grade={setGrade} />
        <Field t={t} grade={setGrade} layer="back" density={0.75} hueMix={0.5} bursts={bursts} />
        {blue && <Card id={blue.card} t={t} grade={blueGrade} {...blue.at} dx={inSplit ? throwRecoil(throwP, 'B', t) : 0} rimDir={[1, 0.25]} />}
        {orange && <Card id={orange.card} t={t} grade={ORANGE_DISCO} {...orange.at} rimDir={[-1, 0.25]} lit={intruder ? 0.45 : 1} />}
        <Field t={t} grade={setGrade} layer="front" density={0.6} hueMix={0.5} bursts={bursts} />
      </Stage>
      <Svg>
        <FormDefs />
        <Scribble spec={{ id: 'v-kick', card: GIRL.B.kick, at: { x: -4.4, height: 4.6 }, t0: KICK.kick + 0.05, draw: 0.3, t1: at('framing-v1-waist'), color: '#19c8ff', stars: 3 }} t={t} pose={cam.pose} />
        {inSplit && <ThrowWords plan={throwP} t={t} />}
        <g transform={plane.transform}>
          {/* V1 line 2: the STACK and the `git branch` sign */}
          <Stack spec={STACK2} t={t} hide={[1, ...(morphOn ? [7] : [])]} />
          <KickWord plan={KICK} t={t} />
          {t < tok(3, 0) && (
            <NeonSign t={t} x={1080} y={660} size={58} title="$ git branch" rows={[
              { text: '  feature', color: '#ff9a4a', on: tok(2, 0), dim: true },
              { text: '* main', color: '#19c8ff', on: tok(2, 3) },
              { text: '  stable', color: '#8fd8ff', on: tok(2, 5), dim: true },
            ]} />
          )}
          <LetterMorph plan={MORPH_LINE} t={t} />
          {/* V1 line 3: the line-42 sign */}
          <Lyric spec={{ id: 'l3', tokens: toks(3), key: 5, singer: 'B', ...LYRIC3, t1: tok(4, 0) }} t={t} />
          {t >= tok(3, 0) && t < tok(4, 0) && (
            <NeonSign t={t} x={720} y={560} size={68} title="button.css" rows={[
              { text: '41  .button {', color: '#8fd8ff', on: tok(3, 0), dim: true },
              { text: '42    color: blue;', color: '#19c8ff', on: tok(3, 5) },
              { text: '43  }', color: '#8fd8ff', on: tok(3, 0), dim: true },
            ]} />
          )}
          {/* V1 line 4: APPROVED stamps */}
          <StampForm spec={{ id: 'l4', line: 4, key: 2, singer: 'B', t0: tok(4, 0) - 0.05, t1: tok(5, 0), box: { x: 760, y: 200, w: 1060, h: 560 } }} t={t} />
          {/* V1 line 5: the push notification */}
          <Lyric spec={{ id: 'l5', tokens: toks(5), key: 4, singer: 'B', x: 720, y: 190, w: 1140, size: 109, t1: tok(6, 1) }} t={t} />
          {t < tok(6, 1) && <PushNote x={960} y={430} t={t} inAt={tok(5, 2)} clockAt={tok(5, 4)} whoAt={tok(5, 5)} revealAt={tok(5, 7)} />}
          {/* V2 line 6: git log --graph */}
          <Lyric spec={{ id: 'l6', tokens: toks(6), key: 1, singer: 'O', x: 110, y: 170, w: 1000, size: 140, t1: tok(7, 0) }} t={t} />
          {t >= tok(6, 0) && t < tok(7, 0) && <GitGraph x={360} y={300} t={t} splitAt={tok(6, 1)} labelAt={tok(6, 2)} commits={[tok(6, 4), tok(6, 7)]} />}
          {/* V2 line 7: the same line 42 as a diff */}
          <Lyric spec={{ id: 'l7', tokens: toks(7), key: 3, singer: 'O', x: 110, y: 170, w: 1040, size: 140, t1: tok(8, 0) }} t={t} />
          {t >= tok(7, 0) && t < tok(8, 0) && (
            <NeonSign t={t} x={110} y={560} size={70} title="git diff button.css" border="#ff9a4a" rows={[
              { text: '42 - color: blue;', color: '#5f9bff', on: tok(7, 0), strike: tok(7, 3) },
              { text: '42 + color: orange;', color: '#ff7a1a', on: tok(7, 3) },
            ]} />
          )}
          {/* V2 line 8: kinetic type over the throw */}
          <Lyric spec={{ id: 'l8', tokens: toks(8), key: 3, singer: 'O', x: 260, y: 150, w: 1400, size: 123, t1: tok(9, 0) }} t={t} />
          {/* V2 line 9: the racing commit counter */}
          <Lyric spec={{ id: 'l9', tokens: toks(9), key: 2, singer: 'O', x: 110, y: 170, w: 1100, size: 134, t1: tok(10, 0) }} t={t} />
          {t >= tok(9, 0) && <Counter spec={{ from: 0, to: 300, t0: tok(9, 0), t1: tok(9, 7), x: 640, y: 720, size: 260, color: '#ff7a1a', digits: 3 }} t={t} />}
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
