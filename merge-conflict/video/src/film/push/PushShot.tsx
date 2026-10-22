// GIT! PUSH! FORCE! rebuilt (round 9, scene-map.md "GIT! PUSH! FORCE! rebuilt", 120.03-125.36 s): its own shot family,
// spliced into Film.tsx between verse 4 and the whisper, so the rest family (film/rest) is untouched.
//
// One stage, one geography: orange LEFT on the fire half, blue RIGHT on the cold blue half, the whole time. Four shots:
//  1. GIT! (120.03-121.36): a wide low two-shot; orange (OF1) gathers light in her fists, blue (BB1) braces in her own
//     light; GIT! slams above them on her shout.
//  2. the charge (121.36-124.32): ONE slow push toward orange; cracks of light race across the floor toward blue bar by
//     bar, the `git push --force` HUD types in the corner (the rest family's GitHud), the glow in her fists grows. The
//     one cut: blue's face (BMX1) seeing it coming, one bar; then back to the same push (the camera never stopped);
//     orange leaps (OF2) and the camera tilts up after her.
//  3. PUSH! (124.32-125.02): ONE continuous wide shot. Orange lands (OF3); the shockwave ring runs across the floor
//     from her fists to blue; it hits her soles, the frame shakes, blue goes from BB1 to BF2 and is thrown out of
//     frame right with speed streaks; the camera whips after the wave. No cover, no insert, no painting.
//  4. FORCE! (125.02-125.36): OF4 from a low angle, finger to the sky, FORCE! beside her.
// Colour: orange's side is fire, blue's stays cold blue; no lasers; blue keeps her own grade and a cold rim (never red).
import { AbsoluteFill } from 'remotion';
import { type CameraPose, project, type Vec3 } from '../../camera/camera.ts';
import { Card, type CardLight, type Placement } from '../../cards/Card.tsx';
import { at, EVENTS } from '../../events.ts';
import { GRADES, type Grade, metalGrade } from '../../grade/grade.ts';
import { useLayer, useShotBackground } from '../../layer.ts';
import { clamp01, type Hex, outQuad } from '../../lib/ease.ts';
import { seeded } from '../../lib/seeded.ts';
import { type Burst, Field } from '../../particles/field.tsx';
import { Stage } from '../../stage/Stage.tsx';
import { FLOOR_Y } from '../../stage/floor.ts';
import { beats, sec, sectionNamed } from '../../timing.ts';
import { SceneTransition, type TransitionSpec, transitionWindow } from '../../transitions/scene/scene.tsx';
import { FormDefs } from '../../type/forms/common.tsx';
import { Shout } from '../../type/forms/Mega.tsx';
import { Slam } from '../../type/Slam.tsx';
import { Svg } from '../../type/Svg.tsx';
import { BeamCone, Embers, FireWall, Halo, LedWall, NeonTube, Smoke, TilePlatform } from '../../worlds/kit/index.ts';
import { InsertWorld } from '../chorus/worlds.tsx';
import { faceSized, screenBox, type ShotState, type Subject } from '../framing.ts';
import { liveCamera } from '../livecam.ts';
import { GitHud } from '../rest/type.tsx';
import './frames.ts';

export const PUSH_SECTION = sectionNamed('breakdown_git_push_force');
export const PUSH_START = PUSH_SECTION.start;
export const PUSH_END = PUSH_SECTION.end;
const bt = (t: number) => beats.find((x) => x >= t - 0.02) as number;

/** The words: GIT! (120.68), PUSH! (124.32), FORCE! (125.02). */
export const GIT = at('tok-45-0');
export const PUSH = at('tok-46-0');
export const FORCE = at('tok-47-0');
/** The charge starts on the bar after GIT!; blue's cut-in is one bar from the charge's third beat. */
export const CHARGE = bt(121.36);
const SEES = bt(122.36);
const BACK = bt(123.36);
/** Orange leaps on the beat after the cut back and rises until she smashes down on PUSH!. */
const LEAP = bt(123.69);
/** The ring leaves her fists on PUSH! and reaches blue's soles at HIT; a 4-frame hit-stop (both girls and the ring
 *  frozen, blue's silhouette flashed cold white, the frame shaken for 3 frames), then the throw: she flies right in
 *  plain sight for about 0.4 s and is leaving the frame on the cut to FORCE!. */
