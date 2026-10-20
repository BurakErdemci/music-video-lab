// Pure helpers shared by the p4 shots: camera projection, easing, the painting-world and office-world geometry.
import { basis, clamp01, lerp, sub } from '../../camera/math.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { DEFAULT_FOV, fitDistance, type CameraPose } from '../../stage/Stage.tsx';

export const W = 1920;
export const H = 1080;

export type Box = [number, number, number, number];

/** Screen position (frame px) of a world point seen through `pose`; null when behind the camera. */
export const project = (pose: CameraPose, p: Vec3): [number, number] | null => {
  const { fwd, right, up } = basis(pose.position, pose.target);
  const d = sub(p, pose.position);
  const z = d[0] * fwd[0] + d[1] * fwd[1] + d[2] * fwd[2];
  if (z <= 0.01) return null;
  const x = d[0] * right[0] + d[1] * right[1] + d[2] * right[2];
  const y = d[0] * up[0] + d[1] * up[1] + d[2] * up[2];
  const f = H / 2 / Math.tan(((pose.fov ?? DEFAULT_FOV) * Math.PI) / 360);
  return [W / 2 + (x / z) * f, H / 2 - (y / z) * f];
};

/** Screen box [x, y, w, h] of an axis-aligned world rectangle (centre cx, cy at depth z) for a camera that looks down -Z. */
export const rectBox = (pose: CameraPose, z: number, cx: number, cy: number, w: number, h: number): Box => {
  const a = project(pose, [cx - w / 2, cy + h / 2, z]) as [number, number];
  const b = project(pose, [cx + w / 2, cy - h / 2, z]) as [number, number];
  return [a[0], a[1], b[0] - a[0], b[1] - a[1]];
};

export const prog = (frame: number, start: number, frames: number): number => clamp01((frame - start) / Math.max(1, frames));
export const easeOut = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const mix = lerp;
export { clamp01, fitDistance };

/** Frames on twos (15 fps), for every 2D overlay. */
export const twos = (frame: number): number => frame - (frame % 2);

// ---- painting world (inside) ----
/**
 * The canvas: the plane Vorathul presses on. A camera `CANVAS_CAM` looking straight at it sees the plane exactly fill the
 * frame, so crack coordinates in canvas UV are screen fractions in the canonical inside shot. Other inside cameras just
 * project the same rectangle.
 */
export const CANVAS = { z: -9, cx: 0, cy: 4.2, w: 17.78, h: 10 } as const;
/** Where the palm meets the canvas, in canvas UV (u right, v down): the origin of the crack. */
export const PALM_UV: [number, number] = [0.49, 0.54];
export const CANVAS_CAM: CameraPose = {
  position: [CANVAS.cx, CANVAS.cy, CANVAS.z + fitDistance(CANVAS.h)],
  target: [CANVAS.cx, CANVAS.cy, CANVAS.z],
  fov: DEFAULT_FOV,
};
export const canvasBox = (pose: CameraPose): Box => rectBox(pose, CANVAS.z, CANVAS.cx, CANVAS.cy, CANVAS.w, CANVAS.h);

// ---- office world ----
// The wall plate (plates/07-ofis-tablo.jpg, 3:2) stands in for G27 + the desks: its width is the 27.2 units the OFF-WIDE
// framing (distance 21) sees, and its picture frame is treated as the painting card.
export const OFFICE_Z = -20;
export const PLATE_W = 27.2;
export const PLATE_H = PLATE_W / 1.5;
export const PLATE_PX = 1536 / PLATE_W;
export const PLATE_CY = -2.9;
/** Plate pixel (u, v) -> office world (x, y). */
export const plateToWorld = (u: number, v: number): [number, number] => [(u - 768) / PLATE_PX, PLATE_CY + (512 - v) / PLATE_PX];
/** The painting inside the plate's black frame, in plate px: x 338-1195, y 58-642. */
export const PAINTING_PLATE: Box = [338, 58, 857, 584];
export const paintingWorld = (): { cx: number; cy: number; w: number; h: number } => {
  const [x0, y0] = plateToWorld(PAINTING_PLATE[0], PAINTING_PLATE[1]);
  const [x1, y1] = plateToWorld(PAINTING_PLATE[0] + PAINTING_PLATE[2], PAINTING_PLATE[1] + PAINTING_PLATE[3]);
  // The painting is hung 16:9 so the live window onto the painting world maps the canvas one to one (crack UV stays valid).
  const w = x1 - x0;
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w, h: (w * 9) / 16 };
};
/** Office camera looking straight at the wall from `distance`, centred on (x, y). */
export const officeCam = (distance: number, x: number, y: number): CameraPose => ({
  position: [x, y, OFFICE_Z + distance], target: [x, y, OFFICE_Z], fov: DEFAULT_FOV,
});
export const paintingBox = (pose: CameraPose): Box => {
  const p = paintingWorld();
  return rectBox(pose, OFFICE_Z, p.cx, p.cy, p.w, p.h);
};

// ---- the empty cathedral (inside.tsx) ----
/** The dais card is 15 wide (1500 x 579 px); his seat is its top step, 0.3 below the card's top edge. */
export const DAIS_W = 15;
export const DAIS_H = (DAIS_W * 579) / 1500;
export const SEAT_Y = DAIS_H - 0.3;
