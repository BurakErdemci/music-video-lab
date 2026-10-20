#!/usr/bin/env node
// Writes video/src/rig/vorathul.rig.json from the geometry table below (units: H = figure height, 1 H = 1380 px).
// The JSON is the source of truth for the engine; this script exists so the numbers are authored in H, not pixels.
// Placeholder sizes follow docs/rig.md section 1.3. Real textures replace the PNGs by path; only `w`/`h`/`pivot`
// of a texture entry change when the real art has another pixel size.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const UNIT = 1380;
const px = (h) => Math.round(h * UNIT);
const P = (x, y) => [px(x), px(y)];
const rad = (d) => (d * Math.PI) / 180;

const textures = {};
// shape: drawing hint for the placeholder generator only (tools/rig/gen_placeholders.py)
const tex = (slot, w, h, pivot, shape = { t: 'rrect' }) => {
  textures[slot] = { src: `rig/placeholder/${slot}.png`, w: px(w), h: px(h), pivot: P(...pivot), shape };
};

// ---- pipe table (section 2.1) ----
const PIPE_W = 0.032;
const pipeTable = [
  [-38, 76, 0.14, 's', 0.9], [-27, 78, 0.17, 's', 1.1], [-16, 80, 0.2, 'm', 0.89], [-5, 82, 0.23, 'm', 1.02],
  [6, 84, 0.26, 'm', 1.16], [17, 86, 0.29, 'l', 0.97], [28, 88, 0.32, 'l', 1.07], [39, 90, 0.34, 'l', 1.13],
].map(([open, fold, len, tx, ls], i) => ({ i, open, fold, len, tex: tx, lengthScale: ls }));
const BODY_LEN = { s: 0.155, m: 0.225, l: 0.3 };

