// Beat-locked events of this part (plain .ts: beatcheck loads it with node). Built from cues.ts, which uses anchors.ts only.
import type { VideoEvent } from '../../anchors.ts';
import { CUE } from './cues.ts';

export const EVENTS: VideoEvent[] = Object.values(CUE);
