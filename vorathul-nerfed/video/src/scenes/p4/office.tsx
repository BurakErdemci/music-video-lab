// The office side of part 4: the wall plate on the stage, the cracks on the painting, and everything the players stick to
// the wall around it (posters, sticky notes, a petition bar). All positions are world coordinates on the wall plane, so the
// same items sit right under any office camera.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { Stage, type CameraPath, type CameraPose } from '../../stage/Stage.tsx';
import { Poster, ProgressSun, StickyNote, UiFonts } from '../../ui/kit.ts';
import { CrackGrow, crackGraph, crackStep, DuotoneFlash, gradeCues, Overlay } from '../../vfx/effects.ts';
import { TIMING } from '../../timing.ts';
import { CUE, CRACK_STEPS } from './cues.ts';
import { OFFICE_Z, PALM_UV, PLATE_CY, PLATE_H, PLATE_W, canvasBox, clamp01, paintingBox, project } from './lib.ts';
import type { Box } from './lib.ts';

export const CRACK = { seed: 21, escapeAt: 16, escapeDir: 0 } as const;

const crackProps = { cues: CRACK_STEPS, seed: CRACK.seed, origin: PALM_UV, escapeAt: CRACK.escapeAt, escapeDir: CRACK.escapeDir };

/**
 * The newest crack step lights up for ten frames: light from the other side leaking through the fresh break (cool office white
 * inside the painting, warm painted gold on the office wall), so every downbeat reads as one more step.
 */
const CrackGlow = ({ frame, box, color, width }: { frame: number; box: Box; color: string; width: number }) => {
  const { step } = crackStep(frame, CRACK_STEPS);
  if (!step) return null;
  const age = frame - (CRACK_STEPS[step - 1] as number);
  const a = clamp01(1 - age / 10);
  if (a <= 0) return null;
  const px = ([u, v]: [number, number]): [number, number] => [box[0] + u * box[2], box[1] + v * box[3]];
  const segs = crackGraph(CRACK.seed, CRACK_STEPS.length, crackOptions).filter((s) => s.step === step);
  return (
    <Overlay>
      {segs.map((s, i) => {
        const p = px(s.a);
        const q = px(s.b);
        return (
          <g key={i} strokeLinecap="round">
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={color} strokeWidth={width * 3.4 * (s.depth ? 0.6 : 1)} opacity={0.35 * a} />
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#FFFFFF" strokeWidth={width * 1.5 * (s.depth ? 0.6 : 1)} opacity={0.9 * a} />
          </g>
        );
      })}
    </Overlay>
  );
};

const crackOptions = { origin: PALM_UV, escapeAt: CRACK.escapeAt, escapeDir: CRACK.escapeDir };

/** The crack as drawn on the canvas, seen from inside: UV maps onto the canvas rectangle projected through the camera. */
export const InsideCracks = ({ frame, pose }: { frame: number; pose: CameraPose }) => {
  const box = canvasBox(pose);
  const width = 17 * (box[2] / 1920);
  return (
    <>
      <CrackGlow frame={frame} box={box} color="#BFD8FF" width={width} />
      <CrackGrow frame={frame} {...crackProps} box={box} surface="inside" width={width} id="p4-crack-in" />
    </>
  );
};

/** The same crack on the painting hanging on the office wall; `layer` 'painting' sits under the wall items, 'wall' (the part that
 *  has run out of the painting onto the plaster) over them. */
export const OfficeCracks = ({ frame, pose, layer }: { frame: number; pose: CameraPose; layer: 'painting' | 'wall' }) => {
  const box = paintingBox(pose);
  const width = 17 * (box[2] / 1920);
  return layer === 'painting' ? (
    <>
      <CrackGlow frame={frame} box={box} color="#E2B33C" width={width} />
      <CrackGrow frame={frame} {...crackProps} box={box} surface="inside" width={width} id="p4-crack-out" />
    </>
  ) : (
    <CrackGrow frame={frame} {...crackProps} box={box} surface="outside" width={width} id="p4-crack-wall" />
  );
};

const O_ALWAYS = gradeCues([{ at: { frame: 0 }, grade: 'O' }], 'p4 office grade');

