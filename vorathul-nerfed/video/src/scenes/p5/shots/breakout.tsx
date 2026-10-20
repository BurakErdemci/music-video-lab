// Scene 14, first half: the breakout (S91-S95). Awareness step 5: the canvas shatters toward the lens, the helm
// pushes through, ink and gold pour down the wall, he tears the patch notes, bursts out (A4) and lands (A5).
import { handheld, hold, OFF_LOW, OFF_MED, OFF_WIDE, SHAKE_PCT, sequence, tween, whip, withShake, type CameraPath, type CameraPose } from '../../../camera/api.ts';
import type { Vec3 } from '../../../stage/Card.tsx';
import { Stage } from '../../../stage/Stage.tsx';
import { RubberStamp } from '../../../ui/kit.ts';
import { ImpactBurst, InkSplash, PaintSpread, Shards, SpeedLines } from '../../../vfx/effects.ts';
import { CanvasShatter } from '../lib/CanvasShatter.tsx';
import { E, outCubic, project, prog, pxPerUnit, twos } from '../lib/geom.ts';
import { Dev, Frame, O, PaintDecal, PAINT_Z } from '../lib/Office.tsx';
import { Inside, PinnedCards, Room } from '../lib/Room.tsx';
import { Asset } from '../lib/PlateCard.tsx';
import { rigPoints, solveAt } from '../lib/rigPoints.ts';
import { InFront, Shot } from '../lib/Shell.tsx';
import { Vorathul } from '../lib/Vorathul.tsx';
import { cut, GOLD, INK, IVORY, move, OFFICE_FLOOR, pose, timeline } from '../lib/vorathul.ts';

const F = OFFICE_FLOOR;
const PLATE01 = '01-tarz-cizgi-roman.jpg';
const SHATTER_AT = E('s91-cut');
const PUNCH: [number, number] = [-1.4, 0.9];
// The breach widens as he pushes his shoulders through (S92), then the whole canvas goes with the burst (S94).
const GROW = [
  { t: E('s92-pour') - SHATTER_AT, radius: 6.4 },
  { t: E('s94-cut') - SHATTER_AT, radius: 30 },
];

// Rig card ids that come through the hole first (helm, horns, crown), then arms and shoulders, then the chest.
const HELM = ['head', 'eye_slit', 'crown', 'crown_gems', 'void_head', 'helm_half_R', 'helm_half_L', 'crown_half_R', 'crown_half_L'];
const ARMS = ['upper_arm_R', 'upper_arm_L', 'forearm_R', 'forearm_L', 'hand_R', 'hand_L', 'pauldron_R', 'pauldron_L', 'collar'];
const PIPES = ['R', 'L'].flatMap((s) => Array.from({ length: 8 }, (_, i) => [`pipe_${s}${i}_body`, `pipe_${s}${i}_mouth`, `pipe_${s}${i}_glow`, `pipe_${s}${i}_cork`, `wm_${s}${i}_body`, `wm_${s}${i}_mouth`]).flat());
const HAND_R = new Set(['hand_R', 'forearm_R']);
const HANDS = new Set(['hand_R', 'forearm_R', 'hand_L', 'forearm_L']);
const UPPER = new Set([...HELM, ...ARMS]);
const CHEST = new Set([...HELM, ...ARMS, ...PIPES, 'wing_root_R', 'wing_root_L', 'torso', 'chest_studs', 'cape_upper']);

