// The typography overlay, mounted once by Film above the current shot (docs/typography.md).
import { AbsoluteFill } from 'remotion';
import { UiFonts } from '../../ui/theme.tsx';
import { ChapterCard } from './ChapterCard.tsx';
import { Headline } from './Headline.tsx';
import { Slam } from './Slam.tsx';
import { TYPE_SCHEDULE } from './schedule.ts';

/** Longest out animation is under one second; anything further past its out-frame is not mounted. */
const LIVE_AFTER_OUT_S = 1;

export const TypeLayer = ({ frame, fps }: { frame: number; fps: number }) => {
  const live = TYPE_SCHEDULE.filter((t) => frame >= t.at && frame < t.out + LIVE_AFTER_OUT_S * fps);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <UiFonts />
      {live.map((t) =>
        t.kind === 'slam' ? <Slam key={t.id} spec={t} frame={frame} /> : t.kind === 'headline' ? <Headline key={t.id} spec={t} frame={frame} /> : <ChapterCard key={t.id} spec={t} frame={frame} />,
      )}
    </AbsoluteFill>
  );
};