export const HIT = PUSH + 0.18;
export const STOP = 4 / 60;
export const THROW_AT = HIT + STOP;
/** The PUSH! wide shot's own clock: frozen through the hit-stop. */
export const frozen = (t: number): number => (t >= HIT && t < THROW_AT ? HIT - 1e-4 : t);
/** Blue stands a little nearer the centre in the PUSH! wide, so the whole throw is seen before she leaves the frame. */
const BX_PUSH = 2.8;

/** The geography: orange left, blue right, the whole time. */
const OX = -3.3;
const BX = 3.3;
const O_AT: Placement = { x: OX, height: 6.5, z: 0 };
const B_AT: Placement = { x: BX, height: 6.3, z: 0 };

type ShotId = 'git' | 'charge' | 'sees' | 'charge-2' | 'push' | 'force';
interface PShot { id: ShotId; t: number }
export const PSHOTS: readonly PShot[] = [
  { id: 'git', t: PUSH_START },
  { id: 'charge', t: CHARGE },
  { id: 'sees', t: SEES },
  { id: 'charge-2', t: BACK },
  { id: 'push', t: PUSH },
  { id: 'force', t: FORCE },
];
const shotAt = (t: number): PShot => [...PSHOTS].reverse().find((s) => t >= s.t - 1e-9) ?? (PSHOTS[0] as PShot);
const nextT = (s: PShot): number => PSHOTS[PSHOTS.indexOf(s) + 1]?.t ?? PUSH_END;

const cam = (position: Vec3, target: Vec3, fov = 44, roll = 0): CameraPose => ({ position, target, fov, roll });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

const HITS = EVENTS.filter((e) => e.kind === 'hit' && e.t >= PUSH_START && e.t < PUSH_END).map((e) => e.t);
/** A stepped jolt (every 3 frames) after each kick and, hardest, when the wave hits blue. */
const jolt = (pose: CameraPose, t: number, amp: number): CameraPose => {
  const h = [...HITS, GIT, THROW_AT].filter((x) => t >= x).sort((a, b) => a - b).at(-1);
  if (h === undefined || t - h > 0.3) return pose;
  const w = 1 - (t - h) / 0.3;
  const big = h === THROW_AT || h === GIT ? 2.2 : 1;
  const r = seeded(`push-jolt:${Math.floor(t * 20)}`);
  const d = amp * big * w;
  return { ...pose, position: [pose.position[0] + r.range(-d, d), pose.position[1] + r.range(-d, d), pose.position[2]], roll: (pose.roll ?? 0) + r.range(-0.025, 0.025) * big * w };
};

/** The charge: one continuous slow push from a two-shot to orange alone, eased in, faster each bar; after the leap
 *  the camera tilts up after her. It runs through the cut-in, so the cut back finds it where it would be. */
const chargePose = (t: number): CameraPose => {
  const k = clamp01((t - CHARGE) / (PUSH - CHARGE));
  const e = 0.55 * k + 0.45 * k * k;
  const tilt = outQuad(clamp01((t - LEAP) / (PUSH - LEAP)));
  return cam(lerp3([-0.8, -1.4, 10.9], [-2.6, -0.9, 8.6], e), [lerp(-1.2, -3.0, e), lerp(-0.3, 0.3, e) + 2.6 * tilt, 0], 44);
};

/** Orange: her card and placement at t (she rises from the floor in the leap). */
const orangeAt = (t: number): { card: string; at: Placement } => {
  if (t >= FORCE) return { card: 'OF4', at: { x: -1.8, height: 6.4, z: 0 } };
  if (t >= PUSH) return { card: 'OF3', at: { ...O_AT, height: 6.4 } };
  if (t >= LEAP) return { card: 'OF2', at: { ...O_AT, height: 6.2, feet: FLOOR_Y + 2.4 * outQuad(clamp01((t - LEAP) / (PUSH - LEAP - 0.05))) } };
  return { card: 'OF1', at: O_AT };
};
/** Seconds into the throw (0 until the hit-stop ends). */
export const throwT = (t: number): number => Math.max(0, t - THROW_AT);
/** Blue: braced (BB1) until the hit-stop ends, then airborne (BF2) and thrown right at a steady 17.5 units a second (no
 *  ease: a readable flight, not a blur), rising a little and falling. */
