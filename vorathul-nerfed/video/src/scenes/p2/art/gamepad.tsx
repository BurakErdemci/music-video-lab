import React, { useId } from 'react';
import { C, clamp01, easeOut, lerp } from '../../../ui/theme.tsx';
import { seeded } from '../../../vfx/effects.ts';

// The pad is drawn in "pad units": the body spans x -50..50 (width = 100 units), y -25..25.
const LW = 0.8;
const BTN: [number, number] = [36, -3]; // the blue face button (right of the diamond)
const BTN_R = 4.2;
const SHARDS = 7;
const GRAVITY = 0.311; // units / frame^2: drops ~140 units (1.4 x width) in 30 frames
const SEP_FRAMES = 6;
const POP_FLIGHT = 14;

const BODY =
  'M-28 -21 L28 -21 C40 -21 48 -12 49 0 C51 12 50 24 42 25 C36 26 33 18 28 12 L-28 12 C-33 18 -36 26 -42 25 C-50 24 -51 12 -49 0 C-48 -12 -40 -21 -28 -21 Z';

type Pt = readonly [number, number];

const useUid = (): string => `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

/** The one drawing of the pad. `popped` replaces the blue button by an empty socket. */
const PadDrawing: React.FC<{ popped: boolean }> = ({ popped }) => {
  const face: Pt[] = [
    [20.5, -3],
    [28, -10.5],
    [28, 4.5],
  ];
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* shoulder bumpers sit behind the body */}
      <rect x={-44} y={-25.5} width={18} height={6} rx={3} fill={C.mid} stroke={C.dark} strokeWidth={LW} />
      <rect x={26} y={-25.5} width={18} height={6} rx={3} fill={C.mid} stroke={C.dark} strokeWidth={LW} />
      <path d={BODY} fill="#F1F3F5" stroke={C.dark} strokeWidth={LW * 1.2} />
      {/* centre strip */}
      <rect x={-9} y={-12} width={18} height={2.6} rx={1.3} fill={C.mid} stroke={C.slate} strokeWidth={LW * 0.7} />
      {/* d-pad */}
      <path
        d="M-31.5 -11.5 H-24.5 V-6.5 H-19.5 V-0.5 H-24.5 V4.5 H-31.5 V-0.5 H-36.5 V-6.5 H-31.5 Z"
        transform="translate(-0.5 0)"
        fill={C.white}
        stroke={C.slate}
        strokeWidth={LW}
      />
      {/* analog sticks */}
      {[-11, 11].map((x) => (
        <g key={x}>
          <circle cx={x} cy={5} r={6.4} fill={C.mid} stroke={C.slate} strokeWidth={LW} />
          <circle cx={x} cy={5} r={3.6} fill={C.white} stroke={C.slate} strokeWidth={LW * 0.8} />
        </g>
      ))}
      {/* face buttons */}
      {face.map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={BTN_R} fill={C.white} stroke={C.slate} strokeWidth={LW} />
      ))}
      {popped ? (
        <circle cx={BTN[0]} cy={BTN[1]} r={BTN_R} fill={C.mid} stroke={C.slate} strokeWidth={LW} />
      ) : (
        <circle cx={BTN[0]} cy={BTN[1]} r={BTN_R} fill={C.blue} stroke={C.blueDark} strokeWidth={LW} />
      )}
    </g>
  );
};

interface Shard {
  poly: Pt[];
  /** Centre of rotation, pad units. */
  c: Pt;
  dir: Pt;
  vx: number;
  vy: number;
  spin: number;
  sepRot: number;
}

/** Seeded crack pattern: 7 jagged radial cracks from an impact point; neighbours share the crack vertices (no gaps). */
const makeShards = (): Shard[] => {
  const rng = seeded('gamepad-shards');
  const hit: Pt = [rng.range(-6, 6), rng.range(-4, 4)];
  const cracks: Pt[][] = [];
  const angles: number[] = [];
  for (let k = 0; k < SHARDS; k++) {
    const a = (k / SHARDS) * Math.PI * 2 + rng.range(-0.22, 0.22) + 0.3;
    angles.push(a);
    const pt = (r: number, jag: number): Pt => [hit[0] + Math.cos(a + jag) * r, hit[1] + Math.sin(a + jag) * r];
    cracks.push([pt(rng.range(9, 15), rng.range(-0.2, 0.2)), pt(rng.range(24, 34), rng.range(-0.18, 0.18)), pt(130, 0)]);
  }
  return cracks.map((cr, k) => {
    const nx = (k + 1) % SHARDS;
    const next = cracks[nx] as Pt[];
    const poly: Pt[] = [hit, ...cr, ...[...next].reverse()];
    const a0 = angles[k] as number;
    let a1 = angles[nx] as number;
    if (a1 < a0) a1 += Math.PI * 2;
    const am = (a0 + a1) / 2;
    const c: Pt = [hit[0] + Math.cos(am) * 22, hit[1] + Math.sin(am) * 22];
    const dir: Pt = [Math.cos(am), Math.sin(am)];
    return {
      poly,
      c,
      dir,
      vx: dir[0] * 0.55 + rng.range(-0.5, 0.5),
      vy: rng.range(-1.1, 0.25),
      spin: rng.sign() * rng.range(2.5, 7),
      sepRot: rng.range(-3, 3),
    };
  });
};

const pts = (p: Pt[]): string => p.map((q) => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(' ');

const ShardPiece: React.FC<{ shard: Shard; i: number; t: number; popped: boolean; bodyId: string; uid: string }> = ({ shard, i, t, popped, bodyId, uid }) => {
  const sep = easeOut(clamp01(t / SEP_FRAMES));
  const tf = Math.max(0, t - SEP_FRAMES);
  const dx = shard.dir[0] * sep * 2.4 + shard.vx * tf;
  const dy = shard.dir[1] * sep * 2.4 + shard.vy * tf + 0.5 * GRAVITY * tf * tf;
  const rot = shard.sepRot * sep + shard.spin * tf;
  const id = `${uid}s${i}`;
  return (
    <g transform={`translate(${(shard.c[0] + dx).toFixed(3)} ${(shard.c[1] + dy).toFixed(3)}) rotate(${rot.toFixed(3)}) translate(${-shard.c[0]} ${-shard.c[1]})`}>
      <clipPath id={id}>
        <polygon points={pts(shard.poly)} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <PadDrawing popped={popped} />
        {/* crack edges: stroke is centred on the polygon edge, clipped to the shard and the body, so only the inner half shows */}
        <g clipPath={`url(#${bodyId})`}>
          <polygon points={pts(shard.poly)} fill="none" stroke={C.ink} strokeWidth={LW * 2.2} strokeLinejoin="miter" />
        </g>
      </g>
    </g>
  );
};

