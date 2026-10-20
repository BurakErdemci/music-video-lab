// Vorathul on the painting stage: the shared rig drawn as one flat black mass (#0A0A0A) with violet only on the glow
// cards (eye slit, gems, studs, runes, pipe mouths, the seven eyes), plus code-drawn dressing that gives the
// placeholder rig the silhouette of KARAKTER.md (tattered floor-length cape, spiky fur collar, crescent horns,
// second-form armour cracks). The dressing switches itself off once the rig lane's real part images replace the
// placeholders.
import { forward } from '../../rig/fk.ts';
import { apply, angleOf, type Affine } from '../../rig/math.ts';
import { RIG } from '../../rig/model.ts';
import { Rig, type RigConfig } from '../../rig/Rig.tsx';
import { rigAt, type Key, type RampKey, type Timeline } from '../../rig/timeline.ts';
import type { RigModel, RigState } from '../../rig/types.ts';
import type { PipeEvent } from '../../rig/pipes.ts';
import { seeded } from '../../vfx/effects.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { INK, inkFilterDef, poly, r2, SvgCard, svgDoc, VIOLET, VIOLET_LIGHT } from './kit.tsx';

/** World units per H: feet at y 0, crown tip at y 12 (storyboard 1 §0.1). */
export const UNIT = 12;
export const ORIGIN: Vec3 = [0, 0, -15];

const GLOW = /^(eye_slit|crown_gems|chest_studs|sword_runes|eye_\d|pipe_[RL]\d_glow)$/;
const idColors = Object.fromEntries(Object.keys(RIG.json.idColors).map((id) => [id, GLOW.test(id) ? VIOLET : INK]));
/** The rig model with the film palette as its flat-colour pass: one ink silhouette, violet glows. */
export const VORA: RigModel = { ...RIG, json: { ...RIG.json, idColors } };
export const PLACEHOLDER = Object.values(RIG.json.textures).some((t) => t.src.includes('placeholder'));

// The placeholder collar is a plain block that covers the eye slit in a one-colour pass; the code-drawn fur collar
// replaces it until the real collar drawing lands.
const NO_COLLAR: ReadonlySet<string> | undefined = PLACEHOLDER ? new Set(Object.keys(RIG.json.idColors).filter((id) => id !== 'collar')) : undefined;
export const rigConfig = (origin: Vec3 = ORIGIN, renderBase = 0, model: RigModel = VORA): RigConfig => ({ model, pass: 'id', unit: UNIT, origin, renderBase, isolate: NO_COLLAR });

/** The same rig in one flat colour (strike echoes). */
const MONO = new Map<string, RigModel>();
const monoModel = (color: string): RigModel => {
  let m = MONO.get(color);
  if (!m) {
    m = { ...RIG, json: { ...RIG.json, idColors: Object.fromEntries(Object.keys(RIG.json.idColors).map((id) => [id, color])) } };
    MONO.set(color, m);
  }
  return m;
};
export interface Echo { state: RigState; color: string; offset: Vec3 }
/** Echoes trail only what strikes: arms, hands, sword and pipes (a whole-body copy reads as a second figure). */
const ECHO_PARTS: ReadonlySet<string> = new Set(Object.keys(RIG.json.idColors).filter((id) => /^(upper_arm|forearm|hand)_[RL]$|^sword|^pipe_[RL]\d_(body|mouth)$/.test(id)));

/** Root-local H point of a node -> world, with the root's translation, lean and scale (as Rig.tsx places it). */
export const rigWorld = (st: RigState, fk: Map<string, Affine>, node: string, local: [number, number] = [0, 0], origin: Vec3 = ORIGIN): Vec3 => {
  const m = fk.get(node);
  if (!m) throw new Error(`rig node ${node}`);
  const [x, y] = apply(m, local[0], local[1]);
  const r = (st.ch.rootRot * Math.PI) / 180;
  const s = st.ch.rootScale;
  return [origin[0] + (st.ch.rootX + s * (x * Math.cos(r) - y * Math.sin(r))) * UNIT, origin[1] + (st.ch.rootY + s * (x * Math.sin(r) + y * Math.cos(r))) * UNIT, origin[2] + st.ch.rootZ * UNIT];
};
/** World angle (radians) of a node's frame. */
export const rigAngle = (st: RigState, fk: Map<string, Affine>, node: string): number => angleOf(fk.get(node) as Affine) + (st.ch.rootRot * Math.PI) / 180;

