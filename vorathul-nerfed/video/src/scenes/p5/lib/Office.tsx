// The office stage of part 5 (storyboard 2 section 0.2): painting card 16 x 9 at z -20, floor at y -6.2.
// Flat vector office in the O palette, built from opaque flat planes (they write depth, so the rig and the
// keyed cut-outs sort against them by distance). Painted things (gold tile wave, ink and gold paint) are
// what changes the room's style.
import { useMemo, type ReactNode } from 'react';
import { CanvasTexture, DoubleSide, LinearFilter, SRGBColorSpace } from 'three';
import type { Vec3 } from '../../../stage/Card.tsx';
import { seeded } from '../../../vfx/effects.ts';
import { Asset } from './PlateCard.tsx';
import { GOLD, INK, IVORY, OFFICE_FLOOR } from './vorathul.ts';

export const O = { bg: '#E9ECEF', mid: '#CED4DA', dark: '#ADB5BD', slate: '#868E96', ink: '#343A40', white: '#FFFFFF', blue: '#3B82F6', ceil: '#F1F3F5' } as const;
export const PAINT_Z = -20;
export const WALL_Z = -20.25;
export const CEIL_Y = 5.2;
/** Painting card and its black frame (outer edge), world units, centred on (0, 0). */
export const CARD_W = 16;
export const CARD_H = 9;
export const FRAME_T = 0.42;

/** Flat opaque rectangle (writes depth). */
export const Rect = ({ w, h, at, rot, color, order }: { w: number; h: number; at: Vec3; rot?: Vec3; color: string; order?: number }) => (
  <mesh position={at} rotation={rot} renderOrder={order}>
    <planeGeometry args={[w, h]} />
    <meshBasicMaterial color={color} toneMapped={false} side={DoubleSide} />
  </mesh>
);

/** A rectangle with a thin uniform outline in front of it (office line style). */
export const Panel = ({ w, h, at, rot, fill, line = O.dark, lw = 0.05 }: { w: number; h: number; at: Vec3; rot?: Vec3; fill: string; line?: string; lw?: number }) => (
  <group position={at} rotation={rot}>
    <Rect w={w} h={h} at={[0, 0, 0]} color={line} />
    <Rect w={w - 2 * lw} h={h - 2 * lw} at={[0, 0, 0.004]} color={fill} />
  </group>
);

