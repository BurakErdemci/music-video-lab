// The intro-groove worlds (hard metal: steel, fire, deep red, ember orange, chains, smoke, black), built from the world kit.
//  CathedralWorld     a metal cathedral of server racks: colonnades, a red LED rose window, chains, fire bowls.
//  ChevronTunnelWorld a tunnel of git conflict markers (< = >) the camera dives through, sparks streaming past.
//  ForgeWorld         an anvil under a wall of fire, sparks bursting from it on every hit.
// Every world is a pure function of `t`; `hits` are the metal hit times (seconds) and each gives a local surge.
import { useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import type { CameraPose, Vec3 } from '../camera/camera.ts';
import { clamp01, type Hex, rgb } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { useUniforms } from '../stage/Stage.tsx';
import { FLOOR_Y } from '../stage/floor.ts';
import { additive, plain, PX, VERT } from './kit/common.tsx';
import { BeamCone, type EmberBurst, Embers, FireWall, GlowBox, Halo, LaserFan, LedWall, NeonTube, Smoke, TilePlatform } from './kit/index.ts';
import { PlateBackdrop } from './plate.tsx';
import { useParticleCap } from '../particles/cap.ts';

const F = FLOOR_Y;
const RED: Hex = '#ff2a14';
const DEEP: Hex = '#a80e08';
const EMBER: Hex = '#ff8a2a';
const STEEL: Hex = '#8e99a6';

export interface GrooveWorldProps { t: number; plate?: string; hits: readonly number[] }

/** 1 at a hit, decaying over about half a second; `delay` lets a surge travel into the depth. */
const surge = (t: number, hits: readonly number[], delay = 0): number => {
  let s = 0;
  for (const h of hits) {
    const a = t - delay - h;
    if (a >= 0 && a < 1.5) s = Math.max(s, Math.exp(-a * 7));
  }
  return s;
};
const recentHits = (hits: readonly number[], t: number, win: number): number[] => hits.filter((h) => h <= t && t - h < win).slice(-4);


const STEEL_FRAG = /* glsl */ `uniform vec3 uBase; uniform vec3 uGlow; uniform float uGlowAmt; uniform float uOpacity;
varying vec2 vUv; varying vec3 vNormal;
void main() {
  float e = 1.0 - smoothstep(0.0, 0.06, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  float shade = 0.45 + 0.55 * clamp(vNormal.y * 0.6 + abs(vNormal.x) * 0.35 + 0.35, 0.0, 1.0);
  vec3 col = uBase * shade + (uBase * 1.6 + uGlow * uGlowAmt) * e + uGlow * uGlowAmt * 0.25 * abs(vNormal.x);
  gl_FragColor = vec4(col, uOpacity);
}`;
/** An opaque-looking steel box: the kit's GlowBox is additive, so it cannot be dark, and its halo grows with the box. */
const SteelBox = ({ position, size, base = '#2a3038', glow = RED, glowAmt = 0, opacity = 1, order = 2 }: { position: Vec3; size: Vec3; base?: Hex; glow?: Hex; glowAmt?: number; opacity?: number; order?: number }) => {
  const u = useUniforms({ uBase: rgb(base), uGlow: rgb(glow), uGlowAmt: glowAmt, uOpacity: clamp01(opacity) });
  return (
    <mesh position={position} renderOrder={order} frustumCulled={false}>
      <boxGeometry args={size} />
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={STEEL_FRAG} {...plain} />
    </mesh>
  );
};

/** A hanging chain of dark steel links, swaying slightly. */
const Chain = ({ x, z, top, links, t, seed }: { x: number; z: number; top: number; links: number; t: number; seed: number }) => (
  <>
    {Array.from({ length: links }, (_, j) => (
      <GlowBox
        key={j}
        position={[x + 0.08 * Math.sin(t * 0.8 + seed + j * 0.15) * (j / links), top - j * 0.6, z]}
        size={[0.28, 0.58, 0.1]}
        color="#7b8794"
        edge={0.5}
        fill={0.3}
        rotation={[0, j % 2 ? Math.PI / 2 : 0, 0]}
      />
    ))}
  </>
);

// ---- Cathedral ----------------------------------------------------------------------------------------------
const RACKS = (() => {
  const out: { x: number; z: number; h: number; inner: boolean; i: number }[] = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 10; i++) out.push({ x: s * 5.2, z: 4 - i * 3.6, h: seeded(`cath:in:${s}:${i}`).range(10, 15), inner: true, i });
    for (let i = 0; i < 8; i++) out.push({ x: s * 8.6, z: 2 - i * 4.4, h: seeded(`cath:out:${s}:${i}`).range(12, 17), inner: false, i });
  }
  return out;
})();
const ARCHES: Vec3[][] = Array.from({ length: 6 }, (_, i) => [[-5.2, 8, 2 - i * 7], [0, 12.2, 2 - i * 7], [5.2, 8, 2 - i * 7]]);
const ROSE_Z = -38;
const ROSE_RING: Vec3[] = Array.from({ length: 33 }, (_, i) => [Math.cos((i / 32) * Math.PI * 2) * 5.6, 7 + Math.sin((i / 32) * Math.PI * 2) * 5.6, ROSE_Z + 0.2]);
const ROSE_SPOKES: Vec3[][] = [0, 1, 2, 3].map((k) => {
  const a = (k / 4) * Math.PI;
  return [[Math.cos(a) * 5.6, 7 + Math.sin(a) * 5.6, ROSE_Z + 0.1], [-Math.cos(a) * 5.6, 7 - Math.sin(a) * 5.6, ROSE_Z + 0.1]];
});
const AISLE_RAILS: Vec3[][] = [-4.3, 4.3].map((x) => [[x, F + 0.04, 6], [x, F + 0.04, -36]]);
const BOWLS = Array.from({ length: 5 }, (_, i) => [-1, 1].map((s) => ({ x: s * 3, z: -2 - i * 4.2 }))).flat();
const CHAINS = [[-2.4, -6], [2.2, -10], [-1.2, -16], [3.0, -20], [0.4, -26]] as const;

