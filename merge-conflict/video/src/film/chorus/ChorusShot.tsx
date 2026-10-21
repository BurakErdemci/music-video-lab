// A chorus (round 6 for chorus 1, round 7 for chorus 2): the shot table (plan.ts) drawn frame by frame. Chorus 2
// is the same table word for word; only its camera moves and worlds vary (makeChorusShot(lines, 2)). One Stage: the shot's world,
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
import { PlateLayer } from '../../worlds/plate.tsx';
import { ARENA, CHORUS1, CHORUS2, type ChorusLines, chorusPlan, type Pose, poseOfShot, type Scene, type Shot, shotAt } from './plan.ts';
import { ChorusType, logoApart } from './type.tsx';
import { chorusType } from './typeplan.ts';
import { Arena, BLUE, CYAN, FireWorld, HeartWorld, InsertWorld, LineWorld, LogoWorld, RED, RunwayWorld, SplitWorld, WallsWorld } from './worlds.tsx';

const BLUE_GRADE: Grade = { ...GRADES.reviewed, amount: 0.42 };
const ORANGE_GRADE: Grade = metalGrade(GRADES.mainline, 1);

/** Transition colours by the world being entered: saturated, at about the plates' mean luminance (~100 of 255),
 *  so a cover does not dip the frame dark and back (round 6: dark covers over the bright plates failed the flash check). */
const COLORS: Record<Scene, [Hex, Hex]> = {
  arena: ['#2d63fb', '#e92645'], insert: ['#ff2217', '#ff3014'], split: ['#226de5', '#ff2222'], runway: ['#1979bc', '#9a2aff'],
  fire: ['#e9320b', '#c84a10'], logo: ['#733cff', '#dc2473'], heart: ['#138c6d', '#f31b66'], walls: ['#3a5eee', '#cd3251'],
  line: ['#ae1ede', '#ff4fd8'], spin: ['#2d63fb', '#e92645'], burst: ['#733cff', '#dc2473'],
};

/** The painted plates behind the chorus worlds (trial, 21 Oct 2026); chorus 2 keeps the battle arena and varies the rest. */
const PLATES: Record<1 | 2, Partial<Record<Scene, string>>> = {
  1: { arena: 'W09', burst: 'W09', spin: 'W02', fire: 'W05', runway: 'W01' },
  2: { arena: 'W09', burst: 'W09', spin: 'W04', fire: 'W11', runway: 'W10' },
};
/** Scenes framed the same way in both choruses (the close-ups, the logo crash): their camera never varies. */
const FIXED: readonly Scene[] = ['insert', 'split', 'logo'];

const poseOf = (list: readonly Pose[], t: number): Pose | null => {
  let p: Pose | null = null;
  for (const e of list) if (t >= e.t - 1e-9) p = e;
  return p && p.card ? p : null;
};

export const makeChorusShot = (L: ChorusLines, v: 1 | 2) => {
  const plan = chorusPlan(L);
  // chorus 2's variation: every travelling shot is taken a little higher, wider and from one step to the side
  // (reversing the moves too made neighbouring shots differ more in brightness and pushed the flash count up)
  const lift = (c: CameraPose): CameraPose => ({ ...c, position: [c.position[0] + 1.0, c.position[1] + 0.6, c.position[2]], target: [c.target[0] + 0.5, c.target[1], c.target[2]], fov: c.fov + 3 });
  const P = v === 1 ? plan : { ...plan, SHOTS: plan.SHOTS.map((s) => (FIXED.includes(s.scene) ? s : { ...s, from: lift(s.from), to: lift(s.to) })) };
  const TYPE = chorusType(L);
  const at = (id: string): number => (TYPE.find((e) => e.id === id) as { t0: number }).t0;
  const MERGES: Record<string, readonly [number, number, number, number]> = {
    merge1: [at('merge1'), P.HITS.crash[0] as number, (P.SHOTS.find((s) => s.id === 'merge1-b') as Shot).t, P.HITS.crash[1] as number],
    merge2: [at('merge2'), P.HITS.crash[2] as number, (P.SHOTS.find((s) => s.id === 'merge2-b') as Shot).t, P.HITS.crash[3] as number],
  };

  const TRANSITIONS: TransitionSpec[] = P.SHOTS.map((s, i) => {
    const prev = P.SHOTS[i - 1];
    const cover = !prev || prev.scene !== s.scene;
    const kind = cover ? (s.into === 'shock' ? 'streaks' : (s.into ?? 'streaks')) : 'shock';
    return { id: `ch${v}-tr-${s.id}`, kind, at: s.t, pre: cover ? 4 / 60 : 0, post: cover ? 8 / 60 : 14 / 60, colors: COLORS[s.scene], origin: s.origin };
  });

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
    const r = seeded(`ch${v}-jolt:${Math.floor(t * 30)}`);
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
    return [blue && blue.at && dissolvePlan({ id: `ch${v}-burst-b`, t0: b, scatterFrames: 28, gatherFrames: 20, from: { card: blue.card as string, at: blue.at } }), orange && orange.at && dissolvePlan({ id: `ch${v}-burst-o`, t0: b, scatterFrames: 28, gatherFrames: 20, from: { card: orange.card as string, at: orange.at } })].filter(Boolean) as ReturnType<typeof dissolvePlan>[];
  })();

  const Shot = ({ frame }: { frame: number }) => {
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
          return <Arena t={t} stomps={stomps} embers={embers} led={v === 1 ? undefined : ['#7a3cff', '#ff3d9a']} plate />;
        case 'spin':
          return <Arena t={t} stomps={stomps} embers={embers} lasers={1.6} led={v === 1 ? ['#ff4fd8', CYAN] : ['#ff3014', '#ffb020']} plate />;
        case 'burst':
          return <Arena t={t} stomps={stomps} embers={embers} lasers={1.6 * (1 - clamp01((t - H.burst) / 0.5))} plate />;
        case 'insert':
          return <InsertWorld t={t} color={insertColor} hit={insertHit} />;
        case 'split':
          return <SplitWorld t={t} hit={insertHit} />;
        case 'runway':
          return <RunwayWorld t={t} on={outQuad(clamp01((t - sceneT0) / 0.5))} plate />;
        case 'fire':
          return <FireWorld t={t} rise={outQuad(clamp01((t - H.fire) / 0.35))} embers={embers} plate />;
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
          {PLATES[v][scene] && <PlateLayer id={PLATES[v][scene] as string} base={base} margin={scene === 'spin' ? 2.2 : 1.35} />}
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

  return { Shot, START: P.SHOTS[0]?.t ?? 0, END: L.end, PLAN: P, TYPE, TRANSITIONS };
};

const C1 = makeChorusShot(CHORUS1, 1);
const C2 = makeChorusShot(CHORUS2, 2);
export const ChorusShot = C1.Shot;
export const Chorus2Shot = C2.Shot;
export const CHORUS_START = C1.START;
export const CHORUS2_START = C2.START;
export const CHORUS_PLAN = C1.PLAN;
export const CHORUS_TYPE = C1.TYPE;
export const CHORUS_TRANSITIONS = C1.TRANSITIONS;
export { BLUE as CHORUS_BLUE };