export const rigFk = (st: RigState): Map<string, Affine> => forward(VORA, st);

// ---------------------------------------------------------------------------------------------------------------
// dressing textures
// ---------------------------------------------------------------------------------------------------------------

/** Tattered cape: hangs from the shoulders, flares to the floor, flame-like ragged hem. Three boil variants. */
const CAPE_SVG = [0, 1, 2].map((k) => {
  const w = 1000;
  const h = 1100;
  const rng = seeded(`p1-cape-${k}`);
  const pts: [number, number][] = [[330, 0], [670, 0]];
  // right edge, outward flare
  for (let i = 1; i <= 6; i++) pts.push([670 + i * 48 + rng.range(-14, 14), (i / 6) * 860]);
  // ragged hem, right to left: long flame tongues
  const n = 17;
  for (let i = 0; i <= n; i++) {
    const x = 980 - (i / n) * 960;
    const tongue = i % 2 === 0 ? rng.range(960, 1095) : rng.range(800, 900);
    pts.push([x + rng.range(-12, 12), tongue]);
  }
  for (let i = 6; i >= 1; i--) pts.push([330 - i * 48 + rng.range(-14, 14), (i / 6) * 860]);
  // torn holes near the hem show the floor through the cape
  let holes = '';
  for (let i = 0; i < 4; i++) {
    const cx = rng.range(180, 820);
    const cy = rng.range(780, 900);
    holes += `<path d="${poly([[cx, cy - rng.range(30, 60)], [cx + rng.range(10, 24), cy], [cx, cy + rng.range(20, 50)], [cx - rng.range(10, 24), cy]])}" fill="black"/>`;
  }
  return svgDoc(w, h, `<g filter="url(#k)" mask="url(#m)"><path d="${poly(pts)}" fill="${INK}"/></g>`, `${inkFilterDef('k', 101 + k, 18, 0.12)}<mask id="m"><rect width="${w}" height="${h}" fill="white"/>${holes}</mask>`);
});

/** Spiky fur collar and pauldrons: a crescent of long ink spikes. */
const FUR_SVG = (() => {
  const w = 1200;
  const h = 520;
  const rng = seeded('p1-fur');
  const pts: [number, number][] = [];
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI * (1.05 + 0.9 * t);
    const rIn = 300;
    const rOut = rIn + (i % 2 ? rng.range(40, 80) : rng.range(150, 250)) * (0.6 + 0.4 * Math.sin(Math.PI * t));
    pts.push([600 + Math.cos(a) * (i % 2 ? rIn + 30 : rOut) * 1.5, 470 + Math.sin(a) * (i % 2 ? rIn + 30 : rOut) * 0.85]);
  }
  pts.push([1060, 470], [140, 470]);
  return svgDoc(w, h, `<g filter="url(#k)"><path d="${poly(pts)}" fill="${INK}"/></g>`, inkFilterDef('k', 111, 12, 0.1));
})();

/** One crescent horn (character right = screen left); the left horn is the same card mirrored. */
const HORN_SVG = svgDoc(
  400,
  600,
  `<g filter="url(#k)"><path d="M330 590 C 120 520 40 330 120 20 C 150 260 250 430 390 470 Z" fill="${INK}"/></g>`,
  inkFilterDef('k', 121, 8, 0.05),
);

/** Second form: violet armour cracks over the chest (approved frame 04), one card on the torso. */
const CRACKS_SVG = (() => {
  const w = 600;
  const h = 600;
  const rng = seeded('p1-cracks');
  let d = '';
  const branch = (x: number, y: number, a: number, len: number, wd: number, depth: number) => {
    let px = x;
    let py = y;
    for (let i = 0; i < 5; i++) {
      const nx = px + Math.cos(a) * len / 5;
      const ny = py + Math.sin(a) * len / 5;
      d += `<path d="M${r2(px)} ${r2(py)}L${r2(nx)} ${r2(ny)}" stroke="${VIOLET}" stroke-width="${r2(wd * (1 - i * 0.15))}" stroke-linecap="round"/>`;
      px = nx;
      py = ny;
      a += rng.range(-0.5, 0.5);
      if (depth < 2 && rng() < 0.35) branch(px, py, a + rng.sign() * rng.range(0.6, 1.1), len * 0.45, wd * 0.6, depth + 1);
    }
  };
  branch(300, 60, Math.PI / 2 + 0.1, 520, 22, 0);
  branch(300, 220, 0.4, 230, 14, 1);
  branch(300, 300, Math.PI - 0.5, 220, 14, 1);
  return svgDoc(w, h, `<g filter="url(#k)">${d}</g>`, inkFilterDef('k', 131, 6, 0.1));
})();

