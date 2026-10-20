import React, { useId } from 'react';
import { C } from '../../../ui/theme.tsx';

const LIGHT_BLUE = '#93C5FD';

/** A clip-path id that is safe inside url(#...) (useId yields colons). */
const useUid = (): string => `p${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

/**
 * Eraser: a chunky block, white body, grey lower third, UI-blue paper sleeve band.
 * ORIGIN = centre, long axis horizontal; the left end is the worn corner that gets dragged.
 */
export const EraserArt: React.FC<{ size: number }> = ({ size }) => {
  const id = useUid();
  const L = size;
  const t = L * 0.46;
  const lw = L * 0.014;
  const x0 = -L / 2;
  const x1 = L / 2;
  const y0 = -t / 2;
  const y1 = t / 2;
  const rl = t * 0.32; // worn left corners
  const rr = t * 0.12;
  const body =
    `M${x0 + rl} ${y0} H${x1 - rr} Q${x1} ${y0} ${x1} ${y0 + rr} V${y1 - rr} Q${x1} ${y1} ${x1 - rr} ${y1}` +
    ` H${x0 + rl} Q${x0} ${y1} ${x0} ${y1 - rl} V${y0 + rl} Q${x0} ${y0} ${x0 + rl} ${y0} Z`;
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <clipPath id={id}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={C.white} />
      <g clipPath={`url(#${id})`}>
        <rect x={x0} y={y1 - t / 3} width={L} height={t / 3} fill={C.mid} />
        <line x1={x0} x2={x1} y1={y1 - t / 3} y2={y1 - t / 3} stroke={C.dark} strokeWidth={lw} />
        <rect x={-L * 0.1} y={y0 - lw} width={L * 0.3} height={t + 2 * lw} fill={C.blue} />
        <line x1={-L * 0.1} x2={-L * 0.1} y1={y0} y2={y1} stroke={C.blueDark} strokeWidth={lw} />
        <line x1={L * 0.2} x2={L * 0.2} y1={y0} y2={y1} stroke={C.blueDark} strokeWidth={lw} />
        {/* worn corner: a short scuff arc on the dragged end */}
        <path d={`M${x0 + L * 0.045} ${y0 + t * 0.14} Q${x0 + L * 0.02} ${y0 + t * 0.3} ${x0 + L * 0.03} ${y0 + t * 0.5}`} fill="none" stroke={C.dark} strokeWidth={lw} />
      </g>
      <path d={body} fill="none" stroke={C.dark} strokeWidth={lw} />
    </g>
  );
};

/**
 * Sticky-note pad: a small stack, the top note's bottom-right corner peels off.
 * size = width of one square note; peel 0..1. ORIGIN = centre of the pad. No text.
 */
export const PadArt: React.FC<{ size: number; peel: number }> = ({ size, peel }) => {
  const w = size;
  const h = w / 2;
  const lw = w * 0.014;
  const p = Math.min(1, Math.max(0, peel));
  const sq = (dx: number): React.ReactNode => <rect x={-h + dx} y={-h + dx} width={w} height={w} rx={w * 0.03} fill={C.note} stroke={C.dark} strokeWidth={lw} />;

  // Fold line cuts the bottom-right corner: it runs from A on the right edge to B on the bottom edge.
  const f = p * w * 0.62;
  const A: [number, number] = [h, h - f];
  const B: [number, number] = [h - f, h];
  // Corner reflected across the fold, pushed a little out of the page so it reads as lifted.
  const R: [number, number] = [h - f - f * 0.12, h - f - f * 0.12];
  const r = w * 0.03;
  const top =
    p === 0
      ? `M${-h + r} ${-h} H${h - r} Q${h} ${-h} ${h} ${-h + r} V${h - r} Q${h} ${h} ${h - r} ${h} H${-h + r} Q${-h} ${h} ${-h} ${h - r} V${-h + r} Q${-h} ${-h} ${-h + r} ${-h} Z`
      : `M${-h + r} ${-h} H${h - r} Q${h} ${-h} ${h} ${-h + r} L${A[0]} ${A[1]} L${B[0]} ${B[1]} H${-h + r} Q${-h} ${h} ${-h} ${h - r} V${-h + r} Q${-h} ${-h} ${-h + r} ${-h} Z`;
  const stripH = w * 0.1;
  const id = useUid();
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {sq(w * 0.05)}
      {sq(w * 0.025)}
      <clipPath id={id}>
        <path d={top} />
      </clipPath>
      <path d={top} fill={C.note} />
      <rect x={-h} y={-h} width={w} height={stripH} fill={C.mid} clipPath={`url(#${id})`} />
      <line x1={-h} x2={h} y1={-h + stripH} y2={-h + stripH} stroke={C.dark} strokeWidth={lw} clipPath={`url(#${id})`} />
      <path d={top} fill="none" stroke={C.dark} strokeWidth={lw} />
      {p > 0 && <path d={`M${A[0]} ${A[1]} L${R[0]} ${R[1]} L${B[0]} ${B[1]} Z`} fill="#F1F3F5" stroke={C.dark} strokeWidth={lw} />}
    </g>
  );
};

