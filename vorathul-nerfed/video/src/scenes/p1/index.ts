// Lane p1: see src/scenes/README.md. The shots of this part, in film frames: every shot starts on its first
// storyboard event (S01 on frame 0) and ends where the next one starts; the last ends at the part boundary.
import type { ComponentType } from 'react';
import { PART_RANGES, type Shot } from '../../film/shot.ts';
import { at } from './events.ts';
import { INTRO_SHOTS } from './intro.tsx';
import { RIFF_SHOTS } from './riff.tsx';
import { FIGHT_SHOTS } from './fight.tsx';
import { P1_GRADE_CUES, VERSE_SHOTS } from './verse.tsx';
import { assertFlashBudget, duotoneSwings, type Swing } from '../../vfx/effects.ts';

const C: Record<string, ComponentType<{ frame: number }>> = { ...INTRO_SHOTS, ...RIFF_SHOTS, ...FIGHT_SHOTS, ...VERSE_SHOTS };

const STARTS: [string, number][] = [
  ['S01', PART_RANGES.p1[0]], ['S02', at('s02-cut')], ['S03', at('s03-cut')], ['S04', at('s04-cut')], ['S05', at('s05-cut')],
  ['S06', at('s06-knight')], ['S07', at('s07-clash')], ['S08', at('s08-ping')], ['S09', at('s09-fan')], ['S10', at('s10-shatter')],
  ['S11', at('s11-sweep')], ['S12', at('s12-bash')], ['S13', at('s13-backstab')], ['S14', at('s14-throw')], ['S15', at('s15-slam')],
  ['S16', at('s16-explosion')], ['S17', at('s17-panel-knight')], ['S18', at('s18-combo-hit')], ['S19', at('s19-swat')], ['S20', at('s20-cut')],
  ['S21', at('s21-crack')], ['S22', at('s22-split')], ['S23', at('s23-pip-1')], ['S24', at('s24-slam')], ['S25', at('s25-phase3')],
];

export const SHOTS: Shot[] = STARTS.map(([id, from], i) => {
  const Component = C[id];
  if (!Component) throw new Error(`p1: no component for ${id}`);
  return { id, from, to: i + 1 < STARTS.length ? (STARTS[i + 1] as [string, number])[1] : PART_RANGES.p1[1], Component };
});

// Flash budget of the part (docs/flash-audit.md, fixed plan): the hard cut from black into the painting, the 2-frame
// silhouette pass of the big impacts of the collision table that fall in p1 (in on N, out on N+2), and the
// one-beat black/violet grades of S22 and S24 that replace their posterise (audit fixes Z1, Z2).
export const P1_SILHOUETTE_IMPACTS = ['s07-clash', 's09-fan', 's11-sweep', 's15-slam', 's16-explosion', 's19-swat', 's19-strike'].map(at);
export const P1_SWINGS: Swing[] = [
  { frame: at('s02-cut'), swings: 1 },
  ...P1_SILHOUETTE_IMPACTS.flatMap((f) => [{ frame: f, swings: 1 }, { frame: f + 2, swings: 1 }]),
  ...duotoneSwings(P1_GRADE_CUES.S22),
  ...duotoneSwings(P1_GRADE_CUES.S24),
];
assertFlashBudget(P1_SWINGS, 'p1');
