import { palette } from '../style/palette.ts';
import { PLATE } from '../style/assets.ts';
import { YellowPlate, plateOffset } from '../style/screenprint.tsx';
import { seeded, range } from '../style/seeded.ts';
import { Sticky } from './Notes.tsx';
import { Squeegee } from '../motion/entranceViews.tsx';
import { drift, ENTER_FRAMES } from '../motion/entrances.ts';
import { FLOOR_Y, H, SEAM_X, W } from '../layout.ts';

/** Notes on the human's wall at any time; later notes replace the oldest in their slot instead of piling up. */
export const WALL_SLOTS = 24;
const FADE_OUT = 8;

// Free wall space of the room plate: right of the window and the strip left of it (shelf excluded). The top band (y < 150)
// stays clear for the lyric line; the desk human and the tally board sit in front of the rest.
const REGIONS = [
  { x0: 618, x1: 832, y0: 160, y1: 880, w: 0.78 },
  { x0: 170, x1: 330, y0: 160, y1: 470, w: 0.22 },
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

// Fixed seeded layout of WALL_SLOTS slots, at least MIN_GAP apart, in a seeded arrival order.
const MIN_GAP = 82;
const slots: WallNote[] = (() => {
  const r = seeded('plate-wall-slots');
  const out: WallNote[] = [];
  for (let tries = 0; out.length < WALL_SLOTS && tries < 4000; tries++) {
    const reg = REGIONS[r() < REGIONS[0]!.w ? 0 : 1] as (typeof REGIONS)[number];
    const x = range(r, reg.x0, reg.x1);
    const y = range(r, reg.y0, reg.y1);
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < MIN_GAP)) continue;
    const kind = r() < 0.45 ? 'sticky' : 'paper';
    out.push({ x, y, rot: range(r, -9, 9), kind, w: kind === 'paper' ? range(r, 62, 84) : 60, h: kind === 'paper' ? range(r, 80, 104) : 60, lines: 3 + Math.floor(r() * 4) });
  }
  return out;
})();

/**
 * The human's wall of code notes on top of the plate. `starts` holds the frame each note arrives on (one per wall
 * event); a note drifts in over `frames` into slot k % WALL_SLOTS and stays until the note WALL_SLOTS later takes
 * the slot over (the old one fades under the new one).
 */
export const WallNotes = ({ frame, starts, frames = ENTER_FRAMES.drift }: { frame: number; starts: readonly number[]; frames?: number }) => (
  <g>
    {starts.map((start, k) => {
      if (frame < start) return null;
      const n = slots[k % slots.length] as WallNote;
      const replacedAt = starts[k + slots.length];
      let fade = 1;
      if (replacedAt !== undefined && frame >= replacedAt) {
        fade = 1 - (frame - replacedAt) / FADE_OUT;
        if (fade <= 0) return null;
      }
      const d = drift(frame, start, frames, { from: { x: -14, y: 22 }, bulge: 8 });
      const t = `translate(${(n.x + d.ox).toFixed(1)} ${(n.y + d.oy).toFixed(1)}) rotate(${n.rot.toFixed(1)}) scale(${d.s.toFixed(4)})`;
      return n.kind === 'paper' ? (
        <g key={k} transform={t} opacity={d.op * fade}>
          <rect x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h} fill={palette.cream} />
          {Array.from({ length: n.lines }, (_, i) => (
            <rect key={i} x={-n.w / 2 + 8} y={-n.h / 2 + 14 + i * 11} width={n.w - 16 - (i % 3) * 9} height={2} fill={palette.navy} />
          ))}
        </g>
      ) : (
        <g key={k} opacity={d.op * fade}>
          <YellowPlate k={`wall-${k % slots.length}`}>
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
