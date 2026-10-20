// The painted HUD: Vorathul's health bar (ten cells, three phase pips) and the comic caption boxes, drawn in code (C09, C10).
// SVG in window px (1920 x 1080). The bar sits at the top of the painting so the cells that are deleted can fall down the picture.
import { InkFilter, inkFilterId, INK, IVORY, GOLD } from '../../../vfx/effects.ts';
import { MissingTextureFill } from '../../../ui/kit.ts';
import { ANTON_FONT } from '../../../ui/theme.tsx';
import { staticFile } from 'remotion';
import { finalSize } from './finals.tsx';

const MAGENTA = '#E0129A';
export const BAR = { x: 110, y: 66, w: 900, h: 52 } as const;
export const CELLS = 10;

export interface HudState {
  /** Fill as a fraction of the full bar length (0-1). */
  fill: number;
  /** Where the bar's right end cap sits as a fraction of the full length (1 = full length; 0.6 after the cut). */
  cap: number;
  pips: readonly [boolean, boolean, boolean];
  /** Pip III has become a missing-texture square. */
  pip3Deleted: boolean;
  /** The stretch beyond the cap is drawn as a magenta ghost (the cells about to be deleted). */
  ghost?: boolean;
}

const ROMAN = ['I', 'II', 'III'] as const;
const INKF = 41;

export const Hud = ({ state }: { state: HudState }) => {
  const endX = BAR.x + BAR.w * state.cap;
  const fillW = Math.min(BAR.w * state.cap, BAR.w * state.fill);
  const cellW = BAR.w / CELLS;
  const finalFrame = !!(finalSize('G25-1') && finalSize('G25-2') && finalSize('G25-3'));
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <InkFilter seed={INKF} rough={3} />
      </defs>
      <g filter={`url(#${inkFilterId(INKF, 3)})`}>
        {finalFrame ? null : <rect x={BAR.x - 14} y={BAR.y - 14} width={endX - BAR.x + 28} height={BAR.h + 28} rx={10} fill={INK} />}
        <rect x={BAR.x} y={BAR.y} width={endX - BAR.x} height={BAR.h} rx={4} fill={IVORY} />
        <rect x={BAR.x} y={BAR.y} width={fillW} height={BAR.h} rx={4} fill={GOLD} />
        {Array.from({ length: CELLS - 1 }, (_, i) => {
          const x = BAR.x + cellW * (i + 1);
          return x < endX - 2 ? <rect key={i} x={x - 3} y={BAR.y} width={6} height={BAR.h} fill={INK} /> : null;
        })}
        {state.ghost && state.cap < 1 ? (
          <MissingTextureFill d={`M${endX} ${BAR.y}H${BAR.x + BAR.w}V${BAR.y + BAR.h}H${endX}Z`} cell={13} />
        ) : null}
        {finalFrame ? <FinalFrame endX={endX} /> : <CodeCaps endX={endX} />}
        <text x={BAR.x} y={BAR.y - 24} fontFamily={ANTON_FONT} fontSize={44} letterSpacing={6} fill={INK}>
          VORATHUL
        </text>
        {ROMAN.map((r, i) => {
          const x = BAR.x + i * 62;
          const lit = state.pips[i] as boolean;
          return (
            <g key={r}>
              {i === 2 && state.pip3Deleted ? (
                <g transform={`translate(${x} ${BAR.y + BAR.h + 26})`}>
                  <MissingTextureFill d="M0 0H46V36H0Z" cell={9} outline={{ width: 4, color: INK }} />
                </g>
              ) : (
                <>
                  <rect x={x} y={BAR.y + BAR.h + 26} width={46} height={36} rx={8} fill={lit ? GOLD : IVORY} stroke={INK} strokeWidth={5} />
                  <text x={x + 23} y={BAR.y + BAR.h + 53} textAnchor="middle" fontFamily={ANTON_FONT} fontSize={24} fill={INK}>
                    {r}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export { MAGENTA };

/** A comic caption box: ivory, hand-jittered ink border, Anton lettering; `strike` (0-1) draws a UI-blue line through it. */
export const Caption = ({ text, x, y, rotate = -2, strike = 0, size = 78, seed = 5 }: { text: string; x: number; y: number; rotate?: number; strike?: number; size?: number; seed?: number }) => {
  const w = text.length * size * 0.56 + 56;
  const h = size + 40;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <InkFilter seed={seed} rough={5} />
      </defs>
      <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
        <g filter={`url(#${inkFilterId(seed, 5)})`}>
          <rect x={6} y={8} width={w} height={h} fill={INK} />
          <rect x={0} y={0} width={w} height={h} fill={IVORY} stroke={INK} strokeWidth={8} />
        </g>
        <text x={w / 2} y={h - 24} textAnchor="middle" fontFamily={ANTON_FONT} fontSize={size} letterSpacing={3} fill={INK}>
          {text}
        </text>
        {strike > 0 ? <rect x={-14} y={h / 2 - 5} width={(w + 28) * strike} height={10} rx={5} fill="#3B82F6" /> : null}
      </g>
    </svg>
  );
};

/** The code-drawn frame ends: a black crown cap on the left and a gold spike on the right. */
const CodeCaps = ({ endX }: { endX: number }) => (
  <>
    <path d={`M${BAR.x - 14} ${BAR.y - 14} l-26 -20 l12 24 l-30 -4 l30 26 l-16 30 l30 -20 l0 42 l30 0 z`} fill={INK} />
    <path d={`M${endX + 14} ${BAR.y - 14} l36 ${BAR.h / 2 + 14} l-36 ${BAR.h / 2 + 14} z`} fill={GOLD} stroke={INK} strokeWidth={8} />
  </>
);

/** The final frame (G25): two rails stretched along the bar between the left crown cap and the right spike cap. */
const FinalFrame = ({ endX }: { endX: number }) => {
  const k = 0.62;
  const [lw, lh] = finalSize('G25-1') as [number, number];
  const [sw, sh] = finalSize('G25-2') as [number, number];
  const [rw, rh] = finalSize('G25-3') as [number, number];
  const cy = BAR.y + BAR.h / 2;
  void sw;
  return (
    <>
      <image href={staticFile('assets/G25-2.png')} x={BAR.x - 6} y={cy - (sh * k) / 2} width={endX - BAR.x + 12} height={sh * k} preserveAspectRatio="none" />
      <image href={staticFile('assets/G25-1.png')} x={BAR.x - lw * k + 34} y={cy - (lh * k) / 2} width={lw * k} height={lh * k} />
      <image href={staticFile('assets/G25-3.png')} x={endX - 34} y={cy - (rh * k) / 2} width={rw * k} height={rh * k} />
    </>
  );
};
