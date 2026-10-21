// Verse 2, the orange girl's night world: spray paint and neon (orange, hot magenta, violet on deep night blue,
// a little blue for the rival). Each world is a pure function of t, built from the kit; the git object is the space.
//  RailsWorld     `git log --graph` as rails the camera rides: blue main, an orange feature rail branching off.
//  GraffitiWorld  her spray-paint wall, with a clear panel where the type paints the diff.
//  AlleyWorld     a neon alley, shop signs receding on both sides.
//  StadiumWorld   "300 commits" as a stadium with a scoreboard.
import { useMemo } from 'react';
import type { CameraPose, Vec3 } from '../camera/camera.ts';
import type { Hex } from '../lib/ease.ts';
import { clamp01, ramp } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { FLOOR_Y as F } from '../stage/floor.ts';
import { BeamCone, Embers, GlowBox, Halo, LaserFan, LedWall, NeonTube, Smoke, TilePlatform } from './kit/index.ts';
import { PlateBackdrop } from './plate.tsx';

const ORANGE: Hex = '#ff7a1a';
const MAGENTA: Hex = '#ff2bb8';
const VIOLET: Hex = '#8a3cff';
const BLUE: Hex = '#2b6bff';
const RAIL_Y = F + 0.06;

type Spot = { x: number; z: number };
type Cam = { from: CameraPose; to: CameraPose };

// ---- 1. Rails ----------------------------------------------------------------------------------------------
const MAIN_X = -2.5;
const FEATURE_X = 2.5;
/** The feature rail: leaves main at z = -25 and S-curves onto x = 2.5 by z = -9, then runs to the camera. */
const FEATURE: Vec3[] = [
  [MAIN_X, RAIL_Y, -28], [MAIN_X, RAIL_Y, -25], [MAIN_X + 1, RAIL_Y, -22], [0, RAIL_Y, -17], [FEATURE_X - 1, RAIL_Y, -12], [FEATURE_X, RAIL_Y, -9], [FEATURE_X, RAIL_Y, -2], [FEATURE_X, RAIL_Y, 10],
];
const MAIN: Vec3[] = [[MAIN_X, RAIL_Y, 10], [MAIN_X, RAIL_Y, -80]];
const featureX = (z: number): number => {
  for (let i = 0; i < FEATURE.length - 1; i++) {
    const a = FEATURE[i] as Vec3;
    const b = FEATURE[i + 1] as Vec3;
    if (z <= a[2] && z >= b[2]) return a[0] + ((b[0] - a[0]) * (a[2] - z)) / (a[2] - b[2]);
  }
  return FEATURE_X;
};
// Fraction of the feature rail's length at depth z (the tube lights from its far end).
const featureFrac = (z: number): number => clamp01((z + 28) / -38);

