// Scene 16, the choir VO-RA-THUL (S108-S114): A11 meteor summon (the ceiling peels to his painted sky), meteors in
// the office, a throne stacked from office chairs, A12 slam from above, the throne, six comic panels on the drum
// fill, A13 the biggest blast from the throne, and the smoke clearing on his laugh.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld, hold, OFF_LOW, SHAKE_PCT, tween, withShake, type CameraPath, type CameraPose, type ShakeHit } from '../../../camera/api.ts';
import { AssetCard } from '../../../cast/AssetCard.tsx';
import type { Vec3 } from '../../../stage/Card.tsx';
import { Stage } from '../../../stage/Stage.tsx';
import { DamageNumber } from '../../../ui/kit.ts';
import { DuotoneFlash, ImpactBurst, InkSplash, Meteor, Overlay, seeded, Shards, SpeedLines, InkFilter, inkFilterId } from '../../../vfx/effects.ts';
import { DomPlate, DomPlateFilters } from '../lib/DomPlate.tsx';
import { BLAST_CUES, PANEL_CUES, PANEL_FRAMES, WHITEOUT } from '../lib/flash.ts';
import { clamp01, E, lerp, outBack, outCubic, pitchOf, prog, project, twos, W, H } from '../lib/geom.ts';
import { Chair, Dev, O, PaintDecal, Rect, WALL_Z } from '../lib/Office.tsx';
import { AfterRoom } from '../lib/Room.tsx';
import { rigPoints } from '../lib/rigPoints.ts';
import { Shot } from '../lib/Shell.tsx';
import { Vorathul } from '../lib/Vorathul.tsx';
import { cut, GOLD, INK, IVORY, LAUGH, move, OFFICE_FLOOR, pose, strike, THRONE_SIT, THRONE_SUMMON, timeline, VIOLET } from '../lib/vorathul.ts';
import type { PoseDef } from '../../../rig/types.ts';

const F = OFFICE_FLOOR;
const PLATE01 = '01-tarz-cizgi-roman.jpg';
const CEIL = 5.2;
const SKY_Y = CEIL + 9;

// ---- the ceiling that peels like paper (C49) and the painted sky behind it ----
const STRIPS = 8;
const STRIP_D = 20 / STRIPS;
/** p 0..1: the strips nearest the camera lift first, hinged at their back edge, and swing up toward the wall. */
const PeelCeiling = ({ p }: { p: number }) => (
  <>
    {Array.from({ length: STRIPS }, (_, k) => {
      const zb = WALL_Z + k * STRIP_D;
      const a = clamp01(p * STRIPS * 1.5 - (STRIPS - 1 - k) * 1.2) * 2.7;
      if (a >= 2.69) return null;
      return (
        <group key={k} position={[0, CEIL, zb]} rotation={[-a, 0, 0]}>
          <Rect w={80} h={STRIP_D + 0.02} at={[0, 0, STRIP_D / 2]} rot={[Math.PI / 2, 0, 0]} color={O.ceil} />
          <Rect w={80} h={0.08} at={[0, -0.02, STRIP_D]} rot={[Math.PI / 2, 0, 0]} color={O.dark} />
        </group>
      );
    })}
  </>
);
/** His painted world hung over the office (G01 sky stand-in: frame 01). */
const PaintedSky = () => (
  <>
    <AssetCard id="G01" standIn={{ src: `plates/${PLATE01}` }} width={70} height={46} position={[0, CEIL + 9, -6]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-10} />
    <AssetCard id="G01" standIn={{ src: `plates/${PLATE01}` }} width={60} height={40} position={[0, CEIL + 10, WALL_Z - 6]} renderOrder={-11} />
  </>
);

/** The office after the summon: no ceiling, his sky above, the room in ruins and paint. */
const SkyRoom = ({ children, desks }: { children?: ReactNode; desks?: (i: number) => { off?: Vec3; rot?: Vec3; hidden?: boolean } }) => (
  <>
    {/* The wall runs up to his sky: with the ceiling gone there must be no gap or card edge above it. */}
    <AfterRoom ceiling={false} strips={false} wallTop={SKY_Y} topPaint={false} desks={desks ?? ((i) => (i === 3 ? { hidden: true } : { rot: [0, 0, [0.3, -1.4, -0.2][i] ?? 0], off: [0, 0.4, 0] }))} />
    <PaintedSky />
    {children}
  </>
);

