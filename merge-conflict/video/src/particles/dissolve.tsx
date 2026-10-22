// Card <-> points dissolve (architecture.md "particles/dissolve.ts"). Points come OFFLINE from
// tools/card_points.py (public/cards/<id>.points.json). A transition scatters card A into points and gathers
// them into card B (shape -> shape): pos = mix(homeA + offset * pS, homeB, pG), with a per-point delay.
// Scatter 20-28 frames and gather 12-20 frames at 60 fps, outQuad; checked when a plan is built.
// Both point lists are row-major from the top, so point i of A maps to the same height band of B.
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { staticFile } from 'remotion';
import { BufferAttribute, BufferGeometry, FileLoader } from 'three';
import { FOV, H } from '../camera/camera.ts';
import { type Placement, cardCentre } from '../cards/Card.tsx';
import { GRADE_GLSL, type Grade } from '../grade/grade.ts';
import { ramp, rgb } from '../lib/ease.ts';
import { seeded } from '../lib/seeded.ts';
import { ORDER, useUniforms } from '../stage/Stage.tsx';
import { useParticleCap } from './cap.ts';

interface PointsFile { id: string; cols: number; rows: number; aspect: number; n: number; xy: number[]; rgb: number[] }

export interface DissolvePlan {
  id: string;
  /** Start of the scatter, seconds. */
  t0: number;
  scatter: number;
  gather: number;
  from?: { card: string; at: Placement };
  to?: { card: string; at: Placement };
}
const DELAY = 0.1;

/** architecture.md: scatter 20-28 frames, gather 12-20 frames at 60 fps (cards and letters alike). */
export const checkDissolveFrames = (id: string, scatter: number, gather: number): void => {
  if (scatter < 20 || scatter > 28) throw new Error(`dissolve ${id}: scatter ${scatter} frames (allowed 20-28 at 60 fps)`);
  if (gather < 12 || gather > 20) throw new Error(`dissolve ${id}: gather ${gather} frames (allowed 12-20 at 60 fps)`);
};
const oq = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return 1 - (1 - k) * (1 - k);
};
/** The dissolve's curves (the same as its vertex shader): scatter pS then gather pG, per-point delay. */
export const dissolveCurves = (u: number, delay: number, scatter: number, gather: number) => ({ pS: oq((u - delay) / scatter), pG: oq((u - scatter - delay) / gather) });

/** Builds a plan and checks the frame counts against architecture.md (scatter 20-28, gather 12-20 at 60 fps). */
export const dissolvePlan = (p: Omit<DissolvePlan, 'scatter' | 'gather'> & { scatterFrames?: number; gatherFrames?: number }): DissolvePlan => {
  const s = p.scatterFrames ?? 24;
  const g = p.gatherFrames ?? 16;
  checkDissolveFrames(p.id, s, g);
  if (!p.from && !p.to) throw new Error(`dissolve ${p.id}: needs a from or a to card`);
  // A gather-only plan (points -> card) starts from the scattered cloud: no scatter phase.
  return { id: p.id, t0: p.t0, from: p.from, to: p.to, scatter: p.from ? s / 60 : 0, gather: g / 60 };
};

export const dissolveEnd = (p: DissolvePlan): number => p.t0 + p.scatter + (p.to ? p.gather : 0) + DELAY;

/** The card/point handshake at time t: the card fades as its points take over, and back. */
export const dissolveState = (p: DissolvePlan, t: number) => {
  const u = t - p.t0;
  const end = dissolveEnd(p) - p.t0;
  return {
    active: u >= 0 && u < end + 0.05,
    fromOpacity: u < 0 ? 1 : 1 - ramp(u, 0, 3 / 60),
    points: ramp(u, -1 / 60, 2 / 60) * (p.to ? 1 - ramp(u, end - 3 / 60, 3 / 60) : 1 - ramp(u, end - 0.25, 0.25)),
    toOpacity: ramp(u, end - 4 / 60, 4 / 60),
  };
};

const VERT = /* glsl */ `
uniform float uT; uniform float uScatter; uniform float uGather; uniform float uHasA; uniform float uHasB;
uniform float uPx; uniform float uMaxPx; uniform float uDelay;
attribute vec3 aA; attribute vec3 aB; attribute vec3 aColA; attribute vec3 aColB; attribute vec4 aRnd; attribute vec3 aOff; attribute float aCell;
varying vec3 vCol; varying float vS;
float oq(float x) { x = clamp(x, 0.0, 1.0); return 1.0 - (1.0 - x) * (1.0 - x); }
void main() {
  float d = aRnd.x * uDelay;
  float pS = uHasA > 0.5 ? oq((uT - d) / uScatter) : 1.0;
  float pG = uHasB > 0.5 ? oq((uT - uScatter - d) / uGather) : 0.0;
  vec3 home = uHasA > 0.5 ? aA : aB;
  vec3 p = mix(home + aOff * pS, aB, pG);
  vCol = mix(uHasA > 0.5 ? aColA : aColB, aColB, pG);
  vS = pS * (1.0 - pG);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(aCell * uPx / max(0.5, -mv.z) * mix(1.5, 0.9, vS), uMaxPx);
}`;

