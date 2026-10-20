// Code-drawn flat shapes of the painting backdrop (stand-ins for G01 sky, G02 clouds, G03 cathedral, G09 pillars, C11 sun).
// Each returns an SVG document string for SvgCard; the ink edge is the same dry-brush displacement the vfx lane uses.
import { blobPath, polyPath, type Pt } from '../../../vfx/style.tsx';
import { seeded } from '../../../vfx/seeded.ts';

const INK = '#0A0908';
const IVORY = '#F4ECD8';
const GOLD = '#E2B33C';
const SKY = '#8EC5E8';
const VIOLET = '#9B5CE0';

const doc = (w: number, h: number, body: string, seed: number, rough = 7): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>` +
  `<filter id="ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="${seed}" result="n"/>` +
  `<feDisplacementMap in="SourceGraphic" in2="n" scale="${rough}" xChannelSelector="R" yChannelSelector="G"/></filter></defs>` +
  `<g filter="url(#ink)">${body}</g></svg>`;

const cloud = (cx: number, cy: number, w: number, h: number, seed: number): Pt[] => {
  const rng = seeded(`p2cloud:${seed}`);
  const pts: Pt[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const bump = 0.82 + 0.3 * Math.abs(Math.sin(a * 3 + rng() * 2)) + rng() * 0.08;
    const flat = Math.sin(a) > 0.2 ? 0.55 : 1;
    pts.push([cx + Math.cos(a) * w * 0.5 * bump, cy + Math.sin(a) * h * 0.5 * bump * flat]);
  }
  return pts;
};

/** 1920 x 1080 sky: flat blue (violet in the screaming variant), ivory clouds with a gold band and an ink outline. */
export const skySvg = (violet: boolean): string => {
  const base = violet ? VIOLET : SKY;
  const cloudFill = violet ? VIOLET : IVORY;
  const band = violet ? VIOLET : GOLD;
  const spots: [number, number, number, number][] = [[300, 170, 520, 190], [1050, 120, 560, 170], [1640, 260, 480, 200], [560, 430, 420, 130], [1360, 470, 380, 120], [130, 520, 300, 120]];
  const clouds = spots
    .map(([cx, cy, w, h], i) => {
      const d = blobPath(cloud(cx, cy, w, h, i));
      const lower = blobPath(cloud(cx, cy + h * 0.2, w * 0.82, h * 0.42, i + 20));
      return `<path d="${d}" fill="${cloudFill}" stroke="${INK}" stroke-width="9"/><path d="${lower}" fill="${band}" opacity="${violet ? 0 : 0.85}"/>`;
    })
    .join('');
  return doc(1920, 1080, `<rect x="-40" y="-40" width="2000" height="1160" fill="${base}"/>${clouds}`, violet ? 11 : 5, 6);
};

/** Central cathedral bay (1920 x 1080 at the window plane): ivory wall, gold pointed arches, black spires on a low roofline. */
export const cathedralSvg = (): string => {
  const rng = seeded('p2cathedral');
  const roof = 330;
  const spires: string[] = [];
  for (let i = 0; i < 17; i++) {
    const x = 40 + i * 114 + rng.range(-12, 12);
    const h = rng() < 0.3 ? rng.range(190, 280) : rng.range(80, 150);
    const w = rng.range(26, 40);
    spires.push(`<path d="${polyPath([[x - w / 2, roof + 6], [x, roof - h], [x + w / 2, roof + 6]])}" fill="${INK}"/>`);
    if (rng() < 0.5) spires.push(`<path d="${polyPath([[x - 2, roof - h + 40], [x + 6, roof - h + 20], [x + 7, roof]])}" fill="${GOLD}"/>`);
  }
  const arches: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cx = 130 + i * 276;
    const w = 190;
    const top = 400;
    const bottom = 860;
    arches.push(
      `<path d="M${cx - w / 2} ${bottom} V${top + 90} Q${cx - w / 2} ${top + 20} ${cx} ${top - 50} Q${cx + w / 2} ${top + 20} ${cx + w / 2} ${top + 90} V${bottom} Z" fill="${GOLD}" stroke="${INK}" stroke-width="10"/>` +
        `<path d="M${cx + w / 2 - 54} ${bottom} V${top + 100} Q${cx + w / 2 - 54} ${top + 30} ${cx + 20} ${top - 28} Q${cx + w / 2 - 18} ${top + 40} ${cx + w / 2 - 14} ${top + 100} V${bottom} Z" fill="${INK}"/>`,
    );
  }
  const wall = `<rect x="-30" y="${roof}" width="1980" height="760" fill="${IVORY}" stroke="${INK}" stroke-width="10"/>`;
  const ledge = `<rect x="-30" y="${roof + 30}" width="1980" height="38" fill="${GOLD}" stroke="${INK}" stroke-width="7"/>`;
  return doc(1920, 1080, `${spires.join('')}${wall}${ledge}${arches.join('')}`, 9, 8);
};

