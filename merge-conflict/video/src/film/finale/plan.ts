// The last section of the song (140.04-232.12 s, round 8) as data: the piano truce, the build's continuous flight
// into the two-branches tree, the final chorus "Accept both", the "Ship it" chant, "Build failed" (blue reads it,
// mirroring the intro), the scream end and the outro. The same shape as film/rest/plan.ts: a shot is a world, a
// camera variant and move, and the girls it shows; cuts land on sung words, beats and downbeats. Node-safe (no JSX).
import type { Placement } from '../../cards/Card.tsx';
import { at } from '../../events.ts';
import { beats, downbeats, sectionNamed } from '../../timing.ts';
import type { TransitionKind } from '../../transitions/scene/scene.tsx';
import type { TypeEntry } from '../chorus/typeplan.ts';
import { faceSized } from '../framing.ts';
import './frames.ts';

export const PIANO = sectionNamed('piano_interlude');
export const BUILD = sectionNamed('build');
export const FINAL = sectionNamed('final_chorus');
export const CHANT = sectionNamed('post_chorus_chant');
export const FAILED = sectionNamed('robot_build_failed');
export const SCREAM_END = sectionNamed('scream_end');
export const OUTRO = sectionNamed('outro');
export const FINALE_START = PIANO.start;
export const FINALE_END = OUTRO.end;

export type FScene =
  | 'panel' | 'quiet' | 'flight'
  | 'arena' | 'spin' | 'split' | 'runway' | 'walls' | 'line' | 'logo'
  | 'forge' | 'cathedral' | 'tunnel' | 'marena' | 'duel' | 'faceO' | 'faceB' | 'terminal' | 'title'
  | 'stadium' | 'graffiti' | 'fire';
export type CamVariant = 'hero' | 'close' | 'low' | 'reverse' | 'wide';
export type Move = 'push' | 'orbit' | 'whip' | 'dollyzoom' | 'still';
/** A girl in a shot: her card and placement, null to hide her, absent to keep her pose. */
type Who = readonly [string, Placement] | null;
/** `panel`: for scene 'panel', the painting shown full frame (public/plates/<panel>.webp, depth map beside it).
 *  `fade`: the shot opens from black instead of a cover (out of the solo; the final freeze closes to black). */
export interface FShot { id: string; t: number; scene: FScene; cam: CamVariant; move?: Move; panel?: string; into?: TransitionKind; fade?: boolean; B?: Who; O?: Who; /** a shot added after Burak approved the shots around it: it takes no slot (shotSlot) */ inserted?: true }
export interface FPose { t: number; card: string | null; at?: Placement }

export const tk = (line: number, k: number): number => at(`tok-${line}-${k}`);
const db = (t: number) => downbeats.find((x) => x >= t - 0.02) as number;
const bt = (t: number) => beats.find((x) => x >= t - 0.02) as number;
/** The n-th downbeat after the one at (or just after) t. */
const dbN = (t: number, n: number) => downbeats[downbeats.findIndex((x) => x >= t - 0.02) + n] as number;

const full = (x: number, height = 5.0, flip = false, z = 0): Placement => ({ x, height, flip, z });
/** A face of a split or duel (left or right half), and a centred face cut-in: sized by the measured face box. */
const faceAt = (card: string, x: number, flip = false): Who => [card, faceSized(card, x, flip, 2.3, 0.5)];
const faceC = (card: string, flip = false): Who => [card, faceSized(card, 0, flip, 2.7, 0.6)];
/** Fusion busts: a shade smaller, so both laughing heads fit their halves with their chins. */
const bustAt = (card: string, x: number): Who => [card, faceSized(card, x, false, 1.8, 0.55)];
/** The stage-dive cards are landscape: they fly above the floor. */
const dive = (card: string, x: number, flip = false): Who => [card, { x, feet: -0.6, height: 3.0, flip, z: 0 }];

