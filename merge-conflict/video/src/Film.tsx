import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatIndexAt, sec, sectionAt } from './timing.ts';

// Placeholder film: gives the tools (beatcheck, flashcheck, glitchcheck, render_film) a real, moving frame.
export const Film = () => {
  const t = sec(useCurrentFrame());
  return (
    <AbsoluteFill style={{ background: '#000', color: '#fff', fontFamily: 'monospace', fontSize: 64, justifyContent: 'center', alignItems: 'center' }}>
      <div>{sectionAt(t)}</div>
      <div>beat {beatIndexAt(t)}</div>
      <div>{t.toFixed(3)} s</div>
    </AbsoluteFill>
  );
};
