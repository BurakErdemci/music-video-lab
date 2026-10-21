// Lab: every engine module alone for 4 s, in sequence, for inspection (architecture.md "order of work" 2).
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
import { Fonts, SANS } from '../type/fonts.tsx';
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

interface Segment { id: string; title: string; render: (t: number) => ReactNode }

const SEGMENTS: Segment[] = [
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

export const LAB_FRAMES = SEGMENTS.length * SEG * 60;

export const Lab = () => {
  const frame = useCurrentFrame();
  const i = Math.min(SEGMENTS.length - 1, Math.floor(frame / (SEG * 60)));
  const seg = SEGMENTS[i] as Segment;
  const t = (frame - i * SEG * 60) / 60;
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
