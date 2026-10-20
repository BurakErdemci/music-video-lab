// The shots that look at the office (S26, S31-S36, S40, S42): the gamepad against the wall, the frame match and
// pull-back, the developer, the freeze, the patch card and his hands on the painting.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { DuotoneFlash, seeded, shake } from '../../vfx/effects.ts';
import { UiFonts } from '../../ui/kit.ts';
import { C } from '../../ui/theme.tsx';
import { BigHand } from './art/hands.tsx';
import { HandPiece } from './paint/handArt.tsx';
import { finalSize } from './paint/finals.tsx';
import { PadArt } from './art/props.tsx';
import { ClickerArt } from './art/props.tsx';
import { GamepadArt } from './art/gamepad.tsx';
import { DevActor } from './DevActor.tsx';
import { S26_CUES, S33_CUES } from './flash.ts';
import { SHOT_FROM, T } from './frames.ts';
import { OfficeScene, scaleAt, type OfficeCam } from './Office.tsx';
import { cardLines, PatchCard } from './PatchCard.tsx';
import { PatchNotesCard } from '../../ui/kit.ts';
import { paintAt } from './paint/props.tsx';
import { capPx } from './paint/script.tsx';
import { lerpOpt } from './util.ts';

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const easeOutQ = (t: number): number => 1 - (1 - clamp(t)) ** 2;
const easeOut = (t: number): number => 1 - (1 - clamp(t)) ** 3;

const Root = ({ children }: { children: ReactNode }) => (
  <AbsoluteFill style={{ background: '#E6E9ED' }}>
    <UiFonts />
    {children}
  </AbsoluteFill>
);

// ---- S26 the one office cut ------------------------------------------------------------------------------------------------

const IMPACT: readonly [number, number] = [960, 470];

/** Cracks radiating from the impact point: seeded branches revealed by length over the frames. */
const Cracks = ({ f }: { f: number }) => {
  const grow = easeOut((f - T.shattered) / (SHOT_FROM.S27 - T.shattered + 14));
  if (f < T.shattered) return null;
  const rng = seeded('p2wallcracks');
  const paths: string[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const len = rng.range(380, 820) * (f >= T.crackSpread ? 1 : 0.45);
    let x = IMPACT[0];
    let y = IMPACT[1];
    let d = `M${x} ${y}`;
    const steps = 6;
    for (let k = 1; k <= steps; k++) {
      const aa = a + rng.range(-0.3, 0.3);
      x += (Math.cos(aa) * len) / steps;
      y += (Math.sin(aa) * len) / steps;
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (k === 3 && rng() < 0.8) {
        const b = aa + rng.sign() * rng.range(0.5, 0.9);
        d += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + Math.cos(b) * len * 0.35).toFixed(1)} ${(y + Math.sin(b) * len * 0.35).toFixed(1)}M${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    paths.push(d);
  }
  return (
    <>
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - grow} fill="none" stroke={C.slate} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </>
  );
};

export const S26 = ({ frame: f }: { frame: number }) => {
  const fly = clamp((f - SHOT_FROM.S26) / (T.shattered - SHOT_FROM.S26));
  const e = fly * fly;
  const stuck = f >= T.shattered;
  const width = stuck ? 640 : lerpOpt(1500, 640, e);
  const x = stuck ? IMPACT[0] : lerpOpt(-260, IMPACT[0], e);
  const y = stuck ? IMPACT[1] : lerpOpt(1250, IMPACT[1], e);
  const rot = stuck ? 8 : lerpOpt(-70, 8, e);
  const shk = shake(f, T.shattered, 16, 26, 14);
  const shk2 = shake(f, T.buttonPop, 9, 27, 12);
  const squash = stuck ? 1 - 0.07 * Math.exp(-(f - T.shattered) / 2) : 1;
  return (
    <Root>
      <DuotoneFlash frame={f} cues={S26_CUES}>
        <AbsoluteFill style={{ transform: `translate(${shk.x + shk2.x}px, ${shk.y + shk2.y}px)` }}>
          <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
            <rect width={1920} height={1080} fill="#D3D8DE" />
            <rect y={930} width={1920} height={150} fill={C.dark} />
            <rect y={918} width={1920} height={14} fill={C.slate} opacity={0.5} />
            <Cracks f={f} />
            <g transform={`translate(${x} ${y}) rotate(${rot}) scale(1 ${squash})`}>
              <GamepadArt width={width} shatterT={f - T.buttonPop} popT={f - T.buttonPop} />
            </g>
            {f >= T.shattered && f < T.shattered + 6 ? <ImpactLines f={f - T.shattered} /> : null}
          </svg>
        </AbsoluteFill>
      </DuotoneFlash>
    </Root>
  );
};