/** The office wall plate (G27 + desks stand-in) in the canonical office grade. */
export const OfficeStage = ({ camera, children }: { camera: CameraPath; children?: ReactNode }) => (
  <DuotoneFlash frame={0} cues={O_ALWAYS} id="p4-office">
    <AbsoluteFill>
      <Stage camera={camera}>
        <AssetCard id="G27" standIn={{ src: 'plates/07-ofis-tablo.jpg' }} width={PLATE_W} height={PLATE_H} position={[0, PLATE_CY, OFFICE_Z - 0.05]} />
        {children}
      </Stage>
    </AbsoluteFill>
  </DuotoneFlash>
);

/** Pixels per world unit on the wall plane for this camera. */
const pxPerUnit = (pose: CameraPose): number => {
  const a = project(pose, [0, 0, OFFICE_Z]) as [number, number];
  const b = project(pose, [1, 0, OFFICE_Z]) as [number, number];
  return b[0] - a[0] || 1;
};
const at = (pose: CameraPose, x: number, y: number): [number, number] => project(pose, [x, y, OFFICE_Z]) as [number, number];

interface PosterSpec { x: number; y: number; w: number; rot: number; lines: string[]; popAt: number }
const POSTERS: PosterSpec[] = [
  { x: -7.6, y: 1.9, w: 2.3, rot: -4, lines: ['WE WANT', 'VORATHUL'], popAt: CUE.s84cut.frame },
  { x: 7.6, y: -2.7, w: 2.3, rot: 3, lines: ['UNNERF', 'PHASE 3'], popAt: CUE.s84poster1.frame },
  { x: -7.6, y: -2.6, w: 2.2, rot: 2, lines: ['BRING HIM', 'BACK'], popAt: CUE.s84poster2.frame },
];

const NOTE_AT = [
  [-5.2, 4.7, -5], [5.2, 4.8, 4], [-7.9, 4.5, 3], [-1.8, 4.8, 2], [1.8, 4.7, -3], [7.8, 4.3, -4],
  [-4.9, -4.7, 4], [-1.5, -4.8, -2], [1.9, -4.7, 3], [5.3, -4.8, -4], [-6.1, -3.7, -3], [6.2, -3.9, 5],
] as const;
const TEXTS = ['REVERT', 'UNNERF', 'PHASE 3 PLS', 'BRING BACK', 'FIX IT', '#UNNERF', 'WE WAIT', 'REVERT!!', 'PHASE III', 'PLS', '1 STAR', 'UNNERF'];
/** The first three notes land on the cut, the rest swarm in two frames apart from the swarm beat. */
const NOTES = NOTE_AT.map(([x, y, rot], i) => ({ x, y, rot, text: TEXTS[i] as string, popAt: i < 3 ? CUE.s86cut.frame + i * 6 : CUE.s86swarm.frame + (i - 3) * 2 }));

/** Beats elapsed since the petition cue: the bar climbs one step per beat. */
const stepsSince = (frame: number, from: number): number => {
  let n = 0;
  for (const t of TIMING.beats) if (Math.round(t * 30) >= from && Math.round(t * 30) <= frame) n++;
  return n;
};

/** Posters, notes and the petition bar the players have put up by `frame`, placed for the office camera `pose`. */
export const WallItems = ({ frame, pose }: { frame: number; pose: CameraPose }) => {
  const k = pxPerUnit(pose);
  const petition = Math.min(100, 6 + stepsSince(frame, CUE.s84petition.frame) * 3.3);
  const [px, py] = at(pose, 0, -6.55);
  const pw = 7.2 * k;
  return (
    <AbsoluteFill>
      <UiFonts />
      {frame >= CUE.s84cut.frame ? (
        <div style={{ position: 'absolute', left: px - pw / 2, top: py - (pw * 470) / 1000 / 2 }}>
          <ProgressSun frame={frame} variant="office" x={0} y={0} width={pw} from={petition} to={petition} startFrame={0} durationFrames={1} label="Petition: UNNERF VORATHUL" />
        </div>
      ) : null}
      {POSTERS.map((p, i) => {
        const [x, y] = at(pose, p.x, p.y);
        const w = p.w * k;
        return <Poster key={i} frame={frame} popAt={p.popAt} lines={p.lines} rotate={p.rot} width={w} x={x - w / 2} y={y - (w * 600) / 440 / 2} />;
      })}
      {NOTES.map((n, i) => {
        const [x, y] = at(pose, n.x, n.y);
        const w = 1.9 * k;
        return <StickyNote key={i} frame={frame} slapAt={n.popAt} text={n.text} rotate={n.rot} width={w} x={x - w / 2} y={y - (w * 330) / 360 / 2} />;
      })}
    </AbsoluteFill>
  );
};
