// Impact recipe, painted HUD (C09 + the G25 frame), comic captions (C10), panels (C14) and glints (C02) of part 1.
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { assetSize } from '../../cast/available.ts';
import { withShake, SHAKE_PCT, type CameraPath, type CameraPose, type ShakeHit } from '../../camera/api.ts';
import type { Vec3 } from '../../stage/Card.tsx';
import { hashKey, ImpactBurst, InkFilter, inkFilterId, InkSplash, Overlay, seeded, shake, SpeedLines } from '../../vfx/effects.ts';
import { UiFonts } from '../../ui/kit.ts';
import { clamp01, GOLD, GOLD_DEEP, H, INK, IVORY, lerp, outBack, outCubic, prog, project, two, VIOLET, VIOLET_LIGHT, W } from './kit.tsx';

export const ANTON = "'UiAnton', 'Anton', Impact, sans-serif";

// ---------------------------------------------------------------------------------------------------------------
// impacts (storyboard 1 §0.2)
// ---------------------------------------------------------------------------------------------------------------

export type Size = 'big' | 'medium' | 'small';
export interface Impact {
  /** The anchor frame N. */
  at: number;
  size: Size;
  /** Contact point in world units (projected each frame), or fixed screen px. */
  point: Vec3 | ((frame: number) => Vec3) | { px: [number, number] };
  /** The impact-frame silhouette pass on N, N+1 (only the ten big impacts of the collision table). */
  sil?: boolean;
  splash?: 'black' | 'violet' | null;
  /** Comic burst star; default on for big and medium. */
  burst?: boolean;
  /** Speed lines on the anticipation frames: radial at the contact, or parallel at an angle (radians). */
  lines?: 'radial' | number | null;
  /** Camera push of 3 % on N-2..N-1. Default on. */
  push?: boolean;
  /** Burst/splash size multiplier. */
  scale?: number;
}

const SHAKE_FRAMES = 23; // exp(-4 t / 23): a 4-frame half-life
const seedOf = (i: Impact) => hashKey(`p1-impact-${i.at}`) % 100000;

/** The shot camera with the recipe's anticipation push and the decaying shake of every impact. */
export const impactCamera = (path: CameraPath, impacts: readonly Impact[]): CameraPath => {
  const pushed: CameraPath = (frame) => {
    const p = path(frame);
    const k = impacts.reduce((acc, i) => (i.push !== false && frame >= i.at - 2 && frame < i.at ? acc + 0.03 : acc), 0);
    if (!k) return p;
    const d: Vec3 = [p.target[0] - p.position[0], p.target[1] - p.position[1], p.target[2] - p.position[2]];
    return { ...p, position: [p.position[0] + d[0] * k, p.position[1] + d[1] * k, p.position[2] + d[2] * k] };
  };
  const hits: ShakeHit[] = impacts.map((i) => ({ start: i.at, seed: seedOf(i), amp: { pct: SHAKE_PCT[i.size] }, frames: SHAKE_FRAMES }));
  return withShake(pushed, { hits });
};

/** Screen roll of the big impacts, degrees (+-1.5, same decay as the shake). */
export const impactRoll = (frame: number, impacts: readonly Impact[]): number =>
  impacts.reduce((acc, i) => (i.size === 'big' ? acc + (shake(frame, i.at, 1, seedOf(i) + 7, SHAKE_FRAMES).rot / 0.012) * 1.5 : acc), 0);

export const silAt = (frame: number, impacts: readonly Impact[]): boolean => impacts.some((i) => i.sil && frame >= i.at && frame <= i.at + 1);

const pointPx = (i: Impact, frame: number, pose: CameraPose): [number, number] => {
  if ('px' in i.point) return i.point.px;
  const p = typeof i.point === 'function' ? i.point(frame) : i.point;
  const q = project(pose, p);
  return [q.x, q.y];
};

const SIZES: Record<Size, number> = { big: 230, medium: 150, small: 80 };

