// Code-drawn pieces of the run scene: the night sky / moon / far roofs, the wet asphalt, the bus door leaves, the
// splash, the breath puffs and the flutter of the note. Every painter is a pure function of its arguments.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { clamp01 } from './common.ts';

type Ctx = CanvasRenderingContext2D;
const CREAM = '243,239,228';
const YEL = '240,211,90';

/** Night sky: navy, halftone haze above the horizon, fine star dust that drifts a little with `drift` px. */
export const paintNightSky = (ctx: Ctx, cw: number, ch: number, drift: number): void => {
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, 0, cw, ch);
  // halftone haze: cream dots that get bigger towards the horizon (y ~ 0.62 ch)
  const sp = 11;
  for (let y = ch * 0.05; y < ch * 0.4; y += sp) {
    const t = (y - ch * 0.05) / (ch * 0.35);
    const rad = 0.5 + 2.2 * t * t;
    ctx.fillStyle = `rgba(${CREAM},${(0.05 + 0.3 * t).toFixed(3)})`;
    const row = Math.round(y / sp);
    const off = (row % 2) * (sp / 2) - (drift % sp);
    for (let x = off - sp; x < cw + sp; x += sp) {
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const r = seeded('run:stars');
  for (let i = 0; i < 150; i++) {
    const u = r();
    const v = r() * 0.6;
    const s = 0.8 + r() * 1.9;
    const a = 0.35 + r() * 0.6;
    const yel = r() < 0.2;
    const x = (((u * cw - drift * (0.4 + r() * 0.6)) % cw) + cw) % cw;
    ctx.fillStyle = `rgba(${yel ? YEL : CREAM},${a.toFixed(2)})`;
    ctx.fillRect(x, v * ch, s, s);
    if (s > 2.3) {
      ctx.fillRect(x - s * 1.4, v * ch + s * 0.35, s * 3.8, s * 0.3);
      ctx.fillRect(x + s * 0.35, v * ch - s * 1.4, s * 0.3, s * 3.8);
    }
  }
};

/** The big moon in its own square canvas: dotted halo, cream ring, yellow disc printed a little off, craters, limb shading. */
export const paintMoon = (ctx: Ctx, cw: number, R: number): void => {
  const c = cw / 2;
  for (let rr = R + 14; rr < c - 4; rr += 12) {
    const a = 0.34 * (1 - (rr - R) / (c - R));
    ctx.fillStyle = `rgba(${CREAM},${a.toFixed(3)})`;
    const n = Math.round((rr * Math.PI * 2) / 15);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rr * 0.3;
      ctx.beginPath();
      ctx.arc(c + Math.cos(ang) * rr, c + Math.sin(ang) * rr, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = palette.cream;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(c, c, R + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(5, -4);
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fillStyle = palette.moonYellow;
  ctx.fill();
  ctx.clip();
  const r = seeded('run:moon');
  ctx.fillStyle = 'rgba(24,32,58,0.2)';
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.78;
    const cr = R * (0.06 + r() * 0.11);
    ctx.beginPath();
    ctx.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, cr, cr * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // lower-right limb: navy halftone dots growing towards the edge
  for (let y = c - R; y < c + R; y += 9) {
    for (let x = c - R; x < c + R; x += 9) {
      const dx = x - c;
      const dy = y - c;
      const t = (dx + dy) / (R * 1.4);
      if (t < 0.25 || dx * dx + dy * dy > R * R) continue;
      ctx.fillStyle = `rgba(24,32,58,${(0.35 * clamp01((t - 0.25) / 0.6)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + 2.2 * clamp01((t - 0.25) / 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

/** One tile of far roofs (navy silhouettes down to the street, a few lit yellow windows, cream rim on the roof line). */
export const paintFarRoofs = (ctx: Ctx, cw: number, ch: number, tile: number): void => {
  const r = seeded(`run:far:${tile}`);
  ctx.clearRect(0, 0, cw, ch);
  let x = -20;
  while (x < cw) {
    const bw = 80 + r() * 90;
    const top = ch * (0.04 + r() * 0.32);
    const stepped = r() < 0.4;
    ctx.fillStyle = palette.navy;
    ctx.fillRect(x, top, bw, ch - top);
    if (stepped) ctx.fillRect(x + bw * 0.2, top - 26, bw * 0.45, 26);
    ctx.fillStyle = `rgba(${CREAM},0.5)`;
    ctx.fillRect(x, top, bw, 2);
    ctx.fillRect(x, top, 2, ch - top);
    for (let wy = top + 18; wy < ch - 30; wy += 30) {
      for (let wx = x + 12; wx < x + bw - 16; wx += 24) {
        if (r() < 0.2) {
          ctx.fillStyle = `rgba(${YEL},0.9)`;
          ctx.fillRect(wx, wy, 9, 13);
        }
      }
    }
    x += bw;
  }
};

export interface AsphaltIn {
  /** Strip index 0..2 (far to near). */
  band: number;
  /** Window of lit shop windows and lamps as screen x on this strip, and the moon's screen x. */
  streaks: { x: number; w: number; yellow: boolean }[];
  pools: number[];
  puddles: { x: number; w: number }[];
  moonX: number;
  /** World-anchored phase of the halftone (px). */
  phase: number;
}

/** Wet asphalt strip (canvas px = screen px of the band): navy, halftone, long vertical reflections, puddles. */
export const paintAsphalt = (ctx: Ctx, cw: number, ch: number, a: AsphaltIn, seed: string): void => {
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, 0, cw, ch);
  const sp = 8 + a.band * 3;
  for (let y = 4; y < ch; y += sp) {
    const row = Math.round(y / sp);
    ctx.fillStyle = `rgba(${CREAM},${(0.07 + 0.03 * a.band).toFixed(3)})`;
    for (let x = (row % 2) * (sp / 2) - (a.phase % sp) - sp; x < cw + sp; x += sp) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + 0.5 * a.band + (y / ch) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const r = seeded(seed);
  ctx.fillStyle = `rgba(${CREAM},0.35)`;
  for (let i = 0; i < 160; i++) ctx.fillRect(r() * cw, r() * ch, 1 + r() * 2.5, 1 + r() * 1.5);
  // lamp pools: yellow halftone ellipses
  for (const px of a.pools) {
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = `rgba(${YEL},${(0.1 + k * 0.05).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(px, ch * 0.5, 230 - k * 45, ch * 0.5 - k * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // long vertical reflections of the lit windows: stacked wobbling bars that fade with distance from the kerb
  a.streaks.forEach((s, i) => {
    const col = s.yellow ? YEL : CREAM;
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, `rgba(${col},${a.band === 0 ? 0.62 : 0.5})`);
    g.addColorStop(1, `rgba(${col},${a.band === 0 ? 0.3 : 0.14})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    const n = 12;
    for (let k = 0; k <= n; k++) {
      const y = (k / n) * ch;
      const w = (s.w / 2) * (1 - 0.18 * (k / n)) * (0.85 + 0.2 * Math.sin(k * 1.7 + i));
      const x = s.x + Math.sin(k * 0.9 + i * 2.1) * 2.5 - w;
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    for (let k = n; k >= 0; k--) {
      const y = (k / n) * ch;
      const w = (s.w / 2) * (1 - 0.18 * (k / n)) * (0.85 + 0.2 * Math.sin(k * 1.3 + i * 1.7));
      ctx.lineTo(s.x + Math.sin(k * 0.9 + i * 2.1) * 2.5 + w, y);
    }
    ctx.closePath();
    ctx.fill();
  });
  // puddles: pale rim, moon reflection when the moon stands over them
  for (const p of a.puddles) {
    const ry = Math.min(ch * 0.4, p.w * 0.1 + 6);
    const cy = ch * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(p.x, cy, p.w / 2, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(24,32,58,0.9)';
    ctx.fill();
    ctx.clip();
    const dm = Math.abs(a.moonX - p.x);
    if (dm < p.w * 0.45) {
      ctx.fillStyle = `rgba(${YEL},0.95)`;
      ctx.beginPath();
      ctx.ellipse(a.moonX, cy, p.w * 0.17, ry * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${CREAM},0.7)`;
      ctx.fillRect(a.moonX - p.w * 0.14, cy - 1, p.w * 0.28, 2);
    }
    ctx.fillStyle = `rgba(${CREAM},0.4)`;
    ctx.fillRect(p.x - p.w * 0.42, cy - ry * 0.4, p.w * 0.3, 2);
    ctx.restore();
    ctx.strokeStyle = `rgba(${CREAM},0.65)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, cy, p.w / 2, ry, 0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(p.x, cy, p.w / 2, ry, 0, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
  }
  // fade into the strip above
  if (a.band > 0) {
    ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createLinearGradient(0, 0, 0, 14);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
  }
};

/** A soft streak of light under him (reflection of the figure): cream/yellow column fading downwards. */
export const paintFeetStreak = (ctx: Ctx, cw: number, ch: number): void => {
  for (let y = 0; y < ch; y += 4) {
    const t = y / ch;
    const w = cw * (0.5 - 0.2 * t) * (0.85 + 0.15 * Math.sin(y * 0.2));
    ctx.fillStyle = `rgba(${CREAM},${(0.3 * (1 - t)).toFixed(3)})`;
    ctx.fillRect(cw / 2 - w / 2, y, w, 3.5);
  }
};

// ---------------------------------------------------------------------------------------------------------------
// Bus doors.

/** Both door leaves of the open-able bus door in a canvas of the doorway's size. `open` 0 closed .. 1 fully slid. */
export const paintDoorLeaves = (ctx: Ctx, cw: number, ch: number, open: number): void => {
  const half = cw / 2;
  const slide = open * half * 0.9;
  const leaf = (ax: number, side: -1 | 1): void => {
    const x0 = ax;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, half, ch);
    ctx.clip();
    ctx.fillStyle = palette.navy;
    ctx.fillRect(x0, 0, half, ch);
    // halftone print on the lower panel
    for (let y = ch * 0.66; y < ch; y += 9) {
      const t = (y - ch * 0.66) / (ch * 0.34);
      ctx.fillStyle = `rgba(${CREAM},${(0.06 + 0.13 * t).toFixed(3)})`;
      for (let x = x0 + ((Math.round(y / 9) % 2) * 4.5); x < x0 + half; x += 9) {
        ctx.beginPath();
        ctx.arc(x, y, 0.9 + 1.8 * t, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // rim line, misregistered yellow plate beside it
    ctx.strokeStyle = `rgba(${YEL},0.85)`;
    ctx.lineWidth = 3;
    ctx.strokeRect(x0 + 10 - 4, 12 - 3, half - 20, ch - 24);
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = 5;
    ctx.strokeRect(x0 + 10, 12, half - 20, ch - 24);
    // tall window with halftone glass
    const wx = x0 + half * 0.2;
    const ww = half * 0.6;
    const wy = ch * 0.07;
    const wh = ch * 0.55;
    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, 16);
    ctx.fillStyle = palette.navy;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let y = wy; y < wy + wh; y += 8) {
      for (let x = wx + ((Math.round(y / 8) % 2) * 4); x < wx + ww; x += 8) {
        const t = clamp01((x - wx) / ww + (y - wy) / wh * 0.5);
        ctx.fillStyle = `rgba(${CREAM},${(0.12 + 0.3 * (side < 0 ? 1 - t : t) * 0.7).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.7 + 1.9 * (side < 0 ? 1 - t : t) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, 16);
    ctx.strokeStyle = palette.cream;
    ctx.lineWidth = 4;
    ctx.stroke();
    // kick stripe
    ctx.fillStyle = palette.moonYellow;
    ctx.fillRect(x0 + 20, ch * 0.9, half - 40, 12);
    // rubber seal on the meeting edge
    const sx = side < 0 ? x0 + half - 14 : x0 + 2;
    ctx.fillStyle = palette.cream;
    ctx.fillRect(sx, 0, 12, ch);
    ctx.fillStyle = palette.navy;
    ctx.fillRect(sx + 5, 0, 2.5, ch);
    ctx.restore();
  };
  leaf(-slide, -1);
  leaf(half + slide, 1);
};

// ---------------------------------------------------------------------------------------------------------------
// Inserts.

/** Foot in the puddle: crown + droplets flying under gravity on frames 0-8, ripples spreading in the puddle box. */
export const paintSplash = (ctx: Ctx, fi: number, splash: readonly [number, number], puddle: readonly number[], seed: string): void => {
  const [sx, sy] = splash;
  const pw = (puddle[2] as number) - (puddle[0] as number);
  // ripples
  for (let k = 0; k < 3; k++) {
    const t = fi - k * 3;
    if (t < 0) continue;
    const rx = Math.min(pw * 0.55, 40 + t * 26);
    const a = clamp01(1 - t / 15) * 0.85;
    ctx.strokeStyle = `rgba(${CREAM},${a.toFixed(3)})`;
    ctx.lineWidth = 5 - k;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 45 + k * 8, rx, Math.max(6, rx * 0.17), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // droplets: elongated along their flight, flung out of the splash and falling back under gravity
  const r = seeded(seed);
  for (let i = 0; i < 24; i++) {
    const ang = -Math.PI * (0.05 + 0.9 * r());
    const spd = 18 + r() * 34;
    const vx = Math.cos(ang) * spd;
    const vy = Math.sin(ang) * spd;
    const size = 7 + r() * 11;
    const yellow = r() < 0.4;
    if (fi > 10) continue;
    const x = sx + vx * fi * 0.85;
    const y = sy + vy * fi * 0.85 + 0.5 * 2.4 * fi * fi;
    const rad = size * (1 - fi / 13);
    if (rad <= 0.5) continue;
    const dir = Math.atan2(vy + 2.4 * fi, vx);
    ctx.fillStyle = palette.navy;
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 3, rad * 1.9 + 1.5, rad * 0.8 + 1.5, dir, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = yellow ? palette.moonYellow : palette.cream;
    ctx.beginPath();
    ctx.ellipse(x, y, rad * 1.9, rad * 0.8, dir, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Note fluttering: its free (right) strip lifts and bends a few px about the strip's fold line; a few speed streaks. */
export const paintNoteFlutter = (ctx: Ctx, f: number, note: readonly number[], seed: string): void => {
  const [x0, y0, x1, y1] = note as [number, number, number, number];
  const w = x1 - x0;
  const h = y1 - y0;
  const TL: [number, number] = [x0 + 0.005 * w, y0 + 0.14 * h];
  const TR: [number, number] = [x1 - 0.15 * w, y0 + 0.005 * h];
  const BR: [number, number] = [x1, y0 + 0.86 * h];
  const BL: [number, number] = [x0 + 0.1 * w, y1];
  const mix = (a: [number, number], b: [number, number], u: number): [number, number] => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const u = 0.74;
  const A = mix(TL, TR, u);
  const B = mix(BL, BR, u);
  const fl = (k: number): number => Math.sin(f * 0.95 + k) * 0.6 + Math.sin(f * 1.9 + k * 2) * 0.4;
  const C: [number, number] = [TR[0] + 7 * fl(0), TR[1] + 6 * fl(1.3)];
  const D: [number, number] = [BR[0] + 10 * fl(2.1), BR[1] + 5 * fl(3.4)];
  const M: [number, number] = [mix(C, D, 0.5)[0] + 6 * fl(4), mix(C, D, 0.5)[1]];
  for (const [col, o] of [['rgba(24,32,58,0.45)', 3], [palette.moonYellow, 0]] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(A[0] + o, A[1] + o);
    ctx.lineTo(C[0] + o, C[1] + o);
    ctx.quadraticCurveTo(M[0] + o, M[1] + o, D[0] + o, D[1] + o);
    ctx.lineTo(B[0] + o, B[1] + o);
    ctx.closePath();
    ctx.fill();
  }
};

/** Two cream breath puffs leaving the mouth (cluster of circles with navy shadow), at beat frames 1 and 6. */
export const paintBreath = (ctx: Ctx, fi: number, mouth: readonly [number, number], size: number): void => {
  const [mx, my] = mouth;
  [1, 6].forEach((t0, k) => {
    const t = (fi - t0) / 11;
    if (t < 0 || t > 1) return;
    const r = seeded(`run:puff:${k}`);
    const a = 1 - clamp01((t - 0.55) / 0.45);
    for (let i = 0; i < 5; i++) {
      const ang = -0.9 + r() * 1.2 + k * 0.2;
      const dist = size * (0.2 + 0.9 * t) * (0.4 + r() * 0.8);
      const rad = size * (0.08 + 0.2 * Math.sqrt(t)) * (0.7 + r() * 0.6);
      const x = mx + Math.cos(ang) * dist * 1.3 + size * 0.15;
      const y = my + Math.sin(ang) * dist * 0.7 - size * 0.1 * t;
      ctx.fillStyle = `rgba(24,32,58,${(0.35 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x + 4, y + 4, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${CREAM},${(0.92 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(24,32,58,${(0.8 * a).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
};
