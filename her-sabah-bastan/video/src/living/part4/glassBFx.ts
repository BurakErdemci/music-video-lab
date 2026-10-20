// glassB effects: the spreading cracks, the trembling, the tally mark pop, her single mark, the "Merhaba" bubble.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { TEXT_FONT } from '../../style/fonts.ts';
import { paintTally, TALLY_CANVAS } from '../part2/paintDays.ts';
import { paintCracks, RUN_CRACKS, type Crack } from './cracks.ts';
import { BEAT_FRAMES, easeOut, planeScale, clamp01, lerp, type Cam } from './common.ts';
import { D_PIC, PIC_RECT } from './splitSet.ts';

// ---- cracks that spread from the palms' meeting point

/** Screen px of a world point on the d = 0 plane, and the pic-glass px that lands on the same screen px. */
const screenOf = (cam: Cam, p: readonly [number, number]): [number, number] => {
  const k = planeScale(cam, 0);
  return [960 + (p[0] - cam.x) * k, 540 + (p[1] - cam.y) * k];
};
export const picPxOf = (cam: Cam, s: readonly [number, number]): [number, number] => {
  const kp = planeScale(cam, D_PIC);
  const kw = PIC_RECT.w / 1920;
  return [(cam.x + (s[0] - 960) / kp - PIC_RECT.x) / kw, (cam.y + (s[1] - 540) / kp - PIC_RECT.y) / kw];
};
/** Screen px per pic px at this camera. */
export const picScale = (cam: Cam): number => planeScale(cam, D_PIC) * (PIC_RECT.w / 1920);
export const PALMS_WORLD: [number, number] = [964, 522];
/** Bubble tail tip: just below the flat palms of BIR DAHA (palms meet at world y 343), so the tail points at the wrists, not over the hands. */
export const PALMS_FLAT: [number, number] = [960, 425];
export const palmsScreen = (cam: Cam, flat = false): [number, number] => screenOf(cam, flat ? PALMS_FLAT : PALMS_WORLD);

/** The new cracks: born on the beats of [a, b] (three per bar), growing out of the palms' meeting point, then off cracks.
 * Same structure as the run cracks (a line through the impact point, hairline branches leaving its vertices). */
type P = [number, number];
/** A jagged arm: a straight run with sideways knocks and a sharp kink now and then (like the run cracks). */
const arm = (o: P, ang: number, len: number, r: () => number, minN = 3): P[] => {
  const out: P[] = [];
  const step = 58;
  const n = Math.max(minN, Math.round(len / step));
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  for (let i = 1; i <= n; i++) {
    const off = (r() - 0.5) * 2 * 15 * (r() < 0.2 ? 1.8 : 1);
    out.push([o[0] + Math.cos(ang) * step * i * (0.92 + 0.16 * r()) + nx * off, o[1] + Math.sin(ang) * step * i * (0.92 + 0.16 * r()) + ny * off]);
  }
  return out;
};

// ---- head boxes (world px on the d = 0 plane, margin included) every crack must keep clear of
type Box = [number, number, number, number];
const HIS_STAND: Box = [655, 145, 935, 335];
const HIS_SIT: Box = [740, 430, 925, 620];
const HER_HEAD: Box = [1095, 145, 1345, 335];
// the flat palms of BIR DAHA (world centre (960, 343)): cracks may leave the edge of this zone, never cross the hands
const PALM_ZONE: Box = [875, 258, 1045, 428];
/** Heads on screen at song frame f (his pose changes by day in the montage, so both of his are kept there). */
const headsAt = (f: number): Box[] => (f >= 5982 ? [HIS_STAND, HER_HEAD, PALM_ZONE] : f < 5650 ? [HIS_STAND, HER_HEAD] : f < 5872 ? [HIS_STAND, HIS_SIT, HER_HEAD] : [HIS_SIT, HER_HEAD]);
const crosses = (pts: readonly P[], cam: Cam, f: number): boolean => {
  const kp = planeScale(cam, D_PIC);
  const kw = PIC_RECT.w / 1920;
  const k0 = planeScale(cam, 0);
  const scr = (q: P): P => [960 + (PIC_RECT.x + q[0] * kw - cam.x) * kp, 540 + (PIC_RECT.y + q[1] * kw - cam.y) * kp];
  const M = 25; // screen px: covers the shake and the line weight
  const boxes = headsAt(f).map((b) => [960 + (b[0] - cam.x) * k0 - M, 540 + (b[1] - cam.y) * k0 - M, 960 + (b[2] - cam.x) * k0 + M, 540 + (b[3] - cam.y) * k0 + M]);
  for (let i = 1; i < pts.length; i++) {
    const A = scr(pts[i - 1] as P);
    const B = scr(pts[i] as P);
    const n = Math.max(2, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / 6));
    for (let j = 0; j <= n; j++) {
      const x = A[0] + ((B[0] - A[0]) * j) / n;
      const y = A[1] + ((B[1] - A[1]) * j) / n;
      if (boxes.some((q) => x > (q[0] as number) && x < (q[2] as number) && y > (q[1] as number) && y < (q[3] as number))) return true;
    }
  }
  return false;
};

