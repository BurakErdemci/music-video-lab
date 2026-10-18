// Where and when every speech bubble of 0:15-1:30 shows (pure: no react, so video/scripts/bubblecheck.mjs measures the
// same bubbles the film draws).
//
// test90-v5: the tails touched the speakers' heads (AI 18-30 s, human 72-73.5 s; the AI's tip sat INSIDE her head).
// Every tip now sits clear of the head it belongs to (bubblecheck: >= 16 px from the character's pixels on every
// frame the bubble is up). The AI's morning bubble is the same "Merhaba" every morning, but each morning it comes in
// a little differently (place, tilt, size, speed), so the calendar does not read as one copied loop.
import { ev } from '../events.ts';
import { AI_FLOOR, AI_HOME, HUMAN_BUBBLES, HUMAN_FLOOR, MORNINGS, type Morning } from '../scenes/acting.ts';
import { ENTER_FRAMES } from '../motion/entrances.ts';
import { range, seeded } from '../style/seeded.ts';

export interface BubbleSpec {
  key: string;
  text: string;
  start: number;
  /** Exit starts here (undefined: until the next wave wipes it). */
  end?: number;
  /** Frames of the drift entrance. */
  frames: number;
  /** Tail tip. */
  x: number;
  y: number;
  dir: 1 | -1;
  size: 'normal' | 'small';
  /** Tilt (deg) and scale of the whole bubble about its tip. */
  rot: number;
  scale: number;
}

/** Tip of the AI's bubble: above and to the right of her head (her head spans ~1137-1223 x, 350-440 y standing). */
export const AI_TIP = { x: AI_HOME + 62, y: AI_FLOOR - 676 };

/** The verse "Merhaba" (bar 11) and one per morning, in the frame the wave has passed her. */
export const AI_BUBBLES: readonly BubbleSpec[] = (() => {
  const out: BubbleSpec[] = [];
  const e = ev('bubble.merhaba');
  out.push({ key: 'bubble-verse', text: 'Merhaba', start: e.frame, frames: e.enter.frames, x: AI_TIP.x, y: AI_TIP.y, dir: 1, size: 'normal', rot: 0, scale: 1 });
  const last = MORNINGS.length - 1;
  for (const mm of MORNINGS as readonly Morning[]) {
    const r = seeded(`morning-bubble:${mm.id}`);
    const waveFrames = mm.kind === 'slow' ? 22 : mm.kind === 'beat' ? 11 : mm.dur;
    const born = mm.start + Math.round(waveFrames * 0.42);
    out.push({
      key: `m-${mm.id}`,
      text: 'Merhaba',
      start: born,
      end: mm.n === last || mm.kind !== 'lapse' ? born + 22 : undefined,
      frames: mm.kind === 'lapse' ? 5 + Math.floor(r() * 4) : ENTER_FRAMES.drift + Math.floor(r() * 5) - 2,
      x: AI_TIP.x + Math.round(range(r, -6, 22)),
      y: AI_TIP.y + Math.round(range(r, -26, 4)),
      dir: 1,
      size: 'normal',
      rot: Math.round(range(r, -4, 4) * 10) / 10,
      scale: Math.round(range(r, 0.93, 1.06) * 100) / 100,
    });
  }
  return out;
})();

/** The human's answers: tips placed over his head in the pose he has when each one comes (calendar decline). */
export const HUMAN_TIPS: readonly { x: number; y: number }[] = [
  { x: 836, y: HUMAN_FLOOR - 712 },
  { x: 800, y: HUMAN_FLOOR - 650 },
  { x: 800, y: HUMAN_FLOOR - 640 },
];
export const HUMAN_BUBBLE_SPECS: readonly BubbleSpec[] = HUMAN_BUBBLES.map((b, i) => ({
  key: `h-${i}`,
  text: b.text,
  start: b.start,
  end: b.end,
  frames: ENTER_FRAMES.drift,
  x: (HUMAN_TIPS[i] as { x: number; y: number }).x,
  y: (HUMAN_TIPS[i] as { x: number; y: number }).y,
  dir: -1,
  size: 'small',
  rot: 0,
  scale: 1,
}));

/** The bubble's outline as Bubble.tsx draws it (before entrance motion): tail triangle and body box, world px. */
export const bubbleGeom = (b: Pick<BubbleSpec, 'x' | 'y' | 'dir' | 'size' | 'text'>): { tail: [number, number][]; box: { x: number; y: number; w: number; h: number } } => {
  const small = b.size === 'small';
  const fs = small ? 25 : 34;
  const W = small ? Math.max(160, Math.round(b.text.length * fs * 0.6 + 40)) : 236;
  const bh = small ? 60 : 84;
  const x0 = b.dir === 1 ? b.x + 30 : b.x - 30 - W;
  const t1 = b.dir === 1 ? x0 + 14 : x0 + W - 14;
  const t2 = b.dir === 1 ? x0 + 58 : x0 + W - 58;
  const y0 = b.y - (small ? 96 : 120);
  return { tail: [[b.x, b.y], [t1, y0 + bh], [t2, y0 + bh]], box: { x: x0, y: y0, w: W, h: bh } };
};
