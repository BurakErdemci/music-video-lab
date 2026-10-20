import React from 'react';
import { C } from '../../../ui/theme.tsx';

/**
 * THE DEVELOPER: flat vector office character, two views (back, left profile).
 * Local origin = floor point between the feet, y down, 5.6 units tall, 1 unit = 1 world unit.
 * Every function here is a pure function of its props.
 */

export type DevHand = 'relaxed' | 'grip' | 'point' | 'open' | 'flat' | 'rub';
export interface DevArm { upper: number; fore: number; hand: DevHand }
export type DevHeld = 'none' | 'mug' | 'eraser' | 'clicker';
export interface DevPose {
  stride: number;
  walking: boolean;
  bob: number;
  lean: number;
  headRoll: number;
  headYaw: number;
  armL: DevArm;
  armR: DevArm;
  heldL: DevHeld;
  heldR: DevHeld;
}

export const DEV_STAND: DevPose = {
  stride: 0,
  walking: false,
  bob: 0,
  lean: 0,
  headRoll: 0,
  headYaw: 0,
  armL: { upper: 7, fore: 10, hand: 'grip' },
  armR: { upper: 7, fore: 10, hand: 'grip' },
  heldL: 'mug',
  heldR: 'eraser',
};

const LW = 0.035;
const INK = C.ink;
const SKIN = '#F1F3F5';
const HAIR = '#1B1D21';
const HOODIE = C.mid;
const HOOD = C.dark;
const PANTS = '#495057';
const PANTS_FAR = C.ink;
const UPPER_LEN = 1.0;
const FORE_LEN = 0.95;
const HIP_Y = -2.75;
const ANKLE_Y = -0.3;
const SHOULDER_Y = -4.5;
const NECK_Y = -4.75;

const DEG = Math.PI / 180;
const f = (n: number): string => (Math.abs(n) < 1e-6 ? '0' : n.toFixed(3));
const poly = (pts: ReadonlyArray<readonly [number, number]>): string =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${f(p[0])} ${f(p[1])}`).join(' ');

// ---------------------------------------------------------------------------------------------
// Union-outline shapes: every part is outlined first, then every part is filled, so overlapping
// parts (fingers on a palm, two limb segments) read as one silhouette with one thin outline.
// A part with `w` is a stroked capsule path, a part without it is a filled closed shape.
interface Part { d: string; w?: number }

const Merged: React.FC<{ parts: Part[]; fill: string }> = ({ parts, fill }) => (
  <g strokeLinecap="round" strokeLinejoin="round">
    {parts.map((p, i) =>
      p.w === undefined ? (
        <path key={`o${i}`} d={p.d} fill={INK} stroke={INK} strokeWidth={LW * 2} />
      ) : (
        <path key={`o${i}`} d={p.d} fill="none" stroke={INK} strokeWidth={p.w + LW * 2} />
      ),
    )}
    {parts.map((p, i) =>
      p.w === undefined ? (
        <path key={`f${i}`} d={p.d} fill={fill} />
      ) : (
        <path key={`f${i}`} d={p.d} fill="none" stroke={fill} strokeWidth={p.w} />
      ),
    )}
  </g>
);

const cap = (x1: number, y1: number, x2: number, y2: number, w: number): Part => ({
  d: `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`,
  w,
});

const Line: React.FC<{ d: string; color?: string; w?: number }> = ({ d, color = INK, w = LW * 0.8 }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);

const rrect = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${f(x + r)} ${f(y)} L${f(x + w - r)} ${f(y)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} ` +
  `L${f(x + w)} ${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} ` +
  `L${f(x + r)} ${f(y + h)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} L${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Z`;

