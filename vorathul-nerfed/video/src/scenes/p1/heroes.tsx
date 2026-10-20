// The hero party (storyboard 1 §2.1): knight, mage, archer, rogue. Small solid ink silhouettes, ivory capes with
// gold trim, gold gear; no violet ever touches a hero. Stand-ins for the G15-G18 pose sheets: each pose is drawn in
// code by one puppet (joint angles -> limb strokes), one texture per pose, swapped on the pose key (replacement
// animation, never a morph).
import type { CSSProperties } from 'react';
import { Img } from 'remotion';
import { AssetCard } from '../../cast/AssetCard.tsx';
import { AVAILABLE } from '../../cast/available.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { GOLD, INK, inkFilterDef, IVORY, poly, r2, SvgCard, svgDoc } from './kit.tsx';

export type HeroKind = 'knight' | 'mage' | 'archer' | 'rogue';
export type HeroPose = 'ready' | 'attack' | 'fly' | 'ko' | 'tiptoe' | 'charge' | 'dangle' | 'up' | 'sit';
export const HERO_POSES: HeroPose[] = ['ready', 'attack', 'fly', 'ko', 'tiptoe', 'charge', 'dangle', 'up', 'sit'];
export const HERO_ASSET: Record<HeroKind, string> = { knight: 'G15', mage: 'G16', archer: 'G17', rogue: 'G18' };
/** Puppet pose -> pose number on the hero's G15-G18 sheet (storyboard 1 §5.2 order, left to right). */
const SHEET: Record<HeroKind, Record<HeroPose, number>> = {
  knight: { ready: 1, attack: 2, fly: 3, ko: 4, tiptoe: 5, charge: 1, dangle: 3, up: 1, sit: 4 },
  mage: { ready: 1, attack: 2, charge: 3, fly: 4, ko: 5, tiptoe: 6, dangle: 4, up: 1, sit: 5 },
  archer: { ready: 1, attack: 2, charge: 1, fly: 3, ko: 4, tiptoe: 5, dangle: 3, up: 1, sit: 4 },
  rogue: { ready: 1, attack: 2, dangle: 3, fly: 4, ko: 4, tiptoe: 6, charge: 1, up: 1, sit: 1 },
};
export const heroAssetId = (kind: HeroKind, pose: HeroPose): string => `${HERO_ASSET[kind]}-${SHEET[kind][pose]}`;
/** Height of the figure in world units (the cut-out card is sized by height). */
const FIGURE_H = 1.9;

/** Angles in degrees from straight down, positive towards screen right (the way the hero faces). */
interface Skel {
  hip: [number, number];
  /** torso lean from vertical, + forward */
  torso: number;
  armF: [number, number];
  armB: [number, number];
  legF: [number, number];
  legB: [number, number];
  /** cape flow direction (from down), length factor */
  cape: [number, number];
  head?: number;
}

const POSES: Record<HeroPose, Skel> = {
  ready: { hip: [200, 268], torso: 12, armF: [55, 95], armB: [-25, 40], legF: [28, -6], legB: [-26, 8], cape: [-38, 1] },
  attack: { hip: [196, 236], torso: 28, armF: [150, 170], armB: [-70, -40], legF: [70, 10], legB: [-55, -10], cape: [-80, 1.1] },
  fly: { hip: [200, 220], torso: -42, armF: [165, 200], armB: [-150, -175], legF: [55, 95], legB: [15, -30], cape: [50, 1.1], head: -20 },
  ko: { hip: [200, 240], torso: 0, armF: [120, 100], armB: [-120, -100], legF: [22, 20], legB: [-22, -20], cape: [0, 0.8], head: 0 },
  tiptoe: { hip: [200, 252], torso: 22, armF: [70, 150], armB: [40, 135], legF: [34, -24], legB: [-14, 26], cape: [-25, 0.9] },
  charge: { hip: [200, 280], torso: 20, armF: [80, 60], armB: [-40, 10], legF: [40, 0], legB: [-40, 10], cape: [-60, 1] },
  dangle: { hip: [200, 262], torso: -4, armF: [12, 4], armB: [-12, -6], legF: [8, -2], legB: [-6, 4], cape: [5, 0.7], head: 18 },
  up: { hip: [200, 292], torso: 10, armF: [40, 20], armB: [-10, 30], legF: [80, 0], legB: [-60, -100], cape: [-30, 0.9] },
  sit: { hip: [200, 330], torso: -12, armF: [30, 40], armB: [-40, -30], legF: [82, 92], legB: [70, 85], cape: [-20, 0.7], head: -10 },
};

