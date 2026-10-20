// Grade cues of part 3 and the part's whole flash schedule (docs/flash-audit.md, fixed plan), checked when the
// module loads: every swing source of S46-S73 in one list, at most 3 in any 30-frame window.
import { assertFlashBudget, duotoneSwings, gradeCues, impactSwings, type Swing } from '../../vfx/flash.ts';
import { at } from './events.ts';

export const G = {
  // X03: "gloom" seeps office grey through the gold for one beat.
  s48: gradeCues([{ at: { word: 'gloom', nth: 0 }, grade: 'O_SOFT' }, { at: { beat: 338 }, grade: 'P' }], 'S48 gloom'),
  // X06: growl flashes, black/violet, back on the next beat.
  s54: gradeCues([{ at: { word: 'They', nth: 0 }, grade: 'V' }, { at: { beat: 370 }, grade: 'P' }], 'S54 growl'),
  s56: gradeCues([{ at: { word: 'My', nth: 3 }, grade: 'V' }, { at: { beat: 382 }, grade: 'P' }], 'S56 growl'),
  // X14: MY / THEME / SONG, one palette per word; each cue lands on its cut.
  s67: gradeCues([{ at: { word: 'My', nth: 5 }, grade: 'V' }, { at: { word: 'theme', nth: 1 }, grade: 'O' }, { at: { word: 'song', nth: 1 }, grade: 'P' }], 'S67 scream'),
  s70: gradeCues([{ at: { word: 'gloom', nth: 1 }, grade: 'O_SOFT' }, { at: { beat: 491 }, grade: 'P' }], 'S70 gloom'),
} as const;

/** The flash the S73 shoe keeps (the one posterise of the pair; S53's shoe is flash 0, audit zone Z3). */
export const S73_SHOE_FLASH = 2 as const;

const cut = (id: string): Swing => ({ frame: at(id), swings: 1 });

export const P3_SWINGS: Swing[] = [
  ...duotoneSwings(G.s48), cut('s49-cut'), cut('s49-panel1'), cut('s49-burst'),
  cut('s53-cut'), ...duotoneSwings(G.s54), ...duotoneSwings(G.s56),
  cut('s57-cut'), cut('s57-gone'), cut('s59-cut'), cut('s60-cut'), cut('s62-cut'), cut('s64-cut'), cut('s64-press'), cut('s65-cut'),
  ...duotoneSwings(G.s67), ...duotoneSwings(G.s70), ...impactSwings(at('s73-shoe'), S73_SHOE_FLASH),
];
assertFlashBudget(P3_SWINGS, 'part 3 (S46-S73)');
