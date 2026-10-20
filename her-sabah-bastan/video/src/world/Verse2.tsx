// Props and marks of 1:28.7-2:12 (verse 2, pre-chorus 2, chorus 2). Pure functions of the frame; the frames they
// start on come from events.ts, the characters from scenes/acting.ts.
import { palette } from '../style/palette.ts';
import { YellowPlate } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { clamp01, lerp } from '../math.ts';
import { FLOOR_Y, SEAM_X, W } from '../layout.ts';
import { BULB_R, CRATE_H, CRATE_TOP, CRATE_W, CRATE_XS, LAMP_Y, OVER, POST_TOP, RIM_BACK } from './verse2Geom.ts';
import { clearShift } from './glassGeom.ts';
import { drift, glide, progress } from '../motion/entrances.ts';
import { Sticky } from './Notes.tsx';

// ---- "satir satir": the notebook's lines slide across the AI side ------------------------------------------------

/** One written line of the notebook: a ruled strip of word marks that comes out of the glass and slides across the
 * AI's room to the right edge over `frames` (constant speed after a soft start). */
export const NotebookLine = ({ frame, start, frames, y, seed }: { frame: number; start: number; frames: number; y: number; seed: string }) => {
  if (frame < start || frame > start + frames) return null;
  const t = progress(frame, start, frames);
  // soft start, then steady: ease-in over the first quarter
  const u = t < 0.25 ? (t * t) / 0.5 : 0.125 + (t - 0.25) * (0.875 / 0.75);
  const len = 470;
  const x = SEAM_X - len + (W + 40 - (SEAM_X - len)) * u;
  const r = seeded(`nbline:${seed}`);
  const words: { x: number; w: number }[] = [];
  for (let wx = 0; wx < len - 30; ) {
    const w = range(r, 26, 78);
    words.push({ x: wx, w: Math.min(w, len - 30 - wx) });
    wx += w + range(r, 10, 16);
  }
  const mark = Math.floor(r() * words.length);
  const op = clamp01(progress(frame, start, 8)) * (1 - clamp01((frame - (start + frames - 8)) / 8));
  return (
    <g clipPath="url(#ai-side)" opacity={op}>
      <g transform={`translate(${x.toFixed(1)} ${y})`}>
        <rect x={-10} y={10} width={len + 20} height={2} fill={palette.navy} opacity={0.35} />
        {words.map((q, i) =>
          i === mark ? (
            <g key={i}>
              <YellowPlate k={`nbline-${seed}`}>
                <rect x={q.x - 3} y={-12} width={q.w + 6} height={16} fill={palette.moonYellow} />
              </YellowPlate>
              <rect x={q.x} y={-6} width={q.w} height={6} rx={3} fill={palette.navy} />
            </g>
          ) : (
            <rect key={i} x={q.x} y={-6} width={q.w} height={6} rx={3} fill={palette.navy} />
          ),
        )}
      </g>
    </g>
  );
};

// ---- the lamps on the crates -------------------------------------------------------------------------------------

/**
 * Six open cardboard crates with a lamp on a post at each one's back rim. The crates come in with a soft drop
 * (`inFrames`); lamp k switches on at `lamps[k]` (yellow-green, the only place that colour is used): the bulb fills,
 * a halo and four short rays grow over `lampFrames`. The crates are EMPTY: the opening shows the dark inside and
 * nothing in it, which is what the camera's pull-back reveals.
 */