// ---- the throne of office chairs (G41 stand-ins) ----
const THRONE_Z = -12;
const TIER1: { at: Vec3; rot: number }[] = [
  { at: [-1.75, F, THRONE_Z - 0.4], rot: 0.14 },
  { at: [0, F, THRONE_Z], rot: 0 },
  { at: [1.75, F, THRONE_Z - 0.4], rot: -0.18 },
];
const TIER2: { at: Vec3; rot: number }[] = [
  { at: [-0.95, F + 3.1, THRONE_Z - 0.2], rot: 0.5 },
  { at: [0.95, F + 3.1, THRONE_Z - 0.2], rot: -0.42 },
  { at: [0, F + 4.4, THRONE_Z - 0.5], rot: 3.1 },
];
const Throne = ({ tier = 2, pitch = 0 }: { tier?: 1 | 2; pitch?: number }) => (
  <>
    {[...TIER1, ...(tier === 2 ? TIER2 : [])].map((c, i) => (
      <group key={i} position={[c.at[0], F, c.at[2]]} rotation={[pitch, 0, 0]}>
        <Chair at={[0, c.at[1] - F, 0]} rot={[0, 0, c.rot]} size={2.7} />
      </group>
    ))}
  </>
);
/** Seated in front of the pile. The drawn sit_alone carries its own stone seat (pelvis 0.49 H, seat base -0.088 H;
 * the placeholder sat at 0.22 H), so the root goes 0.75 above the floor: the seat stands on it and the helm lands
 * 0.2 above where the shots were framed. */
const THRONE_AT: Vec3 = [0, F + 0.75, THRONE_Z + 0.7];

// ---- meteors landing in the office (DOM Meteor aimed at a projected world point) ----
const MeteorFall = ({ frame, cam, at, land, seed, size = 70, travel = 14, from = [-520, -980] }: { frame: number; cam: CameraPose; at: Vec3; land: number; seed: number; size?: number; travel?: number; from?: [number, number] }) => {
  const p = project(cam, at);
  const age = frame - land;
  return (
    <>
      <Meteor frame={frame - (land - travel)} duration={travel} seed={seed} from={[p.x + from[0], p.y + from[1]]} to={[p.x, p.y]} size={size} />
      <InkSplash frame={age} duration={36} seed={seed} x={p.x} y={p.y} size={size * 3.2} variant="violet" fade={10} />
      <ImpactBurst frame={age} duration={8} seed={seed} x={p.x} y={p.y} size={size * 2.6} flash={0} />
      <Shards frame={age} duration={36} seed={seed} origin={[p.x, p.y]} count={18} size={size * 0.55} speed={size * 0.5} spread={Math.PI * 1.1} fills={[GOLD, IVORY, O.white]} />
    </>
  );
};

/** Scorch left by a landed meteor (ink and gold on the floor). */
const Scorch = ({ at, frame, land, seed }: { at: Vec3; frame: number; land: number; seed: number }) =>
  frame >= land ? <PaintDecal at={[at[0], F + 0.05, at[2]]} rot={[-Math.PI / 2, 0, seed]} w={5 * outCubic(prog(frame, land, 6))} h={3.4 * outCubic(prog(frame, land, 6))} seed={60 + seed} order={70} /> : null;

// ------------------------------------------------------------------ S108 A11 meteor summon, the ceiling peels away
const S108_AT: Vec3 = [-2.2, F, -13];
const SUMMON = E('s108-cut');
const S108_TL = timeline([
  { at: SUMMON - 18, pose: 'summon_antic', dur: 0, cut: true },
  strike(SUMMON, pose('summon_strike'), 18),
  move(E('s108-sky'), pose('summon_follow'), 20),
  move(E('s108-meteors') + 4, pose('summon_follow', { head: [20, -0.01], armL: [90, 20, 10, 'spread'], torso: 12 }), 16),
]);
const S108_CAM: CameraPath = withShake(handheld(tween({ ...OFF_LOW, position: [0.4, -4.6, 0.5], target: [-1.6, -0.4, -16] }, { ...OFF_LOW, position: [0.6, -4.8, 1.0], target: [-1.2, 1.6, -16] }, { start: E('s108-peel'), frames: E('s108-sky') - E('s108-peel') + 10 }), { amp: 0.04, seed: 's108' }), {
  hits: [{ start: SUMMON, seed: 1081, amp: { pct: SHAKE_PCT.medium } }, { start: E('s108-sky'), seed: 1082, amp: { pct: SHAKE_PCT.small } }],
});
const FIRST_METEORS: { start: number; from: [number, number]; to: [number, number]; size: number }[] = [
  { start: 0, from: [380, -160], to: [1500, 1240], size: 56 },
  { start: 5, from: [1250, -200], to: [-200, 1100], size: 44 },
  { start: 9, from: [820, -180], to: [2100, 900], size: 64 },
];

