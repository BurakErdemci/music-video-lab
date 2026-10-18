// Props and marks of the 0:30-1:28 scenes. All are pure functions of the frame; entrances come from motion/entrances.ts.
import { PROPS } from '../style/assets.ts';
import { palette } from '../style/palette.ts';
import { YellowPlate } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { clamp01 } from '../math.ts';
import { SEAM_X } from '../layout.ts';
import { drift, fadeOut, glide, progress } from '../motion/entrances.ts';
import { dropBounce } from '../motion/extra.ts';
import { Sticky } from './Notes.tsx';

/** Yesterday's note, held at the human's hand until the first note of line 4 takes off from the same place. */
export const HeldNote = ({ frame, start, frames, end, x, y }: { frame: number; start: number; frames: number; end: number; x: number; y: number }) => {
  if (frame < start || frame >= end) return null;
  const d = drift(frame, start, frames, { from: { x: 0, y: 26 }, bulge: 6 });
  const hover = Math.sin((frame - start) * 0.18) * 2.5;
  return (
    <YellowPlate k="held-note">
      <g opacity={d.op} transform={`translate(${(x + d.ox).toFixed(1)} ${(y + d.oy + hover).toFixed(1)}) rotate(-8) scale(${d.s.toFixed(4)})`}>
        <rect x={-48} y={-48} width={96} height={96} fill="none" stroke={palette.cream} strokeWidth={4} />
        <Sticky size={88} />
      </g>
    </YellowPlate>
  );
};

/** The closed notebook dropping onto the AI's floor with a small bounce. (x, floorY) is the bottom centre. */
export const NotebookDrop = ({ frame, start, frames, x, floorY, w = 120, until }: { frame: number; start: number; frames: number; x: number; floorY: number; w?: number; until?: number }) => {
  if (frame < start) return null;
  const h = w * (724 / 915);
  const b = dropBounce(frame, start, frames, 420);
  const fade = until !== undefined && frame >= until ? fadeOut(frame, until, 8) : 1;
  if (fade <= 0) return null;
  return (
    <g opacity={b.op * fade} transform={`translate(${x} ${(floorY + b.oy).toFixed(1)}) rotate(${b.rot.toFixed(2)})`}>
      <ellipse cx={0} cy={0} rx={w * 0.5} ry={5} fill={palette.navy} opacity={0.18 * (1 + b.oy / 420)} />
      <image href={PROPS.notebookClosed} x={-w / 2} y={-h + 4} width={w} height={h} preserveAspectRatio="none" />
    </g>
  );
};

/** The open notebook the AI reads: it hangs to the right of her, its pages carry the three sketches. */
export const OpenBook = ({ frame, start, frames, cx, cy, w = 560 }: { frame: number; start: number; frames: number; cx: number; cy: number; w?: number }) => {
  if (frame < start) return null;
  const h = w * (796 / 1399);
  const d = drift(frame, start, frames, { from: { x: 30, y: 24 }, bulge: 10 });
  return (
    <g opacity={d.op} transform={`translate(${(cx + d.ox).toFixed(1)} ${(cy + d.oy).toFixed(1)}) scale(${d.s.toFixed(4)})`}>
      <image href={PROPS.notebookOpen} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="none" />
    </g>
  );
};

export type SketchKind = 'tag' | 'road' | 'cross';
const bar = (x: number, y: number, w: number, fill: string = palette.navy, h = 5) => <rect x={x} y={y} width={w} height={h} rx={1.5} fill={fill} />;

