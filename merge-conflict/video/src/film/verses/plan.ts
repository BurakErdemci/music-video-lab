// Verse 1, verse 2 and the pre-chorus as data (round 6 elite pass, scene-map.md "Elite pass"): a new world every
// 2-4 bars, a cut every 1-2 bars inside it, each line drawn by a designed form (typeplan.ts). A shot names its
// world and a camera variant of that world's hero move; the girls cut pose on sung words (anticipation ->
// release). Node-safe (no JSX): tools read the type entries.
import type { Placement } from '../../cards/Card.tsx';
import { at } from '../../events.ts';
import { downbeats, sectionNamed } from '../../timing.ts';
import type { TransitionKind } from '../../transitions/scene/scene.tsx';
import type { TypeEntry } from '../chorus/typeplan.ts';

export type VerseScene = 'subway' | 'runway' | 'press' | 'clock' | 'rails' | 'graffiti' | 'alley' | 'stadium' | 'strobe' | 'transform' | 'arena';
/** Camera variants of a world's hero move: as authored, closer on the girl, from below, and travelling back. */
export type CamVariant = 'hero' | 'close' | 'low' | 'reverse' | 'wide';
export interface VShot { id: string; t: number; scene: VerseScene; cam: CamVariant; into?: TransitionKind }
export interface VPose { t: number; card: string | null; at?: Placement }

const tk = (line: number, k: number) => at(`tok-${line}-${k}`);
export const V1 = sectionNamed('verse1_sweet');
export const V2S = sectionNamed('verse2_raspy');
/** The pre-chorus shouts begin before the section's first downbeat. */
export const PRE_T = tk(10, 0);
export const VERSES_END = tk(15, 0);
/** The first downbeat inside "Reviewed and approved": the cut to blue's close-up between two stamps. */
const PRESS_CLOSE = downbeats.find((x) => x > tk(4, 0) + 0.4) as number;

export const VSHOTS: VShot[] = [
  // V1, blue alone, the neon light-box city
  { id: 'sub-ride', t: V1.start, scene: 'subway', cam: 'hero', into: 'streaks' },
  { id: 'sub-head', t: tk(2, 1), scene: 'subway', cam: 'close', into: 'shock' },
  { id: 'sub-main', t: tk(2, 3), scene: 'subway', cam: 'low', into: 'shock' },
  { id: 'sub-kick', t: tk(2, 5), scene: 'subway', cam: 'wide', into: 'shock' },
  { id: 'run-line', t: tk(3, 0), scene: 'runway', cam: 'hero', into: 'diff' },
  { id: 'run-blue', t: tk(3, 5), scene: 'runway', cam: 'close', into: 'shock' },
  { id: 'press-wall', t: tk(4, 0), scene: 'press', cam: 'hero', into: 'mirror' },
  { id: 'press-close', t: PRESS_CLOSE, scene: 'press', cam: 'close', into: 'shock' },
  { id: 'press-team', t: tk(4, 6), scene: 'press', cam: 'low', into: 'shock' },
  { id: 'clock-tower', t: tk(5, 0), scene: 'clock', cam: 'hero', into: 'ink' },
  { id: 'clock-strike', t: tk(5, 4), scene: 'clock', cam: 'low', into: 'shock' },
  { id: 'clock-who', t: tk(5, 5), scene: 'clock', cam: 'wide', into: 'shock' },
  // V2, orange's night world (disco costume): spray paint and neon
  { id: 'rails', t: tk(5, 7), scene: 'rails', cam: 'hero', into: 'dissolve' },
  { id: 'rails-fresh', t: tk(6, 3), scene: 'rails', cam: 'low', into: 'shock' },
  { id: 'graffiti', t: tk(7, 0), scene: 'graffiti', cam: 'hero', into: 'ink' },
  { id: 'graffiti-orange', t: tk(7, 3), scene: 'graffiti', cam: 'close', into: 'shock' },
  { id: 'graffiti-right', t: tk(7, 7), scene: 'graffiti', cam: 'wide', into: 'shock' },
  { id: 'alley', t: tk(8, 0), scene: 'alley', cam: 'hero', into: 'streaks' },
  { id: 'alley-css', t: tk(8, 3), scene: 'alley', cam: 'reverse', into: 'shock' },
  { id: 'alley-fight', t: tk(8, 6), scene: 'alley', cam: 'low', into: 'shock' },
  { id: 'stadium', t: tk(9, 0), scene: 'stadium', cam: 'hero', into: 'mirror' },
  { id: 'stadium-never', t: tk(9, 5), scene: 'stadium', cam: 'close', into: 'shock' },
  // pre-chorus: a strobe split, the ping-pong; orange's metal transformation on "ORANGE!"
  { id: 'ping-blue', t: tk(10, 0), scene: 'strobe', cam: 'hero', into: 'shatter' },
  { id: 'ping-orange', t: tk(11, 0), scene: 'strobe', cam: 'close', into: 'shock' },
  { id: 'ping-blue2', t: tk(12, 0), scene: 'strobe', cam: 'hero', into: 'shock' },
  { id: 'transform', t: tk(13, 0), scene: 'transform', cam: 'hero', into: 'shatter' },
  { id: 'resolve', t: tk(14, 0), scene: 'arena', cam: 'wide', into: 'streaks' },
  { id: 'resolve-this', t: tk(14, 2), scene: 'arena', cam: 'low', into: 'shock' },
];
for (let i = 1; i < VSHOTS.length; i++) {
  const a = VSHOTS[i - 1] as VShot;
  const b = VSHOTS[i] as VShot;
  if (b.t - a.t < 0.12) throw new Error(`verse plan: shot ${b.id} at ${b.t.toFixed(2)} s is not after ${a.id} (${a.t.toFixed(2)} s)`);
}

