// The painted world of part 1 (painting stage, storyboard 1 §0.1): sky, clouds, cathedral back wall, gallery tiers,
// floor, kneeling soldiers, banners, crowd strips and the gold light rays. Every picture is a storyboard asset drawn
// through Pic (AssetCard once the final image lands; a code-drawn palette stand-in until then).
import { seeded } from '../../vfx/effects.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { assetSize, AVAILABLE } from '../../cast/available.ts';
import { GOLD, GOLD_DEEP, INK, inkFilterDef, IVORY, Pic, poly, r2, SKY, SvgCard, svgDoc } from './kit.tsx';

// ---------------------------------------------------------------------------------------------------------------
// SVG stand-in drawings (pure strings, built once per module)
// ---------------------------------------------------------------------------------------------------------------

const lancet = (x0: number, x1: number, ys: number, yb: number): string => {
  const w = x1 - x0;
  const xc = (x0 + x1) / 2;
  const yt = ys - 0.866 * w;
  return `M${r2(x0)} ${r2(yb)}V${r2(ys)}A${r2(w)} ${r2(w)} 0 0 1 ${r2(xc)} ${r2(yt)}A${r2(w)} ${r2(w)} 0 0 1 ${r2(x1)} ${r2(ys)}V${r2(yb)}Z`;
};

const cloudPath = (rng: ReturnType<typeof seeded>, cx: number, cy: number, w: number, h: number): string => {
  // A cumulus: a row of bumps on top, a flat-ish base.
  const n = 6;
  let d = `M${r2(cx - w / 2)} ${r2(cy + h * 0.3)}`;
  for (let i = 0; i < n; i++) {
    const x0 = cx - w / 2 + (w * i) / n;
    const x1 = cx - w / 2 + (w * (i + 1)) / n;
    const top = cy - h * (0.25 + 0.55 * Math.sin((Math.PI * (i + 0.5)) / n)) * rng.range(0.75, 1.1);
    d += `C${r2(x0)} ${r2(top)} ${r2(x1)} ${r2(top)} ${r2(x1)} ${r2(cy + h * 0.1 * rng.range(-1, 1))}`;
  }
  return `${d}C${r2(cx + w / 2 + h * 0.2)} ${r2(cy + h * 0.45)} ${r2(cx - w / 2 - h * 0.2)} ${r2(cy + h * 0.5)} ${r2(cx - w / 2)} ${r2(cy + h * 0.3)}Z`;
};

/** G01: flat pale sky with two faint painted cloud banks. */
const SKY_SVG = (() => {
  const w = 2048;
  const h = 1180;
  const rng = seeded('p1-sky');
  let clouds = '';
  for (let i = 0; i < 5; i++) {
    const d = cloudPath(rng, rng.range(100, w - 100), rng.range(150, h * 0.8), rng.range(260, 520), rng.range(90, 160));
    clouds += `<path d="${d}" fill="${IVORY}" opacity="0.55"/>`;
  }
  return svgDoc(w, h, `<rect width="${w}" height="${h}" fill="${SKY}"/><g filter="url(#k)">${clouds}</g>`, inkFilterDef('k', 5, 14));
})();

/** G02: one cumulus card; three shapes. */
const CLOUD_SVG = [0, 1, 2].map((k) => {
  const w = 1200;
  const h = 560;
  const rng = seeded(`p1-cloud-${k}`);
  const d = cloudPath(rng, w / 2, h * 0.52, w * 0.8, h * 0.62);
  const band = `<clipPath id="c"><path d="${d}"/></clipPath><rect x="0" y="${h * 0.62}" width="${w}" height="${h}" fill="${GOLD}" clip-path="url(#c)"/>`;
  return svgDoc(w, h, `<g filter="url(#k)"><path d="${d}" fill="${IVORY}" stroke="${INK}" stroke-width="16"/>${band}<path d="${d}" fill="none" stroke="${INK}" stroke-width="16"/></g>`, inkFilterDef('k', 20 + k, 12, 0.25));
});

