// The office side of part 4: the wall plate on the stage, the cracks on the painting, and everything the players stick to
// the wall around it (posters, sticky notes, a petition bar). All positions are world coordinates on the wall plane, so the
// same items sit right under any office camera.
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { assetSize } from '../../cast/available.ts';
import { Asset, Final } from './cards.tsx';
import { InkCrack } from './cracks.tsx';
import { Stage, type CameraPath, type CameraPose } from '../../stage/Stage.tsx';
import { C, Poster, ProgressSun, StickyNote, UiFonts } from '../../ui/kit.ts';
import { UI_FONT } from '../../ui/theme.tsx';
import { crackGraph, crackStep, DuotoneFlash, gradeCues, Overlay } from '../../vfx/effects.ts';
import { TIMING } from '../../timing.ts';
import { CUE, CRACK_STEPS } from './cues.ts';
import { OFFICE_Z, PALM_UV, PLATE_CY, PLATE_H, PLATE_W, canvasBox, clamp01, paintingBox, paintingWorld, plateToWorld, project } from './lib.ts';
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
      <InkCrack frame={frame} {...crackProps} box={box} surface="inside" width={width} id="p4-crack-in" />
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
      <InkCrack frame={frame} {...crackProps} box={box} surface="inside" width={width} id="p4-crack-out" />
    </>
  ) : (
    <InkCrack frame={frame} {...crackProps} box={box} surface="outside" width={width} id="p4-crack-wall" />
  );
};

const O_ALWAYS = gradeCues([{ at: { frame: 0 }, grade: 'O' }], 'p4 office grade');

/** World units per pixel of a developer cut-out: his figure is 9.7 units tall, like the one in the old wall plate. */
const DEV_K = 9.7 / 1440;
const DEV_X = -3.8;
const DEV_FEET = -10.8;
const DEV_POSES = [
  { id: 'G46-bored', from: 0, to: CUE.s88cut.frame },
  { id: 'G46-sip', from: CUE.s88cut.frame, to: CUE.s88spurt.frame },
  { id: 'G46-spit', from: CUE.s88spurt.frame, to: CUE.s89a.frame },
  { id: 'G46-glance', from: CUE.s89a.frame, to: 1e9 },
] as const;

/** The bored developer standing in front of the painting: one drawn pose at a time, swapped on the event frames. */
const Developer = ({ frame, x = DEV_X }: { frame: number; x?: number }) => (
  <>
    {DEV_POSES.map((p) => {
      const size = assetSize(p.id) ?? [430, 1447];
      const h = size[1] * DEV_K;
      return <Final key={p.id} id={p.id} standIn={{ color: '#ADB5BD' }} height={h} position={[x, DEV_FEET + h / 2, OFFICE_Z + 0.5]} hidden={!(frame >= p.from && frame < p.to)} renderOrder={20} />;
    })}
  </>
);

const FRAME_PLATE: [number, number, number, number] = [308, 33, 914, 635];

/** The office wall (the empty office plate), the black frame and the painting in it, and the developer. Office grade on all of it. */
export const OfficeStage = ({ camera, frame = 0, dev = true, children }: { camera: CameraPath; frame?: number; dev?: boolean; children?: ReactNode }) => {
  const p = paintingWorld();
  const [fx0, fy0] = plateToWorld(FRAME_PLATE[0], FRAME_PLATE[1]);
  const [fx1, fy1] = plateToWorld(FRAME_PLATE[0] + FRAME_PLATE[2], FRAME_PLATE[1] + FRAME_PLATE[3]);
  return (
    <DuotoneFlash frame={0} cues={O_ALWAYS} id="p4-office">
      <AbsoluteFill>
        <Stage camera={camera}>
          <Final id="office-plate" standIn={{ src: 'plates/07-ofis-tablo.jpg' }} height={PLATE_H} position={[0, PLATE_CY, OFFICE_Z - 0.05]} />
          <Asset id="p4-frame" look={{ color: '#2B3038' }} width={fx1 - fx0} height={fy0 - fy1} position={[(fx0 + fx1) / 2, (fy0 + fy1) / 2, OFFICE_Z - 0.04]} renderOrder={1} />
          <Asset id="p4-wall-painting" look={{ src: 'plates/01-tarz-cizgi-roman.jpg' }} width={p.w} height={p.h} position={[p.cx, p.cy, OFFICE_Z - 0.03]} renderOrder={2} />
          {dev ? <Developer frame={frame} /> : null}
          {children}
        </Stage>
      </AbsoluteFill>
    </DuotoneFlash>
  );
};

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
  [-8.2, -4.3, 4], [4.1, -4.8, -2], [1.4, -4.7, 3], [6.6, -4.8, -4], [-8.0, -1.2, -3], [8.0, -3.6, 5],
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
  const [px, py] = at(pose, 3.6, -6.55);
  const pw = 6.4 * k;
  return (
    <AbsoluteFill>
      <UiFonts />
      {frame >= CUE.s84cut.frame ? (
        <div style={{ position: 'absolute', left: px - pw / 2, top: py - (pw * 470) / 1000 / 2 }}>
          <ProgressSun frame={frame} variant="office" x={0} y={0} width={pw} from={petition} to={petition} startFrame={0} durationFrames={1} label="" />
          <div style={{ position: 'absolute', left: pw * 0.5, top: -Math.max(26, pw * 0.05) * 2.4, transform: 'translateX(-50%)', whiteSpace: 'nowrap', padding: '0.25em 0.7em', borderRadius: 999, background: C.white, border: `2px solid ${C.blue}`, fontFamily: UI_FONT, fontWeight: 800, fontSize: Math.max(24, pw * 0.05), color: C.ink, letterSpacing: 1 }}>PETITION: UNNERF VORATHUL  {Math.round(petition)}%</div>
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
