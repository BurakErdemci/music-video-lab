// The chorus worlds (round 6): each is the git object as a space, built from the world kit, a pure function of t.
//  arena  the dance-arcade platform both girls stand on (the recurring battle set): a lit tile floor split
//         blue/red, the Accept buttons as a floor pad (disco) and a steel pedestal (metal), an LED wall,
//         lasers sweeping on every downbeat, key-light cones, smoke, mirror-ball light, embers.
//  insert a screaming close-up's backdrop: a radial LED burst in her colour, a halo behind her head, sparks.
//  split  two inserts side by side with a glowing seam.
//  runway the line-42 code line as a glowing runway receding into the dark, blue lane and orange lane.
//  fire   the arena ignited: a burning server hall, racks on both sides, a fire wall rising behind the girls.
//  logo   deep space for logo B's crash: crossing lasers, a radial LED field, a flare on each crash.
//  heart  a heartbeat line (a git graph gone mad) racing across a dark grid.
//  walls  the ======= walls of the stage closing in, one step per "equals".
//  line   the walls crushed into a single line of light.
import { useMemo } from 'react';
import type { Vec3 } from '../../camera/camera.ts';
import type { Hex } from '../../lib/ease.ts';
import { clamp01, lerp, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { barPos, beatPos } from '../../timing.ts';
import { BeamCone, type EmberBurst, Embers, FireWall, GlowBox, Halo, LaserFan, LedWall, type LedPattern, NeonTube, Smoke, TilePlatform } from '../../worlds/kit/index.ts';
import { ARENA } from './plan.ts';

export const BLUE: Hex = '#1f6bff';
export const CYAN: Hex = '#19c8ff';
export const RED: Hex = '#ff3014';
export const EMBER: Hex = '#ff8a2a';
const F = -3.4;
/** The beat pulse: 1 on the beat, decaying over it. */
export const pulseAt = (t: number): number => (1 - (beatPos(t) % 1)) ** 2;
/** The latest hits within `win` seconds before t (at most n), newest last. */
export const recent = (hits: readonly number[], t: number, win: number, n = 4): number[] => hits.filter((h) => h <= t && t - h < win).slice(-n);

const Backdrop = ({ color = '#04020a' }: { color?: string }) => (
  <mesh position={[0, 0, -16]} renderOrder={0}>
    <planeGeometry args={[120, 70]} />
    <meshBasicMaterial color={color} depthTest={false} depthWrite={false} />
  </mesh>
);

const PATTERNS: LedPattern[] = ['bars', 'radial', 'checker', 'scan'];

export interface ArenaProps { t: number; stomps: readonly { t: number; x: number }[]; embers: readonly EmberBurst[]; lasers?: number; led?: [Hex, Hex]; plate?: boolean }
export const Arena = ({ t, stomps, embers, lasers = 1, led = [BLUE, RED], plate = false }: ArenaProps) => {
  // the beat pulse runs at 3 per second over most of the frame: kept small, or it counts as flashing (round 6,
  // 43.5-45.3 s failed the flash check once the bright W09 plate sat behind the floor)
  const p = pulseAt(t) * (plate ? 0.35 : 1);
  const bar = barPos(t);
  // the lasers sweep once per bar, snapping to a new side on every downbeat
  const sweep = (bar % 1) * 2 - 1;
  const side = Math.floor(bar) % 2 ? 1 : -1;
  const pressed = (x: number) => stomps.some((s) => s.x === x && t >= s.t && t - s.t < 0.5);
  const erupt = recent(stomps.map((s) => s.t), t, 0.8).map((tt) => {
    const s = stomps.find((q) => q.t === tt) as { t: number; x: number };
    return { t: s.t, x: s.x, z: ARENA.z };
  });
  return (
    <>
      {!plate && <Backdrop />}
      {!plate && <LedWall position={[0, 2.4, -11]} width={34} height={12} cols={52} rows={18} colors={led} pattern={PATTERNS[Math.floor(bar) % 4] as LedPattern} pulse={p * 0.8} t={t} />}
      <Smoke y={F + 1.2} z={-4} width={36} height={5} color="#6a5cff" density={0.5} t={t} />
      <TilePlatform position={[0, F, -1.5]} width={24} depth={13} cols={24} rows={13} splitX={0} left={BLUE} right={RED} t={t} pulse={p} erupt={erupt} opacity={plate ? 0.55 : 1} />
      {/* the Accept buttons: a disco floor pad under blue, a dark pad in the middle, a steel pedestal by orange */}
      <GlowBox position={[ARENA.blueX, F + 0.06, ARENA.z]} size={[2.8, 0.12, 1.6]} color={CYAN} edge={pressed(ARENA.blueX) ? 1 : 0.6} fill={pressed(ARENA.blueX) ? 0.7 : 0.35} />
      <GlowBox position={[0, F + 0.06, ARENA.z]} size={[2.2, 0.12, 1.4]} color="#7a6cff" edge={0.3} fill={0.12} />
      <GlowBox position={[ARENA.orangeX + 1.9, F + 0.75, ARENA.z]} size={[1.3, 1.5, 1.3]} color={pressed(ARENA.orangeX) ? '#ff5a1a' : '#9aa3ad'} edge={pressed(ARENA.orangeX) ? 1 : 0.55} fill={pressed(ARENA.orangeX) ? 0.9 : 0.3} />
      <LaserFan origin={[-8, 5.8, -9]} count={9} spread={0.7} angle={-0.9 + side * 0.25 + sweep * 0.35} length={26} color={CYAN} width={0.035} intensity={0.9 * lasers} />
      <LaserFan origin={[8, 5.8, -9]} count={9} spread={0.7} angle={Math.PI + 0.9 - side * 0.25 - sweep * 0.35} length={26} color={RED} width={0.035} intensity={0.9 * lasers} />
      <BeamCone from={[ARENA.blueX - 1.2, 8, 1]} to={[ARENA.blueX, F, 0.2]} radius={2.4} color={CYAN} intensity={0.35 + 0.25 * p} />
      <BeamCone from={[ARENA.orangeX + 1.2, 8, 1]} to={[ARENA.orangeX, F, 0.2]} radius={2.4} color={RED} intensity={0.35 + 0.25 * p} />
      <Halo position={ARENA.ball} size={2.6} color="#ffffff" intensity={0.7 + 0.3 * p} />
      <Embers box={[-12, 12, F, 6, -8, 3]} count={260} t={t} color={EMBER} bursts={[...embers]} />
    </>
  );
};

export const InsertWorld = ({ t, color, hit }: { t: number; color: Hex; hit: number }) => {
  // a steady, bright backdrop: the close-up sits between two arena shots 0.3 s apart, and a darker or decaying
  // backdrop made each cut a flash (chorus 2, round 7)
  const p = pulseAt(t) * 0.35;
  return (
    <>
      <Backdrop color="#06020a" />
      <LedWall position={[0, 0, -9]} width={30} height={18} cols={40} rows={24} colors={[color, '#ffffff']} pattern="radial" pulse={0.8 + 0.2 * p} t={t * 3} />
      <Halo position={[0, 1.8, -3]} size={10} color={color} intensity={1.4} />
      <Embers box={[-9, 9, -5, 5, -4, 3]} count={180} t={t} color={color === RED ? EMBER : '#9fe8ff'} bursts={[{ t: hit, origin: [0, 1.5, 0] }]} />
    </>
  );
};

export const SplitWorld = ({ t, hit }: { t: number; hit: number }) => {
  const p = pulseAt(t) * 0.35;
  return (
    <>
      <Backdrop color="#06020a" />
      <LedWall position={[-7.6, 0, -9]} width={15} height={18} cols={20} rows={24} colors={[CYAN, '#ff4fd8']} pattern="radial" pulse={0.5 + 0.5 * p} t={t * 3} />
      <LedWall position={[7.6, 0, -9]} width={15} height={18} cols={20} rows={24} colors={[RED, '#ffb020']} pattern="radial" pulse={0.5 + 0.5 * p} t={t * 3} />
      <NeonTube points={[[0, -9, -2], [0, 9, -2]]} color="#ffffff" radius={0.05} />
      <Halo position={[-4.6, 1.6, -3]} size={7} color={CYAN} intensity={1} />
      <Halo position={[4.6, 1.6, -3]} size={7} color={RED} intensity={1} />
      <Embers box={[-10, 10, -5, 5, -4, 3]} count={220} t={t} color={EMBER} bursts={[{ t: hit, origin: [0, 1, 0] }]} />
    </>
  );
};

export const RunwayWorld = ({ t, on, lanes = [BLUE, RED], edges = [CYAN, RED], plate = false }: { t: number; on: number; lanes?: [Hex, Hex]; edges?: [Hex, Hex]; plate?: boolean }) => {
  const p = pulseAt(t);
  return (
    <>
      {!plate && <Backdrop />}
      {!plate && <LedWall position={[0, 4, -40]} width={70} height={26} cols={70} rows={26} colors={['#2a1660', '#120830']} pattern="scan" pulse={0.2 * p} t={t} />}
      <TilePlatform position={[0, F, -14]} width={3.4} depth={36} cols={4} rows={42} splitX={0} left={lanes[0]} right={lanes[1]} t={t * 2} pulse={0.6 * p} />
      <NeonTube points={[[-1.75, F + 0.03, 4], [-1.75, F + 0.03, -32]]} color={edges[0]} radius={0.05} on={on} />
      <NeonTube points={[[1.75, F + 0.03, 4], [1.75, F + 0.03, -32]]} color={edges[1]} radius={0.05} on={on} />
      <BeamCone from={[0, 8, 1]} to={[0, F, 0]} radius={2.8} color="#ffffff" intensity={0.35 + 0.2 * p} />
      <Embers box={[-14, 14, -2, 9, -30, -2]} count={260} t={t} color="#bfe8ff" />
    </>
  );
};

export const FireWorld = ({ t, rise, embers, plate = false }: { t: number; rise: number; embers: readonly EmberBurst[]; plate?: boolean }) => {
  const p = pulseAt(t);
  const racks = useMemo(() => {
    const out: { x: number; z: number; h: number }[] = [];
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) out.push({ x: s * (7 + (i % 2) * 0.2), z: 2 - i * 2.6, h: 4.6 + seeded(`rack:${s}:${i}`).range(0, 1.6) });
    return out;
  }, []);
  return (
    <>
      {!plate && <Backdrop color="#0a0202" />}
      {!plate && <LedWall position={[0, 2.4, -12]} width={34} height={12} cols={52} rows={18} colors={[RED, '#ffb020']} pattern="scan" pulse={0.5 + 0.5 * p} t={t} />}
      <FireWall x0={-14} x1={14} z={-5} height={8} rise={rise} colors={['#ff3a10', '#ffd040']} t={t} />
      <TilePlatform position={[0, F, -1.5]} width={24} depth={13} cols={24} rows={13} splitX={0} left="#ff6a10" right={RED} t={t} pulse={p} />
      {racks.map((r, i) => (
        <GlowBox key={i} position={[r.x, F + r.h / 2, r.z]} size={[1.4, r.h, 1.8]} color={i % 3 ? '#ff5a1a' : '#ffb020'} edge={0.7 + 0.3 * p} fill={0.25} />
      ))}
      <FireWall x0={-14} x1={-5.5} z={1} height={4} rise={rise} colors={['#ff2a0a', '#ffb020']} t={t + 3} />
      <FireWall x0={5.5} x1={14} z={1} height={4} rise={rise} colors={['#ff2a0a', '#ffb020']} t={t + 7} />
      <Smoke y={F + 3} z={-3} width={36} height={8} color="#3a0c06" density={0.7} t={t} />
      <Embers box={[-14, 14, F, 8, -8, 4]} count={420} t={t} color={EMBER} bursts={[...embers]} />
    </>
  );
};

