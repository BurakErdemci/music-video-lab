// Which designed type form draws each sung line of a chorus, and when (scene-map.md "Type is the star again":
// every sung line through a designed form, at least 6 distinct forms per 30 s, never the same form twice in a
// row). Data only (no JSX), so tools/typecheck.mjs can read it; film/chorus/type.tsx draws it.
import { at } from '../../events.ts';
import type { Singer } from '../../type/forms/common.tsx';
import { after, type ChorusLines, twoGirlsAt } from './plan.ts';

export type FormName = 'Stack' | 'Shout' | 'Stamp' | 'RunwayLine' | 'FlameText' | 'Logo' | 'Wave' | 'Extrude' | 'Marquee' | 'GlitchText' | 'Slam' | 'Flap' | 'Diff' | 'Code' | 'Counter' | 'LightBox' | 'Hoop' | 'Ring' | 'DissolveText' | 'CodeLine' | 'Fill' | 'Kick' | 'Floor';
export interface TypeEntry { id: string; line: number; range: [number, number]; form: FormName; t0: number; t1: number; singer: Singer; key: number; style?: 'chrome' | 'steel'; text?: string }

export const chorusType = (L: ChorusLines): TypeEntry[] => {
  const tk = (line: number, k: number) => at(`tok-${line}-${k}`);
  return [
    { id: 'cur1', line: L.cur1, range: [0, 3], form: 'Stack', t0: tk(L.cur1, 0) - 0.02, t1: tk(L.cur1, 3), singer: 'B', key: 1 },
    { id: 'no1', line: L.cur1, range: [3, 4], form: 'Shout', t0: tk(L.cur1, 3), t1: after(tk(L.cur1, 3)), singer: 'O', key: 3, style: 'steel', text: 'NO!' },
    { id: 'inc1', line: L.inc1, range: [0, 3], form: 'Stamp', t0: after(tk(L.cur1, 3)), t1: tk(L.inc1, 3), singer: 'O', key: 1 },
    { id: 'no2', line: L.inc1, range: [3, 4], form: 'Shout', t0: tk(L.inc1, 3), t1: twoGirlsAt(L), singer: 'B', key: 3, style: 'chrome', text: 'NO!' },
    { id: 'one-line', line: L.fire, range: [0, 4], form: 'RunwayLine', t0: twoGirlsAt(L), t1: tk(L.fire, 5), singer: 'both', key: 3 },
    { id: 'on-fire', line: L.fire, range: [4, 9], form: 'FlameText', t0: tk(L.fire, 4), t1: tk(L.merge1, 0), singer: 'both', key: 8 },
    { id: 'merge1', line: L.merge1, range: [0, 4], form: 'Logo', t0: tk(L.merge1, 0), t1: tk(L.merge1, 4), singer: 'both', key: 0 },
    { id: 'haywire', line: L.merge1, range: [4, 7], form: 'Wave', t0: tk(L.merge1, 4), t1: tk(L.cur2, 0) - 0.02, singer: 'both', key: 2 },
    { id: 'cur2', line: L.cur2, range: [0, 3], form: 'Stack', t0: tk(L.cur2, 0) - 0.02, t1: tk(L.cur2, 3), singer: 'B', key: 1 },
    { id: 'never1', line: L.cur2, range: [3, 4], form: 'Shout', t0: tk(L.cur2, 3), t1: after(tk(L.cur2, 3) + 0.2), singer: 'O', key: 3, style: 'steel', text: 'NEVER!' },
    { id: 'inc2', line: L.inc2, range: [0, 3], form: 'Stamp', t0: after(tk(L.cur2, 3) + 0.2), t1: tk(L.inc2, 3), singer: 'O', key: 1 },
    { id: 'never2', line: L.inc2, range: [3, 4], form: 'Shout', t0: tk(L.inc2, 3), t1: tk(L.equals, 0), singer: 'B', key: 3, style: 'chrome', text: 'NEVER!' },
    { id: 'equals', line: L.equals, range: [0, 3], form: 'Extrude', t0: tk(L.equals, 0), t1: tk(L.equals, 3), singer: 'both', key: 2 },
    { id: 'soul', line: L.equals, range: [3, 9], form: 'Marquee', t0: tk(L.equals, 3), t1: tk(L.merge2, 0), singer: 'both', key: 8 },
    { id: 'merge2', line: L.merge2, range: [0, 4], form: 'Logo', t0: tk(L.merge2, 0), t1: tk(L.merge2, 4), singer: 'both', key: 0 },
    { id: 'control', line: L.merge2, range: [4, 8], form: 'GlitchText', t0: tk(L.merge2, 4), t1: L.end, singer: 'both', key: 3 },
  ];
};