/** Overlays of the recipe: speed lines (N-2..N-1), splash (N+2..N+12), burst (4 frames from N+2). Motion on every frame. */
export const ImpactLayer = ({ frame, impacts, pose }: { frame: number; impacts: readonly Impact[]; pose: CameraPose }) => {
  const out: ReactNode[] = [];
  impacts.forEach((i, k) => {
    const seed = seedOf(i);
    const sz = SIZES[i.size] * (i.scale ?? 1);
    const [x, y] = pointPx(i, frame, pose);
    const lines = i.lines === undefined ? (i.size === 'small' ? null : 'radial') : i.lines;
    if (lines !== null && frame >= i.at - 2 && frame < i.at) {
      out.push(
        lines === 'radial' ? (
          <SpeedLines key={`l${k}`} mode="radial" frame={frame - (i.at - 2)} duration={2} seed={seed} focus={[x, y]} inner={sz * 1.1} count={64} thickness={70} />
        ) : (
          <SpeedLines key={`l${k}`} mode="parallel" frame={frame - (i.at - 2)} duration={2} seed={seed} angle={lines} count={40} thickness={36} />
        ),
      );
    }
    if (i.splash !== null && frame >= i.at + 2) {
      out.push(<InkSplash key={`s${k}`} frame={frame - (i.at + 2)} duration={11} grow={3} fade={6} seed={seed} x={x} y={y} size={sz * 0.85} variant={i.splash ?? 'black'} />);
    }
    if ((i.burst ?? i.size !== 'small') && frame >= i.at + 2 && frame < i.at + 6) {
      out.push(<ImpactBurst key={`b${k}`} frame={frame - (i.at + 2)} duration={6} seed={seed} x={x} y={y} size={sz} flash={0} />);
    }
  });
  return <>{out}</>;
};

// ---------------------------------------------------------------------------------------------------------------
// glints (violet ignitions on the armour)
// ---------------------------------------------------------------------------------------------------------------

