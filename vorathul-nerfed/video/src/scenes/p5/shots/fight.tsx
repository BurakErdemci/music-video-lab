// Scene 14, second half: the fight in the office (S96-S104), attacks A6-A10 and the powers coming back
// (health, wings, rage), each used the moment it returns. No two attacks share a type or a camera.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld, hold, SHAKE_PCT, sequence, tween, withShake, type CameraPath, type CameraPose } from '../../../camera/api.ts';
import { VORATHUL_RIG, texOf } from '../../../rig/model.ts';
import { Card, type Vec3 } from '../../../stage/Card.tsx';
import { Stage } from '../../../stage/Stage.tsx';
import { BossNameplate, Cursor, Desktop, HealthBar, RevertDialog } from '../../../ui/kit.ts';
import { DuotoneFlash, ImpactBurst, InkSplash, Overlay, seeded, Shards, SpeedLines, taperedPath } from '../../../vfx/effects.ts';
import { BOSS_CUES } from '../lib/flash.ts';
import { clamp01, E, inOut, lerp, outBack, outCubic, prog, project, pxPerUnit, twos, unproject, W, H } from '../lib/geom.ts';
import { Chair, Desk, Dev, LightStrip, Monitor3D, O, Rect } from '../lib/Office.tsx';
import { AVAILABLE } from '../../../cast/available.ts';
import { Asset } from '../lib/PlateCard.tsx';
import { AfterRoom } from '../lib/Room.tsx';
import { rigPoints, solveAt } from '../lib/rigPoints.ts';
import { Shot } from '../lib/Shell.tsx';
import { Vorathul } from '../lib/Vorathul.tsx';
import { blastFire, cut, INK, IVORY, move, OFFICE_FLOOR, pipeLandFrame, pose, strike, timeline, UNIT, VIOLET } from '../lib/vorathul.ts';

const F = OFFICE_FLOOR;

/** Violet blade trail with ink and ivory echo copies (X21), as a screen-space arc. */
const BladeTrail = ({ pts, width, age, life = 7 }: { pts: [number, number][]; width: number; age: number; life?: number }) => {
  if (age < 0 || age >= life) return null;
  const a = 1 - age / life;
  return (
    <Overlay>
      {[IVORY, INK, VIOLET].map((c, i) => (
        <path key={c} d={taperedPath(pts.map(([x, y]) => [x - (2 - i) * 16 * a, y + (2 - i) * 6 * a]), width * (0.6 + 0.2 * i) * a, 0.45)} fill={c} opacity={i === 2 ? 1 : 0.85} />
      ))}
    </Overlay>
  );
};

// ------------------------------------------------------------------ S96 A6 cleave through the system dialog
const S96_AT: Vec3 = [0, F, -12];
const CLEAVE = E('s96-cleave');
const S96_TL = timeline([
  cut(E('s96-cut'), pose('cleave_antic')),
  strike(CLEAVE, pose('cleave_strike'), 18),
  move(CLEAVE + 18, pose('cleave_follow'), 18),
]);
const S96_CAM: CameraPath = withShake(handheld(tween({ position: [0.4, -1.6, 2.6], target: [0, -0.8, -12] }, { position: [0, -1.8, 0.4], target: [0, -0.9, -12] }, { start: E('s96-cut'), frames: CLEAVE - E('s96-cut') }), { amp: 0.04, seed: 's96' }), {
  hits: [{ start: CLEAVE, seed: 961, amp: { pct: SHAKE_PCT.medium } }],
});

