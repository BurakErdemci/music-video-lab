import { Composition } from 'remotion';
import { LivingScene } from './living/LivingScene.tsx';
import { SONG_END, SONG_START } from './living/shots.ts';
import { FPS } from './timing.ts';
import { H, W } from './layout.ts';
import './style/fonts.ts';

/** Living-illustration test (.claude/briefs/living-illustration-test.md): song 0:15.60-0:31.00, drawn poses + camera. */
export const LivingRoot = () => <Composition id="LivingTest" component={LivingScene} durationInFrames={SONG_END - SONG_START} fps={FPS} width={W} height={H} />;