/**
 * Presenter remote: grey rounded body, one big blue button. size = length; ORIGIN = centre; points +x.
 */
export const ClickerArt: React.FC<{ size: number; pressed: boolean }> = ({ size, pressed }) => {
  const L = size;
  const hh = L * 0.3;
  const lw = L * 0.014;
  const bx = -L * 0.1;
  const br = L * 0.1 * (pressed ? 0.8 : 1);
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <rect x={-L / 2} y={-hh / 2} width={L} height={hh} rx={hh * 0.42} fill={C.mid} stroke={C.slate} strokeWidth={lw} />
      <rect x={L * 0.3} y={-hh * 0.16} width={L * 0.13} height={hh * 0.32} rx={hh * 0.08} fill={C.ink} />
      <line x1={-L * 0.44} x2={-L * 0.3} y1={0} y2={0} stroke={C.slate} strokeWidth={lw} />
      <circle cx={bx} cy={0} r={L * 0.1 + lw} fill={C.dark} />
      {pressed ? (
        <ellipse cx={bx} cy={L * 0.008} rx={br} ry={br * 0.86} fill={LIGHT_BLUE} stroke={C.blueDark} strokeWidth={lw} />
      ) : (
        <circle cx={bx} cy={0} r={br} fill={C.blue} stroke={C.blueDark} strokeWidth={lw} />
      )}
      {pressed && (
        <g stroke={C.blueDark} strokeWidth={lw * 1.4}>
          <line x1={bx - L * 0.07} y1={-hh * 0.62} x2={bx - L * 0.11} y2={-hh * 0.86} />
          <line x1={bx + L * 0.07} y1={-hh * 0.62} x2={bx + L * 0.11} y2={-hh * 0.86} />
        </g>
      )}
    </g>
  );
};

/** Mug: white body, UI-blue band, grey handle. size = height; ORIGIN = centre of the bottom edge. */
export const MugArt: React.FC<{ size: number }> = ({ size }) => {
  const H = size;
  const w = H * 0.78;
  const lw = H * 0.014;
  const hx = w / 2;
  const handle = `M${hx - lw} ${-H * 0.78} H${hx + H * 0.14} Q${hx + H * 0.3} ${-H * 0.78} ${hx + H * 0.3} ${-H * 0.58} V${-H * 0.38} Q${hx + H * 0.3} ${-H * 0.16} ${hx + H * 0.14} ${-H * 0.16} H${hx - lw}`;
  const bodyR = H * 0.1;
  const body = `M${-hx} ${-H} H${hx} V${-bodyR} Q${hx} 0 ${hx - bodyR} 0 H${-hx + bodyR} Q${-hx} 0 ${-hx} ${-bodyR} Z`;
  const id = useUid();
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d={handle} fill="none" stroke={C.dark} strokeWidth={H * 0.1 + 2 * lw} />
      <path d={handle} fill="none" stroke={C.mid} strokeWidth={H * 0.1} />
      <clipPath id={id}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={C.white} />
      <rect x={-hx} y={-H * 0.64} width={w} height={H * 0.22} fill={C.blue} clipPath={`url(#${id})`} />
      <line x1={-hx} x2={hx} y1={-H * 0.64} y2={-H * 0.64} stroke={C.blueDark} strokeWidth={lw} clipPath={`url(#${id})`} />
      <line x1={-hx} x2={hx} y1={-H * 0.42} y2={-H * 0.42} stroke={C.blueDark} strokeWidth={lw} clipPath={`url(#${id})`} />
      <path d={body} fill="none" stroke={C.dark} strokeWidth={lw} />
      <ellipse cx={0} cy={-H} rx={hx} ry={H * 0.045} fill={C.bg} stroke={C.dark} strokeWidth={lw} />
    </g>
  );
};
