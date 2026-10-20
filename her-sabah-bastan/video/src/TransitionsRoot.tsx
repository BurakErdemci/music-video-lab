import type { ComponentType } from 'react';
import { Audio, Composition, Sequence, staticFile } from 'remotion';
import { TransitionSegment, segLength, segStart, type Segment } from './scenes/TransitionsTestScene.tsx';
import { PlateShiftSegment } from './scenes/tr/PlateShiftSegment.tsx';
import { HalftoneBloomSegment } from './scenes/tr/HalftoneBloomSegment.tsx';
import { SqueegeePrintSegment } from './scenes/tr/SqueegeePrintSegment.tsx';
import { barFrame, FPS } from './timing.ts';
import { H, W } from './layout.ts';

/**
 * v3: the print-language family, each example landing on its real downbeat (scene map v2), ~1.5 s either side.
 * G1A plate registration shift and G1B halftone bloom are two alternatives for the same G1 beat (bar 14); G5A squeegee
 * and G5B paper fold are two alternatives for G5 (bar 70); G2 is the v2 ink bleed.
 */
export const SEGMENTS: readonly Segment[] = [
  { id: 'G1A', bar: 14, land: barFrame(14), dur: 60, before: 45, after: 45 },
  { id: 'G1B', bar: 14, land: barFrame(14), dur: 60, before: 45, after: 45 },
  { id: 'G2', bar: 31, land: barFrame(31), dur: 72, before: 45, after: 45 },
  { id: 'G5A', bar: 70, land: barFrame(70), dur: 54, before: 45, after: 45 },
  { id: 'G5', bar: 70, land: barFrame(70), dur: 66, before: 45, after: 45 },
];

const VIEWS: Record<string, ComponentType<{ seg: Segment }>> = {
  G1A: PlateShiftSegment,
  G1B: HalftoneBloomSegment,
  G5A: SqueegeePrintSegment,
};

const offsets = SEGMENTS.reduce<number[]>((acc, s, i) => [...acc, (acc[i] as number) + segLength(s)], [0]);
const TOTAL = offsets[SEGMENTS.length] as number;

const TransitionsTest = () => (
  <>
    {SEGMENTS.map((s, i) => {
      const View = VIEWS[s.id] ?? TransitionSegment;
      return (
        <Sequence key={s.id} from={offsets[i]} durationInFrames={segLength(s)} name={`${s.id} bar ${s.bar}`}>
          <View seg={s} />
          <Audio src={staticFile('her-sabah-bastan.wav')} trimBefore={segStart(s)} />
        </Sequence>
      );
    })}
  </>
);

export const TransitionsRoot = () => <Composition id="TransitionsTest" component={TransitionsTest} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />;