export const CathedralWorld = ({ t, plate, hits }: GrooveWorldProps) => {
  const s0 = surge(t, hits);
  const erupt = recentHits(hits, t, 0.8).map((h) => ({ t: h, x: 0, z: -2 }));
  return (
    <>
      <PlateBackdrop plate={plate} />
      <Halo position={[0, 7, ROSE_Z + 1]} size={26} color={DEEP} intensity={0.8 + 0.3 * s0} order={1} />
      <LedWall position={[0, 7, ROSE_Z]} width={7.9} height={7.9} cols={40} rows={40} colors={[RED, EMBER]} pattern="radial" pulse={s0} t={t} />
      <NeonTube points={ROSE_RING} color={RED} radius={0.09} />
      {ROSE_SPOKES.map((p, i) => <NeonTube key={i} points={p} color={EMBER} radius={0.05} opacity={0.6} />)}
      <TilePlatform position={[0, F, -14]} width={9} depth={44} cols={9} rows={44} splitX={0} left="#8a0e06" right="#c4400a" t={t} pulse={0.15 + 0.5 * s0} erupt={erupt} />
      {AISLE_RAILS.map((p, i) => <NeonTube key={i} points={p} color={RED} radius={0.05} />)}
      {RACKS.map((r, k) => {
        const fade = 1 - 0.55 * (r.i / 10);
        const s = surge(t, hits, -r.z * 0.012);
        const o = 2 + (r.z + 40) * 0.02;
        const y = F + r.h / 2;
        return (
          <group key={k}>
            <SteelBox position={[r.x, y, r.z]} size={[1.6, r.h, 1.6]} glowAmt={r.inner ? 0.3 + 0.5 * s : 0.1} opacity={0.96} order={o} />
            <LedWall position={[r.x, y, r.z + 0.82]} width={1.3} height={r.h * 0.92} cols={4} rows={Math.round(r.h * 3)} colors={k % 2 ? [RED, EMBER] : [DEEP, RED]} pattern={k % 3 ? 'checker' : 'bars'} pulse={s} t={t + k} opacity={0.6 * fade * (r.inner ? 1 : 0.6)} order={o + 0.005} />
            {r.inner && <NeonTube points={[[r.x - Math.sign(r.x) * 0.83, F + 0.3, r.z + 0.4], [r.x - Math.sign(r.x) * 0.83, F + r.h - 0.3, r.z + 0.4]]} color={RED} radius={0.025} opacity={fade * (0.45 + 0.55 * s)} order={o + 0.01} />}
          </group>
        );
      })}
      {ARCHES.map((p, i) => <NeonTube key={i} points={p} color={DEEP} radius={0.07} opacity={0.8} />)}
      {CHAINS.map(([x, z], i) => <Chain key={i} x={x} z={z} top={12.5} links={14} t={t} seed={i * 3} />)}
      {BOWLS.map((b, i) => {
        const s = surge(t, hits, -b.z * 0.012);
        return (
          <group key={i}>
            <SteelBox position={[b.x, F + 0.25, b.z]} size={[1.1, 0.5, 1.1]} base="#59626e" glowAmt={0.4 + 0.5 * s} glow={EMBER} order={2.9} />
            <FireWall x0={b.x - 0.6} x1={b.x + 0.6} z={b.z} y={F + 0.5} height={2.2} rise={0.55 + 0.45 * s} colors={['#ff3a0a', '#ffc040']} t={t + i * 0.7} />
            <Halo position={[b.x, F + 1.2, b.z]} size={3 + 2 * s} color="#ff5a1a" intensity={0.3 + 0.5 * s} />
          </group>
        );
      })}
      <BeamCone from={[0, 11, -3]} to={[0, F, 0]} radius={2.6} color="#ff5a2a" intensity={0.3 + 0.3 * s0} />
      <Smoke y={F + 2.5} z={-12} width={30} height={7} color="#3a1612" density={0.7} t={t} />
      <Smoke y={F + 7} z={-26} width={44} height={11} color="#2a0e0c" density={0.6} t={t + 5} />
      <Embers box={[-8, 8, F, 12, -28, 4]} count={320} t={t} color={EMBER} order={9} />
    </>
  );
};
export const CATHEDRAL_CAMERA: { from: CameraPose; to: CameraPose } = {
  from: { position: [0, -1.5, 14], target: [0, 0.4, -8], fov: 40 },
  to: { position: [0.3, -2, 9.5], target: [0, 0.9, -10], fov: 42 },
};
export const CATHEDRAL_SPOTS = { O: { x: 0, z: 0 } };

