// Scene 2 part 1, the riff fight (S07-S12): first clash and the bar slams in, bolts ping off the folded pipes, the
// fan opens, arrows shatter, two wing pistons, the sweep and the heap, the shield bash and the beam.
import { handheld, sequence, tween, hold, MED, WIDE, type CameraPose } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { Shards, SpeedLines } from '../../vfx/effects.ts';
import { at } from './events.ts';
import type { Impact } from './fx.tsx';
import { Hero, type HeroKind, type HeroPose } from './heroes.tsx';
import { GOLD, INK, IVORY, outCubic, prog, project, two } from './kit.tsx';
import { arc, bob, PaintingShot, spin } from './paint.tsx';
import { Arrow, Beam, Bolt, KoStars, Overlay, Puffs } from './props.tsx';
import { echoesAt, ramp, rigFk, rigFor, rigWorld, Vorathul, type PipeEvent, type RigState, type Timeline } from './vorathul.tsx';
import { RO, World } from './world.tsx';
import { pipeMouth } from './intro.tsx';

const FOLDED = { wingS_R: [{ at: 0, v: 0, dur: 0 }], wingS_L: [{ at: 0, v: 0, dur: 0 }] };

export interface HeroTrack { kind: HeroKind; pose: HeroPose; p: Vec3; rot?: number; flip?: boolean; centre?: boolean; squash?: [number, number]; hidden?: boolean }

/** All four heroes of a shot; every pose a hero uses in the part is mounted so swaps never wait. */
export const Party = ({ heroes, flat }: { heroes: readonly HeroTrack[]; flat: string | null }) => (
  <>
    {heroes.map((h) => (
      <Hero key={h.kind} kind={h.kind} pose={h.pose} position={h.p} rot={h.rot} flip={h.flip} centre={h.centre} squash={h.squash} renderOrder={RO.hero - h.p[2] * 0.01} flat={flat} hidden={h.hidden} />
    ))}
  </>
);

/** A hero struck at `t0`: flies from `a` to `b` (body centre) over `n` frames, spinning, then lands in `land`. */
export const flight = (kind: HeroKind, f: number, t0: number, n: number, a: Vec3, b: Vec3, h: number, before: HeroTrack, land: HeroPose | null, flip?: boolean, dir = 1): HeroTrack => {
  if (f < t0) return before;
  if (f < t0 + n || land === null) return { kind, pose: 'fly', p: arc(Math.min(f, t0 + n), t0, n, a, b, h), rot: spin(Math.min(f, t0 + n), t0, dir), centre: true, flip, hidden: land === null && f >= t0 + n };
  return { kind, pose: land, p: [b[0], 0, b[2]], flip };
};

const chest = (st: RigState, fk: ReturnType<typeof rigFk>): Vec3 => rigWorld(st, fk, 'torso', [0.02, 0.2]);

// ---------------------------------------------------------------------------------------------------------------
// S07 - band entry: the knight's leap meets the blade; the bar slams in; two mage bolts
// ---------------------------------------------------------------------------------------------------------------

const BLOCK = { pelvis: [-2, -0.01], torso: -7, head: [-5, 0.005], armR: [105, 55, -20, 'grip'], armL: [60, 90, 0, 'fist'], legs: [10, 6], wings: [null, -8], sword: 'hand_R', swordZ: 92, lean: -3 } as const;
const SETTLE = { ...BLOCK, torso: -2, head: [2, 0], armR: [70, 75, -10, 'grip'], lean: 0, wings: [null, -2] } as const;
const S07_TL: Timeline = {
  keys: [{ at: 0, pose: 'base', dur: 0 }, { at: at('s07-clash'), pose: BLOCK as never, dur: 12, ease: 'strike', hands: 'instant', impact: true }, { at: at('s07-bolt-1') + 4, pose: SETTLE as never, dur: 16 }],
  ramps: FOLDED,
};
const S07_CAM = handheld(tween({ position: [-9.5, 2.0, 21], target: [0.2, 5.8, -15] }, { position: [-8.4, 2.3, 17.5], target: [0.2, 6, -15] }, { start: at('s07-clash'), frames: 39 }), { amp: 0.05, seed: 's07' });