const starPath = (r: number, k = 4, inner = 0.18): string => {
  let d = '';
  for (let i = 0; i < k * 2; i++) {
    const a = (i / (k * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`;
  }
  return `${d}Z`;
};

/** A hard-edged violet sparkle that pops on `at` and settles; `hold` keeps a small core afterwards. */
export const Glint = ({ frame, at, x, y, size, hold = true, color = VIOLET }: { frame: number; at: number; x: number; y: number; size: number; hold?: boolean; color?: string }) => {
  const t = frame - at;
  if (t < 0) return null;
  const pop = t < 8 ? outBack(t / 4) * (1 - 0.6 * clamp01((t - 3) / 5)) : 0.4;
  if (!hold && t >= 8) return null;
  const r = size * pop;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t * 3) % 90})`}>
      <path d={starPath(r * 1.4, 4, 0.12)} fill={color} />
      <path d={starPath(r * 0.7, 4, 0.2)} fill={VIOLET_LIGHT} transform="rotate(45)" />
    </g>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// painted HUD: the boss health bar (G25 frame stand-in + C09 fill, ticks, pips, name)
// ---------------------------------------------------------------------------------------------------------------

export interface HudState {
  /** 0..100 */
  hp: number;
  /** A just-lost segment drawn ivory and shrinking (the ghost of the hit). */
  ghost?: number;
  /** Gold shine sweep 0..1 (regen). */
  shine?: number;
  /** Phase pips lit: I, II, III (0..1 each), and the III pulse. */
  pips?: [number, number, number];
  pulse?: number;
  /** Slam-in scale (1 = settled). */
  slam?: number;
  /** Crack on the frame at the II pip (0..1). */
  crack?: number;
  opacity?: number;
}

const BAR = { x: 330, y: 948, w: 1260, h: 54 };

export const Hud = ({ frame, s, box }: { frame: number; s: HudState; box?: { x: number; y: number; scale: number } }) => {
  const f2 = two(frame);
  const cell = BAR.w / 10;
  const fillW = (BAR.w * clamp01(s.hp / 100));
  const ghostW = BAR.w * clamp01((s.ghost ?? 0) / 100);
  const pip = (frac: number, lit: number, k: number) => {
    const cx = BAR.x + BAR.w * frac;
    const cy = BAR.y - 6;
    const pulse = k === 2 ? (s.pulse ?? 0) : 0;
    const r = 15 + pulse * 6;
    const fill = lit > 0.5 ? (k === 2 ? VIOLET : IVORY) : INK;
    return (
      <g key={k}>
        <path d={`M${cx} ${cy - r}L${cx + r * 0.8} ${cy}L${cx} ${cy + r}L${cx - r * 0.8} ${cy}Z`} fill={fill} stroke={GOLD} strokeWidth={5} />
        {lit > 0.5 && k === 2 && pulse > 0 ? <circle cx={cx} cy={cy} r={r * (1.6 + pulse)} fill="none" stroke={VIOLET} strokeWidth={4} opacity={1 - pulse * 0.6} /> : null}
        <text x={cx} y={cy - r - 10} textAnchor="middle" fontFamily={ANTON} fontSize={24} fill={lit > 0.5 ? IVORY : GOLD_DEEP} stroke={INK} strokeWidth={5} paintOrder="stroke">{['I', 'II', 'III'][k]}</text>
      </g>
    );
  };
  const pips = s.pips ?? [0, 0, 0];
  const slam = s.slam ?? 1;
  const b = box ?? { x: 0, y: 0, scale: 1 };
  const jitter = seeded(`hud:${Math.floor(f2 / 2)}`);
  const id = inkFilterId(77, 7, 0.2);
  return (
    <AbsoluteFill style={{ opacity: s.opacity ?? 1, transform: `translate(${b.x}px, ${b.y}px) scale(${b.scale})`, transformOrigin: '960px 975px' }}>
      <UiFonts />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <InkFilter seed={77} rough={7} breakup={0.2} />
        </defs>
        <g transform={`translate(960 975) scale(${slam}) translate(-960 -975)`}>
          <g filter={`url(#${id})`}>
            {/* frame: crown cap (left), straight run, spike cap (right) */}
            <rect x={BAR.x - 10} y={BAR.y - 10} width={BAR.w + 20} height={BAR.h + 20} fill={INK} stroke={GOLD} strokeWidth={9} />
            <path d={`M${BAR.x - 10} ${BAR.y - 18}l-62 -16l18 34l-28 -10l20 30l-26 4l26 14l-20 20l40 -2l32 -8Z`} fill={GOLD} stroke={INK} strokeWidth={5} />
            <path d={`M${BAR.x + BAR.w + 10} ${BAR.y - 8}l92 ${BAR.h / 2 + 8}l-92 ${BAR.h / 2 + 8}Z`} fill={GOLD} stroke={INK} strokeWidth={5} />
            <rect x={BAR.x} y={BAR.y} width={fillW} height={BAR.h} fill={GOLD} />
            <rect x={BAR.x} y={BAR.y + BAR.h * 0.62} width={fillW} height={BAR.h * 0.38} fill={GOLD_DEEP} />
            {ghostW > 0 ? <rect x={BAR.x + fillW} y={BAR.y} width={ghostW} height={BAR.h} fill={IVORY} /> : null}
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} x={BAR.x + cell * (i + 1) - 3} y={BAR.y} width={6} height={BAR.h} fill={INK} />
            ))}
            {s.shine !== undefined && s.shine > 0 && s.shine < 1 ? (
              <path d={`M${BAR.x + fillW * s.shine - 30} ${BAR.y}h40l-30 ${BAR.h}h-40Z`} fill={IVORY} opacity={0.9} />
            ) : null}
            {s.crack ? (
              <path d={`M${BAR.x + BAR.w * 0.667} ${BAR.y - 12}l-14 ${18 * s.crack}l20 ${14 * s.crack}l-16 ${22 * s.crack}l12 ${20 * s.crack}`} fill="none" stroke={IVORY} strokeWidth={7} strokeLinecap="round" />
            ) : null}
          </g>
          {pip(1, pips[0], 0)}
          {pip(2 / 3, pips[1], 1)}
          {pip(1 / 3, pips[2], 2)}
          {/* name caption: black lettering on ivory, ink border on twos */}
          <g transform={`translate(${BAR.x - 6 + jitter.range(-1.5, 1.5)} ${BAR.y - 78 + jitter.range(-1.5, 1.5)}) rotate(${jitter.range(-0.6, 0.6)})`}>
            <rect x={0} y={0} width={290} height={56} fill={IVORY} stroke={INK} strokeWidth={6} />
            <text x={145} y={46} textAnchor="middle" fontFamily={ANTON} fontSize={46} letterSpacing={6} fill={INK}>VORATHUL</text>
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** The health bar's whole life over part 1, a pure function of the frame. */
export const hudAt = (frame: number, ev: { in: number; chip1: number; regen1: number; chip2: number; regen2: number; fall2: number; pip1: number; pip2: number; pip3: number; fall3: number; pulse: number }): HudState | null => {
  if (frame < ev.in) return null;
  const slam = frame < ev.in + 6 ? lerp(1.5, 1, outBack((frame - ev.in) / 5)) : 1;
  let hp = 100;
  let ghost = 0;
  let shine: number | undefined;
  // the 1 % chips that heal at once (S12, S16)
  for (const [c, r] of [[ev.chip1, ev.regen1], [ev.chip2, ev.regen2]] as const) {
    if (frame >= c && frame < r) {
      hp = 99;
      ghost = frame < c + 6 ? 1 : 0;
    }
    if (frame >= r && frame < r + 12) shine = prog(frame, r, 12);
  }
  let crack = 0;
  if (frame >= ev.fall2) {
    hp = 100 * (2 / 3);
    ghost = frame < ev.fall2 + 14 ? (100 / 3) * (1 - outCubic(prog(frame, ev.fall2 + 2, 12))) : 0;
    crack = clamp01((frame - ev.fall2) / 4);
  }
  if (frame >= ev.fall3) {
    hp = 100 / 3;
    ghost = frame < ev.fall3 + 14 ? (100 / 3) * (1 - outCubic(prog(frame, ev.fall3 + 2, 12))) : 0;
  }
  const pips: [number, number, number] = [frame >= ev.pip1 ? 1 : 0, frame >= ev.pip2 ? 1 : 0, frame >= ev.pip3 ? 1 : 0];
  const pulse = frame >= ev.pip3 ? 0.5 + 0.5 * Math.sin(((frame - ev.pip3) / ev.pulse) * Math.PI * 2) : 0;
  return { hp, ghost, shine, pips, pulse, slam, crack };
};

// ---------------------------------------------------------------------------------------------------------------
// caption box (C10)
// ---------------------------------------------------------------------------------------------------------------

export const Caption = ({ frame, at, until, text, x, y, size = 120, rot = -3, strike, color = INK }: { frame: number; at: number; until?: number; text: string; x: number; y: number; size?: number; rot?: number; strike?: number; color?: string }) => {
  if (frame < at || (until !== undefined && frame >= until)) return null;
  const f2 = two(frame);
  const k = frame < at + 4 ? lerp(1.7, 1, outBack((frame - at) / 4)) : 1;
  const j = seeded(`cap:${text}:${Math.floor(f2 / 2)}`);
  const w = text.length * size * 0.52 + size * 0.9;
  const h = size * 1.35;
  const id = inkFilterId(hashKey(text) % 900 + Math.floor(f2 / 2) % 3, 6, 0.15);
  return (
    <AbsoluteFill>
      <UiFonts />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <InkFilter seed={hashKey(text) % 900 + (Math.floor(f2 / 2) % 3)} rough={6} breakup={0.15} />
        </defs>
        <g transform={`translate(${x + j.range(-2, 2)} ${y + j.range(-2, 2)}) rotate(${rot + j.range(-0.5, 0.5)}) scale(${k})`}>
          <g filter={`url(#${id})`}>
            <rect x={-w / 2 + 14} y={-h / 2 + 14} width={w} height={h} fill={INK} />
            <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={IVORY} stroke={INK} strokeWidth={10} />
          </g>
          <text x={0} y={size * 0.42} textAnchor="middle" fontFamily={ANTON} fontSize={size} letterSpacing={size * 0.06} fill={color}>{text}</text>
          {strike ? <path d={`M${-w / 2 + 20} 0L${-w / 2 + 20 + (w - 40) * strike} -6`} stroke="#3B82F6" strokeWidth={12} strokeLinecap="round" /> : null}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// comic panels (C14): screen-space polygons with ink borders and ivory gutters
// ---------------------------------------------------------------------------------------------------------------

export const Panel = ({ pts, children, slam = 1, border = 14, style }: { pts: [number, number][]; children: ReactNode; slam?: number; border?: number; style?: CSSProperties }) => {
  const clip = `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(',')})`;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return (
    <AbsoluteFill style={{ transform: `translate(${cx}px, ${cy}px) scale(${slam}) translate(${-cx}px, ${-cy}px)`, ...style }}>
      <AbsoluteFill style={{ clipPath: clip }}>{children}</AbsoluteFill>
      <Overlay>
        <path d={`M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`} fill="none" stroke={INK} strokeWidth={border} strokeLinejoin="miter" />
      </Overlay>
    </AbsoluteFill>
  );
};

/**
 * A hero panel illustration (storyboard 03 §4), cover-fitted to a panel's bounding box in frame px and cropped so the
 * image point `focus` (0..1 of the image) sits at the box centre; `zoom` > 1 crops in further, `push` adds a slow
 * push over the panel's life. The panel's clip path cuts it to the polygon.
 */
export const PanelArt = ({ id, box, focus = [0.5, 0.5], zoom = 1, push = 0 }: { id: string; box: [number, number, number, number]; focus?: [number, number]; zoom?: number; push?: number }) => {
  const [bx, by, bw, bh] = box;
  const [iw, ih] = assetSize(id) ?? [1536, 1024];
  const k = Math.max(bw / iw, bh / ih) * zoom * (1 + push);
  const w = iw * k;
  const h = ih * k;
  // place the focus at the box centre, clamped so the image always covers the box
  const left = Math.min(bx, Math.max(bx + bw - w, bx + bw / 2 - focus[0] * w));
  const top = Math.min(by, Math.max(by + bh - h, by + bh / 2 - focus[1] * h));
  return <Img src={staticFile(`assets/${id}.png`)} style={{ position: 'absolute', left, top, width: w, height: h }} />;
};

/** Bounding box of a polygon, frame px. */
export const bbox = (pts: readonly [number, number][]): [number, number, number, number] => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
};

/** Slam-in scale for a panel or card landing on `at`. */
export const slamIn = (frame: number, at: number, from = 1.35): number => (frame < at ? 0 : frame < at + 5 ? lerp(from, 1, outBack((frame - at) / 5)) : 1);

export { INK, IVORY, GOLD, VIOLET };