/** G03 back wall: ivory and gold arcades with sky openings, two black spire towers framing a bright centre bay. */
export const WALL = { w: 170, h: 66, z: -50 };
const WALL_SVG = (() => {
  const pw = 4096;
  const ph = Math.round((pw * WALL.h) / WALL.w);
  const u = pw / WALL.w;
  const X = (x: number) => (x + WALL.w / 2) * u;
  const Y = (y: number) => ph - y * u;
  const rng = seeded('p1-wall');
  let holes = '';
  let trim = '';
  let shade = '';
  // Four arcade tiers on each side, the arches narrowing towards the centre bay.
  const tiers = [
    { y0: 2, y1: 15 }, { y0: 17, y1: 28 }, { y0: 30, y1: 40 }, { y0: 42, y1: 51 },
  ];
  for (const side of [-1, 1]) {
    for (const t of tiers) {
      let x = 25;
      while (x < WALL.w / 2 - 2) {
        const aw = 2.2 + (x - 25) * 0.07 + rng.range(-0.2, 0.2);
        const x0 = side < 0 ? -(x + aw) : x;
        const x1 = x0 + aw;
        const ys = t.y1 - aw * 0.95;
        const path = lancet(X(x0 + 0.35), X(x1 - 0.35), Y(ys), Y(t.y0 + 0.6));
        holes += `<path d="${path}" fill="black"/>`;
        trim += `<path d="${path}" fill="none" stroke="${GOLD}" stroke-width="${r2(u * 0.55)}"/>`;
        // The ink shadow on the inner side of each pier (light from the centre bay).
        const sx = side < 0 ? X(x0 + 0.2) : X(x1 - 0.55);
        shade += `<rect x="${r2(sx)}" y="${r2(Y(t.y1))}" width="${r2(u * 0.35)}" height="${r2(u * (t.y1 - t.y0))}" fill="${INK}" opacity="0.85"/>`;
        x += aw + 0.7;
      }
      // Balustrade band.
      const bx0 = side < 0 ? X(-WALL.w / 2) : X(23);
      shade += `<rect x="${r2(bx0)}" y="${r2(Y(t.y1 + 1.2))}" width="${r2(u * (WALL.w / 2 - 23))}" height="${r2(u * 1.2)}" fill="${GOLD_DEEP}"/>`;
      shade += `<rect x="${r2(bx0)}" y="${r2(Y(t.y0 + 0.6))}" width="${r2(u * (WALL.w / 2 - 23))}" height="${r2(u * 0.5)}" fill="${INK}"/>`;
    }
  }
  // Spire towers framing the bay: tall black shafts with pinnacles and a crown of needles.
  let spires = '';
  for (const side of [-1, 1]) {
    for (const [cx, top, wd] of [[16.2, 56, 3.2], [19.6, 50, 2.6], [22.6, 44, 2.0]] as const) {
      const x = side * cx;
      spires += `<path d="${poly([[X(x - wd / 2), Y(0)], [X(x - wd / 2), Y(top - 8)], [X(x - wd * 0.18), Y(top - 3)], [X(x), Y(top)], [X(x + wd * 0.18), Y(top - 3)], [X(x + wd / 2), Y(top - 8)], [X(x + wd / 2), Y(0)]])}" fill="${INK}"/>`;
      for (let k = 0; k < 3; k++) {
        const py = top - 14 - k * 9;
        spires += `<path d="${poly([[X(x - wd / 2 - 0.5), Y(py - 4)], [X(x - wd / 2 - 0.15), Y(py)], [X(x - wd / 2 + 0.2), Y(py - 4)]])}" fill="${INK}"/>`;
        spires += `<path d="${poly([[X(x + wd / 2 - 0.2), Y(py - 4)], [X(x + wd / 2 + 0.15), Y(py)], [X(x + wd / 2 + 0.5), Y(py - 4)]])}" fill="${INK}"/>`;
      }
      // Gold edge light on the side facing the bay.
      spires += `<rect x="${r2(X(x - side * wd / 2) - (side > 0 ? 0 : u * 0.25))}" y="${r2(Y(top - 9))}" width="${r2(u * 0.25)}" height="${r2(u * (top - 9))}" fill="${GOLD}"/>`;
    }
  }
  // Centre bay: a great lancet window of pale light with radiating gold dry-brush streaks.
  const bay = lancet(X(-13.5), X(13.5), Y(38), Y(0));
  let streaks = '';
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + rng.range(-1.2, 1.2);
    const r0 = rng.range(5, 9) * u;
    const r1 = rng.range(16, 40) * u;
    const cx = X(0);
    const cy = Y(24);
    streaks += `<path d="M${r2(cx + Math.cos(a) * r0)} ${r2(cy + Math.sin(a) * r0)}L${r2(cx + Math.cos(a) * r1)} ${r2(cy + Math.sin(a) * r1)}" stroke="${GOLD}" stroke-width="${r2(rng.range(0.15, 0.5) * u)}" opacity="0.7"/>`;
  }
  // The bay is open to the sky: he stands black against the pale blue, and the clouds drift in it.
  const defs = `${inkFilterDef('k', 31, 10, 0.2)}${inkFilterDef('k2', 37, 6, 0.4)}<mask id="m"><rect width="${pw}" height="${ph}" fill="white"/>${holes}<path d="${bay}" fill="black"/></mask>`;
  const body = `<g mask="url(#m)"><rect width="${pw}" height="${ph}" fill="${IVORY}"/>
<g filter="url(#k2)">${streaks}</g>
<g filter="url(#k)">${shade}${trim}</g></g>
<g filter="url(#k)">${spires}<path d="${bay}" fill="none" stroke="${GOLD}" stroke-width="${r2(u * 0.9)}"/></g>`;
  return svgDoc(pw, ph, body, defs);
})();