// ---- Chevron tunnel -----------------------------------------------------------------------------------------
const RING_COUNT = 20;
const RINGS = Array.from({ length: RING_COUNT }, (_, i) => {
  const z = 6 - i * 3;
  const side = (s: number): Vec3[][] => [[[s * 3.4, 3, z], [s * 5, 0.6, z]], [[s * 5, 0.6, z], [s * 3.4, -1.8, z]]];
  const bars: Vec3[][] = [4.4, 3.8, F + 0.2, F + 0.8].map((y) => [[-2.4, y, z], [2.4, y, z]]);
  return { z, color: (i % 3 === 2 ? STEEL : RED) as Hex, tubes: [...side(-1), ...side(1), ...bars] };
});
const TUNNEL_RAILS: Vec3[][] = [[-5.6, F + 0.05], [5.6, F + 0.05], [-5.6, 5], [5.6, 5]].map(([x, y]) => [[x as number, y as number, 8], [x as number, y as number, -60]]);

const SPARKS = 220;
const SPARK_TRAIL = 4;
const SPARK_VERT = /* glsl */ `uniform float uTime; uniform float uPx; uniform float uMaxPx;
attribute vec4 aSeed; attribute float aTrail;
varying float vA; varying float vHot;
void main() {
  float speed = mix(14.0, 34.0, aSeed.w);
  float z = -68.0 + mod(aSeed.z * 80.0 + uTime * speed, 80.0) - aTrail * 0.9;
  float x = (aSeed.x * 2.0 - 1.0) * 6.5 + 0.3 * sin(uTime * 2.0 + aSeed.y * 30.0);
  float y = ${F.toFixed(2)} + aSeed.y * 9.0;
  vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = (1.0 - aTrail * 0.27) * smoothstep(-68.0, -50.0, z);
  vHot = 1.0 - aTrail * 0.3;
  gl_PointSize = min(mv.z < -0.3 ? 0.075 * (1.0 - aTrail * 0.2) * uPx / -mv.z : 0.0, uMaxPx);
}`;
const SPARK_FRAG = /* glsl */ `uniform float uOpacity; varying float vA; varying float vHot;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float g = exp(-r * r * 3.5) * (1.0 - smoothstep(0.8, 1.0, r));
  vec3 col = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.92, 0.7), vHot * vHot);
  gl_FragColor = vec4(col * g * vA * uOpacity, 1.0);
}`;
/** Sparks racing toward the camera down the tunnel, each a short trail of points. */
const SparkStream = ({ t, opacity }: { t: number; opacity: number }) => {
  const geo = useMemo(() => {
    const n = SPARKS * SPARK_TRAIL;
    const seed = new Float32Array(n * 4);
    const trail = new Float32Array(n);
    const rng = seeded('tunnel:sparks');
    for (let i = 0; i < SPARKS; i++) {
      const s = [rng(), rng(), rng(), rng()];
      for (let k = 0; k < SPARK_TRAIL; k++) {
        seed.set(s, (i * SPARK_TRAIL + k) * 4);
        trail[i * SPARK_TRAIL + k] = k;
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new BufferAttribute(seed, 4));
    g.setAttribute('aTrail', new BufferAttribute(trail, 1));
    return g;
  }, []);
  const u = useUniforms({ uTime: t, uPx: PX, uMaxPx: useParticleCap(), uOpacity: opacity });
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={9}>
      <shaderMaterial {...u} vertexShader={SPARK_VERT} fragmentShader={SPARK_FRAG} {...additive} />
    </points>
  );
};

