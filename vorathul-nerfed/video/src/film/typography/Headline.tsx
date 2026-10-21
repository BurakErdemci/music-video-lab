// Office release-note headline: a white UI card, Inter kicker, Plex Mono version heading, one UI-blue bar.
// Pops up, the bar sweeps under the heading, wipes out left to right. No ink in the office.
import { FPS } from '../../timing.ts';
import { C, MONO_FONT, UI_FONT } from '../../ui/theme.tsx';
import { clamp01, easeOut, lerp, MOTION } from './motion.ts';
import { HEADLINE, headlineSize, type HeadlineSpec } from './schedule.ts';

/** In/out envelope shared with the office chapter card. */
export const popEnvelope = (frame: number, at: number, out: number, fps: number) => {
  const t = (frame - at) / fps;
  const tOut = (frame - out) / fps;
  const p = clamp01(t / MOTION.popIn);
  const scale = p < 0.7 ? lerp(0.94, 1.015, easeOut(p / 0.7)) : lerp(1.015, 1, (p - 0.7) / 0.3);
  return {
    visible: t >= 0 && tOut < MOTION.wipe,
    lift: 24 * (1 - easeOut(p)),
    scale,
    bar: easeOut(t / MOTION.barSweep),
    /** Percent of the card already wiped away from the left. */
    wipe: 100 * easeOut(clamp01(tOut / MOTION.wipe)),
  };
};

export const Headline = ({ spec, frame }: { spec: HeadlineSpec; frame: number }) => {
  const fps = FPS;
  const e = popEnvelope(frame, spec.at, spec.out, fps);
  if (!e.visible) return null;
  const { w, h } = headlineSize(spec.title);
  return (
    <div
      style={{
        position: 'absolute', left: spec.x, top: spec.y, width: w, height: h, boxSizing: 'border-box', padding: HEADLINE.pad,
        background: C.white, border: `2px solid ${C.mid}`, borderRadius: 18, boxShadow: '0 12px 0 rgba(52,58,64,0.10)',
        transform: `translateY(${e.lift}px) scale(${e.scale})`, transformOrigin: '50% 100%', clipPath: `inset(-20px -20px -20px ${e.wipe}%)`,
        // Fade with the wipe: a bare wipe left the last glyph ("5" of PATCH 2.5) standing alone for a few frames.
        opacity: 1 - e.wipe / 100,
        display: 'flex', flexDirection: 'column', gap: HEADLINE.gap,
      }}
    >
      <div style={{ fontFamily: UI_FONT, fontWeight: 600, fontSize: HEADLINE.kickerSize, lineHeight: 1, letterSpacing: 2, color: C.slate, whiteSpace: 'nowrap' }}>{spec.kicker}</div>
      <div style={{ fontFamily: MONO_FONT, fontWeight: 500, fontSize: HEADLINE.titleSize, lineHeight: 0.8, color: C.ink, whiteSpace: 'nowrap' }}>{spec.title}</div>
      <div style={{ width: `${100 * e.bar}%`, height: HEADLINE.bar, borderRadius: HEADLINE.bar / 2, background: C.blue }} />
    </div>
  );
};
