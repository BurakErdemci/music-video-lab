// Intro 0-10.05 s (scene-map.md): black; the spotlight snaps on an empty particle floor; the light-box rig
// flickers the conflict markers and "LINE 42"; on the riff the confetti bursts and the stage turns
// magenta; the orange girl drops in on one downbeat, the blue girl on the next; neon scribbles trace them.
import { AbsoluteFill } from 'remotion';
import { Card } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { BLUE, CYAN, GRADES, MAGENTA, ORANGE } from '../grade/grade.ts';
import { litAt, spotAt, Spotlight } from '../light/spotlight.tsx';
import { Field } from '../particles/field.tsx';
import { Scribble } from '../scribble/Scribble.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { LightBox, type LightBoxSpec } from '../type/LightBox.tsx';
import { Svg } from '../type/Svg.tsx';
import { dropDy, dropVisible, fieldClock, INTRO_B, INTRO_CAM, INTRO_CARD, INTRO_O, INTRO_SPOT, RIFF_BURST } from './proof.ts';

const SIGNS: LightBoxSpec[] = [
  { id: 'sign-head', words: [{ text: '<<<<<<<', color: CYAN }, { text: 'HEAD', color: BLUE }], t0: at('sign-head'), stagger: 0.035, x: 360, y: 92, size: 50, face: 'mono', box: true },
  { id: 'sign-sep', words: [{ text: '=======', color: MAGENTA }], t0: at('sign-sep'), stagger: 0.035, x: 960, y: 92, size: 50, face: 'mono', box: true },
  { id: 'sign-feature', words: [{ text: '>>>>>>>', color: ORANGE }, { text: 'feature', color: '#ffd23a' }], t0: at('sign-feature'), stagger: 0.035, x: 1560, y: 92, size: 50, face: 'mono', box: true },
  { id: 'sign-42', words: [{ text: 'LINE', color: MAGENTA }, { text: '42', color: '#ffd23a' }], t0: at('sign-42'), stagger: 0.07, t1: at('drop-orange') - 0.3, x: 960, y: 640, size: 230, box: true },
];

export const Intro = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const lit = t >= at('riff-burst');
  const grade = lit ? GRADES.mainline : GRADES.black;
  const pose = INTRO_CAM(t);
  const spot = spotAt(INTRO_SPOT, t);
  const ft = fieldClock(t);
  const oLand = at('drop-orange');
  const bLand = at('drop-blue');
  const girls = [
    { card: INTRO_CARD.O, at: INTRO_O, land: oLand, rim: [1, 0.3] as [number, number] },
    { card: INTRO_CARD.B, at: INTRO_B, land: bLand, rim: [-1, 0.3] as [number, number] },
  ];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        <SetPlate t={t} grade={grade} dust={lit ? 0 : 0.35} />
        <Field t={ft} grade={grade} layer="back" density={lit ? 1 : 0.18} alpha={lit ? 1 : 0.5} hueMix={0.25} bursts={[RIFF_BURST]} />
        <Spotlight plan={INTRO_SPOT} t={t} />
        {girls.map((g) => (
          <Card key={g.card} id={g.card} t={t} grade={grade} {...g.at} dy={dropVisible(t, g.land) ? Math.max(0, dropDy(t, g.land)) : 0} opacity={dropVisible(t, g.land) ? 1 : 0} lit={litAt(spot, g.at.x)} rimDir={g.rim} />
        ))}
        <Field t={ft} grade={grade} layer="front" density={lit ? 1 : 0.1} alpha={lit ? 1 : 0.4} hueMix={0.25} bursts={[RIFF_BURST]} />
      </Stage>
      <Svg>
        {SIGNS.map((s) => <LightBox key={s.id} spec={s} t={t} />)}
        <Scribble spec={{ id: 'scr-o', card: INTRO_CARD.O, at: INTRO_O, t0: at('scribble-orange'), draw: 0.5, t1: at('eye-split'), color: ORANGE, stars: 3 }} t={t} pose={pose} />
        <Scribble spec={{ id: 'scr-b', card: INTRO_CARD.B, at: INTRO_B, t0: at('scribble-blue'), draw: 0.45, t1: at('eye-split'), color: BLUE, stars: 3 }} t={t} pose={pose} />
      </Svg>
    </AbsoluteFill>
  );
};
