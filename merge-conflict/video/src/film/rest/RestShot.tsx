// Verse 3 (rebase), verse 4 (trade), the scream, GIT! PUSH! FORCE!, the whisper and the guitar solo (64.15-140.04 s,
// round 7), drawn from the shot table in plan.ts on the worlds of worlds/v3.tsx, v4.tsx, groove.tsx and the chorus
// worlds. The same recipe as the verses: a camera variant of each world's hero move per shot, painted plates behind,
// girls lit by the scene, a cover transition on every world change and a shock inside one. The camera punches on
// every downbeat in the verses and on every hit (each second beat) in the scream, the breakdown and the solo,
// hardest in the breakdown; the whisper holds still.
import { AbsoluteFill } from 'remotion';
import { useLayer, useShotBackground } from '../../layer.ts';
import { type CameraPose, project, typePlane, type Vec3 } from '../../camera/camera.ts';
import { Card, type CardLight, type Placement } from '../../cards/Card.tsx';
import { EVENTS } from '../../events.ts';
import { GRADES, type Grade, metalGrade } from '../../grade/grade.ts';
import { clamp01, type Hex, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { lineTokens } from '../../lyrics/LyricLayer.tsx';
import { Dissolve, dissolvePlan, dissolveState } from '../../particles/dissolve.tsx';
import { type Burst, Field } from '../../particles/field.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { FLOOR_Y } from '../../stage/floor.ts';
import { barPos, sec, sectionNamed } from '../../timing.ts';
import { clipKind, SceneTransition, type TransitionSpec, transitionWindow } from '../../transitions/scene/scene.tsx';
import { FormDefs } from '../../type/forms/common.tsx';
import { Svg } from '../../type/Svg.tsx';
import { CATHEDRAL_CAMERA, CathedralWorld, CHEVRON_TUNNEL_CAMERA, ChevronTunnelWorld, FORGE_CAMERA, ForgeWorld } from '../../worlds/groove.tsx';
import { GlowBox } from '../../worlds/kit/index.ts';
import type { ShotState, Subject } from '../framing.ts';
import { liveCamera } from '../livecam.ts';
import { PlateLayer } from '../../worlds/plate.tsx';
import { SUBWAY_CAMERA, SubwayWorld } from '../../worlds/v1.tsx';
import { RAILS_CAMERA, RailsWorld } from '../../worlds/v2.tsx';
import { BLAME_CAMERA, BLAME_GUTTERS, BlameWorld, CALLGRID_CAMERA, CallGridWorld, COUNTDOWN_FRAME, PIPELINE_CAMERA, PipelineWorld, SQUASH_CAMERA, SquashWorld } from '../../worlds/v3.tsx';
import { CASE_LINE, GUILTY_TAG, LASERCASE_CAMERA, LaserCaseWorld, NAMETAG_CAMERA, NameTagWorld, WHISPER_CAMERA, WhisperWorld, WHITESPACE_CAMERA, WhitespaceWorld } from '../../worlds/v4.tsx';
import { Arena, CYAN, InsertWorld, RED, SplitWorld } from '../chorus/worlds.tsx';
import { focusOf, type Hero, poseAt, shotIn, variant } from '../shotkit.ts';
import { BLUE_METAL_AT, type Move, PUSH, RBLUE, REST_TYPE, type RestScene, RORANGE, type RShot, RSHOTS, SCREAM, SOLO, WHISPER } from './plan.ts';
import { type Box, GitHud, RestType, restOnScreen } from './type.tsx';

const cam = (position: Vec3, target: Vec3, fov = 40): CameraPose => ({ position, target, fov });
const FACE_CAMERA: Hero = { from: cam([0, 0, 12.4], [0, 0, 0]), to: cam([0, 0.2, 11.2], [0, 0.2, 0]) };
const ARENA_CAMERA: Hero = { from: cam([-6, 1.4, 14], [0, -1, -1], 44), to: cam([4, 1.0, 12.5], [0, -1, -1], 44) };
const HERO: Record<RestScene, Hero> = {
  rails: RAILS_CAMERA, subway: SUBWAY_CAMERA, squash: SQUASH_CAMERA, blame: BLAME_CAMERA, pipeline: PIPELINE_CAMERA, callgrid: CALLGRID_CAMERA,
  whitespace: WHITESPACE_CAMERA, nametag: NAMETAG_CAMERA, lasercase: LASERCASE_CAMERA, scream: FACE_CAMERA, cathedral: CATHEDRAL_CAMERA,
  forge: FORGE_CAMERA, pushface: FACE_CAMERA, whisper: WHISPER_CAMERA, tunnel: CHEVRON_TUNNEL_CAMERA, arena: ARENA_CAMERA, duel: FACE_CAMERA,
  faceO: FACE_CAMERA, faceB: FACE_CAMERA, panel: FACE_CAMERA,
};
/** Painted plates (trial): night for the rebase, Burak's approved worlds for the rest; the code worlds alone where no plate fits. */
const PLATES: Partial<Record<RestScene, string>> = { rails: 'W12', subway: 'W10', squash: 'W08', blame: 'W01', pipeline: 'W05', lasercase: 'W01', cathedral: 'W04', forge: 'W11', arena: 'W09' };
/** Cover colours at about the plates' mean luminance (round 6's flash lesson). */
const COLORS: Record<RestScene, [Hex, Hex]> = {
  rails: ['#6a3cd8', '#e0508a'], subway: ['#2765ff', '#7d38ff'], squash: ['#d23d2a', '#3a5eee'], blame: ['#2765ff', '#19a0e0'], pipeline: ['#e9320b', '#c84a10'],
  callgrid: ['#8a3cd8', '#e0508a'], whitespace: ['#2765ff', '#e9320b'], nametag: ['#d8602a', '#7d38ff'], lasercase: ['#e92645', '#2765ff'], scream: ['#ff2217', '#2d63fb'],
  cathedral: ['#c81e2a', '#e9620b'], forge: ['#e9320b', '#ffb020'], pushface: ['#ff2217', '#e9620b'], whisper: ['#2a3a6a', '#4a5a8a'],
  tunnel: ['#e9320b', '#c81e2a'], arena: ['#2d63fb', '#e92645'], duel: ['#226de5', '#ff2222'], faceO: ['#ff2217', '#e9620b'], faceB: ['#2d63fb', '#19c8ff'], panel: ['#7a3cff', '#ff3d9a'],
};
// a painting cut into the metal part takes a fire cover in the metal palette, not the disco panels' violet
const METAL_PANEL: [Hex, Hex] = ['#e9320b', '#ff2a14'];
const tk = (line: number, k: number) => lineTokens(line)[k]?.start ?? 0;

/** Round 7d ("Covers are events, not punctuation"): from the scream on, an opaque cover fires at most once per
 *  COVER_GAP seconds and lasts COVER_FRAMES frames (2 before the cut, 4 after); every other world change there is a
 *  hard cut on the beat, and from PUSH! to FORCE! no transition plays at all (the smash, the ring and the throw read
 *  as one chain). Before the scream the covers stay as approved (15 frames). */
export const COVER_GAP = 4;
export const COVER_FRAMES = 6;
export const PUSH_SPAN: readonly [number, number] = [tk(46, 0), tk(47, 0)];
const TRANSITIONS: TransitionSpec[] = (() => {
  let last = -Infinity;
  return RSHOTS.flatMap((s, i): TransitionSpec[] => {
    const cover = i === 0 || (RSHOTS[i - 1] as RShot).scene !== s.scene;
    const metal = s.t >= SCREAM.start;
    if (metal && s.t >= PUSH_SPAN[0] - 1e-6 && s.t <= PUSH_SPAN[1] + 1e-6) return [];
    const colors = s.scene === 'panel' && metal ? METAL_PANEL : COLORS[s.scene];
    if (!cover) return [{ id: `r-tr-${s.id}`, kind: 'shock', at: s.t, pre: 0, post: 14 / 60, colors, origin: [960, 980] }];
    if (metal) {
      // a painting enters the solo on a hard cut: a 6-frame cover into it dipped dark and flashed back, and with the
      // hard cuts around it the 133 s window counted 5 flashes a second (round 7d)
      if (s.t - last < COVER_GAP || (s.scene === 'panel' && s.t >= SOLO.start)) return [];
      last = s.t;
    }
    const kind = clipKind(s.into === 'shock' ? 'streaks' : (s.into ?? 'streaks'), metal, i);
    return [{ id: `r-tr-${s.id}`, kind, at: s.t, pre: (metal ? 2 : 5) / 60, post: (metal ? COVER_FRAMES - 2 : 10) / 60, colors }];
  });
})();
/** The opaque covers of verse 3 through the solo, for tools/covercheck.mjs: id, kind and [start, end) window. */
export const restCovers = (): { id: string; kind: string; window: [number, number] }[] =>
  TRANSITIONS.filter((s) => s.kind !== 'shock').map((s) => ({ id: s.id, kind: s.kind, window: transitionWindow(s) }));
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
const moved = (pose: CameraPose, move: Move, k: number, u: number, focus: Vec3, dir: number, pushDepth = 0.38): CameraPose => {
  if (move === 'hold') return pose;
  const rel: Vec3 = [pose.position[0] - focus[0], pose.position[1] - focus[1], pose.position[2] - focus[2]];
  if (move === 'push') {
    const d = 1 - pushDepth * outQuad(k);
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
  return { ...pose, position: [pose.position[0] + r.range(-d, d), pose.position[1] + r.range(-d, d), pose.position[2]], roll: (pose.roll ?? 0) + r.range(-0.04, 0.04) * w * Math.min(1, amp / 0.26) };
};

const BLUE_DISCO: Grade = { ...GRADES.reviewed, amount: 0.42 };
const BLUE_METAL: Grade = metalGrade({ ...GRADES.reviewed, amount: 0.42 }, 1);
const ORANGE_METAL: Grade = metalGrade(GRADES.mainline, 1);

// blue turns metal on the scream's downbeat: her shocked disco face scatters, her metal scream gathers
// (round 7c: both placements come from the plan, where the faces are sized by their face boxes)
const BLUE_TURN = dissolvePlan({ id: 'r-blue-metal', t0: SCREAM.start - 20 / 60, scatterFrames: 20, gatherFrames: 12, from: { card: 'BX3', at: poseAt(RBLUE, SCREAM.start - 0.01)?.at as Placement }, to: { card: 'BMX2', at: poseAt(RBLUE, SCREAM.start)?.at as Placement } });

// GIT! PUSH! FORCE! (round 7c storyboard): the HUD types the command through the build, and the wave throws blue
// back across the frame (from right of centre to left of it in 0.3 s, then she lands and holds)
const shotT = (id: string): number => (RSHOTS.find((s) => s.id === id) as RShot).t;
const PUSH_HUD = { t0: tk(45, 0) + 0.25, t1: tk(46, 0) - 0.6, until: shotT('push-blown') };
// round 7d: the ring enters from the right already moving, reaches her soles 3 frames after the cut and throws her
// from right of centre to the left edge over 0.42 s (>= 40 % of the frame width, measured on the render)
const BLOWN = shotT('push-blown');
const HIT = BLOWN + 3 / 60;
const BLOWN_FROM = 3.6;
const blownK = (t: number): number => (t < HIT || t >= shotT('push-force') ? 0 : clamp01((t - HIT) / 0.42));
const blownDx = (t: number): number => (t < BLOWN || t >= shotT('push-force') ? 0 : BLOWN_FROM - 8.4 * outQuad(blownK(t)));

const lightOf = (who: 'B' | 'O', t: number, scene: RestScene): CardLight => {
  const metalScene = scene === 'cathedral' || scene === 'forge' || scene === 'tunnel' || scene === 'pushface';
  const key: Hex = metalScene ? '#ff5a1a' : who === 'B' ? CYAN : '#ff3a14';
  if (scene === 'whisper') return { key: '#9fb8ff', keyAmt: 0.25, rim: 0.7 };
  return { key, keyAmt: 0.4, sweep: { x: -9 + (barPos(t) % 1) * 18, width: 0.9, amt: 0.45, color: metalScene ? '#ffd0a0' : '#d8e8ff', slope: 0.3 }, dots: scene === 'arena' ? 0.5 : 0.1, ball: [0, 5.3, -6], rim: 1.4 };
};

/** The camera and girls of verse 3 through the solo at t: the shot's variant and move, the punches and kicks. */
const restCamera = (t: number) => {
  const { shot, k } = shotIn(RSHOTS, t);
  const scene = shot.scene;
  const blueP = poseAt(RBLUE, t);
  const orangeP = poseAt(RORANGE, t);
  const focus = focusOf(blueP && (scene === 'subway' || scene === 'blame' || scene === 'whitespace' || scene === 'nametag' || scene === 'whisper') ? blueP : (orangeP ?? blueP));
  const idx = RSHOTS.indexOf(shot);
  const chosen = shot.move ?? MOVES[idx % MOVES.length];
  const move: Move | undefined = scene === 'whisper' || chosen === 'hold' ? undefined : t >= SOLO.start && chosen !== 'push' ? 'push' : chosen;
  const dir = idx % 2 ? 1 : -1;
  // the tunnel's hero move flies the camera through the girls standing in it; a shot travels its first 45 %
  const raw = variant(HERO[scene], shot.cam, scene === 'tunnel' ? k * 0.45 : k, focus);
  // the solo pushes 20 % (its doubled cuts carry the motion, round 7c), every other shot 38 %
  const base = move ? moved(raw, move, k, t - shot.t, focus, dir, t >= SOLO.start ? 0.2 : 0.38) : raw;
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
  // (round 7d: the scream's hard cuts replaced its covers and lifted its motion over the chorus's; its punch and kick
  // came down to hold it at or under the chorus)
  const amt = quiet ? 0 : t >= PUSH.start && heavy ? 0.05 : solo ? 0.035 : metal ? 0.05 : 0.06;
  const punchedPose: CameraPose = { ...base, fov: base.fov * (1 - amt * (1 - outQuad(clamp01((t - h) * 6)))) };
  const pose = metal ? kick(punchedPose, t, t >= PUSH.start && heavy ? 0.12 : solo ? 0.07 : 0.12) : punchedPose;
  return { shot, k, scene, blueP, orangeP, pose, planeBase, quiet, metal, heavy, solo };
};

/** What verse 3 through the solo shows at t, for tools/framecheck.mjs (the cards the component draws). */
const rawRestStateAt = (t: number): ShotState => {
  const { shot, k, scene, blueP: blue0, orangeP: orange0, pose, planeBase } = restCamera(t);
  // a painting shot carries only its own lyric type (round 7d, "Nothing is pasted over a painting")
  const blueP = scene === 'panel' ? null : blue0;
  const orangeP = scene === 'panel' ? null : orange0;
  const clip = (who: 'B' | 'O') => (scene === 'scream' || scene === 'duel' ? { x: 0, keep: who === 'B' ? ('left' as const) : ('right' as const) } : undefined);
  const turn = dissolveState(BLUE_TURN, t);
  const subjects: Subject[] = [];
  const b = turn.active ? (turn.toOpacity >= 0.5 ? { card: 'BMX2', at: BLUE_TURN.to?.at } : { card: 'BX3', at: BLUE_TURN.from?.at }) : blueP;
  // the close variant frames from the chest: a deliberate cut at the knees or below
  const crop = shot.cam === 'close' ? ('knee' as const) : undefined;
  if (b?.card && b.at) subjects.push({ card: b.card, at: b.at, clip: clip('B'), crop, dx: blownDx(t) });
  if (orangeP?.card && orangeP.at) subjects.push({ card: orangeP.card, at: orangeP.at, clip: clip('O'), crop });
  const plateId = scene === 'panel' ? shot.panel : PLATES[scene];
  return { pose, shot: shot.id, subjects, typeBase: planeBase, plate: plateId ? { id: plateId, base: planeBase, dist: scene === 'panel' ? 30 : 46, margin: scene === 'panel' ? 1.25 : 1.75, kb: k } : undefined };
};

const live = liveCamera(rawRestStateAt, (t) => {
  const { shot } = shotIn(RSHOTS, t);
  const next = RSHOTS[RSHOTS.indexOf(shot) + 1];
  // verse 3 ends at chorus 2, the solo at the piano
  const stop = shot.t < sectionNamed('chorus2').start ? sectionNamed('chorus2').start : sectionNamed('piano_interlude').start;
  return { t0: shot.t, t1: Math.min(next?.t ?? stop, stop), key: `r-${shot.id}` };
});
export const restStateAt = live.stateAt;
export const REST_LIVE = live;

export const RestShot = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const layer = useLayer();
  const { shot, k, scene, blueP: blue0, orangeP: orange0, planeBase, quiet } = restCamera(t);
  const blueP = scene === 'panel' ? null : blue0;
  const orangeP = scene === 'panel' ? null : orange0;
  const pose = live.poseAt(t);
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
    gitUntil: shotT('push-charge'),
    pushUntil: shotT('push-blown'),
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
    // the debris the wave throws up with blue
    { t: HIT, origin: [BLOWN_FROM, -2.2, 0.5] },
    { t: HIT + 0.12, origin: [0, -2.4, 0.5] },
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
      case 'pushface':
        return <InsertWorld t={t} color={RED} hit={tk(47, 0)} />;
      case 'faceO':
        return <InsertWorld t={t} color={RED} hit={shot.t} />;
      case 'faceB':
        return <InsertWorld t={t} color={CYAN} hit={shot.t} />;
      case 'panel':
        // a moment painting: pushed in, shaken on the kicks by the shot camera, parallax against the particles
        return <PlateLayer id={shot.panel as string} base={planeBase} panel dist={30} gain={1} kb={k} />;
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
    // thrown by the wave she keeps her own blue (round 7d): the forge's orange key and the metal grade went red on her
    const own = who === 'B' && shot.id === 'push-blown';
    const grade = own ? BLUE_DISCO : who === 'B' ? blueGrade : ORANGE_METAL;
    const light: CardLight = own ? { key: CYAN, keyAmt: 0.35, rim: 0.6 } : lightOf(who, t, scene);
    return <Card key={`${who}-${pp.card}`} id={pp.card as string} t={t} grade={grade} {...pp.at} opacity={opacity} rimDir={[who === 'B' ? 1 : -1, 0.3]} rival={who === 'B' ? '#ff3a14' : '#19c8ff'} clip={clip} light={light} ground={grounded ? undefined : false} dx={who === 'B' ? blownDx(t) : 0} />;
  };
  const turn = dissolveState(BLUE_TURN, t);
  const blueFig = turn.active ? <>{figure('B', { t: 0, card: 'BX3', at: BLUE_TURN.from?.at }, turn.fromOpacity)}{figure('B', { t: 0, card: 'BMX2', at: BLUE_TURN.to?.at }, turn.toOpacity)}</> : figure('B', blueP);
  return (
    <AbsoluteFill style={{ background: useShotBackground() }}>
      <Stage pose={pose}>
        {/* the moves (whip, orbit, dolly zoom) swing past the opening frame, so the plate overflows more */}
        {PLATES[scene] && <PlateLayer id={PLATES[scene] as string} base={planeBase} margin={1.75} />}
        {world}
        {!quiet && <Field t={t} grade={t >= SCREAM.start ? ORANGE_METAL : BLUE_DISCO} layer="back" density={0.7} hueMix={0.5} metal={t >= SCREAM.start ? 1 : 0} dust={t < SCREAM.start} bursts={bursts} />}
        {/* GIT!: she stands on a giant glowing ENTER key that pulses with every kick */}
        {KEY_SHOTS.includes(shot.id) && orangeP?.at && <GlowBox position={[orangeP.at.x, FLOOR_Y + 0.22, orangeP.at.z ?? 0]} size={[3.8, 0.44, 3.0]} color="#ff3014" edge={1} fill={0.45 + 0.4 * kickW(t)} />}
        {blueFig}
        {figure('O', orangeP)}
        {turn.active && <Dissolve plan={BLUE_TURN} t={t} grade={BLUE_METAL} />}
        {!quiet && <Field t={t} grade={BLUE_DISCO} layer="front" density={0.5} hueMix={0.5} metal={t >= SCREAM.start ? 1 : 0} dust={t < SCREAM.start} bursts={bursts} />}
      </Stage>
      <Svg>
        <FormDefs />
        {/* the wave throws blue back: speed streaks trail her across the frame */}
        {blownK(t) > 0 && blownK(t) < 1 && blueP?.at && (() => {
          const c = project(pose, [blueP.at.x + blownDx(t), (blueP.at.feet ?? FLOOR_Y) + blueP.at.height * 0.5, 0]);
          const a = 1 - blownK(t);
          return [-0.3, -0.15, 0, 0.12, 0.26, 0.38].map((v, i) => <line key={i} x1={c.x + 120} y1={c.y + v * 900} x2={c.x + 520 + 260 * a + (i % 2) * 140} y2={c.y + v * 900} stroke="#ffe2c8" strokeWidth={10 - i} strokeLinecap="round" opacity={0.75 * a} />);
        })()}
        {/* PUSH!: the smash sends a shockwave ring out across the floor from her fists */}
        {t >= tk(46, 0) && t < tk(46, 0) + 0.55 && orangeP?.at && (() => {
          const c = project(pose, [orangeP.at.x, FLOOR_Y, orangeP.at.z ?? 0]);
          return [0, 0.1].map((d) => {
            const u = clamp01((t - tk(46, 0) - d) / 0.45);
            return <ellipse key={d} cx={c.x} cy={c.y} rx={60 + 1500 * outQuad(u)} ry={(60 + 1500 * outQuad(u)) * 0.28} fill="none" stroke="#ffd0a0" strokeWidth={26 * (1 - u)} opacity={1 - u} />;
          });
        })()}
        {/* the ring of the smash arrives from the right in the next shot and reaches her soles at HIT */}
        {shot.id === 'push-blown' && t < HIT + 0.35 && blueP?.at && (() => {
          const c = project(pose, [blueP.at.x + BLOWN_FROM + 9, FLOOR_Y, 0]);
          const foot = project(pose, [blueP.at.x + BLOWN_FROM, FLOOR_Y, 0]);
          const rHit = Math.abs(c.x - foot.x);
          // it enters 0.15 s into its growth, so it is already racing when the shot opens
          return [0, 0.06].map((d) => {
            const r = rHit * Math.max(0, (t - d - (BLOWN - 0.15)) / (HIT - (BLOWN - 0.15)));
            const fade = clamp01((HIT + 0.35 - t) / 0.2);
            return <ellipse key={d} cx={c.x} cy={c.y} rx={r} ry={r * 0.28} fill="none" stroke="#ffd0a0" strokeWidth={24 - d * 120} opacity={fade} />;
          });
        })()}
        {layer !== 'type' && TRANSITIONS.map((s) => {
          const [a, b] = transitionWindow(s);
          return t >= a && t < b ? <SceneTransition key={s.id} spec={s} t={t} /> : null;
        })}
        {/* the type over every effect and cover (round 7d: no card or effect is drawn over a settled type form) */}
        <g transform={plane.transform}>
          <RestType entries={REST_TYPE.filter((e) => !restOnScreen(e))} t={t} anchors={anchors} />
        </g>
        <RestType entries={REST_TYPE.filter(restOnScreen)} t={t} anchors={anchors} />
        <GitHud t={t} t0={PUSH_HUD.t0} t1={PUSH_HUD.t1} until={PUSH_HUD.until} />
      </Svg>
    </AbsoluteFill>
  );
};

export const REST_START = RSHOTS[0]?.t ?? 0;
