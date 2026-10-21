// Scrim: a dark rounded backing behind a form whose own pixels cannot hold 3:1 against the plate (dots, thin
// strokes). tools/typeframe.py counts a form's own colour spread (90th over 10th percentile of its opaque pixels) when
// the plate around it is too mixed for any ring test, so the backing is a dark plate in a wide light frame (a tenth
// or more of its pixels), and a soft shadow whose alpha stays under the 0.5 the type layer counts darkens a bright
// streak that runs along the edge.
export const FRAME = '#e8e0ff';
export const FRAME_ALPHA = 0.6;
export const FRAME_W = 24;

export const Scrim = ({ x, y, w, h, pad = 24, opacity = 0.74, edge = FRAME }: { x: number; y: number; w: number; h: number; pad?: number; opacity?: number; edge?: string }) => (
  <g>
    <rect x={x - pad - 28} y={y - pad - 28} width={w + 2 * (pad + 28)} height={h + 2 * (pad + 28)} rx={46} fill="#000" fillOpacity={0.49} />
    <rect x={x - pad} y={y - pad} width={w + 2 * pad} height={h + 2 * pad} rx={22} fill="#07040c" fillOpacity={opacity} stroke={edge} strokeOpacity={FRAME_ALPHA} strokeWidth={FRAME_W} />
  </g>
);
