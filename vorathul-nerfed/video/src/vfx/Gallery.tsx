// Preview of every effect in turn over the approved style frame. Not part of the film.
import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { CanvasBulge } from './CanvasBulge.tsx';
import { CrackGrow } from './CrackGrow.tsx';
import { dryBrushOutline, DryBrush, DryBrushStroke } from './DryBrushStroke.tsx';
import { DuotoneFlash } from './DuotoneFlash.tsx';
import { EchoTrail } from './EchoTrail.tsx';
import { assertFlashBudget, duotoneSwings, gradeCues, impactSwings } from './flash.ts';
import { ImpactBurst } from './ImpactBurst.tsx';
import { InkSplash } from './InkSplash.tsx';
import { Meteor } from './Meteor.tsx';
import { PaintSpread } from './PaintSpread.tsx';
import { Misregister, PrintTexture } from './PrintTexture.tsx';
import { ScribbleBoil } from './ScribbleBoil.tsx';
import { Shards } from './Shards.tsx';
import { shakeSum } from './shake.ts';
import { SpeedLines } from './SpeedLines.tsx';
import { StickerCutout } from './StickerCutout.tsx';
import { GOLD, INK, IVORY, SKY, VIOLET, VIOLET_LIGHT, type Pt } from './style.tsx';
import { fastForward, playBetween, TimeRemap } from './TimeRemap.tsx';
import { LIGHT_END, LIGHT_SEGMENTS, LIGHT_SWITCHES, LightSegment, SPLIT_CUES } from './GalleryLight.tsx';
import { splitSwings } from './SplitLight.tsx';

export const GALLERY_FRAMES = LIGHT_END;
/** The meteor segment's splashes and debris hold until here. */
const METEOR_END = 360;

type Backdrop = 'painting' | 'paper' | 'office';
/** Echo and collage segments play on plain paper; spread and crack segments on the office plate. */
const backdropAt = (frame: number): Backdrop =>
  (frame >= 360 && frame < 480) || (frame >= 620 && frame < 690)
    ? 'paper'
    : (frame >= 690 && frame < 810) || (frame >= 870 && frame < 960)
      ? 'office'
      : 'painting';

const SEGMENTS: { from: number; label: string }[] = [
  { from: 0, label: 'InkSplash' },
  { from: 50, label: 'InkSplash violet' },
  { from: 95, label: 'SpeedLines radial' },
  { from: 140, label: 'SpeedLines parallel' },
  { from: 185, label: 'ImpactBurst + shake' },
  { from: 250, label: 'Shards' },
  { from: 285, label: 'Meteor rain' },
  { from: 360, label: 'EchoTrail echo' },
  { from: 420, label: 'EchoTrail smear' },
  { from: 480, label: 'DuotoneFlash' },
  { from: 530, label: 'ScribbleBoil' },
  { from: 580, label: 'DryBrushStroke / dryBrushOutline' },
  { from: 620, label: 'StickerCutout (boil, peel)' },
  { from: 690, label: 'PaintSpread pour' },
  { from: 770, label: 'PaintSpread cover' },
  { from: 810, label: 'CanvasBulge' },
  { from: 870, label: 'CrackGrow inside -> wall' },
  { from: 960, label: 'TimeRemap backward / 4x' },
  { from: 1020, label: 'grade V' },
  { from: 1040, label: 'grade O (= O-b: halftone + selection edge)' },
  { from: 1060, label: 'grade O_A (alternative: no edge)' },
  { from: 1080, label: 'grade O_C (alternative: MEMORY logic)' },
  { from: 1100, label: 'grade POSTER / GOLD' },
  ...LIGHT_SEGMENTS,
];

// Grades built by the cue helper; every anchor is a frame here because the gallery has no song.
// In the film the anchors are { beat } or { word }.
const DUOTONE = gradeCues(
  [
    // With the backdrop switches at 480 and 1020, each run keeps to 3 swings in any 30 frames.
    { at: { frame: 482 }, grade: 'V', hold: 8 },
    { at: { frame: 512 }, grade: 'GOLD' },
    { at: { frame: 522 }, grade: 'MEMORY', hold: 6 },
    // O -> O_A keeps the same two colours (only the edge goes), so it is not a swing.
    { at: { frame: 1024 }, grade: 'V' },
    { at: { frame: 1040 }, grade: 'O' },
    { at: { frame: 1060 }, grade: 'O_A' },
    { at: { frame: 1080 }, grade: 'O_C' },
    { at: { frame: 1100 }, grade: 'POSTER' },
    { at: { frame: 1116 }, grade: 'GOLD' },
    { at: { frame: 1140 }, grade: 'P' },
  ],
  'gallery grades',
);

