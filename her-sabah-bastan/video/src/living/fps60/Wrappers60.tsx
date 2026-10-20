import { SONG_END as P1_END } from '../part1/shots.ts';
import { Part1Scene } from '../part1/Part1Scene.tsx';
import { SONG_END as P2_END, SONG_START as P2_START } from '../part2/shots.ts';
import { Part2Scene } from '../part2/Part2Scene.tsx';
import { PART4A_FRAMES, Part4aHalftoneScene } from '../part4/Part4Scene.tsx';
import { PART4B_V3_FRAMES, Part4bV3Scene } from '../part4/finale/Part4bV3.tsx';
import { Part3Scene } from '../part3/Part3Scene.tsx';
import { at60 } from './At60.tsx';

// Render every 60 fps part with --muted (see At60.tsx). Frame counts are 2x the 30 fps compositions.
export const PART1_AT60_FRAMES = 2 * P1_END;
export const PART2_AT60_FRAMES = 2 * (P2_END - P2_START);
export const PART4A_AT60_FRAMES = 2 * PART4A_FRAMES;
export const PART4B_AT60_FRAMES = 2 * PART4B_V3_FRAMES;
export const Part1At60 = at60(Part1Scene);
export const Part2At60 = at60(Part2Scene);
export const Part4aAt60 = at60(Part4aHalftoneScene);
export const Part4bAt60 = at60(Part4bV3Scene);
export const PART3_FULL_AT60_FRAMES = 2 * (4676 - 3340);
export const Part3FullAt60 = at60(Part3Scene);
