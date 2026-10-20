import { Composition } from 'remotion';
import { LivingScene } from './living/LivingScene.tsx';
import { SONG_END, SONG_START } from './living/shots.ts';
import { Part1Scene } from './living/part1/Part1Scene.tsx';
import { SONG_END as P1_END } from './living/part1/shots.ts';
import { Part2Scene } from './living/part2/Part2Scene.tsx';
import { SONG_END as P2_END, SONG_START as P2_START } from './living/part2/shots.ts';
import { Part3Scene } from './living/part3/Part3Scene.tsx';
import { PART3_AT60_FRAMES, Part3At60 } from './living/fps60/Part3At60.tsx';
import { PART4A_FRAMES, PART4B_FRAMES, Part4aHalftoneScene, Part4aScene, Part4bHalftoneScene, Part4bScene } from './living/part4/Part4Scene.tsx';
import { PART4B_V3_FRAMES, Part4bV3Scene } from './living/part4/finale/Part4bV3.tsx';
import { PART1_AT60_FRAMES, PART2_AT60_FRAMES, PART3_FULL_AT60_FRAMES, PART4A_AT60_FRAMES, PART4B_AT60_FRAMES, Part1At60, Part2At60, Part3FullAt60, Part4aAt60, Part4bAt60 } from './living/fps60/Wrappers60.tsx';
import { FPS } from './timing.ts';
import { H, W } from './layout.ts';
import './style/fonts.ts';

/** Living-illustration test (.claude/briefs/living-illustration-test.md): song 0:15.60-0:31.00, drawn poses + camera.
 * Part1 (.claude/briefs/prod-part1.md): song 0:00-0:58, scene map v2 scenes 1-4. */
export const LivingRoot = () => (
  <>
    <Composition id="LivingTest" component={LivingScene} durationInFrames={SONG_END - SONG_START} fps={FPS} width={W} height={H} />
    <Composition id="Part1" component={Part1Scene} durationInFrames={P1_END} fps={FPS} width={W} height={H} />
    <Composition id="Part2" component={Part2Scene} durationInFrames={P2_END - P2_START} fps={FPS} width={W} height={H} />
    <Composition id="Part4a" component={Part4aScene} durationInFrames={PART4A_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Part4b" component={Part4bScene} durationInFrames={PART4B_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Part4aHalftone" component={Part4aHalftoneScene} durationInFrames={PART4A_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Part4bHalftone" component={Part4bHalftoneScene} durationInFrames={PART4B_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Part4bV3" component={Part4bV3Scene} durationInFrames={PART4B_V3_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Part3" component={Part3Scene} durationInFrames={4676 - 3340} fps={FPS} width={W} height={H} />
    <Composition id="Part3At60" component={Part3At60} durationInFrames={PART3_AT60_FRAMES} fps={60} width={W} height={H} />
    <Composition id="Part1At60" component={Part1At60} durationInFrames={PART1_AT60_FRAMES} fps={60} width={W} height={H} />
    <Composition id="Part2At60" component={Part2At60} durationInFrames={PART2_AT60_FRAMES} fps={60} width={W} height={H} />
    <Composition id="Part3FullAt60" component={Part3FullAt60} durationInFrames={PART3_FULL_AT60_FRAMES} fps={60} width={W} height={H} />
    <Composition id="Part4aAt60" component={Part4aAt60} durationInFrames={PART4A_AT60_FRAMES} fps={60} width={W} height={H} />
    <Composition id="Part4bAt60" component={Part4bAt60} durationInFrames={PART4B_AT60_FRAMES} fps={60} width={W} height={H} />
  </>
);