// The gallery's whole flash schedule, checked against the 3-per-second rule when the module loads:
// grades, impact flashes and the backdrop switches (paper / painting / office, TimeRemap jumps).
const BACKDROP_SWITCHES = [360, 480, 620, 690, 810, 870, 960, 990, 1020];
assertFlashBudget(
  [
    ...duotoneSwings(DUOTONE),
    ...impactSwings(190, 2),
    ...impactSwings(220, 1),
    ...[...BACKDROP_SWITCHES, ...LIGHT_SWITCHES].map((frame) => ({ frame, swings: 1 })),
    ...splitSwings(SPLIT_CUES),
    // LIGHT: rim on (f1155), violet spill on (f1210), the gold blast pulse in and out (f1228, f1242).
    ...[1155, 1210, 1228, 1242].map((frame) => ({ frame, swings: 1 })),
  ],
  'VfxGallery',
);

// TimeRemap demo: the meteor rain plays backward (ease-in rewind), then the echo segment at 4x.
// Fast-forward ranges must avoid flash segments: 4x through grades would multiply their rate.
const REMAP = (f: number): number => (f < 990 ? playBetween(960, 30, 345, 285)(f) : fastForward(990, 4, 362)(f));

/** Whip across the frame: each echo segment starts 2 frames in, crosses in 38 frames, then holds. */
const whipX = (frame: number, start: number): number =>
  interpolate(frame, [start + 2, start + 40], [-640, 640], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });

const STYLE_FRAME = '01-tarz-cizgi-roman.jpg';

/** Vorathul's black ink lifted out of the style frame (dark pixels to opaque black) as a cut-out subject. */
const InkFigure = ({ x }: { x: number }) => (
  <AbsoluteFill style={{ transform: `translateX(${x}px)`, clipPath: 'ellipse(400px 560px at 960px 520px)' }}>
    <AbsoluteFill style={{ filter: 'url(#vfx-gallery-ink-only)' }}>
      <Img src={staticFile(STYLE_FRAME)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

/** Flat office plate in the O palette: wall, floor, desks, a monitor, thin uniform lines. */
const OfficePlate = () => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
    <rect width={1920} height={1080} fill="#E9ECEF" />
    <rect y={820} width={1920} height={260} fill="#CED4DA" />
    <line x1={0} y1={820} x2={1920} y2={820} stroke="#ADB5BD" strokeWidth={3} />
    <g stroke="#ADB5BD" strokeWidth={2}>
      <rect x={1460} y={700} width={380} height={24} fill="#FFFFFF" />
      <line x1={1480} y1={724} x2={1480} y2={860} />
      <line x1={1820} y1={724} x2={1820} y2={860} />
      <rect x={1560} y={560} width={180} height={120} fill="#FFFFFF" />
      <rect x={1572} y={572} width={156} height={96} fill="#3B82F6" stroke="none" />
      <line x1={1650} y1={680} x2={1650} y2={700} />
      <rect x={120} y={640} width={260} height={180} fill="#FFFFFF" />
    </g>
  </svg>
);

/** The painting hung on the office wall: the card the crack and the spread start from. */
const CARD: [number, number, number, number] = [560, 160, 800, 534];
const PaintingCard = () => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', left: CARD[0] - 14, top: CARD[1] - 14, width: CARD[2] + 28, height: CARD[3] + 28, background: '#ADB5BD' }} />
    <Img src={staticFile(STYLE_FRAME)} style={{ position: 'absolute', left: CARD[0], top: CARD[1], width: CARD[2], height: CARD[3], objectFit: 'cover' }} />
  </AbsoluteFill>
);

