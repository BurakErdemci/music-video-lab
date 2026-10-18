import { palette } from '../style/palette.ts';
import { TEXT_FONT } from '../style/fonts.ts';
import { drift, driftOut, ENTER_FRAMES } from '../motion/entrances.ts';

interface Props {
  frame: number;
  startFrame: number;
  /** Tip of the tail (where the speaker is). */
  x: number;
  y: number;
  text?: string;
  /** At `frame` the text crossfades into `text` over `frames` (before it, `from` is shown). */
  swap?: { frame: number; from: string; frames: number };
  /** Exit starts at this frame (optional). */
  endFrame?: number;
  /** Frames of the drift entrance (read from the event). */
  frames?: number;
  /** 1 = body up and to the right of the tip, -1 = up and to the left. */
  dir?: 1 | -1;
  /** 'small': the human's story bubbles (quiet face, smaller, wide enough for its text). */
  size?: 'normal' | 'small';
}

const EXIT_FRAMES = 8;

/** The small speech bubble: cream with a navy keyline so it reads on both rooms. Drifts in from the tail tip. */
export const Bubble = ({ frame, startFrame, x, y, text = 'Merhaba', swap, endFrame, frames = ENTER_FRAMES.drift, dir = 1, size = 'normal' }: Props) => {
  if (frame < startFrame) return null;
  if (endFrame !== undefined && frame >= endFrame + EXIT_FRAMES) return null;
  const d = drift(frame, startFrame, frames, { from: { x: dir * 6, y: 10 }, bulge: 5 });
  let scale = d.s;
  let op = d.op;
  if (endFrame !== undefined && frame >= endFrame) {
    const o = driftOut(frame, endFrame, EXIT_FRAMES);
    scale = o.s;
    op = o.op;
  }
  const small = size === 'small';
  const fs = small ? 25 : 34;
  const W = small ? Math.max(160, Math.round(text.length * fs * 0.6 + 40)) : 236;
  const bh = small ? 60 : 84;
  const x0 = dir === 1 ? x + 30 : x - 30 - W;
  const t1 = dir === 1 ? x0 + 14 : x0 + W - 14;
  const t2 = dir === 1 ? x0 + 58 : x0 + W - 58;
  const y0 = y - (small ? 96 : 120);
  const swapT = swap ? Math.min(1, Math.max(0, (frame - swap.frame + 1) / swap.frames)) : 1;
  const label = (str: string, o: number) =>
    o <= 0 ? null : (
      <text x={x0 + W / 2} y={y0 + bh / 2 + fs * 0.35} textAnchor="middle" fontFamily={TEXT_FONT} fontWeight={500} fontSize={fs} fill={palette.navy} opacity={o}>
        {str}
      </text>
    );
  return (
    <g opacity={op} transform={`translate(${(x + d.ox).toFixed(1)} ${(y + d.oy).toFixed(1)}) scale(${scale.toFixed(4)}) translate(${-x} ${-y})`}>
      <polygon points={`${x},${y} ${t1},${y0 + bh} ${t2},${y0 + bh}`} fill={palette.cream} stroke={palette.navy} strokeWidth={4} strokeLinejoin="round" />
      <rect x={x0} y={y0} width={W} height={bh} rx={small ? 16 : 22} fill={palette.cream} stroke={palette.navy} strokeWidth={4} />
      <rect x={Math.min(t1, t2) + 3} y={y0 + bh - 4} width={Math.abs(t2 - t1) - 6} height={8} fill={palette.cream} />
      {swap && swapT < 1 && label(swap.from, 1 - swapT)}
      {label(text, swap ? swapT : 1)}
    </g>
  );
};
