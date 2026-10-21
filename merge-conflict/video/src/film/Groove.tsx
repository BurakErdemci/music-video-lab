// intro_groove 4.37-16.33 s: ALL METAL (scene-map.md 23d272a): the metal set, metal type only, blue not shown
// (girls/costume.ts). Round 3: no type state sits unchanged longer than one bar (gridcheck measures the events of
// kind 'type-change'):
//  bar 3  <<<<<<< HEAD slams (whip in)       bar 4  ======= slams      bar 5  >>>>>>> feature slams (clones)
//  bar 6  OURS slams, multiplies on beats 26 and 27, then a dive through its O
//  bar 7  THEIRS lands (low angle), multiplies on beat 31
//  bar 8  THEIRS splits and re-slams BEHIND the big backlit, dancing orange silhouette (knee-up)
//  bar 9  the MERGE CONFLICT logo (LOGO_DESIGN) slams; its split edge re-seeds every beat
//  bar 10 the halves shove apart and re-lock          bar 11 a scale punch (waist-up silhouette), a shove on beat 46
//  the logo whips out over the last 12 frames, so the verse downbeat is a clean cut.
// plus a metal hit (brush slashes) on every second beat.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { HOME } from '../camera/camera.ts';
import { Card } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { framingAt } from '../girls/framing.ts';
import { silhouetteD } from '../girls/silhouette.ts';
import { framing, waistUp } from '../girls/staging.tsx';
import { GRADES, type Grade, metalGrade } from '../grade/grade.ts';
import { clamp01, type Hex, outQuad } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { Field } from '../particles/field.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { beatIndexAt, beatLengthAt, beatPos, downbeat, sec } from '../timing.ts';
import { FormDefs } from '../type/forms/common.tsx';
import { Flap } from '../type/forms/Letters.tsx';
import { LightBox, type LightBoxSpec } from '../type/LightBox.tsx';
import { MergeConflictLogo } from '../type/logo/Logo.tsx';
import { Slam } from '../type/Slam.tsx';
import { Svg } from '../type/Svg.tsx';
import { ThroughCounter, TypeWhip } from '../type/transitions/transitions.tsx';
import { COUNTER_DIVE, FRAMINGS, GROOVE_BIG, GROOVE_CARDS, GROOVE_HITS, GROOVE_O, LINE1, LOGO_DESIGN, OURS, WHIP_GROOVE, WHIP_OUT } from './proof.ts';

const RED: Hex = '#e01b1b';
const STEEL: Hex = '#c8ced6';
/** Orange in the groove: a metal silhouette, flat black with a hot backlit rim (no costume detail). */
const SILHOUETTE = { flat: { color: '#050208' as Hex, mix: 0.97 }, rival: '#ff3a1a' as Hex };
const silGrade = (g: Grade, rim = 1.9): Grade => ({ ...g, rim });
const MARKER_SIZE = 120;
const MARKERS: LightBoxSpec[] = [
  { id: 'm-head', words: [{ text: '<<<<<<<', color: STEEL }, { text: 'HEAD', color: '#8fb2ff' }], t0: at('marker-head'), stagger: 0.03, t1: at('slam-ours'), x: 960, y: 330, size: MARKER_SIZE, face: 'mono', box: true, slam: true, pre: 0 },
  { id: 'm-sep', words: [{ text: '=======', color: RED }], t0: at('marker-sep'), stagger: 0.03, t1: at('slam-ours'), x: 960, y: 530, size: MARKER_SIZE, face: 'mono', box: true, slam: true, pre: 0 },
  { id: 'm-feature', words: [{ text: '>>>>>>>', color: STEEL }, { text: 'feature', color: '#ff6a10' }], t0: at('marker-feature'), stagger: 0.03, t1: at('slam-ours'), x: 960, y: 730, size: MARKER_SIZE, face: 'mono', box: true, slam: true, pre: 0 },
];

/** A one-beat out-and-back envelope from tb (0 at tb, 1 half a beat later, 0 one beat later: re-locked). */
const beatEnv = (t: number, tb: number): number => {
  const u = (t - tb) / beatLengthAt(tb);
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
};
/** A scale punch landing at tb: 1 + amt, back to 1 over 10 frames, no bounce. */
const punch = (t: number, tb: number, amt: number): number => (t < tb ? 1 : 1 + amt * (1 - outQuad((t - tb) / (10 / 60))));

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

/** Echo copies: a word multiplies on beats, each copy slamming in above / below the original. */
const Echoes = ({ t, times, render }: { t: number; times: readonly number[]; render: (dy: number, scale: number, opacity: number) => ReactNode }) => (
  <>
    {times.map((tb, k) => {
      if (t < tb) return null;
      const s = 1.35 - 0.35 * outQuad((t - tb) / (6 / 60));
      return <g key={k}>{render((k % 2 ? 1 : -1) * 300, 0.62 * s, 0.55)}</g>;
    })}
  </>
);

