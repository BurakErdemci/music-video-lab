// Code-drawn office people (flat vector, thin uniform lines, office greys): stand-ins for G38 (the playtester, S76)
// and the bored developer of S88 until the generated sheets land. Pure functions of the frame; motion steps on twos.
import { seeded } from '../../vfx/seeded.ts';
import { C } from '../../ui/kit.ts';
import { clamp01, easeOut, prog, twos } from './lib.ts';

const LINE = '#343A40';
const SW = 4;

export interface PlaytesterProps {
  frame: number;
  /** Frame the arms go up (beat 571); before it he is hunched over the keyboard. */
  armsUpAt: number;
  x: number;
  y: number;
  width: number;
}

/** G38 stand-in: a playtester seen from behind at a desk. Hunched, then both arms thrown up, then a cheering bounce. */
export const Playtester = ({ frame, armsUpAt, x, y, width }: PlaytesterProps) => {
  const f = twos(frame);
  const up = easeOut(prog(f, armsUpAt - 6, 8));
  const cheer = f > armsUpAt ? Math.sin((f - armsUpAt) * 0.75) * 7 * clamp01(1 - (f - armsUpAt) / 60) : 0;
  const lift = -up * 14 + cheer;
  // Arm: shoulder -> hand, from forward on the desk (hunched) to straight up and out.
  const arm = (side: 1 | -1) => {
    const sx = 200 + side * 78;
    const sy = 296 + lift * 0.4;
    const hx = sx + side * (46 + 40 * up) + (1 - up) * side * -30;
    const hy = 420 - up * 330 + lift;
    const ex = sx + side * (20 + 40 * up);
    const ey = sy + 70 - up * 60;
    return { sx, sy, ex, ey, hx, hy };
  };
  const L = arm(-1);
  const R = arm(1);
  const limb = (a: typeof L) => `M${a.sx} ${a.sy} L${a.ex} ${a.ey} L${a.hx} ${a.hy}`;
  const curls = Array.from({ length: 11 }, (_, i) => {
    const t = (i / 10) * Math.PI;
    return [200 - Math.cos(t) * 56, 170 + lift - Math.sin(t) * 46 + (i % 2) * 5] as const;
  });
  return (
    <svg width={width} height={(width * 500) / 400} viewBox="0 0 400 500" style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }}>
      {/* chair back */}
      <path d="M92 330 Q92 250 140 244 H260 Q308 250 308 330 V500 H92 Z" fill={C.dark} stroke={LINE} strokeWidth={SW} strokeLinejoin="round" />
      {/* torso: a white t-shirt */}
      <path d={`M120 ${360} Q112 ${300 + lift * 0.3} 150 ${268 + lift * 0.4} H250 Q288 ${300 + lift * 0.3} 280 360 Z`} fill={C.white} stroke={LINE} strokeWidth={SW} strokeLinejoin="round" />
      {/* arms */}
      {[L, R].map((a, i) => (
        <g key={i}>
          <path d={limb(a)} fill="none" stroke={LINE} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" />
          <path d={limb(a)} fill="none" stroke={C.white} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={a.hx} cy={a.hy} r={22} fill={C.white} stroke={LINE} strokeWidth={SW} />
        </g>
      ))}
      {/* neck and head, back of the head with a cloud of short curls */}
      <rect x={176} y={226 + lift * 0.4} width={48} height={50} rx={14} fill={C.white} stroke={LINE} strokeWidth={SW} />
      <circle cx={200} cy={186 + lift} r={52} fill={LINE} />
      {curls.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={14} fill={LINE} />
      ))}
      <circle cx={146} cy={198 + lift} r={11} fill={C.white} stroke={LINE} strokeWidth={SW} />
      <circle cx={254} cy={198 + lift} r={11} fill={C.white} stroke={LINE} strokeWidth={SW} />
    </svg>
  );
};

export interface DevHeadProps {
  frame: number;
  /** Frame the developer first turns his head (0 = he never does). */
  turnAt: number;
  /** How far the turn goes: 1 = full face to the camera, 0.5 = a three-quarter glance. */
  turnTo?: number;
  /** Frame the coffee spurts out (omit for no spurt). */
  spurtAt?: number;
  /** Centre of the head and its radius, px. */
  x: number;
  y: number;
  r: number;
  seed?: number;
}

/**
 * The bored developer's head, drawn over the back of his head in the wall plate: it turns toward the camera, his eyes go
 * wide, and the sip comes back out in a cartoon spray of dark-grey drops (office palette, no brown).
 */
