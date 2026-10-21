// Verse 3 (rebase), verse 4 (trade), the scream, GIT! PUSH! FORCE!, the whisper and the guitar solo as data
// (round 7, scene-map.md "Round 6 approved; decisions for the rest"). The same shape as film/verses/plan.ts: a
// world per 2-4 bars, cuts on words, a designed form per line part; verse 4's cuts accelerate into the scream,
// the breakdown is the slowest and heaviest stretch, the whisper the quietest frame. Node-safe (no JSX).
import type { Placement } from '../../cards/Card.tsx';
import { at } from '../../events.ts';
import { beats, downbeats, sectionNamed } from '../../timing.ts';
import type { TransitionKind } from '../../transitions/scene/scene.tsx';
import type { TypeEntry } from '../chorus/typeplan.ts';

export type RestScene =
  | 'rails' | 'subway' | 'squash' | 'blame' | 'pipeline' | 'callgrid'
  | 'whitespace' | 'nametag' | 'lasercase' | 'scream' | 'cathedral' | 'forge' | 'warning' | 'pushface' | 'whisper' | 'tunnel' | 'arena' | 'duel'
  | 'faceO' | 'faceB' | 'panel';
export type CamVariant = 'hero' | 'close' | 'low' | 'reverse' | 'wide';
/** How the camera travels across a shot (round 7b, "No cliff after the chorus": a camera move on every line). */
export type Move = 'push' | 'orbit' | 'whip' | 'dollyzoom';
/** `fade`: the cut is carried by a fade up from black instead of a cover (out of the whisper's near-black). */
/** `panel`: for scene 'panel', the moment painting shown full frame (public/plates/<panel>.webp). */
export interface RShot { id: string; t: number; scene: RestScene; cam: CamVariant; into?: TransitionKind; fade?: boolean; move?: Move; panel?: string }
export interface RPose { t: number; card: string | null; at?: Placement }

const tk = (line: number, k: number) => at(`tok-${line}-${k}`);
export const V3 = sectionNamed('verse3_rebase');
export const V4 = sectionNamed('verse4_trade');
export const SCREAM = sectionNamed('scream');
export const PUSH = sectionNamed('breakdown_git_push_force');
export const WHISPER = sectionNamed('whisper');
export const SOLO = sectionNamed('guitar_solo');
export const REST_END = SOLO.end;
const full = (x: number, height = 4.8, flip = false, z = 0): Placement => ({ x, height, flip, z });
const bust = (x: number, height = 10.5, flip = false): Placement => ({ x, feet: -5.4, height, flip, z: 0 });
const db = (t: number) => downbeats.find((x) => x >= t - 0.02) as number;
const bt = (t: number) => beats.find((x) => x >= t - 0.02) as number;

/** A girl in a metal shot: her card and placement, null to hide her, absent to keep her pose. */
type Who = readonly [string, Placement] | null;
interface MShot extends RShot { B?: Who; O?: Who }
const faceAt = (x: number, flip = false): Placement => ({ x, feet: -5.4, height: 10.5, z: 0, flip });
const faceC = (flip = false): Placement => ({ x: 0, feet: -5.8, height: 12, z: 0, flip });
const bar = (i: number) => db(SOLO.start + i * 1.333);
const half = (i: number) => bt(SOLO.start + i * 1.333 + 0.62);
/** The scream, GIT! PUSH! FORCE!, the whisper and the solo (round 7b): faces cut in every two beats in the scream,
 *  the breakdown heavy but moving (orbits and cut-ins between the three words), the solo a new framing every bar and
 *  most half bars (duel, split faces, low angles, face cut-ins), never two bars on one full-body stage shot; three
 *  half bars hold so the solo stays under the chorus's motion. */
