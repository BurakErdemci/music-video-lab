// The living camera (round 7c, scene-map.md "Living motion" and "Framing"), the last stage of every shot's camera:
//  1. a slow Ken Burns push or pull, 4 % of the fov over the shot, so no held shot freezes;
//  2. a shake whose amplitude follows the measured kick/bass energy frame by frame (src/data/energy.json, written by
//     tools/energy.py): stepped every 3 frames in the metal sections, smooth in the disco ones, none in the whisper,
//     and in the solo a tremble on every beat;
//  3. the framing guard: the camera widens (fov) and pans (a truck in its own plane) as little as it must so every
//     subject's face box stays inside the frame with a 4 % margin and below 70 % of its height, and a full-body
//     card's action box stays whole (the bottom may go for a knee framing). Punches, shakes and moves play
//     untouched while the subjects fit.
// A subject is a girl whose face is in frame at the middle of the shot as authored; the other girl at the edge of
// a single is an extra, drawn but not held. Node-safe: tools/framecheck.mjs measures the same states.
import { basis, type CameraPose, H, project, type Vec3, W } from '../camera/camera.ts';
import energyJson from '../data/energy.json' with { type: 'json' };
import { clamp01 } from '../lib/ease.ts';
import { hashKey, seeded } from '../lib/seeded.ts';
import { beatPos, sectionAt } from '../timing.ts';
import { CARD_FRAMES, cardPoint, faceFrame, screenBox, type ShotState, type Subject } from './framing.ts';

const BASS = (energyJson as { bass: number[] }).bass;
/** The kick/bass energy at t, 0..1 (tools/energy.py, the 30-150 Hz band per 60 fps frame). */
export const bassAt = (t: number): number => (BASS[Math.max(0, Math.min(BASS.length - 1, Math.round(t * 60)))] ?? 0) / 100;

/** Peak shake (px at 1080 lines, at full bass energy) per section, and whether it is stepped (metal). */
const SHAKE: Record<string, [number, boolean]> = {
  intro_robot: [2, false], intro_groove: [9, true], verse1_sweet: [3, false], verse2_raspy: [3.5, false], prechorus: [4, false],
  chorus1: [9, false], verse3_rebase: [5, false], chorus2: [9, false], verse4_trade: [5.5, false], scream: [10, true],
  breakdown_git_push_force: [3, true], whisper: [0, true], guitar_solo: [5, true], piano_interlude: [0, false], build: [3, false],
  final_chorus: [7, false], post_chorus_chant: [9, true], robot_build_failed: [2, false], scream_end: [10, true], outro: [8, true],
};

/** A value noise in -1..1 at time u (units of its own step), smooth (cosine) or held per step. */
const noise = (key: string, u: number, stepped: boolean): number => {
  const i = Math.floor(u);
  const a = seeded(`${key}:${i}`).range(-1, 1);
  if (stepped) return a;
  const b = seeded(`${key}:${i + 1}`).range(-1, 1);
  const k = (1 - Math.cos(Math.PI * (u - i))) / 2;
  return a + (b - a) * k;
};

/** The shake at t in px (x, y). */
export const shakeAt = (t: number): [number, number] => {
  const sec = sectionAt(t);
  const [peak, stepped] = SHAKE[sec] ?? [0, false];
  if (peak === 0) return [0, 0];
  // the solo trembles on the tempo: an extra kick of shake on every beat, decaying within it
  const tremble = sec === 'guitar_solo' ? 0.35 * Math.exp(-(beatPos(t) % 1) * 5) : 0;
  const a = peak * Math.min(1.3, bassAt(t) + tremble);
  // stepped: a new offset every 3 frames (20 per second); smooth: 9 keys per second, eased between
  const u = stepped ? Math.floor(Math.round(t * 60) / 3) : t * 9;
  return [a * noise('shake-x', u, stepped), a * 0.7 * noise('shake-y', u, stepped)];
};

const add = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const depthOf = (pose: CameraPose, p: Vec3): number => {
  const [fwd] = basis(pose);
  return (p[0] - pose.position[0]) * fwd[0] + (p[1] - pose.position[1]) * fwd[1] + (p[2] - pose.position[2]) * fwd[2];
};
/** Truck the camera in its own plane by (px, py) screen pixels as seen at depth `d` (content moves the other way). */
const truck = (pose: CameraPose, px: number, py: number, d: number): CameraPose => {
  const [, right, up] = basis(pose);
  const unit = (d * Math.tan((pose.fov * Math.PI) / 360)) / (H / 2);
  const shift = add(add([0, 0, 0], right, px * unit), up, -py * unit);
  return { ...pose, position: add(pose.position, shift, 1), target: add(pose.target, shift, 1) };
};
const widen = (pose: CameraPose, z: number): CameraPose => ({ ...pose, fov: (2 * Math.atan(z * Math.tan((pose.fov * Math.PI) / 360)) * 180) / Math.PI });