// ---- textures ----
// Geometry anchors (H). Every rotating joint keeps its pivot and its child sockets at least r inside the image, so the
// joint disks of section 1.4 fit in both parts.
const PELVIS_Y = 0.52; // world height of the belt buckle in the neutral pose
const PELVIS_H = 0.16, PELVIS_PIVOT_Y = 0.08;
const LEG_SOCKET_Y = 0.12; // from the pelvis top edge
const LEG_H = PELVIS_Y - (LEG_SOCKET_Y - PELVIS_PIVOT_Y) + 0.05; // thigh cap top (world) + the cap above the pivot
tex('pelvis', 0.24, PELVIS_H, [0.12, PELVIS_PIVOT_Y]);
tex('leg', 0.1, LEG_H, [0.05, 0.05], { t: 'capsule' });
tex('legs_seated', 0.3, 0.2, [0.15, 0.04]);
tex('torso_base', 0.34, 0.32, [0.17, 0.28]);
tex('chest_studs', 0.34, 0.32, [0.17, 0.28], { t: 'studs' });
tex('collar', 0.24, 0.1, [0.12, 0.1], { t: 'collar' });
tex('pauldron', 0.16, 0.12, [0.08, 0.06], { t: 'disk' });
tex('upper_arm', 0.07, 0.19, [0.035, 0.035], { t: 'capsule' });
tex('forearm', 0.07, 0.18, [0.035, 0.035], { t: 'capsule' });
for (const [n, frac] of [['open', 0.9], ['grip', 0.85], ['fist', 0.9], ['palm', 1], ['spread', 1], ['clutch', 0.95]]) {
  tex(`hand_${n}`, 0.09, 0.145, [0.045, 0.045], { t: 'capsule', frac });
}
// The sword blade length below the grip makes the tip touch the floor in `base` (rigcheck measurement N).
const SHOULDER_Y = PELVIS_Y + (PELVIS_H - PELVIS_PIVOT_Y) - 0.04 + 0.23; // pelvis top - torso socket depth + waist-to-shoulder
const UA = 0.12, FA = 0.11, HAND_GRIP = 0.075;
const dirOf = (phi) => [-Math.sin(rad(phi)), -Math.cos(rad(phi))];
const [, uy] = dirOf(-25); const [, fy] = dirOf(-25 - 70); const [, hy] = dirOf(-25 - 70 + 0);
const BLADE_BELOW = Math.round((SHOULDER_Y + UA * uy + FA * fy + HAND_GRIP * hy) * 10000) / 10000;
const SWORD_TOP = 0.08;
tex('sword_base', 0.2, SWORD_TOP + BLADE_BELOW, [0.1, SWORD_TOP], { t: 'sword' });
tex('sword_runes', 0.2, SWORD_TOP + BLADE_BELOW, [0.1, SWORD_TOP], { t: 'swordrunes' });
tex('cape_upper', 0.3, 0.34, [0.15, 0.02]);
tex('cape_lower', 0.4, 0.42, [0.2, 0.04]);
tex('cape_lower_seated', 0.52, 0.2, [0.26, 0.04]);
tex('hem_a', 0.07, 0.12, [0.035, 0.018], { t: 'hem', v: 0 });
tex('hem_b', 0.07, 0.12, [0.035, 0.018], { t: 'hem', v: 1 });
tex('hem_c', 0.07, 0.12, [0.035, 0.018], { t: 'hem', v: 2 });
tex('wing_root', 0.12, 0.12, [0.06, 0.06], { t: 'disk' });
for (const k of ['s', 'm', 'l']) {
  tex(`body_${k}`, BODY_LEN[k], PIPE_W, [0, PIPE_W / 2]);
  tex(`mouth_${k}`, PIPE_W * 1.2, 0.034, [PIPE_W * 0.6, 0.017], { t: 'disk' });
  tex(`glow_${k}`, 0.028, 0.02, [0.014, 0.01], { t: 'disk' });
}
tex('cork', 0.03, 0.026, [0.015, 0.013], { t: 'disk' });
tex('helm_closed', 0.3, 0.22, [0.15, 0.18], { t: 'helm' });
tex('half_R', 0.15, 0.22, [0, 0.22], { t: 'helmhalf', side: 'R' });
tex('half_L', 0.15, 0.22, [0.15, 0.22], { t: 'helmhalf', side: 'L' });
tex('slit_lit', 0.1, 0.02, [0.05, 0.01]);
tex('slit_sad', 0.1, 0.03, [0.05, 0.015], { t: 'slitsad' });
tex('crown_full', 0.12, 0.08, [0.06, 0.065], { t: 'crown', spikes: 5 });
tex('crown_small', 0.08, 0.05, [0.04, 0.04], { t: 'crown', spikes: 3 });
tex('gems_full', 0.12, 0.08, [0.06, 0.065], { t: 'gems', n: 3 });
tex('gems_small', 0.08, 0.05, [0.04, 0.04], { t: 'gems', n: 2 });
tex('crown_half_R', 0.06, 0.08, [0.06, 0.065], { t: 'crownhalf', side: 'R' });
tex('crown_half_L', 0.06, 0.08, [0, 0.065], { t: 'crownhalf', side: 'L' });
tex('void_head', 0.2, 0.2, [0.1, 0.18], { t: 'disk' });
const EYE_POS = [[0.07, 0.06], [0.13, 0.06], [0.045, 0.1], [0.1, 0.1], [0.155, 0.1], [0.07, 0.14], [0.13, 0.14]];
for (let i = 1; i <= 7; i++) tex(`eye_${i}`, 0.025, 0.012, [0.0125, 0.006], { t: 'disk' });

