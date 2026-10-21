// Verse 1, verse 2 and the pre-chorus (16.33-42.84 s, round 6 elite pass): the shot table (plan.ts) drawn frame by
// frame on the worlds of worlds/v1.tsx and worlds/v2.tsx (and the chorus worlds for the strobe split, the
// transformation and the arena preview). A camera variant of each world's hero move per shot; the girls lit by the
// scene; orange gathers out of particles as the intruder on "you?" and turns metal through a particle dissolve on
// "ORANGE!" through the OT1-OT5 sequence; a cover transition when the world changes, a shock inside one.
import { AbsoluteFill } from 'remotion';
import { type CameraPose, project, typePlane, type Vec3 } from '../../camera/camera.ts';
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
import { PlateLayer } from '../../worlds/plate.tsx';
import { CLOCK_CAMERA, CLOCK_FACE, ClockWorld, PRESS_CAMERA, PressWorld, SUBWAY_CAMERA, SubwayWorld } from '../../worlds/v1.tsx';
import { ALLEY_CAMERA, AlleyWorld, GRAFFITI_CAMERA, GRAFFITI_PANEL, GraffitiWorld, RAILS_CAMERA, RailsWorld, SCOREBOARD, STADIUM_CAMERA, StadiumWorld } from '../../worlds/v2.tsx';
import { Arena, BLUE, CYAN, InsertWorld, pulseAt, RED, RunwayWorld, SplitWorld } from '../chorus/worlds.tsx';
import { PRE_T, type VerseScene, VBLUE, VERSE_TYPE, VORANGE, type VPose, VSHOTS, type VShot } from './plan.ts';
import { hoopFill, hoopKey, VerseType } from './type.tsx';
import { focusOf, type Hero, poseAt, shotIn, variant } from '../shotkit.ts';
import type { ShotState, Subject } from '../framing.ts';

const cam = (position: Vec3, target: Vec3, fov = 40): CameraPose => ({ position, target, fov });
const RUNWAY_CAMERA: Hero = { from: cam([2.6, -1.4, 9.5], [0, -1.4, -12], 42), to: cam([1.4, -2.0, 7.5], [0, -1.2, -12], 42) };
const STROBE_CAMERA: Hero = { from: cam([0, 0, 12.4], [0, 0, 0]), to: cam([0, 0.2, 11.2], [0, 0.2, 0]) };
const ARENA_CAMERA: Hero = { from: cam([0, 1.6, 15], [0, -1, -1], 42), to: cam([0, 1.2, 12.5], [0, -1, -1], 42) };
const HERO: Record<VerseScene, Hero> = {
  subway: SUBWAY_CAMERA, runway: RUNWAY_CAMERA, press: PRESS_CAMERA, clock: CLOCK_CAMERA, rails: RAILS_CAMERA, graffiti: GRAFFITI_CAMERA,
  alley: ALLEY_CAMERA, stadium: STADIUM_CAMERA, strobe: STROBE_CAMERA, transform: STROBE_CAMERA, arena: ARENA_CAMERA,
};


const tk = (line: number, k: number) => lineTokens(line)[k]?.start ?? 0;

/** The painted plates behind the verse worlds (trial, 21 Oct 2026). */
const PLATES: Partial<Record<VerseScene, string>> = { subway: 'W10', runway: 'W01', press: 'W08', clock: 'W06', rails: 'W12', graffiti: 'W03', alley: 'W01', stadium: 'W07', transform: 'W11', arena: 'W09' };

const BLUE_GRADE: Grade = { ...GRADES.reviewed, amount: 0.42 };
const ORANGE_DISCO: Grade = { hue: '#ff7a1a', rival: '#2f7bff', amount: 0.4, rim: 1.3, stage: 1 };
const ORANGE_METAL: Grade = metalGrade(GRADES.mainline, 1);

/** Transition colours by the world being entered: saturated, at about the plates' mean luminance (~100 of 255),
 *  so a cover does not dip the frame dark and back (round 6: dark covers over the bright plates failed the flash check). */
const COLORS: Record<VerseScene, [Hex, Hex]> = {
  subway: ['#2765ff', '#7d38ff'], runway: ['#1875d5', '#6941ff'], press: ['#3a5eee', '#684bda'], clock: ['#3c24ae', '#873dd2'],
  rails: ['#d23d0e', '#cf22a2'], graffiti: ['#df370d', '#d41caf'], alley: ['#ae24de', '#d93521'], stadium: ['#ac500b', '#ae24de'],
  strobe: ['#226de5', '#e4311e'], transform: ['#ff2217', '#ff3014'], arena: ['#2d63fb', '#e92645'],
};
const TRANSITIONS: TransitionSpec[] = VSHOTS.map((s, i) => {
  const cover = i === 0 || (VSHOTS[i - 1] as VShot).scene !== s.scene;
  return { id: `v-tr-${s.id}`, kind: cover ? (s.into ?? 'streaks') : 'shock', at: s.t, pre: cover ? 5 / 60 : 0, post: cover ? 10 / 60 : 14 / 60, colors: COLORS[s.scene] };
});