export const RailsWorld = ({ t, plate, split }: { t: number; plate?: string; split: number }) => {
  const on = ramp(t, split, 0.5);
  const parts = useMemo(() => {
    const ties: { x: number; z: number; feature: boolean }[] = [];
    for (let z = 8; z > -80; z -= 2) ties.push({ x: MAIN_X, z, feature: false });
    for (let z = 8; z > -26; z -= 2) ties.push({ x: featureX(z), z, feature: true });
    const nodes: { x: number; z: number; feature: boolean }[] = [];
    for (let z = 2; z > -80; z -= 7) nodes.push({ x: MAIN_X, z, feature: false });
    for (let z = -2; z > -26; z -= 6) nodes.push({ x: featureX(z), z, feature: true });
    return { ties, nodes };
  }, []);
  // feature ties and nodes light as the lit part of the tube passes them
  const lit = (s: { z: number; feature: boolean }) => (s.feature ? clamp01(on * 1.4 - featureFrac(s.z) * 1.3) : 1);
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 4, -85]} width={120} height={30} cols={80} rows={20} colors={['#1a1060', '#3a0a50']} pattern="scan" pulse={0.1} t={t} />
      <TilePlatform position={[0, F, -34]} width={22} depth={90} cols={22} rows={90} splitX={0} left="#0a1038" right="#1c0a34" t={t} pulse={0.1} />
      <NeonTube points={MAIN} color={BLUE} radius={0.07} />
      <NeonTube points={FEATURE} color={ORANGE} radius={0.07} on={on} />
      {parts.ties.map((s, i) =>
        lit(s) > 0 ? <GlowBox key={`t${i}`} position={[s.x, F + 0.03, s.z]} size={[1.7, 0.06, 0.2]} color={s.feature ? ORANGE : BLUE} edge={0.7} fill={0.35} opacity={lit(s)} /> : null,
      )}
      {parts.nodes.map((n, i) =>
        lit(n) > 0 ? (
          <group key={`n${i}`}>
            <Halo position={[n.x, RAIL_Y + 0.5, n.z]} size={2.6} color={n.feature ? ORANGE : BLUE} intensity={0.9} opacity={lit(n)} />
            <GlowBox position={[n.x, RAIL_Y + 0.5, n.z]} size={[0.5, 0.5, 0.5]} color={n.feature ? '#ffd0a0' : '#a8c4ff'} edge={1} fill={0.9} opacity={lit(n)} />
          </group>
        ) : null,
      )}
      <Smoke y={F + 1.4} z={-8} width={30} height={5} color="#3a2a9a" density={0.55} t={t} />
      <Smoke y={F + 2} z={-30} width={50} height={8} color="#2a1a70" density={0.6} t={t + 5} />
      <BeamCone from={[-7, 10, -10]} to={[-1, F, -6]} radius={2.4} color={MAGENTA} intensity={0.55} />
      <BeamCone from={[7, 10, -18]} to={[1, F, -12]} radius={2.6} color={MAGENTA} intensity={0.5} />
      <BeamCone from={[-6, 10, -34]} to={[0, F, -30]} radius={3} color={VIOLET} intensity={0.5} />
      <Embers box={[-9, 9, F, 6, -40, 4]} count={200} t={t} color={ORANGE} />
    </>
  );
};
export const RAILS_CAMERA: Cam = {
  from: { position: [0.2, 0.4, 11], target: [0.3, -0.4, -4], fov: 40 },
  to: { position: [0.6, 1.4, 8.5], target: [0.2, -0.6, -10], fov: 40 },
};
export const RAILS_SPOTS: { O: Spot } = { O: { x: 2.5, z: 0 } };

// ---- 2. Graffiti -------------------------------------------------------------------------------------------
const WALL_Z = -9;
export const GRAFFITI_PANEL: { centre: Vec3; width: number; height: number } = { centre: [0, 1.4, WALL_Z + 0.3], width: 9, height: 4.2 };

const squiggle = (key: string, x: number, y: number, w: number, h: number): Vec3[] => {
  const r = seeded(key);
  const n = 9;
  return Array.from({ length: n }, (_, i) => [x + (i / (n - 1)) * w + r.range(-0.5, 0.5), y + (i % 2 ? h : 0) * r.range(0.4, 1) + r.range(-0.4, 0.4), WALL_Z + 0.35] as Vec3);
};

export const GraffitiWorld = ({ t, plate, spray }: { t: number; plate?: string; spray: number }) => {
  const strokes = useMemo(() => {
    const cols: Hex[] = [ORANGE, MAGENTA, ORANGE, MAGENTA, VIOLET, ORANGE, MAGENTA, ORANGE];
    const places: [number, number, number, number][] = [[-15, 3.5, 7, 3.5], [-15, -1.8, 6, 2.5], [-14, 6.5, 8, 1.5], [7.5, 3.8, 7.5, 3.2], [8.5, -1.5, 6.5, 2.5], [6, 6.8, 9, 1.4], [-5, 7.2, 10, 1.2], [-8, -2.6, 16, 1]];
    return places.map(([x, y, w, h], i) => ({ pts: squiggle(`graffiti:${i}`, x, y, w, h), color: cols[i] as Hex }));
  }, []);
  const { centre, width, height } = GRAFFITI_PANEL;
  const frame = useMemo(() => {
    const hw = width / 2 + 0.3;
    const hh = height / 2 + 0.3;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh], [-hw, -hh + 0.2]].map(([x, y]) => [centre[0] + (x as number), centre[1] + (y as number), centre[2] + 0.05] as Vec3);
  }, [centre, width, height]);
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 2.6, WALL_Z]} width={36} height={12} cols={72} rows={24} colors={['#4a2410', '#2a1020']} pattern="checker" pulse={0} t={t * 0.05} />
      <mesh position={[centre[0], centre[1], WALL_Z + 0.1]} renderOrder={1.6}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#0c0714" transparent opacity={0.92} depthTest={false} depthWrite={false} />
      </mesh>
      <NeonTube points={frame} color={ORANGE} radius={0.04} on={ramp(t, spray, 0.7)} />
      {strokes.map((s, i) => (
        <NeonTube key={i} points={s.pts} color={s.color} radius={0.09} on={ramp(t, spray + (i / strokes.length) * 1, 0.5)} />
      ))}
      <TilePlatform position={[0, F, -3]} width={34} depth={14} cols={34} rows={14} splitX={0} left="#1a0a3a" right="#2a0a30" t={t} pulse={0.15} />
      {[-9, 9].map((x, i) => (
        <group key={x}>
          <GlowBox position={[x, F + 3.6, -5]} size={[0.18, 7.2, 0.18]} color="#6a5a7a" edge={0.5} fill={0.4} />
          <Halo position={[x, 6.8, -5]} size={3} color={i ? MAGENTA : ORANGE} intensity={1} />
          <BeamCone from={[x, 6.9, -5]} to={[x * 0.45, F, 0.5]} radius={3.6} color={i ? MAGENTA : ORANGE} intensity={0.6} />
        </group>
      ))}
      <BeamCone from={[0, 9, -2]} to={[0, F, -4]} radius={3.4} color={VIOLET} intensity={0.35} />
      <Smoke y={F + 1} z={-4} width={36} height={4} color="#6a3a9a" density={0.4} t={t} />
      <Embers box={[-14, 14, F, 6, -8, 3]} count={240} t={t} color={ORANGE} />
      <Embers box={[-14, 14, F, 6, -8, 3]} count={160} t={t + 9} color={MAGENTA} />
    </>
  );
};
export const GRAFFITI_CAMERA: Cam = {
  from: { position: [0, 0.4, 13], target: [0, 0.6, 0], fov: 40 },
  to: { position: [1.2, 0.9, 10.5], target: [0, 1, -2], fov: 40 },
};
export const GRAFFITI_SPOTS: { O: Spot; B: Spot } = { O: { x: 3.8, z: 1 }, B: { x: -4.2, z: 1 } };

