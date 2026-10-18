import { palette } from '../style/palette.ts';
import { POSE_BLEND_FRAMES, type Box } from '../motion/entrances.ts';
import { WipeMask } from '../motion/entranceViews.tsx';
import { poseUrl } from '../style/assets.ts';
import { SEAM_X, H, W } from '../layout.ts';
import { POSES, poseWho, type PoseId } from './poses.ts';

export type Bg = 'navy' | 'cream';

/** Which colouring reads on a background: humans are navy bodies (home = navy room), the AI is cream (home = cream room). */
export const tersFor = (pose: PoseId, bg: Bg): boolean => (poseWho(pose) === 'human' ? bg === 'cream' : bg === 'navy');

interface FigProps {
  pose: PoseId;
  /** Foot anchor on the floor. */
  x: number;
  y: number;
  flip?: boolean;
  /** Extra scale on top of the pose's own (smooth moves are fine). */
  zoom?: number;
  opacity?: number;
  /** Paint over the AI's cursor slit: 0 = open, 1 = shut (a blink eases between them). */
  blink?: number;
}

const Img = ({ pose, ters, x, y, flip = false, zoom = 1, opacity = 1, blink = 0 }: FigProps & { ters: boolean }) => {
  const m = POSES[pose];
  const s = m.scale * zoom;
  const w = m.w * s;
  const h = m.h * s;
  const ax = m.anchorX * w;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})${flip ? ' scale(-1 1)' : ''}`} opacity={opacity}>
      <image href={poseUrl(pose, ters)} x={-ax} y={-h} width={w} height={h} preserveAspectRatio="none" />
      {blink > 0 && m.slit && <rect x={-ax + m.slit.x * s} y={-h + m.slit.y * s} width={m.slit.w * s} height={m.slit.h * s} rx={3} fill={ters ? palette.navy : palette.cream} opacity={blink} />}
    </g>
  );
};

/** A pose cut-out standing on (x, y), in the colouring of the room it stands in. */
export const Figure = ({ bg, ...p }: FigProps & { bg?: Bg }) => {
  const own: Bg = poseWho(p.pose) === 'human' ? 'navy' : 'cream';
  return <Img {...p} ters={tersFor(p.pose, bg ?? own)} />;
};

/**
 * A figure cut at a vertical line: the part left of `seamX` is drawn in the colouring for `leftBg`,
 * the part right of it for `rightBg`. Defaults: the glass seam, navy room left, cream room right,
 * so a human crossing right keeps a navy body on the left and turns cream past the glass.
 * The reveal wipe uses leftBg="cream", rightBg="navy" with a moving seamX.
 */
export const CrossingFigure = ({
  uid,
  seamX = SEAM_X,
  leftBg = 'navy',
  rightBg = 'cream',
  soft = 0,
  ...p
}: FigProps & { uid: string; seamX?: number; leftBg?: Bg; rightBg?: Bg; soft?: number }) => {
  const lt = tersFor(p.pose, leftBg);
  const rt = tersFor(p.pose, rightBg);
  if (lt === rt) return <Img {...p} ters={lt} />;
  if (soft > 0) {
    // the colour swap follows a soft wipe edge: fully left colouring until seamX - soft, fully right from seamX
    const from = seamX - soft;
    return (
      <g>
        <defs>
          <WipeMask id={`${uid}-ml`} p={1} axis="x" from={from} to={from} soft={soft} invert />
          <WipeMask id={`${uid}-mr`} p={1} axis="x" from={from} to={from} soft={soft} />
        </defs>
        <g mask={`url(#${uid}-ml)`}>
          <Img {...p} ters={lt} />
        </g>
        <g mask={`url(#${uid}-mr)`}>
          <Img {...p} ters={rt} />
        </g>
      </g>
    );
  }
  return (
    <g>
      <clipPath id={`${uid}-l`}>
        <rect x={-W} y={0} width={W + seamX} height={H} />
      </clipPath>
      <clipPath id={`${uid}-r`}>
        <rect x={seamX} y={0} width={W * 2} height={H} />
      </clipPath>
      <g clipPath={`url(#${uid}-l)`}>
        <Img {...p} ters={lt} />
      </g>
      <g clipPath={`url(#${uid}-r)`}>
        <Img {...p} ters={rt} />
      </g>
    </g>
  );
};

/** Bounding box of a pose standing on (x, y); the halftone screen covers it. */
export const poseBox = (pose: PoseId, x: number, y: number, zoom = 1): Box => {
  const m = POSES[pose];
  const s = m.scale * zoom;
  const w = m.w * s;
  const h = m.h * s;
  return { x: x - m.anchorX * w, y: y - h, w, h };
};

/** Pose keys switch on twos (12 fps); the frame a pose takes over, rounded up to an even frame. */
const takeOver = (k: number): number => k + (k % 2);

/**
 * A figure whose pose changes over time. Poses stay on twos but never hard-cut: when the pose
 * switches, the old one dissolves into the new one over POSE_BLEND_FRAMES.
 */
export const PoseFigure = ({
  frame,
  keys,
  uid,
  seamX,
  leftBg,
  rightBg,
  soft,
  ...p
}: Omit<FigProps, 'pose'> & { frame: number; keys: readonly (readonly [number, PoseId])[]; uid: string; seamX?: number; leftBg?: Bg; rightBg?: Bg; soft?: number }) => {
  let cur = 0;
  keys.forEach((k, i) => {
    if (frame >= takeOver(k[0])) cur = i;
  });
  const now = keys[cur] as readonly [number, PoseId];
  const t = cur === 0 ? 1 : Math.min(1, (frame - takeOver(now[0]) + 1) / POSE_BLEND_FRAMES);
  const base = p.opacity ?? 1;
  const draw = (pose: PoseId, id: string, opacity: number) => <CrossingFigure key={id} uid={id} pose={pose} seamX={seamX} leftBg={leftBg} rightBg={rightBg} soft={soft} {...p} opacity={opacity} />;
  if (t >= 1) return draw(now[1], `${uid}-n`, base);
  const prev = keys[cur - 1] as readonly [number, PoseId];
  return (
    <g>
      {draw(prev[1], `${uid}-p`, base * (1 - t))}
      {draw(now[1], `${uid}-n`, base * t)}
    </g>
  );
};
