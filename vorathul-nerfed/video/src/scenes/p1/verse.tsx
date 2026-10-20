// Scene 3, verse 1 (S20-S25): the trophy pile of a thousand heroes, the crack spreads, the second form, the three
// phase pips, the second-form slam, PHASE III and the first Meteor Rain.
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { handheld, tween, CLOSE, ECU, LOW, WIDE, type CameraPose } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { beatFrame, TIMING } from '../../timing.ts';
import { gradeCues, Meteor, seeded, shake, Shards } from '../../vfx/effects.ts';
import { at } from './events.ts';
import { Caption, Glint, Hud, Panel, slamIn, type Impact } from './fx.tsx';
import { Hero, type HeroKind } from './heroes.tsx';
import { GOLD, INK, inkFilterDef, IVORY, lerp, outCubic, Pic, poly, prog, project, r2, svgDoc, two, VIOLET, VIOLET_LIGHT } from './kit.tsx';
import { bob, HUD_EVENTS, PaintingShot } from './paint.tsx';
import { Bolt, Overlay, Puffs, ShieldShatter, Tears } from './props.tsx';
import { chest, FAN, Party, type HeroTrack } from './riff.tsx';
import { REST } from './fight.tsx';
import { hudAt } from './fx.tsx';
import { echoesAt, ramp, rigFk, rigFor, rigWorld, Vorathul, type Timeline } from './vorathul.tsx';
import { RO, World } from './world.tsx';

/** The next beat after the one a hit sits on: a hit up to 2 frames before a beat belongs to that beat (1583 -> 1593). */
const nextBeat = (frame: number): number => {
  const i = TIMING.beats.findIndex((t) => Math.round(t * 30) > frame + 2);
  return beatFrame(i);
};

const BOWED = { ...REST, torso: -4, lean: -1, head: [-6, 0.028], pelvis: [-2, -0.02] } as const;

// ---------------------------------------------------------------------------------------------------------------
// G10 trophy pile stand-in: hundreds of empty helmets, broken gold shields with suns, snapped swords, bows, staffs
// ---------------------------------------------------------------------------------------------------------------

const PILE = { w: 17, h: 4.2, z: -11.3 };
const PILE_SVG = (() => {
  const w = 3200;
  const h = Math.round((w * PILE.h) / PILE.w);
  const rng = seeded('p1-pile');
  const top = (x: number) => h - (h * 0.92) * Math.max(0, 1 - ((x - w / 2) / (w / 2)) ** 2) ** 0.8;
  let back = '';
  let items = '';
  back += `<path d="M0 ${h}${Array.from({ length: 41 }, (_, i) => `L${r2((i / 40) * w)} ${r2(top((i / 40) * w) + 30)}`).join('')}L${w} ${h}Z" fill="${INK}"/>`;
  for (let k = 0; k < 420; k++) {
    const x = rng.range(60, w - 60);
    const y = rng.range(top(x) + 10, h - 10);
    const s = rng.range(26, 54) * (0.6 + 0.4 * (y / h));
    const kind = rng.int(0, 5);
    const rot = rng.range(-50, 50);
    let g = '';
    if (kind <= 1) g = `<path d="M${-s} ${s * 0.4}A${s} ${s} 0 0 1 ${s} ${s * 0.4}Z" fill="${INK}" stroke="${GOLD}" stroke-width="${r2(s * 0.12)}"/><path d="M${-s * 0.5} ${r2(s * 0.05)}h${s}" stroke="${IVORY}" stroke-width="${r2(s * 0.14)}"/>`;
    else if (kind === 2) g = `<path d="${poly([[-s * 0.7, -s * 0.8], [s * 0.7, -s * 0.8], [s * 0.7, s * 0.2], [0, s * 1.1], [-s * 0.7, s * 0.2]])}" fill="${GOLD}" stroke="${INK}" stroke-width="${r2(s * 0.1)}"/><circle cx="0" cy="${r2(-s * 0.15)}" r="${r2(s * 0.28)}" fill="${IVORY}"/>`;
    else if (kind === 3) g = `<path d="M${-s * 1.6} 0L${s * 1.2} 0" stroke="${IVORY}" stroke-width="${r2(s * 0.22)}"/><path d="M${-s * 1.6} ${-s * 0.3}V${s * 0.3}" stroke="${GOLD}" stroke-width="${r2(s * 0.16)}"/>`;
    else if (kind === 4) g = `<path d="M${-s * 1.5} 0Q0 ${-s * 1.1} ${s * 1.5} 0" fill="none" stroke="${GOLD}" stroke-width="${r2(s * 0.14)}"/>`;
    else g = `<path d="M${-s * 1.8} 0L${s * 1.4} 0" stroke="${GOLD}" stroke-width="${r2(s * 0.14)}"/><circle cx="${r2(s * 1.6)}" cy="0" r="${r2(s * 0.34)}" fill="none" stroke="${GOLD}" stroke-width="${r2(s * 0.12)}"/>`;
    items += `<g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})">${g}</g>`;
  }
  return svgDoc(w, h, `<g filter="url(#k)">${back}${items}</g>`, inkFilterDef('k', 2001, 6, 0.1));
})();

