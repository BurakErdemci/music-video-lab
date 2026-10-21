// Verse 3, "rebase": the two girls trade lines. Orange attacks (metal: steel, fire, red), blue defends (disco: blue
// neon, light boxes). Each world is a pure function of t, built from the kit; the git object is the space.
//  SquashWorld    steel presses crush a row of commit slabs into one white-hot line.
//  BlameWorld     a canyon of code lines, a name tag in every gutter.
//  PipelineWorld  a CI track of stage pylons whose lights flip from green to red.
//  CallGridWorld  a wall of video-call tiles going offline under a countdown frame.
import { useMemo } from 'react';
import type { CameraPose, Vec3 } from '../camera/camera.ts';
import { clamp01, type Hex, inOutQuad, mixHex, ramp, rgb } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { FLOOR_Y as F } from '../stage/floor.ts';
import { useUniforms } from '../stage/Stage.tsx';
import { additive, plain, VERT } from './kit/common.tsx';
import { BeamCone, type EmberBurst, Embers, GlowBox, Halo, LedWall, NeonTube, Smoke, TilePlatform } from './kit/index.ts';
import { PlateBackdrop } from './plate.tsx';

const BLUE: Hex = '#2b7bff';
const CYAN: Hex = '#25c8ff';
const RED: Hex = '#ff2a14';
const ORANGE: Hex = '#ff7a1a';
const EMBER: Hex = '#ff8a2a';
const GREEN: Hex = '#22ff7a';

type Spot = { x: number; z: number };
type Cam = { from: CameraPose; to: CameraPose };

const STEEL_FRAG = /* glsl */ `uniform vec3 uBase; uniform vec3 uGlow; uniform float uGlowAmt; uniform float uOpacity;
varying vec2 vUv; varying vec3 vNormal;
void main() {
  float e = 1.0 - smoothstep(0.0, 0.06, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  float shade = 0.45 + 0.55 * clamp(vNormal.y * 0.6 + abs(vNormal.x) * 0.35 + 0.35, 0.0, 1.0);
  vec3 col = uBase * shade + (uBase * 1.6 + uGlow * uGlowAmt) * e + uGlow * uGlowAmt * 0.25 * abs(vNormal.x);
  gl_FragColor = vec4(col, uOpacity);
}`;
/** An opaque-looking steel box (the kit's GlowBox is additive, so it cannot be dark, and its halo grows with size). */
const SteelBox = ({ position, size, base = '#3a424c', glow = RED, glowAmt = 0.3, opacity = 1, order = 6 }: { position: Vec3; size: Vec3; base?: Hex; glow?: Hex; glowAmt?: number; opacity?: number; order?: number }) => {
  const u = useUniforms({ uBase: rgb(base), uGlow: rgb(glow), uGlowAmt: glowAmt, uOpacity: clamp01(opacity) });
  return (
    <mesh position={position} renderOrder={order} frustumCulled={false}>
      <boxGeometry args={size} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={STEEL_FRAG} {...plain} />
    </mesh>
  );
};

/** The bursts still alive at t (the kit takes at most four: the latest ones). */
const alive = (starts: readonly number[], t: number, origin: (i: number) => Vec3): EmberBurst[] =>
  starts.flatMap((s, i) => (t >= s && t - s < 1 ? [{ t: s, origin: origin(i) }] : [])).slice(-4);

// ---- 1. Squash ---------------------------------------------------------------------------------------------
const SLABS = 10;
const PITCH = 1.7;
const SLAB_W = 1.35;
const SLAB_H = 1.9;
const SQ_Y = -0.4;
const SQ_Z = -1;
const SLAB_X = Array.from({ length: SLABS }, (_, i) => (i - (SLABS - 1) / 2) * PITCH);
// Where the presses' faces start: just outside the outermost slab.
const REACH = ((SLABS - 1) / 2) * PITCH + SLAB_W / 2 + 0.1;

