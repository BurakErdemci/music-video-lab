// Verse 4, "trade": two programmers' petty fight, getting faster, plus the whisper after it.
//  WhitespaceWorld  an editor's visible whitespace as a floor: blue tab arrows against orange dots.
//  NameTagWorld     a hall of hanging variable name tags; one swings forward and lights up.
//  LaserCaseWorld   a museum case guarded by lasers; at `smash` it is touched.
//  WhisperWorld     the quietest frame of the clip.
import { useMemo } from 'react';
import type { CameraPose, Vec3 } from '../camera/camera.ts';
import type { Hex } from '../lib/ease.ts';
import { clamp01, outQuad, ramp } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { FLOOR_Y as F } from '../stage/floor.ts';
import { BeamCone, Embers, GlowBox, Halo, LaserFan, LedWall, NeonTube, Smoke, TilePlatform } from './kit/index.ts';
import { PlateBackdrop } from './plate.tsx';

const CYAN: Hex = '#19d4ff';
const BLUE: Hex = '#2b6bff';
const ORANGE: Hex = '#ff7a1a';
const RED: Hex = '#ff2a3a';

type Spot = { x: number; z: number };
type Cam = { from: CameraPose; to: CameraPose };

// ---- 1. Whitespace -----------------------------------------------------------------------------------------
const WS_ROWS = 11;
const WS_Z0 = 3;
const WS_DZ = 2.6;
// how much of a row's light is left at depth z (far rows fade into the dark floor)
const depthFade = (z: number): number => 1 - 0.75 * clamp01((WS_Z0 - z) / (WS_ROWS * WS_DZ));

export const WhitespaceWorld = ({ t, plate }: { t: number; plate?: string }) => {
  const rows = useMemo(
    () =>
      Array.from({ length: WS_ROWS }, (_, i) => {
        const z = WS_Z0 - i * WS_DZ;
        const r = seeded(`ws:${i}`);
        const indent = r.range(0, 1.4);
        const arrows = [
          [-10.5 + indent, -5.6 + indent],
          [-4.9 + indent * 0.5, -0.9],
        ];
        const dots = Array.from({ length: 9 }, (_, k) => 0.9 + k * 1.1 + r.range(-0.08, 0.08));
        return { z, arrows, dots };
      }),
    [],
  );
  const y = F + 0.06;
  // the cursor blinks every 0.5 s
  const cursorOn = Math.floor(t / 0.5) % 2 === 0;
  return (
    <>
      <PlateBackdrop plate={plate} />
      <TilePlatform position={[0, F, -10]} width={28} depth={40} cols={28} rows={40} splitX={0} left="#050a1c" right="#1a0806" t={t * 0.3} pulse={0} opacity={0.7} />
      {rows.map((row, i) => {
        const o = depthFade(row.z);
        return (
          <group key={i}>
            {row.arrows.map(([x0, x1], k) => (
              <group key={k}>
                <NeonTube points={[[x0 as number, y, row.z], [x1 as number, y, row.z]]} color={CYAN} radius={0.05} opacity={o} />
                <NeonTube points={[[(x1 as number) - 0.8, y, row.z - 0.55], [x1 as number, y, row.z], [(x1 as number) - 0.8, y, row.z + 0.55]]} color={CYAN} radius={0.05} opacity={o} />
              </group>
            ))}
            {row.dots.map((x, k) => (
              <Halo key={k} position={[x, y + 0.05, row.z]} size={0.55} color="#ff4a1a" intensity={1.1} opacity={o} order={5} />
            ))}
          </group>
        );
      })}
      <NeonTube points={[[0, F, -1.5], [0, F + 9, -1.5]]} color="#e8f4ff" radius={0.07} opacity={cursorOn ? 1 : 0.06} />
      <Halo position={[0, F + 4.5, -1.5]} size={6} color="#bcd8ff" intensity={0.5} opacity={cursorOn ? 1 : 0} />
      <Smoke y={F + 1.2} z={-12} width={30} height={5} color="#1a2040" density={0.35} t={t} />
    </>
  );
};
export const WHITESPACE_CAMERA: Cam = {
  from: { position: [0.4, 1.6, 10], target: [0, -1.6, -6], fov: 40 },
  to: { position: [0, 2.6, 8], target: [0, -1.8, -8], fov: 40 },
};
export const WHITESPACE_SPOTS: { B: Spot; O: Spot } = { B: { x: -3.4, z: 0 }, O: { x: 3.4, z: 0 } };

