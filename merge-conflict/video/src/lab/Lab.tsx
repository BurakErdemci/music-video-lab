// Lab: every engine module alone (type and girls segments replay take-v4's verse-1 lines 2-5) for 4 s, in sequence, for inspection (architecture.md "order of work" 2).
// Each segment owns the frame's single ThreeCanvas; t is the segment-local clock in seconds.
import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HOME, movesPath, shifted } from '../camera/camera.ts';
import { Card } from '../cards/Card.tsx';
import { Whiteout, type WhiteoutSpec, whiteoutSwings } from '../fx/whiteout.tsx';
import { BLUE, CYAN, GRADES, type Grade, MAGENTA, ORANGE } from '../grade/grade.ts';
import { assertFlashBudget } from '../lib/flash.ts';
import { litAt, spotAt, Spotlight, spotPlan } from '../light/spotlight.tsx';
import { Dissolve, dissolvePlan, dissolveState } from '../particles/dissolve.tsx';
import { Field } from '../particles/field.tsx';
import { Scribble } from '../scribble/Scribble.tsx';
import { SetPlate } from '../stage/SetPlate.tsx';
import { Stage } from '../stage/Stage.tsx';
import { Counter } from '../type/Counter.tsx';
import { DissolveText } from '../type/DissolveText.tsx';
import { familyOf, Fonts, SANS } from '../type/fonts.tsx';
import { Code, Diff } from '../type/forms/Code.tsx';
import { FormDefs, type FormSpec, type Singer } from '../type/forms/common.tsx';
import { Floor, Marquee } from '../type/forms/Dots.tsx';
import { Flap, Wave } from '../type/forms/Letters.tsx';
import { Extrude, Stamp as StampForm } from '../type/forms/Plates.tsx';
import { Stack } from '../type/forms/Stack.tsx';
import { counterOf, counterPlan, holeOf, LetterMorph, MarkerWipe, morphPlan, shatterEnd, shatterPlan, TextShatter, ThroughCounter, TypeWhip, whipPlan, type WordAt, wipePlan } from '../type/transitions/transitions.tsx';
import { lineTokens, type Token } from '../lyrics/LyricLayer.tsx';
import type { CameraPose } from '../camera/camera.ts';
import type { CardProps, Placement } from '../cards/Card.tsx';
import type { Hex } from '../lib/ease.ts';
import { barPos, downbeat, downbeats } from '../timing.ts';
/** The time `n` measured bars after t. */
const barTimeAfter = (t: number, n: number): number => {
  const p = barPos(t) + n;
  const i = Math.floor(p);
  const a = downbeats[i] as number;
  const b = (downbeats[i + 1] ?? a + 1.333) as number;
  return a + (p - i) * (b - a);
};
import { HoopType, type HoopPlan, hoopPlan, kickCards, kickPlan, KickWord, perchDy, perchPlacement, perchVisible, PerchWord, RevealBoard, type RevealPlan, revealDone, throwPlan, throwRecoil, ThrowWords } from '../girls/interact.tsx';
import { Fill } from '../girls/inside.tsx';
import { DANCE_POOL, focusAt, focusLook, focusPlan, framing, framingAt, type FramingKind, framingPlan, type Girl, poseBarDraws, poseBarPlan } from '../girls/staging.tsx';
import { hueAt, keyFill } from '../type/forms/common.tsx';
import { LightBox } from '../type/LightBox.tsx';
import { Slam } from '../type/Slam.tsx';
import { Stamp } from '../type/Stamp.tsx';
import { Svg } from '../type/Svg.tsx';

const SEG = 4;
const FLAT: Grade = { hue: '#808080', rival: '#ffffff', amount: 0, rim: 0, stage: 0 };
const L = { x: -3.2, height: 6.4 };
const R = { x: 3.2, height: 6.4 };
const C = { x: 0, height: 6.8 };

const Black = ({ children }: { children: ReactNode }) => <AbsoluteFill style={{ background: '#05030a' }}>{children}</AbsoluteFill>;

