// 2D overlays of the interlude shots (S74-S75). Everything steps on twos and is a pure function of the frame.
import { Img, staticFile } from 'remotion';
import { Overlay } from '../../vfx/effects.ts';
import { seeded } from '../../vfx/seeded.ts';
import { C, UiFonts } from '../../ui/kit.ts';
import { UI_FONT } from '../../ui/theme.tsx';
import type { CameraPose } from '../../stage/Stage.tsx';
import { H, W, clamp01, easeOut, project, prog, twos } from './lib.ts';

const GOLD_DUST = '#B98F2E';

export interface DustProps {
  frame: number;
  /** Frame the motes first appear; a second wave `gust` frames later drifts harder. */
  start: number;
  gust?: number;
  seed?: number;
  count?: number;
}

/** Slow motes in the light: gold and ink flecks rising, swaying, a gust on the second cue. */
export const DustMotes = ({ frame, start, gust, seed = 4, count = 46 }: DustProps) => {
  const f = twos(frame);
  const rng = seeded(`dust:${seed}`);
  const motes = Array.from({ length: count }, (_, i) => ({
    x: rng.range(0.05, 0.95) * W, y: rng.range(0.15, 0.95) * H, r: rng.range(1.6, 4.4), vy: rng.range(0.15, 0.55),
    sway: rng.range(8, 30), ph: rng() * 6.28, born: start + rng.int(0, 40), ink: i % 7 === 0, gustK: rng.range(0.8, 2.2),
  }));
  return (
    <Overlay>
      {motes.map((m, i) => {
        const t = f - m.born;
        if (t < 0) return null;
        const g = gust !== undefined && f > gust ? (f - gust) * m.gustK * 0.7 : 0;
        const x = m.x + Math.sin(t / 36 + m.ph) * m.sway + g;
        const y = m.y - t * m.vy - g * 0.25;
        const a = clamp01(t / 24) * (0.35 + 0.3 * Math.sin(t / 15 + m.ph)) * clamp01((y + 40) / 120);
        return <circle key={i} cx={x} cy={y} r={m.r} fill={m.ink ? '#0A0908' : GOLD_DUST} opacity={a} />;
      })}
    </Overlay>
  );
};

/** The painted dust layer (L4-dust, ivory motes on black) screen-blended at low opacity, drifting slowly down and left. */
export const DustLayer = ({ frame, opacity = 0.3 }: { frame: number; opacity?: number }) => (
  <Img
    src={staticFile('assets/L4-dust.png')}
    style={{ position: 'absolute', left: -60 - frame * 0.06, top: -40 + ((frame * 0.05) % 40), width: W + 120, height: H + 80, mixBlendMode: 'screen', opacity, pointerEvents: 'none' }}
  />
);

/** Four-point glints on the floor, flickering on twos. */
export const FloorGlints = ({ frame, start, points, seed = 2 }: { frame: number; start: number; points: [number, number][]; seed?: number }) => {
  const f = twos(frame);
  const rng = seeded(`glint:${seed}`);
  return (
    <Overlay>
      {points.map(([x, y], i) => {
        const born = start + i * 3;
        const t = f - born;
        const ph = rng() * 6.28;
        if (t < 0) return null;
        const a = clamp01(t / 6) * (0.55 + 0.45 * Math.sin(f / 5 + ph));
        const r = 26 + 10 * Math.sin(f / 7 + ph);
        return (
          <path key={i} d={`M${x} ${y - r} L${x + r * 0.16} ${y - r * 0.16} L${x + r} ${y} L${x + r * 0.16} ${y + r * 0.16} L${x} ${y + r} L${x - r * 0.16} ${y + r * 0.16} L${x - r} ${y} L${x - r * 0.16} ${y - r * 0.16} Z`} fill="#FFFFFF" stroke="#E2B33C" strokeWidth={2} opacity={a} />
        );
      })}
    </Overlay>
  );
};

export interface RingSpec { x: number; z: number; label: string; fillAt: number }

/** Ellipse of a floor circle as seen through the camera, as an SVG path. */
const ringPath = (pose: CameraPose, x: number, z: number, r: number): string => {
  const pts = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    return project(pose, [x + Math.cos(a) * r, 0.04, z + Math.sin(a) * r]);
  });
  if (pts.some((p) => p === null)) return '';
  return `M${(pts as [number, number][]).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`;
};

export interface SpawnProps { frame: number; pose: CameraPose; rings: RingSpec[]; outlineAt: number; pulseAt: number; radius?: number }

/** The four game spawn rings of S75 ("P1 P2 P3 P4"): UI-blue outlines draw in, each fills on its word, all pulse on the beat. */
export const SpawnRings = ({ frame, pose, rings, outlineAt, pulseAt, radius = 1.25 }: SpawnProps) => {
  const f = twos(frame);
  const pulse = prog(f, pulseAt, 14);
  const draw = prog(f, outlineAt, 14);
  return (
    <>
      <UiFonts />
      <Overlay>
        {rings.map((rg, i) => {
          const d = ringPath(pose, rg.x, rg.z, radius);
          const dPulse = ringPath(pose, rg.x, rg.z, radius * (1 + 0.5 * pulse));
          const fill = prog(f, rg.fillAt, 8);
          return (
            <g key={i}>
              <path d={d} fill={C.blue} opacity={0.2 * fill} />
              <path d={d} fill="none" stroke={C.blue} strokeWidth={4} strokeLinecap="round" opacity={0.7 * draw * (0.55 + 0.45 * fill)} pathLength={100} strokeDasharray={`${100 * draw} 100`} />
              {pulse > 0 && pulse < 1 ? <path d={dPulse} fill="none" stroke={C.blue} strokeWidth={3} opacity={0.6 * (1 - pulse)} /> : null}
            </g>
          );
        })}
      </Overlay>
      {rings.map((rg, i) => {
        const p = project(pose, [rg.x, 0.6, rg.z]);
        const a = prog(f, rg.fillAt, 6);
        if (!p || a <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: p[0] - 70, top: p[1] - 120 - (1 - easeOut(a)) * 24, width: 140, textAlign: 'center',
              fontFamily: UI_FONT, fontWeight: 800, fontSize: 56, letterSpacing: 2, color: C.blue, opacity: 0.85 * a,
              textShadow: '0 0 0 #fff', filter: 'drop-shadow(0 3px 0 rgba(255,255,255,0.7))',
            }}
          >
            {rg.label}
          </div>
        );
      })}
    </>
  );
};
