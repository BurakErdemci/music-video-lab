// The chorus as data (round 6, scene-map.md "The chorus is the peak"): one shot table built from the chorus's
// eight lines, so chorus 2 reuses it word for word (chorusPlan(lines of chorus 2)). A shot is a scene (the world
// it shows), a camera move across the shot, and the transition that carries the cut INTO it. Cuts land on sung
// words or beats, never more than about 2 beats apart; the camera punches on every beat (cameraAt).
import { blendPose, type CameraPose, HOME_Z, type Vec3 } from '../../camera/camera.ts';
import type { Placement } from '../../cards/Card.tsx';
import { at } from '../../events.ts';
import { FLOOR_Y } from '../../stage/SetPlate.tsx';
import { beat, beatIndexAt, beats } from '../../timing.ts';
import type { TransitionKind } from '../../transitions/scene/scene.tsx';

export type Scene = 'arena' | 'insert' | 'split' | 'runway' | 'fire' | 'logo' | 'heart' | 'walls' | 'line' | 'spin' | 'burst';
export interface Shot { id: string; t: number; scene: Scene; from: CameraPose; to: CameraPose; into?: TransitionKind; origin?: [number, number] }
export interface Pose { t: number; card: string | null; at?: Placement }

/** The eight lines of a chorus: accept-current, accept-incoming, fire, merge, accept-current, accept-incoming,
 *  equals, merge (take-v4 lines 15-22 for chorus 1). */
export interface ChorusLines { cur1: number; inc1: number; fire: number; merge1: number; cur2: number; inc2: number; equals: number; merge2: number; end: number }
export const CHORUS1: ChorusLines = { cur1: 15, inc1: 16, fire: 17, merge1: 18, cur2: 19, inc2: 20, equals: 21, merge2: 22, end: 64.152 };

const cam = (position: Vec3, target: Vec3, fov = 40, roll = 0): CameraPose => ({ position, target, fov, roll });
const F = FLOOR_Y;
/** Where the arena's two girls stand, and the button pads under them. */
export const ARENA = { blueX: -3.3, orangeX: 3.3, z: 0, ball: [0, 5.3, -6] as Vec3 };
const full = (x: number, height = 5.0, flip = false): Placement => ({ x, height, flip });
/** A bust card pinned below the frame edge (the busts end at the waist; OX1's paint ends 48 px above its edge). */
export const bust = (x: number, height = 10.5, flip = false): Placement => ({ x, feet: -4.5 - 0.9, height, flip, z: 0 });
const half = (x: number, flip = false): Placement => ({ x, feet: -5.2, height: 9.6, flip, z: 0 });

/** The camera at t for the chorus: the shot's move from -> to, constant speed across the shot. */
export const shotAt = (shots: readonly Shot[], t: number): { shot: Shot; k: number; next?: Shot } => {
  let i = 0;
  for (let j = 0; j < shots.length; j++) if (t >= (shots[j] as Shot).t - 1e-9) i = j;
  const shot = shots[i] as Shot;
  const next = shots[i + 1];
  const end = next?.t ?? shot.t + 1;
  return { shot, k: Math.min(1, Math.max(0, (t - shot.t) / (end - shot.t))), next };
};
export const poseOfShot = (s: Shot, k: number): CameraPose => blendPose(s.from, s.to, k);

/** The first beat at least `min` seconds after t (a cut never lands right on top of the previous one). */
export const after = (t: number, min = 0.25): number => beats.find((x) => x >= t + min) ?? t + min;