/** THEIRS split into its top and bottom halves, pulled apart over the 0.25 s before tb and re-slammed on tb. */
const SplitWord = ({ t, tb, children }: { t: number; tb: number; children: ReactNode }) => {
  const k = t < tb ? outQuad(clamp01((t - (tb - 0.25)) / 0.25)) : 0;
  const s = punch(t, tb, 0.28);
  return (
    <g transform={`translate(960 540) scale(${s}) translate(-960 -540)`}>
      <defs>
        <clipPath id="split-top"><rect x={-200} y={-200} width={2320} height={740} /></clipPath>
        <clipPath id="split-bot"><rect x={-200} y={540} width={2320} height={740} /></clipPath>
      </defs>
      <g clipPath="url(#split-top)" transform={`translate(${-260 * k} ${-30 * k})`}>{children}</g>
      <g clipPath="url(#split-bot)" transform={`translate(${260 * k} ${30 * k})`}>{children}</g>
    </g>
  );
};

/** The logo moment: one call site, LOGO_DESIGN decides the lockup. It slams in, re-seeds its split edge on every
 *  beat, shoves its halves apart and back on bar 10 and on beat 46, and takes a scale punch on bar 11. */
export const GrooveLogo = ({ t }: { t: number }) => {
  const t0 = at('logo-in');
  if (t < t0) return null;
  const land = 1.35 - 0.35 * outQuad((t - t0) / (8 / 60));
  const p = punch(t, at('logo-punch'), 0.22);
  const apart = 190 * (beatEnv(t, at('logo-shove-1')) + beatEnv(t, at('logo-shove-2')));
  const bp = beatPos(t);
  return (
    <g transform={`translate(960 520) scale(${land * p}) translate(-960 -520)`}>
      <MergeConflictLogo id="groove-logo" design={LOGO_DESIGN} resolved={false} cx={960} cy={520} width={1640} beat={bp - Math.floor(bp)} beatIndex={beatIndexAt(t)} apart={apart} />
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
  else if (kind === 'knee') cards = <Card id={C.knee} t={t} grade={silGrade(grade, 2.6)} {...GROOVE_BIG} rimDir={[-1, 0.2]} {...SILHOUETTE} />;
  else if (kind === 'tiny') cards = <Card id={C.tiny} t={t} grade={sil} x={0} height={2.6} {...SILHOUETTE} />;
  else cards = <Card id={C.waist} t={t} grade={silGrade(grade, 2.4)} {...waistUp(4.4, 13)} rimDir={[-1, 0.2]} {...SILHOUETTE} />;
  const lowGirl = { full: C.low, close: C.low, color: RED };
  const pose = kind === 'low' ? framing('low', t, lowGirl, lowGirl).pose : HOME;
  const oursT = at('slam-ours');
  const theirsT = at('slam-theirs');
  const splitT = at('split-theirs');
  const theirs = (dy = 0, scale = 1, opacity = 1) => (
    <g opacity={opacity} transform={`translate(960 ${540 + dy}) scale(${scale}) translate(-960 -540)`}>
      <Slam spec={{ text: 'THEIRS', t0: theirsT, t1: at('logo-in') - 0.05, x: 960, y: 540, size: 360, color: RED, face: 'metalmania', rot: -3 }} t={t} />
    </g>
  );
  const ours = (dy = 0, scale = 1, opacity = 1) => (
    <g opacity={opacity} transform={`translate(960 ${OURS.y - OURS.size * 0.43 + dy}) scale(${scale}) translate(-960 ${-(OURS.y - OURS.size * 0.43)})`}>
      <Slam spec={{ text: OURS.text, t0: oursT, t1: theirsT + 1, x: 960, y: OURS.y - OURS.size * 0.43, size: OURS.size, color: STEEL, face: 'metalmania' }} t={t} />
    </g>
  );
  // from bar 8 THEIRS sits BEHIND the big silhouette: masked by her rig-deformed outline
  const behind = kind === 'knee' ? silhouetteD(C.knee, GROOVE_BIG, HOME, t) : '';
  const theirsLayer = (
    <g mask={behind ? 'url(#behind-her)' : undefined}>
      {behind && (
        <defs>
          <mask id="behind-her" maskUnits="userSpaceOnUse" x={-300} y={-300} width={2520} height={1680}>
            <rect x={-300} y={-300} width={2520} height={1680} fill="#fff" />
            <path d={behind} fill="#000" />
          </mask>
        </defs>
      )}
      <SplitWord t={t} tb={splitT}>{theirs()}</SplitWord>
      {t < splitT && <Echoes t={t} times={[at('echo-theirs')]} render={theirs} />}
    </g>
  );
  const typeLayer = (
    <g>
      {MARKERS.map((s) => <LightBox key={s.id} spec={s} t={t} />)}
      {t >= oursT && t < at('counter-dive') && <Echoes t={t} times={[at('echo-ours-1'), at('echo-ours-2')]} render={ours} />}
      <ThroughCounter plan={COUNTER_DIVE} t={t} from={ours()} to={theirsLayer} />
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
        <TypeWhip plan={WHIP_OUT} t={t} color={RED} from={<TypeWhip plan={WHIP_GROOVE} t={t} color={RED} from={<Flap spec={{ ...LINE1, t1: Infinity }} t={t} cols={13} />} to={typeLayer} />} to={null} />
      </Svg>
    </AbsoluteFill>
  );
};
