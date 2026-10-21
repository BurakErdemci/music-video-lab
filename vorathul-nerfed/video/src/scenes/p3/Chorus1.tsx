// Scene 7, chorus 1 (S46-S53): the nerfed status, the stone tablets, the shrink, the collage of his old glory,
// the level-12 kid and the shoe.
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { frameAt, hold, withShake, handheld, SHAKE_PCT, type CameraPath, type CameraPose } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { DamageNumber, Nameplate, RubberStamp, StickyNote, C } from '../../ui/kit.ts';
import { CanvasBulge, DuotoneFlash, ImpactBurst, InkSplash, Shards, SpeedLines, StickerCutout, GOLD, INK, IVORY, VIOLET, type DuotoneCue } from '../../vfx/effects.ts';
import { Throne } from './Throne.tsx';
import { at } from './events.ts';
import { BootSole, ComicHpBar, DustPuff, Flakes, Kid, KoStars, LightRays, Tablet, type KidPose } from './Figures.tsx';
import { Letterbox, ShotFrame } from './Frame.tsx';
import { G } from './grades.ts';
import { easeIn, easeInOut, easeOut, easeOutBack, keyed, lerp, project, prog } from './lib.ts';
import { helmAt, chestAt, nerfTimeline, SCALE_A, SCALE_B, SCALE_C, stateAt, swordTipAt, Vorathul, withHead, FULL_H, type Place } from './nerf.tsx';

const shakeHits = (list: [number, keyof typeof SHAKE_PCT][]) => list.map(([start, k], i) => ({ start, seed: start * 7 + i, amp: { pct: SHAKE_PCT[k] } }));

/** The S41 sticky note on his helm ("Phase 3", struck through), riding the helm. */
const HelmNote = ({ frame, st, place, pose, rot = -9 }: { frame: number; st: ReturnType<typeof stateAt>; place: Place; pose: CameraPose; rot?: number }) => {
  const p = project(pose, helmAt(st, place));
  const w = 0.42 * FULL_H * place.scale * p.s;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      <StickyNote frame={frame} x={p.x - w / 2} y={p.y - w * 0.62} width={w} text="Phase 3" slapAt={-100} rotate={rot} />
      <svg style={{ position: 'absolute', left: p.x - w * 0.38, top: p.y - w * 0.36, width: w * 0.62, height: w * 0.2, overflow: 'visible', transform: `rotate(${rot}deg)` }} viewBox="0 0 100 30">
        <path d="M2 18 Q50 8 98 14" stroke={C.blue} strokeWidth={5} fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- S46 nerfed wide
const TL46 = nerfTimeline(
  [
    { at: at('s46-cut'), pose: 'slump', dur: 0, cut: true },
    { at: at('s46-sigh'), pose: { torso: -6, head: [-10, 0.03], pelvis: [0, -0.04] }, dur: 14 },
  ],
  { phase: 'pre' },
);
const CAM46 = withShake(handheld(hold({ position: [0, 3.2, 26], target: [0, 5.5, -15], fov: 40 }), { amp: 0.04, seed: 46 }), { hits: shakeHits([[at('s46-stamp'), 'small']]) });

export const S46 = ({ frame }: { frame: number }) => {
  const pose = CAM46(frame);
  // Left of the black carpet, on the cream tiles, so the black figure reads against the floor.
  const place: Place = { pos: [-8 + 0.012 * (frame - at('s46-cut')), 0, -15], scale: SCALE_A };
  const st = stateAt(TL46, frame);
  const helm = project(pose, helmAt(st, place));
  // One last gold flake settles on the crown on beat 310.
  const tf = prog(frame, at('s46-flakes') - 18, 18);
  const fy = lerp(-60, helm.y - 34, easeOut(tf));
  const bleed = easeOut(prog(frame, at('s46-bleed'), 14));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM46}>
        <Throne frame={frame} />
        <Vorathul st={st} place={place} />
      </Stage>
      <Flakes frame={frame} start={at('s46-cut') - 40} seed={46} fall={1.4} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <rect x={-9} y={-6} width={18} height={12} fill={GOLD} stroke={INK} strokeWidth={2} transform={`translate(${helm.x + 6 + Math.sin(tf * 9) * 30 * (1 - tf)} ${fy}) rotate(${tf < 1 ? frame * 9 : -12})`} />
      </svg>
      <HelmNote frame={frame} st={st} place={place} pose={pose} />
      <DustPuff x={helm.x} y={helm.y + 10} size={50} t={prog(frame, at('s46-sigh'), 16)} seed={461} />
      <ComicHpBar value={60} />
      {/* The ink of the stamp creeps into the paper grain. */}
      {frame >= at('s46-bleed') ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
          {[...Array(14).keys()].map((i) => (
            <circle key={i} cx={430 + ((i * 137) % 1060)} cy={330 + ((i * 89) % 420) - ((i * 137) % 1060) * 0.25} r={(6 + (i % 4) * 5) * bleed} fill={C.blue} />
          ))}
        </svg>
      ) : null}
      <RubberStamp frame={frame} at={at('s46-stamp')} x={380} y={300} width={1160} rotate={-15} seed={46} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S47 tablets
