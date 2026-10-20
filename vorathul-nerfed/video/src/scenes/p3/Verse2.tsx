// Scene 8, verse 2 (S54-S61): one deletion per line. Growl flashes of the second form, the wings selected and
// deleted, the padlocked helm, the drooping lasers, the cursed storm toggled off, the seven-minute cutscene and
// its 16x skip, "what went wrong".
import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { frameAt, handheld, hold, OFF_WIDE, withShake, SHAKE_PCT, type CameraPath, type CameraPose } from '../../camera/api.ts';
import { RIG } from '../../rig/model.ts';
import type { RigState, Side } from '../../rig/types.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { Cursor, Marquee, MissingTexture, Padlock, Toggle, VideoTimeline, C, type Rect } from '../../ui/kit.ts';
import { EchoTrail, ScribbleBoil, GOLD, INK, IVORY, VIOLET, VIOLET_LIGHT, seeded } from '../../vfx/effects.ts';
import { Cathedral, Sky, Wall } from './Backdrop.tsx';
import { at } from './events.ts';
import { Cloud, LightRays, MAGENTA, beamPath } from './Figures.tsx';
import { Letterbox, ShotFrame } from './Frame.tsx';
import { G } from './grades.ts';
import { easeIn, easeInOut, easeOut, easeOutBack, keyed, lerp, project, prog, twos } from './lib.ts';
import { HANDS, MONITORS, OfficeStage, plateRect, plateAt } from './Office.tsx';
import { DELETED_PIPES, KEPT_PIPES, FULL_H, SCALE_A, SCALE_C, helmAt, nerfTimeline, nodeAt, pipeMouthAt, slitAt, stateAt, Vorathul, type Place } from './nerf.tsx';
import type { PipeEvent } from '../../rig/pipes.ts';

const shakeHits = (list: [number, keyof typeof SHAKE_PCT][]) => list.map(([start, k], i) => ({ start, seed: start * 11 + i, amp: { pct: SHAKE_PCT[k] } }));

/** Look direction rotated by yaw/pitch degrees around the camera position. */
const turn = (base: CameraPose, yaw: number, pitch = 0): CameraPose => {
  const d: Vec3 = [base.target[0] - base.position[0], base.target[1] - base.position[1], base.target[2] - base.position[2]];
  const len = Math.hypot(...d);
  const y0 = Math.atan2(d[0], -d[2]) + (yaw * Math.PI) / 180;
  const p0 = Math.asin(d[1] / len) + (pitch * Math.PI) / 180;
  return { ...base, target: [base.position[0] + Math.sin(y0) * Math.cos(p0) * len, base.position[1] + Math.sin(p0) * len, base.position[2] - Math.cos(y0) * Math.cos(p0) * len] };
};