export const chorusPlan = (L: ChorusLines) => {
  const tk = (line: number, k: number) => at(`tok-${line}-${k}`);
  const b = (t: number) => after(t); // the next beat after t
  const blueArena = (k: number): Vec3 => [ARENA.blueX + 1.6, -1.2 - k * 0.3, 8.5 - k];
  const SHOTS: Shot[] = [
    // "Accept current change!": the camera slams onto blue on the arena platform, she stomps, the floor erupts
    { id: 'cur1-slam', t: tk(L.cur1, 0), scene: 'arena', from: cam([0, 3.2, 24], [0, -1, -1]), to: cam(blueArena(0), [ARENA.blueX, -1, 0], 42), into: 'streaks' },
    { id: 'cur1-stomp', t: tk(L.cur1, 1), scene: 'arena', from: cam([-1.4, -2.7, 6.6], [ARENA.blueX, -0.4, 0], 48), to: cam([-2.0, -2.5, 5.6], [ARENA.blueX, -0.2, 0], 48), into: 'shock' },
    { id: 'cur1-change', t: tk(L.cur1, 2), scene: 'arena', from: cam([6, 5, 11], [-1, -2.2, -1], 44), to: cam([4, 4.4, 9.5], [-1.4, -2.2, -1], 44), into: 'mirror' },
    // "(NO!)": orange's screaming face, a giant metal NO!, shockwave and glass shatter
    { id: 'no1', t: tk(L.cur1, 3), scene: 'insert', from: cam([0, 0, HOME_Z], [0, 0, 0]), to: cam([0, 0.2, HOME_Z - 1.4], [0, 0.2, 0]), into: 'shatter' },
    // "Accept incoming change!": the mirror image, orange slams her plaque
    { id: 'inc1-slam', t: b(tk(L.cur1, 3)), scene: 'arena', from: cam([4.6, -0.4, 8.2], [ARENA.orangeX, -0.8, 0], 42), to: cam([3.9, -0.8, 6.4], [ARENA.orangeX, -0.8, 0], 42), into: 'ink' },
    { id: 'inc1-change', t: tk(L.inc1, 2), scene: 'arena', from: cam([2.2, -2.8, 6.2], [ARENA.orangeX, 0, 0], 50, 0.2), to: cam([2.6, -2.6, 5.4], [ARENA.orangeX, 0, 0], 50, 0.08), into: 'shock' },
    { id: 'inc1-top', t: after(tk(L.inc1, 2)), scene: 'arena', from: cam([0, 8, 8], [0, -3.2, -1], 50), to: cam([1.6, 7.4, 6.6], [0, -3.2, -1], 50, 0.12), into: 'diff' },
    // "(NO!)": blue's shouting face, a giant pop NO!
    { id: 'no2', t: tk(L.inc1, 3), scene: 'insert', from: cam([0, 0, HOME_Z], [0, 0, 0]), to: cam([0, 0.2, HOME_Z - 1.4], [0, 0.2, 0]), into: 'dissolve' },
    // "Two girls, one line,": both on the glowing line-42 runway, back to back
    { id: 'line-two', t: tk(L.fire, 0), scene: 'runway', from: cam([0, -1.6, 10], [0, -1.2, -12], 44), to: cam([0, -2.1, 8], [0, -1.4, -12], 44), into: 'dissolve' },
    { id: 'line-one', t: tk(L.fire, 2), scene: 'runway', from: cam([-5.5, -2.6, 5], [0, -0.6, -2], 46, -0.12), to: cam([-4.6, -2.4, 4.4], [0, -0.6, -2], 46, -0.04), into: 'shock' },
    { id: 'line-line', t: tk(L.fire, 3), scene: 'runway', from: cam([3.5, 5, 9], [0, -3, -4], 46), to: cam([2.4, 4.4, 7.5], [0, -3, -5], 46), into: 'mirror' },
    // "the build is on fire": the whole arena ignites, a burning server hall
    { id: 'fire-build', t: tk(L.fire, 5), scene: 'fire', from: cam([0, -1.6, 14], [0, -0.6, -2], 44), to: cam([0, -1.2, 11], [0, -0.4, -2], 44), into: 'streaks' },
    { id: 'fire-fire', t: beat(beatIndexAt(tk(L.fire, 7)) + 0), scene: 'fire', from: cam([0, -0.4, 6.4], [0, -0.2, -4], 52, 0.06), to: cam([0, -0.8, 4.6], [0, -0.2, -4], 54, -0.04), into: 'shock' },
    // "Merge conflict, merge conflict,": logo B slams and its halves are the two girls crashing together
    { id: 'merge1-a', t: tk(L.merge1, 0), scene: 'logo', from: cam([0, 0, HOME_Z + 2], [0, 0, 0]), to: cam([0, 0.2, HOME_Z], [0, 0.2, 0]), into: 'tunnel' },
    { id: 'merge1-crash', t: tk(L.merge1, 1), scene: 'logo', from: cam([0.6, -0.4, HOME_Z - 1.5], [0, 0, 0], 40, 0.05), to: cam([0.3, -0.3, HOME_Z - 2.2], [0, 0, 0], 40, -0.05), into: 'shock' },
    { id: 'merge1-b', t: tk(L.merge1, 2), scene: 'logo', from: cam([-1.2, 0.8, HOME_Z + 1], [0, 0, 0]), to: cam([-0.6, 0.4, HOME_Z], [0, 0, 0]), into: 'mirror' },
    { id: 'merge1-crash2', t: tk(L.merge1, 3), scene: 'logo', from: cam([-0.4, 0.4, HOME_Z - 1.5], [0, 0, 0], 40, -0.05), to: cam([-0.2, 0.3, HOME_Z - 2.2], [0, 0, 0], 40, 0.05), into: 'shock' },
    // "heart going haywire": a heartbeat line (a git graph gone mad) races across
    { id: 'heart', t: tk(L.merge1, 4), scene: 'heart', from: cam([-3, 0, 11], [-1, 0, -2], 42), to: cam([1.5, 0.2, 10], [1, 0, -2], 42), into: 'streaks' },
    { id: 'heart-going', t: tk(L.merge1, 5), scene: 'heart', from: cam([2.5, -1, 9], [0, 0, -2], 46, 0.14), to: cam([0.5, -0.8, 8], [0, 0, -2], 46, -0.1), into: 'shock' },
    { id: 'heart-haywire', t: tk(L.merge1, 6), scene: 'heart', from: cam([0, 0.5, 8], [0, 0, -2], 50, -0.3), to: cam([0, 0.3, 7], [0, 0, -2], 52, 0.3), into: 'diff' },
    { id: 'arena-lasers', t: after(tk(L.merge1, 6)), scene: 'arena', from: cam([-9, 2.5, 13], [0, -1.2, -1], 44), to: cam([-5, 2, 13.5], [0, -1.2, -1], 44), into: 'mirror' },
    // second half: the same as the first
    { id: 'cur2-slam', t: tk(L.cur2, 0), scene: 'arena', from: cam([0, 3.2, 24], [0, -1, -1]), to: cam(blueArena(0), [ARENA.blueX, -1, 0], 42), into: 'streaks' },
    { id: 'cur2-hold', t: after(tk(L.cur2, 0)), scene: 'arena', from: cam([-6.5, -1.6, 7], [ARENA.blueX, -0.6, 0], 46, -0.1), to: cam([-5.8, -1.9, 6.2], [ARENA.blueX, -0.6, 0], 46, -0.16), into: 'shock' },
    { id: 'cur2-stomp', t: tk(L.cur2, 1), scene: 'arena', from: cam([-1.4, -2.7, 6.6], [ARENA.blueX, -0.4, 0], 48), to: cam([-2.0, -2.5, 5.6], [ARENA.blueX, -0.2, 0], 48), into: 'shock' },
    { id: 'cur2-change', t: tk(L.cur2, 2), scene: 'arena', from: cam([6, 5, 11], [-1, -2.2, -1], 44), to: cam([4, 4.4, 9.5], [-1.4, -2.2, -1], 44), into: 'mirror' },
    // "(NEVER!)": bigger than NO!, both screaming close-ups in a split frame
    { id: 'never1', t: tk(L.cur2, 3), scene: 'split', from: cam([0, 0, HOME_Z], [0, 0, 0]), to: cam([0, 0.2, HOME_Z - 1.2], [0, 0.2, 0]), into: 'shatter' },
    { id: 'inc2-slam', t: b(tk(L.cur2, 3) + 0.2), scene: 'arena', from: cam([4.6, -0.4, 8.2], [ARENA.orangeX, -0.8, 0], 42), to: cam([3.9, -0.8, 6.4], [ARENA.orangeX, -0.8, 0], 42), into: 'ink' },
    { id: 'inc2-change', t: tk(L.inc2, 2), scene: 'arena', from: cam([2.2, -2.8, 6.2], [ARENA.orangeX, 0, 0], 50, 0.2), to: cam([2.6, -2.6, 5.4], [ARENA.orangeX, 0, 0], 50, 0.08), into: 'shock' },
    { id: 'inc2-top', t: after(tk(L.inc2, 2)), scene: 'arena', from: cam([0, 8, 8], [0, -3.2, -1], 50), to: cam([-1.6, 7.4, 6.6], [0, -3.2, -1], 50, -0.12), into: 'diff' },
    { id: 'never2', t: tk(L.inc2, 3), scene: 'split', from: cam([0, 0, HOME_Z], [0, 0, 0]), to: cam([0, 0.2, HOME_Z - 1.2], [0, 0.2, 0]), into: 'dissolve' },
    // "Equals, equals, equals": the ======= bars slam in like walls closing in
    { id: 'eq1', t: tk(L.equals, 0), scene: 'walls', from: cam([0, -0.6, 15], [0, -0.6, -2], 44), to: cam([0, -0.6, 13], [0, -0.6, -2], 44), into: 'tunnel' },
    { id: 'eq2', t: tk(L.equals, 1), scene: 'walls', from: cam([2.4, 0.6, 11], [0, -0.6, -2], 46, 0.1), to: cam([1.8, 0.4, 10], [0, -0.6, -2], 46, 0.04), into: 'shock' },
    { id: 'eq3', t: tk(L.equals, 2), scene: 'walls', from: cam([-2.2, -1.6, 9], [0, -0.6, -2], 50, -0.12), to: cam([-1.6, -1.4, 8], [0, -0.6, -2], 50, -0.05), into: 'shock' },
    // "in the middle of my soul": the walls crush to a single line of light
    { id: 'eq-line', t: tk(L.equals, 3), scene: 'line', from: cam([0, 0, 12], [0, 0, -2], 42), to: cam([0, 0, 10], [0, 0, -2], 42), into: 'shock' },
    { id: 'eq-middle', t: tk(L.equals, 5), scene: 'line', from: cam([3, 1.4, 8], [0, 0, -2], 46, 0.35), to: cam([2, 1, 7], [0, 0, -2], 46, 0.2), into: 'mirror' },
    { id: 'eq-soul', t: tk(L.equals, 8), scene: 'line', from: cam([0, 0, 7], [0, 0, -2], 50), to: cam([0, 0, 6], [0, 0, -2], 52), into: 'streaks' },
    // "Merge conflict... I can't take control": logo B's second variation spins out of control (a barrel roll)
    { id: 'merge2-a', t: tk(L.merge2, 0), scene: 'logo', from: cam([0, 0, HOME_Z + 2], [0, 0, 0], 40, 0), to: cam([0, 0.2, HOME_Z], [0, 0.2, 0], 40, Math.PI), into: 'tunnel' },
    { id: 'merge2-crash', t: tk(L.merge2, 1), scene: 'logo', from: cam([0.6, -0.4, HOME_Z - 1.5], [0, 0, 0], 40, Math.PI), to: cam([0.3, -0.3, HOME_Z - 2.2], [0, 0, 0], 40, Math.PI * 1.6), into: 'shock' },
    { id: 'merge2-b', t: tk(L.merge2, 2), scene: 'logo', from: cam([-1.2, 0.8, HOME_Z + 1], [0, 0, 0], 40, Math.PI * 1.6), to: cam([-0.6, 0.4, HOME_Z], [0, 0, 0], 40, Math.PI * 1.85), into: 'mirror' },
    { id: 'merge2-crash2', t: tk(L.merge2, 3), scene: 'logo', from: cam([-0.4, 0.4, HOME_Z - 1.5], [0, 0, 0], 40, Math.PI * 1.85), to: cam([-0.2, 0.3, HOME_Z - 2.2], [0, 0, 0], 40, Math.PI * 2), into: 'shock' },
    { id: 'control-i', t: tk(L.merge2, 4), scene: 'spin', from: cam([0, 6, 10], [0, -2, -1], 46, 0), to: cam([0, 5.4, 9], [0, -2, -1], 46, 0.9), into: 'diff' },
    { id: 'control-take', t: tk(L.merge2, 6), scene: 'spin', from: cam([-6, -1.8, 8], [0, -0.6, -1], 48, -0.4), to: cam([-5, -1.6, 7], [0, -0.6, -1], 48, 0.2), into: 'shock' },
    { id: 'control', t: tk(L.merge2, 7), scene: 'spin', from: cam([0, 2.2, 15], [0, -1, -1], 44, 0.3), to: cam([0, 2, 12], [0, -1, -1], 44, -0.6), into: 'mirror' },
    { id: 'control-out', t: beat(beatIndexAt(L.end) - 3), scene: 'spin', from: cam([5, 3, 12], [0, -1, -1], 46, -0.6), to: cam([3, 2.6, 10], [0, -1, -1], 46, -1.4), into: 'shock' },
    // the chorus end: everything bursts into particles
    { id: 'burst', t: beat(beatIndexAt(L.end) - 2), scene: 'burst', from: cam([0, 1, 13], [0, -0.6, -1], 44), to: cam([0, 1.4, 16], [0, -0.6, -1], 48), into: 'dissolve' },
  ];
  SHOTS.sort((a, c) => a.t - c.t);
  for (let i = 1; i < SHOTS.length; i++) {
    const a = SHOTS[i - 1] as Shot;
    const c = SHOTS[i] as Shot;
    if (c.t - a.t < 0.12) throw new Error(`chorus plan: shot ${c.id} only ${(c.t - a.t).toFixed(2)} s after ${a.id}`);
  }

  // The girls: hard cuts on words (anticipation -> release), per shot. Close-ups use the expression sequences.
  const BLUE: Pose[] = [
    { t: tk(L.cur1, 0), card: 'BD5', at: full(ARENA.blueX) },
    { t: tk(L.cur1, 1), card: 'BC1', at: full(ARENA.blueX) },
    { t: tk(L.cur1, 3), card: 'BX2', at: half(-5.4) }, // the insert: blue smug at the edge while orange screams
    { t: b(tk(L.cur1, 3)), card: 'BD7', at: full(ARENA.blueX) },
    { t: tk(L.inc1, 3), card: 'BX4', at: bust(-1.2) },
    { t: tk(L.fire, 0), card: 'BD4', at: { x: -0.75, height: 4.8, flip: true } },
    { t: tk(L.fire, 5), card: 'BC3', at: full(-3.6, 4.8) },
    { t: tk(L.merge1, 0), card: 'BC2', at: full(-5.6, 5.6) },
    { t: tk(L.merge1, 4), card: 'BX3', at: half(-4.2) },
    { t: tk(L.merge1, 6), card: 'BX4', at: half(-4.2) },
    { t: after(tk(L.merge1, 6)), card: 'BD1', at: full(ARENA.blueX) },
    { t: tk(L.cur2, 0), card: 'BD5', at: full(ARENA.blueX) },
    { t: tk(L.cur2, 1), card: 'BC1', at: full(ARENA.blueX) },
    { t: tk(L.cur2, 3), card: 'BX3', at: bust(-4.6, 10.5) },
    { t: b(tk(L.cur2, 3) + 0.2), card: 'BD7', at: full(ARENA.blueX) },
    { t: tk(L.inc2, 3), card: 'BX4', at: bust(-4.6, 10.5) },
    { t: tk(L.equals, 0), card: 'BC2', at: full(-1.4, 4.8, true) },
    { t: tk(L.equals, 3), card: null },
    { t: tk(L.merge2, 0), card: 'BC2', at: full(-5.6, 5.6) },
    { t: tk(L.merge2, 4), card: 'BC3', at: full(ARENA.blueX) },
    { t: tk(L.merge2, 7), card: 'BC1', at: full(ARENA.blueX) },
    { t: beat(beatIndexAt(L.end) - 2), card: null },
  ];
  const ORANGE: Pose[] = [
    { t: tk(L.cur1, 0), card: 'OM3', at: full(ARENA.orangeX) },
    { t: tk(L.cur1, 3), card: 'OMX3', at: bust(1.6, 11, true) },
    { t: b(tk(L.cur1, 3)), card: 'OM4', at: full(ARENA.orangeX) },
    { t: tk(L.inc1, 1), card: 'OC1', at: full(ARENA.orangeX) },
    { t: tk(L.inc1, 3), card: 'OMX5', at: half(5.4, true) },
    { t: tk(L.fire, 0), card: 'OM3', at: { x: 0.75, height: 4.8 } },
    { t: tk(L.fire, 5), card: 'OC3', at: full(3.6, 4.8) },
    { t: tk(L.merge1, 0), card: 'OC1', at: full(5.6, 5.6) },
    { t: tk(L.merge1, 4), card: 'OMX4', at: half(4.2, true) },
    { t: tk(L.merge1, 6), card: 'OMX2', at: half(4.2, true) },
    { t: after(tk(L.merge1, 6)), card: 'OM3', at: full(ARENA.orangeX) },
    { t: tk(L.cur2, 3), card: 'OMX3', at: bust(4.6, 10.5, true) },
    { t: b(tk(L.cur2, 3) + 0.2), card: 'OM4', at: full(ARENA.orangeX) },
    { t: tk(L.inc2, 1), card: 'OC1', at: full(ARENA.orangeX) },
    { t: tk(L.inc2, 3), card: 'OMX2', at: bust(4.6, 10.5, true) },
    { t: tk(L.equals, 0), card: 'OC2', at: full(1.4, 4.8) },
    { t: tk(L.equals, 3), card: null },
    { t: tk(L.merge2, 0), card: 'OC1', at: full(5.6, 5.6) },
    { t: tk(L.merge2, 4), card: 'OC3', at: full(ARENA.orangeX) },
    { t: tk(L.merge2, 7), card: 'OC2', at: full(ARENA.orangeX) },
    { t: beat(beatIndexAt(L.end) - 2), card: null },
  ];
  /** The chorus's beats: a camera punch on every one. */
  const start = SHOTS[0]?.t ?? 0;
  const BEATS = beats.filter((x) => x >= start - 0.05 && x < L.end);
  /** Moments that hit: button stomps, NO!/NEVER!, the crashes; each fires the floor, sparks and confetti. */
  const HITS = {
    stompBlue: [tk(L.cur1, 1), tk(L.cur2, 1)],
    slamOrange: [tk(L.inc1, 1), tk(L.inc2, 1)],
    no: [tk(L.cur1, 3), tk(L.inc1, 3)],
    never: [tk(L.cur2, 3), tk(L.inc2, 3)],
    crash: [tk(L.merge1, 1), tk(L.merge1, 3), tk(L.merge2, 1), tk(L.merge2, 3)],
    walls: [tk(L.equals, 0), tk(L.equals, 1), tk(L.equals, 2)],
    crush: tk(L.equals, 3),
    fire: tk(L.fire, 5),
    burst: beat(beatIndexAt(L.end) - 2),
  };
  return { SHOTS, BLUE, ORANGE, BEATS, HITS, F };
};
