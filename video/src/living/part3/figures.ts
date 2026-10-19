// Part3 character helpers: the AI drawn as body + blinking cursor eye (as part1's aiLayers), recoloured crops for
// the hand inversion and the reflections, and extra notes stuck on him.
import { palette } from '../../style/palette.ts';
import { seeded } from '../../style/seeded.ts';
import { blink, LIFT_PAD, paintCharacter, type BreathOpts } from '../life.ts';
import { getImg, sec, sp, url, type Layer, type Rect } from './common.ts';

export const AI_BREATH: BreathOpts = { top: 0.12, hip: 0.5, amp: 0.006, period: 4.2, phase: 0.35 };
export const HUMAN_BREATH: BreathOpts = { top: 0.16, hip: 0.52, amp: 0.01, period: 3.8, phase: 0.1 };

const breathLift = (t: number, h: number, b: BreathOpts): number => b.amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t / b.period + b.phase))) * (b.hip - b.top) * h;

/** The AI: breathing body (-noeye) + its cursor eye that blinks and rides the breath. `r` is the sprite's rect
 * WITHOUT the lift pad (the body layer adds it). */
export const aiLayers = (
  id: string,
  name: string,
  r: Rect,
  d: number,
  f: number,
  o: { blinks?: readonly number[]; rot?: number; pivot?: readonly [number, number]; opacity?: number; still?: boolean; breath?: BreathOpts } = {},
): Layer[] => {
  const m = sp(name);
  const t = sec(f);
  const s = r.w / m.w;
  const breath = o.breath ?? AI_BREATH;
  const out: Layer[] = [
    o.still
      ? { id, src: { kind: 'image', url: url(`${name}-noeye`) }, d, ...r, rot: o.rot, pivot: o.pivot, opacity: o.opacity }
      : {
          id,
          src: { kind: 'canvas', key: `${id}:${name}`, cw: m.w, ch: m.h + LIFT_PAD, paint: (ctx, cw, ch) => paintCharacter(ctx, cw, ch, getImg(url(`${name}-noeye`)), { t, breath }) },
          d,
          x: r.x,
          y: r.y - LIFT_PAD * s,
          w: r.w,
          h: r.h + LIFT_PAD * s,
          rot: o.rot,
          pivot: o.pivot,
          opacity: o.opacity,
        },
  ];
  const eye = m.eye;
  if (eye) {
    const sy = blink(f, o.blinks ?? []);
    const ex = (eye[0] as number) - 2;
    const ey = (eye[1] as number) - 2;
    const ew = (eye[2] as number) + 4;
    const eh = (eye[3] as number) + 4;
    const up = o.still ? 0 : breathLift(t, m.h, breath) * s;
    const cy = r.y + (ey + eh / 2) * s - up;
    out.push({ id: `${id}-eye`, src: { kind: 'image', url: url(`${name}-eye`) }, d, x: r.x + ex * s, y: cy - (eh * s * sy) / 2, w: ew * s, h: eh * s * sy, rot: o.rot, pivot: o.pivot, opacity: o.opacity });
  }
  return out;
};

// ---------------------------------------------------------------------------------------------------------------
// Recoloured sprites (cached): navy <-> cream swap for the crossing hint, and a flat navy silhouette.

const cache = new Map<string, HTMLCanvasElement>();
const mk = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
const hex = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const NAVY = hex(palette.navy);
const CREAM = hex(palette.cream);
const YEL = hex(palette.moonYellow);

/** The sprite with navy and cream exchanged (by lightness: dark -> cream, light -> navy; yellow stays yellow). */
export const invertedSprite = (name: string): HTMLCanvasElement => {
  const key = `inv:${name}`;
  let c = cache.get(key);
  if (c) return c;
  const img = getImg(url(name));
  c = mk(img.naturalWidth, img.naturalHeight);
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, c.width, c.height);
  const p = im.data;
  for (let i = 0; i < p.length; i += 4) {
    if ((p[i + 3] as number) < 8) continue;
    const r = p[i] as number;
    const g = p[i + 1] as number;
    const b = p[i + 2] as number;
    // yellow (notes): r, g high, b low -> keep
    if (r > 170 && g > 150 && b < 140) continue;
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // light 1 -> navy, dark 0 -> cream (linear between)
    p[i] = Math.round(CREAM[0] + (NAVY[0] - CREAM[0]) * l);
    p[i + 1] = Math.round(CREAM[1] + (NAVY[1] - CREAM[1]) * l);
    p[i + 2] = Math.round(CREAM[2] + (NAVY[2] - CREAM[2]) * l);
  }
  ctx.putImageData(im, 0, 0);
  cache.set(key, c);
  return c;
};

/** The sprite as one flat colour (keeps alpha), e.g. her arm turned navy past the glass. */
export const tintedSprite = (name: string, color: string): HTMLCanvasElement => {
  const key = `tint:${name}:${color}`;
  let c = cache.get(key);
  if (c) return c;
  const img = getImg(url(name));
  c = mk(img.naturalWidth, img.naturalHeight);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  cache.set(key, c);
  return c;
};

// ---------------------------------------------------------------------------------------------------------------
// Notes.

/** A yellow sticky note with three handwriting lines (part1's paintNote look). */
export const paintNote = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, seed: string, alpha = 1): void => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.fillStyle = 'rgba(24,32,58,0.3)';
  ctx.fillRect(-s / 2 + s * 0.06, -s / 2 + s * 0.08, s, s);
  ctx.fillStyle = palette.moonYellow;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  const r = seeded(seed);
  for (let i = 0; i < 3; i++) {
    const yy = -s * 0.22 + i * s * 0.18;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, yy);
    for (let k = 1; k <= 5; k++) ctx.lineTo(-s * 0.3 + (k * s * (0.55 - (i === 2 ? 0.2 : 0))) / 5, yy + (r() - 0.5) * s * 0.06);
    ctx.stroke();
  }
  // the pin
  ctx.fillStyle = palette.cream;
  ctx.fillRect(-s * 0.05, -s * 0.58, s * 0.1, s * 0.14);
  ctx.strokeRect(-s * 0.05, -s * 0.58, s * 0.1, s * 0.14);
  ctx.restore();
};

export { YEL };