// ---- parts ----
// socket = the child's pivot position inside the PARENT image (px). z = renderOrder; dz = depth offset (H) of the card plane.
// sided: expanded into _R/_L; mirror: the L subtree sits in a scale.x = -1 group; baseSide: the side the art is drawn for.
const parts = [];
const part = (o) => parts.push(o);
const shoulder = P(0.04, 0.05);
part({ id: 'pelvis', parent: 'root', driver: 'pelvis', texture: 'pelvis', socket: [0, 0], offsetH: [0, PELVIS_Y], z: 62, limits: { rot: [-10, 10], ty: [-0.3, 0.06] }, sign: 1, jointRadius: px(0.05) });
part({ id: 'leg', parent: 'pelvis', sided: true, mirror: true, driver: 'leg', texture: 'leg', socket: P(0.065, LEG_SOCKET_Y), z: 60, limits: { rot: [-8, 25] }, sign: -1, jointRadius: px(0.05) });
part({ id: 'legs_seated', parent: 'pelvis', driver: 'legs_seated', texture: 'legs_seated', socket: P(0.12, 0.08), z: 61, limits: { rot: [-5, 5] }, sign: 1, jointRadius: px(0.05) });
part({ id: 'torso', parent: 'pelvis', driver: 'torso', texture: 'torso_base', socket: P(0.12, 0.04), z: 70, limits: { rot: [-15, 15] }, sign: 1, jointRadius: px(0.06) });
part({ id: 'chest_studs', parent: 'torso', driver: 'studs', texture: 'chest_studs', socket: P(0.17, 0.28), z: 71, limits: { opacity: [0, 1] } });
part({ id: 'collar', parent: 'torso', driver: 'fixed', texture: 'collar', socket: P(0.17, 0.04), z: 82 });
part({ id: 'cape_upper', parent: 'torso', driver: 'fixed', texture: 'cape_upper', socket: P(0.17, 0.07), z: 5, dz: -0.06 });
part({ id: 'cape_lower', parent: 'cape_upper', driver: 'cape_lower', texture: 'cape_lower', variants: ['cape_lower', 'cape_lower_seated'], socket: P(0.15, 0.3), z: 6, dz: -0.06, limits: { rot: [-8, 8] }, sign: 1, jointRadius: px(0.06) });
for (let k = 0; k < 6; k++) {
  part({ id: `hem_${k + 1}`, parent: 'cape_lower', driver: 'hem', hemIndex: k, texture: ['hem_a', 'hem_b', 'hem_c', 'hem_c', 'hem_b', 'hem_a'][k], flipX: k >= 3,
    socket: P(0.05 + k * 0.06, 0.4), z: 7, dz: -0.06, limits: { rot: [-7, 7] }, sign: 1, jointRadius: px(0.03) });
}
part({ id: 'wing_root', parent: 'torso', sided: true, mirror: true, baseSide: 'L', driver: 'wing_root', texture: 'wing_root', socket: P(0.27, 0.12), z: 52, dz: -0.04, limits: { rot: [-25, 15] }, sign: 1, jointRadius: px(0.06) });
part({ id: 'head', parent: 'torso', driver: 'head', texture: 'helm_closed', socket: P(0.17, 0.05), z: 78, limits: { rot: [-20, 20], sink: [-0.01, 0.03] }, sign: 1, jointRadius: px(0.06) });
part({ id: 'eye_slit', parent: 'head', driver: 'slit', texture: 'slit_lit', variants: ['slit_lit', 'slit_sad'], socket: P(0.15, 0.12), z: 79, limits: { opacity: [0, 1] } });
part({ id: 'crown', parent: 'head', driver: 'crown', texture: 'crown_full', variants: ['crown_full', 'crown_small'], socket: P(0.15, 0.07), z: 80, limits: { rot: [-8, 8] }, sign: 1, jointRadius: px(0.03) });
part({ id: 'crown_gems', parent: 'head', driver: 'gems', texture: 'gems_full', variants: ['gems_full', 'gems_small'], socket: P(0.15, 0.07), z: 81, limits: { opacity: [0, 1] } });
part({ id: 'void_head', parent: 'head', driver: 'void', texture: 'void_head', socket: P(0.15, 0.18), z: 76 });
for (let i = 1; i <= 7; i++) part({ id: `eye_${i}`, parent: 'void_head', driver: 'eye', eyeIndex: i - 1, texture: `eye_${i}`, socket: P(...EYE_POS[i - 1]), z: 77, limits: { opacity: [0, 1] } });
part({ id: 'helm_half_R', parent: 'head', driver: 'helm_half', side: 'R', texture: 'half_R', socket: P(0, 0.22), z: 78, limits: { open: [0, 1] }, sign: 1, jointRadius: px(0.04) });
part({ id: 'helm_half_L', parent: 'head', driver: 'helm_half', side: 'L', texture: 'half_L', socket: P(0.3, 0.22), z: 78, limits: { open: [0, 1] }, sign: -1, jointRadius: px(0.04) });
part({ id: 'crown_half_R', parent: 'helm_half_R', driver: 'crown_half', side: 'R', texture: 'crown_half_R', socket: P(0.15, 0.07), z: 80, jointRadius: px(0.02) });
part({ id: 'crown_half_L', parent: 'helm_half_L', driver: 'crown_half', side: 'L', texture: 'crown_half_L', socket: P(0, 0.07), z: 80, jointRadius: px(0.02) });
part({ id: 'pauldron', parent: 'torso', sided: true, mirror: true, driver: 'pauldron', texture: 'pauldron', socket: shoulder, z: 74, limits: { rot: [-40, 40] }, sign: -1, follow: { part: 'upper_arm', factor: 0.35 }, jointRadius: px(0.06) });
part({ id: 'upper_arm', parent: 'torso', sided: true, mirror: true, driver: 'upper_arm', texture: 'upper_arm', socket: shoulder, z: 72, limits: { rot: [-40, 160] }, sign: -1, jointRadius: px(0.035) });
part({ id: 'forearm', parent: 'upper_arm', sided: true, mirror: true, driver: 'forearm', texture: 'forearm', socket: P(0.035, 0.155), z: 73, limits: { rot: [-10, 150] }, sign: 1, jointRadius: px(0.035) });
part({ id: 'hand', parent: 'forearm', sided: true, mirror: true, driver: 'hand', texture: 'hand_open',
  variants: ['hand_open', 'hand_grip', 'hand_fist', 'hand_palm', 'hand_spread', 'hand_clutch'], socket: P(0.035, 0.145), zBySide: { R: 90, L: 91 }, z: 90, limits: { rot: [-45, 45] }, sign: -1, jointRadius: px(0.03) });
