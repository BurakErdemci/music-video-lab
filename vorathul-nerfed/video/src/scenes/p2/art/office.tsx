import React from 'react';
import { C } from '../../../ui/theme.tsx';

// Flat sterile office art. Units: 1 = 1 world unit, y down, origin = painting centre.
// Pure functions of props; every component returns a <g>.

export const OFFICE = { floorY: 6.2 };

const SW = 0.035; // uniform thin outline
const WALL = '#E6E9ED';
const FLOOR = '#D3D8DE';
const GREY5 = '#495057';
const FRAME = '#1B1D21';
const JACKET = '#212529';
const UI_FONT = "'UiInter', sans-serif";

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Rounded rect with the shared outline. */
const Box: React.FC<{
  x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string;
}> = ({ x, y, w, h, r = 0.12, fill = C.white, stroke = C.slate }) => (
  <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill={fill} stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
);

/** Thick rounded line with an outline (limbs, bars). */
const Capsule: React.FC<{
  x1: number; y1: number; x2: number; y2: number; w: number; fill: string; stroke?: string;
}> = ({ x1, y1, x2, y2, w, fill, stroke = C.ink }) => (
  <g strokeLinecap="round">
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={w + SW * 2} />
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={fill} strokeWidth={w} />
  </g>
);

const Mug: React.FC<{ x: number; fill?: string }> = ({ x, fill = C.white }) => (
  <g transform={`translate(${x},-2.6)`}>
    <path d="M0.2 -0.34 a0.16 0.16 0 0 1 0 0.3" fill="none" stroke={C.slate} strokeWidth={0.07} strokeLinecap="round" />
    <Box x={-0.22} y={-0.46} w={0.42} h={0.46} r={0.08} fill={fill} />
  </g>
);

const PencilCup: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x},-2.6)`}>
    <line x1={-0.06} y1={-0.4} x2={-0.14} y2={-0.78} stroke={C.slate} strokeWidth={0.05} strokeLinecap="round" />
    <line x1={0.04} y1={-0.4} x2={0.1} y2={-0.8} stroke={C.blue} strokeWidth={0.05} strokeLinecap="round" />
    <Box x={-0.17} y={-0.46} w={0.34} h={0.46} r={0.06} fill={C.mid} />
  </g>
);

const Keyboard: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x},-2.6)`}>
    <Box x={-0.6} y={-0.12} w={1.2} h={0.12} r={0.05} fill={C.mid} />
    <line x1={-0.45} y1={-0.06} x2={0.45} y2={-0.06} stroke={C.slate} strokeWidth={SW} strokeLinecap="round" strokeDasharray="0.1 0.08" />
  </g>
);

const Leaf: React.FC<{ len: number; w: number; angle: number; fill: string; x?: number; y?: number }> = ({
  len, w, angle, fill, x = 0, y = 0,
}) => (
  <g transform={`translate(${x},${y}) rotate(${angle})`}>
    <path d={`M0 0 Q${w} ${-len * 0.45} 0 ${-len} Q${-w} ${-len * 0.45} 0 0Z`} fill={fill} stroke={C.slate} strokeWidth={SW} strokeLinejoin="round" />
    <line x1={0} y1={-len * 0.1} x2={0} y2={-len * 0.8} stroke={C.slate} strokeWidth={SW} strokeLinecap="round" />
  </g>
);

/** Small potted plant used on the shelf; local origin = pot floor point. */
const MiniPlant: React.FC = () => (
  <g>
    <Leaf len={0.9} w={0.2} angle={-38} fill={C.dark} y={-0.4} />
    <Leaf len={1.1} w={0.22} angle={0} fill={C.mid} y={-0.4} />
    <Leaf len={0.9} w={0.2} angle={38} fill={C.slate} y={-0.4} />
    <path d="M-0.4 -0.5 H0.4 L0.3 0 H-0.3Z" fill={C.white} stroke={C.slate} strokeWidth={SW} strokeLinejoin="round" />
  </g>
);

// ---------------------------------------------------------------- wall

const CeilingBar: React.FC<{ x: number; y: number; angle: number; len: number }> = ({ x, y, angle, len }) => (
  <g transform={`translate(${x},${y}) rotate(${angle})`}>
    <Box x={-len / 2} y={-0.28} w={len} h={0.56} r={0.1} fill={C.white} stroke={C.dark} />
    <rect x={-len / 2 + 0.2} y={-0.1} width={len - 0.4} height={0.2} rx={0.1} fill={C.bg} />
  </g>
);