// ---- 3. Alley ----------------------------------------------------------------------------------------------
const SIGN_COLORS: Hex[] = [ORANGE, MAGENTA, VIOLET, '#19c8ff', '#ff4a6a', '#ffc21a'];

export const AlleyWorld = ({ t, plate }: { t: number; plate?: string }) => {
  const signs = useMemo(() => {
    const out: { side: number; z: number; y: number; w: number; h: number; color: Hex; led: boolean; rate: number }[] = [];
    for (const side of [-1, 1])
      for (let i = 0; i < 9; i++) {
        const r = seeded(`alley:${side}:${i}`);
        out.push({ side, z: 3 - i * 4.4 + r.range(-0.5, 0.5), y: r.pick([-0.6, 1.2, 3.4]), w: r.range(2, 3.4), h: r.range(0.8, 1.8), color: r.pick(SIGN_COLORS), led: r() < 0.4, rate: r.range(0.55, 0.95) });
      }
    return out;
  }, []);
  // signs re-roll their on/off every 4 frames
  const step = Math.floor(t * 15);
  return (
    <>
      <PlateBackdrop plate={plate} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 6.6, 0, -18]} rotation={[0, s * -Math.PI / 2, 0]}>
          <LedWall position={[0, 3, 0]} width={56} height={14} cols={56} rows={14} colors={['#16103a', '#2a0a40']} pattern="checker" t={t * 0.1} />
        </group>
      ))}
      <LedWall position={[0, 3, -48]} width={20} height={14} cols={20} rows={14} colors={['#3a1060', '#a01a80']} pattern="bars" pulse={0.2} t={t} />
      <TilePlatform position={[0, F, -20]} width={13} depth={56} cols={13} rows={56} splitX={0} left="#12103a" right="#2a0a3a" t={t * 0.5} pulse={0.15} />
      {signs.map((s, i) => {
        const lit = seeded(`alley:flick:${i}:${step}`)() < s.rate ? 1 : 0.15;
        const x = s.side * 6;
        return (
          <group key={i}>
            {s.led ? (
              <group position={[x, s.y, s.z]} rotation={[0, s.side * -Math.PI / 2, 0]}>
                <LedWall position={[0, 0, 0.05]} width={s.w} height={s.h} cols={12} rows={5} colors={[s.color, '#ffffff']} pattern="bars" pulse={0.2} t={t + i} opacity={lit} />
              </group>
            ) : (
              <GlowBox position={[x, s.y, s.z]} size={[0.3, s.h, s.w]} color={s.color} edge={lit} fill={0.7 * lit} />
            )}
            <Halo position={[x - s.side * 0.5, s.y, s.z]} size={s.w * 1.6} color={s.color} intensity={0.55 * lit} />
          </group>
        );
      })}
      <NeonTube points={[[-6.2, F + 0.1, -2], [-6.2, F + 0.1, -46]]} color={MAGENTA} radius={0.04} />
      <NeonTube points={[[6.2, F + 0.1, -2], [6.2, F + 0.1, -46]]} color={ORANGE} radius={0.04} />
      <Smoke y={F + 1.2} z={-6} width={14} height={4.5} color="#5a3a9a" density={0.5} t={t} />
      <Smoke y={F + 1.6} z={-22} width={18} height={6} color="#4a2a8a" density={0.55} t={t + 4} />
      <LaserFan origin={[-7, 1.4, -40]} count={3} spread={0.12} angle={0.02} length={14} color={MAGENTA} width={0.04} intensity={1} />
      <Halo position={[0, 1.4, -40]} size={7} color={MAGENTA} intensity={0.6} />
      <Embers box={[-5, 5, F, 6, -30, 3]} count={120} t={t} color="#ffb0e0" />
    </>
  );
};
export const ALLEY_CAMERA: Cam = {
  from: { position: [0, 0.2, 11], target: [0, 0.2, -6], fov: 42 },
  to: { position: [0.6, 0.5, 8.5], target: [0, 0.3, -8], fov: 42 },
};
export const ALLEY_SPOTS: { O: Spot; B: Spot } = { O: { x: 2.6, z: 0 }, B: { x: -2.6, z: 0 } };

