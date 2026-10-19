import { createElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';
import { palette } from '../style/palette.ts';
import { seeded, range } from '../style/seeded.ts';

/**
 * A raster layer for the shader transitions: paints one frame of a scene into a 2D canvas of w x h. Shaders can only
 * sample pixels, so a scene that goes through a shader transition is expressed as a painter (plate + drift + notes).
 */
export type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<void>>();

const loadImage = (url: string): Promise<void> => {
  let p = pending.get(url);
  if (!p) {
    p = (async () => {
      const img = new Image();
      img.src = url;
      await img.decode();
      cache.set(url, img);
    })();
    pending.set(url, p);
  }
  return p;
};

/**
 * True once every image is decoded. Until then it holds the render (delayRender) and the caller draws nothing; the
 * hold is released in a layout effect after the first ready commit, i.e. after the children have drawn their canvases.
 */
export const useImagesReady = (urls: readonly string[]): boolean => {
  const [ready, setReady] = useState(() => urls.every((u) => cache.has(u)));
  const [handle] = useState(() => (ready ? null : delayRender(`transition plates (${urls.length})`)));
  useEffect(() => {
    if (ready) return;
    Promise.all(urls.map(loadImage))
      .then(() => setReady(true))
      .catch((e: unknown) => cancelRender(e));
  }, [ready, urls]);
  useLayoutEffect(() => {
    if (ready && handle !== null) continueRender(handle);
  }, [ready, handle]);
  return ready;
};

export const getImage = (url: string): HTMLImageElement => {
  const img = cache.get(url);
  if (!img) throw new Error(`image not preloaded: ${url}`);
  return img;
};

export interface Cam {
  /** Zoom (1 = the plate covers the frame exactly). */
  s: number;
  /** Pan in output pixels. */
  x: number;
  y: number;
}

/** Draws an image to cover the w x h frame (centre crop), zoomed and panned by the camera. */
export const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, cam: Cam = { s: 1, x: 0, y: 0 }): void => {
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight) * cam.s;
  const dw = img.naturalWidth * k;
  const dh = img.naturalHeight * k;
  ctx.drawImage(img, (w - dw) / 2 + cam.x, (h - dh) / 2 + cam.y, dw, dh);
};

/** Where a frame point lands under the camera (zoom about the frame centre, then pan). */
export const camPoint = (cam: Cam, w: number, h: number, x: number, y: number): { x: number; y: number } => ({
  x: w / 2 + (x - w / 2) * cam.s + cam.x,
  y: h / 2 + (y - h / 2) * cam.s + cam.y,
});

/** Slow camera life for a still plate: a gentle push and a sway, eased so it never starts or stops abruptly. */
export const driftCam = (t: number, { push = 0.012, sway = 9, base = 1.03 }: { push?: number; sway?: number; base?: number } = {}): Cam => ({
  s: base + push * t,
  x: sway * Math.sin(t * 0.55),
  y: sway * 0.45 * Math.sin(t * 0.41 + 1.3),
});

export interface FloatNote {
  x: number;
  y: number;
  size: number;
  rot: number;
  spin: number;
  vx: number;
  vy: number;
  sway: number;
  phase: number;
  kind: 'sticky' | 'paper';
}

/** A seeded set of loose notes drifting through a scene (frame-pure: positions are a function of time). */
export const makeNotes = (seed: string, n: number, area: { x0: number; x1: number; y0: number; y1: number }, opts: { vy?: number; vx?: number; size?: [number, number] } = {}): FloatNote[] => {
  const r = seeded(`notes:${seed}`);
  const [s0, s1] = opts.size ?? [38, 64];
  return Array.from({ length: n }, () => ({
    x: range(r, area.x0, area.x1),
    y: range(r, area.y0, area.y1),
    size: range(r, s0, s1),
    rot: range(r, -20, 20),
    spin: range(r, -14, 14),
    vx: (opts.vx ?? 10) * range(r, 0.6, 1.4),
    vy: (opts.vy ?? -14) * range(r, 0.6, 1.4),
    sway: range(r, 10, 26),
    phase: range(r, 0, Math.PI * 2),
    kind: r() < 0.6 ? 'sticky' : 'paper',
  }));
};

export const notePose = (n: FloatNote, t: number): { x: number; y: number; rot: number } => ({
  x: n.x + n.vx * t + n.sway * Math.sin(t * 1.1 + n.phase),
  y: n.y + n.vy * t + n.sway * 0.4 * Math.sin(t * 0.8 + n.phase * 1.7),
  rot: n.rot + n.spin * t + 6 * Math.sin(t * 1.3 + n.phase),
});

/** Paints drifting notes in the print palette: yellow stickies with a navy edge, cream papers with navy lines. */
export const paintNotes = (ctx: CanvasRenderingContext2D, notes: readonly FloatNote[], t: number, w: number, h: number, cam: Cam = { s: 1, x: 0, y: 0 }): void => {
  for (const n of notes) {
    const p = notePose(n, t);
    const c = camPoint(cam, w, h, p.x, p.y);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    const s = n.size * cam.s;
    ctx.fillStyle = palette.navy;
    ctx.fillRect(-s / 2 - 2.5, -s / 2 - 2.5, s + 5, s + 5);
    ctx.fillStyle = n.kind === 'sticky' ? palette.moonYellow : palette.cream;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = palette.navy;
    if (n.kind === 'paper') {
      for (let i = 0; i < 3; i++) ctx.fillRect(-s / 2 + s * 0.14, -s / 2 + s * (0.28 + i * 0.2), s * (0.72 - (i % 2) * 0.2), Math.max(1.5, s * 0.04));
    } else {
      ctx.globalAlpha = 0.85;
      ctx.fillRect(-s / 2, -s / 2, s, s * 0.16);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
};

/**
 * A painter as a DOM layer: a full-frame canvas repainted on every render. Used inside CSS 3D transforms (PaperFold):
 * there a big <img> was sometimes not rasterised when Remotion took the screenshot (v1/v2 G5: empty panels on single
 * frames); a canvas is uploaded as a texture as it is.
 */
export const PainterLayer = ({ paint, width, height }: { paint: Painter; width: number; height: number }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    paint(ctx, width, height);
    ctx.restore();
  });
  return createElement('canvas', { ref, width, height, style: { position: 'absolute', left: 0, top: 0, width, height } });
};
