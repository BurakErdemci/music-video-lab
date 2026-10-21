// Shared geometry for the girls' layer ("The girls are never wallpaper", scene-map.md): where a dancing card
// is on screen, its deformed silhouette as an SVG path (for depth splits and masks: the type can pass in
// front of or behind a girl although the canvas sits under the SVG layer), and screen-to-world for placing a
// card on a letter.
import { type CameraPose, project, unproject } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';
import { OUTLINES } from '../cards/outlines.ts';
import { deformPoints, restPoint, type Stand, toWorld } from '../rig/cardRig.ts';
import type { P } from '../rig/rig.ts';
import { FLOOR_Y } from '../stage/SetPlate.tsx';

export const standOf = (at: Placement, dx = 0, dy = 0): Stand => ({ x: at.x + dx, feet: (at.feet ?? FLOOR_Y) + dy, z: at.z ?? 0, height: at.height, flip: at.flip });

/** Screen position of a card-unit point of a dancing card at t. */
export const screenOf = (card: string, at: Placement, pose: CameraPose, t: number, p: P, dance = 0): [number, number] => {
  const [q] = deformPoints(card, [p], t, dance);
  const s = project(pose, toWorld(standOf(at), q as P));
  return [s.x, s.y];
};

/** The card's rig-deformed silhouette, projected: one closed SVG path. */
export const silhouetteD = (card: string, at: Placement, pose: CameraPose, t: number, dance = 0, dx = 0, dy = 0): string => {
  const o = OUTLINES[card];
  if (!o) throw new Error(`no outline for card ${card}`);
  const st = standOf(at, dx, dy);
  return o.polylines
    .map((pl) => {
      const pts = deformPoints(card, Array.from({ length: pl.length / 2 }, (_, i) => [pl[i * 2] as number, pl[i * 2 + 1] as number] as P), t, dance);
      return pts
        .map((q, i) => {
          const s = project(pose, toWorld(st, q));
          return `${i ? 'L' : 'M'}${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
        })
        .join(' ') + ' Z';
    })
    .join(' ');
};

/** Rest keypoint of a card in card units (hips, head, ...). */
export const keypoint = (card: string, name: 'hips' | 'head' | 'chest' | 'neck'): P => restPoint(card, name);

/** Screen pixel to the world point on the plane z = zp (camera/camera.ts). */
export { unproject };

/** Place a card so its card-unit point `p` sits on the world point w (e.g. her hips on a letter's top). */
export const placeAt = (card: string, height: number, p: P, w: [number, number], z = 0, flip = false): Placement => ({
  x: w[0] - (flip ? -p[0] : p[0]) * height,
  feet: w[1] - (p[1] + 0.5) * height,
  z,
  height,
  flip,
});