const LAB_SPOT = spotPlan({ label: 'lab', x0: 0, snaps: [{ id: 'on', t: 0.3, on: true }], whips: [{ id: 'w1', t: 0.9, frames: 28, x: -4 }, { id: 'w2', t: 1.9, frames: 38, x: 4 }, { id: 'w3', t: 2.9, frames: 48, x: 0 }] });
const LAB_DISSOLVES = [
  dissolvePlan({ id: 'lab-1', t0: 0.6, scatterFrames: 24, gatherFrames: 16, from: { card: 'B03', at: C }, to: { card: 'B01', at: C } }),
  dissolvePlan({ id: 'lab-2', t0: 2.2, scatterFrames: 28, gatherFrames: 20, from: { card: 'B01', at: C }, to: { card: 'O06', at: C } }),
] as const;
const LAB_WHITEOUTS: WhiteoutSpec[] = [
  { id: 'lab-wo-1', t0: 1.0, frames: 3, figures: [{ card: 'O04', at: C }] },
  { id: 'lab-wo-2', t0: 2.6, frames: 3, figures: [{ card: 'B05', at: C }] },
];
assertFlashBudget(LAB_WHITEOUTS.flatMap(whiteoutSwings), 'lab white-outs');
const LAB_CAM = movesPath('lab', HOME, [
  { id: 'push', t: 0.4, frames: 40, to: shifted(HOME, [0, 0.3, -2.2]) },
  { id: 'truck', t: 1.6, frames: 28, to: shifted(HOME, [1.8, 0.3, -2.2]) },
  { id: 'pull', t: 2.6, frames: 48, to: shifted(HOME, [0, 0, 0.6]) },
]);

interface Segment { id: string; title: string; render: (t: number) => ReactNode; dur?: number }