// limits in units of half the frame height from the centre (y up), 4 px inside the measured ones so the
// projection's non-linearity across the guard's iterations never leaves a box a pixel over
const PAD = 4 / (H / 2);
const FX = (0.46 * W) / (H / 2) - PAD;
const FY = 0.92 - PAD;
const AX = (W / 2 + 0.01 * H) / (H / 2) - PAD;
const AY = 1.02 - PAD;
const SPLIT_M = (0.04 * W) / (H / 2);
/** How far the guard may widen and pan: the plates cover 1.3x the frame at the shot's opening pose, and the shots'
 *  own moves already use part of that. */
const ZMAX = 1.5;
const PAN_MAX = 0.45;
/** Where a knee framing may cut, down the card (normalised, y down). */
export const KNEE_V = 0.7;

interface Limit { n: [number, number]; lo: [number, number]; hi: [number, number] }
const ndc = (p: { x: number; y: number }): [number, number] => [(p.x - W / 2) / (H / 2), (H / 2 - p.y) / (H / 2)];

/** The constraints of the subjects under `pose`, plus the z range the face heights and split lines allow. */
const limitsOf = (pose: CameraPose, subjects: readonly Subject[]) => {
  const lims: Limit[] = [];
  let zLo = 1;
  let zHi = Infinity;
  for (const s of subjects) {
    const f = CARD_FRAMES[s.card];
    if (!f) continue;
    const corners = (b: readonly number[]) => {
      const [u0, v0, u1, v1] = b as [number, number, number, number];
      return [[u0, v0], [u1, v0], [u0, v1], [u1, v1]].map(([u, v]) => ndc(project(pose, cardPoint(s, u as number, v as number))));
    };
    const clipC = s.clip ? ndc(project(pose, [s.clip.x, (s.at.feet ?? -3.4) + s.at.height * 0.8, s.at.z ?? 0]))[0] : null;
    if (!s.silhouette) {
      const fc = corners(faceFrame(s.card));
      for (const n of fc) lims.push({ n, lo: [-FX, -FY], hi: [FX, FY] });
      const ys = fc.map((n) => n[1]);
      // (4 px under 70 % of the height, as the margins: a face fitted to exactly 70 % rounds over it)
      zLo = Math.max(zLo, (Math.max(...ys) - Math.min(...ys)) / (1.4 - PAD));
      if (clipC !== null) {
        const xs = fc.map((n) => n[0]);
        const room = s.clip?.keep === 'left' ? clipC - Math.max(...xs) : Math.min(...xs) - clipC;
        zHi = Math.min(zHi, room / SPLIT_M);
      }
    }
    // a bust's card is cut straight at its bottom: that edge stays below the frame wherever it is across the frame
    // (round 11: the YES! busts showed it with the LED wall under it as the push began)
    if (f.kind === 'bust') {
      // (sampled finely and a little past the sides, so the edge cannot cross between two samples)
      for (let i = 0; i <= 40; i++) {
        const n = ndc(project(pose, cardPoint(s, i / 40, 1)));
        const inside = Math.abs(n[0]) < W / H + 0.08 && (clipC === null || (s.clip?.keep === 'left' ? n[0] < clipC + 0.08 : n[0] > clipC - 0.08));
        if (inside) lims.push({ n, lo: [-Infinity, -Infinity], hi: [Infinity, -1 - 8 / (H / 2)] });
      }
    }
    if (f.kind === 'full') {
      for (const n of corners(f.action)) lims.push({ n, lo: [-AX, s.crop === 'knee' ? -Infinity : -AY], hi: [AX, AY] });
      // a knee framing cuts at the knees or below: the knee line (70 % down the card) stays above the bottom edge
      if (s.crop === 'knee') lims.push({ n: ndc(project(pose, cardPoint(s, (f.action[0] + f.action[2]) / 2, KNEE_V))), lo: [-Infinity, -AY], hi: [Infinity, Infinity] });
    }
  }
  return { lims, zLo, zHi };
};

