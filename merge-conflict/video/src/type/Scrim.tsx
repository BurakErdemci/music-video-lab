// Scrim: a dark rounded backing behind a form whose own pixels cannot hold 3:1 against the plate (dots, thin
// strokes). The light 3 px edge carries the contrast on a dark plate, the dark fill on a bright one. The soft shadow
// round it (alpha just under the 0.5 the type layer counts as type) darkens a bright streak that runs along the edge.
export const Scrim = ({ x, y, w, h, pad = 24, opacity = 0.74, edge = '#ffffff' }: { x: number; y: number; w: number; h: number; pad?: number; opacity?: number; edge?: string }) => (
  <g>
    <rect x={x - pad - 28} y={y - pad - 28} width={w + 2 * (pad + 28)} height={h + 2 * (pad + 28)} rx={46} fill="#000" fillOpacity={0.49} />
    <rect x={x - pad} y={y - pad} width={w + 2 * pad} height={h + 2 * pad} rx={22} fill="#07040c" fillOpacity={opacity} stroke={edge} strokeOpacity={0.9} strokeWidth={3} />
  </g>
);