/** G04a/b gallery tiers (left side; the right is the same card mirrored). Crowds on the upper tiers. */
export const GALLERY = { w: 36, h: 46, z: -30, x: 31 };
const GALLERY_SVG = (() => {
  const pw = 1600;
  const ph = Math.round((pw * GALLERY.h) / GALLERY.w);
  const u = pw / GALLERY.w;
  const rng = seeded('p1-gallery');
  const Y = (y: number) => ph - y * u;
  // Tiers slope towards the inner (right) edge: a painted perspective into the nave.
  const slope = (x: number, y: number) => y - (x / pw) * (y * 0.22);
  let body = `<path d="${poly([[0, Y(0)], [0, Y(46)], [pw, Y(46 - 46 * 0.22)], [pw, Y(0)]])}" fill="${IVORY}"/>`;
  let holes = '';
  let crowd = '';
  const tiers = [[1, 10], [12, 20], [22, 29], [31, 37], [39, 44]] as const;
  tiers.forEach(([y0, y1], ti) => {
    let x = 0.4 * u;
    while (x < pw - 20) {
      const aw = (2.6 - (x / pw) * 1.2) * u;
      const ya = slope(x, y1);
      const yb = slope(x, y0);
      const path = lancet(x + 0.25 * u, x + aw - 0.25 * u, Y(ya - (aw / u) * 0.9), Y(yb + 0.5));
      holes += `<path d="${path}" fill="black"/>`;
      body += `<path d="${path}" fill="none" stroke="${GOLD}" stroke-width="${r2(u * 0.4)}"/>`;
      body += `<rect x="${r2(x + aw - 0.32 * u)}" y="${r2(Y(ya))}" width="${r2(0.3 * u)}" height="${r2((ya - yb) * u)}" fill="${INK}" opacity="0.8"/>`;
      x += aw + 0.45 * u;
    }
    // Balustrade with the crowd leaning on it (upper tiers only).
    const by = (xx: number) => Y(slope(xx, y0 + 1.6));
    body += `<path d="${poly([[0, by(0)], [pw, by(pw)], [pw, by(pw) + u * 1.6], [0, by(0) + u * 1.6]])}" fill="${GOLD}"/>`;
    body += `<path d="${poly([[0, by(0) + u * 1.6], [pw, by(pw) + u * 1.6], [pw, by(pw) + u * 2.0], [0, by(0) + u * 2.0]])}" fill="${INK}"/>`;
    if (ti >= 1) {
      for (let xx = 10; xx < pw - 10; xx += rng.range(14, 26)) {
        const hy = by(xx);
        const hr = rng.range(5, 8) * (1 - (xx / pw) * 0.35);
        crowd += `<circle cx="${r2(xx)}" cy="${r2(hy - hr * 2.4)}" r="${r2(hr)}" fill="${INK}"/><path d="${poly([[xx - hr * 1.5, hy + 2], [xx - hr * 1.1, hy - hr * 1.6], [xx + hr * 1.1, hy - hr * 1.6], [xx + hr * 1.5, hy + 2]])}" fill="${INK}"/>`;
        if (rng() < 0.12) crowd += `<path d="M${r2(xx + hr)} ${r2(hy - hr * 2)}L${r2(xx + hr * 2.2)} ${r2(hy - hr * 5)}" stroke="${INK}" stroke-width="${r2(hr * 0.7)}" stroke-linecap="round"/>`;
      }
    }
  });
  const defs = `${inkFilterDef('k', 41, 8, 0.2)}<mask id="m"><rect width="${pw}" height="${ph}" fill="white"/>${holes}</mask>`;
  return svgDoc(pw, ph, `<g filter="url(#k)"><g mask="url(#m)">${body}</g>${crowd}</g>`, defs);
})();

