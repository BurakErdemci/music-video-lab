import { Halftone } from '../motion/entranceViews.tsx';
import { dotP } from '../motion/entrances.ts';
import { palette } from '../style/palette.ts';
import { stripUrl } from '../style/assets.ts';
import { microMotion, poseBounds, resolveActor, STRIP_TABLE, SWITCH_FRAMES, type Action, type Pose } from './actor.ts';
import type { StripFrame, StripMeta } from './stripData.ts';

interface Props {
  frame: number;
  acts: readonly Action[];
  uid: string;
  /** Per-character phase of the breathing and weight shift. */
  phase: number;
  /** Paint over the AI's cursor slit: 0 = open, 1 = shut. */
  blink?: number;
}

/** One key pose on its foot anchor, with breathing (scaleY about the feet) and weight shift. Always the home (non-inverted) art. */
const Frame = ({ pose, frame, phase, blink = 0 }: { pose: Pose; frame: number; phase: number; blink?: number }) => {
  const meta = STRIP_TABLE[pose.strip] as StripMeta;
  const f = meta.frames[pose.k] as StripFrame;
  const s = meta.scale;
  const { breath, shiftX } = microMotion(frame, phase);
  const w = f.w * s;
  const h = f.h * s;
  const x = pose.x + (pose.moving ? 0 : shiftX);
  return (
    <g transform={`translate(${x.toFixed(2)} ${pose.y}) scale(${pose.flip ? -1 : 1} ${breath.toFixed(5)})`}>
      <image href={stripUrl(meta, f)} x={-f.ax * s} y={-h} width={w} height={h} preserveAspectRatio="none" />
      {blink > 0 && f.slit && (
        <rect x={(f.slit.x - f.ax) * s - 1} y={-h + f.slit.y * s - 1} width={f.slit.w * s + 2} height={f.slit.h * s + 2} rx={3} fill={palette.cream} opacity={blink} />
      )}
    </g>
  );
};

const union = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x: x - 12, y: y - 12, w: Math.max(a.x + a.w, b.x + b.w) - x + 24, h: Math.max(a.y + a.h, b.y + b.h) - y + 24 };
};

/**
 * A character playing its timeline of strip actions: hard cuts between key poses of one strip, a 4-frame halftone
 * switch between different strips, breathing and weight shift on top. Pure function of the frame.
 */
export const Actor = ({ frame, acts, uid, phase, blink = 0 }: Props) => {
  const st = resolveActor(acts, frame);
  if (!st) return null;
  if (!st.prev) return <Frame pose={st.cur} frame={frame} phase={phase} blink={blink} />;
  const t = st.t;
  const idx = acts.filter((a) => a.from <= frame).length;
  const box = union(poseBounds(st.cur), poseBounds(st.prev));
  const p = dotP(frame, (acts[idx - 1] as Action).from, SWITCH_FRAMES);
  return (
    <g>
      <Halftone id={`${uid}-out-${idx}`} p={1 - p} box={box} seed={`${uid}-sw${idx}`}>
        <Frame pose={st.prev} frame={frame} phase={phase} blink={blink} />
      </Halftone>
      <Halftone id={`${uid}-in-${idx}`} p={t >= 1 ? 1 : p} box={box} seed={`${uid}-sw${idx}`}>
        <Frame pose={st.cur} frame={frame} phase={phase} blink={blink} />
      </Halftone>
    </g>
  );
};