const T1 = at('s47-tab1');
const T2 = at('s47-tab2');
const T3 = at('s47-tab3');
const PEEK = at('s47-peek');
const TL47 = nerfTimeline(
  [
    { at: at('s47-cut'), pose: 'slump', dur: 0, cut: true },
    { at: T1 + 2, pose: { head: [8, 0.02] }, dur: 6, ease: 'strike' },
    { at: T2 + 2, pose: { head: [-8, 0.02] }, dur: 6, ease: 'strike' },
    { at: T3, pose: { head: [-14, 0.03], torso: -10, pelvis: [0, -0.04] }, dur: 2, impact: true },
    { at: PEEK + 8, pose: { head: [10, 0.01], torso: 4, pelvis: [0, -0.02] }, dur: 10 },
  ],
  { phase: 'pre' },
);
const LOW47: CameraPose = { position: [0, 0.4, -2], target: [0, 4.2, -15], fov: 50 };
const tiltUp = (base: CameraPose, deg: number): CameraPose => {
  const d: Vec3 = [base.target[0] - base.position[0], base.target[1] - base.position[1], base.target[2] - base.position[2]];
  const len = Math.hypot(...d);
  const pitch = Math.asin(d[1] / len) + (deg * Math.PI) / 180;
  const flat = Math.hypot(d[0], d[2]);
  return { ...base, target: [base.position[0] + (d[0] / flat) * Math.cos(pitch) * len, base.position[1] + Math.sin(pitch) * len, base.position[2] + (d[2] / flat) * Math.cos(pitch) * len] };
};
const S47_PATH: CameraPath = (f) => tiltUp(LOW47, keyed(f, [[at('s47-cut'), 0], [at('s47-cut') + 8, 24], [T1 - 5, 24], [T1 + 3, 0]]));
const CAM47 = withShake(S47_PATH, { hits: shakeHits([[T1, 'medium'], [T2, 'medium'], [T3, 'big'], [at('s47-crack'), 'small']]) });
const TABLETS: { x: number; z: number; land: number; h: number; text: string[]; rot: number }[] = [
  { x: -4.6, z: -12.5, land: T1, h: 3.4, text: ['HEALTH', '−40 %'], rot: -4 },
  { x: 4.8, z: -13, land: T2, h: 3.4, text: ['METEOR RAIN:', 'REMOVED'], rot: 5 },
  { x: 0.1, z: -14.6, land: T3, h: 2.9, text: ['PHASE III:', 'REMOVED'], rot: -10 },
];