const blueAt = (t: number): { card: string; at: Placement; dx: number; dy: number } => {
  const x = t >= PUSH ? BX_PUSH : BX;
  if (t < THROW_AT) return { card: 'BB1', at: { ...B_AT, x }, dx: 0, dy: 0 };
  const u = throwT(t);
  return { card: 'BF2', at: { x, height: 5.2, z: 0, feet: FLOOR_Y + 0.4 }, dx: 17.5 * u, dy: 1.6 * Math.sin(Math.PI * Math.min(1, u / 0.5)) };
};

const rawPose = (t: number): CameraPose => {
  const s = shotAt(t);
  const u = t - s.t;
  const k = clamp01(u / (nextT(s) - s.t));
  switch (s.id) {
    case 'git': {
      // a low two-shot, close enough that each girl is about two thirds of the frame height, drifting in; the punch on GIT!
      const p = cam(lerp3([0, -2.0, 10.9], [0.3, -1.8, 10.3], k), [0, -0.1, 0], 44);
      const punch = t >= GIT ? 0.1 * (1 - outQuad(clamp01((t - GIT) * 4))) : 0;
      return jolt({ ...p, fov: p.fov * (1 - punch) }, t, 0.12);
    }
    case 'charge':
    case 'charge-2':
      return jolt(chargePose(t), t, 0.08);
    case 'sees':
      // her face, cold blue: a slow push while she reads what is coming
      return cam([0.6, 0.15 + 0.1 * k, 12.4 - 1.0 * k], [0.6, 0.15, 0], 40);
    case 'push': {
      // one wide shot holding both; the camera whips a little after the wave once it reaches her (it follows, but she
      // outruns it: by the middle of the shot she is out of frame right, so the framing guard does not hold her)
      // close enough that both are about two thirds of the frame height at the hit (orange may lose her soles)
      const w = outQuad(clamp01((t - THROW_AT) / 0.25));
      const p = cam([0.6 + 0.2 * w, -1.5, 10.5], [0.5 + 0.4 * w, -0.5, 0], 46, -0.04 * w);
      // the hit: a hard 3-frame shake on top of the jolt
      if (t >= HIT && t < HIT + 3 / 60) {
        const r = seeded(`push-hit:${Math.round(t * 60)}`);
        return { ...p, position: [p.position[0] + r.range(-0.35, 0.35), p.position[1] + r.range(-0.25, 0.25), p.position[2]], roll: r.range(-0.03, 0.03) };
      }
      return jolt(p, t, 0.16);
    }
    case 'force':
      return jolt(cam([0.8 - 0.8 * k, -3.0, 9.6], [-0.6, 0.9, 0], 48), t, 0.1);
  }
};

const rawPushStateAt = (t: number): ShotState => {
  const s = shotAt(t);
  const subjects: Subject[] = [];
  if (s.id === 'sees') {
    subjects.push({ card: 'BMX1', at: faceSized('BMX1', 0.6, false, 2.7, 0.6), ground: false });
  } else {
    const o = orangeAt(t);
    subjects.push({ card: o.card, at: o.at, ...(o.card === 'OF2' ? { ground: false as const } : {}) });
    // blue is held only in the GIT! two-shot: the charge pushes in on orange (blue slides off the edge) and in the
    // PUSH! shot she is thrown out of frame; there she is drawn, never held (pushStateAt adds her as an extra)
    if (s.id === 'git') {
      const b = blueAt(t);
      subjects.push({ card: b.card, at: b.at });
    }
  }
  return { pose: rawPose(t), shot: `push-${s.id}`, subjects };
};

