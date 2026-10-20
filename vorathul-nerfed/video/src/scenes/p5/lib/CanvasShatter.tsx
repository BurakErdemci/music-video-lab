// The painting card as breakable canvas (C41): a jittered triangle mesh carrying the painting on its front face
// and raw ivory canvas on its back. Shards inside the breach fly at the lens, spinning, under gravity; the rest
// stays on the wall as the jagged rim of the hole. One geometry, recomputed from the frame (pure).
import { useMemo } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, FrontSide } from 'three';
import { useCardTexture, type Vec3 } from '../../../stage/Card.tsx';
import { seeded } from '../../../vfx/effects.ts';
import { CARD_H, CARD_W, PAINT_Z } from './Office.tsx';
import { IVORY } from './vorathul.ts';

export interface ShatterProps {
  /** Frames since the shatter (negative = whole canvas). */
  t: number;
  /** Punch point on the card (card-local units, origin at the card centre). */
  punch?: [number, number];
  /** Breach radius; a second, later radius (`grow`) widens the hole as he pushes through. */
  radius?: number;
  grow?: { t: number; radius: number }[];
  /** Plate drawn on the painting face. */
  plate?: string;
  seed?: number;
  /** Launch speed toward the lens, units per frame. */
  speed?: number;
  cols?: number;
  rows?: number;
}

interface Tri {
  v: [number, number][];
  uv: [number, number][];
  c: [number, number];
  shade: number;
  /** Radius at which this shard is torn out (jittered so the rim is jagged). */
  tear: number;
  vel: Vec3;
  axis: Vec3;
  spin: number;
}

const build = (seed: number, cols: number, rows: number): Tri[] => {
  const rng = seeded(`p5-shatter:${seed}`);
  const pts: [number, number][][] = [];
  for (let j = 0; j <= rows; j++) {
    const row: [number, number][] = [];
    for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      const jx = edge ? 0 : rng.range(-0.38, 0.38);
      const jy = edge ? 0 : rng.range(-0.38, 0.38);
      row.push([((i + jx) / cols - 0.5) * CARD_W, ((j + jy) / rows - 0.5) * CARD_H]);
    }
    pts.push(row);
  }
  // Painting UV: the 3:2 plate covers the 16:9 card (crop top and bottom).
  const vSpan = (CARD_H / CARD_W) * 1.5;
  const uvOf = (p: [number, number]): [number, number] => [p[0] / CARD_W + 0.5, 0.5 + (p[1] / CARD_H) * vSpan];
  const tris: Tri[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = pts[j]![i]!;
      const b = pts[j]![i + 1]!;
      const c = pts[j + 1]![i + 1]!;
      const d = pts[j + 1]![i]!;
      const flip = rng() < 0.5;
      const pair: [number, number][][] = flip ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const v of pair) {
        const cx = (v[0]![0] + v[1]![0] + v[2]![0]) / 3;
        const cy = (v[0]![1] + v[1]![1] + v[2]![1]) / 3;
        const ax: Vec3 = [rng.range(-1, 1), rng.range(-1, 1), rng.range(-0.4, 0.4)];
        const al = Math.hypot(...ax) || 1;
        tris.push({
          v, uv: v.map(uvOf), c: [cx, cy], shade: rng.range(0.72, 1), tear: rng.range(0.72, 1.12),
          vel: [rng.range(-1, 1), rng.range(-0.6, 1), rng.range(0.55, 1.35)],
          axis: [ax[0] / al, ax[1] / al, ax[2] / al], spin: rng.range(0.08, 0.32) * (rng() < 0.5 ? -1 : 1),
        });
      }
    }
  }
  return tris;
};

const rotate = (p: Vec3, axis: Vec3, ang: number): Vec3 => {
  const [x, y, z] = p;
  const [u, v, w] = axis;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const d = u * x + v * y + w * z;
  return [u * d * (1 - c) + x * c + (-w * y + v * z) * s, v * d * (1 - c) + y * c + (w * x - u * z) * s, w * d * (1 - c) + z * c + (-v * x + u * y) * s];
};

const LAUNCH_SPREAD = 5;

export const CanvasShatter = ({ t, punch = [-0.6, 0.8], radius = 4.6, grow = [], plate = '01-tarz-cizgi-roman.jpg', seed = 7, speed = 0.9, cols = 22, rows = 13 }: ShatterProps) => {
  const texture = useCardTexture(plate.startsWith('assets/') ? plate : `plates/${plate}`);
  const tris = useMemo(() => build(seed, cols, rows), [seed, cols, rows]);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(tris.length * 9), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(tris.flatMap((tr) => tr.uv.flat())), 2));
    g.setAttribute('color', new BufferAttribute(new Float32Array(tris.length * 9), 3));
    return g;
  }, [tris]);
  const pos = geo.getAttribute('position') as BufferAttribute;
  const col = geo.getAttribute('color') as BufferAttribute;
  tris.forEach((tr, k) => {
    const d = Math.hypot(tr.c[0] - punch[0], tr.c[1] - punch[1]);
    // The breach: the first ring at t 0, later rings when the hole widens.
    let start = Infinity;
    if (d < radius * tr.tear) start = (d / radius) * LAUNCH_SPREAD;
    for (const g of grow) if (start === Infinity && d < g.radius * tr.tear) start = g.t + (d / g.radius) * 3;
    const age = t - start;
    const flying = age >= 0;
    const near = Number.isFinite(start) ? 0 : Math.max(0, 1 - (d - radius) / 1.6);
    for (let i = 0; i < 3; i++) {
      const v = tr.v[i]!;
      let p: Vec3 = [v[0], v[1], 0];
      if (flying) {
        const out: [number, number] = [tr.c[0] - punch[0], tr.c[1] - punch[1]];
        const ol = Math.hypot(...out) || 1;
        const local = rotate([v[0] - tr.c[0], v[1] - tr.c[1], 0], tr.axis, tr.spin * age);
        const vx = (out[0] / ol) * 0.22 + tr.vel[0] * 0.08;
        const vy = (out[1] / ol) * 0.18 + tr.vel[1] * 0.08;
        const vz = tr.vel[2] * speed;
        p = [tr.c[0] + local[0] + vx * age, tr.c[1] + local[1] + vy * age - 0.011 * age * age, local[2] + vz * age];
      }
      pos.setXYZ(k * 3 + i, p[0], p[1], p[2]);
      // Faces near the rim crack and darken; flying shards keep a per-shard facet shade.
      const s = flying ? tr.shade : 1 - 0.28 * near * (tr.shade < 0.86 ? 1 : 0.4);
      col.setXYZ(k * 3 + i, s, s, s);
    }
  });
  pos.needsUpdate = true;
  col.needsUpdate = true;
  geo.computeBoundingSphere();
  return (
    <group position={[0, 0, PAINT_Z]}>
      <mesh geometry={geo} frustumCulled={false}>
        <meshBasicMaterial map={texture} vertexColors toneMapped={false} side={FrontSide} />
      </mesh>
      <mesh geometry={geo} frustumCulled={false}>
        <meshBasicMaterial color={IVORY} vertexColors toneMapped={false} side={BackSide} />
      </mesh>
    </group>
  );
};
