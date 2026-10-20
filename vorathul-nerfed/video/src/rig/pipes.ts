// The 16 pipes: fan geometry and per-pipe state, both pure functions of the frame (docs/rig.md section 2).
import { CORK_FRAMES, MISSING_FRAMES, RELIGHT_FRAMES, RETURN_DISTANCE_H, RETURN_FRAMES, RIG_STEP_FRAMES } from './constants.ts';
import { clamp, outCubic, rad, smooth } from './math.ts';
import type { PipeItem, PipeState, PipesDef, Side } from './types.ts';

export type PipeOp = 'delete' | 'dark' | 'lit' | 'relight' | 'cork' | 'uncork' | 'return' | 'fire';
export interface PipeEvent {
  /** Frame the event lands on (cork seated, pipe arrived, pipe deleted, shot fired). */
  at: number;
  wing: Side | 'both';
  pipe: number | 'all';
  op: PipeOp;
}

/** Frames before `at` that an event already shows something (the cork and the returning pipe fly in). */
const lead = (op: PipeOp): number => (op === 'cork' ? CORK_FRAMES : op === 'return' ? RETURN_FRAMES : 0);
/** A fire recoil lasts this many frames. */
export const FIRE_FRAMES = 4;
export const FIRE_RECOIL_H = 0.03;

/** Spread s in [0,1] -> pipe i's own spread with the outward cascade, then the angle in degrees from horizontal. */
export const pipeTheta = (p: PipesDef, it: PipeItem, s: number): number => {
  const si = clamp((s - (p.cascade * it.i) / 7) / (1 - p.cascade), 0, 1);
  return it.fold + (it.open - it.fold) * smooth(si);
};

export interface PipeGeom {
  /** Root end of the tube in the wing's joint space, H. */
  root: [number, number];
  dir: [number, number];
  theta: number;
  bodyLen: number;
  mouthCentre: number;
  rimTip: number;
  corkSeat: number;
  corkStart: number;
}

/** Positions along the tube axis (distance from the root end, H) of the body tip, mouth, rim, cork seat and cork start. */
export const pipeGeom = (p: PipesDef, it: PipeItem, thetaDeg: number, lengthScale: number, fly: number): PipeGeom => {
  const th = rad(thetaDeg);
  const dir: [number, number] = [Math.cos(th), Math.sin(th)];
  const wd = p.widthH;
  const bodyLen = (p.bodyLen[it.tex] as number) * lengthScale;
  const mouthLeft = bodyLen - p.mouthOverlapW * wd;
  const rimTip = mouthLeft + p.mouthLenW * wd;
  return {
    root: [p.r0 * dir[0] + fly * dir[0], p.r0 * dir[1] + fly * dir[1]],
    dir, theta: th, bodyLen,
    mouthCentre: mouthLeft + (p.mouthLenW * wd) / 2,
    rimTip,
    corkSeat: rimTip - p.corkSeatW * wd,
    corkStart: rimTip + p.corkStartH,
  };
};

const matches = (e: PipeEvent, wing: Side, i: number): boolean => (e.wing === 'both' || e.wing === wing) && (e.pipe === 'all' || e.pipe === i);

/** State of pipe i of a wing at `frame`. `tq` is the rig-quantised frame (glow ramps step at the rig cadence). */
export const pipeStateAt = (p: PipesDef, events: readonly PipeEvent[], wing: Side, i: number, frame: number, tq: number, theta: number, lengthScale: number): PipeState => {
  const st: PipeState = { body: true, mouth: true, checker: false, glow: 1, theta, lengthScale, fly: 0, cork: { show: false, travel: 0, scale: 1 } };
  // Last state-defining event whose lead-in has started; fire is a recoil overlay on top of the state.
  let cur: PipeEvent | null = null;
  let fire: PipeEvent | null = null;
  for (const e of events) {
    if (!matches(e, wing, i) || frame < e.at - lead(e.op)) continue;
    if (e.op === 'fire') { if (!fire || e.at >= fire.at) fire = e; continue; }
    if (!cur || e.at - lead(e.op) >= cur.at - lead(cur.op)) cur = e;
  }
  if (cur) {
    const n = frame - cur.at;
    switch (cur.op) {
      case 'dark': st.glow = 0; break;
      case 'uncork': st.glow = 0; break;
      case 'lit': st.glow = 1; break;
      case 'relight': st.glow = clamp((tq - cur.at) / RELIGHT_FRAMES, 0, 1); break;
      case 'delete':
        st.glow = 0;
        if (n < MISSING_FRAMES) st.checker = true;
        else { st.body = false; st.mouth = false; }
        break;
      case 'cork': {
        st.glow = 0;
        const u = clamp((frame - (cur.at - CORK_FRAMES)) / CORK_FRAMES, 0, 1);
        st.cork = { show: true, travel: outCubic(u), scale: frame === cur.at ? 1.15 : 1 };
        break;
      }
      case 'return': {
        if (n < 0) {
          st.glow = 0;
          st.fly = RETURN_DISTANCE_H * (1 - outCubic((frame - (cur.at - RETURN_FRAMES)) / RETURN_FRAMES));
        } else st.glow = clamp((tq - cur.at) / RELIGHT_FRAMES, 0, 1);
        break;
      }
      default: break;
    }
  }
  if (fire) {
    const n = frame - fire.at;
    if (n >= 0 && n < FIRE_FRAMES) st.fly -= FIRE_RECOIL_H * (1 - outCubic(n / FIRE_FRAMES));
  }
  return st;
};

/** Rig-quantised frame for glow ramps and sway: the global twos grid. */
export const quantFrame = (frame: number): number => Math.floor(frame / RIG_STEP_FRAMES) * RIG_STEP_FRAMES;
