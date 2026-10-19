import { palette } from '../../style/palette.ts';
import { STAMP_FONT, TEXT_FONT } from '../../style/fonts.ts';
import { seeded } from '../../style/seeded.ts';
import { plateOffset } from '../../style/screenprint.tsx';
import { StampWord } from '../../type/StampWord.tsx';
import { clamp01 } from '../../math.ts';
import { CAPTION_FADE, CAPTIONS, COUNTER, STAMPS, captionBox, counterText, counterValue, type CaptionSpec3 } from './typeLayout.ts';

// The caption look is Part 1's / Part 2's (torn cream label, navy text); caption 23 renders as Part 2 draws it.
const labelPath = (key: string, w: number, h: number): string => {
  const r = seeded(`label:${key}`);
  const pts: string[] = [];
  for (let x = 0; x <= w; x += 14) pts.push(`${x.toFixed(1)},${(2 + (r() - 0.5) * 4).toFixed(1)}`);
  for (let x = w; x >= 0; x -= 14) pts.push(`${x.toFixed(1)},${(h - 2 + (r() - 0.5) * 4).toFixed(1)}`);
  return `M${pts.join(' L')} Z`;
};

const Caption = ({ c, frame }: { c: CaptionSpec3; frame: number }) => {
  if (frame < c.show || frame >= c.hide + CAPTION_FADE) return null;
  const op = Math.min(clamp01((frame - c.show + 1) / CAPTION_FADE), frame >= c.hide ? 1 - clamp01((frame - c.hide + 1) / CAPTION_FADE) : 1);
  const slide = frame >= c.hide ? -8 * (1 - op) : 8 * (1 - op);
  const b = captionBox(c);
  const rot = (seeded(`label-rot:${c.n}`)() - 0.5) * 1.2;
  return (
    <div style={{ position: 'absolute', left: b.x, top: b.y + slide, width: b.w, height: b.h, opacity: op, transform: `rotate(${rot}deg)` }}>
      <svg width={b.w + 8} height={b.h + 8} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={labelPath(String(c.n), b.w, b.h)} transform="translate(6 5)" fill={palette.navy} />
        <path d={labelPath(String(c.n), b.w, b.h)} fill={palette.cream} stroke={palette.navy} strokeWidth={3.5} />
      </svg>
      <div style={{ position: 'absolute', left: b.x < c.x ? c.x - b.x : 0, top: c.y - b.y, whiteSpace: 'nowrap', fontFamily: TEXT_FONT, fontWeight: 500, fontSize: c.size, lineHeight: 1.35, letterSpacing: 0, color: palette.navy }}>{c.text}</div>
    </div>
  );
};

/** The line counter in the stamp face: digits tick up; on the click it lands with a squash and holds, then fades. */
const Counter = ({ frame }: { frame: number }) => {
  // gone on the cut to the wide shot (no fade over the next shot)
  if (frame < COUNTER.show || frame >= COUNTER.hide) return null;
  const v = counterValue(frame);
  const k = frame - COUNTER.click;
  const scale = k >= 0 && k < 3 ? ([1.18, 1.1, 1.04][k] as number) : 1;
  const shake = k >= 0 && k < 8 ? 5 * Math.sin(k * 2.3) * (1 - k / 8) : 0;
  const op = clamp01((frame - COUNTER.show + 1) / 4);
  const { dx, dy } = plateOffset('p3:counter');
  const base = { position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', fontFamily: STAMP_FONT, fontSize: COUNTER.size, lineHeight: 1.05, letterSpacing: '0.02em' } as const;
  return (
    <div style={{ position: 'absolute', left: COUNTER.x + shake, top: COUNTER.y, opacity: op, transform: `scale(${scale}) rotate(-1.5deg)`, transformOrigin: '0% 100%' }}>
      <div style={{ position: 'absolute', left: 4, top: -44, fontFamily: TEXT_FONT, fontWeight: 500, fontSize: 30, color: palette.cream, whiteSpace: 'nowrap' }}>satır</div>
      <div style={{ ...base, left: dx, top: dy, color: palette.cream, opacity: 0.85 }}>{counterText(v)}</div>
      <div style={{ ...base, color: palette.moonYellow }}>{counterText(v)}</div>
    </div>
  );
};

/** Part3 type overlay (song frames). */
export const Part3Type = ({ frame }: { frame: number }) => (
  <>
    {STAMPS.map((s) => (
      <StampWord key={s.text} frame={frame} startFrame={s.show} endFrame={s.hide} text={s.text} x={s.x} y={s.y} size={s.size} on={s.on} ink={s.ink} width={1100} />
    ))}
    <Counter frame={frame} />
    {CAPTIONS.map((c) => (
      <Caption key={c.n} c={c} frame={frame} />
    ))}
  </>
);
