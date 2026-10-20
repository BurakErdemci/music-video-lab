// Comic key-word slam for the painting world: Anton letters in ivory with an ink outline under the fill and a
// halftone ink shadow, a jagged burst and an ink splash behind; slams in with overshoot, crumbles out.
import { useVideoConfig } from 'remotion';
import { InkSplash } from '../../vfx/InkSplash.tsx';
import { seeded } from '../../vfx/seeded.ts';
import { GOLD, INK, IVORY, polyPath, VIOLET, type Pt } from '../../vfx/style.tsx';
import { antonAdvance } from './metrics.ts';
import { clamp01, easeIn, easeOut, lerp, MOTION } from './motion.ts';
import { FRAME_H, FRAME_W, SHADOW, slamGeometry, type SlamSpec } from './schedule.ts';

/** Group index of every letter: a group ends after each "-" ("VO-" "RA-" "THUL!"). */
const groupsOf = (text: string): number[] => {
  let g = 0;
  return [...text].map((ch) => {
    const mine = g;
    if (ch === '-') g++;
    return mine;
  });
};

const burstPath = (rx: number, ry: number, seed: number): string => {
  const rng = seeded(`type-burst:${seed}`);
  const n = 22;
  const pts: Pt[] = Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2 + rng.range(-0.04, 0.04);
    const r = i % 2 === 0 ? rng.range(0.98, 1.12) : rng.range(0.72, 0.84);
    return [Math.cos(a) * rx * r, Math.sin(a) * ry * r];
  });
  return polyPath(pts);
};

export const Slam = ({ spec, frame }: { spec: SlamSpec; frame: number }) => {
  const { fps } = useVideoConfig();
  const t = (frame - spec.at) / fps;
  const tOut = (frame - spec.out) / fps;
  if (t < 0 || tOut >= MOTION.crumble) return null;
  const g = slamGeometry(spec);
  const groups = groupsOf(spec.text);
  const crumble = clamp01(tOut / MOTION.crumble);
  const step = Math.floor(t / MOTION.twos);
  const jr = seeded(`type-jitter:${spec.seed}:${step}`);
  const jx = tOut < 0 ? jr.range(-2, 2) : 0;
  const jy = tOut < 0 ? jr.range(-2, 2) : 0;
  const land = easeOut(t / MOTION.slamIn);
  const burstScale = lerp(0.55, 1, land) * (1 - 0.6 * easeIn(crumble));
  const fill = spec.burst === 'ivory' ? GOLD : IVORY;
  const stroke = 0.075 * spec.size;
  const pattern = `type-ht-${spec.id}`;
  // The splash sits behind the start of the word, a little low, in the slam's rotated frame.
  const a = (spec.rot * Math.PI) / 180;
  const sx = -g.w * 0.32;
  const sy = g.h * 0.28;
  const splash = { x: spec.cx + sx * Math.cos(a) - sy * Math.sin(a), y: spec.cy + sx * Math.sin(a) + sy * Math.cos(a) };
  const splashFrames = spec.out - spec.at + Math.ceil(MOTION.crumble * fps);
  return (
    <>
      <InkSplash frame={frame - spec.at} duration={splashFrames} seed={spec.seed} x={splash.x} y={splash.y} size={g.splashR} grow={Math.max(2, Math.round(0.13 * fps))} fade={Math.ceil(MOTION.crumble * fps)} direction={Math.PI + a} />
      <svg width={FRAME_W} height={FRAME_H} viewBox={`0 0 ${FRAME_W} ${FRAME_H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <pattern id={pattern} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <circle cx={4.5} cy={4.5} r={2.7} fill={INK} />
          </pattern>
        </defs>
        <g transform={`translate(${spec.cx + jx} ${spec.cy + jy}) rotate(${spec.rot})`}>
          {spec.burst ? (
            <path d={burstPath(g.burstRx, g.burstRy, spec.seed)} transform={`scale(${burstScale})`} fill={spec.burst === 'violet' ? VIOLET : IVORY} stroke={INK} strokeWidth={7} strokeLinejoin="round" opacity={1 - crumble} />
          ) : null}
          {[...spec.text].map((ch, i) => {
            const u = t - (groups[i] as number) * MOTION.stagger;
            if (u < 0 || ch === ' ') return null;
            const scale = u < MOTION.slamIn ? lerp(2.2, 0.9, easeOut(u / MOTION.slamIn)) : lerp(0.9, 1, easeOut((u - MOTION.slamIn) / MOTION.slamSettle));
            const spin = lerp(9, 0, easeOut(u / (MOTION.slamIn + MOTION.slamSettle)));
            const r = seeded(`type-crumble:${spec.seed}:${i}`);
            const fall = easeIn(crumble);
            const cx = (g.xs[i] as number) + (antonAdvance(ch) * spec.size) / 2;
            const ox = r.range(-40, 40) * crumble;
            const oy = r.range(90, 180) * fall;
            const turn = r.range(-28, 28) * crumble;
            return (
              <g key={i} transform={`scale(${scale}) rotate(${spin})`} opacity={1 - fall}>
                <g transform={`translate(${cx + ox} ${oy}) rotate(${turn})`}>
                  <text textAnchor="middle" x={SHADOW.dx * spec.size} y={g.h / 2 + SHADOW.dy * spec.size} fontFamily="'UiAnton', 'Anton', Impact, sans-serif" fontSize={spec.size} fill={`url(#${pattern})`}>
                    {ch}
                  </text>
                  <text textAnchor="middle" x={0} y={g.h / 2} fontFamily="'UiAnton', 'Anton', Impact, sans-serif" fontSize={spec.size} fill={fill} stroke={INK} strokeWidth={stroke} strokeLinejoin="round" paintOrder="stroke">
                    {ch}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </>
  );
};