const Shelf: React.FC = () => {
  const x0 = -22;
  const x1 = -15;
  const boards = [4.7, 3.0, 1.3, -0.4];
  return (
    <g>
      <Box x={x0} y={-0.4} w={0.18} h={6.6} r={0.05} />
      <Box x={x1 - 0.18} y={-0.4} w={0.18} h={6.6} r={0.05} />
      {boards.map((by) => (
        <Box key={by} x={x0} y={by} w={x1 - x0} h={0.2} r={0.06} />
      ))}
      {/* row 1 (lowest): boxes */}
      <Box x={-21.6} y={3.2} w={2.2} h={1.5} r={0.12} fill={C.mid} />
      <Box x={-19.2} y={3.7} w={1.7} h={1.0} r={0.12} fill={C.dark} />
      <Box x={-17.3} y={3.3} w={1.8} h={1.4} r={0.12} fill={C.bg} />
      {/* row 2: binders */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={i} x={-21.6 + i * 0.5} y={1.5 + (i % 2) * 0.1} w={0.4} h={1.5 - (i % 2) * 0.1} r={0.06} fill={[C.mid, C.dark, C.bg, C.slate, C.mid][i]} />
      ))}
      <Box x={-18.7} y={2.0} w={2.8} h={1.0} r={0.12} fill={C.bg} />
      {/* row 3 */}
      <Box x={-21.6} y={0.2} w={2.4} h={1.1} r={0.12} fill={C.dark} />
      <Box x={-19.0} y={-0.1} w={0.5} h={1.4} r={0.06} fill={C.mid} />
      <Box x={-18.4} y={0.4} w={0.4} h={0.9} r={0.06} fill={C.slate} />
      <Box x={-17.8} y={0.3} w={2.2} h={1.0} r={0.12} fill={C.bg} />
      {/* plant and a box on top */}
      <g transform="translate(-19.2,-0.4) scale(1.5)">
        <MiniPlant />
      </g>
      <Box x={-16.9} y={-1.0} w={1.4} h={0.6} r={0.1} fill={C.mid} />
    </g>
  );
};

const Window: React.FC = () => {
  const x0 = 15;
  const y0 = -5;
  const w = 8;
  const h = 8.8;
  return (
    <g>
      <Box x={x0} y={y0} w={w} h={h} r={0.2} fill={C.white} stroke={C.dark} />
      <Box x={x0 + 0.35} y={y0 + 0.35} w={w - 0.7} h={h - 0.7} r={0.12} fill="#DCE6F0" stroke={C.dark} />
      <rect x={x0 + w / 2 - 0.09} y={y0 + 0.35} width={0.18} height={h - 0.7} fill={C.white} stroke={C.dark} strokeWidth={SW} />
      <rect x={x0 + 0.35} y={y0 + h * 0.4} width={w - 0.7} height={0.18} fill={C.white} stroke={C.dark} strokeWidth={SW} />
      <Box x={x0 - 0.3} y={y0 + h} w={w + 0.6} h={0.25} r={0.1} fill={C.white} stroke={C.dark} />
    </g>
  );
};

export const WallArt: React.FC = () => (
  <g>
    <rect x={-34} y={-18} width={68} height={24.2} fill={WALL} />
    <rect x={-34} y={6.2} width={68} height={11.8} fill={FLOOR} />
    <rect x={-34} y={7.4} width={68} height={0.5} fill="#DEE2E7" />
    <rect x={-34} y={5.9} width={68} height={0.3} fill={C.mid} />
    <line x1={-34} y1={5.9} x2={34} y2={5.9} stroke={C.dark} strokeWidth={SW} />
    <line x1={-34} y1={6.2} x2={34} y2={6.2} stroke={C.dark} strokeWidth={SW} />
    <CeilingBar x={-11.4} y={-5.3} angle={28} len={7} />
    <CeilingBar x={11.4} y={-5.3} angle={-28} len={7} />
    <CeilingBar x={-24} y={-11} angle={28} len={9} />
    <CeilingBar x={24} y={-11} angle={-28} len={9} />
    <Shelf />
    <Window />
  </g>
);

// ---------------------------------------------------------------- frame

