// The V1 git worlds: the git object IS the scene. Built from the disco kit (blue neon tubes, light boxes,
// mirror-ball light, glitter; cyan/blue/violet with a touch of magenta), each a pure function of t.
//  terminal  "Automatic merge failed": a control room, a curved wall of LED panels scanning red error bars.
//  subway    `git branch` as a neon subway map the camera rides: main, feature and stable lines with stations.
//  press     "approved by the whole design team": five stamping presses over a conveyor.
//  clock     "pushed at midnight": a clock tower whose hands hit 00:00 on the strike.
import { useMemo } from 'react';
import { type CameraPose, type Vec3 } from '../camera/camera.ts';
import { FLOOR_Y } from '../stage/floor.ts';
import { clamp01, type Hex, outQuad, ramp } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { BeamCone, type EmberBurst, Embers, DotsPlane, GlowBox, Halo, LedWall, NeonTube, Smoke, TilePlatform } from './kit/index.ts';
import { PlateBackdrop } from './plate.tsx';

const F = FLOOR_Y;
const BLUE: Hex = '#2a6bff';
const CYAN: Hex = '#19e6ff';
const VIOLET: Hex = '#8a52ff';
const MAGENTA: Hex = '#ff3fd0';
const ORANGE: Hex = '#ff8a2a';
const RED: Hex = '#ff2a1a';

export interface Spot { x: number; z: number }
export interface HeroCamera { from: CameraPose; to: CameraPose }

/** Points of a circle in the x-y plane around the origin (closed by repeating the first point). */
const circle = (r: number, n = 48): Vec3[] => Array.from({ length: n + 1 }, (_, i) => [Math.sin((i / n) * Math.PI * 2) * r, Math.cos((i / n) * Math.PI * 2) * r, 0] as Vec3);

// ---- 1. Terminal --------------------------------------------------------------------------------------------
export const TERMINAL_SPOTS: { B: Spot } = { B: { x: -3, z: 0 } };
export const TERMINAL_CAMERA: HeroCamera = {
  from: { position: [3.2, 0.2, 12.5], target: [-1.8, -0.4, 0], fov: 40 },
  to: { position: [0.6, 0.0, 9.6], target: [-2.6, -0.3, 0], fov: 40 },
};

const ARC_R = 15;
const ARC_BANDS = [-1.8, 1.0, 3.8].map((y) => Array.from({ length: 13 }, (_, i) => { const a = ((i - 6) * 10 * Math.PI) / 180; return [Math.sin(a) * (ARC_R - 0.3), y, 4 - Math.cos(a) * (ARC_R - 0.3)] as Vec3; }));
const ARC_ANGLES = [-52, -26, 0, 26, 52];
const DESKS: { x: number; z: number; c: Hex }[] = [
  { x: -8.5, z: -1.5, c: CYAN },
  { x: 7.5, z: -2, c: RED },
  { x: 9.5, z: 3, c: BLUE },
];

