// Lane p5: see src/scenes/README.md. The shots of this part, in film frames (storyboard 2 shot table, S91-S115).
import type { ComponentType } from 'react';
import type { Shot } from '../../film/shot.ts';
import { E } from './lib/geom.ts';
import './lib/flash.ts';
import { S91, S92, S93, S94, S95 } from './shots/breakout.tsx';
import { S100, S101, S102, S103, S104, S96, S97, S98, S99 } from './shots/fight.tsx';
import { S105, S106, S107 } from './shots/patch.tsx';
import { S108, S109, S110, S111, S112, S113, S114 } from './shots/choir.tsx';
import { S115 } from './shots/outro.tsx';

type C = ComponentType<{ frame: number }>;
// Each shot starts on its anchor event (its cut) and ends where the next one starts; S115 ends at the part end.
const TABLE: [string, string, C][] = [
  ['S91', 's91-cut', S91],
  ['S92', 's92-cut', S92],
  ['S93', 's93-cut', S93],
  ['S94', 's94-cut', S94],
  ['S95', 's95-cut', S95],
  ['S96', 's96-cut', S96],
  ['S97', 's97-cut', S97],
  ['S98', 's98-cut', S98],
  ['S99', 's99-cut', S99],
  ['S100', 's100-cut', S100],
  ['S101', 's101-cut', S101],
  ['S102', 's102-cut', S102],
  ['S103', 's103-cut', S103],
  ['S104', 's104-cut', S104],
  ['S105', 's105-cut', S105],
  ['S106', 's106-cut', S106],
  ['S107', 's107-cut', S107],
  ['S108', 's108-cut', S108],
  ['S109', 's109-cut', S109],
  ['S110', 's110-cut', S110],
  ['S111', 's111-cut', S111],
  ['S112', 's112-p1', S112],
  ['S113', 's113-cut', S113],
  ['S114', 's114-cut', S114],
  ['S115', 's115-cut', S115],
];
const PART_END = 8215;

export const SHOTS: Shot[] = TABLE.map(([id, cut, Component], i) => ({
  id,
  from: E(cut),
  to: i + 1 < TABLE.length ? E((TABLE[i + 1] as [string, string, C])[1]) : PART_END,
  Component,
}));