export const Crates = ({ frame, start, inFrames, lamps, lampFrames, glow, glowFrames, openAt, openFrames }: { frame: number; start: number; inFrames: number; lamps: readonly number[]; lampFrames: number; glow: number; glowFrames: number; openAt: number; openFrames: number }) => {
  // one swell of every halo at `glow` (up and back down over 2 x glowFrames)
  const sw = frame < glow ? 0 : Math.sin(Math.PI * clamp01((frame - glow) / (2 * glowFrames)));
  if (frame < start) return null;
  return (
    <g>
      {CRATE_XS.map((cx, k) => {
        const d = drift(frame, start + k * 2, inFrames, { from: { x: 0, y: -26 }, bulge: 0 });
        const on = lamps[k] !== undefined && frame >= (lamps[k] as number) ? glide(frame, lamps[k] as number, lampFrames) : 0;
        const x0 = cx - CRATE_W / 2;
        const skew = 18; // the back rim sits a little to the right: the crate is seen slightly from the side and above
        const dep = CRATE_TOP - RIM_BACK;
        const op = glide(frame, openAt + k * 4, openFrames);
        return (
          <g key={k} opacity={d.op} transform={`translate(${d.ox.toFixed(1)} ${d.oy.toFixed(1)})`}>
            <ellipse cx={cx + 6} cy={FLOOR_Y + 2} rx={CRATE_W * 0.6} ry={5} fill={palette.navy} opacity={0.18} />
            {/* the post and lamp, behind the front face */}
            <rect x={cx + skew / 2 - 2.5} y={POST_TOP} width={5} height={RIM_BACK - POST_TOP + 4} fill={palette.navy} />
            {on > 0 && <circle cx={cx + skew / 2} cy={LAMP_Y} r={BULB_R + (22 + 16 * sw) * on} fill={palette.lampGreen} opacity={(0.28 + 0.2 * sw) * on} />}
            {on > 0 &&
              [0, 1, 2, 3].map((i) => {
                const a = -Math.PI / 2 + (i - 1.5) * 0.62;
                const r0 = BULB_R + 6;
                const r1 = r0 + (14 + 10 * sw) * on;
                return <line key={i} x1={cx + skew / 2 + Math.cos(a) * r0} y1={LAMP_Y + Math.sin(a) * r0} x2={cx + skew / 2 + Math.cos(a) * r1} y2={LAMP_Y + Math.sin(a) * r1} stroke={palette.navy} strokeWidth={3} strokeLinecap="round" opacity={on} />;
              })}
            <circle cx={cx + skew / 2} cy={LAMP_Y} r={BULB_R} fill={palette.cream} stroke={palette.navy} strokeWidth={3.5} />
            {on > 0 && <circle cx={cx + skew / 2} cy={LAMP_Y} r={BULB_R - 1.8} fill={palette.lampGreen} opacity={on} />}
            {/* the open top: back rim, the dark empty inside, the two open flaps. Until "hicbir" (openAt) the crates are
                shut: a taped lid covers the top (test2-v2); then, one after the other, the lids lift off and the flaps
                fold open to show nothing inside */}
            <path d={`M${x0},${CRATE_TOP} L${x0 + skew},${RIM_BACK} L${x0 + CRATE_W + skew},${RIM_BACK} L${x0 + CRATE_W},${CRATE_TOP} Z`} fill={palette.navy} stroke={palette.navy} strokeWidth={3} strokeLinejoin="round" />
            {/* the empty bottom seen through the opening: a pale floor and its back corner, nothing on it */}
            <path d={`M${x0 + 7},${CRATE_TOP - 3} L${x0 + 7 + skew * 0.55},${CRATE_TOP - 3 - dep * 0.55} L${x0 + CRATE_W - 7 + skew * 0.55},${CRATE_TOP - 3 - dep * 0.55} L${x0 + CRATE_W - 7},${CRATE_TOP - 3} Z`} fill={palette.cream} opacity={0.3} />
            <path d={`M${x0 + 7 + skew * 0.55},${CRATE_TOP - 3 - dep * 0.55} L${x0 + CRATE_W - 7 + skew * 0.55},${CRATE_TOP - 3 - dep * 0.55}`} stroke={palette.cream} strokeWidth={1.5} opacity={0.55} />
            <g opacity={op}>
            <path d={`M${x0 + skew},${RIM_BACK} L${x0 + skew - 18},${RIM_BACK - 26} L${x0 + skew + 30},${RIM_BACK - 30} L${x0 + skew + 34},${RIM_BACK} Z`} fill={palette.cream} stroke={palette.navy} strokeWidth={3} strokeLinejoin="round" />
            <path d={`M${x0 + CRATE_W},${CRATE_TOP} L${x0 + CRATE_W + 22},${CRATE_TOP - 18} L${x0 + CRATE_W + skew + 20},${RIM_BACK - 14} L${x0 + CRATE_W + skew},${RIM_BACK} Z`} fill={palette.cream} stroke={palette.navy} strokeWidth={3} strokeLinejoin="round" />
            </g>
            {op < 1 && (
              <g opacity={1 - op} transform={`translate(0 ${(-16 * op).toFixed(2)})`}>
                <path d={`M${x0},${CRATE_TOP} L${x0 + skew},${RIM_BACK} L${x0 + CRATE_W + skew},${RIM_BACK} L${x0 + CRATE_W},${CRATE_TOP} Z`} fill={palette.cream} stroke={palette.navy} strokeWidth={3} strokeLinejoin="round" />
                <path d={`M${x0 + CRATE_W / 2},${CRATE_TOP} L${x0 + CRATE_W / 2 + skew},${RIM_BACK}`} stroke={palette.moonYellow} strokeWidth={9} opacity={0.9} />
                <path d={`M${x0 + CRATE_W / 2},${CRATE_TOP} L${x0 + CRATE_W / 2 + skew},${RIM_BACK}`} stroke={palette.navy} strokeWidth={2} />
              </g>
            )}
            {/* the front face */}
            <rect x={x0} y={CRATE_TOP} width={CRATE_W} height={CRATE_H} fill={palette.cream} stroke={palette.navy} strokeWidth={3.5} strokeLinejoin="round" />
            <path d={`M${x0 + CRATE_W},${CRATE_TOP} L${x0 + CRATE_W + skew},${RIM_BACK} L${x0 + CRATE_W + skew},${FLOOR_Y - 22} L${x0 + CRATE_W},${FLOOR_Y}`} fill={palette.cream} stroke={palette.navy} strokeWidth={3} strokeLinejoin="round" />
            <rect x={x0 + CRATE_W / 2 - 16} y={CRATE_TOP + 30} width={32} height={4} rx={2} fill={palette.navy} opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
};

// ---- the torch beam ----------------------------------------------------------------------------------------------

/**
 * The beam of the human's torch: a soft moon-yellow cone from the lens to a lit spot. `grow` (0..1) runs the cone out
 * from the lens; `op` fades the whole beam. Drawn over both rooms (light keeps its colour across the glass).
 */
export const TorchBeam = ({ from, to, spot, grow, op, bright }: { from: { x: number; y: number }; to: { x: number; y: number }; spot: number; grow: number; op: number; bright: number }) => {
  if (op <= 0 || grow <= 0) return null;
  const ex = lerp(from.x, to.x, grow);
  const ey = lerp(from.y, to.y, grow);
  const dx = ex - from.x;
  const dy = ey - from.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const w0 = 7;
  const w1 = spot * grow;
  const cone = `M${from.x + nx * w0},${from.y + ny * w0} L${ex + nx * w1},${ey + ny * w1} L${ex - nx * w1},${ey - ny * w1} L${from.x - nx * w0},${from.y - ny * w0} Z`;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <g opacity={op}>
      <path d={cone} fill={palette.moonYellow} opacity={0.42} />
      <path d={`M${from.x},${from.y} L${ex},${ey}`} stroke={palette.moonYellow} strokeWidth={4} opacity={0.5} />
      {grow >= 1 && (
        <g transform={`translate(${ex} ${ey}) rotate(${ang.toFixed(1)})`}>
          <ellipse cx={0} cy={0} rx={spot * 0.42} ry={spot} fill={palette.moonYellow} opacity={0.5 + 0.25 * bright} />
          <ellipse cx={0} cy={0} rx={spot * 0.42 + 8 * bright} ry={spot + 14 * bright} fill="none" stroke={palette.moonYellow} strokeWidth={3} opacity={0.8 * bright} />
        </g>
      )}
    </g>
  );
};

// ---- chorus 2: the human's room overflows ------------------------------------------------------------------------

/** Chorus 2: two more notes every beat appear in the human's room until it overflows (`starts`: one frame per beat). */
export const OverflowNotes = ({ frame, starts, frames, clear = 0 }: { frame: number; starts: readonly number[]; frames: number; clear?: number }) => (
  <g>
    {OVER.map((n0, k) => {
      const n = { ...n0, y: n0.y + clearShift(n0.x, n0.y, (n0.kind === 'paper' ? n0.h : n0.w) / 2, clear) };
      const s = starts[Math.floor(k / 2)];
      if (s === undefined) return null;
      const st = s + (k % 2) * 4;
      if (frame < st) return null;
      const d = drift(frame, st, frames, { from: { x: -10, y: 20 }, bulge: 6 });
      const t = `translate(${(n.x + d.ox).toFixed(1)} ${(n.y + d.oy).toFixed(1)}) rotate(${n.rot.toFixed(1)}) scale(${d.s.toFixed(4)})`;
      return n.kind === 'paper' ? (
        <g key={k} transform={t} opacity={d.op}>
          <rect x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h} fill={palette.cream} stroke={palette.navy} strokeWidth={1.5} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={-n.w / 2 + 8} y={-n.h / 2 + 14 + i * 12} width={n.w - 16 - (i % 3) * 9} height={2} fill={palette.navy} />
          ))}
        </g>
      ) : (
        <g key={k} opacity={d.op}>
          <YellowPlate k={`over-${k}`}>
            <g transform={t}>
              <Sticky size={n.w} />
            </g>
          </YellowPlate>
        </g>
      );
    })}
  </g>
);
