// Knockout: type drawn in screen space never covers a subject's face. The words are cut away in a padded rounded
// rectangle around each projected face box, so the face reads through a big word (the groove's THEIRS is masked
// behind her outline the same way). The boxes come from the shot's own state (film/framing.ts screenBox).
import type { ReactNode } from 'react';
import { typePlane } from '../camera/camera.ts';
import { CARD_FRAMES, type ScreenBox, screenBox, type ShotState } from '../film/framing.ts';

/** The projected face boxes of a shot's subjects (silhouettes have no face). */
export const faceBoxes = (st: ShotState | null): ScreenBox[] =>
  st ? st.subjects.filter((s) => !s.silhouette && CARD_FRAMES[s.card]).map((s) => screenBox(st.pose, s, (CARD_FRAMES[s.card] as { face: number[] }).face)) : [];

/** The same face boxes on the type plane (for forms drawn inside the plane's transform): the shot's plate carries the
 *  pose the plane was authored for, so the screen boxes map back through its inverse. Empty when the shot has no plate. */
const planeInverse = (st: ShotState | null): ((x: number, y: number) => [number, number]) | null => {
  if (!st?.plate) return null;
  const m = typePlane(st.pose, st.plate.base, 1).map;
  const [ox, oy] = m(0, 0);
  const [ax, ay] = m(1, 0);
  const [bx, by] = m(0, 1);
  const a = ax - ox, b = ay - oy, c = bx - ox, d = by - oy;
  const det = a * d - b * c;
  return (x, y) => [(d * (x - ox) - c * (y - oy)) / det, (-b * (x - ox) + a * (y - oy)) / det];
};

/** The 4 % margin box as a path in the type plane's own coordinates (empty when the shot has no plate). */
export const planeMarginPath = (st: ShotState | null): string | undefined => {
  const inv = planeInverse(st);
  if (!inv) return undefined;
  return `M ${[inv(MARGIN.x0, MARGIN.y0), inv(MARGIN.x1, MARGIN.y0), inv(MARGIN.x1, MARGIN.y1), inv(MARGIN.x0, MARGIN.y1)].map((p) => `${p[0]} ${p[1]}`).join(' L ')} Z`;
};
// one pixel inside the 4 % margin (77 / 43 px), so a word cut at the line does not graze it
export const MARGIN = { x0: 78, y0: 44, x1: 1842, y1: 1036 };
export const screenMarginPath = `M ${MARGIN.x0} ${MARGIN.y0} L ${MARGIN.x1} ${MARGIN.y0} L ${MARGIN.x1} ${MARGIN.y1} L ${MARGIN.x0} ${MARGIN.y1} Z`;

export const planeFaceBoxes = (st: ShotState | null): ScreenBox[] => {
  const inv = planeInverse(st);
  if (!inv) return [];
  return faceBoxes(st).map((f) => {
    const ps = [inv(f.x0, f.y0), inv(f.x1, f.y0), inv(f.x0, f.y1), inv(f.x1, f.y1)];
    return { x0: Math.min(...ps.map((p) => p[0])), x1: Math.max(...ps.map((p) => p[0])), y0: Math.min(...ps.map((p) => p[1])), y1: Math.max(...ps.map((p) => p[1])) };
  });
};

export const Knockout = ({ id, faces, pad = 10, clip, children }: { id: string; faces: readonly ScreenBox[]; pad?: number; clip?: string; children: ReactNode }) => {
  if (clip) {
    return (
      <g clipPath={`url(#${id}-clip)`}>
        <defs>
          <clipPath id={`${id}-clip`}><path d={clip} /></clipPath>
        </defs>
        <Knockout id={id} faces={faces} pad={pad}>{children}</Knockout>
      </g>
    );
  }
  if (!faces.length) return <g>{children}</g>;
  return (
    <g mask={`url(#${id})`}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-3000} y={-3000} width={8000} height={7000}>
          <rect x={-3000} y={-3000} width={8000} height={7000} fill="#fff" />
          {faces.map((f, i) => (
            <rect key={i} x={f.x0 - pad} y={f.y0 - pad} width={f.x1 - f.x0 + 2 * pad} height={f.y1 - f.y0 + 2 * pad} rx={pad + 6} fill="#000" />
          ))}
        </mask>
      </defs>
      {children}
    </g>
  );
};