// ---- floor: office tiles, and his gold cathedral tile spreading in a ring from his feet (C43) ----
const FLOOR_VERT = 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
// Raw sRGB output (ShaderMaterial skips the colour conversion), like stage/Card's flat shader.
const FLOOR_FRAG = `
uniform vec2 c; uniform float r; varying vec3 vW;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vW.xz;
  vec3 col = vec3(0.808, 0.831, 0.855);
  vec2 g = abs(fract(p / 2.0 + 0.5) - 0.5) * 2.0;
  if (min(g.x, g.y) < 0.03) col = vec3(0.678, 0.71, 0.741);
  float d = length(p - c) + (vn(p * 1.3) - 0.5) * 0.9;
  if (d < r) {
    vec2 t = floor(p / 1.6);
    vec2 ft = abs(fract(p / 1.6) - 0.5) * 2.0;
    col = mod(t.x + t.y, 2.0) < 0.5 ? vec3(0.886, 0.702, 0.235) : vec3(0.957, 0.925, 0.847);
    float grain = vn(p * vec2(9.0, 2.0));
    if (grain > 0.78) col *= 0.82;
    if (max(ft.x, ft.y) > 0.93) col = vec3(0.039);
    if (d > r - 0.45) col = vec3(0.039);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export const Floor = ({ wave = 0, centre = [0, -12] }: { wave?: number; centre?: [number, number] }) => {
  const uniforms = useMemo(() => ({ c: { value: [0, 0] }, r: { value: 0 } }), []);
  uniforms.c.value = centre;
  uniforms.r.value = wave;
  return (
    // Ends at the wall: a floor running on behind it would hide the painted world seen through the breach.
    <mesh position={[0, OFFICE_FLOOR, WALL_Z + 20]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[120, 40]} />
      <shaderMaterial uniforms={uniforms} vertexShader={FLOOR_VERT} fragmentShader={FLOOR_FRAG} side={DoubleSide} />
    </mesh>
  );
};

/** Back wall with a hole the size of the frame (the painting fills it), skirting, shelves and a window. */
export const Wall = ({ hole = true, top = CEIL_Y, children }: { hole?: boolean; top?: number; children?: ReactNode }) => {
  const fw = CARD_W + 2 * FRAME_T;
  const fh = CARD_H + 2 * FRAME_T;
  const bot = OFFICE_FLOOR;
  const z = WALL_Z;
  return (
    <group>
      {hole ? (
        <>
          <Rect w={80} h={top - fh / 2} at={[0, (top + fh / 2) / 2, z]} color={O.bg} />
          <Rect w={80} h={-fh / 2 - bot} at={[0, (bot - fh / 2) / 2, z]} color={O.bg} />
          <Rect w={40 - fw / 2} h={fh} at={[-(40 + fw / 2) / 2, 0, z]} color={O.bg} />
          <Rect w={40 - fw / 2} h={fh} at={[(40 + fw / 2) / 2, 0, z]} color={O.bg} />
        </>
      ) : (
        <Rect w={80} h={top - bot} at={[0, (top + bot) / 2, z]} color={O.bg} />
      )}
      <Rect w={80} h={0.45} at={[0, bot + 0.22, z + 0.02]} color={O.mid} />
      <Rect w={80} h={0.04} at={[0, bot + 0.45, z + 0.03]} color={O.dark} />
      {/* shelves left, window right: parallax interest in flat greys */}
      {[0, 1, 2].map((i) => (
        <Rect key={i} w={4.4} h={0.12} at={[-15, -3.2 + i * 2.3, z + 0.05]} color={O.dark} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Rect key={`b${i}`} w={0.7} h={1.4 - (i % 2) * 0.4} at={[-16.4 + i * 0.85, -2.45 + (i % 2) * -0.2 + 2.3, z + 0.04]} color={i % 2 ? O.mid : O.slate} />
      ))}
      <Panel w={6.5} h={6.4} at={[15.5, 0.6, z + 0.04]} fill="#F8F9FA" line={O.dark} lw={0.12} />
      <Rect w={0.12} h={6.2} at={[15.5, 0.6, z + 0.08]} color={O.dark} />
      <Rect w={6.3} h={0.12} at={[15.5, 0.6, z + 0.08]} color={O.dark} />
      {children}
    </group>
  );
};

/** Ceiling plane with the hanging light strips (white, thin grey edge). `strips` = per-strip offsets when they burst. */
export const Ceiling = ({ y = CEIL_Y, hidden = false }: { y?: number; hidden?: boolean }) =>
  hidden ? null : (
    <group>
      <Rect w={80} h={40} at={[0, y, WALL_Z + 20]} rot={[Math.PI / 2, 0, 0]} color={O.ceil} />
    </group>
  );

export const LightStrip = ({ at, len = 7, rot }: { at: Vec3; len?: number; rot?: Vec3 }) => (
  <group position={at} rotation={rot}>
    <Rect w={len} h={0.5} at={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} color={O.dark} />
    <Rect w={len - 0.12} h={0.36} at={[0, -0.01, 0]} rot={[Math.PI / 2, 0, 0]} color={O.white} />
    <Rect w={len} h={0.16} at={[0, -0.08, 0.25]} color={O.mid} />
  </group>
);

/** The black picture frame around the card. `burst` > 0 = frames since it exploded into bars (A4, S94). */
export const Frame = ({ burst = -1, seed = 4 }: { burst?: number; seed?: number }) => {
  const fw = CARD_W + 2 * FRAME_T;
  const fh = CARD_H + 2 * FRAME_T;
  const t = FRAME_T;
  // Each side breaks into three bars; every bar is [length, centre, horizontal].
  const bars: { len: number; c: [number, number]; horiz: boolean }[] = [];
  for (let k = 0; k < 3; k++) {
    bars.push({ len: fw / 3, c: [-fw / 2 + fw / 6 + (k * fw) / 3, fh / 2 - t / 2], horiz: true });
    bars.push({ len: fw / 3, c: [-fw / 2 + fw / 6 + (k * fw) / 3, -fh / 2 + t / 2], horiz: true });
    bars.push({ len: (fh - 2 * t) / 3, c: [-fw / 2 + t / 2, -fh / 2 + t + (fh - 2 * t) / 6 + (k * (fh - 2 * t)) / 3], horiz: false });
    bars.push({ len: (fh - 2 * t) / 3, c: [fw / 2 - t / 2, -fh / 2 + t + (fh - 2 * t) / 6 + (k * (fh - 2 * t)) / 3], horiz: false });
  }
  const rng = seeded(`p5-frame:${seed}`);
  const fly = bars.map((b) => ({
    vx: b.c[0] * rng.range(0.03, 0.07) + rng.range(-0.05, 0.05),
    vy: b.c[1] * rng.range(0.05, 0.1) + rng.range(0.05, 0.2),
    vz: rng.range(0.35, 0.9),
    spin: [rng.range(-0.25, 0.25), rng.range(-0.25, 0.25), rng.range(-0.35, 0.35)] as Vec3,
  }));
  return (
    <group position={[0, 0, PAINT_Z + 0.06]}>
      {bars.map((b, i) => {
        const s = fly[i]!;
        const tt = Math.max(0, burst);
        const on = burst >= 0;
        const pos: Vec3 = on ? [b.c[0] + s.vx * tt, b.c[1] + s.vy * tt - 0.012 * tt * tt, s.vz * tt] : [b.c[0], b.c[1], 0];
        const rot: Vec3 = on ? [s.spin[0] * tt, s.spin[1] * tt, s.spin[2] * tt] : [0, 0, 0];
        const [w, h] = b.horiz ? [b.len, t] : [t, b.len];
        return (
          <group key={i} position={pos} rotation={rot}>
            <Rect w={w} h={h} at={[0, 0, 0]} color="#141414" />
            <Rect w={b.horiz ? w : 0.06} h={b.horiz ? 0.06 : h} at={[b.horiz ? 0 : -t / 2 + 0.05, b.horiz ? -t / 2 + 0.05 : 0, 0.01]} color="#495057" />
          </group>
        );
      })}
    </group>
  );
};

// ---- desks, monitors, chairs, developers ----
export interface Prop {
  /** Ground point. */
  at: Vec3;
  /** Extra offset and rotation (flying, tipped over). */
  off?: Vec3;
  rot?: Vec3;
}
const placed = ({ at, off = [0, 0, 0], rot = [0, 0, 0] }: Prop) => ({ position: [at[0] + off[0], at[1] + off[1], at[2] + off[2]] as Vec3, rotation: rot });

/** Desk: front-facing flat table (top edge, front panel, two legs), 4.6 wide. */
export const Desk = (p: Prop & { w?: number }) => {
  const w = p.w ?? 4.6;
  return (
    <group {...placed(p)}>
      <Rect w={w} h={1.6} at={[0, 2.2, -0.75]} rot={[-Math.PI / 2, 0, 0]} color="#F8F9FA" />
      <Panel w={w} h={0.22} at={[0, 2.12, 0.05]} fill={O.white} />
      <Rect w={0.14} h={2.0} at={[-w / 2 + 0.25, 1.0, 0]} color={O.dark} />
      <Rect w={0.14} h={2.0} at={[w / 2 - 0.25, 1.0, 0]} color={O.dark} />
      <Panel w={1.3} h={1.6} at={[w / 2 - 0.95, 1.0, 0.02]} fill={O.bg} />
      <Rect w={1.1} h={0.04} at={[w / 2 - 0.95, 1.3, 0.04]} color={O.dark} />
    </group>
  );
};

/** Monitor on its stand; `screen` is the screen colour, `children` sits on the screen plane. */
export const Monitor3D = (p: Prop & { w?: number; screen?: string; children?: ReactNode }) => {
  const w = p.w ?? 2.2;
  const h = w * 0.6;
  return (
    <group {...placed(p)}>
      <Rect w={0.18} h={0.5} at={[0, 0.25, -0.05]} color={O.ink} />
      <Rect w={0.9} h={0.08} at={[0, 0.04, -0.05]} color={O.ink} />
      <Rect w={w} h={h} at={[0, 0.5 + h / 2, 0]} color={O.ink} />
      <Rect w={w - 0.14} h={h - 0.14} at={[0, 0.5 + h / 2, 0.01]} color={p.screen ?? O.blue} />
      <group position={[0, 0.5 + h / 2, 0.02]}>{p.children}</group>
    </group>
  );
};

// Stand-in crops of the approved office frame (07): the office palette and line style, keyed off the pale wall.
const OFFICE_PLATE = '07-ofis-tablo.jpg';
export const CHAIR_CROP: [number, number, number, number] = [1318, 690, 200, 320];
export const DEV_CROPS = {
  // the bored developer in the grey hoodie (standing; his back), seated developer with glasses, developer with a bun
  hoodie: [462, 388, 214, 576] as [number, number, number, number],
  glasses: [0, 528, 238, 480] as [number, number, number, number],
  bun: [1300, 548, 236, 470] as [number, number, number, number],
};

/** G46: the drawn bored developer (storyboard 4), full figure cut-outs sized by height; ground point at the feet. */
export type Dev46Pose = 'walk' | 'click' | 'bored' | 'tap' | 'pin' | 'dust' | 'glance' | 'sip' | 'spit';
export const Dev46 = ({ pose, at, height = 3.4, flipX = false, order = 3000, rot }: { pose: Dev46Pose; at: Vec3; height?: number; flipX?: boolean; order?: number; rot?: Vec3 }) => (
  <group position={at} rotation={rot}>
    <Asset id={`G46-${pose}`} standIn={{ plate: OFFICE_PLATE, crop: DEV_CROPS.hoodie, keying: 'light' }} width={(height * 214) / 576} height={height} position={[0, height / 2, 0]} flipX={flipX} renderOrder={order} />
  </group>
);

/** G41 poses (manifest labels): 1 front, 2 side, 3 tipped, 4 upside-down, 5 tilted-back, 6 spin-top. */
export type ChairPose = 1 | 2 | 3 | 4 | 5 | 6;

/** G41 office chair (stand-in: the right chair of frame 07). Ground point at the wheels; `size` is the width of the stand-in. */
export const Chair = (p: Prop & { size?: number; order?: number; pose?: ChairPose }) => {
  const s = p.size ?? 2.6;
  const h = (s * CHAIR_CROP[3]) / CHAIR_CROP[2];
  const pl = placed(p);
  return (
    <group position={pl.position} rotation={pl.rotation}>
      <Asset id={`G41-${p.pose ?? 1}`} standIn={{ plate: OFFICE_PLATE, crop: CHAIR_CROP, keying: 'light' }} width={s} height={h} position={[0, h / 2, 0]} renderOrder={p.order} />
    </group>
  );
};

/** G39 poses (manifest labels): 1-3 run, 4-6 under-desk, 7-9 cower, 10-12 spit-take; bored, glasses, bun in each. */
export const DEV_POSE = { run: 1, underDesk: 4, cower: 7, spit: 10 } as const;
const DEV_WHO = { hoodie: 0, glasses: 1, bun: 2 } as const;

/** G39 developer (stand-in: one of the developers of frame 07). Ground point at the feet. */
export const Dev = (p: Prop & { who?: keyof typeof DEV_CROPS; act?: keyof typeof DEV_POSE; height?: number; flipX?: boolean; order?: number }) => {
  const crop = DEV_CROPS[p.who ?? 'hoodie'];
  const hh = p.height ?? 3.4;
  const w = (hh * crop[2]) / crop[3];
  const pl = placed(p);
  return (
    <group position={pl.position} rotation={pl.rotation}>
      <Asset id={`G39-${DEV_POSE[p.act ?? 'run'] + DEV_WHO[p.who ?? 'hoodie']}`} standIn={{ plate: OFFICE_PLATE, crop, keying: 'light' }} width={w} height={hh} position={[0, hh / 2, 0]} flipX={p.flipX} renderOrder={p.order} />
    </group>
  );
};

// ---- paint: ink and gold splats and drips as a seeded canvas texture (C42 residue on walls and floor) ----
const paintCache = new Map<string, CanvasTexture>();
const paintTexture = (seed: number, drips: boolean): CanvasTexture => {
  const k = `${seed}:${drips}`;
  const hit = paintCache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const rng = seeded(`p5-paint:${seed}`);
  const blob = (x: number, y: number, r: number, color: string) => {
    g.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * rng.range(0.65, 1.15);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.8;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle = color;
    g.fill();
    if (color !== INK) {
      g.lineWidth = 10;
      g.strokeStyle = INK;
      g.stroke();
    }
  };
  for (let i = 0; i < 9; i++) {
    const color = i % 2 ? GOLD : INK;
    const x = rng.range(150, 874);
    const y = drips ? rng.range(80, 320) : rng.range(200, 824);
    const r = rng.range(60, 170);
    blob(x, y, r, color);
    if (drips) {
      const len = rng.range(250, 650);
      const w = r * rng.range(0.25, 0.5);
      g.fillStyle = color;
      g.fillRect(x - w / 2, y, w, len);
      blob(x, y + len, w * 0.85, color);
      if (color !== INK) {
        g.fillStyle = INK;
        g.fillRect(x - w / 2 - 5, y, 10, len);
        g.fillRect(x + w / 2 - 5, y, 10, len);
      }
      g.fillStyle = IVORY;
      g.fillRect(x - w / 4, y + 20, Math.max(4, w / 8), len * 0.7);
    }
    for (let s = 0; s < 6; s++) blob(x + rng.range(-260, 260), y + rng.range(-200, 200), rng.range(8, 26), color);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  paintCache.set(k, t);
  return t;
};

/** A paint splat decal (transparent, sorted by `order`); `drips` runs it down like a wall pour. */
export const PaintDecal = ({ at, w, h, rot, seed, drips = false, order = 50, opacity = 1 }: { at: Vec3; w: number; h: number; rot?: Vec3; seed: number; drips?: boolean; order?: number; opacity?: number }) => {
  const tex = paintTexture(seed, drips);
  return (
    <mesh position={at} rotation={rot} renderOrder={order}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} toneMapped={false} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
};