/** The build's girls: they rise from one knee in the tree and float up with it (the flight carries the camera). */
export const RISE: Record<'B' | 'O', Placement> = { B: { x: -2.4, feet: -4.0, height: 5.2, z: 2.0 }, O: { x: 2.4, feet: -4.0, height: 5.2, z: 2.0 } };
/** Round 9 (Burak approved a continuous flight into and through RK3): the build's first five bars are one camera
 *  flight into the two-branches painting (film/finale/paint.ts flightView); on the sixth downbeat the camera goes
 *  through the fork into the light-box rig, where the girls gather out of the particles and rise for the last three
 *  bars. The flight before the rig keeps the build's motion rising bar by bar (the rig measured 20+ per bar, a
 *  painting push under 10, so the painting comes first). */
export const BRANCHES_AT = db(156.0);

export const FSHOTS: FShot[] = [
  // ---- piano truce (140.04-149.38): disco, quiet, still; the girls come back from their own git lines
  { id: 'rk1', t: PIANO.start, scene: 'panel', panel: 'RK1', cam: 'hero', move: 'orbit', fade: true, B: null, O: null },
  { id: 'piano-blue', t: tk(49, 0), scene: 'quiet', cam: 'hero', move: 'push', into: 'dissolve', B: ['BP1', full(-1.4, 5.2)], O: null },
  { id: 'piano-blue-2', t: tk(49, 4), scene: 'quiet', cam: 'hero', move: 'orbit', into: 'shock' },
  { id: 'piano-orange', t: tk(50, 0), scene: 'quiet', cam: 'wide', move: 'push', into: 'dissolve', B: null, O: ['OP1', full(1.4, 5.2)] },
  { id: 'piano-orange-2', t: tk(50, 2), scene: 'quiet', cam: 'reverse', move: 'orbit', into: 'shock' },
  // "say hello": the mirror pair, palms nearly touching (RK2)
  { id: 'rk2', t: db(146.6), scene: 'panel', panel: 'RK2', cam: 'hero', move: 'orbit', into: 'dissolve', B: null, O: null },
  // ---- build (149.38-160.06): ONE continuous flight, no cut, into and through the two-branches tree (RK3)
  { id: 'flight', t: BUILD.start, scene: 'flight', cam: 'hero', move: 'still', into: 'dissolve', B: null, O: null },
  // ---- final chorus "Accept both" (160.06-181.44): fusion; the chorus's tools, a cut every word or two beats
  { id: 'acc1', t: tk(53, 0), scene: 'arena', cam: 'hero', move: 'push', into: 'tunnel', B: ['PB1', full(-3.3)], O: ['PO1', full(3.3)] },
  { id: 'acc1-both', t: tk(53, 1), scene: 'arena', cam: 'low', move: 'dollyzoom', into: 'shock' },
  { id: 'acc1-changes', t: tk(53, 2), scene: 'arena', cam: 'wide', move: 'orbit', into: 'shock' },
  { id: 'yes1', t: tk(53, 3), scene: 'split', cam: 'hero', move: 'push', into: 'glitch', B: bustAt('PBX2', -3.9), O: bustAt('POX2', 3.9) },
  { id: 'acc2', t: tk(54, 0), scene: 'arena', cam: 'reverse', move: 'whip', into: 'shock', B: ['PB3', full(-2.4)], O: ['PO3', full(2.4)] },
  { id: 'acc2-changes', t: tk(54, 2), scene: 'arena', cam: 'low', move: 'orbit', into: 'shock' },
  { id: 'yes2', t: tk(54, 3), scene: 'split', cam: 'reverse', move: 'push', into: 'shock', B: bustAt('PBX3', -3.9), O: bustAt('POX3', 3.9) },
  // "Blue and orange together, it's a gradient now": spinning hand in hand (RK4), then the gradient arena
  { id: 'rk4', t: tk(55, 0), scene: 'panel', panel: 'RK4', cam: 'hero', move: 'push', into: 'shock', B: null, O: null },
  { id: 'gradient', t: tk(55, 6), scene: 'spin', cam: 'hero', move: 'orbit', into: 'laser', B: ['PB6', full(-2.6)], O: ['PO6', full(2.6)] },
  { id: 'gradient-now', t: tk(55, 7), scene: 'spin', cam: 'low', move: 'whip', into: 'shock' },
  // "Two girls, one line,": the runway again, but now they reach for each other (chorus 1 had them back to back)
  { id: 'line-two', t: tk(56, 0), scene: 'runway', cam: 'hero', move: 'push', into: 'shock', B: ['PB3', full(-1.5, 4.8)], O: ['PO3', full(1.5, 4.8)] },
  { id: 'line-girls', t: tk(56, 1), scene: 'runway', cam: 'reverse', move: 'whip', into: 'shock' },
  { id: 'line-one', t: tk(56, 2), scene: 'runway', cam: 'hero', move: 'dollyzoom', into: 'shock' },
  // "and we figured it out": cheek to cheek at one mic (RK5)
  { id: 'rk5', t: tk(56, 4), scene: 'panel', panel: 'RK5', cam: 'hero', move: 'push', into: 'shock', B: null, O: null },
  // the high five on the downbeat after the line
  { id: 'highfive', t: tk(56, 7), scene: 'arena', cam: 'hero', move: 'orbit', into: 'streaks', B: ['PB5', full(-1.9, 4.8)], O: ['PO5', full(1.9, 4.8)] },
  { id: 'highfive-b', t: bt(169.5), scene: 'arena', cam: 'low', move: 'whip', into: 'shock' },
  { id: 'highfive-2', t: bt(170.0), scene: 'arena', cam: 'hero', move: 'whip', into: 'shock' },
  { id: 'acc3', t: tk(57, 0), scene: 'arena', cam: 'wide', move: 'whip', into: 'shock', B: ['PB1', full(-3.0)], O: ['PO1', full(3.0)] },
  { id: 'acc3-both', t: tk(57, 1), scene: 'arena', cam: 'low', move: 'push', into: 'shock' },
  { id: 'acc3-changes', t: tk(57, 2), scene: 'arena', cam: 'reverse', move: 'orbit', into: 'shock' },
  { id: 'yes3', t: tk(57, 3), scene: 'split', cam: 'hero', move: 'still', into: 'shock', B: bustAt('PBX1', -3.9), O: bustAt('POX2', 3.9) },
  // "Commit and push it! (PUSH IT!)": both push, then the half mirror ball, half fireball (RK6)
  { id: 'commit', t: tk(58, 0), scene: 'arena', cam: 'hero', move: 'dollyzoom', into: 'streaks', B: ['PB2', full(-2.6)], O: ['PO2', full(2.6)] },
  { id: 'commit-push', t: tk(58, 2), scene: 'arena', cam: 'reverse', move: 'dollyzoom', into: 'shock' },
  { id: 'rk6', t: tk(58, 4), scene: 'panel', panel: 'RK6', cam: 'hero', move: 'push', into: 'shock', B: null, O: null },
  // "Equals, equals, equals": the walls close in, and this time they push them apart
  { id: 'eq1', t: tk(59, 0), scene: 'walls', cam: 'hero', move: 'push', into: 'shock', B: ['PB2', full(-1.5, 4.8)], O: ['PO2', full(1.5, 4.8)] },
  { id: 'eq2', t: tk(59, 1), scene: 'walls', cam: 'reverse', move: 'push', into: 'shock' },
  { id: 'eq3', t: tk(59, 2), scene: 'walls', cam: 'low', move: 'push', into: 'shock' },
  { id: 'whole', t: tk(59, 3), scene: 'line', cam: 'hero', move: 'push', into: 'shock', B: ['PB4', full(-1.8, 4.6)], O: ['PO4', full(1.8, 4.6)] },
  { id: 'whole-b', t: tk(59, 5), scene: 'line', cam: 'low', move: 'dollyzoom', into: 'shock' },
  // "Merge conflict resolved": the logo move, resolved - the halves fly in and lock, the girls ride them into a high five
  { id: 'merge', t: tk(60, 0), scene: 'logo', cam: 'hero', move: 'still', into: 'tunnel', B: ['PB5', full(-3.4, 4.8)], O: ['PO5', full(3.4, 4.8)] },
  { id: 'merge-lock', t: tk(60, 1), scene: 'logo', cam: 'hero', move: 'push', into: 'shock' },
  { id: 'rk7', t: tk(60, 2), scene: 'panel', panel: 'RK7', cam: 'hero', move: 'push', into: 'shock', B: null, O: null },
  { id: 'soul', t: tk(60, 4), scene: 'spin', cam: 'hero', move: 'whip', into: 'shock', B: ['PB6', full(-2.4)], O: ['PO6', full(2.4)] },
  { id: 'soul-2', t: tk(60, 5), scene: 'spin', cam: 'low', move: 'orbit', into: 'shock' },
  { id: 'final-out', t: db(180.0), scene: 'spin', cam: 'wide', move: 'push', into: 'shock' },
  { id: 'final-out-b', t: bt(180.4), scene: 'spin', cam: 'low', move: 'dollyzoom', into: 'shock' },
  // ---- the chant (181.44-193.48): both metal; headbang, stage dive, ship it (RK8)
  { id: 'chant', t: CHANT.start, scene: 'forge', cam: 'hero', move: 'push', B: ['BH1', full(-2.5, 4.8)], O: ['OH1', full(2.5, 4.8)] },
  { id: 'chant-both', t: tk(61, 1), scene: 'forge', cam: 'low', move: 'orbit', into: 'shock' },
  { id: 'chant-faces', t: tk(61, 2), scene: 'duel', cam: 'hero', move: 'push', into: 'shock', B: faceAt('BMX2', -4.4), O: faceAt('OMX2', 4.4, true) },
  { id: 'rk8', t: tk(61, 4), scene: 'panel', panel: 'RK8', cam: 'hero', move: 'push', into: 'shock', B: null, O: null },
  { id: 'dive', t: tk(62, 0), scene: 'tunnel', cam: 'hero', move: 'push', into: 'tear', B: dive('BH2', -2.2), O: dive('OH2', 2.4) },
  { id: 'dive-b', t: tk(62, 2), scene: 'tunnel', cam: 'hero', move: 'whip', into: 'shock' },
  { id: 'ship', t: tk(62, 4), scene: 'cathedral', cam: 'low', move: 'orbit', into: 'shock', B: ['BS2', full(-2.6, 5.0)], O: ['OS2', full(2.6, 5.0)] },
  { id: 'chant-2', t: tk(63, 0), scene: 'forge', cam: 'reverse', move: 'push', into: 'shock', B: ['BH1', full(-2.4, 4.8)], O: ['OH1', full(2.4, 4.8)] },
  { id: 'chant-faces-2', t: tk(63, 2), scene: 'duel', cam: 'hero', move: 'dollyzoom', into: 'shock', B: faceAt('BMX4', -4.4), O: faceAt('OMX3', 4.4, true) },
  { id: 'ship-2', t: tk(63, 4), scene: 'marena', cam: 'wide', move: 'whip', into: 'tear', B: ['BS1', full(-3.0, 5.0)], O: ['OS1', full(3.0, 5.0)] },
  { id: 'dive-2', t: tk(64, 0), scene: 'tunnel', cam: 'low', move: 'push', into: 'shock', B: dive('BH2', -2.0), O: dive('OH2', 2.2) },
  { id: 'dive-2b', t: tk(64, 2), scene: 'tunnel', cam: 'low', move: 'orbit', into: 'shock' },
  { id: 'ship-3', t: tk(64, 4), scene: 'cathedral', cam: 'hero', move: 'dollyzoom', into: 'shock', B: ['BS3', full(-2.4, 5.0)], O: ['OS3', full(2.4, 5.0)] },
  // ---- "Build failed. Syntax error on line forty-two." (193.10-196.49): the music stops; blue reads it deadpan
  //      (the intro's terminal), orange's jaw drops, the frozen jump (RK9). Comedic hard stop: hard cuts, no move.
  { id: 'failed', t: tk(65, 0), scene: 'terminal', cam: 'hero', move: 'still', B: ['BH3', full(-2.4, 6.4)], O: null },
  { id: 'jaw', t: tk(66, 0), scene: 'terminal', cam: 'close', move: 'still', into: 'shock', B: null, O: ['OH3', full(-2.4, 6.4)] },
  { id: 'rk9', t: tk(66, 2), scene: 'panel', panel: 'RK9', cam: 'hero', move: 'still', B: null, O: null },
  // ---- the scream end (196.15-213.54): metal; sky scream, guitar smash, keytar spin, the scream pillar (RK10)
  { id: 'pillar', t: SCREAM_END.start, scene: 'panel', panel: 'RK10', cam: 'hero', move: 'push', into: 'tear', B: null, O: null },
  // round 9: no set more than twice (Burak: the forge and the laser stage came round again and again) - the stadium,
  // the fire hall, the graffiti alley and RK8 join; face inserts for each girl in her own colour
  { id: 'sky', t: db(197.4), scene: 'stadium', cam: 'low', move: 'push', into: 'tear', B: ['BH4', full(-2.6, 4.8)], O: ['OH4', full(2.6, 4.8)] },
  { id: 'sky-faces', t: bt(198.1), scene: 'duel', cam: 'hero', move: 'still', into: 'shock', B: faceAt('BMX2', -4.4), O: faceAt('OMX3', 4.4, true) },
  { id: 'smash-up', t: db(198.8), scene: 'forge', cam: 'hero', move: 'orbit', into: 'shock', B: null, O: ['OS4', full(1.6, 5.6)] },
  { id: 'smash', t: db(200.1), scene: 'forge', cam: 'low', move: 'dollyzoom', into: 'shock' },
  { id: 'keytar', t: db(201.4), scene: 'fire', cam: 'hero', move: 'whip', into: 'tear', B: ['BS4', full(-1.4, 5.4)], O: null },
  { id: 'keytar-b', t: bt(202.1), scene: 'fire', cam: 'wide', move: 'push', into: 'shock' },
  { id: 'duo', t: db(202.8), scene: 'marena', cam: 'wide', move: 'orbit', into: 'shock', B: ['BS4', full(-3.0, 5.0)], O: ['OS4', full(3.0, 5.0)] },
  { id: 'duo-faces', t: bt(203.5), scene: 'duel', cam: 'hero', move: 'whip', into: 'shock', B: faceAt('BMX3', -4.4), O: faceAt('OMX5', 4.4, true) },
  // the scream's middle eight (round 11: the rocket ride came round a second time; the PUSH! impact painting, QK1,
  // unused since the breakdown was rebuilt, takes its place)
  { id: 'impact', t: db(204.1), scene: 'panel', panel: 'QK1', cam: 'hero', move: 'push', into: 'tear', B: null, O: null },
  { id: 'headbang', t: db(205.4), scene: 'graffiti', cam: 'wide', move: 'whip', into: 'tear', B: ['BH1', full(-2.5, 4.8)], O: ['OH1', full(2.5, 4.8)] },
  { id: 'tunnel-3', t: db(206.8), scene: 'tunnel', cam: 'hero', move: 'still', into: 'shock', B: ['BS2', full(-1.8, 4.8)], O: ['OS2', full(1.8, 4.8)] },
  { id: 'faces-3', t: bt(207.5), scene: 'faceO', cam: 'hero', move: 'orbit', into: 'shock', B: null, O: faceC('OMX1', true) },
  { id: 'arena-3', t: db(208.1), scene: 'cathedral', cam: 'reverse', move: 'orbit', into: 'shock', B: ['BS3', full(-3.0, 5.0)], O: ['OS3', full(3.0, 5.0)] },
  { id: 'smash-2', t: db(209.5), scene: 'stadium', cam: 'wide', move: 'dollyzoom', into: 'tear', B: ['BS4', full(-2.6, 5.0)], O: ['OS4', full(2.6, 5.2)] },
  { id: 'faces-4', t: bt(210.2), scene: 'faceB', cam: 'hero', move: 'push', into: 'shock', B: faceC('BMX4'), O: null },
  { id: 'sky-3', t: db(210.8), scene: 'fire', cam: 'low', move: 'push', into: 'shock', B: ['BH4', full(-2.6, 4.8)], O: ['OH4', full(2.6, 4.8)] },
  { id: 'sky-3b', t: bt(211.5), scene: 'fire', cam: 'wide', move: 'orbit', into: 'shock' },
  { id: 'climax', t: db(212.1), scene: 'marena', cam: 'wide', move: 'push', into: 'shock', B: ['BS4', full(-3.0, 5.0)], O: ['OS4', full(3.0, 5.0)] },
  // ---- the outro (213.54-232.12): the dawn walk (RK11), the resolved title, a last metal round, the final freeze (RK12)
  { id: 'dawn', t: OUTRO.start, scene: 'panel', panel: 'RK11', cam: 'hero', move: 'push', into: 'tear', B: null, O: null },
  // round 11 (Burak: the walk from behind ran too long): two bars from behind, then a hard cut on the downbeat to the
  // girls walking toward us, arm in arm, laughing, the sunrise behind them (RK13)
  { id: 'dawn-us', t: dbN(OUTRO.start, 2), scene: 'panel', panel: 'RK13', cam: 'hero', move: 'push', B: null, O: null, inserted: true },
  { id: 'title', t: db(218.8), scene: 'title', cam: 'hero', move: 'push', into: 'tear', B: null, O: null },
  { id: 'title-b', t: db(220.1), scene: 'title', cam: 'close', move: 'orbit', into: 'shock' },
  { id: 'outro-faces', t: db(221.5), scene: 'duel', cam: 'reverse', move: 'push', into: 'shock', B: faceAt('BMX3', -4.4), O: faceAt('OMX3', 4.4, true) },
  { id: 'outro-arena', t: db(222.8), scene: 'marena', cam: 'wide', move: 'dollyzoom', into: 'tear', B: ['BS4', full(-3.0, 5.0)], O: ['OS4', full(3.0, 5.0)] },
  { id: 'outro-forge', t: db(224.2), scene: 'forge', cam: 'hero', move: 'whip', into: 'shock', B: ['BH4', full(-2.5, 4.8)], O: ['OH4', full(2.5, 4.8)] },
  { id: 'outro-dive', t: db(225.5), scene: 'tunnel', cam: 'hero', move: 'orbit', into: 'shock', B: dive('BH2', -2.2), O: dive('OH2', 2.4) },
  { id: 'outro-cathedral', t: db(226.8), scene: 'cathedral', cam: 'low', move: 'whip', into: 'tear', B: ['BS1', full(-2.6, 5.0)], O: ['OS1', full(2.6, 5.0)] },
  { id: 'freeze', t: db(228.2), scene: 'panel', panel: 'RK12', cam: 'hero', move: 'still', into: 'shock', B: null, O: null },
];
FSHOTS.sort((a, b) => a.t - b.t);
for (let i = 1; i < FSHOTS.length; i++) {
  const a = FSHOTS[i - 1] as FShot;
  const b = FSHOTS[i] as FShot;
  if (b.t - a.t < 0.12) throw new Error(`finale plan: shot ${b.id} at ${b.t.toFixed(2)} s is not after ${a.id} (${a.t.toFixed(2)} s)`);
}

