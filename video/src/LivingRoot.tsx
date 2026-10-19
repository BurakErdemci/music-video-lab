import { Composition } from 'remotion';
import { LivingScene } from './living/LivingScene.tsx';
import { SONG_END, SONG_START } from './living/shots.ts';
import { Part1Scene } from './living/part1/Part1Scene.tsx';
import { SONG_END as P1_END } from './living/part1/shots.ts';
import { FPS } from './timing.ts';
import { H, W } from './layout.ts';
import './style/fonts.ts';

/** Living-illustration test (.claude/briefs/living-illustration-test.md): song 0:15.60-0:31.00, drawn poses + camera.
 * Part1 (.claude/briefs/prod-part1.md): song 0:00-0:58, scene map v2 scenes 1-4. */
export const LivingRoot = () => (
  <>
    <Composition id="LivingTest" component={LivingScene} durationInFrames={SONG_END - SONG_START} fps={FPS} width={W} height={H} />
    <Composition id="Part1" component={Part1Scene} durationInFrames={P1_END} fps={FPS} width={W} height={H} />
  </>
);