interface Build { torsoLen: number; torsoW: number; headR: number; limbW: number; upper: number; lower: number; thigh: number; shin: number }
const BUILD: Record<HeroKind, Build> = {
  knight: { torsoLen: 66, torsoW: 50, headR: 25, limbW: 22, upper: 40, lower: 38, thigh: 44, shin: 44 },
  mage: { torsoLen: 80, torsoW: 36, headR: 20, limbW: 15, upper: 42, lower: 40, thigh: 50, shin: 50 },
  archer: { torsoLen: 70, torsoW: 30, headR: 18, limbW: 13, upper: 42, lower: 42, thigh: 52, shin: 52 },
  rogue: { torsoLen: 52, torsoW: 36, headR: 20, limbW: 15, upper: 34, lower: 32, thigh: 38, shin: 36 },
};

type P = [number, number];
const dir = (deg: number, len: number): P => [Math.sin((deg * Math.PI) / 180) * len, Math.cos((deg * Math.PI) / 180) * len];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const line = (a: P, b: P, w: number, color = INK) => `<path d="M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}" stroke="${color}" stroke-width="${r2(w)}" stroke-linecap="round"/>`;
const limb = (a: P, b: P, c: P, w: number) => `<path d="M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}L${r2(c[0])} ${r2(c[1])}" fill="none" stroke="${INK}" stroke-width="${r2(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
const sun = (c: P, r: number, color = IVORY) => {
  let s = `<circle cx="${r2(c[0])}" cy="${r2(c[1])}" r="${r2(r)}" fill="${color}"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += line([c[0] + Math.cos(a) * r * 1.35, c[1] + Math.sin(a) * r * 1.35], [c[0] + Math.cos(a) * r * 2, c[1] + Math.sin(a) * r * 2], r * 0.4, color);
  }
  return s;
};