export const S108 = ({ frame }: { frame: number }) => {
  const cam = S108_CAM(frame);
  const peel = outCubic(prog(twos(frame), E('s108-peel'), E('s108-sky') - E('s108-peel')));
  const tip = project(cam, rigPoints(S108_TL, frame, { at: S108_AT }).swordTip);
  const cap = frame - E('s108-caption');
  return (
    <Shot>
      <Stage camera={S108_CAM}>
        <AfterRoom ceiling={false} strips={false} wallTop={SKY_Y} topPaint={false} />
        <PaintedSky />
        <PeelCeiling p={peel} />
        <Vorathul tl={S108_TL} frame={frame} at={S108_AT} />
      </Stage>
      {/* The painted light layer, screen-blended and low, instead of flat solid violet rays. */}
      <DomPlate id="LX-rays" plate="03-kanat-yelpaze.jpg" crop={[0, 0, 1536, 1024]} x={0} y={0} width={W} style={{ mixBlendMode: 'screen', opacity: 0.5 * (1 - clamp01((frame - SUMMON) / 24)) }} />
      <InkSplash frame={frame - SUMMON} duration={30} seed={108} x={tip.x} y={tip.y} size={160} variant="violet" fade={8} direction={-Math.PI / 2} />
      {/* The "METEOR RAIN" caption returns and its strike-through peels off. */}
      {frame >= E('s108-sky') ? (
        <div style={{ position: 'absolute', left: 90, top: 90, padding: '12px 30px', background: INK, border: `4px solid ${GOLD}`, transform: `scale(${outBack(prog(frame, E('s108-sky'), 8))})`, transformOrigin: 'left top' }}>
          <div style={{ fontFamily: "'UiAnton', 'Anton', Impact, sans-serif", fontSize: 96, color: GOLD, letterSpacing: 4, lineHeight: 1.1 }}>METEOR RAIN</div>
          <div style={{ position: 'absolute', left: 18, right: 18, top: '52%', height: 12, background: O.blue, transformOrigin: '0% 50%', transform: cap < 0 ? 'none' : `translate(${cap * 14}px, ${cap * cap * 3}px) rotate(${cap * 6}deg)`, opacity: cap < 0 ? 1 : 1 - clamp01(cap / 14) }} />
        </div>
      ) : null}
      {FIRST_METEORS.map((m, i) => (
        <Meteor key={i} frame={frame - E('s108-meteors') - m.start} duration={20} seed={1083 + i} from={m.from} to={m.to} size={m.size} />
      ))}
    </Shot>
  );
};

// ------------------------------------------------------------------ S109 meteors land in the office, throne tier 1
const S109_AT: Vec3 = [-4.2, F, -15];
const M109 = [
  { at: [-7.5, F, -8.5] as Vec3, land: E('s109-cut') },
  { at: [6.5, F, -13] as Vec3, land: E('s109-m2') },
  { at: [-1.5, F, -17] as Vec3, land: E('s109-m3') },
  { at: [8, F, -7.5] as Vec3, land: E('s109-m4') },
];
const S109_TL = timeline([
  cut(E('s109-cut'), pose('summon_follow')),
  move(E('s109-tier1'), pose('conduct_wide', { head: [8, -0.005], armR: [120, 40, 20, 'spread'], armL: [130, 30, 20, 'spread'] }), 18),
  move(E('s109-m3'), pose('summon_strike'), 16),
  move(E('s109-m4') + 2, pose('summon_follow', { head: [18, -0.01] }), 14),
]);
const S109_HITS: ShakeHit[] = M109.map((m, i) => ({ start: m.land, seed: 1090 + i, amp: { pct: SHAKE_PCT.medium } }));
const S109_CAM: CameraPath = withShake(handheld(tween({ position: [0.6, -1.4, 1.2], target: [0, -1.4, -20] }, { position: [-0.4, -1.2, 0], target: [-0.6, -0.9, -20] }, { start: E('s109-cut'), frames: 99 }), { amp: 0.04, seed: 's109' }), { hits: S109_HITS });
const LOOSE: { from: Vec3; slot: number }[] = [
  { from: [-9.5, F, -6.5], slot: 0 },
  { from: [9.2, F, -6.2], slot: 1 },
  { from: [-6.5, F, -17], slot: 2 },
];
const SPARE: Vec3[] = [[-5.5, F, -9.5], [5.2, F, -9.6], [3.2, F, -16.5]];

