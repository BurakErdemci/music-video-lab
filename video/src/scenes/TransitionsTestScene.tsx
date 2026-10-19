import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { palette } from '../style/palette.ts';
import { PaperGrain } from '../style/screenprint.tsx';
import { seeded } from '../style/seeded.ts';
import { InkBleed } from '../transitions/InkBleed.tsx';
import { PaperFold } from '../transitions/PaperFold.tsx';
import { WaterDive } from '../transitions/WaterDive.tsx';
import { camPoint, drawCover, driftCam, getImage, makeNotes, notePose, paintNotes, useImagesReady, type Cam, type Painter } from '../transitions/layers.ts';
import { FPS } from '../timing.ts';
import { TEXT_FONT } from '../style/fonts.ts';
import { H, SEAM_X, W } from '../layout.ts';

export const PL = {
  screen: staticFile('plates/tr/07-ekran-yakin.png'),
  notebook: staticFile('plates/tr/08-defter-krem.png'),
  street: staticFile('plates/tr/09-sokak-vitrin.png'),
  desk: staticFile('plates/tr/15-kagit-sehir-masa.png'),
  roomKey: staticFile('plates/room-key.png'),
  roomMoon: staticFile('plates/room-moon.png'),
};
export const PL_URLS = Object.values(PL);

/** One test segment: `before` frames of the outgoing scene, the transition, `after` frames of the incoming one. */
export interface Segment {
  id: string;
  /** Downbeat the transition lands on (1-based bar). */
  bar: number;
  /** Song frame of that downbeat. */
  land: number;
  /** Transition length, frames. */
  dur: number;
  before: number;
  after: number;
}
export const segStart = (s: Segment): number => s.land - s.dur - s.before;
export const segLength = (s: Segment): number => s.before + s.dur + s.after;
/** Linear progress at a song frame: 0 until the transition starts, exactly 1 on the landing downbeat. */
export const segProgress = (s: Segment, songFrame: number): number => Math.min(1, Math.max(0, (songFrame - (s.land - s.dur)) / s.dur));

// ---------------------------------------------------------------------------------------------------------------
// The split (home base) as a still plate: the human's navy room left of the glass, the AI's cream side right.

const seamPath = (key: string, x: number, amp: number): [number, number][] => {
  const r = seeded(key);
  const pts: [number, number][] = [];
  for (let y = -10; y <= H + 20; y += 26) pts.push([x + (r() - 0.5) * 2 * amp, y]);
  return pts;
};
const SEAM_A = seamPath('seam-a', SEAM_X - 2.5, 1.2);
const SEAM_B = seamPath('seam-b', SEAM_X + 1.5, 1.4);

export const paintSplit = (ctx: CanvasRenderingContext2D, w: number, h: number, cam: Cam): void => {
  ctx.save();
  ctx.translate(w / 2 + cam.x, h / 2 + cam.y);
  ctx.scale(cam.s, cam.s);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = palette.cream;
  ctx.fillRect(SEAM_X, -40, w - SEAM_X + 60, h + 80);
  ctx.drawImage(getImage(PL.roomKey), 0, 0, SEAM_X, H);
  ctx.drawImage(getImage(PL.roomMoon), 0, 0, SEAM_X, H);
  // The AI side's floor line and the glass seam (same seeded strokes as GlassSeam.tsx).
  ctx.fillStyle = palette.navy;
  ctx.fillRect(SEAM_X, 1006, w - SEAM_X + 60, 3);
  const stroke = (pts: [number, number][], color: string, width: number): void => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  stroke(SEAM_A, palette.cream, 3);
  stroke(SEAM_B, palette.navy, 3.5);
  ctx.restore();
};