const ENGINE: Segment[] = [
  {
    id: 'grade',
    title: 'grade: hue tint + rival rim (mainline / reviewed / flat)',
    render: (t) => {
      const g = t < 1.33 ? GRADES.mainline : t < 2.66 ? GRADES.reviewed : FLAT;
      return (
        <Black>
          <Stage pose={HOME}>
            <Card id="O03" t={t} grade={g} {...L} rimDir={[1, 0.3]} />
            <Card id="B01" t={t} grade={g} {...R} rimDir={[-1, 0.3]} />
          </Stage>
        </Black>
      );
    },
  },
  {
    id: 'cards',
    title: 'cards: living still (float, bob, hair sway), no grade',
    render: (t) => (
      <Black>
        <Stage pose={shifted(HOME, [0, 0.8, -3.2])}>
          <Card id="B02" t={t} grade={FLAT} {...L} />
          <Card id="O07" t={t} grade={FLAT} {...R} />
        </Stage>
      </Black>
    ),
  },
  {
    id: 'field',
    title: 'particles/field: confetti, mirror-ball sparkles, burst at 1.0 s',
    render: (t) => (
      <Black>
        <Stage pose={HOME}>
          <Field t={t} grade={GRADES.mainline} layer="back" bursts={[{ t: 1, origin: [0, -2.5, 0.5] }]} />
          <Field t={t} grade={GRADES.mainline} layer="front" bursts={[{ t: 1, origin: [0, -2.5, 0.5] }]} />
        </Stage>
      </Black>
    ),
  },
  {
    id: 'dissolve',
    title: 'particles/dissolve: B03 -> B01 (24/16 f), B01 -> O06 (28/20 f)',
    render: (t) => {
      const [a, b] = LAB_DISSOLVES;
      const sa = dissolveState(a, t);
      const sb = dissolveState(b, t);
      const cards = t < b.t0 ? [{ id: 'B03', o: sa.fromOpacity }, { id: 'B01', o: sa.toOpacity }] : [{ id: 'B01', o: sb.fromOpacity }, { id: 'O06', o: sb.toOpacity }];
      return (
        <Black>
          <Stage pose={HOME}>
            {cards.map((c) => <Card key={c.id} id={c.id} t={t} grade={GRADES.reviewed} {...C} opacity={c.o} />)}
            {LAB_DISSOLVES.map((d) => <Dissolve key={d.id} plan={d} t={t} grade={GRADES.reviewed} />)}
          </Stage>
        </Black>
      );
    },
  },
  {
    id: 'spotlight',
    title: 'light/spotlight: snap on, whips of 28 / 38 / 48 frames then full stop',
    render: (t) => (
      <Black>
        <Stage pose={HOME}>
          <Spotlight plan={LAB_SPOT} t={t} />
          <Card id="B04" t={t} grade={GRADES.black} x={-4} height={6} lit={litAt(spotAt(LAB_SPOT, t), -4)} />
          <Card id="O06" t={t} grade={GRADES.black} x={4} height={6} lit={litAt(spotAt(LAB_SPOT, t), 4)} />
        </Stage>
      </Black>
    ),
  },
  {
    id: 'set',
    title: 'stage/SetPlate (code set): wall rays, mirror tiles + align sweep at 1.5 s, mirror ball',
    render: (t) => (
      <Black>
        <Stage pose={HOME}>
          <SetPlate t={t} grade={t < 2 ? GRADES.mainline : GRADES.reviewed} align={t >= 1.5 && t < 2.1 ? (t - 1.5) / 0.6 : 0} />
        </Stage>
      </Black>
    ),
  },
  {
    id: 'slam',
    title: 'type/Slam: 1.6 -> 1 in 8 frames, no bounce',
    render: (t) => (
      <Black>
        <Svg>
          <Slam spec={{ text: 'ACCEPT', t0: 0.4, t1: 1.8, x: 960, y: 420, size: 220, color: ORANGE }} t={t} />
          <Slam spec={{ text: 'INCOMING', t0: 2.0, t1: 3.6, x: 960, y: 640, size: 220, color: BLUE, rot: -4 }} t={t} />
        </Svg>
      </Black>
    ),
  },
  {
    id: 'stamp',
    title: 'type/Stamp: plates multiply on each beat (0.392 s)',
    render: (t) => (
      <Black>
        <Svg>
          <Stamp spec={{ id: 'lab-stamp', label: 'APPROVED', times: [0.3, 0.692, 1.084, 1.476, 1.868, 2.26], slots: [[560, 380], [1360, 380], [560, 560], [1360, 560], [560, 740], [1360, 740]], size: 70, color: CYAN, t1: 4 }} t={t} />
        </Svg>
      </Black>
    ),
  },
  {
    id: 'dissolve-text',
    title: 'type/DissolveText: letters break into flying glyphs at 2.0 s',
    render: (t) => (
      <Black>
        <Svg>
          <DissolveText spec={{ id: 'lab-dt', text: 'REBASE', t0: 0.3, t1: 2.0, x: 960, y: 620, size: 260, color: MAGENTA }} t={t} />
        </Svg>
      </Black>
    ),
  },
  {
    id: 'lightbox',
    title: 'type/LightBox: per-letter lighting, one colour per word',
    render: (t) => (
      <Black>
        <Svg>
          <LightBox spec={{ id: 'lab-lb1', words: [{ text: 'GIT', color: ORANGE }, { text: 'PUSH', color: MAGENTA }, { text: '--FORCE', color: BLUE }], t0: 0.3, stagger: 0.09, x: 960, y: 520, size: 170, box: true }} t={t} />
          <LightBox spec={{ id: 'lab-lb2', words: [{ text: '<<<<<<<', color: CYAN }, { text: 'HEAD', color: BLUE }], t0: 1.6, stagger: 0.04, t1: 3.4, x: 960, y: 800, size: 60, face: 'mono', box: true }} t={t} />
        </Svg>
      </Black>
    ),
  },
  {
    id: 'counter',
    title: 'type/Counter: racing commit counter 0 -> 300',
    render: (t) => (
      <Black>
        <Svg>
          <Counter spec={{ from: 0, to: 300, t0: 0.3, t1: 2.6, x: 960, y: 620, size: 260, color: ORANGE, digits: 3 }} t={t} />
        </Svg>
      </Black>
    ),
  },
  {
    id: 'scribble',
    title: 'scribble: neon draw-on along the outline, 4-frame boil',
    render: (t) => (
      <Black>
        <Stage pose={HOME}>
          <Card id="O08" t={t} grade={GRADES.mainline} {...L} />
          <Card id="B07" t={t} grade={GRADES.reviewed} {...R} />
        </Stage>
        <Svg>
          <Scribble spec={{ id: 'lab-s1', card: 'O08', at: L, t0: 0.3, draw: 0.8, t1: 4, color: ORANGE, stars: 4 }} t={t} pose={HOME} />
          <Scribble spec={{ id: 'lab-s2', card: 'B07', at: R, t0: 1.2, draw: 0.8, t1: 4, color: BLUE, stars: 4 }} t={t} pose={HOME} />
        </Svg>
      </Black>
    ),
  },
  {
    id: 'whiteout',
    title: 'fx/whiteout: 3-frame hits at 1.0 s and 2.6 s (flat figure, RGB ghosts, spray)',
    render: (t) => (
      <Black>
        <Stage pose={HOME}>
          <Card id={t < 2 ? 'O04' : 'B05'} t={t} grade={GRADES.mainline} {...C} />
        </Stage>
        {LAB_WHITEOUTS.map((w) => <Whiteout key={w.id} spec={w} t={t} pose={HOME} />)}
      </Black>
    ),
  },
  {
    id: 'camera',
    title: 'camera: push 40 f, truck 28 f, pull 48 f (outQuad, full stops)',
    render: (t) => (
      <Black>
        <Stage pose={LAB_CAM(t)}>
          <SetPlate t={t} grade={GRADES.mainline} />
          <Card id="O03" t={t} grade={GRADES.mainline} {...L} />
          <Card id="B01" t={t} grade={GRADES.mainline} {...R} rimDir={[-1, 0.3]} />
        </Stage>
      </Black>
    ),
  },
];

