// Scene 11, chorus 2 (S68-S73): the ticket queue, the skipping-rope sweep, the broom, awareness step 2 (the sky
// ends at a ruler-straight line) and the last shoe smack he does not even notice.
import { frameAt, handheld, hold, withShake, SHAKE_PCT, type CameraPath, type CameraPose } from '../../camera/api.ts';
import { AssetCard } from '../../cast/AssetCard.tsx';
import type { Vec3 } from '../../stage/Card.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { DamageNumber, Nameplate, RubberStamp, TicketPill, C } from '../../ui/kit.ts';
import { ImpactBurst, InkSplash, GOLD, INK } from '../../vfx/effects.ts';
import { Cathedral, Floor, Sky, Wall } from './Backdrop.tsx';
import { kidSmack } from './Chorus1.tsx';
import { at } from './events.ts';
import { Cloud, ComicHpBar, Dim, DustPuff, Kid, Knight } from './Figures.tsx';
import { ShotFrame } from './Frame.tsx';
import { G, S73_SHOE_FLASH } from './grades.ts';
import { clamp01, easeIn, easeInOut, easeOut, easeOutBack, keyed, lerp, project, prog, twos } from './lib.ts';
import { SCALE_C, helmAt, nerfTimeline, stateAt, swordTipAt, Vorathul, withHems, type Place } from './nerf.tsx';

const shakeHits = (list: [number, keyof typeof SHAKE_PCT][]) => list.map(([start, k], i) => ({ start, seed: start * 17 + i, amp: { pct: SHAKE_PCT[k] } }));
const ANTON = "'UiAnton', 'Anton', Impact, sans-serif";
const hopCurve = (frame: number, at0: number, len = 9): number => {
  const t = (frame - at0) / len;
  return t < 0 || t > 1 ? 0 : Math.sin(Math.PI * t);
};

// ---------------------------------------------------------------- S68 heroes queue with tickets
const C68 = at('s68-cut');
const STEP68 = at('s68-step');
const TL68 = nerfTimeline([{ at: C68, pose: 'slump', dur: 0, cut: true }], { phase: 'corked' });
const CAM68: CameraPath = handheld((f) => {
  const x = keyed(f, [[C68, -6.5], [at('s69-cut'), -0.5]], (t) => t);
  return { position: [x, 1.1, -1.5], target: [x + 0.8, 1.5, -10], fov: 40 };
}, { amp: 0.02, seed: 68 });

export const S68 = ({ frame }: { frame: number }) => {
  const pose = CAM68(frame);
  const st = stateAt(TL68, frame);
  const step = easeInOut(prog(frame, STEP68, 8));
  const posts = [...Array(9).keys()].map((k) => project(pose, [-11 + k * 2, 0, -6.2]));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM68}>
        <Cathedral />
        <Vorathul st={st} place={{ pos: [4.2, 0, -13], scale: SCALE_C }} />
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
            <Knight asset="G15-1" x={p.x} y={p.y} h={1.45 * p.s} pose={{ hop, armL: j % 2 ? 160 : 20, armR: j % 3 ? 25 : 150, lean: j % 2 ? -3 : 4, item: j === 2 ? 'spear' : 'none' }} seed={680 + j} />
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
const OTS69: CameraPose = { position: [-0.6, 1.5, -5], target: [2.2, 2.0, -15], fov: 40 };
const CAM69 = withShake(handheld(hold(OTS69), { amp: 0.02, seed: 69 }), { hits: shakeHits([[HOPS[0]!, 'small'], [BONK, 'small']]) });
// The heroes stand where the blade tip passes, in the order it meets them (pure: tip of the rig at each hop frame).
const TIP = (f: number): Vec3 => swordTipAt(stateAt(TL69, f), PLACE69);
const HERO69 = [...HOPS, BONK].map((f) => TIP(f));

