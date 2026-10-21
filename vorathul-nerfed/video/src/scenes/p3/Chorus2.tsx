// Scene 11, chorus 2 (S68-S73): the throne room becomes his concert stage. He rips the mic off its stand at the ticket
// queue, sings the sweep, swings the stand at the broom, belts the anthem line under the lantern rig, then stands
// still and takes the last shoe smack without noticing.
import { frameAt, handheld, hold, withShake, SHAKE_PCT, type CameraPath, type CameraPose } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { DamageNumber, Nameplate, RubberStamp, TicketPill, C } from '../../ui/kit.ts';
import { ImpactBurst, InkSplash, GOLD, INK } from '../../vfx/effects.ts';
import { Throne } from './Throne.tsx';
import { kidSmack } from './Chorus1.tsx';
import { at } from './events.ts';
import { ComicHpBar, Dim, DustPuff, Kid, Knight } from './Figures.tsx';
import { ShotFrame } from './Frame.tsx';
import { G, S73_SHOE_FLASH } from './grades.ts';
import { clamp01, easeIn, easeInOut, easeOut, easeOutBack, keyed, lerp, project, prog } from './lib.ts';
import { ARM_LOW, ARM_OUT, ARM_UP, Crumble, FloorStand, HANG, HeldMic, HeldStand, REACH, RestingMic, SING, STAND_SHOULDER, STAND_STRIKE, STAND_WIND, StageLights, armKeys, perform, restMic, singKeys, type ArmPose, type Overrides } from './Mic.tsx';
import { SCALE_C, helmAt, nerfTimeline, stateAt, swordTipAt, Vorathul, withHems, type Place } from './nerf.tsx';

const shakeHits = (list: [number, keyof typeof SHAKE_PCT][]) => list.map(([start, k], i) => ({ start, seed: start * 17 + i, amp: { pct: SHAKE_PCT[k] } }));
const ANTON = "'UiAnton', 'Anton', Impact, sans-serif";
const hopCurve = (frame: number, at0: number, len = 9): number => {
  const t = (frame - at0) / len;
  return t < 0 || t > 1 ? 0 : Math.sin(Math.PI * t);
};

// ---------------------------------------------------------------- S68 heroes queue with tickets; he takes the mic
const C68 = at('s68-cut');
const STEP68 = at('s68-step');
const GRAB = at('s68-grab');
const TL68 = nerfTimeline([{ at: C68, pose: 'slump', dur: 0, cut: true }], { phase: 'corked' });
// The left arm of the slump pose (docs/rig.md §5.1) and the right one without the sword.
const SLUMP_L: ArmPose = { ua: 6, f: 10, h: 0 };
// The yank: the left fist travels to the mic in the stand in front of him (12 frames), closes on it on beat 465 and rips
// it up to his mouth on the downbeat of beat 466 (12 frames); the free right arm is thrown out on the same downbeat and
// the head goes back. The sword is planted at his side so that hand is free.
const REACH_AT = C68 + 12;
const YANK = STEP68 - 12;
const OV68: Overrides = {
  plant: true,
  L: armKeys([[C68, SLUMP_L], [REACH_AT, REACH], [YANK, REACH], [STEP68, SING]], [[C68, 'open'], [GRAB - 6, 'fist']]),
  R: armKeys([[C68, ARM_LOW], [YANK, ARM_LOW], [STEP68, ARM_OUT]], [[C68, 'fist'], [YANK + 4, 'spread']]),
  head: [[C68, 0], [YANK + 2, 0], [STEP68 + 6, 18]],
  torso: [[C68, 0], [YANK + 2, 0], [STEP68 + 6, 5]],
};
const PLACE68: Place = { pos: [4.2, 0, -13], scale: SCALE_C };
// The mic rests in the stand exactly where the fist closes on it; the stand is as tall as that (its top under the mic).
const REST68 = restMic(perform(stateAt(TL68, REACH_AT), REACH_AT, OV68), PLACE68);
/** Height of the bare stand (to its clamp), world units; the same stand is swung in S70. */
const STAND_BARE = REST68.standTop;
/** The stand left behind rocks on its feet after the yank. */
const rock68 = (f: number): number => (f < YANK + 4 ? 0 : -0.12 * Math.exp(-(f - YANK - 4) / 12) * Math.sin(0.42 * (f - YANK - 4)));
const CAM68: CameraPath = handheld((f) => {
  // The truck reaches him by the yank so the mic grab happens in frame.
  const x = keyed(f, [[C68, -6.5], [GRAB, 0.6], [at('s69-cut'), 1.6]], easeOut);
  // The lens tightens into him over the yank so the arm and the mic read.
  const fov = keyed(f, [[C68, 40], [GRAB - 12, 40], [GRAB + 6, 27]]);
  const ty = keyed(f, [[C68, 1.5], [GRAB - 12, 1.5], [GRAB + 6, 2.3]]);
  return { position: [x, 1.1, -1.5], target: [x + 0.8, ty, -10], fov };
}, { amp: 0.02, seed: 68 });