// ---- 2. Name tags ------------------------------------------------------------------------------------------
const PIVOT: Vec3 = [0.5, 15, -3];
const TAG_L = 12.6; // cable length: the guilty tag hangs at y = 2.4 when it is straight
export const GUILTY_TAG: { centre: Vec3; width: number; height: number } = { centre: [PIVOT[0], PIVOT[1] - TAG_L, PIVOT[2]], width: 5.2, height: 1.9 };

export const NameTagWorld = ({ t, plate, reveal }: { t: number; plate?: string; reveal: number }) => {
  const tags = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const r = seeded(`tags:${i}`);
        let x = r.range(-17, 17);
        const z = r.range(-34, -4);
        // keep the middle of the near hall clear for the guilty tag
        if (z > -14 && Math.abs(x) < 4.5) x = (x < 0 ? -1 : 1) * r.range(4.5, 9);
        return { x, z, y: r.range(-1, 7), w: r.range(1.4, 2.8), color: r() < 0.3 ? ORANGE : r.pick([BLUE, CYAN]), top: r.range(13, 18) };
      }),
    [],
  );
  const k = outQuad(ramp(t, reveal, 0.8));
  // it starts back in the hall and swings along an arc about its pivot, no overshoot
  const theta = -0.55 * (1 - k);
  const gx = GUILTY_TAG.centre[0];
  const gy = PIVOT[1] - TAG_L * Math.cos(theta);
  const gz = PIVOT[2] + TAG_L * Math.sin(theta);
  const { width, height } = GUILTY_TAG;
  const cable = useMemo<Vec3[]>(() => [PIVOT, [gx, gy + height / 2, gz]], [gx, gy, gz, height]);
  const lit = 0.2 + 0.8 * k;
  return (
    <>
      <PlateBackdrop plate={plate} />
      <TilePlatform position={[0, F, -14]} width={40} depth={50} cols={40} rows={50} splitX={0} left="#050a22" right="#0e0818" t={t * 0.3} pulse={0} opacity={0.6} />
      {tags.map((g, i) => (
        <group key={i}>
          <NeonTube points={[[g.x, g.top, g.z], [g.x, g.y + 0.35, g.z]]} color="#6a86b8" radius={0.012} opacity={0.4} />
          <GlowBox position={[g.x, g.y, g.z]} size={[g.w, 0.7, 0.1]} color={g.color} edge={0.35} fill={0.25} opacity={0.5} />
        </group>
      ))}
      <NeonTube points={cable} color={ORANGE} radius={0.02} opacity={0.4 + 0.6 * k} />
      <group position={[gx, gy, gz]} rotation={[-theta * 0.8, 0, 0]}>
        <mesh renderOrder={4.9} frustumCulled={false}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="#1a0804" transparent opacity={0.92} depthTest={false} depthWrite={false} />
        </mesh>
        <GlowBox position={[0, 0, 0]} size={[width, height, 0.15]} color={ORANGE} edge={0.3 + 0.7 * k} fill={0.12 + 0.4 * k} opacity={lit} />
      </group>
      <Halo position={[gx, gy, gz - 0.5]} size={width * 2.2} color={ORANGE} intensity={1.2 * k} opacity={k} order={4.8} />
      <BeamCone from={[3.5, 15, 3]} to={[gx, gy, gz]} radius={2.8} color="#ffb070" intensity={0.8 * k} opacity={k} />
      <Smoke y={F + 2} z={-14} width={40} height={8} color="#2a2050" density={0.4} t={t} />
      <Embers box={[-12, 12, F, 8, -24, 0]} count={50} t={t * 0.4} color="#9ab0ff" opacity={0.5} order={9} />
    </>
  );
};
export const NAMETAG_CAMERA: Cam = {
  from: { position: [0.6, 0.4, 11], target: [0.3, 1.2, -4], fov: 40 },
  to: { position: [0.3, 0.8, 8.8], target: [0.5, 1.8, -4], fov: 40 },
};
export const NAMETAG_SPOTS: { B: Spot } = { B: { x: -4, z: 1 } };