/** A small page sketch card (a name tag, a road, a crossed-out line) in the palette. */
export const PageSketch = ({ kind, frame, start, frames, x, y, rot }: { kind: SketchKind; frame: number; start: number; frames: number; x: number; y: number; rot: number }) => {
  if (frame < start) return null;
  const d = drift(frame, start, frames, { from: { x: 0, y: 24 }, bulge: 8 });
  const W = 168;
  const H = 128;
  return (
    <g opacity={d.op} transform={`translate(${(x + d.ox).toFixed(1)} ${(y + d.oy).toFixed(1)}) rotate(${rot}) scale(${d.s.toFixed(4)})`}>
      <YellowPlate k={`sketch-${kind}`}>
        <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={palette.moonYellow} />
      </YellowPlate>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={palette.cream} stroke={palette.navy} strokeWidth={3} />
      {kind === 'tag' && (
        <g>
          <path d="M-52,-34 Q-30,-70 0,-46" fill="none" stroke={palette.navy} strokeWidth={3} />
          <path d="M-46,-26 L38,-26 L54,-6 L38,16 L-46,16 Z" fill={palette.moonYellow} stroke={palette.navy} strokeWidth={3.5} strokeLinejoin="round" />
          <circle cx={-32} cy={-5} r={6} fill={palette.cream} stroke={palette.navy} strokeWidth={3} />
          {bar(-16, -14, 44)}
          {bar(-16, -2, 30)}
          {bar(-50, 34, 98)}
          {bar(-50, 46, 64)}
        </g>
      )}
      {kind === 'road' && (
        <g>
          <path d="M-62,44 C-30,40 -52,-2 -8,0 C30,2 6,-36 52,-40" fill="none" stroke={palette.navy} strokeWidth={13} strokeLinecap="round" />
          <path d="M-62,44 C-30,40 -52,-2 -8,0 C30,2 6,-36 52,-40" fill="none" stroke={palette.moonYellow} strokeWidth={3.5} strokeDasharray="9 8" />
          <path d="M52,-40 L52,-62 L72,-55 L52,-48" fill={palette.navy} stroke={palette.navy} strokeWidth={2.5} strokeLinejoin="round" />
        </g>
      )}
      {kind === 'cross' && (
        <g>
          {bar(-62, -40, 90)}
          {bar(-62, -8, 118, palette.moonYellow, 14)}
          {bar(-62, -4, 118, palette.navy, 5)}
          <path d="M-66,-14 C-30,-2 10,-18 60,-2 M-64,-2 C-30,-16 18,0 62,-16" fill="none" stroke={palette.navy} strokeWidth={4.5} strokeLinecap="round" />
          {bar(-62, 32, 70)}
        </g>
      )}
    </g>
  );
};

/** The small yellow check near the AI: draws on, then fades. */
export const Check = ({ frame, start, frames, endFrame, endFrames, x, y }: { frame: number; start: number; frames: number; endFrame: number; endFrames: number; x: number; y: number }) => {
  if (frame < start || frame >= endFrame + endFrames) return null;
  const t = glide(frame, start, frames);
  const out = frame >= endFrame ? fadeOut(frame, endFrame, endFrames) : 1;
  const L = 100;
  const path = 'M-24,2 L-8,22 L28,-24';
  return (
    <g opacity={out} transform={`translate(${x} ${y}) rotate(-6)`}>
      <path d={path} fill="none" stroke={palette.navy} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L * t} ${L}`} />
      <YellowPlate k="check">
        <path d={path} fill="none" stroke={palette.moonYellow} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L * t} ${L}`} />
      </YellowPlate>
    </g>
  );
};

const GROUPS_PER_ROW = 4;
const GROUP_W = 104;
const GROUP_H = 92;
/** Geometry of mark k of the board (prison tally: four strokes, the fifth crosses them). */
const markSpec = (k: number) => {
  const g = Math.floor(k / 5);
  const i = k % 5;
  const ox = (g % GROUPS_PER_ROW) * GROUP_W;
  const oy = Math.floor(g / GROUPS_PER_ROW) * GROUP_H;
  const r = seeded(`tally:${k}`);
  if (i < 4) {
    const x = ox + i * 19 + range(r, -1.5, 1.5);
    return { x1: x, y1: oy + range(r, -1, 2), x2: x + range(r, -3, 3), y2: oy + 66 + range(r, -2, 2) };
  }
  return { x1: ox - 9, y1: oy + 58 + range(r, -2, 2), x2: ox + 76, y2: oy + 6 + range(r, -2, 2) };
};