// The sword hangs under hand_R (attached) or under the root (ground). socket = grip point in the hand image.
part({ id: 'sword', parent: 'hand_R', driver: 'sword', texture: 'sword_base', socket: P(0.045, HAND_GRIP + 0.045), z: 64, limits: { ground: [-25, 25] }, sign: -1, jointRadius: px(0.03), attachOffsetDeg: 95 });
part({ id: 'sword_runes', parent: 'sword', driver: 'runes', texture: 'sword_runes', socket: P(0.1, SWORD_TOP), z: 65, limits: { opacity: [0, 1] } });

// ---- pipes (section 2): generated cards pipe_<side><i>_{body,mouth,glow,cork} and wm_<side><i>_{body,mouth} ----
// wm_* is the checkerboard "deleted wing": the same pipe cards at spread s = 1, so it always matches the fan (director, 20 Oct).
// Joint radius r (section 1.4): half the limb width, capped so the disk fits inside the child image around its pivot and inside the
// parent image around the child's socket. The placeholder generator draws these disks into both images.
const FIXED_R = new Set(['helm_half_R', 'helm_half_L', 'crown_half_R', 'crown_half_L']);
const margin = (t, [x, y]) => Math.min(x, y, t.w - x, t.h - y);
const byPart = new Map(parts.map((p) => [p.id, p]));
for (const p of parts) {
  if (!p.limits?.rot || p.parent === 'root' || FIXED_R.has(p.id)) continue;
  const par = byPart.get(p.parent);
  const parentSock = margin(textures[par.texture], p.socket);
  const childPiv = margin(textures[p.texture], textures[p.texture].pivot);
  p.jointRadius = Math.max(0, Math.min(parentSock, childPiv, px(0.05)));
}
const pipes = {
  r0: 0.02, widthH: PIPE_W, cascade: 0.3, mouthLenW: 1.2, mouthOverlapW: 0.25, corkSeatW: 0.15, corkStartH: 0.08,
  z: { base: 20, step: 4, mouth: 1, glow: 2, cork: 3 }, missingZ: 10, dz: -0.04, thetaLimits: [-45, 95], scaleLimits: [0.85, 1.2],
  baseSide: 'L', checkerCellH: 0.02, items: pipeTable, bodyLen: BODY_LEN,
};

