import { palette } from '../style/palette.ts';
import { PLATE } from '../style/assets.ts';
import { YellowPlate, plateOffset } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { Sticky } from './Notes.tsx';
import { FLOOR_Y, H, SEAM_X, W } from '../layout.ts';

export const WALL_MAX = 72;

// Free wall space of the room plate: right of the window and the strip left of it (shelf and desk excluded).
const REGIONS = [
  { x0: 600, x1: 830, y0: 110, y1: 900 },
  { x0: 165, x1: 330, y0: 110, y1: 470 },
];

interface WallNote {
  x: number;
  y: number;
  rot: number;
  kind: 'paper' | 'sticky';
  w: number;
  h: number;
  lines: number;
}

// Fixed seeded layout: raising `count` only adds notes, never moves them.
const wall: WallNote[] = (() => {
  const r = seeded('plate-wall');
  const out: WallNote[] = [];
  for (let i = 0; i < WALL_MAX; i++) {
    const reg = REGIONS[r() < 0.78 ? 0 : 1] as (typeof REGIONS)[number];
    const kind = r() < 0.45 ? 'sticky' : 'paper';
    out.push({
      x: range(r, reg.x0, reg.x1),
      y: range(r, reg.y0, reg.y1),
      rot: range(r, -9, 9),
      kind,
      w: kind === 'paper' ? range(r, 62, 84) : 60,
      h: kind === 'paper' ? range(r, 80, 104) : 60,
      lines: 3 + Math.floor(r() * 4),
    });
  }
  return out;
})();

const POP = [1.5, 1.2, 1.05, 1];

/**
 * The human's wall of code notes on top of the plate. `count` notes are shown; `popAge` is the age in
 * 12 fps steps of the newest one (it slams in from 1.5x).
 */
export const WallNotes = ({ count, popAge }: { count: number; popAge: number }) => (
  <g>
    {wall.slice(0, Math.min(WALL_MAX, count)).map((n, i, arr) => {
      const newest = i === arr.length - 1;
      const s = newest ? (POP[Math.min(popAge, POP.length - 1)] as number) : 1;
      const t = `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)}) rotate(${n.rot.toFixed(1)}) scale(${s})`;
      return n.kind === 'paper' ? (
        <g key={i} transform={t}>
          <rect x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h} fill={palette.cream} />
          {Array.from({ length: n.lines }, (_, k) => (
            <rect key={k} x={-n.w / 2 + 8} y={-n.h / 2 + 14 + k * 11} width={n.w - 16 - (k % 3) * 9} height={2} fill={palette.navy} />
          ))}
        </g>
      ) : (
        <YellowPlate key={i} k={`wall-${i}`}>
          <g transform={t}>
            <Sticky size={n.w} />
          </g>
        </YellowPlate>
      );
    })}
  </g>
);

interface PlateProps {
  /** Key plate (navy + cream) offset and opacity; null = not printed yet. */
  key1: { dx: number; dy: number; op: number } | null;
  moon: { dx: number; dy: number; op: number } | null;
  notes: { dx: number; dy: number; op: number } | null;
}

/** Left half: the room plate split into three print plates (see scripts/make-plates.py). */
export const PlateRoom = ({ key1, moon, notes }: PlateProps) => {
  const yo = plateOffset('room-yellow');
  return (
    <g>
      <rect x={0} y={0} width={SEAM_X} height={H} fill={palette.navy} />
      <clipPath id="plate-clip">
        <rect x={0} y={0} width={SEAM_X} height={H} />
      </clipPath>
      <g clipPath="url(#plate-clip)">
        {key1 && <image href={PLATE.key} x={key1.dx} y={key1.dy} width={SEAM_X} height={H} opacity={key1.op} />}
        {moon && <image href={PLATE.moon} x={moon.dx + yo.dx} y={moon.dy + yo.dy} width={SEAM_X} height={H} opacity={moon.op} />}
        {notes && <image href={PLATE.notes} x={notes.dx + yo.dx} y={notes.dy + yo.dy} width={SEAM_X} height={H} opacity={notes.op} />}
      </g>
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