const S07 = ({ frame }: { frame: number }) => {
  const st = rigFor(S07_TL, frame);
  const fk = rigFk(st);
  const clashSt = rigFor(S07_TL, at('s07-clash'));
  const clash = rigWorld(clashSt, rigFk(clashSt), 'sword', [0, -0.25]);
  const c = chest(st, fk);
  const b1 = at('s07-bolt-1');
  const b2 = at('s07-bolt-2');
  const mageAttack = (frame >= b1 - 6 && frame < b1 + 4) || (frame >= b2 - 6 && frame < b2 + 4);
  const heroes: HeroTrack[] = [
    flight('knight', frame, at('s07-clash') + 2, 16, [clash[0] - 0.7, clash[1] - 0.5, clash[2] + 2], [-6.2, 0.35, -10.5], 1.4, { kind: 'knight', pose: 'attack', p: [clash[0] - 0.7, clash[1] - 0.5, clash[2] + 2], centre: true }, 'ready'),
    { kind: 'mage', pose: mageAttack ? 'attack' : 'ready', p: [5.8, 0, -9.5], flip: true },
    { kind: 'archer', pose: 'ready', p: [8.6, bob(frame, 1), -11.5], flip: true },
    { kind: 'rogue', pose: 'ready', p: [-8.6, bob(frame, 2), -12] },
  ];
  const impacts: Impact[] = [
    { at: at('s07-clash'), size: 'big', sil: true, point: clash },
    { at: b1, size: 'small', point: c, splash: 'black' },
    { at: b2, size: 'small', point: [c[0] + 0.5, c[1] - 0.6, c[2]], splash: 'black' },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S07_CAM} impacts={impacts} dutch={-4}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} echoes={echoesAt(S07_TL, frame, [at('s07-clash')])} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const staff = project(pose, [5.2, 1.7, -9.5]);
        const tc = project(pose, c);
        const tc2 = project(pose, [c[0] + 0.5, c[1] - 0.6, c[2]]);
        return (
          <Overlay>
            <Bolt f={f2} t0={b1 - 6} t1={b1} a={[staff.x, staff.y]} b={[tc.x, tc.y]} size={staff.s * 0.18} seed={11} />
            <Bolt f={f2} t0={b2 - 6} t1={b2} a={[staff.x, staff.y]} b={[tc2.x, tc2.y]} size={staff.s * 0.18} seed={12} />
          </Overlay>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S08 - the bolts ping off the folded pipes; the pipes tremble
// ---------------------------------------------------------------------------------------------------------------

const S08_TL: Timeline = { keys: [{ at: 0, pose: SETTLE as never, dur: 0 }], ramps: FOLDED, pipes: [{ at: at('s08-tremble'), wing: 'both', pipe: 'all', op: 'fire' }, { at: at('s08-tremble') + 3, wing: 'L', pipe: 'all', op: 'fire' }] as PipeEvent[] };
const S08_CAM = handheld(tween({ position: [5.2, 9.6, -2], target: [0.9, 10, -15] }, { position: [4.6, 9.8, -3.2], target: [0.9, 10.1, -15] }, { start: at('s08-ping'), frames: 14 }), { amp: 0.04, seed: 's08' });

const S08 = ({ frame }: { frame: number }) => {
  const st = rigFor(S08_TL, frame);
  const fk = rigFk(st);
  const ping = rigWorld(st, fk, 'wing_root_L', pipeMouth(st, 'L', 4, 0));
  const ping2 = rigWorld(st, fk, 'wing_root_L', pipeMouth(st, 'L', 6, 0));
  const impacts: Impact[] = [
    { at: at('s08-ping'), size: 'small', point: ping, splash: null, burst: true },
    { at: at('s08-tremble'), size: 'small', point: ping2, splash: null, burst: false, lines: null },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S08_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const p = project(pose, ping);
        const t = f2 - at('s08-ping');
        return (
          <>
            <Shards frame={t} duration={14} seed={808} origin={[p.x, p.y]} count={14} size={14} speed={22} direction={-0.4} spread={2.2} fills={[GOLD, GOLD, IVORY]} />
            <Overlay>
              <Bolt f={f2} t0={at('s08-ping')} t1={at('s08-ping') + 10} a={[p.x, p.y]} b={[p.x + 900, p.y - 500]} size={p.s * 0.12} seed={13} />
            </Overlay>
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S09 - the second layer: the fan opens; the archer's volley rises
// ---------------------------------------------------------------------------------------------------------------

const FAN = { pelvis: [0, 0.02], torso: 5, head: [3, -0.005], armR: [-15, 70, 0, 'grip'], armL: [75, 35, 15, 'spread'], legs: [8, 8], wings: [null, 15], sword: 'hand_R', swordZ: 64, lean: 0 } as const;
const S09_TL: Timeline = {
  keys: [{ at: 0, pose: SETTLE as never, dur: 0 }, { at: at('s09-fan'), pose: FAN as never, dur: 12, ease: 'strike', hands: 'instant', impact: true }],
  ramps: { wingS_R: ramp([0, 0, 0], [at('s09-fan') + 6, 1, 6]), wingS_L: ramp([0, 0, 0], [at('s09-fan') + 6, 1, 6]) },
};
const S09_CAM = handheld(
  sequence([
    { from: 0, path: tween({ position: [0, 7.5, 4], target: [0, 8, -15] }, WIDE, { start: at('s09-fan'), frames: 6, ease: outCubic }) },
    { from: at('s09-fan') + 6, path: tween(WIDE, { position: [5, 5.5, 25], target: [0.6, 5.6, -15] }, { start: at('s09-fan') + 6, frames: 38 }) },
  ]),
  { amp: 0.06, seed: 's09' },
);
const ARROW_TARGETS: [number, 'L' | 'R'][] = [[3, 'L'], [5, 'L'], [7, 'L'], [6, 'L'], [4, 'L'], [2, 'L']];

/** The volley: arrows from the bow on a high parabola onto the fan, landing on `hitAt`. */
const volley = (pose: CameraPose, st: RigState, fk: ReturnType<typeof rigFk>, f: number, from: Vec3, fireAt: number, hitAt: number) => {
  if (f < fireAt || f >= hitAt) return null;
  const t = (f - fireAt) / (hitAt - fireAt);
  return ARROW_TARGETS.map(([i, side], k) => {
    const tgt = rigWorld(st, fk, `wing_root_${side}`, pipeMouth(st, side, i, 0));
    const ctrl: Vec3 = [(from[0] + tgt[0]) / 2 + 1, 18 + k * 0.6, (from[2] + tgt[2]) / 2];
    const tt = Math.min(1, t * (1 + k * 0.03));
    const q = (u: number): Vec3 => [0, 1, 2].map((j) => (1 - u) * (1 - u) * (from[j] as number) + 2 * u * (1 - u) * (ctrl[j] as number) + u * u * (tgt[j] as number)) as Vec3;
    const a = project(pose, q(tt));
    const b = project(pose, q(Math.min(1, tt + 0.02)));
    return <Arrow key={k} p={[a.x, a.y]} ang={Math.atan2(b.y - a.y, b.x - a.x)} len={a.s * 0.9} />;
  });
};

const S09 = ({ frame }: { frame: number }) => {
  const st = rigFor(S09_TL, frame);
  const fk = rigFk(st);
  const c = chest(st, fk);
  const volleyAt = at('s09-volley');
  const heroes: HeroTrack[] = [
    { kind: 'knight', pose: 'ready', p: [-6.2, bob(frame, 3), -10.5] },
    { kind: 'mage', pose: 'ready', p: [5.8, 0, -9.5], flip: true },
    { kind: 'archer', pose: frame >= volleyAt - 8 && frame < volleyAt + 8 ? 'attack' : 'ready', p: [8.2, 0, -10.6], flip: true },
    { kind: 'rogue', pose: 'tiptoe', p: [-8.6 + 4.6 * prog(two(frame), at('s09-fan'), 44), 0.05 * (two(frame) % 4), -12.4] },
  ];
  const impacts: Impact[] = [{ at: at('s09-fan'), size: 'big', sil: true, point: c, splash: 'violet', scale: 1.4 }];
  return (
    <PaintingShot
      frame={frame} camera={S09_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} echoes={echoesAt(S09_TL, frame, [at('s09-fan')], { delay: 2, frames: 8 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => <Overlay>{volley(pose, st, fk, two(frame), [7.7, 1.1, -10.6], volleyAt, at('s10-shatter'))}</Overlay>}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S10 - arrows shatter on the pipes; two wing pistons launch the knight, then the mage
// ---------------------------------------------------------------------------------------------------------------

const PISTON_L = { ...FAN, wings: [null, -25], lean: 7, torso: 8, head: [6, 0], armL: [40, 60, 0, 'fist'] } as const;
const RECOIL = { ...FAN, wings: [null, 12], lean: 0, torso: 0, head: [0, 0] } as const;
const PISTON_R = { ...FAN, wings: [null, -25], lean: -7, torso: -8, head: [-6, 0], armL: [20, 80, 0, 'fist'] } as const;
const S10_P1 = at('s10-piston-knight');
const S10_P2 = at('s10-piston-mage');
const S10_TL: Timeline = {
  keys: [
    { at: 0, pose: FAN as never, dur: 0 },
    { at: S10_P1, pose: PISTON_L as never, dur: 12, ease: 'strike', hands: 'instant', impact: true },
    { at: S10_P1 + 9, pose: RECOIL as never, dur: 9 },
    { at: S10_P2, pose: PISTON_R as never, dur: 11, ease: 'strike', hands: 'instant', impact: true },
    { at: S10_P2 + 16, pose: { ...RECOIL, wings: [null, 6], armR: [-35, 130, -45, 'grip'], armL: [30, 50, 0, 'open'], torso: -6, lean: -3 } as never, dur: 16 },
  ],
  // Seen from behind: the front glows (slit, gems, studs, runes) would draw through his back, so they are off.
  ramps: { slitOpacity: ramp([0, 0, 0]), gems: ramp([0, 0, 0]), studs: ramp([0, 0, 0]), runes: ramp([0, 0, 0]) },
};
// High over his left shoulder from behind, looking down on the party: his black shoulder and pipes own the
// foreground and the heroes are launched away from us. Steep enough that no horizon (no unbuilt world) shows.
const S10_CAM = handheld(tween({ position: [3.2, 15.5, -25.5], target: [-2.2, 0.4, -8] }, { position: [2.4, 14.8, -24.5], target: [-1.2, 0.8, -8] }, { start: at('s10-shatter'), frames: 58 }), { amp: 0.05, seed: 's10' });

const S10 = ({ frame }: { frame: number }) => {
  const st = rigFor(S10_TL, frame);
  const fk = rigFk(st);
  const shatter = rigWorld(st, fk, 'wing_root_L', pipeMouth(st, 'L', 5, 0));
  const kAt: Vec3 = [-4.6, 0.6, -10.2];
  const mAt: Vec3 = [4.8, 0.6, -9.4];
  const heroes: HeroTrack[] = [
    flight('knight', frame, S10_P1, 16, kAt, [-14.5, 9.5, -7], 2.5, { kind: 'knight', pose: 'ready', p: [-4.6, 0, -10.2] }, null, false, 1),
    flight('mage', frame, S10_P2, 16, mAt, [14.5, 9, -6], 2.5, { kind: 'mage', pose: frame > S10_P1 + 4 ? 'charge' : 'ready', p: [4.8, 0, -9.4], flip: true }, null, true, -1),
    { kind: 'archer', pose: frame >= S10_P2 ? 'fly' : 'ready', p: frame >= S10_P2 ? [8.6, 0.6, -11] : [8.6, 0, -11], rot: frame >= S10_P2 ? 25 : 0, centre: frame >= S10_P2, flip: true },
    { kind: 'rogue', pose: 'tiptoe', p: [-4 + 1.6 * prog(two(frame), at('s10-shatter'), 58), 0.05 * (two(frame) % 4), -12.4 + 1.8 * prog(frame, at('s10-shatter'), 58)] },
  ];
  const impacts: Impact[] = [
    { at: at('s10-shatter'), size: 'medium', point: shatter, splash: null },
    { at: S10_P1, size: 'medium', point: kAt, splash: 'violet' },
    { at: S10_P2, size: 'medium', point: mAt, splash: 'violet' },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S10_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          {/* seen from behind he is nearer than the heroes, so he draws over them */}
          <Vorathul state={st} frame={frame} renderBase={450} echoes={echoesAt(S10_TL, frame, [S10_P1, S10_P2], { frames: 6 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const p = project(pose, shatter);
        return (
          <>
            <Shards frame={f2 - at('s10-shatter')} duration={18} seed={1010} origin={[p.x, p.y]} count={26} size={16} speed={26} direction={-0.9} spread={2.6} fills={[GOLD, GOLD, IVORY]} />
            {[S10_P1, S10_P2].map((t, i) => (f2 >= t && f2 < t + 8 ? <SpeedLines key={i} mode="parallel" frame={f2 - t} duration={8} seed={1020 + i} angle={i ? 0.35 : Math.PI - 0.35} count={34} thickness={30} /> : null))}
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S11 - the sweep bowls archer and rogue across the floor; all four land in a heap; the knight gets up
// ---------------------------------------------------------------------------------------------------------------

const S11_SW = at('s11-sweep');
const S11_HEAP = at('s11-heap');
const S11_TL: Timeline = {
  keys: [
    { at: 0, pose: 'sweep_antic', dur: 0 },
    { at: S11_SW, pose: 'sweep_strike', dur: 12, ease: 'strike', hands: 'instant', impact: true },
    { at: S11_SW + 14, pose: 'sweep_follow', dur: 14 },
    { at: at('s11-knight-up') + 4, pose: { ...FAN, wings: [null, 4], armL: [-25, 70, 0, 'fist'] } as never, dur: 26 },
  ],
};
const S11_CAM = handheld(tween({ position: [-0.6, 0.9, -1.2], target: [0.6, 2.6, -13] }, { position: [1.6, 0.85, -1.6], target: [2.6, 2.2, -13] }, { start: S11_SW, frames: 78 }), { amp: 0.04, seed: 's11' });
const HEAP: Vec3 = [4.4, 0, -9.4];

const S11 = ({ frame }: { frame: number }) => {
  const st = rigFor(S11_TL, frame);
  const fk = rigFk(st);
  const tip = rigWorld(rigFor(S11_TL, S11_SW), rigFk(rigFor(S11_TL, S11_SW)), 'sword', [0, -0.45]);
  const tumble = at('s11-tumble');
  const up = at('s11-knight-up');
  const heap = (dx: number, dy: number, rot: number) => ({ p: [HEAP[0] + dx, HEAP[1] + dy, HEAP[2]] as Vec3, rot });
  const inHeap = frame >= S11_HEAP;
  const archer: HeroTrack = inHeap ? { kind: 'archer', pose: 'ko', ...heap(-0.3, 0.3, 90), centre: true, flip: true } : frame < tumble ? flight('archer', frame, S11_SW, tumble - S11_SW, [2.2, 0.5, -10.4], [6.6, 0.45, -9.6], 1.6, { kind: 'archer', pose: 'ready', p: [2.2, 0, -10.4], flip: true }, 'fly', true, 1) : { kind: 'archer', pose: 'fly', p: arc(frame, tumble, S11_HEAP - tumble, [6.6, 0.45, -9.6], [HEAP[0] - 0.3, 0.3, HEAP[2]], 0.9), rot: spin(frame, tumble, 1), centre: true, flip: true };
  const rogue: HeroTrack = inHeap ? { kind: 'rogue', pose: 'ko', ...heap(0.35, 0.75, -80), centre: true } : frame < tumble ? flight('rogue', frame, S11_SW, tumble - S11_SW, [-1.8, 0.5, -10.6], [2.8, 0.45, -9.8], 1.3, { kind: 'rogue', pose: 'tiptoe', p: [-1.8, 0, -10.6] }, 'fly', false, 1) : { kind: 'rogue', pose: 'fly', p: arc(frame, tumble, S11_HEAP - tumble, [2.8, 0.45, -9.8], [HEAP[0] + 0.35, 0.75, HEAP[2]], 1.2), rot: spin(frame, tumble, -1), centre: true };
  const knight: HeroTrack = frame < S11_HEAP - 16 ? { kind: 'knight', pose: 'fly', p: [0, 0, 0], hidden: true } : frame < S11_HEAP ? { kind: 'knight', pose: 'fly', p: arc(frame, S11_HEAP - 16, 16, [-2, 9, -9.4], [HEAP[0] - 0.1, 1.15, HEAP[2] + 0.1], 1), rot: spin(frame, S11_HEAP - 16), centre: true } : frame < up ? { kind: 'knight', pose: 'ko', ...heap(-0.1, 1.15, 100), centre: true } : { kind: 'knight', pose: frame < up + 10 ? 'up' : 'ready', p: [HEAP[0] - 1.6, 0, HEAP[2] + 0.4] };
  const mage: HeroTrack = frame < S11_HEAP - 14 ? { kind: 'mage', pose: 'fly', p: [0, 0, 0], hidden: true } : frame < S11_HEAP ? { kind: 'mage', pose: 'fly', p: arc(frame, S11_HEAP - 14, 14, [11, 9, -9], [HEAP[0] + 0.2, 0.25, HEAP[2] - 0.1], 1), rot: spin(frame, S11_HEAP - 14, -1), centre: true, flip: true } : { kind: 'mage', pose: 'ko', ...heap(0.2, 0.2, -95), centre: true, flip: true };
  const impacts: Impact[] = [
    { at: S11_SW, size: 'big', sil: true, point: tip, lines: 0, splash: 'violet' },
    { at: S11_HEAP, size: 'medium', point: [HEAP[0], 0.5, HEAP[2]], splash: 'black', scale: 1.7 },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S11_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} near={false} />
          <Vorathul state={st} frame={frame} echoes={echoesAt(S11_TL, frame, [S11_SW], { delay: 1, frames: 6, offset: [-0.35, 0.02, -0.02] })} />
          <Party heroes={[knight, mage, archer, rogue]} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const hp = project(pose, [HEAP[0], 0.1, HEAP[2]]);
        const head = project(pose, [HEAP[0], 1.9, HEAP[2]]);
        const bounce = project(pose, [6.6, 0.05, -9.6]);
        return (
          <>
            {f2 >= S11_SW && f2 < S11_SW + 10 ? <SpeedLines mode="parallel" frame={f2 - S11_SW} duration={10} seed={1111} angle={0} count={46} thickness={40} /> : null}
            <Overlay>
              <Puffs c={[bounce.x, bounce.y]} s={bounce.s * 0.8} age={f2 - tumble} count={5} seed={1112} life={22} />
              <Puffs c={[hp.x, hp.y]} s={hp.s * 1.6} age={f2 - S11_HEAP} count={8} seed={1113} life={34} />
              {f2 >= S11_HEAP + 2 && f2 < up ? <KoStars c={[head.x, head.y]} s={head.s * 0.9} f={f2} /> : null}
            </Overlay>
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S12 - the shield bash bounces off (a 1 % chip that heals at once); the mage's beam splinters on the fan shield
// ---------------------------------------------------------------------------------------------------------------

const S12_BASH = at('s12-bash');
const S12_BEAM = at('s12-beam');
const S12_SPL = at('s12-splinter');
const GUARD = { ...FAN, wings: [null, -25], torso: 4, armL: [70, 120, 0, 'fist'], armR: [-10, 95, 0, 'grip'], lean: -2, head: [-4, 0] } as const;
const S12_TL: Timeline = {
  keys: [
    { at: 0, pose: { ...FAN, wings: [null, 4], armL: [-25, 70, 0, 'fist'] } as never, dur: 0 },
    { at: S12_BEAM, pose: GUARD as never, dur: 13, ease: 'strike', hands: 'instant', impact: true },
    { at: S12_SPL + 12, pose: { ...FAN, wings: [null, 10], armL: [-25, 70, 0, 'fist'], torso: 0, lean: 0 } as never, dur: 14 },
  ],
  ramps: { wingS_R: ramp([S12_BEAM, 0.55, 10], [S12_SPL + 14, 1, 12]), wingS_L: ramp([S12_BEAM, 0.55, 10], [S12_SPL + 14, 1, 12]) },
};
// Down on the tiles, wide lens: the knight's bash and the mage's beam happen at lens height, his bulk overhead.
const S12_CAM = handheld(tween({ position: [-2.6, 0.32, -4.6], target: [0.6, 3.8, -15], fov: 58 }, { position: [-1.4, 0.36, -5.4], target: [1.2, 4.6, -15], fov: 58 }, { start: S12_BASH, frames: 78 }), { amp: 0.03, seed: 's12' });

const S12 = ({ frame }: { frame: number }) => {
  const st = rigFor(S12_TL, frame);
  const fk = rigFk(st);
  const shin: Vec3 = [-1.4, 1.4, -13.2];
  const contact = rigWorld(st, fk, 'wing_root_L', pipeMouth(st, 'L', 3, 0));
  const knight = flight('knight', frame, S12_BASH + 2, 16, [-1.5, 0.75, -12.6], [-4.8, 0.35, -10.4], 1.2, { kind: 'knight', pose: 'attack', p: [-1.5, 0.75, -12.6], centre: true }, 'ready');
  const mPose: HeroPose = frame < at('s12-regen') ? 'ready' : frame < S12_BEAM - 7 ? 'charge' : frame < S12_SPL + 4 ? 'attack' : 'ready';
  const heroes: HeroTrack[] = [
    knight,
    { kind: 'mage', pose: mPose, p: [5.8, 0, -9.2], flip: true },
    { kind: 'archer', pose: 'ready', p: [8.5, bob(frame, 4), -11.4], flip: true },
    { kind: 'rogue', pose: frame > S12_SPL ? 'tiptoe' : 'ready', p: [-3.6 + (frame > S12_SPL ? 0.9 * prog(two(frame), S12_SPL, 20) : 0), 0, -11.6] },
  ];
  const impacts: Impact[] = [
    { at: S12_BASH, size: 'medium', point: shin, splash: 'black' },
    { at: S12_BEAM, size: 'big', point: contact, splash: null, burst: true },
    { at: S12_SPL, size: 'small', point: contact, splash: null, burst: false },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S12_CAM} impacts={impacts}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} echoes={echoesAt(S12_TL, frame, [S12_BEAM], { frames: 5 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const staff = project(pose, [5.2, 1.75, -9.2]);
        const ct = project(pose, contact);
        const beamOn = f2 >= S12_BEAM - 7 && f2 < S12_SPL + 2;
        return (
          <>
            <Overlay>
              {beamOn ? <Beam a={[staff.x, staff.y]} b={[ct.x, ct.y]} width={staff.s * (f2 >= S12_BEAM ? 0.42 : 0.3)} p={outCubic(prog(f2, S12_BEAM - 7, 7))} seed={1201} jitter={Math.floor(f2 / 2) % 3} /> : null}
            </Overlay>
            <Shards frame={f2 - S12_SPL} duration={20} seed={1202} origin={[ct.x, ct.y]} count={30} size={20} speed={30} direction={0.4} spread={2.4} fills={[GOLD, GOLD, IVORY]} />
            {f2 >= S12_BEAM && f2 < S12_SPL ? <Shards frame={(f2 - S12_BEAM) % 8} duration={8} seed={1203 + Math.floor((f2 - S12_BEAM) / 8)} origin={[ct.x, ct.y]} count={10} size={12} speed={20} direction={0.2} spread={1.8} fills={[GOLD, IVORY]} /> : null}
          </>
        );
      }}
    />
  );
};

export const RIFF_SHOTS = { S07, S08, S09, S10, S11, S12 };
export { FAN, chest, volley };
