// Verse 1, verse 2 and the pre-chorus (16.33-42.84 s, round 6 elite pass): the shot table (plan.ts) drawn frame by
// frame on the worlds of worlds/v1.tsx and worlds/v2.tsx (and the chorus worlds for the strobe split, the
// transformation and the arena preview). A camera variant of each world's hero move per shot; the girls lit by the
// scene; orange gathers out of particles as the intruder on "you?" and turns metal through a particle dissolve on
// "ORANGE!"; a cover transition when the world changes, a shock inside one.
import { AbsoluteFill } from 'remotion';
import { blendPose, type CameraPose, project, typePlane, type Vec3 } from '../../camera/camera.ts';
import { Card, type CardLight, type Placement } from '../../cards/Card.tsx';
import { hoopPlan, throwPlan, throwRecoil } from '../../girls/interact.tsx';
import { GRADES, type Grade, metalGrade } from '../../grade/grade.ts';
import { clamp01, type Hex, outQuad, ramp } from '../../lib/ease.ts';
import { lineTokens } from '../../lyrics/LyricLayer.tsx';
import { Dissolve, dissolvePlan, dissolveState } from '../../particles/dissolve.tsx';
import { type Burst, Field } from '../../particles/field.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { FLOOR_Y } from '../../stage/floor.ts';
import { barPos, downbeats, sec } from '../../timing.ts';
import { SceneTransition, type TransitionSpec, transitionWindow } from '../../transitions/scene/scene.tsx';
import { FormDefs } from '../../type/forms/common.tsx';
import { RunwayLine } from '../../type/forms/Mega.tsx';
import { Svg } from '../../type/Svg.tsx';
import { CLOCK_CAMERA, CLOCK_FACE, ClockWorld, PRESS_CAMERA, PressWorld, SUBWAY_CAMERA, SubwayWorld } from '../../worlds/v1.tsx';
import { ALLEY_CAMERA, AlleyWorld, GRAFFITI_CAMERA, GRAFFITI_PANEL, GraffitiWorld, RAILS_CAMERA, RailsWorld, SCOREBOARD, STADIUM_CAMERA, StadiumWorld } from '../../worlds/v2.tsx';
import { Arena, BLUE, CYAN, InsertWorld, pulseAt, RED, RunwayWorld, SplitWorld } from '../chorus/worlds.tsx';
import { type CamVariant, PRE_T, type VerseScene, VBLUE, VERSE_TYPE, VORANGE, type VPose, VSHOTS, type VShot } from './plan.ts';
import { hoopFill, hoopKey, VerseType } from './type.tsx';

type Hero = { from: CameraPose; to: CameraPose };
const cam = (position: Vec3, target: Vec3, fov = 40): CameraPose => ({ position, target, fov });
const RUNWAY_CAMERA: Hero = { from: cam([2.6, -1.4, 9.5], [0, -1.4, -12], 42), to: cam([1.4, -2.0, 7.5], [0, -1.2, -12], 42) };
const STROBE_CAMERA: Hero = { from: cam([0, 0, 12.4], [0, 0, 0]), to: cam([0, 0.2, 11.2], [0, 0.2, 0]) };
const ARENA_CAMERA: Hero = { from: cam([0, 1.6, 15], [0, -1, -1], 42), to: cam([0, 1.2, 12.5], [0, -1, -1], 42) };
const HERO: Record<VerseScene, Hero> = {
  subway: SUBWAY_CAMERA, runway: RUNWAY_CAMERA, press: PRESS_CAMERA, clock: CLOCK_CAMERA, rails: RAILS_CAMERA, graffiti: GRAFFITI_CAMERA,
  alley: ALLEY_CAMERA, stadium: STADIUM_CAMERA, strobe: STROBE_CAMERA, transform: STROBE_CAMERA, arena: ARENA_CAMERA,
};