// ---- type forms and transitions (typography-led clip), 3 s each ------------------------------------------
const TYPE_SEG = 3;
const BOX = { x: 180, y: 190, w: 1560, h: 700 };
/** Behind every type segment: the code-built set and a soft dancing girl, as in the film. */
const Behind = ({ t, children }: { t: number; children: ReactNode }) => (
  <Black>
    <Stage pose={HOME}>
      <SetPlate t={t} grade={GRADES.reviewed} />
      <Card id="B07" t={t} grade={GRADES.reviewed} x={-2.6} height={6.6} soft={0.8} rimDir={[1, 0.25]} />
    </Stage>
    <Svg>
      <FormDefs />
      {children}
    </Svg>
  </Black>
);
/** A form segment replays a measured lyric line: the segment clock maps onto the song from `from` seconds. */
const formSeg = (id: string, title: string, from: number, draw: (songT: number) => ReactNode): Segment => ({
  id,
  title,
  dur: TYPE_SEG,
  render: (t) => <Behind t={from + t}>{draw(from + t)}</Behind>,
});
const startOf = (line: number, word: number, lead: number) => (lineTokens(line)[word] as Token).start - lead;
const spec = (id: string, line: number, key: number, singer: Singer, range?: [number, number]): FormSpec => ({ id, line, key, singer, t0: -Infinity, t1: Infinity, box: BOX, range });
const W_FROM: WordAt = { text: 'CLEAN', x: 520, y: 600, size: 260, face: 'display', fill: '#19c8ff' };
const W_TO: WordAt = { text: 'LINE', x: 700, y: 640, size: 300, face: 'bungee', fill: '#ffd23a' };
// No JSX constants at module level: the bundle evaluates modules before React is defined (sibling gotcha).
const LAYER_A = () => (
  <text x={960} y={620} textAnchor="middle" fontFamily={familyOf('bungee')} fontSize={220} fill="#ff7a1a" stroke="#0b0614" strokeWidth={10} paintOrder="stroke">
    OURS
  </text>
);
const LAYER_B = () => (
  <text x={960} y={620} textAnchor="middle" fontFamily={familyOf('monoton')} fontSize={220} fill="#2f7bff">
    THEIRS
  </text>
);
const L_WIPE = wipePlan({ id: 'lab-wipe', t0: 0.6, marker: '>', frames: 26 });
const L_WIPE2 = wipePlan({ id: 'lab-wipe2', t0: 1.9, marker: '=', frames: 26 });
const L_MORPH = morphPlan({ id: 'lab-morph', t0: 0.8, from: W_FROM, to: W_TO, frames: 30 });
const COUNTER_WORD: WordAt = { text: 'CODE', x: 560, y: 680, size: 330, face: 'bungee', fill: '#ff7a1a' };
const L_COUNTER = counterPlan({ id: 'lab-counter', t0: 0.8, center: counterOf(COUNTER_WORD, 1), hole: holeOf(COUNTER_WORD, 1), frames: 34 });
const L_SHATTER = shatterPlan({
  id: 'lab-shatter',
  t0: 0.7,
  from: { text: 'HEAD', x: 560, y: 640, size: 300, face: 'display', fill: '#19c8ff' },
  to: { text: 'MAIN', x: 620, y: 640, size: 300, face: 'display', fill: '#ff7a1a' },
  scatterFrames: 26,
  gatherFrames: 18,
});
const L_WHIP = whipPlan({ id: 'lab-whip', t0: 1.2, dir: 1, frames: 12 });
const wordEl = (w: WordAt) => (
  <text x={w.x} y={w.y} fontFamily={familyOf(w.face)} fontSize={w.size} fill={w.fill} stroke="#0b0614" strokeWidth={8} paintOrder="stroke">
    {w.text}
  </text>
);