// ---- poses (section 5.1) ----
// wings: [spread or null ("per state": the wing track decides), wing root rotation]
const poses = {
  base: { pelvis: [0, 0], torso: 0, head: [0, 0], armR: [-25, 70, 0, 'grip'], armL: [-25, 70, 0, 'fist'], legs: [3, 3], wings: [1, 0], sword: 'hand_R', swordDir: 0, swordZ: 64 },
  raise_sword: { pelvis: [0, 0.01], torso: 6, head: [5, -0.005], armR: [155, 10, -30, 'grip'], armL: [40, 30, 0, 'fist'], legs: [8, 12], wings: [1, 10], sword: 'hand_R', swordDir: 210, swordZ: 92 },
  strike_down: { pelvis: [-4, -0.02], torso: -10, head: [-8, 0.01], armR: [-30, 70, -40, 'grip'], armL: [70, 40, 20, 'spread'], legs: [14, 14], wings: [1, -20], sword: 'hand_R', swordDir: -45, swordZ: 64 },
  conduct_wide: { pelvis: [0, 0], torso: 0, head: [4, -0.01], armR: [100, 30, 20, 'spread'], armL: [100, 30, 20, 'spread'], legs: [5, 5], wings: [1, 12], sword: 'ground' },
  slump: { pelvis: [0, -0.03], torso: -3, head: [-6, 0.025], armR: [-15, 55, -25, 'fist'], armL: [6, 10, 0, 'open'], legs: [2, 2], wings: [0, -10], sword: 'hand_R', swordDir: 0, swordZ: 64 },
  clutch_throat: { pelvis: [0, 0], torso: -4, head: [10, -0.01], armR: [-35, 140, 10, 'clutch'], armL: [-30, 135, 5, 'clutch'], legs: [4, 4], wings: [null, 0], sword: 'ground' },
  sit_alone: { pelvis: [0, -0.3], torso: -3, head: [-12, 0.025], armR: [10, 50, -20, 'open'], armL: [10, 50, -20, 'open'], legs: [0, 0], wings: [0.15, -15], sword: 'ground', plant: [-0.3, 18], seated: true },
  hand_on_canvas: { pelvis: [0, 0], torso: 5, head: [8, 0], armR: [125, -5, 40, 'palm'], armL: [6, 10, 0, 'open'], legs: [3, 3], wings: [null, 0], sword: 'ground', root: [0, 0, 0.05] },
  // ---- attack set (director, 20 Oct): antic -> strike -> follow, every value inside the table 1.3 limits ----
  // sword direction = a - f + h + 95 (deg, 0 = point down, 90 = horizontal toward screen-left, 180 = straight up)
  cleave_antic: { pelvis: [2, 0.02], torso: 8, head: [4, -0.005], armR: [160, 20, -45, 'grip'], armL: [100, 60, 0, 'fist'], legs: [10, 10], wings: [1, 15], sword: 'hand_R', swordDir: 190, swordZ: 92, lean: 4 },
  cleave_strike: { pelvis: [-4, -0.03], torso: -12, head: [-10, 0.01], armR: [-10, 75, -10, 'grip'], armL: [-5, 70, 0, 'fist'], legs: [14, 14], wings: [1, -15], sword: 'hand_R', swordDir: 0, swordZ: 64, lean: -6, root: [0, 0, 0.1] },
  cleave_follow: { pelvis: [-6, -0.04], torso: -14, head: [-12, 0.02], armR: [-35, 90, -25, 'grip'], armL: [-20, 80, 0, 'fist'], legs: [16, 16], wings: [1, -20], sword: 'hand_R', swordDir: -55, swordZ: 64, lean: -8, root: [0, 0, 0.1] },
  sweep_antic: { pelvis: [-4, -0.01], torso: -12, head: [-6, 0], armR: [-35, 130, -45, 'grip'], armL: [30, 50, 0, 'open'], legs: [12, 12], wings: [1, -10], sword: 'hand_R', swordDir: -115, swordZ: 64, lean: -5 },
  sweep_strike: { pelvis: [6, 0], torso: 12, head: [8, 0], armR: [50, 55, 0, 'grip'], armL: [70, 20, 0, 'spread'], legs: [18, 10], wings: [1, 15], sword: 'hand_R', swordDir: 90, swordZ: 64, lean: 5 },
  sweep_follow: { pelvis: [8, 0], torso: 15, head: [10, 0], armR: [70, 40, 10, 'grip'], armL: [90, 15, 0, 'spread'], legs: [20, 8], wings: [1, 15], sword: 'hand_R', swordDir: 135, swordZ: 92, lean: 8 },
  thrust_antic: { pelvis: [0, -0.02], torso: -8, head: [0, 0], armR: [-20, 110, -20, 'grip'], armL: [10, 60, 0, 'fist'], legs: [12, 6], wings: [1, -10], sword: 'hand_R', swordDir: -55, swordZ: 64, root: [0, 0, -0.05], lean: 4 },
  thrust_strike: { pelvis: [4, -0.01], torso: 10, head: [6, 0], armR: [50, 55, 0, 'grip'], armL: [-20, 30, 0, 'open'], legs: [20, 4], wings: [1, 15], sword: 'hand_R', swordDir: 90, swordZ: 64, root: [0, 0, 0.3], lean: 6 },
  thrust_follow: { pelvis: [5, -0.01], torso: 12, head: [8, 0], armR: [55, 45, 0, 'grip'], armL: [-25, 40, 0, 'open'], legs: [22, 4], wings: [1, 12], sword: 'hand_R', swordDir: 105, swordZ: 64, root: [0, 0, 0.35], lean: 7 },
  slam_antic: { pelvis: [3, 0.04], torso: 10, head: [6, -0.01], armR: [150, 15, -40, 'grip'], armL: [140, 40, 0, 'fist'], legs: [6, 6], wings: [1, 12], sword: 'hand_R', swordDir: 190, swordZ: 92, lean: 3 },
  slam_strike: { pelvis: [-5, -0.04], torso: -15, head: [-10, 0.03], armR: [-15, 80, 0, 'grip'], armL: [-10, 75, 0, 'fist'], legs: [25, 25], wings: [1, -25], sword: 'hand_R', swordDir: 0, swordZ: 64, lean: -4, root: [0, 0, 0.1] },
  slam_follow: { pelvis: [-3, -0.03], torso: -8, head: [-4, 0.02], armR: [-15, 80, 0, 'grip'], armL: [-10, 75, 0, 'fist'], legs: [20, 20], wings: [1, -10], sword: 'hand_R', swordDir: 0, swordZ: 64, lean: -2, root: [0, 0, 0.1] },
  blast_antic: { pelvis: [0, -0.01], torso: 6, head: [4, 0], armR: [20, 100, 0, 'fist'], armL: [20, 100, 0, 'fist'], legs: [6, 6], wings: [0.3, -5], sword: 'ground', lean: 3 },
  blast_strike: { pelvis: [0, 0], torso: -4, head: [8, -0.005], armR: [110, 15, 15, 'spread'], armL: [110, 15, 15, 'spread'], legs: [8, 8], wings: [1, 15], sword: 'ground', root: [0, 0, 0.1], lean: 0 },
  blast_follow: { pelvis: [0, 0], torso: -2, head: [4, 0], armR: [70, 60, 0, 'spread'], armL: [70, 60, 0, 'spread'], legs: [6, 6], wings: [1, 10], sword: 'ground', root: [0, 0, 0.05], lean: 0 },
  summon_antic: { pelvis: [-2, -0.02], torso: -6, head: [-4, 0], armR: [10, 90, 0, 'grip'], armL: [30, 60, 0, 'spread'], legs: [8, 8], wings: [1, -5], sword: 'hand_R', swordDir: 15, swordZ: 64 },
  summon_strike: { pelvis: [0, 0.04], torso: 10, head: [15, -0.01], armR: [150, 20, -45, 'grip'], armL: [40, 20, 0, 'spread'], legs: [10, 10], wings: [1, 15], sword: 'hand_R', swordDir: 180, swordZ: 92 },
  summon_follow: { pelvis: [0, 0.04], torso: 12, head: [20, -0.01], armR: [160, 15, -45, 'grip'], armL: [60, 20, 0, 'spread'], legs: [10, 10], wings: [1, 15], sword: 'hand_R', swordDir: 195, swordZ: 92 },
  lunge_antic: { pelvis: [3, -0.03], torso: 12, head: [6, 0.01], armR: [60, 100, -20, 'clutch'], armL: [60, 100, 20, 'clutch'], legs: [12, 12], wings: [0.6, -10], sword: 'ground', root: [0, 0, -0.1], lean: 5 },
  lunge_strike: { pelvis: [-5, -0.02], torso: -12, head: [-10, 0.02], armR: [100, 10, 20, 'clutch'], armL: [100, 10, 20, 'clutch'], legs: [20, 20], wings: [1, 15], sword: 'ground', root: [0, 0, 0.5], lean: -8 },
  lunge_follow: { pelvis: [-6, -0.03], torso: -15, head: [-12, 0.025], armR: [120, 30, 20, 'clutch'], armL: [120, 30, 20, 'clutch'], legs: [22, 22], wings: [1, 12], sword: 'ground', root: [0, 0, 0.7], lean: -10 },
  burst: { flare: 7, pelvis: [0, 0.04], torso: 0, head: [0, -0.01], armR: [150, 15, -25, 'grip'], armL: [150, 15, 0, 'fist'], legs: [22, 22], wings: [1, 15], sword: 'hand_R', swordDir: 205, swordZ: 92 },
};