const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** A camera variant of the hero move at progress k, around the girl at `focus` (world, chest height). */
const variant = (h: Hero, v: CamVariant, k: number, focus: Vec3): CameraPose => {
  const p = blendPose(h.from, h.to, k);
  switch (v) {
    case 'close':
      return { ...p, position: lerp3(p.position, [focus[0] * 0.6, focus[1] + 0.3, focus[2] + 6.2], 0.75), target: lerp3(p.target, focus, 0.8), fov: 38 };
    case 'low':
      return { ...p, position: [p.position[0] * 0.8 + focus[0] * 0.2, FLOOR_Y + 0.6, p.position[2] * 0.8 + 1], target: [p.target[0], p.target[1] + 1.6, p.target[2]], fov: p.fov + 6 };
    case 'reverse': {
      const r = blendPose(h.to, h.from, k);
      return { ...r, position: [-r.position[0] - 1.5, r.position[1], r.position[2]] };
    }
    case 'wide':
      return { ...p, position: lerp3(p.target, p.position, 1.35) };
    default:
      return p;
  }
};

const tk = (line: number, k: number) => lineTokens(line)[k]?.start ?? 0;
const poseOf = (list: readonly VPose[], t: number): VPose | null => {
  let p: VPose | null = null;
  for (const e of list) if (t >= e.t - 1e-9) p = e;
  return p && p.card ? p : null;
};
const shotAt = (t: number): { shot: VShot; k: number } => {
  let i = 0;
  for (let j = 0; j < VSHOTS.length; j++) if (t >= (VSHOTS[j] as VShot).t - 1e-9) i = j;
  const shot = VSHOTS[i] as VShot;
  const end = VSHOTS[i + 1]?.t ?? shot.t + 1;
  return { shot, k: clamp01((t - shot.t) / (end - shot.t)) };
};

const BLUE_GRADE: Grade = { ...GRADES.reviewed, amount: 0.42 };
const ORANGE_DISCO: Grade = { hue: '#ff7a1a', rival: '#2f7bff', amount: 0.4, rim: 1.3, stage: 1 };
const ORANGE_METAL: Grade = metalGrade(GRADES.mainline, 1);

const COLORS: Record<VerseScene, [Hex, Hex]> = {
  subway: ['#102a6a', '#3a1a7a'], runway: ['#0c3a6a', '#2a1a6a'], press: ['#1a2a6a', '#3a2a7a'], clock: ['#140c3a', '#3a1a5a'],
  rails: ['#5a1a06', '#4a0c3a'], graffiti: ['#6a1a06', '#5a0c4a'], alley: ['#3a0c4a', '#6a1a10'], stadium: ['#5a2a06', '#3a0c4a'],
  strobe: ['#123a7a', '#7a1a10'], transform: ['#5a0c08', '#ff3014'], arena: ['#16307a', '#7a1424'],
};
const TRANSITIONS: TransitionSpec[] = VSHOTS.map((s, i) => {
  const cover = i === 0 || (VSHOTS[i - 1] as VShot).scene !== s.scene;
  return { id: `v-tr-${s.id}`, kind: cover ? (s.into ?? 'streaks') : 'shock', at: s.t, pre: cover ? 5 / 60 : 0, post: cover ? 10 / 60 : 14 / 60, colors: COLORS[s.scene] };
});

// orange gathers out of particles as the intruder (done on "you?"), and turns metal through a dissolve on "ORANGE!"
const INTRUDER_AT: Placement = { x: 4, height: 4.8, z: 2 };
const INTRUDER = dissolvePlan({ id: 'v-intruder', t0: tk(5, 7) + 0.1 - (24 + 16) / 60 - 0.1, scatterFrames: 24, gatherFrames: 16, to: { card: 'OI1', at: INTRUDER_AT } });
const OX1_AT: Placement = { x: 4.4, feet: -5.2, height: 10, z: 0, flip: true };
const OMX3_AT: Placement = { x: 1.8, feet: -5.4, height: 11, z: 0, flip: true };
const TRANSFORM = dissolvePlan({ id: 'v-transform', t0: tk(13, 0) - 20 / 60, scatterFrames: 20, gatherFrames: 12, from: { card: 'OX1', at: OX1_AT }, to: { card: 'OMX3', at: OMX3_AT } });

const lightOf = (who: 'B' | 'O', t: number, scene: VerseScene, metal: boolean): CardLight => {
  const sweepX = -9 + (barPos(t) % 1) * 18;
  const key: Hex = who === 'B' ? CYAN : metal ? '#ff3a14' : '#ff8a3a';
  const v1 = scene === 'subway' || scene === 'runway' || scene === 'press' || scene === 'clock';
  return { key, keyAmt: 0.4, sweep: { x: sweepX, width: 0.9, amt: 0.45, color: v1 ? '#c8f0ff' : '#ffd6f0', slope: 0.3 }, dots: v1 ? 0.45 : scene === 'arena' ? 0.5 : 0.15, ball: [0, 5.3, -6], rim: 1.4 };
};

