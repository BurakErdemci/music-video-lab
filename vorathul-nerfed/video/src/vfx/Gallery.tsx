// Preview of every effect in turn over the approved style frame. Not part of the film.
import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { ImpactBurst } from './ImpactBurst.tsx';
import { InkSplash } from './InkSplash.tsx';
import { Meteor } from './Meteor.tsx';
import { Misregister, PrintTexture } from './PrintTexture.tsx';
import { Shards } from './Shards.tsx';
import { shakeSum } from './shake.ts';
import { SpeedLines } from './SpeedLines.tsx';
import { INK, IVORY, type Pt } from './style.tsx';

export const GALLERY_FRAMES = 360;

const SEGMENTS: { from: number; label: string }[] = [
  { from: 0, label: 'InkSplash' },
  { from: 50, label: 'InkSplash violet' },
  { from: 95, label: 'SpeedLines radial' },
  { from: 140, label: 'SpeedLines parallel' },
  { from: 185, label: 'ImpactBurst + shake' },
  { from: 235, label: 'Shards' },
  { from: 285, label: 'Meteor rain' },
];

const METEORS: { start: number; from: Pt; to: Pt; size: number }[] = [
  { start: 285, from: [520, -120], to: [880, 820], size: 74 },
  { start: 295, from: [1500, -160], to: [1260, 760], size: 54 },
  { start: 303, from: [200, -100], to: [480, 900], size: 45 },
  { start: 312, from: [1180, -200], to: [1020, 880], size: 93 },
  { start: 322, from: [1750, -100], to: [1580, 820], size: 48 },
  { start: 330, from: [760, -140], to: [640, 860], size: 64 },
];
const METEOR_TRAVEL = 18;
const impactsOf = (m: (typeof METEORS)[number]) => m.start + METEOR_TRAVEL;

const SHAKES = [
  { start: 52, strength: 22, seed: 1 },
  { start: 190, strength: 34, seed: 2 },
  { start: 214, strength: 20, seed: 3 },
  { start: 238, strength: 18, seed: 4 },
  ...METEORS.map((m, i) => ({ start: impactsOf(m), strength: m.size * 0.5, seed: 10 + i })),
];

const Label = ({ frame }: { frame: number }) => {
  const seg = [...SEGMENTS].reverse().find((s) => frame >= s.from);
  return (
    <div style={{ position: 'absolute', left: 40, top: 36, padding: '8px 16px', background: INK, color: IVORY, font: '600 28px Consolas, monospace', letterSpacing: 1 }}>
      {seg?.label} · f{frame}
    </div>
  );
};

// Overscan: shake moves the picture up to ~40 px and tilts it, so it is scaled up to keep the edges covered.
const Background = ({ frame, children }: { frame: number; children?: ReactNode }) => {
  const s = shakeSum(frame, SHAKES);
  return (
    <AbsoluteFill style={{ transform: `translate(${s.x}px, ${s.y}px) rotate(${s.rot}rad) scale(1.12)` }}>
      <Img src={staticFile('01-tarz-cizgi-roman.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {children}
    </AbsoluteFill>
  );
};

export const VfxGallery = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Misregister>
        <Background frame={frame} />
        {/* 1. Black splashes */}
        <InkSplash frame={frame - 2} duration={48} seed={11} x={360} y={600} size={230} fade={8} />
        <InkSplash frame={frame - 10} duration={40} seed={12} x={1590} y={380} size={170} fade={8} />
        <InkSplash frame={frame - 18} duration={32} seed={13} x={1560} y={880} size={130} fade={8} />
        {/* 2. Violet strike splash */}
        <InkSplash frame={frame - 52} duration={42} seed={21} x={960} y={540} size={300} variant="violet" fade={8} />
        <InkSplash frame={frame - 60} duration={34} seed={22} x={1450} y={760} size={140} variant="violet" fade={8} />
        {/* 3. Radial lines on the head, black then ivory */}
        <SpeedLines mode="radial" frame={frame - 95} duration={24} seed={31} focus={[960, 260]} inner={240} />
        <SpeedLines mode="radial" frame={frame - 119} duration={21} seed={32} focus={[960, 420]} inner={300} color={IVORY} />
        {/* 4. Parallel lines, diagonal dive then horizontal ivory */}
        <SpeedLines mode="parallel" frame={frame - 140} duration={24} seed={41} angle={Math.PI * 0.3} />
        <SpeedLines mode="parallel" frame={frame - 164} duration={21} seed={42} angle={Math.PI} color={IVORY} speed={150} />
        {/* 5. Impacts */}
        <ImpactBurst frame={frame - 190} duration={14} seed={51} x={960} y={560} size={260} flash={2} />
        <InkSplash frame={frame - 192} duration={40} seed={52} x={960} y={560} size={200} fade={6} />
        <ImpactBurst frame={frame - 214} duration={12} seed={53} x={1380} y={440} size={180} flash={1} />
        {/* 6. Debris: a ground burst, then an all-round burst */}
        <ImpactBurst frame={frame - 238} duration={8} seed={61} x={960} y={880} size={150} flash={0} />
        <Shards frame={frame - 238} duration={46} seed={61} origin={[960, 880]} spread={Math.PI * 0.9} speed={40} size={64} count={34} />
        <Shards frame={frame - 256} duration={30} seed={62} origin={[1300, 520]} direction={0} spread={Math.PI * 2} speed={30} size={52} count={26} />
        {/* 7. Meteor rain: each impact = splash + small burst + debris */}
        {METEORS.map((m, i) => {
          const hit = impactsOf(m);
          return (
            <AbsoluteFill key={i}>
              <InkSplash frame={frame - hit} duration={GALLERY_FRAMES - hit} seed={70 + i} x={m.to[0]} y={m.to[1]} size={m.size * 3.2} variant="violet" />
              <Shards frame={frame - hit} duration={GALLERY_FRAMES - hit} seed={80 + i} origin={m.to} count={14} size={m.size * 0.7} speed={m.size * 0.6} spread={Math.PI * 1.1} />
              <ImpactBurst frame={frame - hit} duration={7} seed={90 + i} x={m.to[0]} y={m.to[1]} size={m.size * 2.6} flash={0} />
              <Meteor frame={frame - m.start} duration={METEOR_TRAVEL} seed={60 + i} from={m.from} to={m.to} size={m.size} />
            </AbsoluteFill>
          );
        })}
      </Misregister>
      <PrintTexture />
      <Label frame={frame} />
    </AbsoluteFill>
  );
};