export const S109 = ({ frame }: { frame: number }) => {
  const cam = S109_CAM(frame);
  const fly = prog(twos(frame), E('s109-tier1') - 18, 18);
  const spin = Math.max(0, frame - E('s109-spin'));
  return (
    <Shot>
      <Stage camera={S109_CAM}>
        <SkyRoom>
          {LOOSE.map((c, i) => {
            const s = TIER1[c.slot]!;
            const e = outCubic(fly);
            const p: Vec3 = [lerp(c.from[0], s.at[0], e), lerp(c.from[1], s.at[1], e) + Math.sin(Math.PI * fly) * 5, lerp(c.from[2], s.at[2], e)];
            return <Chair key={i} at={p} rot={[0, 0, fly < 1 ? fly * 9 + i : s.rot]} size={2.7} pose={fly < 1 ? 6 : 1} />;
          })}
          {SPARE.map((p, i) => <Chair key={`s${i}`} at={[p[0], p[1] + (spin > 0 ? 0.3 * Math.abs(Math.sin(spin * 0.3)) : 0), p[2]]} rot={[0, 0, spin * 0.35 * (i % 2 ? -1 : 1)]} size={2.5} pose={spin > 0 ? 6 : 2} />)}
          {M109.map((m, i) => <Scorch key={i} at={m.at} frame={frame} land={m.land} seed={i} />)}
          <Vorathul tl={S109_TL} frame={frame} at={S109_AT} />
        </SkyRoom>
      </Stage>
      {M109.map((m, i) => <MeteorFall key={i} frame={frame} cam={cam} at={m.at} land={m.land} seed={1095 + i} size={64 + i * 6} from={[-380 + i * 260, -900]} />)}
    </Shot>
  );
};

// ------------------------------------------------------------------ S110 A12 ground slam, from the ceiling hole
const S110_AT: Vec3 = [2.6, F + 0.05, -12.8];
const SLAM = E('s110-slam');
const S110_TL = timeline([
  cut(E('s110-cut'), pose('summon_follow')),
  move(E('s110-antic'), pose('slam_antic'), 20),
  strike(SLAM, pose('slam_strike'), 20),
  move(E('s110-tier2') + 10, pose('slam_follow'), 18),
]);
const S110_BASE: CameraPose = { position: [0.6, 13.5, -9.6], target: [0.6, F, -12.6], fov: 52 };
const S110_PITCH = pitchOf(S110_BASE);
const S110_CAM: CameraPath = withShake(handheld(tween(S110_BASE, { ...S110_BASE, position: [0.6, 12.4, -9.9] }, { start: E('s110-cut'), frames: 100 }), { amp: 0.05, seed: 's110' }), {
  hits: [{ start: SLAM, seed: 1101, amp: { pct: SHAKE_PCT.big }, frames: 18 }, { start: E('s110-tier2'), seed: 1102, amp: { pct: SHAKE_PCT.small } }],
});
const SCATTER: Vec3[] = [[-5.8, F, -8.5], [-4.8, F, -16.2], [7.4, F, -16.4]];