/** A crop of the style frame as a collage panel. */
const Panel = ({ box, view, rotate = 0 }: { box: [number, number, number, number]; view: Pt; rotate?: number }) => (
  <AbsoluteFill style={{ transform: `rotate(${rotate}deg)`, transformOrigin: `${box[0] + box[2] / 2}px ${box[1] + box[3] / 2}px` }}>
    <div style={{ position: 'absolute', left: box[0], top: box[1], width: box[2], height: box[3], overflow: 'hidden' }}>
      <Img src={staticFile(STYLE_FRAME)} style={{ position: 'absolute', left: -view[0], top: -view[1], width: 1920, height: 1280 }} />
    </div>
  </AbsoluteFill>
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
  { start: 220, strength: 20, seed: 3 },
  { start: 252, strength: 18, seed: 4 },
  ...METEORS.map((m, i) => ({ start: impactsOf(m), strength: m.size * 0.5, seed: 10 + i })),
];

const CRACK_CUES = Array.from({ length: 19 }, (_, i) => 874 + i * 4);

const Label = ({ frame, shown }: { frame: number; shown: number }) => {
  const seg = [...SEGMENTS].reverse().find((s) => frame >= s.from);
  return (
    <div style={{ position: 'absolute', left: 40, top: 36, padding: '8px 16px', background: INK, color: IVORY, font: '600 28px Consolas, monospace', letterSpacing: 1 }}>
      {seg?.label} · f{frame}
      {shown !== frame ? ` (shows f${shown})` : ''}
    </div>
  );
};