// ---- 3. Laser case -----------------------------------------------------------------------------------------
const CASE_C: Vec3 = [0, F + 3, -2];
const CASE_W = 2.8;
const CASE_H = 2.4;
const CASE_D = 2.4;
const HALF = [CASE_W / 2, CASE_H / 2, CASE_D / 2] as const;
export const CASE_LINE: { centre: Vec3; width: number; height: number } = { centre: CASE_C, width: 2.3, height: 0.55 };

// the six panes of the case: outward direction, size, resting rotation and spin per second
const PANES: { n: Vec3; size: [number, number]; rot: Vec3; spin: Vec3 }[] = [
  { n: [1, 0, 0], size: [CASE_D, CASE_H], rot: [0, Math.PI / 2, 0], spin: [1.4, 2.1, 0.6] },
  { n: [-1, 0, 0], size: [CASE_D, CASE_H], rot: [0, Math.PI / 2, 0], spin: [-1.1, -2.4, 0.9] },
  { n: [0, 1, 0], size: [CASE_W, CASE_D], rot: [-Math.PI / 2, 0, 0], spin: [2.2, 0.7, -1.3] },
  { n: [0, -1, 0], size: [CASE_W, CASE_D], rot: [-Math.PI / 2, 0, 0], spin: [-1.8, 1.2, 1.5] },
  { n: [0, 0, 1], size: [CASE_W, CASE_H], rot: [0, 0, 0], spin: [1.9, -1.6, 2.2] },
  { n: [0, 0, -1], size: [CASE_W, CASE_H], rot: [0, 0, 0], spin: [-2.1, 1.0, -1.7] },
];

// the twelve edges: offset from the centre (in half-extents) and the bar's size
const EDGES: { at: Vec3; size: Vec3 }[] = [];
const T = 0.07;
for (const sy of [-1, 1])
  for (const sz of [-1, 1]) EDGES.push({ at: [0, sy * HALF[1], sz * HALF[2]], size: [CASE_W, T, T] });
for (const sx of [-1, 1])
  for (const sz of [-1, 1]) EDGES.push({ at: [sx * HALF[0], 0, sz * HALF[2]], size: [T, CASE_H, T] });
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) EDGES.push({ at: [sx * HALF[0], sy * HALF[1], 0], size: [T, T, CASE_D] });

const POSTS = [-7, -2.6, 2.6, 7];

