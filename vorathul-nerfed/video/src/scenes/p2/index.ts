// Lane p2: S26-S45, film frames 1850-3000. Frames come from the shot table through measured anchors (frames.ts).
import type { ComponentType } from 'react';
import type { Shot } from '../../film/shot.ts';
import { PART_RANGES } from '../../film/shot.ts';
import './flash.ts';
import { SHOT_FROM } from './frames.ts';
import { S26, S31, S32, S33, S34, S35, S36, S40, S42 } from './OfficeShots.tsx';
import { S27, S28, S29, S30, S37, S38, S39, S41, S43, S44, S45 } from './PaintShots.tsx';

type Frame = ComponentType<{ frame: number }>;
const COMPONENTS: Record<keyof typeof SHOT_FROM, Frame> = { S26, S27, S28, S29, S30, S31, S32, S33, S34, S35, S36, S37, S38, S39, S40, S41, S42, S43, S44, S45 };

const ids = Object.keys(SHOT_FROM) as (keyof typeof SHOT_FROM)[];
export const SHOTS: Shot[] = ids.map((id, i) => ({
  id,
  from: SHOT_FROM[id],
  to: i + 1 < ids.length ? SHOT_FROM[ids[i + 1] as keyof typeof SHOT_FROM] : PART_RANGES.p2[1],
  Component: COMPONENTS[id],
}));