export const TerminalWorld = ({ t, plate, fail }: { t: number; plate?: string; fail: number }) => {
  const failed = t >= fail;
  const k = ramp(t, fail, 0.25);
  // after the failure the error bars beat hard; before it they only idle
  const beat = failed ? 0.55 + 0.45 * Math.abs(Math.sin((t - fail) * 11)) : 0.08;
  return (
    <>
      <PlateBackdrop plate={plate} />
      {ARC_ANGLES.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return (
          <group key={deg} position={[Math.sin(a) * ARC_R, 1.6, 4 - Math.cos(a) * ARC_R]} rotation={[0, -a, 0]}>
            <LedWall position={[0, 0, 0]} width={7.6} height={10.4} cols={14} rows={20} colors={['#ff1a1a', '#ff8a2a']} pattern="scan" pulse={beat} t={t * (failed ? 1.6 : 0.8) + i * 0.41} opacity={0.5 + 0.5 * k} order={1.5} />
          </group>
        );
      })}
      {ARC_BANDS.map((pts, i) => (
        <NeonTube key={i} points={pts} color={RED} radius={0.07} opacity={0.3 + 0.7 * k * beat} order={4} />
      ))}
      <Halo position={[0, 1.6, -10]} size={22} color={RED} intensity={0.25 + 0.5 * k * beat} order={1.2} />
      <TilePlatform position={[0, F, -2]} width={30} depth={16} cols={30} rows={16} splitX={0} left="#17409a" right="#a01c14" t={t} pulse={0.15 + 0.4 * k * beat} opacity={0.55} />
      {DESKS.map((d) => (
        <GlowBox key={d.x} position={[d.x, F + 0.5, d.z]} size={[3.2, 1, 1.6]} color={d.c} edge={0.8} fill={0.18} rotation={[0, d.x < 0 ? 0.4 : -0.4, 0]} />
      ))}
      <NeonTube points={[[-12, F + 0.05, -4], [0, F + 0.05, -9], [12, F + 0.05, -4]]} color={failed ? RED : BLUE} radius={0.06} />
      <BeamCone from={[-3, 9, 0.6]} to={[-3, F, 0]} radius={2.3} color="#78b4ff" intensity={0.65} />
      <Halo position={[-3, 9, 0.6]} size={2.6} color="#b8d8ff" intensity={0.9} />
      <Smoke y={F + 1} z={-3} width={28} height={3.6} color="#4a5a9a" density={0.55} t={t} />
      <Embers box={[-11, 11, F, 7, -8, 5]} count={240} t={t} color="#9fc0ff" />
    </>
  );
};

// ---- 2. Subway ----------------------------------------------------------------------------------------------
export const SUBWAY_SPOTS: { B: Spot } = { B: { x: -3, z: 0 } };
export const SUBWAY_CAMERA: HeroCamera = {
  from: { position: [2.4, 0.5, 12.5], target: [-0.6, -1.0, -8], fov: 40 },
  to: { position: [1.4, 0.0, 9.0], target: [-0.6, -1.0, -10], fov: 40 },
};
export const SUBWAY_SIGNS: { main: Vec3; feature: Vec3; stable: Vec3 } = {
  main: [-2.6, 0.5, -8],
  feature: [-5.4, 0.9, -24],
  stable: [2.4, -0.2, -13],
};

const Z0 = 4;
const Z1 = -66;
const MAIN_PTS: Vec3[] = [[0, -2, Z0], [0, -2, -14], [0, -2, -30], [0, -2, -48], [0, -2, Z1]];
const FEATURE_PTS: Vec3[] = [[0, -2, -12], [0, -1.9, -16], [-2.2, -1.6, -21], [-5, -1.3, -28], [-6, -1.1, -40], [-6, -1, -52], [-6, -1, Z1]];
const STABLE_PTS: Vec3[] = [[4.8, -2.9, Z0], [4.8, -2.9, -22], [4.8, -2.9, -44], [4.8, -2.9, Z1]];
const ARCHES: Vec3[][] = [-12, -26, -40, -54].map((z) => [[-9.5, F, z], [-9, 1, z], [-5.5, 4.8, z], [0, 6.4, z], [5.5, 4.8, z], [9, 1, z], [9.5, F, z]] as Vec3[]);

