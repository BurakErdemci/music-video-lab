// Vorathul's rig timeline for the whole of part 2 (f1850-3000): pure data, arrival-anchored keys from timing anchors.
// The rig engine (src/rig) owns the poses; missing poses are replaced by partial overrides of the nearest one.
import type { PoseDef } from '../../../rig/types.ts';
import type { Key, Timeline } from '../../../rig/timeline.ts';
import { SHOT_FROM, T, wf } from '../frames.ts';

const hold = (at: number, pose: Key['pose'], dur: number, extra: Partial<Key> = {}): Key => ({ at, pose, dur, ...extra });
const part = (p: Partial<PoseDef>): Partial<PoseDef> => p;

// "Sword up, head level" of phase 3, planted again after the victory, then the edits of the patch land on his body.
const KEYS: Key[] = [
  hold(SHOT_FROM.S26, 'raise_sword', 0, { cut: true }),
  // S29: sword planted point-down on hit[44] (the 01 pose), the fan folds behind him
  hold(T.swordPlant, 'base', 22),
  // S35: the tap of the eraser makes him flinch
  hold(T.tapVorathul + 3, part({ torso: -9, head: [7, 0.012], pelvis: [-3, -0.02], armR: [-32, 78, 0, 'grip'], armL: [-34, 75, 0, 'fist'] }), 4, { impact: true, ease: 'strike' }),
  hold(T.tapVorathul + 20, 'base', 14),
  // S37: the bar is dragged, his knees dip and his shoulders sag
  hold(T.percent, part({ pelvis: [0, -0.04], torso: -8, head: [-7, 0.022], armR: [-12, 62, -10, 'grip'], armL: [-8, 58, 0, 'fist'] }), 5, { impact: true, ease: 'strike' }),
  // S38: he raises the sword to cast Meteor Rain again
  hold(T.meteorsIn, 'raise_sword', 14, { ease: 'strike' }),
  // S39: he brushes the crumbs off his shoulder with the free hand
  hold(T.crumbs + 8, part({ armL: [55, 105, 0, 'open'], head: [4, -0.004] }), 8),
  hold(T.crumbs + 24, 'raise_sword', 8),
  // S40: sword down again while the note is written
  hold(T.removed2 - 10, 'base', 22),
  // S41: both gauntlets at the note on his helm
  hold(T.tug, part({ armR: [150, 62, 0, 'grip'], armL: [148, 64, 0, 'grip'], torso: 3, head: [-3, 0], pelvis: [0, 0.01] }), 9),
  // S43: head down, defeated
  hold(T.was + 6, 'slump', 14),
  // S45: the scream, fists clenched, body heaving
  hold(T.lookUp, part({ armR: [45, 38, 0, 'fist'], armL: [45, 38, 0, 'fist'], torso: 5, head: [0, -0.01], pelvis: [0, 0.03] }), 4, { impact: true, ease: 'strike' }),
];

const wingFold = [{ at: SHOT_FROM.S26, v: 1, dur: 0 }, { at: T.swordPlant, v: 0.1, dur: 24 }];
const eyes = (v: number, at: number) => [{ at: SHOT_FROM.S26, v, dur: 0 }, { at, v: 0, dur: 3 }];
const helmOpen = [
  { at: SHOT_FROM.S26, v: 1, dur: 0 },
  { at: T.helmClose, v: 0, dur: 4 },
  { at: wf('removed', 1) + 3, v: 0.55, dur: 4 },
  { at: T.pipMagenta + 3, v: 0, dur: 3 },
];

export const VORATHUL_TL: Timeline = {
  keys: KEYS,
  ramps: {
    wingS_R: wingFold,
    wingS_L: wingFold,
    helmSplit: helmOpen,
    eye1: eyes(1, T.helmClose),
    eye2: eyes(1, T.helmClose),
    eye3: eyes(1, T.helmClose),
    eye4: eyes(1, T.helmClose),
    eye5: eyes(1, T.helmClose),
    eye6: eyes(1, T.helmClose),
    eye7: eyes(1, T.helmClose),
    slitOpacity: [{ at: SHOT_FROM.S26, v: 1, dur: 0 }, { at: T.slitDim, v: 0.12, dur: 8 }, { at: T.lookUp, v: 1, dur: 2 }],
  },
  helm: [
    { at: 0, value: 'split' },
    { at: T.helmClose + 4, value: 'closed' },
    { at: wf('removed', 1) + 2, value: 'split' },
    { at: T.pipMagenta + 6, value: 'closed' },
  ],
};
