// The 0-20 s proof plan (scene-map.md: the intro and the start of verse 1). Every time is an event from
// events.ts, a measured word, or derived from those. Plans that break a binding rule (camera move or whip
// length, dissolve frame counts, flash budget) throw here, at module load.
import { HOME, type Move, movesPath, shifted } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';
import { at } from '../events.ts';
import { whiteoutSwings, type WhiteoutSpec } from '../fx/whiteout.tsx';
import { inQuad, ramp } from '../lib/ease.ts';
import { assertFlashBudget, type Swing } from '../lib/flash.ts';
import { spotPlan } from '../light/spotlight.tsx';
import { smearPlan, smearSpan } from '../cards/smear.tsx';
import { dissolvePlan } from '../particles/dissolve.tsx';
import type { Burst } from '../particles/field.tsx';
import { microGaps } from '../timing.ts';

export const PROOF_END = 20;

// Placements (world units; 1 unit = 120 px at the home camera).
export const INTRO_O: Placement = { x: -3.0, height: 6.2 };
export const INTRO_B: Placement = { x: 3.0, height: 6.2 };
export const VERSE_B: Placement = { x: -2.4, height: 6.6 };
export const INTRO_CARD = { O: 'O03', B: 'B01' } as const;

/** Drop-in: the card falls from above the frame and lands on the downbeat (accelerating, no bounce). */
export const DROP_S = 0.3;
export const dropDy = (t: number, land: number): number => 9.5 * (1 - inQuad((t - (land - DROP_S)) / DROP_S));
export const dropVisible = (t: number, land: number): boolean => t >= land - DROP_S;

// The stop at the end of the intro (measured micro gap 10.72-11.02): the particle clock slows to a quarter,
// so the room holds its breath without a frozen frame.
const STOP = microGaps[0] as [number, number];
export const fieldClock = (t: number): number => t - 0.75 * Math.max(0, Math.min(t, STOP[1]) - STOP[0]);

export const INTRO_SPOT = spotPlan({
  label: 'intro',
  x0: 0,
  snaps: [{ id: 'spot-on', t: at('spot-on'), on: true }],
  whips: [
    { id: 'spot-whip-1', t: at('spot-whip-1'), frames: 36, x: -3.0 },
    { id: 'spot-whip-2', t: at('spot-whip-2'), frames: 36, x: 3.0 },
    { id: 'sign-42', t: at('sign-42'), frames: 32, x: 0 },
    { id: 'spot-whip-3', t: at('spot-whip-3'), frames: 36, x: INTRO_O.x },
    { id: 'spot-whip-4', t: at('spot-whip-4'), frames: 36, x: INTRO_B.x },
    { id: 'spot-whip-5', t: at('spot-whip-5'), frames: 40, x: 0 },
  ],
});
export const VERSE_SPOT = spotPlan({ label: 'verse', x0: VERSE_B.x, on0: true, snaps: [], whips: [] });

const introMoves: Move[] = [
  { id: 'cam-push-1', t: at('cam-push-1'), frames: 40, to: shifted(HOME, [0, 0.15, -1.4]) },
  { id: 'cam-pull-1', t: at('cam-pull-1'), frames: 36, to: shifted(HOME, [0, 0, -0.4]) },
];
export const INTRO_CAM = movesPath('intro', HOME, introMoves);
export const SPLIT_CAM = movesPath('split', HOME, [{ id: 'split-push', t: at('eye-split'), frames: 48, to: shifted(HOME, [0, 0, -0.8]) }]);
const V0 = shifted(HOME, [-0.3, 0, -0.5]);
export const VERSE_CAM = movesPath('verse', V0, [
  { id: 'cam-truck-2', t: at('cam-truck-2'), frames: 36, to: shifted(HOME, [0.5, 0, -0.5]) },
  { id: 'cam-push-2', t: at('cam-push-2'), frames: 44, to: shifted(HOME, [0.1, 0.35, -1.7]) },
  { id: 'cam-pull-2', t: at('cam-pull-2'), frames: 40, to: shifted(HOME, [0.4, 0, -0.2]) },
]);

export const RIFF_BURST: Burst = { t: at('riff-burst'), origin: [0, -2.0, 0.5] };
export const HEAD_BURST: Burst = { t: at('head-burst'), origin: [VERSE_B.x, -1.0, 0.5] };

export const WHITEOUTS: readonly WhiteoutSpec[] = [
  { id: 'wo-riff', t0: at('riff-burst'), frames: 3 },
  { id: 'wo-split', t0: at('eye-split'), frames: 3, figures: [{ card: INTRO_CARD.O, at: INTRO_O }, { card: INTRO_CARD.B, at: INTRO_B }], camera: INTRO_CAM },
  { id: 'wo-head', t0: at('head-burst'), frames: 3, figures: [{ card: 'B03', at: VERSE_B }], camera: VERSE_CAM },
];

// Verse 1 poses: B03 gathers out of the "head" burst (a scene change: particle dissolve), then a new pose
// every 2 bars on the downbeat through a smear (cards/smear.tsx).
export const VERSE_GATHER = dissolvePlan({ id: 'gather-b03', t0: at('head-burst'), gatherFrames: 18, to: { card: 'B03', at: VERSE_B } });
export const VERSE_FIRST = 'B03';
export const VERSE_SMEARS = [
  smearPlan({ id: 'pose-b04', t: at('pose-b04'), from: 'B03', to: 'B04', dir: 1 }),
  smearPlan({ id: 'pose-b07', t: at('pose-b07'), from: 'B04', to: 'B07', dir: -1 }),
  smearPlan({ id: 'pose-b02', t: at('pose-b02'), from: 'B07', to: 'B02', dir: 1 }),
] as const;
export const SCRIBBLE_B07_FROM = smearSpan(VERSE_SMEARS[1])[1] + 0.15;

/** The mirror-tile align sweeps: "stable" lights the rows front to back, "clean" sweeps again. */
export const alignAt = (t: number): number => {
  const a = at('tiles-align');
  const c = at('tiles-clean');
  if (t >= c && t < c + 0.45) return ramp(t, c, 0.45);
  if (t >= a && t < a + 0.6) return ramp(t, a, 0.6);
  return 0;
};

// Flash budget: every white-out (2 swings), the spotlight snap and each confetti burst (1 each).
export const SWINGS: Swing[] = [
  { id: 'spot-on', t: at('spot-on'), swings: 1 },
  { id: 'riff-confetti', t: RIFF_BURST.t, swings: 1 },
  { id: 'head-confetti', t: HEAD_BURST.t, swings: 1 },
  ...WHITEOUTS.flatMap(whiteoutSwings),
];
assertFlashBudget(SWINGS, 'proof 0-20 s');
