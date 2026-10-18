import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { palette } from '../style/palette.ts';
import { stripUrl } from '../style/assets.ts';
import { frameScale, microMotion, resolveActor, STRIP_TABLE, type Action, type Pose } from './actor.ts';
import type { StripFrame, StripMeta } from './stripData.ts';
import { TWEENS, type TweenMeta } from './tweenData.ts';

interface Props {
  frame: number;
  acts: readonly Action[];
  /** Per-character phase of the breathing and weight shift. */
  phase: number;
  /** Paint over the AI's cursor slit: 0 = open, 1 = shut. */
  blink?: number;
}

export const tweenUrl = (key: string, i: number): string => staticFile(`tweens/${key}-${i}.webp`);

/**
 * An <image> that holds the render until it is decoded. The morph images are too many to decode up front
 * (assets.ts does that for the strips), so each frame waits for the one it shows.
 */
const WaitImage = ({ href, x, y, width, height }: { href: string; x: number; y: number; width: number; height: number }) => {
  const [handle] = useState(() => delayRender(`morph ${href}`));
  useEffect(() => {
    const img = new Image();
    img.src = href;
    img
      .decode()
      .then(() => continueRender(handle))
      .catch((e: unknown) => cancelRender(e));
  }, [href, handle]);
  return <image href={href} x={x} y={y} width={width} height={height} preserveAspectRatio="none" />;
};

/** One drawing on its foot anchor, with breathing (scaleY about the feet) and weight shift. Always the home (non-inverted) art. */
const Frame = ({ pose, frame, phase, blink = 0 }: { pose: Pose; frame: number; phase: number; blink?: number }) => {
  const meta = STRIP_TABLE[pose.strip] as StripMeta;
  const f = meta.frames[pose.k] as StripFrame;
  const s = frameScale(meta, f);
  const { breath, shiftX } = microMotion(frame, phase);
  const w = f.w * s;
  const h = f.h * s;
  const x = pose.x + (pose.moving ? 0 : shiftX);
  return (
    <g transform={`translate(${x.toFixed(2)} ${pose.y}) scale(${pose.flip ? -1 : 1} ${breath.toFixed(5)})`}>
      <image href={stripUrl(meta, f)} x={-f.ax * s} y={-h} width={w} height={h} preserveAspectRatio="none" />
      {blink > 0 && f.slit && (
        <rect x={(f.slit.x - f.ax) * s - 1} y={-h + f.slit.y * s - 1} width={f.slit.w * s + 2} height={f.slit.h * s + 2} rx={3} fill={palette.cream} opacity={blink} />
      )}
    </g>
  );
};

/** A morph image: already scaled and mirrored, the canonical first drawing's anchor at (ax, h). */
const Morph = ({ meta, href, x, y, frame, phase }: { meta: TweenMeta; href: string; x: number; y: number; frame: number; phase: number }) => {
  const { breath, shiftX } = microMotion(frame, phase);
  return (
    <g transform={`translate(${(x + shiftX).toFixed(2)} ${y}) scale(1 ${breath.toFixed(5)})`}>
      <WaitImage href={href} x={-meta.ax} y={-meta.h} width={meta.w} height={meta.h} />
    </g>
  );
};

/**
 * A character playing its timeline: each drawing held, every change of drawing a short silhouette morph
 * (characters/actor.ts), breathing and weight shift on top. Pure function of the frame.
 */
export const Actor = ({ frame, acts, phase, blink = 0 }: Props) => {
  const st = resolveActor(acts, frame);
  if (!st) return null;
  if (st.tween) {
    const meta = TWEENS[st.tween.key] as TweenMeta;
    return <Morph meta={meta} href={tweenUrl(st.tween.key, st.tween.i)} x={st.tween.x} y={st.tween.y} frame={frame} phase={phase} />;
  }
  return <Frame pose={st.cur} frame={frame} phase={phase} blink={blink} />;
};
