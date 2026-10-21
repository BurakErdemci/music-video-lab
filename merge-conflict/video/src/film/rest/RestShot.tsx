// Verse 3 (rebase), verse 4 (trade), the scream, GIT! PUSH! FORCE!, the whisper and the guitar solo (64.15-140.04 s,
// round 7), drawn from the shot table in plan.ts on the worlds of worlds/v3.tsx, v4.tsx, groove.tsx and the chorus
// worlds. The same recipe as the verses: a camera variant of each world's hero move per shot, painted plates behind,
// girls lit by the scene, a cover transition on every world change and a shock inside one. The camera punches on
// every downbeat in the verses and on every hit (each second beat) in the scream, the breakdown and the solo,
// hardest in the breakdown; the whisper holds still.
import { AbsoluteFill } from 'remotion';
import { type CameraPose, project, typePlane, type Vec3 } from '../../camera/camera.ts';
import { Card, type CardLight } from '../../cards/Card.tsx';
import { EVENTS } from '../../events.ts';
import { GRADES, type Grade, metalGrade } from '../../grade/grade.ts';
import { clamp01, type Hex, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { lineTokens } from '../../lyrics/LyricLayer.tsx';
import { Dissolve, dissolvePlan, dissolveState } from '../../particles/dissolve.tsx';
import { type Burst, Field } from '../../particles/field.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { FLOOR_Y } from '../../stage/floor.ts';
import { barPos, sec } from '../../timing.ts';
import { SceneTransition, type TransitionSpec, transitionWindow } from '../../transitions/scene/scene.tsx';
import { FormDefs } from '../../type/forms/common.tsx';
import { familyOf } from '../../type/fonts.tsx';
import { Svg } from '../../type/Svg.tsx';
import { CATHEDRAL_CAMERA, CathedralWorld, CHEVRON_TUNNEL_CAMERA, ChevronTunnelWorld, FORGE_CAMERA, ForgeWorld } from '../../worlds/groove.tsx';
import { GlowBox } from '../../worlds/kit/index.ts';
import { PlateLayer } from '../../worlds/plate.tsx';
import { SUBWAY_CAMERA, SubwayWorld, TERMINAL_CAMERA, TerminalWorld } from '../../worlds/v1.tsx';
import { RAILS_CAMERA, RailsWorld } from '../../worlds/v2.tsx';
import { BLAME_CAMERA, BLAME_GUTTERS, BlameWorld, CALLGRID_CAMERA, CallGridWorld, COUNTDOWN_FRAME, PIPELINE_CAMERA, PipelineWorld, SQUASH_CAMERA, SquashWorld } from '../../worlds/v3.tsx';
import { CASE_LINE, GUILTY_TAG, LASERCASE_CAMERA, LaserCaseWorld, NAMETAG_CAMERA, NameTagWorld, WHISPER_CAMERA, WhisperWorld, WHITESPACE_CAMERA, WhitespaceWorld } from '../../worlds/v4.tsx';
import { Arena, CYAN, InsertWorld, RED, SplitWorld } from '../chorus/worlds.tsx';
import { focusOf, type Hero, poseAt, shotIn, variant } from '../shotkit.ts';
import { BLUE_METAL_AT, type Move, PUSH, RBLUE, REST_TYPE, type RestScene, RORANGE, type RShot, RSHOTS, SCREAM, SOLO, WHISPER } from './plan.ts';
import { type Box, RestType } from './type.tsx';

const cam = (position: Vec3, target: Vec3, fov = 40): CameraPose => ({ position, target, fov });
const FACE_CAMERA: Hero = { from: cam([0, 0, 12.4], [0, 0, 0]), to: cam([0, 0.2, 11.2], [0, 0.2, 0]) };
const ARENA_CAMERA: Hero = { from: cam([-6, 1.4, 14], [0, -1, -1], 44), to: cam([4, 1.0, 12.5], [0, -1, -1], 44) };
const HERO: Record<RestScene, Hero> = {
  rails: RAILS_CAMERA, subway: SUBWAY_CAMERA, squash: SQUASH_CAMERA, blame: BLAME_CAMERA, pipeline: PIPELINE_CAMERA, callgrid: CALLGRID_CAMERA,
  whitespace: WHITESPACE_CAMERA, nametag: NAMETAG_CAMERA, lasercase: LASERCASE_CAMERA, scream: FACE_CAMERA, cathedral: CATHEDRAL_CAMERA,
  forge: FORGE_CAMERA, warning: TERMINAL_CAMERA, pushface: FACE_CAMERA, whisper: WHISPER_CAMERA, tunnel: CHEVRON_TUNNEL_CAMERA, arena: ARENA_CAMERA, duel: FACE_CAMERA,
  faceO: FACE_CAMERA, faceB: FACE_CAMERA, panel: FACE_CAMERA,
};
/** Painted plates (trial): night for the rebase, Burak's approved worlds for the rest; the code worlds alone where no plate fits. */
const PLATES: Partial<Record<RestScene, string>> = { rails: 'W12', subway: 'W10', squash: 'W08', blame: 'W01', pipeline: 'W05', lasercase: 'W01', cathedral: 'W04', forge: 'W11', arena: 'W09' };
/** Cover colours at about the plates' mean luminance (round 6's flash lesson). */
const COLORS: Record<RestScene, [Hex, Hex]> = {
  rails: ['#6a3cd8', '#e0508a'], subway: ['#2765ff', '#7d38ff'], squash: ['#d23d2a', '#3a5eee'], blame: ['#2765ff', '#19a0e0'], pipeline: ['#e9320b', '#c84a10'],
  callgrid: ['#8a3cd8', '#e0508a'], whitespace: ['#2765ff', '#e9320b'], nametag: ['#d8602a', '#7d38ff'], lasercase: ['#e92645', '#2765ff'], scream: ['#ff2217', '#2d63fb'],
  cathedral: ['#c81e2a', '#e9620b'], forge: ['#e9320b', '#ffb020'], warning: ['#ff2217', '#c84a10'], pushface: ['#ff2217', '#e9620b'], whisper: ['#2a3a6a', '#4a5a8a'],
  tunnel: ['#e9320b', '#c81e2a'], arena: ['#2d63fb', '#e92645'], duel: ['#226de5', '#ff2222'], faceO: ['#ff2217', '#e9620b'], faceB: ['#2d63fb', '#19c8ff'], panel: ['#7a3cff', '#ff3d9a'],
};
const TRANSITIONS: TransitionSpec[] = RSHOTS.filter((s) => !s.fade).map((s) => {
  const i = RSHOTS.indexOf(s);
  const cover = i === 0 || (RSHOTS[i - 1] as RShot).scene !== s.scene;
  return { id: `r-tr-${s.id}`, kind: cover ? (s.into === 'shock' ? 'streaks' : (s.into ?? 'streaks')) : 'shock', at: s.t, pre: cover ? 5 / 60 : 0, post: cover ? 10 / 60 : 14 / 60, colors: COLORS[s.scene] };
});

const tk = (line: number, k: number) => lineTokens(line)[k]?.start ?? 0;
const HITS = EVENTS.filter((e) => e.kind === 'hit').map((e) => e.t);
const SPARKS = EVENTS.filter((e) => e.kind === 'spark').map((e) => e.t);
/** Verses 3-4: the camera punches on every sung word and on every second beat (round 7b, lyric-locked hits). */
const VERSE_PUNCHES = [
  ...[23, 24, 25, 26, 27, 28, 29, 38, 39, 40, 41, 42, 43].flatMap((l) => lineTokens(l).map((x) => x.start)),
  ...EVENTS.filter((e) => e.kind === 'accent').map((e) => e.t),
].sort((a, b) => a - b);
const MOVES: readonly Move[] = ['push', 'orbit', 'whip', 'dollyzoom'];
/** The breakdown shots where orange stands on the giant ENTER key. */
const KEY_SHOTS: readonly string[] = ['push-hall', 'push-git', 'push-orbit'];
/** 1 on a metal kick, falling to 0 over 0.25 s. */
const kickW = (t: number): number => {
  const h = [...HITS].reverse().find((x) => t >= x);
  return h === undefined ? 0 : Math.max(0, 1 - (t - h) / 0.25);
};

/** A shot's camera move about the girl it frames (round 7b: a camera move on every line). k: 0..1 across the shot,
 *  u: seconds into it. */
const moved = (pose: CameraPose, move: Move, k: number, u: number, focus: Vec3, dir: number): CameraPose => {
  const rel: Vec3 = [pose.position[0] - focus[0], pose.position[1] - focus[1], pose.position[2] - focus[2]];
  if (move === 'push') {
    const d = 1 - 0.38 * outQuad(k);
    return { ...pose, position: [focus[0] + rel[0] * d, focus[1] + rel[1] * d, focus[2] + rel[2] * d] };
  }
  if (move === 'orbit') {
    const a = dir * (-0.42 + 0.84 * k);
    const c = Math.cos(a);
    const sn = Math.sin(a);
    return { ...pose, position: [focus[0] + rel[0] * c + rel[2] * sn, pose.position[1], focus[2] - rel[0] * sn + rel[2] * c], target: focus };
  }
  if (move === 'whip') {
    // a whip pan into the shot: the aim swings in from one side over 11 frames, then drifts on
    const w = 1 - outQuad(clamp01(u / (11 / 60)));
    return { ...pose, target: [pose.target[0] + dir * 3.5 * w, pose.target[1], pose.target[2]], roll: (pose.roll ?? 0) + dir * 0.1 * w };
  }
  // dolly zoom on the accent: the camera closes in while the lens widens, so she holds size and the world stretches
  const d = 1 - 0.45 * k;
  const fov = Math.min(78, (2 * Math.atan(Math.tan((pose.fov * Math.PI) / 360) / d) * 180) / Math.PI);
  return { ...pose, position: [focus[0] + rel[0] * d, focus[1] + rel[1] * d, focus[2] + rel[2] * d], fov };
};
/** The metal kick: a jolt stepped every 3 frames over 0.25 s (the accent step, not a smooth wobble). */
const kick = (pose: CameraPose, t: number, amp: number): CameraPose => {
  const h = [...HITS].reverse().find((x) => t >= x);
  if (h === undefined || t - h > 0.25) return pose;
  const w = 1 - (t - h) / 0.25;
  const r = seeded(`r-kick:${Math.floor(t * 20)}`);
  const d = amp * w;
  return { ...pose, position: [pose.position[0] + r.range(-d, d), pose.position[1] + r.range(-d, d), pose.position[2]], roll: (pose.roll ?? 0) + r.range(-0.04, 0.04) * w };
};

const BLUE_DISCO: Grade = { ...GRADES.reviewed, amount: 0.42 };
const BLUE_METAL: Grade = metalGrade({ ...GRADES.reviewed, amount: 0.42 }, 1);
const ORANGE_METAL: Grade = metalGrade(GRADES.mainline, 1);

// blue turns metal on the scream's downbeat: her shocked disco face scatters, her metal scream gathers
const BLUE_TURN = dissolvePlan({ id: 'r-blue-metal', t0: SCREAM.start - 20 / 60, scatterFrames: 20, gatherFrames: 12, from: { card: 'BX3', at: { x: -4.4, feet: -5.4, height: 10.5, z: 0 } }, to: { card: 'BMX2', at: { x: -4.2, feet: -5.4, height: 10.5, z: 0 } } });

const lightOf = (who: 'B' | 'O', t: number, scene: RestScene): CardLight => {
  const metalScene = scene === 'cathedral' || scene === 'forge' || scene === 'tunnel' || scene === 'warning' || scene === 'pushface';
  const key: Hex = metalScene ? '#ff5a1a' : who === 'B' ? CYAN : '#ff3a14';
  if (scene === 'whisper') return { key: '#9fb8ff', keyAmt: 0.25, rim: 0.7 };
  return { key, keyAmt: 0.4, sweep: { x: -9 + (barPos(t) % 1) * 18, width: 0.9, amt: 0.45, color: metalScene ? '#ffd0a0' : '#d8e8ff', slope: 0.3 }, dots: scene === 'arena' ? 0.5 : 0.1, ball: [0, 5.3, -6], rim: 1.4 };
};

export const RestShot = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const { shot, k } = shotIn(RSHOTS, t);
  const scene = shot.scene;
  const blueP = poseAt(RBLUE, t);
  const orangeP = poseAt(RORANGE, t);
  const focus = focusOf(blueP && (scene === 'subway' || scene === 'blame' || scene === 'whitespace' || scene === 'nametag' || scene === 'whisper') ? blueP : (orangeP ?? blueP));
  const idx = RSHOTS.indexOf(shot);
  const chosen = shot.move ?? MOVES[idx % MOVES.length];
  const move: Move | undefined = scene === 'whisper' ? undefined : t >= SOLO.start && chosen !== 'push' ? 'push' : chosen;
  const dir = idx % 2 ? 1 : -1;
  const raw = variant(HERO[scene], shot.cam, k, focus);
  const base = move ? moved(raw, move, k, t - shot.t, focus, dir) : raw;
  const planeBase = variant(HERO[scene], shot.cam, 0, focus);
  // the punch: every sung word and second beat in the verses, every kick in the scream, breakdown and solo (with a
  // stepped shake, hardest in the breakdown); the whisper holds still
  const heavy = t >= SCREAM.start && t < WHISPER.start;
  const quiet = t >= WHISPER.start && t < SOLO.start;
  const metal = t >= SCREAM.start && !quiet;
  const hits = metal ? HITS : VERSE_PUNCHES;
  const h = [...hits].reverse().find((x) => t >= x) ?? 0;
  // the solo sits just under the chorus: its kicks are lighter than the scream's and the breakdown's
  const solo = t >= SOLO.start;
  const amt = quiet ? 0 : t >= PUSH.start && heavy ? 0.1 : solo ? 0.035 : metal ? 0.09 : 0.06;
  const punchedPose: CameraPose = { ...base, fov: base.fov * (1 - amt * (1 - outQuad(clamp01((t - h) * 6)))) };
  const pose = metal ? kick(punchedPose, t, t >= PUSH.start && heavy ? 0.3 : solo ? 0.07 : 0.26) : punchedPose;
  const plane = typePlane(pose, planeBase, 1);
  // anchors: where the world's objects sit on the type plane's screen
  const P = (v: Vec3) => project(planeBase, v);
  const rect = (r: { centre: Vec3; width: number; height: number }): Box => {
    const a = P([r.centre[0] - r.width / 2, r.centre[1] + r.height / 2, r.centre[2]]);
    const b = P([r.centre[0] + r.width / 2, r.centre[1] - r.height / 2, r.centre[2]]);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  };
  const gTop = P(BLAME_GUTTERS.far);
  const gBot = P(BLAME_GUTTERS.near);
  const anchors = {
    // the line is typed beside the canyon's gutter column, as large as the frame allows
    gutter: scene === 'blame' ? { x: Math.max(120, gTop.x + 40), y: 180, w: 1400, h: 560 } : undefined,
    countdown: scene === 'callgrid' ? rect(COUNTDOWN_FRAME) : undefined,
    tag: scene === 'nametag' ? rect(GUILTY_TAG) : undefined,
    caseLine: scene === 'lasercase' ? rect(CASE_LINE) : undefined,
  };
  const fails = [tk(27, 1), tk(27, 2), tk(27, 3), tk(28, 1), tk(28, 2), tk(28, 3)];
  const bursts: Burst[] = ([
    { t: tk(25, 6), origin: [0, 0.5, 0] },
    { t: tk(43, 3), origin: [0, 0, -1] },
    { t: SCREAM.start, origin: [0, 1, 0] },
    { t: tk(45, 0), origin: [0, 0, 0] },
    { t: tk(46, 0), origin: [3, -3, 0] },
    { t: tk(46, 0) + 0.05, origin: [3, -3, 0.5] },
    { t: tk(47, 0), origin: [0, 1, 0] },
    ...SPARKS.map((x, i) => ({ t: x, origin: [i % 2 ? 3 : -3, -1, 0] })),
  ] as Burst[]).filter((b) => t >= b.t && t - b.t < 1.2).sort((a, b) => a.t - b.t).slice(-4);
  const world = (() => {
    switch (scene) {
      case 'rails':
        return <RailsWorld t={t} plate="shot" split={tk(23, 1)} />;
      case 'subway':
        return <SubwayWorld t={t} plate="shot" lit={{ main: 1, feature: 0.6, stable: 1 }} />;
      case 'squash':
        return <SquashWorld t={t} plate="shot" squash={tk(25, 6)} />;
      case 'blame':
        return <BlameWorld t={t} plate="shot" />;
      case 'pipeline':
        return <PipelineWorld t={t} plate="shot" fails={fails} />;
      case 'callgrid':
        return <CallGridWorld t={t} off={tk(29, 6)} />;
      case 'whitespace':
        return <WhitespaceWorld t={t} />;
      case 'nametag':
        return <NameTagWorld t={t} reveal={tk(40, 4)} />;
      case 'lasercase':
        return <LaserCaseWorld t={t} plate="shot" smash={tk(43, 3)} />;
      case 'scream':
      case 'duel':
        return <SplitWorld t={t} hit={[...HITS].reverse().find((x) => t >= x) ?? t} />;
      case 'cathedral':
        return <CathedralWorld t={t} plate="shot" hits={HITS} />;
      case 'forge':
        return <ForgeWorld t={t} plate="shot" hits={HITS} />;
      case 'tunnel':
        return <ChevronTunnelWorld t={t} hits={HITS} />;
      case 'warning':
        return <TerminalWorld t={t} fail={shot.t} />;
      case 'pushface':
        return <InsertWorld t={t} color={RED} hit={tk(47, 0)} />;
      case 'faceO':
        return <InsertWorld t={t} color={RED} hit={shot.t} />;
      case 'faceB':
        return <InsertWorld t={t} color={CYAN} hit={shot.t} />;
      case 'panel':
        // a moment painting: pushed in, shaken on the kicks by the shot camera, parallax against the particles
        return <PlateLayer id={shot.panel as string} base={planeBase} panel dist={30} gain={1} margin={1.25} />;
      case 'whisper':
        return <WhisperWorld t={t} />;
      case 'arena':
        return <Arena t={t} stomps={[]} embers={[]} lasers={1.4} led={['#ff3014', '#ffb020']} plate />;
    }
  })();
  const blueGrade = t >= BLUE_METAL_AT ? BLUE_METAL : BLUE_DISCO;
  const figure = (who: 'B' | 'O', pp: ReturnType<typeof poseAt>, opacity = 1) => {
    if (!pp?.at) return null;
    const clip = scene === 'scream' || scene === 'duel' ? { x: 0, keep: who === 'B' ? ('left' as const) : ('right' as const) } : undefined;
    const grounded = (pp.at.feet ?? FLOOR_Y) === FLOOR_Y;
    return <Card key={`${who}-${pp.card}`} id={pp.card as string} t={t} grade={who === 'B' ? blueGrade : ORANGE_METAL} {...pp.at} opacity={opacity} rimDir={[who === 'B' ? 1 : -1, 0.3]} rival={who === 'B' ? '#ff3a14' : '#19c8ff'} clip={clip} light={lightOf(who, t, scene)} ground={grounded ? undefined : false} />;
  };
  const turn = dissolveState(BLUE_TURN, t);
  const blueFig = turn.active ? <>{figure('B', { t: 0, card: 'BX3', at: BLUE_TURN.from?.at }, turn.fromOpacity)}{figure('B', { t: 0, card: 'BMX2', at: BLUE_TURN.to?.at }, turn.toOpacity)}</> : figure('B', blueP);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Stage pose={pose}>
        {/* the moves (whip, orbit, dolly zoom) swing past the opening frame, so the plate overflows more */}
        {PLATES[scene] && <PlateLayer id={PLATES[scene] as string} base={planeBase} margin={1.75} />}
        {world}
        {!quiet && <Field t={t} grade={t >= SCREAM.start ? ORANGE_METAL : BLUE_DISCO} layer="back" density={0.7} hueMix={0.5} metal={t >= SCREAM.start ? 0.7 : 0.3} bursts={bursts} />}
        {/* GIT!: she stands on a giant glowing ENTER key that pulses with every kick */}
        {KEY_SHOTS.includes(shot.id) && orangeP?.at && <GlowBox position={[orangeP.at.x, FLOOR_Y + 0.22, (orangeP.at.z ?? 0) + 0.4]} size={[3.8, 0.44, 3.0]} color="#ff3014" edge={1} fill={0.45 + 0.4 * kickW(t)} />}
        {blueFig}
        {figure('O', orangeP)}
        {turn.active && <Dissolve plan={BLUE_TURN} t={t} grade={BLUE_METAL} />}
        {!quiet && <Field t={t} grade={BLUE_DISCO} layer="front" density={0.5} hueMix={0.5} metal={t >= SCREAM.start ? 0.7 : 0.3} bursts={bursts} />}
      </Stage>
      <Svg>
        <FormDefs />
        <g transform={plane.transform}>
          <RestType entries={REST_TYPE.filter((e) => e.form !== 'Shout')} t={t} anchors={anchors} />
        </g>
        <RestType entries={REST_TYPE.filter((e) => e.form === 'Shout')} t={t} anchors={anchors} />
        {scene === 'warning' && <WarningScreen t={t} t0={shot.t} />}
        {/* PUSH!: the smash sends a shockwave ring out across the floor from her fists */}
        {t >= tk(46, 0) && t < tk(46, 0) + 0.55 && orangeP?.at && (() => {
          const c = project(pose, [orangeP.at.x, FLOOR_Y, orangeP.at.z ?? 0]);
          return [0, 0.1].map((d) => {
            const u = clamp01((t - tk(46, 0) - d) / 0.45);
            return <ellipse key={d} cx={c.x} cy={c.y} rx={60 + 1500 * outQuad(u)} ry={(60 + 1500 * outQuad(u)) * 0.28} fill="none" stroke="#ffd0a0" strokeWidth={26 * (1 - u)} opacity={1 - u} />;
          });
        })()}
        {/* out of the whisper's near-black the solo opens up over 0.6 s instead of jumping bright (a flash pair) */}
        {t >= SOLO.start && t < SOLO.start + 0.6 && <rect x={0} y={0} width={1920} height={1080} fill="#000" opacity={0.8 * (1 - (t - SOLO.start) / 0.6)} />}
        {TRANSITIONS.map((s) => {
          const [a, b] = transitionWindow(s);
          return t >= a && t < b ? <SceneTransition key={s.id} spec={s} t={t} /> : null;
        })}
      </Svg>
    </AbsoluteFill>
  );
};