const full = (x: number, height = 4.8, flip = false, z = 0): Placement => ({ x, height, flip, z });
const bust = (x: number, height = 10.5, flip = false): Placement => ({ x, feet: -5.4, height, flip, z: 0 });

export const VBLUE: VPose[] = [
  { t: V1.start, card: 'BD3', at: full(-3) },
  { t: tk(2, 1), card: 'BX2', at: bust(-2.4) },
  { t: tk(2, 3), card: 'BD5', at: full(-3) },
  // the kick: BD6 where proof.ts's KICK plan expects her (VERSE_FULL), so HEAD flies off her foot
  { t: tk(2, 5), card: 'BD6', at: { x: -4.4, height: 4.6 } },
  { t: tk(3, 0), card: 'BD4', at: full(-2.2, 4.8) },
  { t: tk(3, 5), card: 'BX5', at: bust(-2.4) },
  { t: tk(4, 0), card: 'BC3', at: full(-4.2, 4.8, false, 1.5) },
  { t: PRESS_CLOSE, card: 'BX1', at: bust(-3.2) },
  { t: tk(4, 6), card: 'BX2', at: bust(-3.2) },
  { t: tk(5, 0), card: 'BD7', at: full(-4, 4.6, false, 2) },
  { t: tk(5, 4), card: 'BD2', at: full(-4, 4.6, false, 2) },
  { t: tk(5, 5), card: 'BX3', at: bust(-3.4) },
  { t: tk(5, 7), card: null },
  { t: tk(8, 0), card: 'BD2', at: full(-2.6) },
  { t: tk(8, 4), card: 'BC2', at: full(-2.6) },
  { t: tk(9, 0), card: null },
  { t: tk(10, 0), card: 'BX4', at: bust(-4.4) },
  { t: tk(11, 0), card: 'BX3', at: bust(-4.4) },
  { t: tk(12, 0), card: 'BX4', at: bust(-4.4) },
  { t: tk(13, 0), card: null },
  { t: tk(14, 0), card: 'BD7', at: full(-3.3, 5.0) },
];
export const VORANGE: VPose[] = [
  { t: V1.start, card: null },
  // the intruder: she gathers out of particles on "you?" and waves in
  { t: tk(5, 7), card: 'OI1', at: full(3.6, 4.8) },
  { t: tk(6, 1), card: 'OD3', at: full(2.5, 4.8) },
  { t: tk(6, 3), card: 'OD4', at: full(2.5, 4.8) },
  { t: tk(7, 0), card: 'OD7', at: full(3.8, 4.8) },
  { t: tk(7, 3), card: 'OX1', at: { x: 2.6, feet: -5.2, height: 10, z: 0, flip: true } },
  { t: tk(7, 7), card: 'OI2', at: full(3.8, 4.8) },
  { t: tk(8, 0), card: 'OD7', at: full(2.6, 4.8) },
  { t: tk(8, 6), card: 'OD8', at: full(2.6, 4.8) },
  { t: tk(9, 0), card: 'OD8', at: full(3.5, 4.8) },
  { t: tk(9, 5), card: 'OX1', at: { x: 3.0, feet: -5.2, height: 10, z: 0, flip: true } },
  { t: tk(10, 0), card: null },
  { t: tk(11, 0), card: 'OX1', at: { x: 4.4, feet: -5.2, height: 10, z: 0, flip: true } },
  { t: tk(13, 0), card: 'OMX3', at: { x: 1.8, feet: -5.4, height: 11, z: 0, flip: true } },
  { t: tk(14, 0), card: 'OM3', at: full(3.3, 5.0) },
];

