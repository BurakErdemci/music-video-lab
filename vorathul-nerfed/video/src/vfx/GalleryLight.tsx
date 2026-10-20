// The gallery's LIGHT segment: rim light, light spill, split light and one motivated low-fps
// hold, each shown first without and then with the effect, on approved frames.
import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from 'remotion';
import { FigureSpill, LightSpill, pulse, sparkLights, swell } from './LightSpill.tsx';
import { RimLight } from './RimLight.tsx';
import { SPLITS, SplitLight, type SplitCue } from './SplitLight.tsx';
import { seededHolds } from './Stutter.tsx';
import { GOLD, INK, VIOLET } from './style.tsx';

export const LIGHT_START = 1140;
export const LIGHT_END = 1410;

export const LIGHT_SEGMENTS: { from: number; label: string }[] = [
  { from: 1140, label: 'RimLight - before' },
  { from: 1155, label: 'RimLight 3px gold sky + violet energy, 3-level flicker; violet spill on the wall' },
  { from: 1200, label: 'LightSpill - before' },
  { from: 1210, label: 'LightSpill - after: violet glow swells, gold blast pulse, gold sparks' },
  { from: 1250, label: 'SplitLight - before' },
  { from: 1260, label: 'SplitLight V: gold key left, violet fill right, swells in' },
  { from: 1280, label: 'SplitLight P: gold key, sky fill (hard switch)' },
  { from: 1300, label: 'seededHolds: nerfed lunge lags on 4-7 frame holds, recovers to smooth' },
  { from: 1350, label: 'Hero (knight G15-1) - before' },
  { from: 1365, label: 'Hero: violet FigureSpill from his side + gold sky rim' },
];

/** Frames on which the LIGHT segment switches plates or light setups (for the flash budget). */
export const LIGHT_SWITCHES = [1140, 1200, 1250, 1300, 1350, 1365];

export const SPLIT_CUES: SplitCue[] = [
  { frame: 1260, light: { ...SPLITS.V, swell: 18 } },
  { frame: 1280, light: { ...SPLITS.P } },
  { frame: 1300, light: null },
];