export const S110 = ({ frame }: { frame: number }) => {
  const cam = S110_CAM(frame);
  const feet = project(cam, S110_AT);
  const slide = outCubic(prog(twos(frame), E('s110-scatter') - 10, 12));
  const up = prog(twos(frame), SLAM, E('s110-tier2') - SLAM);
  const ring = frame - SLAM;
  return (
    <Shot>
      <Stage camera={S110_CAM}>
        <SkyRoom>
          <Throne tier={1} pitch={S110_PITCH} />
          {SCATTER.map((s, i) => {
            const t = TIER2[i]!;
            const start: Vec3 = [lerp(s[0] * 0.6, s[0], slide), F, lerp(s[2], s[2], slide)];
            const e = outCubic(up);
            const p: Vec3 = up <= 0 ? start : [lerp(start[0], t.at[0], e), F, lerp(start[2], t.at[2], e)];
            // Thrown up toward the lens (top-down: up = bigger), then down onto the pile.
            const lift = up > 0 && up < 1 ? Math.sin(Math.PI * up) * 0.45 : 0;
            return (
              <group key={i} position={p} rotation={[S110_PITCH, 0, 0]} scale={1 + lift}>
                <Chair at={[0, up >= 1 ? t.at[1] - F : 0, 0]} rot={[0, 0, up > 0 ? lerp(i * 1.3, t.rot, e) + (1 - e) * 6 : i * 1.3 + 1.5]} size={2.7} />
              </group>
            );
          })}
          <Vorathul tl={S110_TL} frame={frame} at={S110_AT} pitch={S110_PITCH} />
        </SkyRoom>
      </Stage>
      <Overlay>
        <defs>
          <InkFilter seed={110} rough={10} breakup={0.3} />
        </defs>
        {ring >= 0 && ring < 22
          ? [0, 1].map((k) => {
              const r = (120 + 900 * outCubic(clamp01((ring - k * 3) / 16))) * (1 - k * 0.15);
              return <circle key={k} cx={feet.x} cy={feet.y} r={r} fill="none" stroke={INK} strokeWidth={34 * (1 - ring / 22)} filter={`url(#${inkFilterId(110, 10, 0.3)})`} />;
            })
          : null}
      </Overlay>
      <InkSplash frame={ring} duration={40} seed={1103} x={feet.x} y={feet.y} size={330} fade={10} />
      <ImpactBurst frame={ring} duration={10} seed={1104} x={feet.x} y={feet.y} size={300} flash={0} />
      <Shards frame={ring} duration={30} seed={1105} origin={[feet.x, feet.y]} direction={0} spread={Math.PI * 2} speed={40} size={36} count={26} fills={[GOLD, IVORY, INK]} gravity={0} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S111 the throne
const S111_TL = timeline([
  cut(E('s111-cut'), THRONE_SIT),
  move(E('s111-m1'), { ...THRONE_SIT, head: [14, -0.01], armL: [70, 40, 0, 'spread'] } as Partial<PoseDef>, 16),
  move(E('s111-m2') + 4, { ...THRONE_SIT, head: [4, 0], torso: 4 } as Partial<PoseDef>, 14),
]);
const S111_CAM: CameraPath = handheld(tween({ ...OFF_LOW, position: [0.2, -5.6, -2], target: [0, -0.4, -12] }, { position: [0.4, -0.8, -2.5], target: [0, -0.6, -14], fov: 42 }, { start: E('s111-crane'), frames: E('s112-p1') - E('s111-crane') }), { amp: 0.04, seed: 's111' });
const M111 = [
  { at: [-8, F, -10] as Vec3, land: E('s111-m1') },
  { at: [7.5, F, -15] as Vec3, land: E('s111-m2') },
];

export const S111 = ({ frame }: { frame: number }) => {
  const cam = S111_CAM(frame);
  const run = (k: number) => prog(frame, E('s111-flee') - 12 + k * 6, 30);
  return (
    <Shot>
      <Stage camera={S111_CAM}>
        <SkyRoom>
          <Throne />
          <Vorathul tl={S111_TL} frame={frame} at={THRONE_AT} />
          {M111.map((m, i) => <Scorch key={i} at={m.at} frame={frame} land={m.land} seed={4 + i} />)}
          {[0, 1].map((k) => {
            const t = run(k);
            if (t <= 0 || t >= 1) return null;
            const bob = Math.abs(Math.sin(twos(frame) * 0.6 + k)) * 0.3;
            return <Dev key={k} who={k ? 'bun' : 'hoodie'} at={[lerp(-9, 9, t), F + bob, -6.5 - k * 1.2]} rot={[0, 0, -0.12]} height={3.3} flipX={k === 0} order={3000} />;
          })}
        </SkyRoom>
      </Stage>
      {M111.map((m, i) => <MeteorFall key={i} frame={frame} cam={cam} at={m.at} land={m.land} seed={1110 + i} size={70} from={[i ? 300 : -400, -900]} />)}
    </Shot>
  );
};

// ------------------------------------------------------------------ S112 six comic panels, one meteor per hit
// Frontal panels (yaw within 15 degrees): variety from height, distance and lens, never from behind or the side.
const PANEL_CAMS: CameraPose[] = [
  { position: [0, -5.4, -3.5], target: [0, -0.4, -12], fov: 54 },
  { position: [-2.5, 3.0, -1], target: [0, -1.5, -12], fov: 40 },
  { position: [1.5, -0.6, -6.5], target: [0, -0.2, -12], fov: 40 },
  { position: [-1.2, -5.8, -5], target: [0, 0.5, -12], fov: 60 },
  { position: [0, -2.2, 3.5], target: [0, -1.2, -12], fov: 36 },
  { position: [-3.2, 0.6, -5.5], target: [0.2, 1.0, -12], fov: 46 },
];
const PANEL_POSES: Partial<PoseDef>[] = [
  THRONE_SIT,
  THRONE_SUMMON,
  { ...THRONE_SIT, head: [18, -0.01], armR: [70, 30, 0, 'grip'], armL: [70, 30, 0, 'spread'], torso: 8 },
  { ...THRONE_SIT, armR: [95, 10, 0, 'grip'], head: [-4, 0.01] },
  THRONE_SUMMON,
  { ...THRONE_SIT, head: [10, -0.005], armL: [110, 30, 10, 'spread'] },
];
const PANEL_TILT = [-1.6, 1.4, -0.8, 1.8, -1.2, 0.9];
const S112_TL = timeline(PANEL_FRAMES.map((f, i) => cut(f, PANEL_POSES[i]!)));
const S112_CAM: CameraPath = (frame) => {
  let i = 0;
  while (i + 1 < PANEL_FRAMES.length && frame >= PANEL_FRAMES[i + 1]!) i++;
  const base = PANEL_CAMS[i]!;
  const local = frame - PANEL_FRAMES[i]!;
  return withShake(hold({ ...base, position: [base.position[0] * (1 - 0.004 * local), base.position[1], base.position[2]] }), { hits: [{ start: PANEL_FRAMES[i]!, seed: 1120 + i, amp: { pct: SHAKE_PCT.medium } }] })(frame);
};
const RING = PANEL_FRAMES.map((land, i): { at: Vec3; land: number } => {
  const a = (i / 6) * Math.PI * 2 + 0.4;
  return { at: [Math.cos(a) * 7, F, THRONE_Z + Math.sin(a) * 5], land };
});

export const S112 = ({ frame }: { frame: number }) => {
  const cam = S112_CAM(frame);
  let i = 0;
  while (i + 1 < PANEL_FRAMES.length && frame >= PANEL_FRAMES[i + 1]!) i++;
  const next = RING[i + 1];
  const here = RING[i]!;
  const hp = project(cam, here.at);
  const age = frame - here.land;
  return (
    <Shot bg={IVORY} grain={0.6}>
      <DuotoneFlash frame={frame} cues={PANEL_CUES} id="p5-s112">
        <AbsoluteFill style={{ background: IVORY }}>
          {/* The panel: tilted inside an ivory gutter with an ink border (comic page grammar). */}
          <AbsoluteFill style={{ transform: `rotate(${PANEL_TILT[i]}deg) scale(0.9)`, border: `10px solid ${INK}`, overflow: 'hidden', background: O.bg }}>
            <Stage camera={S112_CAM}>
              <SkyRoom>
                <Throne />
                <Vorathul tl={S112_TL} frame={frame} at={THRONE_AT} />
                {RING.map((m, k) => <Scorch key={k} at={m.at} frame={frame} land={m.land} seed={10 + k} />)}
              </SkyRoom>
            </Stage>
            <InkSplash frame={age} duration={30} seed={1126 + i} x={hp.x} y={hp.y} size={260} variant="violet" fade={8} />
            <ImpactBurst frame={age} duration={8} seed={1126 + i} x={hp.x} y={hp.y} size={200} flash={0} />
            <Shards frame={age} duration={26} seed={1132 + i} origin={[hp.x, hp.y]} count={16} size={40} speed={34} fills={[GOLD, IVORY, INK]} />
            {next ? <MeteorFall frame={frame} cam={cam} at={next.at} land={next.land} seed={1140 + i} size={60} travel={Math.min(14, next.land - here.land)} from={[i % 2 ? 420 : -420, -760]} /> : null}
          </AbsoluteFill>
        </AbsoluteFill>
      </DuotoneFlash>
    </Shot>
  );
};

// ------------------------------------------------------------------ S113 A13 summon from the throne: the biggest blast
const S113_TL = timeline([cut(E('s113-cut'), THRONE_SUMMON), move(E('s113-fill'), { ...THRONE_SUMMON, head: [20, -0.01], torso: 12 } as Partial<PoseDef>, 14)]);
const S113_CAM: CameraPath = withShake(
  tween({ position: [0.3, -3.2, -3.5], target: [0, -0.2, -13] }, { position: [0, -1.6, 1.8], target: [0, 0.6, -20] }, { start: E('s113-cut'), frames: E('s113-grow') - E('s113-cut') + 6 }),
  { hits: [{ start: WHITEOUT, seed: 1131, amp: { pct: SHAKE_PCT.big }, frames: 20 }, { start: E('s113-grade1'), seed: 1132, amp: { pct: SHAKE_PCT.big }, frames: 18 }] },
);
// K4 stand-in: frame 06, Vorathul with the sword raised, ink only, black on the ivory white-out.
const K4_CROP: [number, number, number, number] = [800, 100, 640, 800];

const BlastScene = ({ frame, children }: { frame: number; children?: ReactNode }) => (
  <DuotoneFlash frame={frame} cues={BLAST_CUES} id="p5-blast">
    <AbsoluteFill style={{ background: O.bg }}>{children}</AbsoluteFill>
  </DuotoneFlash>
);

export const S113 = ({ frame }: { frame: number }) => {
  const cam = S113_CAM(frame);
  const g = prog(frame, E('s113-appear'), WHITEOUT - E('s113-appear'));
  const hitPt = project(cam, [0.5, F + 7, -19]);
  const from: [number, number] = [W * 0.92, -H * 0.9];
  const blast = frame - WHITEOUT;
  const white = blast >= 0 && frame < E('s113-grade1');
  return (
    <Shot>
      <DomPlateFilters />
      <BlastScene frame={frame}>
        <Stage camera={S113_CAM}>
          <SkyRoom>
            <Throne />
            <Vorathul tl={S113_TL} frame={frame} at={THRONE_AT} />
          </SkyRoom>
        </Stage>
        {blast < 0 ? <Meteor frame={Math.round(g * 29)} duration={30} seed={1133} from={from} to={[hitPt.x, hitPt.y]} size={lerp(40, 520, g * g)} trail={lerp(400, 2600, g)} /> : null}
        <Shards frame={blast - 9} duration={40} seed={1134} origin={[hitPt.x, hitPt.y]} direction={0} spread={Math.PI * 2} speed={70} size={90} count={44} fills={[GOLD, IVORY, O.white, O.mid]} gravity={1.6} />
        <InkSplash frame={blast - 9} duration={30} seed={1135} x={hitPt.x} y={hitPt.y} size={620} variant="violet" fade={10} />
        <SpeedLines mode="radial" frame={twos(frame) - WHITEOUT - 9} duration={20} seed={1136} focus={[hitPt.x, hitPt.y]} inner={300} count={70} thickness={18} />
      </BlastScene>
      {white ? (
        // The white-out, held ivory into the beat-816 grade: K4 is the black silhouette on it (Z6 fix, one swing).
        <AbsoluteFill style={{ background: IVORY }}>
          <SpeedLines mode="radial" frame={blast} duration={12} seed={1137} focus={[W / 2, H * 0.42]} inner={380} count={64} thickness={22} />
          <DomPlate id="G45" plate="06-dovus-faz3.jpg" crop={K4_CROP} x={W / 2 - 340} y={H * 0.08} width={680} finalWidth={1240} ink />
        </AbsoluteFill>
      ) : null}
    </Shot>
  );
};

// ------------------------------------------------------------------ S114 the smoke clears: the laugh
const S114_TL = timeline([
  cut(E('s114-cut'), THRONE_SIT),
  move(E('s114-silhouette'), { ...THRONE_SIT, head: [8, 0], armR: [40, 60, 0, 'grip'] } as Partial<PoseDef>, 16),
  move(E('s114-laugh'), { ...LAUGH, seated: true, pelvis: THRONE_SIT.pelvis, legs: [0, 0], sword: 'ground', plant: [0.05, 0] } as Partial<PoseDef>, 16),
]);
const PUSH = (frame: number): number => 2.2 * outCubic(prog(frame, E('s114-push1'), 8)) + 2.2 * outCubic(prog(frame, E('s114-push2'), 8)) + 0.012 * (frame - E('s114-cut'));
const S114_CAM: CameraPath = withShake((frame) => {
  const d = PUSH(frame);
  return { position: [0, -1.4, 1.5 - d], target: [0, 0, -16] };
}, { hits: [{ start: E('s114-clonk'), seed: 1141, amp: { pct: SHAKE_PCT.small } }] });
const SMOKE = (() => {
  const rng = seeded('p5-smoke');
  return Array.from({ length: 22 }, () => ({ x: rng.range(0, W), y: rng.range(H * 0.15, H), r: rng.range(120, 300), vx: rng.range(-9, 9), vy: rng.range(-4, 2), dark: rng() < 0.4 }));
})();
const EMBERS = (() => {
  const rng = seeded('p5-embers');
  return Array.from({ length: 46 }, () => ({ x: rng.range(200, W - 200), y: rng.range(H * 0.5, H), v: rng.range(3, 9), w: rng.range(0.02, 0.07), r: rng.range(3, 8), c: rng() < 0.5 ? VIOLET : GOLD }));
})();
const CLONK = E('s114-clonk');
/** Where the S113 blast sat on screen when its camera locked. */
const BLAST_AT = project(S113_CAM(E('s114-cut') - 1), [0.5, F + 7, -19]);

export const S114 = ({ frame }: { frame: number }) => {
  const cam = S114_CAM(frame);
  const clear = prog(frame, E('s114-cut'), E('s114-embers') - E('s114-cut'));
  const em = frame - E('s114-embers');
  const devT = prog(frame, CLONK - 26, 60);
  const devX = lerp(-11, 10, devT);
  const devAt: Vec3 = [devX, F, -7];
  const fall = prog(frame, CLONK - 10, 10);
  const chairY = frame < CLONK ? lerp(F + 12, F + 3.2, fall * fall) : F + 3.2 + Math.max(0, Math.sin((frame - CLONK) * 0.35) * 1.4 * Math.exp(-(frame - CLONK) / 10));
  const chairX = frame < CLONK ? lerp(devX - 2.5, lerp(-11, 10, prog(CLONK, CLONK - 26, 60)), fall) : lerp(-11, 10, prog(CLONK, CLONK - 26, 60)) + (frame - CLONK) * 0.12;
  const head = project(cam, [devX, F + 3.2, -7]);
  const ff = twos(frame);
  return (
    <Shot>
      <BlastScene frame={frame}>
        <Stage camera={S114_CAM}>
          <SkyRoom>
            <Throne />
            <Vorathul tl={S114_TL} frame={frame} at={THRONE_AT} />
            {devT > 0 && devT < 1 ? <Dev who="glasses" act="run" at={[devAt[0], F + Math.abs(Math.sin(ff * 0.6)) * 0.25, devAt[2]]} rot={[0, 0, frame >= CLONK && frame < CLONK + 8 ? 0.3 : -0.1]} height={3.2} order={3000} /> : null}
            {frame >= CLONK - 10 && frame < CLONK + 40 ? <Chair at={[chairX, chairY, -6.9]} rot={[0, 0, (frame - CLONK) * 0.2]} size={2.3} order={3001} pose={4} /> : null}
          </SkyRoom>
        </Stage>
        {/* Smoke: ink-edged ivory and grey clouds drifting apart and thinning. */}
        <Overlay style={{ opacity: 1 - clear }}>
          <defs>
            <InkFilter seed={114} rough={14} breakup={0.2} />
          </defs>
          <g filter={`url(#${inkFilterId(114, 14, 0.2)})`}>
            {SMOKE.map((s, i) => (
              <circle key={i} cx={s.x + s.vx * (ff - E('s114-cut'))} cy={s.y + s.vy * (ff - E('s114-cut'))} r={s.r * (1 + 0.6 * clear)} fill={s.dark ? O.dark : IVORY} stroke={INK} strokeWidth={8} />
            ))}
          </g>
        </Overlay>
        <Overlay>
          {em >= 0 ? EMBERS.map((e, i) => <circle key={i} cx={e.x + Math.sin(ff * e.w * 3 + i) * 30} cy={e.y - e.v * em} r={e.r} fill={e.c} opacity={1 - clamp01(em / 90)} />) : null}
        </Overlay>
        {/* The blast's ink carries over the cut and thins out (measured: a clean cut here was a 4th swing in the second). */}
        <InkSplash frame={frame - WHITEOUT - 9} duration={44} seed={1135} x={BLAST_AT.x} y={BLAST_AT.y} size={620} variant="violet" fade={24} />
        <ImpactBurst frame={frame - CLONK} duration={8} seed={1142} x={head.x} y={head.y} size={110} flash={0} />
        <DamageNumber frame={frame} text="-1" at={CLONK} x={head.x} y={head.y - 40} size={84} />
      </BlastScene>
    </Shot>
  );
};

