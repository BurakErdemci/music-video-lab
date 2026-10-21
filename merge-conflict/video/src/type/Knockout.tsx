// Knockout: type drawn in screen space never covers a subject's face. The words are cut away in a padded rounded
// rectangle around each projected face box, so the face reads through a big word (the groove's THEIRS is masked
// behind her outline the same way). The boxes come from the shot's own state (film/framing.ts screenBox).
import type { ReactNode } from 'react';
import { CARD_FRAMES, type ScreenBox, screenBox, type ShotState } from '../film/framing.ts';

/** The projected face boxes of a shot's subjects (silhouettes have no face). */
export const faceBoxes = (st: ShotState | null): ScreenBox[] =>
  st ? st.subjects.filter((s) => !s.silhouette && CARD_FRAMES[s.card]).map((s) => screenBox(st.pose, s, (CARD_FRAMES[s.card] as { face: number[] }).face)) : [];

export const Knockout = ({ id, faces, pad = 10, children }: { id: string; faces: readonly ScreenBox[]; pad?: number; children: ReactNode }) => {
  if (!faces.length) return <g>{children}</g>;
  return (
    <g mask={`url(#${id})`}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-600} y={-600} width={3120} height={2280}>
          <rect x={-600} y={-600} width={3120} height={2280} fill="#fff" />
          {faces.map((f, i) => (
            <rect key={i} x={f.x0 - pad} y={f.y0 - pad} width={f.x1 - f.x0 + 2 * pad} height={f.y1 - f.y0 + 2 * pad} rx={pad + 6} fill="#000" />
          ))}
        </mask>
      </defs>
      {children}
    </g>
  );
};