const plate = (name: string, dim = 0) => (
  <AbsoluteFill>
    <Img src={staticFile(`plates/${name}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    {dim > 0 ? <AbsoluteFill style={{ background: INK, opacity: dim }} /> : null}
  </AbsoluteFill>
);

/** Ivory paper to transparent: the character sheet's front view becomes a real cut-out with alpha. */
const SheetCutFilter = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <filter id="vfx-gallery-sheet-cut" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -0.85 -2.86 -0.29 0 3.4" />
    </filter>
  </svg>
);

/** Vorathul's front view from the character sheet, as a cut-out at (x, bottom), scale s. */
const SheetFigure = ({ x, bottom = 1040, s = 1.1 }: { x: number; bottom?: number; s?: number }) => {
  const [w, h] = [530 * s, 860 * s];
  return (
    // The filter sits on the img, the clip on its parent: a CSS filter: url() on an overflow-hidden
    // element paints the overflowing content's filter region solid black in Chrome (measured).
    <div style={{ position: 'absolute', left: x - w / 2, top: bottom - h, width: w, height: h, overflow: 'hidden' }}>
      <Img src={staticFile('plates/02-kanonik-karakter-sayfasi.jpg')} style={{ position: 'absolute', left: -30 * s, top: -75 * s, width: 1536 * s, height: 1024 * s, filter: 'url(#vfx-gallery-sheet-cut)' }} />
    </div>
  );
};

const at = (frame: number, a: number, b: number, node: () => ReactNode): ReactNode => (frame >= a && frame < b ? node() : null);

export const LightSegment = ({ frame }: { frame: number }) => {
  if (frame < LIGHT_START || frame >= LIGHT_END) return null;
  const rimOn = frame >= 1155;
  const spillOn = frame >= 1210;
  // The meteor glow travels with an (off-plate) meteor from top left toward the figure.
  const mx = interpolate(frame, [1210, 1249], [200, 980], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const my = interpolate(frame, [1210, 1249], [80, 520], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  // The nerfed lunge: the figure slides in; until f1326 it only updates every 4th frame (lag), then runs smooth.
  const lungeAt = (f: number) => interpolate(f, [1302, 1346], [-380, 380], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const lagF = frame < 1326 ? seededHolds(frame, 3, 1302) : frame;
  return (
    <AbsoluteFill>
      <SheetCutFilter />
      {at(frame, 1140, 1200, () => (
        <>
          {plate('06-dovus-faz3.jpg', 0.45)}
          {rimOn ? (
            <>
              {/* Violet light from his energy falls on the wall behind him only: his body stays flat ink
                  by contract, so FigureSpill (light ON a figure) is for heroes, not for him. */}
              <div style={{ position: 'absolute', left: 620, top: 480, width: 680, height: 560, background: VIOLET, opacity: 0.3, filter: 'blur(150px)' }} />
              <RimLight frame={frame} color={GOLD} angle={-Math.PI * 0.75} width={3} color2={VIOLET} angle2={0} intensity2={0.9} flicker={{ mode: 'levels', seed: 4 }}>
                <SheetFigure x={960} />
              </RimLight>
            </>
          ) : (
            <SheetFigure x={960} />
          )}
        </>
      ))}
      {at(frame, 1200, 1250, () => (
        <>
          {spillOn ? (
            <LightSpill
              frame={frame}
              keepBlack={0.05}
              sources={[
                { x: mx, y: my, color: VIOLET, radius: 520, intensity: swell(1210, 30, 0.85) },
                { x: 1250, y: 760, color: GOLD, radius: 700, intensity: pulse(1228, 8, 4, 14, 0.75) },
                ...sparkLights([{ x: 1130, y: 640 }, { x: 1390, y: 700 }, { x: 1210, y: 880 }, { x: 1460, y: 590 }], GOLD, 70, frame >= 1228 ? 0.7 : 0),
              ]}
            >
              {plate('04-ikinci-form.jpg')}
            </LightSpill>
          ) : (
            plate('04-ikinci-form.jpg')
          )}
        </>
      ))}
      {at(frame, 1250, 1300, () => (
        <SplitLight frame={frame} cues={SPLIT_CUES}>
          {plate('06-dovus-faz3.jpg')}
        </SplitLight>
      ))}
      {at(frame, 1300, 1350, () => (
        <>
          {plate('01-tarz-cizgi-roman.jpg', 0.2)}
          <AbsoluteFill style={{ transform: `translateX(${lungeAt(lagF)}px)` }}>
            {/* A gold rim so the cut-out reads against the plate's own black robe. */}
            <RimLight color={GOLD} angle={-Math.PI * 0.6} width={3} id="vfx-rim-lunge">
              <SheetFigure x={960} s={0.8} />
            </RimLight>
          </AbsoluteFill>
        </>
      ))}
      {at(frame, 1350, 1410, () => (
        <>
          {plate('06-dovus-faz3.jpg', 0.55)}
          {frame >= 1365 ? (
            // Violet from Vorathul (off frame right) falls on the knight; gold from the sky rims him.
            <FigureSpill color={VIOLET} strength={0.32} from="bottom" quad={[960, 380, 700, 640]} quadStrength={0.4}>
              <RimLight color={GOLD} angle={-Math.PI * 0.7} width={3} intensity2={0.9} color2={VIOLET} angle2={0} id="vfx-rim-hero">
                <Hero />
              </RimLight>
            </FigureSpill>
          ) : (
            <Hero />
          )}
        </>
      ))}
    </AbsoluteFill>
  );
};

/** The knight cut-out (G15-1, 226 x 241 px alpha PNG) at 3x, standing centre-left. */
const Hero = () => (
  <Img src={staticFile('assets/G15-1.png')} style={{ position: 'absolute', left: 520, top: 260, width: 226 * 3, height: 241 * 3 }} />
);
