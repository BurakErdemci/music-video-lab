import { palette } from '../style/palette.ts';
import { PLATE } from '../style/assets.ts';
import { YellowPlate, plateOffset } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { Sticky } from './Notes.tsx';
import { Squeegee } from '../motion/entranceViews.tsx';
import { drift, ENTER_FRAMES } from '../motion/entrances.ts';
import { FLOOR_Y, H, SEAM_X, W } from '../layout.ts';

export const WALL_MAX = 72;

// Free wall space of the room plate: right of the window and the strip left of it (shelf excluded; the desk is part of pose h06).
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

/**
 * The human's wall of code notes on top of the plate. `starts` holds the frame each note arrives on
 * (one per wall event); a note drifts in over `frames` and then stays.
 */
export const WallNotes = ({ frame, starts, frames = ENTER_FRAMES.drift }: { frame: number; starts: readonly number[]; frames?: number }) => (
  <g>
    {wall.slice(0, Math.min(WALL_MAX, starts.length)).map((n, i) => {
      const start = starts[i] as number;
      if (frame < start) return null;
      const d = drift(frame, start, frames, { from: { x: -14, y: 22 }, bulge: 8 });
      const t = `translate(${(n.x + d.ox).toFixed(1)} ${(n.y + d.oy).toFixed(1)}) rotate(${n.rot.toFixed(1)}) scale(${d.s.toFixed(4)})`;
      return n.kind === 'paper' ? (
        <g key={i} transform={t} opacity={d.op}>
          <rect x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h} fill={palette.cream} />
          {Array.from({ length: n.lines }, (_, k) => (
            <rect key={k} x={-n.w / 2 + 8} y={-n.h / 2 + 14 + k * 11} width={n.w - 16 - (k % 3) * 9} height={2} fill={palette.navy} />
          ))}
        </g>
      ) : (
        <g key={i} opacity={d.op}>
          <YellowPlate k={`wall-${i}`}>
            <g transform={t}>
              <Sticky size={n.w} />
            </g>
          </YellowPlate>
        </g>
      );
    })}
  </g>
);

/** One print plate: squeegee progress `p` (0..1, eased), optional opacity (the ink deepening). */
export interface PlateLayer {
  p: number;
  op?: number;
}
interface PlateProps {
  key1: PlateLayer;
  moon: PlateLayer;
  notes: PlateLayer;
}

const WIPE_SOFT = 110;

/** Left half: the deskless room plate split into three print plates (see scripts/make-plates.py), each pulled in by a squeegee. */
export const PlateRoom = ({ key1, moon, notes }: PlateProps) => {
  const yo = plateOffset('room-yellow');
  return (
    <g>
      <rect x={0} y={0} width={SEAM_X} height={H} fill={palette.navy} />
      <clipPath id="plate-clip">
        <rect x={0} y={0} width={SEAM_X} height={H} />
      </clipPath>
      <g clipPath="url(#plate-clip)">
        <Squeegee id="sq-key" p={key1.p} from={0} to={H} soft={WIPE_SOFT} reg="room-key" regAmp={14}>
          <image href={PLATE.key} x={0} y={0} width={SEAM_X} height={H} opacity={key1.op ?? 1} />
        </Squeegee>
        <Squeegee id="sq-moon" p={moon.p} from={0} to={H} soft={WIPE_SOFT} reg="room-moon" regAmp={18}>
          <image href={PLATE.moon} x={yo.dx} y={yo.dy} width={SEAM_X} height={H} />
        </Squeegee>
        <Squeegee id="sq-notes" p={notes.p} from={0} to={H} soft={WIPE_SOFT} reg="room-notes" regAmp={18}>
          <image href={PLATE.notes} x={yo.dx} y={yo.dy} width={SEAM_X} height={H} />
        </Squeegee>
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