// ---- 4. Stadium --------------------------------------------------------------------------------------------
export const SCOREBOARD: { centre: Vec3; width: number; height: number } = { centre: [0, 5, -14], width: 14, height: 5.5 };

export const StadiumWorld = ({ t, plate, pulse }: { t: number; plate?: string; pulse: number }) => {
  const { centre, width, height } = SCOREBOARD;
  return (
    <>
      <PlateBackdrop plate={plate} />
      <GlowBox position={[centre[0], centre[1], centre[2] - 0.2]} size={[width + 1.2, height + 1.2, 0.4]} color={ORANGE} edge={0.7 + 0.3 * pulse} fill={0.1} />
      <LedWall position={centre} width={width} height={height} cols={56} rows={22} colors={['#5a1a8a', '#ff4a90']} pattern="scan" pulse={0.4 * pulse} t={t} order={1.8} />
      <TilePlatform position={[0, F, -4]} width={30} depth={22} cols={30} rows={22} splitX={0} left={ORANGE} right={VIOLET} t={t} pulse={pulse * 0.7} />
      <NeonTube points={[[-13, F + 0.05, -14], [13, F + 0.05, -14]]} color="#ffd0a0" radius={0.04} />
      <NeonTube points={[[-13, F + 0.05, 6], [13, F + 0.05, 6]]} color="#ffd0a0" radius={0.04} />
      <NeonTube points={[[0, F + 0.05, -14], [0, F + 0.05, 6]]} color="#ffd0a0" radius={0.04} />
      {[-1, 1].map((s) => (
        <group key={s}>
          {[0, 1].map((tier) => (
            <group key={tier} position={[s * (17 + tier * 3.5), F + 2 + tier * 3, -4]} rotation={[0, -s * Math.PI / 2, 0]}>
              <LedWall position={[0, 0, 0]} width={34} height={3} cols={96} rows={8} colors={tier ? [MAGENTA, VIOLET] : [ORANGE, '#ffd070']} pattern="scan" pulse={0.25 * pulse} t={t + tier * 2} />
            </group>
          ))}
          {[-12, 4].map((z, k) => (
            <group key={z}>
              <GlowBox position={[s * 15, F + 6, z]} size={[0.4, 12, 0.4]} color="#8a80a0" edge={0.45} fill={0.4} />
              <Halo position={[s * 15, F + 12.2, z]} size={5.5} color="#fff0d8" intensity={0.8 + 0.4 * pulse} />
              <BeamCone from={[s * 15, F + 12, z]} to={[s * 3, F, -4]} radius={4.5} color={k ? MAGENTA : ORANGE} intensity={0.45 + 0.25 * pulse} />
            </group>
          ))}
        </group>
      ))}
      <Smoke y={F + 1.5} z={-8} width={40} height={5} color="#4a2a8a" density={0.4} t={t} />
      <Embers box={[-14, 14, F, 8, -14, 6]} count={200} t={t} color={ORANGE} />
    </>
  );
};
export const STADIUM_CAMERA: Cam = {
  from: { position: [0, 0, 13], target: [0, 1.5, -6], fov: 40 },
  to: { position: [-1, 1, 10.5], target: [0.5, 2, -6], fov: 40 },
};
export const STADIUM_SPOTS: { O: Spot } = { O: { x: 3.5, z: 2 } };
