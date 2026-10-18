import { palette } from '../style/palette.ts';
import { YellowPlate } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { Sticky } from './Notes.tsx';
import { FLOOR_Y, H, SEAM_X, W } from '../layout.ts';

const WALL_MAX = 72;
const WINDOW = { x: 356, y: 130, w: 190, h: 400 };

interface WallNote {
  x: number;
  y: number;
  rot: number;
  kind: 'paper' | 'sticky';
  w: number;
  h: number;
  lines: number;
}

// Fixed seeded layout: raising `fill` only adds notes, never moves them.
const wall: WallNote[] = (() => {
  const r = seeded('navy-wall');
  const out: WallNote[] = [];
  let tries = 0;
  while (out.length < WALL_MAX && tries < 4000) {
    tries++;
    const x = range(r, 40, 610);
    const y = range(r, 110, 720);
    const inWindow = x > WINDOW.x - 50 && x < WINDOW.x + WINDOW.w + 50 && y < WINDOW.y + WINDOW.h + 50;
    if (inWindow) continue;
    const kind = r() < 0.45 ? 'sticky' : 'paper';
    out.push({ x, y, rot: range(r, -9, 9), kind, w: kind === 'paper' ? range(r, 62, 84) : 60, h: kind === 'paper' ? range(r, 80, 104) : 60, lines: 3 + Math.floor(r() * 4) });
  }
  return out;
})();

/** Left half: navy room with a window, a floor line and a wall of pinned notes (`fill` 0..1). */
export const NavyRoom = ({ fill }: { fill: number }) => {
  const count = Math.round(Math.min(1, Math.max(0, fill)) * WALL_MAX);
  const shown = wall.slice(0, count);
  return (
    <g>
      <rect x={0} y={0} width={SEAM_X} height={H} fill={palette.navy} />
      <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} fill="none" stroke={palette.cream} strokeWidth={3} />
      <rect x={WINDOW.x + WINDOW.w / 2 - 1.5} y={WINDOW.y} width={3} height={WINDOW.h} fill={palette.cream} />
      <rect x={WINDOW.x} y={WINDOW.y + 150} width={WINDOW.w} height={3} fill={palette.cream} />
      <clipPath id="window-clip">
        <rect x={WINDOW.x + 2} y={WINDOW.y + 2} width={WINDOW.w - 4} height={WINDOW.h - 4} />
      </clipPath>
      <g clipPath="url(#window-clip)">
        <YellowPlate k="window-moon">
          <circle cx={WINDOW.x + 52} cy={WINDOW.y + 96} r={58} fill={palette.moonYellow} />
        </YellowPlate>
      </g>
      <rect x={0} y={FLOOR_Y} width={SEAM_X} height={3} fill={palette.cream} />
      {shown.map((n, i) =>
        n.kind === 'paper' ? (
          <g key={i} transform={`translate(${n.x.toFixed(1)} ${n.y.toFixed(1)}) rotate(${n.rot.toFixed(1)})`}>
            <rect x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h} fill={palette.cream} />
            {Array.from({ length: n.lines }, (_, k) => (
              <rect key={k} x={-n.w / 2 + 8} y={-n.h / 2 + 14 + k * 11} width={n.w - 16 - (k % 3) * 9} height={2} fill={palette.navy} />
            ))}
          </g>
        ) : (
          <YellowPlate key={i} k={`wall-${i}`}>
            <g transform={`translate(${n.x.toFixed(1)} ${n.y.toFixed(1)}) rotate(${n.rot.toFixed(1)})`}>
              <Sticky size={n.w} />
            </g>
          </YellowPlate>
        ),
      )}
    </g>
  );
};

/** Right half: empty cream room with a floor line. */
export const WhiteRoom = () => (
  <g>
    <rect x={SEAM_X} y={0} width={W - SEAM_X} height={H} fill={palette.cream} />
    <rect x={SEAM_X} y={FLOOR_Y - 1} width={W - SEAM_X} height={4} fill={palette.navy} />
  </g>
);