// ---------------------------------------------------------------------------------------------------------------
// S20 - the bowed helm; the camera tilts down to the floor: a pile of a thousand defeated heroes; they tiptoe closer
// ---------------------------------------------------------------------------------------------------------------

const S20_TILT = at('s20-tilt');
const S20_TIP = at('s20-tiptoe');
const S20_PILE = at('s20-pile');
const S20_TL: Timeline = { keys: [{ at: 0, pose: BOWED as never, dur: 0 }] };
const S20_CAM = handheld(tween({ ...CLOSE, position: [0, 9.4, -1] }, { position: [0, 4.6, -1], target: [0, 1.6, -15] }, { start: S20_TILT, frames: S20_PILE + 6 - S20_TILT }), { amp: 0.03, seed: 's20' });

const S20 = ({ frame }: { frame: number }) => {
  const st = rigFor(S20_TL, frame);
  const step = (x0: number, dir: number) => x0 + dir * 0.06 * Math.floor(Math.max(0, frame - S20_TIP) / 6);
  const heroes: HeroTrack[] = [
    { kind: 'knight', pose: 'tiptoe', p: [step(-6.4, 1), 0.05 * ((frame >> 1) % 3), -9.6] },
    { kind: 'rogue', pose: 'tiptoe', p: [step(-7.6, 1), 0.05 * ((frame >> 1) % 3), -10.4] },
    { kind: 'mage', pose: 'tiptoe', p: [step(6.4, -1), 0.05 * ((frame >> 1) % 3), -9.4], flip: true },
    { kind: 'archer', pose: 'tiptoe', p: [step(7.8, -1), 0.05 * ((frame >> 1) % 3), -10.2], flip: true },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S20_CAM}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} near={false} />
          <Vorathul state={st} frame={frame} crack={0} />
          <Pic id="G10" color={GOLD} svg={PILE_SVG} width={PILE.w} height={PILE.h} pivot={[0, -PILE.h / 2]} position={[0, -0.2, PILE.z]} renderOrder={RO.hero - 10} flat={sil ? INK : null} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const t = prog(f2, S20_PILE, 18);
        const rng = seeded('p1-pileglint');
        return (
          <Overlay>
            {t > 0 && t < 1
              ? Array.from({ length: 14 }, (_, i) => {
                  const q = project(pose, [rng.range(-7, 7), rng.range(0.4, 3), PILE.z + 0.1]);
                  return <Glint key={i} frame={frame} at={S20_PILE + i} x={q.x} y={q.y} size={q.s * 0.25} hold={false} color={GOLD} />;
                })
              : null}
          </Overlay>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S21 - ECU: the hairline crack spreads, widens, violet light leaks
// ---------------------------------------------------------------------------------------------------------------

const S21_CRACK = at('s21-crack');
const S21_WIDE = at('s21-widen');
// The helm plate is drawn here in the shot's own pixels (not the rig's helm card), so the crack reads as a crack in
// armour whatever the rig textures are: dark metal, a plate seam with rivets, the lit slit for scale, a jagged crack
// that grows on the two hits with violet light leaking along it, chips flying off its tip.
/** Locked camera: the stage is empty in this shot, the plate is drawn on screen. */
const S21_CAM = (): CameraPose => ECU;
const S21_RNG = seeded('p1-s21-crack');
/** Trunk of the crack, top of the plate down towards the slit, in frame px; branches split off it. */
const S21_TRUNK: [number, number][] = (() => {
  const pts: [number, number][] = [[1010, 70]];
  for (let i = 1; i <= 12; i++) pts.push([1010 + S21_RNG.range(-70, 70) - i * 6, 70 + i * 58]);
  return pts;
})();
const S21_BRANCHES: { at: number; pts: [number, number][] }[] = [3, 6, 8, 10].map((k, j) => {
  const o = S21_TRUNK[k] as [number, number];
  const dir = j % 2 ? 1 : -1;
  const pts: [number, number][] = [o];
  for (let i = 1; i <= 4; i++) pts.push([o[0] + dir * i * S21_RNG.range(40, 70), o[1] + i * S21_RNG.range(10, 40)]);
  return { at: k, pts };
});
const S21_RIVETS: [number, number][] = Array.from({ length: 13 }, (_, i) => [80 + i * 150, 250 + 40 * Math.sin(i * 0.5)] as [number, number]);
const jag = (pts: readonly [number, number][]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`;
/** First n (fractional) points of a polyline. */
const upTo = (pts: readonly [number, number][], n: number): [number, number][] => {
  if (n <= 0) return [];
  const k = Math.floor(n);
  const out = pts.slice(0, Math.min(pts.length, k + 1));
  const a = pts[k];
  const b = pts[k + 1];
  if (a && b && n > k) out.push([a[0] + (b[0] - a[0]) * (n - k), a[1] + (b[1] - a[1]) * (n - k)]);
  return out;
};

const S21 = ({ frame }: { frame: number }) => {
  const f2 = two(frame);
  // trunk length: the hairline from S19 (3 segments), then grows on each hit
  const len = 3 + 4.5 * outCubic(prog(f2, S21_CRACK, 6)) + 4.5 * outCubic(prog(f2, S21_WIDE, 6));
  const trunk = upTo(S21_TRUNK, len);
  const tip = trunk[trunk.length - 1] as [number, number];
  const wide = frame >= S21_WIDE;
  const glow = (wide ? 1 : 0.55) * (0.85 + 0.15 * Math.sin(f2 * 0.7));
  const sh = [S21_CRACK, S21_WIDE].reduce((acc, h) => {
    const q = shake(frame, h, 16, h, 14);
    return { x: acc.x + q.x, y: acc.y + q.y };
  }, { x: 0, y: 0 });
  const push = lerp(1, 1.07, prog(frame, S21_CRACK, 28));
  const impacts: Impact[] = [
    { at: S21_CRACK, size: 'small', point: { px: [tip[0], tip[1]] }, splash: null, burst: false, lines: null, push: false },
    { at: S21_WIDE, size: 'small', point: { px: [tip[0], tip[1]] }, splash: null, burst: false, lines: null, push: false },
  ];
  const branches = S21_BRANCHES.filter((b) => b.at < len - 0.5).map((b) => upTo(b.pts, Math.min(4, (len - b.at) * 1.4)));
  const lines = [trunk, ...branches];
  return (
    <PaintingShot
      frame={frame} camera={S21_CAM} impacts={impacts}
      stage={() => null}
      overlay={() => (
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) scale(${push})` }}>
          <Overlay>
            <defs>
              <filter id="p1-s21-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
              <filter id="p1-s21-glow2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
              <linearGradient id="p1-s21-metal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#2E2A25" /><stop offset="0.5" stopColor="#141210" /><stop offset="1" stopColor="#24201C" />
              </linearGradient>
            </defs>
            {/* the face plate, a sheen of reflected gold along its upper edge, the plate seam and rivets */}
            <rect x={-60} y={-60} width={2040} height={1200} fill="url(#p1-s21-metal)" />
            {/* the brow plate above the seam is a separate, lighter-lit piece of armour */}
            <path d="M-60 -60 H1980 V200 Q 960 120 -60 200 Z" fill="#3A342D" />
            <path d="M-60 200 Q 960 120 1980 200" fill="none" stroke={GOLD} strokeWidth={9} />
            <path d="M-60 222 Q 960 145 1980 222" fill="none" stroke={INK} strokeWidth={22} />
            {/* centre ridge of the face plate, lit on one side */}
            <path d="M940 240 L900 1100" stroke="#3A342D" strokeWidth={34} />
            <path d="M958 240 L918 1100" stroke={GOLD} strokeWidth={4} opacity={0.7} />
            {S21_RIVETS.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y - 4} r={24} fill="#3A342D" stroke={INK} strokeWidth={6} />
                <path d={`M${x - 15} ${y - 14} A 18 18 0 0 1 ${x + 8} ${y - 22}`} fill="none" stroke={GOLD} strokeWidth={5} />
              </g>
            ))}
            {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${120 + i * 210} 320 L${80 + i * 210} 1080`} stroke="#141210" strokeWidth={26} opacity={0.8} />)}
            {/* the slit, lit, at the bottom of the frame */}
            <path d="M380 820 L1540 790 L1540 850 L380 870 Z" fill={INK} />
            <path d="M420 825 L1500 800 L1500 845 L420 862 Z" fill={VIOLET} />
            <path d="M520 832 L1400 812 L1400 832 L520 848 Z" fill={VIOLET_LIGHT} />
            {/* light leaking out along the crack: wide soft glow, a tighter glow, the bright core, then the dark lip */}
            {lines.map((l, i) => <path key={`g${i}`} d={jag(l)} fill="none" stroke={VIOLET} strokeWidth={(i ? 34 : 70) * glow} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} filter="url(#p1-s21-glow)" />)}
            {lines.map((l, i) => <path key={`h${i}`} d={jag(l)} fill="none" stroke={VIOLET} strokeWidth={(i ? 10 : 22) * glow} strokeLinecap="round" strokeLinejoin="round" filter="url(#p1-s21-glow2)" />)}
            {lines.map((l, i) => <path key={`c${i}`} d={jag(l)} fill="none" stroke={wide ? IVORY : VIOLET_LIGHT} strokeWidth={i ? 3 : 6} strokeLinecap="round" strokeLinejoin="round" />)}
            {lines.map((l, i) => <path key={`e${i}`} d={jag(l.map(([x, y]) => [x + 7, y + 3] as [number, number]))} fill="none" stroke="#000000" strokeWidth={i ? 3 : 5} strokeLinecap="round" />)}
          </Overlay>
          {/* chips flying off the crack tip on each hit */}
          {[S21_CRACK, S21_WIDE].map((h, i) => (
            <Shards key={i} frame={f2 - h} duration={16} seed={2110 + i} origin={tip} count={16} size={18} speed={24} direction={-Math.PI / 2 + (i ? 0.5 : -0.5)} spread={1.8} gravity={2} fills={['#2A2622', '#1C1A18', VIOLET]} />
          ))}
        </AbsoluteFill>
      )}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S22 - SECOND FORM: the helm halves swing apart, seven eyes open in three rings, PHASE II, the pipes flare
// ---------------------------------------------------------------------------------------------------------------

const S22_SPLIT = at('s22-split');
const S22_E = ['s22-eyes-1', 's22-eyes-2', 's22-eyes-3'].map(at) as [number, number, number];
const BUST = { ...FAN, torso: 5, head: [0, 0], armR: [125, 45, -20, 'grip'], armL: [35, 55, 0, 'spread'], wings: [null, 15], swordZ: 92, flare: 6, lean: 1 } as const;
const eyeRamps = (rings: [number, number, number]) => ({
  eye4: ramp([0, 0, 0], [rings[0], 1, 2]),
  eye3: ramp([0, 0, 0], [rings[1], 1, 2]), eye5: ramp([0, 0, 0], [rings[1], 1, 2]),
  eye1: ramp([0, 0, 0], [rings[2], 1, 2]), eye2: ramp([0, 0, 0], [rings[2], 1, 2]), eye6: ramp([0, 0, 0], [rings[2], 1, 2]), eye7: ramp([0, 0, 0], [rings[2], 1, 2]),
});
const S22_TL: Timeline = {
  keys: [{ at: 0, pose: { ...BOWED, head: [-2, 0.01] } as never, dur: 0 }, { at: S22_SPLIT, pose: BUST as never, dur: 12, ease: 'strike', hands: 'instant', impact: true }],
  helm: [{ at: S22_SPLIT, value: 'split' }],
  ramps: { helmSplit: ramp([S22_SPLIT, 0, 0], [S22_SPLIT + 4, 0.72, 4]), ...eyeRamps(S22_E) },
};
const S22_CUES = gradeCues([{ at: { frame: S22_SPLIT }, grade: 'V', hold: nextBeat(S22_SPLIT) - S22_SPLIT }], 'p1 S22');
const S22_CAM = handheld(tween({ ...LOW, position: [0, 1.2, 6] }, { ...LOW, position: [0, 2.6, 0.5], target: [0, 9.6, -15] }, { start: S22_SPLIT, frames: 51 }), { amp: 0.04, seed: 's22' });

const S22 = ({ frame }: { frame: number }) => {
  const st = rigFor(S22_TL, frame);
  const fk = rigFk(st);
  const face = rigWorld(st, fk, 'void_head', [0, 0.1]);
  const impacts: Impact[] = [{ at: S22_SPLIT, size: 'big', point: face, splash: 'violet', scale: 1.5 }];
  return (
    <PaintingShot
      frame={frame} camera={S22_CAM} impacts={impacts} cues={S22_CUES}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} near={false} />
          <Vorathul state={st} frame={frame} cracks={frame >= S22_SPLIT ? 1 : 0} echoes={echoesAt(S22_TL, frame, [S22_SPLIT], { frames: 6 })} />
        </>
      )}
      overlay={({ pose }) => {
        const eyes = [1, 2, 3, 4, 5, 6, 7].map((i) => project(pose, rigWorld(st, fk, `eye_${i}`, [0, 0])));
        const ring = (i: number) => (i === 4 ? S22_E[0] : i === 3 || i === 5 ? S22_E[1] : S22_E[2]);
        return (
          <>
            <Overlay>{eyes.map((e, k) => <Glint key={k} frame={frame} at={ring(k + 1)} x={e.x} y={e.y} size={e.s * 0.07} hold={false} />)}</Overlay>
            {frame >= S22_E[0] ? (
              <Panel pts={[[1330, 150], [1860, 110], [1860, 640], [1300, 700]]} slam={slamIn(frame, S22_E[0])} border={14}>
                <Img src={staticFile('plates/04-ikinci-form.jpg')} style={{ position: 'absolute', left: 1180, top: 60, width: 900, height: 600, objectFit: 'cover' }} />
              </Panel>
            ) : null}
          </>
        );
      }}
      top={() => <Caption frame={frame} at={S22_SPLIT} until={S22_SPLIT + 45} text="PHASE II" x={560} y={190} size={130} rot={-4} />}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S23 - insert on the health bar: the three phase pips light one per word; III glows and pulses
// ---------------------------------------------------------------------------------------------------------------

const S23_IN = at('s23-pip-1');
const S23_PULSE = at('s23-pulse');
const SECOND_FORM_TL: Timeline = {
  keys: [{ at: 0, pose: BUST as never, dur: 0 }, { at: at('s24-slam') - 14, pose: 'slam_antic', dur: 18 }],
  helm: [{ at: 0, value: 'split' }],
  ramps: { helmSplit: ramp([0, 0.72, 0]), ...eyeRamps([0, 0, 0]) },
};
const S23_CAM = handheld(tween({ position: [1.5, 5, 16], target: [0, 7.5, -15] }, { position: [-1.5, 5.2, 14], target: [0, 7.6, -15] }, { start: S23_IN, frames: 65 }), { amp: 0.04, seed: 's23' });

const S23 = ({ frame }: { frame: number }) => {
  const st = rigFor(SECOND_FORM_TL, frame);
  const h = hudAt(frame, HUD_EVENTS);
  const truck = lerp(70, -70, prog(frame, S23_IN, 65));
  const pulse = frame >= S23_PULSE && frame < S23_PULSE + 6 ? 1 + 0.06 * (1 - (frame - S23_PULSE) / 6) : 1;
  return (
    <PaintingShot
      frame={frame} camera={S23_CAM} hud={false}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} cracks={1} />
        </>
      )}
      overlay={() => <AbsoluteFill style={{ background: INK, opacity: 0.62 }} />}
      top={() => (h ? <Hud frame={frame} s={{ ...h, slam: pulse }} box={{ x: truck, y: -415, scale: 1.4 }} /> : null)}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S24 - the second-form slam: all heroes fly; the knight's shield shatters; the seven eyes flare; the lucky bolt
// ---------------------------------------------------------------------------------------------------------------

const S24_SLAM = at('s24-slam');
const S24_FLY = at('s24-fly');
const S24_SHIELD = at('s24-shield');
const S24_DEBRIS = at('s24-debris');
const S24_EYES = at('s24-eyes');
const S24_BOLT = at('s24-bolt');
const S24_TL: Timeline = {
  keys: [
    { at: 0, pose: 'slam_antic', dur: 0 },
    { at: S24_SLAM, pose: 'slam_strike', dur: 12, ease: 'strike', hands: 'instant', impact: true },
    { at: S24_SLAM + 16, pose: 'slam_follow', dur: 16 },
    { at: S24_EYES, pose: { ...BUST, armR: [-10, 80, 0, 'grip'], torso: 8, head: [4, 0], swordZ: 64 } as never, dur: 16 },
    { at: S24_BOLT + 2, pose: { ...BUST, armR: [-10, 80, 0, 'grip'], torso: -5, head: [-6, 0.01], swordZ: 64, lean: -2 } as never, dur: 12 },
  ],
  helm: [{ at: 0, value: 'split' }],
  ramps: { helmSplit: ramp([0, 0.72, 0]), ...eyeRamps([0, 0, 0]) },
};
const S24_CUES = gradeCues([{ at: { frame: S24_SLAM }, grade: 'V', hold: nextBeat(S24_SLAM) - S24_SLAM }], 'p1 S24');
const S24_CAM = handheld(tween({ position: [4.5, 1.3, 17], target: [-1.2, 6.2, -15], fov: 46 }, { position: [3.8, 1.6, 14], target: [-1, 6.6, -15], fov: 46 }, { start: S24_SLAM, frames: 78 }), { amp: 0.06, seed: 's24' });

const S24 = ({ frame }: { frame: number }) => {
  const st = rigFor(S24_TL, frame);
  const fk = rigFk(st);
  const c = chest(st, fk);
  const slamSt = rigFor(S24_TL, S24_SLAM);
  const ground: Vec3 = [rigWorld(slamSt, rigFk(slamSt), 'sword', [0, -0.6])[0], 0.1, -11.5];
  const launch = (kind: HeroKind, a: Vec3, b: Vec3, flip: boolean, k: number): HeroTrack => {
    if (frame < S24_FLY) return { kind, pose: frame < S24_SLAM ? 'ready' : 'fly', p: frame < S24_SLAM ? [a[0], 0, a[2]] : [a[0], 0.4 + 0.6 * prog(frame, S24_SLAM, 16), a[2]], centre: frame >= S24_SLAM, flip, rot: frame >= S24_SLAM ? (flip ? -10 : 10) : 0 };
    const t = prog(frame, S24_FLY, 26 + k * 3);
    if (t >= 1) return { kind, pose: 'sit', p: [b[0], 0, b[2]], flip };
    return { kind, pose: 'fly', p: [lerp(a[0], b[0], t), 1 + 5.5 * Math.sin(t * Math.PI) * (1 - t * 0.3), lerp(a[2], b[2], t)], rot: (flip ? -1 : 1) * 540 * t, centre: true, flip };
  };
  const knight = launch('knight', [-3.6, 0, -10.6], [-9.4, 0, -9.2], false, 0);
  const heroes: HeroTrack[] = [
    launch('mage', [3.8, 0, -10.2], [8.8, 0, -9], true, 1),
    launch('archer', [5.6, 0, -11.4], [11, 0, -10.2], true, 2),
    launch('rogue', [-5.4, 0, -11.8], [-11, 0, -10.6], false, 3),
  ];
  const mage = heroes[0] as HeroTrack;
  if (frame >= S24_BOLT - 10 && frame < S24_BOLT + 4 && mage.pose === 'sit') heroes[0] = { ...mage, pose: 'attack' };
  const impacts: Impact[] = [
    { at: S24_SLAM, size: 'big', point: ground, splash: 'violet', scale: 1.5 },
    { at: S24_BOLT, size: 'small', point: c, splash: 'black', burst: true },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S24_CAM} impacts={impacts} cues={S24_CUES} dutch={4}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} cracks={1} echoes={echoesAt(S24_TL, frame, [S24_SLAM], { frames: 7 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
          <Hero kind="knight" pose={knight.pose} position={knight.p} rot={knight.rot} centre={knight.centre} renderOrder={RO.hero} flat={sil ? INK : null} hidden={frame >= S24_SHIELD} />
          <Hero kind="knight" pose={knight.pose} position={knight.p} rot={knight.rot} centre={knight.centre} renderOrder={RO.hero} flat={sil ? INK : null} hidden={frame < S24_SHIELD} bare />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const g = project(pose, ground);
        const k = project(pose, knight.p);
        const eyes = [1, 2, 3, 4, 5, 6, 7].map((i) => project(pose, rigWorld(st, fk, `eye_${i}`, [0, 0])));
        const staff = project(pose, [mage.p[0] - 0.5, 1.7, mage.p[2]]);
        const tc = project(pose, c);
        const ringAge = f2 - S24_SLAM;
        const ring = ringAge >= 0 && ringAge < 24 ? Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          const r = 0.5 + 16 * outCubic(ringAge / 24);
          const q = project(pose, [ground[0] + Math.cos(a) * r, 0.02, ground[2] + Math.sin(a) * r]);
          return `${q.x.toFixed(0)} ${q.y.toFixed(0)}`;
        }) : null;
        return (
          <>
            <Overlay>
              {ring ? <path d={`M${ring.join('L')}Z`} fill="none" stroke={VIOLET} strokeWidth={lerp(30, 4, ringAge / 24)} opacity={1 - ringAge / 24} /> : null}
              <ShieldShatter c={[k.x, k.y]} s={k.s * 0.55} age={f2 - S24_SHIELD} />
              {eyes.map((e, i) => <Glint key={i} frame={frame} at={S24_EYES + (i % 3)} x={e.x} y={e.y} size={e.s * 0.09} hold={false} />)}
              <Bolt f={f2} t0={S24_BOLT - 6} t1={S24_BOLT} a={[staff.x, staff.y]} b={[tc.x, tc.y]} size={staff.s * 0.22} seed={2401} />
              <Puffs c={[g.x, g.y]} s={g.s * 2.2} age={f2 - S24_SLAM} count={9} seed={2402} life={34} />
            </Overlay>
            <Shards frame={f2 - S24_DEBRIS} duration={30} seed={2403} origin={[g.x, g.y]} count={36} size={g.s * 0.45} speed={g.s * 0.5} direction={-Math.PI / 2} spread={Math.PI * 1.3} gravity={2} fills={[GOLD, GOLD, IVORY]} />
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S25 - PHASE III: the bar falls to the III pip, the sword goes up (head level); METEOR RAIN; the first lands; tears
// ---------------------------------------------------------------------------------------------------------------

const S25_IN = at('s25-phase3');
const S25_RAIN = at('s25-meteor-rain');
const S25_WEPT = at('s25-wept');
const S25_TL: Timeline = {
  keys: [
    { at: 0, pose: 'summon_antic', dur: 0 },
    { at: S25_IN, pose: { ...(BUST as object), armR: [150, 20, -45, 'grip'], armL: [40, 20, 0, 'spread'], torso: 10, head: [0, -0.005], pelvis: [0, 0.04], swordZ: 92, wings: [null, 15] } as never, dur: 12, ease: 'strike', hands: 'instant', impact: true },
    { at: S25_RAIN, pose: { ...(BUST as object), armR: [160, 15, -45, 'grip'], armL: [60, 20, 0, 'spread'], torso: 12, head: [2, -0.005], pelvis: [0, 0.04], swordZ: 92, wings: [null, 15], lean: 2 } as never, dur: 18, ease: 'strike', impact: true },
  ],
  helm: [{ at: 0, value: 'split' }],
  ramps: { helmSplit: ramp([0, 0.72, 0]), ...eyeRamps([0, 0, 0]) },
};
const S25_CAM = handheld(tween({ position: [-9, 2.2, 26], target: [-2.6, 7, -15] }, { position: [-8.2, 2.6, 23], target: [-2.2, 10.6, -15] }, { start: S25_IN, frames: 73 }), { amp: 0.06, seed: 's25' });
/** The first wave of Meteor Rain: launch frame, duration (the first lands on "wept"), world from -> to. */
const METEORS: { t0: number; dur: number; to: Vec3; size: number }[] = (() => {
  const rng = seeded('p1-meteors');
  const out: { t0: number; dur: number; to: Vec3; size: number }[] = [{ t0: S25_RAIN, dur: S25_WEPT - S25_RAIN, to: [-6.4, 0, -9.6], size: 1.0 }];
  for (let i = 1; i < 15; i++) out.push({ t0: S25_RAIN + i * 2, dur: rng.range(24, 38), to: [rng.range(-15, 9), 0, rng.range(-26, -8)], size: rng.range(0.6, 1.25) });
  return out;
})();

const S25 = ({ frame }: { frame: number }) => {
  const st = rigFor(S25_TL, frame);
  const fk = rigFk(st);
  const tip = rigWorld(st, fk, 'sword', [0, -0.62]);
  const heroes: HeroTrack[] = [
    { kind: 'knight', pose: 'sit', p: [-9.4, 0, -9.2] },
    { kind: 'mage', pose: 'sit', p: [-6.2, 0, -8.4] },
    { kind: 'archer', pose: frame >= S25_WEPT ? 'sit' : 'ready', p: [-4, bob(frame, 9), -9.6] },
    { kind: 'rogue', pose: 'sit', p: [-11.4, 0, -10.6] },
  ];
  const impacts: Impact[] = [
    { at: S25_IN, size: 'medium', point: tip, splash: 'violet', burst: false },
    { at: S25_WEPT, size: 'medium', point: METEORS[0]!.to, splash: 'violet', scale: 1.4 },
  ];
  return (
    <PaintingShot
      frame={frame} camera={S25_CAM} impacts={impacts} dutch={-5}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} cracks={1} echoes={echoesAt(S25_TL, frame, [S25_IN, S25_RAIN], { frames: 6 })} />
          <Party heroes={heroes} flat={sil ? INK : null} />
        </>
      )}
      overlay={({ pose }) => {
        const f2 = two(frame);
        const land = project(pose, METEORS[0]!.to);
        return (
          <>
            {METEORS.map((m, i) => {
              const a = project(pose, [m.to[0] + 11, 25, m.to[2] - 4]);
              const b = project(pose, m.to);
              return <Meteor key={i} frame={frame - m.t0} duration={m.dur} seed={2500 + i} from={[a.x, a.y]} to={[b.x, b.y]} size={b.s * 0.75 * m.size} />;
            })}
            <Shards frame={f2 - S25_WEPT} duration={26} seed={2510} origin={[land.x, land.y]} count={30} size={land.s * 0.5} speed={land.s * 0.55} direction={-Math.PI / 2} spread={Math.PI * 1.2} gravity={2} fills={[GOLD, IVORY, GOLD]} />
            <Overlay>
              <Puffs c={[land.x, land.y]} s={land.s * 2} age={f2 - S25_WEPT} count={8} seed={2511} life={30} />
              {heroes.map((h, i) => {
                const q = project(pose, [h.p[0], h.p[1] + 1.05, h.p[2]]);
                return <Tears key={i} c={[q.x, q.y]} s={q.s * 1.1} t={f2 - S25_WEPT - i} />;
              })}
            </Overlay>
          </>
        );
      }}
      top={() => (
        <>
          <Caption frame={frame} at={S25_IN} until={S25_IN + 30} text="PHASE III" x={620} y={200} size={130} rot={-5} />
          <Caption frame={frame} at={S25_RAIN} text="METEOR RAIN" x={1180} y={210} size={120} rot={4} />
        </>
      )}
    />
  );
};

export const VERSE_SHOTS = { S20, S21, S22, S23, S24, S25 };
export const P1_GRADE_CUES = { S22: S22_CUES, S24: S24_CUES };
export type { CameraPose };