const METAL: MShot[] = [
  { id: 'scream', t: SCREAM.start, scene: 'scream', cam: 'hero', into: 'shatter', move: 'push', B: ['BMX2', faceAt(-4.2)], O: ['OMX3', faceAt(4.2, true)] },
  { id: 'scream-o', t: bt(SCREAM.start + 0.64), scene: 'faceO', cam: 'hero', into: 'shatter', move: 'dollyzoom', B: null, O: ['OMX3', faceC(true)] },
  // forehead to forehead (QK2)
  { id: 'scream-b', t: db(SCREAM.start + 1.3), scene: 'panel', panel: 'QK2', cam: 'hero', into: 'shatter', move: 'push', B: null, O: null },
  { id: 'scream-split', t: bt(SCREAM.start + 1.98), scene: 'scream', cam: 'close', into: 'shock', move: 'orbit', B: ['BMX4', faceAt(-4.2)], O: ['OMX2', faceAt(4.2, true)] },
  { id: 'push-hall', t: PUSH.start, scene: 'cathedral', cam: 'hero', into: 'tunnel', move: 'whip', B: null, O: ['OM4', full(0, 5.2)] },
  { id: 'push-git', t: tk(45, 0), scene: 'cathedral', cam: 'low', into: 'shock', move: 'dollyzoom', O: ['OF1', full(0, 5.4)] },
  { id: 'push-snarl', t: db(tk(45, 0) + 0.4), scene: 'faceO', cam: 'hero', into: 'shatter', move: 'push', O: ['OMX2', faceC(true)] },
  { id: 'push-orbit', t: bt(tk(45, 0) + 1.1), scene: 'cathedral', cam: 'wide', into: 'shock', move: 'orbit', O: ['OF1', full(0, 5.4)] },
  { id: 'push-warning', t: db(tk(45, 0) + 1.6), scene: 'warning', cam: 'hero', into: 'diff', move: 'push', O: null },
  { id: 'push-forge', t: bt(tk(45, 0) + 2.6), scene: 'forge', cam: 'low', into: 'streaks', move: 'orbit', O: ['OF2', { x: 2.4, feet: -1.6, height: 5.2, z: 0 }] },
  { id: 'push-sneer', t: db(tk(45, 0) + 3.2), scene: 'faceO', cam: 'hero', into: 'shock', move: 'dollyzoom', O: ['OMX5', faceC(true)] },
  { id: 'push-push', t: tk(46, 0), scene: 'forge', cam: 'low', into: 'shatter', move: 'whip', B: ['BF1', full(-4.0, 5.0)], O: ['OF3', full(2.4, 5.0)] },
  { id: 'push-impact', t: bt(tk(46, 0) + 0.28), scene: 'panel', panel: 'QK1', cam: 'hero', into: 'shock', move: 'push', B: null, O: null },
  { id: 'push-force', t: tk(47, 0), scene: 'pushface', cam: 'hero', into: 'shock', move: 'push', O: ['OF4', full(0.4, 6.0)] },
  // the whisper: the quietest frame of the clip, still
  { id: 'whisper', t: WHISPER.start, scene: 'whisper', cam: 'hero', into: 'dissolve', B: ['BQ3', full(-1, 5.0)], O: null },
  { id: 'whisper-wouldnt', t: tk(48, 1), scene: 'whisper', cam: 'close', into: 'shock', B: ['BMX5', { x: -1.0, feet: -5.4, height: 11, z: 0 }] },
  // the solo: ten bars, a new framing every half bar
  { id: 'solo-forge', t: SOLO.start, scene: 'forge', cam: 'hero', fade: true, move: 'push', B: null, O: ['OS1', full(3, 5.0)] },
  { id: 'solo-tongue', t: half(0), scene: 'faceO', cam: 'hero', into: 'shatter', move: 'dollyzoom', O: ['OMX4', faceC(true)] },
  { id: 'solo-cathedral', t: bar(1), scene: 'cathedral', cam: 'low', into: 'tunnel', move: 'orbit', B: ['BS1', full(-1.5, 5.2)], O: null },
  { id: 'solo-tunnel', t: bar(2), scene: 'tunnel', cam: 'hero', into: 'streaks', move: 'whip', B: ['BS2', full(-1.6, 4.6)], O: ['OS2', full(1.6, 4.6)] },
  { id: 'solo-split', t: half(2), scene: 'duel', cam: 'hero', into: 'shatter', move: 'orbit', B: ['BMX1', faceAt(-4.4)], O: ['OMX1', faceAt(4.4, true)] },
  { id: 'solo-arena', t: bar(3), scene: 'arena', cam: 'wide', into: 'mirror', move: 'whip', B: ['BQ2', full(-3.3, 5.0)], O: ['OS3', full(3.3, 5.0)] },
  { id: 'solo-split-2', t: bar(4), scene: 'duel', cam: 'close', into: 'shatter', move: 'push', B: ['BMX3', faceAt(-4.4)], O: ['OMX5', faceAt(4.4, true)] },
  { id: 'solo-horns', t: half(4), scene: 'forge', cam: 'low', into: 'streaks', move: 'orbit', B: null, O: ['OC3', full(2.4, 5.4)] },
  // back to back (QK3)
  { id: 'solo-cathedral-2', t: bar(5), scene: 'panel', panel: 'QK3', cam: 'hero', into: 'ink', move: 'push', B: null, O: null },
  { id: 'solo-rage-2', t: half(5), scene: 'faceB', cam: 'hero', into: 'shatter', move: 'dollyzoom', B: ['BMX4', faceC()], O: null },
  { id: 'solo-tunnel-2', t: bar(6), scene: 'tunnel', cam: 'close', into: 'tunnel', move: 'push', B: null, O: ['OS2', full(0, 5.0)] },
  { id: 'solo-snarl', t: half(6), scene: 'faceO', cam: 'hero', into: 'shatter', move: 'orbit', O: ['OMX2', faceC(true)] },
  { id: 'solo-arena-2', t: bar(7), scene: 'arena', cam: 'hero', into: 'mirror', move: 'orbit', B: ['BS3', full(-3.0, 5.0)], O: ['OS1', full(3.0, 5.0)] },
  { id: 'solo-forge-2', t: bar(8), scene: 'forge', cam: 'wide', into: 'streaks', move: 'dollyzoom', B: ['BS1', full(-2.4, 5.0)], O: ['OS3', full(3, 5.2)] },
  { id: 'solo-split-3', t: half(8), scene: 'duel', cam: 'hero', into: 'shatter', move: 'push', B: ['BMX2', faceAt(-4.4)], O: ['OMX3', faceAt(4.4, true)] },
  { id: 'solo-end', t: bar(9), scene: 'cathedral', cam: 'wide', into: 'tunnel', move: 'orbit', B: ['BS3', full(-2.2, 5.0)], O: ['OS2', full(2.2, 5.2)] },
  { id: 'solo-end-faces', t: half(9), scene: 'duel', cam: 'close', into: 'shatter', move: 'dollyzoom', B: ['BMX3', faceAt(-4.4)], O: ['OMX3', faceAt(4.4, true)] },
];
const metalPoses = (who: 'B' | 'O'): RPose[] =>
  METAL.flatMap((m) => {
    const w = m[who];
    return w === undefined ? [] : [w === null ? { t: m.t, card: null } : { t: m.t, card: w[0], at: w[1] }];
  });