interface Line { color: Hex; pts: Vec3[]; radius: number; frac: (z: number) => number; stations: { z: number; x: number; y: number; side: number }[] }
const LINES: Record<'main' | 'feature' | 'stable', Line> = {
  main: { color: BLUE, pts: MAIN_PTS, radius: 0.16, frac: (z) => (Z0 - z) / (Z0 - Z1), stations: [-8, -18, -28, -38, -48, -58].map((z) => ({ z, x: 0, y: -2, side: -2.6 })) },
  feature: { color: ORANGE, pts: FEATURE_PTS, radius: 0.09, frac: (z) => (-12 - z) / (-12 - Z1), stations: [{ z: -24, x: -3.7, y: -1.45, side: 2.4 }, { z: -40, x: -6, y: -1.1, side: 2.4 }, { z: -56, x: -6, y: -1, side: 2.4 }] },
  stable: { color: CYAN, pts: STABLE_PTS, radius: 0.09, frac: (z) => (Z0 - z) / (Z0 - Z1), stations: [-13, -28, -43, -58].map((z) => ({ z, x: 4.8, y: -2.9, side: -2.4 })) },
};

export const SubwayWorld = ({ t, plate, lit }: { t: number; plate?: string; lit: { main: number; feature: number; stable: number } }) => {
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 1, -70]} width={60} height={16} cols={40} rows={11} colors={['#2a1a80', '#7a2bd0']} pattern="scan" pulse={0.2} t={t} opacity={0.5} order={1.2} />
      <TilePlatform position={[0, F, -28]} width={20} depth={80} cols={20} rows={80} splitX={0} left="#1c3aa8" right="#1a8aa8" t={t} pulse={0.15} opacity={0.3} order={1} />
      <TilePlatform position={[-3, F + 0.02, 0.5]} width={8} depth={6} cols={8} rows={6} splitX={-3} left="#2a6bff" right="#8a52ff" t={t} pulse={0.35 * pulse} opacity={0.9} order={1.1} />
      {ARCHES.map((pts, i) => (
        <NeonTube key={i} points={pts} color={i % 2 ? VIOLET : MAGENTA} radius={0.05} opacity={0.55} order={4} />
      ))}
      {(['main', 'feature', 'stable'] as const).map((k) => {
        const ln = LINES[k];
        return (
          <group key={k}>
            <NeonTube points={ln.pts} color={ln.color} radius={ln.radius} on={lit[k]} />
            {ln.stations.map((s) => {
              const on = ln.frac(s.z) <= lit[k] ? 1 : 0;
              return (
                <group key={s.z}>
                  <Halo position={[s.x, s.y, s.z]} size={on ? 1.5 : 0.9} color={ln.color} intensity={on ? 0.6 : 0.15} order={6} />
                  <GlowBox position={[s.x + s.side, F + 0.12, s.z]} size={[2.4, 0.24, 3.4]} color={ln.color} edge={on ? 0.9 : 0.15} fill={on ? 0.35 : 0.05} order={4.6} />
                  <GlowBox position={[s.x + s.side, 0.4, s.z]} size={[0.08, 7, 0.08]} color={ln.color} edge={on ? 0.5 : 0.1} fill={on ? 0.4 : 0.05} order={4.4} />
                </group>
              );
            })}
          </group>
        );
      })}
      {(['main', 'feature', 'stable'] as const).map((k) => {
        const on = lit[k] > 0.05;
        return <GlowBox key={k} position={SUBWAY_SIGNS[k]} size={[3.2, 1.2, 0.1]} color={LINES[k].color} edge={on ? 1 : 0.2} fill={on ? 0.55 : 0.08} order={6.5} />;
      })}
      <Halo position={[0, 5.5, -16]} size={3.4} color="#dff0ff" intensity={0.8} order={2.2} />
      <BeamCone from={[-3, 9, 0.6]} to={[-3, F, 0]} radius={2.2} color={BLUE} intensity={0.5} />
      <Smoke y={F + 1} z={-10} width={22} height={3.4} color="#6a62c8" density={0.5} t={t} />
      <Embers box={[-9, 9, F, 7, -40, 5]} count={260} t={t} color="#bfe0ff" />
    </>
  );
};

