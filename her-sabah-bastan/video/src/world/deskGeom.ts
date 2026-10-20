// Placement of the desk prop (stil/hareket/MASA-dekor.png) against the desk strips, shared by the renderer
// (world/Desk.tsx) and the morph generator (scripts/tween-pairs.mjs: a morph between a desk drawing and a drawing
// without the desk shows the prop inside the morph, so the furniture does not melt).
//
// Fitted to H17 (getting up, test90-v4), measured on the floor contacts as distance from the desk's right leg over
// the desk height: the prop's chair back leg 1.289 vs H17 f4 1.283 (no shift); the prop's desk is 0.616 wide
// between the outer leg edges against H17's 0.562 (x scale 0.912 about the right leg).
/** Source column between the chair's front leg and the desk's left leg. */
export const DESK_SPLIT = 236;
export const CHAIR_SHIFT = 0;
export const DESK_SX = 0.912;