const drawHero = (kind: HeroKind, pose: HeroPose, bare = false): string => {
  const b = BUILD[kind];
  const s = POSES[pose];
  const hip = s.hip;
  const t = s.torso + (kind === 'rogue' ? 18 : 0);
  const neck = add(hip, [Math.sin((t * Math.PI) / 180) * b.torsoLen, -Math.cos((t * Math.PI) / 180) * b.torsoLen]);
  const sh = add(neck, [-Math.sin((t * Math.PI) / 180) * 8, Math.cos((t * Math.PI) / 180) * 8]);
  const headA = t + (s.head ?? 0);
  const head = add(neck, [Math.sin((headA * Math.PI) / 180) * (b.headR + 4), -Math.cos((headA * Math.PI) / 180) * (b.headR + 4)]);
  const arm = ([u, l]: [number, number]) => {
    const e = add(sh, dir(u, b.upper));
    return [sh, e, add(e, dir(l, b.lower))] as [P, P, P];
  };
  const leg = ([u, l]: [number, number]) => {
    const k = add(hip, dir(u, b.thigh));
    return [hip, k, add(k, dir(l, b.shin))] as [P, P, P];
  };
  const aF = arm(s.armF);
  const aB = arm(s.armB);
  const lF = leg(s.legF);
  const lB = leg(s.legB);
  // Cape: a flowing ivory sheet with a gold hem from the shoulders.
  const capeLen = (kind === 'mage' ? 70 : kind === 'rogue' ? 60 : 95) * s.cape[1];
  const cd = dir(s.cape[0], capeLen);
  const perp: P = [cd[1] / capeLen, -cd[0] / capeLen];
  const c0 = add(sh, [perp[0] * 14, perp[1] * 14]);
  const c1 = add(sh, [-perp[0] * 10, -perp[1] * 10]);
  const c2 = add(add(sh, cd), [-perp[0] * 26, -perp[1] * 26]);
  const c3 = add(add(sh, cd), [perp[0] * 30, perp[1] * 30]);
  const mid = add(sh, [cd[0] * 0.55, cd[1] * 0.55]);
  const cape = kind === 'mage' ? '' : `<path d="${poly([c0, c1, c2, add(mid, [perp[0] * 6, perp[1] * 6]), c3])}" fill="${IVORY}"/>${line(c2, c3, 8, GOLD)}`;
  let back = '';
  let body = '';
  let front = '';
  back += limb(...aB, b.limbW * 0.95) + (kind === 'mage' ? '' : limb(...lB, b.limbW * 1.05));
  // torso
  const tw = b.torsoW / 2;
  const nx = Math.cos((t * Math.PI) / 180);
  const ny = Math.sin((t * Math.PI) / 180);
  body += `<path d="${poly([[hip[0] - nx * tw * 0.8, hip[1] - ny * tw * 0.8], [neck[0] - nx * tw, neck[1] - ny * tw], [neck[0] + nx * tw, neck[1] + ny * tw], [hip[0] + nx * tw * 0.8, hip[1] + ny * tw * 0.8]])}" fill="${INK}"/>`;
  if (kind === 'mage') {
    // Robe to the floor (covers the legs), ivory mantle on the shoulders.
    const feetY = Math.max(lF[2][1], lB[2][1]);
    const skirt = pose === 'ko' || pose === 'fly' ? [lF[2], lB[2]] : [[hip[0] + 40, feetY], [hip[0] - 40, feetY]];
    body += `<path d="${poly([[hip[0] - 20, hip[1] - 10], [hip[0] + 20, hip[1] - 10], skirt[0] as P, skirt[1] as P])}" fill="${INK}"/>`;
    body += `<path d="${poly([add(sh, [-26, -4]), add(sh, [26, -4]), add(sh, [30, 26]), add(sh, [-30, 26])])}" fill="${IVORY}"/>${line(add(sh, [-30, 26]), add(sh, [30, 26]), 6, GOLD)}`;
  } else {
    body += limb(...lF, b.limbW * 1.05);
  }
  // head
  if (kind === 'knight') {
    body += `<circle cx="${r2(head[0])}" cy="${r2(head[1])}" r="${b.headR}" fill="${INK}"/><path d="M${r2(head[0] - b.headR)} ${r2(head[1] - 4)}h${b.headR * 2}" stroke="${INK}" stroke-width="10"/>${line(add(head, [4, -2]), add(head, [b.headR - 2, -2]), 5, IVORY)}${line(add(head, [-6, -b.headR]), add(head, [-14, -b.headR - 16]), 7, GOLD)}`;
    body += line(add(hip, [-22, -6]), add(hip, [22, -6]), 7, GOLD);
  } else if (kind === 'mage' || kind === 'rogue') {
    const tip = add(head, dir(180 + headA - 25, b.headR * 2.2));
    body += `<circle cx="${r2(head[0])}" cy="${r2(head[1])}" r="${b.headR}" fill="${INK}"/><path d="${poly([add(head, [-b.headR, 4]), tip, add(head, [b.headR * 0.4, -b.headR])])}" fill="${INK}"/>`;
    if (kind === 'rogue') {
      const scarf = dir(s.cape[0] - 10, 70);
      body += `<path d="${poly([add(neck, [-12, -2]), add(neck, [12, 2]), add(add(neck, scarf), [8, 0]), add(add(neck, scarf), [-6, 10])])}" fill="${IVORY}"/>`;
    }
  } else {
    // archer: long flowing ink ponytail
    const pt = dir(s.cape[0] - 20, 80);
    body += `<circle cx="${r2(head[0])}" cy="${r2(head[1])}" r="${b.headR}" fill="${INK}"/><path d="M${r2(head[0] - 6)} ${r2(head[1] - 12)}Q${r2(head[0] + pt[0] * 0.4 - 20)} ${r2(head[1] + pt[1] * 0.2)} ${r2(head[0] + pt[0])} ${r2(head[1] + pt[1])}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`;
  }
  front += limb(...aF, b.limbW);
  // gear (gold), on the hands
  const hF = aF[2];
  const hB = aB[2];
  const fa = s.armF[1];
  if (kind === 'knight' && bare) {
    front += line(hF, add(hF, dir(fa + 180, 6)), 16, GOLD);
  } else if (kind === 'knight') {
    const bl = add(hF, dir(fa + 180, 70));
    front += line(hF, bl, 11, IVORY) + line(hF, add(hF, dir(fa + 180, 6)), 16, GOLD) + line(add(hF, dir(fa + 90, 14)), add(hF, dir(fa - 90, 14)), 7, GOLD);
    const sc = add(hB, [10, -6]);
    const sh2: P[] = [add(sc, [-34, -40]), add(sc, [34, -40]), add(sc, [34, 10]), add(sc, [0, 62]), add(sc, [-34, 10])];
    front += `<path d="${poly(sh2)}" fill="${GOLD}" stroke="${INK}" stroke-width="7"/>${sun(add(sc, [0, -6]), 10)}`;
  } else if (kind === 'mage') {
    const top = add(hF, dir(fa + 180, 95));
    front += line(add(hF, dir(fa, 70)), top, 8, GOLD) + `<circle cx="${r2(top[0])}" cy="${r2(top[1])}" r="18" fill="none" stroke="${GOLD}" stroke-width="7"/>${sun(top, 6, GOLD)}`;
  } else if (kind === 'archer') {
    const bowDir = fa + 180;
    const p0 = add(hB, dir(bowDir + 90, 70));
    const p1 = add(hB, dir(bowDir - 90, 70));
    const bulge = add(hB, dir(bowDir, 34));
    front += `<path d="M${r2(p0[0])} ${r2(p0[1])}Q${r2(bulge[0])} ${r2(bulge[1])} ${r2(p1[0])} ${r2(p1[1])}" fill="none" stroke="${GOLD}" stroke-width="8" stroke-linecap="round"/>${line(p0, hF, 2.5)}${line(hF, p1, 2.5)}`;
    if (pose === 'attack' || pose === 'charge') front += line(hF, add(hB, dir(bowDir, 40)), 4, GOLD);
  } else {
    for (const [h, a] of [[hF, fa], [hB, s.armB[1]]] as const) front += line(h, add(h, dir(a + 160, 36)), 7, GOLD) + line(add(h, dir(a + 90, 8)), add(h, dir(a - 90, 8)), 5, GOLD);
  }
  // An ivory rim around the whole silhouette (comic back-light), so an ink hero still reads on the black tiles.
  const rim = `<filter id="r" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="8" result="d"/><feFlood flood-color="${IVORY}"/><feComposite in2="d" operator="in" result="rim"/><feMerge><feMergeNode in="rim"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  return svgDoc(400, 400, `<g filter="url(#r)"><g filter="url(#k)">${cape}${back}${body}${front}</g></g>`, inkFilterDef('k', kind.length * 17 + pose.length * 3, 4, 0.08) + rim);
};

const SVG_CACHE = new Map<string, string>();
export const heroSvg = (kind: HeroKind, pose: HeroPose, bare = false): string => {
  const key = `${kind}:${pose}:${bare}`;
  let v = SVG_CACHE.get(key);
  if (!v) {
    v = drawHero(kind, pose, bare);
    SVG_CACHE.set(key, v);
  }
  return v;
};
export const heroUrl = (kind: HeroKind, pose: HeroPose): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(heroSvg(kind, pose))}`;

/** Card is 2.7 x 2.7 units for a 400 px drawing: the figure is ~1.9 units tall (storyboard: one ninth of Vorathul;
 * drawn a little larger so the comic poses read in the wides). */
export const HERO_CARD = 2.7;
/** Ground line of the drawing, offset from the card centre in units (feet pivot). */
const FEET = -((370 - 200) / 400) * HERO_CARD;
const BODY = -((235 - 200) / 400) * HERO_CARD;

export interface HeroProps {
  kind: HeroKind;
  pose: HeroPose;
  /** World position of the pivot (feet on the floor, or the body centre with `spin`). */
  position: Vec3;
  /** Roll in degrees (flying spin, knocked flat). */
  rot?: number;
  /** Face screen left. */
  flip?: boolean;
  scale?: number;
  /** Squash/stretch: [sx, sy]. */
  squash?: [number, number];
  /** Pivot at the body centre (flying) instead of the feet. */
  centre?: boolean;
  renderOrder?: number;
  flat?: string | null;
  hidden?: boolean;
  /** The poses this shot uses (all are mounted, hidden, so a swap never waits for a texture). */
  poses?: readonly HeroPose[];
  /** Without gear (the knight after his shield shatters). */
  bare?: boolean;
}

export const Hero = ({ kind, pose, position, rot = 0, flip, scale = 1, squash = [1, 1], centre, renderOrder = 300, flat, hidden, poses, bare }: HeroProps) => {
  const list = poses ?? HERO_POSES;
  const pv: [number, number] = [0, centre ? BODY : FEET];
  // Final cut-outs (once the main loop sets them live): one card per sheet pose, sized by height, feet at the bottom.
  if (list.every((p) => AVAILABLE.has(heroAssetId(kind, p)))) {
    const pz: [number, number] = [0, centre ? 0 : -FIGURE_H / 2];
    return (
      <group visible={!hidden} position={position} rotation={[0, 0, (rot * Math.PI) / 180]} scale={[(flip ? -1 : 1) * scale * squash[0], scale * squash[1], 1]}>
        {list.map((p) => (
          <AssetCard key={p} id={heroAssetId(kind, p)} standIn={{ color: INK }} width={FIGURE_H} height={FIGURE_H} position={[-pz[0], -pz[1], 0]} renderOrder={renderOrder} hidden={heroAssetId(kind, p) !== heroAssetId(kind, pose)} />
        ))}
      </group>
    );
  }
  return (
    <group visible={!hidden}>
      {list.map((p) => (
        <SvgCard
          key={p} svg={heroSvg(kind, p, bare)} width={HERO_CARD} height={HERO_CARD} pivot={pv} position={position}
          rotation={[0, 0, (rot * Math.PI) / 180]} scale={[(flip ? -1 : 1) * scale * squash[0], scale * squash[1], 1]}
          renderOrder={renderOrder} hidden={p !== pose} flat={flat}
        />
      ))}
    </group>
  );
};

/** The same drawing for screen-space comic panels. */
export const HeroImg = ({ kind, pose, size, flip, style }: { kind: HeroKind; pose: HeroPose; size: number; flip?: boolean; style?: CSSProperties }) => (
  <Img src={heroUrl(kind, pose)} style={{ position: 'absolute', width: size, height: size, transform: flip ? 'scaleX(-1)' : undefined, ...style }} />
);
