import { useLayoutEffect, useRef } from 'react';
import { createRig, drawRig, type GLRig, type UniformValue } from './gl.ts';
import type { Painter } from './layers.ts';
import { W, H } from '../layout.ts';

export interface GLTransitionProps {
  /** Full fragment shader source (FRAG_HEAD + body). */
  frag: string;
  /** 0 = only `from`, 1 = only `to`. Linear in time; each shader shapes its own easing. */
  progress: number;
  /** Seconds, for the living parts of a shader (ripples keep moving); pass the frame / fps. */
  time: number;
  from: Painter;
  to: Painter;
  /** Optional third layer (sampler uAux), e.g. a variant of `to` the shader blends in on its own schedule. */
  aux?: Painter;
  uniforms?: Record<string, UniformValue>;
  width?: number;
  height?: number;
}

const offscreen = (w: number, h: number): CanvasRenderingContext2D => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
};

/**
 * Paints both layers into offscreen canvases and blends them with a fragment shader, synchronously in the layout
 * effect: the frame is complete when React commits, so Remotion's screenshot never sees a half-drawn canvas.
 */
export const GLTransition = ({ frag, progress, time, from, to, aux, uniforms = {}, width = W, height = H }: GLTransitionProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const rig = useRef<{ rig: GLRig; frag: string; a: CanvasRenderingContext2D; b: CanvasRenderingContext2D; c: CanvasRenderingContext2D | null } | null>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!rig.current || rig.current.frag !== frag) {
      rig.current = { rig: createRig(canvas, frag), frag, a: offscreen(width, height), b: offscreen(width, height), c: null };
    }
    const { a, b } = rig.current;
    a.clearRect(0, 0, width, height);
    b.clearRect(0, 0, width, height);
    // At the ends only one layer is visible; skip painting the other (it would still be uploaded, but empty).
    if (progress < 1) from(a, width, height);
    if (progress > 0) to(b, width, height);
    const sources: TexImageSource[] = [a.canvas, b.canvas];
    if (aux) {
      rig.current.c ??= offscreen(width, height);
      rig.current.c.clearRect(0, 0, width, height);
      if (progress > 0) aux(rig.current.c, width, height);
      sources.push(rig.current.c.canvas);
    }
    drawRig(rig.current.rig, sources, { uP: progress, uT: time, ...uniforms });
  });

  return <canvas ref={ref} width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, width, height }} />;
};