// Overscan: shake moves the picture up to ~40 px and tilts it, so it is scaled up to keep the edges covered.
const Background = ({ frame }: { frame: number }) => {
  const b = backdropAt(frame);
  if (b === 'paper') return <AbsoluteFill style={{ background: IVORY }} />;
  if (b === 'office') return <OfficePlate />;
  const s = shakeSum(frame, SHAKES);
  return (
    <AbsoluteFill style={{ transform: `translate(${s.x}px, ${s.y}px) rotate(${s.rot}rad) scale(1.12)` }}>
      <Img src={staticFile(STYLE_FRAME)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </AbsoluteFill>
  );
};

const inRange = (frame: number, a: number, b: number, node: () => ReactNode): ReactNode => (frame >= a && frame < b ? node() : null);

/** Everything but the label; reads its own frame so TimeRemap can show it at another frame. */
const GalleryScene = () => {
  const frame = useCurrentFrame();
  const bulge = interpolate(frame, [812, 830, 850, 866], [0, 1, 1, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  return (
    <Misregister>
      <DuotoneFlash frame={frame} cues={DUOTONE}>
        {frame >= 810 && frame < 870 ? (
          <CanvasBulge frame={frame} amount={bulge} x={430} y={480} size={320} seed={3}>
            <Background frame={frame} />
          </CanvasBulge>
        ) : (
          <Background frame={frame} />
        )}
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
      {/* 30 frames after the first burst: its 3 swings fill that second. */}
      <ImpactBurst frame={frame - 220} duration={12} seed={53} x={1380} y={440} size={180} flash={1} />
      {/* 6. Debris: a ground burst, then an all-round burst. Kept clear of the f220 burst's second:
          flashcheck counted the burst star, debris and shake here as 3 more swings (measured). */}
      <ImpactBurst frame={frame - 252} duration={8} seed={61} x={960} y={880} size={150} flash={0} />
      <Shards frame={frame - 252} duration={33} seed={61} origin={[960, 880]} spread={Math.PI * 0.9} speed={40} size={64} count={34} />
      <Shards frame={frame - 266} duration={19} seed={62} origin={[1300, 520]} direction={0} spread={Math.PI * 2} speed={30} size={52} count={26} />
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
      {/* 8-9. Afterimages of a whip move, flat tints then paint smear */}
      {inRange(frame, 360, 420, () => (
        <EchoTrail frame={frame} copies={4} delay={2} offset={[-10, 4]} colors={[VIOLET, SKY, GOLD, VIOLET_LIGHT]} render={(f) => <InkFigure x={whipX(f, 360)} />} />
      ))}
      {inRange(frame, 420, 480, () => (
        <EchoTrail frame={frame} variant="smear" copies={3} delay={2} offset={[0, 0]} colors={[VIOLET, GOLD, SKY]} angle={0} length={260} render={(f) => <InkFigure x={whipX(f, 420)} />} />
      ))}
      {/* 10. Boiling scribbles */}
      <ScribbleBoil frame={frame - 530} duration={50} seed={1} x={960} y={250} rx={230} ry={160} color={VIOLET} width={9} />
      <ScribbleBoil frame={frame - 530} duration={50} seed={2} x={960} y={600} rx={150} ry={120} color={IVORY} width={7} hold={3} />
      <ScribbleBoil frame={frame - 530} duration={50} seed={3} x={330} y={520} rx={180} ry={240} color={INK} width={8} loops={2} />
      {/* 11. Shared stroke: UI-kit outline adapter, a free stroke, and the render-prop form */}
      {inRange(frame, 580, 620, () => (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {outline({ id: 'disc', d: circleD(380, 420, 170), width: 16, color: INK })}
          {outline({ id: 'bar', d: 'M1180 860L1780 860L1780 940L1180 940Z', width: 12, color: INK })}
          <DryBrushStroke d="M160 900C420 760 700 1010 980 880S1500 700 1760 760" width={34} color={VIOLET} seed={9} taper={0.9} breakup={0.5} />
          <DryBrush seed={4} rough={8} breakup={0.2}>
            {(filter) => <path d="M1380 260L1560 200L1700 330L1620 480L1420 450Z" fill={GOLD} stroke={INK} strokeWidth={12} filter={filter} />}
          </DryBrush>
        </svg>
      ))}
      {/* 12. Paper cut-out collage: torn borders boil on twos, the middle panel peels */}
      {inRange(frame, 620, 690, () => (
        <>
          <StickerCutout frame={frame} seed={1} id="st-a">
            <Panel box={[120, 170, 560, 420]} view={[180, 220]} rotate={-6} />
          </StickerCutout>
          <StickerCutout frame={frame} seed={3} id="st-c" border={18}>
            <InkFigure x={560} />
          </StickerCutout>
          <StickerCutout frame={frame} seed={2} id="st-b" peel={{ box: [700, 300, 520, 560], corner: 'tr', at: 648, size: 190, frames: 10 }}>
            <Panel box={[700, 300, 520, 560]} view={[700, 120]} />
          </StickerCutout>
        </>
      ))}
      {/* 13-14. Paint pours out of the painting over the office, then floods the frame */}
      {(frame >= 690 && frame < 810) || (frame >= 870 && frame < 960) ? <PaintingCard /> : null}
      {inRange(frame, 690, 770, () => (
        <PaintSpread frame={frame - 692} seed={5} edge={{ x0: CARD[0] + 50, x1: CARD[0] + CARD[2] - 50, y: CARD[1] + CARD[3] + 14 }} floor={950} streams={7} width={72} speed={7} />
      ))}
      {inRange(frame, 770, 810, () => (
        <PaintSpread frame={frame - 772} seed={6} mode="cover" duration={34} />
      ))}
      {/* 16. Crack: one step per cue, inside the painting, then out across the wall */}
      {inRange(frame, 870, 960, () => (
        <>
          <CrackGrow frame={frame} cues={CRACK_CUES} seed={7} origin={[0.22, 0.4]} escapeAt={14} escapeDir={Math.PI * 0.95} box={CARD} surface="inside" width={14} />
          <CrackGrow frame={frame} cues={CRACK_CUES} seed={7} origin={[0.22, 0.4]} escapeAt={14} escapeDir={Math.PI * 0.95} box={CARD} surface="outside" width={14} />
        </>
      ))}
      {/* 18. Light: rim, spill, split, and one motivated low-fps hold */}
      <LightSegment frame={frame} />
    </Misregister>
  );
};

export const VfxGallery = () => {
  const frame = useCurrentFrame();
  const remapped = frame >= 960 && frame < 1020;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <InkOnlyFilter />
      {remapped ? (
        <TimeRemap map={REMAP}>
          <GalleryScene />
        </TimeRemap>
      ) : (
        <GalleryScene />
      )}
      <PrintTexture />
      <Label frame={frame} shown={remapped ? Math.round(REMAP(frame)) : frame} />
    </AbsoluteFill>
  );
};
