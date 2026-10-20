// Her drawing arm (a-finger sprite) as a two-bone rig: the torso holds, the upper arm turns about the shoulder and the
// forearm+hand about the elbow, so the fingertip can trace the heart while the body only leans a little. Pure math in
// sprite px; the skinning weights bend the drawing smoothly at the joints (no cut-out limbs, no stretching: both bones
// keep their rest length). Joint points were read off the a-finger drawing (683x871).

export type V = [number, number];

/** Rest joints (sprite px): shoulder on the torso edge, elbow in the bend of the arm, fingertip (leftmost point of the finger). */
export const SHOULDER: V = [215, 320];
export const ELBOW: V = [135, 355];
export const TIP: V = [8, 158];
const L1 = Math.hypot(ELBOW[0] - SHOULDER[0], ELBOW[1] - SHOULDER[1]);
const L2 = Math.hypot(TIP[0] - ELBOW[0], TIP[1] - ELBOW[1]);
const ANG_UP0 = Math.atan2(ELBOW[1] - SHOULDER[1], ELBOW[0] - SHOULDER[0]);
const ANG_FORE0 = Math.atan2(TIP[1] - ELBOW[1], TIP[0] - ELBOW[0]);
/** Which side of the shoulder-to-tip line the elbow sits on at rest (kept while solving). */
const SIDE = Math.sign((TIP[0] - SHOULDER[0]) * (ELBOW[1] - SHOULDER[1]) - (TIP[1] - SHOULDER[1]) * (ELBOW[0] - SHOULDER[0]));

export interface Rig {
  /** Body lean (sprite px), applied to the torso and the shoulder. */
  b: V;
  /** Turn of the upper arm about the shoulder, and of the forearm about the elbow (radians, from rest). */
  thU: number;
  thF: number;
  /** Elbow after the solve (sprite px, body lean included). */
  elbow: V;
  /** Where the fingertip lands (equals the target unless the target was out of reach). */
  tip: V;
  /** Reach shortfall in sprite px (0 = the target was reachable). */
  miss: number;
}

/** Solve the arm so the fingertip reaches `target` (sprite px, final position) with the shoulder at SHOULDER + b. */
export const solveArm = (target: V, b: V): Rig => {
  const sx = SHOULDER[0] + b[0];
  const sy = SHOULDER[1] + b[1];
  const dx = target[0] - sx;
  const dy = target[1] - sy;
  const dRaw = Math.hypot(dx, dy);
  const d = Math.min(Math.max(dRaw, Math.abs(L1 - L2) + 1e-3), L1 + L2 - 1e-3);
  const base = Math.atan2(dy, dx);
  // law of cosines: angle at the shoulder between the line to the target and the upper arm
  const a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const angUp = base + SIDE * a;
  const ex = sx + L1 * Math.cos(angUp);
  const ey = sy + L1 * Math.sin(angUp);
  const tx = sx + dx * (d / (dRaw || 1));
  const ty = sy + dy * (d / (dRaw || 1));
  const angFore = Math.atan2(ty - ey, tx - ex);
  return { b, thU: angUp - ANG_UP0, thF: angFore - ANG_FORE0, elbow: [ex, ey], tip: [tx, ty], miss: dRaw - d };
};

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Skinning weights of a rest point: [torso, upper arm, forearm+hand]. */
export const weights = (x: number, y: number): [number, number, number] => {
  // edge of the arm region: the forearm side of the gap above the shoulder, then the torso's front edge
  const xe = y <= 235 ? 150 : y >= 300 ? 187 : 150 + (37 * (y - 235)) / 65;
  // the torso's navy front edge (x 192-203 below the armpit) must stay whole: the arm weight ends left of it and below the elbow
  const wArm = (1 - smoothstep(xe - 5, xe + 5, x)) * (1 - smoothstep(395, 412, y));
  const ux = (TIP[0] - ELBOW[0]) / L2;
  const uy = (TIP[1] - ELBOW[1]) / L2;
  const t = (x - ELBOW[0]) * ux + (y - ELBOW[1]) * uy;
  const wF = smoothstep(-15, 35, t);
  return [1 - wArm, wArm * (1 - wF), wArm * wF];
};

const rot = (px: number, py: number, cx: number, cy: number, th: number): V => {
  const c = Math.cos(th);
  const s = Math.sin(th);
  return [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c];
};

/** Rest point -> posed point (sprite px). */
export const skin = (x: number, y: number, rig: Rig): V => {
  const [wT, wU, wF] = weights(x, y);
  const sx = SHOULDER[0] + rig.b[0];
  const sy = SHOULDER[1] + rig.b[1];
  const pT: V = [x + rig.b[0], y + rig.b[1]];
  const pU = rot(x + rig.b[0], y + rig.b[1], sx, sy, rig.thU);
  // forearm: turn about the elbow's rest point, then carry it to the posed elbow
  const fx = rig.elbow[0] + (x - ELBOW[0]) * Math.cos(rig.thF) - (y - ELBOW[1]) * Math.sin(rig.thF);
  const fy = rig.elbow[1] + (x - ELBOW[0]) * Math.sin(rig.thF) + (y - ELBOW[1]) * Math.cos(rig.thF);
  return [wT * pT[0] + wU * pU[0] + wF * fx, wT * pT[1] + wU * pU[1] + wF * fy];
};
