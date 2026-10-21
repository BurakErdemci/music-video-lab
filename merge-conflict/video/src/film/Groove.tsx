// intro_groove 4.37-16.33 s: HARD METAL by Burak's ear (metal/metal.ts EAR_OVERRIDES). Both girls in their
// metal forms (temporary front-view cards until the metal pose cards land), introduced through framings that
// change every 2 bars (stage with focus ping-pong, clones, split, low, tiny), a metal hit (brush slashes) on
// every second beat, the conflict markers slamming on the first three downbeats, MERGE and CONFLICT slamming
// in a jagged face; the groove ends by diving through the O of CONFLICT into verse 1.
import { AbsoluteFill } from 'remotion';
import { HOME } from '../camera/camera.ts';
import { Card } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { framingAt } from '../girls/framing.ts';
import { focusAt, focusLook, framing, type Girl } from '../girls/staging.tsx';
import { GRADES, metalGrade } from '../grade/grade.ts';
import type { Hex } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { metalAt } from '../metal/metal.ts';
import { Field } from '../particles/field.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { downbeat, sec } from '../timing.ts';
import { FormDefs } from '../type/forms/common.tsx';
import { Flap } from '../type/forms/Letters.tsx';
import { LightBox, type LightBoxSpec } from '../type/LightBox.tsx';
import { Slam } from '../type/Slam.tsx';
import { Svg } from '../type/Svg.tsx';
import { ThroughCounter, TypeWhip } from '../type/transitions/transitions.tsx';
import { CONFLICT, COUNTER_DIVE, FOCUS, FRAMINGS, GIRL, GROOVE, GROOVE_B, GROOVE_HITS, GROOVE_O, LINE1, MERGE, WHIP_GROOVE } from './proof.ts';

const RED: Hex = '#e01b1b';
const STEEL: Hex = '#c8ced6';
const ORANGE_M: Girl = { full: GIRL.O.metal, close: GIRL.O.metal, color: '#ff4a1a' };
const BLUE_M: Girl = { full: GIRL.B.metal, close: GIRL.B.metal, color: '#4a7bff' };

const MARKERS: LightBoxSpec[] = [
  { id: 'm-head', words: [{ text: '<<<<<<<', color: STEEL }, { text: 'HEAD', color: '#4a7bff' }], t0: at('marker-head'), stagger: 0.03, x: 360, y: 92, size: 50, face: 'mono', box: true, slam: true, pre: 0 },
  { id: 'm-sep', words: [{ text: '=======', color: RED }], t0: at('marker-sep'), stagger: 0.03, x: 960, y: 92, size: 50, face: 'mono', box: true, slam: true, pre: 0 },
  { id: 'm-feature', words: [{ text: '>>>>>>>', color: STEEL }, { text: 'feature', color: '#ff4a1a' }], t0: at('marker-feature'), stagger: 0.03, x: 1560, y: 92, size: 50, face: 'mono', box: true, slam: true, pre: 0 },
];

/** A metal hit: two diagonal brush slashes across the frame for 10 frames, re-seeded per hit. */
const Slashes = ({ t }: { t: number }) => {
  const h = [...GROOVE_HITS].reverse().find((x) => t >= x);
  if (h === undefined || t >= h + 10 / 60) return null;
  const u = (t - h) * 6;
  const r = seeded(`slash:${h.toFixed(3)}`);
  return (
    <g opacity={1 - u}>
      {[0, 1].map((k) => {
        const y = r.range(220, 860);
        const ang = r.range(-24, -10);
        const w = r.range(1300, 2100) * Math.min(1, u * 3 + 0.3);
        const th = r.range(26, 70);
        const c = k ? STEEL : RED;
        return (
          <g key={k} transform={`translate(${960 + r.range(-200, 200)} ${y}) rotate(${ang})`}>
            <polygon points={`${-w / 2},${-th / 2} ${w / 2},${-th * 0.15} ${w / 2 - 40},${th * 0.15} ${-w / 2 + 30},${th / 2}`} fill={c} />
          </g>
        );
      })}
    </g>
  );
};

export const Groove = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const m = metalAt(t);
  const grade = metalGrade(GRADES.mainline, m);
  const kind = framingAt(FRAMINGS, t);
  let cards;
  if (kind === 'stage') {
    const w = focusAt(FOCUS, t);
    const o = focusLook(w);
    const b = focusLook(1 - w);
    cards = (
      <>
        <Card id={GIRL.O.metal} t={t} grade={grade} {...GROOVE_O} height={GROOVE_O.height * o.scale} soft={o.soft * 0.6} lit={o.lit} rimDir={[1, 0.3]} />
        <Card id={GIRL.B.metal} t={t} grade={grade} {...GROOVE_B} height={GROOVE_B.height * b.scale} soft={b.soft * 0.6} lit={b.lit} rimDir={[-1, 0.3]} />
      </>
    );
  } else {
    const lead = kind === 'clones' ? ORANGE_M : BLUE_M;
    const other = lead === ORANGE_M ? BLUE_M : ORANGE_M;
    const f = framing(kind, t, kind === 'split' ? ORANGE_M : lead, kind === 'split' ? BLUE_M : other);
    cards = f.cards.map(({ key, ...c }) => <Card key={key} grade={grade} {...c} />);
  }
  const pose = kind === 'low' ? framing('low', t, BLUE_M, ORANGE_M).pose : HOME;
  const mergeT = at('slam-merge');
  const conflictT = at('slam-conflict');
  const typeLayer = (
    <g>
      {MARKERS.map((s) => <LightBox key={s.id} spec={s} t={t} />)}
      <Slam spec={{ text: MERGE.text, t0: mergeT, t1: conflictT - 0.05, x: 960, y: 560, size: MERGE.size, color: STEEL, face: 'metalmania', rot: -4 }} t={t} />
      {t >= conflictT && (
        <ThroughCounter
          plan={COUNTER_DIVE}
          t={t}
          from={<Slam spec={{ text: CONFLICT.text, t0: conflictT, t1: GROOVE.end + 1, x: 960, y: CONFLICT.y - CONFLICT.size * 0.43, size: CONFLICT.size, color: RED, face: 'metalmania', anchor: 'middle' }} t={t} />}
          to={null}
        />
      )}
    </g>
  );
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        <SetPlate t={t} grade={grade} split={kind === 'split' ? '#1a2f80' : undefined} />
        <Field t={t} grade={grade} layer="back" density={0.9} hueMix={0.5} metal={m} bursts={[{ t: downbeat(3), origin: [0, -2.6, 0.5] }]} />
        {cards}
        <Field t={t} grade={grade} layer="front" density={0.8} hueMix={0.5} metal={m} />
      </Stage>
      <Svg>
        <FormDefs />
        <Slashes t={t} />
        <TypeWhip plan={WHIP_GROOVE} t={t} color={RED} from={<Flap spec={{ ...LINE1, t1: Infinity }} t={t} cols={13} />} to={typeLayer} />
      </Svg>
    </AbsoluteFill>
  );
};
