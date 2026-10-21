// Scene 1, the intro chant (S01-S06): the world is painted around a hole, the black-hole establishing shot, the
// kneeling army, the eye ignites, the organ lights, four hero panels slam in.
import { AbsoluteFill } from 'remotion';
import { tween, handheld, WIDE, ECU, CLOSE, LOW, type CameraPose } from '../../camera/api.ts';
import { InkFilter, inkFilterId, Overlay, seeded, shake, SpeedLines } from '../../vfx/effects.ts';
import { at } from './events.ts';
import { bbox, Glint, PanelArt } from './fx.tsx';
import { HeroImg, type HeroKind } from './heroes.tsx';
import { clamp01, count, GOLD, INK, inOut, IVORY, lerp, outCubic, prog, project, ShotFrame, VIOLET, VIOLET_LIGHT } from './kit.tsx';
import { PaintingShot } from './paint.tsx';
import { rigFk, rigFor, rigWorld, Vorathul, type PipeEvent, type Timeline } from './vorathul.tsx';
import { World } from './world.tsx';

// ---------------------------------------------------------------------------------------------------------------
// shared glow states before the riff
// ---------------------------------------------------------------------------------------------------------------

const DARK = { slitOpacity: [{ at: 0, v: 0, dur: 0 }], gems: [{ at: 0, v: 0, dur: 0 }], studs: [{ at: 0, v: 0, dur: 0 }], runes: [{ at: 0, v: 0, dur: 0 }] };
const FOLDED = { wingS_R: [{ at: 0, v: 0, dur: 0 }], wingS_L: [{ at: 0, v: 0, dur: 0 }] };
const PIPES_DARK: PipeEvent[] = [{ at: 0, wing: 'both', pipe: 'all', op: 'dark' }];

