// The human's desk as a room prop (see DeskProp). Shared by the film (Test30Scene) and the jump check (CharMaskScene).
import { frameScale, resolveActor, STRIP_TABLE } from '../characters/actor.ts';
import type { StripMeta } from '../characters/stripData.ts';
import { DESK_X, HUMAN, HUMAN_FLOOR } from '../scenes/acting.ts';
import { stripUrl } from '../style/assets.ts';
import { CHAIR_SHIFT, DESK_SPLIT, DESK_SX } from './deskGeom.ts';

/**
 * The desk, chair and laptop without the human (stil/hareket/MASA-dekor.png), on the same desk leg as the desk
 * strips. It is drawn while the human is NOT in a desk drawing (H01/H15/H17 carry their own desk), so the
 * furniture stays in the room when he gets up instead of vanishing with the drawing. Placement: world/deskGeom.ts.
 */
const DESK_META = STRIP_TABLE.DESK as StripMeta;
const DESK_FRAME = DESK_META.frames[0] as StripMeta['frames'][number];
const DESK_S = frameScale(DESK_META, DESK_FRAME);
export const DeskProp = () => {
  const w = DESK_FRAME.w * DESK_S;
  const h = DESK_FRAME.h * DESK_S;
  const x = DESK_X - DESK_FRAME.ax * DESK_S;
  const y = HUMAN_FLOOR - h;
  const split = x + DESK_SPLIT * DESK_S;
  const href = stripUrl(DESK_META, DESK_FRAME);
  return (
    <g>
      <defs>
        <clipPath id="desk-chair">
          <rect x={x - 10 + CHAIR_SHIFT} y={y - 10} width={split - x + 10} height={h + 20} />
        </clipPath>
        <clipPath id="desk-table">
          <rect x={DESK_X - (DESK_X - split) * DESK_SX} y={y - 10} width={w} height={h + 20} />
        </clipPath>
      </defs>
      <g clipPath="url(#desk-chair)">
        <image href={href} x={x + CHAIR_SHIFT} y={y} width={w} height={h} preserveAspectRatio="none" />
      </g>
      <g clipPath="url(#desk-table)">
        <g transform={`translate(${DESK_X} 0) scale(${DESK_SX} 1) translate(${-DESK_X} 0)`}>
          <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="none" />
        </g>
      </g>
    </g>
  );
};
const isDeskStrip = (strip: string): boolean => (STRIP_TABLE[strip] as StripMeta | undefined)?.desk === true;
/** Is the human's own drawing drawn with the desk at this frame? A morph with a desk drawing at either end carries
 * the furniture itself (the other end is rendered over the prop, scripts/tween-pairs.mjs). */
export const humanHasDesk = (frame: number): boolean => {
  const st = resolveActor(HUMAN, frame);
  if (!st) return true;
  if (st.tween) {
    const [a, b] = st.tween.key.split('_');
    return isDeskStrip((a as string).split('.')[0] as string) || isDeskStrip((b as string).split('.')[0] as string);
  }
  return isDeskStrip(st.cur.strip);
};

