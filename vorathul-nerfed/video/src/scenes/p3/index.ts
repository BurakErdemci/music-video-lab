// Lane p3: see src/scenes/README.md. The shots of this part, in film frames: each shot starts on its cut event
// (events.ts, measured anchors) and ends where the next one starts; S73 ends where part 4 begins.
import type { ComponentType } from 'react';
import { PART_RANGES, type Shot } from '../../film/shot.ts';
import { S46, S47, S48, S49, S50, S51, S52, S53 } from './Chorus1.tsx';
import { at } from './events.ts';

const ORDER: [string, ComponentType<{ frame: number }>][] = [
  ['S46', S46], ['S47', S47], ['S48', S48], ['S49', S49], ['S50', S50], ['S51', S51], ['S52', S52], ['S53', S53],
];

export const SHOTS: Shot[] = ORDER.map(([id, Component], i) => {
  const next = ORDER[i + 1];
  const from = at(`${id.toLowerCase()}-cut`);
  const to = next ? at(`${next[0].toLowerCase()}-cut`) : at('s54-cut');
  return { id, from, to, Component };
});

const first = SHOTS[0] as Shot;
if (first.from !== PART_RANGES.p3[0]) throw new Error(`p3 starts at ${first.from}, not ${PART_RANGES.p3[0]}`);