export const DevHead = ({ frame, turnAt, turnTo = 1, spurtAt, x, y, r, seed = 3 }: DevHeadProps) => {
  const f = twos(frame);
  if (!turnAt || f < turnAt) return null;
  const turn = easeOut(prog(f, turnAt, 5)) * turnTo;
  const spurt = spurtAt !== undefined && f >= spurtAt ? prog(f, spurtAt, 20) : -1;
  const spraying = spurtAt !== undefined && f >= spurtAt;
  const rng = seeded(`spurt:${seed}`);
  const drops = Array.from({ length: 24 }, () => ({ a: rng.range(-0.5, 0.5), v: rng.range(1.3, 3.0), s: rng.range(0.05, 0.14), g: rng.range(2.5, 4.5) }));
  const fx = (1 - turn) * 0.9 * r;
  const wide = turn > 0.7;
  const jolt = spraying && spurt < 0.5 ? Math.sin((f - (spurtAt as number)) * 2.4) * 0.05 * r : 0;
  return (
    <svg width={r * 8} height={r * 8} viewBox={`${-r * 4} ${-r * 4} ${r * 8} ${r * 8}`} style={{ position: 'absolute', left: x - r * 4 + jolt, top: y - r * 4, overflow: 'visible' }}>
      <defs>
        <clipPath id={`dev-head-${seed}`}>
          <circle r={r} />
        </clipPath>
      </defs>
      <circle r={r} fill={LINE} />
      <g clipPath={`url(#dev-head-${seed})`}>
        <ellipse cx={fx} cy={r * 0.12} rx={r * 0.86} ry={r * 0.92} fill={C.white} />
        <path d={`M${-r} ${-r * 0.1} Q${-r * 0.9} ${-r} 0 ${-r * 1.05} Q${r * 0.95} ${-r} ${r} ${-r * 0.05} Q${r * 0.6} ${-r * 0.45} 0 ${-r * 0.5} Q${-r * 0.6} ${-r * 0.45} ${-r} ${-r * 0.1} Z`} fill={LINE} />
        {turn > 0.35 ? (
          wide ? (
            <>
              <circle cx={fx - r * 0.34} cy={r * 0.05} r={r * 0.2} fill={C.white} stroke={LINE} strokeWidth={r * 0.06} />
              <circle cx={fx + r * 0.34} cy={r * 0.05} r={r * 0.2} fill={C.white} stroke={LINE} strokeWidth={r * 0.06} />
              <circle cx={fx - r * 0.3} cy={r * 0.0} r={r * 0.08} fill={LINE} />
              <circle cx={fx + r * 0.38} cy={r * 0.0} r={r * 0.08} fill={LINE} />
              <path d={`M${fx - r * 0.6} ${-r * 0.3} L${fx - r * 0.12} ${-r * 0.18} M${fx + r * 0.6} ${-r * 0.3} L${fx + r * 0.12} ${-r * 0.18}`} stroke={LINE} strokeWidth={r * 0.07} strokeLinecap="round" />
            </>
          ) : (
            <path d={`M${fx - r * 0.5} ${r * 0.06} H${fx - r * 0.15} M${fx + r * 0.15} ${r * 0.06} H${fx + r * 0.5}`} stroke={LINE} strokeWidth={r * 0.07} strokeLinecap="round" />
          )
        ) : null}
        {turn > 0.35 ? (
          spraying ? <ellipse cx={fx} cy={r * 0.55} rx={r * 0.2} ry={r * (0.16 + 0.06 * Math.sin(f * 1.7))} fill={LINE} /> : <path d={`M${fx - r * 0.2} ${r * 0.55} H${fx + r * 0.2}`} stroke={LINE} strokeWidth={r * 0.07} strokeLinecap="round" />
        ) : null}
      </g>
      {/* the mug at his chin, and the spray: a thick stream first, then drops on ballistic arcs */}
      {turn > 0.35 ? (
        <g transform={`translate(${r * 0.95} ${r * 0.9 + (spraying ? Math.min(1, spurt * 3) * r * 1.6 : 0)}) rotate(${spraying ? Math.min(1, spurt * 3) * 50 : 0})`}>
          <rect x={-r * 0.28} y={-r * 0.3} width={r * 0.56} height={r * 0.6} rx={r * 0.08} fill={C.white} stroke={LINE} strokeWidth={r * 0.05} />
          <path d={`M${r * 0.28} ${-r * 0.15} Q${r * 0.52} ${-r * 0.1} ${r * 0.44} ${r * 0.12} Q${r * 0.38} ${r * 0.22} ${r * 0.28} ${r * 0.18}`} fill="none" stroke={LINE} strokeWidth={r * 0.05} />
        </g>
      ) : null}
      {spraying && spurt < 1 ? (
        <>
          <path d={`M${fx} ${r * 0.58} Q${fx + r * (0.6 + spurt * 2.2)} ${r * (0.7 + spurt * 0.3)} ${fx + r * (1.1 + spurt * 3.4)} ${r * (0.9 + 2.4 * spurt * spurt)}`} stroke={LINE} strokeWidth={r * 0.42 * (1 - spurt)} strokeLinecap="round" fill="none" />
          {drops.map((d, i) => {
            const t = spurt * 0.9;
            return <circle key={i} cx={fx + Math.cos(d.a) * d.v * r * t * 1.6} cy={r * 0.6 + Math.sin(d.a) * d.v * r * t + (d.g * r * t * t) / 2} r={d.s * r * (1 - spurt * 0.5)} fill={LINE} opacity={1 - spurt * 0.6} />;
          })}
        </>
      ) : null}
    </svg>
  );
};