// ---- 3. Press -----------------------------------------------------------------------------------------------
export const PRESS_SPOTS: { B: Spot } = { B: { x: -4.2, z: 1.5 } };
export const PRESS_CAMERA: HeroCamera = {
  from: { position: [3, 1.2, 21], target: [0.5, 1.6, -4], fov: 40 },
  to: { position: [-1, 0.6, 16.5], target: [0.2, 1.8, -4], fov: 40 },
};
const PRESS_Z = -4;
const PRESS_XS = [-8, -4, 0, 4, 8];
export const PRESS_STAMPS: Vec3[] = PRESS_XS.map((x) => [x, F + 0.05, PRESS_Z]);
const HEAD_UP = 3.9;
const HEAD_DOWN = F + 0.85;
const ROD_TOP = 9.2;
const HEAD_EDGE: Vec3[] = [[-1.45, -0.7, 1.05], [1.45, -0.7, 1.05]];
const SLAM_END = 29;

/** Press depth 0 (up) .. 1 (down) for a slam at s: down in 3 frames, hold 6, rise over 20. */
const pressDepth = (t: number, s: number): number => {
  const f = (t - s) * 60;
  if (f < 0 || f >= SLAM_END) return 0;
  if (f < 3) return f / 3;
  if (f < 9) return 1;
  return 1 - outQuad((f - 9) / 20);
};

export const PressWorld = ({ t, plate, slams }: { t: number; plate?: string; slams: number[] }) => {
  const press = PRESS_XS.map((x, p) => {
    const mine = slams.filter((_, i) => i % 5 === p && i >= 0);
    const s = [...mine].reverse().find((v) => v <= t);
    return { x, d: s === undefined ? 0 : pressDepth(t, s) };
  });
  const hits = slams.map((s, i) => ({ t: s + 0.05, x: PRESS_XS[i % 5] as number })).filter((h) => h.t <= t && t - h.t < 0.8).slice(-4);
  const flash = Math.max(0, ...hits.map((h) => (1 - (t - h.t) / 0.8) ** 2));
  const bursts: EmberBurst[] = hits.map((h) => ({ t: h.t, origin: [h.x, F + 0.3, PRESS_Z + 1] as Vec3 }));
  return (
    <>
      <PlateBackdrop plate={plate} />
      <LedWall position={[0, 3, -9]} width={30} height={13} cols={40} rows={18} colors={['#1c3aff', '#8a2bff']} pattern="bars" pulse={0.3 * flash} t={t} opacity={0.3} order={1.5} />
      <TilePlatform position={[0, F, PRESS_Z]} width={22} depth={3.6} cols={44} rows={7} splitX={0} left={CYAN} right={VIOLET} t={t} pulse={0.2 + 0.5 * flash} erupt={hits.map((h) => ({ t: h.t, x: h.x, z: PRESS_Z }))} order={1.8} />
      <TilePlatform position={[0, F, 2]} width={22} depth={9} cols={22} rows={9} splitX={0} left="#17409a" right="#5a2ab0" t={t} pulse={0.1} opacity={0.4} order={1} />
      <GlowBox position={[0, ROD_TOP + 0.9, PRESS_Z]} size={[22, 0.5, 0.6]} color={CYAN} edge={0.9} fill={0.3} order={4.8} />
      {[-10.5, 10.5].map((x) => (
        <GlowBox key={x} position={[x, 3, PRESS_Z]} size={[0.5, 13, 0.6]} color="#9fb4c8" edge={0.7} fill={0.35} order={4.8} />
      ))}
      {press.map(({ x, d }) => {
        const y = HEAD_UP + (HEAD_DOWN - HEAD_UP) * d;
        const top = y + 0.65;
        return (
          <group key={x}>
            <BeamCone from={[x, 10, PRESS_Z]} to={[x, F, PRESS_Z]} radius={1.7} color={VIOLET} intensity={0.4 + 0.5 * (d > 0.9 ? flash : 0)} />
            <GlowBox position={[x - 0.5, (top + ROD_TOP) / 2, PRESS_Z]} size={[0.14, ROD_TOP - top, 0.14]} color="#cfe0f0" edge={0.3} fill={0.5} order={5.2} />
            <GlowBox position={[x + 0.5, (top + ROD_TOP) / 2, PRESS_Z]} size={[0.14, ROD_TOP - top, 0.14]} color="#cfe0f0" edge={0.3} fill={0.5} order={5.2} />
            <GlowBox position={[x, ROD_TOP + 0.4, PRESS_Z]} size={[3, 0.8, 1.6]} color="#9fb4c8" edge={0.7} fill={0.4} order={5} />
            <group position={[x, y, PRESS_Z]}>
              <GlowBox position={[0, 0, 0]} size={[3, 1.3, 2]} color="#b8c8d8" edge={0.6} fill={0.3} order={5.4} />
              <NeonTube points={HEAD_EDGE} color={CYAN} radius={0.05} order={5.6} />
            </group>
            <Halo position={[x, F + 0.4, PRESS_Z + 0.5]} size={5} color="#9fe8ff" intensity={0.8 * (d > 0.9 ? flash : 0)} order={6.5} />
          </group>
        );
      })}
      <Halo position={[0, 6, -6]} size={3} color="#e6dcff" intensity={0.7} order={2.2} />
      <Smoke y={F + 1} z={-3} width={26} height={3.2} color="#7a6ac0" density={0.45} t={t} />
      <Embers box={[-11, 11, F, 6, -6, 3]} count={200} t={t} color="#9fe0ff" bursts={bursts} />
    </>
  );
};