const ImpactLines = ({ f }: { f: number }) => (
  <g transform={`translate(${IMPACT[0]} ${IMPACT[1]})`} stroke={C.slate} strokeWidth={6} strokeLinecap="round" opacity={1 - f / 6}>
    {Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const r0 = 300 + f * 30;
      return <path key={i} d={`M${Math.cos(a) * r0} ${Math.sin(a) * r0 * 0.6}L${Math.cos(a) * (r0 + 70)} ${Math.sin(a) * (r0 + 70) * 0.6}`} />;
    })}
  </g>
);

// ---- the shared office camera -------------------------------------------------------------------------------------------------

const D_WIDE = 21;
const TY_WIDE = -1.6;
const WIDE: OfficeCam = { D: D_WIDE, tx: 0, ty: TY_WIDE };
const notesAt = (f: number): number[] => [0, 1, 2, 3, 4].map((i) => clamp((f - (T.notesOn + 3 * i)) / 10));

/** S31: the camera leaves the painting at the speed the painting camera had, easing out to the 07 framing. */
export const frameMatchCam = (f: number): OfficeCam => {
  const e = easeOutQ((f - T.frameMatch) / (T.office07 - T.frameMatch));
  const drift = clamp((f - T.office07) / 22) * 0.1;
  return { D: 12.36 + (D_WIDE - 12.36) * e + drift, tx: 0, ty: TY_WIDE * e };
};

export const S31 = ({ frame: f }: { frame: number }) => {
  const drain = f >= T.update ? 0 : clamp((f - T.frameMatch) / (T.office07 - T.frameMatch));
  return (
    <Root>
      <OfficeScene frame={f} cam={frameMatchCam(f)} paint={paintAt(f)} notes={notesAt(f)} drain={drain} />
    </Root>
  );
};

// ---- S32-S34 the developer, the freeze, the patch card --------------------------------------------------------------------------

export const S32 = ({ frame: f }: { frame: number }) => (
  <Root>
    <OfficeScene frame={f} cam={WIDE} paint={paintAt(f)} notes={notesAt(f)} dev={<DevActor frame={f} />} />
  </Root>
);

/** The pause badge of the frozen game: static, it appears on the freeze frame and never moves. */
const PauseBadge = () => (
  <div style={{ position: 'absolute', left: 392, top: 118, width: 66, height: 66, borderRadius: 14, background: C.white, border: `3px solid ${C.dark}`, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 12, height: 32, background: C.blue, borderRadius: 3 }} />
    <div style={{ width: 12, height: 32, background: C.blue, borderRadius: 3 }} />
  </div>
);

/** Every card holds its f2347 transform: the whole shot is rendered at the freeze frame, only the grade cue reads the real one. */
export const S33 = ({ frame: f }: { frame: number }) => {
  const hold = T.freeze;
  return (
    <Root>
      <DuotoneFlash frame={f} cues={S33_CUES}>
        <OfficeScene frame={hold} cam={WIDE} paint={paintAt(hold)} notes={notesAt(hold)} dev={<DevActor frame={hold} />} />
        <PauseBadge />
      </DuotoneFlash>
    </Root>
  );
};

const CARD_WIDE = { x: 1250, y: 70, width: 640 };
export const S34 = ({ frame: f }: { frame: number }) => (
  <Root>
    <OfficeScene frame={f} cam={WIDE} paint={paintAt(f)} notes={notesAt(f)} dev={<DevActor frame={f} />} />
    <PatchCard frame={f} {...CARD_WIDE} />
  </Root>
);

// ---- S35 the tap -----------------------------------------------------------------------------------------------------------

const MED: OfficeCam = { D: 14, tx: 0.9, ty: -3.1 };
export const S35 = ({ frame: f }: { frame: number }) => (
  <Root>
    <OfficeScene frame={f} cam={MED} paint={paintAt(f)} notes={notesAt(f)} dev={<DevActor frame={f} />} />
    <PatchCard frame={f} x={40} y={60} width={600} />
  </Root>
);

// ---- S36 the pinch ---------------------------------------------------------------------------------------------------------

const CLOSE_BAR: OfficeCam = { D: 6, tx: 0.9, ty: 2.8 };
/** Window px of the painting to screen px for the close camera (the painting plane). */
const toScreen = (cam: OfficeCam, X: number, Y: number): [number, number] => {
  const s = scaleAt(cam, -20);
  return [960 + ((X - 960) / 120 - cam.tx) * s, 540 - ((540 - Y) / 120 - cam.ty) * s];
};