// ---- attacks: three poses each. status: rig = reachable on the front-only rig inside the limits;
// rig_partial = reachable with a stated limit; needs_still = the true motion needs a drawn key still ----
const attacks = [
  { id: 'overhead_cleave', poses: ['cleave_antic', 'cleave_strike', 'cleave_follow'], status: 'rig', note: 'sword arc is in the picture plane: reads fully' },
  { id: 'horizontal_sweep', poses: ['sweep_antic', 'sweep_strike', 'sweep_follow'], status: 'rig', note: 'blade swings across the picture plane; torso and pelvis lean carry it' },
  { id: 'forward_thrust', poses: ['thrust_antic', 'thrust_strike', 'thrust_follow'], status: 'needs_still', note: 'rig fallback is a sideways lunge with root z toward the camera; a true thrust into the lens needs a drawn foreshortened key still' },
  { id: 'ground_slam', poses: ['slam_antic', 'slam_strike', 'slam_follow'], status: 'rig_partial', note: 'crouch is limited to pelvis ty -0.04 H with rigid legs (wide stance 25 deg); a deep crouch needs a drawn still' },
  { id: 'pipe_fan_blast', poses: ['blast_antic', 'blast_strike', 'blast_follow'], status: 'rig', note: 'fan spread comes from the wing track, pipes fire one by one with the pipe fire event' },
  { id: 'meteor_summon', poses: ['summon_antic', 'summon_strike', 'summon_follow'], status: 'rig', note: 'sword to the sky inside the picture plane; meteors are the effects lane' },
  { id: 'claw_lunge', poses: ['lunge_antic', 'lunge_strike', 'lunge_follow'], status: 'rig_partial', note: 'helm split + claw hands + root z/lean lunge toward the camera; the hands cannot foreshorten, so a close-up of the claws needs a drawn still' },
];

