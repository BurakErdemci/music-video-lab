// intro_groove 4.37-16.33 s: ALL METAL (scene-map.md 23d272a): the metal set (no mirror ball, no checker floor,
// no confetti: steel plates, red rays, smoke, embers), metal type only, and blue is not shown (girls/costume.ts).
// Its life comes from the type, orange's backlit metal silhouettes, the light and the cuts:
//  4.37   stage: an orange silhouette at the side; the conflict markers slam one per downbeat, big, centred
//  7.02   clones: five silhouettes in a row; OURS slams
//  9.35   a dive through the O of OURS into THEIRS (low angle)
//  12.34  tiny silhouette behind the MERGE CONFLICT logo (LOGO_DESIGN), which shoves on the beat and re-seeds its
//         split edge every beat
//  14.33  waist-up silhouette behind the logo
// plus a metal hit (brush slashes) on every second beat.
import { AbsoluteFill } from 'remotion';
import { HOME } from '../camera/camera.ts';
import { Card } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { framingAt } from '../girls/framing.ts';
import { framing, waistUp } from '../girls/staging.tsx';
import { GRADES, type Grade, metalGrade } from '../grade/grade.ts';
import { type Hex, outQuad } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { Field } from '../particles/field.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { beatIndexAt, beatPos, downbeat, sec } from '../timing.ts';
import { FormDefs } from '../type/forms/common.tsx';
import { Flap } from '../type/forms/Letters.tsx';
import { LightBox, type LightBoxSpec } from '../type/LightBox.tsx';
import { MergeConflictLogo } from '../type/logo/Logo.tsx';
import { Slam } from '../type/Slam.tsx';
import { Svg } from '../type/Svg.tsx';
import { ThroughCounter, TypeWhip } from '../type/transitions/transitions.tsx';
import { COUNTER_DIVE, FRAMINGS, GROOVE_CARDS, GROOVE_HITS, GROOVE_O, LINE1, LOGO_DESIGN, OURS, WHIP_GROOVE } from './proof.ts';

const RED: Hex = '#e01b1b';
const STEEL: Hex = '#c8ced6';
/** Orange in the groove: a metal silhouette glimpse, flat black with a hot backlit rim (no costume detail). */
const SILHOUETTE = { flat: { color: '#050208' as Hex, mix: 0.97 }, rival: '#ff3a1a' as Hex };
const silGrade = (g: Grade): Grade => ({ ...g, rim: 1.9 });
const MARKER_SIZE = 120;
const MARKERS: LightBoxSpec[] = [
  { id: 'm-head', words: [{ text: '<<<<<<<', color: STEEL }, { text: 'HEAD', color: '#8fb2ff' }], t0: at('marker-head'), stagger: 0.03, t1: at('slam-ours'), x: 960, y: 330, size: MARKER_SIZE, face: 'mono', box: true, slam: true, pre: 0 },
  { id: 'm-sep', words: [{ text: '=======', color: RED }], t0: at('marker-sep'), stagger: 0.03, t1: at('slam-ours'), x: 960, y: 530, size: MARKER_SIZE, face: 'mono', box: true, slam: true, pre: 0 },
  { id: 'm-feature', words: [{ text: '>>>>>>>', color: STEEL }, { text: 'feature', color: '#ff6a10' }], t0: at('marker-feature'), stagger: 0.03, t1: at('slam-ours'), x: 960, y: 730, size: MARKER_SIZE, face: 'mono', box: true, slam: true, pre: 0 },
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
        return (
          <g key={k} transform={`translate(${960 + r.range(-200, 200)} ${y}) rotate(${ang})`}>
            <polygon points={`${-w / 2},${-th / 2} ${w / 2},${-th * 0.15} ${w / 2 - 40},${th * 0.15} ${-w / 2 + 30},${th / 2}`} fill={k ? STEEL : RED} />
          </g>
        );
      })}
    </g>
  );
};

/** The logo moment: one call site, LOGO_DESIGN decides the lockup. It lands with a slam, shoves on every beat
 *  and its split edge re-seeds on every beat. */
export const GrooveLogo = ({ t }: { t: number }) => {
  const t0 = at('logo-in');
  if (t < t0) return null;
  const land = 1.35 - 0.35 * outQuad((t - t0) / (8 / 60));
  const bp = beatPos(t);
  return (
    <g transform={`translate(960 520) scale(${land}) translate(-960 -520)`}>
      <MergeConflictLogo id="groove-logo" design={LOGO_DESIGN} resolved={false} cx={960} cy={520} width={1640} beat={bp - Math.floor(bp)} beatIndex={beatIndexAt(t)} />
    </g>
  );
};

export const Groove = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const grade = metalGrade(GRADES.mainline, 1);
  const sil = silGrade(grade);
  const kind = framingAt(FRAMINGS, t);
  const C = GROOVE_CARDS;
  let cards;
  if (kind === 'stage') cards = <Card id={C.stage} t={t} grade={sil} {...GROOVE_O} rimDir={[-1, 0.3]} {...SILHOUETTE} />;
  else if (kind === 'clones')
    cards = [-2, -1, 0, 1, 2].map((k) => (
      <Card key={k} id={C.clones} t={t + k * 0.13} grade={sil} x={k * 3.1} height={4.6 - Math.abs(k) * 0.45} z={-Math.abs(k) * 0.6} flip={k % 2 !== 0} rimDir={[k < 0 ? 1 : -1, 0.3]} {...SILHOUETTE} />
    ));
  else if (kind === 'low') cards = <Card id={C.low} t={t} grade={sil} x={2.6} height={4.4} {...SILHOUETTE} />;
  else if (kind === 'tiny') cards = <Card id={C.tiny} t={t} grade={sil} x={0} height={2.6} {...SILHOUETTE} />;
  else cards = <Card id={C.waist} t={t} grade={sil} {...waistUp(3.2, 13)} {...SILHOUETTE} />;
  const lowGirl = { full: C.low, close: C.low, color: RED };
  const pose = kind === 'low' ? framing('low', t, lowGirl, lowGirl).pose : HOME;
  const oursT = at('slam-ours');
  const theirsT = at('slam-theirs');
  const typeLayer = (
    <g>
      {MARKERS.map((s) => <LightBox key={s.id} spec={s} t={t} />)}
      <ThroughCounter
        plan={COUNTER_DIVE}
        t={t}
        from={<Slam spec={{ text: OURS.text, t0: oursT, t1: theirsT + 1, x: 960, y: OURS.y - OURS.size * 0.43, size: OURS.size, color: STEEL, face: 'metalmania' }} t={t} />}
        to={<Slam spec={{ text: 'THEIRS', t0: theirsT, t1: at('logo-in') - 0.05, x: 960, y: 540, size: 360, color: RED, face: 'metalmania', rot: -3 }} t={t} />}
      />
      <GrooveLogo t={t} />
    </g>
  );
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        <SetPlate t={t} grade={grade} metal />
        <Field t={t} grade={grade} layer="back" density={0.9} hueMix={0.5} metal={1} bursts={[{ t: downbeat(3), origin: [0, -2.6, 0.5] }]} />
        {cards}
        <Field t={t} grade={grade} layer="front" density={0.8} hueMix={0.5} metal={1} />
      </Stage>
      <Svg>
        <FormDefs />
        <Slashes t={t} />
        <TypeWhip plan={WHIP_GROOVE} t={t} color={RED} from={<Flap spec={{ ...LINE1, t1: Infinity }} t={t} cols={13} />} to={typeLayer} />
      </Svg>
    </AbsoluteFill>
  );
};
