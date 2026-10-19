import type { CanvasSource } from './types.ts';

// One backing canvas per CanvasSource.key, shared by both renderers (compose2d draws it, ThreeStage uploads it).
const canvases = new Map<string, HTMLCanvasElement>();
// Frame each key was last painted for, so several layers / both renderers repaint a source once per frame.
const paintedAt = new Map<string, number>();

export const getSourceCanvas = (src: CanvasSource): HTMLCanvasElement => {
  let c = canvases.get(src.key);
  if (!c) {
    c = document.createElement('canvas');
    canvases.set(src.key, c);
  }
  if (c.width !== src.cw || c.height !== src.ch) {
    c.width = src.cw;
    c.height = src.ch;
    paintedAt.delete(src.key);
  }
  return c;
};

/** Clears and repaints the source for `frame` (once per frame per key). Returns the canvas and whether it was repainted. */
export const paintSource = (src: CanvasSource, frame: number): { canvas: HTMLCanvasElement; painted: boolean } => {
  const canvas = getSourceCanvas(src);
  if (paintedAt.get(src.key) === frame) return { canvas, painted: false };
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(`2d context unavailable for canvas source ${src.key}`);
  ctx.save();
  ctx.clearRect(0, 0, src.cw, src.ch);
  src.paint(ctx, src.cw, src.ch);
  ctx.restore();
  paintedAt.set(src.key, frame);
  return { canvas, painted: true };
};
