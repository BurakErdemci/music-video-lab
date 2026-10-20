// Scene 2 part 2, the riff fight (S13-S19): the rubber backstab and the grab, the throw into the gallery, the slam
// shockwave, the gold explosion and the wing gust, four charge-up panels and the combo, the dagger flurry, the swat
// and the combined strike that finally sticks.
import { AbsoluteFill } from 'remotion';
import { anglesFromDir, handheld, sequence, tween, whip, whipBlur, MED, WIDE, type CameraPose } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { Shards, SpeedLines } from '../../vfx/effects.ts';
import { at } from './events.ts';
import { Glint, Panel, slamIn, type Impact } from './fx.tsx';
import { HeroImg, type HeroKind, type HeroPose } from './heroes.tsx';
import { count, GOLD, INK, IVORY, lerp, outCubic, prog, project, two, VIOLET } from './kit.tsx';
import { bob, PaintingShot } from './paint.tsx';
import { GoldBlast, Inked, KoStars, Overlay, Puffs, Sigil, Slash, Sweat } from './props.tsx';
import { chest, FAN, flight, Party, type HeroTrack } from './riff.tsx';
import { echoesAt, ramp, rigFk, rigFor, rigWorld, Vorathul, type Timeline } from './vorathul.tsx';
import { inkFilterDef, Pic, SvgCard, svgDoc } from './kit.tsx';
import { RO, World } from './world.tsx';
import { ImpactBurst } from '../../vfx/effects.ts';

/**
 * A comic inset of a hero action that is too small in the wide (S17 panel style): slams in, holds, flies off.
 * `heroes` are drawn in panel pixels; the burst lands on `hitAt` at `hit` (frame px, clipped to the panel).
 */
const ActionInset = ({ frame, from, until, hitAt, hit, pts, bg, lines, heroes, children }: {
  frame: number; from: number; until: number; hitAt: number; hit: [number, number]; pts: [number, number][]; bg: string; lines: string;
  heroes: { kind: HeroKind; pose: HeroPose; x: number; y: number; size: number; flip?: boolean }[]; children?: React.ReactNode;
}) => {
  if (frame < from || frame >= until) return null;
  const f2 = two(frame);
  const out = prog(frame, until - 4, 4);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Panel pts={pts} slam={slamIn(frame, from)} border={14}>
        <AbsoluteFill style={{ background: bg }} />
        <SpeedLines mode="radial" frame={f2 - from} duration={400} seed={hitAt} focus={hit} inner={120} count={48} thickness={46} color={lines} />
        {heroes.map((h, i) => <HeroImg key={i} kind={h.kind} pose={h.pose} size={h.size} flip={h.flip} style={{ left: h.x - h.size / 2, top: h.y - h.size * 0.85 }} />)}
        {children}
        <ImpactBurst frame={f2 - hitAt} duration={8} seed={hitAt + 7} x={hit[0]} y={hit[1]} size={150} flash={0} />
      </Panel>
    </AbsoluteFill>
  );
};

const REST = { ...FAN, wings: [null, 6], armL: [-25, 70, 0, 'fist'] } as const;

// ---------------------------------------------------------------------------------------------------------------
// S13 - the backstab bends the dagger; the helm turns; the gauntlet grabs the rogue by the hood; wind-up
// ---------------------------------------------------------------------------------------------------------------

const S13_STAB = at('s13-backstab');
const S13_TURN = at('s13-head-turn');
const S13_GRAB = at('s13-grab');
const S13_WIND = at('s13-windup');
const GRAB = { ...REST, armL: [100, 75, 15, 'clutch'], torso: -5, lean: -3, head: [-12, 0] } as const;
const WIND = { ...REST, armL: [155, 35, 0, 'clutch'], torso: -9, lean: -5, head: [-8, 0], wings: [null, 12] } as const;
const S13_TL: Timeline = {
  keys: [
    { at: 0, pose: REST as never, dur: 0 },
    { at: S13_TURN, pose: { ...REST, head: [-12, 0] } as never, dur: 14 },
    { at: S13_GRAB, pose: GRAB as never, dur: 12, ease: 'strike', hands: 'instant', impact: true },
    { at: S13_WIND, pose: WIND as never, dur: 16 },
  ],
};
const S13_CAM = handheld(tween({ position: [5.4, 4.2, -6], target: [0.8, 7.2, -15] }, { position: [5, 4.6, -7], target: [1.2, 7.8, -15] }, { start: S13_STAB, frames: 67 }), { amp: 0.04, seed: 's13' });
/** Freeze-hold of 4 frames on the grab (storyboard ladder): everything but the shake holds. */
const held = (f: number) => (f >= S13_GRAB && f < S13_GRAB + 4 ? S13_GRAB : f);