const TYPE: Segment[] = [
  formSeg('stack', 'form STACK: line 0, key HEAD', startOf(2, 0, 0.2), (st) => <Stack spec={spec('lab-stack', 2, 1, 'B')} t={st} />),
  formSeg('code', 'form CODE: line 1 words 0-4, key 42', startOf(3, 0, 0.2), (st) => <Code spec={spec('lab-code', 3, 1, 'B', [0, 5])} t={st} opt={{ gutter: '42', size: 64 }} />),
  formSeg('diff', 'form DIFF: line 1 words 5-9, key BLUE', startOf(3, 5, 0.3), (st) => <Diff spec={spec('lab-diff', 3, 5, 'B', [5, 10])} t={st} opt={{ minus: 'color: orange;', size: 60 }} />),
  formSeg('wave', 'form WAVE: line 2 on a beat-kicked baseline, key APPROVED', startOf(4, 0, 0.2), (st) => <Wave spec={spec('lab-wave', 4, 2, 'both')} t={st} opt={{ size: 130 }} />),
  formSeg('floor', 'form FLOOR: line 0 lit in the floor tiles, key HEAD', startOf(2, 0, 0.2), (st) => <Floor spec={spec('lab-floor', 2, 1, 'B')} t={st} opt={{ pose: HOME, x: 1.2, z: 1.6, tile: 0.36 }} />),
  formSeg('marquee', 'form MARQUEE: line 0 in bulbs, key HEAD', startOf(2, 0, 0.2), (st) => <Marquee spec={spec('lab-marquee', 2, 1, 'O')} t={st} />),
  formSeg('stamp', 'form STAMP: line 2 plates, key APPROVED multiplies', startOf(4, 0, 0.2), (st) => <StampForm spec={spec('lab-stamp', 4, 2, 'B')} t={st} />),
  formSeg('flap', 'form FLAP: line 3 split-flap board', startOf(5, 0, 0.2), (st) => <Flap spec={spec('lab-flap', 5, 5, 'O')} t={st} />),
  formSeg('extrude', 'form EXTRUDE: line 0 turning 2.5D letters, key HEAD', startOf(2, 0, 0.2), (st) => <Extrude spec={spec('lab-extrude', 2, 1, 'both')} t={st} opt={{ size: 420 }} />),
  {
    id: 'morph',
    title: 'transition LETTER MORPH: CLEAN -> LINE, shared L I N E',
    dur: TYPE_SEG,
    render: (t) => <Behind t={t}>{t < L_MORPH.t0 ? wordEl(W_FROM) : t >= L_MORPH.t0 + L_MORPH.dur ? wordEl(W_TO) : <LetterMorph plan={L_MORPH} t={t} />}</Behind>,
  },
  {
    id: 'wipe',
    title: 'transition MARKER WIPE: >>>>>>> then =======',
    dur: TYPE_SEG,
    render: (t) => (
      <Behind t={t}>
        <MarkerWipe plan={L_WIPE2} t={t} color="#ff3d9a" from={<MarkerWipe plan={L_WIPE} t={t} color="#19c8ff" from={LAYER_A()} to={LAYER_B()} />} to={LAYER_A()} />
      </Behind>
    ),
  },
  { id: 'counter', title: 'transition THROUGH THE COUNTER: into the O of CODE', dur: TYPE_SEG, render: (t) => <Behind t={t}><ThroughCounter plan={L_COUNTER} t={t} from={wordEl(COUNTER_WORD)} to={LAYER_B()} /></Behind> },
  {
    id: 'shatter',
    title: 'transition SHATTER: HEAD -> particles -> MAIN (26/18 f)',
    dur: TYPE_SEG,
    render: (t) => <Behind t={t}>{t < L_SHATTER.t0 ? wordEl(L_SHATTER.from) : t >= shatterEnd(L_SHATTER) ? wordEl(L_SHATTER.to) : <TextShatter plan={L_SHATTER} t={t} />}</Behind>,
  },
  { id: 'whip', title: 'transition WHIP: one-direction smear of a type layer', dur: TYPE_SEG, render: (t) => <Behind t={t}><TypeWhip plan={L_WHIP} t={t} color="#19c8ff" from={LAYER_A()} to={LAYER_B()} /></Behind> },
];

