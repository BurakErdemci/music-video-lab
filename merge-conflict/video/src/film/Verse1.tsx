// Verse 1 to 20 s (scene-map.md, the Reviewed Stage): the blue girl alone in cyan/blue with an orange rim,
// dancing on the beat grid. B03 gathers out of the "head" burst, then a new pose every 2 bars on the
// downbeat through a smear (B04, B07, B02); the mirror tiles align on "stable" and sweep on "clean";
// "line forty-two" lights a "LINE 42" plate; "approved by the whole design team" multiplies check stamps.
import { AbsoluteFill } from 'remotion';
import { Card } from '../cards/Card.tsx';
import { poseTrack, SmearStreaks, smearSpan } from '../cards/smear.tsx';
import { at } from '../events.ts';
import { BLUE, CYAN, GRADES, ORANGE } from '../grade/grade.ts';
import { ramp } from '../lib/ease.ts';
import { litAt, spotAt, Spotlight } from '../light/spotlight.tsx';
import { Dissolve, dissolveState } from '../particles/dissolve.tsx';
import { Field } from '../particles/field.tsx';
import { Scribble } from '../scribble/Scribble.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { beat, sec } from '../timing.ts';
import { LightBox, type LightBoxSpec } from '../type/LightBox.tsx';
import { Stamp, type StampSpec } from '../type/Stamp.tsx';
import { Svg } from '../type/Svg.tsx';
import { alignAt, fieldClock, HEAD_BURST, SCRIBBLE_B07_FROM, VERSE_B, VERSE_CAM, VERSE_FIRST, VERSE_GATHER, VERSE_SMEARS, VERSE_SPOT } from './proof.ts';

const G = GRADES.reviewed;
const RIM: [number, number] = [1, 0.25];

const MAIN: LightBoxSpec = { id: 'sign-main', words: [{ text: 'HEAD', color: BLUE }, { text: '->', color: '#ffffff' }, { text: 'main', color: CYAN }], t0: at('sign-main'), stagger: 0.03, t1: at('plate-42'), x: 330, y: 1010, size: 40, face: 'mono', box: true, pre: 0 };
const PLATE_42: LightBoxSpec = { id: 'plate-42', words: [{ text: 'LINE', color: CYAN }, { text: '42', color: '#ffd23a' }], t0: at('plate-42'), stagger: 0.05, t1: at('cam-pull-2'), x: 1440, y: 760, size: 230, box: true, pre: 0 };
const STAMPS: StampSpec = {
  id: 'approved',
  label: 'APPROVED',
  times: [at('stamp-1'), at('stamp-2'), at('stamp-3'), at('stamp-4'), at('stamp-5'), at('stamp-6')],
  slots: [[1250, 560], [1640, 560], [1250, 720], [1640, 720], [1250, 880], [1640, 880]],
  size: 58,
  color: CYAN,
  t1: beat(52),
};

export const Verse1 = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const pose = VERSE_CAM(t);
  const spot = spotAt(VERSE_SPOT, t);
  const ft = fieldClock(t);
  const hit = 1 + 0.06 * (1 - ramp(t, at('plate-42-hit'), 6 / 60)) * (t >= at('plate-42-hit') ? 1 : 0);
  const gather = dissolveState(VERSE_GATHER, t);
  const draws = poseTrack(VERSE_FIRST, VERSE_SMEARS, t, VERSE_B.height).map((d) => ({ ...d, opacity: d.opacity * gather.toOpacity }));
  const b07In = smearSpan(VERSE_SMEARS[1])[0];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        <SetPlate t={t} grade={G} align={alignAt(t)} />
        <Field t={ft} grade={G} layer="back" density={0.75} hueMix={0.5} bursts={[HEAD_BURST]} />
        <Spotlight plan={VERSE_SPOT} t={t} tint="#eaf6ff" />
        {draws.map((d, i) => (
          <Card key={`${d.card}-${i}`} id={d.card} t={t} grade={G} {...VERSE_B} dx={d.dx} stretch={d.stretch} opacity={d.opacity} lit={litAt(spot, VERSE_B.x)} rimDir={RIM} />
        ))}
        <Dissolve plan={VERSE_GATHER} t={t} grade={G} rival={ORANGE} />
        <Field t={ft} grade={G} layer="front" density={0.6} hueMix={0.5} bursts={[HEAD_BURST]} />
      </Stage>
      <Svg>
        <LightBox spec={MAIN} t={t} />
        <g transform={`translate(1440 680) scale(${hit}) translate(-1440 -680)`}>
          <LightBox spec={PLATE_42} t={t} />
        </g>
        <Scribble spec={{ id: 'scr-b04', card: 'B04', at: VERSE_B, t0: at('scribble-b04'), draw: 0.55, t1: b07In, color: BLUE, stars: 4 }} t={t} pose={pose} />
        <Scribble spec={{ id: 'scr-b07', card: 'B07', at: VERSE_B, t0: SCRIBBLE_B07_FROM, draw: 0.5, t1: smearSpan(VERSE_SMEARS[2])[0], color: CYAN, stars: 3 }} t={t} pose={pose} />
        <SmearStreaks smears={VERSE_SMEARS} t={t} at={VERSE_B} pose={pose} color={CYAN} />
        <Stamp spec={STAMPS} t={t} />
      </Svg>
    </AbsoluteFill>
  );
};
