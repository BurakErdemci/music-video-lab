// Shared contract of the LivingTest composition (living illustration). Every shot is a list of flat layers on parallel
// planes at their own depth, seen by one camera. The same list is drawn two ways with identical geometry:
// ThreeStage.tsx (one ThreeCanvas, a textured plane per layer, perspective camera) for normal frames, and
// compose2d.ts (2D canvas, the same projection) as a Painter for the print transitions, whose shader owns the only
// WebGL canvas while it runs.

/** Distance of the camera to the reference plane (d = 0) at which one world unit is one output pixel. */
export const D0 = 1000;

/** Camera: lateral position in world units (the point it looks at on every plane) and distance z to the d = 0 plane. */
export interface Cam {
  x: number;
  y: number;
  z: number;
}

/** A canvas source is repainted every frame (by both renderers) from `paint`, a pure function of the frame. */
export interface CanvasSource {
  kind: 'canvas';
  /** Stable id of the backing canvas (one canvas and one texture per key). */
  key: string;
  /** Canvas size in pixels. */
  cw: number;
  ch: number;
  paint: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void;
}
export interface ImageSource {
  kind: 'image';
  /** staticFile url, preloaded with useImagesReady before any renderer sees it. */
  url: string;
}
export type LayerSource = ImageSource | CanvasSource;

export interface Layer {
  /** Stable across frames (mesh identity in ThreeStage). */
  id: string;
  src: LayerSource;
  /** Depth: 0 = reference plane, positive = farther from the camera, negative = nearer. Must stay > -cam.z. */
  d: number;
  /** Rectangle on its own plane in world units (top-left corner, y down) that the whole source maps onto. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1, default 1. */
  opacity?: number;
  /** Degrees, clockwise on screen, about `pivot` (world units on the layer's plane). */
  rot?: number;
  pivot?: readonly [number, number];
}

/** Projection scale of a plane at depth d: k = D0 / (cam.z + d). Screen = (W/2, H/2) + (P - cam.xy) * k. */
export const planeScale = (cam: Cam, d: number): number => D0 / (cam.z + d);