/** Helm crack (C04): hairline, spread, wide with violet light leaking. */
export const HELM_CRACK_SVG = [0, 1, 2].map((stage) => {
  const w = 400;
  const h = 300;
  const rng = seeded('p1-helmcrack');
  let d = '';
  const segs: [number, number, number, number, number][] = [];
  let x = 200;
  let y = 20;
  for (let i = 0; i < 9; i++) {
    const nx = x + rng.range(-26, 26);
    const ny = y + 30;
    segs.push([x, y, nx, ny, 0]);
    if (i % 3 === 1) segs.push([nx, ny, nx + rng.sign() * rng.range(40, 80), ny + rng.range(10, 40), 1]);
    x = nx;
    y = ny;
  }
  const shown = stage === 0 ? 4 : stage === 1 ? 9 : segs.length;
  segs.slice(0, shown).forEach(([a, b, c, e, br]) => {
    if (stage === 2) d += `<path d="M${r2(a)} ${r2(b)}L${r2(c)} ${r2(e)}" stroke="${VIOLET}" stroke-width="${br ? 14 : 26}" stroke-linecap="round" opacity="0.9"/>`;
    d += `<path d="M${r2(a)} ${r2(b)}L${r2(c)} ${r2(e)}" stroke="${stage === 0 ? '#F4ECD8' : VIOLET_LIGHT}" stroke-width="${stage === 0 ? 4 : br ? 5 : 8}" stroke-linecap="round"/>`;
  });
  return svgDoc(w, h, `<g filter="url(#k)">${d}</g>`, inkFilterDef('k', 141, 3, 0));
});

// ---------------------------------------------------------------------------------------------------------------
// the figure
// ---------------------------------------------------------------------------------------------------------------

export interface VorathulProps {
  state: RigState;
  origin?: Vec3;
  /** Render-order base (the dressing sits around it). */
  renderBase?: number;
  /** Frame for the cape boil (on twos). */
  frame: number;
  /** Helm crack stage: -1 none, 0 hairline, 1 spread, 2 wide. */
  crack?: number;
  /** Second-form armour cracks (0..1 opacity). */
  cracks?: number;
  hidden?: boolean;
  /** Strike echoes: earlier states drawn behind him in flat colours (violet, ink, ivory). */
  echoes?: readonly Echo[];
}