export const FrameArt: React.FC = () => (
  <g>
    <path d="M-8.55 -5.05 H8.55 V5.05 H-8.55 Z M-8 -4.5 V4.5 H8 V-4.5 Z" fill={FRAME} fillRule="evenodd" />
    <path
      d="M-8.45 -4.95 H8.45 V4.95 H-8.45 Z M-8.1 -4.6 V4.6 H8.1 V-4.6 Z"
      fill="none"
      stroke="#3A3D44"
      strokeWidth={SW}
      fillRule="evenodd"
      strokeLinejoin="round"
    />
    <Box x={-0.7} y={-5.3} w={1.4} h={0.25} r={0.08} fill={C.dark} stroke={C.slate} />
    <circle cx={0} cy={-5.17} r={0.07} fill={C.white} stroke={C.slate} strokeWidth={SW} />
  </g>
);

// ---------------------------------------------------------------- sticky notes

interface NoteSpec { x: number; y: number; rot: number; lines: number[] }
const NOTES: readonly NoteSpec[] = [
  { x: -8.55, y: -2.7, rot: -6, lines: [0.7, 0.55, 0.35] },
  { x: -8.5, y: -1.15, rot: 5, lines: [0.6, 0.7] },
  { x: 8.55, y: -2.2, rot: 6, lines: [0.5, 0.7, 0.4] },
  { x: 8.5, y: -0.8, rot: -5, lines: [0.7, 0.4] },
  { x: 8.6, y: 0.55, rot: 4, lines: [0.6, 0.6, 0.3] },
];

/** 0..0.4 slap (scale 1.5 -> squashed undershoot -> 1); then at rest. */
const slap = (p: number): { sx: number; sy: number } => {
  const t = clamp01(p / 0.4);
  const s = t < 0.6 ? 1.5 + (0.93 - 1.5) * (1 - (1 - t / 0.6) ** 3) : 0.93 + (1 - 0.93) * ((t - 0.6) / 0.4);
  const squash = Math.sin(Math.PI * t) * 0.06;
  return { sx: s * (1 + squash), sy: s * (1 - squash) };
};

export const StickyNotesArt: React.FC<{ progress: readonly number[] }> = ({ progress }) => (
  <g>
    {NOTES.map((n, i) => {
      const p = progress[i] ?? 1;
      if (p <= 0) return null;
      const { sx, sy } = slap(p);
      return (
        <g key={i} transform={`translate(${n.x},${n.y}) rotate(${n.rot}) scale(${sx},${sy})`}>
          <rect x={-0.55} y={-0.55} width={1.1} height={1.1} rx={0.06} fill={C.note} stroke={C.dark} strokeWidth={SW} strokeLinejoin="round" />
          {n.lines.map((l, k) => (
            <line key={k} x1={-0.38} y1={-0.2 + k * 0.22} x2={-0.38 + l} y2={-0.2 + k * 0.22} stroke={C.slate} strokeWidth={0.04} strokeLinecap="round" />
          ))}
          <circle cx={0} cy={-0.42} r={0.08} fill={C.blue} stroke={C.blueDark} strokeWidth={SW} />
        </g>
      );
    })}
  </g>
);

// ---------------------------------------------------------------- desk

const SCREEN_W = 2.04;
const SCREEN_H = 1.34;

const ScreenAbstract: React.FC = () => (
  <g>
    <rect x={0} y={0} width={SCREEN_W} height={0.22} fill={C.bg} />
    <circle cx={0.14} cy={0.11} r={0.04} fill={C.dark} />
    <circle cx={0.26} cy={0.11} r={0.04} fill={C.dark} />
    <rect x={1.6} y={0.06} width={0.34} height={0.1} rx={0.05} fill={C.blue} />
    <rect x={0.1} y={0.32} width={0.5} height={0.92} rx={0.06} fill={C.mid} />
    <rect x={0.7} y={0.32} width={0.6} height={0.5} rx={0.06} fill={C.bg} stroke={C.dark} strokeWidth={SW} />
    <rect x={1.38} y={0.32} width={0.56} height={0.5} rx={0.06} fill={C.bg} stroke={C.dark} strokeWidth={SW} />
    <rect x={0.7} y={0.92} width={1.24} height={0.32} rx={0.06} fill={C.mid} />
    <line x1={0.8} y1={1.08} x2={1.6} y2={1.08} stroke={C.slate} strokeWidth={0.04} strokeLinecap="round" />
  </g>
);

