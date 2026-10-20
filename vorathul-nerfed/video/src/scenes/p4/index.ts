// Lane p4: see src/scenes/README.md. The shots of this part, in film frames.
import type { Shot } from '../../film/shot.ts';
import { S78, S79, S80, S77 } from './Canvas.tsx';
import { PART_RANGES } from '../../film/shot.ts';
import { CUE, HATED_FRAME } from './cues.ts';
import { S81, S82, S83, S84, S85, S86, S87, S88, S89, S90 } from './Build.tsx';
import { S74, S75 } from './Interlude.tsx';
import { S76 } from './Memory.tsx';

export const SHOTS: Shot[] = [
  { id: 'S74', from: PART_RANGES.p4[0], to: CUE.s75cut.frame, Component: S74 },
  { id: 'S75', from: CUE.s75cut.frame, to: CUE.s76cut.frame, Component: S75 },
  { id: 'S76', from: CUE.s76cut.frame, to: CUE.s77cut.frame, Component: S76 },
  { id: 'S77', from: CUE.s77cut.frame, to: CUE.s78cut.frame, Component: S77 },
  { id: 'S78', from: CUE.s78cut.frame, to: HATED_FRAME, Component: S78 },
  { id: 'S79', from: HATED_FRAME, to: CUE.s80cut.frame, Component: S79 },
  { id: 'S80', from: CUE.s80cut.frame, to: CUE.s81cut.frame, Component: S80 },
  { id: 'S81', from: CUE.s81cut.frame, to: CUE.s82cut.frame, Component: S81 },
  { id: 'S82', from: CUE.s82cut.frame, to: CUE.s83cut.frame, Component: S82 },
  { id: 'S83', from: CUE.s83cut.frame, to: CUE.s84cut.frame, Component: S83 },
  { id: 'S84', from: CUE.s84cut.frame, to: CUE.s85cut.frame, Component: S84 },
  { id: 'S85', from: CUE.s85cut.frame, to: CUE.s86cut.frame, Component: S85 },
  { id: 'S86', from: CUE.s86cut.frame, to: CUE.s87cut.frame, Component: S86 },
  { id: 'S87', from: CUE.s87cut.frame, to: CUE.s88cut.frame, Component: S87 },
  { id: 'S88', from: CUE.s88cut.frame, to: CUE.s89a.frame, Component: S88 },
  { id: 'S89', from: CUE.s89a.frame, to: CUE.s90a.frame, Component: S89 },
  { id: 'S90', from: CUE.s90a.frame, to: PART_RANGES.p4[1], Component: S90 },
];