/** A shot's slot: its index among the shots, not counting inserted ones before it. The camera's orbit and whip
 *  direction and the cover's kind come from it, so a shot inserted later leaves every shot after it as approved. */
export const shotSlot = (s: FShot): number => {
  const i = FSHOTS.indexOf(s);
  return i - FSHOTS.slice(0, i).filter((x) => x.inserted).length;
};

const poses = (who: 'B' | 'O'): FPose[] =>
  FSHOTS.flatMap((s) => {
    const w = s[who];
    return w === undefined ? [] : [w === null ? { t: s.t, card: null } : { t: s.t, card: w[0], at: w[1] }];
  });
export const FBLUE: FPose[] = [...poses('B'), { t: BRANCHES_AT, card: 'BP2', at: RISE.B }].sort((a, b) => a.t - b.t);
export const FORANGE: FPose[] = [...poses('O'), { t: BRANCHES_AT, card: 'OP2', at: RISE.O }].sort((a, b) => a.t - b.t);

/** The final chorus's high-five and logo crash, the chant's and scream end's big hits: bursts of confetti or sparks. */
export const FHITS = {
  yes: [tk(53, 3), tk(54, 3), tk(57, 3)],
  highfive: bt(169.2),
  lock: tk(60, 1),
  push: tk(58, 4),
  walls: [tk(59, 0), tk(59, 1), tk(59, 2)],
  smash: db(200.1),
  smash2: db(209.5) + 0.33,
  climax: db(212.1),
};