// ---------------------------------------------------------------------------------------------
// Hands. Local frame: origin at the wrist, +y runs along the forearm towards the fingers, the
// thumb sits on the -x side (the caller mirrors the frame for the other side).
const HandShape: React.FC<{ kind: DevHand }> = ({ kind }) => {
  switch (kind) {
    case 'grip':
      return (
        <g>
          <Merged parts={[cap(-0.06, 0.17, 0.06, 0.17, 0.32), cap(-0.15, 0.06, -0.1, 0.24, 0.1)]} fill={SKIN} />
          <Line d="M-0.02 0.1 L-0.02 0.28 M0.07 0.1 L0.07 0.28" />
        </g>
      );
    case 'point':
      return (
        <g>
          <Merged
            parts={[
              cap(0, 0.07, 0, 0.14, 0.3),
              cap(-0.1, 0.2, 0.1, 0.2, 0.16),
              cap(0.04, 0.15, 0.04, 0.6, 0.1),
              cap(-0.15, 0.08, -0.12, 0.26, 0.09),
            ]}
            fill={SKIN}
          />
          <Line d="M-0.04 0.14 L-0.04 0.26" />
        </g>
      );
    case 'open':
      return (
        <g>
          <Merged
            parts={[
              cap(-0.03, 0.08, 0.03, 0.08, 0.3),
              cap(-0.12, 0.17, -0.19, 0.46, 0.075),
              cap(-0.04, 0.18, -0.07, 0.5, 0.075),
              cap(0.04, 0.18, 0.07, 0.48, 0.075),
              cap(0.12, 0.17, 0.2, 0.42, 0.07),
              cap(-0.17, 0.07, -0.3, 0.24, 0.1),
            ]}
            fill={SKIN}
          />
        </g>
      );
    case 'flat':
      return (
        <g>
          <Merged
            parts={[
              cap(-0.03, 0.09, 0.03, 0.09, 0.32),
              cap(-0.11, 0.2, -0.11, 0.46, 0.08),
              cap(-0.035, 0.2, -0.035, 0.49, 0.08),
              cap(0.04, 0.2, 0.04, 0.47, 0.08),
              cap(0.115, 0.2, 0.115, 0.42, 0.075),
              cap(-0.19, 0.08, -0.2, 0.28, 0.1),
            ]}
            fill={SKIN}
          />
          <Line d="M-0.07 0.28 L-0.07 0.42 M0 0.28 L0 0.45 M0.08 0.28 L0.08 0.42" />
        </g>
      );
    case 'rub':
      return (
        <g>
          <Merged
            parts={[cap(0, 0.07, 0, 0.12, 0.3), cap(-0.1, 0.22, 0.1, 0.22, 0.15), cap(-0.15, 0.06, -0.08, 0.24, 0.09)]}
            fill={SKIN}
          />
          <Line d="M-0.04 0.14 L-0.04 0.26 M0.05 0.14 L0.05 0.26" />
          <Line d="M0.28 0.04 Q0.36 0.17 0.28 0.3 M0.38 0.08 Q0.45 0.18 0.38 0.28" color={C.slate} w={LW * 1.2} />
        </g>
      );
    case 'relaxed':
    default:
      return (
        <g>
          <Merged
            parts={[
              cap(0, 0.06, 0, 0.12, 0.28),
              cap(0.09, 0.15, 0.1, 0.32, 0.09),
              cap(0.01, 0.16, 0.01, 0.37, 0.09),
              cap(-0.07, 0.15, -0.07, 0.31, 0.085),
              cap(-0.15, 0.05, -0.19, 0.2, 0.09),
            ]}
            fill={SKIN}
          />
        </g>
      );
  }
};

// ---------------------------------------------------------------------------------------------
// Held props. The eraser and clicker follow the forearm axis (hand frame); the mug stays upright.
const Eraser: React.FC = () => (
  <g strokeLinejoin="round">
    <path d={rrect(-0.2, -0.1, 0.4, 0.9, 0.08)} fill={C.white} />
    <path d={`M-0.2 0.5 L0.2 0.5 L0.2 0.72 Q0.2 0.8 0.12 0.8 L-0.12 0.8 Q-0.2 0.8 -0.2 0.72 Z`} fill={C.dark} />
    <rect x={-0.2} y={0.38} width={0.4} height={0.12} fill={C.blue} />
    <path d={rrect(-0.2, -0.1, 0.4, 0.9, 0.08)} fill="none" stroke={INK} strokeWidth={LW} />
    <Line d="M-0.2 0.38 L0.2 0.38 M-0.2 0.5 L0.2 0.5" />
  </g>
);

const Clicker: React.FC = () => (
  <g strokeLinejoin="round">
    <path d={rrect(-0.1, -0.02, 0.2, 0.56, 0.06)} fill={C.mid} stroke={INK} strokeWidth={LW} />
    <circle cx={0} cy={0.43} r={0.05} fill={C.blue} stroke={INK} strokeWidth={LW * 0.7} />
    <circle cx={0} cy={0.5} r={0.02} fill={C.slate} />
  </g>
);

