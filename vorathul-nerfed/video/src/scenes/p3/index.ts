// Lane p3: see src/scenes/README.md. The shots of this part, in film frames: each shot starts on its cut event
// (events.ts, measured anchors) and ends where the next one starts; S73 ends where part 4 begins.
import type { ComponentType } from 'react';
import { PART_RANGES, type Shot } from '../../film/shot.ts';
import { S46, S47, S48, S49, S50, S51, S52, S53 } from './Chorus1.tsx';
import { at } from './events.ts';
import { S68, S69, S70, S71, S72, S73 } from './Chorus2.tsx';
import { S62, S63, S64, S65, S66, S67 } from './Patch24.tsx';
import { S54, S55, S56, S57, S58, S59, S60, S61 } from './Verse2.tsx';

const ORDER: [string, ComponentType<{ frame: number }>][] = [
  ['S46', S46], ['S47', S47], ['S48', S48], ['S49', S49], ['S50', S50], ['S51', S51], ['S52', S52], ['S53', S53],
  ['S54', S54], ['S55', S55], ['S56', S56], ['S57', S57], ['S58', S58], ['S59', S59], ['S60', S60], ['S61', S61],
  ['S62', S62], ['S63', S63], ['S64', S64], ['S65', S65], ['S66', S66], ['S67', S67],
  ['S68', S68], ['S69', S69], ['S70', S70], ['S71', S71], ['S72', S72], ['S73', S73],
];

export const SHOTS: Shot[] = ORDER.map(([id, Component], i) => {
  const next = ORDER[i + 1];
  const from = at(`${id.toLowerCase()}-cut`);
  const to = next ? at(`${next[0].toLowerCase()}-cut`) : PART_RANGES.p3[1];
  return { id, from, to, Component };
});

const first = SHOTS[0] as Shot;
if (first.from !== PART_RANGES.p3[0]) throw new Error(`p3 starts at ${first.from}, not ${PART_RANGES.p3[0]}`);
for (const s of SHOTS) if (s.to <= s.from) throw new Error(`p3 ${s.id} is empty: [${s.from}, ${s.to})`);