// ---- the girls are never wallpaper: interactions, focus, framings, pose bars, inside the type (3 s each) --
const GSEG = 3;
const B = GRADES.reviewed;
const O_GRADE: Grade = { hue: '#ff6a10', rival: '#2f7bff', amount: 0.3, rim: 1.2, stage: 1 };
const gradeOf = (id: string): Grade => (id.startsWith('O') ? O_GRADE : B);
/** A girls segment: the stage (camera, set, cards) and the type layer, both on the song clock from `from`. */
const girlSeg = (id: string, title: string, from: number, stage: (st: number) => { pose: CameraPose; cards: ReactNode; split?: boolean }, overlay: (st: number, pose: CameraPose) => ReactNode): Segment => ({
  id,
  title,
  dur: GSEG,
  render: (t) => {
    const st = from + t;
    const s = stage(st);
    return (
      <Black>
        <Stage pose={s.pose}>
          <SetPlate t={st} grade={B} split={s.split ? '#ff5a10' : undefined} />
          <Field t={st} grade={B} layer="back" density={0.5} />
          {s.cards}
        </Stage>
        <Svg>
          <FormDefs />
          {overlay(st, s.pose)}
        </Svg>
      </Black>
    );
  },
});
const draw = (d: { card: string; opacity: number; dx: number; stretch: [number, number] }, at: Placement, st: number, key: string, extra: Partial<CardProps> = {}) => (
  <Card key={key} id={d.card} t={st} grade={gradeOf(d.card)} {...at} dx={d.dx} stretch={d.stretch} opacity={d.opacity} {...extra} />
);

const W0 = lineTokens(2);
const W2 = lineTokens(4);
const W3 = lineTokens(5);
const tok = (line: readonly Token[], i: number) => line[i] as Token;

