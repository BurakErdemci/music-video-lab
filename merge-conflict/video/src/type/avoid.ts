// Type placed clear of the faces (round 7d, scene-map.md "No knockouts"): a form that would cover a subject's face box
// (down to the chin, film/framing.ts faceFrame) moves or shrinks instead of being cut around the face. Per shot, the
// faces are taken at three moments (12, 50 and 88 % of the shot) from the family's own living state, and the form's
// box is tried at its authored place, then mirrored, in the top or bottom band and at the sides, always at its own
// size (round 7d: a form never shrinks to clear a face; its glyphs keep >= 3.5 % of the frame height, and a shot
// with no room is re-framed instead); the first placement that clears every face (with a pad) at all three moments
// and stays inside the 4 % margin wins, else the one that covers the least. The choice holds for the whole shot, so a form only moves at a cut. Node-safe and deterministic (a
// memo keyed by shot and box).
import { type CameraPose, H, typePlane, W } from '../camera/camera.ts';
import { faceFrame, CARD_FRAMES, screenBox, type ShotState } from '../film/framing.ts';
import type { Span } from '../film/livecam.ts';

export interface Box { x: number; y: number; w: number; h: number }
export interface Live { stateAt: (t: number) => ShotState; spanAt: (t: number) => Span }

const PAD = 28;
const M = { x0: 0.04 * W, y0: 0.04 * H, x1: 0.96 * W, y1: 0.96 * H };
const SAMPLES = [0.12, 0.5, 0.88];
const SCALES = [1];
const memo = new Map<string, string>();

type Rect = [number, number, number, number];
const overlap = (a: Rect, b: Rect): number => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

/** The SVG transform (in the form's own coordinates) that keeps `box` clear of the faces of the shot playing at t.
 *  `plane`: the form is drawn on the type plane (typePlane(pose, state.typeBase, 1)), else in screen space. */
export const avoidFaces = (live: Live, t: number, box: Box, plane: boolean): string => {
  const span = live.spanAt(t);
  const key = `${span.key}|${plane ? 'p' : 's'}|${box.x.toFixed(1)},${box.y.toFixed(1)},${box.w.toFixed(1)},${box.h.toFixed(1)}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const shots = SAMPLES.map((k) => live.stateAt(Math.min(span.t1 - 1 / 60, span.t0 + k * (span.t1 - span.t0))));
  const views = shots.map((st) => {
    const faces = st.subjects.filter((s) => !s.silhouette && CARD_FRAMES[s.card]).map((s) => {
      const b = screenBox(st.pose, s, faceFrame(s.card));
      return [b.x0 - PAD, b.y0 - PAD, b.x1 + PAD, b.y1 + PAD] as Rect;
    });
    const map = plane ? typePlane(st.pose, (st.typeBase ?? st.pose) as CameraPose, 1).map : (x: number, y: number): [number, number] => [x, y];
    return { faces, map };
  });
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let best = { score: Infinity, tf: '' };
  let found: string | null = null;
  outer: for (const s of SCALES) {
    const w = box.w * s;
    const h = box.h * s;
    const xs = [cx, W - cx, M.x0 + 20 + w / 2, M.x1 - 20 - w / 2];
    const ys = [cy, M.y0 + 16 + h / 2, M.y1 - 16 - h / 2];
    for (const ny of ys) {
      for (const nx of xs) {
        let cover = 0;
        let out = 0;
        for (const v of views) {
          const ps = [[nx - w / 2, ny - h / 2], [nx + w / 2, ny - h / 2], [nx - w / 2, ny + h / 2], [nx + w / 2, ny + h / 2]].map(([x, y]) => v.map(x as number, y as number));
          const r: Rect = [Math.min(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1]))];
          for (const f of v.faces) cover += overlap(r, f);
          out += Math.max(0, M.x0 - r[0]) + Math.max(0, r[2] - M.x1) + Math.max(0, M.y0 - r[1]) + Math.max(0, r[3] - M.y1);
        }
        const tf = nx === cx && ny === cy && s === 1 ? '' : `translate(${nx.toFixed(1)} ${ny.toFixed(1)}) scale(${s}) translate(${(-cx).toFixed(1)} ${(-cy).toFixed(1)})`;
        // the authored place keeps its own margin handling: only a face moves it
        if (cover === 0 && (out === 0 || tf === '')) {
          found = tf;
          break outer;
        }
        const score = cover + 50 * out;
        if (score < best.score) best = { score, tf };
      }
    }
  }
  const tf = found ?? best.tf;
  memo.set(key, tf);
  return tf;
};