const S13 = ({ frame }: { frame: number }) => {
  const fa = held(frame);
  const st = rigFor(S13_TL, fa);
  const fk = rigFk(st);
  const hand = rigWorld(st, fk, 'hand_L', [0, -0.03]);
  const stab: Vec3 = [2.2, 4.8, -12.2];
  const grabbed = fa >= S13_GRAB;
  const rogue: HeroTrack = grabbed ? { kind: 'rogue', pose: 'dangle', p: [hand[0] + 0.1, hand[1] - 1.0, hand[2] + 1.2], centre: true, rot: Math.sin(fa * 0.3) * 6 } : { kind: 'rogue', pose: fa < S13_STAB + 6 ? 'attack' : 'fly', p: [stab[0] + 0.55, stab[1] - 0.1, stab[2] + 0.6], centre: true, flip: true, rot: fa < S13_STAB + 6 ? 0 : -10 };
  const heroes: HeroTrack[] = [
    rogue,
    { kind: 'knight', pose: 'ready', p: [-4.8, 0, -10.4] },
    { kind: 'mage', pose: 'ready', p: [5.8, 0, -9.2], flip: true },
    { kind: 'archer', pose: 'ready', p: [8.5, 0, -11.4], flip: true },
  ];
  const impacts: Impact[] = [
    { at: S13_STAB, size: 'small', point: stab, splash: null, burst: false, lines: null },
    { at: S13_GRAB, size: 'medium', point: hand, splash: 'violet' },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S13_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} near={false} />
          <Vorathul state={st} frame={fa} echoes={echoesAt(S13_TL, fa, [S13_GRAB], { frames: 6 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(fa);
        const p = project(pose, stab);
        const bend = outCubic(prog(f2, S13_STAB, 8));
        const head = project(pose, [rogue.p[0], rogue.p[1] + 0.7, rogue.p[2]]);
        return (
          <Overlay>
            {/* the dagger bends like rubber against the armour */}
            {!grabbed ? (
              <Inked seed={1301}>
                <path d={`M${p.x + p.s * 0.55} ${p.y + p.s * 0.1}Q${p.x + p.s * (0.1 + 0.2 * bend)} ${p.y - p.s * 0.05 * bend} ${p.x + p.s * (0.05 + 0.25 * bend)} ${p.y + p.s * (0.02 + 0.45 * bend)}`} fill="none" stroke={GOLD} strokeWidth={p.s * 0.09} strokeLinecap="round" />
              </Inked>
            ) : null}
            {f2 >= S13_STAB + 8 && f2 < S13_GRAB ? <Sweat c={[head.x, head.y]} s={head.s * 0.7} t={(f2 - S13_STAB - 8) % 20} /> : null}
          </Overlay>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S14 - the throw into the gallery (whip-pan out and back); the double attack bounces off
// ---------------------------------------------------------------------------------------------------------------

const S14_THROW = at('s14-throw');
const S14_DUCK = at('s14-duck');
const S14_DBL = at('s14-double');
const THROW = { ...REST, armL: [35, 10, 0, 'open'], torso: 8, lean: 5, head: [6, 0], wings: [null, -10] } as const;
const S14_TL: Timeline = {
  keys: [
    { at: 0, pose: WIND as never, dur: 0 },
    { at: S14_THROW, pose: THROW as never, dur: 12, ease: 'strike', hands: 'instant', impact: true },
    { at: S14_THROW + 30, pose: REST as never, dur: 18 },
    { at: at('s14-pose'), pose: { ...REST, armR: [-25, 75, 0, 'grip'], torso: 2, head: [4, 0], wings: [null, 10] } as never, dur: 14 },
    { at: at('s14-pose') + 18, pose: 'slam_antic', dur: 18 },
  ],
};
const GALLERY_HIT: Vec3 = [27, 22.4, -29.4];
// High in the left gallery, looking down across the nave; the whip turns from him to the crowd he throws the
// rogue into on the far side, and back. The whip angles are measured from the two look directions.
const WIDE_A: CameraPose = { position: [-23, 17, -22], target: [0, 4.5, -13.5], fov: 44 };
const lookAngles = (from: Vec3, to: Vec3) => anglesFromDir([to[0] - from[0], to[1] - from[1], to[2] - from[2]]);
const S14_A = lookAngles(WIDE_A.position, WIDE_A.target);
const S14_B = lookAngles(WIDE_A.position, GALLERY_HIT);
const S14_YAW = S14_B.yaw - S14_A.yaw;
const S14_PITCH = S14_B.pitch - S14_A.pitch;
const S14_CAM = handheld(
  sequence([
    { from: 0, path: whip(WIDE_A, { start: S14_THROW + 3, yaw: S14_YAW, pitch: S14_PITCH, frames: 7 }) },
    { from: S14_DUCK + 6, path: whip(whip(WIDE_A, { start: 0, yaw: S14_YAW, pitch: S14_PITCH, frames: 1 })(1), { start: S14_DUCK + 6, yaw: -S14_YAW, pitch: -S14_PITCH, frames: 7 }) },
  ]),
  { amp: 0.05, seed: 's14' },
);

const S14 = ({ frame }: { frame: number }) => {
  const st = rigFor(S14_TL, frame);
  const fk = rigFk(st);
  const release = rigWorld(rigFor(S14_TL, S14_THROW), rigFk(rigFor(S14_TL, S14_THROW)), 'hand_L', [0, -0.03]);
  const c = chest(st, fk);
  const rogue = flight('rogue', frame, S14_THROW, S14_DUCK - 2 - S14_THROW, [release[0], release[1] - 1, release[2] + 1.2], GALLERY_HIT, 6, { kind: 'rogue', pose: 'dangle', p: [release[0], release[1] - 1, release[2] + 1.2], centre: true }, null);
  const knight = frame < S14_DBL - 10 ? { kind: 'knight' as HeroKind, pose: 'ready' as HeroPose, p: [-4.8, 0, -10.4] as Vec3 } : frame < S14_DBL + 2 ? { kind: 'knight' as HeroKind, pose: 'attack' as HeroPose, p: [lerp(-4.8, -1.8, prog(frame, S14_DBL - 10, 10)), 0.8 + 0.6 * Math.sin(prog(frame, S14_DBL - 10, 12) * Math.PI), -12.4] as Vec3, centre: true } : flight('knight', frame, S14_DBL + 2, 16, [-1.8, 0.8, -12.4], [-5.4, 0.35, -10.6], 1.3, { kind: 'knight', pose: 'attack', p: [-1.8, 0.8, -12.4], centre: true }, 'ready');
  const heroes: HeroTrack[] = [
    rogue,
    knight,
    { kind: 'mage', pose: 'ready', p: [5.8, 0, -9.2], flip: true },
    { kind: 'archer', pose: frame >= S14_DBL - 10 && frame < S14_DBL + 4 ? 'attack' : 'ready', p: [8.2, 0, -10.8], flip: true },
  ];
  const duck = frame < S14_DUCK - 2 ? 0 : frame < S14_DUCK + 20 ? outCubic(prog(frame, S14_DUCK - 2, 4)) : 1 - prog(frame, S14_DUCK + 20, 10);
  const impacts: Impact[] = [
    { at: S14_THROW, size: 'big', point: release, splash: 'violet', lines: null },
    { at: S14_DUCK, size: 'medium', point: GALLERY_HIT, splash: 'black', scale: 1.4 },
    { at: S14_DBL, size: 'medium', point: c, splash: null },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S14_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} duck={duck} />
          <Vorathul state={st} frame={frame} echoes={echoesAt(S14_TL, frame, [S14_THROW], { frames: 7 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const blur = Math.max(whipBlur(frame, S14_THROW + 3, 7), whipBlur(frame, S14_DUCK + 6, 7));
        const g = project(pose, GALLERY_HIT);
        return (
          <>
            {blur > 0.2 ? <SpeedLines mode="parallel" frame={f2} duration={9999} seed={1401} angle={frame < S14_DUCK ? Math.PI : 0} count={Math.round(60 * blur)} thickness={60} speed={80} /> : null}
            <Overlay>
              <Puffs c={[g.x, g.y]} s={g.s * 2.2} age={f2 - S14_DUCK} count={7} seed={1402} life={30} />
              {f2 >= S14_DUCK + 4 && f2 < S14_DUCK + 26 ? <KoStars c={[g.x, g.y - g.s * 1.2]} s={g.s * 1.4} f={f2} /> : null}
            </Overlay>
            {/* the double attack, too small from the gallery: a comic inset of knight and archer hitting him together */}
            <ActionInset
              frame={frame} from={S14_DBL - 8} until={S14_DBL + 16} hitAt={S14_DBL} hit={[1150, 560]} bg={IVORY} lines={GOLD}
              pts={[[1060, 400], [1880, 360], [1880, 810], [1040, 840]]}
              heroes={[
                { kind: 'knight', pose: frame < S14_DBL + 2 ? 'attack' : 'fly', x: 1330 + 60 * prog(frame, S14_DBL - 8, 8), y: 810, size: 560, flip: true },
                { kind: 'archer', pose: 'attack', x: 1700, y: 800, size: 520, flip: true },
              ]}
            >
              <Overlay>
                <path d="M1040 360L1150 360L1120 500L1190 660L1110 840L1040 840Z" fill={INK} />
              </Overlay>
            </ActionInset>
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S15 - the sword slam: floor shockwave and debris; heroes fly at the lens and wrap round the near banners;
//       the mage begins a sigil circle
// ---------------------------------------------------------------------------------------------------------------

const S15_SLAM = at('s15-slam');
const S15_PAST = at('s15-fly-past');
const S15_BAN = at('s15-banners');
const S15_SIG = at('s15-sigil');
const S15_TL: Timeline = {
  keys: [
    { at: 0, pose: 'slam_antic', dur: 0 },
    { at: S15_SLAM, pose: 'slam_strike', dur: 12, ease: 'strike', hands: 'instant', impact: true },
    { at: S15_SLAM + 16, pose: 'slam_follow', dur: 16 },
    { at: S15_SIG + 14, pose: { ...REST, torso: 3, head: [-6, 0.01], wings: [null, 4] } as never, dur: 24 },
  ],
};
const S15_CAM = handheld(tween({ position: [0, 1.05, 1.5], target: [0, 2.2, -10] }, { position: [0.4, 0.95, 0.8], target: [0.2, 2.4, -10] }, { start: S15_SLAM, frames: 78 }), { amp: 0.04, seed: 's15' });
const BANNER_NEAR: Vec3[] = [[-2.5, 3.9, -2.6], [2.5, 3.9, -2.6]];

const S15_BANNER_SVG = (() => {
  const body = `<path d="M150 0 L150 1100" stroke="#0A0A0A" stroke-width="14"/><path d="M50 110 L250 110 L250 820 L215 760 L190 850 L150 780 L112 860 L85 770 L50 830 Z" fill="#E2B33C" stroke="#0A0A0A" stroke-width="10"/><circle cx="150" cy="420" r="40" fill="#F4ECD8"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="1100" viewBox="0 0 300 1100">${body}</svg>`;
})();

const S15 = ({ frame }: { frame: number }) => {
  const st = rigFor(S15_TL, frame);
  const slamSt = rigFor(S15_TL, S15_SLAM);
  const tip = rigWorld(slamSt, rigFk(slamSt), 'sword', [0, -0.6]);
  const ground: Vec3 = [tip[0], 0.05, tip[2] + 0.5];
  const toLens = (kind: HeroKind, k: number, start: Vec3, side: number): HeroTrack => {
    if (frame < S15_SLAM) return { kind, pose: 'ready', p: [start[0], 0, start[2]], flip: side > 0 };
    if (frame < S15_PAST) return { kind, pose: 'fly', p: [lerp(start[0], side * (0.9 + k * 0.4), outCubic(prog(frame, S15_SLAM, 20))), lerp(0.6, 1.2 + k * 0.3, prog(frame, S15_SLAM, 20)), lerp(start[2], -3.4 - k * 0.3, prog(frame, S15_SLAM, 20))], rot: -side * 360 * prog(frame, S15_SLAM, 20), centre: true, flip: side > 0 };
    const b = BANNER_NEAR[side < 0 ? 0 : 1] as Vec3;
    if (frame < S15_BAN) return { kind, pose: 'fly', p: [lerp(side * (0.9 + k * 0.4), b[0], prog(frame, S15_PAST, S15_BAN - S15_PAST)), lerp(1.2 + k * 0.3, b[1] - 1.2 - k * 0.6, prog(frame, S15_PAST, S15_BAN - S15_PAST)), lerp(-3.4 - k * 0.3, b[2] + 0.05, prog(frame, S15_PAST, S15_BAN - S15_PAST))], rot: -side * (360 + 180 * prog(frame, S15_PAST, 19)), centre: true, flip: side > 0 };
    return { kind, pose: 'ko', p: [b[0] + side * 0.1, b[1] - 1.2 - k * 0.6 - 0.25 * prog(frame, S15_BAN, 30), b[2] + 0.05], rot: side * (70 + 15 * k), centre: true, flip: side > 0 };
  };
  const heroes: HeroTrack[] = [
    toLens('knight', 0, [-3.6, 0, -10.6], -1),
    toLens('archer', 0, [3.2, 0, -10.8], 1),
    toLens('rogue', 1, [-2.2, 0, -11.4], -1),
    { kind: 'mage', pose: frame >= S15_SIG ? 'charge' : 'ready', p: [5.2, 0, -12.5], flip: true },
  ];
  const bt = frame - S15_BAN;
  const sway = bt < 0 ? 0 : 14 * Math.exp(-bt / 16) * Math.sin(bt * 0.35);
  const impacts: Impact[] = [
    { at: S15_SLAM, size: 'big', sil: true, point: ground, splash: 'violet', scale: 1.3 },
    { at: S15_BAN, size: 'medium', point: BANNER_NEAR[0] as Vec3, splash: null },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S15_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} near={false} />
          <Vorathul state={st} frame={frame} echoes={echoesAt(S15_TL, frame, [S15_SLAM], { frames: 7 })} />
          {BANNER_NEAR.map((b, i) => (
            <Pic key={i} id={`G08-${i + 1}`} color={GOLD} svg={S15_BANNER_SVG} width={1.1} height={4.0} pivot={[0, 2]} position={[b[0], b[1] + 2, b[2]]} rotation={[0, 0, ((i ? -1 : 1) * sway * Math.PI) / 180]} renderOrder={420} flat={sil ? INK : null} />
          ))}
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const age = f2 - S15_SLAM;
        // shockwave: an ivory ring on the floor plane, projected
        const ring = age >= 0 && age < 22 ? Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          const r = 0.5 + 12 * outCubic(age / 22);
          const q = project(pose, [ground[0] + Math.cos(a) * r, 0.02, ground[2] + Math.sin(a) * r]);
          return `${q.z > 0.3 ? q.x.toFixed(0) : 0} ${q.y.toFixed(0)}`;
        }) : null;
        const g = project(pose, ground);
        const sig = project(pose, [0, 0.02, -14]);
        const sigE = project(pose, [5, 0.02, -14]);
        return (
          <>
            <Overlay>
              {ring ? <path d={`M${ring.join('L')}Z`} fill="none" stroke={IVORY} strokeWidth={lerp(26, 4, age / 22)} opacity={1 - age / 22} /> : null}
              <Sigil c={[sig.x, sig.y]} rx={Math.abs(sigE.x - sig.x)} ry={Math.abs(sigE.x - sig.x) * 0.16} p={prog(f2, S15_SIG, 18)} f={f2} seed={1501} />
            </Overlay>
            <Shards frame={age} duration={30} seed={1502} origin={[g.x, g.y]} count={34} size={g.s * 0.5} speed={g.s * 0.55} direction={-Math.PI / 2} spread={Math.PI * 1.2} gravity={2.2} fills={[GOLD, GOLD, IVORY]} />
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S16 - the sigil detonates on him: smoke clears, unharmed; one wing flap blows the smoke and the heroes back
// ---------------------------------------------------------------------------------------------------------------

const S16_EXP = at('s16-explosion');
const S16_CLEAR = at('s16-clear');
const S16_GUST = at('s16-gust');
const S16_SWEAT = at('s16-sweat');
const S16_TL: Timeline = {
  keys: [
    { at: 0, pose: { ...REST, torso: 3, head: [-6, 0.01], wings: [null, 4] } as never, dur: 0 },
    { at: S16_CLEAR + 4, pose: { ...REST, head: [6, 0], torso: -2, armL: [10, 60, 0, 'open'] } as never, dur: 14 },
    { at: S16_GUST, pose: { ...REST, wings: [null, -25], torso: 6, lean: 0, head: [0, 0] } as never, dur: 12, ease: 'strike', impact: true },
    { at: S16_GUST + 16, pose: { ...REST, wings: [null, 12] } as never, dur: 14 },
  ],
  ramps: { wingS_R: ramp([S16_GUST - 6, 0.5, 8], [S16_GUST, 1, 5]), wingS_L: ramp([S16_GUST - 6, 0.5, 8], [S16_GUST, 1, 5]) },
};
// A balcony view from the left gallery: the explosion, the smoke and the blown-back heroes read from above.
const S16_CAM = handheld(tween({ position: [-15, 15, 14], target: [0, 4.2, -13] }, { position: [-13.5, 14, 11], target: [0, 4.6, -13] }, { start: S16_EXP, frames: 77 }), { amp: 0.06, seed: 's16' });

const S16 = ({ frame }: { frame: number }) => {
  const st = rigFor(S16_TL, frame);
  const fk = rigFk(st);
  const c = chest(st, fk);
  const blown = (kind: HeroKind, p: Vec3, out: number, flip: boolean, k: number): HeroTrack => {
    if (frame < S16_GUST) return { kind, pose: kind === 'mage' && frame < S16_EXP ? 'attack' : 'ready', p, flip };
    const t = prog(frame, S16_GUST, 14);
    return { kind, pose: t < 1 ? 'fly' : 'sit', p: [p[0] + out * outCubic(t), (t < 1 ? 0.35 + 1.2 * Math.sin(t * Math.PI) : 0), p[2] + 1.2 * t], rot: t < 1 ? (out > 0 ? -1 : 1) * 200 * t : 0, centre: t < 1, flip };
  };
  const heroes: HeroTrack[] = [
    blown('knight', [-4.6, 0, -10.4], -4.5, false, 0),
    blown('rogue', [-6.8, 0, -11.6], -4, false, 1),
    blown('mage', [5.6, 0, -9.6], 4.5, true, 2),
    blown('archer', [8, 0, -11], 3.5, true, 3),
  ];
  const impacts: Impact[] = [
    { at: S16_EXP, size: 'big', sil: true, point: c, splash: null, burst: true, scale: 1.4 },
    { at: S16_GUST, size: 'medium', point: c, splash: null, burst: false, lines: null },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S16_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} echoes={echoesAt(S16_TL, frame, [S16_GUST], { frames: 6 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const p = project(pose, c);
        const smokeAge = f2 - S16_EXP;
        const clearing = f2 >= S16_CLEAR ? prog(f2, S16_CLEAR, 18) : 0;
        const gust = f2 >= S16_GUST ? prog(f2, S16_GUST, 16) : 0;
        return (
          <>
            <Overlay>
              <GoldBlast c={[p.x, p.y]} s={p.s * 4.5} age={smokeAge} seed={1601} />
              {smokeAge >= 4 && f2 < S16_GUST + 16 ? (
                <g transform={`translate(${p.x} ${p.y}) scale(${1 + gust * 2.4} ${1 - gust * 0.4}) translate(${-p.x} ${-p.y})`} opacity={(1 - clearing * 0.55) * (1 - gust)}>
                  <Puffs c={[p.x, p.y + p.s * 2]} s={p.s * 5} age={Math.min(smokeAge, 20)} count={10} seed={1602} life={40} spread={1.6} />
                </g>
              ) : null}
              {heroesHeads(heroes, pose).map(([x, y, s], i) => <Sweat key={i} c={[x, y]} s={s} t={f2 - S16_SWEAT - i * 2} />)}
            </Overlay>
            {f2 >= S16_GUST && f2 < S16_GUST + 12 ? (
              <>
                <SpeedLines mode="parallel" frame={f2 - S16_GUST} duration={12} seed={1603} angle={0} count={30} thickness={34} speed={60} />
                <SpeedLines mode="parallel" frame={f2 - S16_GUST} duration={12} seed={1604} angle={Math.PI} count={30} thickness={34} speed={60} />
              </>
            ) : null}
          </>
        );
      }}
    />
  );
};

const heroesHeads = (heroes: readonly HeroTrack[], pose: CameraPose): [number, number, number][] =>
  heroes.map((h) => {
    const q = project(pose, [h.p[0], h.p[1] + (h.centre ? 0.6 : 1.25), h.p[2]]);
    return [q.x, q.y, q.s * 0.6];
  });

// ---------------------------------------------------------------------------------------------------------------
// S17 - four charge-up panels, then the combo launches on full frame; insert: the eye slit narrows
// ---------------------------------------------------------------------------------------------------------------

const S17_PANELS = ['s17-panel-knight', 's17-panel-mage', 's17-panel-archer', 's17-panel-rogue'].map(at);
const S17_COMBO = at('s17-combo');
const S17_EYE = at('s17-eye-narrow');
const S17_TL: Timeline = {
  keys: [
    { at: 0, pose: { ...REST, wings: [null, 12] } as never, dur: 0 },
    { at: S17_COMBO + 8, pose: { ...FAN, torso: -4, lean: -2, head: [-3, 0], armL: [50, 100, 0, 'fist'] } as never, dur: 18 },
  ],
};
const S17_CAM = handheld(tween({ position: [0, 0.8, 16], target: [0, 7.2, -15], fov: 50 }, { position: [0, 0.9, 11], target: [0, 7.6, -15], fov: 50 }, { start: S17_PANELS[0] as number, frames: 125 }), { amp: 0.05, seed: 's17' });
const S17_KINDS: HeroKind[] = ['knight', 'mage', 'archer', 'rogue'];
const S17_LAYOUT: [number, number][][] = [
  [[40, 30], [930, 30], [880, 520], [40, 520]],
  [[990, 30], [1880, 30], [1880, 470], [940, 530]],
  [[40, 580], [870, 580], [830, 1050], [40, 1050]],
  [[930, 590], [1880, 530], [1880, 1050], [890, 1050]],
];
const S17_START: Vec3[] = [[-5.4, 0.7, -10.4], [5.6, 1.4, -9.4], [8.2, 1.1, -11], [-7, 0.6, -11.6]];

const S17 = ({ frame }: { frame: number }) => {
  const st = rigFor(S17_TL, frame);
  const fk = rigFk(st);
  const c = chest(st, fk);
  const f2 = two(frame);
  const n = count(frame, S17_PANELS);
  const launched = frame >= S17_COMBO;
  const heroes: HeroTrack[] = S17_KINDS.map((kind, i) => ({ kind, pose: launched ? 'attack' : 'charge', p: [(S17_START[i] as Vec3)[0], 0, (S17_START[i] as Vec3)[2]], flip: i === 1 || i === 2 }));
  const impacts: Impact[] = [
    { at: S17_PANELS[0] as number, size: 'small', point: { px: [480, 280] }, splash: null, burst: false, lines: null, push: false },
    { at: S17_PANELS[2] as number, size: 'small', point: { px: [460, 820] }, splash: null, burst: false, lines: null, push: false },
    { at: S17_COMBO, size: 'big', point: c, splash: null, burst: false, lines: 'radial' },
  ];
  const out = launched ? prog(frame, S17_COMBO, 5) : 0;
  return (
    <PaintingShot
      frame={frame} camera={S17_CAM} impacts={impacts} hud={launched}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const target = project(pose, c);
        return (
          <>
            {launched ? (
              <Overlay>
                {S17_START.map((s, i) => {
                  const a = project(pose, s);
                  const reach = outCubic(prog(f2, S17_COMBO, 46));
                  const ex = lerp(a.x, target.x, reach);
                  const ey = lerp(a.y, target.y, reach);
                  const mid: [number, number] = [lerp(a.x, ex, 0.5), lerp(a.y, ey, 0.5) - 120 * (1 - reach) * (i % 2 ? 1 : -1)];
                  return <Slash key={i} pts={[[a.x, a.y], mid, [ex, ey]]} width={a.s * (0.5 + 0.5 * reach)} color={GOLD} />;
                })}
                {f2 >= at('s17-combo-near') ? <circle cx={target.x} cy={target.y} r={target.s * (0.6 + 0.4 * Math.sin(f2))} fill={IVORY} stroke={GOLD} strokeWidth={target.s * 0.2} /> : null}
              </Overlay>
            ) : null}
            {S17_KINDS.map((kind, i) => {
              if (i >= n || out >= 1) return null;
              const hitAt = S17_PANELS[i] as number;
              const pts = S17_LAYOUT[i] as [number, number][];
              const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
              const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
              return (
                <AbsoluteFill key={kind} style={{ opacity: 1 - out, transform: `translate(${(cx - 960) * out * 0.6}px, ${(cy - 540) * out * 0.6}px)` }}>
                  <Panel pts={pts} slam={slamIn(frame, hitAt)} border={16}>
                    <AbsoluteFill style={{ background: i % 2 ? IVORY : GOLD }} />
                    <SpeedLines mode="radial" frame={f2 - hitAt} duration={400} seed={1700 + i} focus={[cx, cy + 40]} inner={150} count={50} thickness={50} color={i % 2 ? GOLD : INK} />
                    <HeroImg kind={kind} pose="charge" size={860} flip={i % 2 === 1} style={{ left: cx - 430, top: cy - 520 }} />
                  </Panel>
                </AbsoluteFill>
              );
            })}
            {/* insert: the eye slit narrows */}
            {f2 >= S17_EYE && f2 < S17_EYE + 26 ? (
              <Panel pts={[[1300, 90], [1840, 70], [1840, 330], [1290, 350]]} slam={slamIn(frame, S17_EYE)} border={12}>
                <AbsoluteFill style={{ background: INK }} />
                <Overlay>
                  <path d={`M1360 ${215}L1780 ${205}L1780 ${205 + 30 * (1 - 0.7 * outCubic(prog(f2, S17_EYE + 2, 8)))}L1360 ${215 + 30 * (1 - 0.7 * outCubic(prog(f2, S17_EYE + 2, 8)))}Z`} fill={VIOLET} />
                  <path d="M1290 350L1400 250L1460 330L1560 230L1660 320L1760 240L1840 330L1840 350Z" fill="#14100c" />
                </Overlay>
              </Panel>
            ) : null}
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S18 - the combo hits the fan; the rogue's dagger flurry pings three times on the sword; he cocks the open palm
// ---------------------------------------------------------------------------------------------------------------

const S18_HIT = at('s18-combo-hit');
const S18_PINGS = ['s18-ping-1', 's18-ping-2', 's18-ping-3'].map(at);
const S18_COCK = at('s18-cock');
const COCK = { ...FAN, armL: [140, 35, 0, 'palm'], torso: -6, lean: -4, head: [-4, 0], wings: [null, 14] } as const;
const S18_TL: Timeline = {
  keys: [
    { at: 0, pose: { ...FAN, torso: -4, lean: -2, head: [-3, 0], armL: [50, 100, 0, 'fist'] } as never, dur: 0 },
    { at: S18_HIT, pose: { ...FAN, wings: [null, -20], torso: -8, lean: -3, armL: [50, 100, 0, 'fist'] } as never, dur: 12, ease: 'strike', impact: true },
    { at: S18_COCK, pose: COCK as never, dur: 18 },
  ],
  ramps: { wingS_R: ramp([S18_HIT, 0.6, 6], [S18_HIT + 22, 1, 10]), wingS_L: ramp([S18_HIT, 0.6, 6], [S18_HIT + 22, 1, 10]) },
};
// Off-axis three-quarter on a long lens from his left, trucking left; a near entrance pillar wipes across the
// frame and reveals the combo hitting the fan.
const S18_CAM = handheld(tween({ position: [11.5, 5.2, -0.5], target: [0, 7.4, -15], fov: 32 }, { position: [7.2, 5.6, -2.4], target: [0, 7.6, -15], fov: 32 }, { start: S18_HIT, frames: 49 }), { amp: 0.04, seed: 's18' });
const S18_PILLAR: Vec3 = [8.6, 0, -5.2];
/** G09 pass-by pillar stand-in: an ivory and gold column, ink shadow on its inner side, a carved capital. */
const PILLAR_SVG = svgDoc(400, 2400, `<g filter="url(#k)"><rect x="60" y="0" width="280" height="2400" fill="${IVORY}"/><rect x="250" y="0" width="90" height="2400" fill="${INK}"/><rect x="60" y="0" width="40" height="2400" fill="${GOLD}"/><rect x="20" y="300" width="360" height="90" fill="${GOLD}" stroke="${INK}" stroke-width="14"/><rect x="40" y="390" width="320" height="40" fill="${INK}"/><rect x="20" y="2200" width="360" height="200" fill="${GOLD}" stroke="${INK}" stroke-width="14"/><path d="M150 450V2150M200 450V2150" stroke="${GOLD}" stroke-width="10"/></g>`, inkFilterDef('k', 1891, 10, 0.2));

const S18 = ({ frame }: { frame: number }) => {
  const st = rigFor(S18_TL, frame);
  const fk = rigFk(st);
  const c = chest(st, fk);
  const blade = rigWorld(st, fk, 'sword', [0, -0.42]);
  const slit = rigWorld(st, fk, 'eye_slit', [0, 0]);
  const heroes: HeroTrack[] = [
    { kind: 'rogue', pose: frame >= S18_PINGS[0]! - 4 ? 'attack' : 'ready', p: [blade[0] + 0.9, 0, blade[2] + 1.4], flip: true },
    { kind: 'knight', pose: 'sit', p: [-5, 0, -10.2] },
    { kind: 'mage', pose: 'sit', p: [5.4, 0, -9.4], flip: true },
    { kind: 'archer', pose: 'ready', p: [7.4, bob(frame, 7), -11], flip: true },
  ];
  const impacts: Impact[] = [
    { at: S18_HIT, size: 'big', point: c, splash: null, burst: true, scale: 1.2 },
    ...S18_PINGS.map((p): Impact => ({ at: p, size: 'small', point: blade, splash: null, burst: true, lines: null, scale: 0.5, push: false })),
  ];
  return (
    <PaintingShot
      frame={frame} camera={S18_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} />
          <Party heroes={heroes} flat={sil ? INK : null} />
          <Pic id="G09-1" color={IVORY} svg={PILLAR_SVG} width={2.4} height={14.4} pivot={[0, -7.2]} position={S18_PILLAR} renderOrder={RO.near + 50} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const p = project(pose, c);
        const b = project(pose, blade);
        const s = project(pose, slit);
        return (
          <>
            <Overlay>
              <GoldBlast c={[p.x, p.y]} s={p.s * 3.2} age={f2 - S18_HIT} seed={1801} />
              <Glint frame={frame} at={at('s18-glare')} x={s.x} y={s.y} size={s.s * 0.6} hold={false} />
            </Overlay>
            {S18_PINGS.map((t, i) => <Shards key={i} frame={f2 - t} duration={8} seed={1810 + i} origin={[b.x, b.y]} count={8} size={9} speed={16} direction={-0.5} spread={2.4} fills={[GOLD, IVORY]} />)}
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S19 - the open-palm swat; the crash-landing; the last charge; the combined strike sticks: the bar falls to the
//       II pip with a crack, a hairline crack on the helm, the head tilts down
// ---------------------------------------------------------------------------------------------------------------

const S19_SWAT = at('s19-swat');
const S19_AIR = at('s19-airborne');
const S19_LAND = at('s19-land');
const S19_CHARGE = at('s19-charge');
const S19_STRIKE = at('s19-strike');
const S19_DOWN = at('s19-head-down');
const SWAT = { ...FAN, armL: [15, 10, 0, 'palm'], torso: 10, lean: 6, head: [6, 0], wings: [null, -12] } as const;
const STAGGER = { ...REST, torso: -7, lean: -3, head: [-8, 0.02], pelvis: [-2, -0.02] } as const;
const S19_TL: Timeline = {
  keys: [
    { at: 0, pose: COCK as never, dur: 0 },
    { at: S19_SWAT, pose: SWAT as never, dur: 12, ease: 'strike', hands: 'instant', impact: true },
    { at: S19_SWAT + 26, pose: REST as never, dur: 18 },
    { at: S19_STRIKE, pose: STAGGER as never, dur: 12, ease: 'strike', impact: true },
    { at: S19_DOWN, pose: { ...STAGGER, head: [-6, 0.028], torso: -4, lean: -1 } as never, dur: 18 },
  ],
};
const S19_CAM = handheld(tween({ position: [7.5, 3, 25], target: [0, 6, -15] }, { position: [2.2, 4, 12], target: [0, 6.6, -15] }, { start: S19_SWAT, frames: 106 }), { amp: 0.05, seed: 's19' });
const S19_SPOTS: [HeroKind, Vec3, Vec3, boolean][] = [
  ['knight', [-3.6, 0.5, -10.6], [-8.4, 0.35, -9.4], false],
  ['mage', [3.6, 0.5, -10.2], [8.6, 0.35, -9], true],
  ['archer', [5.2, 0.5, -11.4], [11, 0.35, -10.2], true],
  ['rogue', [-5.4, 0.5, -11.8], [-11, 0.35, -10.6], false],
];

const S19 = ({ frame }: { frame: number }) => {
  const st = rigFor(S19_TL, frame);
  const fk = rigFk(st);
  const c = chest(st, fk);
  const heroes: HeroTrack[] = S19_SPOTS.map(([kind, a, b, flip], i) => {
    if (frame < S19_LAND) return flight(kind, frame, S19_SWAT, S19_LAND - S19_SWAT, a, b, 4 + i * 0.7, { kind, pose: 'ready', p: [a[0], 0, a[2]], flip }, 'sit', flip, flip ? -1 : 1);
    if (frame < S19_CHARGE - 6) return { kind, pose: 'sit', p: [b[0], 0, b[2]], flip };
    const t = prog(frame, S19_CHARGE - 6, S19_STRIKE - (S19_CHARGE - 6));
    const end: Vec3 = [c[0] + (flip ? 1.6 : -1.6) + (i % 2 ? 0.4 : -0.4), 0, -12.6 + i * 0.25];
    if (frame < S19_STRIKE + 2) return { kind, pose: 'attack', p: [lerp(b[0], end[0], t), 0.9 * Math.sin(t * Math.PI) + (t > 0.85 ? (c[1] - 1.4) * prog(t, 0.85, 0.15) : 0), lerp(b[2], end[2], t)], centre: t > 0.85, flip };
    return { kind, pose: 'fly', p: [end[0] + (flip ? 1 : -1) * 2.5 * prog(frame, S19_STRIKE + 2, 16), lerp(c[1] - 1.4, 0.35, prog(frame, S19_STRIKE + 2, 16)), end[2]], rot: (flip ? -1 : 1) * 120 * prog(frame, S19_STRIKE + 2, 16), centre: true, flip };
  });
  const impacts: Impact[] = [
    { at: S19_SWAT, size: 'big', sil: true, point: [c[0] + 3, c[1] - 3, c[2] + 2], splash: 'violet', lines: 'radial' },
    { at: S19_LAND, size: 'medium', point: [0, 0.4, -10], splash: 'black', scale: 1.2, burst: false },
    { at: S19_STRIKE, size: 'big', sil: true, point: c, splash: 'black', scale: 1.3 },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S19_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} crack={frame >= S19_STRIKE ? 0 : -1} echoes={echoesAt(S19_TL, frame, [S19_SWAT], { frames: 8 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        return (
          <>
            {f2 >= S19_SWAT && f2 < S19_SWAT + 10 ? <SpeedLines mode="parallel" frame={f2 - S19_SWAT} duration={10} seed={1901} angle={-0.25} count={40} thickness={40} /> : null}
            <Overlay>
              {S19_SPOTS.map(([, , b], i) => {
                const q = project(pose, [b[0], 0, b[2]]);
                return <Puffs key={i} c={[q.x, q.y]} s={q.s * 1.1} age={f2 - S19_LAND} count={5} seed={1900 + i} life={24} />;
              })}
              {f2 >= S19_AIR && f2 < S19_LAND ? heroesHeads(heroes, pose).map(([x, y, s], i) => <Sweat key={i} c={[x, y]} s={s} t={f2 - S19_AIR} />) : null}
            </Overlay>
            {/* the last charge in close-up: all four run in together and the combined strike lands */}
            <ActionInset
              frame={frame} from={S19_CHARGE} until={S19_STRIKE + 6} hitAt={S19_STRIKE} hit={[860, 560]} bg={GOLD} lines={INK}
              pts={[[40, 400], [880, 360], [900, 810], [40, 840]]}
              heroes={(['knight', 'rogue', 'mage', 'archer'] as HeroKind[]).map((kind, i) => ({ kind, pose: 'attack' as HeroPose, x: 160 + i * 150 + 230 * outCubic(prog(frame, S19_CHARGE, S19_STRIKE - S19_CHARGE)), y: 810 - (i % 2) * 40, size: 520 }))}
            >
              <Overlay>
                <path d="M900 360L820 360L860 500L790 650L880 810L900 810Z" fill={INK} />
              </Overlay>
            </ActionInset>
          </>
        );
      }}
    />
  );
};

export const FIGHT_SHOTS = { S13, S14, S15, S16, S17, S18, S19 };
export { REST, SvgCard };