/** Directions the cracks radiate in: up and down along the seam above/below the hands, then out into the glass. */
const DIRS = [-Math.PI / 2, 1.05, Math.PI / 2, 0.2, -1.0, -0.75, 2.3];
const MAX_TRIES = 150;
export const spreadCracks = (a: number, b: number, camAt: (f: number) => Cam): Crack[] => {
  const out: Crack[] = [];
  const beats = BEAT_FRAMES.filter((x) => x > a && x <= b).filter((_, i) => i % 4 === 1);
  beats.slice(0, 4).forEach((born, n) => {
    const cam0 = camAt(born);
    const origin: P = picPxOf(cam0, palmsScreen(cam0));
    for (let t = 0; t < MAX_TRIES * DIRS.length; t++) {
      const r = seeded(`p4:gb-crack:${n}:${t}`);
      const base = DIRS[(n + Math.floor(t / MAX_TRIES)) % DIRS.length] as number;
      const ang = base + (r() - 0.5) * 0.5;
      const fwd = arm(origin, ang, 650 + r() * 450, r);
      const back = arm(origin, ang + Math.PI + (r() - 0.5) * 0.4, 70 + r() * 60, r, 1);
      const pts: P[] = [...back.reverse(), origin, ...fwd];
      const branches: P[][] = [];
      for (let j = 0; j < 2; j++) {
        const k = pts.indexOf(fwd[1 + Math.floor(r() * (fwd.length - 2))] as P);
        const st = pts[k] as P;
        const ba = ang + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.5);
        const mid: P = [st[0] + Math.cos(ba) * 40, st[1] + Math.sin(ba) * 40];
        branches.push([st, mid, [mid[0] + Math.cos(ba + 0.25) * 55, mid[1] + Math.sin(ba + 0.25) * 55]]);
      }
      let ok = true;
      for (let f = born; f <= 6395 && ok; f += 10) {
        const cam = camAt(f);
        if (crosses(pts, cam, f) || branches.some((br) => crosses(br, cam, f))) ok = false;
      }
      if (ok) {
        out.push({ born, origin, pts, branches });
        return;
      }
    }
    // no direction clears every head from its birth to the shatter: that crack is left out (no crack over a face)
  });
  if (out.length < 4) console.warn(`glassB: ${out.length} of 4 spread cracks clear the heads`);
  return out;
};
const SC0 = planeScale({ x: 950, y: 560, z: 1010 }, D_PIC) * (PIC_RECT.w / 1920);
/** Keeps the line weight near what the home framing shows when the push magnifies the glass plane. */
export const paintSpread = (ctx: CanvasRenderingContext2D, f: number, cracks: readonly Crack[], sc: number): void => {
  const k = Math.min(1, Math.max(0.5, SC0 / sc));
  paintCracks(ctx, f, RUN_CRACKS, { width: 4 * k });
  paintCracks(ctx, f, cracks, { width: 2.6 * k });
};

// ---- the trembling: a seeded jitter, smooth between its keys

const noise = (key: string, t: number): number => {
  const i = Math.floor(t);
  const u = t - i;
  const a = seeded(`${key}:${i}`)() * 2 - 1;
  const b = seeded(`${key}:${i + 1}`)() * 2 - 1;
  return lerp(a, b, 0.5 - 0.5 * Math.cos(Math.PI * u));
};
/** Shake of the picture glass in world px at song frame f. */
export const trembleAt = (f: number, f0: number, f1: number, a0: number, a1: number, period: number): [number, number] => {
  const amp = lerp(a0, a1, clamp01((f - f0) / (f1 - f0)));
  return [amp * noise('p4:gb-sx', f / period), amp * 0.55 * noise('p4:gb-sy', f / period)];
};

// ---- the tally mark that pops in: the difference between count n and n - 1, bounced about its centre

