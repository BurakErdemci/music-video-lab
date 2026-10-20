// The shots that look at the painting from inside (S27-S30, S37-S39, S41, S43-S45): cameras, grades and decor over the
// one continuing picture of paint/script.tsx.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { DuotoneFlash, ImpactBurst, type DuotoneCue } from '../../vfx/effects.ts';
import { shake } from '../../vfx/effects.ts';
import { UiFonts } from '../../ui/kit.ts';
import { M_CUES } from './flash.ts';
import { SHOT_FROM, T } from './frames.ts';
import { PaintView, winToCanvas } from './paint/PaintView.tsx';
import { paintAt } from './paint/props.tsx';
import { FLOOR, HELM, rogueX, SHAKES } from './paint/script.tsx';
import { shakeView } from './paint/state.ts';
import { lerpView, VIEWS, type View } from './paint/space.ts';
import { seeded } from '../../vfx/seeded.ts';

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));

const Shot = ({ frame, cues, children }: { frame: number; cues?: DuotoneCue[]; children: ReactNode }) => (
  <AbsoluteFill style={{ background: '#0A0908' }}>
    <UiFonts />
    {cues ? <DuotoneFlash frame={frame} cues={cues}>{children}</DuotoneFlash> : children}
  </AbsoluteFill>
);

// ---- S27 Meteor Rain: the whole painting, a medium shake on every landing -------------------------------------------------
export const S27 = ({ frame }: { frame: number }) => (
  <Shot frame={frame}>
    <PaintView {...paintAt(frame)} view={shakeView(VIEWS.WIDE, frame, SHAKES)} hudFixed />
  </Shot>
);

// ---- S28 hero height: the rest of the party falls; the bar refills and the black/ivory posterise lands on "all" -----------
const FLOOR_VIEW: View = { cx: 2.5, cy: -2.85, h: 3.2 };
export const S28 = ({ frame }: { frame: number }) => {
  const v = shakeView(FLOOR_VIEW, frame, SHAKES);
  const [bx, by] = winToCanvas(v, rogueX(T.rogueFlat), FLOOR - 40);
  return (
    <Shot frame={frame}>
      <PaintView {...paintAt(frame)} view={v} hudFixed />
      <ImpactBurst frame={frame - T.rogueFlat} duration={12} seed={90} x={bx} y={by} size={170} flash={1} />
    </Shot>
  );
};

// ---- S29-S30 the pull-back: victory, then the camera leaves through the entrance --------------------------------------------
const MED_START: View = { cx: 0, cy: 0.9, h: 6.0 };
const FULL_VIEW: View = VIEWS.WIDE;
/** Ease-in (quartic): still accelerating on the last frame, where the office camera takes over at the same speed. */
export const pullBackView = (f: number): View => lerpView(MED_START, FULL_VIEW, clamp((f - T.came) / (T.frameMatch - T.came)) ** 4);

export const S29 = ({ frame }: { frame: number }) => (
  <Shot frame={frame}>
    <PaintView {...paintAt(frame)} view={pullBackView(frame)} hudFixed />
  </Shot>
);
export const S30 = S29;

// ---- S37 the drag: a giant flat hand pulls the bar end; four cells pop off as magenta tiles ----------------------------------
export const S37 = ({ frame }: { frame: number }) => (
  <Shot frame={frame} cues={M_CUES(T.percent)}>
    <PaintView {...paintAt(frame)} view={shakeView(VIEWS.MED, frame, SHAKES)} hudFixed />
  </Shot>
);

// ---- S38 / S39 sword up again, then the giant eraser sweeps the sky ----------------------------------------------------------
const LOW_WIDE: View = { cx: 0, cy: -0.35, h: 8.4 };
export const S38 = ({ frame }: { frame: number }) => (
  <Shot frame={frame}>
    <PaintView {...paintAt(frame)} view={shakeView(LOW_WIDE, frame, SHAKES)} hudFixed />
  </Shot>
);
export const S39 = ({ frame }: { frame: number }) => (
  <Shot frame={frame} cues={M_CUES(T.removed)}>
    <PaintView {...paintAt(frame)} view={shakeView(LOW_WIDE, frame, SHAKES)} hudFixed />
  </Shot>
);

// ---- S41 the slap: a giant sticky note clamps the helm shut ------------------------------------------------------------------
const HELM_CLOSE: View = { cx: 0, cy: 1.3, h: 3.4 };
export const S41 = ({ frame }: { frame: number }) => (
  <Shot frame={frame} cues={M_CUES(T.pipMagenta)}>
    <PaintView {...paintAt(frame)} view={shakeView(HELM_CLOSE, frame, SHAKES)} hudFixed />
  </Shot>
);

// ---- S43 the heroes agree with the patch -------------------------------------------------------------------------------------
const FLOOR_RIGHT: View = { cx: 3.3, cy: -2.85, h: 3.2 };
export const S43 = ({ frame }: { frame: number }) => (
  <Shot frame={frame}>
    <PaintView {...paintAt(frame)} view={FLOOR_RIGHT} hudFixed />
  </Shot>
);

