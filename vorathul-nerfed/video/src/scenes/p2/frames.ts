// Every frame of lane p2 comes from a measured anchor (timing.ts), never from a typed number.
// Plain .ts without JSX: events.ts (loaded by node in tools/beatcheck.mjs) imports it.
import { beatFrame, f, TIMING, word } from '../../timing.ts';

/** Frame of the nth measured occurrence of a word or phrase. */
export const wf = (text: string, nth = 0): number => f(word(text, nth).start);
/** Frame of hits[i]; anchored on `t` like events.ts (timing.json's own `frame` field differs by 1 on 20 hits). */
export const hf = (i: number): number => f((TIMING.hits[i] as { t: number }).t);
export const bf = (i: number): number => beatFrame(i);

/** Seconds of hits[i] / beats[i], for the anchors.ts helpers. */
export const hitT = (i: number): number => (TIMING.hits[i] as { t: number }).t;
export const beatT = (i: number): number => TIMING.beats[i] as number;

/** First frame of every shot (storyboard 1, shot table S26-S45). The part ends on PART_END. */
export const SHOT_FROM = {
  S26: wf('controllers', 0),
  S27: wf('wall', 0),
  S28: hf(42),
  S29: wf('And', 0),
  S30: hf(45),
  S31: wf('Of', 1),
  S32: hf(48),
  S33: bf(242),
  S34: hf(51),
  S35: hf(57),
  S36: wf('health', 0),
  S37: wf('forty', 0),
  S38: wf('Meteor', 0),
  S39: wf('removed', 0),
  S40: wf('Phase', 0),
  S41: wf('removed', 1),
  S42: wf('Players', 1),
  S43: wf('fight', 0),
  S44: bf(294),
  S45: bf(304),
} as const;
export const PART_END = 3000;

/** Named moments the shots hang their animation on. */
export const T = {
  // S26 office gamepad
  shattered: wf('shattered', 0),
  crackSpread: wf('on', 0),
  buttonPop: hf(38),
  // S27-S28 meteor rain
  meteor1: bf(201),
  meteor2: bf(203),
  koKnight: hf(40),
  koMage: hf(41),
  koArcher: hf(42),
  bigMeteor: wf('at', 0),
  rogueFlat: wf('all', 0),
  // S29-S31 dawn
  helmClose: hf(43),
  swordPlant: hf(44),
  came: wf('came', 0),
  sunEdge: hf(45),
  dawn: wf('dawn', 0),
  sunStep2: hf(46),
  sunStep3: bf(230),
  frameMatch: wf('Of', 1),
  frameFull: bf(232),
  notesOn: bf(234),
  desksIn: bf(236),
  monitors: wf('the', 4),
  office07: hf(47),
  update: wf('update', 0),
  // S32-S34 freeze and patch card
  devEnters: hf(48),
  clicker: hf(50),
  freeze: bf(242),
  unfreeze: hf(51),
  typePatch: wf('Patch', 1),
  typeTwo: wf('two', 0),
  typePoint: wf('point', 0),
  typeThree: wf('three', 1),
  live: hf(56),
  // S35-S39 the edits
  tapVorathul: wf('Vorathul', 0),
  health: wf('health', 0),
  reduced: wf('reduced', 0),
  by: wf('by', 0),
  forty: wf('forty', 0),
  percent: wf('percent', 0),
  meteorWord: wf('Meteor', 0),
  meteorsIn: hf(58),
  rain: wf('rain', 0),
  removed: wf('removed', 0),
  crumbs: bf(275),
  // S40-S45
  phase: wf('Phase', 0),
  three: wf('three', 2),
  removed2: wf('removed', 1),
  pipMagenta: bf(281),
  tug: bf(283),
  players: wf('Players', 1),
  felt: wf('felt', 0),
  fight: wf('fight', 0),
  was: wf('was', 1),
  unfair1: wf('unfair', 0),
  zoom1: bf(294),
  zoom2: bf(296),
  zoom3: bf(298),
  zoom4: bf(300),
  slitDim: bf(302),
  lookUp: wf('unfair', 1),
  shakePeak: bf(305),
  flakes1: bf(306),
  flakes2: bf(307),
} as const;