export const VersesShot = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const { shot, k } = shotAt(t);
  const scene = shot.scene;
  const blueP = poseOf(VBLUE, t);
  const orangeP = poseOf(VORANGE, t);
  const focusOf = (p: VPose | null): Vec3 => (p?.at ? [p.at.x, (p.at.feet ?? FLOOR_Y) + p.at.height * 0.62, p.at.z ?? 0] : [0, 0, 0]);
  const focus = focusOf(scene === 'subway' || scene === 'runway' || scene === 'press' || (scene === 'clock' && t < tk(5, 7)) ? blueP : orangeP ?? blueP);
  // the camera: the shot's variant, plus a punch on every downbeat (the chorus punches on every beat)
  const base = variant(HERO[scene], shot.cam, k, focus);
  const db = [...downbeats].reverse().find((x) => t >= x) ?? 0;
  const pose: CameraPose = { ...base, fov: base.fov * (1 - 0.05 * (1 - outQuad(clamp01((t - db) * 6)))) };
  const plane = typePlane(pose, variant(HERO[scene], shot.cam, 0, focus), 1);
  const planeBase = variant(HERO[scene], shot.cam, 0, focus);
  const p = pulseAt(t);
  const throwP = throwPlan({ id: 'v-css', throws: [{ tok: lineTokens(8)[3] as never, from: 'A', land: tk(8, 4) }], A: { card: 'OD7', at: { x: 2.6, height: 4.8 }, color: '#ff7a1a' }, B: { card: 'BD2', at: { x: -2.6, height: 4.8 }, color: '#2f7bff' }, pose, size: 130 });
  const hoop = orangeP?.at && t < tk(6, 3) && t >= tk(6, 0) - 0.05 ? hoopPlan({ id: 'v-hoop', tokens: lineTokens(6).slice(0, 3), key: 1, card: orangeP.card as string, at: orangeP.at, pose, rx: 430, ry: 120, size: 96, speed: 1.4, fill: hoopFill, keyFill: hoopKey }) : undefined;
  // anchors: where the world objects sit on the type plane's screen
  const P = (v: Vec3) => project(planeBase, v);
  const cf = P(CLOCK_FACE.centre);
  const cr = P([CLOCK_FACE.centre[0] + CLOCK_FACE.radius, CLOCK_FACE.centre[1], CLOCK_FACE.centre[2]]);
  const rect = (r: { centre: Vec3; width: number; height: number }) => {
    const a = P([r.centre[0] - r.width / 2, r.centre[1] + r.height / 2, r.centre[2]]);
    const b = P([r.centre[0] + r.width / 2, r.centre[1] - r.height / 2, r.centre[2]]);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  };
  const anchors = { clock: { cx: cf.x, cy: cf.y, r: Math.abs(cr.x - cf.x) }, panel: scene === 'graffiti' ? rect(GRAFFITI_PANEL) : undefined, board: scene === 'stadium' ? rect(SCOREBOARD) : undefined };
  const bursts: Burst[] = [
    { t: tk(2, 5), origin: [-4, -1, 0] as Vec3 },
    { t: tk(5, 7), origin: [4, 0, 2] as Vec3 },
    { t: tk(13, 0), origin: [1.8, 1, 0] as Vec3 },
    { t: tk(14, 0), origin: [0, 0, 0] as Vec3 },
  ].filter((b) => t >= b.t && t - b.t < 2);
  const lineLit = (a: number) => outQuad(ramp(t, a, 0.5));
  const world = (() => {
    switch (scene) {
      case 'subway':
        return <SubwayWorld t={t} lit={{ main: lineLit(tk(2, 3)), feature: lineLit(tk(2, 0)) * 0.6, stable: lineLit(tk(2, 5)) }} />;
      case 'runway':
        return <RunwayWorld t={t} on={lineLit(shot.t)} lanes={[BLUE, '#5a3cff']} edges={[CYAN, '#b48cff']} />;
      case 'press':
        return <PressWorld t={t} slams={lineTokens(4).map((x) => x.start)} />;
      case 'clock':
        return <ClockWorld t={t} strike={tk(5, 4)} />;
      case 'rails':
        return <RailsWorld t={t} split={tk(6, 1)} />;
      case 'graffiti':
        return <GraffitiWorld t={t} spray={tk(7, 0)} />;
      case 'alley':
        return <AlleyWorld t={t} />;
      case 'stadium':
        return <StadiumWorld t={t} pulse={p} />;
      case 'strobe':
        return <SplitWorld t={t} hit={[tk(10, 0), tk(11, 0), tk(12, 0)].filter((x) => t >= x).at(-1) ?? t} />;
      case 'transform':
        return <InsertWorld t={t} color={RED} hit={tk(13, 0)} />;
      case 'arena':
        return <Arena t={t} stomps={[]} embers={[]} />;
    }
  })();
  const metal = t >= tk(13, 0);
  const figure = (who: 'B' | 'O', pp: VPose | null, opacity = 1) => {
    if (!pp?.at) return null;
    const grade = who === 'B' ? BLUE_GRADE : metal ? ORANGE_METAL : ORANGE_DISCO;
    const dx = scene === 'alley' ? throwRecoil(throwP, who === 'B' ? 'B' : 'A', t) : 0;
    const clip = scene === 'strobe' ? { x: 0, keep: who === 'B' ? ('left' as const) : ('right' as const) } : undefined;
    const grounded = (pp.at.feet ?? FLOOR_Y) === FLOOR_Y;
    return <Card key={`${who}-${pp.card}`} id={pp.card as string} t={t} grade={grade} {...pp.at} dx={dx} opacity={opacity} rimDir={[who === 'B' ? 1 : -1, 0.3]} rival={who === 'B' ? '#ff7a1a' : '#19c8ff'} clip={clip} light={lightOf(who, t, scene, metal)} ground={grounded ? undefined : false} />;
  };
  const intr = dissolveState(INTRUDER, t);
  const trans = dissolveState(TRANSFORM, t);
  let orangeFig = figure('O', orangeP);
  if (orangeP?.card === 'OI1' && intr.active) orangeFig = figure('O', orangeP, intr.toOpacity);
  if (trans.active) orangeFig = <>{figure('O', { t: 0, card: 'OX1', at: OX1_AT }, trans.fromOpacity)}{figure('O', { t: 0, card: 'OMX3', at: OMX3_AT }, trans.toOpacity)}</>;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        {world}
        <Field t={t} grade={metal ? ORANGE_METAL : scene === 'subway' || scene === 'runway' || scene === 'press' || scene === 'clock' ? BLUE_GRADE : ORANGE_DISCO} layer="back" density={0.6} hueMix={0.5} bursts={bursts} />
        {figure('B', blueP)}
        {orangeFig}
        {intr.active && <Dissolve plan={INTRUDER} t={t} grade={ORANGE_DISCO} />}
        {trans.active && <Dissolve plan={TRANSFORM} t={t} grade={ORANGE_METAL} />}
        <Field t={t} grade={BLUE_GRADE} layer="front" density={0.5} hueMix={0.5} bursts={bursts} />
      </Stage>
      <Svg>
        <FormDefs />
        {scene === 'runway' && <RunwayLine spec={{ id: 'v-runway-42', text: 'color: blue;', gutter: '42', t0: shot.t, t1: tk(4, 0), cps: 20, origin: [-1.5, FLOOR_Y + 0.02, 2.6], dir: [1, 0, 0], up: [0, 0, -1], size: 0.5, color: '#7fe3ff' }} t={t} pose={pose} />}
        <g transform={plane.transform}>
          <VerseType entries={VERSE_TYPE.filter((e) => e.id !== 'v-feature' && e.id !== 'v-css')} t={t} pose={pose} anchors={anchors} />
        </g>
        <VerseType entries={VERSE_TYPE.filter((e) => e.id === 'v-feature' || e.id === 'v-css')} t={t} pose={pose} anchors={anchors} hoop={hoop} throwP={scene === 'alley' ? throwP : undefined} />
        {TRANSITIONS.map((s) => {
          const [a, b] = transitionWindow(s);
          return t >= a && t < b ? <SceneTransition key={s.id} spec={s} t={t} /> : null;
        })}
      </Svg>
    </AbsoluteFill>
  );
};

export const VERSES_START = VSHOTS[0]?.t ?? 0;
export const VERSE_TRANSITIONS = TRANSITIONS;
export { PRE_T };