// ---- S44 four comic zoom panels: bar, tiles, note on the helm, dimming eye ---------------------------------------------------
const PANELS: readonly { at: number; view: View }[] = [
  { at: T.zoom1, view: { cx: -2.4, cy: 3.55, h: 2.7 } },
  { at: T.zoom2, view: { cx: 3.3, cy: -3.35, h: 2.4 } },
  { at: T.zoom3, view: { cx: 0, cy: 1.4, h: 3.0 } },
  { at: T.zoom4, view: { cx: 0, cy: 1.35, h: 1.6 } },
];
const panelAt = (f: number): { at: number; view: View } => PANELS.reduce((cur, p) => (f >= p.at ? p : cur), PANELS[0] as { at: number; view: View });

export const S44 = ({ frame }: { frame: number }) => {
  const p = panelAt(frame);
  const punch = 1 + 0.05 * (1 - clamp((frame - p.at) / 4)) ** 2;
  return (
    <Shot frame={frame}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${punch})` }}>
        <PaintView {...paintAt(frame)} view={p.view} />
      </div>
      <PanelFrame />
    </Shot>
  );
};

/** The comic panel: an ivory gutter with an ink rule, drawn over the picture's edge. */
const PanelFrame = () => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
    <path d="M0 0H1920V1080H0Z M44 44V1036H1876V44Z" fill="#F4ECD8" fillRule="evenodd" />
    <rect x={44} y={44} width={1832} height={992} fill="none" stroke="#0A0908" strokeWidth={14} />
  </svg>
);

// ---- S45 the first look up: only the sky shakes, hard ------------------------------------------------------------------------
const LOW_VIEW: View = { cx: 0, cy: 1.0, h: 4.8 };
const SKY_VIEW = (f: number): View => ({ ...LOW_VIEW, h: LOW_VIEW.h - 0.4 * clamp((f - SHOT_FROM.S45) / 38) });

const skyShakeAt = (f: number): [number, number] => {
  const a = shake(f, T.lookUp, 0.6, 61, 24);
  const b = shake(f, T.shakePeak, 0.5, 62, 20);
  return [a.x + b.x, a.y + b.y];
};

/** The helm seen from below: collar in front, the lit slit foreshortened, horns and crown behind (stand-in for G13). */
const HelmFromBelow = () => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
    <g transform={`translate(${HELM[0]} ${HELM[1] + 30}) scale(0.55)`} fill="#0A0908">
      <path d="M-210 -150 Q-300 -330 -170 -330 Q-250 -230 -150 -170Z" />
      <path d="M210 -150 Q300 -330 170 -330 Q250 -230 150 -170Z" />
      <path d="M-120 -150 L-110 -260 L-70 -170 L-40 -290 L0 -180 L40 -290 L70 -170 L110 -260 L120 -150Z" />
      <path d="M-150 -170 Q0 -250 150 -170 L135 60 Q0 130 -135 60Z" />
      <path d="M-260 90 L-190 30 L-150 110 L-70 40 L0 130 L70 40 L150 110 L190 30 L260 90 L200 190 Q0 250 -200 190Z" />
      <path d="M-110 -40 Q0 -80 110 -40 L96 -4 Q0 -34 -96 -4Z" fill="#9B5CE0" />
      <path d="M-70 -48 Q0 -66 70 -48 L62 -30 Q0 -44 -62 -30Z" fill="#C9A2F4" />
    </g>
  </svg>
);

const Flakes = ({ f }: { f: number }) => {
  const parts = [T.flakes1, T.flakes2].flatMap((start, k) => {
    const t = f - start;
    if (t < 0 || t > 40) return [];
    const r = seeded(`p2flakes:${k}`);
    return Array.from({ length: 26 }, (_, i) => {
      const x = r.range(80, 1840);
      const size = r.range(14, 34);
      const vy = r.range(9, 17);
      const rot = r.range(0, 360) + t * r.range(-14, 14);
      const gold = r() < 0.5;
      return (
        <path
          key={`${k}-${i}`}
          d={`M0 0L${size} ${size * 0.2}L${size * 0.7} ${size}L${-size * 0.2} ${size * 0.6}Z`}
          transform={`translate(${x + Math.sin(t * 0.3 + i) * 18} ${-60 + t * vy + r.range(0, 90)}) rotate(${rot})`}
          fill={gold ? '#E2B33C' : '#F4ECD8'}
          stroke="#0A0908"
          strokeWidth={4}
        />
      );
    });
  });
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
      {parts}
    </svg>
  );
};

export const S45 = ({ frame }: { frame: number }) => {
  const up = frame >= T.lookUp;
  const sky = frame >= T.lookUp ? skyShakeAt(frame) : ([0, 0] as const);
  return (
    <Shot frame={frame}>
      <PaintView {...paintAt(frame, { skyShake: sky, skyViolet: up && frame < T.lookUp + 10, headUp: up, under: up ? <HelmFromBelow /> : undefined })} view={SKY_VIEW(frame)} hudFixed />
      <Flakes f={frame} />
      <PanelFrame />
    </Shot>
  );
};