/** Gold dust motes drifting in the light, glinting. */
const Dust = ({ frame, n = 46, seed = 'dust', color = GOLD }: { frame: number; n?: number; seed?: string; color?: string }) => {
  const rng = seeded(`p1-${seed}`);
  return (
    <Overlay>
      {Array.from({ length: n }, (_, i) => {
        const x0 = rng.range(0, 1920);
        const y0 = rng.range(0, 1080);
        const sp = rng.range(0.15, 0.6);
        const ph = rng.range(0, 6.28);
        const tw = Math.max(0, Math.sin(frame * 0.21 + ph));
        const r = rng.range(1.5, 4.5) * (0.4 + tw);
        return <circle key={i} cx={x0 + Math.sin(frame * 0.02 + ph) * 30} cy={(y0 - frame * sp + 1080) % 1080} r={r} fill={color} opacity={0.35 + 0.65 * tw} />;
      })}
    </Overlay>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S01 - black field, gold strokes paint the world around the hole
// ---------------------------------------------------------------------------------------------------------------

const lancetPx = (x0: number, x1: number, ys: number, yb: number) => {
  const w = x1 - x0;
  return `M${x0} ${yb}V${ys}A${w} ${w} 0 0 1 ${(x0 + x1) / 2} ${ys - 0.866 * w}A${w} ${w} 0 0 1 ${x1} ${ys}V${yb}`;
};
const S01_STROKES: { d: string[]; width: number }[] = [
  // floor lines to the vanishing point under him
  { d: [-200, 260, 620, 960 - 620, 960 - 260, 2120].map((x) => `M${960 + (x - 960) * 1.8} 1180L${960 + (x - 960) * 0.18} 700`), width: 16 },
  { d: [[110, 300, 560, 860], [330, 470, 500, 860], [500, 600, 470, 820]].map(([a, b, c, e]) => lancetPx(a as number, b as number, c as number, e as number)), width: 18 },
  { d: [[1620, 1810, 560, 860], [1450, 1590, 500, 860], [1320, 1420, 470, 820]].map(([a, b, c, e]) => lancetPx(a as number, b as number, c as number, e as number)), width: 18 },
  { d: ['M720 860L720 210L745 120L770 210L770 860', 'M1150 860L1150 210L1175 120L1200 210L1200 860', 'M640 860L640 330L655 270L670 330', 'M1250 860L1250 330L1265 270L1280 330'], width: 14 },
  // the hole: his outline in gold around an untouched black centre
  {
    d: ['M960 700L905 640L860 470L790 420L700 395L655 330L760 330L830 290L870 230L865 150L830 60L900 140L912 175L930 150L948 175L960 140L972 175L990 150L1008 175L1020 140L1090 60L1055 150L1050 230L1090 290L1160 330L1265 330L1220 395L1130 420L1060 470L1015 640L960 700', 'M700 395L610 620L560 900L760 860L860 940L960 880L1060 940L1160 860L1360 900L1310 620L1220 395'],
    width: 12,
  },
];

const RevealStroke = ({ d, width, p, seed }: { d: string; width: number; p: number; seed: number }) => {
  if (p <= 0) return null;
  const id = inkFilterId(seed, width / 3, 0.35, [-400, -400, 2800, 2000]);
  return (
    <g>
      <defs>
        <InkFilter seed={seed} rough={width / 3} breakup={0.35} region={[-400, -400, 2800, 2000]} />
      </defs>
      <g filter={`url(#${id})`} fill="none" stroke={GOLD} strokeLinecap="round" strokeLinejoin="round">
        {[1, 0.6, 0.3].map((k) => (
          <path key={k} d={d} pathLength={1} strokeWidth={width * k} strokeDasharray={`${p * (1 - (1 - k) * 0.3)} 2`} />
        ))}
      </g>
    </g>
  );
};

const S01 = ({ frame }: { frame: number }) => {
  const strokeAt = ['s01-stroke-1', 's01-stroke-2', 's01-stroke-3', 's01-stroke-4', 's01-stroke-5'].map(at);
  const k = lerp(1, 1.03, frame / 104);
  return (
    <ShotFrame frame={frame} background={INK}>
      <AbsoluteFill style={{ transform: `scale(${k})` }}>
        <Overlay>
          {S01_STROKES.map((s, i) => s.d.map((d, j) => <RevealStroke key={`${i}-${j}`} d={d} width={s.width} p={outCubic(prog(frame, (strokeAt[i] as number) + j * 2, 14))} seed={300 + i * 10 + j} />))}
        </Overlay>
        <Dust frame={frame} n={30} seed="s01" />
      </AbsoluteFill>
    </ShotFrame>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S02 - the black hole establishing shot
// ---------------------------------------------------------------------------------------------------------------

const S02_TL: Timeline = { keys: [{ at: 0, pose: 'base', dur: 0 }], ramps: { ...DARK, ...FOLDED }, pipes: PIPES_DARK };
const S02_RAYS = ['s02-rays-1', 's02-rays-2', 's02-rays-3', 's02-rays-4'].map(at);
const S02_CLOUDS = ['s02-clouds-1', 's02-clouds-2'].map(at);
const S02_KEYS = [...S02_RAYS, ...S02_CLOUDS].sort((a, b) => a - b);
// The storyboard WIDE push (z 40 -> 34), taken from just above the kneeling army so the black mass towers.
const S02_FROM: CameraPose = { position: [0, 1.1, 40], target: [0, 7.4, -15], fov: 40 };
const S02_TO: CameraPose = { ...WIDE, position: [0, 1.3, 34], target: [0, 7.6, -15] };
const S02_CAM = handheld(tween(S02_FROM, S02_TO, { start: at('s02-cut'), frames: 123, ease: outCubic }), { amp: 0.05, seed: 's02' });

/** Ivory rings that contract into him on the keys: the light falling into the hole. */
const Implosion = ({ frame, keys, cx, cy, s }: { frame: number; keys: number[]; cx: number; cy: number; s: number }) => {
  return (
    <Overlay>
      {keys.map((k) => {
        const t = (frame - k) / 16;
        if (t < 0 || t >= 1) return null;
        const r = lerp(14, 1.2, outCubic(t)) * s;
        return <ellipse key={k} cx={cx} cy={cy} rx={r * 1.25} ry={r} fill="none" stroke={IVORY} strokeWidth={lerp(3, 10, t)} opacity={0.75 * (1 - t * t)} />;
      })}
    </Overlay>
  );
};

const S02 = ({ frame }: { frame: number }) => {
  const st = rigFor(S02_TL, frame);
  const bend = S02_RAYS.reduce((a, k) => a + 3 * outCubic(prog(frame, k, 6)), 0);
  const shift = S02_CLOUDS.reduce((a, k) => a + 3.5 * outCubic(prog(frame, k, 12)), 0);
  return (
    <PaintingShot
      frame={frame}
      camera={S02_CAM}
      hud={false}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={bend} cloudShift={shift} />
          <Vorathul state={st} frame={frame} />
        </>
      )}
      overlay={({ pose }) => {
        const c = project(pose, [0, 7, -15]);
        return (
          <>
            <Implosion frame={frame} keys={S02_KEYS} cx={c.x} cy={c.y} s={c.s} />
            <Dust frame={frame} />
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S03 - the kneeling army, a truck past the soldiers
// ---------------------------------------------------------------------------------------------------------------

const S03_BOWS = ['s03-bow-1', 's03-bow-2', 's03-bow-3', 's03-bow-4', 's03-bow-5'].map(at);
const S03_CAM = handheld(
  tween({ position: [-11, 1.1, 2.2], target: [-9, 1.9, -8], fov: 40 }, { position: [11, 1.1, 2.2], target: [9, 1.9, -8], fov: 40 }, { start: at('s03-cut'), frames: 137, ease: inOut }),
  { amp: 0.03, seed: 's03' },
);
const pulse = (t: number) => (t < 0 ? 0 : t < 5 ? t / 5 : t < 16 ? 1 - (t - 5) / 11 : 0);

const S03 = ({ frame }: { frame: number }) => {
  const st = rigFor(S02_TL, frame);
  const bow = (_i: number, x: number) => S03_BOWS.reduce((a, k) => a + pulse(frame - k - (x + 20) * 0.35), 0);
  const tb = frame - at('s03-banners');
  const sway = tb < 0 ? 0 : 5 * Math.exp(-tb / 18) * Math.sin(tb * 0.32);
  return (
    <PaintingShot
      frame={frame}
      camera={S03_CAM}
      hud={false}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} bow={bow} sway={sway} />
          <Vorathul state={st} frame={frame} />
        </>
      )}
      overlay={() => <Dust frame={frame} n={36} seed="s03" />}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S04 - the eye slit ignites, violet climbs the armour
// ---------------------------------------------------------------------------------------------------------------

const S04_GEMS = ['s04-gem-1', 's04-gem-2', 's04-gem-3'].map(at) as [number, number, number];
const S04_STUDS = ['s04-stud-l', 's04-stud-r'].map(at) as [number, number];
const S04_RUNE = at('s04-rune');
const S04_TL: Timeline = {
  keys: [{ at: 0, pose: 'base', dur: 0 }],
  ramps: {
    ...FOLDED,
    slitOpacity: [{ at: 0, v: 0, dur: 0 }, { at: at('s04-cut') + 4, v: 1, dur: 4 }],
    gems: [{ at: 0, v: 0, dur: 0 }, { at: S04_GEMS[2], v: 1, dur: 0 }],
    studs: [{ at: 0, v: 0, dur: 0 }, { at: S04_STUDS[1], v: 1, dur: 0 }],
    runes: [{ at: 0, v: 0, dur: 0 }, { at: S04_RUNE + 16, v: 1, dur: 0 }],
  },
  pipes: PIPES_DARK,
};
const S04_CAM = handheld(tween(ECU, CLOSE, { start: at('s04-cut'), frames: 106, ease: inOut }), { amp: 0.02, seed: 's04' });

const S04 = ({ frame }: { frame: number }) => {
  const st = rigFor(S04_TL, frame);
  const fk = rigFk(st);
  const cut = at('s04-cut');
  return (
    <PaintingShot
      frame={frame}
      camera={S04_CAM}
      hud={false}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} />
        </>
      )}
      overlay={({ pose }) => {
        const P = (node: string, p: [number, number]) => project(pose, rigWorld(st, fk, node, p));
        const slit = P('eye_slit', [0, 0]);
        const gems = [-0.03, 0, 0.03].map((x) => P('crown_gems', [x, 0.01]));
        const studs = [0.057, -0.058].map((x) => P('chest_studs', [x, 0.184]));
        const tip = P('sword', [0, -0.54]);
        const guard = P('sword', [0, -0.076]);
        const rp = clamp01((frame - S04_RUNE) / 16);
        const flare = clamp01((frame - cut) / 10);
        return (
          <>
            <Overlay>
              {/* the ignition flare: a hard violet streak through the slit */}
              {flare < 1 ? <path d={`M${slit.x - 900 * outCubic(flare)} ${slit.y}L${slit.x} ${slit.y - 7 * (1 - flare)}L${slit.x + 900 * outCubic(flare)} ${slit.y}L${slit.x} ${slit.y + 7 * (1 - flare)}Z`} fill={VIOLET_LIGHT} opacity={1 - flare} /> : null}
              <Glint frame={frame} at={cut} x={slit.x} y={slit.y} size={slit.s * 0.5} hold={false} />
              {gems.map((g, i) => (frame < S04_GEMS[2] + 6 ? <Glint key={i} frame={frame} at={S04_GEMS[i] as number} x={g.x} y={g.y} size={g.s * 0.12} hold={frame < S04_GEMS[2]} /> : null))}
              {studs.map((g, i) => (frame < S04_STUDS[1] + 6 ? <Glint key={`s${i}`} frame={frame} at={S04_STUDS[i] as number} x={g.x} y={g.y} size={g.s * 0.14} hold={frame < S04_STUDS[1]} /> : null))}
              {rp > 0 && frame < S04_RUNE + 18 ? (
                <path d={`M${tip.x} ${tip.y}L${lerp(tip.x, guard.x, rp)} ${lerp(tip.y, guard.y, rp)}`} stroke={VIOLET} strokeWidth={Math.max(3, tip.s * 0.02)} strokeLinecap="round" />
              ) : null}
              {rp > 0 && rp < 1 ? <Glint frame={frame} at={S04_RUNE} x={lerp(tip.x, guard.x, rp)} y={lerp(tip.y, guard.y, rp)} size={tip.s * 0.06} hold /> : null}
            </Overlay>
            <Dust frame={frame} n={24} seed="s04" />
          </>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------------------------
// S05 - the organ: one pair of pipe mouths per beat, inner to outer
// ---------------------------------------------------------------------------------------------------------------

const S05_PAIRS = ['s05-cut', 's05-pipes-1', 's05-pipes-2', 's05-pipes-3', 's05-pipes-4', 's05-pipes-5', 's05-pipes-6', 's05-pipes-7'].map(at);
const S05_TL: Timeline = {
  keys: [{ at: 0, pose: 'base', dur: 0 }, { at: S05_PAIRS[7] as number, pose: { wings: [null, 6], torso: 2, head: [2, 0] }, dur: 24 }],
  ramps: FOLDED,
  pipes: [...PIPES_DARK, ...S05_PAIRS.map((f, i): PipeEvent => ({ at: f, wing: 'both', pipe: i, op: 'lit' }))],
};
const S05_CAM = handheld(tween(LOW, { ...LOW, target: [0, 12.5, -15] }, { start: at('s05-cut'), frames: 78, ease: inOut }), { amp: 0.03, seed: 's05' });

const S05 = ({ frame }: { frame: number }) => {
  const st = rigFor(S05_TL, frame);
  const fk = rigFk(st);
  return (
    <PaintingShot
      frame={frame}
      camera={S05_CAM}
      hud={false}
      stage={({ sil }) => (
        <>
          <World sil={sil} rayBend={12} cloudShift={7} />
          <Vorathul state={st} frame={frame} />
        </>
      )}
      overlay={({ pose }) => (
        <Overlay>
          {S05_PAIRS.map((f, i) =>
            (['R', 'L'] as const).map((side) => {
              const it = VORA_PIPES[i] as { len: number };
              const p = project(pose, rigWorld(st, fk, `wing_root_${side}`, pipeMouth(st, side, i, it.len)));
              return <Glint key={`${i}${side}`} frame={frame} at={f} x={p.x} y={p.y} size={p.s * 0.6} hold={false} />;
            }),
          )}
        </Overlay>
      )}
    />
  );
};

import { VORATHUL_RIG } from '../../rig/model.ts';
import { pipeGeom } from '../../rig/pipes.ts';
const VORA_PIPES = VORATHUL_RIG.json.pipes.items;
/** Pipe i's mouth in its wing root's frame (H): root + dir * mouth centre at the current theta. */
const pipeMouth = (st: ReturnType<typeof rigFor>, side: 'R' | 'L', i: number, _len: number): [number, number] => {
  const ps = st.wings[side].pipes[i]!;
  const g = pipeGeom(VORATHUL_RIG.json.pipes, VORA_PIPES[i]!, ps.theta, ps.lengthScale, ps.fly);
  return [g.root[0] + g.dir[0] * g.mouthCentre, g.root[1] + g.dir[1] * g.mouthCentre];
};
export { pipeMouth };

// ---------------------------------------------------------------------------------------------------------------
// S06 - four diagonal hero panels slam in on the drum fill
// ---------------------------------------------------------------------------------------------------------------

const S06_HITS = ['s06-knight', 's06-mage', 's06-archer', 's06-rogue'].map(at);
const S06_KINDS: HeroKind[] = ['knight', 'mage', 'archer', 'rogue'];

const S06 = ({ frame }: { frame: number }) => {
  const n = count(frame, S06_HITS);
  const sh = S06_HITS.reduce((a, h, i) => {
    const s = shake(frame, h, 9, 600 + i, 10);
    return { x: a.x + s.x, y: a.y + s.y };
  }, { x: 0, y: 0 });
  return (
    <ShotFrame frame={frame} background={INK}>
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
        {S06_KINDS.map((kind, i) => {
          if (i >= n) return null;
          const hitAt = S06_HITS[i] as number;
          const x0 = 40 + i * 465;
          const pts: [number, number][] = [[x0 + 120, -20], [x0 + 520, -20], [x0 + 400, 1100], [x0, 1100]];
          const slam = frame < hitAt + 4 ? lerp(1.45, 1, outCubic((frame - hitAt) / 4)) : 1;
          const cx = x0 + 260;
          return (
            <PanelClip key={kind} pts={pts} slam={slam} cx={cx}>
              <PanelArt id={`H-s06-${kind}`} box={bbox(pts)} push={0.06 * prog(frame, hitAt, 587 - hitAt)} />
            </PanelClip>
          );
        })}
      </AbsoluteFill>
    </ShotFrame>
  );
};

const PanelClip = ({ pts, slam, cx, children }: { pts: [number, number][]; slam: number; cx: number; children: React.ReactNode }) => (
  <AbsoluteFill style={{ transform: `translate(${cx}px, 540px) scale(${slam}) translate(${-cx}px, -540px)` }}>
    <AbsoluteFill style={{ clipPath: `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(',')})` }}>{children}</AbsoluteFill>
    <Overlay>
      <path d={`M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`} fill="none" stroke={INK} strokeWidth={22} />
    </Overlay>
  </AbsoluteFill>
);

export const INTRO_SHOTS = { S01, S02, S03, S04, S05, S06 };
export { DARK, FOLDED, PIPES_DARK, Dust };
