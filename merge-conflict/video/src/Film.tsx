// The film on take-v4: exactly one shot per frame (each shot owns the frame's single ThreeCanvas), then the
// white-out hits on top. 0-64.15 s is the type-led proof (film/proof.ts; the forms are the lyrics, so the old
// persistent lyric layer is not mounted); the rest of the song is still the placeholder.
import type { ComponentType } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HOME } from './camera/camera.ts';
import { Groove } from './film/Groove.tsx';
import { GROOVE, PROOF_END, VERSE, WHITEOUTS } from './film/proof.ts';
import { Speaker } from './film/Speaker.tsx';
import { Verses } from './film/Verses.tsx';
import { Chorus } from './film/Chorus.tsx';
import { CHORUS_START, ChorusShot } from './film/chorus/ChorusShot.tsx';
import { PING_START } from './film/act.ts';
import { Whiteout } from './fx/whiteout.tsx';
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
  { id: 'speaker', from: 0, to: f(GROOVE.start), Component: Speaker },
  { id: 'groove', from: f(GROOVE.start), to: f(VERSE.start), Component: Groove },
  { id: 'verses', from: f(VERSE.start), to: f(PING_START), Component: Verses },
  { id: 'pre', from: f(PING_START), to: f(CHORUS_START), Component: Chorus },
  { id: 'chorus1', from: f(CHORUS_START), to: f(PROOF_END), Component: ChorusShot },
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
      {WHITEOUTS.map((w) => <Whiteout key={w.id} spec={w} t={t} pose={HOME} />)}
    </AbsoluteFill>
  );
};