const KICK_AT: Placement = { x: -1.6, height: 6.6 };
const KICK = kickPlan({ id: 'lab-kick', word: { text: 'HEAD', x: 980, y: 900, size: 230, face: 'display', fill: '#19c8ff' }, tok: tok(W0, 1), kick: tok(W0, 3).start, idle: 'BD3', kickCard: 'BD6', at: KICK_AT, dir: 1 });
const PERCH = { id: 'lab-perch', word: { text: 'HEAD', x: 300, y: 1010, size: 520, face: 'bungee' as const, fill: '#ff7a1a' as Hex }, letter: 2, tok: tok(W0, 1), land: tok(W0, 3).start, card: 'O11', height: 4.6, pose: HOME };
const HOOP_AT: Placement = { x: 0, height: 7 };
const labHoop = (): HoopPlan => hoopPlan({ id: 'lab-hoop', tokens: W3.slice(5, 8), key: 0, card: 'O06', at: HOOP_AT, pose: HOME, rx: 520, ry: 130, size: 112, speed: 1.5, fill: (i) => hueAt('O', 0, i), keyFill: keyFill('O') });
const REVEAL_FLAP: RevealPlan = { id: 'lab-reveal-flap', text: 'WHO ARE YOU?', box: { x: 360, y: 260, w: 1200, h: 560 }, reveal: tok(W3, 5).start, kind: 'flap', color: '#ffd23a' };
const REVEAL_SLIDE: RevealPlan = { id: 'lab-reveal-slide', text: 'APPROVED', box: { x: 420, y: 380, w: 1080, h: 300 }, reveal: tok(W2, 2).start + 0.4, kind: 'slide', color: '#19c8ff' };
const THROW_A: Placement = { x: -4.2, height: 5.6 };
const THROW_B: Placement = { x: 4.2, height: 5.6 };
const THROW = throwPlan({
  id: 'lab-throw',
  throws: [
    { tok: tok(W3, 5), from: 'A', land: tok(W3, 6).start },
    { tok: tok(W3, 6), from: 'B', land: tok(W3, 7).start },
    { tok: tok(W3, 7), from: 'A', land: tok(W3, 7).end + 0.25 },
  ],
  A: { card: 'O03', at: THROW_A, color: '#ff7a1a' },
  B: { card: 'B01', at: THROW_B, color: '#2f7bff' },
  pose: HOME,
  size: 110,
});
const FOCUS = focusPlan([
  { t: tok(W0, 1).start, singer: 'O', frames: 30 },
  { t: tok(W0, 3).start, singer: 'B', frames: 30 },
  { t: tok(W0, 5).start, singer: 'O', frames: 30 },
  { t: tok(W0, 7).start, singer: 'both', frames: 30 },
]);
const ORANGE_GIRL: Girl = { full: 'O06', close: 'O05', color: '#ff7a1a' };
const BLUE_GIRL: Girl = { full: 'B04', close: 'B09', color: '#2f7bff' };
const FR_FROM = tok(W0, 0).start - 0.2;
const framingSeg = (kind: FramingKind, title: string) => {
  // the framing holds 2 measured bars, then hands over to the plain stage (the 2-bar rule, checked)
  const plan = framingPlan([{ t: FR_FROM, kind }, { t: barTimeAfter(FR_FROM, 2), kind: kind === 'stage' ? 'face' : 'stage' }], FR_FROM + GSEG);
  return girlSeg(`framing-${kind}`, title, FR_FROM, (st) => {
    const k = framingAt(plan, st);
    const f = framing(k, st, k === 'split' ? ORANGE_GIRL : BLUE_GIRL, k === 'split' ? BLUE_GIRL : ORANGE_GIRL);
    return { pose: f.pose, split: f.split, cards: f.cards.map(({ key, ...c }) => <Card key={key} grade={gradeOf(c.id)} {...c} />) };
  }, (st) => <Stack spec={{ id: `fr-${kind}`, line: 2, key: 1, singer: 'B', t0: -Infinity, t1: Infinity, box: { x: 260, y: 200, w: 1400, h: 620 } }} t={st} />);
};
const POSEBAR = poseBarPlan('lab-posebar', DANCE_POOL.B, 7, 2, '#19c8ff');
const POSE_AT: Placement = { x: 0, height: 7 };

