// Beat-locked events of this part (plain .ts: beatcheck loads it with node). Storyboard 1, Appendix A, S26-S45,
// plus a few extra keys on measured hits that sit between the listed ones (the dead-air gaps close on real accents).
import { onBeat, onHit, onWord, type VideoEvent } from '../../anchors.ts';
import { beatT, hitT } from './frames.ts';

const hit = (id: string, kind: string, i: number): VideoEvent => onHit(`p2-${id}`, kind, hitT(i));
const beat = (id: string, kind: string, i: number): VideoEvent => onBeat(`p2-${id}`, kind, beatT(i));
const word = (id: string, kind: string, text: string, nth = 0): VideoEvent => onWord(`p2-${id}`, kind, text, nth);

export const EVENTS: VideoEvent[] = [
  // S26 the one office cut
  word('s26-cut', 'cut', 'controllers'),
  word('s26-gamepad-hits-wall', 'impact', 'shattered'),
  word('s26-cracks-spread', 'key', 'on'),
  hit('s26-button-pops', 'key', 38),
  // S27 Meteor Rain
  word('s27-cut', 'cut', 'wall'),
  hit('s27-hit39', 'key', 39),
  beat('s27-meteor-1', 'impact', 201),
  beat('s27-meteor-2', 'impact', 203),
  hit('s27-knight-ko', 'impact', 40),
  hit('s27-mage-ko', 'impact', 41),
  // S28 party wiped
  hit('s28-archer-ko', 'impact', 42),
  word('s28-big-meteor', 'key', 'at'),
  word('s28-rogue-flat', 'impact', 'all'),
  // S29 victory
  word('s29-cut', 'cut', 'And'),
  hit('s29-helm-closes', 'key', 43),
  hit('s29-sword-planted', 'key', 44),
  word('s29-pull-back-begins', 'key', 'came'),
  // S30 dawn is a progress bar
  hit('s30-sun-edge', 'cut', 45),
  word('s30-sun-is-a-bar', 'key', 'dawn'),
  hit('s30-fill-jump', 'key', 46),
  beat('s30-fill-tick', 'key', 230),
  // S31 the frame match
  word('s31-frame-match', 'cut', 'Of', 1),
  beat('s31-frame-full', 'key', 232),
  beat('s31-notes-on-frame', 'key', 234),
  beat('s31-desks-slide-in', 'key', 236),
  word('s31-monitors', 'key', 'the', 4),
  hit('s31-office-framing', 'key', 47),
  word('s31-update-100', 'key', 'update'),
  // S32 the developer
  hit('s32-dev-enters', 'cut', 48),
  hit('s32-hit49', 'key', 49),
  hit('s32-clicker', 'key', 50),
  // S33 the freeze
  beat('s33-freeze', 'freeze', 242),
  // S34 the patch card
  hit('s34-unfreeze', 'unfreeze', 51),
  hit('s34-hit52', 'key', 52),
  word('s34-type-patch', 'key', 'Patch', 1),
  hit('s34-hit53', 'key', 53),
  word('s34-type-two', 'key', 'two'),
  word('s34-type-point', 'key', 'point'),
  hit('s34-hit55', 'key', 55),
  word('s34-type-three', 'key', 'three', 1),
  hit('s34-live-badge', 'key', 56),
  // S35 the tap
  hit('s35-cut', 'cut', 57),
  word('s35-tap', 'impact', 'Vorathul'),
  beat('s35-tap-ends', 'key', 260),
  // S36 edit 1 begins
  word('s36-pinch', 'cut', 'health'),
  word('s36-reduced', 'key', 'reduced'),
  word('s36-pull', 'key', 'by'),
  // S37 the drag
  word('s37-drag', 'cut', 'forty'),
  word('s37-snap', 'impact', 'percent'),
  // S38 sword up again
  word('s38-cut', 'cut', 'Meteor'),
  hit('s38-meteors-in', 'key', 58),
  word('s38-eraser-enters', 'key', 'rain'),
  // S39 the erase
  word('s39-erase', 'impact', 'removed'),
  beat('s39-crumbs', 'key', 275),
  // S40 the sticky note
  word('s40-cut', 'cut', 'Phase'),
  word('s40-writes', 'key', 'three', 2),
  // S41 the slap
  word('s41-cut', 'cut', 'removed', 1),
  beat('s41-pip-magenta', 'impact', 281),
  beat('s41-tug', 'key', 283),
  // S42 the card is pinned
  word('s42-cut', 'cut', 'Players', 1),
  word('s42-dusts-hands', 'key', 'felt'),
  // S43 the heroes agree
  word('s43-cut', 'cut', 'fight'),
  word('s43-heroes-gather', 'key', 'was', 1),
  word('s43-thumbs-up', 'key', 'unfair'),
  // S44 four zoom panels
  beat('s44-zoom-1', 'cut', 294),
  beat('s44-zoom-2', 'cut', 296),
  beat('s44-zoom-3', 'cut', 298),
  beat('s44-zoom-4', 'cut', 300),
  beat('s44-eye-dims', 'key', 302),
  // S45 the first look up
  beat('s45-cut', 'cut', 304),
  word('s45-looks-up', 'shake', 'unfair', 1),
  beat('s45-shake-peak', 'key', 305),
  beat('s45-flakes-1', 'key', 306),
  beat('s45-flakes-2', 'key', 307),
];