export const S68 = ({ frame }: { frame: number }) => {
  const pose = CAM68(frame);
  const st = perform(stateAt(TL68, frame), frame, OV68);
  const step = easeInOut(prog(frame, STEP68, 8));
  const posts = [...Array(9).keys()].map((k) => project(pose, [-11 + k * 2, 0, -6.2]));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM68}>
        <Throne frame={frame} />
        <StageLights frame={frame} top={8.8} z={-18} width={11} />
        <FloorStand x={REST68.pos[0]} z={REST68.pos[2]} bare={STAND_BARE} rock={rock68(frame)} />
        <Vorathul st={st} place={PLACE68} />
        {frame < REACH_AT ? <RestingMic rest={REST68} /> : <HeldMic st={st} place={PLACE68} side="L" />}
      </Stage>
      {(() => {
        const p = project(pose, [3.6, 4.6, -13]);
        return <TicketPill frame={frame} text="NOW SERVING #46" appearAt={C68 - 30} x={p.x - 200} y={p.y} width={400} />;
      })()}
      {[...Array(6).keys()].map((j) => {
        const x = -9.6 + j * 1.45 + step * 0.7;
        const p = project(pose, [x, 0, -7.2]);
        const hop = hopCurve(frame, STEP68 + j, 8) * 0.6;
        return (
          <div key={j}>
            <Knight asset={`G34-${j + 1}`} x={p.x} y={p.y} h={1.45 * p.s} pose={{ hop, armL: j % 2 ? 160 : 20, armR: j % 3 ? 25 : 150, lean: j % 2 ? -3 : 4, item: j === 2 ? 'spear' : 'none' }} seed={680 + j} />
            <TicketPill frame={frame} text={`#${47 + j}`} appearAt={C68 - 20} x={p.x - 0.4 * p.s} y={p.y - 2.05 * p.s - hop * 30} width={0.8 * p.s} />
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {posts.slice(1).map((b, k) => {
          const a = posts[k]!;
          const top = 1.05;
          return <path key={k} d={`M${a.x} ${a.y - top * a.s} Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 0.6 * a.s} ${b.x} ${b.y - top * b.s}`} stroke={INK} strokeWidth={0.12 * a.s} fill="none" />;
        })}
        {posts.map((p, k) => <rect key={k} x={p.x - 0.07 * p.s} y={p.y - 1.15 * p.s} width={0.14 * p.s} height={1.15 * p.s} fill={GOLD} stroke={INK} strokeWidth={4} />)}
      </svg>
      <Crumble frame={frame} />
      <RubberStamp frame={frame} at={at('s68-stamp')} x={1480} y={-70} width={600} rotate={17} seed={68} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S69 A3 sweep, nerfed: the heroes skip the rope
const C69 = at('s69-cut');
const HOPS = [at('s69-hop1'), at('s69-hop2'), at('s69-hop3'), at('s69-hop4')];
const BONK = at('s69-bonk');
const LAUGH = at('s69-laugh');
const TL69 = nerfTimeline(
  [
    { at: C69, pose: 'sweep_antic', dur: 0, cut: true },
    { at: HOPS[0]!, pose: 'sweep_strike', dur: 12, ease: 'strike' },
    // Nerfed: the follow-through crawls along the floor, one hero per word, until it bonks a shin.
    { at: BONK, pose: 'sweep_follow', dur: BONK - HOPS[0]! },
    { at: at('s69-lower'), pose: 'base', dur: 14 },
    { at: at('s69-sag'), pose: 'slump', dur: 10 },
  ],
  { phase: 'corked' },
);
const PLACE69: Place = { pos: [3.4, 0, -15], scale: SCALE_C };
// The right arm sweeps the sword underneath; the left one sings "in the patch notes of my doom" into the mic.
const OV69: Overrides = { L: singKeys(C69, at('s70-cut'), [HOPS[0]!, BONK, LAUGH, at('s69-lower')]), head: [[C69, 16]], torso: [[C69, 5]] };
const OTS69: CameraPose = { position: [-0.6, 1.5, -5], target: [1.9, 2.0, -15], fov: 40 };
const CAM69 = withShake(handheld(hold(OTS69), { amp: 0.02, seed: 69 }), { hits: shakeHits([[HOPS[0]!, 'small'], [BONK, 'small']]) });
// The heroes stand where the blade tip passes, in the order it meets them (pure: tip of the rig at each hop frame).
const TIP = (f: number): Vec3 => swordTipAt(stateAt(TL69, f), PLACE69);
const HERO69 = [...HOPS, BONK].map((f) => TIP(f));

export const S69 = ({ frame }: { frame: number }) => {
  const pose = CAM69(frame);
  const st = perform(stateAt(TL69, frame), frame, OV69);
  const tip = project(pose, TIP(frame));
  const sweeping = frame >= HOPS[0]! - 2 && frame <= BONK + 2;
  const laugh = frame >= LAUGH ? Math.abs(Math.sin((frame - LAUGH) * 0.5)) : 0;
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM69}>
        <Throne frame={frame} />
        <StageLights frame={frame} top={10.2} z={-21} width={13} />
        <FloorStand x={5.5} z={-15.2} bare={STAND_BARE} />
        <Vorathul st={st} place={PLACE69} />
        <HeldMic st={st} place={PLACE69} side="L" />
      </Stage>
      {sweeping ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {[0, 1, 2, 3].map((k) => <path key={k} d={`M${tip.x + 20 + k * 6} ${tip.y - 14 + k * 9} l${110 + k * 30} ${-6 + k * 4}`} stroke={INK} strokeWidth={6 - k} strokeLinecap="round" />)}
        </svg>
      ) : null}
      {HERO69.map((w, j) => {
        const p = project(pose, [w[0] - 0.15, 0, w[2] + 0.9]);
        const hop = j < 4 ? hopCurve(frame, HOPS[j]! - 4, 10) : 0;
        return (
          <div key={j}>
            <Knight asset={hop > 0.1 ? `G34-${9 + (j % 4)}` : `G34-${j + 2}`} x={p.x} y={p.y} h={1.4 * p.s} flip pose={{ hop, armL: 30 + hop * 120, armR: 30 + hop * 120, laugh, lean: j === 4 ? 0 : -4 }} seed={690 + j} />
            {frame >= LAUGH && frame < LAUGH + 40 && j % 2 === 0 ? (
              <div style={{ position: 'absolute', left: p.x - 30, top: p.y - 1.9 * p.s - laugh * 30, fontFamily: ANTON, fontSize: 0.45 * p.s, color: GOLD, WebkitTextStroke: `3px ${INK}`, transform: `rotate(${j * 7 - 10}deg)` }}>HA</div>
            ) : null}
          </div>
        );
      })}
      {(() => {
        const p = project(pose, [HERO69[4]![0] - 0.15, 0.35, HERO69[4]![2] + 0.9]);
        return (
          <>
            <InkSplash frame={frame - BONK} duration={12} seed={695} x={p.x} y={p.y} size={40} fade={5} />
            <DamageNumber frame={frame} text={'−1'} at={BONK} x={p.x} y={p.y - 60} size={80} />
          </>
        );
      })()}
      <Crumble frame={frame} xs={[900, 1450, 1200]} />
      {/* The first hero's back, out of focus, fills the left third. */}
      <Knight asset="G34-1" x={170} y={1320} h={1050} flip pose={{ armL: 10, armR: 10 }} seed={699} style={{ filter: 'blur(6px)' }} />
    </ShotFrame>
  );
};

/** A push broom held at the top of its handle (gold pole, ivory bristle head, ink lines); `h` is its length, px. */
const Broom = ({ x, y, h, rot }: { x: number; y: number; h: number; rot: number }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${h / 120})`}>
      <path d="M0 -10 L0 90" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M0 -10 L0 90" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
      <path d="M-18 88 L18 88 L28 116 L-28 116 Z" fill="#F4ECD8" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M-14 96 L-19 114 M-5 96 L-6 115 M5 96 L6 115 M14 96 L19 114" stroke={INK} strokeWidth={2} />
    </g>
  </svg>
);

// ---------------------------------------------------------------- S70 stamp 4 on the HP label, swept aside with a broom
const C70 = at('s70-cut');
const WOBBLE = at('s70-wobble');
const SWEPT = at('s70-swept');
const SKID = at('s70-skid');
const TL70 = nerfTimeline([{ at: C70, pose: 'slump', dur: 0, cut: true }], { phase: 'corked' });
// The stand rests on his shoulder like a bat, is wound up further and swung out at the broom knight on "dust"
// (wind-up 12 frames, strike 13, return 18), while the left hand keeps singing; head back on "gloom".
const SWING = { wind: SWEPT - 13, hit: SWEPT, back: SWEPT + 18 };
const OV70: Overrides = {
  // The sword stands on his other side, clear of the swing.
  plant: 0.3,
  L: singKeys(C70, at('s71-cut'), [WOBBLE, at('s70-broom'), at('s70-gloom')]),
  R: armKeys([[C70, STAND_SHOULDER], [SWING.wind - 12, STAND_SHOULDER], [SWING.wind, STAND_WIND], [SWING.hit, STAND_STRIKE], [SWING.back, STAND_SHOULDER]], [[C70, 'fist']]),
  head: [[C70, 10], [at('s70-gloom') - 12, 10], [at('s70-gloom'), 20]],
  torso: [[C70, 4]],
};
// The camera pans after him as the broom sweeps him across, so he and the mic stay in frame.
const slide70 = (f: number): number => easeOut(prog(f, SWEPT, SKID - SWEPT));
// The swung stand is drawn half again as tall as the one in S68 so its gold feet read across the wide frame.
const SWUNG_BARE = 1.5 * STAND_BARE;
const CAM70 = withShake(handheld((f) => frameAt([1.5 + 1.9 * easeInOut(prog(f, SWEPT, 30)), 2.6, -15], 7.4), { amp: 0.02, seed: 70 }), { hits: shakeHits([[C70, 'small'], [SKID, 'small']]) });

export const S70 = ({ frame }: { frame: number }) => {
  const pose = CAM70(frame);
  const st0 = stateAt(TL70, frame);
  const slide = slide70(frame);
  const settle = frame >= at('s70-stay') && frame < at('s70-stay') + 4 ? 0.94 : 1;
  const place: Place = { pos: [lerp(0, 3.4, slide), 0, -15], scale: SCALE_C, rot: frame >= SWEPT ? -9 * Math.exp(-(frame - SWEPT) / 9) * (frame < SKID + 12 ? 1 : 0) : 0, squash: settle };
  const walk = easeInOut(prog(frame, at('s70-broom'), at('s70-ready') - at('s70-broom')));
  const push = easeInOut(prog(frame, at('s70-sweep'), SKID - at('s70-sweep')));
  const kx = lerp(-6, -2.0, walk) + push * 1.6;
  const knight = project(pose, [kx, 0, -14.2]);
  const broomRot = frame < at('s70-sweep') ? 15 : lerp(-35, 45, push);
  const st = perform(st0, frame, OV70);
  const feet = project(pose, [place.pos[0], 0.2, -15]);
  const wobble = frame >= WOBBLE ? 7 * Math.exp(-(frame - WOBBLE) / 7) * Math.sin((frame - WOBBLE) * 1.4) : 0;
  return (
    <ShotFrame frame={frame} cues={G.s70}>
      <Stage camera={CAM70}>
        <Throne frame={frame} />
        <StageLights frame={frame} top={9.2} z={-20} width={10} />
        <Vorathul st={st} place={place} />
        <HeldMic st={st} place={place} side="L" />
        <HeldStand st={st} place={place} side="R" bare={SWUNG_BARE} />
      </Stage>
      {/* The broom hero is a G34 cut-out (never the code-drawn stand-in figure); the broom is a prop in his hands. */}
      {frame >= at('s70-broom') ? (() => {
        const hop = frame < at('s70-ready') ? hopCurve(frame, at('s70-broom') + ((frame - at('s70-broom')) - ((frame - at('s70-broom')) % 6)), 6) * 0.15 : 0;
        const h = 1.4 * knight.s;
        const lean = frame >= at('s70-sweep') ? 8 : 0;
        return (
          <>
            <Knight asset="G34-7" x={knight.x} y={knight.y - hop * 0.2 * h} h={h} rot={lean} pose={{}} seed={701} />
            <Broom x={knight.x + 0.18 * h} y={knight.y - 0.55 * h - hop * 0.2 * h} h={0.9 * h} rot={broomRot} />
          </>
        );
      })() : null}
      <DustPuff x={feet.x} y={feet.y} size={160} t={prog(frame, SWEPT, 16)} seed={702} />
      <DustPuff x={feet.x} y={feet.y} size={220} t={prog(frame, SKID, 16)} seed={703} />
      <Crumble frame={frame} xs={[700, 1300, 1000]} />
      <ComicHpBar value={58.5} wobble={wobble}>
        <RubberStamp frame={frame} at={C70} x={-20} y={-30} width={300} rotate={-9} seed={70} />
      </ComicHpBar>
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S71 the anthem line on his stage, frontal and low
// "I was the wall that no one could get through": the room is his concert stage. A low frontal hero angle (yaw 0,
// pitch about 10 degrees up) with the lantern rig over his head; the free arm goes out on "wall", the fist up to the
// sky on "no" with the head thrown back, and the camera pushes in on "one", "could", "get" and "through".
const C71 = at('s71-cut');
const WALL71 = at('s71-sky');
const NO71 = at('s71-edge');
const ECU71 = at('s71-ecu');
const TL71 = nerfTimeline([{ at: C71, pose: 'slump', dur: 0, cut: true }], {
  phase: 'corked',
  slitOpacity: [{ at: 0, v: 0.4, dur: 0 }, { at: NO71, v: 0.9, dur: 4 }],
});
const OV71: Overrides = {
  plant: true,
  L: singKeys(C71, at('s72-cut'), [at('s71-tilt'), at('s71-cloud'), at('s71-push1'), at('s71-push3')]),
  R: armKeys(
    [[C71, ARM_LOW], [WALL71 - 12, ARM_LOW], [WALL71, ARM_OUT], [NO71 - 14, ARM_OUT], [NO71, ARM_UP], [ECU71 - 12, ARM_UP], [ECU71, ARM_OUT]],
    [[C71, 'fist'], [WALL71 - 8, 'spread'], [NO71 - 8, 'fist'], [ECU71 - 6, 'spread']],
  ),
  head: [[C71, 10], [NO71 - 12, 10], [NO71, 20]],
  torso: [[C71, 3], [NO71 - 12, 3], [NO71, 8]],
};
const PLACE71: Place = { pos: [0, 0, -15], scale: SCALE_C };
const FAR71: CameraPose = { position: [0, 0.8, -5.5], target: [0, 3.0, -15], fov: 46 };
const NEAR71: CameraPose = { position: [0.25, 2.3, -9.6], target: [0.25, 3.25, -15], fov: 46 };
/** Dolly amount: a slow creep, then four eased pushes (6 frames each) on the measured words. */
const PUSH71: [number, number][] = [[at('s71-push1'), 0.35], [at('s71-push2'), 0.55], [at('s71-push3'), 0.75], [ECU71, 1]];
const dolly71 = (f: number): number => {
  let k = 0.15 * easeInOut(prog(f, C71, PUSH71[0]![0] - C71));
  for (const [pf, v] of PUSH71) if (f >= pf) k = lerp(k, v, easeOut(prog(f, pf, 6)));
  return k;
};
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const CAM71 = withShake(
  handheld((f) => {
    const k = dolly71(f);
    return { position: mix(FAR71.position, NEAR71.position, k), target: mix(FAR71.target, NEAR71.target, k), fov: 46 };
  }, { amp: 0.02, seed: 71 }),
  { hits: shakeHits([[NO71, 'small'], [ECU71, 'small']]) },
);

export const S71 = ({ frame }: { frame: number }) => {
  const st = perform(stateAt(TL71, frame), frame, OV71);
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM71}>
        <Throne frame={frame} />
        <StageLights frame={frame} top={10.6} z={-18} width={14} rays={0.45} />
        <FloorStand x={-2.4} z={-15.4} bare={STAND_BARE} />
        <Vorathul st={st} place={PLACE71} />
        <HeldMic st={st} place={PLACE71} side="L" />
      </Stage>
      <Crumble frame={frame} xs={[420, 1500, 960]} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S72 the only stillness: he stares up
const C72 = at('s72-cut');
const KID72 = at('s72-kid');
const TUG = at('s72-tug');
const STARE = { head: [20, -0.01] as [number, number], torso: 6, pelvis: [0, 0] as [number, number] };
const TL72 = nerfTimeline([{ at: C72, pose: { ...STARE }, dur: 0, cut: true }], {
  phase: 'corked',
  life: { scale: 0 },
  slitOpacity: [{ at: 0, v: 0.8, dur: 0 }, { at: at('s72-narrow'), v: 0.45, dur: 6 }],
  ramps: { capeSway: [{ at: 0, v: 0, dur: 0 }] },
});
const PLACE72: Place = { pos: [0, 0, -15], scale: SCALE_C };
// The song is over: the mic hangs forgotten from his left fist, grille down beside his hip.
const OV_HANG: Overrides = { plant: true, L: armKeys([[0, HANG]], [[0, 'fist']]) };
const CAM72 = hold(frameAt(helmAt(stateAt(TL72, C72), PLACE72), 2.6));

export const S72 = ({ frame }: { frame: number }) => {
  const tug = frame >= TUG && frame < TUG + 6 ? 1 - (frame - TUG) / 6 : 0;
  const st = perform(withHems(stateAt(TL72, frame), 7 * tug), frame, OV_HANG);
  const place: Place = { ...PLACE72, pos: [0, frame >= TUG && frame < TUG + 2 ? -0.05 : 0, -15] };
  const rise = easeOutBack(prog(frame, KID72, 10));
  const wind = frame >= at('s72-windup') ? Math.sin(clamp01((frame - at('s72-windup')) / 10) * Math.PI) * 26 : 0;
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM72}>
        <Throne frame={frame} />
        <Vorathul st={st} place={place} />
        <HeldMic st={st} place={place} side="L" />
      </Stage>
      {frame >= KID72 ? (
          <Nameplate frame={frame} text="LV 12" appearAt={at('s72-lv')} framesPerChar={(at('s72-12') - at('s72-lv')) / 3} x={1060 - 75} y={lerp(1180, 930, rise) - wind - 25} width={450} />
      ) : null}
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S73 the shoe, ignored
const C73 = at('s73-cut');
const SHOE73 = at('s73-shoe');
const SMACKS73 = [C73, at('s73-smack2'), at('s73-smack3'), SHOE73];
const KIDUP = at('s73-kidup');
const EXIT = at('s73-exit');
const TL73 = nerfTimeline([{ at: C73, pose: { ...STARE }, dur: 0, cut: true }], {
  phase: 'corked',
  life: { scale: 0 },
  slitOpacity: 0.45,
  ramps: { capeSway: [{ at: 0, v: 0, dur: 0 }] },
});
const PLACE73: Place = { pos: [-0.6, 0, -15], scale: SCALE_C };
const CAM73 = withShake(hold(frameAt([0.4, 2.7, -15], 7.4)), { hits: shakeHits([[SHOE73, 'small']]) });

export const S73 = ({ frame }: { frame: number }) => {
  const pose = CAM73(frame);
  const st = perform(stateAt(TL73, frame), frame, OV_HANG);
  const helm = project(pose, helmAt(st, PLACE73));
  const after = frame >= KIDUP;
  const k = after ? { lift: 0, pose: { armL: 20, armR: 20, boot: 0, head: -28, lean: 6 } } : kidSmack(frame, SMACKS73);
  const shrug = frame >= EXIT ? Math.sin(clamp01((frame - EXIT) / 8) * Math.PI) : 0;
  const kid = project(pose, [0.35, k.lift * 1.9, -14.2]);
  const walk = easeIn(prog(frame, EXIT, 19));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM73}>
        <Throne frame={frame} />
        <StageLights frame={frame} top={9.2} z={-20} width={10} />
        <Vorathul st={st} place={PLACE73} />
        <HeldMic st={st} place={PLACE73} side="L" />
      </Stage>
      {[0, 1, 2].map((j) => {
        const p = project(pose, [-5.5 + j * 0.9 + walk * (j % 2 ? -7 : 9), 0, -18 - j]);
        return <Knight key={j} asset={`G34-${6 + j}`} x={p.x} y={p.y} h={1.4 * p.s} flip={j % 2 === 1} pose={{ hop: walk > 0 ? Math.abs(Math.sin(frame * 0.5 + j)) * 0.12 : 0, armL: 20, armR: 20 }} seed={730 + j} />;
      })}
      <Kid asset={frame >= EXIT ? 'G32-6' : after ? 'G32-5' : 'G32-2'} x={kid.x} y={kid.y} h={1.9 * kid.s} flip pose={{ ...k.pose, armL: (k.pose.armL ?? 20) + shrug * 60, armR: (k.pose.armR ?? 20) + shrug * 60 }} />
      {SMACKS73.map((s, i) => <DamageNumber key={i} frame={frame} text={'−1'} at={s} x={helm.x + 40 - i * 34} y={helm.y - 110} size={76} />)}
      <ImpactBurst frame={frame - SHOE73} duration={12} seed={735} x={helm.x + 30} y={helm.y} size={200} flash={S73_SHOE_FLASH} />
      <Dim amount={0.3 * easeInOut(prog(frame, EXIT, at('s73-exit') + 19 - EXIT))} />
    </ShotFrame>
  );
};