// the live camera on top (Ken Burns, shake, framing guard); its subjects are the girls whose faces the authored camera
// shows at the middle of each shot, so blue thrown out of frame is drawn but not held (an extra) in the PUSH! shot
const live = liveCamera(rawPushStateAt, (t) => {
  const s = shotAt(t);
  // each side of the cut-in is its own span (the middle of one span over both fell in the cut-in, where blue's face
  // made her a subject of the push toward orange); the same key keeps the Ken Burns direction
  return { t0: s.t, t1: nextT(s), key: s.id === 'charge-2' ? 'push-charge' : `push-${s.id}` };
});
/** What the shot shows at t: the live camera's state, with blue in the charge and the PUSH! shot as an extra (drawn,
 *  not held in frame: the charge pushes in on orange, and the wave throws blue out of frame right). */
export const pushStateAt = (t: number): ShotState => {
  const st = live.stateAt(t);
  const id = shotAt(t).id;
  if (id !== 'push' && id !== 'charge' && id !== 'charge-2') return st;
  const b = blueAt(t);
  return { ...st, extras: [...(st.extras ?? []), { card: b.card, at: b.at, dx: b.dx, dy: b.dy, ...(b.card === 'BF2' ? { ground: false as const } : {}) }] };
};

/** The whisper's dissolve cover starts two frames before 125.36, inside this span (the rest family draws the rest). */
const OUT: TransitionSpec = { id: 'r-tr-whisper', kind: 'dissolve', at: PUSH_END, pre: 2 / 60, post: 4 / 60, colors: ['#2a3a6a', '#4a5a8a'] };

const ORANGE_METAL: Grade = metalGrade(GRADES.mainline, 1);
/** Blue in her own colours (black leather, deep blue hair, steel): a light pull toward her blue, a cold rim and a cold
 *  fill on the rim side, never the metal (red) grade. A full tint toward the hue washed her into a pale ghost. */
const BLUE_OWN: Grade = { hue: '#1a5cff', rival: '#3a9cff', amount: 0.06, rim: 1.1, stage: 1 };
const ORANGE_LIGHT: CardLight = { key: '#ff6a1a', keyAmt: 0.45, rim: 1.3 };
const BLUE_LIGHT: CardLight = { key: '#6aa8ff', keyAmt: 0.15, rim: 1.0 };
const BLUE_RIM: Hex = '#3a9cff';
/** The hit: blue's silhouette alone flashes cold white over the hit-stop (not the frame: the flash rule). */
const hitFlash = (t: number): number => (t >= HIT && t < THROW_AT ? 0.85 * (1 - (t - HIT) / STOP) + 0.15 : 0);

/** The charge grows bar by bar (0 at the charge's start, 1 on PUSH!). */
const chargeK = (t: number): number => {
  const n = beats.filter((x) => x >= CHARGE - 0.02 && x <= t).length;
  const total = beats.filter((x) => x >= CHARGE - 0.02 && x < PUSH).length;
  return clamp01(n / Math.max(1, total));
};
/** The floor cracks from orange's feet toward blue, seeded zigzags. */
const CRACKS: Vec3[][] = [-1.2, 0.2, 1.4].map((z, i) => {
  const r = seeded(`push-crack:${i}`);
  return Array.from({ length: 9 }, (_, j) => [OX + 0.6 + (j / 8) * (BX - OX - 1.2), FLOOR_Y + 0.03, z + r.range(-0.5, 0.5) * (j > 0 && j < 8 ? 1 : 0)] as Vec3);
});

/** The ring of the smash on the floor at t: its radius in world units (from orange's fists), 0 when not running. */
export const ringR = (t: number): number => {
  const u = t - PUSH - 2 / 60;
  if (u < 0) return 0;
  const reach = BX_PUSH - OX;
  // it reaches blue's soles at HIT, then runs on and out
  return reach * (u / (HIT - PUSH - 2 / 60)) ** 0.85;
};