// ------------------------------------------------------------------ S91
const S91_TL = timeline([
  cut(E('s91-cut'), pose('hand_on_canvas', { root: [0, 0, 0] })),
  move(E('s91-grip'), pose('hand_on_canvas', { armR: [150, 30, -10, 'grip'], head: [12, -0.01], torso: 8, root: [0, 0, 0] }), 12),
  move(E('s91-creak'), pose('hand_on_canvas', { armR: [150, 30, -10, 'grip'], armL: [150, 30, 10, 'grip'], head: [6, -0.005], torso: -6, root: [0, 0, 0] }), 14),
]);
const S91_Z = -21.3;
// His right gauntlet lands on the top frame bar, left of centre, where the last NERFED stamp is.
const GRIP: [number, number] = [-3.6, 4.55];
const S91_AT = solveAt(S91_TL, E('s91-grip'), 'handR', GRIP, S91_Z);
const S91_CAM: CameraPath = withShake(handheld(hold(OFF_MED([-1.2, 0.6, -20])), { amp: 0.05, seed: 's91' }), {
  hits: [
    { start: E('s91-cut'), seed: 911, amp: { pct: SHAKE_PCT.big } },
    { start: E('s91-shards-lens'), seed: 912, amp: { pct: SHAKE_PCT.small } },
    { start: E('s91-grip'), seed: 913, amp: { pct: SHAKE_PCT.medium } },
    { start: E('s91-creak'), seed: 914, amp: { pct: SHAKE_PCT.small } },
  ],
});