export const ChevronTunnelWorld = ({ t, plate, hits }: GrooveWorldProps) => {
  const s0 = surge(t, hits);
  const recent = recentHits(hits, t, 1.5);
  const erupt = recent.slice(-2).map((h) => ({ t: h, x: 0, z: -4 }));
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 0.5, -64]} width={36} height={22} cols={48} rows={30} colors={[DEEP, EMBER]} pattern="radial" pulse={s0} t={t} />
      <Halo position={[0, 0.5, -60]} size={34} color={RED} intensity={0.9 + 0.3 * s0} order={1} />
      <TilePlatform position={[0, F, -28]} width={11} depth={72} cols={11} rows={72} splitX={0} left="#7a0c06" right="#b8380a" t={t} pulse={0.15 + 0.5 * s0} erupt={erupt} />
      {TUNNEL_RAILS.map((p, i) => <NeonTube key={i} points={p} color={i < 2 ? RED : STEEL} radius={0.05} opacity={0.8} />)}
      {RINGS.map((r, i) => {
        const beat = (0.5 + 0.5 * Math.cos(Math.PI * 2 * (1.5 * t - i * 0.15))) ** 4;
        let wave = 0;
        for (const h of recent) wave += Math.exp(-(((i - (t - h) * 9) / 1.6) ** 2)) * (1 - (t - h) / 1.5);
        const op = clamp01((0.22 + 0.55 * beat + 0.6 * wave) * (1 - 0.5 * (i / RING_COUNT)));
        return r.tubes.map((p, k) => <NeonTube key={`${i}:${k}`} points={p} color={wave > 0.35 ? EMBER : r.color} radius={0.06} opacity={op} />);
      })}
      <BeamCone from={[0, 9, -3]} to={[0, F, -6]} radius={2.2} color="#ff5a2a" intensity={0.25 + 0.25 * s0} />
      <Smoke y={F + 2.5} z={-24} width={26} height={7} color="#34100c" density={0.6} t={t} />
      <SparkStream t={t} opacity={0.8 + 0.2 * s0} />
    </>
  );
};
export const CHEVRON_TUNNEL_CAMERA: { from: CameraPose; to: CameraPose } = {
  from: { position: [0, -1.6, 13], target: [0, -0.3, -20], fov: 42 },
  to: { position: [0, -1.2, 2.5], target: [0, -0.2, -20], fov: 46 },
};
export const CHEVRON_TUNNEL_SPOTS = { O: { x: 0, z: -6 } };