// Upright mug, origin at the centre of its rim.
const Mug: React.FC = () => (
  <g strokeLinejoin="round" strokeLinecap="round">
    <path d="M0.17 0.12 C0.42 0.08 0.42 0.4 0.17 0.4" fill="none" stroke={INK} strokeWidth={0.1 + LW * 2} />
    <path d="M0.17 0.12 C0.42 0.08 0.42 0.4 0.17 0.4" fill="none" stroke={C.white} strokeWidth={0.1} />
    <path d={rrect(-0.21, 0, 0.42, 0.5, 0.06)} fill={C.white} stroke={INK} strokeWidth={LW} />
    <rect x={-0.21} y={0.17} width={0.42} height={0.12} fill={C.blue} />
    <Line d="M-0.21 0.17 L0.21 0.17 M-0.21 0.29 L0.21 0.29" />
    <ellipse cx={0} cy={0} rx={0.21} ry={0.045} fill={C.dark} stroke={INK} strokeWidth={LW} />
  </g>
);

// ---------------------------------------------------------------------------------------------
// One arm. s = +1 puts "outward" on +x, s = -1 on -x (the side view uses -x as "forwards").
const armGeometry = (s: number, shoulder: readonly [number, number], arm: DevArm) => {
  const a1 = arm.upper * DEG;
  const a2 = (arm.upper + arm.fore) * DEG;
  const elbow: [number, number] = [shoulder[0] + s * Math.sin(a1) * UPPER_LEN, shoulder[1] + Math.cos(a1) * UPPER_LEN];
  const wrist: [number, number] = [elbow[0] + s * Math.sin(a2) * FORE_LEN, elbow[1] + Math.cos(a2) * FORE_LEN];
  return { elbow, wrist, foreAngle: arm.upper + arm.fore };
};

