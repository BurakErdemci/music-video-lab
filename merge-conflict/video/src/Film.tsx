// The film: exactly one shot per frame (each shot owns the frame's single ThreeCanvas), then the persistent
// layers outside the shots: the lyric layer and the white-out hits. 0-20 s is the proof (film/proof.ts);
// the rest of the song is still the placeholder.
import type { ComponentType } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HOME } from './camera/camera.ts';
import { at } from './events.ts';
import { EyeSplit } from './film/EyeSplit.tsx';
import { Intro } from './film/Intro.tsx';
import { PROOF_END, WHITEOUTS } from './film/proof.ts';
import { Verse1 } from './film/Verse1.tsx';
import { Whiteout } from './fx/whiteout.tsx';
import { LyricLayer } from './lyrics/LyricLayer.tsx';
import { beatIndexAt, DURATION_FRAMES, f, sec, sectionAt } from './timing.ts';
import { Fonts } from './type/fonts.tsx';

interface Shot { id: string; from: number; to: number; Component: ComponentType<{ frame: number }> }

const Placeholder = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  return (
    <AbsoluteFill style={{ background: '#000', color: '#fff', fontFamily: 'monospace', fontSize: 64, justifyContent: 'center', alignItems: 'center' }}>
      <div>{sectionAt(t)}</div>
      <div>beat {beatIndexAt(t)}</div>
      <div>{t.toFixed(3)} s</div>
    </AbsoluteFill>
  );
};

export const SHOTS: Shot[] = [
  { id: 'intro', from: 0, to: f(at('eye-split')), Component: Intro },
  { id: 'eye-split', from: f(at('eye-split')), to: f(at('head-burst')), Component: EyeSplit },
  { id: 'verse1', from: f(at('head-burst')), to: f(PROOF_END), Component: Verse1 },
  { id: 'placeholder', from: f(PROOF_END), to: DURATION_FRAMES, Component: Placeholder },
];
// Overlapping shots would mount two ThreeCanvases on one frame (a second canvas renders black in parallel renders).
for (let i = 1; i < SHOTS.length; i++) {
  const a = SHOTS[i - 1] as Shot;
  const b = SHOTS[i] as Shot;
  if (b.from !== a.to) throw new Error(`shots must tile the timeline: ${a.id} [${a.from},${a.to}) then ${b.id} [${b.from},${b.to})`);
}

export const Film = () => {
  const frame = useCurrentFrame();
  const t = sec(frame);
  const shot = SHOTS.find((s) => frame >= s.from && frame < s.to);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Fonts />
      {shot ? <shot.Component frame={frame} /> : null}
      <LyricLayer t={t} until={PROOF_END} />
      {WHITEOUTS.map((w) => <Whiteout key={w.id} spec={w} t={t} pose={HOME} />)}
    </AbsoluteFill>
  );
};