const GIRLS: Segment[] = [
  girlSeg('kick', 'girls KICK: the pose swaps to a kick on "main" and HEAD flies off', tok(W0, 1).start - 0.3, (st) => ({ pose: HOME, cards: kickCards(KICK, st).map((d, i) => draw(d, KICK_AT, st, `k${i}`)) }), (st) => <KickWord plan={KICK} t={st} />),
  girlSeg('perch', 'girls PERCH: she drops onto the A of HEAD, the letter dips', tok(W0, 1).start - 0.2, (st) => ({
    pose: HOME,
    cards: perchVisible(PERCH, st) ? <Card id={PERCH.card} t={st} grade={O_GRADE} {...perchPlacement(PERCH)} dy={perchDy(PERCH, st)} /> : null,
  }), (st) => <PerchWord plan={PERCH} t={st} />),
  girlSeg('hoop', 'girls HOOP: a short line orbits her waist, in front, then behind', tok(W3, 5).start - 0.3, (st) => ({ pose: HOME, cards: <Card id="O06" t={st} grade={O_GRADE} {...HOOP_AT} /> }), (st) => <HoopType plan={labHoop()} t={st} />),
  girlSeg('reveal-flap', 'girls REVEAL: a FLAP board folds away on "who" to show her', tok(W3, 5).start - 1.6, (st) => ({ pose: HOME, cards: <Card id="B04" t={st} grade={B} x={0} height={7} soft={revealDone(REVEAL_FLAP, st) ? 0 : 0.8} /> }), (st) => <RevealBoard plan={REVEAL_FLAP} t={st} />),
  girlSeg('reveal-slide', 'girls REVEAL: a STAMP plate slides off to show her', tok(W2, 2).start - 1.4, (st) => ({ pose: HOME, cards: <Card id="B10" t={st} grade={B} x={0} height={7} /> }), (st) => <RevealBoard plan={REVEAL_SLIDE} t={st} />),
  girlSeg('throw', 'girls THROW: who / are / you? thrown across, each knocks her back', tok(W3, 5).start - 0.5, (st) => ({
    pose: HOME,
    cards: (
      <>
        <Card id="O03" t={st} grade={O_GRADE} {...THROW_A} dx={throwRecoil(THROW, 'A', st)} rimDir={[1, 0.3]} />
        <Card id="B01" t={st} grade={B} {...THROW_B} dx={throwRecoil(THROW, 'B', st)} rimDir={[-1, 0.3]} />
      </>
    ),
  }), (st) => <ThrowWords plan={THROW} t={st} />),
  girlSeg('focus', 'girls FOCUS: the singer big and sharp, focus ping-pongs (36-40 f moves)', tok(W0, 1).start - 0.2, (st) => {
    const w = focusAt(FOCUS, st);
    const o = focusLook(w);
    const b = focusLook(1 - w);
    return {
      pose: HOME,
      cards: (
        <>
          <Card id="O06" t={st} grade={O_GRADE} x={-3.4} height={6.4 * o.scale} soft={o.soft} lit={o.lit} rimDir={[1, 0.3]} />
          <Card id="B04" t={st} grade={B} x={3.4} height={6.4 * b.scale} soft={b.soft} lit={b.lit} rimDir={[-1, 0.3]} />
        </>
      ),
    };
  }, () => null),
  framingSeg('face', 'framing FACE: giant close-up behind the STACK'),
  framingSeg('tiny', 'framing TINY: a tiny full figure behind huge type'),
  framingSeg('low', 'framing LOW: low angle'),
  framingSeg('clones', 'framing CLONES: five copies, phase-offset in the dance'),
  framingSeg('split', 'framing SPLIT: one girl per half'),
  girlSeg('posebar', 'girls POSE PER BAR: a new dance card each downbeat, ghost trails fade over a beat', downbeat(7) - 0.4, (st) => ({
    pose: HOME,
    cards: poseBarDraws(POSEBAR, st, POSE_AT.height).map((d, i) =>
      draw(d, POSE_AT, st, `pb${i}`, d.ghost !== undefined ? { flat: { color: POSEBAR.color, mix: 0.85 }, soft: 0.3 } : {}),
    ),
  }), () => null),
  girlSeg('fill', 'inside FILL: her silhouette filled with the line', tok(W2, 0).start - 0.2, (st) => ({ pose: HOME, cards: <Card id="B07" t={st} grade={B} x={0} height={8} flat={{ color: '#05030a', mix: 0.92 }} /> }), (st, pose) => <Fill plan={{ id: 'lab-fill', tokens: W2, key: 2, card: 'B07', at: { x: 0, height: 8 }, pose, colors: ['#19c8ff', '#2f7bff', '#8fd8ff', '#7a6cff'], keyColor: '#ff7a1a', size: 54 }} t={st} />),
];

const SEGMENTS: Segment[] = [...ENGINE.map((s) => ({ ...s, dur: SEG })), ...TYPE, ...GIRLS];
const STARTS = SEGMENTS.reduce<number[]>((a, s, i) => [...a, (a[i] as number) + (s.dur ?? SEG) * 60], [0]);
export const LAB_FRAMES = STARTS.at(-1) as number;

export const Lab = () => {
  const frame = useCurrentFrame();
  const i = Math.max(0, STARTS.findIndex((s, n) => frame >= s && frame < (STARTS[n + 1] ?? Infinity)));
  const seg = SEGMENTS[Math.min(i, SEGMENTS.length - 1)] as Segment;
  const t = (frame - (STARTS[i] as number)) / 60;
  return (
    <AbsoluteFill style={{ background: '#05030a' }}>
      <Fonts />
      {seg.render(t)}
      <div style={{ position: 'absolute', left: 32, bottom: 24, fontFamily: SANS, fontWeight: 700, fontSize: 28, color: '#cfc8e0' }}>
        {i + 1}/{SEGMENTS.length} {seg.title} · t {t.toFixed(2)} s
      </div>
    </AbsoluteFill>
  );
};