export const PushShot = ({ frame }: { frame: number }) => {
  const t = sec(frame);
  const layer = useLayer();
  const s = shotAt(t);
  const pose = live.poseAt(t);
  const ck = s.id === 'git' ? 0 : chargeK(t);
  // the PUSH! shot's girls and ring run on its own clock, frozen through the hit-stop
  const tf = s.id === 'push' ? frozen(t) : t;
  const o = orangeAt(tf);
  const b = blueAt(t < THROW_AT ? tf : t);
  const bursts: Burst[] = ([
    { t: GIT, origin: [OX, 0, 0.5] },
    { t: PUSH, origin: [OX, FLOOR_Y + 0.5, 0.5] },
    { t: THROW_AT, origin: [BX_PUSH, FLOOR_Y + 0.6, 0.5] },
    { t: THROW_AT + 0.1, origin: [BX_PUSH + 2.5, FLOOR_Y + 1.2, 0.5] },
    { t: FORCE, origin: [-1.8, 1.5, 0] },
  ] as Burst[]).filter((x) => t >= x.t && t - x.t < 1.2);
  const world =
    s.id === 'sees' ? (
      <InsertWorld t={t} color="#1e6bff" hit={SEES} />
    ) : (
      <>
        {/* the back walls: fire on orange's half, cold blue on blue's */}
        <LedWall position={[-9, 2.6, -11]} width={18} height={14} cols={36} rows={28} colors={['#3a0e04', '#ff5a14']} pattern="scan" pulse={0.3 + 0.5 * ck} t={t} />
        <LedWall position={[9, 2.6, -11]} width={18} height={14} cols={36} rows={28} colors={['#040c2a', '#2f6bff']} pattern="bars" pulse={0.25} t={t * 0.5} />
        <FireWall x0={-15} x1={-1.5} z={-6} height={4 + 3 * ck} rise={1} colors={['#ff3a10', '#ffd040']} t={t} />
        <Smoke y={FLOOR_Y + 1.2} z={-5} width={14} height={4} color="#1a3a8a" density={0.5} t={t} />
        <TilePlatform position={[0, FLOOR_Y, -2]} width={32} depth={16} cols={32} rows={16} splitX={0} left="#ff5a14" right="#1e5bff" t={t} pulse={0.3 + 0.4 * ck} erupt={t >= PUSH && t < PUSH + 0.8 ? [{ t: PUSH, x: OX, z: 0 }] : []} />
        <BeamCone from={[-6, 8, -2]} to={[OX, FLOOR_Y, 0]} radius={3.2} color="#ff7a1a" intensity={0.5 + 0.3 * ck} />
        <BeamCone from={[6, 8, -2]} to={[BX, FLOOR_Y, 0]} radius={3.2} color="#3a7bff" intensity={0.55} />
        {/* the cracks race from her feet toward blue, a step on every beat of the charge */}
        {ck > 0 && t < PUSH + 0.5 && CRACKS.map((p, i) => <NeonTube key={i} points={p} color="#ffb040" radius={0.05} on={clamp01(ck * 1.08 - i * 0.04)} />)}
        {/* the power gathering in her fists */}
        {t < PUSH && <Halo position={[OX + 0.2, FLOOR_Y + (t >= LEAP ? 4.6 + 2.4 * outQuad(clamp01((t - LEAP) / (PUSH - LEAP))) : 3.3), 0.6]} size={1.2 + 3.2 * Math.max(ck, s.id === 'git' ? 0.15 * clamp01((t - PUSH_START) / 1.3) : 0)} color="#ffb040" intensity={0.7 + 0.6 * ck} />}
        <Embers box={[-14, -0.5, FLOOR_Y, 6, -6, 3]} count={200} t={t} color="#ffa040" bursts={bursts.filter((x) => x.origin[0] < 0).map((x) => ({ t: x.t, origin: x.origin as Vec3 }))} />
        <Embers box={[0.5, 14, FLOOR_Y, 6, -6, 3]} count={140} t={t + 5} color="#9ac8ff" bursts={bursts.filter((x) => x.origin[0] > 0).map((x) => ({ t: x.t, origin: x.origin as Vec3 }))} />
      </>
    );
  const girls =
    s.id === 'sees' ? (
      <Card id="BMX1" t={t} grade={BLUE_OWN} {...faceSized('BMX1', 0.6, false, 2.7, 0.6)} rimDir={[1, 0.3]} rival={BLUE_RIM} light={BLUE_LIGHT} ground={false} />
    ) : (
      <>
        <Card key={o.card} id={o.card} t={tf} grade={ORANGE_METAL} {...o.at} rimDir={[-1, 0.3]} rival="#19c8ff" light={ORANGE_LIGHT} ground={o.card === 'OF2' ? false : undefined} />
        {s.id !== 'force' && <Card key={b.card} id={b.card} t={tf} grade={BLUE_OWN} {...b.at} dx={b.dx} dy={b.dy} rimDir={[1, 0.3]} rival={BLUE_RIM} light={BLUE_LIGHT} ground={b.card === 'BF2' ? false : undefined} flat={{ color: '#eaf6ff', mix: hitFlash(t) }} />}
      </>
    );
  // the ring on the floor, projected through the frame's camera (a circle about her fists)
  const r = s.id === 'push' ? ringR(tf) : 0;
  const ring = (rad: number, w: number, a: number) => {
    const pts = Array.from({ length: 49 }, (_, i) => {
      const th = (i / 48) * Math.PI * 2;
      const p = project(pose, [OX + rad * Math.cos(th), FLOOR_Y + 0.02, rad * Math.sin(th) * 0.9]);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    return <polyline points={pts.join(' ')} fill="none" stroke="#ffe0b0" strokeWidth={w} opacity={a} strokeLinejoin="round" />;
  };
  const ringFade = clamp01(1 - (t - THROW_AT - 0.15) / 0.3);
  return (
    <AbsoluteFill style={{ background: useShotBackground() }}>
      <Stage pose={pose}>
        {world}
        <Field t={t} grade={ORANGE_METAL} layer="back" density={0.6} hueMix={0.4} metal={1} dust={false} bursts={bursts} />
        {girls}
        <Field t={t} grade={BLUE_OWN} layer="front" density={0.4} hueMix={0.4} metal={1} dust={false} bursts={bursts} />
      </Stage>
      <Svg>
        <FormDefs />
        {r > 0 && ringFade > 0 && (
          <g>
            {ring(r, 26, ringFade)}
            {r > 1 && ring(r * 0.86, 12, 0.6 * ringFade)}
          </g>
        )}
        {/* the throw: speed streaks behind her (left of her card, never over her), she herself never fades */}
        {s.id === 'push' && throwT(t) > 0 && (() => {
          const bx = screenBox(pose, { card: b.card, at: b.at, dx: b.dx, dy: b.dy }, [0, 0.15, 1, 0.9]);
          const len = 180 + 600 * Math.min(1, throwT(t) / 0.15);
          return [0.05, 0.22, 0.4, 0.58, 0.76, 0.92].map((v, i) => {
            const y = bx.y0 + v * (bx.y1 - bx.y0);
            const x1 = bx.x0 - 16 - (i % 2) * 40;
            return <line key={i} x1={x1} y1={y} x2={x1 - len * (0.7 + 0.3 * ((i * 7) % 3) / 2)} y2={y} stroke="#d8ecff" strokeWidth={10 - i} strokeLinecap="round" opacity={0.75} />;
          });
        })()}
        {layer !== 'type' && (() => {
          const [a0, a1] = transitionWindow(OUT);
          return t >= a0 && t < a1 ? <SceneTransition spec={OUT} t={t} /> : null;
        })()}
        {/* the type last: no effect drawn over a settled form (round 7d) */}
        {t >= GIT && t < CHARGE && <Slam spec={{ text: 'GIT!', t0: GIT, t1: CHARGE - 0.02, x: 960, y: 230, size: 260, color: '#ff2a14', face: 'metalmania', rot: -3 }} t={t} />}
        {/* PUSH! in steel like FORCE! (the red extrude's P sank into the fire wall and read "rUSH"), low on the floor
            between them where the ring runs: at this distance both heads fill the top of the frame */}
        {t >= PUSH && t < FORCE && <Shout spec={{ id: 'p-push-s', text: 'PUSH!', at: PUSH, until: FORCE, style: 'steel', color: '#ff2a14', cx: 1000, cy: 880, w: 860, rot: -3 }} t={t} />}
        {t >= FORCE && <Shout spec={{ id: 'p-force-s', text: 'FORCE!', at: FORCE, until: PUSH_END, style: 'steel', color: '#ff2a14', cx: 1320, cy: 330, w: 860, rot: -4 }} t={t} />}
        <GitHud t={t} t0={GIT + 0.25} t1={PUSH - 0.6} until={PUSH} />
      </Svg>
    </AbsoluteFill>
  );
};

