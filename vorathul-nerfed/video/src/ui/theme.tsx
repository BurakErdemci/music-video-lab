import React, { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

// Office palette (docs/scene-map.md): cool greys, white, ONE UI blue; magenta only for deleted things.
export const C = {
  bg: '#E9ECEF',
  mid: '#CED4DA',
  dark: '#ADB5BD',
  slate: '#868E96',
  ink: '#343A40',
  white: '#FFFFFF',
  blue: '#3B82F6',
  blueDark: '#2563EB',
  magenta: '#E0129A',
  black: '#000000',
  note: '#DCE4EE',
  ivory: '#F6ECCB',
  gold: '#E3B341',
} as const;

export const UI_FONT = "'UiInter', 'Inter', system-ui, sans-serif";
export const MONO_FONT = "'UiPlexMono', monospace";
/** Uniform office outline width in design units. */
export const LINE = 2;

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
/** 0..1 progress of `frame` through [start, start+dur]. */
export const prog = (frame: number, start: number, dur: number): number =>
  dur <= 0 ? (frame >= start ? 1 : 0) : clamp01((frame - start) / dur);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOut = (t: number): number => 1 - (1 - t) ** 3;
export const easeIn = (t: number): number => t * t * t;
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Deterministic hash noise in [-1, 1] from an integer and a seed (no randomness API). */
export const hashNoise = (n: number, seed: number): number => {
  let h = (Math.floor(n) * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
};
/** Smooth value noise: hashNoise sampled every `period` frames and cosine-interpolated. */
export const smoothNoise = (frame: number, seed: number, period = 3): number => {
  const x = frame / period;
  const i = Math.floor(x);
  const t = (1 - Math.cos((x - i) * Math.PI)) / 2;
  return lerp(hashNoise(i, seed), hashNoise(i + 1, seed), t);
};

export interface Keyframe { f: number; x: number; y: number }

/** Pure piecewise interpolation of a cursor path; eased per segment. */
export const pathAt = (frame: number, path: Keyframe[]): { x: number; y: number } => {
  const first = path[0];
  const last = path[path.length - 1];
  if (!first || !last) return { x: 0, y: 0 };
  if (frame <= first.f) return { x: first.x, y: first.y };
  if (frame >= last.f) return { x: last.x, y: last.y };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] as Keyframe;
    const b = path[i] as Keyframe;
    if (frame <= b.f) {
      const t = easeInOut(prog(frame, a.f, b.f - a.f));
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }
  }
  return { x: last.x, y: last.y };
};

const fontCss = (): string => `
@font-face { font-family: 'UiInter'; src: url('${staticFile('fonts/Inter-Variable.ttf')}') format('truetype'); font-weight: 100 900; font-style: normal; }
@font-face { font-family: 'UiPlexMono'; src: url('${staticFile('fonts/IBMPlexMono-Medium.ttf')}') format('truetype'); font-weight: 500; font-style: normal; }`;

/** Injects the kit fonts and holds the render until they are loaded. */
export const UiFonts: React.FC = () => {
  const [handle] = useState(() => delayRender('ui-fonts'));
  useEffect(() => {
    Promise.all([document.fonts.load("600 20px 'UiInter'"), document.fonts.load("500 20px 'UiPlexMono'")])
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle]);
  return <style>{fontCss()}</style>;
};

export interface BoxProps {
  /** Rendered width in px; the design is scaled uniformly (vector, so crisp at any size). */
  width: number;
  /** Absolute position inside the parent; omit to lay out in flow. */
  x?: number;
  y?: number;
  opacity?: number;
}

/** Scales a fixed design-space box to `width`. */
export const Scaled: React.FC<
  BoxProps & { designW: number; designH: number; transform?: string; origin?: string; children: React.ReactNode }
> = ({ width, x, y, opacity = 1, designW, designH, transform, origin, children }) => {
  const s = width / designW;
  return (
    <div
      style={{
        position: x === undefined && y === undefined ? 'relative' : 'absolute',
        left: x,
        top: y,
        width,
        height: designH * s,
        opacity,
        transform,
        transformOrigin: origin ?? 'center center',
      }}
    >
      <UiFonts />
      <div style={{ width: designW, height: designH, transform: `scale(${s})`, transformOrigin: '0 0', fontFamily: UI_FONT }}>
        {children}
      </div>
    </div>
  );
};