// orange gathers out of particles as the intruder (done on "you?")
const INTRUDER_AT: Placement = { x: 4, height: 4.8, z: 2 };
const INTRUDER = dissolvePlan({ id: 'v-intruder', t0: tk(5, 7) + 0.1 - (24 + 16) / 60 - 0.1, scatterFrames: 24, gatherFrames: 16, to: { card: 'OI1', at: INTRUDER_AT } });

const lightOf = (who: 'B' | 'O', t: number, scene: VerseScene, metal: boolean): CardLight => {
  const sweepX = -9 + (barPos(t) % 1) * 18;
  const key: Hex = who === 'B' ? CYAN : metal ? '#ff3a14' : '#ff8a3a';
  const v1 = scene === 'subway' || scene === 'runway' || scene === 'press' || scene === 'clock';
  return { key, keyAmt: 0.4, sweep: { x: sweepX, width: 0.9, amt: 0.45, color: v1 ? '#c8f0ff' : '#ffd6f0', slope: 0.3 }, dots: v1 ? 0.45 : scene === 'arena' ? 0.5 : 0.15, ball: [0, 5.3, -6], rim: 1.4 };
};

/** The verses' camera and girls at t: the shot's variant of its world's hero move, a punch on every downbeat. */
const verseCamera = (t: number) => {
  const { shot, k } = shotIn(VSHOTS, t);
  const scene = shot.scene;
  const blueP = poseAt(VBLUE, t);
  const orangeP = poseAt(VORANGE, t);
  const focus = focusOf(scene === 'subway' || scene === 'runway' || scene === 'press' || (scene === 'clock' && t < tk(5, 7)) ? blueP : orangeP ?? blueP);
  const base = variant(HERO[scene], shot.cam, k, focus);
  const db = [...downbeats].reverse().find((x) => t >= x) ?? 0;
  const pose: CameraPose = { ...base, fov: base.fov * (1 - 0.05 * (1 - outQuad(clamp01((t - db) * 6)))) };
  const planeBase = variant(HERO[scene], shot.cam, 0, focus);
  return { shot, k, scene, blueP, orangeP, pose, planeBase };
};
const throwOf = (pose: CameraPose) => throwPlan({ id: 'v-css', throws: [{ tok: lineTokens(8)[3] as never, from: 'A', land: tk(8, 4) }], A: { card: 'OD7', at: { x: 2.6, height: 4.8 }, color: '#ff7a1a' }, B: { card: 'BD2', at: { x: -2.6, height: 4.8 }, color: '#2f7bff' }, pose, size: 130 });
const clipOf = (scene: VerseScene, who: 'B' | 'O') => (scene === 'strobe' ? { x: 0, keep: who === 'B' ? ('left' as const) : ('right' as const) } : undefined);

/** What the verses show at t, for tools/framecheck.mjs: the same pose and cards the component draws. */
export const versesStateAt = (t: number): ShotState => {
  const { shot, scene, blueP, orangeP, pose } = verseCamera(t);
  const throwP = throwOf(pose);
  const subjects: Subject[] = [];
  const add = (who: 'B' | 'O', pp: VPose | null) => {
    if (!pp?.at || !pp.card) return;
    if (who === 'O' && pp.card === 'OI1' && dissolveState(INTRUDER, t).toOpacity < 0.5) return;
    subjects.push({ card: pp.card, at: pp.at, dx: scene === 'alley' ? throwRecoil(throwP, who === 'B' ? 'B' : 'A', t) : 0, clip: clipOf(scene, who) });
  };
  add('B', blueP);
  add('O', orangeP);
  return { pose, shot: shot.id, subjects };
};

