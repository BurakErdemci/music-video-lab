// Verse 1 to 20 s (scene-map.md, the Reviewed Stage): the blue girl alone in cyan/blue with an orange rim;
// B03 gathers out of the "head" burst, then B03 -> B01 on "blue" and back on "Reviewed"; the mirror tiles
// align on "stable" and sweep on "clean"; "line forty-two" lights a "LINE 42" plate; "approved by the whole
// design team" multiplies check stamps on the beats.
import { AbsoluteFill } from 'remotion';
import { Card } from '../cards/Card.tsx';
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
import { alignAt, fieldClock, HEAD_BURST, SCRIBBLE_B03_FROM, VERSE_B, VERSE_CAM, VERSE_DISSOLVES, VERSE_SPOT } from './proof.ts';

const G = GRADES.reviewed;
const RIM: [number, number] = [1, 0.25];

const MAIN: LightBoxSpec = { id: 'sign-main', words: [{ text: 'HEAD', color: BLUE }, { text: '->', color: '#ffffff' }, { text: 'main', color: CYAN }], t0: at('sign-main'), stagger: 0.03, t1: at('plate-42'), x: 330, y: 1010, size: 40, face: 'mono', box: true, pre: 0 };
const PLATE_42: LightBoxSpec = { id: 'plate-42', words: [{ text: 'LINE', color: CYAN }, { text: '42', color: '#ffd23a' }], t0: at('plate-42'), stagger: 0.05, t1: at('swap-b03'), x: 1440, y: 700, size: 250, box: true, pre: 0 };
const STAMPS: StampSpec = {
  id: 'approved',
  label: 'APPROVED',
  times: [at('stamp-1'), at('stamp-2'), at('stamp-3'), at('stamp-4'), at('stamp-5'), at('stamp-6')],
  slots: [[1250, 470], [1640, 470], [1250, 640], [1640, 640], [1250, 810], [1640, 810]],
  size: 62,
  color: CYAN,
  t1: beat(52),
};

/** Which pose card shows, and how much, at t: the dissolve plans hand the girl from card to card. */
const poses = (t: number): { card: string; opacity: number }[] => {
  const [d0, d1, d2] = VERSE_DISSOLVES;
  const s0 = dissolveState(d0, t);
  const s1 = dissolveState(d1, t);
  const s2 = dissolveState(d2, t);
  if (t < d1.t0) return [{ card: 'B03', opacity: s0.toOpacity }];
  if (t < d2.t0) return [{ card: 'B03', opacity: s1.fromOpacity }, { card: 'B01', opacity: s1.toOpacity }];
  return [{ card: 'B01', opacity: s2.fromOpacity }, { card: 'B03', opacity: s2.toOpacity }];
};

export const Verse1 = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const pose = VERSE_CAM(t);
  const spot = spotAt(VERSE_SPOT, t);
  const ft = fieldClock(t);
  const hit = 1 + 0.06 * (1 - ramp(t, at('plate-42-hit'), 6 / 60)) * (t >= at('plate-42-hit') ? 1 : 0);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        <SetPlate t={t} grade={G} align={alignAt(t)} />
        <Field t={ft} grade={G} layer="back" density={0.75} hueMix={0.5} bursts={[HEAD_BURST]} />
        <Spotlight plan={VERSE_SPOT} t={t} tint="#eaf6ff" />
        {poses(t).map((p) => (
          <Card key={p.card} id={p.card} t={t} grade={G} {...VERSE_B} opacity={p.opacity} lit={litAt(spot, VERSE_B.x)} rimDir={RIM} />
        ))}
        {VERSE_DISSOLVES.map((d) => <Dissolve key={d.id} plan={d} t={t} grade={G} rival={ORANGE} />)}
        <Field t={ft} grade={G} layer="front" density={0.6} hueMix={0.5} bursts={[HEAD_BURST]} />
      </Stage>
      <Svg>
        <LightBox spec={MAIN} t={t} />
        <g transform={`translate(1440 600) scale(${hit}) translate(-1440 -600)`}>
          <LightBox spec={PLATE_42} t={t} />
        </g>
        <Scribble spec={{ id: 'scr-b01', card: 'B01', at: VERSE_B, t0: at('scribble-b01'), draw: 0.55, t1: at('swap-b03'), color: BLUE, stars: 4 }} t={t} pose={pose} />
        <Scribble spec={{ id: 'scr-b03', card: 'B03', at: VERSE_B, t0: SCRIBBLE_B03_FROM, draw: 0.5, t1: beat(53), color: CYAN, stars: 3 }} t={t} pose={pose} />
        <Stamp spec={STAMPS} t={t} />
      </Svg>
    </AbsoluteFill>
  );
};
