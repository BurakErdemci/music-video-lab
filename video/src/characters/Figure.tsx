import { palette } from '../style/palette.ts';
import { poseUrl } from '../style/assets.ts';
import { SEAM_X, H, W } from '../layout.ts';
import { onTwos } from '../math.ts';
import { POSES, poseWho, type PoseId } from './poses.ts';

export type Bg = 'navy' | 'cream';

/** Which colouring reads on a background: humans are navy bodies (home = navy room), the AI is cream (home = cream room). */
export const tersFor = (pose: PoseId, bg: Bg): boolean => (poseWho(pose) === 'human' ? bg === 'cream' : bg === 'navy');

/** Last key whose frame has been reached; the pose steps on twos (12 fps). */
export const poseAt = <T extends string>(frame: number, keys: readonly (readonly [number, T])[]): T => {
  const f = onTwos(frame);
  let cur = keys[0] as readonly [number, T];
  for (const k of keys) if (f >= k[0]) cur = k;
  return cur[1];
};

interface FigProps {
  pose: PoseId;
  /** Foot anchor on the floor. */
  x: number;
  y: number;
  flip?: boolean;
  /** Extra scale on top of the pose's own (smooth moves are fine). */
  zoom?: number;
  opacity?: number;
  /** Paint over the AI's cursor slit (a blink). */
  blink?: boolean;
}

const Img = ({ pose, ters, x, y, flip = false, zoom = 1, opacity = 1, blink = false }: FigProps & { ters: boolean }) => {
  const m = POSES[pose];
  const s = m.scale * zoom;
  const w = m.w * s;
  const h = m.h * s;
  const ax = m.anchorX * w;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})${flip ? ' scale(-1 1)' : ''}`} opacity={opacity}>
      <image href={poseUrl(pose, ters)} x={-ax} y={-h} width={w} height={h} preserveAspectRatio="none" />
      {blink && m.slit && <rect x={-ax + m.slit.x * s} y={-h + m.slit.y * s} width={m.slit.w * s} height={m.slit.h * s} rx={3} fill={ters ? palette.navy : palette.cream} />}
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
  ...p
}: FigProps & { uid: string; seamX?: number; leftBg?: Bg; rightBg?: Bg }) => {
  const lt = tersFor(p.pose, leftBg);
  const rt = tersFor(p.pose, rightBg);
  if (lt === rt) return <Img {...p} ters={lt} />;
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
