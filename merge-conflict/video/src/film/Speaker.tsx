// intro_robot 0-4.37 s: the speaker (INTRO_SPEAKER, the blue girl) reads git's error out loud, deadpan.
// The words come from her: a red terminal (CODE, line 0) hangs off a speech tail from her mouth; on "Fix"
// her "failed." morphs into a huge FIX, and a >>>>>>> wipe opens the FLAP board of line 1. Framing: a front
// knee-up (she fills the frame from the first frame, the terminal beside her), then her face close-up on the
// next downbeat but one (never longer than 2 bars).
import { AbsoluteFill } from 'remotion';
import { HOME } from '../camera/camera.ts';
import { Card, type Placement } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { keypoint, screenOf } from '../girls/silhouette.ts';
import { framingAt } from '../girls/framing.ts';
import { GRADES, type Grade } from '../grade/grade.ts';
import { Field } from '../particles/field.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { sec } from '../timing.ts';
import { Code, codeWordAt } from '../type/forms/Code.tsx';
import { FormDefs } from '../type/forms/common.tsx';
import { Flap } from '../type/forms/Letters.tsx';
import { Svg } from '../type/Svg.tsx';
import { LetterMorph, MarkerWipe, type WordAt } from '../type/transitions/transitions.tsx';
import { kneeUp } from '../girls/staging.tsx';
import { CODE_OPT, FIX, FRAMINGS, GIRL, INTRO_SPEAKER, LINE0, LINE1, MORPH_FIX, SPEAKER_AT, WIPE_FLAP } from './proof.ts';

/** A dark, near-empty club: the error is the only colour. */
const DARK: Grade = { hue: '#3a0a12', rival: '#ff3b3b', amount: 0.25, rim: 0.9, stage: 0.35 };

const speakers = (): ('O' | 'B')[] => (INTRO_SPEAKER === 'both' ? ['O', 'B'] : [INTRO_SPEAKER]);

/** Where each speaker stands in the two framings of the intro. */
const placeOf = (who: 'O' | 'B', close: boolean): Placement => {
  const both = INTRO_SPEAKER === 'both';
  if (close) return { x: both ? (who === 'O' ? -3.6 : 3.6) : -3.0, feet: -7.0, height: 11.5, flip: both && who === 'O' };
  return both ? kneeUp(who === 'O' ? -4.6 : 4.6, 9.4) : SPEAKER_AT;
};

export const Speaker = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const close = framingAt(FRAMINGS, t) === 'face';
  const who = speakers();
  const fixWord: WordAt = FIX;
  // the morph starts at the measured "failed." in the terminal
  const failed = codeWordAt(LINE0, CODE_OPT, 2);
  const morph = { ...MORPH_FIX, from: { ...MORPH_FIX.from, x: failed.x, y: failed.y } };
  const terminal = (
    <g>
      <Code spec={LINE0} t={t} opt={CODE_OPT} />
      {t >= morph.t0 + morph.dur && t < WIPE_FLAP.t0 + WIPE_FLAP.dur && (
        <text x={fixWord.x} y={fixWord.y} fontFamily="'MCAnton', sans-serif" fontSize={fixWord.size} fill={fixWord.fill} stroke="#0b0614" strokeWidth={12} paintOrder="stroke">
          {fixWord.text}
        </text>
      )}
      <LetterMorph plan={morph} t={t} />
    </g>
  );
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={HOME}>
        <SetPlate t={t} grade={DARK} wallOnly={close} />
        <Field t={t} grade={DARK} layer="back" density={0.35} alpha={0.7} hueMix={0.6} />
        {who.map((g) => (
          <Card key={`${g}-${close}`} id={close ? GIRL[g].close : GIRL[g].stand} t={t} grade={{ ...GRADES.reviewed, rival: '#ff3b3b' }} {...placeOf(g, close)} dance={0.25} rimDir={[1, 0.2]} />
        ))}
        <Field t={t} grade={DARK} layer="front" density={0.25} alpha={0.6} hueMix={0.6} />
      </Stage>
      <Svg>
        <FormDefs />
        {/* the speech tail: from her mouth to the panel, so the text visibly comes from her */}
        {who.map((g) => {
          const [mx, my] = screenOf(close ? GIRL[g].close : GIRL[g].stand, placeOf(g, close), HOME, t, keypoint(close ? GIRL[g].close : GIRL[g].stand, 'head'), 0.25);
          const tx = close ? LINE1.box.x : LINE0.box.x;
          const ty = close ? LINE1.box.y + 60 : LINE0.box.y + LINE0.box.h * 0.5;
          const pulse = t >= at('tok-0-0') ? 1 : 0;
          return <path key={g} d={`M${mx + 40} ${my + 30} Q ${(mx + tx) / 2} ${my - 40} ${tx} ${ty}`} fill="none" stroke="#ff3b3b" strokeWidth={5} strokeDasharray="14 10" strokeDashoffset={-t * 120} opacity={pulse} />;
        })}
        <MarkerWipe plan={WIPE_FLAP} t={t} color="#ff3b3b" from={terminal} to={<Flap spec={LINE1} t={t} cols={13} />} />
      </Svg>
    </AbsoluteFill>
  );
};