export const S96 = ({ frame }: { frame: number }) => {
  const cam = S96_CAM(frame);
  const c = project(cam, [0, -1.0, -6]);
  const dw = Math.min(1100, 5.6 * pxPerUnit(cam, c.z));
  const split = frame - CLEAVE;
  const half = (side: -1 | 1): ReactNode => {
    const t = Math.max(0, split);
    const dx = side * (t * 9 + t * t * 0.6);
    const dy = t * t * 2.2;
    const rot = side * t * 2.6;
    return (
      <div key={side} style={{ position: 'absolute', inset: 0, clipPath: side < 0 ? `inset(0 ${W - c.x}px 0 0)` : `inset(0 0 0 ${c.x}px)`, transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, transformOrigin: `${c.x}px ${c.y + 300}px` }}>
        <RevertDialog frame={frame} x={c.x - dw / 2} y={c.y - dw * 0.24} width={dw} enterAt={E('s96-cut')} approachAt={E('s96-cut') + 2} pressAt={CLEAVE + 14} title="Unsaved changes" body="Are you sure?" confirmLabel="Discard" cancelLabel="Stay" />
      </div>
    );
  };
  const tip = project(cam, [0.4, 3.2, -11.5]);
  const low = project(cam, [0.1, -5.6, -11]);
  return (
    <Shot>
      <Stage camera={S96_CAM}>
        <AfterRoom />
        <Vorathul tl={S96_TL} frame={frame} at={S96_AT} echo={split >= 0 && split < 8 ? { copies: 2, delay: 2, offset: [-0.2, 0.25, -0.1] } : undefined} />
      </Stage>
      {split < 0 ? half(-1) : [half(-1), half(1)]}
      <BladeTrail pts={[[tip.x, tip.y], [c.x + 10, c.y - 120], [c.x, c.y + 80], [low.x - 20, low.y]]} width={70} age={split} />
      <Shards frame={split} duration={30} seed={96} origin={[c.x, c.y]} direction={Math.PI / 2} spread={Math.PI * 1.6} speed={30} size={34} count={22} fills={[O.white, O.mid, O.blue]} />
      <ImpactBurst frame={split} duration={8} seed={96} x={c.x} y={c.y + 60} size={170} flash={0} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S97 he drags his own health bar back
const S97_CAM: CameraPose = { position: [0.2, -0.6, -4.5], target: [0, -0.2, -14] };
const S97_DEPTH = 9.5;
const BAR = { x: 210, y: 420, w: 1500 };
const barScale = BAR.w / 900;
const capAt = (v: number): [number, number] => [BAR.x + (v / 100) * BAR.w, BAR.y + (60 + 32) * barScale];
const barValue = (frame: number): number => lerp(60, 100, inOut(prog(frame, E('s97-cut'), E('s97-full') - E('s97-cut'))));
const S97_TL = timeline([
  // His left arm (screen right in the front view) pulls the cap, so the body stays in frame on the left of it.
  cut(E('s97-cut'), pose('base', { armL: [92, 18, 0, 'fist'], armR: [40, 80, 0, 'grip'], torso: -10, head: [-8, -0.005], lean: -6, wings: [null, 10] })),
  move(E('s97-full') + 6, pose('base', { armL: [100, 40, 0, 'fist'], armR: [60, 70, 0, 'grip'], torso: -14, head: [-14, -0.01], lean: -8, wings: [null, 14] }), 12),
]);
const S97_PATH: CameraPath = withShake(handheld(hold(S97_CAM), { amp: 0.03, seed: 's97' }), { hits: [{ start: E('s97-full'), seed: 971, amp: { pct: SHAKE_PCT.small } }] });

export const S97 = ({ frame }: { frame: number }) => {
  const cam = S97_PATH(frame);
  const v = barValue(frame);
  const [cx, cy] = capAt(v);
  const hand = unproject(cam, cx + 30, cy, S97_DEPTH);
  const at = solveAt(S97_TL, frame, 'handL', [hand[0], hand[1]], cam.position[2] - S97_DEPTH);
  const full = frame - E('s97-full');
  const [c60x] = capAt(60);
  return (
    <Shot>
      <Stage camera={S97_PATH}>
        <AfterRoom />
        <Vorathul tl={S97_TL} frame={frame} at={at} />
      </Stage>
      <HealthBar frame={frame} x={BAR.x} y={BAR.y} width={BAR.w} label="VORATHUL" from={60} to={100} startFrame={E('s97-cut')} durationFrames={E('s97-full') - E('s97-cut')} ghost={false} />
      {/* The developer's grab cursor clings to the cap from the left and is yanked off when it reaches 100 %. */}
      <Cursor
        frame={frame}
        size={2.2}
        path={[{ f: E('s97-cut'), x: c60x - 70, y: cy + 30 }, { f: E('s97-full') - 2, x: capAt(96)[0] - 70, y: cy + 30 }, { f: E('s97-full') + 8, x: W + 260, y: -220 }]}
        grabRange={[E('s97-cut'), E('s97-full') - 2]}
      />
      <ImpactBurst frame={full} duration={9} seed={97} x={cx} y={cy} size={150} flash={0} />
      <InkSplash frame={full} duration={22} seed={97} x={cx + 40} y={cy - 20} size={120} variant="violet" fade={8} direction={-0.4} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S98 the Recycle Bin bursts: his pipes come back
const S98_AT: Vec3 = [5.8, F, -15.5];
const S98_TL = timeline([
  cut(E('s98-cut'), pose('conduct_wide', { head: [12, -0.01], torso: 6 })),
  move(E('s98-pipe3'), pose('conduct_wide', { armR: [130, 20, 20, 'spread'], armL: [80, 40, 20, 'spread'], head: [16, -0.01], torso: 10, lean: 4 }), 14),
]);
const MON: Vec3 = [0.9, F + 2.2, -8.6];
const MON_W = 3.4;
const S98_CAM: CameraPath = handheld(tween({ position: [-1.6, -2.4, -4.2], target: [1.4, -1.2, -18] }, { position: [-1.2, -2.2, -4.9], target: [1.7, -0.7, -18] }, { start: E('s98-cut'), frames: 37 }), { amp: 0.04, seed: 's98' });
const PIPE_TEX = texOf(VORATHUL_RIG, 'body_l');
const MOUTH_TEX = texOf(VORATHUL_RIG, 'mouth_l');
const hpxU = VORATHUL_RIG.hpx * UNIT;

/** One pipe flying from the monitor screen to its socket (the rig's own return flight takes over 8 frames out). */
const FlyingPipe = ({ from, to, t }: { from: Vec3; to: Vec3; t: number }) => {
  if (t < 0 || t > 1) return null;
  const e = outCubic(t);
  const p: Vec3 = [lerp(from[0], to[0], e), lerp(from[1], to[1], e) + Math.sin(Math.PI * t) * 1.6, lerp(from[2], to[2], e)];
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]) + t * 6;
  const s = lerp(0.8, 1, t);
  return (
    <group position={p} rotation={[0, 0, ang]} scale={s}>
      <Card src={PIPE_TEX.src} width={PIPE_TEX.w * hpxU} height={PIPE_TEX.h * hpxU} idColor={INK} renderOrder={2500} />
      <Card src={MOUTH_TEX.src} width={MOUTH_TEX.w * hpxU} height={MOUTH_TEX.h * hpxU} position={[(PIPE_TEX.w * hpxU) / 2, 0, 0.01]} idColor={VIOLET} renderOrder={2501} />
    </group>
  );
};

export const S98 = ({ frame }: { frame: number }) => {
  const cam = S98_CAM(frame);
  const scr = MON[1] + 0.5 + (MON_W * 0.6) / 2;
  const tl = project(cam, [MON[0] - (MON_W - 0.14) / 2, scr + (MON_W * 0.6 - 0.14) / 2, MON[2] + 0.02]);
  const br = project(cam, [MON[0] + (MON_W - 0.14) / 2, scr - (MON_W * 0.6 - 0.14) / 2, MON[2] + 0.02]);
  const bin = { x: lerp(tl.x, br.x, 0.86), y: lerp(tl.y, br.y, 0.68) };
  const pts = rigPoints(S98_TL, frame, { at: S98_AT });
  const burst = E('s98-cut') + 2;
  return (
    <Shot>
      <Stage camera={S98_CAM}>
        <AfterRoom desks={(i) => (i === 1 ? { hidden: true } : {})} />
        <Vorathul tl={S98_TL} frame={frame} at={S98_AT} />
        <Desk at={[MON[0], F, MON[2] + 0.6]} w={5.2} />
        <Monitor3D at={MON} w={MON_W} screen={O.mid} />
        {[2, 3, 4, 5].map((n) => {
          const land = pipeLandFrame(n);
          const target = pts.mouths[n - 1]!.p;
          return <FlyingPipe key={n} from={[MON[0], scr, MON[2] + 0.3]} to={[target[0] + 1.6, target[1] + 0.6, target[2]]} t={(frame - (land - 20)) / 12} />;
        })}
        <Dev who="glasses" act="cower" at={[-1.9, F, -6.4]} height={3.6} order={3000} />
      </Stage>
      <div style={{ position: 'absolute', left: tl.x, top: tl.y, width: br.x - tl.x, height: br.y - tl.y, overflow: 'hidden' }}>
        <Desktop frame={frame} burstAt={burst} width={br.x - tl.x} x={0} y={0} />
      </div>
      <InkSplash frame={frame - burst} duration={30} seed={98} x={bin.x} y={bin.y} size={140} variant="violet" fade={8} direction={-1.9} />
      <Shards frame={frame - burst} duration={26} seed={98} origin={[bin.x, bin.y]} direction={-Math.PI * 0.6} spread={Math.PI} speed={22} size={20} count={16} fills={[O.white, O.mid]} />
      {[2, 3, 4].map((n) => {
        const m = project(cam, pts.mouths[n - 1]!.p);
        return <InkSplash key={n} frame={frame - pipeLandFrame(n)} duration={14} seed={980 + n} x={m.x} y={m.y} size={70} variant="violet" fade={6} />;
      })}
    </Shot>
  );
};

// ------------------------------------------------------------------ S99 A7 claw lunge, second form
const S99_AT: Vec3 = [0, F, -14];
const LUNGE = E('s99-lunge');
const S99_TL = timeline([
  cut(E('s99-cut'), pose('lunge_antic', { root: [0, 0, 0] })),
  strike(LUNGE, pose('lunge_strike'), 12),
  move(LUNGE + 14, pose('lunge_follow'), 14),
]);
const S99_CAM: CameraPath = withShake(hold({ position: [0.1, 1.4, -6.4], target: [0, 1.3, -14] }), {
  hits: [{ start: E('s99-split'), seed: 991, amp: { pct: SHAKE_PCT.small } }, { start: LUNGE, seed: 992, amp: { pct: SHAKE_PCT.big } }],
});
const WINDOWS = [
  { x: 120, y: 90, w: 640, r: -4 },
  { x: 1180, y: 120, w: 620, r: 3 },
  { x: 60, y: 600, w: 560, r: 2 },
  { x: 1260, y: 640, w: 560, r: -3 },
  { x: 640, y: 760, w: 640, r: 1 },
];
const K2_CROP: [number, number, number, number] = [260, 0, 1020, 1024];

/** A flat browser window (office UI), torn along a jagged diagonal at `tear`. */
const BrowserWindow = ({ x, y, w, r, tear, frame }: { x: number; y: number; w: number; r: number; tear: number; frame: number }) => {
  const h = w * 0.62;
  const t = frame - tear;
  const body = (
    <div style={{ width: w, height: h, borderRadius: 14, background: O.white, border: `3px solid ${O.dark}`, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ height: 40, background: O.bg, borderBottom: `3px solid ${O.dark}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
        {[0, 1, 2].map((d) => <div key={d} style={{ width: 12, height: 12, borderRadius: 6, border: `2px solid ${O.dark}` }} />)}
        <div style={{ flex: 1, marginLeft: 10, height: 20, borderRadius: 10, border: `2px solid ${O.mid}` }} />
      </div>
      <div style={{ margin: '22px 26px 0', height: 20, width: '55%', borderRadius: 10, background: O.mid }} />
      <div style={{ margin: '14px 26px 0', height: 14, width: '75%', borderRadius: 7, background: O.bg }} />
      <div style={{ margin: '24px 26px 0', height: h * 0.32, borderRadius: 10, background: O.bg }} />
    </div>
  );
  if (t < 0) return <div style={{ position: 'absolute', left: x, top: y, transform: `rotate(${r}deg)` }}>{body}</div>;
  const k = Math.min(t, 14);
  const cutL = 'polygon(0 0, 46% 0, 38% 30%, 52% 55%, 41% 100%, 0 100%)';
  const cutR = 'polygon(46% 0, 100% 0, 100% 100%, 41% 100%, 52% 55%, 38% 30%)';
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `rotate(${r}deg)`, opacity: 1 - clamp01((t - 8) / 6) }}>
      <div style={{ position: 'absolute', clipPath: cutL, transform: `translate(${-k * 26}px, ${k * k * 1.4}px) rotate(${-k * 3}deg)` }}>{body}</div>
      <div style={{ position: 'absolute', clipPath: cutR, transform: `translate(${k * 30}px, ${k * k * 1.6}px) rotate(${k * 3.4}deg)` }}>{body}</div>
    </div>
  );
};

export const S99 = ({ frame }: { frame: number }) => {
  const still = frame >= LUNGE && frame <= LUNGE + 3;
  const lunge = frame - LUNGE;
  return (
    <Shot>
      <Stage camera={S99_CAM}>
        <AfterRoom />
        {still ? (
          // K2: second-form claws at the lens (stand-in: the second-form frame 04, ink and violet only).
          // Sized by height (the final G43 keeps its own aspect): claws fill the frame and come 25 % closer over 4 frames.
          <Asset id="G43" standIn={{ plate: '04-ikinci-form.jpg', crop: K2_CROP, keying: 'ink' }} width={3.1} height={3.1} position={[0, 1.3, -9.6]} scale={1 + 0.08 * (frame - LUNGE)} renderOrder={1500} />
        ) : (
          <Vorathul tl={S99_TL} frame={frame} at={S99_AT} echo={lunge >= -4 && lunge < 10 ? { copies: 3, delay: 2, offset: [0, 0.05, -0.6] } : undefined} />
        )}
      </Stage>
      {WINDOWS.map((w, i) => <BrowserWindow key={i} {...w} tear={LUNGE + i} frame={frame} />)}
      {[0, 1, 2].map((i) => (
        <BladeTrail key={i} pts={[[520 + i * 150, 60], [760 + i * 140, 420], [900 + i * 150, 1020]]} width={46} age={lunge - i} life={8} />
      ))}
      <Shards frame={lunge} duration={26} seed={99} origin={[W / 2, H / 2]} direction={0} spread={Math.PI * 2} speed={44} size={36} count={24} fills={[O.white, O.mid, O.bg]} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S100 the cursor swarm
const S100_AT: Vec3 = [0.4, F, -15.5];
const SWARM = E('s100-cut');
const S100_TL = timeline([
  cut(SWARM, pose('blast_antic', { armR: [60, 90, 0, 'fist'], armL: [70, 100, 0, 'fist'] })),
  move(E('s100-pipe9'), pose('conduct_wide', { head: [10, -0.01], torso: 4 }), 14),
  move(E('s100-pipe11') + 6, pose('cleave_antic', { lean: 3 }), 18),
]);
const lead = (frame: number): Vec3 => {
  const t = inOut(prog(frame, SWARM, 52));
  return [lerp(2.4, 0.9, t) + 0.25 * Math.sin(frame * 0.21), lerp(-1.6, 0.4, t) + 0.15 * Math.sin(frame * 0.33), lerp(-2.5, -11.5, t)];
};
const S100_CAM: CameraPath = (frame) => {
  const c = lead(frame);
  return { position: [c[0] - 0.25, c[1] + 0.35, c[2] + 1.4], target: [c[0] - 0.6, c[1] + 0.9, c[2] - 10], fov: 48 };
};
// Sixty cursors leave the monitors on the four desks and swarm round his body.
const SCREENS: Vec3[] = [[-10.9, F + 3.4, -13.7], [-9.9, F + 3.4, -7.2], [10.9, F + 3.4, -13.7], [9.9, F + 3.4, -7.2]];
const SWARM_SPEC = (() => {
  const rng = seeded('p5-swarm');
  return Array.from({ length: 60 }, (_, i) => ({
    from: SCREENS[i % 4]!,
    to: [S100_AT[0] + rng.range(-4.5, 4.5), F + rng.range(1.5, 9.5), S100_AT[2] + rng.range(0.4, 2.5)] as Vec3,
    start: SWARM + rng.range(-10, 26),
    dur: rng.range(16, 30),
    wob: rng.range(0.2, 0.7),
    ph: rng() * 6.3,
  }));
})();

export const S100 = ({ frame }: { frame: number }) => {
  const cam = S100_CAM(frame);
  const pts = rigPoints(S100_TL, frame, { at: S100_AT });
  const cursors = SWARM_SPEC.map((s) => {
    const t = clamp01((frame - s.start) / s.dur);
    const e = outCubic(t);
    const p: Vec3 = [lerp(s.from[0], s.to[0], e) + s.wob * Math.sin(frame * 0.4 + s.ph) * (1 - t * 0.6), lerp(s.from[1], s.to[1], e) + Math.sin(Math.PI * t) * 1.2, lerp(s.from[2], s.to[2], e)];
    return { p, pr: project(cam, p), on: frame >= s.start };
  }).filter((c) => c.on && c.pr.z > 0.5).sort((a, b) => b.pr.z - a.pr.z);
  const lp = project(cam, lead(frame));
  return (
    <Shot>
      <Stage camera={S100_CAM}>
        <AfterRoom />
        <Vorathul tl={S100_TL} frame={frame} at={S100_AT} />
      </Stage>
      {cursors.map((c, i) => (
        <Cursor key={i} frame={frame} path={[{ f: frame, x: c.pr.x, y: c.pr.y }]} size={Math.min(6, (0.55 * pxPerUnit(cam, c.pr.z)) / 40)} />
      ))}
      {[8, 9, 10, 11].map((n) => {
        const m = project(cam, pts.mouths[n - 1]!.p);
        return <InkSplash key={n} frame={frame - pipeLandFrame(n)} duration={16} seed={1000 + n} x={m.x} y={m.y} size={90} variant="violet" fade={6} />;
      })}
      {/* The lead cursor of the swarm, 1.2 units ahead of the lens. */}
      {/* Clamped: at 1.2 units the true size would swallow the frame in its outline. */}
      <Cursor frame={frame} path={[{ f: frame, x: Math.min(lp.x, W * 0.62), y: Math.max(lp.y, H * 0.62) }]} size={7} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S101 the boss nameplate
const S101_AT: Vec3 = [-0.6, F, -13.5];
const S101_TL = timeline([cut(E('s101-cut'), pose('raise_sword', { head: [12, -0.01] }))]);
const S101_CAM: CameraPath = withShake(handheld(tween({ position: [1.2, -2.8, -1.5], target: [-0.3, -0.8, -20] }, { position: [0.9, -2.6, -2.6], target: [-0.3, -0.6, -20] }, { start: E('s101-cut'), frames: 14 }), { amp: 0.03, seed: 's101' }), {
  hits: [{ start: E('s101-cut'), seed: 1011, amp: { pct: SHAKE_PCT.medium } }],
});

export const S101 = ({ frame }: { frame: number }) => (
  <Shot>
    <DuotoneFlash frame={frame} cues={BOSS_CUES} id="p5-s101">
      <AbsoluteFill style={{ background: O.bg }}>
        <Stage camera={S101_CAM}>
          <AfterRoom />
          <Vorathul tl={S101_TL} frame={frame} at={S101_AT} />
        </Stage>
        <BossNameplate frame={frame} x={0} y={660} slamAt={E('s101-cut')} />
      </AbsoluteFill>
    </DuotoneFlash>
  </Shot>
);

// ------------------------------------------------------------------ S102 A8 forward thrust into the lens, cursor kebab
const S102_AT: Vec3 = [0, F, -11];
const THRUST = E('s102-cut');
const S102_TL = timeline([
  cut(THRUST + 6, pose('thrust_strike')),
  move(THRUST + 22, pose('thrust_follow'), 14),
]);
const S102_CAM: CameraPath = withShake(hold({ position: [0, -1.4, -1.0], target: [0, -1.4, -14] }), {
  hits: [{ start: THRUST, seed: 1021, amp: { pct: SHAKE_PCT.big } }, { start: E('s102-fan'), seed: 1022, amp: { pct: SHAKE_PCT.small } }],
});
// Plate 04's sword runs from the gauntlet (lower left) up to the tip (top left): the skewered cursors sit along it.
const K1_CROP: [number, number, number, number] = [0, 0, 1536, 1024];
const KEBAB = 8;

export const S102 = ({ frame }: { frame: number }) => {
  const cam = S102_CAM(frame);
  const still = frame < THRUST + 6;
  const tl = frame >= THRUST + 6 ? S102_TL : null;
  let a: [number, number];
  let b: [number, number];
  if (still || !tl) {
    // K1 key still across the frame: map the plate's sword line (px in the 1536 x 1024 plate) to the screen.
    const sx = (px: number, py: number): [number, number] => [(px / 1536) * W * 1.15 - W * 0.075, (py / 1024) * H * 1.15 - H * 0.075];
    // The final G42 runs the blade straight down the middle, crossguard at the centre, tip at the bottom.
    a = AVAILABLE.has('G42') ? [W / 2, H * 0.5] : sx(250, 470);
    b = AVAILABLE.has('G42') ? [W / 2, H * 0.97] : sx(330, 30);
  } else {
    const pts = rigPoints(S102_TL, frame, { at: S102_AT });
    const g = project(cam, pts.swordGrip);
    const t = project(cam, pts.swordTip);
    a = [g.x, g.y];
    b = [t.x, t.y];
  }
  const fan = frame - E('s102-fan');
  return (
    <Shot>
      <Stage camera={S102_CAM}>
        <AfterRoom />
        {still ? (
          <Asset id="G42" standIn={{ plate: '04-ikinci-form.jpg', crop: K1_CROP, keying: 'ink' }} width={5.4} height={3.6} position={[0, -1.4, -5.6]} renderOrder={1500} />
        ) : (
          <Vorathul tl={S102_TL} frame={frame} at={S102_AT} echo={frame < THRUST + 16 ? { copies: 3, delay: 2, offset: [-0.5, 0, -0.3], colors: [VIOLET, VIOLET, INK] } : undefined} />
        )}
      </Stage>
      <SpeedLines mode="radial" frame={twos(frame) - THRUST} duration={18} seed={102} focus={[b[0], b[1]]} inner={180} count={60} thickness={12} />
      {Array.from({ length: KEBAB }, (_, i) => {
        const u = 0.18 + (i / (KEBAB - 1)) * 0.74;
        const x = lerp(a[0], b[0], u);
        const y = lerp(a[1], b[1], u);
        const jig = Math.sin(frame * 0.9 + i * 1.7) * 3;
        return <Cursor key={i} frame={frame} path={[{ f: frame, x: x + jig - 18, y: y - 10 }]} size={2.2 - i * 0.12} />;
      })}
      <ImpactBurst frame={frame - THRUST} duration={8} seed={102} x={b[0]} y={b[1]} size={220} flash={0} />
      <InkSplash frame={fan} duration={30} seed={1022} x={W / 2} y={H * 0.36} size={300} variant="violet" fade={10} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S103 A9 pipe-fan blast, restored, from the ceiling
const S103_AT: Vec3 = [0, F + 0.05, -13];
const BLAST = E('s103-blast');
const S103_TL = timeline(
  [cut(E('s103-cut'), pose('blast_antic')), strike(BLAST, pose('blast_strike'), 20), move(E('s103-strips'), pose('blast_follow'), 14)],
  { extraPipes: blastFire(BLAST) },
);
const S103_BASE: CameraPose = { position: [0.4, 4.6, -12.6], target: [0, F, -17.2], fov: 58 };
const S103_CAM: CameraPath = withShake(handheld(hold(S103_BASE), { amp: 0.04, seed: 's103' }), {
  hits: [{ start: BLAST, seed: 1031, amp: { pct: SHAKE_PCT.big } }, { start: E('s103-strips'), seed: 1032, amp: { pct: SHAKE_PCT.medium } }],
});
const PITCH = Math.atan2(S103_BASE.target[1] - S103_BASE.position[1], Math.hypot(S103_BASE.target[0] - S103_BASE.position[0], S103_BASE.target[2] - S103_BASE.position[2]));
/** World point of the unpitched rig -> the billboarded one (rotation about x through his feet). */
const pitched = (p: Vec3): Vec3 => {
  const y = p[1] - S103_AT[1];
  const z = p[2] - S103_AT[2];
  return [p[0], S103_AT[1] + y * Math.cos(PITCH) - z * Math.sin(PITCH), S103_AT[2] + y * Math.sin(PITCH) + z * Math.cos(PITCH)];
};
const STRIPS: Vec3[] = [[-5.2, 3.5, -10.6], [5.4, 3.5, -11.4], [-4.6, 3.5, -15.2], [5.0, 3.5, -15.8]];

export const S103 = ({ frame }: { frame: number }) => {
  const cam = S103_CAM(frame);
  const pts = rigPoints(S103_TL, frame, { at: S103_AT });
  const centre = project(cam, pitched(pts.chest));
  const charge = frame >= E('s103-charge') && frame < BLAST ? prog(frame, E('s103-charge'), BLAST - E('s103-charge')) : 0;
  const strips = frame - E('s103-strips');
  return (
    <Shot>
      <Stage camera={S103_CAM}>
        <AfterRoom ceiling={false} strips={false} />
        <Vorathul tl={S103_TL} frame={frame} at={S103_AT} pitch={PITCH} />
        {strips < 0 ? STRIPS.map((s, i) => <LightStrip key={i} at={s} len={5} />) : null}
      </Stage>
      <Overlay>
        {pts.mouths.map((m, i) => {
          if (!m.lit) return null;
          const p = project(cam, pitched(m.p));
          const fire = BLAST + 2 * Math.floor(i / 2);
          const age = frame - fire;
          const dx = p.x - centre.x;
          const dy = p.y - centre.y;
          const dl = Math.hypot(dx, dy) || 1;
          const out: [number, number] = [dx / dl, dy / dl];
          const len = age >= 0 && age < 10 ? 900 * outCubic(age / 6) : 0;
          const w = age >= 0 && age < 10 ? 70 * (1 - age / 10) : 0;
          return (
            <g key={i}>
              {charge > 0 ? <circle cx={p.x} cy={p.y} r={10 + 26 * charge * (0.7 + 0.3 * Math.sin(frame * 2 + i))} fill={VIOLET} opacity={0.85} /> : null}
              {len > 0 ? <path d={taperedPath([[p.x, p.y], [p.x + out[0] * len * 0.5, p.y + out[1] * len * 0.5], [p.x + out[0] * len, p.y + out[1] * len]], w, 0.25)} fill={VIOLET} /> : null}
            </g>
          );
        })}
      </Overlay>
      {pts.mouths.map((m, i) => {
        const p = project(cam, pitched(m.p));
        return <InkSplash key={i} frame={frame - BLAST - 2 * Math.floor(i / 2)} duration={18} seed={1030 + i} x={p.x} y={p.y} size={80} variant="violet" fade={6} />;
      })}
      {STRIPS.map((s, i) => {
        const p = project(cam, s);
        return <Shards key={i} frame={strips - (i % 2)} duration={30} seed={1033 + i} origin={[p.x, p.y]} direction={Math.atan2(p.y - H / 2, p.x - W / 2)} spread={Math.PI * 0.9} speed={34} size={34} count={14} fills={[O.white, O.white, O.mid]} />;
      })}
    </Shot>
  );
};

// ------------------------------------------------------------------ S104 A10 sweep across the desks, from under a desk
const S104_AT: Vec3 = [5.4, F, -15];
const SWEEP = E('s104-sweep');
const S104_TL = timeline([
  cut(E('s104-cut'), pose('sweep_antic')),
  strike(SWEEP, pose('sweep_strike'), 20),
  move(E('s104-land') + 8, pose('sweep_follow'), 16),
]);
const S104_CAM: CameraPath = withShake(handheld(hold({ position: [2, -5.4, -6], target: [2.6, -3.6, -14] }), { amp: 0.03, seed: 's104' }), {
  hits: [{ start: SWEEP, seed: 1041, amp: { pct: SHAKE_PCT.medium } }, { start: E('s104-land'), seed: 1042, amp: { pct: SHAKE_PCT.small } }],
});
// Props in the blade's path: they fly left across the room and crash on beat 744.
const FLYERS = [
  { kind: 'monitor', at: [6.5, F + 2.2, -11.2] as Vec3, to: [-5.5, F, -10.5] as Vec3, spin: 2.6 },
  { kind: 'chair', at: [3.2, F, -10.2] as Vec3, to: [-3.8, F, -9.6] as Vec3, spin: -3.2 },
  { kind: 'monitor', at: [8.8, F + 2.2, -12.6] as Vec3, to: [-1.8, F, -12.4] as Vec3, spin: -2.1 },
  { kind: 'chair', at: [9.6, F, -11.0] as Vec3, to: [-7.4, F, -11.8] as Vec3, spin: 3.6 },
];

export const S104 = ({ frame }: { frame: number }) => {
  const cam = S104_CAM(frame);
  const t = prog(twos(frame), SWEEP, E('s104-land') - SWEEP);
  const after = frame - E('s104-land');
  const blade = project(cam, [4, -2, -13]);
  return (
    <Shot>
      <Stage camera={S104_CAM}>
        <AfterRoom desks={() => ({ hidden: true })} />
        <Desk at={[7.4, F, -11.0]} rot={[0, 0, t > 0 ? -0.25 * outBack(t) : 0]} off={t > 0 ? [-1.2 * t, 0.4 * Math.sin(Math.PI * t), 0] : undefined} />
        <Vorathul tl={S104_TL} frame={frame} at={S104_AT} echo={frame >= SWEEP - 4 && frame < SWEEP + 10 ? { copies: 3, delay: 2, offset: [0.5, 0, -0.2] } : undefined} />
        {FLYERS.map((f, i) => {
          const p: Vec3 = t <= 0 ? f.at : [lerp(f.at[0], f.to[0], t), lerp(f.at[1], f.to[1], t) + Math.sin(Math.PI * t) * 2.4 + (after > 0 ? Math.max(0, 0.6 * Math.sin(after * 0.5)) * Math.exp(-after / 6) : 0), lerp(f.at[2], f.to[2], t)];
          const rot: Vec3 = [0, 0, t * f.spin];
          return f.kind === 'monitor' ? <Monitor3D key={i} at={p} rot={rot} w={2.2} screen={O.blue} /> : <Chair key={i} at={p} rot={rot} size={2.4} pose={6} />;
        })}
        {/* The desk we hide under: its underside across the top fifth, legs left and right. */}
        <Rect w={11} h={2.6} at={[2, -3.98, -6.9]} rot={[Math.PI / 2, 0, 0]} color={O.dark} />
        <Rect w={11} h={0.24} at={[2, -4.1, -8.2]} color={O.white} />
        <Rect w={0.22} h={2.2} at={[-2.6, F + 1.1, -7.6]} color={O.slate} />
        <Dev who="glasses" act="underDesk" at={[-1.3, F, -7.0]} height={1.9} order={3000} />
      </Stage>
      <SpeedLines mode="parallel" frame={twos(frame) - SWEEP} duration={14} seed={104} angle={Math.PI} count={30} speed={160} />
      <BladeTrail pts={[[W + 40, blade.y - 140], [blade.x + 120, blade.y - 40], [blade.x - 500, blade.y + 30], [-60, blade.y - 30]]} width={64} age={frame - SWEEP} life={8} />
      {FLYERS.map((f, i) => {
        const p = project(cam, f.to);
        return <InkSplash key={i} frame={after - (i % 2)} duration={24} seed={1040 + i} x={p.x} y={p.y} size={90} fade={8} direction={Math.PI} />;
      })}
      <Shards frame={after} duration={30} seed={104} origin={[project(cam, [-4, F, -10.5]).x, project(cam, [-4, F, -10.5]).y]} direction={-Math.PI / 2} spread={Math.PI} speed={24} size={26} count={18} fills={[O.white, O.mid, O.blue]} />
    </Shot>
  );
};