/** G06 floor: glossy black and gold tiles with ivory dry-brush reflections. Card lies flat on y 0. */
export const FLOOR = { w: 240, d: 96, z0: -50 };
const FLOOR_SVG = (() => {
  const pw = 4096;
  const ph = Math.round((pw * FLOOR.d) / FLOOR.w);
  const u = pw / FLOOR.w;
  const tile = 1.8 * u;
  const rng = seeded('p1-floor');
  let tiles = '';
  for (let ty = 0; ty * tile < ph; ty++) {
    for (let tx = 0; tx * tile < pw; tx++) {
      if ((tx + ty) % 2) tiles += `<rect x="${r2(tx * tile)}" y="${r2(ty * tile)}" width="${r2(tile + 1)}" height="${r2(tile + 1)}" fill="${GOLD}"/>`;
    }
  }
  let refl = '';
  for (let i = 0; i < 90; i++) {
    const x = rng.range(0, pw);
    const y = rng.range(0, ph);
    refl += `<path d="M${r2(x)} ${r2(y)}l${r2(rng.range(-6, 6))} ${r2(rng.range(40, 160))}" stroke="${IVORY}" stroke-width="${r2(rng.range(3, 12))}" opacity="0.75"/>`;
  }
  // The aisle to the throne: a darker ink runner down the middle.
  const runner = `<rect x="${r2(pw / 2 - 4.5 * u)}" y="0" width="${r2(9 * u)}" height="${ph}" fill="${INK}" opacity="0.55"/>`;
  return svgDoc(pw, ph, `<rect width="${pw}" height="${ph}" fill="${INK}"/><g filter="url(#k)">${tiles}${runner}${refl}</g>`, inkFilterDef('k', 51, 7, 0.35));
})();

/** G07: one kneeling soldier seen from behind (ink body, ivory cape, gold kite shield with the sun, spear). */
const SOLDIER_SVG = [0, 1].map((k) => {
  const w = 440;
  const h = 520;
  const sun = (cx: number, cy: number, r: number) => {
    let rays = '';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      rays += `<path d="M${r2(cx + Math.cos(a) * r * 1.2)} ${r2(cy + Math.sin(a) * r * 1.2)}L${r2(cx + Math.cos(a) * r * 1.9)} ${r2(cy + Math.sin(a) * r * 1.9)}" stroke="${IVORY}" stroke-width="7"/>`;
    }
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${IVORY}"/>${rays}`;
  };
  const flip = k ? ` transform="translate(${w} 0) scale(-1 1)"` : '';
  const body = `<g${flip}>
<path d="M300 40 L306 500" stroke="${INK}" stroke-width="12"/><path d="${poly([[292, 52], [303, 0], [314, 52]])}" fill="${INK}"/>
<path d="${poly([[150, 520], [120, 330], [170, 230], [270, 225], [320, 330], [300, 520]])}" fill="${INK}"/>
<ellipse cx="220" cy="190" rx="54" ry="58" fill="${INK}"/><path d="M168 190 Q220 120 272 190" fill="none" stroke="${GOLD}" stroke-width="8"/>
<path d="${poly([[160, 240], [282, 240], [330, 505], [250, 470], [210, 515], [170, 470], [110, 508]])}" fill="${IVORY}"/>
<path d="M160 240 L110 508" stroke="${GOLD}" stroke-width="10"/><path d="M282 240 L330 505" stroke="${GOLD}" stroke-width="10"/>
<path d="${poly([[18, 300], [130, 300], [130, 400], [74, 505], [18, 400]])}" fill="${GOLD}" stroke="${INK}" stroke-width="12"/>
${sun(74, 380, 22)}</g>`;
  return svgDoc(w, h, `<g filter="url(#k)">${body}</g>`, inkFilterDef('k', 61 + k, 9, 0.2));
});