/** The warning screen of the breakdown: `git push --force` typed key by key, then the remote's refusal and the
 *  forced update, red on the terminal room's wall. */
const WARNING = ['$ git push --force origin main', 'warning: you are about to rewrite remote history', '! [remote rejected] main -> main (protected branch)', '+ 4f2c1e9...b07a1d3 main -> main (forced update)'];
const WarningScreen = ({ t, t0 }: { t: number; t0: number }) => {
  const u = t - t0;
  return (
    <g fontFamily={familyOf('jetbrains')} fontWeight={800}>
      <rect x={260} y={210} width={1400} height={420} rx={18} fill="#0a0406" fillOpacity={0.82} stroke="#ff3b3b" strokeWidth={4} />
      {WARNING.map((line, i) => {
        const start = i * 0.42;
        const n = Math.max(0, Math.min(line.length, Math.floor((u - start) * (i === 0 ? 22 : 60))));
        if (n === 0) return null;
        return <text key={i} x={300} y={300 + i * 92} fontSize={i === 0 ? 46 : 36} fill={i === 0 ? '#ffffff' : i === 2 ? '#ff3b3b' : '#ffb07a'}>{line.slice(0, n)}</text>;
      })}
    </g>
  );
};

export const REST_START = RSHOTS[0]?.t ?? 0;
