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
  | 'whitespace' | 'nametag' | 'lasercase' | 'scream' | 'cathedral' | 'forge' | 'warning' | 'pushface' | 'whisper' | 'tunnel' | 'arena' | 'duel';
export type CamVariant = 'hero' | 'close' | 'low' | 'reverse' | 'wide';
export interface RShot { id: string; t: number; scene: RestScene; cam: CamVariant; into?: TransitionKind }
export interface RPose { t: number; card: string | null; at?: Placement }

const tk = (line: number, k: number) => at(`tok-${line}-${k}`);
export const V3 = sectionNamed('verse3_rebase');
export const V4 = sectionNamed('verse4_trade');
export const SCREAM = sectionNamed('scream');
export const PUSH = sectionNamed('breakdown_git_push_force');
export const WHISPER = sectionNamed('whisper');
export const SOLO = sectionNamed('guitar_solo');
export const REST_END = SOLO.end;
const db = (t: number) => downbeats.find((x) => x >= t - 0.02) as number;
const bt = (t: number) => beats.find((x) => x >= t - 0.02) as number;

export const RSHOTS: RShot[] = [
  // V3: orange rebases blue's history while she sleeps; they trade lines
  { id: 'rebase', t: V3.start, scene: 'rails', cam: 'hero', into: 'dissolve' },
  { id: 'rebase-asleep', t: tk(23, 5), scene: 'rails', cam: 'low', into: 'shock' },
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
  { id: 'nobody', t: tk(29, 6), scene: 'callgrid', cam: 'wide', into: 'shock' },
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
  // the scream: both screaming; blue turns metal (the costume schedule)
  { id: 'scream', t: SCREAM.start, scene: 'scream', cam: 'hero', into: 'shatter' },
  { id: 'scream-2', t: db(SCREAM.start + 1.2), scene: 'scream', cam: 'close', into: 'shock' },
  // GIT! PUSH! FORCE!: the slowest and heaviest stretch, one pose per word, the warning screen
  { id: 'push-hall', t: PUSH.start, scene: 'cathedral', cam: 'hero', into: 'tunnel' },
  { id: 'push-git', t: tk(45, 0), scene: 'cathedral', cam: 'low', into: 'shock' },
  { id: 'push-warning', t: db(tk(45, 0) + 1.6), scene: 'warning', cam: 'hero', into: 'diff' },
  { id: 'push-push', t: tk(46, 0), scene: 'forge', cam: 'low', into: 'shatter' },
  { id: 'push-force', t: tk(47, 0), scene: 'pushface', cam: 'hero', into: 'shock' },
  // the whisper: the quietest frame of the clip
  { id: 'whisper', t: WHISPER.start, scene: 'whisper', cam: 'hero', into: 'dissolve' },
  // the solo: the dance duel, cuts on the riff through the metal worlds
  { id: 'solo-forge', t: SOLO.start, scene: 'forge', cam: 'hero', into: 'streaks' },
  { id: 'solo-forge-2', t: bt(SOLO.start + 0.66), scene: 'forge', cam: 'close', into: 'shock' },
  { id: 'solo-cathedral', t: db(SOLO.start + 1.3), scene: 'cathedral', cam: 'hero', into: 'shatter' },
  { id: 'solo-cathedral-2', t: bt(SOLO.start + 2.0), scene: 'cathedral', cam: 'low', into: 'shock' },
  { id: 'solo-tunnel', t: db(SOLO.start + 2.6), scene: 'tunnel', cam: 'hero', into: 'tunnel' },
  { id: 'solo-tunnel-2', t: bt(SOLO.start + 3.3), scene: 'tunnel', cam: 'close', into: 'shock' },
  { id: 'solo-arena', t: db(SOLO.start + 3.95), scene: 'arena', cam: 'wide', into: 'mirror' },
  { id: 'solo-arena-slash', t: bt(SOLO.start + 4.65), scene: 'arena', cam: 'low', into: 'shock' },
  { id: 'solo-arena-3', t: bt(SOLO.start + 5.3), scene: 'arena', cam: 'close', into: 'shock' },
  { id: 'solo-duel', t: db(SOLO.start + 6.6), scene: 'duel', cam: 'hero', into: 'shatter' },
  { id: 'solo-duel-2', t: bt(SOLO.start + 7.3), scene: 'duel', cam: 'close', into: 'shock' },
  { id: 'solo-forge-3', t: db(SOLO.start + 7.95), scene: 'forge', cam: 'wide', into: 'streaks' },
  { id: 'solo-forge-4', t: bt(SOLO.start + 8.65), scene: 'forge', cam: 'low', into: 'shock' },
  { id: 'solo-cathedral-3', t: db(SOLO.start + 9.3), scene: 'cathedral', cam: 'reverse', into: 'ink' },
  { id: 'solo-cathedral-4', t: bt(SOLO.start + 10.0), scene: 'cathedral', cam: 'close', into: 'shock' },
  { id: 'solo-end', t: db(SOLO.start + 11.9), scene: 'duel', cam: 'wide', into: 'shatter' },
];
for (let i = 1; i < RSHOTS.length; i++) {
  const a = RSHOTS[i - 1] as RShot;
  const b = RSHOTS[i] as RShot;
  if (b.t - a.t < 0.12) throw new Error(`rest plan: shot ${b.id} at ${b.t.toFixed(2)} s is not after ${a.id} (${a.t.toFixed(2)} s)`);
}

