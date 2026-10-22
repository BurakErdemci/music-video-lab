// The last section (140.04-232.12 s, round 8), drawn from the shot table in plan.ts: the piano truce on the quiet
// stage and two paintings, the build's single continuous flight (the girls rise, scatter into the two branches and
// the camera flies on into the RK3 tree), the final chorus on the chorus's own worlds with the fusion cards, the
// chant and the scream end on the metal worlds, "Build failed" on the intro's terminal, and the outro. The same
// recipe as film/rest/RestShot.tsx: a camera variant of each world's hero move per shot, girls lit by the scene, the
// living camera on top. Round 7d rules from the start: no knockouts (the type is placed off the faces), one cover at
// most every 4 s and at most 6 frames (the other cuts are hard cuts or a shock inside a world).
import { AbsoluteFill } from 'remotion';
import { useLayer, useShotBackground } from '../../layer.ts';
import { type CameraPose, HOME_Z, type Vec3 } from '../../camera/camera.ts';
import { Card, type CardLight, type Placement } from '../../cards/Card.tsx';
import { EVENTS } from '../../events.ts';
import { GRADES, type Grade, metalGrade } from '../../grade/grade.ts';
import { clamp01, type Hex, inQuad, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { Dissolve, dissolvePlan, dissolveState } from '../../particles/dissolve.tsx';
import { type Burst, Field } from '../../particles/field.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { FLOOR_Y } from '../../stage/floor.ts';
import { barPos, beats, sec } from '../../timing.ts';
import { clipKind, SceneTransition, type TransitionSpec, transitionWindow } from '../../transitions/scene/scene.tsx';
import { FormDefs } from '../../type/forms/common.tsx';
import { Svg } from '../../type/Svg.tsx';
import { CATHEDRAL_CAMERA, CathedralWorld, CHEVRON_TUNNEL_CAMERA, ChevronTunnelWorld, FORGE_CAMERA, ForgeWorld } from '../../worlds/groove.tsx';
import { PlateLayer } from '../../worlds/plate.tsx';
import { TERMINAL_CAMERA, TerminalWorld } from '../../worlds/v1.tsx';
import { WHISPER_CAMERA, WhisperWorld } from '../../worlds/v4.tsx';
import { TilePlatform } from '../../worlds/kit/index.ts';
import { Arena, CYAN, InsertWorld, LineWorld, LogoWorld, RED, RunwayWorld, SplitWorld, WallsWorld } from '../chorus/worlds.tsx';
import type { ShotState, Subject } from '../framing.ts';
import { liveCamera } from '../livecam.ts';
import { focusOf, type Hero, poseAt, shotIn, variant } from '../shotkit.ts';
import { BRANCHES_AT, BUILD, CHANT, FAILED, FBLUE, FHITS, FINAL, FINALE_END, FINALE_TYPE, FORANGE, type FScene, type FShot, FSHOTS, type Move, OUTRO, PIANO, RISE, SCREAM_END, tk } from './plan.ts';
import { logoIn } from './logo.ts';
import { FinaleType } from './type.tsx';

const cam = (position: Vec3, target: Vec3, fov = 40, roll = 0): CameraPose => ({ position, target, fov, roll });
const FACE_CAMERA: Hero = { from: cam([0, 0, 12.4], [0, 0, 0]), to: cam([0, 0.2, 11.2], [0, 0.2, 0]) };
const ARENA_CAMERA: Hero = { from: cam([-6, 1.4, 14], [0, -1, -1], 44), to: cam([4, 1.0, 12.5], [0, -1, -1], 44) };
const HERO: Record<FScene, Hero> = {
  panel: FACE_CAMERA, quiet: WHISPER_CAMERA, flight: FACE_CAMERA,
  arena: ARENA_CAMERA, spin: { from: cam([0, 2.2, 15], [0, -1, -1], 44), to: cam([0, 2, 12], [0, -1, -1], 44) }, split: FACE_CAMERA,
  runway: { from: cam([0, -1.6, 10], [0, -1.2, -12], 44), to: cam([0, -2.1, 8], [0, -1.4, -12], 44) },
  walls: { from: cam([0, -0.6, 15], [0, -0.6, -2], 44), to: cam([0, -0.6, 13], [0, -0.6, -2], 44) },
  line: { from: cam([0, 0, 12], [0, 0, -2], 42), to: cam([0, 0, 10], [0, 0, -2], 42) },
  logo: { from: cam([0, 0, HOME_Z + 2], [0, 0, 0]), to: cam([0, 0.2, HOME_Z], [0, 0.2, 0]) },
  title: { from: cam([0, 0, HOME_Z + 2], [0, 0, 0]), to: cam([0, 0.2, HOME_Z], [0, 0.2, 0]) },
  forge: FORGE_CAMERA, cathedral: CATHEDRAL_CAMERA, tunnel: CHEVRON_TUNNEL_CAMERA, marena: ARENA_CAMERA,
  duel: FACE_CAMERA, faceO: FACE_CAMERA, terminal: TERMINAL_CAMERA,
};
/** Painted plates behind the code worlds: the chorus's arena and fire halls, the metal plates from round 7. */
const PLATES: Partial<Record<FScene, string>> = { arena: 'W09', spin: 'W02', runway: 'W01', forge: 'W11', cathedral: 'W04', marena: 'W09' };
const plateMargin = (scene: FScene): number => (scene === 'spin' ? 2.2 : scene === 'arena' || scene === 'runway' || scene === 'marena' ? 1.35 : 1.75);
/** Cover colours at about the plates' mean luminance (round 6's flash lesson). */
const COLORS: Record<FScene, [Hex, Hex]> = {
  panel: ['#7a3cff', '#ff3d9a'], quiet: ['#2a3a6a', '#4a5a8a'], flight: ['#2a3a6a', '#7a3cff'], arena: ['#2d63fb', '#e92645'], spin: ['#2d63fb', '#e92645'],
  split: ['#226de5', '#ff2222'], runway: ['#1979bc', '#9a2aff'], walls: ['#3a5eee', '#cd3251'], line: ['#ae1ede', '#ff4fd8'], logo: ['#733cff', '#dc2473'],
  title: ['#733cff', '#dc2473'], forge: ['#e9320b', '#ffb020'], cathedral: ['#c81e2a', '#e9620b'], tunnel: ['#e9320b', '#c81e2a'], marena: ['#e9320b', '#2d63fb'],
  duel: ['#226de5', '#ff2222'], faceO: ['#ff2217', '#e9620b'], terminal: ['#c81e2a', '#2a3a6a'],
};
const METAL_PANEL: [Hex, Hex] = ['#e9320b', '#ff2a14'];

// ---- transitions (round 7d "Covers are events"): an opaque cover at most once per 4 s, 6 frames long; a cut inside
// one world is a shock ring from the floor; any other cut is a hard cut on its word or beat
const COVER_GAP = 4;
const TRANSITIONS: TransitionSpec[] = (() => {
  const out: TransitionSpec[] = [];
  let lastCover = -Infinity;
  FSHOTS.forEach((s, i) => {
    if (i === 0 || s.fade) return;
    const prev = FSHOTS[i - 1] as FShot;
    const metal = s.t >= CHANT.start;
    const colors = s.scene === 'panel' && metal ? METAL_PANEL : COLORS[s.scene];
    const sameWorld = prev.scene === s.scene && s.scene !== 'panel';
    if (!sameWorld && s.into && s.into !== 'shock' && s.t - lastCover >= COVER_GAP) {
      lastCover = s.t;
      out.push({ id: `f-tr-${s.id}`, kind: clipKind(s.into, metal, i), at: s.t, pre: 2 / 60, post: 4 / 60, colors });
    } else if (sameWorld && s.into) {
      out.push({ id: `f-tr-${s.id}`, kind: 'shock', at: s.t, pre: 0, post: 14 / 60, colors, origin: [960, 980] });
    }
  });
  return out;
})();

const HITS = EVENTS.filter((e) => e.kind === 'hit' && e.t >= CHANT.start).map((e) => e.t);
/** The metal worlds flash on every second kick: on every beat they flashed 3 times a second, and a cut on top made 4. */
const WORLD_HITS = HITS.filter((_, i) => i % 2 === 0);
const PULSES = EVENTS.filter((e) => e.kind === 'pulse' && e.t >= BUILD.start && e.t < CHANT.start).map((e) => e.t);
const MOVES: readonly Move[] = ['push', 'orbit', 'whip', 'dollyzoom'];

/** A shot's camera move about the girl it frames (as film/rest/RestShot.tsx): k 0..1 across the shot, u seconds in. */
const moved = (pose: CameraPose, move: Move, k: number, u: number, focus: Vec3, dir: number, pushDepth = 0.32): CameraPose => {
  const rel: Vec3 = [pose.position[0] - focus[0], pose.position[1] - focus[1], pose.position[2] - focus[2]];
  if (move === 'still') return pose;
  if (move === 'push') {
    const d = 1 - pushDepth * outQuad(k);
    return { ...pose, position: [focus[0] + rel[0] * d, focus[1] + rel[1] * d, focus[2] + rel[2] * d] };
  }
  if (move === 'orbit') {
    const a = dir * (-0.36 + 0.72 * k);
    const c = Math.cos(a);
    const sn = Math.sin(a);
    return { ...pose, position: [focus[0] + rel[0] * c + rel[2] * sn, pose.position[1], focus[2] - rel[0] * sn + rel[2] * c], target: focus };
  }
  if (move === 'whip') {
    const w = 1 - outQuad(clamp01(u / (11 / 60)));
    return { ...pose, target: [pose.target[0] + dir * 3.5 * w, pose.target[1], pose.target[2]], roll: (pose.roll ?? 0) + dir * 0.1 * w };
  }
  const d = 1 - 0.4 * k;
  const fov = Math.min(78, (2 * Math.atan(Math.tan((pose.fov * Math.PI) / 360) / d) * 180) / Math.PI);
  return { ...pose, position: [focus[0] + rel[0] * d, focus[1] + rel[1] * d, focus[2] + rel[2] * d], fov };
};
/** The metal kick: a jolt stepped every 3 frames over 0.25 s. */
const kick = (pose: CameraPose, t: number, amp: number): CameraPose => {
  const h = [...HITS].reverse().find((x) => t >= x);
  if (h === undefined || t - h > 0.25) return pose;
  const w = 1 - (t - h) / 0.25;
  const r = seeded(`f-kick:${Math.floor(t * 20)}`);
  const d = amp * w;
  return { ...pose, position: [pose.position[0] + r.range(-d, d), pose.position[1] + r.range(-d, d), pose.position[2]], roll: (pose.roll ?? 0) + r.range(-0.03, 0.03) * w };
};

// ---- the build's flight: one camera path over the whole build, accelerating (the build rises bar by bar). The
// fov narrows from 50 to 30 degrees while the camera climbs and closes in: the painting grows from 1.02 to about 1.38
// frame widths (1.15x its pixels at 2K, inside the 1.25x rule) while the particles and the girls rush past in depth.
const flightK = (t: number): number => {
  const u = clamp01((t - BUILD.start) / (BUILD.end - BUILD.start));
  // the speed rises linearly from 0.35 to 1.65 times the mean: moving from the first bar, faster every bar
  return 0.35 * u + 0.65 * u * u;
};
export const flightPose = (t: number): CameraPose => {
  const u = clamp01((t - BUILD.start) / (BUILD.end - BUILD.start));
  const e = flightK(t);
  // a sway that widens as the build rises: the camera's truck works the painting's depth parallax
  const sway = (0.6 + 1.4 * u) * Math.sin(u * Math.PI * 2.2);
  return cam([sway, -1.6 + 2.4 * e, 17 - 7 * e], [0.35 * Math.sin(u * Math.PI * 1.5), 0.2 + 1.4 * e, -20], 50 - 20 * e, (0.02 + 0.04 * u) * Math.sin(u * Math.PI * 3));
};
const FLIGHT_BASE = flightPose(BUILD.start);
/** How far the build's girls have risen (they float up from one knee until they scatter into the branches). */
const riseDy = (t: number): number => 1.1 * outQuad(clamp01((t - BUILD.start) / (BRANCHES_AT - BUILD.start)));
/** The painting ghosts behind the rising girls ("same file, different times": the two poses over each other) and
 *  lights up bar by bar as the build rises (no step: a jump in its light read as a flash and broke the rise). */
const treeGain = (t: number): number => 0.45 + 0.5 * clamp01((t - BUILD.start) / (BUILD.end - BUILD.start));

/** The fusion's grades sit between the disco and the metal ones; the piano's are soft and plain. */
const BLUE_SOFT: Grade = { ...GRADES.reviewed, amount: 0.3 };
const ORANGE_SOFT: Grade = { ...GRADES.mainline, amount: 0.28 };
const BLUE_MIX: Grade = { ...GRADES.reviewed, amount: 0.4 };
const ORANGE_MIX: Grade = metalGrade(GRADES.mainline, 0.45);
const BLUE_METAL: Grade = metalGrade({ ...GRADES.reviewed, amount: 0.42 }, 1);
const ORANGE_METAL: Grade = metalGrade(GRADES.mainline, 1);
const gradeOf = (who: 'B' | 'O', t: number): Grade =>
  t < FINAL.start - 0.1 ? (who === 'B' ? BLUE_SOFT : ORANGE_SOFT) : t < CHANT.start ? (who === 'B' ? BLUE_MIX : ORANGE_MIX) : who === 'B' ? BLUE_METAL : ORANGE_METAL;

/** Worlds with a floor the girls stand on (round 7d grounding: elsewhere the Card and the state say ground: false). */
const FLOOR_SCENES: readonly FScene[] = ['quiet', 'arena', 'spin', 'marena', 'runway', 'walls', 'forge', 'cathedral', 'tunnel', 'terminal'];
const METAL_SCENES: readonly FScene[] = ['forge', 'cathedral', 'tunnel', 'marena', 'duel', 'faceO', 'terminal'];
const lightOf = (who: 'B' | 'O', t: number, scene: FScene): CardLight => {
  if (scene === 'quiet' || scene === 'flight') return { key: who === 'B' ? '#9fc0ff' : '#ffc890', keyAmt: 0.3, rim: 0.9 };
  const metal = METAL_SCENES.includes(scene);
  const key: Hex = metal ? '#ff5a1a' : who === 'B' ? CYAN : '#ff4a1a';
  return { key, keyAmt: 0.4, sweep: { x: -9 + (barPos(t) % 1) * 18, width: 0.9, amt: 0.45, color: metal ? '#ffd0a0' : who === 'B' ? '#bfefff' : '#ffd0b0', slope: 0.3 }, dots: scene === 'arena' || scene === 'spin' || scene === 'logo' || scene === 'marena' ? 0.5 : 0.1, ball: [0, 5.3, -6], rim: 1.4 };
};

// ---- the girls' particle moments: in the piano each girl is rebuilt from the particles of her own git line; in the
// build both scatter into the two branches; the final chorus ends in a burst like the choruses before it
const atOf = (list: typeof FBLUE, t: number): Placement => poseAt(list, t)?.at as Placement;
const GATHER_B = dissolvePlan({ id: 'f-gather-b', t0: tk(49, 0), gatherFrames: 18, to: { card: 'BP1', at: atOf(FBLUE, tk(49, 0)) } });
const GATHER_O = dissolvePlan({ id: 'f-gather-o', t0: tk(50, 0), gatherFrames: 18, to: { card: 'OP1', at: atOf(FORANGE, tk(50, 0)) } });
const risen = (p: Placement): Placement => ({ ...p, feet: (p.feet ?? FLOOR_Y) + riseDy(BRANCHES_AT) });
const SCATTER_B = dissolvePlan({ id: 'f-branch-b', t0: BRANCHES_AT, scatterFrames: 28, from: { card: 'BP2', at: risen(RISE.B) } });
const SCATTER_O = dissolvePlan({ id: 'f-branch-o', t0: BRANCHES_AT, scatterFrames: 28, from: { card: 'OP2', at: risen(RISE.O) } });
const FINAL_BURST_AT = beats.find((x) => x >= 180.7) as number;
const BURST_B = dissolvePlan({ id: 'f-burst-b', t0: FINAL_BURST_AT, scatterFrames: 28, from: { card: 'PB6', at: atOf(FBLUE, FINAL_BURST_AT - 0.01) } });
const BURST_O = dissolvePlan({ id: 'f-burst-o', t0: FINAL_BURST_AT, scatterFrames: 28, from: { card: 'PO6', at: atOf(FORANGE, FINAL_BURST_AT - 0.01) } });
const PLANS = [GATHER_B, GATHER_O, SCATTER_B, SCATTER_O, BURST_B, BURST_O];

/** The camera and girls at t: the shot's variant and move, the punches and kicks. */
const finaleCamera = (t: number) => {
  const { shot, k } = shotIn(FSHOTS, t);
  const scene = shot.scene;
  const blueP = poseAt(FBLUE, t);
  const orangeP = poseAt(FORANGE, t);
  const idx = FSHOTS.indexOf(shot);
  if (scene === 'flight') {
    // the build's pulse: a punch on every beat that grows with the build
    const b = [...PULSES].reverse().find((x) => t >= x) ?? t;
    const amt = 0.025 + 0.035 * flightK(t);
    const p = flightPose(t);
    return { shot, k, scene, blueP, orangeP, pose: { ...p, fov: p.fov * (1 - amt * (1 - outQuad(clamp01((t - b) * 6)))) }, planeBase: FLIGHT_BASE };
  }
  const focus = focusOf(orangeP ?? blueP);
  const move: Move = shot.move ?? (MOVES[idx % MOVES.length] as Move);
  const dir = idx % 2 ? 1 : -1;
  const raw = variant(HERO[scene], shot.cam, scene === 'tunnel' ? k * 0.45 : k, focus);
  const final = t >= FINAL.start - 0.05 && t < CHANT.start;
  const base = moved(raw, move, k, t - shot.t, focus, dir, final && scene !== 'split' && shot.cam !== 'low' ? 0.42 : 0.3);
  const planeBase = variant(HERO[scene], shot.cam, 0, focus);
  const piano = t < BUILD.start;
  const failed = t >= tk(65, 0) && t < SCREAM_END.start;
  // the final chorus punches on every beat like the choruses; the metal parts kick on every beat; the piano and the
  // build-failed stop hold still
  const hits = final ? PULSES : HITS;
  const h = [...hits].reverse().find((x) => t >= x) ?? -10;
  const amt = piano || failed ? 0 : final ? 0.09 : t >= OUTRO.start ? 0.04 : 0.05;
  const punched: CameraPose = { ...base, fov: base.fov * (1 - amt * (1 - outQuad(clamp01((t - h) * 6)))) };
  const pose = !final && !piano && !failed ? kick(punched, t, scene === 'panel' ? 0.06 : 0.1) : punched;
  return { shot, k, scene, blueP, orangeP, pose, planeBase };
};

const subjectsAt = (t: number, scene: FScene, blueP: ReturnType<typeof poseAt>, orangeP: ReturnType<typeof poseAt>): Subject[] => {
  const clip = (who: 'B' | 'O') => (scene === 'split' || scene === 'duel' ? { x: 0, keep: who === 'B' ? ('left' as const) : ('right' as const) } : undefined);
  const apart = scene === 'logo' ? Math.min(260, logoIn(t)) / 120 : 0;
  const out: Subject[] = [];
  for (const [who, p] of [['B', blueP], ['O', orangeP]] as const) {
    if (!p?.card || !p.at) continue;
    if (scattered(who, t)) continue;
    const grounded = FLOOR_SCENES.includes(scene) && (p.at.feet ?? FLOOR_Y) === FLOOR_Y;
    out.push({ card: p.card, at: p.at, clip: clip(who), dx: scene === 'logo' ? (who === 'B' ? -apart : apart) : 0, dy: scene === 'flight' ? riseDy(t) : 0, ...(grounded ? {} : { ground: false as const }) });
  }
  return out;
};
/** A girl scattered into particles (the build's branches, the final chorus's burst) is not drawn from the scatter
 *  on, until her next pose brings her back. */
const scattered = (who: 'B' | 'O', t: number): boolean => {
  const since = poseAt(who === 'B' ? FBLUE : FORANGE, t)?.t ?? -Infinity;
  return PLANS.some((p) => p.from && p.id.endsWith(who === 'B' ? '-b' : '-o') && t >= p.t0 && since <= p.t0);
};
/** A girl gathering from the particles of her git line fades in with them. */
const gatherOpacity = (who: 'B' | 'O', t: number): number => {
  const p = PLANS.find((x) => x.to && x.id.endsWith(who === 'B' ? '-b' : '-o') && dissolveState(x, t).active);
  return p ? dissolveState(p, t).toOpacity : 1;
};

const rawFinaleStateAt = (t: number): ShotState => {
  const { shot, scene, blueP, orangeP, pose, planeBase } = finaleCamera(t);
  const plateId = scene === 'panel' ? shot.panel : scene === 'flight' ? 'RK3' : PLATES[scene];
  const panel = scene === 'panel' || scene === 'flight';
  return { pose, shot: shot.id, subjects: subjectsAt(t, scene, blueP, orangeP), plate: plateId ? { id: plateId, base: planeBase, dist: panel ? 30 : 46, margin: scene === 'flight' ? 1.02 : panel ? 1.25 : plateMargin(scene) } : undefined };
};

const live = liveCamera(rawFinaleStateAt, (t) => {
  const { shot } = shotIn(FSHOTS, t);
  const next = FSHOTS[FSHOTS.indexOf(shot) + 1];
  return { t0: shot.t, t1: next?.t ?? FINALE_END, key: `f-${shot.id}` };
});
export const finaleStateAt = live.stateAt;
export { FINALE_TYPE };

const burstsAt = (t: number): Burst[] =>
  ([
    ...FHITS.yes.map((x) => ({ t: x, origin: [0, 1.5, 0] })),
    { t: FHITS.highfive, origin: [0, 0.8, 0.5] },
    { t: FHITS.lock, origin: [0, 0.5, 0] },
    { t: FHITS.push, origin: [0, 1, 0] },
    ...FHITS.walls.map((x) => ({ t: x, origin: [0, -1, 0] })),
    { t: FINAL_BURST_AT, origin: [0, 0, 0] },
    { t: FHITS.smash, origin: [1.6, -1.5, 0.5] },
    { t: FHITS.smash2, origin: [2.6, -1.5, 0.5] },
    { t: SCREAM_END.start, origin: [0, 1, 0] },
    { t: FHITS.climax, origin: [0, 0, 0] },
    ...EVENTS.filter((e) => e.kind === 'spark' && e.t >= FINAL.start && e.t < OUTRO.start).map((e, i) => ({ t: e.t, origin: [i % 2 ? 3 : -3, -1, 0] })),
  ] as Burst[]).filter((b) => t >= b.t && t - b.t < 1.2).sort((a, b) => a.t - b.t).slice(-4);

export const FinaleShot = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const layer = useLayer();
  const { shot, scene, blueP, orangeP, planeBase } = finaleCamera(t);
  const pose = live.poseAt(t);
  const metal = t >= CHANT.start;
  const final = t >= FINAL.start - 0.05 && t < CHANT.start;
  const quiet = t < BUILD.start;
  const failed = t >= tk(65, 0) && t < SCREAM_END.start;
  const bursts = burstsAt(t);
  const insertHit = [...HITS].reverse().find((x) => t >= x) ?? shot.t;
  const world = (() => {
    switch (scene) {
      case 'panel':
        return <PlateLayer id={shot.panel as string} base={planeBase} panel dist={30} gain={1} margin={1.25} />;
      case 'quiet':
        // the truce: the empty stage after hours, its floor half blue, half orange
        return (
          <>
            <WhisperWorld t={t} />
            <TilePlatform position={[0, FLOOR_Y, -2]} width={30} depth={16} cols={30} rows={16} splitX={0} left="#4a7ae8" right="#e8884a" t={t} pulse={0.25} opacity={0.95} />
          </>
        );
      case 'flight':
        return (
          <>
            <PlateLayer id="RK3" base={planeBase} panel dist={30} gain={treeGain(t)} margin={1.02} />
          </>
        );
      case 'arena':
        return <Arena t={t} stomps={[]} embers={[]} led={['#ff7a1a', '#2f7bff']} plate />;
      case 'spin':
        return <Arena t={t} stomps={[]} embers={[]} lasers={1.6} led={['#ff4fd8', CYAN]} plate pads={false} />;
      case 'marena':
        return <Arena t={t} stomps={[]} embers={[]} lasers={1.4} led={['#ff3014', '#ffb020']} plate pads={false} />;
      case 'split':
        return <SplitWorld t={t} hit={FHITS.yes.filter((x) => x <= t).at(-1) ?? shot.t} />;
      case 'duel':
        return <SplitWorld t={t} hit={insertHit} />;
      case 'faceO':
        return <InsertWorld t={t} color={RED} hit={shot.t} />;
      case 'runway':
        return <RunwayWorld t={t} on={outQuad(clamp01((t - shot.t) / 0.5))} lanes={['#2f7bff', '#ff7a1a']} plate />;
      case 'walls':
        return <WallsWorld t={t} hits={FHITS.walls} />;
      case 'line':
        return <LineWorld t={t} t0={shot.t} />;
      case 'logo':
        return <LogoWorld t={t} flash={t >= FHITS.lock ? Math.max(0, 1 - (t - FHITS.lock) / 0.3) : 0} />;
      case 'title':
        return <LogoWorld t={t} flash={0} />;
      case 'forge':
        return <ForgeWorld t={t} plate="shot" hits={WORLD_HITS} />;
      case 'cathedral':
        return <CathedralWorld t={t} plate="shot" hits={WORLD_HITS} />;
      case 'tunnel':
        return <ChevronTunnelWorld t={t} hits={WORLD_HITS} />;
      case 'terminal':
        return <TerminalWorld t={t} fail={tk(65, 0)} />;
    }
  })();
  const figure = (s: Subject) => {
    const who = s.card.startsWith('B') || s.card.startsWith('PB') ? 'B' : 'O';
    return <Card key={`${who}-${s.card}`} id={s.card} t={t} grade={gradeOf(who, t)} {...s.at} dx={s.dx} dy={s.dy} rimDir={[who === 'B' ? 1 : -1, 0.3]} rival={who === 'B' ? '#ff3a14' : '#19c8ff'} clip={s.clip} light={lightOf(who, t, scene)} ground={s.ground} opacity={gatherOpacity(who, t)} />;
  };
  const subjects = subjectsAt(t, scene, blueP, orangeP);
  const fieldGrade = metal ? ORANGE_METAL : BLUE_MIX;
  // confetti is earned: the final chorus and its paintings; the piano and the build get dust, the metal embers
  const density = quiet ? 0.6 : scene === 'flight' ? (t < BRANCHES_AT ? 0.6 + 0.2 * flightK(t) : 1) : 0.9;
  return (
    <AbsoluteFill style={{ background: useShotBackground() }}>
      <Stage pose={pose}>
        {PLATES[scene] && <PlateLayer id={PLATES[scene] as string} base={planeBase} margin={plateMargin(scene)} />}
        {world}
        <Field t={t} grade={fieldGrade} layer="back" density={density} hueMix={0.6} metal={metal ? 1 : 0} dust={!final} bursts={bursts} />
        {subjects.map(figure)}
        {PLANS.map((p) => (dissolveState(p, t).active ? <Dissolve key={p.id} plan={p} t={t} grade={gradeOf(p.id.endsWith('-b') ? 'B' : 'O', p.t0 + 0.01)} rival={p.id.endsWith('-b') ? '#ff7a1a' : '#19c8ff'} spread={p.id.startsWith('f-branch') ? 1.4 : 2.4} /> : null))}
        <Field t={t} grade={BLUE_MIX} layer="front" density={density * 0.8} hueMix={0.6} metal={metal ? 1 : 0} dust={!final} bursts={bursts} />
      </Stage>
      <Svg>
        <FormDefs />
        {layer !== 'type' && (() => {
          // out of the solo the piano opens from black over 0.6 s; the final freeze closes to black on the last note;
          // the build-failed stop holds its frame
          const fadeIn = t < PIANO.start + 0.6 ? 0.85 * (1 - (t - PIANO.start) / 0.6) : 0;
          const fadeOut = t > FINALE_END - 1.6 ? clamp01((t - (FINALE_END - 1.6)) / 1.4) : 0;
          const a = Math.max(fadeIn, inQuad(fadeOut));
          return a > 0 ? <rect x={0} y={0} width={1920} height={1080} fill="#000" opacity={a} /> : null;
        })()}
        {layer !== 'type' && !failed && TRANSITIONS.map((s) => {
          const [a, b] = transitionWindow(s);
          return t >= a && t < b ? <SceneTransition key={s.id} spec={s} t={t} /> : null;
        })}
        {/* the type last: no cover or effect is drawn over a settled form (round 7d) */}
        <FinaleType entries={FINALE_TYPE} t={t} pose={pose} />
      </Svg>
    </AbsoluteFill>
  );
};

export const FINALE_TRANSITIONS = TRANSITIONS;
/** The opaque covers (every kind but the shock ring) for tools/covercheck.mjs, as the shot draws them. */
export const finaleCovers = () => TRANSITIONS.filter((s) => s.kind !== 'shock').map((s) => ({ id: s.id, kind: s.kind, window: transitionWindow(s) }));
export { COVER_GAP };