const ScreenUpdater: React.FC<{ title: string; fill: number; label: string }> = ({ title, fill, label }) => {
  const barW = 1.5;
  const barH = 0.15;
  const fw = barW * clamp01(fill);
  return (
    <g>
      <rect x={0.14} y={0.14} width={SCREEN_W - 0.28} height={SCREEN_H - 0.28} rx={0.1} fill={C.white} stroke={C.dark} strokeWidth={SW} />
      <rect x={0.15} y={0.15} width={SCREEN_W - 0.3} height={0.26} rx={0.09} fill={C.bg} />
      <circle cx={0.3} cy={0.28} r={0.045} fill={C.dark} />
      <circle cx={0.43} cy={0.28} r={0.045} fill={C.dark} />
      <text x={0.3} y={0.7} fontFamily={UI_FONT} fontWeight={600} fontSize={0.19} fill={C.ink}>{title}</text>
      <rect x={0.3} y={0.8} width={barW} height={barH} rx={barH / 2} fill={C.mid} />
      {fw > 0 ? <rect x={0.3} y={0.8} width={fw} height={barH} rx={Math.min(barH / 2, fw / 2)} fill={C.blue} /> : null}
      <text x={0.3} y={1.13} fontFamily={UI_FONT} fontWeight={600} fontSize={0.14} fill={C.slate}>{label}</text>
    </g>
  );
};

const Monitor: React.FC<{ x: number; screen?: { title: string; fill: number; label: string } }> = ({ x, screen }) => {
  const sx = x - SCREEN_W / 2;
  const sy = -4.57;
  return (
    <g>
      <Box x={x - 0.09} y={-3.2} w={0.18} h={0.62} r={0.04} fill={C.mid} />
      <Box x={x - 0.5} y={-2.7} w={1.0} h={0.1} r={0.05} fill={C.mid} />
      <Box x={x - 1.1} y={-4.65} w={2.2} h={1.5} r={0.14} fill={C.white} />
      <g transform={`translate(${sx},${sy})`}>
        <rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} rx={0.06} fill={C.white} stroke={C.dark} strokeWidth={SW} />
        {screen ? <ScreenUpdater title={screen.title} fill={screen.fill} label={screen.label} /> : <ScreenAbstract />}
      </g>
    </g>
  );
};

const Chair: React.FC = () => (
  <g>
    <Box x={-3.75} y={-3.9} w={0.45} h={2.2} r={0.2} fill={GREY5} stroke={C.ink} />
    <Box x={-3.6} y={-1.95} w={2.5} h={0.28} r={0.14} fill={GREY5} stroke={C.ink} />
    <Box x={-2.5} y={-1.67} w={0.16} h={1.0} r={0.05} fill={C.slate} />
    <line x1={-3.5} y1={-0.62} x2={-1.3} y2={-0.62} stroke={C.ink} strokeWidth={0.1} strokeLinecap="round" />
    {[-3.45, -2.4, -1.35].map((cx) => (
      <circle key={cx} cx={cx} cy={-0.13} r={0.12} fill={C.slate} stroke={C.ink} strokeWidth={SW} />
    ))}
    <line x1={-3.45} y1={-0.45} x2={-3.45} y2={-0.2} stroke={C.ink} strokeWidth={0.06} />
    <line x1={-1.35} y1={-0.45} x2={-1.35} y2={-0.2} stroke={C.ink} strokeWidth={0.06} />
  </g>
);

/** Developer drawn for the left chair (facing +x); the right desk mirrors the whole group. */
const Developer: React.FC<{ side: 'L' | 'R' }> = ({ side }) => {
  const L = side === 'L';
  const top = L ? C.white : JACKET;
  const hy = L ? -4.1 : -3.95;
  const skin = C.bg;
  return (
    <g>
      <Chair />
      {/* legs */}
      <Capsule x1={-2.7} y1={-2.15} x2={-1.3} y2={-2.1} w={0.5} fill={C.ink} />
      <Capsule x1={-1.3} y1={-2.1} x2={-1.2} y2={-0.4} w={0.4} fill={C.ink} />
      <Box x={-1.4} y={-0.3} w={0.8} h={0.3} r={0.15} fill={C.white} stroke={C.slate} />
      {/* torso */}
      <Box x={-3.15} y={-3.75} w={1.6} h={1.8} r={0.5} fill={top} stroke={C.ink} />
      {!L ? <line x1={-2.35} y1={-3.6} x2={-2.35} y2={-2.3} stroke="#3A3D44" strokeWidth={SW} /> : null}
      <rect x={-2.55} y={-3.98} width={0.5} height={0.35} rx={0.1} fill={skin} stroke={C.ink} strokeWidth={SW} />
      {/* head */}
      <circle cx={-2.3} cy={hy} r={0.5} fill={FRAME} />
      {L ? (
        <g>
          <path
            d={`M-2.72 ${hy - 0.22} L-2.68 ${hy - 0.56} L-2.5 ${hy - 0.42} L-2.35 ${hy - 0.62} L-2.15 ${hy - 0.46} L-1.98 ${hy - 0.5} L-1.9 ${hy - 0.22} Z`}
            fill={FRAME}
          />
          <line x1={-2.0} y1={hy - 0.02} x2={-1.7} y2={hy - 0.06} stroke={C.slate} strokeWidth={0.05} strokeLinecap="round" />
          <Box x={-1.78} y={hy - 0.17} w={0.22} h={0.24} r={0.08} fill="none" stroke={C.slate} />
        </g>
      ) : (
        <g>
          <circle cx={-2.45} cy={hy - 0.55} r={0.24} fill={FRAME} />
        </g>
      )}
      {/* arm to the keyboard */}
      <Capsule x1={-2.85} y1={-3.3} x2={-2.2} y2={-2.75} w={0.38} fill={top} />
      <Capsule x1={-2.2} y1={-2.75} x2={-0.45} y2={-2.78} w={0.3} fill={top} />
      <circle cx={-0.3} cy={-2.76} r={0.17} fill={skin} stroke={C.ink} strokeWidth={SW} />
    </g>
  );
};