export const S36 = ({ frame: f }: { frame: number }) => {
  const [cx, cy] = capPx(f);
  const [sx, sy] = toScreen(CLOSE_BAR, cx, cy);
  const arrive = easeOut((f - SHOT_FROM.S36) / 9);
  return (
    <Root>
      <OfficeScene frame={f} cam={CLOSE_BAR} paint={paintAt(f)} notes={notesAt(f)} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
        <g transform={`translate(${sx + 380 * (1 - arrive)} ${sy + 420 * (1 - arrive)})`}>
          <HandPiece
            variant="pinch"
            height={430}
            flip
            sleeve={320}
            fallback={
              <g transform="rotate(-138)">
                <BigHand variant="pinch" size={330} pinch={1} sleeve={900} sleeveAngle={0} />
              </g>
            }
          />
        </g>
      </svg>
      <PatchCard frame={f} x={60} y={640} width={560} />
    </Root>
  );
};

// ---- S40 the sticky note ---------------------------------------------------------------------------------------------------------

const CLOSE_HANDS: OfficeCam = { D: 6, tx: 11.2, ty: -0.4 };
const WRITE = { from: T.three, frames: 10 };
export const S40 = ({ frame: f }: { frame: number }) => {
  const peel = clamp((f - SHOT_FROM.S40) / 8);
  const write = clamp((f - WRITE.from) / WRITE.frames);
  const cross = clamp((f - (WRITE.from + WRITE.frames + 3)) / 5);
  return (
    <Root>
      <OfficeScene frame={f} cam={CLOSE_HANDS} paint={paintAt(f)} notes={notesAt(f)} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <clipPath id="p2write">
            <rect x={-260} y={-260} width={520 * write} height={520} />
          </clipPath>
        </defs>
        {finalSize('G31-3') && finalSize('G31-4') ? (
          <>
            <g transform="translate(1010 560)">
              <HandPiece variant="pad" height={620} sleeve={160} fallback={null} />
              <g clipPath="url(#p2write)">
                <text x={-130} y={28} fontFamily="'UiInter', sans-serif" fontSize={64} fontWeight={700} fill={C.ink} fontStyle="italic">
                  Phase 3
                </text>
              </g>
              <rect x={-140} y={-6} width={270 * cross} height={9} rx={4} fill={C.blue} />
            </g>
            <g transform={`translate(${1010 - 130 + 240 * write} ${560 + 34 + 6 * Math.sin(write * 9)})`}>
              <HandPiece variant="pen" height={520} sleeve={120} fallback={null} />
            </g>
          </>
        ) : (
          <>
            <g transform="translate(700 500)">
              <PadArt size={420} peel={peel} />
              <g clipPath="url(#p2write)">
                <text x={-170} y={28} fontFamily="'UiInter', sans-serif" fontSize={96} fontWeight={700} fill={C.ink} fontStyle="italic">
                  Phase 3
                </text>
              </g>
              <rect x={-190} y={-2} width={380 * cross} height={11} rx={5} fill={C.blue} />
            </g>
            <g transform="translate(700 712)">
              <BigHand variant="pad" size={520} sleeve={900} sleeveAngle={-38} />
            </g>
            <g transform={`translate(${530 + 340 * write} ${520 + 8 * Math.sin(write * 9)})`}>
              <BigHand variant="pen" size={380} sleeve={800} sleeveAngle={-18} flip />
            </g>
          </>
        )}
      </svg>
      <PatchCard frame={f} x={1300} y={640} width={560} />
    </Root>
  );
};

// ---- S42 the card is pinned ------------------------------------------------------------------------------------------------------

const CARD_PIN = { x: 7.6, y: -0.07, w: 3.4 };
export const S42 = ({ frame: f }: { frame: number }) => {
  const slap = clamp((f - (SHOT_FROM.S42 + 3)) / 5);
  const pinned = (
    <foreignObject x={CARD_PIN.x} y={CARD_PIN.y} width={CARD_PIN.w} height={CARD_PIN.w * 0.62} style={{ overflow: 'visible' }}>
      <div style={{ position: 'relative', width: CARD_PIN.w, height: CARD_PIN.w * 0.62, opacity: slap, transform: `scale(${1.25 - 0.25 * slap})` }}>
        <PatchNotesCard frame={f} x={0} y={0} width={CARD_PIN.w} title="PATCH 2.3" enterAt={0} lines={cardLines(f)} footer="Balance team" />
        <div style={{ position: 'absolute', left: CARD_PIN.w / 2 - 0.12, top: -0.1, width: 0.24, height: 0.24, borderRadius: 0.12, background: C.blue }} />
      </div>
    </foreignObject>
  );
  return (
    <Root>
      <OfficeScene frame={f} cam={WIDE} paint={paintAt(f)} notes={notesAt(f)} dev={<DevActor frame={f} />} onFrame={pinned} />
    </Root>
  );
};