/** The pan interval per axis at widening z: [max(n - hi z), min(n - lo z)]. */
const panWindow = (lims: readonly Limit[], z: number, ax: 0 | 1): [number, number] => {
  let L = -Infinity;
  let R = Infinity;
  for (const l of lims) {
    L = Math.max(L, l.n[ax] - l.hi[ax] * z);
    R = Math.min(R, l.n[ax] - l.lo[ax] * z);
  }
  return [L, R];
};
/** Does widening z leave a pan inside the remaining pan budget [lo, hi] per axis that fits every limit? */
const fits = (lims: readonly Limit[], z: number, lo: [number, number], hi: [number, number]) =>
  ([0, 1] as const).every((ax) => {
    const [L, R] = panWindow(lims, z, ax);
    return Math.max(L, lo[ax]) <= Math.min(R, hi[ax]) + 1e-9;
  });
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** The framing guard: the least widening, then the least pan, that keeps the subjects in frame. */
export const guard = (pose0: CameraPose, subjects: readonly Subject[]): { pose: CameraPose; z: number; ok: boolean } => {
  let pose = pose0;
  let zTotal = 1;
  let panX = 0;
  let panY = 0;
  let ok = true;
  const pts = subjects.flatMap((s) => (CARD_FRAMES[s.card] ? [cardPoint(s, 0.5, 0.3)] : []));
  if (!pts.length) return { pose, z: 1, ok: true };
  for (let it = 0; it < 3; it++) {
    const { lims, zLo, zHi } = limitsOf(pose, subjects);
    if (!lims.length) break;
    const lo = Math.max(1, zLo);
    // a barrel roll turns side-by-side girls upright on screen; there the guard may widen up to 2x
    const zMax = ZMAX + 0.5 * Math.abs(Math.sin(pose0.roll ?? 0));
    const hi = Math.max(lo, Math.min(zMax / zTotal, zHi));
    let z: number;
    const pLo: [number, number] = [-PAN_MAX - panX, -PAN_MAX - panY];
    const pHi: [number, number] = [PAN_MAX - panX, PAN_MAX - panY];
    if (fits(lims, lo, pLo, pHi)) z = lo;
    else if (!fits(lims, hi, pLo, pHi)) z = hi;
    else {
      let a = lo;
      let b = hi;
      for (let k = 0; k < 24; k++) {
        const m = (a + b) / 2;
        if (fits(lims, m, pLo, pHi)) b = m;
        else a = m;
      }
      z = b;
    }
    const [Lx, Rx] = panWindow(lims, z, 0);
    const [Ly, Ry] = panWindow(lims, z, 1);
    const dx = Lx <= Rx ? clamp(0, Lx, Rx) : (Lx + Rx) / 2;
    const dy = Ly <= Ry ? clamp(0, Ly, Ry) : (Ly + Ry) / 2;
    if (z === 1 && dx === 0 && dy === 0) break;
    // pan in the frame's units before widening: a pan of d at the old fov is d * (H/2) px
    const d = pts.reduce((acc, p) => acc + depthOf(pose, p), 0) / pts.length;
    const cx = clamp(dx, -PAN_MAX - panX, PAN_MAX - panX);
    const cy = clamp(dy, -PAN_MAX - panY, PAN_MAX - panY);
    panX += cx;
    panY += cy;
    pose = widen(truck(pose, cx * (H / 2), -cy * (H / 2), d), z);
    zTotal *= z;
  }
  // the verdict on the final pose
  for (const s of subjects) {
    const f = CARD_FRAMES[s.card];
    if (!f) continue;
    if (!s.silhouette) {
      const b = screenBox(pose, s, faceFrame(s.card));
      if (b.x0 < 0.04 * W - 0.5 || b.x1 > 0.96 * W + 0.5 || b.y0 < 0.04 * H - 0.5 || b.y1 > 0.96 * H + 0.5 || b.y1 - b.y0 > 0.7 * H) ok = false;
    }
  }
  return { pose, z: zTotal, ok };
};

/** Is the girl's face (or, for a silhouette, her figure's centre) inside the frame under `pose`? */
const inFrame = (pose: CameraPose, s: Subject): boolean => {
  const f = CARD_FRAMES[s.card];
  if (!f) return false;
  const b = screenBox(pose, s, s.silhouette ? f.action : f.face);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return cx > 0 && cx < W && cy > 0 && cy < H;
};

export interface Span { t0: number; t1: number; key: string }

/** Wrap a shot family's authored state (camera with its moves and punches, the placed cards) into the living one. */
export const liveCamera = (raw: (t: number) => ShotState, span: (t: number) => Span) => {
  const stateAt = (t: number): ShotState => {
    const st = raw(t);
    const { t0, t1, key } = span(t);
    // who the shot is about: the girls whose faces the authored camera shows at the middle of the shot
    const mid = raw(Math.min(t1 - 1 / 60, (t0 + t1) / 2));
    const who = new Set(mid.subjects.filter((s) => inFrame(mid.pose, s)).map((s) => s.card[0]));
    const subjects = st.subjects.filter((s) => who.has(s.card[0]));
    const extras = st.subjects.filter((s) => !who.has(s.card[0]));
    // 1. Ken Burns: push or pull 4 % of the fov across the shot, the direction picked per shot
    const k = clamp01((t - t0) / Math.max(1e-3, t1 - t0));
    const dir = hashKey(key) % 2 ? 1 : -1;
    let pose: CameraPose = { ...st.pose, fov: st.pose.fov * (1 - dir * 0.04 * (k - 0.5)) };
    // 2. the shake, trucked at the subjects' depth (or 12 units out when the frame has none)
    const [sx, sy] = shakeAt(t);
    if (sx || sy) {
      const ref = subjects[0] ?? st.subjects[0];
      pose = truck(pose, sx, sy, ref ? depthOf(pose, cardPoint(ref, 0.5, 0.3)) : 12);
    }
    // 3. the framing guard
    const g = guard(pose, subjects);
    return { ...st, pose: g.pose, subjects, extras, fit: { z: g.z, ok: g.ok } };
  };
  return { stateAt, poseAt: (t: number) => stateAt(t).pose, spanAt: span };
};