export const S69 = ({ frame }: { frame: number }) => {
  const pose = CAM69(frame);
  const st = stateAt(TL69, frame);
  const tip = project(pose, TIP(frame));
  const sweeping = frame >= HOPS[0]! - 2 && frame <= BONK + 2;
  const laugh = frame >= LAUGH ? Math.abs(Math.sin((twos(frame) - LAUGH) * 0.5)) : 0;
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM69}>
        <Cathedral />
        <Vorathul st={st} place={PLACE69} />
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
            <Knight asset={frame >= LAUGH ? 'G15-7' : hop > 0.1 ? 'G15-2' : 'G15-1'} x={p.x} y={p.y} h={1.4 * p.s} flip pose={{ hop, armL: 30 + hop * 120, armR: 30 + hop * 120, laugh, lean: j === 4 ? 0 : -4 }} seed={690 + j} />
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
      {/* The first hero's back, out of focus, fills the left third. */}
      <Knight asset="G15-1" x={170} y={1320} h={1050} flip pose={{ armL: 10, armR: 10 }} seed={699} style={{ filter: 'blur(6px)' }} />
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S70 stamp 4 on the HP label, swept aside with a broom
const C70 = at('s70-cut');
const WOBBLE = at('s70-wobble');
const SWEPT = at('s70-swept');
const SKID = at('s70-skid');
const TL70 = nerfTimeline([{ at: C70, pose: 'slump', dur: 0, cut: true }], { phase: 'corked' });
const CAM70 = withShake(handheld(hold(frameAt([1.5, 2.6, -15], 7.4)), { amp: 0.02, seed: 70 }), { hits: shakeHits([[C70, 'small'], [SKID, 'small']]) });

export const S70 = ({ frame }: { frame: number }) => {
  const pose = CAM70(frame);
  const st = stateAt(TL70, frame);
  const slide = easeOut(prog(frame, SWEPT, SKID - SWEPT));
  const settle = frame >= at('s70-stay') && frame < at('s70-stay') + 4 ? 0.94 : 1;
  const place: Place = { pos: [lerp(0, 3.4, slide), 0, -15], scale: SCALE_C, rot: frame >= SWEPT ? -9 * Math.exp(-(frame - SWEPT) / 9) * (frame < SKID + 12 ? 1 : 0) : 0, squash: settle };
  const walk = easeInOut(prog(frame, at('s70-broom'), at('s70-ready') - at('s70-broom')));
  const push = easeInOut(prog(frame, at('s70-sweep'), SKID - at('s70-sweep')));
  const kx = lerp(-6, -2.0, walk) + push * 1.6;
  const knight = project(pose, [kx, 0, -14.2]);
  const broomRot = frame < at('s70-sweep') ? 15 : lerp(-35, 45, push);
  const feet = project(pose, [place.pos[0], 0.2, -15]);
  const wobble = frame >= WOBBLE ? 7 * Math.exp(-(frame - WOBBLE) / 7) * Math.sin((frame - WOBBLE) * 1.4) : 0;
  return (
    <ShotFrame frame={frame} cues={G.s70}>
      <Stage camera={CAM70}>
        <Cathedral />
        <Vorathul st={st} place={place} />
      </Stage>
      {frame >= at('s70-broom') ? <Knight x={knight.x} y={knight.y} h={1.4 * knight.s} pose={{ item: 'broom', itemRot: broomRot, armR: frame >= at('s70-ready') ? 70 : 20, armL: 40, lean: frame >= at('s70-sweep') ? 8 : 0, hop: frame < at('s70-ready') ? hopCurve(frame, at('s70-broom') + ((frame - at('s70-broom')) - ((frame - at('s70-broom')) % 6)), 6) * 0.15 : 0 }} seed={701} /> : null}
      <DustPuff x={feet.x} y={feet.y} size={160} t={prog(frame, SWEPT, 16)} seed={702} />
      <DustPuff x={feet.x} y={feet.y} size={220} t={prog(frame, SKID, 16)} seed={703} />
      <ComicHpBar value={58.5} wobble={wobble}>
        <RubberStamp frame={frame} at={C70} x={-20} y={-30} width={300} rotate={-9} seed={70} />
      </ComicHpBar>
    </ShotFrame>
  );
};