/** G08: a hanging gold banner with the ivory sun, black pole and spear tip. */
const BANNER_SVG = (() => {
  const w = 300;
  const h = 1100;
  let rays = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rays += `<path d="M${r2(150 + Math.cos(a) * 46)} ${r2(420 + Math.sin(a) * 46)}L${r2(150 + Math.cos(a) * 78)} ${r2(420 + Math.sin(a) * 78)}" stroke="${IVORY}" stroke-width="12"/>`;
  }
  const body = `<path d="M150 0 L150 1100" stroke="${INK}" stroke-width="14"/><path d="${poly([[132, 70], [150, 0], [168, 70]])}" fill="${INK}"/>
<path d="M40 110 L260 110" stroke="${INK}" stroke-width="14"/>
<path d="${poly([[50, 110], [250, 110], [250, 820], [215, 760], [190, 850], [150, 780], [112, 860], [85, 770], [50, 830]])}" fill="${GOLD}" stroke="${INK}" stroke-width="10"/>
<circle cx="150" cy="420" r="36" fill="${IVORY}"/>${rays}<path d="M50 150 L250 150" stroke="${INK}" stroke-width="6"/>`;
  return svgDoc(w, h, `<g filter="url(#k)">${body}</g>`, inkFilterDef('k', 71, 8, 0.2));
})();

/** G05: a strip of front-row spectators on a gold balustrade (they duck in S14). */
const CROWD_SVG = (() => {
  const w = 1600;
  const h = 200;
  const rng = seeded('p1-crowd');
  let heads = '';
  for (let x = 12; x < w - 12; x += rng.range(26, 40)) {
    const r = rng.range(11, 15);
    heads += `<circle cx="${r2(x)}" cy="${r2(118 - r * 2.2)}" r="${r2(r)}" fill="${INK}"/><path d="${poly([[x - r * 1.6, 130], [x - r * 1.1, 118 - r * 1.2], [x + r * 1.1, 118 - r * 1.2], [x + r * 1.6, 130]])}" fill="${INK}"/>`;
    if (rng() < 0.2) heads += `<path d="M${r2(x + r)} ${r2(118 - r * 2)}L${r2(x + r * 2.6)} ${r2(118 - r * 5)}" stroke="${INK}" stroke-width="${r2(r * 0.8)}" stroke-linecap="round"/>`;
  }
  return svgDoc(w, h, `<g filter="url(#k)">${heads}<rect x="0" y="126" width="${w}" height="40" fill="${GOLD}"/><rect x="0" y="162" width="${w}" height="14" fill="${INK}"/></g>`, inkFilterDef('k', 81, 6, 0.2));
})();

/** C01: one gold light ray, a long dry-brush wedge, apex at the top centre of the card. */
const RAY_SVG = svgDoc(
  400,
  2000,
  `<g filter="url(#k)"><path d="${poly([[196, 0], [204, 0], [400, 2000], [0, 2000]])}" fill="${GOLD}"/><path d="${poly([[199, 0], [201, 0], [260, 2000], [140, 2000]])}" fill="${IVORY}"/></g>`,
  inkFilterDef('k', 91, 10, 0.5),
);

// ---------------------------------------------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------------------------------------------

/** Render-order bands of the painting stage (all cards are sorted by these, never by the depth buffer). */
export const RO = { sky: -200, cloud: -190, wall: -180, ray: -170, floor: -165, gallery: -150, crowd: -149, rank: -140, rig: 0, hero: 300, near: 400, fx: 500 };