export const SquashWorld = ({ t, plate, squash }: { t: number; plate?: string; squash: number }) => {
  const k = inOutQuad(ramp(t, squash, 0.6));
  const links = useMemo(() => SLAB_X.slice(0, -1).map((x, i) => [[x + SLAB_W / 2, SQ_Y, SQ_Z], [(SLAB_X[i + 1] as number) - SLAB_W / 2, SQ_Y, SQ_Z]] as Vec3[]), []);
  const linkOn = 1 - ramp(k, 0, 0.2);
  // the faces stop short of x = 0 so the white line stays visible between the presses
  const face = REACH + (0.6 - REACH) * k;
  const hit = t - (squash + 0.6);
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 3, -13]} width={56} height={24} cols={56} rows={24} colors={['#0c1a5a', '#3a0c20']} pattern="scan" pulse={0.1} t={t} />
      <TilePlatform position={[0, F, -4]} width={34} depth={26} cols={34} rows={26} splitX={0} left="#0a2a8a" right="#8a2a0a" t={t} pulse={0.1} />
      <NeonTube points={[[-14, F + 0.05, SQ_Z], [14, F + 0.05, SQ_Z]]} color={CYAN} radius={0.04} opacity={0.7} />
      {SLAB_X.map((x, i) => (
        <group key={i}>
          <GlowBox position={[x * (1 - k), SQ_Y, SQ_Z]} size={[SLAB_W * (1 - 0.96 * k), SLAB_H * (1 - 0.5 * k), 0.5]} color={i % 2 ? CYAN : BLUE} edge={0.9} fill={0.55} opacity={1 - 0.85 * ramp(k, 0.5, 0.5)} />
          <Halo position={[x * (1 - k), SQ_Y + SLAB_H / 2 + 0.45, SQ_Z]} size={0.9} color="#bfe0ff" intensity={0.9} opacity={1 - k} />
        </group>
      ))}
      {linkOn > 0 && links.map((p, i) => <NeonTube key={i} points={p} color={CYAN} radius={0.035} opacity={linkOn} />)}
      <NeonTube points={[[0, SQ_Y - 0.95, SQ_Z], [0, SQ_Y + 0.95, SQ_Z]]} color="#ffffff" radius={0.045} opacity={ramp(k, 0.7, 0.3)} order={7} />
      {hit >= 0 && <Halo position={[0, SQ_Y, SQ_Z]} size={5} color="#ffd9a0" intensity={0.8 * Math.exp(-hit * 5)} order={8} />}
      <Halo position={[0, SQ_Y, SQ_Z]} size={2.2} color="#ffffff" intensity={0.8 * ramp(k, 0.8, 0.2)} order={8} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <SteelBox position={[s * (face + 1.1), SQ_Y, SQ_Z]} size={[1.8, 3.2, 1.9]} base="#3a3f48" glow={s < 0 ? BLUE : RED} glowAmt={0.5} />
          <SteelBox position={[s * (face + 5.7), SQ_Y, SQ_Z]} size={[7, 0.8, 0.8]} base="#2e343c" glow={RED} glowAmt={0.2} order={5.9} />
          <GlowBox position={[s * (face + 0.04), SQ_Y, SQ_Z + 0.05]} size={[0.08, 2.8, 1.7]} color={s < 0 ? CYAN : ORANGE} edge={1} fill={0.8} order={6.5} />
          <BeamCone from={[s * 9, 10, -4]} to={[s * 3.5, F, SQ_Z]} radius={2.6} color={s < 0 ? BLUE : RED} intensity={0.4} />
        </group>
      ))}
      <Smoke y={F + 1.4} z={-6} width={34} height={5} color="#2a1a3a" density={0.5} t={t} />
      <Embers box={[-12, 12, F, 7, -9, 2]} count={160} t={t} color={EMBER} bursts={alive([squash + 0.5, squash + 0.58, squash + 0.66], t, (i) => [(i - 1) * 0.3, SQ_Y, SQ_Z + 0.3])} />
    </>
  );
};
export const SQUASH_CAMERA: Cam = {
  from: { position: [0, 0.3, 14], target: [0, -0.5, -1], fov: 40 },
  to: { position: [0.4, 0.5, 12.2], target: [0, -0.5, -1], fov: 40 },
};
export const SQUASH_SPOTS: { B: Spot; O: Spot } = { B: { x: -4.2, z: 1 }, O: { x: 4.2, z: 1 } };