const ArmDraw: React.FC<{
  s: number;
  shoulder: readonly [number, number];
  arm: DevArm;
  held: DevHeld;
  sleeve: string;
}> = ({ s, shoulder, arm, held, sleeve }) => {
  const { elbow, wrist, foreAngle } = armGeometry(s, shoulder, arm);
  const handRot = -s * foreAngle; // rotates the local +y axis onto the forearm direction
  const gripX = wrist[0] + s * Math.sin(foreAngle * DEG) * 0.17;
  const gripY = wrist[1] + Math.cos(foreAngle * DEG) * 0.17;
  return (
    <g>
      <Merged parts={[cap(elbow[0], elbow[1], wrist[0], wrist[1], 0.27)]} fill={SKIN} />
      <Merged parts={[cap(shoulder[0], shoulder[1], elbow[0], elbow[1], 0.4)]} fill={sleeve} />
      {held === 'mug' && (
        <g transform={`translate(${f(gripX)} ${f(gripY - 0.04)})`}>
          <Mug />
        </g>
      )}
      {(held === 'eraser' || held === 'clicker') && (
        <g transform={`translate(${f(wrist[0])} ${f(wrist[1])}) rotate(${f(handRot)}) scale(${s} 1)`}>
          {held === 'eraser' ? <Eraser /> : <Clicker />}
        </g>
      )}
      <g transform={`translate(${f(wrist[0])} ${f(wrist[1])}) rotate(${f(handRot)}) scale(${s} 1)`}>
        <HandShape kind={arm.hand} />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------------------------
// Shoes and legs.
const shoeParts = (cx: number, cy: number, halfLen: number): Part[] => [cap(cx - halfLen, cy, cx + halfLen, cy, 0.28)];

const gaitLift = (phase: number): number => 0.17 * Math.max(0, Math.cos(phase));

// ---------------------------------------------------------------------------------------------
// Head, back view: black short messy hair covers the skull, two ears, a hint of cheek on yaw.
const BackHead: React.FC<{ roll: number; yaw: number }> = ({ roll, yaw }) => {
  const dx = yaw * 0.06;
  const cheek = Math.abs(yaw) * 0.12;
  const sgn = yaw >= 0 ? 1 : -1;
  const hair =
    'M-0.45 -5.0 C-0.47 -5.42 -0.26 -5.52 0 -5.52 C0.26 -5.52 0.47 -5.42 0.45 -5.0 ' +
    'C0.44 -4.9 0.36 -4.84 0.25 -4.84 L-0.25 -4.84 C-0.36 -4.84 -0.44 -4.9 -0.45 -5.0 Z';
  const tufts =
    'M-0.34 -5.38 L-0.4 -5.58 L-0.2 -5.5 L-0.16 -5.66 L0.02 -5.52 L0.14 -5.62 L0.24 -5.5 L0.4 -5.52 L0.32 -5.38 Z';
  return (
    <g transform={`rotate(${f(roll)} 0 ${NECK_Y})`}>
      <Merged parts={[cap(0, -4.92, 0, -4.7, 0.24)]} fill={SKIN} />
      <g transform={`translate(${f(dx)} 0)`}>
        <Merged parts={[cap(-0.47, -5.0, -0.47, -4.98, 0.17), cap(0.47, -5.0, 0.47, -4.98, 0.17)]} fill={SKIN} />
        <g strokeLinejoin="round">
          <path d={hair} fill={HAIR} stroke={INK} strokeWidth={LW} />
          <path d={tufts} fill={HAIR} stroke={INK} strokeWidth={LW} />
          <path d={hair} fill={HAIR} />
        </g>
        <Line d="M-0.2 -5.3 Q-0.1 -5.1 -0.14 -4.9 M0.06 -5.36 Q0.12 -5.12 0.08 -4.92 M0.28 -5.26 Q0.3 -5.1 0.26 -4.96" color={C.ink} w={LW * 0.9} />
        {cheek > 0.005 && (
          <path
            d={`M${f(sgn * 0.45)} -5.0 Q${f(sgn * (0.45 - cheek))} -4.94 ${f(sgn * (0.38 - cheek * 0.4))} -4.84 L${f(sgn * 0.3)} -4.84 Q${f(sgn * 0.42)} -4.9 ${f(sgn * 0.45)} -5.0 Z`}
            fill={SKIN}
            stroke={INK}
            strokeWidth={LW}
            strokeLinejoin="round"
          />
        )}
      </g>
    </g>
  );
};

// Head, profile facing -x.
const SideHead: React.FC<{ roll: number }> = ({ roll }) => (
  <g transform={`rotate(${f(roll)} 0 ${NECK_Y})`} strokeLinejoin="round" strokeLinecap="round">
    <Merged parts={[cap(0.06, -4.9, 0.06, -4.6, 0.25)]} fill={SKIN} />
    <Merged
      parts={[
        { d: 'M0 -5.55 C0.3 -5.55 0.48 -5.35 0.48 -5.05 C0.48 -4.75 0.25 -4.55 -0.05 -4.55 C-0.3 -4.55 -0.46 -4.7 -0.47 -4.88 L-0.5 -4.98 L-0.57 -5.0 L-0.49 -5.15 C-0.48 -5.4 -0.3 -5.55 0 -5.55 Z' },
      ]}
      fill={SKIN}
    />
    <circle cx={-0.28} cy={-5.04} r={0.04} fill={INK} />
    <Line d="M-0.36 -5.15 L-0.2 -5.16" w={LW} />
    <Line d="M-0.36 -4.76 L-0.26 -4.75" />
    <path
      d="M-0.5 -5.2 L-0.38 -5.3 L-0.34 -5.16 L-0.22 -5.28 L-0.16 -5.1 L-0.02 -5.2 L0.06 -4.98 L0.2 -4.9 L0.3 -4.72 L0.52 -4.8 C0.56 -5.1 0.5 -5.36 0.34 -5.5 L0.2 -5.68 L0.08 -5.56 L-0.04 -5.7 L-0.16 -5.56 L-0.34 -5.6 L-0.44 -5.44 Z"
      fill={HAIR}
      stroke={INK}
      strokeWidth={LW}
    />
    <Line d="M0.12 -5.4 Q0.26 -5.3 0.28 -5.1 M0.34 -5.3 Q0.4 -5.1 0.38 -4.92" w={LW * 0.9} />
    <Merged parts={[cap(0.08, -4.99, 0.08, -4.93, 0.15)]} fill={SKIN} />
  </g>
);

// ---------------------------------------------------------------------------------------------
// Back view.
const backAnkle = (hipX: number, phase: number, walking: boolean): [number, number] => [
  hipX * 1.05,
  ANKLE_Y - (walking ? gaitLift(phase) : 0),
];

export const DevBack: React.FC<{ pose: DevPose }> = ({ pose }) => {
  const ph = pose.stride * 2 * Math.PI;
  const hipY = HIP_Y + pose.bob;
  const legs: Array<{ hx: number; ph: number }> = [
    { hx: -0.3, ph },
    { hx: 0.3, ph: ph + Math.PI },
  ];
  return (
    <g transform={`rotate(${f(pose.lean)})`}>
      {legs.map((l) => {
        const [ax, ay] = backAnkle(l.hx, l.ph, pose.walking);
        return (
          <g key={l.hx}>
            <Merged parts={[cap(l.hx, hipY, ax, ay, 0.5)]} fill={PANTS} />
            <Merged parts={shoeParts(ax, ay + 0.15, 0.1)} fill={C.white} />
            <Line d={`M${f(ax - 0.22)} ${f(ay + 0.24)} L${f(ax + 0.22)} ${f(ay + 0.24)}`} color={C.dark} w={0.06} />
          </g>
        );
      })}
      <g transform={`translate(0 ${f(pose.bob)})`}>
        <path
          d="M-0.72 -4.45 Q-0.72 -4.62 -0.5 -4.62 L0.5 -4.62 Q0.72 -4.62 0.72 -4.45 L0.78 -2.97 Q0.78 -2.7 0.55 -2.7 L-0.55 -2.7 Q-0.78 -2.7 -0.78 -2.97 Z"
          fill={HOODIE}
          stroke={INK}
          strokeWidth={LW}
          strokeLinejoin="round"
        />
        <path d="M-0.78 -2.85 L0.78 -2.85" stroke={INK} strokeWidth={LW * 0.8} fill="none" />
        <Line d="M0 -4.4 L0 -2.85" />
        <Line d="M-0.52 -4.4 Q-0.66 -3.9 -0.68 -3.3 M0.52 -4.4 Q0.66 -3.9 0.68 -3.3" />
        <ArmDraw s={1} shoulder={[0.62, SHOULDER_Y]} arm={pose.armR} held={pose.heldR} sleeve={HOODIE} />
        <ArmDraw s={-1} shoulder={[-0.62, SHOULDER_Y]} arm={pose.armL} held={pose.heldL} sleeve={HOODIE} />
        <path
          d="M-0.52 -4.58 Q-0.48 -4.8 -0.2 -4.78 L0.2 -4.78 Q0.48 -4.8 0.52 -4.58 Q0 -4.3 -0.52 -4.58 Z"
          fill={HOOD}
          stroke={INK}
          strokeWidth={LW}
          strokeLinejoin="round"
        />
        <Line d="M-0.3 -4.52 Q0 -4.4 0.3 -4.52" />
        <Merged parts={[cap(-0.36, -4.56, -0.38, -4.28, 0.04), cap(0.36, -4.56, 0.38, -4.28, 0.04)]} fill={C.white} />
        <BackHead roll={pose.headRoll} yaw={pose.headYaw} />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------------------------
// Side view (profile facing -x).
interface SideLeg { ax: number; ay: number }

const kneeFor = (hip: readonly [number, number], ankle: readonly [number, number], len: number): [number, number] => {
  const vx = ankle[0] - hip[0];
  const vy = ankle[1] - hip[1];
  const d = Math.hypot(vx, vy);
  const reach = Math.min(d, 2 * len - 0.001);
  const h = Math.sqrt(Math.max(0, len * len - (reach / 2) * (reach / 2)));
  const nx = -vy / d;
  const ny = vx / d;
  return [hip[0] + vx / 2 + nx * h, hip[1] + vy / 2 + ny * h];
};

const SideLegDraw: React.FC<{ hip: readonly [number, number]; leg: SideLeg; pants: string; shoe: string }> = ({
  hip,
  leg,
  pants,
  shoe,
}) => {
  const knee = kneeFor(hip, [leg.ax, leg.ay], 1.23);
  return (
    <g>
      <Merged
        parts={[
          { d: `M${f(hip[0])} ${f(hip[1])} L${f(knee[0])} ${f(knee[1])} L${f(leg.ax)} ${f(leg.ay)}`, w: 0.46 },
        ]}
        fill={pants}
      />
      <Merged parts={shoeParts(leg.ax - 0.13, leg.ay + 0.15, 0.25)} fill={shoe} />
      <Line d={`M${f(leg.ax - 0.52)} ${f(leg.ay + 0.25)} L${f(leg.ax + 0.12)} ${f(leg.ay + 0.25)}`} color={C.dark} w={0.06} />
    </g>
  );
};

export const DevSide: React.FC<{ pose: DevPose }> = ({ pose }) => {
  const ph = pose.stride * 2 * Math.PI;
  const hip: [number, number] = [0.02, HIP_Y + pose.bob];
  const sin = Math.sin(ph);
  const near: SideLeg = pose.walking
    ? { ax: -0.5 * sin, ay: ANKLE_Y - gaitLift(ph) }
    : { ax: -0.1, ay: ANKLE_Y };
  const far: SideLeg = pose.walking
    ? { ax: 0.5 * sin, ay: ANKLE_Y - gaitLift(ph + Math.PI) }
    : { ax: 0.12, ay: ANKLE_Y };
  const k = pose.walking ? 14 * sin : 0;
  const armNear: DevArm = { ...pose.armR, upper: pose.armR.upper - k };
  const armFar: DevArm = { ...pose.armL, upper: pose.armL.upper + k };
  const sway = pose.walking ? 2.2 * Math.cos(ph) : 0;
  const shoulder: [number, number] = [0.02, SHOULDER_Y + 0.05];
  return (
    <g transform={`rotate(${f(pose.lean)})`}>
      <SideLegDraw hip={hip} leg={far} pants={PANTS_FAR} shoe={C.bg} />
      <SideLegDraw hip={hip} leg={near} pants={PANTS} shoe={C.white} />
      <g transform={`translate(0 ${f(pose.bob)}) rotate(${f(sway)} 0 -2.7)`}>
        <ArmDraw s={-1} shoulder={shoulder} arm={armFar} held={pose.heldL} sleeve={HOOD} />
        <path
          d="M-0.36 -4.55 Q0.05 -4.72 0.42 -4.55 Q0.56 -4.3 0.52 -3.5 L0.6 -2.95 Q0.62 -2.7 0.42 -2.7 L-0.45 -2.7 Q-0.54 -2.7 -0.54 -2.95 L-0.47 -3.5 Q-0.46 -4.3 -0.36 -4.55 Z"
          fill={HOODIE}
          stroke={INK}
          strokeWidth={LW}
          strokeLinejoin="round"
        />
        <path d="M-0.53 -2.85 L0.61 -2.85" stroke={INK} strokeWidth={LW * 0.8} fill="none" />
        <Line d="M-0.38 -3.35 Q-0.15 -3.2 0.1 -3.35" />
        <Merged parts={[cap(-0.28, -4.52, -0.3, -4.1, 0.04)]} fill={C.white} />
        <ellipse cx={0.4} cy={-4.7} rx={0.3} ry={0.21} fill={HOOD} stroke={INK} strokeWidth={LW} />
        <ArmDraw s={-1} shoulder={shoulder} arm={armNear} held={pose.heldR} sleeve={HOODIE} />
        <SideHead roll={pose.headRoll} />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------------------------
const lerpN = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpArm = (a: DevArm, b: DevArm, t: number): DevArm => ({
  upper: lerpN(a.upper, b.upper, t),
  fore: lerpN(a.fore, b.fore, t),
  hand: t >= 0.5 ? b.hand : a.hand,
});

export const lerpDevPose = (a: DevPose, b: DevPose, t: number): DevPose => ({
  stride: lerpN(a.stride, b.stride, t),
  walking: t >= 0.5 ? b.walking : a.walking,
  bob: lerpN(a.bob, b.bob, t),
  lean: lerpN(a.lean, b.lean, t),
  headRoll: lerpN(a.headRoll, b.headRoll, t),
  headYaw: lerpN(a.headYaw, b.headYaw, t),
  armL: lerpArm(a.armL, b.armL, t),
  armR: lerpArm(a.armR, b.armR, t),
  heldL: t >= 0.5 ? b.heldL : a.heldL,
  heldR: t >= 0.5 ? b.heldR : a.heldR,
});