export const RSHOTS: RShot[] = [
  // V3: orange rebases blue's history while she sleeps; they trade lines
  { id: 'rebase', t: V3.start, scene: 'rails', cam: 'hero', into: 'dissolve' },
  // "while you were asleep": the rebase heist painting (QK4)
  { id: 'rebase-asleep', t: tk(23, 5), scene: 'panel', panel: 'QK4', cam: 'hero', into: 'ink', move: 'push' },
  { id: 'memory', t: tk(24, 0), scene: 'subway', cam: 'hero', into: 'mirror' },
  { id: 'memory-sweet', t: tk(24, 5), scene: 'subway', cam: 'close', into: 'shock' },
  { id: 'squash', t: tk(25, 0), scene: 'squash', cam: 'hero', into: 'shatter' },
  { id: 'squash-line', t: tk(25, 6), scene: 'squash', cam: 'close', into: 'shock' },
  { id: 'blame', t: tk(26, 0), scene: 'blame', cam: 'hero', into: 'diff' },
  { id: 'blame-your', t: tk(26, 5), scene: 'blame', cam: 'low', into: 'shock' },
  { id: 'pipeline', t: tk(27, 0), scene: 'pipeline', cam: 'hero', into: 'streaks' },
  { id: 'reviewers', t: tk(28, 0), scene: 'pipeline', cam: 'reverse', into: 'shock' },
  { id: 'reviewers-gone', t: tk(28, 3), scene: 'pipeline', cam: 'wide', into: 'shock' },
  { id: 'standup', t: tk(29, 0), scene: 'callgrid', cam: 'hero', into: 'ink' },
  { id: 'standup-five', t: tk(29, 4), scene: 'callgrid', cam: 'close', into: 'shock' },
  // "nobody's on!": both sprinting down the corridor (QK5)
  { id: 'nobody', t: tk(29, 6), scene: 'panel', panel: 'QK5', cam: 'hero', into: 'streaks', move: 'push' },
  // round 7b: a cut on the accent words, so the 4 s after each chorus keep moving
  { id: 'rebase-rebased', t: tk(23, 1), scene: 'rails', cam: 'close', into: 'shock', move: 'whip' },
  { id: 'rebase-history', t: tk(23, 3), scene: 'rails', cam: 'reverse', into: 'shock', move: 'orbit' },
  { id: 'memory-mine', t: tk(24, 3), scene: 'subway', cam: 'low', into: 'shock', move: 'dollyzoom' },
  { id: 'squash-sorries', t: tk(25, 4), scene: 'squash', cam: 'low', into: 'shock', move: 'whip' },
  { id: 'blame-says', t: tk(26, 3), scene: 'blame', cam: 'close', into: 'shock', move: 'dollyzoom' },
  { id: 'pipeline-red', t: tk(27, 3), scene: 'pipeline', cam: 'close', into: 'shock', move: 'whip' },
  { id: 'standup-standups', t: tk(29, 2), scene: 'callgrid', cam: 'low', into: 'shock', move: 'orbit' },
  { id: 'tabs-tabs', t: tk(38, 2), scene: 'whitespace', cam: 'close', into: 'shock', move: 'whip' },
  { id: 'spaces-spaces', t: tk(39, 2), scene: 'whitespace', cam: 'low', into: 'shock', move: 'dollyzoom' },
  { id: 'data2-named', t: tk(40, 1), scene: 'nametag', cam: 'low', into: 'shock', move: 'orbit' },
  { id: 'comment-wrote', t: tk(41, 2), scene: 'lasercase', cam: 'low', into: 'shock', move: 'whip' },
  // V4: the petty trade, cuts accelerating toward the scream
  { id: 'tabs', t: V4.start, scene: 'whitespace', cam: 'hero', into: 'diff' },
  { id: 'spaces', t: tk(39, 0), scene: 'whitespace', cam: 'reverse', into: 'shock' },
  { id: 'data2', t: tk(40, 0), scene: 'nametag', cam: 'hero', into: 'mirror' },
  { id: 'data2-tag', t: tk(40, 4), scene: 'nametag', cam: 'close', into: 'shock' },
  { id: 'comment', t: tk(41, 0), scene: 'lasercase', cam: 'hero', into: 'streaks' },
  { id: 'comment-touch', t: tk(41, 7), scene: 'lasercase', cam: 'close', into: 'shock' },
  { id: 'mine', t: tk(42, 0), scene: 'lasercase', cam: 'reverse', into: 'shock' },
  { id: 'mine-comment', t: tk(42, 3), scene: 'lasercase', cam: 'low', into: 'shock' },
  { id: 'know', t: tk(43, 1), scene: 'lasercase', cam: 'close', into: 'shock' },
  { id: 'touched', t: tk(43, 3), scene: 'lasercase', cam: 'wide', into: 'shock' },
  ...METAL.map(({ B: _b, O: _o, ...shot }) => shot),
];
RSHOTS.sort((a, b) => a.t - b.t);
for (let i = 1; i < RSHOTS.length; i++) {
  const a = RSHOTS[i - 1] as RShot;
  const b = RSHOTS[i] as RShot;
  if (b.t - a.t < 0.12) throw new Error(`rest plan: shot ${b.id} at ${b.t.toFixed(2)} s is not after ${a.id} (${a.t.toFixed(2)} s)`);
}