// ---- 2. Blame ----------------------------------------------------------------------------------------------
const LINES = 34;
const LINE_PITCH = 0.28;
const WALL_X = 5.2;
const GUTTER_Z = 2;
const gutterY = (i: number): number => F + (i + 0.5) * LINE_PITCH;
export const BLAME_GUTTERS: { near: Vec3; far: Vec3; count: number } = {
  near: [-WALL_X + 0.1, gutterY(0), GUTTER_Z],
  far: [-WALL_X + 0.1, gutterY(LINES - 1), GUTTER_Z],
  count: LINES,
};

// One plane per wall draws every code line: rows from world y, tokens from world depth, two scans running near to far.
const CODE_FRAG = /* glsl */ `uniform float uTime; uniform vec3 uColor; uniform float uSide; uniform float uBase; uniform float uPitch; uniform float uOpacity;
varying vec3 vWorld;
float cHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  float ry = (vWorld.y - uBase) / uPitch;
  float row = floor(ry);
  float fy = fract(ry);
  float band = smoothstep(0.1, 0.2, fy) * (1.0 - smoothstep(0.72, 0.82, fy));
  float d = -vWorld.z;
  float start = -1.2 + floor(cHash(vec2(row, uSide)) * 4.0) * 1.3;
  float len = 14.0 + cHash(vec2(row, 9.0 + uSide)) * 46.0;
  float cell = floor((d - start) * 1.7);
  float inCell = fract((d - start) * 1.7);
  float tok = step(0.28, cHash(vec2(cell, row + uSide * 100.0))) * smoothstep(0.04, 0.12, inCell) * (1.0 - smoothstep(0.86, 0.94, inCell));
  tok *= step(start, d) * step(d, start + len);
  float sp = mod(uTime * 13.0, 80.0) - 4.0 - row * 0.35;
  float sp2 = mod(uTime * 13.0 + 40.0, 80.0) - 4.0 - row * 0.35;
  float pulse = exp(-pow((d - sp) / 3.5, 2.0)) + exp(-pow((d - sp2) / 3.5, 2.0));
  float fog = 1.0 - smoothstep(30.0, 64.0, d);
  float hot = step(0.93, cHash(vec2(row, 3.0 + uSide)));
  vec3 col = uColor * (0.045 + band * tok * (0.5 + 1.2 * pulse + 0.7 * hot)) * fog;
  col += vec3(1.0) * band * tok * pulse * 0.25 * fog;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}`;

