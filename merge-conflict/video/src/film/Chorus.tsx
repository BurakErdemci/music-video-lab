// Pre-chorus and chorus 1 (38.40-64.15 s, round 5).
//  Pre: "Blue! / Orange! / Blue!" ping-pong close-ups with hue flips that keep luminance; orange crouches on the
//    second "Blue!" and transforms into her METAL form on "ORANGE!" (hard cut, burst, camera punch, the right half
//    of the set turns metal, metal type family for her from here); "Somebody resolve this!" both.
//  Chorus: the split stage (disco left with the mirror ball, steel right). The editor's conflict buttons are props
//    on the floor: "Accept Current Change" a lit disco floor tile, "Accept Incoming Change" a steel plaque,
//    "Accept Both Changes" dark. Blue stomps hers on "current", orange's "(NO!)" slams as a stamp; orange stomps
//    hers on "incoming", blue's "(NO!)"; "(NEVER!)" in the second half. "the build is on fire": flames along the
//    floor. "Merge conflict, merge conflict": logo B's signature move, the SAME move both times. "Equals, equals,
//    equals": the ======= divider filling the frame.
import { AbsoluteFill } from 'remotion';
import { typePlane } from '../camera/camera.ts';
import { Card } from '../cards/Card.tsx';
import { framingAt } from '../girls/framing.ts';
import { GRADES, type Grade, METAL_GRADE, metalGrade } from '../grade/grade.ts';
import type { Hex } from '../lib/ease.ts';
import { Field } from '../particles/field.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { FormDefs } from '../type/forms/common.tsx';
import { ConflictButtons, Divider, Flames, Lyric, LogoMove, StampWord } from '../type/objects/git.tsx';
import { Slam } from '../type/Slam.tsx';
import { Svg } from '../type/Svg.tsx';
import { BLUE_CHORUS, CHORUS, ORANGE_CHORUS, poseAt, tok, toks } from './act.ts';
import { cameraAt, FRAMINGS, LOGO_DESIGN, METAL_BURST } from './proof.ts';

const BLUE_SET: Grade = { ...GRADES.reviewed, amount: 0.46 };
const ORANGE_SET: Grade = { hue: '#ff6a10', rival: '#2f7bff', amount: 0.42, rim: 1.3, stage: 1 };
const ORANGE_METAL: Grade = metalGrade(GRADES.mainline, 1);

/** The pre-chorus hue flips: the whole set takes the shouter's colour (hue, not brightness). */
const preGrade = (t: number): Grade => (t < tok(11, 0) ? BLUE_SET : t < tok(12, 0) ? ORANGE_SET : t < tok(13, 0) ? BLUE_SET : METAL_GRADE);

const BUTTONS = (t: number, current: number, incoming: number) => (
  <ConflictButtons t={t} x={120} y={790} w={1680} buttons={[
    { label: 'Accept Current Change', style: 'disco', press: current },
    { label: 'Accept Incoming Change', style: 'steel', press: incoming },
    { label: 'Accept Both Changes', style: 'dim' },
  ]} />
);

