import { palette } from '../style/palette.ts';
import { TEXT_FONT } from '../style/fonts.ts';
import { onTwos } from '../math.ts';

interface Props {
  frame: number;
  startFrame: number;
  /** Tip of the tail (where the speaker is). */
  x: number;
  y: number;
  text?: string;
  /** Pop-out starts at this frame (optional). */
  endFrame?: number;
  /** 1 = body up and to the right of the tip, -1 = up and to the left. */
  dir?: 1 | -1;
}

// Pops on twos: 12 fps steps, scale around the tail tip.
const POP = [0.55, 1.1, 1];

/** The small speech bubble: cream with a navy keyline so it reads on both rooms. */
export const Bubble = ({ frame, startFrame, x, y, text = 'Merhaba', endFrame, dir = 1 }: Props) => {
  if (frame < startFrame) return null;
  if (endFrame !== undefined && frame >= endFrame + 4) return null;
  const inStep = Math.floor((onTwos(frame) - onTwos(startFrame)) / 2);
  let scale = POP[Math.min(inStep, POP.length - 1)] as number;
  if (endFrame !== undefined && frame >= endFrame) scale = 0.6;
  const W = 236;
  const x0 = dir === 1 ? x + 30 : x - 30 - W;
  const t1 = dir === 1 ? x0 + 14 : x0 + W - 14;
  const t2 = dir === 1 ? x0 + 58 : x0 + W - 58;
  const y0 = y - 120;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`}>
      <polygon points={`${x},${y} ${t1},${y0 + 84} ${t2},${y0 + 84}`} fill={palette.cream} stroke={palette.navy} strokeWidth={4} strokeLinejoin="round" />
      <rect x={x0} y={y0} width={W} height={84} rx={22} fill={palette.cream} stroke={palette.navy} strokeWidth={4} />
      <rect x={Math.min(t1, t2) + 3} y={y0 + 80} width={Math.abs(t2 - t1) - 6} height={8} fill={palette.cream} />
      <text x={x0 + W / 2} y={y0 + 54} textAnchor="middle" fontFamily={TEXT_FONT} fontWeight={500} fontSize={34} fill={palette.navy}>
        {text}
      </text>
    </g>
  );
};