// ---------------------------------------------------------------- S54 growl flash, A2 pipe-fan blast, the wings deleted
const C54 = at('s54-cut');
const UP54 = at('s54-up');
const BLAST = at('s54-blast');
const GONE = at('s54-gone');
const EYES_ON = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [`eye${i}`, [{ at: 0, v: 0, dur: 0 }, { at: C54, v: 1, dur: 0 }, { at: UP54, v: 0, dur: 0 }]]));
const PIPES54: PipeEvent[] = [
  { at: C54, wing: 'both', pipe: 'all', op: 'lit' },
  { at: UP54, wing: 'both', pipe: 'all', op: 'dark' },
  { at: BLAST - 10, wing: 'both', pipe: 'all', op: 'relight' },
  { at: BLAST, wing: 'both', pipe: 'all', op: 'fire' },
  ...DELETED_PIPES.map((i): PipeEvent => ({ at: GONE, wing: 'both', pipe: i, op: 'delete' })),
  ...KEPT_PIPES.map((i): PipeEvent => ({ at: GONE, wing: 'both', pipe: i, op: 'dark' })),
];
const TL54 = nerfTimeline(
  [
    { at: C54, pose: 'lunge_antic', dur: 0, cut: true },
    { at: UP54, pose: { pelvis: [0, -0.04], torso: -12, head: [-10, 0.02], armR: [-15, 55, -25, 'fist'], armL: [10, 20, 0, 'open'], legs: [4, 4], wings: [null, -10], sword: 'hand_R', swordDir: 0, swordZ: 64 }, dur: 0, cut: true },
    { at: UP54 + 12, pose: 'blast_antic', dur: 12 },
    { at: BLAST, pose: 'blast_strike', dur: 14, ease: 'strike' },
    { at: GONE + 14, pose: { torso: -6, head: [-12, 0.025], armR: [20, 40, 0, 'open'], armL: [20, 40, 0, 'open'] }, dur: 12 },
  ],
  {
    phase: 'pre',
    pipes: PIPES54,
    helm: [{ at: C54, value: 'split' }, { at: UP54, value: 'closed' }],
    wingS: [{ at: 0, v: 0.2, dur: 0 }, { at: C54, v: 1, dur: 0 }, { at: UP54, v: 0.2, dur: 0 }, { at: BLAST - 2, v: 1, dur: 14 }, { at: GONE + 6, v: 0, dur: 6 }],
    ramps: { ...EYES_ON, helmSplit: [{ at: 0, v: 0, dur: 0 }, { at: C54, v: 1, dur: 0 }, { at: UP54, v: 0, dur: 0 }], wingsDeleted: [{ at: 0, v: 0, dur: 0 }, { at: GONE, v: 1, dur: 0 }] },
  },
);
const CAM54 = withShake(hold({ position: [0, 0.3, -3.5], target: [0, 2.6, -15], fov: 50 }), { hits: shakeHits([[BLAST, 'medium'], [GONE, 'small']]) });

const wingBox = (pose: CameraPose, st: RigState, place: Place, side: Side): Rect => {
  const pts = [0, 2, 4, 5, 7].map((i) => project(pose, pipeMouthAt(st, place, side, i)));
  pts.push(project(pose, nodeAt(st, place, `wing_root_${side}`)));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const pad = 34;
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad };
};

/** The violet bolts that leave the pipes on the strike; on the delete they turn checker and drop. */
const Bolts = ({ frame, pose, st0, place }: { frame: number; pose: CameraPose; st0: RigState; place: Place }) => {
  const t = frame - BLAST;
  if (t < 0) return null;
  const dead = frame >= GONE;
  const out: ReactNode[] = [];
  for (const side of ['R', 'L'] as const) {
    const root = nodeAt(st0, place, `wing_root_${side}`);
    for (const it of RIG.json.pipes.items) {
      const m = pipeMouthAt(st0, place, side, it.i);
      const d: Vec3 = [m[0] - root[0], m[1] - root[1], 0];
      const l = Math.hypot(d[0], d[1]) || 1;
      const flyT = Math.min(t, GONE - BLAST);
      const dist = 0.3 + flyT * 0.11;
      const drop = dead ? 0.012 * (frame - GONE) ** 2 : 0;
      const head: Vec3 = [m[0] + (d[0] / l) * dist, m[1] + (d[1] / l) * dist - drop, m[2]];
      const tail: Vec3 = [head[0] - (d[0] / l) * 0.5, head[1] - (d[1] / l) * 0.5 + (dead ? 0.15 : 0), head[2]];
      const a = project(pose, head);
      const b = project(pose, tail);
      if (a.y > 1200) continue;
      const key = `${side}${it.i}`;
      if (dead) {
        const s = 0.16 * a.s;
        out.push(
          <g key={key} transform={`translate(${a.x} ${a.y}) rotate(${(frame - GONE) * 25 + it.i * 40})`}>
            <rect x={-s} y={-s} width={2 * s} height={2 * s} fill={INK} />
            <rect x={-s} y={-s} width={s} height={s} fill={MAGENTA} />
            <rect x={0} y={0} width={s} height={s} fill={MAGENTA} />
          </g>,
        );
      } else {
        out.push(<path key={key} d={beamPath(b.x, b.y, a.x, a.y, 0.14 * a.s)} fill={VIOLET} />, <path key={`${key}c`} d={beamPath(b.x, b.y, a.x, a.y, 0.05 * a.s)} fill={VIOLET_LIGHT} />);
      }
    }
  }
  return <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>{out}</svg>;
};