/** The room alone (no cream side, no seam): the wall right of the window continues, mirrored, across the frame. */
export const paintRoomOnly = (ctx: CanvasRenderingContext2D, w: number, h: number, cam: Cam): void => {
  ctx.save();
  ctx.translate(w / 2 + cam.x, h / 2 + cam.y);
  ctx.scale(cam.s, cam.s);
  ctx.translate(-w / 2, -h / 2);
  const key = getImage(PL.roomKey);
  const sx = key.naturalWidth / SEAM_X;
  const STRIP = 340;
  ctx.drawImage(key, 0, 0, SEAM_X, H);
  ctx.drawImage(getImage(PL.roomMoon), 0, 0, SEAM_X, H);
  // Copies start at G1's seam line, covering the plate's light right-edge border (the line that must not show).
  for (let k = 0; SEAM_X + k * STRIP < w + 80; k++) {
    const x0 = SEAM_X - 9 + k * STRIP;
    ctx.save();
    // Even copies are mirrored, so neighbouring strips always meet on the same source column (no tile edge).
    if (k % 2 === 0) {
      ctx.translate(x0 + STRIP, 0);
      ctx.scale(-1, 1);
    } else ctx.translate(x0, 0);
    // The source strip stops 40 px short of the plate's right edge and its light border line.
    ctx.drawImage(key, (SEAM_X - STRIP - 40) * sx, 0, STRIP * sx, key.naturalHeight, 0, 0, STRIP, H);
    ctx.restore();
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------------------------------------------
// G1: screen close-up ("Merhaba" types itself) -> the screen is water, the camera dives through -> the split.

export const G1_NOTES = makeNotes('g1', 4, { x0: 150, x1: 1500, y0: 620, y1: 1000 }, { vy: -18, vx: 16, size: [44, 70] });
export const G1_SPLIT_NOTES = makeNotes('g1-split', 5, { x0: 120, x1: 820, y0: 200, y1: 900 }, { vy: -8, vx: 12, size: [40, 58] });
/** Cursor and screen of 07-ekran-yakin.png, as a share of the frame (measured on the plate). */
export const CURSOR = { x: 0.541, y: 0.432 };
export const SCREEN = { x0: 0.29, y0: 0.13, x1: 0.83, y1: 0.72 };
export const G1_CAM = (t: number): Cam => driftCam(t, { push: 0.01, sway: 7 });
const WORD = 'Merhaba';

export const paintTyping = (ctx: CanvasRenderingContext2D, w: number, h: number, cam: Cam, t: number): void => {
  const n = Math.max(0, Math.min(WORD.length, Math.floor((t - 0.6) / 0.16) + 1));
  if (n === 0) return;
  ctx.save();
  ctx.translate(w / 2 + cam.x, h / 2 + cam.y);
  ctx.scale(cam.s, cam.s);
  ctx.translate(-w / 2, -h / 2);
  ctx.font = `500 60px "${TEXT_FONT}"`;
  ctx.fillStyle = palette.navy;
  ctx.textBaseline = 'middle';
  // Fixed letter positions ending just left of the plate's cursor, so typing reads left to right into it.
  const full = ctx.measureText(WORD).width;
  ctx.fillText(WORD.slice(0, n), CURSOR.x * w - 18 - full, CURSOR.y * h + 2);
  ctx.restore();
};

export const G1_SEAM = (SEAM_X - 9) / W;

const G1 = ({ seg }: { seg: Segment }) => {
  const local = useCurrentFrame();
  const song = segStart(seg) + local;
  const t = local / FPS;
  const p = segProgress(seg, song);
  const tt = t - (seg.before + seg.dur) / FPS;
  const toCam = driftCam(tt + 3, { push: 0.008, sway: 6, base: 1.02 });
  const from: Painter = (ctx, w, h) => {
    const cam = G1_CAM(t);
    drawCover(ctx, getImage(PL.screen), w, h, cam);
    paintTyping(ctx, w, h, cam, t);
    paintNotes(ctx, G1_NOTES, t, w, h, { s: cam.s, x: cam.x * 1.8, y: cam.y * 1.8 });
  };
  const to: Painter = (ctx, w, h) => {
    paintSplit(ctx, w, h, toCam);
    paintNotes(ctx, G1_SPLIT_NOTES, tt + 3, w, h, toCam);
  };
  const aux: Painter = (ctx, w, h) => {
    paintRoomOnly(ctx, w, h, toCam);
    paintNotes(ctx, G1_SPLIT_NOTES, tt + 3, w, h, toCam);
  };
  // The drop falls on the cursor and the surface is the screen, both followed through the drift.
  const cam0 = G1_CAM(seg.before / FPS);
  const c = camPoint(cam0, W, H, CURSOR.x * W, CURSOR.y * H);
  const a = camPoint(cam0, W, H, SCREEN.x0 * W, SCREEN.y0 * H);
  const b = camPoint(cam0, W, H, SCREEN.x1 * W, SCREEN.y1 * H);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.navy }}>
      <WaterDive progress={p} seconds={seg.dur / FPS} time={t} from={from} to={to} aux={aux} center={[c.x / W, c.y / H]} surface={[a.x / W, a.y / H, b.x / W, b.y / H]} seam={G1_SEAM} />
      <PaperGrain frame={local} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// G2: the AI reading in full cream -> ink lifts off the page and bleeds -> its edge settles on the glass seam.

const G2_NOTES = makeNotes('g2', 5, { x0: 200, x1: 1700, y0: 80, y1: 500 }, { vy: 22, vx: -9, size: [34, 52] });

const G2 = ({ seg }: { seg: Segment }) => {
  const local = useCurrentFrame();
  const song = segStart(seg) + local;
  const t = local / FPS;
  const p = segProgress(seg, song);
  const fromCam = (tt: number): Cam => driftCam(tt, { push: 0.012, sway: 6 });
  const from: Painter = (ctx, w, h) => {
    const cam = fromCam(t);
    drawCover(ctx, getImage(PL.notebook), w, h, cam);
    paintNotes(ctx, G2_NOTES, t, w, h, cam);
  };
  const to: Painter = (ctx, w, h) => {
    const tt = t - (seg.before + seg.dur) / FPS;
    const cam = driftCam(tt + 5, { push: 0.008, sway: 6, base: 1.02 });
    paintSplit(ctx, w, h, cam);
    paintNotes(ctx, G1_SPLIT_NOTES, tt + 5, w, h, cam);
  };
  // The open page under the AI's hands, followed through the drift.
  const o = camPoint(fromCam(seg.before / FPS + seg.dur / FPS / 2), W, H, 0.5 * W, 0.745 * H);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.cream }}>
      <InkBleed progress={p} seconds={seg.dur / FPS} time={t} from={from} to={to} origin={[o.x / W, o.y / H]} seam={0.5} />
      <PaperGrain frame={local} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// G5: the day street -> its buildings fold like paper and land as the paper city on his desk.

