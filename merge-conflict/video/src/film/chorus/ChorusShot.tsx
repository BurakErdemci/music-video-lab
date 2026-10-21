// Chorus 1 (42.84-64.15 s, round 6): the shot table (plan.ts) drawn frame by frame. One Stage: the shot's world,
// the girls lit by it (key colour, a light band sweeping on every bar, mirror-ball dots), the persistent particle
// field (its bursts carry the cuts); then the type (typeplan.ts) and the transitions on top. The camera punches on
// every beat. A cut between two worlds is carried by a cover transition; a cut inside one world by a shock.
import { AbsoluteFill } from 'remotion';
import { type CameraPose, typePlane } from '../../camera/camera.ts';
import { Card, type CardLight } from '../../cards/Card.tsx';
import { GRADES, type Grade, metalGrade } from '../../grade/grade.ts';
import { clamp01, type Hex, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { Dissolve, dissolvePlan } from '../../particles/dissolve.tsx';
import { type Burst, Field } from '../../particles/field.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { barPos, sec } from '../../timing.ts';
import { SceneTransition, type TransitionSpec, transitionWindow } from '../../transitions/scene/scene.tsx';
import { FormDefs } from '../../type/forms/common.tsx';
import { Svg } from '../../type/Svg.tsx';
import { ARENA, CHORUS1, chorusPlan, type Pose, poseOfShot, type Scene, type Shot, shotAt } from './plan.ts';
import { ChorusType, logoApart } from './type.tsx';
import { chorusType } from './typeplan.ts';
import { Arena, BLUE, CYAN, FireWorld, HeartWorld, InsertWorld, LineWorld, LogoWorld, RED, RunwayWorld, SplitWorld, WallsWorld } from './worlds.tsx';

const P = chorusPlan(CHORUS1);
const TYPE = chorusType(CHORUS1);
const at = (id: string): number => (TYPE.find((e) => e.id === id) as { t0: number }).t0;
const MERGES: Record<string, readonly [number, number, number, number]> = {
  merge1: [at('merge1'), P.HITS.crash[0] as number, (P.SHOTS.find((s) => s.id === 'merge1-b') as Shot).t, P.HITS.crash[1] as number],
  merge2: [at('merge2'), P.HITS.crash[2] as number, (P.SHOTS.find((s) => s.id === 'merge2-b') as Shot).t, P.HITS.crash[3] as number],
};

const BLUE_GRADE: Grade = { ...GRADES.reviewed, amount: 0.42 };
const ORANGE_GRADE: Grade = metalGrade(GRADES.mainline, 1);

/** Transition colours by the world being entered (saturated, mid-dark: the flash budget holds). */
const COLORS: Record<Scene, [Hex, Hex]> = {
  arena: ['#16307a', '#7a1424'], insert: ['#5a0c08', '#ff3014'], split: ['#123a7a', '#7a1010'], runway: ['#0c3a5a', '#3a1060'],
  fire: ['#7a1a06', '#c84a10'], logo: ['#2a1660', '#7a1440'], heart: ['#0a4a3a', '#5a0a26'], walls: ['#1a2a6a', '#6a1a2a'],
  line: ['#3a0a4a', '#ff4fd8'], spin: ['#16307a', '#7a1424'], burst: ['#2a1660', '#7a1440'],
};
const TRANSITIONS: TransitionSpec[] = P.SHOTS.map((s, i) => {
  const prev = P.SHOTS[i - 1];
  const cover = !prev || prev.scene !== s.scene;
  const kind = cover ? (s.into === 'shock' ? 'streaks' : (s.into ?? 'streaks')) : 'shock';
  return { id: `ch-tr-${s.id}`, kind, at: s.t, pre: cover ? 4 / 60 : 0, post: cover ? 8 / 60 : 14 / 60, colors: COLORS[s.scene], origin: s.origin };
});

const poseOf = (list: readonly Pose[], t: number): Pose | null => {
  let p: Pose | null = null;
  for (const e of list) if (t >= e.t - 1e-9) p = e;
  return p && p.card ? p : null;
};

/** The camera: the shot's move, a punch on every beat (fov narrows 7 % and eases back over 10 frames), and a
 *  short positional jolt on each hit. */
const cameraAt = (t: number): { pose: CameraPose; shot: Shot; base: CameraPose } => {
  const { shot, k } = shotAt(P.SHOTS, t);
  const pose = poseOfShot(shot, k);
  const b = [...P.BEATS].reverse().find((x) => t >= x);
  const punch = b === undefined ? 0 : 1 - outQuad(clamp01((t - b) * 6));
  const hits = [...P.HITS.stompBlue, ...P.HITS.slamOrange, ...P.HITS.no, ...P.HITS.never, ...P.HITS.crash, ...P.HITS.walls];
  const h = hits.filter((x) => t >= x).sort((x, y) => y - x)[0];
  const jolt = h === undefined ? 0 : Math.max(0, 1 - (t - h) / 0.25);
  const r = seeded(`ch-jolt:${Math.floor(t * 30)}`);
  const d = 0.12 * jolt;
  return {
    pose: { ...pose, fov: pose.fov * (1 - 0.07 * punch), position: [pose.position[0] + r.range(-d, d), pose.position[1] + r.range(-d, d), pose.position[2]] },
    shot,
    base: poseOfShot(shot, 0),
  };
};

const sceneLight = (who: 'B' | 'O', t: number, scene: Scene): CardLight => {
  const bar = barPos(t);
  const sweepX = -9 + (bar % 1) * 18;
  const fire = scene === 'fire';
  return {
    key: fire ? '#ff7a1a' : who === 'B' ? CYAN : '#ff4a1a',
    keyAmt: 0.4,
    sweep: { x: sweepX, width: 0.9, amt: scene === 'insert' || scene === 'split' ? 0.25 : 0.5, color: who === 'B' ? '#bfefff' : '#ffd0b0', slope: 0.3 },
    dots: scene === 'arena' || scene === 'logo' || scene === 'spin' ? 0.55 : scene === 'walls' ? 0.3 : 0,
    ball: ARENA.ball,
    rim: 1.4,
  };
};

const BURST_PLANS = (() => {
  const b = P.HITS.burst;
  const blue = poseOf(P.BLUE, b - 0.01);
  const orange = poseOf(P.ORANGE, b - 0.01);
  return [blue && blue.at && dissolvePlan({ id: 'ch-burst-b', t0: b, scatterFrames: 28, gatherFrames: 20, from: { card: blue.card as string, at: blue.at } }), orange && orange.at && dissolvePlan({ id: 'ch-burst-o', t0: b, scatterFrames: 28, gatherFrames: 20, from: { card: orange.card as string, at: orange.at } })].filter(Boolean) as ReturnType<typeof dissolvePlan>[];
})();

export const ChorusShot = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const { pose, shot, base } = cameraAt(t);
  const plane = typePlane(pose, base, 1);
  const H = P.HITS;
  const stomps = [...H.stompBlue.map((x) => ({ t: x, x: ARENA.blueX })), ...H.slamOrange.map((x) => ({ t: x, x: ARENA.orangeX }))];
  const allHits: { t: number; origin: [number, number, number] }[] = [
    ...H.stompBlue.map((x) => ({ t: x, origin: [ARENA.blueX, -3, 0.8] as [number, number, number] })),
    ...H.slamOrange.map((x) => ({ t: x, origin: [ARENA.orangeX + 1.9, -1.8, 0.6] as [number, number, number] })),
    ...[...H.no, ...H.never].map((x) => ({ t: x, origin: [0, 1.5, 0] as [number, number, number] })),
    ...H.crash.map((x) => ({ t: x, origin: [0, 0.5, 0] as [number, number, number] })),
    { t: H.fire, origin: [0, -2, -2] as [number, number, number] },
    { t: H.burst, origin: [0, 0, 0] as [number, number, number] },
  ].sort((a, b) => a.t - b.t);
  const live = allHits.filter((h) => t >= h.t && t - h.t < 1.4).slice(-4);
  const bursts: Burst[] = live.map((h) => ({ t: h.t, origin: h.origin }));
  const embers = live.map((h) => ({ t: h.t, origin: h.origin }));
  const scene = shot.scene;
  const sceneT0 = shot.t;
  let blue = poseOf(P.BLUE, t);
  let orange = poseOf(P.ORANGE, t);
  const burstOn = t >= H.burst;
  if (burstOn) {
    blue = null;
    orange = null;
  }
  // the logo crash: the halves carry the girls (MERGE half blue, CONFLICT half orange)
  const logoEntry = scene === 'logo' ? (t < MERGES.merge2![0] ? 'merge1' : 'merge2') : null;
  const apart = logoEntry ? logoApart(t, MERGES[logoEntry] as readonly [number, number, number, number]) / 120 : 0;
  const clipOf = (who: 'B' | 'O') => (scene === 'split' ? { x: 0, keep: who === 'B' ? ('left' as const) : ('right' as const) } : undefined);
  const insertHit = [...H.no, ...H.never].filter((x) => x <= t).at(-1) ?? t;
  const insertColor = H.no[0] !== undefined && insertHit === H.no[0] ? RED : CYAN;
  const world = (() => {
    switch (scene) {
      case 'arena':
        return <Arena t={t} stomps={stomps} embers={embers} />;
      case 'spin':
        return <Arena t={t} stomps={stomps} embers={embers} lasers={1.6} led={['#ff4fd8', CYAN]} />;
      case 'burst':
        return <Arena t={t} stomps={stomps} embers={embers} lasers={1.6 * (1 - clamp01((t - H.burst) / 0.5))} />;
      case 'insert':
        return <InsertWorld t={t} color={insertColor} hit={insertHit} />;
      case 'split':
        return <SplitWorld t={t} hit={insertHit} />;
      case 'runway':
        return <RunwayWorld t={t} on={outQuad(clamp01((t - sceneT0) / 0.5))} />;
      case 'fire':
        return <FireWorld t={t} rise={outQuad(clamp01((t - H.fire) / 0.35))} embers={embers} />;
      case 'logo': {
        const crash = H.crash.filter((c) => t >= c).at(-1);
        return <LogoWorld t={t} flash={crash === undefined ? 0 : Math.max(0, 1 - (t - crash) / 0.3)} />;
      }
      case 'heart': {
        const heart = P.SHOTS.find((s) => s.id === 'heart') as Shot;
        const mad = P.SHOTS.find((s) => s.id === 'heart-haywire') as Shot;
        return <HeartWorld t={t} t0={heart.t} mad={t >= mad.t ? 1 : t >= heart.t + 0.4 ? 0.4 : 0} />;
      }
      case 'walls':
        return <WallsWorld t={t} hits={H.walls} />;
      case 'line':
        return <LineWorld t={t} t0={H.crush} />;
    }
  })();
  const figure = (who: 'B' | 'O', p: Pose | null) => {
    if (!p || !p.at) return null;
    const dx = logoEntry ? (who === 'B' ? -apart : apart) : 0;
    const dy = logoEntry ? (who === 'B' ? apart * 0.35 : -apart * 0.35) : 0;
    return <Card key={`${who}-${p.card}`} id={p.card as string} t={t} grade={who === 'B' ? BLUE_GRADE : ORANGE_GRADE} {...p.at} dx={dx} dy={dy} rimDir={[who === 'B' ? 1 : -1, 0.3]} rival={who === 'B' ? '#ff3a14' : '#19c8ff'} clip={clipOf(who)} light={sceneLight(who, t, scene)} ground={scene === 'arena' || scene === 'spin' || scene === 'fire' || scene === 'walls' || scene === 'runway' ? undefined : false} />;
  };
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        {world}
        <Field t={t} grade={scene === 'fire' ? ORANGE_GRADE : BLUE_GRADE} layer="back" density={0.9} hueMix={0.6} metal={0.5} bursts={bursts} />
        {figure('B', blue)}
        {figure('O', orange)}
        {burstOn && BURST_PLANS.map((pl, i) => <Dissolve key={i} plan={pl} t={t} grade={i ? ORANGE_GRADE : BLUE_GRADE} />)}
        <Field t={t} grade={BLUE_GRADE} layer="front" density={0.8} hueMix={0.6} metal={0.5} bursts={bursts} />
      </Stage>
      <Svg>
        <FormDefs />
        <g transform={plane.transform}>
          <ChorusType entries={TYPE} t={t} pose={pose} screen={false} merges={MERGES} />
        </g>
        <ChorusType entries={TYPE} t={t} pose={pose} screen merges={MERGES} />
        {TRANSITIONS.map((s) => {
          const [a, b] = transitionWindow(s);
          return t >= a && t < b ? <SceneTransition key={s.id} spec={s} t={t} /> : null;
        })}
      </Svg>
    </AbsoluteFill>
  );
};

export const CHORUS_START = P.SHOTS[0]?.t ?? 0;
export const CHORUS_PLAN = P;
export const CHORUS_TYPE = TYPE;
export const CHORUS_TRANSITIONS = TRANSITIONS;
export { BLUE as CHORUS_BLUE };