/** A paper day-count taped to the human's wall; one stroke is inked per beat (no digits). `starts` holds each mark's frame. */
export const TallyBoard = ({ frame, starts, frames, x, y }: { frame: number; starts: readonly number[]; frames: number; x: number; y: number }) => {
  const W = 470;
  const H = 260;
  const first = starts[0];
  if (first === undefined || frame < first) return null;
  const d = drift(frame, first, 12, { from: { x: 0, y: 18 }, bulge: 4 });
  return (
    <g opacity={d.op} transform={`translate(${x + W / 2 + d.ox} ${y + H / 2 + d.oy}) rotate(-1.5) scale(${d.s.toFixed(4)}) translate(${-W / 2} ${-H / 2})`}>
      <YellowPlate k="tally-board">
        <rect x={6} y={6} width={W} height={H} fill={palette.moonYellow} />
      </YellowPlate>
      <rect width={W} height={H} fill={palette.cream} />
      <rect x={0} y={0} width={W} height={34} fill={palette.navy} opacity={0.9} />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={26 + i * 62} y={11} width={36} height={12} rx={2} fill={palette.cream} />
      ))}
      <g transform="translate(46 70)" stroke={palette.navy} strokeWidth={5.5} strokeLinecap="round" fill="none">
        {starts.map((s, k) => {
          if (frame < s) return null;
          const t = clamp01(progress(frame, s, frames));
          const m = markSpec(k);
          const e = 1 - Math.pow(1 - t, 3);
          return <line key={k} x1={m.x1} y1={m.y1} x2={m.x1 + (m.x2 - m.x1) * e} y2={m.y1 + (m.y2 - m.y1) * e} />;
        })}
      </g>
      <rect x={W / 2 - 46} y={-14} width={92} height={26} fill={palette.moonYellow} opacity={0.9} transform="rotate(-2)" />
    </g>
  );
};

/** A ripple on the glass where two hands meet: cream rings on the human side, navy on the AI side, plus a short yellow shine. */
export const GlassRipple = ({ frame, start, frames, y }: { frame: number; start: number; frames: number; y: number }) => {
  if (frame < start) return null;
  const t = progress(frame, start, frames);
  if (frame > start + frames) return null;
  const e = 1 - Math.pow(1 - t, 3);
  const a = 1 - t;
  const rings = [0, 0.28].map((lag, i) => {
    const u = clamp01((e - lag) / (1 - lag));
    return { rx: 6 + 36 * u, ry: 12 + 120 * u, op: (1 - u) * 0.9, w: 3.5 - 2.2 * u, i };
  });
  const rays = Array.from({ length: 10 }, (_, i) => {
    const ang = (i / 10) * Math.PI * 2 + 0.3;
    const r0 = 10 + 26 * e;
    const r1 = r0 + 22 * (1 - t);
    return { x1: Math.cos(ang) * r0, y1: Math.sin(ang) * r0 * 1.7, x2: Math.cos(ang) * r1, y2: Math.sin(ang) * r1 * 1.7 };
  });
  return (
    <g transform={`translate(${SEAM_X} ${y})`}>
      <clipPath id="rip-l">
        <rect x={-300} y={-300} width={300} height={600} />
      </clipPath>
      <clipPath id="rip-r">
        <rect x={0} y={-300} width={300} height={600} />
      </clipPath>
      <rect x={-3} y={-(30 + 90 * e)} width={6} height={2 * (30 + 90 * e)} fill={palette.moonYellow} opacity={0.75 * a} />
      <g clipPath="url(#rip-l)" fill="none">
        {rings.map((r) => (
          <ellipse key={r.i} cx={0} cy={0} rx={r.rx} ry={r.ry} stroke={palette.cream} strokeWidth={r.w} opacity={r.op} />
        ))}
      </g>
      <g clipPath="url(#rip-r)" fill="none">
        {rings.map((r) => (
          <ellipse key={r.i} cx={0} cy={0} rx={r.rx} ry={r.ry} stroke={palette.navy} strokeWidth={r.w} opacity={r.op} />
        ))}
      </g>
      <g stroke={palette.moonYellow} strokeWidth={3} strokeLinecap="round" opacity={a}>
        {rays.map((l, i) => (
          <line key={i} {...l} />
        ))}
      </g>
    </g>
  );
};