let cA: HTMLCanvasElement | null = null;
let cB: HTMLCanvasElement | null = null;
const off = (c: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement => {
  const o = c ?? document.createElement('canvas');
  o.width = w;
  o.height = h;
  return o;
};
export const paintTallyPop = (ctx: CanvasRenderingContext2D, cw: number, ch: number, n: number, k: number, seed: string): void => {
  cA = off(cA, cw, ch);
  cB = off(cB, cw, ch);
  const a = cA.getContext('2d') as CanvasRenderingContext2D;
  const b = cB.getContext('2d') as CanvasRenderingContext2D;
  paintTally(a, cw, ch, n, seed);
  paintTally(b, cw, ch, n - 1, seed);
  const da = a.getImageData(0, 0, cw, ch);
  const db = b.getImageData(0, 0, cw, ch).data;
  let x0 = cw;
  let y0 = ch;
  let x1 = 0;
  let y1 = 0;
  for (let p = 0; p < cw * ch; p++) {
    if ((db[p * 4 + 3] as number) > 6) da.data[p * 4 + 3] = 0;
    else if ((da.data[p * 4 + 3] as number) > 6) {
      const x = p % cw;
      const y = (p / cw) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  a.putImageData(da, 0, 0);
  const s = k < 9 ? 1 + 0.45 * Math.sin((Math.PI * k) / 9) * (1 - k / 12) : 1;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  ctx.globalAlpha = clamp01((k + 1) / 3);
  ctx.drawImage(cA, 0, 0);
  ctx.restore();
};
export { TALLY_CANVAS };

// ---- her single mark: one hand-drawn, print-textured navy stroke on her cream wall

export const paintHerMark = (ctx: CanvasRenderingContext2D, cw: number, ch: number, k: number): void => {
  const s = k < 10 ? 1 + 0.4 * Math.sin((Math.PI * k) / 10) * (1 - k / 14) : 1;
  const r = seeded('p4:her-mark');
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(s, s);
  ctx.rotate(0.05);
  ctx.globalAlpha = clamp01((k + 1) / 3);
  ctx.lineCap = 'round';
  const len = ch * 0.78;
  for (let p = 0; p < 14; p++) {
    // dry-brush: many thin, slightly displaced strands, each broken into runs
    const dx = (r() - 0.5) * 9;
    ctx.strokeStyle = palette.navy;
    ctx.globalAlpha = clamp01((k + 1) / 3) * (0.35 + 0.5 * r());
    ctx.lineWidth = 2.8 + 3.4 * r();
    let y = -len / 2 + r() * 6;
    while (y < len / 2 - 4) {
      const run = 14 + r() * 40;
      const y2 = Math.min(len / 2, y + run);
      ctx.beginPath();
      ctx.moveTo(dx + (y / len) * 5, y);
      ctx.lineTo(dx + (y2 / len) * 5 + (r() - 0.5) * 1.5, y2);
      ctx.stroke();
      y = y2 + r() * 9;
    }
  }
  ctx.restore();
};

// ---- the "Merhaba" bubble on the picture glass, at the palms

/** Draws in pic px: origin = the bubble's tail tip at the palms; `sc` screen px per pic px; k frames since it appeared. */
export const paintBubble = (ctx: CanvasRenderingContext2D, tip: readonly [number, number], sc: number, k: number): void => {
  if (k < 0) return;
  const u = clamp01(k / 12);
  const pop = k >= 12 ? 1 : 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
  if (pop <= 0.001) return;
  ctx.save();
  ctx.translate(tip[0], tip[1]);
  ctx.scale(pop / sc, pop / sc);
  // the body hangs BELOW the palms, its tail pointing up at them: draw the shape mirrored, the text upright
  ctx.save();
  ctx.scale(1, -1);
  const bx = -190;
  const by = -265;
  const bw = 380;
  const bh = 130;
  const rr = 34;
  ctx.beginPath();
  ctx.moveTo(bx + rr, by);
  ctx.lineTo(bx + bw - rr, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + rr);
  ctx.lineTo(bx + bw, by + bh - rr);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - rr, by + bh);
  ctx.lineTo(28, by + bh);
  ctx.lineTo(0, -6);
  ctx.lineTo(-30, by + bh);
  ctx.lineTo(bx + rr, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - rr);
  ctx.lineTo(bx, by + rr);
  ctx.quadraticCurveTo(bx, by, bx + rr, by);
  ctx.closePath();
  ctx.fillStyle = palette.navy;
  ctx.save();
  ctx.translate(6, -6);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = palette.cream;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.navy;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = palette.navy;
  ctx.font = `500 62px "${TEXT_FONT}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Merhaba', 0, -(by + bh / 2 + 3));
  ctx.restore();
};