export const Chorus = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const cam = cameraAt(t);
  const plane = typePlane(cam.pose, cam.base, cam.typeZ);
  const transformed = t >= tok(13, 0);
  const inChorus = t >= CHORUS.start;
  const set = inChorus || transformed ? { ...BLUE_SET, stage: 1 } : preGrade(t);
  const splitWall: Hex | undefined = transformed ? '#c81414' : undefined;
  const blue = poseAt(BLUE_CHORUS, t);
  const orange = poseAt(ORANGE_CHORUS, t);
  const kind = framingAt(FRAMINGS, t);
  const metalSet = transformed && kind === 'knee';
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={cam.pose}>
        <SetPlate t={t} grade={metalSet ? METAL_GRADE : set} split={metalSet ? undefined : splitWall} metal={metalSet} metalRight={transformed && !metalSet} wallOnly={kind === 'face'} />
        <Field t={t} grade={set} layer="back" density={0.8} hueMix={0.5} metal={transformed ? 0.5 : 0} bursts={[METAL_BURST]} />
        {blue && <Card id={blue.card} t={t} grade={BLUE_SET} {...blue.at} rimDir={[1, 0.25]} />}
        {orange && <Card id={orange.card} t={t} grade={transformed ? ORANGE_METAL : ORANGE_SET} {...orange.at} rimDir={[-1, 0.25]} />}
        <Field t={t} grade={set} layer="front" density={0.6} hueMix={0.5} metal={transformed ? 0.5 : 0} bursts={[METAL_BURST]} />
      </Stage>
      <Svg>
        <FormDefs />
        <g transform={plane.transform}>
          {/* pre-chorus: the shouted names */}
          <Slam spec={{ text: 'BLUE!', t0: tok(10, 0), t1: tok(11, 0) - 0.02, x: 1300, y: 540, size: 300, color: '#19c8ff', face: 'bungee' }} t={t} />
          <Slam spec={{ text: 'ORANGE!', t0: tok(11, 0), t1: tok(12, 0) - 0.02, x: 620, y: 540, size: 260, color: '#ff7a1a', face: 'bungee' }} t={t} />
          <Slam spec={{ text: 'BLUE!', t0: tok(12, 0), t1: tok(13, 0) - 0.02, x: 1350, y: 300, size: 220, color: '#19c8ff', face: 'bungee', rot: -4 }} t={t} />
          <Slam spec={{ text: 'ORANGE!', t0: tok(13, 0), t1: tok(14, 0) - 0.02, x: 760, y: 470, size: 330, color: '#ff2a1a', face: 'metalmania', rot: -4 }} t={t} />
          <Lyric spec={{ id: 'l14', tokens: toks(14), key: 1, singer: 'both', x: 330, y: 260, w: 1260, size: 168, t1: CHORUS.start }} t={t} />
          {/* chorus, first half */}
          <Lyric spec={{ id: 'l15', tokens: toks(15, 0, 3), key: 1, singer: 'B', x: 160, y: 190, w: 1600, size: 146, t1: tok(16, 0) }} t={t} />
          <Lyric spec={{ id: 'l16', tokens: toks(16, 0, 3), key: 1, singer: 'O', x: 160, y: 190, w: 1600, size: 146, t1: tok(17, 0) }} t={t} />
          {t >= CHORUS.start && t < tok(17, 0) && BUTTONS(t, tok(15, 1), tok(16, 1))}
          <StampWord text="(NO!)" at={tok(15, 3)} x={1320} y={480} size={150} singer="O" t={t} until={tok(16, 0)} />
          <StampWord text="(NO!)" at={tok(16, 3)} x={620} y={480} size={150} singer="B" t={t} until={tok(17, 0)} rot={7} />
          <Lyric spec={{ id: 'l17', tokens: toks(17), key: 8, singer: 'both', x: 160, y: 220, w: 1600, size: 154, t1: tok(18, 0) }} t={t} />
          {t < tok(18, 0) && <Flames t={t} from={tok(17, 5)} />}
          <LogoMove spec={{ slam: tok(18, 0), shove: tok(18, 2), lock: tok(18, 6), until: tok(19, 0) - 0.02 }} t={t} design={LOGO_DESIGN} />
          <Lyric spec={{ id: 'l18', tokens: toks(18, 4), key: 2, singer: 'both', x: 460, y: 960, w: 1100, size: 118, t1: tok(19, 0) }} t={t} />
          {/* chorus, second half */}
          <Lyric spec={{ id: 'l19', tokens: toks(19, 0, 3), key: 1, singer: 'B', x: 160, y: 190, w: 1600, size: 146, t1: tok(20, 0) }} t={t} />
          <Lyric spec={{ id: 'l20', tokens: toks(20, 0, 3), key: 1, singer: 'O', x: 160, y: 190, w: 1600, size: 146, t1: tok(21, 0) }} t={t} />
          {t >= tok(19, 0) - 0.3 && t < tok(21, 0) && BUTTONS(t, tok(19, 1), tok(20, 1))}
          <StampWord text="(NEVER!)" at={tok(19, 3)} x={1300} y={480} size={130} singer="O" t={t} until={tok(20, 0)} />
          <StampWord text="(NEVER!)" at={tok(20, 3)} x={640} y={480} size={130} singer="B" t={t} until={tok(21, 0)} rot={7} />
          <Divider t={t} hits={[tok(21, 0), tok(21, 1), tok(21, 2)]} until={tok(22, 0)} />
          <Lyric spec={{ id: 'l21', tokens: toks(21, 3), key: 2, singer: 'both', x: 420, y: 960, w: 1200, size: 118, t1: tok(22, 0) }} t={t} />
          <LogoMove spec={{ slam: tok(22, 0), shove: tok(22, 2), lock: tok(22, 6), until: CHORUS.end + 1 }} t={t} design={LOGO_DESIGN} />
          <Lyric spec={{ id: 'l22', tokens: toks(22, 4), key: 3, singer: 'both', x: 460, y: 960, w: 1100, size: 118, t1: CHORUS.end + 1 }} t={t} />
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