export const Vorathul = ({ state, origin = ORIGIN, renderBase = 0, frame, crack = -1, cracks = 0, hidden, echoes = [] }: VorathulProps) => {
  const cfg = rigConfig(origin, renderBase);
  const fk = rigFk(state);
  const at = (node: string, p: [number, number]) => rigWorld(state, fk, node, p, origin);
  const ang = (node: string) => rigAngle(state, fk, node);
  const s = state.ch.rootScale;
  const boil = Math.floor(frame / 4) % 3;
  const shoulders = at('torso', [0, 0.27]);
  const torsoA = ang('torso');
  const capeLen = Math.max(4, shoulders[1] + 0.3);
  const split = state.helm.split;
  const horn = (side: 1 | -1) => {
    // Closed: both horns ride the helm. Split: each rides its own half (they swing apart with the jaw hinges).
    const node = !split ? 'head' : side < 0 ? 'helm_half_R' : 'helm_half_L';
    const p: [number, number] = !split ? [side * 0.13, 0.13] : [side * -0.02, 0.17];
    return { pos: at(node, p), rot: ang(node) };
  };
  return (
    <group visible={!hidden}>
      {echoes.map((e, k) => (
        <Rig key={`echo${k}`} cfg={{ ...rigConfig([origin[0] + e.offset[0], origin[1] + e.offset[1], origin[2] + e.offset[2]], renderBase - 40 + k * 10, monoModel(e.color)), isolate: ECHO_PARTS }} state={e.state} />
      ))}
      <Rig cfg={cfg} state={state} />
      {PLACEHOLDER ? (
        <>
          {CAPE_SVG.map((svg, k) => (
            <SvgCard key={`cape${k}`} svg={svg} width={0.95 * UNIT * s} height={capeLen * 1.05} pivot={[0, capeLen * 0.525]} position={[shoulders[0], shoulders[1], origin[2] - 0.05]} rotation={[0, 0, torsoA * 0.35 + (state.capeLower * Math.PI) / 360]} renderOrder={renderBase + 4} hidden={boil !== k} />
          ))}
          <SvgCard svg={FUR_SVG} width={0.62 * UNIT * s} height={0.27 * UNIT * s} position={at('torso', [0, 0.25])} rotation={[0, 0, torsoA]} renderOrder={renderBase + 76} />
          {([-1, 1] as const).map((side) => {
            const h = horn(side);
            return (
              <SvgCard key={`horn${side}`} svg={HORN_SVG} width={0.16 * UNIT * s} height={0.24 * UNIT * s} pivot={[0.052 * UNIT * s, -0.116 * UNIT * s]} position={h.pos} rotation={[0, 0, h.rot]} scale={[side < 0 ? 1 : -1, 1, 1]} renderOrder={renderBase + 79.5} />
            );
          })}
          {crack >= 0 && !split
            ? HELM_CRACK_SVG.map((svg, k) => (
                <SvgCard key={`crack${k}`} svg={svg} width={0.2 * UNIT * s} height={0.15 * UNIT * s} position={at('head', [0.02, 0.06])} rotation={[0, 0, ang('head')]} renderOrder={renderBase + 79.8} hidden={k !== crack} />
              ))
            : null}
          {cracks > 0 ? <SvgCard svg={CRACKS_SVG} width={0.3 * UNIT * s} height={0.34 * UNIT * s} position={at('torso', [0, 0.14])} rotation={[0, 0, torsoA]} opacity={cracks} renderOrder={renderBase + 75} /> : null}
        </>
      ) : null}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// timeline helpers
// ---------------------------------------------------------------------------------------------------------------

/** A strike: hold `antic` until the transition, arrive on `pose` exactly on `at` (storyboard: antic, strike, follow). */
export const strike = (at: number, antic: string, pose: string, follow: string | null, opts: { dur?: number; anticAt?: number; followDur?: number; anticDur?: number } = {}): Key[] => {
  const dur = opts.dur ?? 12;
  const keys: Key[] = [];
  if (opts.anticAt !== undefined) keys.push({ at: opts.anticAt, pose: antic, dur: opts.anticDur ?? 12 });
  keys.push({ at, pose, dur, ease: 'strike', hands: 'instant', impact: true });
  if (follow) keys.push({ at: at + (opts.followDur ?? 12), pose: follow, dur: opts.followDur ?? 12 });
  return keys;
};

export const ramp = (...ks: [number, number, number?][]): RampKey[] => ks.map(([at, v, dur]) => ({ at, v, dur }));

/** The rig state for one shot's timeline. Folded wings and full life by default. */
export const rigFor = (tl: Timeline, frame: number): RigState => rigAt(VORA, tl, frame);

/** Violet, ink, ivory copies trailing a strike on [at, at + frames), `delay` frames apart (collision table). */
export const echoesAt = (tl: Timeline, frame: number, strikes: readonly number[], opts: { delay?: number; frames?: number; offset?: Vec3 } = {}): Echo[] => {
  const delay = opts.delay ?? 2;
  const span = opts.frames ?? 7;
  const off = opts.offset ?? [-0.18, 0.08, -0.02];
  const live = strikes.find((s) => frame >= s - 2 && frame < s + span);
  if (live === undefined) return [];
  return ['#9B5CE0', '#0A0A0A', '#F4ECD8'].map((color, i) => ({ state: rigAt(VORA, tl, frame - (i + 1) * delay), color, offset: [off[0] * (i + 1), off[1] * (i + 1), off[2] * (i + 1)] as Vec3 }));
};

export type { Timeline, Key, PipeEvent, RigState };