export const LaserCaseWorld = ({ t, plate, smash }: { t: number; plate?: string; smash: number }) => {
  const s = t - smash;
  const hit = s >= 0;
  const flash = hit ? Math.exp(-s * 5) : 0;
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 3, -9]} width={34} height={12} cols={68} rows={24} colors={['#0a1236', '#1a0a30']} pattern="checker" pulse={0} t={t * 0.05} opacity={0.6} />
      <TilePlatform position={[0, F, -2]} width={30} depth={26} cols={30} rows={26} splitX={0} left="#060c26" right="#180a0c" t={t * 0.4} pulse={0} opacity={0.7} />
      {/* pedestal: a plain shaded block, not an additive box */}
      <mesh position={[0, F + 0.8, -2]} renderOrder={3} frustumCulled={false}>
        <boxGeometry args={[3.4, 1.6, 3.2]} />
        <meshBasicMaterial color="#2a2e3c" transparent depthTest={false} depthWrite={false} />
      </mesh>
      <NeonTube points={[[-1.7, F + 1.6, -0.4], [1.7, F + 1.6, -0.4]]} color={CYAN} radius={0.03} />
      <BeamCone from={[0, 12, -1]} to={[0, F + 1.6, -2]} radius={2.4} color="#d8ecff" intensity={0.55} />
      {/* the code line slab inside the case */}
      <GlowBox position={CASE_C} size={[CASE_LINE.width, CASE_LINE.height, 0.12]} color="#3a8aff" edge={0.9} fill={0.5} />
      {PANES.map((p, i) => {
        const d = hit ? 7 * (1 - Math.exp(-2.2 * s)) : 0;
        const o = hit ? 0.3 * (1 - ramp(s, 0.4, 1.0)) : 0.07;
        if (o <= 0) return null;
        const pos = [0, 1, 2].map((a) => CASE_C[a]! + p.n[a]! * (HALF[a]! + d)) as Vec3;
        const rot = [0, 1, 2].map((a) => p.rot[a]! + (hit ? s * p.spin[a]! : 0)) as Vec3;
        return (
          <mesh key={i} position={pos} rotation={rot} renderOrder={6} frustumCulled={false}>
            <planeGeometry args={p.size} />
            <meshBasicMaterial color="#bfe6ff" transparent opacity={o} depthTest={false} depthWrite={false} side={2} />
          </mesh>
        );
      })}
      {/* the edges flash white at the hit and are gone with the panes */}
      {(!hit || flash > 0.01) &&
        EDGES.map((e, i) => (
          <GlowBox key={i} position={[CASE_C[0] + e.at[0], CASE_C[1] + e.at[1], CASE_C[2] + e.at[2]]} size={e.size} color={flash > 0.3 ? '#ffffff' : CYAN} edge={1} fill={1} opacity={hit ? 0.7 * flash : 1} order={7} />
        ))}
      {!hit && (
        <>
          <LaserFan origin={[-10, F + 2.4, 0.4]} count={4} spread={0.5} angle={0.06} length={22} color={RED} width={0.02} intensity={1} />
          <LaserFan origin={[10, F + 2.4, 0.4]} count={4} spread={0.5} angle={Math.PI - 0.06} length={22} color={RED} width={0.02} intensity={1} />
        </>
      )}
      {POSTS.map((x) => (
        <group key={x}>
          <GlowBox position={[x, F + 0.6, 3.4]} size={[0.2, 1.2, 0.2]} color="#c8b070" edge={0.6} fill={0.5} />
          <GlowBox position={[x, F + 0.06, 3.4]} size={[0.6, 0.12, 0.6]} color="#c8b070" edge={0.5} fill={0.4} />
        </group>
      ))}
      {[0, 1, 2].map((i) => {
        const x0 = POSTS[i]!;
        const x1 = POSTS[i + 1]!;
        return <NeonTube key={i} points={[[x0, F + 1.1, 3.4], [(x0 + x1) / 2, F + 0.8, 3.4], [x1, F + 1.1, 3.4]]} color={RED} radius={0.045} opacity={0.85} />;
      })}
      <Embers box={[-1, 1, CASE_C[1] - 1, CASE_C[1] + 1, CASE_C[2] - 1, CASE_C[2] + 1]} count={20} t={t * 0.3} color="#9ac8ff" opacity={hit ? 0 : 0.4} order={9} />
      <Embers box={[-1, 1, CASE_C[1], CASE_C[1] + 1, CASE_C[2], CASE_C[2]]} count={1} t={t} color="#ffb050" bursts={[{ t: smash, origin: CASE_C }]} order={9} />
      <Smoke y={F + 1} z={-4} width={26} height={4} color="#202a50" density={0.3} t={t} />
    </>
  );
};
export const LASERCASE_CAMERA: Cam = {
  from: { position: [0.4, 0.6, 12.5], target: [0, -0.4, -2], fov: 40 },
  to: { position: [-0.5, 1.0, 10], target: [0, -0.2, -2], fov: 40 },
};
export const LASERCASE_SPOTS: { B: Spot; O: Spot } = { B: { x: -4, z: 1.5 }, O: { x: 3.8, z: 1.5 } };

// ---- 4. Whisper --------------------------------------------------------------------------------------------
export const WhisperWorld = ({ t, plate }: { t: number; plate?: string }) => (
  <>
    <PlateBackdrop plate={plate} />
    <Halo position={[-1, 1.5, -3]} size={6} color="#2a50c0" intensity={0.5} order={3} />
    <BeamCone from={[-1, 13, 0]} to={[-1, F, 0]} radius={1.1} color="#8aa8d8" intensity={0.2} />
    <Smoke y={F + 1} z={-6} width={26} height={4} color="#10182c" density={0.2} t={t * 0.3} />
    <Embers box={[-6, 4, F, 6, -4, 3]} count={40} t={t * 0.25} color="#9ab0d0" opacity={0.6} order={9} />
  </>
);
export const WHISPER_CAMERA: Cam = {
  from: { position: [-0.7, 0.3, 9.2], target: [-1, 0.2, 0], fov: 40 },
  to: { position: [-0.9, 0.35, 8.6], target: [-1, 0.2, 0], fov: 40 },
};
export const WHISPER_SPOTS: { B: Spot } = { B: { x: -1, z: 0 } };