export interface WorldState {
  /** Impact-frame silhouette pass: background cards flat ivory, figures flat ink. */
  sil?: boolean;
  /** Cloud drift in world units (they slide towards the crown on the S02 keys). */
  cloudShift?: number;
  /** Ray bend, degrees towards him (S02). 0 hides nothing; rays are drawn only when `rays` > 0. */
  rays?: number;
  rayBend?: number;
  /** Soldier bow per soldier index (0..1), and banner sway in degrees. */
  bow?: (i: number, x: number) => number;
  sway?: number;
  /** Crowd strip duck (0..1, S14). */
  duck?: number;
  /** Hide the near (P5) ranks for shots that would put them in the lens. */
  near?: boolean;
  /** Extra ranks of kneeling soldiers in the nave (the army). */
  army?: boolean;
}

const SOLDIER = { w: 2.3, h: 2.72 };
const BANNER = { w: 1.5, h: 5.5 };

/** Kneeling ranks: near (P5, z -3) and the army further down the nave. */
const RANKS: { x: number; z: number; k: number }[] = (() => {
  const out: { x: number; z: number; k: number }[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) out.push({ x: side * (5.2 + i * 2.15), z: -3 - (i % 2) * 0.6, k: side < 0 ? 0 : 1 });
    for (const z of [-9, -13, -19, -24]) for (let i = 0; i < 6; i++) out.push({ x: side * (6.5 + i * 2.4 + (z % 2 ? 1 : 0)), z, k: side < 0 ? 0 : 1 });
  }
  return out;
})();
const BANNERS: { x: number; z: number; ph: number }[] = [
  { x: -16, z: -4, ph: 0 }, { x: 16, z: -4, ph: 1.3 }, { x: -11, z: -12, ph: 2 }, { x: 11, z: -12, ph: 0.7 },
  { x: -13, z: -22, ph: 1.6 }, { x: 13, z: -22, ph: 2.6 }, { x: -9, z: -33, ph: 0.4 }, { x: 9, z: -33, ph: 1.1 },
];

/** Width a Pic really takes: the final image keeps its aspect from the given height (AssetCard), the stand-in its own. */
const drawnWidth = (id: string, w: number, h: number): number => {
  const s = AVAILABLE.has(id) ? assetSize(id) : undefined;
  return s ? (h * s[0]) / s[1] : w;
};
const SKY_W = drawnWidth('G01', 300, 173);
const WALL_W = drawnWidth('G03', WALL.w, WALL.h);
/** Repeats of the sky and the back wall on each side, butted edge to edge, so wide and whip framings never reach the
 * edge of the built set (the final G03 is narrower than the stand-in, so a fixed spacing left black gaps). */
const SKY_TILES = [-1, 0, 1];
const WALL_TILES = WALL_W < WALL.w ? [-3, -2, -1, 0, 1, 2, 3] : [-1, 0, 1];