/**
 * Game controller, front view. ORIGIN = centre of the body; width = px width of the whole pad.
 * shatterT: frames since the smash (negative = intact); popT: frames since the blue button popped off (negative = in place).
 */
export const GamepadArt: React.FC<{ width: number; shatterT: number; popT: number }> = ({ width, shatterT, popT }) => {
  const u = width / 100;
  const uid = useUid();
  const bodyId = `${uid}body`;
  const popped = popT >= 0;
  const shards = shatterT >= 0 ? makeShards() : [];
  return (
    <g transform={`scale(${u})`}>
      <clipPath id={bodyId}>
        <path d={BODY} />
      </clipPath>
      {shatterT < 0 ? (
        <PadDrawing popped={popped} />
      ) : (
        shards.map((s, i) => <ShardPiece key={i} shard={s} i={i} t={shatterT} popped={popped} bodyId={bodyId} uid={uid} />)
      )}
      {popped && <PoppedButton t={popT} />}
    </g>
  );
};

const PoppedButton: React.FC<{ t: number }> = ({ t }) => {
  const s = clamp01(t / POP_FLIGHT);
  const arc = 4 * s * (1 - s);
  let x = BTN[0] + lerp(0, 16, s);
  let y = BTN[1] + 34 * s - 45 * arc;
  let k = 1 + 0.35 * s + 0.5 * arc;
  let rot = 720 * s;
  let sx = 1;
  let sy = 1;
  if (t >= POP_FLIGHT) {
    const tb = t - POP_FLIGHT;
    const u = tb / 10;
    if (u < 1) y -= 12 * 4 * u * (1 - u);
    if (tb < 2.5) {
      sx = 1.3;
      sy = 0.7;
    } else if (tb >= 10 && tb < 12.5) {
      sx = 1.15;
      sy = 0.85;
    }
    x += 6 * easeOut(clamp01(tb / 14));
    k = 1.35;
    rot = 0;
  }
  // Squash keeps the bottom of the button on the floor.
  const rr = BTN_R;
  const ticks = t >= 0 && t < 6 ? Array.from({ length: 5 }, (_, i) => (i / 5) * Math.PI * 2 + 0.4) : [];
  return (
    <g>
      {ticks.map((a, i) => {
        const r0 = 6 + t * 0.9;
        return (
          <line
            key={i}
            x1={BTN[0] + Math.cos(a) * r0}
            y1={BTN[1] + Math.sin(a) * r0}
            x2={BTN[0] + Math.cos(a) * (r0 + 4)}
            y2={BTN[1] + Math.sin(a) * (r0 + 4)}
            stroke={C.slate}
            strokeWidth={LW * 1.3}
            strokeLinecap="round"
          />
        );
      })}
      <g transform={`translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${rot.toFixed(2)}) scale(${k.toFixed(3)})`}>
        <g transform={`translate(0 ${rr}) scale(${sx} ${sy}) translate(0 ${-rr})`}>
          <circle r={rr} fill={C.blue} stroke={C.blueDark} strokeWidth={LW} />
          <circle r={rr * 0.45} fill="none" stroke={C.blueDark} strokeWidth={LW * 0.7} />
        </g>
      </g>
    </g>
  );
};