// ---- Forge --------------------------------------------------------------------------------------------------
const ANVIL_TOP: Vec3 = [0, F + 2.75, 0.2];
const ANVIL: { p: Vec3; s: Vec3 }[] = [
  { p: [0, F + 0.5, 0.2], s: [3, 1, 1.8] },
  { p: [0, F + 1.45, 0.2], s: [1.5, 0.9, 1.2] },
  { p: [0, F + 2.3, 0.2], s: [4.2, 0.8, 1.5] },
  { p: [-2.7, F + 2.4, 0.2], s: [1.4, 0.45, 0.9] },
];

export const ForgeWorld = ({ t, plate, hits }: GrooveWorldProps) => {
  const s0 = surge(t, hits);
  const recent = recentHits(hits, t, 1);
  const bursts: EmberBurst[] = recent.map((h) => ({ t: h, origin: ANVIL_TOP }));
  const sweep = 0.08 * Math.sin(t * 1.5);
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 3, -14]} width={44} height={18} cols={60} rows={24} colors={[DEEP, '#c8400a']} pattern="bars" pulse={0.5 * s0} t={t} opacity={0.45} />
      <Halo position={[0, 1, -9]} size={26} color="#ff4a10" intensity={0.55 + 0.2 * s0} order={1} />
      <FireWall x0={-20} x1={20} z={-9} height={16} rise={0.78 + 0.22 * s0} colors={['#c81404', '#ff8a1a']} t={t} />
      <FireWall x0={-14} x1={14} z={-5} height={8} rise={0.55 + 0.25 * s0} colors={['#ff3a10', '#ffc040']} t={t + 2} opacity={0.85} />
      <TilePlatform position={[0, F, -1.5]} width={26} depth={13} cols={26} rows={13} splitX={0} left="#b81006" right="#ff6a14" t={t} pulse={0.3 + 0.5 * s0} erupt={recent.slice(-2).map((h) => ({ t: h, x: 0, z: 0 }))} />
      {[-8.5, 8.5].map((x) => <SteelBox key={x} position={[x, F + 8, -3.5]} size={[1.4, 16, 1.4]} glow={EMBER} glowAmt={0.3 + 0.4 * s0} order={3.2} />)}
      <SteelBox position={[0, 8, -3.5]} size={[18, 0.8, 0.8]} glow={EMBER} glowAmt={0.3 + 0.4 * s0} order={3.2} />
      {[-6, -2.5, 4.5].map((x, i) => <Chain key={x} x={x} z={-3.5} top={7.6} links={7} t={t} seed={i * 2} />)}
      {ANVIL.map((a, i) => <SteelBox key={i} position={a.p} size={a.s} base="#5d6773" glow="#ffb060" glowAmt={0.35 + 0.9 * s0} order={5 + i * 0.1} />)}
      <Halo position={ANVIL_TOP} size={3.5 + 3 * s0} color="#ffb060" intensity={0.35 + 0.7 * s0} />
      <BeamCone from={[0, 10, -1]} to={[0, ANVIL_TOP[1], 0.2]} radius={1.6} color="#ff7a30" intensity={0.35 + 0.3 * s0} />
      <LaserFan origin={[-11, 10.5, -6]} count={7} spread={0.7} angle={-0.5 + sweep} length={26} color={RED} width={0.035} intensity={0.8 + 0.4 * s0} />
      <LaserFan origin={[11, 10.5, -6]} count={7} spread={0.7} angle={Math.PI + 0.5 - sweep} length={26} color={RED} width={0.035} intensity={0.8 + 0.4 * s0} />
      <Smoke y={F + 2} z={-3} width={30} height={5} color="#2c100c" density={0.55} t={t} />
      <Smoke y={F + 8} z={-12} width={44} height={12} color="#240c0a" density={0.7} t={t + 4} />
      <Embers box={[-10, 10, F, 9, -8, 4]} count={260} t={t} color={EMBER} bursts={bursts} order={9} />
    </>
  );
};
export const FORGE_CAMERA: { from: CameraPose; to: CameraPose } = {
  from: { position: [-1.5, -1.8, 13], target: [0.8, -0.2, 0], fov: 40 },
  to: { position: [2.2, -2, 9.5], target: [1.6, 0.1, 0], fov: 40 },
};
export const FORGE_SPOTS = { O: { x: 3, z: 0.5 } };