/** The type of these sections: one designed form per line part (scene-map.md "Type is the star again"). Line 67
 *  ("Both voices scream AAAAAAAH!") has no measured words; the scream end and outro are instrumental, so their type
 *  is the git story's epilogue (non-lyric entries on line 67, drawn with explicit text). */
export const FINALE_TYPE: TypeEntry[] = [
  // piano truce: blue lets go of her line, orange says hello
  { id: 'f-mine', line: 49, range: [0, 6], form: 'Diff', t0: tk(49, 0), t1: tk(50, 0), singer: 'B', key: 1 },
  { id: 'f-orange', line: 50, range: [0, 4], form: 'Wave', t0: tk(50, 0), t1: tk(50, 4), singer: 'O', key: 1 },
  { id: 'f-hello', line: 50, range: [4, 9], form: 'LightBox', t0: tk(50, 4), t1: tk(51, 0), singer: 'O', key: 8 },
  // the build: a departure board for "different times", then the ring round the meeting hands
  { id: 'f-file', line: 51, range: [0, 8], form: 'Flap', t0: tk(51, 0), t1: tk(52, 0), singer: 'B', key: 3 },
  { id: 'f-tree', line: 52, range: [0, 9], form: 'Code', t0: tk(52, 0), t1: BUILD.end - 0.1, singer: 'both', key: 1 },
  // the final chorus
  { id: 'f-acc1', line: 53, range: [0, 3], form: 'Stack', t0: tk(53, 0), t1: tk(53, 3), singer: 'both', key: 1 },
  { id: 'f-yes1', line: 53, range: [3, 4], form: 'Shout', t0: tk(53, 3), t1: tk(54, 0), singer: 'both', key: 3, style: 'chrome', text: 'YES!' },
  { id: 'f-acc2', line: 54, range: [0, 3], form: 'Stamp', t0: tk(54, 0), t1: tk(54, 3), singer: 'both', key: 1 },
  { id: 'f-yes2', line: 54, range: [3, 4], form: 'Shout', t0: tk(54, 3), t1: tk(55, 0), singer: 'both', key: 3, style: 'chrome', text: 'YES!' },
  { id: 'f-gradient', line: 55, range: [0, 8], form: 'Wave', t0: tk(55, 0), t1: tk(56, 0), singer: 'both', key: 6 },
  { id: 'f-line', line: 56, range: [0, 4], form: 'Stack', t0: tk(56, 0), t1: tk(56, 4), singer: 'both', key: 3 },
  { id: 'f-figured', line: 56, range: [4, 9], form: 'Marquee', t0: tk(56, 4), t1: tk(57, 0) - 0.02, singer: 'both', key: 6 },
  { id: 'f-acc3', line: 57, range: [0, 3], form: 'LightBox', t0: tk(57, 0), t1: tk(57, 3), singer: 'both', key: 1 },
  { id: 'f-yes3', line: 57, range: [3, 4], form: 'Shout', t0: tk(57, 3), t1: tk(58, 0), singer: 'both', key: 3, style: 'chrome', text: 'YES!' },
  { id: 'f-commit', line: 58, range: [0, 4], form: 'Code', t0: tk(58, 0), t1: tk(58, 4), singer: 'both', key: 2 },
  { id: 'f-pushit', line: 58, range: [4, 6], form: 'Shout', t0: tk(58, 4), t1: tk(59, 0), singer: 'both', key: 4, style: 'chrome', text: 'PUSH IT!' },
  { id: 'f-equals', line: 59, range: [0, 3], form: 'Extrude', t0: tk(59, 0), t1: tk(59, 3), singer: 'both', key: 2 },
  { id: 'f-whole', line: 59, range: [3, 6], form: 'Slam', t0: tk(59, 3), t1: tk(60, 0), singer: 'both', key: 5 },
  { id: 'f-merge', line: 60, range: [0, 2], form: 'Logo', t0: tk(60, 0), t1: tk(60, 2), singer: 'both', key: 0 },
  { id: 'f-soul', line: 60, range: [2, 6], form: 'Stack', t0: tk(60, 2), t1: CHANT.start, singer: 'both', key: 2 },
  // the chant: deploy stamps and counters, metal faces
  { id: 'f-acc4', line: 61, range: [0, 4], form: 'Stamp', t0: tk(61, 0), t1: tk(61, 4), singer: 'both', key: 1 },
  { id: 'f-ship1', line: 61, range: [4, 8], form: 'Counter', t0: tk(61, 4), t1: tk(62, 0), singer: 'both', key: 4 },
  { id: 'f-acc5', line: 62, range: [0, 4], form: 'Extrude', t0: tk(62, 0), t1: tk(62, 4), singer: 'both', key: 1 },
  { id: 'f-ship2', line: 62, range: [4, 6], form: 'Shout', t0: tk(62, 4), t1: tk(63, 0), singer: 'both', key: 4, style: 'steel', text: 'SHIP IT!' },
  { id: 'f-acc6', line: 63, range: [0, 4], form: 'Slam', t0: tk(63, 0), t1: tk(63, 4), singer: 'both', key: 1 },
  { id: 'f-ship3', line: 63, range: [4, 8], form: 'LightBox', t0: tk(63, 4), t1: tk(64, 0), singer: 'both', key: 4 },
  { id: 'f-acc7', line: 64, range: [0, 4], form: 'Stack', t0: tk(64, 0), t1: tk(64, 4), singer: 'both', key: 1 },
  { id: 'f-ship4', line: 64, range: [4, 6], form: 'Shout', t0: tk(64, 4), t1: tk(65, 0), singer: 'both', key: 4, style: 'steel', text: 'SHIP IT!' },
  // "Build failed. Syntax error on line forty-two.": the red build log, the line counter racing to 42
  { id: 'f-failed', line: 65, range: [0, 2], form: 'Code', t0: tk(65, 0), t1: tk(66, 0), singer: 'B', key: 1 },
  { id: 'f-syntax', line: 66, range: [0, 3], form: 'LightBox', t0: tk(66, 0), t1: tk(66, 3), singer: 'B', key: 1 },
  { id: 'f-42', line: 66, range: [3, 5], form: 'Counter', t0: tk(66, 3), t1: SCREAM_END.start, singer: 'B', key: 4 },
  // the scream end and the outro (instrumental): the scream, then the merge's epilogue
  { id: 'f-scream', line: 67, range: [0, 1], form: 'Shout', t0: SCREAM_END.start, t1: db(197.4), singer: 'both', key: 0, style: 'steel', text: 'AAAAAAAH!' },
  { id: 'f-fix', line: 67, range: [0, 1], form: 'CodeLine', t0: db(198.8), t1: db(201.4), singer: 'both', key: 0, text: 'fix: line 42' },
  { id: 'f-commits', line: 67, range: [0, 1], form: 'Counter', t0: db(202.8), t1: db(204.1), singer: 'both', key: 0 },
  { id: 'f-passing', line: 67, range: [0, 1], form: 'LightBox', t0: db(206.8), t1: db(208.1), singer: 'both', key: 0, text: 'BUILD PASSING' },
  { id: 'f-shipped', line: 67, range: [0, 1], form: 'Slam', t0: db(210.8), t1: db(212.1), singer: 'both', key: 0, text: 'SHIPPED!' },
  { id: 'f-title', line: 67, range: [0, 1], form: 'Logo', t0: db(218.8), t1: db(221.5), singer: 'both', key: 0 },
  { id: 'f-log', line: 67, range: [0, 1], form: 'CodeLine', t0: db(222.8), t1: db(226.8), singer: 'both', key: 0, text: "* Merge branch 'orange' into main" },
  { id: 'f-end', line: 67, range: [0, 1], form: 'DissolveText', t0: db(226.8) + 0.1, t1: db(228.2) - 0.65, singer: 'both', key: 0, text: 'resolved.' },
];
