// Neon chalk scribbles tracing a card's silhouette (architecture.md "scribble/"). The outline comes OFFLINE
// from tools/card_outline.py. Draw-on with stroke-dashoffset; every 4 frames at 60 fps the jitter is
// re-seeded (a deliberate boil). Seeded stars and zigzags sit around the figure, as in the approved F5 look.
// Positions follow the 3D card exactly: the same living-still numbers and the camera projection.
import { type CameraPose, project } from '../camera/camera.ts';
import { type Placement, alive } from '../cards/Card.tsx';
import { OUTLINES } from '../cards/outlines.ts';
import { type Hex, mixHex, outQuad, ramp } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { FLOOR_Y } from '../stage/SetPlate.tsx';
import { GLOW } from '../type/Svg.tsx';

export interface ScribbleSpec {
  id: string;
  card: string;
  at: Placement;
  t0: number;
  /** Seconds the outline takes to draw on. */
  draw: number;
  t1: number;
  color: Hex;
  stars?: number;
  seed?: number;
  /** Extra vertical offset of the card (drops), world units, as a function of t. */
  dy?: (t: number) => number;
}

const BOIL_FRAMES = 4;
type Pt = [number, number];

const pathOf = (pts: readonly Pt[], closed: boolean): string =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + (closed ? ' Z' : '');
const lengthOf = (pts: readonly Pt[], closed: boolean): number => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot((pts[i] as Pt)[0] - (pts[i - 1] as Pt)[0], (pts[i] as Pt)[1] - (pts[i - 1] as Pt)[1]);
  if (closed && pts.length > 1) l += Math.hypot((pts[0] as Pt)[0] - (pts.at(-1) as Pt)[0], (pts[0] as Pt)[1] - (pts.at(-1) as Pt)[1]);
  return l;
};
const jitter = (pts: readonly Pt[], key: string, amp: number): Pt[] => {
  const r = seeded(key);
  return pts.map((p) => [p[0] + r.range(-amp, amp), p[1] + r.range(-amp, amp)]);
};
const star = (cx: number, cy: number, r: number, rot: number): Pt[] =>
  Array.from({ length: 6 }, (_, k) => {
    const a = rot + (k * 4 * Math.PI) / 5 - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });

/** Draws the dash-on of one polyline with glow layers. */
const Stroke = ({ pts, closed, p, color, width, glow }: { pts: Pt[]; closed: boolean; p: number; color: Hex; width: number; glow: boolean }) => {
  const L = lengthOf(pts, closed);
  const d = pathOf(pts, closed);
  const dash = { strokeDasharray: `${L} ${L}`, strokeDashoffset: L * (1 - p) };
  return (
    <>
      {glow && GLOW.slice(0, 2).map((g, k) => <path key={k} d={d} fill="none" stroke={color} strokeOpacity={g.o} strokeWidth={width * g.w * 30} strokeLinecap="round" strokeLinejoin="round" {...dash} />)}
      <path d={d} fill="none" stroke={mixHex(color, '#ffffff', glow ? 0.35 : 0.1)} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" {...dash} />
    </>
  );
};

export const Scribble = ({ spec, t, pose }: { spec: ScribbleSpec; t: number; pose: CameraPose }) => {
  if (t < spec.t0 || t >= spec.t1) return null;
  const o = OUTLINES[spec.card];
  if (!o) throw new Error(`scribble ${spec.id}: no outline for ${spec.card}`);
  const a = alive(spec.card, t, spec.seed ?? 0);
  const h = spec.at.height * a.scale;
  const feet = (spec.at.feet ?? FLOOR_Y) + a.bob + (spec.dy?.(t) ?? 0);
  const z = spec.at.z ?? 0;
  const toScreen = (x: number, y: number): Pt => {
    // 4 % outside the silhouette so the chalk traces around the figure, not over it
    const p = project(pose, [spec.at.x + x * h * 1.04, feet + h / 2 + y * h * 1.04, z]);
    return [p.x, p.y];
  };
  const step = Math.floor((t * 60) / BOIL_FRAMES);
  const p = outQuad(ramp(t, spec.t0, spec.draw));
  const fade = 1 - ramp(t, spec.t1 - 0.12, 0.12);
  const loops = o.polylines.map((pl) => Array.from({ length: pl.length / 2 }, (_, i) => toScreen(pl[i * 2] as number, pl[i * 2 + 1] as number)));
  const top = toScreen(0, 0.5);
  const bottom = toScreen(0, -0.5);
  const hp = bottom[1] - top[1];
  const r0 = seeded(`scribble-deco:${spec.id}`);
  const decos = Array.from({ length: spec.stars ?? 3 }, (_, k) => {
    const side = k % 2 ? 1 : -1;
    const cx = top[0] + side * hp * r0.range(0.28, 0.48);
    const cy = top[1] + hp * r0.range(0.08, 0.7);
    const kind = r0() < 0.6 ? 'star' : 'zig';
    const size = hp * r0.range(0.04, 0.075);
    const rot = r0.range(0, Math.PI);
    const start = r0.range(0.3, 0.7);
    if (kind === 'star') return { pts: star(cx, cy, size, rot), start };
    const zig: Pt[] = Array.from({ length: 5 }, (_, j) => [cx + (j - 2) * size * 0.9 * side, cy + (j % 2 ? -size : size) * 0.9 + j * size * 0.5]);
    return { pts: zig, start };
  });
  return (
    <g opacity={fade}>
      {loops.map((pts, i) => [0, 1].map((pass) => (
        <Stroke key={`${i}-${pass}`} pts={jitter(pts, `scribble:${spec.id}:${i}:${pass}:${step}`, pass ? 5 : 3)} closed p={p} color={spec.color} width={pass ? 2.2 : 4.5} glow={!pass} />
      )))}
      {decos.map((d, k) => (
        <Stroke key={`d${k}`} pts={jitter(d.pts, `scribble-d:${spec.id}:${k}:${step}`, 3)} closed={false} p={outQuad(ramp(t, spec.t0 + spec.draw * d.start, spec.draw * 0.6))} color={spec.color} width={4} glow />
      ))}
    </g>
  );
};
