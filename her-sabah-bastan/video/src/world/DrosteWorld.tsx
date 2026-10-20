// One level of the infinite zoom: the AI's white room (W) with the sticky note whose face is the monitor
// scene (M); M's screen hole shows the next level, drawn recursively. All levels read the same state, so
// anything that happens in the room (bubble, ring, pin light) happens in every nested copy at once.
import { Bubble } from './Bubble.tsx';
import { AI_OUTLINE } from './aiOutline.ts';
import { smooth } from '../math.ts';
import { AI_BOX, AI_SCALE, AI_X0, AI_Y0, BUBBLE_TIP, CURSOR, HOLE, HOLE0, KN, moonPhase, NOTE, NOTE_WIN, SH_PX, SHOLE, S, SLIT_PATCH, SW } from './droste.ts';
import { INTRO_ART } from '../style/assets.ts';
import { palette } from '../style/palette.ts';
import { plateOffset } from '../style/screenprint.tsx';
import { Squeegee } from '../motion/entranceViews.tsx';

export interface RingState {
  t: number;
  /** 0..1 grown amount (eased). */
  grow: number;
  alpha: number;
}

/** Everything that changes over time, resolved once per frame by the scene. */
export interface WorldState {
  frame: number;
  /** Camera zoom factor (e^L); with the level index it gives the raster's magnification. */
  Z: number;
  cursorOp: number;
  echoP: number;
  aiOp: number;
  floorP: number;
  moonP: number;
  paperOp: number;
  pinPulse: number;
  haloPulse: number;
  rings: RingState[];
  bubble: { startFrame: number; frames: number };
}

const MOON = { x: 1740, y: 270, r: 80 };
const FLOOR_OPACITY = 0.5;
const NOTE_BORDER = 1.6;

const Moon = ({ d, n, st }: { d: number; n: number; st: WorldState }) => {
  if (st.moonP <= 0) return null;
  const { x, y, r } = MOON;
  const shift = 2 * r * moonPhase(n);
  const off = plateOffset('wall-moon');
  return (
    <Squeegee id={`sq-moon-${d}`} p={st.moonP} axis="y" from={y - r - 10} to={y + r + 10} soft={70}>
      <defs>
        <mask id={`moon-mask-${d}`} maskUnits="userSpaceOnUse" x={x - r * 3} y={y - r * 2} width={r * 6} height={r * 4}>
          <circle cx={x} cy={y} r={r} fill="#fff" />
          <circle cx={x - shift} cy={y} r={r} fill="#000" />
        </mask>
      </defs>
      <circle cx={x} cy={y} r={r - 1} fill="none" stroke={palette.navy} strokeWidth={2.2} opacity={0.8} />
      <g transform={`translate(${off.dx} ${off.dy})`}>
        <circle cx={x} cy={y} r={r} fill={palette.moonYellow} mask={`url(#moon-mask-${d})`} />
      </g>
      {st.haloPulse > 0 && <circle cx={x} cy={y} r={r * (1.05 + 0.4 * st.haloPulse)} fill="none" stroke={palette.moonYellow} strokeWidth={5 * (1 - st.haloPulse) + 1} opacity={1 - st.haloPulse} />}
    </Squeegee>
  );
};

const Pin = ({ pulse }: { pulse: number }) => (
  <g transform={`translate(0 ${-NOTE.h / 2 + 2})`}>
    {pulse > 0 && <circle r={7 + 14 * pulse} fill="none" stroke={palette.cream} strokeWidth={2.5 * (1 - pulse) + 0.5} opacity={1 - pulse} />}
    <circle r={7} fill={palette.navy} />
    <circle cx={-2.4} cy={-2.4} r={1.9 + 1.6 * pulse} fill={palette.cream} opacity={0.35 + 0.65 * pulse} />
  </g>
);

