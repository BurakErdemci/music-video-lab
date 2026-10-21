// Beat-locked pose change with an animation smear (fix round 1): over 8-12 frames at 60 fps around the
// downbeat, the old pose stretches and slides along the motion, the new pose arrives from the other side,
// they cross-fade in the middle third, ghost copies trail behind, and speed lines streak across the figure.
// Never a 1-frame pop. The particle dissolve stays for scene changes only.
import type { CameraPose } from '../camera/camera.ts';
import { project } from '../camera/camera.ts';
import { type Hex, clamp01, mixHex } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { FLOOR_Y } from '../stage/SetPlate.tsx';
import type { Placement } from './Card.tsx';

export interface SmearPlan { id: string; t: number; from: string; to: string; dir: 1 | -1; frames: number }
/** The new pose is fully in 4 frames after the downbeat; the smear starts `frames - 4` frames before it. */
const AFTER = 4;

export const smearPlan = (p: Omit<SmearPlan, 'frames'> & { frames?: number }): SmearPlan => {
  const frames = p.frames ?? 10;
  if (frames < 8 || frames > 12) throw new Error(`smear ${p.id}: ${frames} frames (allowed 8-12 at 60 fps)`);
  return { ...p, frames };
};
export const smearSpan = (s: SmearPlan): [number, number] => [s.t - (s.frames - AFTER) / 60, s.t + AFTER / 60];

const smooth = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

export interface CardDraw { card: string; opacity: number; dx: number; stretch: [number, number] }

/** The card copies to draw at t for a pose track: a list of (time, card) changes joined by smears. */
export const poseTrack = (first: string, smears: readonly SmearPlan[], t: number, height: number): CardDraw[] => {
  let card = first;
  for (const s of smears) {
    const [a, b] = smearSpan(s);
    if (t < a) break;
    if (t >= b) {
      card = s.to;
      continue;
    }
    const u = (t - a) / (b - a);
    const env = Math.sin(Math.PI * u);
    const slide = 0.28 * height;
    const fromOp = 1 - smooth(0.35, 0.65, u);
    const toOp = smooth(0.35, 0.65, u);
    const stretch: [number, number] = [1 + 0.45 * env, 1 - 0.1 * env];
    const draws: CardDraw[] = [
      { card: s.from, opacity: fromOp, dx: s.dir * slide * u, stretch },
      { card: s.to, opacity: toOp, dx: -s.dir * slide * (1 - u), stretch },
    ];
    // ghost copies trail behind the dominant pose, against the motion
    const lead = u < 0.5 ? draws[0] : draws[1];
    if (lead) {
      for (let k = 1; k <= 3; k++) {
        draws.push({ card: lead.card, opacity: (0.32 / k) * env, dx: lead.dx - s.dir * k * 0.11 * height * env, stretch });
      }
    }
    return draws;
  }
  return [{ card, opacity: 1, dx: 0, stretch: [1, 1] }];
};

/** Speed lines across the figure during a smear (graphic layer). */
export const SmearStreaks = ({ smears, t, at, pose, color }: { smears: readonly SmearPlan[]; t: number; at: Placement; pose: CameraPose; color: Hex }) => {
  const s = smears.find((x) => {
    const [a, b] = smearSpan(x);
    return t >= a && t < b;
  });
  if (!s) return null;
  const [a, b] = smearSpan(s);
  const u = (t - a) / (b - a);
  const env = Math.sin(Math.PI * u);
  const feet = at.feet ?? FLOOR_Y;
  const top = project(pose, [at.x, feet + at.height, at.z ?? 0]);
  const bottom = project(pose, [at.x, feet, at.z ?? 0]);
  const h = bottom.y - top.y;
  const r = seeded(`smear:${s.id}`);
  const lines = Array.from({ length: 16 }, () => ({ y: r.range(0.05, 0.95), len: r.range(0.25, 0.7), off: r.range(-0.35, 0.35), w: r.range(2, 7), c: r() < 0.5 ? color : mixHex(color, '#ffffff', 0.6) }));
  return (
    <g opacity={env}>
      {lines.map((l, i) => {
        const y = top.y + l.y * h;
        const cx = top.x + (l.off - s.dir * (u - 0.5) * 0.6) * h;
        const half = (l.len * h * (0.4 + env)) / 2;
        return <line key={i} x1={cx - half} y1={y} x2={cx + half} y2={y} stroke={l.c} strokeWidth={l.w} strokeLinecap="round" />;
      })}
    </g>
  );
};