const CodeWall = ({ t, side }: { t: number; side: -1 | 1 }) => {
  const height = LINES * LINE_PITCH;
  const u = useUniforms({ uTime: t, uColor: rgb(BLUE), uSide: side < 0 ? 0 : 1, uBase: F, uPitch: LINE_PITCH, uOpacity: 1 });
  return (
    <mesh position={[side * WALL_X, F + height / 2, -32]} rotation={[0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} renderOrder={2} frustumCulled={false}>
      <planeGeometry args={[70, height]} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={CODE_FRAG} {...additive} />
    </mesh>
  );
};

export const BlameWorld = ({ t, plate }: { t: number; plate?: string }) => {
  const rows = useMemo(() => Array.from({ length: LINES }, (_, i) => i), []);
  const bridges = useMemo(() => [-6, -15, -25, -36, -48].map((z) => [[-WALL_X, F + LINES * LINE_PITCH, z], [WALL_X, F + LINES * LINE_PITCH, z]] as Vec3[]), []);
  return (
    <>
      <PlateBackdrop plate={plate} />
      <CodeWall t={t} side={-1} />
      <CodeWall t={t} side={1} />
      <TilePlatform position={[0, F, -30]} width={WALL_X * 2} depth={70} cols={10} rows={70} splitX={0} left="#08205a" right="#0a2a7a" t={t} pulse={0.05} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <NeonTube points={[[s * WALL_X, F + 0.08, 4], [s * WALL_X, F + 0.08, -64]]} color={s < 0 ? CYAN : ORANGE} radius={0.05} />
          <NeonTube points={[[s * WALL_X, F + LINES * LINE_PITCH, 4], [s * WALL_X, F + LINES * LINE_PITCH, -64]]} color={BLUE} radius={0.05} />
        </group>
      ))}
      {rows.map((i) => {
        const sp = ((t * 13) % 80) - 4 - i * 0.35;
        const near = Math.exp(-(((-GUTTER_Z - sp) / 3.5) ** 2));
        return (
          <group key={i}>
            <GlowBox position={[-WALL_X + 0.1, gutterY(i), GUTTER_Z]} size={[0.12, 0.2, 0.9]} color={BLUE} edge={0.55 + 0.3 * near} fill={0.75} />
            <GlowBox position={[WALL_X - 0.1, gutterY(i), GUTTER_Z]} size={[0.12, 0.2, 0.9]} color={BLUE} edge={0.55 + 0.3 * near} fill={0.75} />
          </group>
        );
      })}
      {bridges.map((p, i) => <NeonTube key={i} points={p} color={BLUE} radius={0.05} opacity={0.8} />)}
      <Halo position={[0, 1, -66]} size={26} color={ORANGE} intensity={0.55} />
      <BeamCone from={[0, 9, -62]} to={[-3, F, -20]} radius={3.4} color={RED} intensity={0.3} />
      <BeamCone from={[0, 9, -62]} to={[3, F, -20]} radius={3.4} color={ORANGE} intensity={0.25} />
      <Smoke y={F + 1.5} z={-14} width={12} height={5} color="#1a2a6a" density={0.5} t={t} />
      <Smoke y={F + 2} z={-38} width={14} height={8} color="#2a1a4a" density={0.55} t={t + 3} />
      <Embers box={[-5, 5, F, 8, -50, 3]} count={150} t={t} color={EMBER} />
    </>
  );
};
export const BLAME_CAMERA: Cam = {
  from: { position: [0, 1.4, 12], target: [0, 1.4, -22], fov: 42 },
  to: { position: [0.3, 1.6, 9.2], target: [0, 1.5, -24], fov: 42 },
};
export const BLAME_SPOTS: { B: Spot } = { B: { x: 0, z: 0 } };

// ---- 3. Pipeline -------------------------------------------------------------------------------------------
const STAGES = 6;
const TRACK_X = -1;
const TOWER_H = 5.2;
const stageZ = (i: number): number => -2 - i * 7.5;
export const PIPELINE_STAGES: Vec3[] = Array.from({ length: STAGES }, (_, i) => [TRACK_X, F + TOWER_H + 0.55, stageZ(i)] as Vec3);