export const Level = ({ d, n, depth, st }: { d: number; n: number; depth: number; st: WorldState }) => {
  const paperOff = plateOffset('wall-note');
  const echoOff = { dx: 5 * st.echoP, dy: 4 * st.echoP };
  // vector head/body outline takes over where the raster is magnified past ~1.5x (it is 243 px wide)
  const mag = st.Z * Math.pow(S, n) * AI_SCALE;
  const vec = smooth((mag - 1.2) / 1.3);
  return (
    <g>
      <rect width={SW} height={SH_PX} fill={palette.cream} />
      <Moon d={d} n={n} st={st} />
      {st.floorP > 0 && <rect x={AI_BOX.cx - 1700 * st.floorP} y={AI_BOX.floorY - 1.5} width={3400 * st.floorP} height={3} fill={palette.navy} opacity={FLOOR_OPACITY} />}

      <g opacity={st.aiOp}>
        <g opacity={1 - Math.min(1, Math.max(0, 2 * vec - 1))}>
          <image href={INTRO_ART.ai} x={AI_X0} y={AI_Y0} width={AI_BOX.imgW * AI_SCALE} height={AI_BOX.imgH * AI_SCALE} preserveAspectRatio="none" />
          <rect x={SLIT_PATCH.x} y={SLIT_PATCH.y} width={SLIT_PATCH.w} height={SLIT_PATCH.h} fill={SLIT_PATCH.fill} />
        </g>
        {vec > 0 && (
          <g opacity={Math.min(1, 2 * vec)} transform={`translate(${AI_X0} ${AI_Y0}) scale(${AI_SCALE})`}>
            <clipPath id={`ai-clip-${d}`}>
              <path d={AI_OUTLINE.d} clipRule="evenodd" />
            </clipPath>
            <path d={AI_OUTLINE.d} fill={SLIT_PATCH.fill} fillRule="evenodd" />
            <path d={AI_OUTLINE.d} fill="none" stroke={palette.navy} strokeWidth={AI_OUTLINE.strokePx * 2} strokeLinejoin="round" clipPath={`url(#ai-clip-${d})`} />
          </g>
        )}
      </g>
      {st.echoP > 0 && <rect x={CURSOR.x + echoOff.dx} y={CURSOR.y + echoOff.dy} width={CURSOR.w} height={CURSOR.h} fill={palette.moonYellow} opacity={st.echoP} />}
      <rect x={CURSOR.x} y={CURSOR.y} width={CURSOR.w} height={CURSOR.h} fill={palette.navy} opacity={st.cursorOp} />
      {st.rings.map((r, i) => (
        <circle key={i} cx={CURSOR.x + CURSOR.w / 2} cy={CURSOR.y + CURSOR.h / 2} r={10 + 70 * r.grow} fill="none" stroke={palette.navy} strokeWidth={3 - 2.2 * r.t} opacity={r.alpha} />
      ))}
      <Bubble frame={st.frame} startFrame={st.bubble.startFrame} frames={st.bubble.frames} x={BUBBLE_TIP.x} y={BUBBLE_TIP.y} dir={-1} text="Merhaba" />

      {/* the sticky note: yellow plate (slightly off), navy border, the monitor scene as its face */}
      <g transform={`translate(${NOTE.cx} ${NOTE.cy}) rotate(${NOTE.rotDeg})`}>
        <g transform={`translate(${paperOff.dx} ${paperOff.dy})`} opacity={st.paperOp}>
          <rect x={-NOTE.w / 2} y={-NOTE.h / 2} width={NOTE.w} height={NOTE.h} fill={palette.moonYellow} />
        </g>
        <rect x={-NOTE.w / 2} y={-NOTE.h / 2} width={NOTE.w} height={NOTE.h} fill="none" stroke={palette.navy} strokeWidth={NOTE_BORDER} />
        {[0, 1, 2].map((k) => (
          <rect key={k} x={-NOTE.w / 2 + 14} y={NOTE.h / 2 - 28 + k * 8} width={[170, 120, 146][k]} height={2.4} fill={palette.navy} opacity={0.8} />
        ))}
        <g transform={`translate(${NOTE_WIN.x} ${NOTE_WIN.y}) scale(${KN})`}>
          <defs>
            <clipPath id={`hole-${d}`}>
              <rect x={HOLE.x0 - 3} y={HOLE.y0 - 3} width={HOLE.x1 - HOLE.x0 + 6} height={HOLE.y1 - HOLE.y0 + 6} />
            </clipPath>
          </defs>
          {d < depth && (
            <g clipPath={`url(#hole-${d})`}>
              <g transform={`translate(${HOLE0.x} ${HOLE0.y}) scale(${SHOLE})`}>
                <Level d={d + 1} n={n + 1} depth={depth} st={st} />
              </g>
            </g>
          )}
          <image href={INTRO_ART.monitor} x={0} y={0} width={SW} height={SH_PX} preserveAspectRatio="none" />
        </g>
        <Pin pulse={st.pinPulse} />
      </g>
    </g>
  );
};