/** Blue is disco until the scream, metal from 117.36 s (girls/costume.ts). */
export const BLUE_METAL_AT = SCREAM.start;

export const RBLUE: RPose[] = [
  // asleep while orange rebases her history
  { t: V3.start, card: 'BV1', at: full(-3.4, 3.6) },
  { t: tk(23, 5), card: null },
  { t: tk(24, 0), card: 'BV2', at: full(-3, 4.8) },
  { t: tk(24, 5), card: 'BX3', at: bust(-2.6) },
  { t: tk(25, 0), card: null },
  { t: tk(26, 0), card: 'BV3', at: full(0, 5.0) },
  { t: tk(26, 5), card: 'BX4', at: bust(-1.2) },
  { t: tk(27, 0), card: null },
  { t: tk(28, 0), card: 'BX3', at: bust(-3.4) },
  { t: tk(28, 3), card: 'BV4', at: full(-3.6) },
  { t: tk(29, 0), card: 'BV5', at: full(-3.6, 4.8, false, 2) },
  { t: tk(29, 6), card: null },
  { t: tk(29, 7), card: 'BX5', at: bust(-3.8) },
  { t: V4.start, card: 'BX4', at: bust(-3.4) },
  { t: tk(38, 2), card: 'BV6', at: full(-3.4, 4.8) },
  { t: tk(39, 0), card: 'BX2', at: bust(-4.4) },
  { t: tk(40, 0), card: 'BV7', at: full(-4, 4.8, false, 1) },
  { t: tk(41, 0), card: 'BX3', at: bust(-4.2) },
  { t: tk(42, 0), card: 'BV8', at: full(-4, 4.8, false, 1.5) },
  { t: tk(42, 3), card: 'BC2', at: full(-4, 4.8, false, 1.5) },
  { t: tk(43, 1), card: 'BX3', at: bust(-4.4) },
  // from the scream on the metal table holds her poses (BX3 becomes BMX2 through a dissolve on the downbeat)
  ...metalPoses('B'),
];
export const RORANGE: RPose[] = [
  // she yanks the chain of blue's history
  { t: V3.start, card: 'OV1', at: full(2.5, 4.8) },
  { t: tk(23, 5), card: null },
  { t: tk(24, 0), card: null },
  { t: tk(25, 0), card: 'OV2a', at: full(4.2) },
  { t: tk(25, 4), card: 'OV2b', at: full(4.2) },
  { t: tk(25, 7), card: 'OV2c', at: full(4.2) },
  { t: tk(26, 0), card: null },
  { t: tk(27, 0), card: 'OV3', at: full(3.5, 4.8, false, 1) },
  { t: tk(28, 0), card: 'OMX4', at: bust(3.4, 10.5, true) },
  { t: tk(28, 3), card: 'OM6', at: full(3.6) },
  { t: tk(29, 0), card: 'OV4', at: full(3.6, 4.8, false, 2) },
  { t: tk(29, 6), card: null },
  { t: tk(29, 7), card: 'OMX2', at: bust(3.8, 10.5, true) },
  { t: V4.start, card: null },
  { t: tk(39, 0), card: 'OMX5', at: bust(3.6, 10.5, true) },
  { t: tk(39, 2), card: 'OV5', at: full(3.4, 4.8) },
  { t: tk(40, 0), card: null },
  { t: tk(41, 0), card: 'OC2', at: full(3.8, 4.8, false, 1.5) },
  { t: tk(41, 2), card: 'OV6', at: full(3.8, 4.8, false, 1.5) },
  { t: tk(41, 7), card: 'OMX4', at: bust(3.6, 10.5, true) },
  { t: tk(42, 0), card: 'OMX1', at: bust(4.2, 10.5, true) },
  { t: tk(42, 3), card: null },
  { t: tk(43, 1), card: 'OMX3', at: bust(3.6, 10.5, true) },
  { t: tk(43, 3), card: 'OV7', at: full(3.8, 5.0, false, 1.5) },
  ...metalPoses('O'),
];