export const PipelineWorld = ({ t, plate, fails }: { t: number; plate?: string; fails: number[] }) => {
  const segs = useMemo(() => Array.from({ length: STAGES - 1 }, (_, i) => [[TRACK_X, F + 0.12, stageZ(i)], [TRACK_X, F + 0.12, stageZ(i + 1)]] as Vec3[]), []);
  const flip = (i: number): number => (fails[i] === undefined ? 0 : ramp(t, fails[i], 0.15));
  const failed = fails.filter((f) => t >= f).length;
  const alarm = failed > 0 ? 0.3 + 0.7 * Math.min(1, failed / 3) : 0;
  const sweep = Math.sin(t * 1.1);
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 4, -50]} width={70} height={26} cols={70} rows={26} colors={[mixHex('#0c1a5a', '#5a0c0c', alarm), mixHex('#1a0a50', '#3a0808', alarm)]} pattern="scan" pulse={0.1} t={t} />
      <TilePlatform position={[TRACK_X, F, -20]} width={3.4} depth={48} cols={3} rows={48} splitX={TRACK_X} left="#1a4acc" right="#1a4acc" t={t} pulse={0.1 + 0.2 * alarm} />
      <TilePlatform position={[0, F - 0.02, -20]} width={34} depth={48} cols={34} rows={48} splitX={0} left="#050c28" right="#240a0a" t={t * 0.5} order={0.9} />
      {[-1, 1].map((s) => <NeonTube key={s} points={[[TRACK_X + s * 1.75, F + 0.08, 6], [TRACK_X + s * 1.75, F + 0.08, -46]]} color={CYAN} radius={0.045} />)}
      {segs.map((p, i) => (
        <group key={i}>
          <NeonTube points={p} color={GREEN} radius={0.07} opacity={1 - flip(i)} />
          {flip(i) > 0 && <NeonTube points={p} color={RED} radius={0.07} opacity={flip(i)} />}
        </group>
      ))}
      {PIPELINE_STAGES.map((top, i) => {
        const f = flip(i);
        const a = fails[i] === undefined ? -1 : t - (fails[i] as number);
        const z = stageZ(i);
        return (
          <group key={i}>
            <SteelBox position={[TRACK_X, F + TOWER_H / 2, z]} size={[1.6, TOWER_H, 1.6]} base={mixHex('#2a4a82', '#7a1812', f)} glow={f > 0.5 ? RED : CYAN} glowAmt={0.4 + 0.4 * f} order={5} />
            <LedWall position={[TRACK_X, F + TOWER_H / 2, z + 0.82]} width={1.2} height={TOWER_H * 0.86} cols={3} rows={12} colors={[mixHex(BLUE, RED, f), mixHex(CYAN, ORANGE, f)]} pattern="bars" t={t + i} opacity={0.75} order={5.2} />
            <GlowBox position={[TRACK_X, F + TOWER_H + 0.12, z]} size={[1.9, 0.24, 1.9]} color={mixHex(GREEN, RED, f)} edge={1} fill={0.8} order={5.5} />
            <Halo position={top} size={2.6} color={mixHex(GREEN, RED, f)} intensity={1.1} order={6.5} />
            {a >= 0 && <Halo position={top} size={5} color="#ffd0c0" intensity={0.8 * Math.exp(-a * 6)} order={7} />}
          </group>
        );
      })}
      {[-1, 1].map((s) => (
        <BeamCone key={s} from={[s * 9, 10, -9]} to={[s * 1 + sweep * 5, F, -9 - s * 3]} radius={2.6} color={RED} intensity={0.55} opacity={alarm} />
      ))}
      <BeamCone from={[TRACK_X, 11, -16]} to={[TRACK_X + sweep * 4, F, -24]} radius={3} color={RED} intensity={0.5} opacity={alarm} />
      <Smoke y={F + 1.4} z={-10} width={30} height={5} color="#1a2a6a" density={0.5} t={t} />
      <Smoke y={F + 2} z={-30} width={44} height={8} color="#2a1020" density={0.55} t={t + 4} />
      <Embers box={[-10, 8, F, 8, -40, 3]} count={140} t={t} color={EMBER} bursts={alive(fails, t, (i) => PIPELINE_STAGES[i] as Vec3)} />
    </>
  );
};
export const PIPELINE_CAMERA: Cam = {
  from: { position: [7.5, 1.2, 12], target: [-2, 0.2, -16], fov: 40 },
  to: { position: [6, 1.8, 9.5], target: [-2, 0.5, -16], fov: 40 },
};
export const PIPELINE_SPOTS: { O: Spot } = { O: { x: 3.5, z: 1 } };

// ---- 4. Call grid ------------------------------------------------------------------------------------------
const COLS = 4;
const ROWS = 3;
const TILE_W = 4.2;
const TILE_H = 2.3;
const GRID_GAP = 0.3;
const GRID_Z = -6;
const GRID_Y = 1;
export const COUNTDOWN_FRAME: { centre: Vec3; width: number; height: number } = { centre: [0, 6.7, GRID_Z], width: 7.4, height: 1.9 };

const TILE_COLORS: Hex[] = ['#2a5fd0', '#1f8ad0', '#6a3ad0', '#d05a1f', '#2a8ad0', '#d0361f', '#3a4ad0', '#d07a1f'];
const TILE_PATTERNS = ['scan', 'radial', 'bars', 'checker'] as const;

