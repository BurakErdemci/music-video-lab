// The bored developer's performance over S32-S42 as a pure function of the frame: pose, position and which prop he holds.
import { DevBack, DevSide, DEV_STAND, lerpDevPose, type DevPose } from './art/dev.tsx';
import { T } from './frames.ts';
import { OFFICE } from './art/office.tsx';

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const smooth = (t: number): number => {
  const u = clamp(t);
  return u * u * (3 - 2 * u);
};
const arm = (upper: number, fore: number, hand: DevPose['armL']['hand']): DevPose['armL'] => ({ upper, fore, hand });

/** Standing, bored: eraser in the right hand, left hand empty. */
const BORED: DevPose = { ...DEV_STAND, heldL: 'none', armL: arm(5, 8, 'relaxed') };
const CLICK: DevPose = { ...DEV_STAND, heldL: 'clicker', armL: arm(100, 55, 'grip') };
const TAP_READY: DevPose = { ...DEV_STAND, heldL: 'eraser', heldR: 'mug', armL: arm(72, 40, 'grip'), armR: arm(7, 14, 'grip') };
const TAP: DevPose = { ...TAP_READY, armL: arm(104, 22, 'grip') };
const PIN: DevPose = { ...DEV_STAND, heldL: 'none', heldR: 'none', armR: arm(104, 12, 'flat'), armL: arm(6, 12, 'relaxed') };
const DUST: DevPose = { ...DEV_STAND, heldL: 'none', heldR: 'none', armL: arm(22, 112, 'rub'), armR: arm(22, 112, 'rub') };

export interface Dev {
  x: number;
  pose: DevPose;
  side: boolean;
}

const WALK_FROM = 11;
const WALK_TO = 3.0;
const WALK_END = T.clicker - 3;

export const devAt = (f: number): Dev => {
  const breathe = 0.02 * Math.sin(f * 0.21);
  if (f < WALK_END) {
    const t = clamp((f - T.devEnters) / (WALK_END - T.devEnters));
    const x = WALK_FROM + (WALK_TO - WALK_FROM) * t;
    const stride = (WALK_FROM - x) / 2.6;
    return {
      x,
      side: true,
      pose: { ...DEV_STAND, walking: true, stride, bob: 0.045 * Math.sin(stride * 4 * Math.PI), armR: arm(8, 25, 'grip'), armL: arm(-6, 20, 'grip') },
    };
  }
  if (f < T.unfreeze) {
    // back view, clicker raised at the painting; the click lands on hit[50]
    return { x: WALK_TO, side: false, pose: lerpDevPose({ ...DEV_STAND, heldL: 'clicker' }, CLICK, smooth((f - WALK_END) / 3)) };
  }
  if (f < T.tapVorathul - 16) {
    const sway = 0.06 * Math.sin(f * 0.11);
    return { x: WALK_TO, side: false, pose: { ...lerpDevPose(CLICK, BORED, smooth((f - T.unfreeze) / 14)), bob: breathe, lean: sway * 3, headRoll: 2 * Math.sin(f * 0.07) } };
  }
  if (f < T.health) {
    // S35: a step closer, the eraser comes up and taps the painted Vorathul on his name
    const x = 2.3;
    const up = smooth((f - (T.tapVorathul - 16)) / 12);
    const tap = smooth((f - (T.tapVorathul - 3)) / 3) * (1 - smooth((f - (T.tapVorathul + 3)) / 5));
    const pose = lerpDevPose(TAP_READY, TAP, tap);
    return { x, side: false, pose: { ...pose, armL: { ...pose.armL, upper: pose.armL.upper * Math.max(up, 0.35) + (1 - up) * 8 }, bob: breathe } };
  }
  if (f < T.players) {
    return { x: 2.3, side: false, pose: { ...TAP_READY, armL: arm(10, 14, 'grip'), bob: breathe } };
  }
  // S42: he pins the card to the frame, then dusts his hands
  const x = 6.9;
  const pin = smooth((f - T.players) / 8);
  const dust = smooth((f - (T.felt - 4)) / 6);
  const rub = 6 * Math.sin((f - T.felt) * 1.7) * dust;
  const pinned = lerpDevPose({ ...DEV_STAND, heldL: 'none', heldR: 'none' }, PIN, pin);
  const pose = dust > 0.5 ? { ...DUST, armL: { ...DUST.armL, upper: DUST.armL.upper + rub }, armR: { ...DUST.armR, upper: DUST.armR.upper - rub } } : pinned;
  return { x, side: false, pose: { ...pose, bob: breathe } };
};

/** The developer as an SVG group in world units (feet on the floor line). */
export const DevActor = ({ frame, x, flipX = false }: { frame: number; x?: number; flipX?: boolean }) => {
  const d = devAt(frame);
  const Body = d.side ? DevSide : DevBack;
  return (
    <g transform={`translate(${x ?? d.x} ${OFFICE.floorY}) scale(${flipX ? -1 : 1} 1)`}>
      <Body pose={d.pose} />
    </g>
  );
};
