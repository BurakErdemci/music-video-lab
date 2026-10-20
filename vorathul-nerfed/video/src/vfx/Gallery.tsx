// Preview of every effect in turn over the approved style frame. Not part of the film.
import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { dryBrushOutline, DryBrush, DryBrushStroke } from './DryBrushStroke.tsx';
import { DuotoneFlash, type DuotoneCue } from './DuotoneFlash.tsx';
import { EchoTrail } from './EchoTrail.tsx';
import { ScribbleBoil } from './ScribbleBoil.tsx';
import { ImpactBurst } from './ImpactBurst.tsx';
import { InkSplash } from './InkSplash.tsx';
import { Meteor } from './Meteor.tsx';
import { Misregister, PrintTexture } from './PrintTexture.tsx';
import { Shards } from './Shards.tsx';
import { shakeSum } from './shake.ts';
import { SpeedLines } from './SpeedLines.tsx';
import { GOLD, INK, IVORY, SKY, VIOLET, VIOLET_LIGHT, type Pt } from './style.tsx';

export const GALLERY_FRAMES = 620;
/** The meteor segment's splashes and debris hold until here. */
const METEOR_END = 360;
/** Echo segments play on plain paper so the afterimages read clearly. */
const PAPER = [360, 480] as const;

const SEGMENTS: { from: number; label: string }[] = [
  { from: 0, label: 'InkSplash' },
  { from: 50, label: 'InkSplash violet' },
  { from: 95, label: 'SpeedLines radial' },
  { from: 140, label: 'SpeedLines parallel' },
  { from: 185, label: 'ImpactBurst + shake' },
  { from: 235, label: 'Shards' },
  { from: 285, label: 'Meteor rain' },
  { from: 360, label: 'EchoTrail echo' },
  { from: 420, label: 'EchoTrail smear' },
  { from: 480, label: 'DuotoneFlash' },
  { from: 530, label: 'ScribbleBoil' },
  { from: 580, label: 'DryBrushStroke / dryBrushOutline' },
];

const DUOTONE: DuotoneCue[] = [
  { frame: 480, colors: [INK, VIOLET], hard: true },
  { frame: 484, colors: [INK, GOLD], hard: true },
  { frame: 488, colors: null },
  { frame: 492, colors: [VIOLET, IVORY] },
  { frame: 497, colors: [INK, SKY], hard: true },
  { frame: 501, colors: null },
  { frame: 510, colors: [INK, IVORY], hard: true },
  { frame: 513, colors: null },
];

/** Whip across the frame: each echo segment starts 2 frames in, crosses in 38 frames, then holds. */
const whipX = (frame: number, start: number): number =>
  interpolate(frame, [start + 2, start + 40], [-640, 640], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });

/** Vorathul's black ink lifted out of the style frame (dark pixels to opaque black) as a cut-out subject. */
const InkFigure = ({ x }: { x: number }) => (
  <AbsoluteFill style={{ transform: `translateX(${x}px)`, clipPath: 'ellipse(400px 560px at 960px 520px)' }}>
    <AbsoluteFill style={{ filter: 'url(#vfx-gallery-ink-only)' }}>
      <Img src={staticFile('01-tarz-cizgi-roman.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </AbsoluteFill>
  </AbsoluteFill>
);

// A component, not a module-level JSX constant: the bundle compiles JSX to React.createElement,
// and React is not yet defined while modules are evaluated.
const InkOnlyFilter = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <filter id="vfx-gallery-ink-only" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 0.04  0 0 0 0 0.035  0 0 0 0 0.03  -1.2 -2.36 -0.44 0 2.5" />
    </filter>
  </svg>
);

const circleD = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
const outline = dryBrushOutline({ taper: 0.25, breakup: 0.35 });

const METEORS: { start: number; from: Pt; to: Pt; size: number }[] = [
  { start: 285, from: [160, -120], to: [470, 840], size: 74 },
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
  if (frame >= PAPER[0] && frame < PAPER[1]) return <AbsoluteFill style={{ background: IVORY }} />;
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
      <InkOnlyFilter />
      <Misregister>
        <DuotoneFlash frame={frame} cues={DUOTONE}>
          <Background frame={frame} />
        </DuotoneFlash>
        {/* 1. Black splashes */}
        <InkSplash frame={frame - 2} duration={48} seed={11} x={300} y={560} size={200} fade={8} direction={0.25} />
        <InkSplash frame={frame - 10} duration={40} seed={12} x={1660} y={330} size={150} fade={8} direction={Math.PI * 0.85} />
        <InkSplash frame={frame - 18} duration={32} seed={13} x={1480} y={860} size={120} fade={8} direction={-0.4} />
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
              <InkSplash frame={frame - hit} duration={METEOR_END - hit} seed={70 + i} x={m.to[0]} y={m.to[1]} size={m.size * 3.2} variant="violet" />
              <Shards frame={frame - hit} duration={METEOR_END - hit} seed={80 + i} origin={m.to} count={14} size={m.size * 0.7} speed={m.size * 0.6} spread={Math.PI * 1.1} />
              <ImpactBurst frame={frame - hit} duration={7} seed={90 + i} x={m.to[0]} y={m.to[1]} size={m.size * 2.6} flash={0} />
              <Meteor frame={frame - m.start} duration={METEOR_TRAVEL} seed={60 + i} from={m.from} to={m.to} size={m.size} />
            </AbsoluteFill>
          );
        })}
        {/* 8. Afterimages of a whip move, flat tints then paint smear */}
        {frame >= 360 && frame < 420 ? <EchoTrail frame={frame} copies={4} delay={2} offset={[-10, 4]} colors={[VIOLET, SKY, GOLD, VIOLET_LIGHT]} render={(f) => <InkFigure x={whipX(f, 360)} />} /> : null}
        {frame >= 420 && frame < 480 ? (
          <EchoTrail frame={frame} variant="smear" copies={3} delay={2} offset={[0, 0]} colors={[VIOLET, GOLD, SKY]} angle={0} length={260} render={(f) => <InkFigure x={whipX(f, 420)} />} />
        ) : null}
        {/* 10. Boiling scribbles */}
        <ScribbleBoil frame={frame - 530} duration={50} seed={1} x={960} y={250} rx={230} ry={160} color={VIOLET} width={9} />
        <ScribbleBoil frame={frame - 530} duration={50} seed={2} x={960} y={600} rx={150} ry={120} color={IVORY} width={7} hold={3} />
        <ScribbleBoil frame={frame - 530} duration={50} seed={3} x={330} y={520} rx={180} ry={240} color={INK} width={8} loops={2} />
        {/* 11. Shared stroke: UI-kit outline adapter, a free stroke, and the render-prop form */}
        {frame >= 580 ? (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            {outline({ id: 'disc', d: circleD(380, 420, 170), width: 16, color: INK })}
            {outline({ id: 'bar', d: 'M1180 860L1780 860L1780 940L1180 940Z', width: 12, color: INK })}
            <DryBrushStroke d="M160 900C420 760 700 1010 980 880S1500 700 1760 760" width={34} color={VIOLET} seed={9} taper={0.9} breakup={0.5} />
            <DryBrush seed={4} rough={8} breakup={0.2}>
              {(filter) => <path d="M1380 260L1560 200L1700 330L1620 480L1420 450Z" fill={GOLD} stroke={INK} strokeWidth={12} filter={filter} />}
            </DryBrush>
          </svg>
        ) : null}
      </Misregister>
      <PrintTexture />
      <Label frame={frame} />
    </AbsoluteFill>
  );
};