export const LogoWorld = ({ t, flash }: { t: number; flash: number }) => {
  const p = pulseAt(t);
  const bar = barPos(t);
  const sweep = (bar % 1) * 2 - 1;
  return (
    <>
      <Backdrop />
      <LedWall position={[0, 0, -14]} width={44} height={26} cols={60} rows={34} colors={[BLUE, RED]} pattern="radial" pulse={0.35 * p} t={t * 2} />
      <LaserFan origin={[-10, -5, -8]} count={11} spread={1.1} angle={0.55 + sweep * 0.3} length={30} color={CYAN} width={0.04} />
      <LaserFan origin={[10, -5, -8]} count={11} spread={1.1} angle={Math.PI - 0.55 - sweep * 0.3} length={30} color={RED} width={0.04} />
      <Halo position={[0, 0.4, -2]} size={6 + 10 * flash} color="#ffffff" intensity={0.25 + 0.6 * flash} />
      <Smoke y={-3} z={-6} width={40} height={10} color="#40205a" density={0.45} t={t} />
    </>
  );
};

/** The heartbeat: a PQRST shape repeating along x, scrolling with t; `mad` adds jitter and doubles the rate. */
const ecg = (x: number, mad: number, t: number): number => {
  const period = lerp(5, 2.4, mad);
  const u = ((x + t * 9) % period + period) % period / period;
  const spike = Math.exp(-(((u - 0.5) / 0.018) ** 2)) * 2.6 - Math.exp(-(((u - 0.54) / 0.02) ** 2)) * 1.1 + Math.exp(-(((u - 0.75) / 0.06) ** 2)) * 0.45;
  const jit = mad * seeded(`ecg:${Math.round(x * 4)}:${Math.floor(t * 20)}`).range(-0.6, 0.6);
  return spike + jit;
};
export const HeartWorld = ({ t, t0, mad }: { t: number; t0: number; mad: number }) => {
  const p = pulseAt(t);
  const head = -13 + outQuad(clamp01((t - t0) / 0.6)) * 26;
  const pts: Vec3[] = [];
  for (let x = -13; x <= head; x += 0.12) pts.push([x, 0.2 + ecg(x, mad, t), -1.5]);
  if (pts.length < 2) pts.push([-13, 0.2, -1.5], [-12.9, 0.2, -1.5]);
  return (
    <>
      <Backdrop />
      <TilePlatform position={[0, F, -3]} width={30} depth={16} cols={30} rows={16} splitX={0} left="#0a3a5a" right="#5a0a16" t={t} pulse={0.4 * p} />
      <LedWall position={[0, 1, -12]} width={40} height={16} cols={60} rows={24} colors={['#103060', '#401030']} pattern="checker" pulse={0.2 * p} t={t} />
      <NeonTube points={pts} color={mad > 0.5 ? '#ff2a5a' : '#19ffb0'} radius={0.07} />
      <Halo position={[head, 0.2 + ecg(head, mad, t), -1.5]} size={2.2} color="#ffffff" intensity={1} />
    </>
  );
};