export const S91 = ({ frame }: { frame: number }) => {
  const cam = S91_CAM(frame);
  const t = frame - SHATTER_AT;
  const punch = project(cam, [PUNCH[0], PUNCH[1], PAINT_Z]);
  const stamp = project(cam, [GRIP[0] - 0.5, GRIP[1] + 0.05, PAINT_Z + 0.1]);
  const sw = 3.2 * pxPerUnit(cam, stamp.z);
  const front = frame >= E('s91-creak') ? HANDS : frame >= E('s91-grip') - 4 ? HAND_R : null;
  const ff = twos(frame);
  return (
    <Shot>
      <Stage camera={S91_CAM}>
        <Room />
        <Inside />
        <CanvasShatter t={t} punch={PUNCH} grow={GROW} />
        <Frame />
        <Vorathul tl={S91_TL} frame={frame} at={S91_AT} />
        {front ? (
          <InFront pose={cam} from={S91_Z} to={PAINT_Z + 0.4}>
            <Vorathul tl={S91_TL} frame={frame} at={S91_AT} isolate={front} renderBase={2000} />
          </InFront>
        ) : null}
      </Stage>
      <SpeedLines mode="radial" frame={ff - SHATTER_AT} duration={16} seed={91} focus={[punch.x, punch.y]} inner={260} count={46} />
      <Shards frame={frame - SHATTER_AT} duration={34} seed={91} origin={[punch.x, punch.y]} spread={Math.PI * 2} direction={0} speed={46} size={40} count={30} fills={[GOLD, IVORY, IVORY]} />
      <ImpactBurst frame={frame - SHATTER_AT} duration={9} seed={91} x={punch.x} y={punch.y} size={240} flash={0} />
      {/* Shards hit the lens: ink flecks land on the glass at the corners. */}
      <InkSplash frame={frame - E('s91-shards-lens')} duration={40} seed={912} x={150} y={930} size={130} fade={10} direction={-0.6} />
      <InkSplash frame={frame - E('s91-shards-lens') - 1} duration={38} seed={913} x={1790} y={150} size={95} fade={10} direction={2.4} />
      <div style={{ position: 'absolute', left: 0, top: 0 }}>
        <RubberStamp frame={frame} at={E('s91-cut') - 200} tearAt={E('s91-grip')} x={stamp.x - sw / 2} y={stamp.y - sw * 0.2} width={sw} rotate={-7} seed={5} />
      </div>
      <Shards frame={frame - E('s91-creak')} duration={24} seed={914} origin={[stamp.x + 160, stamp.y + 10]} direction={Math.PI / 2} spread={Math.PI * 0.8} speed={14} size={16} count={14} fills={[IVORY]} gravity={1.1} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S92
const S92_Z = -20.9;
const S92_TL = timeline([
  cut(E('s92-cut'), pose('burst', { armR: [120, 70, 0, 'grip'], armL: [120, 70, 0, 'grip'], head: [-10, 0.02], torso: -8, wings: [null, 0], legs: [4, 4] })),
  move(E('s92-rise'), pose('burst', { armR: [125, 45, 0, 'grip'], armL: [125, 45, 0, 'grip'], head: [4, 0], torso: 4, wings: [null, 8], legs: [6, 6] }), 12),
  move(E('s92-crown'), pose('burst', { armR: [135, 30, -10, 'fist'], armL: [135, 30, 10, 'fist'], head: [16, -0.01], torso: 10, wings: [null, 12], legs: [8, 8] }), 16),
  move(E('s92-floor'), pose('burst', { armR: [100, 40, -10, 'fist'], armL: [110, 50, 10, 'spread'], head: [8, -0.005], torso: 6, wings: [null, 10], legs: [8, 8] }), 18),
]);
const S92_X = PUNCH[0];
// He rises out of the hole on "rise", a 2-step lift on twos (rig root y is in H).
const s92Y = (frame: number): number => F - 1.5 + 1.6 * outCubic(prog(twos(frame), E('s92-rise'), 14)) + 0.25 * outCubic(prog(twos(frame), E('s92-crown') - 4, 6));
const S92_BASE: CameraPose = { ...OFF_LOW, position: [S92_X + 1.2, -5.6, -8.6], target: [S92_X, -2.2, -20] };
const S92_UP: CameraPose = { ...OFF_LOW, position: [S92_X + 0.6, -5.5, -9.4], target: [S92_X, 2.4, -20] };
const S92_CAM: CameraPath = withShake(handheld(tween(S92_BASE, S92_UP, { start: E('s92-cut'), frames: E('s92-crown') - E('s92-cut') }), { amp: 0.04, seed: 's92' }), {
  hits: [
    { start: E('s92-cut'), seed: 921, amp: { pct: SHAKE_PCT.medium } },
    { start: E('s92-rise'), seed: 922, amp: { pct: SHAKE_PCT.small } },
    { start: E('s92-crown'), seed: 923, amp: { pct: SHAKE_PCT.medium } },
  ],
});

export const S92 = ({ frame }: { frame: number }) => {
  const cam = S92_CAM(frame);
  const at: Vec3 = [S92_X, s92Y(frame), S92_Z];
  const t = frame - SHATTER_AT;
  const front = frame >= E('s92-pour') ? CHEST : UPPER;
  // Paint overflows the bottom bar of the frame and runs down the wall to the skirting.
  const l = project(cam, [S92_X - 5.2, -4.92, PAINT_Z + 0.1]);
  const r = project(cam, [S92_X + 4.6, -4.92, PAINT_Z + 0.1]);
  const floor = project(cam, [S92_X, F, PAINT_Z - 0.2]);
  const spread = outCubic(prog(frame, E('s92-floor'), 26));
  const drown = outCubic(prog(frame, E('s92-desks'), 10));
  const crown = project(cam, [S92_X, s92Y(frame) + 8.6, S92_Z]);
  return (
    <Shot>
      <Stage camera={S92_CAM}>
        <Room />
        <Inside />
        <CanvasShatter t={t} punch={PUNCH} grow={GROW} />
        <Frame />
        <Vorathul tl={S92_TL} frame={frame} at={at} />
        <InFront pose={cam} from={S92_Z} to={PAINT_Z + 0.5}>
          <Vorathul tl={S92_TL} frame={frame} at={at} isolate={front} renderBase={2000} />
        </InFront>
        {spread > 0 ? (
          <group position={[S92_X, F + 0.02, PAINT_Z + 2.8]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.15 + 0.85 * spread, 0.15 + 0.85 * spread, 1]}>
            <PaintDecal at={[0, 0, 0]} w={15} h={6.5} seed={92} order={60} />
          </group>
        ) : null}
        {drown > 0 ? (
          <>
            <PaintDecal at={[-8.6, F + 0.03, -12.2]} rot={[-Math.PI / 2, 0, 0]} w={6.5 * drown} h={3.2 * drown} seed={93} order={61} />
            <PaintDecal at={[7.6, F + 0.03, -12.6]} rot={[-Math.PI / 2, 0, 0]} w={6 * drown} h={3 * drown} seed={94} order={61} />
          </>
        ) : null}
      </Stage>
      <PaintSpread frame={frame - E('s92-pour')} seed={92} edge={{ x0: l.x, x1: r.x, y: l.y }} floor={floor.y} streams={9} width={Math.max(30, 0.55 * pxPerUnit(cam, l.z))} speed={Math.max(3, ((floor.y - l.y) / (E('s92-skirting') - E('s92-pour'))) * 0.9)} />
      <InkSplash frame={frame - E('s92-crown')} duration={24} seed={923} x={crown.x} y={crown.y} size={150} variant="violet" fade={8} direction={-Math.PI / 2} />
      <SpeedLines mode="radial" frame={twos(frame) - E('s92-crown')} duration={14} seed={923} focus={[crown.x, crown.y]} inner={220} color={INK} count={36} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S93
const S93_Z = -20.8;
const S93_TL = timeline([
  cut(E('s93-cut'), pose('burst', { armL: [150, 20, 0, 'spread'], armR: [100, 60, -10, 'fist'], head: [-6, 0.01], torso: -10, wings: [null, 4], legs: [6, 6] })),
  move(E('s93-tear'), pose('burst', { armL: [135, 10, 0, 'fist'], armR: [100, 60, -10, 'fist'], head: [-10, 0.01], torso: -12, wings: [null, 4], legs: [6, 6] }), 12),
  move(E('s93-crumple'), pose('burst', { armL: [80, 120, 20, 'fist'], armR: [110, 70, -10, 'fist'], head: [6, 0], torso: 4, wings: [null, 10], legs: [8, 8] }), 16),
]);
const CARDS_AT: [number, number] = [-6.0, 2.6];
const S93_AT = solveAt(S93_TL, E('s93-tear'), 'handL', CARDS_AT, S93_Z);
const S93_CAM: CameraPath = withShake(handheld(tween({ position: [-1.2, -3.4, -5.6], target: [-0.6, -1.2, -20], fov: 44 }, { position: [-2.4, -3.2, -6.4], target: [-1.8, -0.4, -20], fov: 44 }, { start: E('s93-cut'), frames: 47 }), { amp: 0.06, seed: 's93' }), {
  hits: [{ start: E('s93-tear'), seed: 931, amp: { pct: SHAKE_PCT.small } }, { start: E('s93-crumple'), seed: 932, amp: { pct: SHAKE_PCT.small } }],
});

export const S93 = ({ frame }: { frame: number }) => {
  const cam = S93_CAM(frame);
  const t = frame - SHATTER_AT;
  const ff = twos(frame);
  // The cards hang on the rim until torn, then ride his left fist and crumple into a ball.
  const tear = frame >= E('s93-tear');
  const crumple = outCubic(prog(ff, E('s93-crumple') - 6, 8));
  const runX = -2.4 - 2.6 * prog(ff, E('s93-cut'), 47);
  const bob = Math.abs(Math.sin((ff - E('s93-cut')) * 0.55)) * 0.25;
  return (
    <Shot>
      <Stage camera={S93_CAM}>
        <Room />
        <Inside />
        <CanvasShatter t={t} punch={PUNCH} grow={GROW} />
        <Frame />
        <Vorathul tl={S93_TL} frame={frame} at={S93_AT} />
        <InFront pose={cam} from={S93_Z} to={PAINT_Z + 0.5}>
          <Vorathul tl={S93_TL} frame={frame} at={S93_AT} isolate={CHEST} renderBase={2000} />
        </InFront>
        <HandCards frame={frame} tear={tear} crumple={crumple} cam={cam} />
        {/* The fleeing developer: foreground left, backing away sideways, bobbing on twos. */}
        <Dev at={[runX, F + bob, -8.2]} rot={[0, 0, 0.06 * Math.sin((ff - E('s93-cut')) * 0.55)]} height={3.5} order={3000} />
      </Stage>
      <SpeedLines mode="parallel" frame={ff - E('s93-tear')} duration={10} seed={93} angle={-Math.PI * 0.75} count={18} color={INK} speed={90} />
    </Shot>
  );
};

/** The patch-note cards: pinned on the rim, then in his fist (rig point), shrinking into a crumpled ball. */
const HandCards = ({ frame, tear, crumple, cam }: { frame: number; tear: boolean; crumple: number; cam: CameraPose }) => {
  if (!tear) return <PinnedCards at={(i) => [CARDS_AT[0] - 1.1 + i * 1.1, CARDS_AT[1] + (i % 2) * 0.5, PAINT_Z + 0.2]} rot={(i) => (i - 1) * 0.08} />;
  const hand = rigHandL(frame);
  const k = 1 - 0.7 * crumple;
  return (
    <InFront pose={cam} from={S93_Z} to={PAINT_Z + 0.55}>
      <PinnedCards at={(i) => [hand[0] + (i - 1) * 0.5 * k, hand[1] + (i % 2) * 0.3 * k, hand[2] + 0.05]} scale={() => k} rot={(i) => (i - 1) * 0.5 + crumple * (i + 1) * 1.7} />
    </InFront>
  );
};
const rigHandL = (frame: number): Vec3 => rigPoints(S93_TL, frame, { at: S93_AT }).handL;

// ------------------------------------------------------------------ S94 A4 burst
const S94_Z0 = -20.5;
const BURST = E('s94-cut');
// Root z toward the lens over 10 frames (9.5 units = 1.12 H), then airborne on "this".
const S94_TL = timeline([
  cut(BURST, pose('burst', { root: [0, 0, 0], wings: [null, 15] })),
  { at: BURST + 10, pose: pose('burst', { root: [0, 0, 1.12], wings: [null, 15], flare: 7 }), dur: 10 },
  move(E('s94-airborne'), pose('burst', { root: [0.05, 0.42, 1.2], armR: [160, 30, -30, 'grip'], armL: [120, 60, 0, 'fist'], legs: [18, 4], torso: 10, flare: 6 }), 12),
]);
const S94_X = -0.8;
const S94_START: CameraPose = { position: [3.5, -1.2, 1.5], target: [-4, -0.8, -20], fov: 40 };
const S94_CAM: CameraPath = withShake(
  sequence([
    { from: BURST, path: whip(S94_START, { start: BURST, yaw: 12, frames: 6 }) },
    { from: BURST + 6, path: tween({ ...OFF_WIDE, position: [0.2, -1.4, 1] }, { position: [-0.6, -1.0, 2.5], target: [-0.8, -0.6, -16], fov: 44 }, { start: BURST + 6, frames: 36 }), blend: 4 },
  ]),
  { hits: [{ start: BURST, seed: 941, amp: { pct: SHAKE_PCT.big } }, { start: E('s94-bars'), seed: 942, amp: { pct: SHAKE_PCT.medium } }] },
);

export const S94 = ({ frame }: { frame: number }) => {
  const cam = S94_CAM(frame);
  const tb = frame - BURST;
  // The chromatic copies trail at 3 frames and close up by "of" (they catch up).
  const catchUp = 1 - prog(frame, E('s94-echo') - 6, 8);
  const spin = -14 * outCubic(prog(twos(frame), E('s94-airborne') - 2, 8));
  const body = project(cam, [S94_X, F + 4, S94_Z0 + 9.5 * outCubic(prog(frame, BURST, 10))]);
  return (
    <Shot>
      <Stage camera={S94_CAM}>
        <Room />
        <Inside />
        <CanvasShatter t={frame - SHATTER_AT} punch={PUNCH} grow={GROW} speed={1.1} />
        <Frame burst={tb} />
        <Vorathul tl={S94_TL} frame={frame} at={[S94_X, F, S94_Z0]} spin={spin} echo={catchUp > 0 ? { copies: 3, delay: 2, offset: [-0.45 * catchUp, 0.1 * catchUp, -0.4 * catchUp] } : undefined} />
      </Stage>
      <SpeedLines mode="radial" frame={twos(frame) - BURST} duration={18} seed={94} focus={[body.x, body.y]} inner={380} count={56} thickness={14} />
      <Shards frame={tb} duration={30} seed={94} origin={[body.x, body.y - 120]} spread={Math.PI * 2} direction={0} speed={52} size={44} count={26} fills={[INK, INK, '#343A40']} gravity={1.2} />
      <InkSplash frame={frame - E('s94-bars')} duration={26} seed={942} x={body.x + 380} y={body.y - 260} size={160} fade={8} direction={0.3} />
      <InkSplash frame={frame - E('s94-bars') - 2} duration={26} seed={943} x={body.x - 420} y={body.y + 120} size={130} variant="violet" fade={8} direction={Math.PI} />
    </Shot>
  );
};

// ------------------------------------------------------------------ S95 A5 slam landing
const LAND = E('s95-cut');
const S95_AT: Vec3 = [-3, F, -10];
const S95_TL = timeline([
  cut(LAND, pose('slam_strike', { lean: -4 })),
  move(LAND + 16, pose('slam_follow', { lean: -3 }), 12),
  move(E('s95-desks') + 12, pose('base', { armR: [40, 70, -10, 'grip'], armL: [60, 50, 0, 'spread'], head: [10, -0.01], torso: 6, wings: [null, 12], swordDir: 40 }), 24),
]);
const S95_CAM: CameraPath = withShake(handheld(tween({ ...OFF_LOW, position: [0.6, -5.7, -2.2], target: [-2.2, -0.6, -14] }, { ...OFF_LOW, position: [0.9, -5.5, -2.8], target: [-2.4, 0.4, -14] }, { start: LAND, frames: 47 }), { amp: 0.05, seed: 's95' }), {
  hits: [{ start: LAND, seed: 951, amp: { pct: SHAKE_PCT.big }, frames: 18 }, { start: E('s95-desks'), seed: 952, amp: { pct: SHAKE_PCT.small } }],
});
const K3_CROP: [number, number, number, number] = [560, 40, 420, 980];

export const S95 = ({ frame }: { frame: number }) => {
  const cam = S95_CAM(frame);
  const feet = project(cam, S95_AT);
  const still = frame < LAND + 2;
  const wave = 26 * outCubic(prog(frame, E('s95-wave'), 30));
  // Desks on the right jump on beat 711 (a parabola, on twos).
  const j = prog(twos(frame), E('s95-desks'), 10);
  const jump = j > 0 && j < 1 ? 4 * j * (1 - j) : 0;
  return (
    <Shot>
      <Stage camera={S95_CAM}>
        <Room wave={wave} centre={[S95_AT[0], S95_AT[2]]} desks={(i) => (i >= 2 ? { off: [0, 0.9 * jump, 0], rot: [0, 0, (i === 2 ? 0.08 : -0.1) * jump] } : {})} />
        <CanvasShatter t={400} punch={PUNCH} grow={GROW} />
        {still ? (
          // K3: the deep-crouch key still on the impact frames (stand-in: frame 01, both hands on the planted sword).
          <Asset id="G44" standIn={{ plate: PLATE01, crop: K3_CROP, keying: 'ink' }} width={4.4} height={7.4} position={[S95_AT[0], F + 3.6, S95_AT[2]]} renderOrder={1500} />
        ) : (
          <Vorathul tl={S95_TL} frame={frame} at={S95_AT} />
        )}
      </Stage>
      <ImpactBurst frame={frame - LAND} duration={12} seed={95} x={feet.x} y={feet.y - 40} size={320} flash={2} />
      <SpeedLines mode="radial" frame={twos(frame) - LAND - 3} duration={14} seed={95} focus={[feet.x, feet.y - 300]} inner={420} count={48} />
      <Shards frame={frame - LAND - 1} duration={40} seed={95} origin={[feet.x, feet.y]} direction={-Math.PI / 2} spread={Math.PI * 0.9} speed={36} size={40} count={26} fills={[O.mid, O.dark, O.white]} />
      <InkSplash frame={frame - LAND - 2} duration={45} seed={951} x={feet.x + 40} y={feet.y + 10} size={260} fade={10} direction={0} />
      <InkSplash frame={frame - E('s95-wave')} duration={30} seed={952} x={feet.x - 300} y={feet.y + 40} size={120} variant="violet" fade={8} direction={Math.PI} />
    </Shot>
  );
};

