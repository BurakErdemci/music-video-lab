// Beat-locked events of part 5, S91-S115 (storyboard 2, Appendix A). Plain .ts: beatcheck loads it with node.
// Every frame comes from a measured anchor (beat index, hit index or measured word) through anchors.ts.
import { onBeat, onHit, onWord, type VideoEvent } from '../../anchors.ts';
import { TIMING } from '../../timing.ts';

const beat = (id: string, kind: string, i: number): VideoEvent => {
  const t = TIMING.beats[i];
  if (t === undefined) throw new Error(`no beat ${i}`);
  return onBeat(id, kind, t);
};
const hitAt = (id: string, kind: string, i: number): VideoEvent => {
  const h = TIMING.hits[i];
  if (!h) throw new Error(`no hit ${i}`);
  return onHit(id, kind, h.t);
};
const w = (id: string, kind: string, text: string, nth = 0): VideoEvent => onWord(id, kind, text, nth);

export const EVENTS: VideoEvent[] = [
  // S91 breakout
  beat('p5-s91-cut', 'cut', 681),
  beat('p5-s91-shards-lens', 'impact', 682),
  w('p5-s91-grip', 'collision', 'Nerf', 4),
  beat('p5-s91-creak', 'impact', 685),
  // S92 helm pushes through
  w('p5-s92-cut', 'cut', 'but', 0),
  w('p5-s92-rise', 'key', 'rise', 0),
  w('p5-s92-pour', 'collision', 'from', 0),
  w('p5-s92-run', 'collision', 'my', 7),
  w('p5-s92-crown', 'key', 'doom', 2),
  beat('p5-s92-skirting', 'collision', 694),
  beat('p5-s92-floor', 'collision', 696),
  beat('p5-s92-desks', 'collision', 698),
  // S93 tears the patch notes
  w('p5-s93-cut', 'cut', 'Nerf', 5),
  beat('p5-s93-tear', 'key', 700),
  beat('p5-s93-crumple', 'key', 702),
  // S94 A4 burst
  w('p5-s94-cut', 'attack', 'burst', 0),
  w('p5-s94-bars', 'impact', 'out', 0),
  w('p5-s94-echo', 'collision', 'of', 4),
  w('p5-s94-airborne', 'key', 'this', 0),
  // S95 A5 slam landing
  w('p5-s95-cut', 'attack', 'tomb', 0),
  beat('p5-s95-wave', 'collision', 709),
  beat('p5-s95-desks', 'impact', 711),
  // S96 A6 cleave through the dialog
  w('p5-s96-cut', 'ui', 'Restore', 0),
  beat('p5-s96-cleave', 'attack', 715),
  // S97 health bar
  w('p5-s97-cut', 'ui', 'health', 1),
  beat('p5-s97-full', 'ui', 717),
  // S98 recycle bin
  w('p5-s98-cut', 'ui', 'wings', 1),
  beat('p5-s98-pipe2', 'key', 719),
  w('p5-s98-pipe3', 'key', 'burning', 0),
  beat('p5-s98-pipe4', 'key', 721),
  // S99 A7 claw lunge
  w('p5-s99-cut', 'cut', 'rage', 1),
  beat('p5-s99-split', 'key', 722),
  beat('p5-s99-lunge', 'attack', 723),
  // S100 cursor swarm
  w('p5-s100-cut', 'ui', 'let', 0),
  beat('p5-s100-pipe8', 'key', 725),
  beat('p5-s100-pipe9', 'key', 726),
  beat('p5-s100-pipe10', 'key', 727),
  beat('p5-s100-pipe11', 'key', 728),
  // S101 boss nameplate
  w('p5-s101-cut', 'collision', 'boss', 0),
  beat('p5-s101-pipe13', 'key', 730),
  // S102 A8 thrust
  w('p5-s102-cut', 'attack', 'again', 0),
  beat('p5-s102-fan', 'key', 733),
  // S103 A9 pipe-fan blast
  beat('p5-s103-cut', 'cut', 734),
  beat('p5-s103-charge', 'key', 735),
  beat('p5-s103-blast', 'attack', 737),
  beat('p5-s103-strips', 'impact', 739),
  // S104 A10 sweep
  beat('p5-s104-cut', 'cut', 741),
  beat('p5-s104-sweep', 'attack', 743),
  beat('p5-s104-land', 'impact', 744),
  // S105 ruins, Patch 2.5
  beat('p5-s105-cut', 'cut', 745),
  w('p5-s105-patch', 'ui', 'Patch', 5),
  w('p5-s105-two', 'ui', 'two', 2),
  // S106 his eye fills the monitor
  hitAt('p5-s106-cut', 'collision', 78),
  hitAt('p5-s106-dialog', 'ui', 79),
  w('p5-s106-five', 'ui', 'five', 0),
  hitAt('p5-s106-approach', 'ui', 80),
  hitAt('p5-s106-tremble', 'ui', 81),
  // S107 click revert, the rewind
  w('p5-s107-cut', 'ui', 'Vorathul', 1),
  beat('p5-s107-rewind', 'collision', 758),
  beat('p5-s107-note', 'key', 760),
  // S108 A11 meteor summon
  w('p5-s108-cut', 'attack', 'Vorathul', 2),
  beat('p5-s108-peel', 'collision', 763),
  beat('p5-s108-sky', 'collision', 765),
  beat('p5-s108-caption', 'ui', 767),
  beat('p5-s108-meteors', 'impact', 769),
  // S109 meteors land, throne tier 1
  beat('p5-s109-cut', 'impact', 771),
  beat('p5-s109-m2', 'impact', 773),
  w('p5-s109-tier1', 'key', 'Vorathul', 3),
  beat('p5-s109-spin', 'key', 776),
  beat('p5-s109-m3', 'impact', 778),
  beat('p5-s109-m4', 'impact', 780),
  // S110 A12 ground slam
  beat('p5-s110-cut', 'cut', 781),
  beat('p5-s110-scatter', 'key', 783),
  beat('p5-s110-antic', 'key', 785),
  hitAt('p5-s110-slam', 'attack', 82),
  w('p5-s110-tier2', 'key', 'Vorathul', 4),
  // S111 the throne
  beat('p5-s111-cut', 'cut', 791),
  beat('p5-s111-crane', 'key', 793),
  beat('p5-s111-flee', 'key', 795),
  beat('p5-s111-m1', 'impact', 797),
  beat('p5-s111-m2', 'impact', 799),
  // S112 six comic panels, one per hit
  hitAt('p5-s112-p1', 'collision', 83),
  hitAt('p5-s112-p2', 'collision', 84),
  hitAt('p5-s112-p3', 'collision', 85),
  hitAt('p5-s112-p4', 'collision', 86),
  hitAt('p5-s112-p5', 'collision', 87),
  hitAt('p5-s112-p6', 'collision', 88),
  // S113 A13 throne summon, the biggest blast
  w('p5-s113-cut', 'attack', 'Vorathul', 5),
  beat('p5-s113-appear', 'key', 812),
  beat('p5-s113-grow', 'key', 813),
  beat('p5-s113-fill', 'key', 814),
  beat('p5-s113-blast', 'impact', 815),
  beat('p5-s113-grade1', 'collision', 816),
  // S114 smoke clears
  beat('p5-s114-cut', 'cut', 818),
  beat('p5-s114-silhouette', 'key', 820),
  beat('p5-s114-embers', 'key', 822),
  hitAt('p5-s114-clonk', 'impact', 89),
  beat('p5-s114-push1', 'key', 826),
  beat('p5-s114-push2', 'key', 828),
  beat('p5-s114-laugh', 'key', 830),
  // S115 paint floods in, end card
  beat('p5-s115-cut', 'collision', 831),
  beat('p5-s115-half', 'collision', 832),
  beat('p5-s115-black', 'collision', 833),
  beat('p5-s115-type', 'ui', 834),
  beat('p5-s115-type2', 'ui', 835),
  beat('p5-s115-typeno', 'ui', 836),
  beat('p5-s115-cutoff', 'ui', 837),
];
