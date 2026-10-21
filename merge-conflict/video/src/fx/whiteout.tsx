// White-out hit frames (architecture.md "fx/whiteout.tsx", Arcane "Enemy"): an overexposed white frame that
// carries a flat figure (the card outline filled with ink), RGB-offset ghost outlines and a rainbow spray
// bursting out of the body. Every white-out registers 2 swings (up and down) in the flash budget.
import { type CameraPath, type CameraPose, project } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';
import { deformPoints, toWorld } from '../rig/cardRig.ts';
import type { P } from '../rig/rig.ts';
import { FLOOR_Y } from '../stage/SetPlate.tsx';
import { OUTLINES } from '../cards/outlines.ts';
import { RIOT } from '../grade/grade.ts';
import type { Swing } from '../lib/flash.ts';
import { outQuad } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';

export interface WhiteoutSpec {
  id: string;
  t0: number;
  /** Frames at 60 fps the frame stays white (2-4). */
  frames: number;
  figures?: readonly { card: string; at: Placement }[];
  /** The camera of the shot the hit lands in: the silhouettes are projected exactly where the cards stand. */
  camera?: CameraPath;
}

export const whiteoutSwings = (w: WhiteoutSpec): Swing[] => [{ id: w.id, t: w.t0, swings: 2 }];
export const whiteoutActive = (w: WhiteoutSpec, t: number): boolean => t >= w.t0 && t < w.t0 + w.frames / 60;

const GHOSTS = [
  { dx: -14, dy: -4, c: '#ff1e3c' },
  { dx: 12, dy: 6, c: '#00d2ff' },
  { dx: 3, dy: -12, c: '#1cff6a' },
] as const;

export const Whiteout = ({ spec, t, pose: fallback }: { spec: WhiteoutSpec; t: number; pose: CameraPose }) => {
  if (!whiteoutActive(spec, t)) return null;
  const pose = spec.camera ? spec.camera(t) : fallback;
  const k = ((t - spec.t0) * 60 + 1) / spec.frames;
  const figs = spec.figures ?? [];
  const paths: string[] = [];
  const cs: [number, number][] = [];
  for (const fig of figs) {
    const o = OUTLINES[fig.card];
    if (!o) throw new Error(`whiteout ${spec.id}: no outline for ${fig.card}`);
    const stand = { x: fig.at.x, feet: fig.at.feet ?? FLOOR_Y, z: fig.at.z ?? 0, height: fig.at.height };
    const proj = (q: P) => project(pose, toWorld(stand, q));
    paths.push(o.polylines
      .map((pl) => deformPoints(fig.card, Array.from({ length: pl.length / 2 }, (_, i) => [pl[i * 2] as number, pl[i * 2 + 1] as number] as P), t)
        .map((q, i) => {
          const p = proj(q);
          return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        }).join(' ') + ' Z')
      .join(' '));
    const c = proj([0, 0]);
    cs.push([c.x, c.y]);
  }
  const d = paths.join(' ');
  const centre: [number, number] = cs.length ? [cs.reduce((a, c) => a + c[0], 0) / cs.length, cs.reduce((a, c) => a + c[1], 0) / cs.length] : [960, 700];
  const r = seeded(`whiteout:${spec.id}`);
  const shards = Array.from({ length: 90 }, () => ({ a: r.range(0, Math.PI * 2), v: r.range(260, 980), s: r.range(8, 26), c: r.pick(RIOT), rot: r.range(0, 180) }));
  const spread = outQuad(k);
  return (
    <svg width={1920} height={1080} data-frame={Math.round(t * 60)} style={{ position: 'absolute', inset: 0 }}>
      <rect width={1920} height={1080} fill="#fbf8ff" />
      {shards.map((s, i) => {
        const x = centre[0] + Math.cos(s.a) * s.v * spread;
        const y = centre[1] + Math.sin(s.a) * s.v * spread * 0.8;
        return <rect key={i} x={x - s.s / 2} y={y - s.s / 4} width={s.s} height={s.s / 2} fill={s.c} transform={`rotate(${s.rot + k * 90} ${x} ${y})`} />;
      })}
      {d && GHOSTS.map((g, i) => <path key={i} d={d} transform={`translate(${g.dx * (1 + k)} ${g.dy * (1 + k)})`} fill="none" stroke={g.c} strokeWidth={5} strokeLinejoin="round" />)}
      {d && <path d={d} fill="#14081f" />}
    </svg>
  );
};