/** The type of these sections: one designed form per line part (scene-map.md "Type is the star again"). */
export const REST_TYPE: TypeEntry[] = [
  { id: 'r-rebased', line: 23, range: [0, 8], form: 'LightBox', t0: tk(23, 0) - 0.05, t1: tk(24, 0), singer: 'O', key: 1 },
  { id: 'r-mine', line: 24, range: [0, 8], form: 'Wave', t0: tk(24, 0) - 0.05, t1: tk(25, 0), singer: 'B', key: 3 },
  { id: 'r-squash', line: 25, range: [0, 9], form: 'Stack', t0: tk(25, 0) - 0.05, t1: tk(26, 0), singer: 'O', key: 1 },
  { id: 'r-blame', line: 26, range: [0, 10], form: 'Code', t0: tk(26, 0) - 0.05, t1: tk(27, 0), singer: 'B', key: 5 },
  { id: 'r-red', line: 27, range: [0, 4], form: 'Marquee', t0: tk(27, 0) - 0.05, t1: tk(28, 0), singer: 'O', key: 3 },
  { id: 'r-gone', line: 28, range: [0, 4], form: 'DissolveText', t0: tk(28, 0) - 0.05, t1: tk(29, 0), singer: 'B', key: 3 },
  { id: 'r-five', line: 29, range: [0, 5], form: 'Counter', t0: tk(29, 0) - 0.05, t1: tk(29, 5), singer: 'both', key: 4 },
  { id: 'r-nobody', line: 29, range: [5, 8], form: 'Flap', t0: tk(29, 5) - 0.05, t1: V3.end, singer: 'both', key: 1 },
  { id: 'r-tabs', line: 38, range: [0, 3], form: 'Slam', t0: tk(38, 0) - 0.05, t1: tk(39, 0), singer: 'B', key: 2 },
  { id: 'r-spaces', line: 39, range: [0, 3], form: 'Extrude', t0: tk(39, 0) - 0.05, t1: tk(40, 0), singer: 'O', key: 2 },
  { id: 'r-data2', line: 40, range: [0, 5], form: 'LightBox', t0: tk(40, 0) - 0.05, t1: tk(41, 0), singer: 'B', key: 4 },
  { id: 'r-touch', line: 41, range: [0, 9], form: 'Code', t0: tk(41, 0) - 0.05, t1: tk(42, 0), singer: 'O', key: 7 },
  { id: 'r-wrote', line: 42, range: [0, 4], form: 'Stamp', t0: tk(42, 0) - 0.05, t1: tk(43, 0), singer: 'B', key: 3 },
  { id: 'r-touched', line: 43, range: [0, 5], form: 'Diff', t0: tk(43, 0) - 0.05, t1: SCREAM.start, singer: 'O', key: 3 },
  { id: 'r-scream', line: 44, range: [0, 1], form: 'Shout', t0: SCREAM.start, t1: SCREAM.end, singer: 'both', key: 0, style: 'steel', text: 'AAAAAH!' },
  { id: 'r-git', line: 45, range: [0, 1], form: 'Slam', t0: tk(45, 0), t1: tk(46, 0), singer: 'O', key: 0 },
  { id: 'r-push', line: 46, range: [0, 1], form: 'Extrude', t0: tk(46, 0), t1: tk(47, 0), singer: 'O', key: 0 },
  { id: 'r-force', line: 47, range: [0, 1], form: 'Shout', t0: tk(47, 0), t1: WHISPER.start, singer: 'O', key: 0, style: 'steel', text: 'FORCE!' },
  { id: 'r-wouldnt', line: 48, range: [0, 2], form: 'DissolveText', t0: tk(48, 0) - 0.05, t1: WHISPER.end, singer: 'B', key: 1 },
];