// ---- 4. Clock -----------------------------------------------------------------------------------------------
export const CLOCK_FACE: { centre: Vec3; radius: number } = { centre: [0, 6.5, -9], radius: 4.4 };
export const CLOCK_SPOTS: { B: Spot; O: Spot } = { B: { x: -4, z: 2 }, O: { x: 4, z: 2 } };
export const CLOCK_CAMERA: HeroCamera = {
  from: { position: [-1.5, 0.8, 15], target: [0, 3.4, -6], fov: 40 },
  to: { position: [1.4, 1.4, 11.5], target: [0, 4.2, -6], fov: 40 },
};
const FACE_RING = circle(CLOCK_FACE.radius);
const HAND_WINDOW = 2.4;

const Hand = ({ theta, len, w, color, order }: { theta: number; len: number; w: number; color: Hex; order: number }) => {
  const [cx, cy, cz] = CLOCK_FACE.centre;
  return <GlowBox position={[cx + (Math.sin(theta) * len) / 2, cy + (Math.cos(theta) * len) / 2, cz + 0.2]} size={[w, len, 0.1]} color={color} edge={0.7} fill={0.9} rotation={[0, 0, -theta]} order={order} />;
};

export const ClockWorld = ({ t, plate, strike }: { t: number; plate?: string; strike: number }) => {
  const [cx, cy, cz] = CLOCK_FACE.centre;
  const R = CLOCK_FACE.radius;
  const s = clamp01((strike - t) / Math.min(HAND_WINDOW, strike));
  const minute = -Math.PI * 2 * 4 * s ** 1.3;
  const hour = minute / 12;
  const k = clamp01((t - strike) / 0.4);
  const flash = t >= strike && k < 1 ? (1 - k) ** 2 : 0;
  const buildings = useMemo(() => {
    const r = seeded('v1:skyline');
    const out: { x: number; w: number; h: number }[] = [];
    for (let x = -34; x < 34; ) {
      const w = r.range(3.5, 7);
      out.push({ x: x + w / 2, w, h: r.range(3, 8) });
      x += w + r.range(0.2, 1);
    }
    return out;
  }, []);
  return (
    <>
      <PlateBackdrop plate={plate} />
      {buildings.map((b, i) => (
        <LedWall key={i} position={[b.x, F + b.h / 2, -30]} width={b.w} height={b.h} cols={Math.round(b.w * 1.5)} rows={Math.round(b.h * 1.5)} colors={['#2b3cff', '#7a2bff']} pattern="checker" t={t * 0.5 + i} opacity={0.3} order={1.5} />
      ))}
      <Halo position={[10, 13, -26]} size={8} color="#cfe6ff" intensity={1} order={2} />
      <TilePlatform position={[0, F, -4]} width={34} depth={24} cols={34} rows={24} splitX={0} left="#1c3aa8" right="#5a2ab0" t={t} pulse={0.1 + 0.4 * flash} opacity={0.3} order={1} />
      <GlowBox position={[0, 6.2, -10.8]} size={[11, 20, 3.6]} color="#3a52c8" edge={0.35} fill={0.07} order={4} />
      {[-5.5, 5.5].map((x) => (
        <NeonTube key={x} points={[[x, F, -9], [x, 16, -9]]} color={BLUE} radius={0.06} opacity={0.8} order={4.2} />
      ))}
      <NeonTube points={[[-5.5, 16, -9], [0, 18.5, -9], [5.5, 16, -9]]} color={CYAN} radius={0.06} opacity={0.8} order={4.2} />
      <DotsPlane position={[0, 6.2, -8.98]} size={[11, 20]} color="#bfe6ff" intensity={0.8} t={t} ballPos={[2, 10, 4]} order={4.5} />
      <mesh position={[cx, cy, cz - 0.05]} renderOrder={5.4}>
        <circleGeometry args={[R, 64]} />
        <meshBasicMaterial color="#0c1a44" transparent depthTest={false} depthWrite={false} />
      </mesh>
      <group position={[cx, cy, cz]}>
        <NeonTube points={FACE_RING} color={CYAN} radius={0.09} order={5.6} />
      </group>
      <group position={[cx, cy, cz]} scale={1 + 0.35 * k}>
        <NeonTube points={FACE_RING} color="#ffffff" radius={0.07} opacity={flash} order={5.7} />
      </group>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const big = i % 3 === 0;
        return <GlowBox key={i} position={[cx + Math.sin(a) * R * 0.85, cy + Math.cos(a) * R * 0.85, cz + 0.1]} size={[big ? 0.24 : 0.14, big ? 0.8 : 0.5, 0.1]} color={big ? '#bfe6ff' : BLUE} edge={0.8} fill={0.8} rotation={[0, 0, -a]} order={5.8} />;
      })}
      <Hand theta={hour} len={R * 0.55} w={0.28} color="#e6f4ff" order={5.9} />
      <Hand theta={minute} len={R * 0.85} w={0.18} color="#bfe6ff" order={5.95} />
      <Halo position={[cx, cy, cz + 0.3]} size={0.9} color="#ffffff" intensity={0.9} order={6} />
      <Halo position={[cx, cy, cz + 0.3]} size={R * 2.6 * (1 + 0.3 * k)} color="#9fd8ff" intensity={1.1 * flash} opacity={flash} order={6.1} />
      <BeamCone from={[-9, 12, 3]} to={[-4, F, 2]} radius={1.8} color={VIOLET} intensity={0.45} />
      <BeamCone from={[9, 12, 3]} to={[4, F, 2]} radius={1.8} color={MAGENTA} intensity={0.3} />
      <Smoke y={F + 1.2} z={-3} width={30} height={4} color="#7a6ac0" density={0.5} t={t} />
      <Smoke y={9} z={-16} width={44} height={8} color="#3a4a8a" density={0.5} t={t} order={3} />
      <Embers box={[-9, 9, F, 14, -12, 4]} count={200} t={t} color="#9fd0ff" bursts={t >= strike ? ([[0, R, 0], [-R, 0, 0], [R, 0, 0]] as Vec3[]).map((o, i) => ({ t: strike + i * 0.04, origin: [cx + o[0], cy + o[1], cz + 1] as Vec3 })) : []} />
    </>
  );
};