export const CallGridWorld = ({ t, plate, off }: { t: number; plate?: string; off: number }) => {
  const tiles = useMemo(() => {
    // the order in which the tiles go dark
    const order = Array.from({ length: COLS * ROWS }, (_, i) => i);
    const r = seeded('callgrid:order');
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j] as number, order[i] as number];
    }
    return order.map((slot, n) => {
      const rr = seeded(`callgrid:${n}`);
      return { x: ((n % COLS) - (COLS - 1) / 2) * (TILE_W + GRID_GAP), y: GRID_Y + (1 - Math.floor(n / COLS)) * (TILE_H + GRID_GAP), color: rr.pick(TILE_COLORS), pattern: rr.pick(TILE_PATTERNS), slot };
    });
  }, []);
  const { centre, width, height } = COUNTDOWN_FRAME;
  const dark = tiles.filter((tl) => t >= off + tl.slot * 0.15).length / tiles.length;
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 3, GRID_Z - 4]} width={60} height={26} cols={60} rows={26} colors={['#0a1448', '#240a40']} pattern="checker" pulse={0} t={t * 0.1} opacity={0.55} />
      {tiles.map((tl, i) => {
        const a = t - (off + tl.slot * 0.15);
        const fade = 1 - ramp(a, 0, 0.25);
        const bar = ramp(a, 0.12, 0.2);
        return (
          <group key={i}>
            <LedWall position={[tl.x, tl.y, GRID_Z]} width={TILE_W - 0.3} height={TILE_H - 0.3} cols={16} rows={9} colors={[mixHex(tl.color, '#000000', 0.55), mixHex(tl.color, '#ffffff', 0.15)]} pattern={tl.pattern} t={t + i * 0.7} opacity={0.7 * fade} order={1.6} />
            <Halo position={[tl.x, tl.y + 0.3, GRID_Z + 0.05]} size={0.85} color={tl.color} intensity={0.5} opacity={fade} order={2} />
            <Halo position={[tl.x, tl.y - 0.55, GRID_Z + 0.05]} size={1.9} color={tl.color} intensity={0.35} opacity={fade} order={2} />
            <GlowBox position={[tl.x, tl.y, GRID_Z - 0.1]} size={[TILE_W, TILE_H, 0.15]} color={mixHex(tl.color, RED, 1 - fade)} edge={0.45 + 0.45 * fade} fill={0.06} />
            {bar > 0 && <GlowBox position={[tl.x, tl.y, GRID_Z + 0.1]} size={[2.1, 0.26, 0.06]} color={RED} edge={1} fill={0.9} opacity={bar} order={5.5} />}
          </group>
        );
      })}
      <mesh position={[centre[0], centre[1], centre[2] - 0.15]} renderOrder={4.5}>
        <planeGeometry args={[width - 0.2, height - 0.2]} />
        <meshBasicMaterial color="#05030c" transparent opacity={0.85} depthTest={false} depthWrite={false} />
      </mesh>
      <GlowBox position={centre} size={[width, height, 0.2]} color={mixHex(ORANGE, RED, dark)} edge={0.85} fill={0.05} />
      <TilePlatform position={[0, F, -2]} width={34} depth={24} cols={34} rows={24} splitX={0} left="#0a1e78" right={mixHex('#6a1a0a', '#9a0a0a', dark)} t={t} pulse={0.1} />
      <BeamCone from={[-9, 11, -3]} to={[-3, F, 1]} radius={2.8} color={BLUE} intensity={0.4} />
      <BeamCone from={[9, 11, -3]} to={[3, F, 1]} radius={2.8} color={ORANGE} intensity={0.35 + 0.2 * dark} />
      <Smoke y={F + 1.4} z={-1} width={34} height={5} color="#2a1a5a" density={0.45} t={t} />
      <Embers box={[-12, 12, F, 8, -6, 3]} count={120} t={t} color={mixHex(CYAN, EMBER, dark)} />
    </>
  );
};
export const CALLGRID_CAMERA: Cam = {
  from: { position: [0, 1.4, 12], target: [0, 2.4, -6], fov: 42 },
  to: { position: [0.6, 1.7, 10], target: [0, 2.6, -6], fov: 42 },
};
export const CALLGRID_SPOTS: { B: Spot; O: Spot } = { B: { x: -3.6, z: 2 }, O: { x: 3.6, z: 2 } };
