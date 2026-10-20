// Beat-locked events of part 3 (S46-S73, storyboard 2 Appendix A). Plain .ts: beatcheck loads it with node.
// Every frame comes from a measured anchor (anchors.ts); the first event of each shot is its cut.
import { onBeat, onHit, onWord, type VideoEvent } from '../../anchors.ts';
import { TIMING } from '../../timing.ts';

const beat = (id: string, kind: string, i: number): VideoEvent => {
  const e = onBeat(`p3-${id}`, kind, TIMING.beats[i] as number);
  if (e.ref !== i) throw new Error(`p3 ${id}: beat ${i} resolved to ${e.ref}`);
  return e;
};
const hit = (id: string, kind: string, i: number): VideoEvent => {
  const e = onHit(`p3-${id}`, kind, (TIMING.hits[i] as { t: number }).t);
  if (e.ref !== i) throw new Error(`p3 ${id}: hit ${i} resolved to ${e.ref}`);
  return e;
};
const word = (id: string, kind: string, text: string, nth: number): VideoEvent => onWord(`p3-${id}`, kind, text, nth);

export const EVENTS: VideoEvent[] = [
  // S46 nerfed wide
  beat('s46-cut', 'cut', 308),
  beat('s46-flakes', 'key', 310),
  word('s46-stamp', 'ui', 'Nerf', 0),
  beat('s46-bleed', 'key', 312),
  beat('s46-sigh', 'key', 314),
  // S47 tablets
  word('s47-cut', 'cut', 'in', 0),
  word('s47-tab1', 'impact', 'patch', 2),
  word('s47-tab2', 'impact', 'of', 2),
  word('s47-tab3', 'impact', 'doom', 0),
  beat('s47-dust', 'key', 321),
  beat('s47-peek', 'key', 323),
  beat('s47-crack', 'key', 325),
  // S48 stamp 2, shrink
  word('s48-cut', 'cut', 'Nerf', 1),
  beat('s48-look', 'key', 328),
  beat('s48-rub', 'key', 330),
  word('s48-shrink1', 'key', 'god', 0),
  word('s48-settle', 'key', 'reduced', 1),
  word('s48-dust', 'key', 'dust', 0),
  word('s48-reform', 'key', 'and', 1),
  word('s48-gloom', 'colour', 'gloom', 0),
  beat('s48-drain', 'colour', 338),
  // S49 collage
  word('s49-cut', 'cut', 'I', 2),
  beat('s49-tear', 'key', 340),
  word('s49-panel1', 'colour', 'was', 2),
  word('s49-panel2', 'colour', 'wall', 1),
  word('s49-panel3', 'colour', 'that', 0),
  beat('s49-roar', 'key', 347),
  word('s49-lock', 'key', 'no', 1),
  word('s49-bulge', 'key', 'could', 0),
  word('s49-burst', 'impact', 'through', 0),
  beat('s49-shreds', 'key', 353),
  // S50 the kid
  word('s50-cut', 'cut', 'Now', 0),
  beat('s50-twirl', 'key', 356),
  word('s50-lv', 'ui', 'level', 0),
  word('s50-12', 'ui', 'twelve', 0),
  // S51 A1 cleave
  word('s51-cut', 'cut', 'kids', 0),
  beat('s51-strike', 'attack', 362),
  // S52 smacks
  word('s52-cut', 'cut', 'beat', 0),
  word('s52-smack2', 'impact', 'me', 0),
  word('s52-smack3', 'impact', 'with', 0),
  // S53 shoe
  word('s53-cut', 'cut', 'shoe', 0),
  // S54 growl, A2 blast, deletion
  word('s54-cut', 'cut', 'They', 0),
  beat('s54-up', 'colour', 370),
  hit('s54-blast', 'attack', 59),
  word('s54-marqR', 'ui', 'took', 0),
  hit('s54-marqL', 'ui', 60),
  hit('s54-del', 'ui', 61),
  word('s54-gone', 'impact', 'wings', 0),
  // S55 helm
  word('s55-cut', 'cut', 'my', 2),
  beat('s55-split', 'key', 378),
  word('s55-eyes', 'key', 'second', 0),
  word('s55-checker', 'key', 'form', 0),
  beat('s55-lock', 'ui', 380),
  // S56 lasers
  word('s56-cut', 'cut', 'My', 3),
  word('s56-fire', 'attack', 'laser', 0),
  word('s56-dashed', 'key', 'eyes', 0),
  beat('s56-sad', 'key', 385),
  // S57 storm
  word('s57-cut', 'cut', 'my', 4),
  word('s57-boil', 'key', 'cursed', 0),
  word('s57-bolt', 'key', 'storm', 0),
  word('s57-cursor', 'ui', 'I', 3),
  hit('s57-toggle', 'ui', 62),
  hit('s57-gone', 'key', 63),
  // S58 cutscene
  word('s58-cut', 'cut', 'cutscene', 0),
  word('s58-timeline', 'ui', 'seven', 0),
  word('s58-stretch', 'ui', 'minutes', 0),
  word('s58-raise', 'key', 'long', 0),
  beat('s58-conduct', 'key', 401),
  // S59 office monitors
  word('s59-cut', 'cut', 'Now', 1),
  hit('s59-rings', 'ui', 64),
  word('s59-60', 'ui', 'everybody', 0),
  // S60 16x
  word('s60-cut', 'cut', 'skips', 0),
  beat('s60-4min', 'ui', 411),
  word('s60-end', 'ui', 'it', 3),
  // S61 what went wrong
  word('s61-cut', 'cut', 'What', 0),
  hit('s61-flicker', 'key', 65),
  word('s61-tilt', 'key', 'went', 0),
  word('s61-dim', 'key', 'wrong', 0),
  hit('s61-out', 'key', 66),
  beat('s61-sink', 'key', 422),
  // S62 patch 2.4
  word('s62-cut', 'cut', 'Patch', 3),
  hit('s62-patch', 'ui', 67),
  word('s62-two', 'ui', 'two', 1),
  hit('s62-dot', 'impact', 69),
  word('s62-four', 'ui', 'four', 0),
  hit('s62-live', 'ui', 71),
  // S63 editor
  word('s63-cut', 'cut', "Voratho's", 0),
  word('s63-line', 'ui', 'dialogue', 0),
  hit('s63-drag', 'ui', 72),
  // S64 skip pill
  hit('s64-cut', 'cut', 73),
  word('s64-hover', 'ui', 'be', 0),
  word('s64-press', 'ui', 'skipped', 0),
  beat('s64-blink', 'key', 441),
  // S65 volume slider
  word('s65-cut', 'cut', "Voratho's", 1),
  word('s65-slider', 'ui', 'theme', 0),
  word('s65-100', 'ui', 'song', 0),
  word('s65-corks1', 'ui', 'volume', 0),
  beat('s65-corks2', 'ui', 448),
  // S66 throat
  word('s66-cut', 'cut', 'reduced', 2),
  beat('s66-smoke', 'key', 450),
  hit('s66-puff', 'key', 74),
  // S67 MY THEME SONG
  word('s67-cut', 'cut', 'My', 5),
  word('s67-theme', 'colour', 'theme', 1),
  word('s67-song', 'colour', 'song', 1),
  beat('s67-tremble', 'key', 457),
  beat('s67-swell', 'key', 459),
  beat('s67-leak', 'key', 461),
  // S68 queue
  beat('s68-cut', 'cut', 463),
  word('s68-stamp', 'ui', 'Nerf', 2),
  beat('s68-step', 'key', 466),
  // S69 A3 sweep
  word('s69-cut', 'cut', 'In', 1),
  word('s69-hop1', 'attack', 'patch', 4),
  word('s69-hop2', 'key', 'notes', 1),
  word('s69-hop3', 'key', 'of', 3),
  word('s69-hop4', 'key', 'my', 6),
  word('s69-bonk', 'impact', 'doom', 1),
  beat('s69-laugh', 'key', 475),
  beat('s69-lower', 'key', 477),
  beat('s69-sag', 'key', 479),
  // S70 stamp 4, broom
  word('s70-cut', 'cut', 'Nerf', 3),
  beat('s70-wobble', 'key', 481),
  beat('s70-broom', 'key', 483),
  word('s70-ready', 'key', 'god', 1),
  word('s70-sweep', 'key', 'reduced', 3),
  word('s70-swept', 'impact', 'dust', 1),
  word('s70-skid', 'key', 'and', 2),
  word('s70-gloom', 'colour', 'gloom', 1),
  beat('s70-drain', 'colour', 491),
  beat('s70-stay', 'key', 493),
  // S71 awareness step 2
  word('s71-cut', 'cut', 'I', 4),
  word('s71-tilt', 'key', 'was', 3),
  word('s71-sky', 'key', 'wall', 2),
  word('s71-cloud', 'key', 'that', 1),
  beat('s71-corner', 'key', 500),
  word('s71-edge', 'reveal', 'no', 2),
  word('s71-push1', 'key', 'one', 2),
  word('s71-push2', 'key', 'could', 1),
  word('s71-push3', 'key', 'get', 1),
  word('s71-ecu', 'key', 'through', 1),
  // S72 staring
  word('s72-cut', 'cut', 'Now', 3),
  beat('s72-narrow', 'key', 508),
  beat('s72-kid', 'key', 510),
  word('s72-lv', 'ui', 'level', 1),
  word('s72-12', 'ui', 'twelve', 1),
  word('s72-tug', 'key', 'kids', 1),
  beat('s72-windup', 'key', 515),
  // S73 the shoe he ignores
  word('s73-cut', 'cut', 'beat', 1),
  word('s73-smack2', 'impact', 'me', 1),
  word('s73-smack3', 'impact', 'with', 1),
  word('s73-shoe', 'impact', 'shoe', 1),
  beat('s73-kidup', 'key', 522),
  beat('s73-exit', 'key', 524),
];

const BY_ID = new Map(EVENTS.map((e) => [e.id.slice(3), e.frame]));
/** Frame of a part-3 event by its short id (without the "p3-" prefix); throws on a typo. */
export const at = (id: string): number => {
  const v = BY_ID.get(id);
  if (v === undefined) throw new Error(`p3: no event ${id}`);
  return v;
};