export const S47 = ({ frame }: { frame: number }) => {
  const pose = CAM47(frame);
  const st = stateAt(TL47, frame);
  const squash = frame >= T3 && frame < T3 + 4 ? 0.9 : 1;
  const out = easeInOut(prog(frame, PEEK, 10));
  const place: Place = { pos: [lerp(0, 1.9, out), 0, -15], scale: SCALE_A, squash };
  const helmY = 0.86 * FULL_H * SCALE_A * squash;
  const crack = easeOut(prog(frame, at('s47-crack'), 6));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM47}>
        <Throne frame={frame} />
        <Vorathul st={st} place={place} />
      </Stage>
      <LightRays x={960} y={project(pose, [0, 30, -14]).y} frame={frame} opacity={0.3 * (1 - prog(frame, T1 - 6, 6))} />
      {TABLETS.map((t, i) => {
        // Hover high in the sky, then drop on the anchor (ease-in). Tablet 3 rides his helm and slides off when he peeks out.
        const drop = easeIn(prog(frame, t.land - 9, 9));
        const onHelm = i === 2;
        let y = lerp(16 + i * 2.5 + Math.sin((frame + i * 20) * 0.08) * 0.4, onHelm ? helmY : 0, drop);
        let rot = t.rot;
        if (onHelm && frame >= PEEK) {
          const s = easeIn(prog(frame, PEEK + 2, 8));
          y = lerp(helmY, 0, s);
          rot = lerp(t.rot, 2, s);
        }
        const p = project(pose, [t.x, y, t.z]);
        if (p.z <= 0) return null;
        return <Tablet key={i} x={p.x} y={p.y} h={t.h * p.s} text={t.text} rot={rot} crack={crack} seed={470 + i} />;
      })}
      {TABLETS.map((t, i) => {
        const p = project(pose, [t.x, 0, t.z]);
        return <DustPuff key={i} x={p.x} y={p.y} size={180} t={prog(frame, t.land, 14)} seed={475 + i} />;
      })}
      <DustPuff x={project(pose, [0.6, 3, -14]).x} y={project(pose, [0.6, 3, -14]).y} size={420} t={prog(frame, at('s47-dust'), 22)} seed={479} />
      {crack > 0 ? (
        <Shards frame={frame - at('s47-crack')} duration={20} seed={47} origin={[project(pose, [-4.6, 2, -12.5]).x, project(pose, [-4.6, 2, -12.5]).y]} count={10} size={22} speed={14} />
      ) : null}
      <ComicHpBar value={60} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S48 stamp 2, shrink to dust
/** Deep blue so the readout keeps its contrast once the frame goes grayscale (the UI blue turns mid grey). */
const SIZE_BLUE = '#1E3A8A';
const SH1 = at('s48-shrink1');
const SH2 = at('s48-dust');
const REFORM = at('s48-reform');
const RUB = at('s48-rub');
const TL48 = nerfTimeline(
  [
    { at: at('s48-cut'), pose: 'slump', dur: 0, cut: true },
    { at: at('s48-look'), pose: { head: [-18, 0.03] }, dur: 8 },
    { at: RUB, pose: { armL: [70, 125, 0, 'open'] }, dur: 8 },
    { at: RUB + 5, pose: { armL: [62, 135, 10, 'open'] }, dur: 4 },
    { at: RUB + 10, pose: { armL: [70, 125, 0, 'open'] }, dur: 4 },
    { at: SH1, pose: 'slump', dur: 2, impact: true },
    { at: REFORM, pose: { head: [8, 0.02], torso: 2 }, dur: 8 },
  ],
  { phase: 'pre' },
);
const scale48 = (f: number): number => {
  if (f < SH1) return SCALE_A;
  if (f < SH1 + 2) return SCALE_B * 0.9;
  if (f < SH2) return SCALE_B;
  return SCALE_C;
};
const BASE48 = frameAt([0, 4.6, -15], 4.6, 0, 0);
const CAM48: CameraPath = withShake((f) => {
  const k = 1 - 0.04 * ((f >= SH1 ? 1 : 0) + (f >= REFORM ? 1 : 0));
  const p = BASE48.position;
  const t = BASE48.target;
  // Push 4 % per shrink step, and the look-at sinks with him.
  const ty = f >= REFORM ? 3.1 : f >= SH1 ? 3.9 : t[1];
  return { ...BASE48, position: [p[0], ty + (p[1] - t[1]), t[2] + (p[2] - t[2]) * k], target: [t[0], ty, t[2]] };
}, { hits: shakeHits([[at('s48-cut'), 'small'], [SH1, 'small'], [SH2, 'medium']]) });