const Cabinet: React.FC<{ x: number }> = ({ x }) => (
  <g>
    <Box x={x} y={-2.45} w={1.7} h={2.45} r={0.08} fill={C.mid} />
    <line x1={x} y1={-1.25} x2={x + 1.7} y2={-1.25} stroke={C.slate} strokeWidth={SW} />
    <line x1={x + 0.55} y1={-1.85} x2={x + 1.15} y2={-1.85} stroke={C.slate} strokeWidth={0.06} strokeLinecap="round" />
    <line x1={x + 0.55} y1={-0.65} x2={x + 1.15} y2={-0.65} stroke={C.slate} strokeWidth={0.06} strokeLinecap="round" />
  </g>
);

export const DeskArt: React.FC<{ side: 'L' | 'R'; screen?: { title: string; fill: number; label: string } }> = ({ side, screen }) => {
  const m = side === 'L' ? 1 : -1;
  return (
    <g>
      <Box x={-3.15} y={-2.45} w={0.12} h={2.45} r={0.04} />
      <Box x={3.03} y={-2.45} w={0.12} h={2.45} r={0.04} />
      <Cabinet x={m > 0 ? 1.3 : -3.0} />
      <Box x={-3.2} y={-2.6} w={6.4} h={0.16} r={0.06} />
      <Monitor x={0.9 * m} screen={screen} />
      <Keyboard x={0.5 * m} />
      <Mug x={2.5 * m} fill={side === 'L' ? C.white : C.mid} />
      {side === 'R' ? <PencilCup x={-2.95} /> : null}
      <g transform={m < 0 ? 'scale(-1,1)' : undefined}>
        <Developer side={side} />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- plant

export const PlantArt: React.FC = () => (
  <g>
    <Leaf len={3.2} w={0.5} angle={-52} fill={C.dark} y={-0.9} />
    <Leaf len={3.4} w={0.5} angle={50} fill={C.slate} y={-0.9} />
    <Leaf len={3.9} w={0.55} angle={-24} fill={C.mid} y={-0.9} />
    <Leaf len={3.6} w={0.5} angle={28} fill={C.dark} y={-0.9} />
    <Leaf len={4.4} w={0.55} angle={-4} fill={C.slate} y={-0.9} />
    <Leaf len={2.4} w={0.42} angle={-72} fill={C.mid} y={-0.9} />
    <Leaf len={2.5} w={0.42} angle={70} fill={C.mid} y={-0.9} />
    <path d="M-0.65 -1.0 H0.65 L0.5 0 H-0.5Z" fill={C.white} stroke={C.slate} strokeWidth={SW} strokeLinejoin="round" />
    <Box x={-0.7} y={-1.12} w={1.4} h={0.2} r={0.08} fill={C.white} />
  </g>
);

// ---------------------------------------------------------------- foreground desk corner

export const DeskCornerArt: React.FC = () => (
  <g>
    <Box x={0.1} y={-2.45} w={0.14} h={2.45} r={0.04} />
    <Box x={2.7} y={-2.45} w={0.14} h={2.45} r={0.04} />
    <Box x={0.0} y={-2.8} w={3.0} h={0.35} r={0.1} />
    <line x1={0.15} y1={-2.55} x2={2.85} y2={-2.55} stroke={C.mid} strokeWidth={SW} />
    <g transform="translate(0,-0.2)">
      <Mug x={1.9} />
    </g>
  </g>
);