export const S54 = ({ frame }: { frame: number }) => {
  const pose = CAM54(frame);
  const place: Place = { pos: [0, 0, -15], scale: frame < UP54 ? SCALE_A : SCALE_C };
  const st = stateAt(TL54, frame);
  const st0 = stateAt(TL54, BLAST);
  const boxR = wingBox(pose, st0, place, 'R');
  const boxL = wingBox(pose, st0, place, 'L');
  const showMarq = frame >= at('s54-marqR') && frame < GONE + 2;
  const del = at('s54-del');
  const keyIn = easeOutBack(prog(frame, del - 4, 4));
  const pressed = frame >= del && frame < del + 4;
  return (
    <ShotFrame frame={frame} cues={G.s54}>
      <Stage camera={CAM54}>
        <Cathedral />
        <Vorathul st={st} place={place} />
      </Stage>
      <Bolts frame={frame} pose={pose} st0={st0} place={place} />
      {showMarq ? (
        <AbsoluteFill>
          <Marquee frame={frame} from={{ x: boxR.x, y: boxR.y, w: 8, h: 8 }} to={boxR} startFrame={at('s54-marqR')} durationFrames={7} stroke={5} />
          {frame >= at('s54-marqL') ? <Marquee frame={frame} from={{ x: boxL.x + boxL.w, y: boxL.y, w: 8, h: 8 }} to={boxL} startFrame={at('s54-marqL')} durationFrames={5} stroke={5} /> : null}
        </AbsoluteFill>
      ) : null}
      {frame >= del - 4 && frame < GONE + 10 ? (
        <div style={{ position: 'absolute', right: 120, bottom: 120, width: 300, height: 140, transform: `scale(${keyIn * (pressed ? 0.88 : 1)})`, transformOrigin: 'center', borderRadius: 22, background: C.white, border: `4px solid ${C.dark}`, boxShadow: `0 ${pressed ? 4 : 14}px 0 ${C.dark}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'UiInter', sans-serif", fontWeight: 800, fontSize: 54, color: C.ink, opacity: 1 - prog(frame, GONE + 4, 6) }}>
          Delete
        </div>
      ) : null}
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S55 the second form, padlocked
const C55 = at('s55-cut');
const SPLIT = at('s55-split');
const CHECK = at('s55-checker');
const LOCK55 = at('s55-lock');
const TL55 = nerfTimeline([{ at: C55, pose: 'slump', dur: 0, cut: true }], {
  phase: 'deleted',
  helm: [{ at: SPLIT, value: 'split' }, { at: LOCK55, value: 'closed' }],
  ramps: {
    helmSplit: [{ at: 0, v: 0, dur: 0 }, { at: SPLIT + 2, v: 1, dur: 2 }, { at: LOCK55, v: 0, dur: 3 }],
    ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [`eye${i}`, [{ at: 0, v: 0, dur: 0 }, { at: at('s55-eyes') + i, v: 1, dur: 2 }, { at: CHECK, v: 0, dur: 0 }]])),
  },
});
const PLACE55: Place = { pos: [0, 0, -15], scale: SCALE_C };
const HELM55 = helmAt(stateAt(TL55, C55), PLACE55);
const CAM55 = withShake((f) => {
  const b = frameAt(HELM55, lerp(2.3, 1.8, easeInOut(prog(f, C55, 28))));
  return b;
}, { hits: shakeHits([[SPLIT, 'small'], [LOCK55, 'medium']]) });

export const S55 = ({ frame }: { frame: number }) => {
  const pose = CAM55(frame);
  const st = stateAt(TL55, frame);
  const h = project(pose, helmAt(st, PLACE55));
  const w = 0.3 * FULL_H * SCALE_C * h.s;
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM55}>
        <Cathedral />
        <Vorathul st={st} place={PLACE55} />
      </Stage>
      {frame >= CHECK && frame < LOCK55 ? (
        <MissingTexture x={h.x - w * 0.36} y={h.y - w * 0.4} width={w * 0.72} height={w * 0.8} viewBox="0 0 100 110" d="M50 4 Q92 10 90 58 Q86 100 50 106 Q14 100 10 58 Q8 10 50 4 Z" cell={12} />
      ) : null}
      <Padlock frame={frame} appearAt={CHECK + 1} clampAt={LOCK55} x={h.x - w * 0.22} y={h.y + w * 0.05} width={w * 0.44} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S56 laser eyes, disabled
const C56 = at('s56-cut');
const FIRE = at('s56-fire');
const DASH = at('s56-dashed');
const SAD = at('s56-sad');
const TL56 = nerfTimeline([{ at: C56, pose: { head: [4, 0], torso: 3 }, dur: 0, cut: true }], {
  phase: 'deleted',
  slit: [{ at: 0, value: 'sad' }, { at: C56, value: 'lit' }, { at: SAD, value: 'sad' }],
  slitOpacity: [{ at: 0, v: 0.4, dur: 0 }, { at: C56, v: 1, dur: 0 }, { at: SAD, v: 0.15, dur: 0 }, { at: SAD + 2, v: 0.55, dur: 0 }, { at: SAD + 4, v: 0.2, dur: 0 }, { at: SAD + 6, v: 0.4, dur: 0 }],
});
const PLACE56: Place = { pos: [0, 0, -15], scale: SCALE_C };
const SLIT56 = slitAt(stateAt(TL56, C56), PLACE56);
const ECU56 = frameAt(SLIT56, 1.25);
const WHIP = DASH - 15;
const CAM56: CameraPath = (f) => turn(ECU56, keyed(f, [[WHIP, 0], [WHIP + 6, 36], [SAD - 8, 36], [SAD - 2, 0]], easeInOut), keyed(f, [[WHIP, 0], [WHIP + 6, 12], [SAD - 8, 12], [SAD - 2, 0]]));
/** Beam end on the gallery wall: sweeps across the right gallery, then droops and falls once disabled. */
const beamEnd = (f: number, k: number): Vec3 => {
  const s = easeInOut(prog(f, FIRE, DASH - FIRE));
  return [lerp(14, 40, s) + k * 3, lerp(10, 22, s) - k * 4, -50];
};

const Lasers = ({ frame }: { frame: number }) => {
  if (frame < FIRE) return null;
  const pose = CAM56(frame);
  const disabled = frame >= DASH;
  const fall = disabled ? easeIn(prog(frame, DASH, 14)) : 0;
  const items = [-1, 1].map((k) => {
    const a = project(pose, [SLIT56[0] + k * 0.12, SLIT56[1], SLIT56[2] + 0.1]);
    const e0 = beamEnd(Math.min(frame, DASH), k);
    const e: Vec3 = [lerp(e0[0], SLIT56[0] + 6 + k, fall), lerp(e0[1], SLIT56[1] - 3, fall), lerp(e0[2], SLIT56[2], fall)];
    const b = project(pose, e);
    return { a, b, k };
  });
  if (!disabled) {
    return (
      <EchoTrail frame={frame} variant="smear" copies={2} delay={2} offset={[0, 0]} colors={[VIOLET, INK]} angle={0} length={120} id="p3-laser" render={(f) => {
        const p = CAM56(f);
        return (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            {[-1, 1].map((k) => {
              const a = project(p, [SLIT56[0] + k * 0.12, SLIT56[1], SLIT56[2] + 0.1]);
              const b = project(p, beamEnd(f, k));
              return (
                <g key={k}>
                  <path d={beamPath(a.x, a.y, b.x, b.y, 60)} fill={VIOLET} />
                  <path d={beamPath(a.x, a.y, b.x, b.y, 20)} fill={VIOLET_LIGHT} />
                </g>
              );
            })}
          </svg>
        );
      }} />
    );
  }
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {items.map(({ a, b, k }) => {
        const sag = 60 + 420 * easeOut(prog(frame, DASH, 10));
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 + sag;
        return <path key={k} d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`} stroke="#ADB5BD" strokeWidth={14} strokeDasharray="34 22" fill="none" strokeLinecap="round" />;
      })}
    </svg>
  );
};