/** One entrance pillar (180 x 2160 px): ivory shaft with a black shadow side, gold capital and base bands. */
export const pillarSvg = (side: 'L' | 'R'): string => {
  const dark = side === 'L' ? 'right' : 'left';
  const x0 = dark === 'right' ? 100 : 0;
  const body =
    `<rect x="12" y="0" width="156" height="2160" fill="${IVORY}" stroke="${INK}" stroke-width="10"/>` +
    `<rect x="${x0 + 12}" y="0" width="68" height="2160" fill="${INK}"/>` +
    `<rect x="0" y="260" width="180" height="90" fill="${GOLD}" stroke="${INK}" stroke-width="9"/>` +
    `<rect x="0" y="1800" width="180" height="110" fill="${GOLD}" stroke="${INK}" stroke-width="9"/>` +
    Array.from({ length: 5 }, (_, i) => `<path d="M${90 + (i - 2) * 22} 420 V1740" stroke="${GOLD}" stroke-width="6" opacity="0.8"/>`).join('');
  return doc(180, 2160, body, side === 'L' ? 3 : 4, 6);
};

/** Progress-bar sun (1000 x 400 px): a rounded bar (ivory track, gold fill of `fill` percent) with short gold dry-brush rays on its top half. */
export const sunSvg = (fill: number): string => {
  const barX = 110;
  const barY = 190;
  const barW = 780;
  const barH = 150;
  const cx = barX + barW / 2;
  const cy = barY + barH / 2;
  const rays: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = Math.PI + ((i + 0.5) / 12) * Math.PI;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    // An ellipse hugging the bar: the rays leave its top edge and its two ends.
    const base: Pt = [cx + (barW / 2 + 26) * dx, cy + (barH / 2 + 26) * dy * 1.15];
    const len = i % 2 === 0 ? 112 : 74;
    const tip: Pt = [base[0] + dx * len, base[1] + dy * len];
    const nx = -dy * 20;
    const ny = dx * 20;
    rays.push(`<path d="${polyPath([[base[0] + nx, base[1] + ny], tip, [base[0] - nx, base[1] - ny]])}" fill="${GOLD}" stroke="${INK}" stroke-width="9"/>`);
  }
  const fillW = Math.max(0, (barW - 28) * (fill / 100));
  const ticks = Array.from({ length: 14 }, (_, i) => {
    const x = barX + 50 + i * 54;
    return x < barX + 14 + fillW - 12 ? `<path d="M${x} ${barY + barH - 24} L${x + 18} ${barY + 24}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` : '';
  }).join('');
  const body =
    rays.join('') +
    `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="30" fill="${IVORY}"/>` +
    `<rect x="${barX + 14}" y="${barY + 14}" width="${fillW}" height="${barH - 28}" rx="16" fill="${GOLD}"/>` +
    ticks +
    `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="30" fill="none" stroke="${INK}" stroke-width="14"/>`;
  return doc(1000, 400, body, 21, 5);
};

/** The fill steps the sun is drawn at (percent); a SvgCard per step stays mounted so a step never loads mid-shot. */
export const SUN_STEPS = [0, 10, 35, 50, 70, 85, 95, 100] as const;