// swordDir of a hand-held pose is derived, never typed: a - f + h + 95 (relative to the body lean)
for (const p of Object.values(poses)) if (p.sword === 'hand_R') p.swordDir = p.armR[0] - p.armR[1] + p.armR[2] + 95;

// ---- helm cut (px in helm_closed): jagged vertical polyline, top to bottom; the halves overlap 1 px along it ----
const helmCut = [[0.15, 0], [0.145, 0.05], [0.155, 0.1], [0.147, 0.15], [0.15, 0.22]].map(([x, y]) => P(x, y));

// ---- id colours: one flat colour per card for the ID pass (6 levels per channel, spacing 51, never black) ----
const ids = [];
for (const p of parts) if (p.sided) ids.push(`${p.id}_R`, `${p.id}_L`); else ids.push(p.id);
for (const side of ['R', 'L']) for (const it of pipeTable) {
  for (const k of ['body', 'mouth', 'glow', 'cork']) ids.push(`pipe_${side}${it.i}_${k}`);
  for (const k of ['body', 'mouth']) ids.push(`wm_${side}${it.i}_${k}`);
}
if (ids.length > 215) throw new Error(`too many cards for the 6-level palette: ${ids.length}`);
const idColors = {};
ids.forEach((id, n) => {
  const v = n + 1;
  const lv = [Math.floor(v / 36) % 6, Math.floor(v / 6) % 6, v % 6].map((x) => x * 51);
  idColors[id] = '#' + lv.map((x) => x.toString(16).padStart(2, '0')).join('');
});

// placeholder texture colour = idColor of the first card using the slot
const texColor = {};
for (const p of parts) for (const id of p.sided ? [`${p.id}_R`, `${p.id}_L`] : [p.id]) {
  for (const s of new Set([p.texture, ...(p.variants ?? [])])) texColor[s] ??= idColors[id];
}
for (const it of pipeTable) {
  texColor[`body_${it.tex}`] ??= idColors[`pipe_L${it.i}_body`];
  texColor[`mouth_${it.tex}`] ??= idColors[`pipe_L${it.i}_mouth`];
  texColor[`glow_${it.tex}`] ??= idColors[`pipe_L${it.i}_glow`];
  texColor.cork ??= idColors[`pipe_L${it.i}_cork`];
}
for (const [slot, t] of Object.entries(textures)) t.idColor = texColor[slot] ?? '#808080';

const rig = { unitPx: UNIT, textures, parts, pipes, poses, attacks, helmCut, idColors, bladeBelow: BLADE_BELOW };
mkdirSync(path.join(ROOT, 'video/src/rig'), { recursive: true });
writeFileSync(path.join(ROOT, 'video/src/rig/vorathul.rig.json'), JSON.stringify(rig, null, 1) + '\n');
console.log(`rig json: ${Object.keys(textures).length} textures, ${parts.length} part defs, ${ids.length} cards, bladeBelow ${BLADE_BELOW}`);