// ---------------------------------------------------------------- S71 awareness step 2: the sky ends at a straight line
const C71 = at('s71-cut');
const TILT = at('s71-tilt');
const CORNER = at('s71-corner');
const EDGE = at('s71-edge');
const ECU71 = at('s71-ecu');
const SKY71: [number, number, number, number] = [-220, -40, 40, 150];
const CORNER_W: Vec3 = [SKY71[2], SKY71[3], -90];
const TL71 = nerfTimeline(
  [
    { at: C71, pose: 'slump', dur: 0, cut: true },
    { at: C71 + 8, pose: { head: [20, -0.01], torso: 6, pelvis: [0, 0] }, dur: 8 },
  ],
  { phase: 'corked', slitOpacity: [{ at: 0, v: 0.4, dur: 0 }, { at: EDGE, v: 0.8, dur: 4 }] },
);
const LOW71: CameraPose = { position: [0, 0.6, -5], target: [0, 3.2, -15], fov: 50 };
const toCorner: Vec3 = [CORNER_W[0] - LOW71.position[0], CORNER_W[1] - LOW71.position[1], CORNER_W[2] - LOW71.position[2]];
const CORNER_DIST = Math.hypot(...toCorner);
const aim = (s: number): CameraPose => {
  const d0: Vec3 = [LOW71.target[0] - LOW71.position[0], LOW71.target[1] - LOW71.position[1], LOW71.target[2] - LOW71.position[2]];
  const n0 = Math.hypot(...d0);
  // Aim slightly below and left of the corner so it sits in the upper-right third.
  const d1: Vec3 = [toCorner[0] / CORNER_DIST - 0.1, toCorner[1] / CORNER_DIST - 0.12, toCorner[2] / CORNER_DIST];
  const d: Vec3 = [lerp(d0[0] / n0, d1[0], s), lerp(d0[1] / n0, d1[1], s), lerp(d0[2] / n0, d1[2], s)];
  return { ...LOW71, target: [LOW71.position[0] + d[0] * 10, LOW71.position[1] + d[1] * 10, LOW71.position[2] + d[2] * 10] };
};
const PUSHES: [number, number][] = [[at('s71-push1'), 0.35], [at('s71-push2'), 0.6], [at('s71-push3'), 0.8], [ECU71, 0.93]];
const CAM71: CameraPath = (f) => {
  const p = aim(easeInOut(prog(f, TILT, CORNER - TILT)));
  let k = 0;
  for (const [pf, v] of PUSHES) if (f >= pf) k = pf === ECU71 ? v : lerp(k, v, easeOut(prog(f, pf, 6)));
  const off: Vec3 = [toCorner[0] * k, toCorner[1] * k, toCorner[2] * k];
  return { ...p, position: [p.position[0] + off[0], p.position[1] + off[1], p.position[2] + off[2]], target: [p.target[0] + off[0], p.target[1] + off[1], p.target[2] + off[2]] };
};

/** Raw canvas weave beyond the sky's edge (C35): the L-shaped region outside the corner, in world units, shrunk
 *  until every point is in front of the camera, plus the 1 px office-grey edge line. A flat weave card sits behind. */
const Weave = ({ pose }: { pose: CameraPose }) => {
  const [cx, cy] = [CORNER_W[0], CORNER_W[1]];
  for (const L of [160, 80, 40, 20, 10, 5, 2, 1, 0.5]) {
    const ring: [number, number][] = [[cx, cy], [cx - L, cy], [cx - L, cy + L], [cx + L, cy + L], [cx + L, cy - L], [cx, cy - L]];
    const q = ring.map(([x, y]) => project(pose, [x, y, -89.9]));
    if (q.some((p) => p.z <= 0.5)) continue;
    const c = q[0]!;
    const cell = Math.min(60, Math.max(6, 0.6 * c.s));
    return (
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="p3-weave" width={cell} height={cell} patternUnits="userSpaceOnUse" x={c.x} y={c.y}>
            <rect width={cell} height={cell} fill={WEAVE} />
            <path d={`M0 ${cell * 0.25} H${cell} M0 ${cell * 0.75} H${cell}`} stroke="#CDBF9F" strokeWidth={cell * 0.18} />
            <path d={`M${cell * 0.25} 0 V${cell} M${cell * 0.75} 0 V${cell}`} stroke="#D9CCAE" strokeWidth={cell * 0.14} />
          </pattern>
        </defs>
        <path d={`M${q.map((p) => `${p.x} ${p.y}`).join('L')}Z`} fill="url(#p3-weave)" />
        <path d={`M${q[1]!.x} ${q[1]!.y} L${c.x} ${c.y} L${q[5]!.x} ${q[5]!.y}`} stroke="#ADB5BD" strokeWidth={2} fill="none" />
      </svg>
    );
  }
  return null;
};
const WEAVE = '#E9DFC7';