export const S48 = ({ frame }: { frame: number }) => {
  const pose = CAM48(frame);
  const st = stateAt(TL48, frame);
  const asDust = frame >= SH2 && frame < SH2 + 3;
  const regrow = frame >= SH2 + 3 ? easeOutBack(prog(frame, SH2 + 3, REFORM - SH2 - 3)) : 1;
  const place: Place = { pos: [0, 0, -15], scale: scale48(frame), squash: frame >= SH2 + 3 && frame < REFORM ? lerp(0.5, 1, regrow) : 1, hidden: asDust };
  const chest = project(pose, chestAt(st, place));
  const w = 0.42 * FULL_H * place.scale * chest.s;
  const feet = project(pose, [0, 0.5, -15]);
  return (
    <ShotFrame frame={frame} cues={G.s48}>
      <Stage camera={CAM48}>
        <Throne frame={frame} />
        <Vorathul st={st} place={place} />
      </Stage>
      {!asDust ? <RubberStamp frame={frame} at={at('s48-cut')} x={chest.x - w / 2} y={chest.y - (w * 0.4) / 2} width={w} rotate={-12} seed={48} /> : null}
      <DustPuff x={feet.x} y={chest.y + 60} size={560} t={prog(frame, SH2, 22)} seed={481} />
      <DamageNumber frame={frame} text={'−10 % SIZE'} at={SH1} x={chest.x + 260} y={chest.y - 200} size={112} color={SIZE_BLUE} />
      <DamageNumber frame={frame} text={'−10 % SIZE'} at={SH2} x={chest.x + 240} y={chest.y - 260} size={112} color={SIZE_BLUE} />
      <ComicHpBar value={60} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S49 sticker collage of his glory
const PANELS: { src: string; box: [number, number, number, number]; view: [number, number, number]; rot: number; at: number; wall: [number, number, number, number] }[] = [
  { src: 'plates/06-dovus-faz3.jpg', box: [80, 150, 760, 500], view: [0.08, 0.05, 1.05], rot: -6, at: at('s49-panel1'), wall: [0, 0, 960, 560] },
  { src: 'plates/04-ikinci-form.jpg', box: [1040, 110, 800, 520], view: [0.1, 0.02, 1.0], rot: 5, at: at('s49-panel2'), wall: [960, 0, 960, 560] },
  { src: 'plates/03-kanat-yelpaze.jpg', box: [420, 560, 1080, 480], view: [0.0, 0.03, 1.0], rot: -2, at: at('s49-panel3'), wall: [0, 540, 1920, 540] },
];
const V_PANEL: DuotoneCue[] = [{ frame: 0, colors: [INK, VIOLET], hard: true }];
const BURST = at('s49-burst');
const LOCK = at('s49-lock');

const Panel = ({ frame, i }: { frame: number; i: number }) => {
  const p = PANELS[i]!;
  const slam = prog(frame, p.at, 5);
  if (frame < p.at) return null;
  const lockT = easeInOut(prog(frame, LOCK, 7));
  const [bx, by, bw, bh] = p.box.map((v, k) => lerp(v, p.wall[k]!, lockT)) as [number, number, number, number];
  const s = lerp(1.35, 1, easeOutBack(slam, 2.2));
  // On the burst the wall tears from the centre: each panel flies outward and spins away.
  const fly = easeIn(prog(frame, BURST, 10));
  const cx = bx + bw / 2 - 960;
  const cy = by + bh / 2 - 540;
  const tx = cx * fly * 2.4;
  const ty = cy * fly * 2.4 + fly * 300;
  const rot = lerp(p.rot, 0, lockT) + fly * (i === 1 ? 40 : -35);
  return (
    <StickerCutout frame={frame} seed={490 + i} id={`p3-st${i}`} border={16}>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${s})`, transformOrigin: `${bx + bw / 2}px ${by + bh / 2}px` }}>
        <div style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, overflow: 'hidden' }}>
          <DuotoneFlash frame={0} cues={V_PANEL} id={`p3-pv${i}`}>
            <Img src={staticFile(p.src)} style={{ position: 'absolute', left: -p.view[0] * bw, top: -p.view[1] * bh, width: bw * 1.2 * p.view[2], height: ((bw * 1.2 * p.view[2]) / 1536) * 1024 }} />
          </DuotoneFlash>
        </div>
      </AbsoluteFill>
    </StickerCutout>
  );
};

export const S49 = ({ frame }: { frame: number }) => {
  const tear = easeOut(prog(frame, at('s49-tear'), 8));
  const bulge = keyed(frame, [[at('s49-bulge'), 0], [BURST - 2, 0.9]], easeIn);
  const shake = PANELS.reduce((acc, p) => acc + Math.max(0, 1 - (frame - p.at) / 8) * (frame >= p.at ? 1 : 0), 0) + bulge * 0.4;
  const sx = Math.sin(frame * 2.1) * 10 * shake;
  const sy = Math.cos(frame * 2.9) * 8 * shake;
  const burst = frame >= BURST;
  const kidT = prog(frame, BURST, 12);
  const roar = prog(frame, at('s49-roar'), 6);
  const wall = (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
      {/* The torn-paper ground: ivory paper ripped open across the middle. */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <path d={`M0 ${540 - 160 * tear} ${[...Array(25).keys()].map((k) => `L${k * 80} ${540 - tear * (150 + ((k * 53) % 40))}`).join(' ')} L1920 ${540 - 150 * tear} L1920 ${540 + 140 * tear} ${[...Array(25).keys()].reverse().map((k) => `L${k * 80} ${540 + tear * (130 + ((k * 71) % 50))}`).join(' ')} Z`} fill={INK} />
      </svg>
      {PANELS.map((_, i) => <Panel key={i} frame={frame} i={i} />)}
      {roar > 0 && !burst ? (
        <div style={{ position: 'absolute', left: 260, top: 330, transform: `rotate(-8deg) scale(${lerp(1.6, 1, easeOut(roar))})`, fontFamily: "'UiAnton', Impact", fontSize: 230, color: VIOLET, WebkitTextStroke: `10px ${INK}`, letterSpacing: 8, opacity: 1 - prog(frame, LOCK, 6) }}>
          ROOOAAARR
        </div>
      ) : null}
    </AbsoluteFill>
  );
  return (
    <ShotFrame frame={frame} bg={IVORY}>
      {bulge > 0 && !burst ? (
        <CanvasBulge frame={frame} amount={bulge} x={960} y={560} size={520} seed={49} id="p3-bulge">{wall}</CanvasBulge>
      ) : wall}
      {burst ? (
        <>
          <SpeedLines mode="radial" frame={frame - BURST} duration={18} seed={491} focus={[960, 560]} inner={300} />
          <Shards frame={frame - BURST} duration={34} seed={492} origin={[960, 560]} spread={Math.PI * 2} speed={34} size={60} count={30} fills={[IVORY, IVORY, GOLD]} />
          <Kid asset="G32-3" x={960} y={560 + lerp(260, 900, easeOut(kidT))} h={lerp(420, 1250, easeOut(kidT))} pose={{ armL: 120, armR: 120, boot: 20, lean: 0 }} />
          <Flakes frame={frame} start={at('s49-shreds') - 30} seed={493} count={36} fall={3} />
        </>
      ) : null}
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S50 hero angle on the kid
const TL50 = nerfTimeline([{ at: at('s50-cut'), pose: 'slump', dur: 0, cut: true }], { phase: 'pre' });
const CAM50 = handheld(hold({ position: [1.5, 0.25, -3], target: [0.4, 4.5, -15], fov: 50 }), { amp: 0.03, seed: 50 });

export const S50 = ({ frame }: { frame: number }) => {
  const pose = CAM50(frame);
  const st = stateAt(TL50, frame);
  const t = frame - at('s50-cut');
  const speed = frame < at('s50-twirl') ? 0.32 : 0.62;
  const twirl = (frame < at('s50-twirl') ? t * 0.32 : (at('s50-twirl') - at('s50-cut')) * 0.32 + (frame - at('s50-twirl')) * speed) - Math.PI / 2;
  const kx = 1080;
  const ky = 1070;
  const kh = 820;
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM50}>
        <Throne frame={frame} />
        <Vorathul st={st} place={{ pos: [-5, 0, -19], scale: SCALE_C }} />
      </Stage>
      <LightRays x={kx} y={ky - kh * 0.62} frame={frame} opacity={0.3} />
      <Kid asset="G32-1" x={kx} y={ky} h={kh} pose={{ armL: 150, armR: 165, head: -6, twirl, lean: -2 }} />
      <Nameplate frame={frame} text="LV 12" appearAt={at('s50-lv')} framesPerChar={(at('s50-12') - at('s50-lv')) / 3} x={kx - 170 - 82} y={ky - kh - 110 - 27} width={495} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S51 A1 overhead cleave, nerfed (HIGH)
const STRIKE51 = at('s51-strike');
const TL51 = nerfTimeline(
  [
    // The antic is reached behind the S50 -> S51 cut; the strike transition starts f3510 (A1).
    { at: at('s51-cut') - 13, pose: 'cleave_antic', dur: 0, cut: true },
    { at: STRIKE51, pose: 'cleave_strike', dur: 12, ease: 'strike' },
    { at: STRIKE51 + 12, pose: 'cleave_follow', dur: 10 },
  ],
  { phase: 'pre' },
);
const HIGH_POS: Vec3 = [0, 17, 4];
const HIGH_TGT: Vec3 = [0, 0, -15];
const PITCH51 = Math.atan2(HIGH_POS[1] - HIGH_TGT[1], HIGH_POS[2] - HIGH_TGT[2]);
const CAM51 = withShake(hold({ position: HIGH_POS, target: HIGH_TGT, fov: 40 }), { hits: shakeHits([[STRIKE51, 'small']]) });

export const S51 = ({ frame }: { frame: number }) => {
  const pose = CAM51(frame);
  const st = stateAt(TL51, frame);
  const place: Place = { pos: [-4.6, 0, -15], scale: SCALE_C, pitch: -PITCH51 };
  const tip = project(pose, swordTipAt(st, place));
  const side = easeInOut(prog(frame, STRIKE51 - 7, 6));
  const kid = project(pose, [lerp(3.2, 4.6, side), 0, -14.5]);
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM51}>
        <Throne frame={frame} wallPitch={-PITCH51 * 0.5} />
        <Vorathul st={st} place={place} />
      </Stage>
      <Kid asset="G32-4" x={kid.x} y={kid.y} h={1.4 * kid.s} pose={{ armL: 40, armR: 60, lean: side * 12 - 4, step: side, head: 10, boot: 30 }} />
      <InkSplash frame={frame - STRIKE51} duration={16} seed={511} x={tip.x} y={tip.y} size={70} fade={6} />
      <DamageNumber frame={frame} text="MISS" at={STRIKE51} x={tip.x} y={tip.y - 40} size={96} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S52 three smacks
const SMACKS52 = [at('s52-cut'), at('s52-smack2'), at('s52-smack3')];
const TL52 = nerfTimeline([{ at: at('s52-cut'), pose: 'slump', dur: 0, cut: true }], { phase: 'pre' });
const CAM52 = withShake(handheld(hold(frameAt([0.6, 2.7, -15], 6.4)), { amp: 0.03, seed: 52 }), { hits: shakeHits(SMACKS52.map((s) => [s, 'small'])) });

/** Rattle after each smack: a decaying +-6 degree shake of the helm. */
const rattle = (frame: number, smacks: readonly number[]): number =>
  smacks.reduce((a, s) => (frame >= s && frame < s + 10 ? a + 6 * Math.exp(-(frame - s) / 4) * Math.cos((frame - s) * 2.2) : a), 0);

/** Kid jump-smack pose around a list of smack frames: wind up, airborne at the smack, landing. */
export const kidSmack = (frame: number, smacks: readonly number[]): { lift: number; pose: KidPose } => {
  let best = smacks[0]!;
  for (const s of smacks) if (Math.abs(frame - s) < Math.abs(frame - best)) best = s;
  const d = frame - best;
  const lift = d < -5 ? 0 : d <= 0 ? easeOut((d + 5) / 5) : Math.max(0, 1 - easeIn(d / 6));
  const arm = d < -6 ? 30 : d < 0 ? 175 : d < 4 ? 70 : 40;
  return { lift, pose: { armL: arm, armR: arm, boot: d < 0 ? -150 : 100, lean: d >= 0 && d < 5 ? -18 : -6, squash: d < -5 && d > -9 ? 0.6 : 0 } };
};

export const S52 = ({ frame }: { frame: number }) => {
  const pose = CAM52(frame);
  const place: Place = { pos: [-0.6, 0, -15], scale: SCALE_C };
  const st = withHead(stateAt(TL52, frame), rattle(frame, SMACKS52));
  const helm = project(pose, helmAt(st, place));
  const k = kidSmack(frame, SMACKS52);
  const kid = project(pose, [0.35, k.lift * 1.9, -14.2]);
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM52}>
        <Throne frame={frame} />
        <Vorathul st={st} place={place} />
      </Stage>
      <HelmNote frame={frame} st={st} place={place} pose={pose} />
      <Kid asset="G32-2" x={kid.x} y={kid.y} h={1.9 * kid.s} flip pose={k.pose} />
      {SMACKS52.map((s, i) => (
        <div key={i}>
          <InkSplash frame={frame - s} duration={10} seed={520 + i} x={helm.x + 40} y={helm.y - 30} size={60} fade={4} direction={Math.PI} />
          <DamageNumber frame={frame} text={'−1'} at={s} x={helm.x + 30 - i * 40} y={helm.y - 120} size={84} />
        </div>
      ))}
      <ComicHpBar value={60 - SMACKS52.filter((s) => frame >= s).length * 0.5} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S53 the shoe (flash 0: flash audit Z3)
const SHOE = at('s53-cut');
const TL53 = nerfTimeline(
  [
    { at: SHOE, pose: { armR: [120, 20, 0, 'open'], armL: [120, 20, 0, 'open'], legs: [20, 18], head: [12, 0], torso: 8 }, dur: 0, cut: true },
  ],
  { phase: 'pre' },
);
const CAM53 = withShake(hold({ position: [0, 0.6, -2], target: [0, 5.5, -15], fov: 50 }), { hits: shakeHits([[SHOE, 'big']]) });

export const S53 = ({ frame }: { frame: number }) => {
  const pose = CAM53(frame);
  const t = frame - SHOE;
  // The heroes' S10-S19 flight: a ballistic arc out of frame right, spinning 360 degrees every 12 frames.
  const place: Place = { pos: [-1 + t * 1.25, 1 + t * 1.15 - 0.045 * t * t, -15], scale: SCALE_C, rot: -t * 30 };
  const st = stateAt(TL53, frame);
  const helm = project(pose, helmAt(st, place));
  const sole = easeOut(prog(frame, SHOE, 13));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM53}>
        <Throne frame={frame} />
        <Vorathul st={st} place={place} />
      </Stage>
      <SpeedLines mode="radial" frame={t} duration={14} seed={531} focus={[960, 560]} inner={420} />
      <KoStars x={helm.x} y={helm.y - 40} r={70} frame={frame} />
      <ImpactBurst frame={t} duration={10} seed={532} x={960} y={600} size={300} flash={0} />
      {sole > 0.55 ? <Kid asset="G32-2" x={1560} y={1200} h={900} pose={{ armL: 30, armR: 95, boot: 'none', lean: -14 }} /> : null}
      <BootSole x={lerp(960, 1340, sole)} y={lerp(560, 820, sole)} h={lerp(1250, 560, sole)} rot={lerp(-6, 14, sole)} />
    </ShotFrame>
  );
};
