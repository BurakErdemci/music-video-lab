// The home split of parts 1-2 (his navy room left of the glass seam, her cream right), rebuilt from Part 1's exported
// set pieces so every part-4 scene at the glass (the panting at 5122, scenes 14-15, the shatter's source picture)
// shows the same room, the same seam and the same moon. Part 1 is only read, never changed.
import * as P1 from '../part1/shots.ts';
import { paintSplitMoon } from '../part2/paintProps.ts';
import { paintMugTower, paintTally, MUG_CANVAS, TALLY_CANVAS } from '../part2/paintDays.ts';
import { seeded } from '../../style/seeded.ts';
import { palette } from '../../style/palette.ts';
import { canvasLayer, clamp01, placeAt, type Cam, type Layer, type Rect } from './common.ts';

export const SEAM = P1.SEAM; // 960
export const FLOOR = P1.FLOOR; // 1008
export const D_GLASS = P1.D_GLASS; // 0
export const D_SKYROOM = P1.D_SKYROOM; // 260
/** The framing every glass scene of part 4 starts from (Part 2's chorus framing). */
export const SPLIT_CAM: Cam = { x: 950, y: 560, z: 1010 };

// ---- the moon at the seam: two halves that can be out of line (dy, px) and step through phases; `whole` merges them

export const MOON_C: [number, number] = [SEAM, 190];
export const MOON_R = 80;
export interface MoonOpts {
  /** 0..1 lit phase (part 2's paintSplitMoon). */
  phase: number;
  /** Vertical offset between the halves in world px (left half up by misalign/2, right half down). 0 = aligned. */
  misalign: number;
  /** 0..1: the seam line through the moon fades and the disc is one whole moon (the coda). */
  whole?: number;
}
export const paintMoonHalves = (ctx: CanvasRenderingContext2D, cw: number, ch: number, o: MoonOpts): void => {
  // canvas px per world px (the layer maps the canvas onto MOON_R / 0.4 world px)
  const dy = (o.misalign / 2) * (cw / (MOON_R / 0.4));
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.beginPath();
    if (side < 0) ctx.rect(0, 0, cw / 2, ch);
    else ctx.rect(cw / 2, 0, cw / 2, ch);
    ctx.clip();
    ctx.translate(0, side * dy * (1 - (o.whole ?? 0)));
    paintSplitMoon(ctx as CanvasRenderingContext2D, cw, ch, o.phase);
    ctx.restore();
  }
  const w = clamp01(o.whole ?? 0);
  if (w > 0) {
    // one whole disc: yellow over both halves, the seam outline gone
    ctx.save();
    ctx.globalAlpha = w;
    ctx.fillStyle = palette.moonYellow;
    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, cw * 0.4 + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = w;
    paintSplitMoon(ctx, cw, ch, 1);
    ctx.restore();
  }
};
export const moonHalvesLayer = (o: MoonOpts, size = 1): Layer => {
  const s = (MOON_R / 0.4) * size;
  return canvasLayer('split-moon', 'p4:split-moon', 420, 420, D_GLASS, { x: MOON_C[0] - s / 2, y: MOON_C[1] - s / 2, w: s, h: s }, (ctx, cw, ch) => paintMoonHalves(ctx, cw, ch, o));
};

// ---- his wall: pinned notes (grid), the tally wall, mugs on the floor by the glass

const HIS_NOTES: readonly [number, number][] = (() => {
  const r = seeded('p4:his-notes');
  const out: [number, number][] = [];
  for (let i = 0; i < 24; i++) out.push([210 + (i % 6) * 82 + (r() - 0.5) * 22, 150 + Math.floor(i / 6) * 86 + (r() - 0.5) * 18]);
  return out;
})();
const NOTES_BOX: Rect = { x: 150, y: 80, w: 560, h: 420 };
/** `count` notes pinned in a loose grid on his wall; `born(i)` the frame note i was pinned (a small bounce), or -1e9. */
export const hisNotesLayer = (f: number, count: number, born: (i: number) => number = () => -1e9): Layer => {
  const box = placeAt(NOTES_BOX, D_SKYROOM);
  return canvasLayer('his-notes', 'p4:his-notes', NOTES_BOX.w, NOTES_BOX.h, D_SKYROOM, box, (ctx) => {
    for (let i = 0; i < Math.min(count, HIS_NOTES.length); i++) {
      const k = f - born(i);
      if (k < 0) continue;
      const pop = k < 8 ? 1 + 0.25 * Math.sin((Math.PI * k) / 8) * (1 - k / 8) : 1;
      const [x, y] = HIS_NOTES[i] as [number, number];
      ctx.save();
      ctx.translate(x - NOTES_BOX.x, y - NOTES_BOX.y);
      ctx.scale(pop, pop);
      P1.paintNote(ctx, 0, 0, (seeded(`p4:hn:${i}`)() - 0.5) * 24, 0, `p4:hn:${i}`);
      ctx.restore();
    }
  });
};

