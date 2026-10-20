// S77-S80: he stands and walks to the canvas, awareness step 3 (his hand on the inside of the canvas, seen from the office
// side), the view through the weave, and the bulge on the wall seen from the back of the room.
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { blendPose, frameAt, hold, OFF_WIDE } from '../../camera/api.ts';
import { Stage, type CameraPath } from '../../stage/Stage.tsx';
import { CanvasBulge, DuotoneFlash, gradeCues, Overlay } from '../../vfx/effects.ts';
import { CUE } from './cues.ts';
import { Cathedral, Hero } from './inside.tsx';
import { DevHead } from './People.tsx';
import { OfficeStage, WallItems } from './office.tsx';
import { CANVAS_CAM, H, PALM_UV, W, easeInOut, easeOut, paintingBox, prog, twos } from './lib.ts';

const DRAIN = 'saturate(0.55)';

/** The hero's head while seated, for the ECU on the slit. */
const SLIT_ECU = frameAt([0.15, 3.2, -15], 1.7);
const STAND_MED = frameAt([0, 3.4, -15], 9.5);

/** S77 03:07.57: back inside. ECU on the slit as it relights to half, then MED: he stands (a cut) and steps to the picture plane. */
export const S77 = ({ frame }: { frame: number }) => {
  const med = CUE.s77med.frame;
  const path: CameraPath = (f) => {
    if (f < med) return blendPose(SLIT_ECU, frameAt([0.15, 3.2, -15], 1.45), easeInOut(prog(f, CUE.s77cut.frame, med - CUE.s77cut.frame)));
    return blendPose(STAND_MED, CANVAS_CAM, easeInOut(prog(f, med, CUE.s78cut.frame - med)));
  };
  return (
    <AbsoluteFill style={{ background: '#F4ECD8' }}>
      <AbsoluteFill style={{ filter: DRAIN }}>
        <Stage camera={path}>
          <Cathedral banners={false} />
          <Hero frame={frame} />
        </Stage>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Amount of canvas push (0-1): nothing until the palm lands, the bulge swells on "built", grows on "be", holds on "loved". */
const bulgeAmount = (frame: number): number =>
  0.5 * easeOut(prog(frame, CUE.s78palm.frame, 10)) + 0.3 * easeInOut(prog(frame, CUE.s78grow.frame - 8, 10)) + 0.2 * easeOut(prog(frame, CUE.s78hold.frame - 4, 8));

const palmPx = (): [number, number] => [PALM_UV[0] * W, PALM_UV[1] * H];

/** Canvas weave: a fine linen grid, strongest where the paint stretches thin (a ring around the press point). */
const Weave = ({ frame, x, y, amount }: { frame: number; x: number; y: number; amount: number }) => {
  const f = twos(frame);
  const R = 360;
  const lines: string[] = [];
  for (let i = -R; i <= R; i += 16) {
    lines.push(`M${x + i} ${y - R}V${y + R}`, `M${x - R} ${y + i}H${x + R}`);
  }
  return (
    <Overlay>
      <defs>
        <radialGradient id="p4-weave-g" cx="50%" cy="50%" r="50%">
          <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="p4-weave-m">
          <circle cx={x} cy={y} r={R} fill="url(#p4-weave-g)" />
        </mask>
      </defs>
      <g mask="url(#p4-weave-m)" opacity={0.75 * amount} transform={`translate(${(f % 4) * 0.4} 0)`}>
        <path d={lines.join('')} stroke="#FFFFFF" strokeWidth={2.4} />
        <path d={lines.join('')} stroke="#7A6A3C" strokeWidth={1} transform="translate(1.5 1.5)" />
      </g>
    </Overlay>
  );
};

/** S78 03:11.77: office side at d0, the painting exactly fills the frame. Awareness step 3: his gauntlet meets the canvas and it bulges toward us. */
export const S78 = ({ frame }: { frame: number }) => {
  const amount = bulgeAmount(frame);
  const [x, y] = palmPx();
  return (
    <AbsoluteFill style={{ background: '#F4ECD8' }}>
      <CanvasBulge frame={frame} amount={amount} x={x} y={y} size={360} rotate={-8} seed={3} id="p4-bulge-a">
        <AbsoluteFill style={{ filter: DRAIN }}>
          <Stage camera={hold(CANVAS_CAM)}>
            <Cathedral banners={false} />
            <Hero frame={frame} />
          </Stage>
        </AbsoluteFill>
      </CanvasBulge>
      <Weave frame={frame} x={x} y={y} amount={amount} />
    </AbsoluteFill>
  );
};

const O_BLUR = gradeCues([{ at: { frame: 0 }, grade: 'O' }], 'S79 office grade');

/** The linen weave over the whole POV: thin horizontal and vertical threads. */
const FullWeave = ({ opacity }: { opacity: number }) => {
  const d: string[] = [];
  for (let i = 0; i <= W; i += 9) d.push(`M${i} 0V${H}`);
  for (let j = 0; j <= H; j += 9) d.push(`M0 ${j}H${W}`);
  return (
    <Overlay>
      <path d={d.join('')} stroke="#FFFFFF" strokeWidth={1.6} opacity={opacity} />
      <path d={d.join('')} stroke="#7A6A3C" strokeWidth={0.8} opacity={opacity * 0.7} transform="translate(1 1)" />
    </Overlay>
  );
};

/** His black gauntlet pressed against the canvas, seen from behind: a flat silhouette with the spiked cuff. */
const GauntletSilhouette = ({ x, y, size }: { x: number; y: number; size: number }) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 400 500" style={{ position: 'absolute', left: x, top: y }}>
    <path
      d="M120 500 L96 392 L60 372 L84 330 L40 250 L74 238 L110 296 L112 140 L152 134 L166 270 L186 90 L226 96 L222 262 L258 118 L296 130 L270 282 L322 190 L356 214 L304 340 L322 392 L292 500 Z"
      fill="#0A0908"
    />
    <path d="M96 392 L60 372 M292 500 L322 392 M70 410 L34 392 L48 430" stroke="#0A0908" strokeWidth={14} strokeLinecap="round" fill="none" />
    <path d="M150 380 L240 380" stroke="#9B5CE0" strokeWidth={5} opacity={0.65} />
  </svg>
);

/** S79 03:16.07: his POV from inside, locked. The office through the canvas weave, blurred; the bored developer sips and does not look. */
export const S79 = ({ frame }: { frame: number }) => (
  <AbsoluteFill style={{ background: '#E9ECEF' }}>
    <DuotoneFlash frame={frame} cues={O_BLUR} id="s79-office">
      <AbsoluteFill style={{ filter: 'blur(14px)' }}>
        <Img src={staticFile('plates/07-ofis-tablo.jpg')} style={{ position: 'absolute', left: -260, top: -170, width: 2420, height: 1613 }} />
      </AbsoluteFill>
    </DuotoneFlash>
    <FullWeave opacity={0.34} />
    <GauntletSilhouette x={1160} y={470} size={640} />
    <div style={{ position: 'absolute', inset: 0, filter: 'blur(14px)' }}>
      <DevHead frame={frame} turnAt={CUE.s79glance.frame} turnTo={0.5} x={-260 + 555 * 1.575} y={-170 + 440 * 1.575} r={62 * 1.575 * 0.62} seed={9} />
    </div>
  </AbsoluteFill>
);

/** S80 03:17.77: OFF-WIDE from the back of the room. On the wall the painting has a gauntlet-shaped bulge; the developers type on. */
export const S80 = ({ frame }: { frame: number }) => {
  const pose = OFF_WIDE;
  const box = paintingBox(pose);
  const x = box[0] + PALM_UV[0] * box[2];
  const y = box[1] + PALM_UV[1] * box[3];
  const amount = 1 - 0.65 * easeInOut(prog(frame, CUE.s80relax.frame, 10));
  return (
    <AbsoluteFill style={{ background: '#E9ECEF' }}>
      <CanvasBulge frame={frame} amount={amount} x={x} y={y} size={box[2] * 0.2} rotate={-8} seed={4} id="p4-bulge-b">
        <OfficeStage camera={hold(pose)} />
      </CanvasBulge>
      <WallItems frame={frame} pose={pose} />
    </AbsoluteFill>
  );
};