/** Roof line of 09-sokak-vitrin.png as (u, v) pairs, measured from the plate (first dark run per column). */
// prettier-ignore
const SKYLINE: readonly number[] = [0.0, 0.0128, 0.0072, 0.0, 0.0144, 0.0, 0.0215, 0.0096, 0.0287, 0.0106, 0.0359, 0.0, 0.0431, 0.0, 0.0503, 0.0, 0.0575, 0.0, 0.0646, 0.0, 0.0718, 0.0308, 0.079, 0.0967, 0.0862, 0.0351, 0.0934, 0.0064, 0.1005, 0.0, 0.1077, 0.0, 0.1149, 0.0, 0.1221, 0.0011, 0.1293, 0.0553, 0.1364, 0.0563, 0.1436, 0.0574, 0.1508, 0.0, 0.158, 0.0, 0.1652, 0.0, 0.1724, 0.0, 0.1795, 0.0829, 0.1867, 0.084, 0.1939, 0.084, 0.2011, 0.0, 0.2083, 0.1158, 0.2154, 0.1169, 0.2226, 0.1169, 0.2298, 0.1063, 0.237, 0.0946, 0.2442, 0.0967, 0.2513, 0.0988, 0.2585, 0.0638, 0.2657, 0.0361, 0.2729, 0.0351, 0.2801, 0.0595, 0.2873, 0.1073, 0.2944, 0.1084, 0.3016, 0.1541, 0.3088, 0.1552, 0.316, 0.1562, 0.3232, 0.1573, 0.3303, 0.1583, 0.3375, 0.1594, 0.3447, 0.1605, 0.3519, 0.1615, 0.3591, 0.1637, 0.3662, 0.1647, 0.3734, 0.1552, 0.3806, 0.1488, 0.3878, 0.1413, 0.395, 0.1339, 0.4022, 0.1265, 0.4093, 0.1275, 0.4165, 0.1296, 0.4237, 0.1307, 0.4309, 0.1318, 0.4381, 0.1063, 0.4452, 0.0808, 0.4524, 0.0808, 0.4596, 0.0829, 0.4668, 0.1137, 0.474, 0.1371, 0.4811, 0.1382, 0.4883, 0.1392, 0.4955, 0.1403, 0.5027, 0.1318, 0.5099, 0.1275, 0.5171, 0.1541, 0.5242, 0.1456, 0.5314, 0.1934, 0.5386, 0.1541, 0.5458, 0.2072, 0.553, 0.1977, 0.5601, 0.1998, 0.5673, 0.1923, 0.5745, 0.1923, 0.5817, 0.2083, 0.5889, 0.2062, 0.5961, 0.2125, 0.6032, 0.2083, 0.6104, 0.2094, 0.6176, 0.2115, 0.6248, 0.2125, 0.632, 0.2136, 0.6391, 0.2157, 0.6463, 0.2168, 0.6535, 0.2179, 0.6607, 0.22, 0.6679, 0.221, 0.675, 0.2232, 0.6822, 0.2242, 0.6894, 0.2125, 0.6966, 0.2094, 0.7038, 0.1849, 0.711, 0.1732, 0.7181, 0.1647, 0.7253, 0.1573, 0.7325, 0.17, 0.7397, 0.1169, 0.7469, 0.1137, 0.754, 0.0829, 0.7612, 0.1063, 0.7684, 0.0701, 0.7756, 0.1052, 0.7828, 0.0542, 0.7899, 0.0797, 0.7971, 0.1052, 0.8043, 0.1254, 0.8115, 0.1158, 0.8187, 0.1169, 0.8259, 0.0351, 0.833, 0.0202, 0.8402, 0.0255, 0.8474, 0.0521, 0.8546, 0.0, 0.8618, 0.0043, 0.8689, 0.0213, 0.8761, 0.0191, 0.8833, 0.0032, 0.8905, 0.0, 0.8977, 0.0, 0.9048, 0.0, 0.912, 0.0128, 0.9192, 0.0, 0.9264, 0.0064, 0.9336, 0.0, 0.9408, 0.0, 0.9479, 0.0, 0.9551, 0.0, 0.9623, 0.0096, 0.9695, 0.0, 0.9767, 0.0, 0.9838, 0.0202, 0.991, 0.0053, 0.9982, 0.0021, 1.0, 0.0064];