/** The scorch the beams cut across the gallery (painted ink with a violet core). */
const Scorch = ({ frame, pose }: { frame: number; pose: CameraPose }) => {
  if (frame < FIRE + 2) return null;
  const end = Math.min(frame, DASH);
  const pts: string[][] = [[], []];
  for (let f = FIRE; f <= end; f += 2) [-1, 1].forEach((k, j) => {
    const p = project(pose, beamEnd(f, k));
    pts[j]!.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  });
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {pts.map((p, j) => (p.length > 1 ? <g key={j}><path d={`M${p.join('L')}`} stroke={INK} strokeWidth={26} fill="none" strokeLinecap="round" /><path d={`M${p.join('L')}`} stroke={VIOLET} strokeWidth={9} fill="none" /></g> : null))}
    </svg>
  );
};

export const S56 = ({ frame }: { frame: number }) => {
  const pose = CAM56(frame);
  const st = stateAt(TL56, frame);
  return (
    <ShotFrame frame={frame} cues={G.s56}>
      <Stage camera={CAM56}>
        <Cathedral />
        <Vorathul st={st} place={PLACE56} />
      </Stage>
      <Scorch frame={frame} pose={pose} />
      <Lasers frame={frame} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S57 the cursed storm, toggled off
const C57 = at('s57-cut');
const BOLT = at('s57-bolt');
const TOG = at('s57-toggle');
const GONE57 = at('s57-gone');
const WIDE57: CameraPose = { position: [0, 2, 30], target: [0, 6, -15], fov: 40 };
const CAM57: CameraPath = handheld((f) => turn(WIDE57, 0, keyed(f, [[C57, 30], [C57 + 22, 40]], easeOut)), { amp: 0.06, seed: 57 });
const STORM = [...Array(9).keys()].map((i) => ({ x: 120 + i * 215 + ((i * 53) % 60), y: 120 + ((i * 97) % 300), w: 520 + ((i * 71) % 200) }));

const boltPath = (seed: number, x0: number, y0: number, x1: number, y1: number): string => {
  const r = seeded(seed);
  const n = 7;
  const pts = Array.from({ length: n + 1 }, (_, i) => [lerp(x0, x1, i / n) + (i && i < n ? r.range(-60, 60) : 0), lerp(y0, y1, i / n)]);
  return `M${pts.map((p) => `${p[0]!.toFixed(0)} ${p[1]!.toFixed(0)}`).join('L')}`;
};

export const S57 = ({ frame }: { frame: number }) => {
  const storm = frame < GONE57;
  const frozen = frame >= TOG;
  const boil = frozen ? TOG : twos(frame);
  const bolts = frame >= BOLT && storm ? [[300, 260, 520, 1080], [1300, 300, 1100, 1080], [1650, 200, 1820, 900]].slice(0, frame >= BOLT + 8 ? 3 : 2) : [];
  const clouds = easeOut(prog(frame, GONE57, 10));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM57}>
        <Sky rect={[-260, -40, 260, 420]} />
        <Wall />
      </Stage>
      {storm ? (
        <>
          <AbsoluteFill style={{ background: INK, opacity: 0.72 }} />
          {STORM.map((c, i) => (
            <Cloud key={i} x={c.x + (frozen ? 0 : Math.sin(boil * 0.4 + i) * 10)} y={c.y + (frozen ? 0 : Math.cos(boil * 0.5 + i) * 8)} w={c.w} seed={570 + i} storm={1} />
          ))}
          {frame >= at('s57-boil') ? <ScribbleBoil frame={frozen ? TOG - at('s57-boil') : frame - at('s57-boil')} duration={200} seed={57} x={960} y={260} rx={760} ry={180} color={VIOLET} width={9} loops={3} /> : null}
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <pattern id="p3-bolt-check" width={24} height={24} patternUnits="userSpaceOnUse">
                <rect width={24} height={24} fill={INK} />
                <rect width={12} height={12} fill={MAGENTA} />
                <rect x={12} y={12} width={12} height={12} fill={MAGENTA} />
              </pattern>
            </defs>
            {bolts.map((b, i) => (
              <g key={i}>
                <path d={boltPath(boil * 10 + i, b[0]!, b[1]!, b[2]!, b[3]!)} stroke={frozen ? 'url(#p3-bolt-check)' : VIOLET} strokeWidth={frozen ? 28 : 18} fill="none" strokeLinejoin="miter" />
                {!frozen ? <path d={boltPath(boil * 10 + i, b[0]!, b[1]!, b[2]!, b[3]!)} stroke={VIOLET_LIGHT} strokeWidth={6} fill="none" /> : null}
              </g>
            ))}
          </svg>
          {frame >= at('s57-cursor') ? (
            <>
              <Toggle frame={frame} flipAt={TOG} x={1140} y={600} width={560} opacity={easeOut(prog(frame, at('s57-cursor'), 5))} />
              <Cursor frame={frame} size={2.6} path={[{ f: at('s57-cursor'), x: 2000, y: -60 }, { f: TOG - 2, x: 1265, y: 660 }, { f: TOG + 10, x: 1290, y: 680 }]} clicks={[TOG]} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Cloud x={lerp(-300, 380, clouds)} y={220} w={560} seed={581} />
          <Cloud x={lerp(2250, 1500, clouds)} y={160} w={640} seed={582} />
          <Cloud x={lerp(960, 960, clouds)} y={lerp(-200, 120, clouds)} w={480} seed={583} />
        </>
      )}
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S58 his cutscene, seven minutes long
const C58 = at('s58-cut');
const TL58 = nerfTimeline(
  [
    { at: C58, pose: 'conduct_wide', dur: 0, cut: true },
    { at: at('s58-raise'), pose: 'raise_sword', dur: 0, cut: true },
    { at: at('s58-conduct'), pose: 'conduct_wide', dur: 0, cut: true },
  ],
  { phase: 'deleted', slit: [{ at: 0, value: 'lit' }], slitOpacity: 0.85 },
);
const MED58 = frameAt([0, 2.5, -15], 7.4);
const CAM58 = handheld((f) => {
  const k = easeInOut(prog(f, C58, at('s59-cut') - C58));
  const p = MED58.position;
  return { ...MED58, position: [p[0], p[1], lerp(p[2], p[2] - 1.6, k)] };
}, { amp: 0.02, seed: 58 });
const ANTON = "'UiAnton', 'Anton', Impact, sans-serif";

const Caption = ({ text, show, y = 990, size = 46 }: { text: string; show: number; y?: number; size?: number }) =>
  show > 0 ? (
    <div style={{ position: 'absolute', left: 0, width: 1920, top: y, textAlign: 'center', fontFamily: ANTON, fontSize: size, color: GOLD, WebkitTextStroke: `2px ${INK}`, letterSpacing: 6, opacity: show }}>{text}</div>
  ) : null;

export const S58 = ({ frame }: { frame: number }) => {
  const pose = CAM58(frame);
  const st = stateAt(TL58, frame);
  const place: Place = { pos: [0.3 - 0.01 * (frame - C58), 0, -15], scale: SCALE_C };
  const rays = project(pose, [0, 3.4, -16]);
  const lb = easeOutBack(prog(frame, C58, 4), 2.4);
  const title = Math.min(easeOut(prog(frame, C58 + 3, 8)), 1 - prog(frame, at('s58-stretch') + 14, 8));
  const stretch = easeInOut(prog(frame, at('s58-stretch'), 22));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM58}>
        <Cathedral />
        <Vorathul st={st} place={place} />
      </Stage>
      <LightRays x={rays.x} y={rays.y} frame={frame} opacity={0.55} n={18} />
      <Letterbox open={lb} />
      <Caption text={'THE LAMENT OF VORATHUL · I'} show={title} y={340} size={92} />
      <Caption text={'ACT I · THE RISING'} show={frame >= at('s58-raise') && frame < at('s58-conduct') ? 1 : 0} y={150} size={40} />
      <Caption text={'ACT II · THE WAITING'} show={frame >= at('s58-conduct') ? 1 : 0} y={150} size={40} />
      {frame >= at('s58-timeline') ? (
        <div style={{ position: 'absolute', left: 110, top: 968, opacity: easeOut(prog(frame, at('s58-timeline'), 5)) }}>
          {/* Seven minutes is long: the whole player stretches until its end runs off the frame. */}
          <div style={{ transform: `scaleX(${lerp(1, 2.9, stretch)})`, transformOrigin: '0 50%' }}>
            <VideoTimeline frame={frame} width={1000} progressTo={0.002} startFrame={at('s58-timeline')} durationFrames={60} />
          </div>
        </div>
      ) : null}
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S59 the office: every monitor plays the cutscene
const C59 = at('s59-cut');
const RINGS = at('s59-rings');
const HOLD = Math.round((at('s59-60') - RINGS) / 0.6);
const CAM59 = handheld(hold(OFF_WIDE), { amp: 0.03, seed: 59 });

/** The cutscene as a small office video player: letterboxed frame of the painting with a player bar. */
const MiniCutscene = ({ frame, x, y, w, h, holdAt }: { frame: number; x: number; y: number; w: number; h: number; holdAt?: number }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', background: C.black }}>
    <Img src={staticFile('plates/05-nerf-hali.jpg')} style={{ position: 'absolute', left: 0, top: h * 0.12, width: w, height: h * 0.62, objectFit: 'cover' }} />
    <div style={{ position: 'absolute', left: w * 0.03, top: h * 0.77 }}>
      <VideoTimeline frame={frame} width={w * 0.94} progressFrom={0.05} progressTo={0.07} startFrame={C59 - 30} durationFrames={80} holdAt={holdAt} holdFrames={HOLD} />
    </div>
  </div>
);

const KeyCap = ({ x, y, w, label, pressed }: { x: number; y: number; w: number; label: string; pressed: boolean }) => (
  <div style={{ position: 'absolute', left: x - w / 2, top: y - w / 2 + (pressed ? w * 0.08 : 0), width: w, height: w, borderRadius: w * 0.18, background: C.white, border: `3px solid ${C.ink}`, boxShadow: `0 ${pressed ? 2 : w * 0.12}px 0 ${C.slate}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'UiInter', sans-serif", fontWeight: 800, fontSize: w * 0.5, color: C.ink }}>
    {label}
  </div>
);

export const S59 = ({ frame }: { frame: number }) => {
  const pose = CAM59(frame);
  return (
    <ShotFrame frame={frame} bg={C.bg}>
      <Stage camera={CAM59}>
        <OfficeStage />
      </Stage>
      {MONITORS.map((m, i) => {
        const { a, b } = plateRect(pose, ...m);
        return <MiniCutscene key={i} frame={frame} x={a.x} y={a.y} w={b.x - a.x} h={b.y - a.y} holdAt={RINGS} />;
      })}
      {/* The painting itself is a monitor today: the same player bar along its bottom edge. */}
      {(() => {
        const { a, b } = plateRect(pose, 0.24, 0.55, 0.755, 0.61);
        return (
          <div style={{ position: 'absolute', left: a.x, top: a.y }}>
            <VideoTimeline frame={frame} width={b.x - a.x} progressFrom={0.05} progressTo={0.07} startFrame={C59 - 30} durationFrames={80} holdAt={RINGS} holdFrames={HOLD} />
          </div>
        );
      })()}
      {HANDS.map((h, i) => {
        const p = project(pose, plateAt(h[0], h[1]));
        return <KeyCap key={i} x={p.x} y={p.y - 30} w={78} label="E" pressed={frame >= RINGS + i} />;
      })}
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S60 16x fast-forward
const C60 = at('s60-cut');
const END60 = at('s60-end');
const POSES60 = ['conduct_wide', 'raise_sword', 'strike_down', 'slump', 'burst', 'summon_strike', 'sweep_follow', 'clutch_throat'];
const JUMP60 = [-1.4, 1.1, 0.2, -0.7, 1.5, -0.2, 0.8, -1.1];
const CUTS60 = [...Array(Math.floor((END60 - C60) / 2) + 1).keys()].map((k) => C60 + 2 * k);
const TL60 = nerfTimeline(CUTS60.map((f, k) => ({ at: f, pose: POSES60[k % POSES60.length]!, dur: 0, cut: true })), { phase: 'deleted', slit: [{ at: 0, value: 'lit' }], slitOpacity: 0.85 });
const CAM60 = hold(MED58);
const FOUR = at('s60-4min');

export const S60 = ({ frame }: { frame: number }) => {
  const f = Math.min(frame, END60);
  const k = Math.floor((f - C60) / 2);
  const st = stateAt(TL60, f);
  const place: Place = { pos: [JUMP60[k % JUMP60.length]!, 0, -15], scale: SCALE_C };
  const pose = CAM60(frame);
  const rays = project(pose, [0, 3.4, -16]);
  const done = frame >= END60;
  const seg = frame < FOUR ? { from: 0.07, to: 240 / 420, s: C60, d: FOUR - C60 } : { from: 240 / 420, to: 1, s: FOUR, d: END60 - FOUR };
  const vhs = seeded(`vhs:${twos(f)}`);
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM60}>
        <Cathedral />
        <Vorathul st={st} place={place} />
      </Stage>
      <LightRays x={rays.x} y={rays.y} frame={f * 16} opacity={0.5} n={18} />
      {!done ? (
        <>
          <ScribbleBoil frame={f - C60} duration={200} seed={60} x={960} y={540} rx={420} ry={330} color={INK} width={8} loops={2} ticks={10} />
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            {[0, 1, 2].map((i) => <rect key={i} x={0} y={vhs.range(150, 930)} width={1920} height={vhs.range(4, 14)} fill={C.white} opacity={0.55} />)}
          </svg>
        </>
      ) : null}
      <Letterbox />
      <div style={{ position: 'absolute', left: 110, top: 968 }}>
        <VideoTimeline frame={f} width={1000} progressFrom={seg.from} progressTo={seg.to} startFrame={seg.s} durationFrames={seg.d} ffAt={C60} ffLabel={'×16'} />
      </div>
      {done ? (
        <div style={{ position: 'absolute', left: 1180, top: 978, height: 64, padding: '0 30px', borderRadius: 32, background: C.white, color: C.ink, display: 'flex', alignItems: 'center', fontFamily: "'UiPlexMono', monospace", fontSize: 40, transform: `scale(${easeOutBack(prog(frame, END60, 4))})` }}>
          END
        </div>
      ) : null}
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S61 what went wrong
const C61 = at('s61-cut');
const SINK = at('s61-sink');
const TL61 = nerfTimeline(
  [
    { at: C61, pose: { head: [0, 0.01], torso: 0 }, dur: 0, cut: true },
    { at: at('s61-tilt'), pose: { head: [10, 0.01] }, dur: 10 },
    { at: SINK, pose: { head: [-8, 0.03], torso: -8, pelvis: [0, -0.04] }, dur: 14 },
  ],
  {
    phase: 'deleted',
    slitOpacity: [{ at: 0, v: 0.5, dur: 0 }, { at: at('s61-flicker'), v: 0.1, dur: 0 }, { at: at('s61-flicker') + 2, v: 0.5, dur: 0 }, { at: at('s61-dim'), v: 0.18, dur: 6 }, { at: at('s61-out'), v: 0, dur: 0 }],
  },
);
const PLACE61: Place = { pos: [0, 0, -15], scale: SCALE_C };
const HELM61 = helmAt(stateAt(TL61, C61), PLACE61);
const CAM61: CameraPath = handheld((f) => {
  const s = easeInOut(prog(f, SINK - 4, 18));
  return frameAt([HELM61[0], HELM61[1] - 0.3 * s, HELM61[2]], lerp(2.1, 2.5, s));
}, { amp: 0.01, seed: 61 });

export const S61 = ({ frame }: { frame: number }) => {
  const pose = CAM61(frame);
  const st = stateAt(TL61, frame);
  const h = project(pose, helmAt(st, PLACE61));
  const drop = prog(frame, at('s61-tilt') + 6, 40);
  const w = 0.3 * FULL_H * SCALE_C * h.s;
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM61}>
        <Cathedral />
        <Vorathul st={st} place={PLACE61} />
      </Stage>
      {drop > 0 && drop < 1 ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <path d="M0 -40 Q26 0 22 18 Q18 40 0 40 Q-18 40 -22 18 Q-26 0 0 -40 Z" fill={IVORY} stroke={INK} strokeWidth={6} transform={`translate(${h.x + w * 0.42} ${h.y - w * 0.25 + easeIn(drop) * w * 0.9}) scale(${1 + drop * 0.2})`} />
        </svg>
      ) : null}
      <Letterbox open={1 - easeIn(prog(frame, C61, 8))} />
    </ShotFrame>
  );
};

