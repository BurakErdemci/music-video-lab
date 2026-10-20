// The office side of part 4: the wall plate on the stage, the cracks on the painting, and everything the players stick to
// the wall around it (posters, sticky notes, a petition bar). All positions are world coordinates on the wall plane, so the
// same items sit right under any office camera.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { Stage, type CameraPath, type CameraPose } from '../../stage/Stage.tsx';
import { Poster, ProgressSun, StickyNote, UiFonts } from '../../ui/kit.ts';
import { CrackGrow, DuotoneFlash, gradeCues } from '../../vfx/effects.ts';
import { TIMING } from '../../timing.ts';
import { CUE, CRACK_STEPS } from './cues.ts';
import { OFFICE_Z, PALM_UV, PLATE_CY, PLATE_H, PLATE_W, canvasBox, paintingBox, project } from './lib.ts';

export const CRACK = { seed: 21, escapeAt: 16, escapeDir: 0 } as const;

const crackProps = { cues: CRACK_STEPS, seed: CRACK.seed, origin: PALM_UV, escapeAt: CRACK.escapeAt, escapeDir: CRACK.escapeDir };

/** The crack as drawn on the canvas, seen from inside: UV maps onto the canvas rectangle projected through the camera. */
export const InsideCracks = ({ frame, pose }: { frame: number; pose: CameraPose }) => {
  const box = canvasBox(pose);
  return <CrackGrow frame={frame} {...crackProps} box={box} surface="inside" width={16 * (box[2] / 1920)} id="p4-crack-in" />;
};

/** The same crack on the painting hanging on the office wall; after the last step it runs on across the plaster. */
export const OfficeCracks = ({ frame, pose }: { frame: number; pose: CameraPose }) => {
  const box = paintingBox(pose);
  return <CrackGrow frame={frame} {...crackProps} box={box} surface="all" width={16 * (box[2] / 1920)} id="p4-crack-out" />;
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
  { x: -9.6, y: 1.6, w: 3.0, rot: -4, lines: ['WE WANT', 'VORATHUL'], popAt: CUE.s84cut.frame },
  { x: 9.7, y: 2.0, w: 3.0, rot: 3, lines: ['UNNERF', 'PHASE 3'], popAt: CUE.s84poster1.frame },
  { x: -9.4, y: -3.0, w: 2.6, rot: 2, lines: ['BRING HIM', 'BACK'], popAt: CUE.s84poster2.frame },
];

const TEXTS = ['REVERT', 'UNNERF', 'PHASE 3 PLS', 'BRING BACK', 'FIX IT', '#UNNERF', 'WE WAIT', 'REVERT!!', 'PHASE III', 'PLS', '1 STAR', 'UNNERF'];
const NOTES: { x: number; y: number; rot: number; text: string; popAt: number }[] = [
  { x: -6.1, y: 5.9, rot: -5, text: TEXTS[0] as string, popAt: CUE.s86cut.frame },
  { x: 6.4, y: 5.8, rot: 4, text: TEXTS[1] as string, popAt: CUE.s86cut.frame + 6 },
  { x: -8.4, y: -0.6, rot: 3, text: TEXTS[2] as string, popAt: CUE.s86cut.frame + 12 },
  { x: -2.6, y: 6.0, rot: 2, text: TEXTS[3] as string, popAt: CUE.s86swarm.frame },
  { x: 2.4, y: 5.95, rot: -3, text: TEXTS[4] as string, popAt: CUE.s86swarm.frame + 2 },
  { x: 8.5, y: 0.2, rot: -4, text: TEXTS[5] as string, popAt: CUE.s86swarm.frame + 4 },
  { x: 8.4, y: -3.4, rot: 5, text: TEXTS[6] as string, popAt: CUE.s86swarm.frame + 6 },
  { x: -5.2, y: -5.9, rot: -2, text: TEXTS[7] as string, popAt: CUE.s86swarm.frame + 8 },
  { x: 0.4, y: -6.0, rot: 3, text: TEXTS[8] as string, popAt: CUE.s86swarm.frame + 10 },
  { x: 5.3, y: -5.8, rot: -4, text: TEXTS[9] as string, popAt: CUE.s86swarm.frame + 12 },
  { x: -8.3, y: 3.6, rot: 4, text: TEXTS[10] as string, popAt: CUE.s86swarm.frame + 14 },
  { x: 8.3, y: 4.0, rot: -3, text: TEXTS[11] as string, popAt: CUE.s86swarm.frame + 16 },
];

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
        const w = 2.1 * k;
        return <StickyNote key={i} frame={frame} slapAt={n.popAt} text={n.text} rotate={n.rot} width={w} x={x - w / 2} y={y - (w * 330) / 360 / 2} />;
      })}
    </AbsoluteFill>
  );
};