export const VersesShot = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const { shot, k, scene, blueP, orangeP, pose, planeBase } = verseCamera(t);
  const plane = typePlane(pose, planeBase, 1);
  const p = pulseAt(t);
  const throwP = throwOf(pose);
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
  // with the W06 plate the clock is the painted one: centred, high in the frame of the shot's opening camera
  const anchors = { clock: PLATES.clock ? { cx: 960, cy: 250, r: 300 } : { cx: cf.x, cy: cf.y, r: Math.abs(cr.x - cf.x) }, panel: scene === 'graffiti' ? rect(GRAFFITI_PANEL) : undefined, board: scene === 'stadium' ? rect(SCOREBOARD) : undefined };
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
        return <SubwayWorld t={t} plate="shot" lit={{ main: lineLit(tk(2, 3)), feature: lineLit(tk(2, 0)) * 0.6, stable: lineLit(tk(2, 5)) }} />;
      case 'runway':
        return <RunwayWorld t={t} plate on={lineLit(shot.t)} lanes={[BLUE, '#5a3cff']} edges={[CYAN, '#b48cff']} />;
      case 'press':
        return <PressWorld t={t} plate="shot" slams={lineTokens(4).map((x) => x.start)} />;
      case 'clock':
        return <ClockWorld t={t} plate="shot" strike={tk(5, 4)} />;
      case 'rails':
        return <RailsWorld t={t} plate="shot" split={tk(6, 1)} />;
      case 'graffiti':
        return <GraffitiWorld t={t} plate="shot" spray={tk(7, 0)} />;
      case 'alley':
        return <AlleyWorld t={t} plate="shot" />;
      case 'stadium':
        return <StadiumWorld t={t} plate="shot" pulse={p} />;
      case 'strobe':
        return <SplitWorld t={t} hit={[tk(10, 0), tk(11, 0), tk(12, 0)].filter((x) => t >= x).at(-1) ?? t} />;
      case 'transform':
        return <InsertWorld t={t} color={RED} hit={tk(13, 0)} />;
      case 'arena':
        return <Arena t={t} stomps={[]} embers={[]} plate />;
    }
  })();
  // her metal grade arrives with the half-metal card (OT3), two steps into the word
  const metal = t >= tk(13, 0) + 12 / 60;
  const figure = (who: 'B' | 'O', pp: VPose | null, opacity = 1) => {
    if (!pp?.at) return null;
    const grade = who === 'B' ? BLUE_GRADE : metal ? ORANGE_METAL : ORANGE_DISCO;
    const dx = scene === 'alley' ? throwRecoil(throwP, who === 'B' ? 'B' : 'A', t) : 0;
    const clip = clipOf(scene, who);
    const grounded = (pp.at.feet ?? FLOOR_Y) === FLOOR_Y;
    return <Card key={`${who}-${pp.card}`} id={pp.card as string} t={t} grade={grade} {...pp.at} dx={dx} opacity={opacity} rimDir={[who === 'B' ? 1 : -1, 0.3]} rival={who === 'B' ? '#ff7a1a' : '#19c8ff'} clip={clip} light={lightOf(who, t, scene, metal)} ground={grounded ? undefined : false} />;
  };
  const intr = dissolveState(INTRUDER, t);
  let orangeFig = figure('O', orangeP);
  if (orangeP?.card === 'OI1' && intr.active) orangeFig = figure('O', orangeP, intr.toOpacity);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        {PLATES[scene] && <PlateLayer id={PLATES[scene] as string} base={planeBase} />}
        {world}
        <Field t={t} grade={metal ? ORANGE_METAL : scene === 'subway' || scene === 'runway' || scene === 'press' || scene === 'clock' ? BLUE_GRADE : ORANGE_DISCO} layer="back" density={0.6} hueMix={0.5} bursts={bursts} dust />
        {figure('B', blueP)}
        {orangeFig}
        {intr.active && <Dissolve plan={INTRUDER} t={t} grade={ORANGE_DISCO} />}
        <Field t={t} grade={BLUE_GRADE} layer="front" density={0.5} hueMix={0.5} bursts={bursts} dust />
      </Stage>
      <Svg>
        <FormDefs />
        {scene === 'runway' && <RunwayLine spec={{ id: 'v-runway-42', text: 'color: blue;', gutter: '42', t0: shot.t, t1: tk(4, 0), cps: 20, origin: [-1.5, FLOOR_Y + 0.02, 2.6], dir: [1, 0, 0], up: [0, 0, -1], size: 0.5, color: '#7fe3ff' }} t={t} pose={pose} />}
        <g transform={plane.transform}>
          <VerseType entries={VERSE_TYPE.filter((e) => e.id !== 'v-feature' && e.id !== 'v-css')} t={t} pose={pose} anchors={anchors} />
          {/* the strike of 00:00 on the painted clock: two light rings opening from its face */}
          {scene === 'clock' && t >= tk(5, 4) && t < tk(5, 4) + 0.5 && [0, 0.08].map((d) => {
            const u = clamp01((t - tk(5, 4) - d) / 0.42);
            return <circle key={d} cx={anchors.clock.cx} cy={anchors.clock.cy} r={anchors.clock.r * (0.9 + 0.6 * outQuad(u))} fill="none" stroke="#cfeaff" strokeWidth={18 * (1 - u)} opacity={1 - u} />;
          })}
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