export const S71 = ({ frame }: { frame: number }) => {
  const pose = CAM71(frame);
  const st = stateAt(TL71, frame);
  const cloudOff = easeInOut(prog(frame, at('s71-cloud'), EDGE - at('s71-cloud')));
  const corner = project(pose, CORNER_W);
  const other = [[-30, 60], [-90, 110], [-10, 125], [-60, 30]].map(([x, y]) => project(pose, [x!, y!, -89]));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM71}>
        <AssetCard id="C35" standIn={{ color: WEAVE }} width={600} height={500} position={[0, 100, -90.5]} renderOrder={-101} />
        <Sky rect={SKY71} z={-90} />
        <Wall />
        <Floor />
        <Vorathul st={st} place={{ pos: [0, 0, -15], scale: SCALE_C }} />
      </Stage>
      <Weave pose={pose} />
      {other.map((p, i) => (p.z > 0 ? <Cloud key={i} x={p.x} y={p.y} w={26 * p.s} seed={711 + i} /> : null))}
      {/* A bank of cloud hides the corner until it slides off on "no" (the reveal frame). */}
      {cloudOff < 1 && corner.z > 0
        ? [[-260, 120, 1500], [380, -260, 1700], [520, 300, 1300]].map(([dx, dy, w], i) => (
            <Cloud key={i} x={corner.x + dx! + cloudOff * 2200} y={corner.y + dy! - cloudOff * 200} w={w!} seed={715 + i} />
          ))
        : null}
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
const CAM72 = hold(frameAt(helmAt(stateAt(TL72, C72), PLACE72), 2.6));

export const S72 = ({ frame }: { frame: number }) => {
  const tug = frame >= TUG && frame < TUG + 6 ? 1 - (frame - TUG) / 6 : 0;
  const st = withHems(stateAt(TL72, frame), 7 * tug);
  const place: Place = { ...PLACE72, pos: [0, frame >= TUG && frame < TUG + 2 ? -0.05 : 0, -15] };
  const rise = easeOutBack(prog(frame, KID72, 10));
  const wind = frame >= at('s72-windup') ? Math.sin(clamp01((frame - at('s72-windup')) / 10) * Math.PI) * 26 : 0;
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM72}>
        <Cathedral />
        <Vorathul st={st} place={place} />
      </Stage>
      {frame >= KID72 ? (
          <Nameplate frame={frame} text="LV 12" appearAt={at('s72-lv')} framesPerChar={(at('s72-12') - at('s72-lv')) / 3} x={1060} y={lerp(1180, 930, rise) - wind} width={300} />
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
  const st = stateAt(TL73, frame);
  const helm = project(pose, helmAt(st, PLACE73));
  const after = frame >= KIDUP;
  const k = after ? { lift: 0, pose: { armL: 20, armR: 20, boot: 0, head: -28, lean: 6 } } : kidSmack(frame, SMACKS73);
  const shrug = frame >= EXIT ? Math.sin(clamp01((frame - EXIT) / 8) * Math.PI) : 0;
  const kid = project(pose, [0.35, k.lift * 1.9, -14.2]);
  const walk = easeIn(prog(frame, EXIT, 19));
  return (
    <ShotFrame frame={frame}>
      <Stage camera={CAM73}>
        <Cathedral />
        <Vorathul st={st} place={PLACE73} />
      </Stage>
      {[0, 1, 2].map((j) => {
        const p = project(pose, [-5.5 + j * 0.9 + walk * (j % 2 ? -7 : 9), 0, -18 - j]);
        return <Knight key={j} asset={walk > 0 ? 'G15-5' : 'G15-1'} x={p.x} y={p.y} h={1.4 * p.s} flip={j % 2 === 1} pose={{ hop: walk > 0 ? Math.abs(Math.sin(twos(frame) * 0.5 + j)) * 0.12 : 0, armL: 20, armR: 20 }} seed={730 + j} />;
      })}
      <Kid asset={frame >= EXIT ? 'G32-6' : after ? 'G32-5' : 'G32-2'} x={kid.x} y={kid.y} h={1.9 * kid.s} flip pose={{ ...k.pose, armL: (k.pose.armL ?? 20) + shrug * 60, armR: (k.pose.armR ?? 20) + shrug * 60 }} />
      {SMACKS73.map((s, i) => <DamageNumber key={i} frame={frame} text={'−1'} at={s} x={helm.x + 40 - i * 34} y={helm.y - 110} size={76} />)}
      <ImpactBurst frame={frame - SHOE73} duration={12} seed={735} x={helm.x + 30} y={helm.y} size={200} flash={S73_SHOE_FLASH} />
      <Dim amount={0.3 * easeInOut(prog(frame, EXIT, at('s73-exit') + 19 - EXIT))} />
    </ShotFrame>
  );
};