export const World = ({ sil = false, cloudShift = 0, rays = 0, rayBend = 0, bow, sway = 0, duck = 0, near = true, army = true }: WorldState) => {
  const back = sil ? IVORY : null;
  const fig = sil ? INK : null;
  return (
    <>
      {SKY_TILES.map((k) => (
        <Pic key={`sky${k}`} id="G01" color={SKY} svg={SKY_SVG} width={300} height={173} position={[k * (SKY_W - 0.5), 30, -80]} scale={k % 2 ? [-1, 1, 1] : 1} renderOrder={RO.sky + k * 0.001} flat={back} />
      ))}
      {[[-17, 34, 0], [15, 44, 1], [3, 56, 2], [-9, 52, 1], [21, 26, 0]].map(([x, y, k], i) => (
        <Pic key={`c${i}`} id={`G02-${(i % 5) + 1}`} color={IVORY} svg={CLOUD_SVG[k as number] as string} width={22} height={10} position={[(x as number) + cloudShift * Math.sign(-(x as number)), (y as number) - cloudShift * 0.4, -78]} renderOrder={RO.cloud + i * 0.01} flat={back} />
      ))}
      {/* Not the G06 final: it is a floor painted in its own perspective, so laid on the ground plane it doubles the
          perspective, and sized by height it covers 144 of the 240 units (black void in the S14 and S16 lows). */}
      <SvgCard svg={FLOOR_SVG} width={FLOOR.w} height={FLOOR.d} position={[0, 0, FLOOR.z0 + FLOOR.d / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={RO.floor} flat={back} />
      {rays > 0
        ? [-26, -15, -6, 6, 15, 26].map((a, i) => (
            <SvgCard key={`r${i}`} svg={RAY_SVG} width={7} height={70} pivot={[0, 35]} position={[a * 0.35, 62, -46]} rotation={[0, 0, ((a * (1 - rayBend / 30) - Math.sign(a) * rayBend) * Math.PI) / 180]} opacity={rays * (0.42 + 0.1 * (i % 2))} renderOrder={RO.ray + i * 0.01} hidden={sil} />
          ))
        : null}
      {/* the back wall, repeated once on each side so whip-pans never reach the edge of the world */}
      {WALL_TILES.map((k) => (
        <Pic key={`w${k}`} id="G03" color={IVORY} svg={WALL_SVG} width={WALL.w} height={WALL.h} position={[k * (WALL_W - 0.5), WALL.h / 2, WALL.z]} scale={k % 2 ? [-1, 1, 1] : 1} renderOrder={RO.wall + k * 0.01} flat={back} />
      ))}
      <Pic id="G04a" color={IVORY} svg={GALLERY_SVG} width={GALLERY.w} height={GALLERY.h} position={[-GALLERY.x, GALLERY.h / 2, GALLERY.z]} renderOrder={RO.gallery} flat={back} />
      <Pic id="G04b" color={IVORY} svg={GALLERY_SVG} width={GALLERY.w} height={GALLERY.h} position={[GALLERY.x, GALLERY.h / 2, GALLERY.z]} scale={AVAILABLE.has('G04b') ? 1 : [-1, 1, 1]} renderOrder={RO.gallery} flat={back} />
      {[11.6, 21.4, 30.6].map((y, i) => (
        <Pic key={`cr${i}`} id={`G05-${i + 1}`} color={INK} svg={CROWD_SVG} width={30} height={3.75} position={[-GALLERY.x - 1, y + 1.2 - duck * 1.6, GALLERY.z + 0.4]} renderOrder={RO.crowd + i * 0.01} flat={fig} />
      ))}
      {[11.6, 21.4, 30.6].map((y, i) => (
        <Pic key={`cl${i}`} id={`G05-${3 - i}`} color={INK} svg={CROWD_SVG} width={30} height={3.75} position={[GALLERY.x + 1, y + 1.2 - duck * 1.6, GALLERY.z + 0.4]} scale={[-1, 1, 1]} renderOrder={RO.crowd + i * 0.01} flat={fig} />
      ))}
      {BANNERS.map((b, i) => (
        <Pic key={`b${i}`} id={`G08-${(i % 3) + 1}`} color={GOLD} svg={BANNER_SVG} width={BANNER.w} height={BANNER.h} pivot={[0, BANNER.h / 2]} position={[b.x, BANNER.h + 0.6, b.z]} rotation={[0, 0, ((sway * Math.sin(b.ph * 2.1 + 1)) * Math.PI) / 180]} renderOrder={(b.z > -6 ? RO.near : RO.rank) + 0.5 + i * 0.01} flat={fig} hidden={!near && b.z > -6} />
      ))}
      {RANKS.filter((r) => (r.z > -6 ? near : army)).map((r, i) => {
        const b = bow ? bow(i, r.x) : 0;
        return (
          <Pic key={`s${i}`} id={`G07-${r.k + 1}`} color={INK} svg={SOLDIER_SVG[r.k] as string} width={SOLDIER.w} height={SOLDIER.h} pivot={[0, -SOLDIER.h / 2]} position={[r.x, 0, r.z]} scale={[1 + 0.04 * b, 1 - 0.14 * b, 1]} renderOrder={(r.z > -6 ? RO.near : RO.rank) - r.z * 0.001 + i * 1e-5} flat={fig} />
        );
      })}
    </>
  );
};

export const CLOUD_TEXTURES = CLOUD_SVG;
export type { Vec3 };