/** The tally wall on his side, low on the wall left of him (screen box at SPLIT_CAM), `count` strokes (part 2's painter). */
export const TALLY_BOX: Rect = { x: 40, y: 560, w: 520, h: 325 };
export const tallyLayer = (count: number, seed = 'p4:tally'): Layer =>
  canvasLayer('tally', `p4:tally:${seed}`, TALLY_CANVAS.w, TALLY_CANVAS.h, D_SKYROOM, placeAt(TALLY_BOX, D_SKYROOM, SPLIT_CAM), (ctx, cw, ch) => paintTally(ctx, cw, ch, count, seed));
/** The single mark she keeps (the loop breaks): one tally stroke on HER cream wall, right of the seam. */
export const HER_MARK_BOX: Rect = { x: 1420, y: 600, w: 160, h: 100 };

/** Mugs stacked on his floor against the glass (part 2's tower painter). */
export const MUGS_BOX: Rect = { x: 560, y: FLOOR - 300, w: 200, h: 300 };
export const mugsLayer = (count: number): Layer =>
  canvasLayer('mugs', `p4:mugs`, MUG_CANVAS.w, MUG_CANVAS.h, D_GLASS + 1, MUGS_BOX, (ctx, cw, ch) => paintMugTower(ctx, cw, ch, count, 'p4:mugs'));

// ---- the whole set

export interface SplitOpts {
  /** Notes pinned on his wall. */
  notes?: number;
  notesBorn?: (i: number) => number;
  /** Tally strokes on his wall (0 = no tally layer). */
  tally?: number;
  mugs?: number;
  moon: MoonOpts;
  /** Part 1's floating notes in front. */
  floatNotes?: boolean;
}
/** Back plates of the split (room, wall, cream, seam, moon). Characters, cracks and icons are added by the scenes. */
export const splitBack = (f: number, o: SplitOpts): Layer[] => {
  const layers: Layer[] = [
    { id: 'sroom', src: { kind: 'image', url: P1.ROOM_SPLIT.key }, d: D_SKYROOM, ...P1.SROOM_W },
    { id: 'smoon', src: { kind: 'image', url: P1.ROOM_SPLIT.moon }, d: D_SKYROOM, ...P1.SROOM_W },
  ];
  if (o.notes) layers.push(hisNotesLayer(f, o.notes, o.notesBorn));
  if (o.tally) layers.push(tallyLayer(o.tally));
  layers.push(...P1.creamLayers(), moonHalvesLayer(o.moon));
  if (o.mugs) layers.push(mugsLayer(o.mugs));
  return layers;
};
export const floatNotes = (f: number): Layer => P1.floatNotesLayer(f / 30);

// Part 1's characters at the glass (re-exported so the scenes need one import).
export const humanAt = P1.humanAt;
export const humanLayer = P1.humanLayer;
export const humanRectOf = P1.humanRectOf;
export const aiAt = P1.aiAt;
export const aiLayersP1 = P1.aiLayers;
export const AI_STAND = P1.AI_STAND;
export const P1_IMAGE_URLS = P1.IMAGE_URLS;
export const setP1ImageLookup = P1.setImageLookup;

/** Both palms on the same spot of the glass (Part 1's handshake drawings and places): the hand-over between
 * glassA (5455) and glassB (5456), and the "same spot" / "bir daha" poses of scene 14. */
export const pressLayers = (f: number, blinks: readonly number[] = []): Layer[] => [
  P1.humanLayer(f, 'h-hand'),
  ...P1.aiLayers('a-hand', P1.aiAt('a-hand', SEAM + 3, 'left'), f, { blinks }),
];

// ---- the picture glass: the film's own glass in front of the split, carrying the cracks

/** Depth of the picture glass (in front of the glass seam plane). */
export const D_PIC = -300;
/** World rect on D_PIC that SPLIT_CAM sees as the whole 1920 x 1080 frame: the run cracks (screen px) map onto it 1:1. */
export const PIC_RECT: Rect = placeAt({ x: 0, y: 0, w: 1920, h: 1080 }, D_PIC, SPLIT_CAM);
/** Margin (screen px of the run frame) painted around the frame so a pushed or trembling camera never sees an edge. */
const PIC_PAD = 600;
/**
 * The picture glass layer: `paint(ctx, s)` draws in run-screen px (0..1920 x 0..1080, already offset by the pad and
 * scaled by `s` canvas px per screen px) — e.g. `(ctx) => paintCracks(ctx, f)`. `shake` offsets the glass in world px
 * (the trembling). The layer is transparent apart from what `paint` draws.
 */
export const picGlassLayer = (key: string, paint: (ctx: CanvasRenderingContext2D) => void, shake: [number, number] = [0, 0], res = 1): Layer => {
  const k = PIC_RECT.w / 1920; // world px per screen px
  const cw = Math.round((1920 + 2 * PIC_PAD) * res);
  const ch = Math.round((1080 + 2 * PIC_PAD) * res);
  return canvasLayer(
    'pic-glass',
    `p4:pic:${key}`,
    cw,
    ch,
    D_PIC,
    { x: PIC_RECT.x - PIC_PAD * k + shake[0], y: PIC_RECT.y - PIC_PAD * k + shake[1], w: (1920 + 2 * PIC_PAD) * k, h: (1080 + 2 * PIC_PAD) * k },
    (ctx) => {
      ctx.save();
      ctx.scale(res, res);
      ctx.translate(PIC_PAD, PIC_PAD);
      paint(ctx);
      ctx.restore();
    },
  );
};
