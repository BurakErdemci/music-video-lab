import { palette } from '../../style/palette.ts';
import { TEXT_FONT } from '../../style/fonts.ts';
import { seeded } from '../../style/seeded.ts';
import { StampWord } from '../../type/StampWord.tsx';
import { clamp01 } from '../../math.ts';
import { CAPTION_FADE, CAPTIONS, STAMPS, captionBox, type CaptionSpec4 } from './typeLayout.ts';

// Same torn cream label as parts 1-3 (part3/Part3Type.tsx draws it identically).
const labelPath = (key: string, w: number, h: number): string => {
  const r = seeded(`label:${key}`);
  const pts: string[] = [];
  for (let x = 0; x <= w; x += 14) pts.push(`${x.toFixed(1)},${(2 + (r() - 0.5) * 4).toFixed(1)}`);
  for (let x = w; x >= 0; x -= 14) pts.push(`${x.toFixed(1)},${(h - 2 + (r() - 0.5) * 4).toFixed(1)}`);
  return `M${pts.join(' L')} Z`;
};

const Caption = ({ c, frame }: { c: CaptionSpec4; frame: number }) => {
  if (frame < c.show || frame >= c.hide + CAPTION_FADE) return null;
  const op = Math.min(clamp01((frame - c.show + 1) / CAPTION_FADE), frame >= c.hide ? 1 - clamp01((frame - c.hide + 1) / CAPTION_FADE) : 1);
  const slide = frame >= c.hide ? -8 * (1 - op) : 8 * (1 - op);
  const b = captionBox(c);
  // line 37 keeps the label key and rotation it had in part 3
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

/** Part4 type overlay (song frames). */
export const Part4Type = ({ frame }: { frame: number }) => (
  <>
    {STAMPS.map((s) => (
      <StampWord key={`${s.text}${s.show}`} frame={frame} startFrame={s.show} endFrame={s.hide} text={s.text} x={s.x} y={s.y} size={s.size} on={s.on} ink={s.ink} width={1100} />
    ))}
    {CAPTIONS.map((c) => (
      <Caption key={c.n} c={c} frame={frame} />
    ))}
  </>
);