const full = (x: number, height = 4.8, flip = false, z = 0): Placement => ({ x, height, flip, z });
const bust = (x: number, height = 10.5, flip = false): Placement => ({ x, feet: -5.4, height, flip, z: 0 });

/** Blue is disco until the scream, metal from 117.36 s (girls/costume.ts). */
export const BLUE_METAL_AT = SCREAM.start;

export const RBLUE: RPose[] = [
  { t: V3.start, card: null },
  { t: tk(24, 0), card: 'BD4', at: full(-3, 4.8) },
  { t: tk(24, 5), card: 'BX3', at: bust(-2.6) },
  { t: tk(25, 0), card: null },
  { t: tk(26, 0), card: 'BD2', at: full(0, 4.8) },
  { t: tk(26, 5), card: 'BX4', at: bust(-1.2) },
  { t: tk(27, 0), card: null },
  { t: tk(28, 0), card: 'BX3', at: bust(-3.4) },
  { t: tk(28, 3), card: 'BC2', at: full(-3.6) },
  { t: tk(29, 0), card: 'BD7', at: full(-3.6, 4.8, false, 2) },
  { t: tk(29, 6), card: 'BX5', at: bust(-3.8) },
  { t: V4.start, card: 'BX4', at: bust(-3.4) },
  { t: tk(39, 0), card: 'BX2', at: bust(-4.4) },
  { t: tk(40, 0), card: 'BC3', at: full(-4, 4.8, false, 1) },
  { t: tk(41, 0), card: 'BX3', at: bust(-4.2) },
  { t: tk(42, 0), card: 'BX4', at: bust(-3.6) },
  { t: tk(42, 3), card: 'BC2', at: full(-4, 4.8, false, 1.5) },
  { t: tk(43, 1), card: 'BX3', at: bust(-4.4) },
  // the scream: BX4 becomes BMX2 through a particle dissolve on the downbeat (VersesShot's intruder pattern)
  { t: SCREAM.start, card: 'BMX2', at: { x: -4.2, feet: -5.4, height: 10.5, z: 0 } },
  { t: PUSH.start, card: null },
  { t: WHISPER.start, card: 'BQ3', at: full(-1, 5.0) },
  { t: tk(48, 1), card: 'BMX5', at: bust(-1.0, 11) },
  { t: SOLO.start, card: null },
  { t: db(SOLO.start + 1.3), card: 'BQ1', at: full(-2.8, 5.0) },
  { t: db(SOLO.start + 2.6), card: 'BM3', at: full(-1.6, 4.6) },
  { t: db(SOLO.start + 3.95), card: 'BQ2', at: full(-3.3, 5.0) },
  { t: bt(SOLO.start + 4.65), card: 'BQ2', at: full(-2.6, 5.4) },
  { t: db(SOLO.start + 6.6), card: 'BMX4', at: { x: -4.4, feet: -5.4, height: 10.5, z: 0 } },
  { t: db(SOLO.start + 7.95), card: null },
  { t: db(SOLO.start + 9.3), card: 'BQ1', at: full(-2.4, 5.0) },
  { t: db(SOLO.start + 11.9), card: 'BMX3', at: { x: -4.4, feet: -5.4, height: 10.5, z: 0 } },
];
export const RORANGE: RPose[] = [
  { t: V3.start, card: 'OM5', at: full(2.5, 4.8) },
  { t: tk(23, 5), card: 'OMX5', at: bust(2.4, 10.5, true) },
  { t: tk(24, 0), card: null },
  { t: tk(25, 0), card: 'OC1', at: full(4.2) },
  { t: tk(25, 6), card: 'OMX2', at: bust(3.2, 10.5, true) },
  { t: tk(26, 0), card: null },
  { t: tk(27, 0), card: 'OC2', at: full(3.5, 4.8, false, 1) },
  { t: tk(28, 0), card: 'OMX4', at: bust(3.4, 10.5, true) },
  { t: tk(28, 3), card: 'OM6', at: full(3.6) },
  { t: tk(29, 0), card: 'OM3', at: full(3.6, 4.8, false, 2) },
  { t: tk(29, 6), card: 'OMX2', at: bust(3.8, 10.5, true) },
  { t: V4.start, card: null },
  { t: tk(39, 0), card: 'OMX5', at: bust(3.6, 10.5, true) },
  { t: tk(40, 0), card: null },
  { t: tk(41, 0), card: 'OC2', at: full(3.8, 4.8, false, 1.5) },
  { t: tk(41, 7), card: 'OMX4', at: bust(3.6, 10.5, true) },
  { t: tk(42, 0), card: 'OMX1', at: bust(4.2, 10.5, true) },
  { t: tk(42, 3), card: null },
  { t: tk(43, 1), card: 'OMX3', at: bust(3.6, 10.5, true) },
  { t: tk(43, 3), card: 'OC1', at: full(3.8, 5.0, false, 1.5) },
  { t: SCREAM.start, card: 'OMX3', at: { x: 4.2, feet: -5.4, height: 10.5, z: 0, flip: true } },
  // GIT! PUSH! FORCE!: one pose per word
  { t: PUSH.start, card: 'OM4', at: full(0, 5.2) },
  { t: tk(45, 0), card: 'OQ1', at: full(0, 5.4) },
  { t: db(tk(45, 0) + 1.6), card: null },
  { t: tk(46, 0), card: 'OQ2', at: full(3, 5.4) },
  { t: tk(47, 0), card: 'OQ3', at: full(0.4, 6.0) },
  { t: WHISPER.start, card: null },
  { t: SOLO.start, card: 'OQ4', at: full(3, 5.2) },
  { t: db(SOLO.start + 1.3), card: 'OM1', at: full(2.8, 4.8) },
  { t: db(SOLO.start + 2.6), card: 'OQ4', at: full(1.6, 4.6) },
  { t: db(SOLO.start + 3.95), card: 'OQ4', at: full(3.3, 5.0) },
  { t: db(SOLO.start + 6.6), card: 'OMX2', at: { x: 4.4, feet: -5.4, height: 10.5, z: 0, flip: true } },
  { t: db(SOLO.start + 7.95), card: 'OQ4', at: full(3, 5.2) },
  { t: db(SOLO.start + 9.3), card: 'OC3', at: full(2.4, 5.0) },
  { t: db(SOLO.start + 11.9), card: 'OMX3', at: { x: 4.4, feet: -5.4, height: 10.5, z: 0, flip: true } },
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