const FRAG = /* glsl */ `
uniform vec3 uHue; uniform float uAmount; uniform float uAlpha; uniform vec3 uRival;
varying vec3 vCol; varying float vS;
${GRADE_GLSL}
void main() {
  // A solid core with a soft halo: each point reads as a spark of light, not a speck of soot.
  float r = length(gl_PointCoord - 0.5);
  float core = 1.0 - smoothstep(0.18, 0.26, r);
  float halo = (1.0 - smoothstep(0.2, 0.5, r)) * 0.55;
  float a = max(core, halo);
  vec3 c = gradeTint(vCol, uHue, uAmount);
  // Light the points with the shot hue (dark costumes otherwise read as grey-black soot), hotter while flying,
  // with a touch of the rival colour.
  vec3 light = uHue * 1.25 + 0.22;
  c = mix(c, light, 0.45 + 0.35 * vS);
  c = mix(c, c + uRival * 0.4, vS * 0.35);
  c = mix(c, vec3(1.0), core * 0.25 * vS);
  a *= uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(min(c, vec3(1.0)), a);
}`;

const usePoints = (id: string | undefined): PointsFile | null => {
  // An absent side loads a tiny stand-in so the hook count stays fixed; its data is never used.
  const raw = useLoader(FileLoader, staticFile(`cards/${id ?? 'B01'}.points.json`)) as string;
  return useMemo(() => (id ? (JSON.parse(raw) as PointsFile) : null), [raw, id]);
};

const homes = (pf: PointsFile, at: Placement, n: number): { pos: Float32Array; col: Float32Array; cell: number } => {
  const [cx, cy, cz] = cardCentre(at);
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = Math.floor((i * pf.n) / n);
    pos[i * 3] = cx + (pf.xy[k * 2] as number) * at.height;
    pos[i * 3 + 1] = cy + (pf.xy[k * 2 + 1] as number) * at.height;
    pos[i * 3 + 2] = cz;
    col[i * 3] = (pf.rgb[k * 3] as number) / 255;
    col[i * 3 + 1] = (pf.rgb[k * 3 + 1] as number) / 255;
    col[i * 3 + 2] = (pf.rgb[k * 3 + 2] as number) / 255;
  }
  return { pos, col, cell: at.height / pf.rows };
};

export const Dissolve = ({ plan, t, grade, rival = '#ff7a1a', spread = 2.4 }: { plan: DissolvePlan; t: number; grade: Grade; rival?: `#${string}`; spread?: number }) => {
  const A = usePoints(plan.from?.card);
  const B = usePoints(plan.to?.card);
  const geo = useMemo(() => {
    const n = Math.max(A?.n ?? 0, B?.n ?? 0);
    const a = A && plan.from ? homes(A, plan.from.at, n) : null;
    const b = B && plan.to ? homes(B, plan.to.at, n) : null;
    const rng = seeded(`dissolve:${plan.id}`);
    const off = new Float32Array(n * 3);
    const rnd = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const th = rng() * Math.PI * 2;
      const r = spread * (0.35 + 0.65 * rng());
      off.set([Math.cos(th) * r, Math.sin(th) * r * 0.8 + 0.6 * rng(), rng.range(-1.5, 2.5)], i * 3);
      rnd.set([rng(), rng(), rng(), rng()], i * 4);
    }
    const cell = Math.max(a?.cell ?? 0, b?.cell ?? 0) * 1.35;
    const g = new BufferGeometry();
    const homeA = a?.pos ?? b?.pos ?? new Float32Array(n * 3);
    const homeB = b?.pos ?? homeA;
    g.setAttribute('position', new BufferAttribute(homeA.slice(), 3));
    g.setAttribute('aA', new BufferAttribute(homeA, 3));
    g.setAttribute('aB', new BufferAttribute(homeB, 3));
    g.setAttribute('aColA', new BufferAttribute(a?.col ?? b?.col ?? new Float32Array(n * 3), 3));
    g.setAttribute('aColB', new BufferAttribute(b?.col ?? a?.col ?? new Float32Array(n * 3), 3));
    g.setAttribute('aOff', new BufferAttribute(off, 3));
    g.setAttribute('aRnd', new BufferAttribute(rnd, 4));
    g.setAttribute('aCell', new BufferAttribute(new Float32Array(n).fill(cell), 1));
    return g;
  }, [A, B, plan, spread]);
  const st = dissolveState(plan, t);
  const u = useUniforms({
    uT: t - plan.t0,
    uScatter: plan.scatter,
    uGather: plan.gather,
    uHasA: plan.from ? 1 : 0,
    uHasB: plan.to ? 1 : 0,
    uPx: H / 2 / Math.tan((FOV * Math.PI) / 360), uMaxPx: useParticleCap(),
    uDelay: DELAY,
    uHue: rgb(grade.hue),
    uAmount: grade.amount,
    uAlpha: st.points,
    uRival: rgb(rival),
  });
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={ORDER.dissolve} visible={st.active && st.points > 0.001}>
      <shaderMaterial {...u} vertexShader={VERT} fragmentShader={FRAG} transparent depthTest={false} depthWrite={false} />
    </points>
  );
};