/** The verses' type: one designed form per line part (scene-map.md "Type is the star again"). */
export const VERSE_TYPE: TypeEntry[] = [
  { id: 'v-head', line: 2, range: [0, 8], form: 'Stack', t0: V1.start, t1: tk(3, 0), singer: 'B', key: 1 },
  { id: 'v-line42', line: 3, range: [0, 10], form: 'Flap', t0: tk(3, 0) - 0.05, t1: tk(4, 0), singer: 'B', key: 5 },
  { id: 'v-approved', line: 4, range: [0, 8], form: 'Stamp', t0: tk(4, 0) - 0.05, t1: tk(5, 0), singer: 'B', key: 2 },
  { id: 'v-midnight', line: 5, range: [0, 8], form: 'Ring', t0: tk(5, 0) - 0.05, t1: tk(6, 0), singer: 'B', key: 4 },
  { id: 'v-feature', line: 6, range: [0, 3], form: 'Hoop', t0: tk(6, 0) - 0.05, t1: tk(6, 3), singer: 'O', key: 1 },
  { id: 'v-fresh', line: 6, range: [3, 8], form: 'Wave', t0: tk(6, 3) - 0.02, t1: tk(7, 0), singer: 'O', key: 4 },
  { id: 'v-orange', line: 7, range: [0, 10], form: 'Diff', t0: tk(7, 0) - 0.05, t1: tk(8, 0), singer: 'O', key: 3 },
  { id: 'v-css', line: 8, range: [0, 9], form: 'Extrude', t0: tk(8, 0) - 0.05, t1: tk(9, 0), singer: 'O', key: 3 },
  { id: 'v-commits', line: 9, range: [0, 3], form: 'Counter', t0: tk(9, 0) - 0.05, t1: tk(10, 0), singer: 'O', key: 2 },
  { id: 'v-never', line: 9, range: [3, 8], form: 'Marquee', t0: tk(9, 3) - 0.05, t1: tk(10, 0), singer: 'O', key: 5 },
  { id: 'p-blue', line: 10, range: [0, 1], form: 'Slam', t0: tk(10, 0), t1: tk(11, 0), singer: 'B', key: 0 },
  { id: 'p-orange', line: 11, range: [0, 1], form: 'Extrude', t0: tk(11, 0), t1: tk(12, 0), singer: 'O', key: 0 },
  { id: 'p-blue2', line: 12, range: [0, 1], form: 'Flap', t0: tk(12, 0), t1: tk(13, 0), singer: 'B', key: 0 },
  { id: 'p-transform', line: 13, range: [0, 1], form: 'Shout', t0: tk(13, 0), t1: tk(14, 0), singer: 'O', key: 0, style: 'steel', text: 'ORANGE!' },
  { id: 'p-resolve', line: 14, range: [0, 3], form: 'LightBox', t0: tk(14, 0) - 0.05, t1: VERSES_END, singer: 'both', key: 1 },
];

/** The intro (Speaker.tsx): the terminal Code of line 0, FIX morphed out of it, the marker wipe to the Flap of line 1. */
export const INTRO_TYPE: TypeEntry[] = [
  { id: 'i-failed', line: 0, range: [0, 3], form: 'Code', t0: 0, t1: at('wipe-flap'), singer: 'B', key: 2 },
  { id: 'i-fix', line: 1, range: [0, 7], form: 'Flap', t0: at('wipe-flap'), t1: sectionNamed('intro_groove').start, singer: 'B', key: 1 },
];