/** The street's sun (measured on the plate): kept on the paper as a cut-out disc joined to the roofs. */
const SUN = { u: 0.64, v: 0.1, ru: 0.056, rv: 0.1 };
const OUTLINE: readonly [number, number][] = (() => {
  const pairs: [number, number][] = [];
  for (let i = 0; i < SKYLINE.length; i += 2) pairs.push([SKYLINE[i] as number, SKYLINE[i + 1] as number]);
  const roofAt = (u: number): number => pairs.reduce((best, p) => (Math.abs(p[0] - u) < Math.abs(best[0] - u) ? p : best))[1];
  const out = pairs.filter(([u]) => Math.abs(u - SUN.u) >= SUN.ru);
  for (let k = 0; k <= 24; k++) {
    const u = SUN.u - SUN.ru + (2 * SUN.ru * k) / 24;
    const d = (u - SUN.u) / SUN.ru;
    out.push([u, Math.min(roofAt(u), SUN.v - SUN.rv * Math.sqrt(Math.max(0, 1 - d * d)))]);
  }
  return out.sort((p, q) => p[0] - q[0]);
})();

export const streetCam = (t: number): Cam => ({ s: 1.035 + 0.006 * t, x: -10 * t, y: 3 * Math.sin(t * 0.5) });

/** The paper's outline (roofs + sun) in frame px under the street camera. */
export const skylineCut = (cam: Cam): [number, number][] =>
  OUTLINE.map(([u, v]) => {
    const c = camPoint(cam, W, H, u * W, v * H);
    return [c.x, c.y];
  });

export const G5_LEAVES = makeNotes('g5', 6, { x0: 100, x1: 1800, y0: 150, y1: 650 }, { vy: 30, vx: -14, size: [18, 30] });

export const paintStreet = (t: number, cam: Cam): Painter => (ctx, w, h) => {
  drawCover(ctx, getImage(PL.street), w, h, cam);
  for (const n of G5_LEAVES) {
    const p = notePose(n, t);
    const c = camPoint(cam, w, h, p.x, p.y);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    const r = n.size / 2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r, 0, 0, r);
    ctx.quadraticCurveTo(-r, 0, 0, -r);
    ctx.fillStyle = palette.moonYellow;
    ctx.fill();
    ctx.strokeStyle = palette.navy;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
};

/** His desk with the paper city (stil/tur4/15-kagit-sehir-masa.png); the empty middle is where the street lands. */
export const paintDesk: Painter = (ctx, w, h) => drawCover(ctx, getImage(PL.desk), w, h);

export const G5_LANDING = { scale: 0.46, x: 960, y: 950, fold: 58, tilt: 18 } as const;

const G5 = ({ seg }: { seg: Segment }) => {
  const local = useCurrentFrame();
  const song = segStart(seg) + local;
  const t = local / FPS;
  const p = segProgress(seg, song);
  const cam = streetCam(t);
  // One slow camera over the whole segment, so the landing is not the moment the picture stops.
  const zoom = { s: 1 + 0.01 * t, x: W / 2, y: H * 0.8 };
  return (
    <AbsoluteFill style={{ backgroundColor: palette.cream }}>
      <PaperFold progress={p} from={paintStreet(t, cam)} to={paintDesk} landing={G5_LANDING} panels={6} cutout={skylineCut(cam)} zoom={zoom} />
      <PaperGrain frame={local} />
    </AbsoluteFill>
  );
};

export const TransitionSegment =({ seg }: { seg: Segment }) => {
  if (!useImagesReady(PL_URLS)) return null;
  if (seg.id === 'G1') return <G1 seg={seg} />;
  if (seg.id === 'G2') return <G2 seg={seg} />;
  if (seg.id === 'G5') return <G5 seg={seg} />;
  throw new Error(`unknown segment ${seg.id}`);
};