/** The ======= walls: two slabs per side with glowing bars on their faces, closing in one step per "equals". */
export const WallsWorld = ({ t, hits }: { t: number; hits: readonly number[] }) => {
  const p = pulseAt(t);
  const steps = [10, 7.4, 5.4, 3.6];
  let gap = steps[0] as number;
  hits.forEach((h, i) => {
    if (t >= h) gap = lerp(steps[i] as number, steps[i + 1] as number, outQuad((t - h) / (7 / 60)));
  });
  const slab = (s: number) => (
    <group key={s}>
      <GlowBox position={[s * (gap + 2.5), 0.5, -1]} size={[5, 14, 4]} color={s < 0 ? CYAN : RED} edge={0.8 + 0.2 * p} fill={0.18} />
      {/* the wall's = glyph: two glowing bars riding its inner edge */}
      {[1.0, -1.0].map((y) => <GlowBox key={y} position={[s * (gap + 1.6), y, 1.6]} size={[2.8, 0.75, 0.3]} color={s < 0 ? '#bfefff' : '#ffd0b0'} edge={1} fill={0.85} />)}
    </group>
  );
  return (
    <>
      <Backdrop />
      <TilePlatform position={[0, F, -1.5]} width={24} depth={13} cols={24} rows={13} splitX={0} left={BLUE} right={RED} t={t} pulse={p} />
      {slab(-1)}
      {slab(1)}
      <Halo position={[0, 0, -4]} size={4 + 2 * p} color="#ffffff" intensity={0.4} />
    </>
  );
};

/** The crush: everything black but one horizontal line of light that flares and breathes on the beat. */
export const LineWorld = ({ t, t0 }: { t: number; t0: number }) => {
  const p = pulseAt(t);
  const k = outQuad(clamp01((t - t0) / 0.25));
  return (
    <>
      <Backdrop />
      <NeonTube points={[[-24 * k, 0, -1], [24 * k + 0.01, 0, -1]]} color="#ffffff" radius={0.06 + 0.03 * p} />
      <NeonTube points={[[-24 * k, 0, -1.2], [24 * k + 0.01, 0, -1.2]]} color="#ff4fd8" radius={0.2} />
      <Halo position={[0, 0, -1]} size={5 + 3 * p} color="#ffffff" intensity={0.8} />
      <Embers box={[-14, 14, -0.4, 0.4, -3, 2]} count={300} t={t} color="#ffd0f6" />
    </>
  );
};
