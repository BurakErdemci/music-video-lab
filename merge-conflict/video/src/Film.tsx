// The film on take-v4: exactly one shot per frame (each shot owns the frame's single ThreeCanvas), then the
// white-out hits on top. 0-140.04 s is rounds 6-7, 140.04 s to the end round 8 (film/finale).
import type { ComponentType } from 'react';
import { useLayer, useShotBackground } from './layer.ts';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HOME } from './camera/camera.ts';
import { Groove, grooveStateAt } from './film/Groove.tsx';
import { GROOVE, PROOF_END, VERSE, WHITEOUTS } from './film/proof.ts';
import { Speaker, speakerStateAt } from './film/Speaker.tsx';
import { CHORUS_START, CHORUS2_START, Chorus2Shot, ChorusShot, chorus1StateAt, chorus2StateAt } from './film/chorus/ChorusShot.tsx';
import type { ShotState } from './film/framing.ts';
import { REST_END, V4 } from './film/rest/plan.ts';
import { RestShot, restStateAt } from './film/rest/RestShot.tsx';
import { VersesShot, versesStateAt } from './film/verses/VersesShot.tsx';
import { FinaleShot, finaleStateAt } from './film/finale/FinaleShot.tsx';
import { Whiteout } from './fx/whiteout.tsx';
import { DURATION_FRAMES, f, sec } from './timing.ts';
import { Fonts } from './type/fonts.tsx';

/** `state`: what the shot shows at t (camera and placed cards), for tools/framecheck.mjs. */
interface Shot { id: string; from: number; to: number; Component: ComponentType<{ frame: number }>; state?: (t: number) => ShotState }

export const SHOTS: Shot[] = [
  { id: 'speaker', from: 0, to: f(GROOVE.start), Component: Speaker, state: speakerStateAt },
  { id: 'groove', from: f(GROOVE.start), to: f(VERSE.start), Component: Groove, state: grooveStateAt },
  { id: 'verses', from: f(VERSE.start), to: f(CHORUS_START), Component: VersesShot, state: versesStateAt },
  { id: 'chorus1', from: f(CHORUS_START), to: f(PROOF_END), Component: ChorusShot, state: chorus1StateAt },
  { id: 'verse3', from: f(PROOF_END), to: f(CHORUS2_START), Component: RestShot, state: restStateAt },
  { id: 'chorus2', from: f(CHORUS2_START), to: f(V4.start), Component: Chorus2Shot, state: chorus2StateAt },
  { id: 'verse4-solo', from: f(V4.start), to: f(REST_END), Component: RestShot, state: restStateAt },
  { id: 'finale', from: f(REST_END), to: DURATION_FRAMES, Component: FinaleShot, state: finaleStateAt },
];
// Overlapping shots would mount two ThreeCanvases on one frame (a second canvas renders black in parallel renders).
for (let i = 1; i < SHOTS.length; i++) {
  const a = SHOTS[i - 1] as Shot;
  const b = SHOTS[i] as Shot;
  if (b.from !== a.to) throw new Error(`shots must tile the timeline: ${a.id} [${a.from},${a.to}) then ${b.id} [${b.from},${b.to})`);
}

/** What the film shows at frame `frame` (null outside the built shots). */
export const filmStateAt = (frame: number): ShotState | null => SHOTS.find((s) => frame >= s.from && frame < s.to)?.state?.(sec(frame)) ?? null;

export const Film = () => {
  const frame = useCurrentFrame();
  const t = sec(frame);
  const shot = SHOTS.find((s) => frame >= s.from && frame < s.to);
  return (
    <AbsoluteFill style={{ background: useShotBackground() }}>
      <Fonts />
      {shot ? <shot.Component frame={frame} /> : null}
      {useLayer() !== 'type' && WHITEOUTS.map((w) => <Whiteout key={w.id} spec={w} t={t} pose={HOME} />)}
    </AbsoluteFill>
  );
};
